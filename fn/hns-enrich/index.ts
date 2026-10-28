// hns-enrich (28.10.2026): enrichment stage of the HNS (חדשות נתניה והשרון, nws.co.il) news engine.
// Approved by Yakir on 28.10.2026 at 17:45 (content quality first). No AI calls: every match is computed from our own data.
// POST (x-cron-secret):
//   {action:'tick', all?, ids?, dry?}  cron every 10 minutes. For published stories that were published or changed in the last
//     48 hours and were not looked at since (all=true: every published story, ids: chosen stories):
//     a. context_ids: 1 to 3 of OUR earlier published stories (up to 60 days back) about the same event, place, team or topic.
//        A match needs real shared ground: a specific place (not just "נתניה"), a team, or distinctive shared words, and a total
//        score over the threshold. Never a sponsored story, never a roundup format, never a later story.
//     b. service_box: the "מה עושים" box from the curated table hns_service_boxes (official guidance only: MDA, IMS, Home Front
//        Command, the municipality, Netivei Israel, Ministry of Health), matched by section and keywords; the highest priority wins.
//        A story about a death, a sponsored story or a roundup gets no box.
//     Only these three columns (context_ids, service_box, enriched_at) are written, only on stories that are published. The text,
//     state and dates of the story are never touched (hns-publish keeps owning them).
//     dry=true: nothing is written, the answer shows what would be set.
//     A box keyword with '+' needs all its parts (e.g. 'כביש 2+חסימ').
//   {action:'checklinks'}  fetches every box link and saves the HTTP status (check_status, checked_at). Never changes a box.
//     Note: gov.il, oref.org.il, iroads.co.il and netanya.muni.il answer 403 to servers (bot protection); 403 there means the host
//     is up, not that the page is missing. 404 is the status to act on.
//   {action:'box_upsert', box:{key,title,lines,link_text,link_url,source_name,sections,keywords,exclude,priority,active,note}}
//     adds or changes one curated box (the table is edited only through here). Lines: 2 or 3, no dashes, official text only.
//   {action:'probe', urls:[...], find?:[...]}  fetches pages from the server side (status, title, matching links), used to pick
//     the official box links.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
async function cronSecret() {
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  return data?.v || '';
}

// ---------- words ----------
const norm = (s: string) => String(s || '').replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
// everyday news words that say nothing about WHICH event it is
const STOP = new Set(['נתניה', 'בנתניה', 'מנתניה', 'לנתניה', 'שנתניה', 'השרון', 'ברחוב', 'רחוב', 'היום', 'אתמול', 'הערב', 'הבוקר', 'מחר', 'לאחר', 'אחרי',
  'במהלך', 'סמוך', 'בסמוך', 'כבן', 'כבת', 'אשר', 'אישה', 'אשה', 'גבר', 'בעיר', 'העיר', 'עדכון', 'עודכן', 'דוברות', 'התקבל', 'דיווח', 'במוקד', 'טיפול',
  'רפואי', 'במצב', 'מצבו', 'מצבה', 'ראשוני', 'הפוסט', 'הופיע', 'לראשונה', 'כפי', 'שפורסם', 'פורסם', 'לפי', 'בית', 'החולים', 'פונה', 'פונתה', 'פונו',
  'יום', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'בשבת', 'השבוע', 'שעה', 'בשעה', 'שעות', 'בשעות', 'אחד', 'אחת', 'שתי', 'שלושה', 'שלוש',
  'ארבעה', 'הוא', 'היא', 'הם', 'הן', 'זה', 'זאת', 'גם', 'כך', 'כי', 'עם', 'של', 'על', 'אל', 'את', 'לא', 'כל', 'עוד', 'רק', 'בין', 'תושבי', 'תושבים',
  'מקום', 'במקום', 'נמסר', 'מסרו', 'הודיעו', 'הודעה', 'כולל', 'יותר', 'פחות', 'אצל', 'כמו', 'מאוד', 'לאור', 'בעקבות', 'שלא', 'שהוא', 'שהיא', 'היה', 'היתה',
  'הייתה', 'יהיה', 'תהיה', 'יוכלו', 'צפוי', 'צפויה', 'צפויים', 'נוסף', 'נוספת', 'נוספים', 'ראש', 'הקבוצה', 'משחק', 'המשחק', 'מול', 'נקודות',
  // the everyday words of emergency and police reports (MDA, police): every such report has them, so they never tie two events
  'מד"א', 'מדא', 'חובשים', 'פראמדיקים', 'פרמדיקים', 'בינוני', 'ינוני', 'קל', 'קשה', 'אנוש', 'נפצע', 'נפצעה', 'נפצעו', 'פצוע', 'פצועה', 'פצועים', 'נפגע',
  'נפגעה', 'נפגעו', 'פגע', 'מרכב', 'רכב', 'לבית', 'חולים', 'הכרה', 'בהכרה', 'צוותי', 'צוותים', 'מוקד', 'מרחב', 'שרון', 'טיפלו', 'פינו', 'עניקו', 'העניקו',
  'דברי', 'גיעו', 'הגיעו', 'התקבלה', 'תקבל', 'ודעת', 'הודעת', 'אירוע', 'אדם', 'אורח', 'באורח', 'עצרו', 'נעצר', 'נעצרה', 'נעצרו', 'עצר', 'הרקע', 'רקע',
  'פלילי', 'תחנת', 'שוטרי', 'שוטרים', 'משטרה', 'המשטרה', 'משטרת', 'חקירה', 'חקירת', 'בחקירה', 'כבן', 'כבת', 'בן', 'בת', 'שנים', 'אמבולנס', 'ניידת',
  'ראשונית', 'ראשוני', 'יציב', 'מלאה', 'התרחש', 'שהתרחש', 'ככל', 'הנראה', 'זירה', 'בזירה', 'מקבל', 'קיבל', 'קיבלה', 'דיווח', 'דיווחים',
  'ניאדו', 'לניאדו', 'ילינסון', 'בילינסון', 'חבלה', 'חבלת', 'חבלות', 'ראשו', 'בראשו', 'ראש']);
