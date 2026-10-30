// hns-national (29.10.2026): national news on nws.co.il (section 'national', "חדשות ארציות").
// Yakir, 29.10.2026: "דברים כמו בחירות או מלחמה צריך להכנס גם לאתר, גם אם זה לא קשור רק לנתניה. זה ארצי וזה לכולם."
// The local engine (hns-collect, hns-write, hns-publish) keeps only Netanya and the Sharon, so this function covers the few national
// events that concern everyone: elections and the government that follows, war and security, home front instructions, and a national
// emergency. Nothing else national (politics of the day, opinion, gossip, economy, world news) is written.
// 29.10.2026 (Yakir approved): wider topics (household money, health, education, transport, weather), 25 a day, every 10 minutes,
//   and a closing "מה זה אומר לתושבי נתניה:" paragraph when there is a practical effect.
// Cron every 10 minutes. Per run at most ONE story:
//   1. items of the last 3 hours from national news feeds (already collected by hns-collect, is_local false, cluster_id null) whose
//      title matches the national topics, without opinion pieces, columns, podcasts or galleries;
//   2. grouped by event (shared words); a group needs at least 2 different outlets, or the Home Front Command's own channel;
//   3. a group that matches a national story of the last 6 hours is attached to it (its items get that story's id), not written again;
//   4. at most 1 national story every 10 minutes (25 before 29.10.2026) and at most MAX_DAY a day (Israel day);
//   5. written by Claude in our own words, strictly neutral (no opinions, both sides of a dispute, numbers with their time), then
//      published through hns-publish 'approve' (by 'national-auto'), which keeps every publishing guard (outlet names, dashes).
// POST (x-cron-secret): {action:'tick'} | {action:'tick', dry:true} (shows the groups, writes nothing)
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
// 29.10.2026 (Yakir approved): more national news, 15 to 25 a day, on matters that touch every family
const MAX_DAY = 25;
const GAP_MIN = 10;
// 30.10.2026: i24 (Yakir gave it as a national source) was collected but never read here
const NATIONAL_SRC = ['ynet_flash', 'ynet_news', 'walla_israel', 'maariv_news', 'mako_news', 'inn_news', 'kikar', 'srugim', 'haaretz_all', 'jdn', 'news08', 'hm_news', 'oref_tg',
  'walla_money', 'globes_markets', 'ice_news', 'i24_he_tg'];
