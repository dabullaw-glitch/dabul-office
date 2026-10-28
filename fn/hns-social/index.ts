// hns-social (28.10.2026): channel distribution of the HNS (חדשות נתניה והשרון, nws.co.il) news engine.
// After hns-publish publishes a story, this function sends it to the public channels:
//   tg  Telegram channel   every published story: title, short summary, link, section hashtag.
//   fb  Facebook page      only IMPORTANT stories (rule below), at most 4 a day, at least 60 minutes apart.
//   wa  WhatsApp channel   only IMPORTANT stories (same rule), at most 6 a day, at least 30 minutes apart (Green API).
// Importance rule (score, a story with score >= 50 is important):
//   100  a warning: weather or sea warning (IMS), Home Front Command, sirens, safety instructions
//    60  a road closure or traffic change (חסימה, הסדרי תנועה, עבודות בכביש)
//    60  a water or electricity outage
//    50  a municipal decision (council, budget, arnona, tender) or a planning committee decision
//    40  a sensitive story that Yakir approved himself
//   +10  the story is in the "מבזקים" section;  +5 "נתניה" is in the title
//   Warnings skip the daily cap and the spacing. When there are more candidates than room, the highest score goes first.
// Every channel runs only when its settings exist in app_secrets:
//   tg: NWS_TG_CHANNEL (@name or -100... id; the office bot must be an admin of the channel)
//   fb: NWS_FB_PAGE_ID + NWS_FB_PAGE_TOKEN (filled by the connect flow below)
//   wa: NWS_WA_CHANNEL (...@newsletter for a WhatsApp channel, or ...@g.us for an announcement group)
// Master switch NWS_SOCIAL_LIVE = '1' posts for real. Anything else is a dry run: nothing is posted, and each would-be post
// is written once to hns_social_log (mode 'dry', status 'would_send').
// Rules: never twice per story and channel (unique claim in hns_social_log), never a story older than 24 hours, the article
// must already answer on the site, quiet hours 23:00 to 06:30 Israel time (only warnings go out), a failed post is tried
// once more on the next run and then given up, everything is logged.
// POST (x-cron-secret):
//   {action:'tick', dry?}          cron every 5 minutes (job hns-social)
//   {action:'preview', all?}       what would be posted now, nothing is written (all: ignore caps, quiet hours and history)
//   {action:'status'}              which channels are configured, live or dry, counts for today
//   {action:'fb_link'}             a one-time Facebook login link (30 minutes) that saves the news page token
// GET ?code=&state=                Facebook redirects here after the login (Meta app redirect URI must include this URL)
// No long or medium dash in any posted text.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const KEYS = ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'NWS_SOCIAL_LIVE', 'NWS_TG_CHANNEL', 'NWS_FB_PAGE_ID', 'NWS_FB_PAGE_TOKEN', 'NWS_WA_CHANNEL',
  'GREEN_API_URL', 'GREEN_API_INSTANCE', 'GREEN_API_TOKEN', 'META_APP_ID', 'META_APP_SECRET', 'NWS_FB_STATE'];
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', KEYS);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, String(r.v ?? '').trim()]));
}
const setSecret = async (k: string, v: string) => { const { error } = await sb.from('app_secrets').upsert({ k, v }, { onConflict: 'k' }); if (error) throw new Error(error.message); };
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

const SITE = 'https://nws.co.il';
const MIRROR = 'https://nws-site.pages.dev'; // same build, used while the domain is not live yet
const FB = 'https://graph.facebook.com/v21.0';
const MAX_AGE_H = 24;
const IMPORTANT = 50;
type Ch = 'tg' | 'fb' | 'wa';
const CFG: Record<Ch, { perRun: number; perDay: number; gapMin: number; important: boolean; col: string }> = {
  tg: { perRun: 3, perDay: 40, gapMin: 0, important: false, col: 'ch_tg_at' },
  fb: { perRun: 1, perDay: 4, gapMin: 60, important: true, col: 'ch_fb_at' },
  wa: { perRun: 1, perDay: 6, gapMin: 30, important: true, col: 'ch_wa_at' },
};

