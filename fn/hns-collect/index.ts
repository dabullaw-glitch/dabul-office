// hns-collect (23.10.2026): news engine of HNS (חדשות נתניה והשרון), SHADOW MODE. Nothing is published from here.
// Yakir approved building the engine; publishing, channels and any paid service wait for his approval at the end.
// POST (x-cron-secret) {action:'tick'}            -> cron every minute: polls the due sources in hns_sources, stores new items
//                                                   in hns_items (place filter, topic, sensitivity), and once a day at 08:00
//                                                   Israel time sends Yakir the comparison report for the day before.
// POST (x-cron-secret) {action:'report', day?, send?} -> build (and optionally send) the comparison report for a day (YYYY-MM-DD).
// POST (x-cron-secret) {action:'poll', id}         -> poll one source now (testing).
// Rules: media feeds keep only the headline, a short teaser and the link (internal use). Community channels are tips only.
// The competitor (netanyanet) is read only to compare coverage and timing, never to publish from.
// 28.10.2026 (more official sources): kind 'youtube' (Atom feed of an official channel, e.g. the Netanya municipality channel) and
//   kind 'smarticket' (the official listing of the Netanya Culture Hall). Listing events are not news items: they go to the table
//   hns_cal (one row per show and date, refreshed on every poll) and the site shows them as the events calendar. hns-write never
//   reads hns_cal, so the calendar costs no AI calls.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const sb = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// ---------- text helpers ----------
const ENT: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"' };
function decode(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
// feeds that escape their HTML (IMS) get one decode before the tags are removed
const unesc = (s: string) => (/&lt;\/?[a-z]/i.test(s) ? decode(s) : s);
const cdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const strip = (s: string) => decode(unesc(cdata(s)).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const norm = (s: string) => s.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? cdata(m[1]).trim() : '';
}

// Israel local time -> UTC ms
function ilToMs(y: number, mo: number, d: number, h: number, mi: number) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3;
}
const ilParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
const ilDay = (d: Date) => { const p = ilParts(d); return `${p.year}-${p.month}-${p.day}`; };
const ilHM = (d: Date) => { const p = ilParts(d); return `${p.hour}:${p.minute}`; };

// ---------- places ----------
const NETANYA = ['נתניה', 'לניאדו'];
const LOCALITIES = ['בית ינאי', 'אבן יהודה', 'קדימה', 'צורן', 'עמק חפר', 'כפר יונה', 'תל מונד', 'פרדסיה', 'פרדסייה',
  'מכמורת', 'כפר ויתקין', 'בית יצחק', 'שער חפר', 'חניאל', 'משמר השרון', 'בית חרות', 'חרב לאת', 'גבעת שפירא', 'עין החורש',
  'מעברות', 'גן יאשיה', 'עולש', 'אחיטוב', 'בורגתה', 'הדר עם', 'כפר חיים', 'כפר הרא"ה', 'כפר הראה', 'כפר מונש', 'אביחיל', 'אלישיב',
  'בחן', 'בת חפר', 'גאולי תימן', 'חיבת ציון', 'כפר ידידיה', 'בת חן', 'יכיני', 'בית ליד', 'צור משה', 'אודים', 'גבעת חיים',
  'המעפיל', 'אומץ', 'בית הלוי', 'בארות יצחק', 'בני דרור', 'גאולים', 'ינוב', 'תנובות', 'עין ורד', 'כפר הס', 'חוף בית ינאי', 'מחלף נתניה', 'מחלף פולג', 'צומת פולג', 'צומת השרון'];