// 29.10.2026: too few national stories (3 a day instead of 15 to 25): different outlets word the same event differently, so few
// events reached two outlets. An announcement of an official body (a ministry, Bank of Israel, the Knesset, the IDF, the rail...)
// reported by one of the large outlets is enough, after waiting 30 minutes for a second outlet to join the group.
const MAJOR_SRC = new Set(['ynet_flash', 'ynet_news', 'walla_israel', 'maariv_news', 'mako_news', 'haaretz_all', 'walla_money', 'globes_markets', 'inn_news', 'i24_he_tg']);
// 30.10.2026 (Yakir: "איך פספסנו את זה?" about the Revolutionary Guards attack on two tankers in Hormuz): war and security events
// (Iran, Hezbollah, the Houthis, Gaza, Hormuz) are worded so differently by each outlet that they rarely group, so one large outlet
// is enough for them too, after waiting 20 minutes for others to join the group.
const WAR_RE = /איראן|איראני|משמרות המהפכה|הורמוז|מכלית|מכליות|חות'?ים|חות׳ים|תימן|חיזבאללה|לבנון|חמאס|עזה|סוריה|ח'?אמנאי|גרעין|טיל|רקט|כטב"?ם|יירוט|יורט|תקיפ|תקף|פיגוע|מחבל|חטופ|הפסקת אש|מלחמה|המלחמה|פיקוד העורף|אזעק/;
const OFFICIAL_BODY_RE = /משרד (?:ה|ל)|בנק ישראל|רשות (?:ה|ל)|ועדת הבחירות|ביטוח לאומי|הממשלה (?:אישרה|החליטה)|הכנסת (?:אישרה|אישר)|אושר בקריאה|החלטת ממשלה|פיקוד העורף|השירות המטאורולוגי|רכבת ישראל|צה"ל|דובר צה|המשטרה|הלמ"ס|הלשכה המרכזית לסטטיסטיקה|ההסתדרות|מדד המחירים|הריבית/;
// 29.10.2026 (night, plan approved by Yakir): also housing (arnona, mortgages, rents, purchase tax), with the local angle paragraph.
// 29.10.2026: besides elections and security, decisions that touch every household (taxes, benefits, prices, Bank of Israel),
// health and education (strikes, school holidays), national transport (rail, strikes) and extreme weather
const TOPIC_RE = /ארנונה|משכנתא|משכנתאות|מחירי הדירות|מחירי הדיור|דירה בהנחה|מחיר למשתכן|שכר הדירה|שכר דירה|שוכרים|מס רכישה|בנק ישראל|הריבית|מדד המחירים|יוקר המחיה|התייקר|ייקור|העלאת (?:ה)?מחיר|מחיר (?:הדלק|הבנזין|החשמל|המים|הלחם|החלב|הגז)|מס הכנסה|מע"מ|נקודות זיכוי|רשות המסים|קצב(?:ה|ת|אות)|ביטוח לאומי|מענק|שכר המינימום|תקציב המדינה|חוק ההסדרים|הכנסת אישרה|אושר בקריאה|הממשלה אישרה|החלטת ממשלה|משרד הבריאות|משרד החינוך|שבית|שובת|עיצומים|לוח החופשות|חופשת (?:חנוכה|הפסח|הקיץ|סוכות)|שנת הלימודים|בגרות|חיסון|תחלוא|רכבת ישראל|קווי הרכבת|תחבורה ציבורית|משרד התחבורה|נתב"ג|רישיון נהיגה|סערה|שיטפו|הצפות|גשם כבד|שלג|שרב|עומס חום|השירות המטאורולוגי|פיגוע|מחבל|ועדת הבחירות|מנדט|ספירת (?:הקולות|המעטפות)|הקואליציה|הרכבת (?:ה)?ממשלה|הטלת התפקיד|הנשיא (?:הטיל|יטיל)|ממשלה חדשה|השבעת הכנסת|מלחמה|פיקוד העורף|אזעק|ירי (?:רקטות|טילים)|טילים|כטב"ם|כטב״ם|צה"ל תקף|צה״ל תקף|תקיפה (?:ב|נגד)|איראן|חיזבאללה|חמאס|חטופ|הפסקת אש|מבצע צבאי|מצב (?:מיוחד|חירום) בעורף|הנחיות (?:פיקוד )?העורף|רעידת אדמה|משמרות המהפכה|הורמוז|מכלית|מכליות|חות'ים|חות׳ים|החותים|תימן|ח'אמנאי|גרעין|יירוט|יורט|שיגור|לבנון|סוריה|עזה|רצועת עזה|יהודה ושומרון/;
const SKIP_RE = /\|\s*[^|]{2,40}$|רכילות|ריאליטי|האח הגדול|נוטה למות|דעה|טור אישי|פרשנות|פודקאסט|גלריה|צפו:|צפו ב|ראיון|הסקר|סקר:|ציוץ|הורוסקופ|מתכון|בידור|כוכב|זמר|שחקנית|עוקבים/;
const OFFICIAL_SRC = new Set(['oref_tg']);