// same section slugs and fallback as the site (sites/nws/src/data/sections.ts, src/lib/content.ts fromFeed + articleUrl)
const SLUG: Record<string, string> = { flash: 'flash', city: 'city', realestate: 'real-estate', community: 'community', sports: 'sports',
  leisure: 'events', sharon: 'sharon', tourism: 'tourism', law: 'law', police: 'police', transport: 'transport', health: 'health' };
const TAG: Record<string, string> = { flash: 'מבזק', city: 'עיריית_נתניה', realestate: 'נדלן_נתניה', community: 'קהילה_וחינוך', sports: 'ספורט',
  leisure: 'אירועים', sharon: 'השרון', tourism: 'תיירות', law: 'חוק_ומשפט', police: 'משטרה_ופלילים', transport: 'תחבורה', health: 'בריאות' };
const sec = (st: Any) => (SLUG[st.section] ? st.section : 'flash');
const pathOf = (st: Any) => `/${SLUG[sec(st)]}/n${st.id}/`;
const urlOf = (st: Any) => SITE + pathOf(st);

const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, Math.max(0, s.lastIndexOf(' ', n - 1))) + '...');

// ---------- importance ----------
const WARN_RE = /אזהר|פיקוד העורף|אזעק|צבע אדום|הנחיות מיוחדות|הנחיות בטיחות|הוראות בטיחות|סכנת הצפות|סכנת שיטפונות/;
const ROAD_RE = /חסימ|ייחסמ|נחסמ|ייסגר|ייסגרו|נסגר|סגירת (?:כביש|רחוב|צומת|מחלף)|הסדרי תנועה|הסטת תנועה|עבודות (?:בכביש|ברחוב|בצומת|תשתית|לילה)/;
const UTIL_RE = /הפסק(?:ת|ות) (?:מים|חשמל)|ללא (?:מים|חשמל)|בלי (?:מים|חשמל)|תקלת (?:מים|חשמל)|שבר בצנרת|הרתחת מים/;
const MUNI_RE = /מועצת העיר|ישיבת המועצה|תקציב העירייה|תקציב עירוני|ארנונה|מכרז|העירייה (?:החליטה|אישרה)|ראש העיר (?:החליט|הודיע)|הוועדה (?:המקומית|המחוזית)[^.]{0,40}(?:אישרה|החליטה|דחתה)|ועדת (?:התכנון|תכנון)[^.]{0,40}(?:אישרה|החליטה|דחתה)/;
const isWarning = (st: Any) => WARN_RE.test(clean(st.title)) || (Array.isArray(st.sources) && st.sources.length > 0 && st.sources.every((s: Any) => s.id === 'ims_warn'));
function score(st: Any): { score: number; why: string[] } {
  const t = `${clean(st.title)} ${clean(st.dek)}`;
  const why: string[] = []; let n = 0;
  if (isWarning(st)) { n += 100; why.push('אזהרה'); }
  if (ROAD_RE.test(t)) { n += 60; why.push('חסימה או שינוי תנועה'); }
  if (UTIL_RE.test(t)) { n += 60; why.push('הפסקת מים או חשמל'); }
  if (MUNI_RE.test(t)) { n += 50; why.push('החלטה של העירייה או של ועדה'); }
  if (st.sensitivity === 'sensitive' && st.decided_by === 'yakir') { n += 40; why.push('ידיעה רגישה שיקיר אישר'); }
  if (sec(st) === 'flash') { n += 10; why.push('מבזק'); }
  if (clean(st.title).includes('נתניה')) n += 5;
  return { score: n, why };
}

// ---------- texts ----------
function textFor(ch: Ch, st: Any) {
  const title = clean(st.title), dek = clip(clean(st.dek), 260), url = urlOf(st);
  const tags = `#${TAG[sec(st)]} #חדשות_נתניה`;
  if (ch === 'tg') return `<b>${esc(title)}</b>\n\n${esc(dek)}\n\n<a href="${esc(url)}">לכתבה המלאה באתר</a>\n\n${tags}`;
  if (ch === 'fb') return `${title}\n\n${dek}\n\nלכתבה המלאה: ${url}\n\n${tags}`;
  return `*${title.replace(/\*/g, '')}*\n\n${dek}\n\nלכתבה המלאה: ${url}`;
}

