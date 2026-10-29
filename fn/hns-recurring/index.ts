// hns-recurring (28.10.2026): recurring formats of the HNS (חדשות נתניה והשרון, nws.co.il) news engine.
// Approved by Yakir on 28.10.2026 at 17:45 (content quality first). Writing uses Anthropic with the model and the daily cap of the
// row 'ai' in hns_config (the same budget as hns-write: stories with a model created today, plus this function's extra calls in
// hns_recurring_log). No new services. Every story goes through the normal publishing path: it is inserted as a 'draft' with a
// real source and a real date, and hns-publish (tick, every 3 minutes) publishes it with all its guards (outlet names, "לפי
// דיווח", local, fresh). A later change of a published story goes through hns-publish {action:'revise'}.
// POST (x-cron-secret), every action also takes {dry?, test?, force?}:
//   dry=true: nothing is written and no AI call is made; the answer shows the facts that would be sent.
//   test=true: the story is written (one AI call) and saved as state 'rejected' with the note "בדיקה" (never published), so the
//     text can be checked in hns_stories; the format state in hns_recurring is not touched.
//   force=true: ignores the time window (for a manual run).
//   {action:'match'}  cron every 15 minutes. Maccabi Netanya, from the same source the site uses (ערוץ הספורט, sport5 Ligat HaAl page:
//     league table, games of the round with date and time, scores of the previous rounds):
//     a. preview: about 24 hours before kickoff (window 30h to 2h before), one story per match (format 'match_preview', key
//        match:<date>:<opponent sport5 id>): opponent, home or away, kickoff, venue (only when a source names it), the table
//        position of both teams, the last meeting this season (when it was played), the previous result, and injuries and
//        suspensions from our recent items (club site, our sources) and our published stories. 4 to 1 hours before kickoff the
//        same story is updated once with the latest facts (hns-publish revise), never duplicated.
//     b. report: from 1h50 after kickoff, every 15 minutes until 36 hours after. Written only from an official or club item
//        (fcmn, ifa) published after kickoff; the sport5 score must agree when it is there (a conflict waits). Five hours after
//        kickoff with no club item, the sport5 score plus a media item that shows the same score is enough. Never an invented
//        score: the story must state the score that the sources give. When the engine (hns-write) already wrote a story about
//        the game, that story is marked as the match report instead of writing a second one.
//   {action:'week'}  cron Friday 07:00 and 08:00 UTC; runs only when it is 10:00 in Israel (summer and winter time). "השבוע
//     בנתניה": up to 6 of the week's top published stories (not sensitive, not sponsored, at most 2 per section), one short line
//     each, with links (format_data.links). Key week:<friday date>.
//   {action:'weekend'}  cron Thursday 09:00 and 10:00 UTC; runs only at 12:00 Israel time. "מה עושים בסוף השבוע": events from
//     Thursday afternoon to Saturday night from the official calendar (hns_cal), events that official municipal items name with a
//     date in the window, and a Maccabi Netanya home game. At least 2 events, otherwise no story. Key weekend:<thursday date>.
//   {action:'council'}  cron hourly. A municipal council meeting or a planning committee item in hns_items (official municipal
//     sources) with real content (an agenda, decisions or a protocol, not only "watch the live broadcast") becomes a summary
//     (format 'council_summary' or 'planning_summary'). The sources needed for this are documented in fn/hns-recurring/README.md.
//   {action:'status'}  the format state rows and the last log lines.
// 29.10.2026 night (content plan approved by Yakir; all routine pieces, never the lead or a flash):
//   {action:'works'} hourly: the weekly works and closures story (adopts the engine's story of the municipal plan, or writes it),
//   {action:'history'} Tuesday 10:00 "נתניה של פעם" (Hebrew Wikipedia, a free licensed photo with credit or none; {place} to choose),
//   {action:'opened'} Wednesday 11:00 "מה נפתח בעיר", {action:'sportsweek'} Sunday 12:00 "הספורט של נתניה השבוע" (beyond the
//   Maccabi Netanya senior football stories), {action:'education'} the 1st of the month 09:00 "חינוך ומשפחות". Details above each.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const FN = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const cleanArr = (a: unknown) => (Array.isArray(a) ? a : []).map(clean).filter(Boolean);
const norm = (s: string) => String(s || '').replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
const H = 3600e3;