for (const w of ['עדיין', 'עירייה', 'עיריית', 'העירייה', 'עיר', 'מצב', 'מוגדר', 'דברים', 'בני', 'בנות', 'הודעת', 'אמר', 'אמרה', 'לדבריו', 'לדבריה', 'כדי', 'ללא', 'אבל',
  'היו', 'ראשונה', 'ראשונים', 'סיום', 'שלב', 'בשלב', 'החלטה', 'כבר', 'ביום', 'מכבי', 'הפועל', 'פועל', 'כבי', 'יתקיים', 'תתקיים',
  'יתקיימו', 'קבלת', 'בכל', 'יחד', 'כמה', 'חלק', 'אחר', 'אחרת', 'אחרים',
  // the vocabulary of data stories (prices, statistics): shared by unrelated reports
  'נתוני', 'נתונים', 'הנתונים', 'נרשמו', 'נרשם', 'נרשמה', 'עולה', 'עלייה', 'ירידה', 'ממשלתי', 'ממשלתית', 'ממוצע', 'בממוצע', 'הממוצע', 'לעומת', 'אשתקד',
  'שנה', 'בשנה', 'שנים', 'רבעון', 'ברבעון', 'אחוז', 'אחוזים', 'מספר', 'סך', 'הכול', 'ארצי', 'הארצי']) STOP.add(w);
