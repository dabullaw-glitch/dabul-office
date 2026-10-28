// hns-official (28.10.2026): collector for OFFICIAL sources that hns-collect cannot parse (plain HTML pages of official bodies).
// Same contract as hns-collect: rows go to hns_items in exactly the same shape (source_id, guid, url, title, body, published_at,
// backfill, places, is_local, topic, sensitivity, urgent), with the same place, topic and sensitivity logic (copied from
// hns-collect, keep in sync) and the same dedupe key (source_id, guid). hns-write picks them up like any other item.
// Sources: rows of hns_sources with kind 'html' (enabled=false so hns-collect, which polls every enabled row, stays away).
// The parser is chosen by the source id (PARSERS below). Each source is polled every poll_min minutes; failures back off.
//   mei_netanya_water  Mei Netanya (the city water company): the table of planned water cuts (street, date, hours). One item per day
//                      with all its streets; a changed list for the same day is a new item (hns-write attaches it to the story).
//   hof_hasharon       Hof HaSharon regional council: the news list (id, date, title).
// Checked from the edge runtime on 28.10.2026 and NOT usable (blocked outside Israel, captcha or login), see the report:
//   oref.org.il alerts JSON (Akamai 403, the Telegram channel PikudHaOref_all in hns-collect is the replacement), netanya.muni.il,
//   kfar-yona, even-yehuda, tel-mond, pardesia, hefer, lev-hasharon (403), gov.il / police.gov.il / 102.gov.il (Cloudflare check),
//   rail.co.il (403), mdais.org (bot check), meinetanya.co.il (403), mavat search (captcha), govmap deals (reCAPTCHA),
//   IEC outage search (login), ags.iplan.gov.il (TLS handshake fails).
// POST (x-cron-secret): {action:'tick'} cron every 5 minutes, polls the due sources.
//                       {action:'poll', id} polls one source now.  {action:'probe', urls:[...]} diagnostics (status and a snippet).
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
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

// Israel local time -> UTC ms
function ilToMs(y: number, mo: number, d: number, h: number, mi: number) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3;
}
const ilParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
const ilDay = (d: Date) => { const p = ilParts(d); return `${p.year}-${p.month}-${p.day}`; };

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

// ---------- topic and sensitivity (same as hns-collect) ----------
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

// ---------- parsers (one per official page) ----------
interface Raw { guid: string; url?: string; title: string; body?: string; published_at?: string | null }
const pad = (n: number) => String(n).padStart(2, '0');
const todayIL = () => ilDay(new Date());

// Mei Netanya: <table> rows of <td>street</td><td>dd/mm/yyyy</td><td>hh:mm-hh:mm</td>; past days are skipped
function parseMeiWater(html: string, url: string): Raw[] {
  const rows: { street: string; day: string; hours: string }[] = [];
  for (const tr of html.split(/<tr[\s>]/i).slice(1)) {
    const td = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => strip(m[1]).replace(/\s+/g, ' ').trim());
    if (td.length < 3) continue;
    const dm = td[1].match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/);
    if (!dm || !td[0] || td[0] === 'כתובת') continue;
    const y = dm[3].length === 2 ? 2000 + +dm[3] : +dm[3];
    rows.push({ street: td[0], day: `${y}-${pad(+dm[2])}-${pad(+dm[1])}`, hours: td[2].replace(/\s+/g, '') });
  }
  const today = todayIL();
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) if (r.day >= today) byDay.set(r.day, [...(byDay.get(r.day) || []), r]);
  const out: Raw[] = [];
  for (const [day, list] of byDay) {
    const [y, m, d] = day.split('-');
    const streets = [...new Set(list.map((r) => r.street))];
    const lines = list.map((r) => `${r.street}: ${r.hours}`);
    const title = clip(`הפסקת מים מתוכננת בנתניה ב-${+d}.${+m}.${y} ברחובות ${streets.join(', ')}`, 220);
    const body = clip(`מי נתניה הודיעה על הפסקת מים מתוכננת בנתניה ביום ${+d}.${+m}.${y}, בגלל עבודות בצנרת. רחובות ושעות משוערות:\n${lines.join('\n')}\nמוקד מי נתניה: 1-800-20-20-84.`, 1500);
    const sig = [...lines].sort().join('|');
    let h = 0; for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
    out.push({ guid: `water:${day}:${(h >>> 0).toString(36)}`, url, title, body, published_at: null });
  }
  return out;
}

// council CMS news list: <a href="./news/177/"><time>19/10/2026</time><span class="title">...</span></a>
function parseCmsNews(html: string, url: string): Raw[] {
  const base = new URL(url);
  const out: Raw[] = [];
  const re = /<a[^>]+href="(\.?\/?news\/(\d+)\/?)"[^>]*>\s*<time[^>]*>([^<]+)<\/time>\s*<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html))) {
    const id = m[2]; if (seen.has(id)) continue; seen.add(id);
    const title = strip(m[4]).replace(/\s+/g, ' ').trim();
    if (title.length < 6) continue;
    const dm = m[3].match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
    const published = dm ? new Date(ilToMs(+dm[3], +dm[2], +dm[1], 9, 0)).toISOString() : null;
    out.push({ guid: id, url: new URL(`/news/${id}/`, base.origin).toString(), title: clip(title, 220), body: '', published_at: published });
  }
  return out;
}
const PARSERS: Record<string, (html: string, url: string) => Raw[]> = { mei_netanya_water: parseMeiWater, hof_hasharon: parseCmsNews };