// ---------- senders ----------
async function postJson(url: string, body: Any) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  } catch (e) { return { ok: false, status: 0, j: { error: String(e) } }; }
}
async function send(ch: Ch, st: Any, text: string): Promise<{ ok: boolean; resp: Any }> {
  if (ch === 'tg') {
    const r = await postJson(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: S.NWS_TG_CHANNEL, text, parse_mode: 'HTML', link_preview_options: { url: urlOf(st), prefer_large_media: true } });
    return { ok: !!r.j?.ok, resp: r.j?.ok ? { message_id: r.j.result?.message_id } : { status: r.status, error: r.j?.description || r.j?.error } };
  }
  if (ch === 'fb') {
    const r = await postJson(`${FB}/${encodeURIComponent(S.NWS_FB_PAGE_ID)}/feed`, { message: text, link: urlOf(st), access_token: S.NWS_FB_PAGE_TOKEN });
    return { ok: r.ok && !!r.j?.id, resp: r.j?.id ? { post_id: r.j.id } : { status: r.status, error: r.j?.error?.message || r.j?.error } };
  }
  const base = `${(S.GREEN_API_URL || 'https://api.green-api.com').replace(/\/$/, '')}/waInstance${S.GREEN_API_INSTANCE}`;
  const r = await postJson(`${base}/sendMessage/${S.GREEN_API_TOKEN}`, { chatId: S.NWS_WA_CHANNEL, message: text, linkPreview: true });
  return { ok: r.ok && !!r.j?.idMessage, resp: r.j?.idMessage ? { id: r.j.idMessage } : { status: r.status, error: r.j?.message || r.j?.error || r.j } };
}
function configured(ch: Ch): string {
  if (ch === 'tg') return !S.TELEGRAM_BOT_TOKEN ? 'חסר TELEGRAM_BOT_TOKEN' : !S.NWS_TG_CHANNEL ? 'חסר NWS_TG_CHANNEL' : '';
  if (ch === 'fb') return !S.NWS_FB_PAGE_ID ? 'חסר NWS_FB_PAGE_ID' : !S.NWS_FB_PAGE_TOKEN ? 'חסר NWS_FB_PAGE_TOKEN' : '';
  if (!S.GREEN_API_INSTANCE || !S.GREEN_API_TOKEN) return 'חסרים פרטי Green API';
  if (!S.NWS_WA_CHANNEL) return 'חסר NWS_WA_CHANNEL';
  if (!/@(newsletter|g\.us)$/.test(S.NWS_WA_CHANNEL)) return 'NWS_WA_CHANNEL צריך להסתיים ב-@newsletter או ב-@g.us';
  return '';
}

// ---------- time ----------
function ilClock() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const hm = Number(p.hour) % 24 * 60 + Number(p.minute);
  return { day: `${p.year}-${p.month}-${p.day}`, hm, quiet: hm >= 23 * 60 || hm < 6 * 60 + 30 };
}
// start of the Israel day as an ISO instant (offset found by comparing the wall clock with UTC)
function ilDayStart() {
  const now = new Date();
  const il = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  const off = il.getTime() - new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const d = new Date(il); d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - off).toISOString();
}

// ---------- article ready on the site ----------
const readyCache = new Map<string, boolean>();
// live posts link to nws.co.il, so they wait for the article there; a dry run also accepts the pages.dev copy
async function ready(st: Any, live: boolean) {
  const p = pathOf(st);
  if (readyCache.has(p)) return readyCache.get(p)!;
  let ok = false;
  for (const origin of live ? [SITE] : [SITE, MIRROR]) {
    try { const r = await fetch(origin + p, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) }); await r.body?.cancel(); if (r.status === 200) { ok = true; break; } } catch { /* domain not live yet */ }
  }
  readyCache.set(p, ok);
  return ok;
}

