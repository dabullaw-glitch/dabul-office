// hns-blog (29.10.2026): the blog of nws.co.il (section 'blog', "בלוג"): long practical guides that stay useful, for people who
// search Google (arnona discounts, resident parking, school registration, neighborhoods, history).
// Yakir approved (29.10.2026): 30 topics he approved one by one, two posts a day, written automatically ONLY from the facts of
// official sources (the municipality, kolzchut, gov.il, Wikipedia for history and neighborhoods), checked by a copy editor, with
// questions and answers at the end and links to the city guide ("שימושון עירוני").
// Topics live in the table docs, coll 'blog', id 'topic-NN': {n, title, status: 'approved'|'ready'|'written'|'failed',
//   sources: [{name, url, updated, text}], links: [{text, href}], story?, note?}. A topic is written only when it is 'ready' (its
//   source text was collected and checked by hand: many official pages block servers, so the text is stored with the topic).
// Cron every 30 minutes: {action:'tick'} writes at most one post per run, the first at or after 09:00 and the second at or after
// 17:00 Israel time, never more than two a day. {action:'tick', force:true} writes the next ready topic now (manual run).
// The post is inserted as 'approved' and published through hns-publish 'approve' (by 'blog-auto'), which keeps every guard.
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
const MODEL = 'claude-sonnet-5-5';
const PER_DAY = 2;
const SLOTS = [9, 17]; // Israel hours: post 1 from 09:00, post 2 from 17:00
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ilHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }).format(new Date()));
const dayStartIl = () => {
  const d = ilDay(new Date()); const guess = Date.parse(`${d}T00:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return new Date(guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3).toISOString();
};
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();

// the city guide pages a post may link to (sites/nws/src/data/city/guide.ts)
const GUIDE = `/guide/ (השימושון העירוני, כל הקטגוריות), /guide/service-centers/ (תשלומים ומוקדי שירות), /guide/post/ (סניפי דואר), /now/phones/ (טלפונים חיוניים), /guide/gov/ (משרדי ממשלה), /guide/banks/ (בנקים), /now/shabbat/ (זמני שבת), /now/pharmacy/ (בית מרקחת תורן), /guide/kupot/ (קופות חולים), /guide/hospitals/ (בתי חולים), /guide/transport/ (תחבורה ציבורית), /guide/ngo/ (עמותות), /guide/synagogues/ (בתי כנסת), /guide/schools/ (בתי ספר), /guide/matnasim/ (מתנ"סים), /guide/libraries/ (ספריות), /now/beaches/ (חופים), /guide/map/ (מפת העיר), /guide/neighborhoods/ (שכונות)`;

const SYSTEM = `אתה כותב את הבלוג של האתר "חדשות נתניה והשרון": מדריכים מעשיים לתושבי נתניה, בעברית פשוטה וברורה.
כללים מחייבים:
- רק עובדות שמופיעות במקורות שקיבלת. אסור להמציא מספר, סכום, תאריך, כתובת, טלפון, שם, שעה או תנאי. אם פרט חסר במקורות, לא כותבים אותו, או כותבים לבדוק מול הגורם הרשמי.
- לא להעתיק משפטים מהמקורות. ניסוח שלנו.
- טון ענייני, חם ומועיל. בלי המילה "הכי", בלי הבטחות, בלי שבח לעירייה או ביקורת עליה.
- לא להשתמש בקו מפריד ארוך או בינוני. רק פסיק, נקודה, נקודתיים או מקף רגיל.
- בלי ייעוץ משפטי או רפואי אישי. בנושא כזה כותבים מה הכללים לפי המקור, וממליצים לפנות לגורם המוסמך.
- שמות של כלי תקשורת אסורים.
מבנה הכתבה:
- כותרת עד 70 תווים, שעונה על מה שאנשים מחפשים (למשל "הנחה בארנונה בנתניה: מי זכאי ואיך מגישים בקשה").
- כותרת משנה: משפט אחד שאומר מה הקורא ימצא בכתבה.
- גוף: פסקת פתיחה קצרה עם התשובה העיקרית, ואחריה 3 עד 6 חלקים. כל חלק מתחיל בפסקה של כותרת ביניים בצורה "## כותרת". אפשר רשימות: כל שורה ברשימה מתחילה ב-"- " או ב-"1. " (כמה שורות באותה פסקה, מופרדות בירידת שורה). אורך כולל של 600 עד 1100 מילים, לפי מה שהמקורות מאפשרים. לא ממלאים במילים ריקות.
- קישורים פנימיים: כשמתאים, קישור אחד או שניים לעמודי השימושון העירוני בצורה [טקסט](/guide/...). העמודים הקיימים: ${GUIDE}. קישור חיצוני רק לכתובת שמופיעה במקורות, בצורה [טקסט](https://...).
- פסקה אחרונה: "המידע נכון ל<חודש> <שנה>, לפי <שמות המקורות הרשמיים>. לפני שמגישים בקשה כדאי לוודא את הפרטים מול <הגורם>." (למשל "המידע נכון לאוקטובר 2026", בלי מקף).
- לא לכתוב משפטים על תהליך הכתיבה ("במקורות שבדקנו", "בעמודים שעיינו בהם"). אם פרט חסר, כותבים פשוט שכדאי לברר אותו מול הגורם.
- faq: 3 עד 6 שאלות שאנשים באמת שואלים, ותשובה קצרה לכל אחת (משפט עד שלושה), רק מהמקורות.
- kicker: עד 4 מילים, למשל "מדריך לתושבים".
- keyPoints: 3 עד 5 נקודות קצרות עם העיקר.
אם במקורות אין מספיק עובדות לכתבה מועילה, החזר רק {"hold":true,"reason":"..."}.
החזר JSON בלבד: {"kicker":"","title":"","dek":"","body":["",""],"keyPoints":[""],"faq":[{"q":"","a":""}]}`;

const EDITOR = `אתה עורך המשנה של הבלוג של "חדשות נתניה והשרון". קיבלת כתבה ואת המקורות שלה. בדוק:
1. כל עובדה (מספר, סכום, תאריך, כתובת, טלפון, שעה, תנאי) מופיעה במקורות. עובדה שלא מופיעה היא בעיה חמורה.
2. הכותרת תואמת את התוכן ועונה על מה שאנשים מחפשים.
3. אין ייעוץ אישי, אין "הכי", אין קו מפריד ארוך או בינוני, אין שם של כלי תקשורת.
4. השאלות והתשובות נכונות לפי המקורות.
5. עברית תקינה וברורה.
החזר JSON בלבד: {"pass":true,"score":0,"hard":[""],"notes":[""]}. hard: רק בעיות חמורות (עובדה שלא במקורות, כותרת לא תואמת). pass=true רק אם hard ריק והציון לפחות 75.`;

async function claude(user: string, system: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(140000),
  });
  const j = await r.json();
  if (r.ok) await sb.rpc('hns_ai_bump', { p_day: ilDay(new Date()), p_n: 1 });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no json (${j.stop_reason})`);
  return { out: JSON.parse(m[0]), usage: j.usage };
}

const sourcesText = (t: Any) => (t.sources || []).map((s: Any, i: number) => `מקור ${i + 1}: ${s.name}\nכתובת: ${s.url}${s.updated ? `\nעודכן: ${s.updated}` : ''}\n${String(s.text || '').slice(0, 6000)}`).join('\n\n');
const todayHe = () => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

async function writeTopic(row: Any) {
  const t = row.data;
  const user = `היום: ${todayHe()}\nנושא הכתבה: ${t.title}\n${t.note ? `הערה לכותב: ${t.note}\n` : ''}\nהמקורות:\n\n${sourcesText(t)}`;
  let w = await claude(user, SYSTEM);
  if (w.out.hold) return { held: String(w.out.reason || '') };
  const story = (o: Any) => JSON.stringify({ title: o.title, dek: o.dek, body: o.body, faq: o.faq, keyPoints: o.keyPoints });
  let qa = (await claude(`הכתבה:\n${story(w.out)}\n\nהמקורות:\n${sourcesText(t)}`, EDITOR)).out;
  let rounds = 1;
  if (!qa.pass) {
    w = await claude(`${user}\n\nהערה: טיוטה קודמת נפסלה בבדיקת העורך: ${[...(qa.hard || []), ...(qa.notes || [])].join('; ')}. כתוב מחדש לפי כל הכללים.`, SYSTEM);
    if (w.out.hold) return { held: String(w.out.reason || '') };
    qa = (await claude(`הכתבה:\n${story(w.out)}\n\nהמקורות:\n${sourcesText(t)}`, EDITOR)).out; rounds = 2;
  }
  if (!qa.pass) return { failed: true, qa };
  const o = w.out;
  const faq = (Array.isArray(o.faq) ? o.faq : []).map((x: Any) => ({ q: clean(x?.q), a: clean(x?.a) })).filter((x: Any) => x.q && x.a).slice(0, 8);
  const kicker = clean(o.kicker || 'מדריך לתושבים');
  const { data: st, error } = await sb.from('hns_stories').insert({
    section: 'blog', places: ['נתניה'], item_ids: [], state: 'approved', sensitivity: 'normal', basis: 'official', model: MODEL, kind: 'news',
    title: clean(o.title), dek: clean(o.dek), body: (o.body || []).map(clean).filter(Boolean), key_points: (o.keyPoints || []).map(clean).filter(Boolean), faq,
    kicker: kicker.split(/\s+/).length <= 5 ? kicker : 'מדריך לתושבים',
    sources: (t.sources || []).map((s: Any, i: number) => ({ id: `blog${i + 1}`, name: s.name, url: s.url, trust: 'official' })),
    qa: { ...qa, rounds, at: new Date().toISOString() }, notes: `בלוג: נכתב אוטומטית (hns-blog), נושא ${t.n}`,
  }).select('id').single();
  if (error || !st) throw new Error(error?.message || 'insert failed');
  const pub = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-publish`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
    body: JSON.stringify({ action: 'approve', ids: [st.id], by: 'blog-auto' }), signal: AbortSignal.timeout(60000),
  }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  return { story: st.id, title: clean(o.title), qa: qa.score, publish: pub };
}

