// hns-feed (28.10.2026): public read endpoint of the HNS news engine for the nws.co.il site build.
// GET -> published stories only, newest first, with just the fields the site needs. No secrets, no internal notes.
// ?limit=N (default 300, max 1000). No long or medium dashes in any text.
// 28.10.2026 (Yakir): an independent news site. Only official sources (municipality, police, MDA, IMS...) are shown as the source
// of a story; media outlets are never exposed as the source (a needed credit is one line at the end of the body, written by hns-write).
// 28.10.2026 (home redesign): also the card fields (kicker, kind, author, video, closure) and the AI illustration (image_url + alt,
// shown on the site with the label "תמונה להמחשה"), and the active event (table hns_event) as "event" (null when none is active).
// A kicker that names a media outlet (table hns_outlets) is dropped here as well.
// 28.10.2026 (flashes and calendar): also "flashes", short lines from OFFICIAL sources only (Home Front Command, MDA, IMS
//   warnings, police) about Netanya and the nearby Sharon, as they arrived, newest first. A flash ages out: Home Front Command after
//   6 hours, the others after 12 hours. Sensitive items (death, minors...) are never shown as a flash; they go through Yakir.
//   And "calendar": the coming events from official listings (table hns_cal, e.g. the Netanya Culture Hall), up to 45 days ahead.
//   ?only=flashes returns just the flashes (small and cached 15 seconds), for the live ticker in the browser.
// 28.10.2026 (IndexNow): "updatedAt" is set only for a story updated with new facts (pub_note "עודכן..."), so the site shows the
//   update time and the sitemap lastmod changes; a wording fix ("תוקן") does not count as an update.
// 28.10.2026 (live updates): "updates" [{at, text}] oldest first, timestamped new facts on a developing story, and "live" true while
//   the last update is less than 6 hours old (the site shows a live blog and a "מתעדכן" label).
// 28.10.2026 (sponsored): kind 'sponsored' ("תוכן שיווקי") passes through as is; its body may hold mini markup (## headings, - lists,
//   [text](url) links) that the site renders.
// 28.10.2026 (quality): "extras" per story (fields other functions add through hns-publish revise, e.g. related links, service
//   boxes) and a top-level "merged" list [{id, section, into, intoSection}]: stories merged into another one; the site 301s them.
// 28.10.2026 (enrichment): contextIds, serviceBox, format and formatData per story (written by the enrichment agent).
// 29.10.2026 (management panel /yakirdab/, hns-panel through hns-admin):
//   flashes: a flash the panel hid (table hns_flash_mod, hidden) is left out, a flash whose text the panel changed shows the new text,
//   and flashes written by hand in the panel (table hns_flash) join the list with id "m<id>" and source "מערכת החדשות", until their
//   own time limit (ttl_h). All sorted by time, newest first. ?only=flashes&all=1 with x-cron-secret (server to server, for the panel)
//   also returns the hidden ones, marked hidden, with the original text.
//   "pin": the story the panel pinned as the home page lead ({id, until}, hns_config 'site_pin'), or null; only while it is published.
//   extras: the internal panel flags (hold, manual) are not sent.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' };
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
// json fields (service box, format data) with long and medium dashes replaced like every other text
const cleanJson = (v: unknown) => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v).replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ')) : null);
const arr = (a: unknown) => (Array.isArray(a) ? a : []).map(clean).filter(Boolean);
const faq = (a: unknown) => (Array.isArray(a) ? a : []).map((x: Any) => Array.isArray(x) ? [clean(x[0]), clean(x[1])] : [clean(x?.q ?? x?.question), clean(x?.a ?? x?.answer)]).filter((x) => x[0] && x[1]);

