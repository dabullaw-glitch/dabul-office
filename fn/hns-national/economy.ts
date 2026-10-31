// economy module of hns-national (31.10.2026, Yakir approved 21:45; the project has no room for another edge function, so this
// runs inside hns-national with the actions 'econ', 'econ_dry' and 'econ_live'): the "כלכלה וכסף" section of nws.co.il (section 'economy'): economy, household
// money, investments and crypto, 8 to 10 stories a day, plus the live market strip at the top of the section.
//
// STORIES ({action:'tick'}, cron every 15 minutes, 07:00 to 23:00 Israel time). Per run at most ONE story:
//   1. items of the last 8 hours from the economy feeds (collected by hns-collect, is_local false, cluster_id null): ynet כלכלה,
//      דה מרקר, גלובס, כלכליסט and ביזפורטל (Google News), וואלה כסף, ice, and for crypto CoinDesk, Cointelegraph, Decrypt and a
//      Hebrew Google News search; titles must match the economy topics, without opinion, columns, podcasts, gossip or ads;
//   2. grouped by event (shared words). A group needs at least 2 different outlets, or one large outlet reporting an official
//      body (בנק ישראל, הלמ"ס, רשות המסים, רשות ניירות ערך, הבורסה, האוצר, הממונה על שוק ההון...) after 30 minutes;
//   3. a group that matches a national or economy story of the last 12 hours is attached to it, not written again;
//   4. at most MAX_DAY stories a Israel day (3 when the monthly AI brake is on), at least GAP_MIN minutes apart;
//   5. written by Claude in our own words, neutral, with a closing "מה זה אומר לכם:" paragraph when there is a practical effect.
//      Investments and crypto are NEWS ONLY: no buy/sell advice (a draft with advice words is dropped), and the line
//      "המידע אינו ייעוץ השקעות." is added at the end. Published through hns-publish 'approve' (by 'economy-auto'), which keeps
//      every publishing guard. The sub-topic is kept in extras.econ (economy | money | invest | crypto) for the site's filter.
// LIVE DATA ({action:'live'}, cron hourly): Bank of Israel interest rate and the official USD and EUR rates (Bank of Israel SDMX
//   open data), Bitcoin and Ethereum prices (CoinGecko free API) and the TA-35 index (Yahoo Finance chart, best effort, dropped
//   when it fails). Written to docs coll 'nwslive' id 'markets' (docs_merge), which hns-feed passes to the site as live.markets.
//   A value that fails keeps its last good value with its own time.
// Every Anthropic call is priced into the table ai_cost (fn 'hns-economy'). POST hns-national (x-cron-secret): {action:'econ'} |
//   {action:'econ_dry'} | {action:'econ_live'}
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let S: Record<string, string> = {};

const MODEL = 'claude-sonnet-5-5';
const MAX_DAY = 10;
const MAX_DAY_BRAKE = 3;
const GAP_MIN = 50;
const ECON_SRC = ['ynet_economy', 'themarker_news', 'globes_economy', 'globes_markets', 'gn_calcalist', 'gn_bizportal', 'walla_money', 'ice_news', 'gn_crypto', 'coindesk', 'cointelegraph', 'decrypt'];
const CRYPTO_SRC = new Set(['coindesk', 'cointelegraph', 'decrypt', 'gn_crypto']);
const MAJOR_SRC = new Set(['ynet_economy', 'themarker_news', 'globes_economy', 'globes_markets', 'gn_calcalist', 'gn_bizportal', 'walla_money']);