const norm = (s: string) => s.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
const STOP = new Set(['היום', 'אתמול', 'הערב', 'הבוקר', 'לאחר', 'במהלך', 'אחרי', 'לפני', 'עדכון', 'דיווח', 'מבזק', 'בישראל', 'ישראל', 'הפוסט', 'הופיע', 'לראשונה', 'כעת', 'עכשיו', 'מול', 'נגד', 'גם', 'אבל', 'כי']);
const toks = (s: string) => new Set(norm(s).replace(/[^\p{L}\p{N}"\s%]/gu, ' ').split(/\s+/).map((w) => w.replace(/^"|"$/g, ''))
  .map((w) => (w.length > 4 && /^[ובלמהש]/.test(w) ? w.slice(1) : w)).filter((w) => w.length >= 3 && !STOP.has(w)));
const same = (a: Set<string>, b: Set<string>) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n >= 3 && n / Math.max(1, Math.min(a.size, b.size)) >= 0.3; };
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ilWhen = (iso: string) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const dayStartIl = () => {
  const d = ilDay(new Date()); const guess = Date.parse(`${d}T00:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return new Date(guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3).toISOString();
};

// the article text behind a short feed item (same approach as hns-write)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ENT: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', hellip: '...' };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? (() => { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; })() : (ENT[e.toLowerCase()] ?? m));
const txt = (h: string) => decode(h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
async function pageText(url: string) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    if (!r.ok) return '';
    let html = await r.text();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, ' ');
    const art = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
    const paras = [...art.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((m) => txt(m[1])).filter((p) => p.length >= 30 && !/cookie|עוגיות|הירשמו|שתפו|כל הזכויות|לחצו כאן/i.test(p));
    return [...new Set(paras)].join('\n').slice(0, 3000);
  } catch { return ''; }
}

const SYSTEM = `אתה עורך חדשות באתר "חדשות נתניה והשרון". המדור "חדשות ארציות" מסקר אירועים ארציים שנוגעים לכל משפחה בישראל: בחירות והרכבת הממשלה, מלחמה וביטחון, הנחיות פיקוד העורף ומצב חירום, החלטות ממשלה וכנסת שמשפיעות על הכיס (מסים, קצבאות, מחירים, שכר), בנק ישראל והריבית, בריאות וחינוך (שביתות, חופשות, חיסונים), תחבורה ארצית (רכבת, שביתות, כבישים ראשיים) ומזג אוויר קיצוני.
כללים מחייבים:
- רק עובדות שמופיעות במקורות. אסור להמציא שמות, מספרים, שעות או סיבות.
- ניטרליות מלאה: בלי דעה, בלי שבח או גנאי, בלי תארים טעונים, בלי "הכי". טענה של צד מייחסים לו ("לדברי..."), ואם יש צד שני במקורות מביאים גם אותו. לא קובעים מי צודק.
- מספרים (מנדטים, אחוזים, נפגעים) תמיד עם המועד שלהם, למשל "לפי ועדת הבחירות המרכזית, אחרי ספירת 91.7% מהקולות", כי הם משתנים.
- לא לכתוב שמות של נפגעים או הרוגים, אלא אם הותרו לפרסום במקור רשמי.
- לא להעתיק משפטים מהמקורות. ניסוח שלנו, עברית פשוטה וברורה.
- בכותרת, בכותרת המשנה, ב-kicker ובנקודות אסור שם של כלי תקשורת. לא לכתוב "לפי דיווח" או "כפי שדווח". מייחסים עובדות לגופים רשמיים (ועדת הבחירות המרכזית, צה"ל, פיקוד העורף, המשטרה, משרד ראש הממשלה, בית הנשיא).
- קרדיט לכלי תקשורת רק אם הידיעה כולה נשענת על פרסום בלעדי שלו: אז הפסקה האחרונה היא שורה נפרדת "קרדיט: <שם>".
- לא להשתמש בקו מפריד ארוך או בינוני.
- כשההחלטה או האירוע משפיעים על כל תושב (מס, ארנונה, קצבה, מחיר, ריבית, משכנתא, דיור ושכירות, שביתה, חופשה, הנחיה, תחבורה), הפסקה האחרונה מתחילה במילים "מה זה אומר לתושבי נתניה:" ומסבירה במשפט או שניים את ההשפעה המעשית, רק לפי מה שכתוב במקורות (מתי זה נכנס לתוקף, את מי זה מחייב, מה צריך לעשות). לא להמציא נתון מקומי. אם אין השפעה מעשית ברורה, לא להוסיף את הפסקה.
- מבנה: פסקה ראשונה עם מה קרה ומתי (יום ותאריך, שעה אם ידועה), אחר כך הפרטים והמצב הנוכחי, ומה הלאה אם כתוב. 2 עד 4 פסקאות.
- כותרת עד 80 תווים, עובדתית. כותרת משנה: משפט אחד עם פרט חשוב שלא בכותרת. kicker: עד 5 מילים עם עובדה שלא בכותרת, או ריק.
- מלחמה וביטחון כוללים גם את מה שקורה סביב המלחמה עם איראן ובחזיתות האחרות, גם כשזה מחוץ לישראל: תקיפה, פיצוץ או תפיסה של ספינות ומכליות (למשל במצר הורמוז), שיגורים של החות'ים, חיזבאללה, עזה, סוריה, צעדים ביטחוניים של ארה"ב באזור, ומשא ומתן או הצהרה של מנהיג (נשיא ארה"ב, מנהיגי איראן) על המלחמה או על הפסקתה. את כל אלה כותבים. הצהרה מייחסים לאומר ("לדברי טראמפ"), לא מציגים אותה כעובדה.
- דיווח של כלי תקשורת גדול על אירוע שקרה (תקיפה, פיצוץ, שיגור, הודעה של צבא או של גוף רשמי בחו"ל כמו משמרות המהפכה) מספיק לכתיבה. מייחסים לגוף שהודיע ("לפי משמרות המהפכה"), ואם אין אישור ממקור נוסף כותבים זאת במפורש.
- אם זה לא אירוע ארצי מהסוג הזה (למשל דעה, רכילות פוליטית, ויכוח בין פוליטיקאים בלי החלטה, ספורט, בידור, שוק ההון, חדשות מחו"ל שאינן קשורות למלחמה ואין להן השפעה ישירה על ישראל), החזר רק {"skip":true,"reason":"..."}.
- "hold" רק כשהמקור כולו הערכות ושמועות של גורמים בלי שם, בלי אירוע שקרה ובלי הצהרה של אדם או גוף מזוהה. אם יש אירוע או הצהרה מזוהה, כותבים.
- אם אין מספיק עובדות לשני משפטים ענייניים, החזר רק {"hold":true,"reason":"..."}.
החזר JSON בלבד: {"kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""],"basis":"official","sensitive":false}`;

async function claude(user: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: MODEL, max_tokens: 6000, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(90000),
  });
  const j = await r.json();
  if (r.ok) await sb.rpc('hns_ai_bump', { p_day: ilDay(new Date()), p_n: 1 });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no json (${j.stop_reason}): ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
  return { out: JSON.parse(m[0]), usage: j.usage };
}

async function tick(dry: boolean) {
  const now = Date.now();
  const { data: srcRows } = await sb.from('hns_sources').select('id,name_he,trust');
  const src = Object.fromEntries((srcRows || []).map((s: Any) => [s.id, s]));
  const { data: items } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,outlet')
    .in('source_id', NATIONAL_SRC).eq('is_local', false).is('cluster_id', null).gte('fetched_at', new Date(now - 3 * 3600e3).toISOString())
    .order('id', { ascending: false }).limit(800);
  const pool = (items || []).filter((x: Any) => TOPIC_RE.test(norm(x.title || '')) && !SKIP_RE.test(x.title || '')
    && (!x.published_at || now - Date.parse(x.published_at) < 3 * 3600e3));
  // group by event
  const groups: { items: Any[]; t: Set<string> }[] = [];
  for (const x of pool) {
    const t = toks(`${x.title} ${String(x.body || '').slice(0, 200)}`);
    const g = groups.find((g) => same(g.t, t));
    if (g) { g.items.push(x); for (const w of t) g.t.add(w); } else groups.push({ items: [x], t });
  }
  const solo = (g: { items: Any[] }) => g.items.some((x) => MAJOR_SRC.has(x.source_id) && (
    (OFFICIAL_BODY_RE.test(norm(x.title || '')) && now - Date.parse(x.published_at || x.fetched_at) >= 30 * 60e3)
    || (WAR_RE.test(norm(x.title || '')) && now - Date.parse(x.published_at || x.fetched_at) >= 20 * 60e3)));
  const ok = groups.filter((g) => new Set(g.items.map((x) => x.source_id)).size >= 2 || g.items.some((x) => OFFICIAL_SRC.has(x.source_id)) || solo(g))
    .sort((a, b) => new Set(b.items.map((x) => x.source_id)).size - new Set(a.items.map((x) => x.source_id)).size);
  // national stories of the last 6 hours: a matching group is attached, not written again
  const { data: recent } = await sb.from('hns_stories').select('id,title,dek,created_at,state').eq('section', 'national').gte('created_at', new Date(now - 6 * 3600e3).toISOString());
  const attach: Any[] = []; const fresh: typeof ok = [];
  for (const g of ok) {
    const hit = (recent || []).find((s: Any) => same(toks(`${s.title} ${s.dek || ''}`), g.t));
    if (hit) attach.push({ story: hit.id, ids: g.items.map((x) => x.id) }); else fresh.push(g);
  }
  if (dry) return { pool: pool.length, groups: ok.map((g) => ({ n: g.items.length, outlets: [...new Set(g.items.map((x) => x.source_id))], titles: g.items.slice(0, 3).map((x) => x.title) })), attach };
  for (const a of attach) await sb.from('hns_items').update({ cluster_id: a.story }).in('id', a.ids);
  if (!fresh.length) return { pool: pool.length, groups: ok.length, attached: attach.length, wrote: 0 };
  // pace and daily cap
  const { count: today } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).eq('section', 'national').gte('created_at', dayStartIl());
  if ((today || 0) >= MAX_DAY) return { capped: 'daily', today };
  const last = (recent || []).map((s: Any) => Date.parse(s.created_at)).sort((a: number, b: number) => b - a)[0] || 0;
  if (now - last < GAP_MIN * 60e3) return { capped: 'pace', next_in_min: Math.ceil((GAP_MIN * 60e3 - (now - last)) / 60e3) };
  const g = fresh[0];
  const its = g.items.slice(0, 6);
  for (const x of its.slice(0, 4)) if (x.url && String(x.body || '').length < 450) { const t = await pageText(x.url); if (t.length > String(x.body || '').length + 40) x.body = `${x.body || ''}\n${t}`; }
  const user = `היום: ${ilWhen(new Date().toISOString())} (שעון ישראל)\n\nהמקורות:\n\n` + its.map((x: Any, i: number) =>
    `מקור ${i + 1}: ${x.outlet || src[x.source_id]?.name_he || x.source_id} (${src[x.source_id]?.trust === 'official' ? 'גוף רשמי' : 'כלי תקשורת'})\nזמן הפרסום: ${ilWhen(x.published_at || x.fetched_at)}\nכותרת: ${x.title}\nתוכן: ${String(x.body || '').slice(0, 2500)}`).join('\n\n');
  const ids = g.items.map((x: Any) => x.id);
  const sources = [...new Map(its.map((x: Any) => [x.source_id, { id: x.source_id, name: x.outlet || src[x.source_id]?.name_he || x.source_id, url: x.url, trust: src[x.source_id]?.trust || 'media' }])).values()];
  let res: Any;
  try { res = await claude(user); } catch (e) { return { error: String((e as Error).message || e) }; }
  const out = res.out || {};
  if (out.skip || out.hold || !out.title || !Array.isArray(out.body) || !out.body.length) {
    // remembered as a closed group so it is not tried again
    const { data: st } = await sb.from('hns_stories').insert({ section: 'national', title: clean(its[0].title), state: 'rejected', item_ids: ids, sources, places: ['ישראל'],
      notes: `ארצי: ${out.skip ? 'לא נכתב' : 'ממתין לפרטים'}: ${String(out.reason || '').slice(0, 160)}`, model: MODEL, sensitivity: 'normal' }).select('id').single();
    if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
    return { wrote: 0, closed: st?.id, why: out.reason || 'no story' };
  }
  const basis = ['official', 'public', 'media_exclusive'].includes(out.basis) ? out.basis : 'public';
  const kicker = clean(out.kicker || '');
  const { data: st, error } = await sb.from('hns_stories').insert({
    section: 'national', places: ['ישראל'], item_ids: ids, sources, state: 'approved', sensitivity: 'normal', basis, model: MODEL, usage: res.usage,
    title: clean(out.title), dek: clean(out.dek), body: out.body.map(clean).filter(Boolean), key_points: (out.keyPoints || []).map(clean).filter(Boolean),
    kicker: kicker && kicker.split(/\s+/).length <= 5 ? kicker : null, notes: 'ארצי: נכתב אוטומטית (hns-national)',
  }).select('id').single();
  if (error || !st) return { error: error?.message || 'insert failed' };
  await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
  const pub = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-publish`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
    body: JSON.stringify({ action: 'approve', ids: [st.id], by: 'national-auto' }), signal: AbortSignal.timeout(60000),
  }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  return { wrote: st.id, title: clean(out.title), outlets: sources.length, publish: pub };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick(!!b.dry)) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