// ---------- the run ----------
// 28.10.2026: sponsored stories (kind 'sponsored', "תוכן שיווקי") are never posted to the channels
async function candidates() {
  const since = new Date(Date.now() - MAX_AGE_H * 3600e3).toISOString();
  const { data, error } = await sb.from('hns_stories').select('id,created_at,published_at,section,title,dek,body,sources,sensitivity,decided_by,state,ch_tg_at,ch_fb_at,ch_wa_at')
    .eq('state', 'published').or('kind.is.null,kind.neq.sponsored').not('published_at', 'is', null).gte('created_at', since).gte('published_at', since).order('published_at', { ascending: true }).limit(200);
  if (error) throw new Error(error.message);
  return (data || []).filter((st: Any) => st.title && Array.isArray(st.body) && st.body.some((x: Any) => String(x || '').trim()));
}

async function history(ids: number[]) {
  if (!ids.length) return [] as Any[];
  const { data } = await sb.from('hns_social_log').select('story_id,channel,mode,status').in('story_id', ids);
  return data || [];
}

async function run(opts: { dry: boolean; preview?: boolean; all?: boolean }) {
  const live = !opts.dry && !opts.preview && S.NWS_SOCIAL_LIVE === '1';
  const mode = live ? 'live' : 'dry';
  const clock = ilClock();
  const dayStart = ilDayStart();
  const rows = await candidates();
  const hist = await history(rows.map((r: Any) => r.id));
  const out: Any = { mode, preview: !!opts.preview, israel_time: `${String(Math.floor(clock.hm / 60)).padStart(2, '0')}:${String(clock.hm % 60).padStart(2, '0')}`, quiet: clock.quiet, candidates: rows.length, channels: {} };

  for (const ch of ['tg', 'fb', 'wa'] as Ch[]) {
    const cfg = CFG[ch];
    const missing = configured(ch);
    const res: Any = { configured: !missing, missing: missing || undefined, posted: [], would: [], waiting: [], failed: [] };
    out.channels[ch] = res;
    if (live && missing) {
      // the channel is not set up: nothing is posted; one line a day in the log says why
      const { count } = await sb.from('hns_social_log').select('id', { count: 'exact', head: true }).eq('channel', ch).eq('status', 'channel_off').gte('at', dayStart);
      if (!count) await sb.from('hns_social_log').insert({ channel: ch, mode, status: 'channel_off', reason: missing });
      continue;
    }
    // today's posts on this channel (live: real posts; dry: would-be posts), for the daily cap and the spacing
    const doneStatus = live ? ['sent', 'sending'] : ['would_send'];
    const { data: today } = await sb.from('hns_social_log').select('at').eq('channel', ch).eq('mode', mode).in('status', doneStatus).gte('at', dayStart).order('at', { ascending: false });
    let usedToday = opts.all ? 0 : (today || []).length;
    const lastAt = opts.all ? null : today?.[0]?.at ?? null;

    const list = rows.map((st: Any) => ({ st, ...score(st) }))
      .filter((x: Any) => !cfg.important || x.score >= IMPORTANT)
      .filter((x: Any) => {
        if (opts.all) return true;
        const h = hist.filter((r: Any) => r.story_id === x.st.id && r.channel === ch);
        if (h.some((r: Any) => r.mode === 'live' && ['sent', 'sending', 'gave_up'].includes(r.status))) return false;
        if (!live && h.some((r: Any) => r.mode === 'dry' && r.status === 'would_send')) return false;
        return true;
      });
    if (cfg.important) list.sort((a: Any, b: Any) => b.score - a.score || Date.parse(a.st.published_at) - Date.parse(b.st.published_at));

    let n = 0;
    for (const x of list) {
      const st = x.st, urgent = isWarning(st);
      const wait = (why: string) => res.waiting.push({ id: st.id, title: clean(st.title), why });
      if (n >= cfg.perRun && !opts.all) { wait('בריצה הבאה'); continue; }
      if (clock.quiet && !urgent && !opts.all) { wait('שעות שקט 23:00 עד 06:30'); continue; }
      if (!urgent && !opts.all && usedToday >= cfg.perDay) { wait(`הגיע למכסה היומית (${cfg.perDay})`); continue; }
      if (!urgent && !opts.all && cfg.gapMin && lastAt && (Date.now() - Date.parse(lastAt)) / 60e3 < cfg.gapMin) { wait(`מרווח של ${cfg.gapMin} דקות בין פוסטים`); continue; }
      if (!(await ready(st, live))) { wait('הכתבה עוד לא עלתה לאתר'); continue; }
      const text = textFor(ch, st), url = urlOf(st);
      const item = { id: st.id, score: x.score, why: x.why, url, text };
      n++; usedToday++;
      if (opts.preview) { res.would.push(item); continue; }
      if (!live) {
        const { error } = await sb.from('hns_social_log').insert({ story_id: st.id, channel: ch, mode, status: 'would_send', score: x.score, reason: x.why.join(', ') || null, text, url,
          response: missing ? { note: `config missing: ${missing}` } : null });
        if (!error) res.would.push(item);
        continue;
      }
      // live: claim the story for this channel first (a second run hits the unique index and skips)
      const { data: claim, error: cerr } = await sb.from('hns_social_log').insert({ story_id: st.id, channel: ch, mode, status: 'sending', score: x.score, reason: x.why.join(', ') || null, text, url }).select('id').single();
      if (cerr || !claim) { n--; usedToday--; continue; }
      const r = await send(ch, st, text);
      if (r.ok) {
        await sb.from('hns_social_log').update({ status: 'sent', response: r.resp }).eq('id', claim.id);
        await sb.from('hns_stories').update({ [cfg.col]: new Date().toISOString() }).eq('id', st.id);
        res.posted.push({ id: st.id, url });
      } else {
        const fails = hist.filter((h: Any) => h.story_id === st.id && h.channel === ch && h.mode === 'live' && h.status === 'failed').length;
        await sb.from('hns_social_log').update({ status: fails >= 1 ? 'gave_up' : 'failed', response: r.resp }).eq('id', claim.id);
        res.failed.push({ id: st.id, error: r.resp?.error, final: fails >= 1 });
        usedToday--;
      }
    }
  }
  if (!opts.preview) {
    const summary = Object.fromEntries(Object.entries(out.channels).map(([k, v]: Any) => [k, { posted: v.posted.length, would: v.would.length, waiting: v.waiting.length, failed: v.failed.length, missing: v.missing }]));
    const busy = Object.values(summary).some((v: Any) => v.posted || v.would || v.failed);
    if (busy) await sb.from('hns_social_log').insert({ channel: 'all', mode, status: 'run', response: summary });
  }
  return out;
}