// ---------- polling (same row shape as hns-collect) ----------
async function pollSource(src: Any) {
  const now = new Date().toISOString();
  const parse = PARSERS[src.id];
  try {
    if (!parse) throw new Error('no parser for this source id');
    const r = await fetch(src.url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.5' }, signal: AbortSignal.timeout(20000) });
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
    const raw = parse(await r.text(), src.url);
    // an empty water table is normal (no planned cuts); a news list must have items
    if (!raw.length && src.id !== 'mei_netanya_water') throw new Error('no items parsed');
    const first = !src.last_ok;
    const rows = raw.map((x) => {
      const all = `${x.title}\n${x.body || ''}`;
      const { places, local } = placesIn(all, !!src.local_only, src.extra_terms || []);
      const t = norm(all);
      return {
        source_id: src.id, guid: x.guid, url: x.url || null, title: x.title, body: x.body || null, published_at: x.published_at || null,
        backfill: first, places, is_local: local, topic: src.id === 'mei_netanya_water' ? 'city' : topicOf(t, src.id), sensitivity: sensitivityOf(t), urgent: false,
      };
    });
    let added: Any[] = [];
    if (rows.length) {
      const { data, error } = await sb.from('hns_items').upsert(rows, { onConflict: 'source_id,guid', ignoreDuplicates: true }).select('id,is_local');
      if (error) throw new Error('db: ' + error.message);
      added = data || [];
    }
    await sb.from('hns_sources').update({ last_run: now, last_ok: now, last_error: null, fails: 0 }).eq('id', src.id);
    return { id: src.id, parsed: raw.length, new: added.length, ids: added.map((x: Any) => x.id) };
  } catch (e) {
    await sb.from('hns_sources').update({ last_run: now, last_error: String((e as Error).message || e).slice(0, 300), fails: (src.fails || 0) + 1 }).eq('id', src.id);
    return { id: src.id, error: String((e as Error).message || e) };
  }
}

async function tick() {
  const { data: srcs } = await sb.from('hns_sources').select('*').eq('kind', 'html');
  const nowMs = Date.now();
  const due = (srcs || []).filter((s: Any) => PARSERS[s.id] && !/\bpaused\b/.test(s.notes || '')).filter((s: Any) => {
    const wait = Math.min(s.poll_min * Math.pow(2, Math.min(s.fails || 0, 8)), 360) * 60e3 - 20e3;
    return !s.last_run || nowMs - Date.parse(s.last_run) >= wait;
  });
  return { polled: await Promise.all(due.map(pollSource)) };
}

async function probe(list: Any[], n: number) {
  return await Promise.all(list.map(async (p: Any) => {
    const t0 = Date.now();
    try {
      const r = await fetch(p.url, { method: p.method || 'GET', headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9', ...(p.headers || {}) }, body: p.body ? (typeof p.body === 'string' ? p.body : JSON.stringify(p.body)) : undefined, signal: AbortSignal.timeout(p.timeout || 20000), redirect: 'follow' });
      const txt = await r.text();
      if (p.shape) { const sh = (v: Any, d: number): Any => Array.isArray(v) ? [`len ${v.length}`, ...(v.length && d < 4 ? [sh(v[0], d + 1)] : [])] : v && typeof v === 'object' ? (d < 4 ? Object.fromEntries(Object.entries(v).slice(0, 60).map(([k, x]) => [k, sh(x, d + 1)])) : '{..}') : typeof v === 'string' ? v.slice(0, 60) : v; return { url: p.url, status: r.status, len: txt.length, shape: sh(JSON.parse(txt), 0) }; }
      if (p.grep) { const re = new RegExp(p.grep, 'g'); const hits: string[] = []; let m; while ((m = re.exec(txt)) && hits.length < (p.max || 30)) { hits.push(txt.slice(Math.max(0, m.index - (p.ctx || 120)), m.index + m[0].length + (p.ctx || 120))); if (m[0] === '') re.lastIndex++; } return { url: p.url, status: r.status, len: txt.length, hits }; }
      const at = p.find ? Math.max(0, txt.indexOf(p.find) - 200) : 0;
      return { url: p.url, status: r.status, final: r.url, ct: r.headers.get('content-type'), len: txt.length, ms: Date.now() - t0, snip: txt.slice(at, at + (p.n || n)) };
    } catch (e) { return { url: p.url, error: String(e).slice(0, 200), ms: Date.now() - t0 }; }
  }));
}
Deno.serve(async (req) => {
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!data?.v || req.headers.get('x-cron-secret') !== data.v) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick()) });
    if (b.action === 'poll') { const { data: s } = await sb.from('hns_sources').select('*').eq('id', b.id).maybeSingle(); return J(s ? await pollSource(s) : { error: 'no source' }); }
    if (b.action === 'probe') return J({ ok: true, res: await probe(b.urls || [], b.n || 400) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
