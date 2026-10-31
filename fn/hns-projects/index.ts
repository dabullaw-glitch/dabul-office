// hns-projects (31.10.2026, Yakir approved ideas 1+2 for nws only, never the law office): the urban renewal compounds of Netanya
// and the nearby Sharon towns, for the section /projects/ on nws.co.il (חדשות נתניה והשרון).
//
// SOURCE: the open dataset "מתחמי התחדשות עירונית" of the Ministry of Housing on data.gov.il (resource f65a0daf..., updated weekly):
//   compound number, name, existing units, added units, total units, declaration date, plan number + link to the official plan
//   (mavat), units with permits, map link (govmap), track (taxation / authorities / not declared yet), year the plan took effect,
//   under construction yes/no, status. Nothing else is used: no developer names, no residents, no prices.
//
// What it does (POST with x-cron-secret):
//   {action:'tick'}   cron daily 08:10 Israel time.
//      1. reads the dataset for the towns below and compares every compound with the snapshot in docs coll 'nwsproj' (id = compound
//         number). A change in status, track, construction, units, permits, declaration date or plan year is added to the
//         compound's history; a compound that was not there before is "new". The first run is only the baseline (no news).
//      2. CHANGE NEWS: each changed compound gets one short news story (AI writes it from the data only; every number in the text must
//         appear in the data, otherwise a fixed wording is used). It goes into hns_stories as a normal 'draft' with notes
//         'hns-data projects ...', so hns-publish publishes it through the usual guards. hns_data_runs keeps it from being written twice.
//         More than MAX_CHANGES changed compounds in one run means the dataset itself was reshaped: no stories, only a note.
//      3. On Sundays: when at least 2 compounds changed in the last 7 days, one weekly roundup story.
//      4. INTRO TEXT: every compound has a short explanation written by AI from its data and the fixed glossary below (once, and again
//         when its status changes), at most MAX_INTROS per run.
//      5. writes docs nwslive 'projects' (all compounds, totals, glossary), which hns-feed passes to the site as live.projects.
//   {action:'launch', dry?}  the one-time opening story ("the urban renewal map of Netanya"), after the pages are live.
//   {action:'sync', dry?}    steps 1, 4 and 5 without stories (dry: return what would change, write nothing).
// BUDGET: the AI calls use hns_config 'ai_extra'.lead_model and stop (fixed wording, no new intros) when this month's cost in the
// table ai_cost plus 'untracked_usd' reaches 'extra_stop_usd' (Yakir's brake, 31.10.2026). Every call is priced into ai_cost.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const RES = 'f65a0daf-f737-49c5-9424-d378d52104f5';
const DATASET_URL = 'https://data.gov.il/dataset/urban_renewal';
// CBS codes: Netanya and the nearby Sharon towns that have compounds in the dataset
const TOWNS: Record<number, { he: string; slug: string }> = {
  7400: { he: 'נתניה', slug: 'netanya' }, 182: { he: 'אבן יהודה', slug: 'even-yehuda' }, 195: { he: 'קדימה צורן', slug: 'kadima-tzoran' },
  168: { he: 'כפר יונה', slug: 'kfar-yona' }, 154: { he: 'תל מונד', slug: 'tel-mond' },
};
const MAX_CHANGES = 8;
const MAX_INTROS = 12; // per run, written 6 at a time (the function has a time limit); the daily runs fill in the rest
const SITE = 'https://nws.co.il';

let S: Record<string, string> = {};
let CFG: Any = {};
let BRAKE = false;
async function setup() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
  const [{ data: a }, { data: x }] = await Promise.all([
    sb.from('hns_config').select('v').eq('k', 'ai').maybeSingle(), sb.from('hns_config').select('v').eq('k', 'ai_extra').maybeSingle()]);
  CFG = { ...(a?.v || {}), ...(x?.v || {}) };
  const { data: m } = await sb.rpc('ai_cost_month');
  BRAKE = CFG.projects === false || Number(m || 0) + Number(CFG.untracked_usd || 0) >= Number(CFG.extra_stop_usd || 65);
}
const model = () => String(CFG.lead_model || CFG.model || 'claude-sonnet-5-5');

const ilDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ilDow = () => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' }).format(new Date());
const clean = (s: string) => String(s ?? '').replace(/\s*[—–]\s*/g, ' - ').replace(/\s+/g, ' ').trim();
const num = (v: unknown) => { const n = Number(String(v ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null; };
const fmt = (n: number | null) => (n == null ? '' : n.toLocaleString('en-US'));

// ---------- the fixed glossary (shown on the site too) ----------
export const STATUS_TXT: Record<string, string> = {
  'תכנון ראשוני': 'שלב מוקדם: בודקים את המתחם ומכינים רעיון תכנוני. עדיין אין תוכנית שהוגשה לאישור.',
  'תכנון סטטוטורי': 'התוכנית בהליך אישור במוסדות התכנון (ועדה מקומית או מחוזית). היא עדיין לא אושרה.',
  'תכנית מאושרת לפני מימוש': 'התוכנית אושרה, אבל עדיין לא ניתנו היתרי בנייה והבנייה לא התחילה.',
  'תכנית מאושרת - אחרי רישוי': 'התוכנית אושרה וניתנו היתרי בנייה, לכל המתחם או לחלק ממנו.',
  'תכנית מאושרת במימוש': 'התוכנית אושרה והבנייה בפועל כבר התחילה.',
};
export const TRACK_TXT: Record<string, string> = {
  'מיסוי': 'מסלול מיסוי: יזם מוביל את הפרויקט, והכרזת המתחם נותנת לעסקה הטבות מס שקבע החוק.',
  'רשויות': 'מסלול רשויות: הרשות המקומית מובילה את התכנון של המתחם, בליווי ובמימון של המדינה.',
  'טרם הוכרז': 'המתחם עדיין לא הוכרז רשמית כמתחם התחדשות עירונית.',
};
const statusKey = (s: string) => clean(s).replace(/\s*-\s*/g, ' - ');

// ---------- dataset ----------
type P = {
  id: string; town: string; townSlug: string; slug: string; name: string; exist: number | null; add: number | null; total: number | null;
  permits: number | null; declared: string; validYear: number | null; track: string; inExec: boolean; status: string; plan: string;
  planUrl: string; mapUrl: string;
};
async function fetchAll(): Promise<P[]> {
  const f = encodeURIComponent(JSON.stringify({ SemelYeshuv: Object.keys(TOWNS).map(Number) }));
  const r = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=${RES}&limit=500&filters=${f}`, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'nws.co.il projects' } });
  if (!r.ok) throw new Error(`data.gov.il ${r.status}`);
  const j = await r.json();
  const recs: Any[] = j?.result?.records || [];
  if (!recs.length) throw new Error('no records');
  return recs.map((x) => {
    const t = TOWNS[Number(x.SemelYeshuv)] || { he: clean(x.Yeshuv), slug: 'sharon' };
    const id = String(x.MisparMitham).trim();
    const name = clean(x.ShemMitcham).replace(new RegExp(`\\s*${t.he.replace(/\s+/g, '\\s*')}\\s*$`), '').replace(/\s+נתניה$/, '').trim() || clean(x.ShemMitcham);
    const url = (u: string) => (/^https:\/\//.test(clean(u)) ? clean(u) : '');
    return {
      id, town: t.he, townSlug: t.slug, slug: `${t.slug}-${id}`, name,
      exist: num(x.YachadKayam), add: num(x.YachadTosafti), total: num(x.YachadMutza), permits: num(x.SachHeterim),
      declared: clean(x.TaarichHachraza), validYear: num(x.ShnatMatanTokef), track: clean(x.Maslul) || '', inExec: clean(x.Bebitzua) === 'כן',
      status: statusKey(x.Status), plan: clean(x.MisparTochnit), planUrl: url(x.KishurLatar), mapUrl: url(x.KishurLaMapa),
    };
  });
}

// fields whose change is news, with the Hebrew label used in the history
const WATCH: [keyof P, string][] = [['status', 'שלב'], ['track', 'מסלול'], ['inExec', 'בביצוע'], ['add', 'דירות נוספות'], ['total', 'סך הדירות בתוכנית'],
  ['permits', 'דירות עם היתר'], ['declared', 'תאריך הכרזה'], ['validYear', 'שנת מתן תוקף'], ['plan', 'מספר תוכנית']];
const show = (k: keyof P, v: unknown) => (k === 'inExec' ? (v ? 'כן' : 'לא') : v == null || v === '' ? 'לא צוין' : typeof v === 'number' ? fmt(v) : String(v));

// ---------- AI ----------
async function claude(system: string, user: string, maxTok = 1500) {
  const h: Record<string, string> = { 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (S.ANTHROPIC_WORKSPACE_ID) h['anthropic-workspace-id'] = S.ANTHROPIC_WORKSPACE_ID;
  const m = model();
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: JSON.stringify({ model: m, max_tokens: maxTok, system, messages: [{ role: 'user', content: user }] }), signal: AbortSignal.timeout(90000) });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
  const u = j.usage || {};
  await sb.rpc('ai_cost_add', { p_fn: 'hns-projects', p_model: m, p_in: Number(u.input_tokens || 0) + Number(u.cache_read_input_tokens || 0) + Number(u.cache_creation_input_tokens || 0), p_out: Number(u.output_tokens || 0) }).then(() => null, () => null);
  await sb.rpc('hns_ai_bump', { p_day: ilDay(), p_n: 1 }).then(() => null, () => null);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const mm = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!mm) throw new Error('no json');
  return JSON.parse(mm[0]);
}
// every number in the written text must come from the data given to the writer (dates and years included)
function numbersOk(text: string, facts: string) {
  const have = new Set((facts.replace(/,(?=\d{3})/g, '').match(/\d+/g) || []));
  return (text.replace(/,(?=\d{3})/g, '').match(/\d+/g) || []).every((n) => have.has(n));
}
// words the site never prints in these texts (Bar rules spirit and our style): superlatives, "expert", lawyers
const BAD = /(^|[\s"(])הכי([\s,.)]|$)|מומחה|עו"ד|עורך דין|עורכי דין/;
const RULES = `כללים מחייבים:
- כותבים רק מהעובדות שקיבלת. אסור להוסיף פרט שלא כתוב: לא שמות של יזמים, לא מועדים, לא מחירים, לא תחזיות, לא מספרים אחרים.
- כל מספר בטקסט חייב להופיע בנתונים כפי שהוא.
- עברית פשוטה וברורה, טון ענייני. בלי "הכי", בלי שבח, בלי דעה.
- בלי קו מפריד ארוך או בינוני. רק פסיק, נקודה או מקף רגיל.
- לא לכתוב שם של משרד עורכי דין או נותן שירות כלשהו, ולא להמליץ לפנות לגורם כלשהו.
- מקור הנתונים הוא המאגר הפתוח של משרד הבינוי והשיכון.`;

function factsOf(p: P) {
  return [`שם המתחם: ${p.name}`, `יישוב: ${p.town}`, `מספר מתחם: ${p.id}`, `דירות קיימות: ${show('exist', p.exist)}`, `דירות נוספות: ${show('add', p.add)}`,
    `סך הדירות בתוכנית: ${show('total', p.total)}`, `דירות עם היתר בנייה: ${show('permits', p.permits)}`, `תאריך הכרזה: ${show('declared', p.declared)}`,
    `שנת מתן תוקף לתוכנית: ${show('validYear', p.validYear)}`, `מסלול: ${p.track || 'לא צוין'}`, `בביצוע: ${p.inExec ? 'כן' : 'לא'}`,
    `שלב: ${p.status}`, `פירוש השלב: ${STATUS_TXT[p.status] || 'לא צוין'}`, p.track && TRACK_TXT[p.track] ? `פירוש המסלול: ${TRACK_TXT[p.track]}` : '',
    p.plan ? `מספר תוכנית: ${p.plan}` : ''].filter(Boolean).join('\n');
}

async function writeIntro(p: P) {
  const facts = factsOf(p);
  const sys = `אתה כותב באתר החדשות המקומי "חדשות נתניה והשרון" עמוד מידע על מתחם התחדשות עירונית (פינוי בינוי).\n${RULES}`;
  const user = `${facts}\n\nכתוב שתי פסקאות קצרות (עד 70 מילים כל אחת) לתושבים:\n1. מה המתחם: איפה, כמה דירות יש היום וכמה יהיו לפי התוכנית.\n2. איפה הוא עומד עכשיו ומה המשמעות של השלב והמסלול, בשפה פשוטה.\nהחזר JSON בלבד: {"p":["פסקה 1","פסקה 2"]}`;
  const o = await claude(sys, user, 900);
  const paras = (o.p || []).map(clean).filter(Boolean).slice(0, 2);
  if (paras.length < 1 || !numbersOk(paras.join(' '), facts) || BAD.test(paras.join(' '))) throw new Error('intro failed checks');
  return paras;
}

// fixed wording, used when the AI is off (brake) or its text failed the checks
function fixedIntro(p: P) {
  const units = p.exist != null && p.total != null ? `במתחם ${p.exist} דירות קיימות, ולפי התוכנית יהיו בו ${fmt(p.total)} דירות${p.add != null ? ` (${fmt(p.add)} דירות נוספות)` : ''}.` : '';
  return [clean(`מתחם ${p.name} ב${p.town} הוא מתחם התחדשות עירונית שמופיע במאגר של משרד הבינוי והשיכון. ${units}`),
    clean(`השלב לפי המאגר: ${p.status}. ${STATUS_TXT[p.status] || ''} ${p.track && TRACK_TXT[p.track] ? TRACK_TXT[p.track] : ''}`)];
}

async function changeStory(p: P, ch: Any[], isNew: boolean) {
  const what = isNew ? 'המתחם נוסף עכשיו למאגר המתחמים המוכרזים.' : ch.map((c) => `${c.label}: היה "${c.from}", עכשיו "${c.to}"`).join('\n');
  const facts = `${factsOf(p)}\n\nמה השתנה במאגר השבוע:\n${what}\nתאריך היום: ${ilDay().split('-').reverse().join('.')}`;
  const url = `${SITE}/projects/${p.slug}/`;
  let out: Any = null;
  if (!BRAKE) {
    try {
      const sys = `אתה עורך חדשות באתר "חדשות נתניה והשרון". כותבים ידיעה קצרה על עדכון במאגר הרשמי של מתחמי ההתחדשות העירונית.\n${RULES}`;
      const o = await claude(sys, `${facts}\n\nכתוב ידיעה קצרה: כותרת (עד 80 תווים, המקום והשינוי), כותרת משנה (משפט אחד), kicker (עד 4 מילים), 2-3 פסקאות (מה השתנה, מה המשמעות של השלב החדש, הנתונים של המתחם), ו-2-3 נקודות עיקריות.\nהחזר JSON בלבד: {"title":"","dek":"","kicker":"","body":[""],"keyPoints":[""]}`);
      const all = [o.title, o.dek, o.kicker, ...(o.body || []), ...(o.keyPoints || [])].join(' ');
      if (o.title && (o.body || []).length && numbersOk(all, facts) && !BAD.test(all)) out = o;
    } catch { /* fixed wording below */ }
  }
  if (!out) {
    out = isNew
      ? { title: `מתחם התחדשות עירונית חדש במאגר: ${p.name}, ${p.town}`, dek: `לפי התוכנית ${fmt(p.total)} דירות במקום ${fmt(p.exist)} דירות קיימות`, kicker: 'התחדשות עירונית', body: fixedIntro(p), keyPoints: [`שלב: ${p.status}`] }
      : { title: `עדכון במתחם ההתחדשות ${p.name} ב${p.town}`, dek: ch.map((c) => `${c.label}: ${c.to}`).join(', '), kicker: 'התחדשות עירונית', body: [`במאגר הרשמי של משרד הבינוי והשיכון עודכנו פרטי מתחם ${p.name} ב${p.town}. ${ch.map((c) => `${c.label} השתנה מ"${c.from}" ל"${c.to}".`).join(' ')}`, ...fixedIntro(p).slice(1)], keyPoints: ch.map((c) => `${c.label}: ${c.to}`) };
  }
  out.body = [...out.body.map(clean), `כל הפרטים על המתחם, כולל קישור לתוכנית הרשמית ולמפה, בעמוד המתחם באתר: ${url}`];
  return {
    section: 'realestate', kicker: clean(out.kicker || 'התחדשות עירונית').split(/\s+/).slice(0, 5).join(' '), title: clean(out.title).slice(0, 110), dek: clean(out.dek || ''),
    body: out.body, key_points: (out.keyPoints || []).map(clean).filter(Boolean).slice(0, 4), places: [p.town],
    sources: [{ id: 'moch_ur', name: 'משרד הבינוי והשיכון - מאגר מתחמי התחדשות עירונית', url: DATASET_URL, trust: 'official' }],
  };
}

async function saveStory(key: string, story: Any, detail: Any) {
  const { data: d } = await sb.from('hns_data_runs').select('id').eq('kind', 'projects').eq('key', key).maybeSingle();
  if (d) return { skipped: 'already done', key };
  const row = { ...story, sensitivity: 'normal', state: 'draft', kind: 'news', basis: 'official', item_ids: [], notes: `hns-data projects ${key}` };
  const { data, error } = await sb.from('hns_stories').insert(row).select('id').single();
  if (error) throw new Error('db: ' + error.message);
  await sb.from('hns_data_runs').insert({ kind: 'projects', key, story_id: data.id, detail });
  return { story_id: data.id, title: row.title };
}

// ---------- the run ----------
async function run(opts: { stories: boolean; dry?: boolean }) {
  const list = await fetchAll();
  const { data: rows } = await sb.from('docs').select('id,data').eq('coll', 'nwsproj');
  const prev = new Map<string, Any>((rows || []).map((r: Any) => [r.id, r.data]));
  const baseline = prev.size === 0;
  const today = ilDay();
  const changed: { p: P; ch: Any[]; isNew: boolean }[] = [];
  const docs: Map<string, Any> = new Map();
  let intros = 0; const errors: string[] = [];
  for (const p of list) {
    const old = prev.get(p.id);
    const ch: Any[] = [];
    if (old?.cur) for (const [k, label] of WATCH) {
      const a = old.cur[k], b = p[k];
      if (String(a ?? '') !== String(b ?? '')) ch.push({ field: k, label, from: show(k, a), to: show(k, b), date: today });
    }
    const isNew = !old && !baseline;
    if (ch.length || isNew) changed.push({ p, ch, isNew });
    const history = [...(old?.history || []), ...ch].slice(-30);
    const intro: string[] = old?.intro?.length ? old.intro : fixedIntro(p);
    const introFor = old?.introFor || '';
    docs.set(p.id, { cur: p, firstSeen: old?.firstSeen || today, lastSeen: today, history, intro, introFor, gone: false });
  }
  // compounds that left the dataset are kept and marked, never deleted
  for (const [id, d] of prev) if (!docs.has(id) && !d.gone) docs.set(id, { ...d, gone: true, goneOn: today });
  if (opts.dry) return { dry: true, baseline, count: list.length, changed: changed.map((c) => ({ id: c.p.id, name: c.p.name, isNew: c.isNew, ch: c.ch })) };
  // AI intros: a compound with no AI intro yet, or whose status changed since its intro was written
  const need = [...docs.values()].filter((d) => !d.gone && d.introFor !== d.cur.status).slice(0, BRAKE ? 0 : MAX_INTROS);
  for (let i = 0; i < need.length; i += 6) {
    await Promise.all(need.slice(i, i + 6).map(async (d) => {
      try { d.intro = await writeIntro(d.cur); d.introFor = d.cur.status; intros++; } catch (e) { errors.push(`${d.cur.id}: ${(e as Error).message}`); }
    }));
  }

  for (const [id, d] of docs) await sb.rpc('docs_merge', { p_coll: 'nwsproj', p_id: id, p_patch: d });

  const stories: Any[] = [];
  if (opts.stories && !baseline) {
    if (changed.length > MAX_CHANGES) stories.push({ note: `too many changes (${changed.length}), dataset reshaped? no stories` });
    else for (const c of changed) {
      const key = c.isNew ? `new:${c.p.id}` : `chg:${c.p.id}:${c.ch.map((x) => `${x.field}=${x.to}`).join('|')}`;
      try { stories.push(await saveStory(key.slice(0, 300), await changeStory(c.p, c.ch, c.isNew), { id: c.p.id, ch: c.ch })); } catch (e) { stories.push({ id: c.p.id, error: (e as Error).message }); }
    }
    if (ilDow() === 'Sun') { try { stories.push(await weekly(docs)); } catch (e) { stories.push({ weekly: (e as Error).message }); } }
  }
  await writeLive(docs);
  return { baseline, count: list.length, changed: changed.length, intros, errors: errors.slice(0, 10), stories, brake: BRAKE };
}

async function weekly(docs: Map<string, Any>) {
  const since = ilDay(new Date(Date.now() - 7 * 864e5));
  const moved = [...docs.values()].filter((d) => !d.gone && (d.history || []).some((h: Any) => h.date > since));
  if (moved.length < 2) return { weekly: 'fewer than 2 changes' };
  const lines = moved.map((d) => `${d.cur.name} (${d.cur.town}): ${(d.history || []).filter((h: Any) => h.date > since).map((h: Any) => `${h.label} ${h.to}`).join(', ')}`);
  const story = {
    section: 'realestate', kicker: 'סיכום שבועי', title: `מה זז השבוע בהתחדשות העירונית בנתניה ובשרון: ${moved.length} מתחמים עודכנו`,
    dek: 'העדכונים השבועיים במאגר הרשמי של מתחמי פינוי בינוי', body: [`השבוע עודכנו במאגר של משרד הבינוי והשיכון ${moved.length} מתחמים בנתניה ובערים הסמוכות.`, ...lines, `הרשימה המלאה של המתחמים, עם הנתונים והקישורים לתוכניות: ${SITE}/projects/`],
    key_points: lines.slice(0, 4), places: [...new Set(moved.map((d) => d.cur.town))],
    sources: [{ id: 'moch_ur', name: 'משרד הבינוי והשיכון - מאגר מתחמי התחדשות עירונית', url: DATASET_URL, trust: 'official' }],
  };
  return await saveStory(`week:${ilDay()}`, story, { ids: moved.map((d) => d.cur.id) });
}

async function writeLive(docs: Map<string, Any>) {
  const items = [...docs.values()].filter((d) => !d.gone).map((d) => ({ ...d.cur, intro: d.intro, firstSeen: d.firstSeen, history: (d.history || []).slice(-10) }))
    .sort((a, b) => (a.town === b.town ? (b.total || 0) - (a.total || 0) : a.town === 'נתניה' ? -1 : b.town === 'נתניה' ? 1 : a.town.localeCompare(b.town, 'he')));
  const sum = (arr: Any[], k: string) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
  const towns = Object.values(TOWNS).map((t) => { const a = items.filter((i) => i.town === t.he); return { he: t.he, slug: t.slug, n: a.length, exist: sum(a, 'exist'), total: sum(a, 'total'), add: sum(a, 'add') }; }).filter((t) => t.n);
  const byStatus: Record<string, number> = {};
  items.filter((i) => i.town === 'נתניה').forEach((i) => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
  await sb.rpc('docs_merge', { p_coll: 'nwslive', p_id: 'projects', p_patch: { updated: new Date().toISOString(), sourceUrl: DATASET_URL, items, towns, byStatus, statusTxt: STATUS_TXT, trackTxt: TRACK_TXT } });
}

async function launch(dry: boolean) {
  const { data } = await sb.from('docs').select('data').eq('coll', 'nwslive').eq('id', 'projects').maybeSingle();
  const L: Any = data?.data; if (!L?.items?.length) throw new Error('run sync first');
  const net = L.items.filter((i: Any) => i.town === 'נתניה');
  const t = L.towns.find((x: Any) => x.he === 'נתניה');
  const top = [...net].sort((a: Any, b: Any) => (b.total || 0) - (a.total || 0)).slice(0, 3);
  const exec = net.filter((i: Any) => i.inExec).length;
  const st = Object.entries(L.byStatus).map(([k, v]) => `${k}: ${v}`).join('\n');
  const facts = `מספר המתחמים בנתניה במאגר: ${net.length}\nדירות קיימות במתחמים: ${t.exist}\nסך הדירות לפי התוכניות: ${t.total}\nדירות נוספות: ${t.add}\nמתחמים בביצוע: ${exec}\nלפי שלב:\n${st}\nשלושת המתחמים הגדולים לפי סך הדירות:\n${top.map((i: Any) => `${i.name}: ${i.total} דירות, שלב ${i.status}`).join('\n')}\nערים סמוכות: ${L.towns.filter((x: Any) => x.he !== 'נתניה').map((x: Any) => `${x.he} ${x.n}`).join(', ')}`;
  let o: Any = null;
  if (!BRAKE) {
    const sys = `אתה עורך חדשות באתר "חדשות נתניה והשרון". כותבים כתבת נתונים על מפת ההתחדשות העירונית בנתניה, לפי המאגר הרשמי של משרד הבינוי והשיכון.\n${RULES}`;
    try {
      o = await claude(sys, `${facts}\n\nכתוב כתבת נתונים: כותרת (עד 80 תווים), כותרת משנה, kicker (עד 4 מילים), 4-5 פסקאות (התמונה הכללית, איך המתחמים מתחלקים לפי שלבים, המתחמים הגדולים, הערים הסמוכות, מה המשמעות לתושבים), ו-3 נקודות עיקריות.\nהחזר JSON בלבד: {"title":"","dek":"","kicker":"","body":[""],"keyPoints":[""]}`, 2500);
      const all = [o.title, o.dek, o.kicker, ...(o.body || []), ...(o.keyPoints || [])].join(' ');
      if (!numbersOk(all, facts) || BAD.test(all)) o = null;
    } catch { o = null; }
  }
  if (!o) throw new Error('launch text failed the checks, try again');
  const story = {
    section: 'realestate', kicker: clean(o.kicker || 'התחדשות עירונית'), title: clean(o.title), dek: clean(o.dek),
    body: [...o.body.map(clean), `הרשימה המלאה של כל המתחמים, עם הנתונים, השלב, הקישור לתוכנית הרשמית ולמפה, נמצאת במדור הפרויקטים באתר: ${SITE}/projects/`],
    key_points: (o.keyPoints || []).map(clean).slice(0, 4), places: ['נתניה', ...L.towns.filter((x: Any) => x.he !== 'נתניה').map((x: Any) => x.he)],
    sources: [{ id: 'moch_ur', name: 'משרד הבינוי והשיכון - מאגר מתחמי התחדשות עירונית', url: DATASET_URL, trust: 'official' }],
  };
  if (dry) return { dry: true, story };
  return await saveStory('launch', story, { n: net.length });
}

Deno.serve(async (req) => {
  await setup();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await run({ stories: true })) });
    if (b.action === 'sync') return J({ ok: true, ...(await run({ stories: false, dry: !!b.dry })) });
    if (b.action === 'launch') return J({ ok: true, ...(await launch(!!b.dry)) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