// ---------- Facebook page connect ----------
const REDIRECT = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-social`;
function page(title: string, body: string, ok = true) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#EEF4FC;font-family:Arial,sans-serif;color:#0E1726;line-height:1.7}main{max-width:560px;margin:40px auto;padding:28px 24px;background:#fff;border-radius:14px;border-top:5px solid ${ok ? '#1E8A4C' : '#C8102E'}}h1{font-size:1.4rem;margin:0 0 10px}</style></head>
<body><main><h1>${esc(title)}</h1>${body}</main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
async function fbLink() {
  if (!S.META_APP_ID) return { ok: false, error: 'META_APP_ID missing' };
  const state = crypto.randomUUID().replace(/-/g, '');
  await setSecret('NWS_FB_STATE', `${state}|${Date.now() + 30 * 60e3}`);
  const u = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  u.searchParams.set('client_id', S.META_APP_ID); u.searchParams.set('redirect_uri', REDIRECT()); u.searchParams.set('state', state);
  u.searchParams.set('scope', 'pages_show_list,pages_manage_posts,pages_read_engagement'); u.searchParams.set('response_type', 'code');
  return { ok: true, url: u.toString(), redirect_uri: REDIRECT(), expires_min: 30 };
}
async function fbCallback(url: URL) {
  const [st, exp] = (S.NWS_FB_STATE || '').split('|');
  if (url.searchParams.get('error')) return page('החיבור בוטל', '<p>לא נשמר כלום. אפשר לבקש קישור חדש.</p>', false);
  if (!st || url.searchParams.get('state') !== st || Date.now() > Number(exp)) return page('הקישור לא בתוקף', '<p>צריך קישור חדש. לא נשמר כלום.</p>', false);
  await setSecret('NWS_FB_STATE', ''); // one use only
  const q = (p: string, params: Record<string, string>) => fetch(`${FB}/${p}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(15000) }).then((r) => r.json());
  const t1 = await q('oauth/access_token', { client_id: S.META_APP_ID, client_secret: S.META_APP_SECRET, redirect_uri: REDIRECT(), code: url.searchParams.get('code') || '' });
  if (!t1.access_token) return page('החיבור נכשל', '<p>פייסבוק לא החזיר הרשאה. לא נשמר כלום.</p>', false);
  const t2 = await q('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: S.META_APP_ID, client_secret: S.META_APP_SECRET, fb_exchange_token: t1.access_token });
  const userToken = t2.access_token || t1.access_token;
  const pages = await q('me/accounts', { fields: 'id,name,access_token,tasks', limit: '100', access_token: userToken });
  const list: Any[] = pages.data || [];
  // the news page only: by its id when NWS_FB_PAGE_ID is set, otherwise the one page whose name contains "חדשות נתניה"
  const pick = S.NWS_FB_PAGE_ID ? list.filter((p) => p.id === S.NWS_FB_PAGE_ID) : list.filter((p) => /חדשות נתניה/.test(p.name || ''));
  if (pick.length !== 1) {
    const names = list.map((p) => `<li>${esc(p.name || '')}</li>`).join('');
    return page('לא נמצא דף החדשות', `<p>לא הצלחנו לזהות בדיוק דף אחד של חדשות נתניה והשרון. לא נשמר כלום.</p><p>הדפים שאישרת:</p><ul>${names || '<li>אין</li>'}</ul>`, false);
  }
  const p = pick[0];
  if (!(p.tasks || []).some((t: string) => ['CREATE_CONTENT', 'MANAGE'].includes(t))) return page('אין הרשאת פרסום', '<p>החשבון לא יכול לפרסם בדף הזה. לא נשמר כלום.</p>', false);
  await setSecret('NWS_FB_PAGE_ID', p.id);
  await setSecret('NWS_FB_PAGE_TOKEN', p.access_token);
  await sb.from('hns_social_log').insert({ channel: 'fb', mode: 'live', status: 'run', reason: 'page connected', response: { page_id: p.id, name: p.name } });
  return page('הדף חובר', `<p>הדף "${esc(p.name)}" חובר לאתר החדשות. הפרסום בפועל יתחיל רק אחרי שיופעל המתג הראשי.</p>`);
}

Deno.serve(async (req) => {
  await secrets();
  const url = new URL(req.url);
  if (req.method === 'GET') {
    if (url.searchParams.get('state')) return await fbCallback(url).catch(() => page('החיבור נכשל', '<p>שגיאה. לא נשמר כלום.</p>', false));
    return new Response('not found', { status: 404 });
  }
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await run({ dry: !!b.dry })) });
    if (b.action === 'preview') return J({ ok: true, ...(await run({ dry: true, preview: true, all: !!b.all })) });
    if (b.action === 'fb_link') return J(await fbLink());
    if (b.action === 'status') {
      const dayStart = ilDayStart();
      const { data } = await sb.from('hns_social_log').select('channel,mode,status').gte('at', dayStart);
      const c: Record<string, number> = {}; for (const r of data || []) c[`${r.channel}/${r.mode}/${r.status}`] = (c[`${r.channel}/${r.mode}/${r.status}`] || 0) + 1;
      return J({ ok: true, live: S.NWS_SOCIAL_LIVE === '1', channels: { tg: configured('tg') || 'ok', fb: configured('fb') || 'ok', wa: configured('wa') || 'ok' }, today: c, ...ilClock() });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