// short words that still name an event
const SHORT_OK = new Set(['ירי', 'רצח', 'שוד', 'חוף', 'גשם', 'שבר', 'אש"ף']);
const strip = (w: string) => (w.length >= 4 && /^[ובלמהש]/.test(w) ? w.slice(1) : w);
// the words of a text, without its own place names and team names (they are matched on their own, never twice)
function toks(s: string, drop: string[] = []) {
  let t = norm(s);
  for (const [, re] of TEAMS) t = t.replace(new RegExp(re.source, 'g'), ' ');
  for (const p of drop) if (p && p.length >= 3) t = t.split(norm(p)).join(' ');
  return new Set(t.replace(/[^\p{L}\p{N}"\s]/gu, ' ').split(/\s+/).map((w) => w.replace(/^"|"$/g, ''))
    .filter((w) => !STOP.has(w)).map(strip).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w)));
}
// places that are too broad to mean "the same place" (almost every story has them), and hospitals (where the injured were taken)
const BROAD = (p: string) => /^(נתניה|השרון|ישראל|מרכז הארץ|מישור החוף המרכזי)$/.test(p) || /^(בית החולים|בי"ח|ביה"ח)|לניאדו|בילינסון|מאיר|הלל יפה|איכילוב/.test(norm(p));
// football teams: written in several ways; a team counts once whatever the spelling
const TEAMS: [string, RegExp][] = [
  ['מכבי נתניה', /מכבי נתניה|היהלומים/], ['הפועל ירושלים', /הפועל (?:ירושלים|י-ם)/], ['בית"ר ירושלים', /בית"ר(?: ירושלים)?|ביתר ירושלים/],
  ['מכבי תל אביב', /מכבי (?:תל אביב|ת"א)/], ['הפועל תל אביב', /הפועל (?:תל אביב|ת"א)/], ['מכבי חיפה', /מכבי חיפה/], ['הפועל חיפה', /הפועל חיפה/],
  ['הפועל באר שבע', /הפועל (?:באר שבע|ב"ש)/], ['בני סכנין', /סכנין/], ['מכבי פתח תקווה', /מכבי (?:פתח תקו?וה|פ"ת)/], ['הפועל פתח תקווה', /הפועל (?:פתח תקו?וה|פ"ת)/],
  ['הפועל רמת גן', /הפועל רמת גן/], ['הפועל קריית שמונה', /(?:הפועל|עירוני) (?:קרי?ית שמונה|ק"ש)/], ['עירוני טבריה', /טבריה/], ['מכבי בני ריינה', /בני ריינה/],
  ['אשדוד', /ס"ס אשדוד|מ"ס אשדוד/], ['הפועל כפר סבא', /הפועל כפר סבא/], ['הפועל רעננה', /הפועל רעננה/],
];
const teamsOf = (s: string) => new Set(TEAMS.filter(([, re]) => re.test(norm(s))).map(([n]) => n));

const textOf = (s: Any) => [s.title, s.dek, ...(Array.isArray(s.key_points) ? s.key_points : [])].filter(Boolean).join(' ');
const fullOf = (s: Any) => [textOf(s), ...(Array.isArray(s.body) ? s.body.slice(0, 3) : [])].join(' ');
const isRoundup = (s: Any) => ['week_roundup', 'weekend_guide'].includes(String(s.format || ''));

type Feat = { id: number; at: number; section: string; places: Set<string>; teams: Set<string>; head: Set<string>; full: Set<string>; s: Any };
function feat(s: Any): Feat {
  const places = new Set<string>((Array.isArray(s.places) ? s.places : []).map((p: string) => norm(String(p).trim())).filter((p: string) => p && !BROAD(p)));
  const drop = (Array.isArray(s.places) ? s.places : []).map(String);
  return { id: s.id, at: Date.parse(s.created_at), section: s.section || '', places, teams: teamsOf(fullOf(s)), head: toks(textOf(s), drop), full: toks(fullOf(s), drop), s };
}

// how strongly b (an earlier story) is background for a; reasons are kept for the log
function score(a: Feat, b: Feat, idf: (w: string) => number) {
  const why: string[] = []; let sc = 0;
  const sp = [...a.places].filter((p) => b.places.has(p));
  // a story that lists many places (a regional data story, a list of towns) shares a place with almost anything: weak, never ground
  const many = (a.s.places || []).length > 4 || (b.s.places || []).length > 4;
  if (sp.length) { sc += many ? Math.min(2, sp.length) : 3 * sp.length; why.push(`מקום: ${sp.join(', ')}${many ? ' (רשימת מקומות)' : ''}`); }
  const st = [...a.teams].filter((t) => b.teams.has(t));
  for (const t of st) { sc += t === 'מכבי נתניה' ? 2 : 3; } if (st.length) why.push(`קבוצה: ${st.join(', ')}`);
  // distinctive words: shared words of the titles, subtitles and key points count fully, words of the first paragraphs at half
  const sh = [...a.head].filter((w) => b.head.has(w));
  const sf = [...a.full].filter((w) => b.full.has(w) && !sh.includes(w));
  const ws = sh.reduce((n, w) => n + idf(w), 0) + 0.5 * sf.reduce((n, w) => n + idf(w), 0);
  if (sh.length || sf.length) why.push(`מילים: ${[...sh, ...sf].slice(0, 8).join(', ')}`);
  sc += ws;
  if (a.section && a.section === b.section) { sc += 1; why.push('אותו מדור'); }
  // a few days apart: likely the same developing event
  const dt = Math.abs(a.at - b.at);
  const near = dt <= 3 * 864e5;
  if (near) { sc += 2; why.push('סמוך בזמן'); }
  // the same town (even a broad one like נתניה) within 12 hours
  const town = (a.s.places || []).some((p: string) => (b.s.places || []).includes(p));
  if (town && dt <= 12 * 3600e3) { sc += 2; why.push('אותו מקום ובאותן שעות'); }
  // real ground: a specific place, a team (other than only Maccabi Netanya in a non sports story), two distinctive head words,
  // or one distinctive head word within three days in the same section
  const strongWords = sh.filter((w) => idf(w) >= 1.4 && (w.length >= 4 || SHORT_OK.has(w))).length;
  // a shared specific place alone is not enough (two different accidents near the same village): it needs the same section or a
  // distinctive shared word
  const ground = (sp.length > 0 && !many && (a.section === b.section || strongWords >= 1)) || st.some((t) => t !== 'מכבי נתניה')
    || (st.length > 0 && a.section === 'sports' && b.section === 'sports') || strongWords >= 2 || (strongWords >= 1 && near && a.section === b.section);
  return { sc: Math.round(sc * 10) / 10, ground, why };
}
const THRESHOLD = 5.5;

// ---------- service boxes ----------
const DEATH = /נהרג|נפטר|(?<![א-ת])מת(?:ה)?\s|(?<![א-ת])מותו|(?<![א-ת])מותה|הרוג|נרצח|גופה|גופת|קיפח|נקבע מות/;
// a keyword counts only at the start of a word (after up to two prefix letters: "בתאונה", "והחסימה"), so "טבע" never matches "מטבע"
const rxEsc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (text: string, k: string) => new RegExp(`(?:^|[^\\u05D0-\\u05EA])(?:[ובלמהשכ]{0,2})${rxEsc(norm(k))}`).test(text);
function boxFor(s: Any, boxes: Any[]) {
  if (s.kind === 'sponsored' || isRoundup(s)) return null;
  const head = norm(textOf(s));
  const text = norm(`${head} ${(Array.isArray(s.body) ? s.body.slice(0, 2) : []).join(' ')}`);
  if (DEATH.test(text)) return null; // no service box on a story about a death
  const hit = boxes.filter((b) => (!b.sections?.length || b.sections.includes(s.section))
    && (b.keywords || []).some((k: string) => k.split('+').every((part) => has(text, part)))
    && !(b.exclude || []).some((k: string) => has(text, k)))
    .sort((x, y) => y.priority - x.priority);
  const b = hit[0];
  return b ? { key: b.key, title: b.title, lines: b.lines, link: { text: b.link_text, url: b.link_url }, source: b.source_name } : null;
}

async function tick(b: Any) {
  const dry = !!b.dry;
  const since60 = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data: rows, error } = await sb.from('hns_stories')
    .select('id,created_at,published_at,updated_at,enriched_at,section,title,dek,body,key_points,places,kind,sensitivity,format,context_ids,service_box')
    .eq('state', 'published').gte('created_at', since60).order('id').limit(2000);
  if (error) throw new Error(error.message);
  const all = rows || [];
  const { data: boxes } = await sb.from('hns_service_boxes').select('*').eq('active', true);
  // document frequency of every word over the published stories of the last 60 days
  const feats = all.map(feat);
  const df = new Map<string, number>();
  for (const f of feats) for (const w of new Set([...f.head, ...f.full])) df.set(w, (df.get(w) || 0) + 1);
  const N = Math.max(feats.length, 8);
  const idf = (w: string) => Math.log((N + 1) / ((df.get(w) || 0) + 0.5)) * (w.length >= 5 ? 1 : 0.8);
  const ids = (b.ids || []).map(Number).filter(Boolean);
  const cut = Date.now() - 48 * 3600e3;
  const todo = feats.filter((f) => ids.length ? ids.includes(f.id) : b.all ? true
    : (!f.s.enriched_at && Date.parse(f.s.published_at) >= cut) || (f.s.enriched_at && Date.parse(f.s.updated_at || f.s.published_at) > Date.parse(f.s.enriched_at) && Date.parse(f.s.updated_at) >= cut));
  const out: Any[] = [];
  for (const a of todo) {
    let ctx: number[] = []; const why: Any[] = [];
    if (!isRoundup(a.s) && a.s.kind !== 'sponsored') {
      const cands = feats.filter((x) => x.id !== a.id && x.at < a.at && a.at - x.at <= 60 * 864e5 && x.s.kind !== 'sponsored' && !isRoundup(x.s))
        .map((x) => ({ x, r: score(a, x, idf) })).filter(({ r }) => r.ground && r.sc >= THRESHOLD)
        .sort((p, q) => q.r.sc - p.r.sc || q.x.at - p.x.at).slice(0, 3);
      ctx = cands.map(({ x }) => x.id);
      for (const { x, r } of cands) why.push({ id: x.id, title: x.s.title, score: r.sc, why: r.why });
    }
    const box = boxFor(a.s, boxes || []);
    const same = JSON.stringify(a.s.context_ids || []) === JSON.stringify(ctx) && JSON.stringify(a.s.service_box || null) === JSON.stringify(box);
    out.push({ id: a.id, title: a.s.title, context_ids: ctx, context: why, box: box?.key || null, changed: !same });
    if (dry) continue;
    const { error: e2 } = await sb.from('hns_stories').update({ context_ids: ctx.length ? ctx : null, service_box: box, enriched_at: new Date().toISOString() })
      .eq('id', a.id).eq('state', 'published');
    if (e2) out[out.length - 1].error = e2.message;
  }
  return { looked: todo.length, res: out };
}

// ---------- links ----------
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
async function fetchPage(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const html = await r.text().catch(() => '');
  return { status: r.status, url: r.url, html };
}
async function checklinks() {
  const { data: boxes } = await sb.from('hns_service_boxes').select('key,link_url');
  const res: Any[] = [];
  for (const b of boxes || []) {
    let st = 0; try { st = (await fetchPage(b.link_url)).status; } catch { st = 0; }
    await sb.from('hns_service_boxes').update({ check_status: st, checked_at: new Date().toISOString() }).eq('key', b.key);
    res.push({ key: b.key, url: b.link_url, status: st });
  }
  return res;
}
const dashFree = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
async function boxUpsert(x: Any) {
  const lines = (Array.isArray(x.lines) ? x.lines : []).map(dashFree).filter(Boolean);
  if (!x.key || !x.title || lines.length < 2 || lines.length > 3 || !/^https:\/\//.test(String(x.link_url || '')) || !x.link_text || !x.source_name
    || !Array.isArray(x.keywords) || !x.keywords.length) return { ok: false, error: 'a box needs key, title, 2 or 3 lines, an https link with text, a source and keywords' };
  if ([x.title, ...lines, x.link_text].some((t) => /(^|\s)הכי(\s|$)/.test(String(t)))) return { ok: false, error: 'no superlatives' };
  const row = { key: String(x.key), title: dashFree(x.title), lines, link_text: dashFree(x.link_text), link_url: String(x.link_url), source_name: dashFree(x.source_name),
    sections: Array.isArray(x.sections) ? x.sections.map(String) : [], keywords: x.keywords.map(String), exclude: Array.isArray(x.exclude) ? x.exclude.map(String) : [],
    priority: Number(x.priority) || 0, active: x.active !== false, note: x.note ? String(x.note) : null, updated_at: new Date().toISOString() };
  const { error } = await sb.from('hns_service_boxes').upsert(row, { onConflict: 'key' });
  return error ? { ok: false, error: error.message } : { ok: true, key: row.key };
}
async function probe(urls: string[], find: string[]) {
  const res: Any[] = [];
  for (const u of urls.slice(0, 12)) {
    try {
      const p = await fetchPage(u);
      const title = (p.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim() || '';
      const links = [...p.html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))
        .filter((l) => find.some((f) => l.text.includes(f) || decodeURIComponent(l.href).includes(f))).slice(0, 25);
      const snips = find.flatMap((f) => { const i = p.html.indexOf(f); return i >= 0 ? [p.html.slice(Math.max(0, i - 120), i + 160).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')] : []; }).slice(0, 8);
      res.push({ url: u, status: p.status, final: p.url, title, links, snips });
    } catch (e) { res.push({ url: u, error: String(e) }); }
  }
  return res;
}

Deno.serve(async (req) => {
  const secret = await cronSecret();
  if (!secret || req.headers.get('x-cron-secret') !== secret) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick(b)) });
    if (b.action === 'checklinks') return J({ ok: true, res: await checklinks() });
    if (b.action === 'box_upsert') return J(await boxUpsert(b.box || {}));
    if (b.action === 'probe') return J({ ok: true, res: await probe((b.urls || []).map(String), (b.find || []).map(String)) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