const HOODS = ['פולג', 'רמת פולג', 'עיר ימים', 'קריית השרון', 'קרית השרון', 'קריית נורדאו', 'קרית נורדאו', 'אגמים', 'נאות שקד', 'נאות הרצל', 'דורה',
  'קריית צאנז', 'קרית צאנז', 'ותיקים', 'גבעת האירוסים', 'רמת חן', 'גלי ים', 'נאות גנים', 'נווה איתמר', 'נוף הטיילת', 'עין התכלת', 'פרדס הגדוד',
  'רמת אפריים', 'אופק הים', 'קריית רבין', 'קרית רבין', 'כוכב הצפון', 'משכנות זבולון', 'סלע', 'רמת ידין', 'חפציבה', 'קריית הספורט', 'כיכר העצמאות', 'שדרות בנימין', 'הרצל'];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRe = (t: string) => new RegExp(`(?<![א-ת])(?:[ובכלמשה]{0,3})${esc(t)}(?![א-ת])`);
const RE_N = NETANYA.map((t) => [t, termRe(t)] as const);
const RE_L = LOCALITIES.map((t) => [t, termRe(t)] as const);
const RE_H = HOODS.map((t) => [t, termRe(t)] as const);
// 28.10.2026: some locality names are also everyday words ("אומץ" courage, "קדימה" forward, "המבחן" read as בחן).
// National stories were taken as local because of them. Such a name counts only on a local source, next to Netanya,
// next to another locality, or with a local word (מושב, קיבוץ, השרון, עמק חפר...).
const AMBIG = new Set(['אומץ', 'בחן', 'קדימה', 'אודים', 'המעפיל', 'גאולים', 'תנובות', 'ינוב', 'יכיני', 'עולש', 'אחיטוב', 'בת חן']);
const CONTEXT_RE = /נתני(?!הו)|השרון|עמק חפר|מושב|קיבוץ|יישוב|המועצה|מועצה אזורית|צורן|כביש (?:2|4|57)(?![0-9])/;
function placesIn(text: string, localOnly: boolean, extra: string[]) {
  const t = norm(text);
  const found = new Set<string>();
  let netanya = false;
  for (const [n, re] of RE_N) if (re.test(t)) { netanya = true; found.add('נתניה'); if (n === 'לניאדו') found.add('לניאדו'); }
  const weak: string[] = [];
  for (const [n, re] of RE_L) if (re.test(t)) {
    const name = n.replace('כפר הראה', 'כפר הרא"ה').replace('פרדסייה', 'פרדסיה');
    if (AMBIG.has(n)) weak.push(name); else found.add(name);
  }
  if (weak.length && (localOnly || netanya || found.size > 0 || CONTEXT_RE.test(t))) for (const w of weak) found.add(w);
  // neighborhood names are common words, so they count only next to "נתניה" or on a local source
  if (netanya || localOnly) for (const [n, re] of RE_H) if (re.test(t)) found.add(n.replace('קרית', 'קריית'));
  let extraHit = false;
  for (const e of extra) if (termRe(e).test(t)) extraHit = true;
  const local = localOnly || found.size > 0 || extraHit;
  return { places: [...found], local };
}

// IMS warning regions that include Netanya and its coast
const IMS_TERMS = ['ים התיכון', 'הים התיכון', 'מישור החוף', 'השרון', 'צפון השרון', 'דרום השרון', 'רוב חלקי הארץ', 'כל הארץ'];