// ---------- time (Israel) ----------
const TZ = 'Asia/Jerusalem';
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
function il(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { ymd: `${p.year}-${p.month}-${p.day}`, d: Number(p.day), m: Number(p.month), hh: Number(p.hour) % 24, mm: Number(p.minute), wd, hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
const dayName = (iso: string) => { const x = il(new Date(iso)); return x.wd === 6 ? 'שבת' : `יום ${DAYS[x.wd]}`; };
const dm = (iso: string) => { const x = il(new Date(iso)); return `${x.d}.${x.m}`; };
const when = (iso: string) => `${dayName(iso)}, ${dm(iso)}, בשעה ${il(new Date(iso)).hm}`;
// Israel time of a date and HH:MM to ISO (the offset of that day)
function ilIso(date: string, time: string) {
  if (!date) return '';
  const t = /^\d{1,2}:\d{2}$/.test(time || '') ? time.padStart(5, '0') : '12:00';
  for (const off of ['+03:00', '+02:00']) { const d = new Date(`${date}T${t}:00${off}`); if (il(d).hm === t) return d.toISOString(); }
  return new Date(`${date}T${t}:00+02:00`).toISOString();
}
const dayStartIl = () => new Date(Date.parse(ilIso(il(new Date()).ymd, '00:00'))).toISOString();

// ---------- AI (the same wrapper and budget as hns-write) ----------
let CFG: Any = { max_per_day: 25, model: 'claude-sonnet-5-5', boost: false };
async function config() { const { data } = await sb.from('hns_config').select('v').eq('k', 'ai').maybeSingle(); if (data?.v && typeof data.v === 'object') CFG = { ...CFG, ...data.v }; }
const dailyMax = () => Number(CFG.boost ? CFG.boost_max_per_day : CFG.max_per_day) || 25;
const MODEL = () => (CFG.boost ? (CFG.boost_complex_model || CFG.model) : CFG.model) || 'claude-sonnet-5-5';
async function budgetLeft() {
  const ds = dayStartIl();
  const { count: a } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).not('model', 'is', null).gte('created_at', ds);
  const { count: b } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).not('model', 'is', null).lt('created_at', ds).gte('updated_at', ds).like('notes', '%אומת%');
  const { data: mine } = await sb.from('hns_recurring_log').select('ai_calls').gte('at', ds);
  const extra = (mine || []).reduce((n: number, r: Any) => n + (Number(r.ai_calls) || 0), 0);
  return dailyMax() - (a || 0) - (b || 0) - extra;
}
class NoJson extends Error {}
let CALLS = 0;
let MAX_TOKENS = 3000; // a longer piece (history) raises it before writing
async function claude(system: string, user: string) {
  CALLS++;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: MODEL(), max_tokens: MAX_TOKENS, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(110000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new NoJson(`no json: ${text.slice(0, 160)}`);
  try { return { out: JSON.parse(m[0]), usage: j.usage }; } catch { throw new NoJson('bad json'); }
}

// ---------- quality guards ----------
let OUTLET_RE: RegExp | null = null;
async function outlets() {
  const { data } = await sb.from('hns_outlets').select('name');
  const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = (data || []).map((r: Any) => String(r.name || '').trim()).filter(Boolean).map((n: string) => /^[\x00-\x7F]+$/.test(n)
    ? `(?<![A-Za-z0-9])${rx(n)}(?![A-Za-z0-9])` : `(?<![א-ת])(?:[ובלמהשכ]{1,2}-?)?${rx(n)}(?![א-ת])`);
  OUTLET_RE = parts.length ? new RegExp(parts.join('|'), 'i') : null;
}
const LEAN_RE = /לפי (?:דיווח|פרסום|מבזק|הדיווח|הפרסום|המבזק)|כפי שדווח|כך דווח|דיווח שפורסם|מבזק שפורסם/;
const SUPER_RE = /(?<![א-ת])(?:ו|ש|ה)?הכי(?![א-ת])/;
// every problem of a written text, '' when it is fine. facts = all the material the writer got.
function problems(o: Any, facts: string, must: string[] = []) {
  const parts = [o.title, o.dek, o.kicker, ...cleanArr(o.body), ...cleanArr(o.keyPoints)].map((x) => clean(x));
  const all = parts.join('\n');
  const out: string[] = [];
  if (!clean(o.title) || cleanArr(o.body).length < 1) out.push('חסרים כותרת או גוף');
  if (SUPER_RE.test(all)) out.push('המילה "הכי"');
  if (LEAN_RE.test(all)) out.push('"לפי דיווח" או "כפי שדווח"');
  const on = OUTLET_RE ? all.match(OUTLET_RE)?.[0] : '';
  if (on) out.push(`שם של כלי תקשורת (${on})`);
  // every number must come from the material (scores, dates, hours, places in the table)
  const f = norm(facts);
  const nums = [...new Set((norm(all).match(/\d+(?:[.:/]\d+)*/g) || []))];
  const bad = nums.filter((n) => !f.includes(n));
  if (bad.length) out.push(`מספרים שלא מופיעים בחומר: ${bad.slice(0, 6).join(', ')}`);
  for (const m of must) if (m && !all.includes(m)) out.push(`חסר בטקסט: ${m}`);
  return out.join('; ');
}
const kickerOf = (k: unknown) => { const t = clean(k); return t && t.split(/\s+/).length <= 5 && !(OUTLET_RE && OUTLET_RE.test(t)) ? t : null; };

const SYSTEM = `אתה עורך באתר החדשות המקומי "חדשות נתניה והשרון". אתה כותב בעברית פשוטה, ברורה ונכונה, רק מהעובדות שבחומר שקיבלת.
כללים מחייבים:
- אסור להמציא שום פרט: לא שמות, לא מספרים, לא תאריכים, לא שעות, לא תוצאות, לא סיבות. כל מספר שאתה כותב חייב להופיע בחומר כפי שהוא כתוב שם.
- לא לכתוב שמות של חשודים, של נפגעים או של קטינים.
- בלי דעה, בלי ספקולציה, בלי שבח ובלי סופרלטיבים. אסור להשתמש במילה "הכי".
- בלי קו מפריד ארוך או בינוני. רק פסיק, נקודה או מקף רגיל.
- אנחנו אתר חדשות עצמאי. לא לכתוב שם של כלי תקשורת אחר בשום מקום, ולא "לפי דיווח", "לפי פרסום" או "כפי שדווח". עובדה מגוף רשמי או מהמועדון מייחסים לו, למשל "לפי המועדון" או "לפי העירייה".
- לא להעתיק משפטים מהחומר. לכתוב בניסוח שלנו, ענייני ורגוע.
- kicker: שורה קצרה מאוד שמופיעה מעל הכותרת, עד 5 מילים, עובדה ולא חזרה על הכותרת.
- אם אין מספיק עובדות, החזר רק {"hold":true,"reason":"סיבה קצרה"}.
החזר JSON בלבד, בלי טקסט נוסף.`;

// one call, and when the text fails the guards, one more call with the reasons; still failing: no story (logged)
async function write(user: string, facts: string, must: string[] = []) {
  if (!OUTLET_RE) await outlets();
  let { out, usage } = await claude(SYSTEM, user);
  if (out.hold) return { hold: String(out.reason || 'מעט מדי עובדות'), usage };
  let bad = problems(out, facts, must);
  if (bad) {
    const second = await claude(SYSTEM, `${user}\n\nהערה: הטיוטה הקודמת נפסלה: ${bad}. כתוב מחדש לפי כל הכללים, רק מהחומר.`);
    out = second.out; usage = { first: usage, second: second.usage };
    if (out.hold) return { hold: String(out.reason || 'מעט מדי עובדות'), usage };
    bad = problems(out, facts, must);
  }
  return bad ? { fail: bad, out, usage } : { out, usage };
}

// ---------- state and log ----------
async function getState(key: string) { const { data } = await sb.from('hns_recurring').select('*').eq('key', key).maybeSingle(); return data; }
async function setState(key: string, format: string, patch: Any) {
  await sb.from('hns_recurring').upsert({ key, format, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}
async function log(format: string, key: string, story_id: number | null, ai_calls: number, usage: Any, result: Any) {
  await sb.from('hns_recurring_log').insert({ format, key, story_id, ai_calls, model: ai_calls ? MODEL() : null, usage, result });
}

let SRC: Record<string, Any> = {};
async function sources() { const { data } = await sb.from('hns_sources').select('id,name_he,role,trust,local_only,kind'); SRC = Object.fromEntries((data || []).map((s: Any) => [s.id, s])); }
const srcRef = (id: string, url = '') => ({ id, name: SRC[id]?.name_he || id, url, trust: SRC[id]?.trust || 'media' });

// insert a written story as a draft (hns-publish publishes it), or as a test story that is never published
async function insertStory(b: Any, row: Any) {
  const now = new Date().toISOString();
  const base = { sensitivity: 'normal', verified: false, model: MODEL(), ...row, title: clean(row.title), dek: clean(row.dek), body: cleanArr(row.body), key_points: cleanArr(row.key_points) };
  if (b.test) {
    const { data, error } = await sb.from('hns_stories').insert({ ...base, state: 'rejected', format_key: `${row.format_key}:test:${Date.now()}`, notes: `auto: hns-recurring ${row.format}, בדיקה, לא לפרסום`, decided_by: 'test', decided_at: now }).select('id').single();
    if (error) throw new Error(error.message);
    return data.id as number;
  }
  const { data, error } = await sb.from('hns_stories').insert({ ...base, state: 'draft', notes: `auto: hns-recurring ${row.format}` }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as number;
}
async function publishFn(body: Any) {
  return await fetch(`${FN}/hns-publish`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) })
    .then((x) => x.json()).catch((e) => ({ ok: false, error: String(e) }));
}
// items that were used are tied to the story, so the engine does not write them again as a separate story
async function claimItems(storyId: number, ids: number[]) { if (ids.length) await sb.from('hns_items').update({ cluster_id: storyId }).in('id', ids).is('cluster_id', null); }

// ---------- sport5 (the same source and parsing as sites/nws/scripts/sport.mjs) ----------
const S5 = 'https://www.sport5.co.il';
const LIGA = `${S5}/liga.aspx?FolderID=44`;
const ME = '193';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'he-IL,he;q=0.9' };
const ent = (s: string) => String(s || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const txt = (s: string) => ent(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const team = (s: string) => txt(s).replace(/''/g, '״').replace(/"/g, '״').replace(/\s+/g, ' ').trim();
const get = (u: string) => fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${u}`))));
const rows = (t: string) => t.split(/<tr[\s>]/i).slice(1).map((r) => r.split(/<\/tr>/i)[0]);
const cells = (r: string) => [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
const ids = (h: string) => [...h.matchAll(/FolderID=(\d+)/gi)].map((m) => m[1]);
const ymd = (d: string) => { const m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(d); if (!m) return ''; const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
function parseTable(html: string) {
  const t = html.split(/<table/i).map((x) => x.split(/<\/table>/i)[0]).find((x) => /נק[’']/.test(x) && x.includes(`FolderID=${ME}`) && /הפרש/.test(x));
  if (!t) return null;
  const table: Any[] = []; const notes: string[] = [];
  for (const r of rows(t)) {
    const c = cells(r);
    if (c.length === 1 && /הערה/.test(r)) { notes.push(txt(c[0]).replace(/^הערה:\s*/, '')); continue; }
    if (c.length < 9) continue;
    const id = ids(c[1])[0] || '';
    const [ga, gf] = txt(c[6]).split('-').map((x) => Number(x));
    table.push({ pos: Number(txt(c[0])), team: team(c[1]), id, played: Number(txt(c[2])), w: Number(txt(c[3])), d: Number(txt(c[4])), l: Number(txt(c[5])),
      gf: Number.isFinite(gf) ? gf : null, ga: Number.isFinite(ga) ? ga : null, pts: Number(txt(c[8])) });
  }
  return table.length >= 10 && table.some((x) => x.id === ME) ? { table, notes } : null;
}
function parseRound(html: string) {
  const t = html.split(/<table/i).map((x) => x.split(/<\/table>/i)[0]).find((x) => /<th>\s*משחק\s*<\/th>/.test(x) && /FolderID=/.test(x));
  if (!t) return [];
  const games: Any[] = [];
  for (const r of rows(t)) {
    const c = cells(r); if (c.length < 2) continue;
    const tm = [...c[0].matchAll(/<a[^>]*FolderID=(\d+)[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ id: m[1], name: team(m[2]) }));
    if (tm.length < 2) continue;
    // the score: in the game cell, or (finished rounds: "משחק | תוצאה | תאריך") in its own cell. sport5 writes it in the raw text
    // as away:home (it is shown right to left); checked on 28.10.2026 against the club's reports of rounds 5 (מכבי נתניה - מכבי
    // תל אביב "2:1", Netanya lost 1:2) and 7 (מכבי נתניה - הפועל קרית שמונה "0:1", Netanya won 1:0). score = [home, away].
    const sc = /(\d+)\s*[-:]\s*(\d+)/.exec(txt(c[0]).replace(tm[0].name, '').replace(tm[1].name, '')) || (/^\s*\d+\s*[-:]\s*\d+\s*$/.test(txt(c[1] || '')) ? /(\d+)\s*[-:]\s*(\d+)/.exec(txt(c[1])) : null);
    const date = ymd(txt(c[2] || c[1] || '')); const time = (/(\d{1,2}:\d{2})/.exec(txt(c[3] || '')) || [])[1] || '';
    games.push({ home: tm[0], away: tm[1], date, time, iso: ilIso(date, time), score: sc ? [Number(sc[2]), Number(sc[1])] : null });
  }
  return games;
}
async function league() {
  const html = await get(LIGA);
  const tb = parseTable(html);
  const round = Number((/מחזור\s*(\d+)\s*<\/strong>/.exec(html.replace(/\s+/g, ' ')) || [])[1]) || null;
  const lsnum = (/getCycle\('[^']+',\s*(\d+),/.exec(html) || [])[1] || '';
  return { table: tb?.table || [], notes: tb?.notes || [], round, lsnum, games: parseRound(html), fetchedAt: new Date().toISOString() };
}
const roundGames = async (lsnum: string, n: number) => parseRound(await get(`${S5}/Ajax/GetCycleGames.aspx?LSnum=${lsnum}&CycleNum=${n}`));
// the league data, cached in hns_recurring 'fixture' (fetched again after 60 minutes, or 15 minutes near a match)
async function fixture(fresh = false) {
  const st = await getState('fixture');
  const near = st?.data?.next && Math.abs(Date.parse(st.data.next.iso) - Date.now()) < 36 * H;
  if (!fresh && st?.data?.fetchedAt && Date.now() - Date.parse(st.data.fetchedAt) < (near ? 14 : 60) * 60e3) return st.data;
  try {
    const lg = await league();
    const mine = lg.games.find((g: Any) => g.home.id === ME || g.away.id === ME);
    const next = mine && mine.date ? { home: mine.home.id === ME, opponent: (mine.home.id === ME ? mine.away : mine.home).name, oppId: (mine.home.id === ME ? mine.away : mine.home).id,
      date: mine.date, time: mine.time, iso: mine.iso, round: lg.round, score: mine.score } : (st?.data?.next || null);
    const data = { ...lg, next };
    if (lg.table.length) await setState('fixture', 'fixture', { data, last_error: null });
    return data;
  } catch (e) { await setState('fixture', 'fixture', { last_error: String((e as Error).message || e) }); return st?.data || null; }
}
const variants = (name: string) => {
  const n = norm(name); const v = new Set([n]);
  const rep: [RegExp, string][] = [[/תל אביב/, 'ת"א'], [/פתח תקו?וה/, 'פ"ת'], [/באר שבע/, 'ב"ש'], [/קרי?ית שמונה/, 'ק"ש'], [/ירושלים/, 'י-ם']];
  for (const [re, s] of rep) if (re.test(n)) v.add(n.replace(re, s));
  if (/^(?:עירוני|מ"ס|ס"ס|בני) /.test(n)) v.add(n.replace(/^(?:עירוני|מ"ס|ס"ס|בני) /, ''));
  return [...v];
};
const mentions = (text: string, name: string) => variants(name).some((v) => norm(text).includes(v));
const INJ_RE = /פציע|נפצע|ייעדר|יעדר|היעדר|מושעה|השעיה|הרחקה|כרטיס אדום|צהוב|בספק|לא ישחק|חזר לאימונים|ניתוח|קרע|דלקת|מתיחה|מחלים|נבחרת/;
const tableLine = (r: Any) => r ? `${r.team}: מקום ${r.pos} בטבלה, ${r.pts} נקודות אחרי ${r.played} משחקים (${r.w} ניצחונות, ${r.d} תיקו, ${r.l} הפסדים)` : '';

// items and published stories about the match (last 6 days), our sources only (no tips, no competitors)
async function matchMaterial(opp: string, since: string, until = new Date().toISOString()) {
  const { data: its } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,cluster_id')
    .gte('fetched_at', since).lte('fetched_at', until).or('title.ilike.%נתניה%,body.ilike.%נתניה%').order('id', { ascending: false }).limit(400);
  // by the item's own date (a feed read for the first time today can hold posts from weeks ago)
  const fresh = (x: Any) => Date.parse(x.published_at || x.fetched_at) >= Date.parse(since);
  const items = (its || []).filter((x: Any) => {
    if (!SRC[x.source_id] || SRC[x.source_id].role !== 'source' || !fresh(x)) return false;
    const t = `${x.title} ${x.body || ''}`;
    // the club site: everything recent; other sources: about the opponent, or squad news with Maccabi Netanya in the title
    return x.source_id === 'fcmn' || (mentions(t, 'מכבי נתניה') && (mentions(t, opp) || (INJ_RE.test(t) && /נתניה/.test(norm(x.title)))));
  });
  const { data: st } = await sb.from('hns_stories').select('id,title,dek,body,key_points,published_at,format').eq('state', 'published').eq('section', 'sports').gte('published_at', since).order('published_at', { ascending: false }).limit(20);
  // our stories: about the opponent, squad news, or the last Maccabi Netanya result (a score in the title)
  const stories = (st || []).filter((s: Any) => !s.format && (mentions(`${s.title} ${(s.body || []).join(' ')}`, opp) || INJ_RE.test(`${s.title} ${s.dek} ${(s.key_points || []).join(' ')}`)
    || (/מכבי נתניה/.test(norm(s.title)) && /(?<!\d)\d:\d(?!\d)/.test(s.title))));
  return { items: items.slice(0, 10), stories: stories.slice(0, 5) };
}
const itemText = (x: Any) => `${SRC[x.source_id]?.trust === 'official' ? 'מקור רשמי (המועדון או גוף רשמי)' : 'מקור תקשורתי'}, ${dm(x.published_at || x.fetched_at)}:\nכותרת: ${clean(x.title)}\nתוכן: ${clean(x.body || '').slice(0, 1800)}`;
const storyText = (s: Any) => `ידיעה שכבר פרסמנו (${dm(s.published_at)}): ${clean(s.title)}. ${clean(s.dek)} ${cleanArr(s.body).join(' ').slice(0, 1500)}`;

async function matchFacts(fx: Any, nx: Any) {
  const opp = nx.opponent;
  const me = fx.table.find((r: Any) => r.id === ME); const them = fx.table.find((r: Any) => r.id === nx.oppId);
  const notes = (fx.notes || []).filter((n: string) => /נתניה/.test(n) || mentions(n, opp));
  // the previous rounds of this season: our last result and the last meeting with this opponent
  let last: Any = null; let meet: Any = null;
  if (fx.lsnum && nx.round > 1) {
    for (let n = nx.round - 1; n >= 1 && (!last || !meet); n--) {
      try {
        const g = (await roundGames(fx.lsnum, n)).find((x: Any) => (x.home.id === ME || x.away.id === ME) && x.score);
        if (!g) continue;
        if (!last) last = { ...g, round: n };
        if (!meet && (g.home.id === nx.oppId || g.away.id === nx.oppId)) meet = { ...g, round: n };
      } catch { break; }
    }
  }
  const gameLine = (g: Any) => `${dm(g.iso || `${g.date}T12:00:00Z`)}, המחזור ה-${g.round}: ${g.home.name} ${g.score[0]}, ${g.away.name} ${g.score[1]} (בכתיב תוצאה: ${g.score[0]}:${g.score[1]} או ${g.score[1]}:${g.score[0]})`;
  const { items, stories } = await matchMaterial(opp, new Date(Date.now() - 6 * 864e5).toISOString());
  // a sentence that names the stadium, from the club or our sources (the writer takes the name from it; never assumed)
  const venueItem = [...stories.map((s: Any) => cleanArr(s.body).join(' ')), ...items.map((x: Any) => `${x.title}. ${x.body || ''}`)]
    .map((t: string) => t.split(/(?<=[.!?])\s+/).find((sen: string) => /אצטדיון/.test(sen) && mentions(sen, opp)) || '').find(Boolean) || '';
  const lines = [
    `המשחק: מכבי נתניה נגד ${opp}, ${nx.home ? 'משחק בית של מכבי נתניה' : 'משחק חוץ של מכבי נתניה'}, ליגת העל, המחזור ה-${nx.round}.`,
    `מועד: ${when(nx.iso)}.`,
    venueItem ? `משפט מהמקורות שמזכיר את מקום המשחק: "${clean(venueItem).slice(0, 300)}"` : (nx.home ? 'המשחק בנתניה. שם האצטדיון לא מופיע במקורות.' : 'מקום המשחק לא מופיע במקורות.'),
    `טבלת ליגת העל לפני המשחק (נכון ל-${dm(fx.fetchedAt)}):`, tableLine(me), tableLine(them), ...notes.map((n: string) => `הערה בטבלה: ${n}`),
    last ? `המשחק הקודם של מכבי נתניה: ${gameLine(last)}.` : '',
    meet ? `המפגש האחרון העונה בין הקבוצות: ${gameLine(meet)}.` : 'אין במקורות מפגש קודם בין הקבוצות העונה.',
  ].filter(Boolean);
  const material = [...lines, '', 'חומר מהימים האחרונים:', ...stories.map(storyText), ...items.map(itemText)].join('\n');
  return { material, items, stories, me, them, last, meet, venue: venueItem };
}

const PREVIEW = (material: string, final: boolean) => `${material}

כתוב ${final ? 'עדכון אחרון לפני שריקת הפתיחה של' : ''} ידיעת פתיחה (פריוויו) למשחק של מכבי נתניה, בעברית פשוטה.
מבנה: פסקה ראשונה: מי נגד מי, משחק בית או חוץ, מתי ואיפה (מקום רק אם הוא כתוב בחומר). פסקה שנייה: המצב בטבלה של שתי הקבוצות, והמשחק הקודם של מכבי נתניה. פסקה שלישית: פציעות, השעיות ושחקנים בספק בשתי הקבוצות, רק מה שכתוב בחומר, ומי שאין עליו מידע לא מזכירים. פסקה רביעית אם יש: המפגש האחרון בין הקבוצות העונה.
עובדה מאתר המועדון מייחסים: "לפי המועדון". עובדה מכלי תקשורת כותבים בזהירות כעובדה ("צפוי להיעדר"), בלי לציין מאיפה, ובלי ציטוטים מכלי תקשורת.
כותרת עד 70 תווים עם שם היריבה. כותרת משנה משפט אחד עם עובדה אחת או שתיים מהחומר, בלי הכללות. 3 או 4 נקודות עיקריות.
venue: שם האצטדיון בדיוק כפי שהוא כתוב בחומר, או ריק אם הוא לא כתוב.
JSON: {"kicker":"","title":"","dek":"","venue":"","body":["","",""],"keyPoints":["",""]}`;

const REPORT = (material: string) => `${material}

כתוב ידיעת סיום (דיווח מהמשחק) של מכבי נתניה, בעברית פשוטה, רק מהחומר.
פסקה ראשונה: התוצאה הסופית, מול מי, איפה ומתי. אחר כך מהלך המשחק והמבקיעים, רק אם הם כתובים בחומר. אחר כך מה זה אומר לטבלה רק אם זה כתוב בחומר, ומה המשחק הבא רק אם הוא כתוב בחומר.
את התוצאה כותבים בדיוק כפי שהיא בחומר, בכתיב "X:Y". עובדה מאתר המועדון מייחסים: "לפי המועדון".
כותרת עד 70 תווים עם התוצאה ושם היריבה. כותרת משנה משפט אחד. 3 או 4 נקודות עיקריות.
JSON: {"kicker":"","title":"","dek":"","body":["","",""],"keyPoints":["",""]}`;

async function match(b: Any) {
  await sources();
  const fx = await fixture(!!b.fresh);
  const done: Any[] = [];
  // matches with a preview whose kickoff has passed: the report, from the stored match data
  const { data: open } = await sb.from('hns_recurring').select('*').eq('format', 'match_preview').in('stage', ['preview', 'preview_final']);
  for (const o of open || []) {
    const d = o.data || {}; const t0 = (Date.parse(d.kickoff) - Date.now()) / H;
    if (!d.kickoff || (fx?.next && o.key === `match:${fx.next.date}:${fx.next.oppId}`)) continue;
    if (t0 < -36) { await setState(o.key, 'match_preview', { stage: 'report_missed' }); continue; }
    if (t0 <= -1.83) done.push({ key: o.key, ...(await report(b, fx, { opponent: d.opponent, oppId: d.opponentId, home: d.home, iso: d.kickoff, round: d.round, date: o.key.split(':')[1] }, o.key, o)) });
  }
  if (!fx?.next) return { skipped: 'no next game in the sport5 data', done };
  const nx = fx.next;
  const key = `match:${nx.date}:${nx.oppId}`;
  const st = await getState(key);
  const t = (Date.parse(nx.iso) - Date.now()) / H; // hours to kickoff
  const res: Any = { key, opponent: nx.opponent, kickoff: nx.iso, hoursToKickoff: Math.round(t * 10) / 10, stage: st?.stage || null, ...(done.length ? { done } : {}) };
  // ---- preview (30h to 2h before), and its last update (4h to 1h before)
  const wantPreview = b.force === 'preview' || (!st?.story_id && t <= 30 && t >= 2);
  const wantFinal = b.force === 'final' || (st?.story_id && st?.stage === 'preview' && t <= 4 && t >= 1);
  if ((wantPreview || wantFinal) && !nx.score) {
    const f = await matchFacts(fx, nx);
    if (b.dry) return { ...res, would: wantPreview ? 'preview' : 'final', facts: f.material };
    if (await budgetLeft() <= 0) { await log('match_preview', key, null, 0, null, { skipped: 'daily budget' }); return { ...res, skipped: 'daily budget' }; }
    CALLS = 0;
    const w = await write(PREVIEW(f.material, !!wantFinal && !wantPreview), f.material);
    const fdata: Any = { kind: 'match', competition: 'ליגת העל', round: nx.round, opponent: nx.opponent, opponentId: nx.oppId, home: nx.home, kickoff: nx.iso, venue: nx.home ? 'נתניה' : '',
      table: [f.me, f.them].filter(Boolean).map((r: Any) => ({ pos: r.pos, team: r.team, pts: r.pts, played: r.played, me: r.id === ME })),
      lastMeeting: f.meet ? { date: f.meet.date, round: f.meet.round, home: f.meet.home.name, away: f.meet.away.name, score: f.meet.score } : null,
      previous: f.last ? { date: f.last.date, round: f.last.round, home: f.last.home.name, away: f.last.away.name, score: f.last.score } : null,
      stage: wantPreview ? 'preview' : 'final', source: { name: 'ערוץ הספורט', url: LIGA } };
    if (w.hold || w.fail) { await log('match_preview', key, null, CALLS, w.usage, { held: w.hold || w.fail }); return { ...res, held: w.hold || w.fail }; }
    const o = w.out;
    const v = clean(o.venue);
    if (v && v.length <= 40 && norm(f.material).includes(norm(v))) fdata.venue = v;
    const used = f.items.map((x: Any) => Number(x.id));
    const srcs = [srcRef('sport5', LIGA), ...[...new Map(f.items.map((x: Any) => [x.source_id, srcRef(x.source_id, x.url)])).values()]];
    if (wantPreview || b.test) {
      const id = await insertStory(b, { section: 'sports', kicker: kickerOf(o.kicker), title: o.title, dek: o.dek, body: o.body, key_points: o.keyPoints, places: ['נתניה'], sources: srcs,
        basis: 'public', item_ids: used.map(String), format: 'match_preview', format_key: key, format_data: fdata, context_ids: f.stories.map((s: Any) => s.id).slice(0, 3), usage: w.usage });
      if (!b.test) { await claimItems(id, used.filter((i: number) => !f.items.find((x: Any) => Number(x.id) === i)?.cluster_id)); await setState(key, 'match_preview', { story_id: id, stage: 'preview', data: fdata }); }
      await log('match_preview', key, id, Math.max(0, CALLS - 1), w.usage, { inserted: id, test: !!b.test });
      return { ...res, story: id, title: clean(o.title), test: !!b.test };
    }
    // the last update before kickoff: the same story, through hns-publish revise
    const r = await publishFn({ action: 'revise', id: st.story_id, title: o.title, dek: o.dek, body: o.body, key_points: o.keyPoints, note: 'עודכן: לקראת שריקת הפתיחה' });
    if (r?.ok) { await sb.from('hns_stories').update({ format_data: fdata }).eq('id', st.story_id); await setState(key, 'match_preview', { stage: 'preview_final', data: fdata }); }
    await log('match_preview', key, st.story_id, CALLS, w.usage, { revised: !!r?.ok, error: r?.error || null });
    return { ...res, revised: st.story_id, ok: !!r?.ok, error: r?.error || null };
  }
  // ---- report (1h50 to 36h after kickoff)
  const wantReport = b.force === 'report' || (t <= -1.83 && t >= -36 && !['report', 'report_adopted', 'report_missed'].includes(st?.stage || ''));
  if (wantReport) return { ...res, ...(await report(b, fx, nx, key, st)) };
  if (t < -36 && st && !['report', 'report_adopted', 'report_missed'].includes(st.stage)) await setState(key, 'match_preview', { stage: 'report_missed' });
  return { ...res, nothing: 'outside the windows' };
}

async function report(b: Any, fx: Any, nx: Any, key: string, st: Any) {
  const kick = Date.parse(nx.iso);
  // the sport5 score of the game (the round of the game, also after the league moved to the next round)
  let score: number[] | null = null;
  try { const g = (fx?.lsnum ? await roundGames(fx.lsnum, nx.round) : (fx?.games || [])).find((x: Any) => (x.home.id === ME || x.away.id === ME) && (x.home.id === nx.oppId || x.away.id === nx.oppId)); score = g?.score || null; } catch { /* no score yet */ }
  const my = score ? (nx.home ? score[0] : score[1]) : null; const their = score ? (nx.home ? score[1] : score[0]) : null;
  const since = new Date(kick + 80 * 60e3).toISOString();
  const { data: its } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,cluster_id').gte('fetched_at', since).or('title.ilike.%נתניה%,body.ilike.%נתניה%').order('id').limit(300);
  // about this game: names the opponent (a club item also counts when it carries a score); a club post about a signing never counts
  const about = (its || []).filter((x: Any) => { const t = `${x.title} ${x.body || ''}`; return SRC[x.source_id]?.role === 'source'
    && (x.source_id === 'fcmn' ? (mentions(t, nx.opponent) || /(?<!\d)\d\s*:\s*\d(?!\d)/.test(x.title)) : (mentions(t, 'מכבי נתניה') && mentions(t, nx.opponent))); });
  const club = about.filter((x: Any) => SRC[x.source_id]?.trust === 'official');
  const scoreIn = (x: Any) => my !== null && new RegExp(`(?<!\\d)(?:${my}\\s*[:\\-]\\s*${their}|${their}\\s*[:\\-]\\s*${my})(?!\\d)`).test(`${x.title} ${x.body || ''}`);
  const media = about.filter((x: Any) => SRC[x.source_id]?.trust !== 'official' && scoreIn(x));
  const hoursAfter = (Date.now() - kick) / H;
  // the engine may already have written the game: that story becomes the match report (one story per match)
  const { data: existing } = await sb.from('hns_stories').select('id,title,body,state,format,item_ids').eq('section', 'sports').gte('created_at', new Date(kick).toISOString())
    .in('state', ['draft', 'needs_check', 'approved', 'published']).is('format', null).limit(20);
  const clubIds = new Set(club.map((x: Any) => String(x.id)));
  const ex = (existing || []).find((s: Any) => (s.item_ids || []).some((i: Any) => clubIds.has(String(i))) || mentions(`${s.title} ${(s.body || []).join(' ')}`, nx.opponent));
  const fdata = { kind: 'match', stage: 'report', competition: 'ליגת העל', round: nx.round, opponent: nx.opponent, opponentId: nx.oppId, home: nx.home, kickoff: nx.iso, score: score ? { netanya: my, opponent: their } : null, source: { name: 'ערוץ הספורט', url: LIGA } };
  if (ex && !b.test) {
    if (!b.dry) { await sb.from('hns_stories').update({ format: 'match_report', format_key: `${key}:report`, format_data: fdata }).eq('id', ex.id).is('format', null); await setState(key, 'match_preview', { stage: 'report_adopted', data: { ...(st?.data || {}), report_id: ex.id } }); await log('match_report', key, ex.id, 0, null, { adopted: ex.id }); }
    return { adopted: ex.id, title: ex.title };
  }
  if (!club.length && !(hoursAfter >= 5 && score && media.length)) return { waiting: `club items ${club.length}, sport5 score ${score ? `${my}:${their}` : 'none'}, media with the score ${media.length}` };
  // a club item that gives a different score than sport5: wait (never guess)
  if (score && club.length && !club.some(scoreIn) && club.some((x: Any) => /\d+\s*[:\-]\s*\d+/.test(`${x.title} ${x.body || ''}`))) {
    const anyScore = club.some((x: Any) => new RegExp('(?<!\\d)\\d\\s*[:\\-]\\s*\\d(?!\\d)').test(x.title));
    if (anyScore) { await log('match_report', key, null, 0, null, { waiting: 'score conflict between the club and sport5' }); return { waiting: 'score conflict between the club and sport5' }; }
  }
  const use = [...club, ...media].slice(0, 6);
  const lines = [
    `המשחק: מכבי נתניה נגד ${nx.opponent}, ${nx.home ? 'משחק בית של מכבי נתניה' : 'משחק חוץ של מכבי נתניה'}, ליגת העל, המחזור ה-${nx.round}, ${when(nx.iso)}.`,
    score ? `התוצאה הסופית לפי טבלת המשחקים של הליגה: מכבי נתניה ${my}, ${nx.opponent} ${their} (בכתיב תוצאה: ${my}:${their} או ${their}:${my}).` : 'אין תוצאה בטבלת המשחקים, רק במקורות למטה.',
  ];
  const material = [...lines, '', 'מקורות אחרי המשחק:', ...use.map(itemText)].join('\n');
  if (b.dry) return { would: 'report', facts: material };
  if (await budgetLeft() <= 0) return { skipped: 'daily budget' };
  CALLS = 0;
  const w = await write(REPORT(material), material);
  if (w.hold || w.fail) { await log('match_report', key, null, CALLS, w.usage, { held: w.hold || w.fail }); return { held: w.hold || w.fail }; }
  const o = w.out;
  const text = [o.title, o.dek, ...cleanArr(o.body)].join(' ');
  if (score && !new RegExp(`(?<!\\d)(?:${my}:${their}|${their}:${my})(?!\\d)`).test(text)) { await log('match_report', key, null, CALLS, w.usage, { held: 'the score is not in the text' }); return { held: 'the score is not in the text' }; }
  const used = use.map((x: Any) => Number(x.id));
  const srcs = [...new Map(use.map((x: Any) => [x.source_id, srcRef(x.source_id, x.url)])).values(), srcRef('sport5', LIGA)];
  const id = await insertStory(b, { section: 'sports', kicker: kickerOf(o.kicker), title: o.title, dek: o.dek, body: o.body, key_points: o.keyPoints, places: ['נתניה'], sources: srcs,
    basis: club.length ? 'official' : 'public', item_ids: used.map(String), format: 'match_report', format_key: `${key}:report`, format_data: fdata,
    context_ids: st?.story_id ? [st.story_id] : null, usage: w.usage });
  if (!b.test) { await claimItems(id, used); await setState(key, 'match_preview', { stage: 'report', data: { ...(st?.data || {}), report_id: id } }); }
  await log('match_report', key, id, Math.max(0, CALLS - 1), w.usage, { inserted: id, test: !!b.test });
  return { story: id, title: clean(o.title), test: !!b.test };
}

// ---------- השבוע בנתניה ----------
const SEC_W: Record<string, number> = { city: 3, realestate: 3, transport: 2.5, health: 2.5, community: 2, sports: 2, sharon: 1.5, leisure: 1.5, tourism: 1.5, police: 1.5, flash: 0.5 };
async function week(b: Any) {
  const now = il(new Date());
  if (!b.force && !(now.wd === 5 && now.hh === 10)) return { skipped: `not Friday 10:00 in Israel (${now.ymd} ${now.hm})` };
  const key = `week:${now.ymd}`;
  if (!b.test && (await getState(key))?.story_id) return { skipped: 'already written', key };
  const { data } = await sb.from('hns_stories').select('id,section,title,dek,key_points,item_ids,updates,published_at,kind,sensitivity,format')
    .eq('state', 'published').gte('published_at', new Date(Date.now() - 7 * 864e5).toISOString()).limit(300);
  const pool = (data || []).filter((s: Any) => s.kind !== 'sponsored' && s.sensitivity !== 'sensitive' && !['week_roundup', 'weekend_guide', 'match_preview'].includes(s.format || ''))
    .map((s: Any) => ({ s, sc: (SEC_W[s.section] ?? 1) + Math.min(4, (s.item_ids || []).length) * 0.5 + Math.min(4, (s.updates || []).length) * 0.5 + (s.format === 'match_report' ? 1 : 0) }))
    .sort((x: Any, y: Any) => y.sc - x.sc);
  const per: Record<string, number> = {}; const pick: Any[] = [];
  for (const { s } of pool) { if ((per[s.section] || 0) >= 2) continue; per[s.section] = (per[s.section] || 0) + 1; pick.push(s); if (pick.length >= 6) break; }
  pick.sort((x, y) => Date.parse(x.published_at) - Date.parse(y.published_at));
  if (pick.length < 3) { if (!b.dry) await log('week_roundup', key, null, 0, null, { held: `only ${pick.length} stories` }); return { held: `only ${pick.length} stories`, key }; }
  const material = pick.map((s) => `ידיעה ${s.id} (${dm(s.published_at)}): ${clean(s.title)}. ${clean(s.dek)} נקודות: ${cleanArr(s.key_points).join('; ')}`).join('\n');
  if (b.dry) return { key, would: 'week', facts: material };
  if (await budgetLeft() <= 0) return { skipped: 'daily budget' };
  await sources(); CALLS = 0;
  const user = `${material}

כתוב סיכום שבועי בשם "השבוע בנתניה" מהידיעות שלמעלה בלבד, בעברית פשוטה.
פתיח: משפט או שניים על השבוע, בלי הגזמה. אחר כך שורה אחת או שתיים לכל ידיעה (לפי המספר שלה), עם העובדה החשובה ומה הלאה אם זה כתוב בה. לא להוסיף שום עובדה שלא כתובה בידיעה, ולא להוסיף ייחוס (למשל "לפי המועדון") שלא כתוב בה.
כותרת שמתחילה ב"השבוע בנתניה:" ואחריה עד 8 מילים על הנושאים המרכזיים. כותרת משנה משפט אחד. kicker: "סיכום השבוע".
JSON: {"kicker":"","title":"","dek":"","intro":"","items":[{"id":0,"line":""}],"keyPoints":["",""]}`;
  if (!OUTLET_RE) await outlets();
  let r = await claude(SYSTEM, user); let o = r.out; let usage = r.usage;
  const shape = (x: Any) => ({ title: x.title, dek: x.dek, kicker: x.kicker, body: [x.intro, ...(Array.isArray(x.items) ? x.items : []).map((i: Any) => i.line)], keyPoints: x.keyPoints });
  let bad = o.hold ? 'hold' : problems(shape(o), material);
  if (bad && !o.hold) { r = await claude(SYSTEM, `${user}\n\nהערה: הטיוטה הקודמת נפסלה: ${bad}. כתוב מחדש לפי כל הכללים.`); o = r.out; usage = { first: usage, second: r.usage }; bad = o.hold ? 'hold' : problems(shape(o), material); }
  if (bad) { await log('week_roundup', key, null, CALLS, usage, { held: bad }); return { held: bad, key }; }
  const byId = new Map(pick.map((s) => [Number(s.id), s]));
  const items = (o.items || []).filter((i: Any) => byId.has(Number(i.id)) && clean(i.line));
  if (items.length < 3) { await log('week_roundup', key, null, CALLS, usage, { held: 'too few lines' }); return { held: 'too few lines' }; }
  let title = clean(o.title); if (!title.startsWith('השבוע בנתניה')) title = `השבוע בנתניה: ${title}`;
  const links = items.map((i: Any) => { const s = byId.get(Number(i.id)); return { id: s.id, section: s.section, title: clean(s.title), line: clean(i.line) }; });
  const id = await insertStory(b, { section: 'city', kicker: kickerOf(o.kicker) || 'סיכום השבוע', title, dek: o.dek, body: [o.intro, ...links.map((l: Any) => l.line)], key_points: o.keyPoints,
    places: ['נתניה'], sources: [srcRef('nws_desk', 'https://nws.co.il/')], basis: 'public', item_ids: [], format: 'week_roundup', format_key: key,
    format_data: { kind: 'week', week_of: now.ymd, links }, context_ids: null, usage });
  if (!b.test) await setState(key, 'week_roundup', { story_id: id, stage: 'done', data: { ids: links.map((l: Any) => l.id) } });
  await log('week_roundup', key, id, Math.max(0, CALLS - 1), usage, { inserted: id, test: !!b.test });
  return { key, story: id, title, test: !!b.test };
}

// ---------- מה עושים בסוף השבוע ----------
const EVENT_RE = /אירוע|פסטיבל|הופעה|הופעת|מופע|הצגה|יריד|סדנה|סיור|מרוץ|ריצה|קונצרט|תערוכה|הפנינג|חגיגה|טקס|הרצאה|פעילות|כנס|שוק/;
async function weekend(b: Any) {
  const now = il(new Date());
  if (!b.force && !(now.wd === 4 && now.hh === 12)) return { skipped: `not Thursday 12:00 in Israel (${now.ymd} ${now.hm})` };
  // the weekend of this week: Thursday 14:00 to Saturday 23:59 (Israel)
  const thu = new Date(Date.now() + ((4 - now.wd + 7) % 7) * 864e5);
  const thuYmd = il(thu).ymd; const satYmd = il(new Date(thu.getTime() + 2 * 864e5)).ymd;
  const from = ilIso(thuYmd, '14:00'); const to = new Date(Date.parse(ilIso(satYmd, '23:59')) + 59e3).toISOString();
  const key = `weekend:${thuYmd}`;
  if (!b.test && (await getState(key))?.story_id) return { skipped: 'already written', key };
  await sources();
  const { data: cal } = await sb.from('hns_cal').select('id,source_id,title,starts_at,venue,url').gte('starts_at', from).lte('starts_at', to).order('starts_at').limit(40);
  const events: Any[] = (cal || []).map((c: Any) => ({ ref: `e${c.id}`, title: clean(c.title), start: c.starts_at, venue: clean(c.venue || ''), url: String(c.url || ''), source: SRC[c.source_id]?.name_he || '', source_id: c.source_id }));
  // a Maccabi Netanya home game in the window
  const fx = await fixture();
  if (fx?.next?.home && Date.parse(fx.next.iso) >= Date.parse(from) && Date.parse(fx.next.iso) <= Date.parse(to)) events.push({ ref: 'm1', title: `כדורגל: מכבי נתניה נגד ${fx.next.opponent}, ליגת העל`, start: fx.next.iso, venue: 'נתניה', url: LIGA, source: 'לוח המשחקים של ליגת העל', source_id: 'sport5' });
  // municipal items of the last 10 days that may name an event in the window (the writer uses only those with an explicit date)
  const muni = Object.values(SRC).filter((s: Any) => s.trust === 'official' && s.local_only && s.role === 'source').map((s: Any) => s.id);
  const { data: its } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at').in('source_id', muni).gte('fetched_at', new Date(Date.now() - 10 * 864e5).toISOString()).order('id', { ascending: false }).limit(200);
  const dates = [0, 1, 2].map((i) => il(new Date(Date.parse(ilIso(thuYmd, '12:00')) + i * 864e5))).flatMap((x) => [`${x.d}.${x.m}`, `${String(x.d).padStart(2, '0')}.${String(x.m).padStart(2, '0')}`]);
  const muniItems = (its || []).filter((x: Any) => {
    const t = `${x.title} ${x.body || ''}`;
    if (x.source_id === 'heichal_smarticket' || !EVENT_RE.test(t)) return false;
    return dates.some((d) => t.includes(d)) || (/סוף השבוע|הסופ"ש|בסופ"ש/.test(norm(t)) && Date.now() - Date.parse(x.published_at || x.fetched_at) < 4 * 864e5);
  }).slice(0, 8);
  if (events.length + muniItems.length < 2) { if (!b.dry) await log('weekend_guide', key, null, 0, null, { held: `only ${events.length + muniItems.length} events` }); return { held: `only ${events.length + muniItems.length} events`, key }; }
  const material = [`סוף השבוע: מיום חמישי ${dm(from)} אחר הצהריים ועד מוצאי שבת ${dm(to)}.`, '', 'אירועים מלוח האירועים הרשמי:',
    ...events.map((e) => `${e.ref}: ${e.title}. ${when(e.start)}${e.venue ? `. מקום: ${e.venue}` : ''}. מקור: ${e.source}`),
    '', 'הודעות רשמיות מהימים האחרונים (להשתמש רק באירוע שהתאריך שלו כתוב במפורש ונופל בסוף השבוע הזה):',
    ...muniItems.map((x: Any) => `i${x.id}: ${clean(x.title)}. ${clean(x.body || '').slice(0, 900)}`)].join('\n');
  if (b.dry) return { key, would: 'weekend', facts: material };
  if (await budgetLeft() <= 0) return { skipped: 'daily budget' };
  CALLS = 0;
  const user = `${material}

כתוב ידיעה בשם "מה עושים בסוף השבוע בנתניה" מהחומר שלמעלה בלבד, בעברית פשוטה.
פתיח: משפט אחד. אחר כך שורה אחת לכל אירוע (לפי ה-ref שלו: e..., m1 או i...), עם מה, מתי ואיפה, רק מה שכתוב בחומר. לא להוסיף מחירים, שעות או פרטים שלא כתובים. אירוע מהודעה רשמית נכנס רק אם התאריך שלו כתוב במפורש ונופל בסוף השבוע הזה.
כותרת עד 70 תווים שמתחילה ב"מה עושים בסוף השבוע בנתניה". כותרת משנה משפט אחד. kicker: "סוף השבוע בנתניה".
JSON: {"kicker":"","title":"","dek":"","intro":"","items":[{"ref":"","line":""}],"keyPoints":["",""]}`;
  if (!OUTLET_RE) await outlets();
  let r = await claude(SYSTEM, user); let o = r.out; let usage = r.usage;
  const shape = (x: Any) => ({ title: x.title, dek: x.dek, kicker: x.kicker, body: [x.intro, ...(Array.isArray(x.items) ? x.items : []).map((i: Any) => i.line)], keyPoints: x.keyPoints });
  let bad = o.hold ? 'hold' : problems(shape(o), material);
  if (bad && !o.hold) { r = await claude(SYSTEM, `${user}\n\nהערה: הטיוטה הקודמת נפסלה: ${bad}. כתוב מחדש לפי כל הכללים.`); o = r.out; usage = { first: usage, second: r.usage }; bad = o.hold ? 'hold' : problems(shape(o), material); }
  if (bad) { await log('weekend_guide', key, null, CALLS, usage, { held: bad }); return { held: bad, key }; }
  const refs = new Map<string, Any>([...events.map((e) => [e.ref, e] as [string, Any]), ...muniItems.map((x: Any) => [`i${x.id}`, { ref: `i${x.id}`, title: clean(x.title), start: null, venue: '', url: String(x.url || ''), source: SRC[x.source_id]?.name_he || '', source_id: x.source_id, item: x.id }] as [string, Any])]);
  const lines = (o.items || []).filter((i: Any) => refs.has(String(i.ref)) && clean(i.line));
  if (lines.length < 2) { await log('weekend_guide', key, null, CALLS, usage, { held: 'too few events' }); return { held: 'too few events' }; }
  const evs = lines.map((i: Any) => { const e = refs.get(String(i.ref)); return { title: e.title, start: e.start, venue: e.venue, url: e.url, source: e.source, line: clean(i.line) }; });
  let title = clean(o.title); if (!title.startsWith('מה עושים בסוף השבוע')) title = `מה עושים בסוף השבוע בנתניה: ${title}`;
  const usedSrc = [...new Set(lines.map((i: Any) => refs.get(String(i.ref)).source_id))].filter((s) => SRC[s as string]);
  const srcs = usedSrc.map((s) => srcRef(s as string, s === 'heichal_smarticket' ? 'https://netanya.smarticket.co.il/' : s === 'sport5' ? LIGA : ''));
  const itemIds = lines.map((i: Any) => refs.get(String(i.ref)).item).filter(Boolean).map(String);
  const id = await insertStory(b, { section: 'leisure', kicker: kickerOf(o.kicker) || 'סוף השבוע בנתניה', title, dek: o.dek, body: [o.intro, ...evs.map((e: Any) => e.line)], key_points: o.keyPoints,
    places: ['נתניה'], sources: srcs.length ? srcs : [srcRef('heichal_smarticket', 'https://netanya.smarticket.co.il/')], basis: 'official', item_ids: itemIds, format: 'weekend_guide', format_key: key,
    format_data: { kind: 'weekend', from, to, events: evs }, context_ids: null, usage });
  if (!b.test) await setState(key, 'weekend_guide', { story_id: id, stage: 'done' });
  await log('weekend_guide', key, id, Math.max(0, CALLS - 1), usage, { inserted: id, test: !!b.test });
  return { key, story: id, title, test: !!b.test };
}

// ---------- council meetings and planning committees ----------
const COUNCIL_RE = /ישיבת (?:ה)?מועצה|מועצת העיר|ישיבת מליאה|מליאת המועצה/;
const PLANNING_RE = /ועדה מקומית|הוועדה המקומית|ועדת (?:ה)?תכנון|ועדת משנה|רשות רישוי|ועדה מחוזית|הוועדה המחוזית|תב"ע|תוכנית מתאר|היתר בנייה|התנגדויות/;
const ONLY_LIVE = /^\s*(?:צפו בשידור(?: החי)?|שידור חי)[\s\S]{0,80}$/;
async function council(b: Any) {
  await sources();
  const muni = Object.values(SRC).filter((s: Any) => s.trust === 'official' && s.role === 'source' && (s.local_only || /עיריית|מועצת|ועדה/.test(s.name_he))).map((s: Any) => s.id);
  const { data: its } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,cluster_id')
    .in('source_id', muni).gte('fetched_at', new Date(Date.now() - (b.days || 3) * 864e5).toISOString()).order('id').limit(300);
  const cands = (its || []).filter((x: Any) => COUNCIL_RE.test(norm(`${x.title} ${x.body || ''}`)) || PLANNING_RE.test(norm(`${x.title} ${x.body || ''}`)));
  const out: Any[] = [];
  for (const x of cands) {
    const fmt = PLANNING_RE.test(norm(`${x.title} ${x.body || ''}`)) ? 'planning_summary' : 'council_summary';
    const key = `council:${x.id}`;
    const st = await getState(key);
    if (st && !b.test) { out.push({ key, skipped: st.stage }); continue; }
    const body = clean(x.body || '');
    if (body.length < 400 || ONLY_LIVE.test(body)) {
      if (!b.dry && !b.test) await setState(key, fmt, { stage: 'no_content', data: { item: x.id, title: x.title }, last_error: 'רק הודעה על שידור או טקסט קצר, אין סדר יום, החלטות או פרוטוקול' });
      out.push({ key, item: x.id, title: x.title, skipped: 'no content (live broadcast notice only)' }); continue;
    }
    // the engine already wrote it: mark that story with the format
    if (x.cluster_id && !b.test) {
      if (!b.dry) { await sb.from('hns_stories').update({ format: fmt, format_key: key }).eq('id', x.cluster_id).is('format', null); await setState(key, fmt, { story_id: x.cluster_id, stage: 'adopted' }); }
      out.push({ key, adopted: x.cluster_id }); continue;
    }
    const material = `${SRC[x.source_id].name_he} (${dm(x.published_at || x.fetched_at)}):\nכותרת: ${clean(x.title)}\nתוכן: ${body.slice(0, 6000)}`;
    if (b.dry) { out.push({ key, would: fmt, facts: material.slice(0, 800) }); continue; }
    if (await budgetLeft() <= 0) { out.push({ key, skipped: 'daily budget' }); break; }
    CALLS = 0;
    const user = `${material}

כתוב סיכום חדשותי של ${fmt === 'planning_summary' ? 'ישיבת ועדת התכנון והבנייה' : 'ישיבת מועצת העיר'}, רק מהחומר, בעברית פשוטה.
פסקה ראשונה: מתי התקיימה הישיבה ומה ההחלטה או הנושא החשוב ביותר לתושבים. אחר כך ההחלטות או הנושאים האחרים, כל אחד במשפט, עם מספרים וכתובות רק כפי שהם כתובים. מה הלאה רק אם זה כתוב. ייחוס: "לפי העירייה" או "לפי הפרוטוקול".
כותרת עד 70 תווים. כותרת משנה משפט אחד. 3 עד 5 נקודות עיקריות.
JSON: {"kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""]}`;
    const w = await write(user, material);
    if (w.hold || w.fail) { await log(fmt, key, null, CALLS, w.usage, { held: w.hold || w.fail }); out.push({ key, held: w.hold || w.fail }); continue; }
    const o = w.out;
    const id = await insertStory(b, { section: fmt === 'planning_summary' ? 'realestate' : 'city', kicker: kickerOf(o.kicker), title: o.title, dek: o.dek, body: o.body, key_points: o.keyPoints,
      places: ['נתניה'], sources: [srcRef(x.source_id, x.url)], basis: 'official', item_ids: [String(x.id)], format: fmt, format_key: key, format_data: { kind: 'council', item: x.id },
      created_at: x.published_at || x.fetched_at, usage: w.usage });
    if (!b.test) { await claimItems(id, [Number(x.id)]); await setState(key, fmt, { story_id: id, stage: 'done' }); }
    await log(fmt, key, id, Math.max(0, CALLS - 1), w.usage, { inserted: id, test: !!b.test });
    out.push({ key, story: id, title: clean(o.title), test: !!b.test });
  }
  return { candidates: cands.length, res: out };
}

// ================= 29.10.2026 night: more recurring formats (the content plan Yakir approved at 23:17) =================
// All of them are routine pieces (format set, notes "auto: hns-recurring"), never the lead and never a flash.

// ---------- works: "עבודות וחסימות השבוע" ----------
// The municipality publishes a weekly works plan (a table: address, work, closure, start, end, hours). The municipality task
// (runs from Yakir's computer, the site blocks foreign servers) puts the article into hns_items (netanya_muni_news) and the table
// rows into docs nwslive/works (shown on /now/roads/). The engine usually writes a story from the item within minutes: that story
// is adopted (format 'works_week', so it is a routine piece and never a flash). When no story exists 12 hours before the week
// starts, this function writes it. Cron hourly.
const WORKS_RE = /תכנית עבודה שבועית|תוכנית עבודה שבועית/;
function worksRange(title: string) {
  const m = title.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const y = Number(m[5]); const m1 = Number(m[2]), m2 = Number(m[4]);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return { from: `${m1 > m2 ? y - 1 : y}-${p2(m1)}-${p2(Number(m[1]))}`, to: `${y}-${p2(m2)}-${p2(Number(m[3]))}` };
}
// the municipal table writes dates as 11/4/2026 (month/day) or 1.11.26 (day.month) and hours like 6:14:00 (meaning 06:00 to 14:00).
// The same rules are in sites/nws/src/pages/now/roads/index.astro.
function worksCell(v: string, kind: 'date' | 'hours', from = '') {
  const t = String(v || '').replace(/​/g, '').trim();
  if (!t) return '';
  if (kind === 'date') {
    let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]), y = Number(m[3]);
      const md = Date.UTC(y, a - 1, b), dmy = Date.UTC(y, b - 1, a);
      const mid = from ? Date.parse(`${from}T12:00:00Z`) : Date.now();
      const useMd = a <= 12 && (b > 12 || Math.abs(md - mid) <= Math.abs(dmy - mid));
      const d = new Date(useMd ? md : dmy);
      return `${d.getUTCDate()}.${d.getUTCMonth() + 1}`;
    }
    m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) return `${Number(m[1])}.${Number(m[2])}`;
    return t;
  }
  const m = t.match(/^(\d{1,2}):(\d{2}):00$/);
  if (m) return `${m[1].padStart(2, '0')}:00 עד ${m[2]}:00`;
  return t.replace(/(\d{1,2})\.(\d{2})(?!\d)/g, '$1:$2').replace(/\s*-\s*/g, ' עד ').replace(/\s*\/\s*/g, ', ').replace(/(\d:\d{2})\s+(?=\d)/g, '$1, ');
}
function worksRows(doc: Any) {
  const rows: string[][] = Array.isArray(doc?.rows) ? doc.rows : [];
  return rows.map((r) => {
    const [where, what, closed, start, end, hours] = (Array.isArray(r) ? r : []).map((x) => clean(x));
    return { where, what, closed, start: worksCell(start, 'date', doc.weekFrom), end: worksCell(end, 'date', doc.weekFrom), hours: worksCell(hours, 'hours') };
  }).filter((r) => r.where);
}
async function works(b: Any) {
  await sources();
  const { data: its } = await sb.from('hns_items').select('id,title,body,url,published_at,fetched_at,cluster_id').eq('source_id', 'netanya_muni_news')
    .gte('fetched_at', new Date(Date.now() - 12 * 864e5).toISOString()).order('id', { ascending: false }).limit(80);
  const { data: dd } = await sb.from('docs').select('data').eq('coll', 'nwslive').eq('id', 'works').maybeSingle();
  const doc = dd?.data || null;
  const today = il(new Date()).ymd;
  const out: Any[] = [];
  for (const x of (its || []).filter((i: Any) => WORKS_RE.test(i.title))) {
    const r = worksRange(String(x.title));
    if (!r || r.to < today) continue;
    const key = `works:${r.from}`;
    const st = await getState(key);
    if (st?.story_id && !b.test) { out.push({ key, skipped: st.stage }); continue; }
    const rows = doc && (doc.url === x.url || doc.weekFrom === r.from) ? worksRows(doc) : [];
    const fdata = { kind: 'works', from: r.from, to: r.to, url: x.url, rows: rows.length };
    // the engine already wrote it: mark that story with the format (routine, never a flash)
    if (x.cluster_id && !b.test) {
      const { data: ex } = await sb.from('hns_stories').select('id,state,format').eq('id', x.cluster_id).maybeSingle();
      if (ex && ex.state !== 'rejected' && (!ex.format || ex.format === 'works_week')) {
        if (!b.dry) {
          await sb.from('hns_stories').update({ format: 'works_week', format_key: key, format_data: fdata }).eq('id', ex.id).is('format', null);
          await setState(key, 'works_week', { story_id: ex.id, stage: 'adopted', data: { item: x.id } });
          await log('works_week', key, ex.id, 0, null, { adopted: ex.id });
        }
        out.push({ key, adopted: ex.id }); continue;
      }
    }
    if (!b.force && !b.test && Date.now() < Date.parse(ilIso(r.from, '06:00')) - 12 * H) { out.push({ key, waiting: 'the engine may still write it' }); continue; }
    const table = rows.map((w, i) => `w${i + 1}: ${w.where} | ${w.what || '-'} | חסימה: ${w.closed || 'לא צוין'} | ${w.start}${w.end && w.end !== w.start ? ` עד ${w.end}` : ''} | ${w.hours}`).join('\n');
    const material = `עיריית נתניה, ${clean(x.title)} (השבוע: ${dm(ilIso(r.from, '12:00'))} עד ${dm(ilIso(r.to, '12:00'))}).\n${clean(x.body || '').slice(0, 5000)}${table ? `\n\nשורות הטבלה של העירייה:\n${table}` : ''}`;
    if (b.dry) { out.push({ key, would: 'works_week', rows: rows.length, facts: material.slice(0, 1500) }); continue; }
    if (await budgetLeft() <= 0) { out.push({ key, skipped: 'daily budget' }); break; }
    CALLS = 0;
    const user = `${material}

כתוב ידיעה בשם "עבודות וחסימות בנתניה השבוע" מהחומר שלמעלה בלבד, בעברית פשוטה.
פסקה ראשונה: השבוע (התאריכים) והחסימה או שיבוש התנועה החשובים ביותר. אחר כך פסקה לכל קבוצה: חסימות ושיבושי תנועה (רחוב, מה, מתי ובאילו שעות), עבודות תשתית גדולות (ביוב, מים, רכבת קלה), ובסוף משפט אחד שמסכם את גיזומי העצים והעבודות הקטנות לפי שמות המקומות. בלי להמציא שעות, תאריכים או מסלולי עקיפה. ייחוס: "לפי העירייה".
כותרת עד 70 תווים שמתחילה ב"עבודות וחסימות בנתניה השבוע". כותרת משנה משפט אחד. kicker: "עבודות השבוע". 3 עד 5 נקודות עיקריות.
JSON: {"kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""]}`;
    const w = await write(user, material);
    if (w.hold || w.fail) { await log('works_week', key, null, CALLS, w.usage, { held: w.hold || w.fail }); out.push({ key, held: w.hold || w.fail }); continue; }
    const o = w.out;
    let title = clean(o.title); if (!title.startsWith('עבודות וחסימות')) title = `עבודות וחסימות בנתניה השבוע: ${title}`;
    const id = await insertStory(b, { section: 'transport', kicker: kickerOf(o.kicker) || 'עבודות השבוע', title, dek: o.dek, body: o.body, key_points: o.keyPoints,
      places: ['נתניה'], sources: [srcRef('netanya_muni_news', x.url)], basis: 'official', item_ids: [String(x.id)], format: 'works_week', format_key: key, format_data: fdata, usage: w.usage });
    if (!b.test) { await claimItems(id, [Number(x.id)]); await setState(key, 'works_week', { story_id: id, stage: 'done', data: { item: x.id } }); }
    await log('works_week', key, id, Math.max(0, CALLS - 1), w.usage, { inserted: id, test: !!b.test });
    out.push({ key, story: id, title, test: !!b.test });
  }
  return { res: out };
}