const FLASH_SRC: Record<string, { name: string; hours: number }> = {
  oref_tg: { name: 'פיקוד העורף', hours: 6 }, mda_tg: { name: 'מד״א', hours: 12 }, ims_warn: { name: 'השירות המטאורולוגי', hours: 12 }, police_tg: { name: 'משטרת ישראל', hours: 12 },
};
// 29.10.2026 (Yakir): weather warnings flood the flashes; only the important ones are shown (floods, heavy rain, a dangerous sea
// for bathing, snow, extreme heat, storms), each type once, and without the "עודכן ב-..." tail the box already shows as a time.
const WX_KEEP = /שטפונ|הצפ|משקעים משמעותי|משקעים חריג|ים סוער|ים גבוה ומסוכן לרחצה|שלג|סערה|עומס חום כבד|עומס חום קיצוני|חום קיצוני|רוחות חזקות מאוד|סופת אבק/;
const WX_UPD = /\s*[,.]?\s*עודכן\s*ב?-?\s*\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?(?:\s*,?\s*(?:בשעה\s*)?\d{1,2}:\d{2})?\s*\.?\s*$/;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const MANUAL_SRC = 'מערכת החדשות';
async function flashes(all = false) {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data } = await sb.from('hns_items').select('id,source_id,title,url,published_at,fetched_at,sensitivity')
    .in('source_id', Object.keys(FLASH_SRC)).eq('is_local', true).eq('backfill', false).gte('fetched_at', since).order('id', { ascending: false }).limit(40);
  const ids = (data || []).map((x: Any) => x.id);
  const { data: mods } = ids.length ? await sb.from('hns_flash_mod').select('item_id,hidden,text').in('item_id', ids) : { data: [] };
  const mod = new Map((mods || []).map((m: Any) => [Number(m.item_id), m]));
  const now = Date.now(); const seen = new Set<string>();
  const auto = (data || []).filter((x: Any) => x.sensitivity !== 'sensitive').map((x: Any) => {
    const at = x.published_at || x.fetched_at; const src = FLASH_SRC[x.source_id]; const m: Any = mod.get(Number(x.id));
    const orig = clip(clean(String(x.title || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(WX_UPD, '')), 150);
    const f: Any = { id: x.id, at, text: m?.text ? clip(clean(m.text), 150) : orig, source: src.name, url: String(x.url || ''), kind: x.source_id.replace(/_.*/, ''), ttl: src.hours };
    if (all) { f.hidden = !!m?.hidden; f.orig = orig; f.edited = !!m?.text; } else if (m?.hidden) f.text = '';
    return f;
  }).filter((f: Any) => f.text && now - Date.parse(f.at) < f.ttl * 3600e3 && (all || f.kind !== 'ims' || WX_KEEP.test(f.text)) && (all || (!seen.has(f.text) && seen.add(f.text))));
  const { data: man } = await sb.from('hns_flash').select('id,at,text,place,url,ttl_h,hidden').gte('at', new Date(now - 72 * 3600e3).toISOString()).order('at', { ascending: false }).limit(30);
  const manual = (man || []).filter((x: Any) => (all || !x.hidden) && now - Date.parse(x.at) < (x.ttl_h || 12) * 3600e3 && Date.parse(x.at) <= now + 60e3).map((x: Any) => {
    const t = clean(x.text); const pl = clean(x.place || '');
    const f: Any = { id: `m${x.id}`, at: x.at, text: clip(pl && !t.includes(pl) ? `${t} (${pl})` : t, 150), source: MANUAL_SRC, url: String(x.url || ''), kind: 'nws', ttl: x.ttl_h || 12 };
    if (all) { f.hidden = !!x.hidden; f.manual = true; f.place = pl; f.raw = t; }
    return f;
  });
  return [...auto, ...manual].sort((a: Any, b: Any) => Date.parse(b.at) - Date.parse(a.at)).slice(0, all ? 60 : 15);
}
// 29.10.2026 (Yakir approved): which published stories are flashes. In: police and crime, accidents and injuries, road closures and
// traffic changes, water and power outages, public warnings, election results, and urgent national news. Out: the fixed recurring
// pieces (Shabbat times, daily weather, weekend guide, events of the week, day summary), culture and leisure, community, real estate,
// sports, data pieces, blog guides and sponsored content. The site also keeps only the last 24 hours.
const NO_FLASH_SEC = new Set(['blog', 'leisure', 'community', 'realestate', 'sports', 'tourism', 'law']);
const URGENT = /נפגע|נפצע|פצוע|פצועים|הרוג|נהרג|נרצח|רצח|תאונ|שריפ|דליק|חסימ|נחסם|נחסמ|ייחסם|ייחסמו|ייסגר|ייסגרו|נסגר|סגירת|הסדרי תנועה|שינויי תנועה|עבודות|הפסק(ת|ות) (מים|חשמל)|אין מים|אין חשמל|אזהר|מזהיר|ריקול|החזרה מהמדפים|אזעק|פיגוע|ירי|דקיר|נדקר|תקפ|תקיפ|נעצר|עצור|חשוד|כתב אישום|נעדר|חילוץ|לכוד|קרס|קריסת|דליפ|זיהום|חובש|פונה|פונו|החייאה|תגובה אלרגית|תוצאות הבחירות|ספירת|מנדטים|שיעור ההצבעה|אחוז ההצבעה|שביתה|מתקפ|טיל|יירוט|רעידת אדמה/;
function isFlash(s: Any) {
  if (s.kind === 'sponsored' || s.kind === 'opinion' || s.format) return false;
  if (/^auto:|hns-recurring|hns-data/.test(String(s.notes || ''))) return false;
  // 29.10.2026 (Yakir): a result of the Maccabi Netanya senior team is a flash too (not youth teams, transfers or previews)
  if (s.section === 'sports') {
    const t = `${s.title || ''}`;
    return /מכבי נתניה/.test(t) && /\d+\s*:\s*\d+|ניצח|הפסיד|סיימה|תיקו|גברה|נוצחה/.test(t) && !/נערים|נוער|ילדים|ילדות|נשים|נערות|עד גיל|U\d|קבוצת המילואים|לפני המשחק|הרכב/.test(t);
  }
  if (NO_FLASH_SEC.has(s.section)) return false;
  if (s.section === 'flash' || s.section === 'police' || (s.closure && typeof s.closure === 'object')) return true;
  return URGENT.test(`${s.title || ''} ${s.dek || ''}`);
}
async function calendar() {
  const { data } = await sb.from('hns_cal').select('id,source_id,title,starts_at,venue,url').gte('starts_at', new Date().toISOString())
    .lte('starts_at', new Date(Date.now() + 45 * 864e5).toISOString()).order('starts_at').limit(120);
  const { data: srcs } = await sb.from('hns_sources').select('id,name_he').in('id', [...new Set((data || []).map((r: Any) => r.source_id))]);
  const nm = Object.fromEntries((srcs || []).map((r: Any) => [r.id, r.name_he]));
  return (data || []).map((r: Any) => ({ id: r.id, title: clean(r.title), start: r.starts_at, venue: clean(r.venue || ''), url: String(r.url || ''), source: nm[r.source_id] || '' }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  const url = new URL(req.url);
  if (url.searchParams.get('only') === 'flashes') {
    // the panel's view (hidden flashes too) only server to server, with the cron secret
    if (url.searchParams.get('all') === '1') {
      const { data: sec } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
      if (!sec?.v || req.headers.get('x-cron-secret') !== sec.v) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: H });
      return new Response(JSON.stringify({ ok: true, generated: new Date().toISOString(), flashes: await flashes(true) }), { headers: { ...H, 'cache-control': 'no-store' } });
    }
    return new Response(JSON.stringify({ ok: true, generated: new Date().toISOString(), flashes: await flashes() }), { headers: { ...H, 'cache-control': 'public, max-age=15' } });
  }
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 300));
  const { data, error } = await sb.from('hns_stories')
    .select('id,created_at,published_at,updated_at,section,title,dek,body,key_points,faq,places,sources,image_url,image_alt,image_model,kicker,kind,author,author_role,video_url,closure,pub_note,updates,extras,context_ids,service_box,format,format_data,notes')
    .eq('state', 'published').not('published_at', 'is', null)
    .order('published_at', { ascending: false }).limit(limit);
  if (error) return new Response(JSON.stringify({ ok: false, error: 'db' }), { status: 500, headers: H });
  const { data: outl } = await sb.from('hns_outlets').select('name');
  const outNames = (outl || []).map((r: Any) => String(r.name || '').trim().toLowerCase()).filter((n: string) => n.length >= 2);
  const kick = (k: unknown) => { const t = clean(k); if (!t) return ''; const low = t.toLowerCase(); return outNames.some((n: string) => low.includes(n)) ? '' : t.split(/\s+/).slice(0, 6).join(' '); };
  const nowMs = Date.now();
  const { data: evs } = await sb.from('hns_event').select('id,kind,title,tag,stat1,stat1_label,stat2,stat2_label,cta_text,cta_url,story_ids,block,starts_at,ends_at')
    .eq('active', true).order('starts_at', { ascending: false });
  const ev = (evs || []).find((e: Any) => Date.parse(e.starts_at) <= nowMs && (!e.ends_at || Date.parse(e.ends_at) > nowMs)) || null;
  const event = ev ? { id: ev.id, kind: ev.kind, title: clean(ev.title), tag: clean(ev.tag), stat1: clean(ev.stat1), stat1Label: clean(ev.stat1_label), stat2: clean(ev.stat2), stat2Label: clean(ev.stat2_label),
    ctaText: clean(ev.cta_text), ctaUrl: String(ev.cta_url || ''), storyIds: (ev.story_ids || []).map(Number), block: JSON.parse(JSON.stringify(ev.block || {}).replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ')), startsAt: ev.starts_at, endsAt: ev.ends_at } : null;
  const stories = (data || []).map((s: Any) => {
    const src = (Array.isArray(s.sources) ? s.sources : []).filter((x: Any) => x.trust === 'official').map((x: Any) => ({ name: clean(x.name).replace(/\s*-\s*ערוץ טלגרם( רשמי)?$/, ''), url: String(x.url || '') }));
    return {
      id: s.id, section: s.section || null, title: clean(s.title), dek: clean(s.dek), body: arr(s.body), keyPoints: arr(s.key_points), faq: faq(s.faq),
      places: arr(s.places), date: s.created_at, publishedAt: s.published_at, updatedAt: /^עודכן/.test(String(s.pub_note || '')) ? s.updated_at : null,
      sourceName: src[0]?.name || '', sourceUrl: src[0]?.url || '', sources: src,
      kicker: kick(s.kicker), kind: ['opinion', 'sponsored'].includes(s.kind) ? s.kind : 'news', author: clean(s.author), authorRole: clean(s.author_role), video: s.video_url || '',
      closure: s.closure && typeof s.closure === 'object' ? { place: clean(s.closure.place), what: clean(s.closure.what), until: String(s.closure.until || ''), approx: !!s.closure.approx } : null,
      image: s.image_url ? { url: s.image_url, alt: clean(s.image_alt), model: s.image_model || '', ai: true } : null,
      updates: (Array.isArray(s.updates) ? s.updates : []).map((u: Any) => ({ at: u.at, text: clean(u.text) })).filter((u: Any) => u.at && u.text),
      live: (Array.isArray(s.updates) ? s.updates : []).some((u: Any) => Date.now() - Date.parse(u.at) < 6 * 3600e3),
      extras: s.extras && typeof s.extras === 'object' ? Object.fromEntries(Object.entries(s.extras).filter(([k]) => k !== 'hold' && k !== 'manual')) : {},
      contextIds: (s.context_ids || []).map(Number), serviceBox: cleanJson(s.service_box), format: s.format || null, formatData: cleanJson(s.format_data), flash: isFlash(s),
      // 29.10.2026: fixed recurring pieces (Shabbat times, weather, weekend guide, events, day summary, data pieces) never lead the home page
      routine: !!s.format || /^auto:|hns-recurring|hns-data/.test(String(s.notes || '')),
    };
  });
  // stories merged into another one: the site sends their old URL to the main story (301)
  const { data: mg } = await sb.from('hns_stories').select('id,section,merged_into').eq('state', 'withdrawn').not('merged_into', 'is', null).limit(500);
  const secOf = new Map((data || []).map((s: Any) => [s.id, s.section]));
  const merged = (mg || []).filter((m: Any) => secOf.has(m.merged_into)).map((m: Any) => ({ id: m.id, section: m.section, into: m.merged_into, intoSection: secOf.get(m.merged_into) }));
  // the home page lead pinned in the panel, while it is published and the time has not passed
  const { data: pinRow } = await sb.from('hns_config').select('v').eq('k', 'site_pin').maybeSingle();
  const pv: Any = pinRow?.v;
  const pin = pv && pv.id && secOf.has(Number(pv.id)) && (!pv.until || Date.parse(pv.until) > nowMs) ? { id: Number(pv.id), until: pv.until || null } : null;
  const [fl, cal] = await Promise.all([flashes(), calendar()]);
  // 29.10.2026: live service data for the /now/ pages (docs coll 'nwslive', e.g. id 'pharmacy' written by the municipality task)
  const { data: lv } = await sb.from('docs').select('id,data').eq('coll', 'nwslive');
  const live = Object.fromEntries((lv || []).map((r: Any) => [r.id, cleanJson(r.data)]));
  return new Response(JSON.stringify({ ok: true, generated: new Date().toISOString(), count: stories.length, stories, event, flashes: fl, calendar: cal, merged, pin, live }), { headers: H });
});
