// hns-write (23.10.2026): writer stage of the HNS (חדשות נתניה והשרון) news engine, SHADOW MODE. Nothing is published.
// Yakir approved (23.10.2026) using the Claude API for drafting in trial mode, estimated 20-60 NIS a month; drafts stay internal.
// POST (x-cron-secret) {action:'tick'} -> cron every 10 min:
//   1. groups new local items from hns_items into stories (same event = shared words within 12 hours)
//   2. a story built only on community tips is kept as "needs_check" with no AI call (tips need an official or second source)
//   3. other new stories get one Claude call that writes a short Hebrew item in our own wording, from the facts in the sources only
//   4. sensitive stories (death, minors, missing people, attacks) are always "needs_check": Yakir approves each one
// Cost guard: at most MAX_PER_DAY AI calls a day (Israel time), Sonnet 5.5, short prompts.
// 28.10.2026 (Yakir): we are an independent news site. Stories are our own reporting from primary sources. Another outlet is never
//   named in a title, subtitle or key point, and the body does not lean on "לפי דיווח ב...". An outlet is credited only when truly
//   needed (exclusive scoop, their interview or quote, their photo or video, data they produced), as one closing line in the last
//   paragraph. The answer also gives "basis": official | public | media_exclusive. A media_exclusive story is 'needs_check' with the
//   reason "מבוסס רק על פרסום בכלי תקשורת אחר" (Yakir decides). After writing, the text is checked against the outlet list in the
//   table hns_outlets (same check as hns-publish); a failing draft is written once more with the reason, and is marked "נכתב מחדש".
// POST {action:'rewrite', ids:[...]} (x-cron-secret): hns-publish sends back a draft that failed the check; it is written again once.
// 28.10.2026 (home redesign): the answer also gives "kicker" (the short colored line above the title on the site, up to 5 words,
//   never a media outlet name; dropped when it fails) and "closure" for a road closure story ({place, what, until, approx}).
// 28.10.2026 (fix): national stories that only "looked" local (a village name that is an everyday word) are closed with no AI
//   call, and an answer that holds no story is closed once as 'rejected' instead of being paid for again every 10 minutes.
// 28.10.2026 (Yakir: publish as fast as possible, automatically): CORROBORATION. A story built only on a community tip waits as
//   'needs_check'. When a later item from one of our sources (official or media) tells the same event (same grouping rule, within
//   12 hours), the tip story is written now from all its items with one AI call, and gets the normal state: routine ('draft', so
//   hns-publish publishes it automatically) or 'needs_check' when sensitive, unclear or based only on another outlet's exclusive.
// 28.10.2026 (budget switch): the daily cap and the model come from the row 'ai' of the table hns_config. Default (boost=false):
//   max_per_day 25 with Sonnet, as Yakir approved. boost=true is set only after Yakir approves a bigger budget: up to
//   boost_max_per_day calls, routine items (not sensitive, one or two source items) with boost_model (cheaper), the rest with
//   boost_complex_model.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const MAX_PER_DAY = 25;
const MODEL = 'claude-sonnet-5-5';
let CFG: Any = { max_per_day: MAX_PER_DAY, model: MODEL, boost: false };
async function config() {
  const { data } = await sb.from('hns_config').select('v').eq('k', 'ai').maybeSingle();
  if (data?.v && typeof data.v === 'object') CFG = { ...CFG, ...data.v };
}
const dailyMax = () => Number(CFG.boost ? CFG.boost_max_per_day : CFG.max_per_day) || MAX_PER_DAY;
const modelFor = (sensitive: boolean, nItems: number) => !CFG.boost ? (CFG.model || MODEL) : (!sensitive && nItems <= 2 ? (CFG.boost_model || MODEL) : (CFG.boost_complex_model || MODEL));
// AI calls used today (Israel day): new stories with a model, plus tip stories that were corroborated and written today
async function usedToday(dayStart: string) {
  const { count: a } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).not('model', 'is', null).gte('created_at', dayStart);
  const { count: b } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).not('model', 'is', null).lt('created_at', dayStart).gte('updated_at', dayStart).like('notes', '%אומת%');
  return (a || 0) + (b || 0);
}