// ---------- history: "נתניה של פעם" ----------
// Weekly (Tuesday 10:00 Israel time). A place in the city (a building, a neighborhood, a site) from the Hebrew Wikipedia
// categories of Netanya; facts only from that article (the writer gets its text, and every number must appear in it). A photo
// only when its file is in the public domain or under a free license (CC0, CC BY, CC BY-SA, never NC or ND), with the credit shown
// under the picture; otherwise no image and the site shows the section photo (hns-img does not draw an AI picture for this
// format). A place is never used twice.
const WIKI = 'https://he.wikipedia.org/w/api.php';
const WIKI_UA = { 'User-Agent': 'nws.co.il local news (https://nws.co.il/; office@dabullaw.co.il)', 'Accept-Language': 'he' };
const HIST_CATS = ['קטגוריה:נתניה: היסטוריה', 'קטגוריה:נתניה: מבנים', 'קטגוריה:נתניה: שכונות', 'קטגוריה:נתניה: גאוגרפיה'];
async function wiki(params: Record<string, string>) {
  const r = await fetch(`${WIKI}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`, { headers: WIKI_UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`wikipedia ${r.status}`);
  return await r.json();
}
const FREE_LIC = /^(?:public domain|pd\b|cc0|cc[ -]by(?:-sa)?\b)/i;
async function freeImage(file: string) {
  const j = await wiki({ action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1600' });
  const ii = j?.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) return null;
  const md = ii.extmetadata || {};
  const lic = txt(md.LicenseShortName?.value || '');
  if (!FREE_LIC.test(lic) || /(?:^|[\s-])(?:nc|nd)(?:[\s-]|$)/i.test(lic)) return null;
  const artist = txt(md.Artist?.value || '').slice(0, 40);
  const url = String(ii.thumburl || ii.url || '').replace(/\?.*$/, '');
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(url)) return null;
  return { url, credit: clean(`ויקישיתוף${artist ? `, ${artist}` : ''}, ${lic}`).slice(0, 80), lic, page: String(ii.descriptionurl || '') };
}
async function history(b: Any) {
  const now = il(new Date());
  if (!b.force && !(now.wd === 2 && now.hh === 10)) return { skipped: `not Tuesday 10:00 in Israel (${now.ymd} ${now.hm})` };
  const key = `history:${now.ymd}`;
  if (!b.test && (await getState(key))?.story_id) return { skipped: 'already written', key };
  const { data: used } = await sb.from('hns_recurring').select('data').eq('format', 'history');
  const usedT = new Set((used || []).map((r: Any) => String(r.data?.title || '')).filter(Boolean));
  const titles = new Set<string>();
  for (const c of HIST_CATS) {
    try { const j = await wiki({ action: 'query', list: 'categorymembers', cmtitle: c, cmnamespace: '0', cmlimit: '200' }); for (const m of j?.query?.categorymembers || []) titles.add(String(m.title)); } catch { /* next category */ }
  }
  const cands = [...titles].filter((t) => !usedT.has(t) && t !== 'נתניה' && (!b.place || t === b.place)).sort(() => Math.random() - 0.5);
  let pick: Any = null;
  for (const t of cands.slice(0, 10)) {
    const j = await wiki({ action: 'query', titles: t, prop: 'extracts|pageimages|info', explaintext: '1', exsectionformat: 'plain', piprop: 'name', inprop: 'url', redirects: '1' }).catch(() => null);
    const pg = j?.query?.pages?.[0];
    const ex = clean(String(pg?.extract || '').replace(/\n{2,}/g, '\n'));
    // a place with a past: its article tells about years before 1980
    if (!pg || pg.missing || ex.length < 1500 || !/(?<!\d)(?:18\d\d|19[0-7]\d)(?!\d)/.test(ex)) continue;
    pick = { title: String(pg.title), url: String(pg.fullurl || `https://he.wikipedia.org/wiki/${encodeURIComponent(pg.title)}`), text: ex.slice(0, 7000), image: pg.pageimage ? String(pg.pageimage) : '' };
    break;
  }
  if (!pick) { if (!b.dry && !b.test) await log('history', key, null, 0, null, { held: 'no article long enough' }); return { held: 'no article long enough', key, candidates: cands.length }; }
  const img = pick.image ? await freeImage(pick.image).catch(() => null) : null;
  const material = `${pick.title} (מתוך הערך בוויקיפדיה):\n${pick.text}`;
  if (b.dry) return { key, would: 'history', place: pick.title, url: pick.url, image: img, candidates: cands.length, facts: material.slice(0, 1200) };
  if (await budgetLeft() <= 0) return { skipped: 'daily budget' };
  await sources(); CALLS = 0;
  const user = `${material}

כתוב כתבה למדור "נתניה של פעם" על ${pick.title}, מהחומר שלמעלה בלבד, בעברית פשוטה וקולחת.
ספר את הסיפור של המקום לפי סדר הזמנים: איך ומתי התחיל, מי היו שם, מה השתנה עם השנים, ומה יש שם היום (רק אם זה כתוב בחומר). 4 עד 6 פסקאות קצרות, עד 350 מילים בסך הכול. כל שנה, מספר ושם חייבים להופיע בחומר. לא להעתיק משפטים, לנסח מחדש. בלי "לפי ויקיפדיה" בטקסט.
כותרת עד 70 תווים שמתחילה ב"נתניה של פעם:". כותרת משנה משפט אחד. kicker: "נתניה של פעם". 3 נקודות עיקריות.
JSON: {"kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""]}`;
  MAX_TOKENS = 6000;
  let w: Any;
  try { w = await write(user, material); } catch (e) { w = { fail: String((e as Error).message || e).slice(0, 200) }; }
  if (w.hold || w.fail) { await log('history', key, null, CALLS, w.usage || null, { held: w.hold || w.fail, place: pick.title }); return { held: w.hold || w.fail, key, place: pick.title }; }
  const o = w.out;
  let title = clean(o.title); if (!title.startsWith('נתניה של פעם')) title = `נתניה של פעם: ${title}`;
  // war, expulsion, killings or attacks in the story of the place: Yakir approves it before it is published (hns-publish holds
  // a 'sensitive' story for approval)
  const sensitive = /נכבש|התרוקן|גורשו|גירוש|פליטים|טבח|פיגוע|נהרג|נרצח|נטבח/.test(norm([title, o.dek, ...cleanArr(o.body)].join(' ')));
  const id = await insertStory(b, { section: 'community', kicker: 'נתניה של פעם', title, dek: o.dek, body: o.body, key_points: o.keyPoints, ...(sensitive ? { sensitivity: 'sensitive' } : {}),
    places: ['נתניה'], sources: [{ id: 'wikipedia', name: 'ויקיפדיה', url: pick.url, trust: 'media' }], basis: 'public', item_ids: [], format: 'history', format_key: key,
    format_data: { kind: 'history', place: pick.title, url: pick.url, image: img ? { license: img.lic, page: img.page } : null },
    ...(img ? { image_url: img.url, image_alt: pick.title, image_model: null, image_at: new Date().toISOString(), extras: { image_credit: img.credit } } : {}), usage: w.usage });
  if (!b.test) await setState(key, 'history', { story_id: id, stage: 'done', data: { title: pick.title } });
  await log('history', key, id, Math.max(0, CALLS - 1), w.usage, { inserted: id, place: pick.title, image: !!img, test: !!b.test });
  return { key, story: id, title, place: pick.title, image: img?.credit || null, test: !!b.test };
}

// ---------- shared: weekly and monthly roundups from items ----------
// local items (and, with official=true, every item of an official source) published in the last days. The query is narrowed in
// the database: an answer has at most 1000 rows, and a week has thousands of national items.
async function itemsSince(days: number, filter: (x: Any) => boolean, official = false) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const cols = 'id,source_id,title,body,url,published_at,fetched_at,cluster_id,is_local,topic,outlet';
  const offIds = Object.values(SRC).filter((s: Any) => s.trust === 'official' && s.role === 'source').map((s: Any) => s.id);
  const all = new Map<number, Any>();
  for (const kind of official ? ['local', 'official'] : ['local']) {
    for (let p = 0; p < 6; p++) {
      let q = sb.from('hns_items').select(cols).gte('fetched_at', since).order('id', { ascending: false }).range(p * 1000, p * 1000 + 999);
      q = kind === 'local' ? q.eq('is_local', true) : q.in('source_id', offIds.length ? offIds : ['-']);
      const { data } = await q;
      for (const x of data || []) all.set(Number(x.id), x);
      if ((data || []).length < 1000) break;
    }
  }
  return [...all.values()].filter((x: Any) => SRC[x.source_id]?.role === 'source' && (!x.published_at || x.published_at >= since) && filter(x));
}
// the same event in several items is one group; a group counts as verified with an official source or 2 different outlets
const STOP = new Set(['נתניה', 'בנתניה', 'השבוע', 'היום', 'הלילה', 'אתמול', 'העיר', 'בעיר']);
const tokSet = (s: string) => new Set(norm(s).replace(/[^\p{L}\p{N}"\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)));
function groupItems(items: Any[]) {
  const groups: { toks: Set<string>; items: Any[] }[] = [];
  for (const x of items) {
    const t = tokSet(`${x.title} ${String(x.body || '').slice(0, 300)}`);
    const g = groups.find((gr) => { let n = 0; for (const w of t) if (gr.toks.has(w)) n++; return n >= 3 && n / Math.max(1, Math.min(t.size, gr.toks.size)) >= 0.3; });
    if (g) { g.items.push(x); for (const w of t) g.toks.add(w); } else groups.push({ toks: t, items: [x] });
  }
  return groups.map((g) => g.items);
}
const verified = (g: Any[]) => g.some((x) => SRC[x.source_id]?.trust === 'official') || new Set(g.map((x) => x.outlet || x.source_id)).size >= 2;
const refOf = (x: Any) => ({ id: x.source_id, name: SRC[x.source_id]?.name_he || x.source_id, url: x.url || '', trust: SRC[x.source_id]?.trust || 'media' });
const srcsOf = (items: Any[]) => [...new Map(items.map((x) => [x.source_id, refOf(x)])).values()];
async function roundup(b: Any, o: { format: string; key: string; section: string; kicker: string; titleStart: string; material: string; ask: string; srcs: Any[]; itemIds: number[]; fdata: Any }) {
  if (b.dry) return { key: o.key, would: o.format, facts: o.material.slice(0, 2000) };
  if (await budgetLeft() <= 0) return { skipped: 'daily budget' };
  CALLS = 0;
  const user = `${o.material}\n\n${o.ask}\nכותרת עד 70 תווים שמתחילה ב"${o.titleStart}". כותרת משנה משפט אחד. kicker: "${o.kicker}". 3 עד 5 נקודות עיקריות.\nJSON: {"kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""]}`;
  const w = await write(user, o.material);
  if (w.hold || w.fail) { await log(o.format, o.key, null, CALLS, w.usage, { held: w.hold || w.fail }); return { held: w.hold || w.fail, key: o.key }; }
  const out = w.out;
  let title = clean(out.title); if (!title.startsWith(o.titleStart)) title = `${o.titleStart}: ${title}`;
  const id = await insertStory(b, { section: o.section, kicker: o.kicker, title, dek: out.dek, body: out.body, key_points: out.keyPoints,
    places: ['נתניה'], sources: o.srcs, basis: o.srcs.some((x) => x.trust === 'official') ? 'official' : 'public',
    item_ids: o.itemIds.map(String), format: o.format, format_key: o.key, format_data: o.fdata, usage: w.usage });
  if (!b.test) await setState(o.key, o.format, { story_id: id, stage: 'done', data: { items: o.itemIds.length } });
  await log(o.format, o.key, id, Math.max(0, CALLS - 1), w.usage, { inserted: id, test: !!b.test });
  return { key: o.key, story: id, title, test: !!b.test };
}

// ---------- opened: "מה נפתח בעיר" ----------
// Weekly (Wednesday 11:00 Israel time): places that opened in Netanya this week (a branch, a restaurant, a park, a library),
// only verified (an official source, or two different outlets), plus businesses whose listing in the site's directory was
// approved this week (named as joining the directory, not as new). At least 2 entries, otherwise no story.
const OPEN_RE = /נפתח|נפתחה|נפתחו|ייפתח|תיפתח|ייפתחו|פתיחת|פתח את שעריו|פותח את שעריו|פותחת את שעריה|נחנך|נחנכה|נחנכו|חנוכת|השקת/;
const OPEN_PLACE_RE = /סניף|מסעדה|חנות|קניון|מתחם|בית קפה|גן |גינה|פארק|ספרייה|בריכה|מגרש|אולם|קליניקה|מרפאה|סופרמרקט|גלריה|מוזיאון|טיילת|שוק|מרכז (?:קהילתי|מסחרי|ספורט|תרבות)|מועדון/;
const NOT_OPEN_RE = /חקירה|באש|תיק|הליך|הרשמה|שנת הלימודים|עונת|ישיבת|לתנועה|כביש|מחסום|דיון|מכרז/;
async function opened(b: Any) {
  const now = il(new Date());
  if (!b.force && !(now.wd === 3 && now.hh === 11)) return { skipped: `not Wednesday 11:00 in Israel (${now.ymd} ${now.hm})` };
  const key = `opened:${now.ymd}`;
  if (!b.test && (await getState(key))?.story_id) return { skipped: 'already written', key };
  await sources();
  const its = await itemsSince(7, (x) => x.is_local && x.topic !== 'flash' && OPEN_RE.test(norm(x.title)) && OPEN_PLACE_RE.test(norm(`${x.title} ${String(x.body || '').slice(0, 300)}`)) && !NOT_OPEN_RE.test(norm(x.title)));
  const groups = groupItems(its).filter(verified).slice(0, 8);
  const { data: biz } = await sb.from('hns_biz_listings').select('id,name,category,area').eq('status', 'approved').or('is_test.is.null,is_test.eq.false')
    .gte('decided_at', new Date(Date.now() - 7 * 864e5).toISOString()).limit(10);
  const listings = biz || [];
  if (groups.length + listings.length < 2) { if (!b.dry && !b.test) await log('opened_week', key, null, 0, null, { held: `${groups.length} verified openings, ${listings.length} new listings` }); return { held: 'too few', key, candidates: its.length, openings: groups.length, listings: listings.length }; }
  const material = [`פתיחות בנתניה ובסביבה בשבוע האחרון (כל שורה היא אירוע אחד, מכמה מקורות):`,
    ...groups.map((g, i) => `o${i + 1}: ${g.map((x) => `${clean(x.title)}. ${clean(String(x.body || '').slice(0, 600))}`).join(' || ')}`),
    ...(listings.length ? ['', 'עסקים שהצטרפו השבוע לספריית העסקים של האתר (לא בהכרח עסקים חדשים, רק שהצטרפו לספרייה):', ...listings.map((x: Any) => `- ${clean(x.name)}, ${clean(x.category)}${x.area ? `, ${clean(x.area)}` : ''}`)] : [])].join('\n');
  const used = groups.flat();
  const srcs = srcsOf(used);
  if (listings.length) srcs.push({ id: 'nws_directory', name: 'ספריית העסקים של האתר', url: 'https://nws.co.il/directory/', trust: 'media' });
  return await roundup(b, { format: 'opened_week', key, section: 'community', kicker: 'מה נפתח בעיר', titleStart: 'מה נפתח בנתניה השבוע', material,
    ask: 'כתוב ידיעה בשם "מה נפתח בנתניה השבוע" מהחומר שלמעלה בלבד, בעברית פשוטה. פסקה לכל פתיחה: מה נפתח, איפה ומתי, רק מה שכתוב. אם יש עסקים שהצטרפו לספריית העסקים, פסקה אחת בסוף שאומרת שהם הצטרפו לספריית העסקים של האתר, בלי לכתוב שהם חדשים ובלי שבח. בלי מחירים ובלי מבצעים.',
    srcs, itemIds: used.map((x) => Number(x.id)), fdata: { kind: 'opened', openings: groups.length, listings: listings.map((x: Any) => x.id) } });
}

// ---------- sports week: "הספורט של נתניה השבוע" ----------
// Weekly (Sunday 12:00 Israel time): the city's teams and athletes beyond the Maccabi Netanya senior football stories (those have
// their own preview and report): basketball, volleyball, handball, women's and youth football, athletics, swimming and so on, from
// the week's local sports items (the new source gn_sports adds these branches). Scores only as the items state them. Routine.
// an item counts when it names Netanya and another branch, a youth or women's team, or a lower league team of the city
const OTHER_SPORT_RE = /כדורסל|כדורעף|כדוריד|אתלטיק|שחייה|שחיה|ג'ודו|טניס|(?<![א-ת])נוער|נערים|נערות|ילדות|(?<![א-ת])נשים|אופניים|טאקוונדו|קראטה|התעמלות|שחמט|גלישה|חתירה|איגרוף|היאבקות|ליגה לאומית|ליגה א'|ליגה ב'|ליגה ג'|בית"ר נתניה|הפועל נתניה|אליצור נתניה|מכבי צעירי/;
async function sportsWeek(b: Any) {
  const now = il(new Date());
  if (!b.force && !(now.wd === 0 && now.hh === 12)) return { skipped: `not Sunday 12:00 in Israel (${now.ymd} ${now.hm})` };
  const key = `sportsweek:${now.ymd}`;
  if (!b.test && (await getState(key))?.story_id) return { skipped: 'already written', key };
  await sources();
  const its = await itemsSince(7, (x) => {
    const t = norm(`${x.title} ${String(x.body || '').slice(0, 600)}`);
    return x.is_local && (x.topic === 'sports' || x.source_id === 'gn_sports') && /נתניה/.test(t) && OTHER_SPORT_RE.test(t);
  });
  const groups = groupItems(its).slice(0, 10);
  if (groups.length < 2) { if (!b.dry && !b.test) await log('sports_week', key, null, 0, null, { held: `only ${groups.length} items` }); return { held: 'too few', key, candidates: its.length, groups: groups.length }; }
  const material = ['ספורט בנתניה בשבוע האחרון, מחוץ לקבוצת הבוגרים של מכבי נתניה בכדורגל (כל שורה היא אירוע אחד):',
    ...groups.map((g, i) => `s${i + 1}: ${g.map((x) => `${clean(x.title)}. ${clean(String(x.body || '').slice(0, 500))}`).join(' || ')}`)].join('\n');
  const used = groups.flat();
  return await roundup(b, { format: 'sports_week', key, section: 'sports', kicker: 'ספורט נתניה', titleStart: 'הספורט של נתניה השבוע', material,
    ask: 'כתוב סיכום שבועי בשם "הספורט של נתניה השבוע" מהחומר שלמעלה בלבד, בעברית פשוטה. פסקה קצרה לכל אירוע: הקבוצה או הספורטאי, הענף, התוצאה רק כפי שהיא כתובה, ומה הלאה רק אם כתוב.',
    srcs: srcsOf(used), itemIds: used.map((x) => Number(x.id)), fdata: { kind: 'sportsweek', items: used.length } });
}

// ---------- education: "חינוך ומשפחות" ----------
// Monthly (the 1st, 09:00 Israel time): announcements for Netanya families from the last 30 days (registration to kindergartens
// and schools, the school calendar and holidays, camps, after school programs, transport, grants), from official sources (the
// municipality, the Ministry of Education) or local items confirmed by 2 outlets. At least 2 subjects, otherwise no story.
const EDU_RE = /רישום (?:ל|לגני|לגן|לכיתה|לבתי|למוסדות)|גני (?:ה)?ילדים|גן חובה|בתי (?:ה)?ספר|לוח (?:ה)?חופשות|חופשת (?:ה)?(?:חנוכה|פסח|סוכות|קיץ)|קייטנ|שנת הלימודים|משרד החינוך|צהרונ|מעונות יום|הסעות (?:ל|תלמידים)|מלגות|שיבוץ לגנים|תלמידים|הורים/;
async function education(b: Any) {
  const now = il(new Date());
  if (!b.force && !(now.d === 1 && now.hh === 9)) return { skipped: `not the 1st at 09:00 in Israel (${now.ymd} ${now.hm})` };
  const key = `education:${now.ymd.slice(0, 7)}`;
  if (!b.test && (await getState(key))?.story_id) return { skipped: 'already written', key };
  await sources();
  const its = await itemsSince(30, (x) => x.topic !== 'flash' && EDU_RE.test(norm(`${x.title} ${String(x.body || '').slice(0, 400)}`)) && (x.is_local || SRC[x.source_id]?.trust === 'official'), true);
  const groups = groupItems(its).filter(verified).slice(0, 8);
  if (groups.length < 2) { if (!b.dry && !b.test) await log('education_month', key, null, 0, null, { held: `only ${groups.length} subjects` }); return { held: 'too few', key, candidates: its.length, groups: groups.length }; }
  const material = ['הודעות לחינוך ולמשפחות בנתניה מהחודש האחרון (כל שורה היא נושא אחד):', ...groups.map((g, i) => `e${i + 1}: ${g.map((x) => `${SRC[x.source_id]?.name_he || ''}: ${clean(x.title)}. ${clean(String(x.body || '').slice(0, 900))}`).join(' || ')}`)].join('\n');
  const used = groups.flat();
  return await roundup(b, { format: 'education_month', key, section: 'community', kicker: 'חינוך ומשפחות', titleStart: 'חינוך ומשפחות בנתניה', material,
    ask: 'כתוב ידיעה בשם "חינוך ומשפחות בנתניה: מה חשוב לדעת החודש" מהחומר שלמעלה בלבד, בעברית פשוטה. פסקה לכל נושא: מה, למי זה רלוונטי, מועדים ואיך עושים, רק מה שכתוב. מה שיש לו מועד אחרון קרוב ראשון. ייחוס לגוף שהודיע (העירייה או משרד החינוך).',
    srcs: srcsOf(used), itemIds: used.map((x) => Number(x.id)), fdata: { kind: 'education', items: used.length } });
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    await config();
    if (b.action === 'match') return J({ ok: true, ...(await match(b)) });
    if (b.action === 'week') return J({ ok: true, ...(await week(b)) });
    if (b.action === 'weekend') return J({ ok: true, ...(await weekend(b)) });
    if (b.action === 'council') return J({ ok: true, ...(await council(b)) });
    if (b.action === 'works') return J({ ok: true, ...(await works(b)) });
    if (b.action === 'history') return J({ ok: true, ...(await history(b)) });
    if (b.action === 'opened') return J({ ok: true, ...(await opened(b)) });
    if (b.action === 'sportsweek') return J({ ok: true, ...(await sportsWeek(b)) });
    if (b.action === 'education') return J({ ok: true, ...(await education(b)) });
    // diagnostics: the parsed games of one round from sport5 (and the start of the raw answer)
    if (b.action === 'round') { const fx = await fixture(); const raw = await get(`${S5}/Ajax/GetCycleGames.aspx?LSnum=${fx?.lsnum}&CycleNum=${Number(b.n) || 1}`).catch((e) => String(e)); return J({ ok: true, lsnum: fx?.lsnum, games: parseRound(raw), raw: raw.slice(0, Number(b.raw) || 0) }); }
    if (b.action === 'status') {
      const { data: st } = await sb.from('hns_recurring').select('key,format,story_id,stage,last_error,updated_at').order('updated_at', { ascending: false }).limit(30);
      const { data: lg } = await sb.from('hns_recurring_log').select('at,format,key,story_id,ai_calls,result').order('id', { ascending: false }).limit(20);
      return J({ ok: true, budgetLeft: await budgetLeft(), state: st, log: lg });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