// ---------- topic and sensitivity ----------
const has = (t: string, words: string[]) => words.some((w) => t.includes(w));
function topicOf(t: string, sourceId: string) {
  if (sourceId === 'oref_tg' || sourceId === 'ims_warn') return 'flash';
  if (sourceId === 'fcmn') return 'sports';
  if (sourceId === 'netanya_updates_tg' || has(t, ['מכבי נתניה', 'כדורגל', 'כדורסל', 'ליגת העל', 'הליגה הלאומית', 'אצטדיון'])) return 'sports';
  if (has(t, ['פינוי בינוי', 'פינוי-בינוי', 'התחדשות עירונית', 'תמ"א', 'ועדה המקומית', 'הוועדה המקומית', 'ועדה מחוזית', 'תב"ע', 'היתר בני', 'יחידות דיור', 'נדל"ן', 'דירות', 'מגדל מגורים', 'שכונה חדשה', 'קבלן'])) return 'realestate';
  if (has(t, ['תאונ', 'נפגע', 'נפצע', 'פצוע', 'שריפ', 'שרפה', 'הצתה', 'ירי', 'דקיר', 'נעצר', 'חשוד', 'שוטר', 'משטרה', 'מד"א', 'כבאות', 'רצח', 'נהרג', 'רוח חיים', 'החייאה', 'דום לב', 'נפל מגובה', 'התרעה', 'אזעקה', 'רקטות', 'כלי טיס'])) return 'flash';
  if (has(t, ['הופעה', 'פסטיבל', 'הצגה', 'היכל התרבות', 'מופע', 'קונצרט', 'תערוכה', 'סדנה'])) return 'leisure';
  if (has(t, ['מלון', 'תיירים', 'תיירות', 'טיילת', 'חוף ', 'חופי'])) return 'tourism';
  if (has(t, ['מועצה', 'מועצת', 'ראש העיר', 'עירייה', 'עיריית', 'ארנונה', 'תקציב', 'בית ספר', 'גני ילדים', 'חינוך', 'כביש', 'עבודות', 'תחבורה'])) return 'city';
  return 'community';
}
function sensitivityOf(t: string) {
  if (has(t, ['רצח', 'נרצח', 'נהרג', 'נהרגה', 'רוח חיים', 'נפטר', 'מוות', 'מותו', 'התאבד', 'אונס', 'מינית', 'מיניות', 'קטין', 'קטינה', 'פעוט', 'תינוק', 'ילד בן', 'ילדה בת', 'נער בן', 'נערה בת', 'חלל', 'נפל בקרב', 'הותר לפרסום', 'אלימות במשפחה', 'נעדר', 'נעדרת', 'פיגוע', 'אנוש'])) return 'sensitive';
  return 'normal';
}
const urgentOf = (sourceId: string, t: string, local: boolean) =>
  local && sourceId === 'oref_tg' && has(t, ['ירי רקטות', 'חדירת', 'היכנסו', 'טילים', 'רעידת אדמה', 'צונאמי']);