const norm = (s: string) => s.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
const STOP = new Set(['נתניה', 'בנתניה', 'מנתניה', 'לנתניה', 'שנתניה', 'ברחוב', 'רחוב', 'היום', 'אתמול', 'הערב', 'הבוקר', 'לאחר', 'במהלך', 'סמוך', 'בסמוך', 'כבן', 'כבת', 'אשר', 'אשה', 'אישה', 'גבר', 'בעיר', 'העיר', 'עדכון', 'דוברות', 'מד"א', 'התקבל', 'דיווח', 'במוקד', 'מעניקים', 'טיפול', 'רפואי', 'ומפנים', 'חובשים', 'ופראמדיקים', 'ופרמדיקים', 'במצב', 'השרון', 'ראשוני', 'עודכן']);
function toks(s: string) {
  return new Set(norm(s).replace(/[^\p{L}\p{N}"\s]/gu, ' ').split(/\s+/).map((w) => w.replace(/^"|"$/g, ''))
    .map((w) => (w.length > 4 && /^[ובלמהש]/.test(w) ? w.slice(1) : w)).filter((w) => w.length >= 3 && !STOP.has(w)));
}
function same(a: Set<string>, b: Set<string>) { let n = 0; for (const x of a) if (b.has(x)) n++; return n >= 3 && n / Math.max(1, Math.min(a.size, b.size)) >= 0.35; }
const NETANYA_PLACES = new Set(['נתניה', 'לניאדו']);
// 28.10.2026: locality names that are also everyday words (same list as hns-collect). A group whose only places are such
// names, from sources that are not local, with no local word in the text, is not local news: closed with no AI call.
const AMBIG = new Set(['אומץ', 'בחן', 'קדימה', 'אודים', 'המעפיל', 'גאולים', 'תנובות', 'ינוב', 'יכיני', 'עולש', 'אחיטוב', 'בת חן']);
const CONTEXT_RE = /נתני(?!הו)|השרון|עמק חפר|מושב|קיבוץ|יישוב|המועצה|מועצה אזורית|צורן|כביש (?:2|4|57)(?![0-9])/;
const notLocal = (items: Any[], places: string[], src: Any) => places.length > 0 && places.every((p) => AMBIG.has(p))
  && items.every((x) => !src[x.source_id].local_only && !CONTEXT_RE.test(norm(`${x.title} ${x.body || ''}`)));
// the answer did not hold a story (the writer said it is not local, refused, or returned plain text): a final answer, not a glitch
class NoStory extends Error {}
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const SYSTEM = `אתה עורך חדשות מקומי באתר "חדשות נתניה והשרון". אתה כותב ידיעה קצרה בעברית פשוטה וברורה, רק מהעובדות שמופיעות במקורות שקיבלת.
כללים מחייבים:
- אסור להמציא פרט שלא מופיע במקורות: לא שמות, לא גילים, לא שעות, לא מספרים, לא סיבות.
- לא להעתיק משפטים מהמקורות. לכתוב בניסוח שלנו.
- לא לכתוב שמות של נפגעים, הרוגים, חשודים או קטינים, גם אם הם מופיעים במקור.
- לא לכתוב דעה, ספקולציה או שבח. טון ענייני ורגוע.
- לא להשתמש בקו מפריד ארוך או בינוני. רק פסיק, נקודה או מקף רגיל.
- אם מקור הוא רק "רמז" מקבוצה לא רשמית ואין מקור רשמי או כלי תקשורת שמאשר, לסמן needsCheck=true.
- כותרת עד 70 תווים, עם שם המקום. כותרת משנה משפט אחד.
- גוף הידיעה: 2 עד 4 פסקאות קצרות.
אנחנו אתר חדשות עצמאי. כותבים את הידיעה כדיווח שלנו, מהעובדות:
- בכותרת, בכותרת המשנה ובנקודות העיקריות אסור לכתוב שם של כלי תקשורת אחר (למשל ynet, וואלה, מעריב, כאן, N12, חדשות 12, חדשות 13, נתניהנט, ice, גלובס, כלכליסט, ישראל היום, חדשות 08).
- לא לכתוב "לפי דיווח", "לפי פרסום", "כך לפי דיווח באתר...", "מבזק שפורסם" או "כפי שדווח". לא לבנות את הידיעה על "מישהו פרסם".
- להעדיף מקורות ראשוניים: עירייה, משטרה, מד״א, כבאות והצלה, חברת החשמל, ועדת הבחירות המרכזית, משרדי ממשלה, בתי משפט, מי נתניה. כשעובדה באה מגוף רשמי, לייחס אותה לגוף, למשל "לפי נתוני ועדת הבחירות המרכזית", "לפי המשטרה", "כך לפי הודעת עיריית נתניה". זה מותר ורצוי, גם כשהגוף צוטט אצלנו דרך כלי תקשורת.
- עובדות ציבוריות (תוצאות בחירות, חסימות כבישים, מזג אוויר, הודעות רשמיות, אירוע שקרה ברחוב) כותבים כדיווח שלנו, בלי קרדיט לכלי תקשורת.
- קרדיט לכלי תקשורת אחר רק כשבאמת צריך: סקופ בלעדי שאין לו אישור ממקור ראשוני, ראיון או ציטוט שהם השיגו, צילום או וידאו שלהם, או נתונים שהם הפיקו. אז שורה אחת קצרה בסוף הפסקה האחרונה בלבד, למשל "כפי שפורסם לראשונה ב...". אף פעם לא בכותרת, בכותרת המשנה או בנקודות.
- שדה basis: "official" כשהעובדות באות מגוף רשמי (גם אם הגיעו דרך כלי תקשורת שמצטט אותו), "public" כשזו עובדה ציבורית שכל אחד יכול לבדוק, "media_exclusive" כשהידיעה כולה נשענת על פרסום בלעדי של כלי תקשורת אחר (סקופ, ראיון, כתבת צבע, נתונים שהם הפיקו).
- אם המקור הוא רק כותרת של מבזק בלי פרטים, לסמן needsCheck=true.
- שדה kicker: שורה קצרה מאוד שמופיעה בצבע מעל הכותרת באתר, עד 5 מילים, עובדה מהידיעה ולא חזרה על הכותרת. למשל "חסימות עד 8 בנובמבר", "שני חשודים נעצרו", "צו בתוקף עד 1.11". בלי שם של כלי תקשורת. אם אין משהו טוב, להשאיר ריק.
- שדה closure: רק כשהידיעה עוסקת בחסימת כביש, סגירת רחוב או עבודות שמשנות את התנועה: place (איפה, קצר), what (מה בדיוק, משפט קצר), until (תאריך סיום בפורמט YYYY-MM-DD רק אם הוא כתוב במקור או מחושב ישירות ממנו, אחרת ריק), approx (true אם התאריך משוער, למשל "כשבועיים"). אחרת closure=null.
מדורים אפשריים: flash (מבזקים, חירום, תאונות, משטרה), city (עירייה, תשתיות, חינוך), realestate (תכנון ובנייה, נדל״ן), community (קהילה), sports (ספורט), leisure (תרבות ואירועים), sharon (יישובי השרון שאינם נתניה), tourism (חופים ותיירות).
אם הידיעה לא עוסקת בנתניה או ביישובי השרון (למשל פוליטיקה ארצית, והשם של יישוב הוא בעצם מילה רגילה), אל תכתוב ידיעה. החזר רק {"skip":true,"reason":"סיבה קצרה"}.
החזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"section":"","kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""],"places":[""],"basis":"official","closure":null,"needsCheck":false,"checkReason":""}`;

// media outlet names: the one list in the table hns_outlets (same check as hns-publish)
let OUTLET_RE: RegExp | null = null;
async function outlets() {
  const { data } = await sb.from('hns_outlets').select('name');
  const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = (data || []).map((r: Any) => String(r.name || '').trim()).filter(Boolean).map((n: string) => /^[\x00-\x7F]+$/.test(n)
    ? `(?<![A-Za-z0-9])${rx(n)}(?![A-Za-z0-9])` : `(?<![\u05D0-\u05EA])(?:[ובלמהשכ]{1,2}-?)?${rx(n)}(?![\u05D0-\u05EA])`);
  OUTLET_RE = parts.length ? new RegExp(parts.join('|'), 'i') : null;
}
const outletIn = (s: unknown) => (OUTLET_RE ? (String(s ?? '').match(OUTLET_RE)?.[0] || '') : '');
const LEAN_RE = /לפי (?:דיווח|פרסום|מבזק|הדיווח|הפרסום|המבזק)|כפי שדווח|כך דווח|כך לפי (?:דיווח|מבזק|פרסום)|דיווח שפורסם|מבזק שפורסם/;
const CREDIT_RE = /פורסמ\S* לראשונה|צילום|תמונה|וידאו|סרטון|בראיון ל/;
function voiceProblem(o: Any) {
  const arr = (a: unknown) => (Array.isArray(a) ? a : []).map((x) => String(x ?? '').trim()).filter(Boolean);
  const head = [o.title, o.dek, ...arr(o.keyPoints)].join('\n');
  const h = outletIn(head);
  if (h) return `שם של כלי תקשורת (${h}) בכותרת, בכותרת המשנה או בנקודות`;
  if (LEAN_RE.test(head)) return 'הכותרת נשענת על "לפי דיווח" במקום על עובדות';
  const body = arr(o.body);
  for (let i = 0; i < body.length; i++) {
    const last = i === body.length - 1;
    for (const sen of body[i].split(/(?<=[.!?])\s+/)) {
      const m = outletIn(sen);
      if (m && !(last && CREDIT_RE.test(sen))) return `שם של כלי תקשורת (${m}) בגוף הידיעה, לא כשורת קרדיט אחת בסוף`;
      if (LEAN_RE.test(sen) && !(last && m && CREDIT_RE.test(sen))) return 'גוף הידיעה נשען על "לפי דיווח" או "לפי פרסום"';
    }
  }
  return '';
}
const MEDIA_ONLY = 'מבוסס רק על פרסום בכלי תקשורת אחר';
const KIND = (s: Any) => s.role === 'tip' ? 'רמז לא רשמי' : s.trust === 'official' ? 'גוף רשמי' : 'כלי תקשורת';
const promptFor = (items: Any[], src: Any, places: string[]) => 'המקורות (מהישן לחדש):\n\n' + items.map((x, i) => `מקור ${i + 1}: ${src[x.source_id].name_he} (${KIND(src[x.source_id])})\nזמן: ${x.published_at || x.fetched_at}\nכותרת: ${x.title}\nתוכן: ${(x.body || '').slice(0, 1200)}`).join('\n\n') + `\n\nמקומות שזוהו: ${places.join(', ') || 'לא זוהה'}`;
// one call, and when the text fails the voice check one more call with the reason
async function compose(user: string, feedback = '', model = MODEL) {
  const first = await claude(feedback ? `${user}\n\nהערה: טיוטה קודמת נפסלה כי ${feedback}. כתוב מחדש לפי כל הכללים, כדיווח שלנו.` : user, model);
  let { out, usage } = first; let problem = voiceProblem(out); let retried = !!feedback;
  if (problem && !feedback) {
    const second = await claude(`${user}\n\nהערה: הטיוטה הקודמת נפסלה כי ${problem}. כתוב מחדש לפי כל הכללים, כדיווח שלנו.`, model);
    out = second.out; usage = { first: usage, second: second.usage }; problem = voiceProblem(out); retried = true;
  }
  return { out, usage, problem, retried };
}

async function claude(user: string, model = MODEL) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model, max_tokens: 2500, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(90000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new NoStory(`no json in answer${j.stop_reason === 'max_tokens' ? ' (cut)' : ''}: ${text.replace(/\s+/g, ' ').slice(0, 160)}`);
  let out: Any;
  try { out = JSON.parse(m[0]); } catch { throw new NoStory(`bad json in answer${j.stop_reason === 'max_tokens' ? ' (cut)' : ''}`); }
  if (out && out.skip) throw new NoStory(`not a local story: ${String(out.reason || '').slice(0, 160)}`);
  return { out, usage: j.usage };
}

const clean = (s: string) => String(s || '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').trim();
// card fields: a kicker of up to 5 words without an outlet name, and the road closure details
const kickerOf = (o: Any) => { const k = clean(o?.kicker || ''); return k && k.split(/\s+/).length <= 5 && !outletIn(k) ? k : null; };
const closureOf = (o: Any) => {
  const c = o?.closure; if (!c || typeof c !== 'object' || !c.place) return null;
  const until = /^\d{4}-\d{2}-\d{2}$/.test(String(c.until || '')) ? String(c.until) : '';
  return { place: clean(c.place), what: clean(c.what || ''), until, approx: !!c.approx };
};

// a draft that hns-publish could not publish (outlet name, "לפי דיווח"): written once more from its own source items
async function rewrite(ids: number[]) {
  await outlets();
  const { data: srcs } = await sb.from('hns_sources').select('id,name_he,role,trust');
  const src = Object.fromEntries((srcs || []).map((s: Any) => [s.id, s]));
  const dayStart = new Date(Date.parse(ilDay(new Date()) + 'T00:00:00+03:00')).toISOString();
  await config();
  let budget = dailyMax() + 10 - (await usedToday(dayStart)); // a small extra allowance for rewrites
  const res: Any[] = [];
  const { data: rows } = await sb.from('hns_stories').select('*').in('id', ids).in('state', ['draft', 'needs_check']);
  for (const st of rows || []) {
    if (/נכתב מחדש/.test(st.notes || '')) { res.push({ id: st.id, skipped: 'already rewritten' }); continue; }
    if (budget <= 0) { res.push({ id: st.id, skipped: 'daily budget' }); continue; }
    const { data: items } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at').in('id', st.item_ids || []).order('id');
    const its = (items || []).filter((x: Any) => src[x.source_id]);
    if (!its.length) { res.push({ id: st.id, skipped: 'no items' }); continue; }
    budget--;
    try {
      const old = { title: st.title, dek: st.dek, body: st.body, keyPoints: st.key_points };
      const { out, usage, problem } = await compose(promptFor(its, src, st.places || []), voiceProblem(old) || 'נכתבה בלי קול עצמאי');
      const basis = ['official', 'public', 'media_exclusive'].includes(out.basis) ? out.basis : st.basis;
      const mediaOnly = basis === 'media_exclusive' && !its.some((x: Any) => src[x.source_id].trust === 'official');
      const state = st.sensitivity === 'sensitive' || out.needsCheck || mediaOnly || st.state === 'needs_check' ? 'needs_check' : 'draft';
      const notes = [st.sensitivity === 'sensitive' ? 'ידיעה רגישה, רק באישור של יקיר' : '', mediaOnly ? MEDIA_ONLY : '', out.needsCheck ? (out.checkReason || 'צריך בדיקה') : '',
        'נכתב מחדש', problem ? `עדיין: ${problem}` : ''].filter(Boolean).join('. ');
      await sb.from('hns_stories').update({ title: clean(out.title), dek: clean(out.dek), body: (out.body || []).map(clean), key_points: (out.keyPoints || []).map(clean),
        kicker: kickerOf(out), closure: closureOf(out),
        basis, state, notes, usage: { previous: st.usage, rewrite: usage }, updated_at: new Date().toISOString(), tg_sent_at: state === 'needs_check' ? null : st.tg_sent_at }).eq('id', st.id).in('state', ['draft', 'needs_check']);
      res.push({ id: st.id, state, problem: problem || null });
    } catch (e) { res.push({ id: st.id, error: String((e as Error).message || e) }); }
  }
  return { res };
}

async function tick() {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data: srcs } = await sb.from('hns_sources').select('id,name_he,role,trust,local_only');
  const src = Object.fromEntries((srcs || []).map((s: Any) => [s.id, s]));
  // new local items, not yet in a story, from our sources (never the competitor), not the first backfill
  const { data: items } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,places,topic,sensitivity,urgent')
    .eq('is_local', true).eq('backfill', false).is('cluster_id', null).gte('fetched_at', since).order('id').limit(200);
  const fresh = (items || []).filter((x: Any) => src[x.source_id] && src[x.source_id].role !== 'competitor');
  if (!fresh.length) return { fresh: 0 };
  // stories of the last 12 hours, with the words of their items, to attach follow ups to the same story
  const { data: recent } = await sb.from('hns_stories').select('id,item_ids,state,created_at,notes,sensitivity,places,section').gte('created_at', since).order('id', { ascending: false }).limit(200);
  const rIds = [...new Set((recent || []).flatMap((s: Any) => s.item_ids || []))];
  const { data: rItems } = rIds.length ? await sb.from('hns_items').select('id,title,body,cluster_id').in('id', rIds) : { data: [] };
  const storyToks = new Map<number, Set<string>>();
  for (const it of rItems || []) { const s = storyToks.get(it.cluster_id) || new Set<string>(); for (const w of toks(`${it.title} ${it.body || ''}`)) s.add(w); storyToks.set(it.cluster_id, s); }
  // group the fresh items: into an existing story, or into new groups
  const groups: { story?: number; items: Any[]; tk: Set<string> }[] = [];
  for (const it of fresh) {
    const tk = toks(`${it.title} ${it.body || ''}`);
    let placed = false;
    for (const [sid, st] of storyToks) if (same(tk, st)) { groups.push({ story: sid, items: [it], tk }); placed = true; break; }
    if (placed) continue;
    const g = groups.find((g) => !g.story && same(tk, g.tk));
    if (g) { g.items.push(it); for (const w of tk) g.tk.add(w); } else groups.push({ items: [it], tk });
  }
  // AI calls used today
  const dayStart = new Date(Date.parse(ilDay(new Date()) + 'T00:00:00+03:00')).toISOString();
  await config();
  let budget = dailyMax() - (await usedToday(dayStart));
  const res: Any[] = [];
  if (!OUTLET_RE) await outlets();
  for (const g of groups) {
    const ids = g.items.map((x) => x.id);
    if (g.story) {
      // follow up item for a story we already have: attach it, mark the story for a look
      const st = (recent || []).find((s: Any) => s.id === g.story);
      await sb.from('hns_items').update({ cluster_id: g.story }).in('id', ids);
      const allIds = [...new Set([...(st?.item_ids || []), ...ids])];
      const corroborates = st && st.state === 'needs_check' && /רמז בלבד/.test(st.notes || '') && g.items.some((x) => src[x.source_id].role === 'source');
      if (!corroborates) {
        await sb.from('hns_stories').update({ item_ids: allIds, updated_at: new Date().toISOString(), ...(/^auto:|רמז/.test(st?.notes || '') ? {} : { notes: 'נוסף מקור חדש, כדאי לעדכן' }) }).eq('id', g.story);
        res.push({ story: g.story, attached: ids.length });
        continue;
      }
      // a tip confirmed by one of our sources: write the story now from all its items
      if (budget <= 0) { await sb.from('hns_stories').update({ item_ids: allIds, updated_at: new Date().toISOString(), notes: 'רמז בלבד, אומת במקור נוסף, מחכה לתקציב היומי' }).eq('id', g.story); res.push({ story: g.story, skipped: 'daily budget' }); continue; }
      budget--;
      const { data: all } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,places,topic,sensitivity').in('id', allIds).order('id');
      const its = (all || []).filter((x: Any) => src[x.source_id]);
      const sens = st.sensitivity === 'sensitive' || its.some((x: Any) => x.sensitivity === 'sensitive');
      const places = [...new Set([...(st.places || []), ...its.flatMap((x: Any) => x.places || [])])];
      const model = modelFor(sens, its.length);
      try {
        const { out, usage, problem, retried } = await compose(promptFor(its, src, places), '', model);
        const basis = ['official', 'public', 'media_exclusive'].includes(out.basis) ? out.basis : null;
        const mediaOnly = basis === 'media_exclusive' && !its.some((x: Any) => src[x.source_id].trust === 'official');
        const state = sens || out.needsCheck || mediaOnly ? 'needs_check' : 'draft';
        const sources = [...new Map(its.filter((x: Any) => src[x.source_id].role === 'source').map((x: Any) => [x.source_id, { id: x.source_id, name: src[x.source_id].name_he, url: x.url, trust: src[x.source_id].trust }])).values()];
        const notes = ['אומת: רמז ומקור נוסף', sens ? 'ידיעה רגישה, רק באישור של יקיר' : '', mediaOnly ? MEDIA_ONLY : '', out.needsCheck ? (out.checkReason || 'צריך בדיקה') : '', retried ? 'נכתב מחדש' : '', problem ? `עדיין: ${problem}` : ''].filter(Boolean).join('. ');
        await sb.from('hns_stories').update({ section: out.section || st.section, title: clean(out.title), dek: clean(out.dek), body: (out.body || []).map(clean), key_points: (out.keyPoints || []).map(clean),
          places: out.places?.length ? out.places : places, sources, sensitivity: sens ? 'sensitive' : 'normal', state, notes, basis, model, usage, kicker: kickerOf(out), closure: closureOf(out),
          item_ids: allIds, tg_sent_at: null, updated_at: new Date().toISOString() }).eq('id', g.story).eq('state', 'needs_check');
        res.push({ story: g.story, corroborated: true, state });
      } catch (e) {
        const msg = String((e as Error).message || e);
        await sb.from('hns_stories').update({ item_ids: allIds, updated_at: new Date().toISOString(), notes: `רמז בלבד, אומת אבל הכתיבה נכשלה: ${msg}`.slice(0, 300) }).eq('id', g.story);
        res.push({ story: g.story, error: msg });
      }
      continue;
    }
    const sensitive = g.items.some((x) => x.sensitivity === 'sensitive');
    const official = g.items.some((x) => src[x.source_id].role === 'source');
    const places = [...new Set(g.items.flatMap((x) => x.places || []))];
    const sources = [...new Map(g.items.map((x) => [x.source_id, { id: x.source_id, name: src[x.source_id].name_he, url: x.url, trust: src[x.source_id].trust }])).values()];
    const base = { item_ids: ids, places, sources, sensitivity: sensitive ? 'sensitive' : 'normal', section: g.items[0].topic };
    if (!official) {
      const { data: st } = await sb.from('hns_stories').insert({ ...base, title: g.items[0].title, state: 'needs_check', notes: 'רמז בלבד, צריך מקור רשמי או מקור נוסף' }).select('id').single();
      if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
      res.push({ story: st?.id, tip: true });
      continue;
    }
    // closed as not local, without spending a call, and the items are tied to it so they are never picked up again
    const close = async (note: string, model: string | null) => {
      const { data: st } = await sb.from('hns_stories').insert({ ...base, title: g.items[0].title, state: 'rejected', notes: note, model }).select('id').single();
      if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
      return st?.id;
    };
    if (notLocal(g.items, places, src)) { res.push({ story: await close('לא מקומי: שם היישוב הוא מילה רגילה בטקסט', null), notLocal: true }); continue; }
    if (budget <= 0) { res.push({ skipped: 'daily budget', ids }); continue; } // left for tomorrow's budget or a manual run
    budget--;
    const user = promptFor(g.items, src, places);
    const model = modelFor(sensitive, g.items.length);
    try {
      const { out, usage, problem, retried } = await compose(user, '', model);
      const isNetanya = places.some((p) => NETANYA_PLACES.has(p));
      const section = out.section || (isNetanya ? base.section : 'sharon');
      const basis = ['official', 'public', 'media_exclusive'].includes(out.basis) ? out.basis : null;
      const mediaOnly = basis === 'media_exclusive' && !g.items.some((x) => src[x.source_id].trust === 'official');
      const state = sensitive || out.needsCheck || mediaOnly ? 'needs_check' : 'draft';
      const notes = [sensitive ? 'ידיעה רגישה, רק באישור של יקיר' : '', mediaOnly ? MEDIA_ONLY : '', out.needsCheck ? (out.checkReason || 'צריך בדיקה') : '',
        retried ? 'נכתב מחדש' : '', problem ? `עדיין: ${problem}` : ''].filter(Boolean).join('. ') || null;
      const { data: st } = await sb.from('hns_stories').insert({
        ...base, section, title: clean(out.title), dek: clean(out.dek), body: (out.body || []).map(clean), key_points: (out.keyPoints || []).map(clean),
        places: out.places?.length ? out.places : places, state, notes, basis, model, usage, kicker: kickerOf(out), closure: closureOf(out),
      }).select('id').single();
      if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
      res.push({ story: st?.id, state });
    } catch (e) {
      const msg = String((e as Error).message || e);
      // a final answer with no story is closed once (and counts in the daily budget); a network or service error is tried again next round
      if (e instanceof NoStory) res.push({ story: await close(`הכתיבה לא החזירה ידיעה: ${msg}`.slice(0, 300), model), closed: msg });
      else res.push({ error: msg, ids });
    }
  }
  return { fresh: fresh.length, groups: groups.length, res };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick()) });
    if (b.action === 'rewrite') return J({ ok: true, ...(await rewrite((b.ids || []).map(Number).filter(Boolean))) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