const norm = (s: string) => s.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
// economy, household money and investments (Hebrew titles)
const TOPIC_RE = /בנק ישראל|הריבית|ריבית|אינפלציה|מדד המחירים|יוקר המחיה|התייקר|ייקור|מחיר (?:הדלק|הבנזין|החשמל|המים|הלחם|החלב|הגז)|מחירי|מע"מ|מס הכנסה|נקודות זיכוי|רשות המסים|מענק|קצב(?:ה|ת|אות)|ביטוח לאומי|שכר המינימום|השכר הממוצע|משכורת|תקציב המדינה|חוק ההסדרים|האוצר|גירעון|חוב|דירוג האשראי|תמ"ג|צמיחה|האבטלה|שוק העבודה|פנסי|קרן השתלמות|קרנות השתלמות|קופות גמל|גמל להשקעה|חיסכון|קרנות כספיות|קרן כספית|ביטוח|משכנת|הלוואה|אשראי|כרטיס(?:י)? אשראי|עמלות|הבנקים|בנק (?:הפועלים|לאומי|דיסקונט|מזרחי)|הבורסה|ת"א[- ]?35|ת"א[- ]?125|מניה|מניות|אג"ח|השקע|משקיעים|תשואה|תשואות|וול סטריט|נאסד"ק|S&P|דולר|השקל|האירו|שער החליפין|ביטקוין|קריפטו|מטבע(?:ות)? (?:דיגיטלי|קריפטו)|את'ריום|הנפק|דוחות כספיים|רווח|הכנסות|מיזוג|רכישה של|גיוס|סטארט[- ]?אפ|הייטק|אקזיט|פשיטת רגל|חדלות פירעון|רשות ניירות ערך|הממונה על שוק ההון|רשות התחרות|צרכנ|הנחה|מבצע|הוזלה|זול/;
// crypto (English feeds): only market-moving or regulation news
const CRYPTO_RE = /\b(bitcoin|btc|ether(?:eum)?|crypto|stablecoin|etf|sec|regulat|hack|exploit|binance|coinbase|blackrock|fed|price|record|crash|surge|tumble|rally|israel)\b/i;
const SKIP_RE = /\|\s*[^|]{2,40}$|ועוד \d+ כתבות|הכתבות (?:הנקראות|החשובות)|האם זה הזמן|מומחים מנתחים|כל מה שצריך לדעת|רכילות|ריאליטי|דעה|טור אישי|פרשנות|פודקאסט|גלריה|צפו:|צפו ב|ראיון|הורוסקופ|מתכון|בידור|כוכב|זמר|שחקנית|עוקבים|תוכן שיווקי|בשיתוף|ממומן|sponsored|opinion|podcast|webinar|price prediction|predict|should you buy|how to buy|best crypto|top \d+|meme coin|airdrop|giveaway|what happened in crypto|everything you need to know|explained|here'?s (?:what|why|how)|morning (?:briefing|minute)|daily (?:recap|wrap)|week in review|this week in/i;
const OFFICIAL_BODY_RE = /בנק ישראל|הלמ"ס|הלשכה המרכזית לסטטיסטיקה|רשות המסים|רשות ניירות ערך|הבורסה|האוצר|משרד האוצר|החשב הכללי|הממונה על שוק ההון|רשות התחרות|ביטוח לאומי|הממשלה (?:אישרה|החליטה)|הכנסת (?:אישרה|אישר)|אושר בקריאה|מדד המחירים|הריבית/;
// buy/sell advice words: a draft with any of these is dropped (investments and crypto are news only)
const ADVICE_RE = /כדאי (?:לקנות|למכור|להשקיע|להיכנס|לצאת)|(?:^|\s)(?:קנו|מכרו|השקיעו|תקנו|תמכרו)(?:\s|$)|המלצת (?:קנייה|מכירה)|הזדמנות (?:השקעה|קנייה)|עכשיו הזמן ל(?:קנות|השקיע)|מומלץ (?:לקנות|למכור|להשקיע)/;
const DISCLAIMER = 'המידע אינו ייעוץ השקעות.';
const STOP = new Set(['היום', 'אתמול', 'הערב', 'הבוקר', 'לאחר', 'במהלך', 'אחרי', 'לפני', 'עדכון', 'דיווח', 'מבזק', 'בישראל', 'ישראל', 'הפוסט', 'הופיע', 'לראשונה', 'כעת', 'עכשיו', 'מול', 'נגד', 'גם', 'אבל', 'כי',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'has', 'have', 'its', 'after', 'says', 'said', 'will', 'into', 'over', 'amid', 'new', 'calcalist', 'בכלכליסט', 'ביזפורטל', 'גלובס', 'mako']);
const toks = (s: string) => new Set(norm(s).toLowerCase().replace(/[^\p{L}\p{N}"\s%]/gu, ' ').split(/\s+/).map((w) => w.replace(/^"|"$/g, ''))
  .map((w) => (w.length > 4 && /^[ובלמהש]/.test(w) ? w.slice(1) : w)).filter((w) => w.length >= 3 && !STOP.has(w)));
const same = (a: Set<string>, b: Set<string>) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n >= 3 && n / Math.max(1, Math.min(a.size, b.size)) >= 0.3; };
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ilHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const ilWhen = (iso: string) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const dayStartIl = () => {
  const d = ilDay(new Date()); const guess = Date.parse(`${d}T00:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return new Date(guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3).toISOString();
};
const outletOf = (x: Any, src: Any) => String(x.outlet || src[x.source_id]?.name_he || x.source_id).replace(/\s*\(גוגל ניוז\)$/, '');
// the outlet behind an item, to count "different outlets" (גלובס כלכלה and גלובס שוק ההון are one outlet)
const BRAND: Record<string, string> = { globes_economy: 'globes', globes_markets: 'globes', ynet_economy: 'ynet', themarker_news: 'themarker', walla_money: 'walla', ice_news: 'ice', coindesk: 'coindesk', cointelegraph: 'cointelegraph', decrypt: 'decrypt' };
const brandOf = (x: Any) => BRAND[x.source_id] || String(x.outlet || x.source_id).toLowerCase().replace(/^www\.|\.co\.il$|\.com$/g, '').replace(/[^\p{L}\p{N}]+/gu, '')
  .replace(/^calcalist$|^כלכליסט$/, 'calcalist').replace(/^globes$|^גלובס$/, 'globes').replace(/^ynet.*/, 'ynet').replace(/^themarker$|^דהמרקר$/, 'themarker').replace(/^ביזפורטל$|^bizportal$/, 'bizportal');
// a Google News title ends with " - <outlet>": dropped before grouping and writing
const titleOf = (x: Any) => (String(x.source_id).startsWith('gn_') ? String(x.title || '').replace(/\s+-\s+[^-]{2,40}$/, '') : String(x.title || ''));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ENT: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', hellip: '...' };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? (() => { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; })() : (ENT[e.toLowerCase()] ?? m));
const txt = (h: string) => decode(h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
async function pageText(url: string) {
  try {
    if (!/^https?:\/\//.test(url) || /news\.google\.com/.test(url)) return '';
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    if (!r.ok) return '';
    let html = await r.text();
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, ' ');
    const art = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
    const paras = [...art.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((m) => txt(m[1])).filter((p) => p.length >= 30 && !/cookie|עוגיות|הירשמו|שתפו|כל הזכויות|לחצו כאן|subscribe|newsletter/i.test(p));
    return [...new Set(paras)].join('\n').slice(0, 3000);
  } catch { return ''; }
}

const SYSTEM = `אתה עורך מדור "כלכלה וכסף" באתר החדשות "חדשות נתניה והשרון". המדור מסקר ארבעה נושאים לקהל הרחב:
- economy (כלכלה): ריבית ובנק ישראל, אינפלציה ומדד המחירים, תקציב, מסים ומע"מ, שוק העבודה, נתוני הלמ"ס, החלטות ממשלה וכנסת בכלכלה.
- money (כסף): הכסף של המשפחה: מחירים והתייקרויות, חשבונות, קצבאות ומענקים, שכר, פנסיה וקרנות השתלמות, בנקים, אשראי ועמלות, ביטוח, צרכנות, הטבות.
- invest (השקעות): הבורסה בתל אביב ובעולם, מניות גדולות, אג"ח, קרנות, הנפקות, דוחות של חברות גדולות, עסקאות ענק.
- crypto (קריפטו): ביטקוין ומטבעות גדולים, רגולציה, פריצות ואירועים גדולים בשוק.
כללים מחייבים:
- רק עובדות שמופיעות במקורות. אסור להמציא מספרים, שמות, תאריכים או סיבות. מספרים ומחירים תמיד עם המועד שלהם ("נכון ליום שישי", "בסגירת המסחר").
- ניטרליות מלאה: בלי דעה, בלי שבח, בלי "הכי", בלי תחזיות משלנו. תחזית או הערכה מייחסים לאומר ("לפי בנק ישראל", "לדברי האנליסטים של...").
- השקעות וקריפטו הם חדשות בלבד. אסור לייעץ: לא "כדאי לקנות", "כדאי למכור", "הזדמנות", "השקיעו". לא מנבאים מחיר. לא ממליצים על מניה, קרן, מטבע, בנק או מוצר.
- לא להעתיק משפטים מהמקורות. ניסוח שלנו, עברית פשוטה וברורה. מקור באנגלית מתרגמים לעברית טבעית.
- בכותרת, בכותרת המשנה, ב-kicker ובנקודות אסור שם של כלי תקשורת. לא לכתוב "לפי דיווח" או "כפי שדווח". מייחסים עובדות לגופים רשמיים או לחברות עצמן (בנק ישראל, הלמ"ס, רשות המסים, החברה בדיווח לבורסה).
- קרדיט לכלי תקשורת רק אם הידיעה כולה נשענת על פרסום בלעדי שלו: אז הפסקה האחרונה היא שורה נפרדת "קרדיט: <שם>".
- לא להשתמש בקו מפריד ארוך או בינוני.
- כשיש השפעה מעשית על הקוראים (תשלום, מחיר, ריבית, משכנתא, קצבה, מס, חיסכון, מועד שצריך לעמוד בו), הפסקה האחרונה מתחילה במילים "מה זה אומר לכם:" ומסבירה במשפט או שניים את ההשפעה, רק לפי מה שכתוב במקורות. אם אין השפעה ברורה, לא מוסיפים.
- מבנה: פסקה ראשונה עם מה קרה ומתי, אחר כך הפרטים והמספרים, ומה הלאה אם כתוב. 2 עד 4 פסקאות.
- כותרת עד 80 תווים, עובדתית וברורה. כותרת משנה: משפט אחד עם פרט חשוב שלא בכותרת. kicker: עד 5 מילים עם עובדה שלא בכותרת, או ריק.
- topic: אחד מ economy, money, invest, crypto.
- אם זה לא מתאים למדור (רכילות, תוכן שיווקי, ידיעה על חברה קטנה שלא מעניינת את הקהל, ניתוח או דעה בלי אירוע, מדריך כללי, תחזית מחיר), החזר רק {"skip":true,"reason":"..."}.
- אם אין מספיק עובדות לשני משפטים ענייניים, החזר רק {"hold":true,"reason":"..."}.
החזר JSON בלבד: {"topic":"economy","kicker":"","title":"","dek":"","body":["",""],"keyPoints":["",""],"basis":"official"}`;

async function claude(user: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: MODEL, max_tokens: 6000, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(100000),
  });
  const j = await r.json();
  if (r.ok) {
    const u = j.usage || {};
    await sb.rpc('hns_ai_bump', { p_day: ilDay(new Date()), p_n: 1 }).then(() => null, () => null);
    await sb.rpc('ai_cost_add', { p_fn: 'hns-economy', p_model: MODEL, p_in: Number(u.input_tokens || 0) + Number(u.cache_read_input_tokens || 0) + Number(u.cache_creation_input_tokens || 0), p_out: Number(u.output_tokens || 0) }).then(() => null, () => null);
  }
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no json (${j.stop_reason}): ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
  return { out: JSON.parse(m[0]), usage: j.usage };
}

async function brakeOn() {
  const { data: x } = await sb.from('hns_config').select('v').eq('k', 'ai_extra').maybeSingle();
  const v: Any = x?.v || {};
  const { data: m } = await sb.rpc('ai_cost_month');
  return Number(m || 0) + Number(v.untracked_usd || 0) >= Number(v.extra_stop_usd || 65);
}

async function tick(dry: boolean) {
  const now = Date.now();
  const h = ilHour();
  if (!dry && (h < 7 || h >= 23)) return { quiet: 'night' };
  const { data: srcRows } = await sb.from('hns_sources').select('id,name_he,trust');
  const src = Object.fromEntries((srcRows || []).map((s: Any) => [s.id, s]));
  const { data: items } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,outlet')
    .in('source_id', ECON_SRC).eq('is_local', false).is('cluster_id', null).gte('fetched_at', new Date(now - 8 * 3600e3).toISOString())
    .order('id', { ascending: false }).limit(800);
  const pool = (items || []).filter((x: Any) => {
    const t = titleOf(x);
    if (SKIP_RE.test(t)) return false;
    if (x.published_at && now - Date.parse(x.published_at) > 8 * 3600e3) return false;
    return CRYPTO_SRC.has(x.source_id) && x.source_id !== 'gn_crypto' ? CRYPTO_RE.test(t) : TOPIC_RE.test(norm(t));
  });
  const groups: { items: Any[]; t: Set<string> }[] = [];
  for (const x of pool) {
    const t = toks(`${titleOf(x)} ${String(x.body || '').slice(0, 200)}`);
    const g = groups.find((g) => same(g.t, t));
    if (g) { g.items.push(x); for (const w of t) g.t.add(w); } else groups.push({ items: [x], t });
  }
  const outlets = (g: { items: Any[] }) => new Set(g.items.map(brandOf)).size;
  const solo = (g: { items: Any[] }) => g.items.some((x) => MAJOR_SRC.has(x.source_id) && OFFICIAL_BODY_RE.test(norm(x.title || ''))
    && now - Date.parse(x.published_at || x.fetched_at) >= 30 * 60e3);
  const official = (g: { items: Any[] }) => g.items.some((x) => OFFICIAL_BODY_RE.test(norm(x.title || ''))) ? 1 : 0;
  const ok = groups.filter((g) => outlets(g) >= 2 || solo(g))
    .sort((a, b) => (outlets(b) + official(b)) - (outlets(a) + official(a)));
  // national and economy stories of the last 12 hours: a matching group is attached, not written again
  const { data: recent } = await sb.from('hns_stories').select('id,title,dek,created_at,section').in('section', ['economy', 'national']).gte('created_at', new Date(now - 12 * 3600e3).toISOString());
  const attach: Any[] = []; const fresh: typeof ok = [];
  for (const g of ok) {
    const hit = (recent || []).find((s: Any) => same(toks(`${s.title} ${s.dek || ''}`), g.t));
    if (hit) attach.push({ story: hit.id, ids: g.items.map((x) => x.id) }); else fresh.push(g);
  }
  if (dry) return { pool: pool.length, groups: ok.map((g) => ({ n: g.items.length, outlets: [...new Set(g.items.map((x) => outletOf(x, src)))], titles: g.items.slice(0, 3).map(titleOf) })), attach, singles: groups.length - ok.length };
  for (const a of attach) await sb.from('hns_items').update({ cluster_id: a.story }).in('id', a.ids);
  if (!fresh.length) return { pool: pool.length, groups: ok.length, attached: attach.length, wrote: 0 };
  const brake = await brakeOn();
  const max = brake ? MAX_DAY_BRAKE : MAX_DAY;
  const { count: today } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).eq('section', 'economy').neq('state', 'rejected').gte('created_at', dayStartIl());
  if ((today || 0) >= max) return { capped: 'daily', today, brake };
  const last = (recent || []).filter((s: Any) => s.section === 'economy').map((s: Any) => Date.parse(s.created_at)).sort((a: number, b: number) => b - a)[0] || 0;
  if (now - last < GAP_MIN * 60e3) return { capped: 'pace', next_in_min: Math.ceil((GAP_MIN * 60e3 - (now - last)) / 60e3) };
  const g = fresh[0];
  const its = g.items.slice(0, 6);
  for (const x of its.slice(0, 4)) if (x.url && String(x.body || '').length < 450) { const t = await pageText(x.url); if (t.length > String(x.body || '').length + 40) x.body = `${x.body || ''}\n${t}`; }
  const user = `היום: ${ilWhen(new Date().toISOString())} (שעון ישראל)\n\nהמקורות:\n\n` + its.map((x: Any, i: number) =>
    `מקור ${i + 1}: ${outletOf(x, src)} (${src[x.source_id]?.trust === 'official' ? 'גוף רשמי' : 'כלי תקשורת'})\nזמן הפרסום: ${ilWhen(x.published_at || x.fetched_at)}\nכותרת: ${titleOf(x)}\nתוכן: ${String(x.body || '').slice(0, 2500)}`).join('\n\n');
  const ids = g.items.map((x: Any) => x.id);
  const sources = [...new Map(its.map((x: Any) => [outletOf(x, src), { id: x.source_id, name: outletOf(x, src), url: x.url, trust: src[x.source_id]?.trust || 'media' }])).values()];
  const close = async (why: string) => {
    const { data: st } = await sb.from('hns_stories').insert({ section: 'economy', title: clean(titleOf(its[0])), state: 'rejected', item_ids: ids, sources, places: ['ישראל'],
      notes: `כלכלה: ${why}`.slice(0, 300), model: MODEL, sensitivity: 'normal' }).select('id').single();
    if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
    return st?.id;
  };
  let res: Any;
  try { res = await claude(user); } catch (e) { return { error: String((e as Error).message || e) }; }
  const out = res.out || {};
  if (out.skip || out.hold || !out.title || !Array.isArray(out.body) || !out.body.length) {
    return { wrote: 0, closed: await close(`${out.skip ? 'לא נכתב' : 'ממתין לפרטים'}: ${String(out.reason || '').slice(0, 160)}`), why: out.reason || 'no story' };
  }
  const topic = ['economy', 'money', 'invest', 'crypto'].includes(out.topic) ? out.topic : (its.some((x: Any) => CRYPTO_SRC.has(x.source_id)) ? 'crypto' : 'economy');
  let body: string[] = out.body.map(clean).filter(Boolean);
  const kp: string[] = (out.keyPoints || []).map(clean).filter(Boolean);
  const all = [out.title, out.dek, out.kicker, ...body, ...kp].join(' ');
  if (ADVICE_RE.test(all)) return { wrote: 0, closed: await close('נפסל: נוסח של המלצת השקעה'), why: 'advice words' };
  if (topic === 'invest' || topic === 'crypto') { body = body.filter((p) => p !== DISCLAIMER); body.push(DISCLAIMER); }
  const basis = ['official', 'public', 'media_exclusive'].includes(out.basis) ? out.basis : 'public';
  const kicker = clean(out.kicker || '');
  const { data: st, error } = await sb.from('hns_stories').insert({
    section: 'economy', places: ['ישראל'], item_ids: ids, sources, state: 'approved', sensitivity: 'normal', basis, model: MODEL, usage: res.usage,
    title: clean(out.title), dek: clean(out.dek), body, key_points: kp, kicker: kicker && kicker.split(/\s+/).length <= 5 ? kicker : null,
    notes: `כלכלה: נכתב אוטומטית (hns-economy), ${topic}`, kind: 'news', extras: { econ: topic },
  }).select('id').single();
  if (error || !st) return { error: error?.message || 'insert failed' };
  await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
  const pub = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-publish`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
    body: JSON.stringify({ action: 'approve', ids: [st.id], by: 'economy-auto' }), signal: AbortSignal.timeout(60000),
  }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
  return { wrote: st.id, topic, title: clean(out.title), outlets: sources.length, brake, publish: pub };
}

// ---------- live market data ----------
async function getText(url: string, accept = 'application/json') {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': accept }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}
// Bank of Israel SDMX: the last observation of a series as {date, value}
async function boi(flow: string, series: string) {
  const csv = await getText(`https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/${flow}/1.0/${series}?format=csv&lastNObservations=1`, 'text/csv');
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0].split(','); const iT = head.indexOf('TIME_PERIOD'), iV = head.indexOf('OBS_VALUE'), iS = head.indexOf('SERIES_CODE');
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    if (series && c[iS] !== series && !(series === '' )) continue;
    const v = Number(c[iV]); if (isFinite(v) && c[iV] !== '') return { date: c[iT], value: v };
  }
  throw new Error('no value');
}
async function live() {
  const { data: cur } = await sb.from('docs').select('data').eq('coll', 'nwslive').eq('id', 'markets').maybeSingle();
  const prev: Any = cur?.data || {};
  const at = new Date().toISOString();
  const out: Any = { updatedAt: at, sources: { boi: 'https://www.boi.org.il/', coingecko: 'https://www.coingecko.com/', ta35: 'https://market.tase.co.il/he/market_data/index/142/major_data' } };
  const errs: string[] = [];
  const keep = (k: string, e: unknown) => { errs.push(`${k}: ${String((e as Error)?.message || e).slice(0, 80)}`); if (prev[k]) out[k] = prev[k]; };
  // Bank of Israel interest rate (series MNT_RIB_BOI_D of the BR flow)
  try {
    const csv = await getText('https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/BR/1.0/MNT_RIB_BOI_D?format=csv&lastNObservations=1', 'text/csv');
    const lines = csv.trim().split(/\r?\n/); const head = lines[0].split(',');
    const row = lines.slice(1).map((l) => l.split(',')).find((c) => c[head.indexOf('SERIES_CODE')] === 'MNT_RIB_BOI_D' && c[head.indexOf('OBS_VALUE')] !== '');
    if (!row) throw new Error('no value');
    out.rate = { value: Number(row[head.indexOf('OBS_VALUE')]), date: row[head.indexOf('TIME_PERIOD')], at };
  } catch (e) { keep('rate', e); }
  for (const [k, s] of [['usd', 'RER_USD_ILS'], ['eur', 'RER_EUR_ILS']] as const) {
    try { const v = await boi('EXR', s); out[k] = { value: v.value, date: v.date, at }; } catch (e) { keep(k, e); }
  }
  try {
    const j = JSON.parse(await getText('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,ils&include_24hr_change=true'));
    if (!j?.bitcoin?.usd) throw new Error('no price');
    out.btc = { usd: j.bitcoin.usd, ils: j.bitcoin.ils, chg24: j.bitcoin.usd_24h_change, at };
    if (j.ethereum?.usd) out.eth = { usd: j.ethereum.usd, ils: j.ethereum.ils, chg24: j.ethereum.usd_24h_change, at };
  } catch (e) { keep('btc', e); if (prev.eth) out.eth = prev.eth; }
  try {
    const j = JSON.parse(await getText('https://query1.finance.yahoo.com/v8/finance/chart/TA35.TA?range=5d&interval=1d'));
    const m = j?.chart?.result?.[0]?.meta;
    if (!m?.regularMarketPrice) throw new Error('no price');
    out.ta35 = { value: m.regularMarketPrice, chg: m.regularMarketChangePercent ?? null, time: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null, at };
  } catch (e) { keep('ta35', e); }
  if (errs.length) out.errors = errs; else out.errors = [];
  await sb.rpc('docs_merge', { p_coll: 'nwslive', p_id: 'markets', p_patch: out });
  return { ok: true, errors: errs, rate: out.rate?.value, usd: out.usd?.value, eur: out.eur?.value, btc: out.btc?.usd, ta35: out.ta35?.value };
}

// called by hns-national with its secrets
export async function economy(action: string, secrets: Record<string, string>) {
  S = secrets;
  if (action === 'econ') return await tick(false);
  if (action === 'econ_dry') return await tick(true);
  if (action === 'econ_live') return await live();
  return { error: 'unknown economy action' };
}