// ---------- parsers ----------
interface Raw { guid: string; url?: string; title: string; body?: string; published_at?: string | null }
function parseTelegram(html: string, base: string): Raw[] {
  const out: Raw[] = [];
  const parts = html.split('data-post="').slice(1);
  for (const p of parts) {
    const post = p.slice(0, p.indexOf('"'));
    const ti = p.indexOf('js-message_text');
    if (ti < 0) continue;
    const st = p.indexOf('>', ti) + 1;
    const txt = strip(p.slice(st, p.indexOf('</div>', st)));
    if (!txt) continue;
    const dm = p.match(/datetime="([^"]+)"/);
    const first = txt.split('\n').find((l) => l.replace(/[^\p{L}\p{N}]/gu, '').length > 3) || txt;
    out.push({ guid: post, url: `https://t.me/${post}`, title: clip(first.trim(), 160), body: clip(txt, 1500), published_at: dm ? new Date(dm[1]).toISOString() : null });
  }
  void base;
  return out;
}
function parseRss(xml: string): Raw[] {
  const out: Raw[] = [];
  for (const b of xml.split(/<item[\s>]/i).slice(1)) {
    const title = strip(tag(b, 'title'));
    const link = strip(tag(b, 'link')) || (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const guid = strip(tag(b, 'guid')) || link || title;
    const pd = tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published');
    const t = pd ? Date.parse(pd) : NaN;
    const desc = clip(strip(tag(b, 'description')), 600);
    if (!title) continue;
    out.push({ guid: guid.slice(0, 300), url: link, title: clip(title, 220), body: desc, published_at: isFinite(t) ? new Date(t).toISOString() : null });
  }
  return out;
}
// Atom (YouTube channel feeds): <entry> with title, link href, published and media:description
function parseAtom(xml: string): Raw[] {
  const out: Raw[] = [];
  for (const b of xml.split(/<entry[\s>]/i).slice(1)) {
    const title = strip(tag(b, 'title'));
    const link = (b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const guid = strip(tag(b, 'id')) || link || title;
    const t = Date.parse(tag(b, 'published') || tag(b, 'updated'));
    if (!title) continue;
    out.push({ guid: guid.slice(0, 300), url: link, title: clip(title, 220), body: clip(strip(tag(b, 'media:description')), 900), published_at: isFinite(t) ? new Date(t).toISOString() : null });
  }
  return out;
}
const HMONTHS: Record<string, number> = { 'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מרס': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12 };
function parseNetanyanet(html: string): Raw[] {
  const seen = new Map<string, Raw>();
  const re = /href="(\/(?:חדשות-נתניה|חדשות-השרון|%D7%97%D7%93%D7%A9%D7%95%D7%AA)[^"]*?\/(\d{4,6})-[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = m[2];
    let text = strip(m[3]).replace(/\n/g, ' ').trim();
    if (text.length < 15) continue;
    let published: string | null = null;
    const dm = text.match(/(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת),\s*(\d{1,2})\s+([א-ת]+)\s+(\d{4})(?:\s*\|\s*(\d{1,2}):(\d{2}))?/);
    if (dm && HMONTHS[dm[2]]) {
      if (dm[4]) published = new Date(ilToMs(+dm[3], HMONTHS[dm[2]], +dm[1], +dm[4], +dm[5])).toISOString();
      text = text.replace(dm[0], ' ').replace(/\s+/g, ' ').trim();
    }
    let path = m[1]; try { path = decodeURI(path); } catch { /* keep */ }
    const prev = seen.get(id);
    if (prev) { if (!prev.published_at && published) prev.published_at = published; if (text.length < (prev.title || '').length) prev.title = clip(text, 200); continue; }
    seen.set(id, { guid: id, url: 'https://www.netanyanet.co.il' + path, title: clip(text, 200), body: clip(text, 400), published_at: published });
  }
  return [...seen.values()];
}

// Smarticket listing (Netanya Culture Hall): one "show_cube" per show, with the name, the hall, and the date and time when one is set
interface CalRow { guid: string; title: string; starts_at: string; venue: string | null; url: string }
function parseSmarticket(html: string, base: string): CalRow[] {
  const out = new Map<string, CalRow>();
  for (const b of html.split('class="show_cube').slice(1)) {
    const href = (b.match(/<a[^>]+href="([^"]+)"/) || [])[1] || '';
    const title = strip((b.match(/id="show_name_\d+"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '');
    const venue = strip((b.match(/class="theater_name"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '') || null;
    const dm = strip((b.match(/class="show_date"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '').match(/(\d{1,2})\s+ב?([א-ת]+)\s+(\d{4})/);
    const tm = strip((b.match(/class="event-time"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '').match(/(\d{1,2}):(\d{2})/);
    if (!href || !title || !dm || !HMONTHS[dm[2]]) continue; // a series or a product without a date is not an event
    const ms = ilToMs(+dm[3], HMONTHS[dm[2]], +dm[1], tm ? +tm[1] : 0, tm ? +tm[2] : 0);
    let url = href; try { url = new URL(href, base).toString(); } catch { /* keep */ }
    const starts_at = new Date(ms).toISOString();
    out.set(`${href}|${starts_at}`, { guid: `${href}|${starts_at}`.slice(0, 300), title: clip(title, 200), starts_at, venue, url });
  }
  return [...out.values()];
}

// ---------- polling ----------
async function fetchText(url: string, src: Any) {
  const h: Record<string, string> = { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.5' };
  if (src.etag) h['If-None-Match'] = src.etag;
  if (src.last_modified) h['If-Modified-Since'] = src.last_modified;
  const r = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) });
  if (r.status === 304) return { status: 304, text: '', etag: src.etag, lm: src.last_modified };
  const buf = new Uint8Array(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || '';
  let cs = (ct.match(/charset=([^;]+)/i) || [])[1] || '';
  if (!cs) { const head = new TextDecoder('latin1').decode(buf.slice(0, 300)); cs = (head.match(/encoding="([^"]+)"/i) || [])[1] || 'utf-8'; }
  let text: string;
  try { text = new TextDecoder(cs.trim().toLowerCase()).decode(buf); } catch { text = new TextDecoder().decode(buf); }
  return { status: r.status, text, etag: r.headers.get('etag'), lm: r.headers.get('last-modified') };
}

async function pollSource(src: Any) {
  const now = new Date().toISOString();
  try {
    const r = await fetchText(src.url, src);
    if (r.status === 304) { await sb.from('hns_sources').update({ last_run: now, last_ok: now, last_error: null, fails: 0 }).eq('id', src.id); return { id: src.id, new: 0, status: 304 }; }
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
    if (src.kind === 'smarticket') {
      const cal = parseSmarticket(r.text, src.url);
      if (!cal.length) throw new Error('no events parsed');
      const rows = cal.map((c) => ({ ...c, source_id: src.id, fetched_at: now }));
      const { error } = await sb.from('hns_cal').upsert(rows, { onConflict: 'source_id,guid' });
      if (error) throw new Error('db: ' + error.message);
      await sb.from('hns_sources').update({ last_run: now, last_ok: now, last_error: null, fails: 0, etag: r.etag || null, last_modified: r.lm || null }).eq('id', src.id);
      return { id: src.id, events: cal.length };
    }
    const raw = src.kind === 'telegram' ? parseTelegram(r.text, src.url) : src.kind === 'rss' ? parseRss(r.text) : src.kind === 'youtube' ? parseAtom(r.text) : src.kind === 'netanyanet' ? parseNetanyanet(r.text) : [];
    if (!raw.length) throw new Error('no items parsed');
    const first = !src.last_ok;
    const rows = raw.map((x) => {
      const all = `${x.title}\n${x.body || ''}`;
      const { places, local } = placesIn(all, !!src.local_only, [...(src.extra_terms || []), ...(src.id === 'ims_warn' ? IMS_TERMS : [])]);
      const t = norm(all);
      return {
        source_id: src.id, guid: x.guid, url: x.url || null, title: x.title, body: x.body || null, published_at: x.published_at || null,
        backfill: first, places, is_local: local, topic: topicOf(t, src.id), sensitivity: sensitivityOf(t), urgent: urgentOf(src.id, t, local),
      };
    });
    const { data, error } = await sb.from('hns_items').upsert(rows, { onConflict: 'source_id,guid', ignoreDuplicates: true }).select('id,is_local,urgent');
    if (error) throw new Error('db: ' + error.message);
    await sb.from('hns_sources').update({ last_run: now, last_ok: now, last_error: null, fails: 0, etag: r.etag || null, last_modified: r.lm || null }).eq('id', src.id);
    return { id: src.id, parsed: raw.length, new: (data || []).length, local: (data || []).filter((x: Any) => x.is_local).length };
  } catch (e) {
    await sb.from('hns_sources').update({ last_run: now, last_error: String((e as Error).message || e).slice(0, 300), fails: (src.fails || 0) + 1 }).eq('id', src.id);
    return { id: src.id, error: String((e as Error).message || e) };
  }
}

async function tick() {
  const { data: srcs } = await sb.from('hns_sources').select('*').eq('enabled', true);
  const nowMs = Date.now();
  const due = (srcs || []).filter((s: Any) => {
    // back off after failures: wait poll_min * 2^fails, up to 6 hours
    const wait = Math.min(s.poll_min * Math.pow(2, Math.min(s.fails || 0, 8)), 360) * 60e3 - 20e3;
    return !s.last_run || nowMs - Date.parse(s.last_run) >= wait;
  }).slice(0, 20);
  const res = await Promise.all(due.map(pollSource));
  // daily comparison report at 08:00 Israel time for the day before
  let report: Any = null;
  const p = ilParts(new Date());
  if (+p.hour === 8) {
    const y = ilDay(new Date(Date.now() - 24 * 3600e3));
    const { data: done } = await sb.from('hns_reports').select('day,sent_at').eq('day', y).maybeSingle();
    if (!done || !done.sent_at) report = await buildReport(y, true);
  }
  return { polled: res, report: report ? { day: report.day, sent: report.sent } : null };
}

// ---------- comparison report ----------
const STOP = new Set(['נתניה', 'בנתניה', 'מנתניה', 'לנתניה', 'שנתניה', 'ברחוב', 'רחוב', 'היום', 'אתמול', 'הערב', 'הבוקר', 'לאחר', 'במהלך', 'סמוך', 'בסמוך', 'כבן', 'כבת', 'אשר', 'אשה', 'אישה', 'גבר', 'בעיר', 'העיר', 'עדכון', 'דוברות', 'מד"א', 'התקבל', 'דיווח', 'במוקד', 'מעניקים', 'טיפול', 'רפואי', 'ומפנים', 'חובשים', 'ופראמדיקים', 'ופרמדיקים', 'במצב', 'השרון', 'ראשוני']);
function toks(s: string) {
  return new Set(norm(s).replace(/[^\p{L}\p{N}"\s]/gu, ' ').split(/\s+/).map((w) => w.replace(/^"|"$/g, ''))
    .map((w) => (w.length > 4 && /^[ובלמהש]/.test(w) ? w.slice(1) : w)).filter((w) => w.length >= 3 && !STOP.has(w)));
}
function sim(a: Set<string>, b: Set<string>) { let n = 0; for (const x of a) if (b.has(x)) n++; return { n, r: n / Math.max(1, Math.min(a.size, b.size)) }; }
const HE_NAME: Record<string, string> = { ynet_flash: 'מבזקי וויינט', ynet_news: 'וויינט', walla_israel: 'וואלה', maariv_news: 'מעריב', globes_markets: 'גלובס', news08: 'חדשות 08' };

async function buildReport(day: string, send: boolean) {
  const [y, m, d] = day.split('-').map(Number);
  const from = new Date(ilToMs(y, m, d, 0, 0)), to = new Date(ilToMs(y, m, d, 24, 0));
  const lo = new Date(from.getTime() - 12 * 3600e3).toISOString(), hi = new Date(to.getTime() + 6 * 3600e3).toISOString();
  const { data: srcs } = await sb.from('hns_sources').select('id,name_he,role,enabled,last_ok,last_error,fails');
  const role = Object.fromEntries((srcs || []).map((s: Any) => [s.id, s.role]));
  const nameOf = (id: string) => HE_NAME[id] || (srcs || []).find((s: Any) => s.id === id)?.name_he || id;
  const { data: rows } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,backfill,is_local,places,sensitivity')
    .or(`published_at.gte.${lo},and(published_at.is.null,fetched_at.gte.${lo})`).eq('is_local', true).order('id', { ascending: false }).limit(3000);
  const when = (x: Any) => Date.parse(x.published_at || x.fetched_at);
  const hiMs = Date.parse(hi);
  const items = (rows || []).filter((x: Any) => when(x) < hiMs);
  const inDay = (x: Any) => { const t = when(x); return t >= from.getTime() && t < to.getTime(); };
  const theirs = (items || []).filter((x: Any) => role[x.source_id] === 'competitor' && inDay(x) && (!x.backfill || x.published_at));
  const ours = (items || []).filter((x: Any) => role[x.source_id] !== 'competitor');
  const oursDay = ours.filter(inDay);
  const tk = new Map<number, Set<string>>(); for (const x of items || []) tk.set(x.id, toks(`${x.title} ${x.body || ''}`));
  const matched: Any[] = [], missed: Any[] = [];
  const usedOurs = new Set<number>();
  for (const c of theirs) {
    let best: Any = null, bestR = 0;
    for (const o of ours) {
      if (Math.abs(when(o) - when(c)) > 18 * 3600e3) continue;
      const s = sim(tk.get(c.id)!, tk.get(o.id)!);
      const placeHit = (c.places || []).some((p: string) => p !== 'נתניה' && (o.places || []).includes(p));
      if ((s.n >= 3 && s.r >= 0.3) || (s.n >= 2 && placeHit)) { if (s.r > bestR) { bestR = s.r; best = o; } }
    }
    if (best) { usedOurs.add(best.id); matched.push({ c, o: best, lead: Math.round((when(c) - when(best)) / 60e3) }); } else missed.push(c);
  }
  const extra = oursDay.filter((o: Any) => !usedOurs.has(o.id) && role[o.source_id] === 'source');
  const firstUs = matched.filter((x) => x.lead > 0).length;
  const lines: string[] = [];
  lines.push(`📊 חדשות נתניה והשרון, דוח השוואה (מצב ניסיון, שום דבר לא מתפרסם)`);
  lines.push(`יום ${d}.${m}.${y}`);
  lines.push('');
  lines.push(`נתניהנט פרסמו ${theirs.length} ידיעות. המערכת שלנו תפסה ${matched.length} מהן${matched.length ? `, ב־${firstUs} מהן לפניהם` : ''}.`);
  if (matched.length) {
    lines.push(''); lines.push('✅ תפסנו:');
    for (const x of matched.slice(0, 8)) lines.push(`• ${clip(x.c.title, 90)} (${nameOf(x.o.source_id)}, ${x.lead > 0 ? `${x.lead} דק׳ לפניהם` : x.lead < 0 ? `${-x.lead} דק׳ אחריהם` : 'באותו זמן'})`);
  }
  if (missed.length) {
    lines.push(''); lines.push('❌ פספסנו (אין לנו מקור לזה עדיין):');
    for (const x of missed.slice(0, 10)) lines.push(`• ${clip(x.title, 90)}`);
  }
  if (extra.length) {
    lines.push(''); lines.push(`➕ ידיעות מקומיות שתפסנו ולא ראינו אצלם (${extra.length}):`);
    for (const x of extra.slice(0, 8)) lines.push(`• ${clip(x.title, 90)} (${nameOf(x.source_id)}, ${ilHM(new Date(when(x)))})`);
  }
  const bad = (srcs || []).filter((s: Any) => s.enabled && (s.fails || 0) >= 3);
  if (bad.length) { lines.push(''); lines.push('⚠️ מקורות שלא עונים: ' + bad.map((s: Any) => nameOf(s.id)).join(', ')); }
  const text = lines.join('\n');
  const body = { theirs: theirs.length, matched: matched.length, firstUs, missed: missed.map((x: Any) => ({ title: x.title, url: x.url })), extra: extra.length, text };
  let sent = false;
  if (send && S.TELEGRAM_BOT_TOKEN && S.TELEGRAM_CHAT_ID) {
    const r = await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: text.slice(0, 3900), disable_web_page_preview: true }) }).then((r) => r.json()).catch(() => null);
    sent = !!(r && r.ok);
  }
  await sb.from('hns_reports').upsert({ day, body, sent_at: sent ? new Date().toISOString() : null }, { onConflict: 'day' });
  return { day, sent, ...body };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick()) });
    if (b.action === 'poll') { const { data } = await sb.from('hns_sources').select('*').eq('id', b.id).maybeSingle(); return J(data ? await pollSource(data) : { error: 'no source' }); }
    if (b.action === 'report') return J(await buildReport(b.day || ilDay(new Date()), !!b.send));
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