async function tick(force: boolean, only = 0) {
  if (!force) {
    const { count } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).eq('section', 'blog').gte('created_at', dayStartIl());
    const done = count || 0;
    if (done >= PER_DAY) return { capped: 'daily', done };
    if (ilHour() < SLOTS[done]) return { waiting: `slot ${SLOTS[done]}:00`, done };
  }
  const { data: rows } = await sb.from('docs').select('id,data').eq('coll', 'blog').eq('data->>status', 'ready');
  const list = (rows || []).filter((r: Any) => !only || Number(r.data.n) === only).sort((a: Any, b: Any) => Number(a.data.n) - Number(b.data.n));
  if (!list.length) return { idle: 'no ready topic' };
  const row = list[0];
  const merge = (patch: Any) => sb.rpc('docs_merge', { p_coll: 'blog', p_id: row.id, p_patch: patch });
  try {
    const r = await writeTopic(row);
    if ('story' in r) await merge({ status: 'written', story: r.story, writtenAt: new Date().toISOString() });
    else await merge({ status: 'failed', why: r, failedAt: new Date().toISOString() });
    return { topic: row.data.n, ...r };
  } catch (e) { return { topic: row.data.n, error: String((e as Error).message || e) }; }
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick(!!b.force, Number(b.n) || 0)) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
