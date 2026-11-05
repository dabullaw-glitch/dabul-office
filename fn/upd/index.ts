// upd (31.10.2026, Yakir approved: "כן, בדיוק מה שאמרת"): "לוח עדכונים" in the office system.
// A daily board of real estate and legal updates. Yakir taps an update and asks for a post or an article; this function prepares
// it, sends it to him in Telegram for approval, and after "מאשר" it goes out through the existing paths. Video comes later
// (after the HeyGen trial). Separate from the magazine, the newsletter and the fixed Google Business posts: it never touches them.
//
// FEED (docs coll 'upd', id 'feed-YYYY-MM-DD': {date, items[], at, runs[]}):
//   candidates: real estate items the news collector already reads (Globes, TheMarker, Walla, ynet feeds; only their own links),
//   plus (morning run) two web searches with citations: official and primary sources (gov.il, courts, Knesset, Bank of Israel,
//   CBS) and real estate news sites. A search item without a citation the model really read is dropped.
//   One ranking call picks 10-20 items that matter to the practice (tax, rulings, urban renewal, law changes, mortgages, planning,
//   Netanya and the Sharon), writes a title and a 1-2 line summary in our own words, a topic and an importance (1-5).
//   Every item keeps its source name and link. nws.co.il is never a source or a link here.
// REQUESTS (docs coll 'updreq', written by the office app addon-upd.js): {kind:'post'|'article', item, note, status:'queued'}
//   post:    text for Facebook and LinkedIn in the office voice + a designed image (resvg, office colors, Heebo, the logo) ->
//            Telegram photo with buttons (מאשר / לתקן / לבטל, through portal.html#u=<a>&t=<token>) -> on approval a row in the
//            publishing calendar (docs pub, owner office, channels facebook+instagram+linkedin+x, a few minutes ahead) that the postoria cron
//            publishes. When it is out, Telegram gets the links.
//   article: research with citations (neutral sources only, never other lawyers' sites) -> a full article in the office template
//            (artcfg writer rules + exemplar) -> a hidden WordPress draft for preview -> Telegram with the preview link and the
//            buttons -> on approval an artjob 'written' (with the draft's id), so the existing articles engine checks it and
//            schedules it for the next morning, with its own stop button.
//   "לתקן": Yakir writes what to change; it is done again with his note and sent again. "לבטל": nothing goes out.
// POST (x-cron-secret): {action:'feed', sweep?:bool} cron 06:20 (with searches) and 13:20 (collector only), Israel time
//                       {action:'work'}               cron every 5 minutes: one step for up to 2 requests, and the follow-ups
// GET/POST ?a=view|ok|fix|no&t=<token>                the approval page (opened from Telegram through the office portal)
// COST: every Anthropic call is priced into ai_cost (fn 'upd'; web searches as model 'web_search', $0.01 each). When the month
//   reaches the brake (hns_config ai_extra), the feed skips the searches and the writing uses the regular model.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
import { renderCard, PHOTOS, photoUrl, type Card, type Tpl } from './img.ts';

// deno-lint-ignore no-explicit-any
type Any = any;
const SITE = 'https://dabullaw.co.il';
const PORTAL = 'https://dabullaw-glitch.github.io/dabul-office/portal.html';
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const tok = () => crypto.randomUUID().replace(/-/g, '');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const clean = (s: unknown) => String(s ?? '').replace(/\s*[—–]\s*/g, ' - ').replace(/[ \t]+/g, ' ').trim();
const ilDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const ilNowPlus = (min: number) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(Date.now() + min * 60e3)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const NO_NWS = /nws\.co\.il|חדשות נתניה והשרון/;
const TOPICS = ['מיסוי מקרקעין', 'פסיקה', 'התחדשות עירונית', 'חקיקה ונהלים', 'משכנתאות וריבית', 'רמ"י ותכנון', 'שוק הדירות', 'שכירות', 'ירושה ומקרקעין', 'נתניה והשרון'];
// Bar advertising rules and the office's own words that never appear
const BAD: [RegExp, string][] = [[/(^|[\s"(])הכי([\s,.)]|$)/, '"הכי"'], [/מומח/, '"מומחה"'], [/חינם|ללא עלות|ללא תשלום/, '"חינם"'], [/הטוב(?:ים|ה|ות)? ביותר/, 'לשון הפלגה'], [/מקסימל/, 'לשון הפלגה "מקסימלי"'],
  [/(?:אחוזי|שיעור) הצלחה/, 'שיעורי הצלחה'], [/מבטיח(?:ים)? (?:לכם|לך)|אנו מבטיחים|נבטיח/, 'הבטחה'], [/דבול ושות/, 'שם ישן של המשרד'], [/nws\.co\.il|חדשות נתניה והשרון/, 'אזכור nws']];
const badIn = (t: string) => BAD.filter(([re]) => re.test(t)).map(([, l]) => l);
const CONTACT = 'לשאלות ותיאום פגישה: 09-8613413 או בוואטסאפ 050-5580189.';
const DISCLAIMER = 'המידע כללי ואינו ייעוץ משפטי.';

async function tgApi(method: string, body: Any) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return null;
  return await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, ...body }) }).then(r => r.json()).catch(() => null);
}
const tg = (text: string, buttons?: Any[]) => tgApi('sendMessage', { text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined });
const portal = (a: string, t: string) => `${PORTAL}#u=${a}&t=${t}`;
const buttons = (t: string) => [[{ text: '✅ מאשר', url: portal('ok', t) }, { text: '✏️ לתקן', url: portal('fix', t) }, { text: '✗ לבטל', url: portal('no', t) }]];

// ---------- AI, cost and the monthly brake ----------
let BRAKE = false, LEAD = 'claude-opus-5-5';
const REG = 'claude-sonnet-5-5', CHEAP = 'claude-haiku-5-5';
async function setup() {
  const [{ data: x }, { data: m }] = await Promise.all([admin().from('hns_config').select('v').eq('k', 'ai_extra').maybeSingle(), admin().rpc('ai_cost_month')]);
  const c = x?.v || {};
  LEAD = String(c.lead_model || LEAD);
  BRAKE = Number(m || 0) + Number(c.untracked_usd || 0) >= Number(c.extra_stop_usd || 65);
}
const writer = () => (BRAKE ? REG : LEAD);
async function claude(body: Any): Promise<Any> {
  const h: Record<string, string> = { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (env('ANTHROPIC_WORKSPACE_ID')) h['anthropic-workspace-id'] = env('ANTHROPIC_WORKSPACE_ID');
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: JSON.stringify(body), signal: AbortSignal.timeout(280000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${String(j?.error?.message || '').slice(0, 160)}`);
  const u = j.usage || {};
  await admin().rpc('ai_cost_add', { p_fn: 'upd', p_model: body.model, p_in: Number(u.input_tokens || 0) + Number(u.cache_read_input_tokens || 0) + Number(u.cache_creation_input_tokens || 0), p_out: Number(u.output_tokens || 0) }).then(() => null, () => null);
  const s = Number(u.server_tool_use?.web_search_requests || 0);
  if (s) await admin().rpc('ai_cost_add', { p_fn: 'upd', p_model: 'web_search', p_in: s * 1000, p_out: 0 }).then(() => null, () => null);
  return j;
}
const textOf = (j: Any) => (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
function jsonOf(t: string) { const m = t.replace(/```(?:json)?/g, '').match(/[[{][\s\S]*[\]}]/); if (!m) throw new Error('no json in answer'); return JSON.parse(m[0]); }
// search with resume on pause_turn; returns all content blocks
async function searchRun(model: string, system: string, user: string, domains: string[], uses: number, maxTok = 3500) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: uses, allowed_domains: domains }];
  const messages: Any[] = [{ role: 'user', content: user }]; let content: Any[] = [];
  for (let round = 0; round < 3; round++) {
    const d = await claude({ model, max_tokens: maxTok, system, tools, messages });
    content = content.concat(d.content || []);
    if (d.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: d.content });
  }
  // the search ended without a written answer (or only "nothing"): ask once for the final answer from what was read
  const said = content.filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  if (!/ITEM|FACT/.test(said) && content.some((c: Any) => c.type === 'web_search_tool_result')) {
    const d = await claude({ model, max_tokens: maxTok, system, messages: [...messages.slice(0, 1), { role: 'assistant', content: content.filter((c: Any) => c.type !== 'text') }, { role: 'user', content: 'כתוב עכשיו את התשובה הסופית בפורמט שנקבע, מתוך העמודים שכבר קראת. כל פריט עם הציטוט מהעמוד.' }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1, allowed_domains: domains }] }).catch(() => null);
    if (d) content = content.concat(d.content || []);
  }
  return content;
}
// ITEM ... END blocks with the citations that sit inside each block (an item with no citation is dropped)
function citedBlocks(content: Any[], tag = 'ITEM') {
  let text = ''; const marks: { at: number; url: string; title: string; quote: string }[] = [];
  for (const b of content || []) if (b.type === 'text') {
    for (const c of b.citations || []) if (c.url && c.cited_text) marks.push({ at: text.length, url: c.url, title: c.title || '', quote: String(c.cited_text).trim() });
    text += b.text;
  }
  const out: Any[] = []; const re = new RegExp(tag + '([\\s\\S]*?)END', 'g'); let m;
  while ((m = re.exec(text))) {
    const start = m.index, end = m.index + m[0].length, body = m[1];
    const field = (k: string) => { const x = body.match(new RegExp(k + '\\s*:\\s*([^\\n]+)')); return x ? clean(x[1]) : ''; };
    const cites = marks.filter(c => c.at >= start && c.at <= end && !NO_NWS.test(c.url));
    if (!cites.length) continue;
    out.push({ field, cites, body });
  }
  return out;
}

// ---------- FEED ----------
const FEED_SRC = ['globes_realestate', 'themarker_realestate', 'globes_markets', 'walla_money', 'walla_local_biz', 'ynet_news', 'walla_israel'];
const KW = /נדל"?ן|נדל״ן|דירה|דירות|מס רכישה|מס שבח|משכנת|ריבית|פינוי[ -]?בינוי|תמ"?א|תמ״א|התחדשות עירונית|רמ"?י|רמ״י|רשות מקרקעי|מקרקעין|היטל השבחה|טאבו|רשם המקרקעין|קבלן|יזם|שכירות|שוכר|משכיר|ירוש|צוואה|ועדת ערר|תכנון ובנייה|ועדה מקומית|ועדה מחוזית|דירה בהנחה|מחיר למשתכן|מחירי הדירות|בנק ישראל|הלמ"ס|בית משותף|הערת אזהרה|זיכרון דברים/;
const GOV_DOMAINS = ['gov.il', 'knesset.gov.il', 'boi.org.il', 'cbs.gov.il', 'court.gov.il', 'kolzchut.org.il'];
const NEWS_DOMAINS = ['nadlancenter.co.il', 'calcalist.co.il', 'globes.co.il', 'themarker.com', 'bizportal.co.il', 'ice.co.il', 'magdilim.co.il', 'ynet.co.il', 'walla.co.il', 'mako.co.il', 'maariv.co.il', 'israelhayom.co.il', 'davar1.co.il', 'news1.co.il'];
const SEARCH_SYS = `אתה עוזר מחקר במשרד עורכי דין לנדל"ן ומקרקעין בנתניה. מחפשים עדכונים אמיתיים מהימים האחרונים שחשובים לקונים, למוכרים, לבעלי דירות ולמשקיעים.
כללים:
- רק עדכונים מ-14 הימים האחרונים (בדוק את התאריך שבעמוד). לא מדריכים כלליים ולא כתבות ישנות.
- כתוב את כל הפריטים בתשובה הסופית אחת, וכל פריט בנוי מהמשפטים שמצוטטים מהמקור (עם הציטוט בתוך הפריט).
- כל פריט חייב להישען על עמוד שקראת בחיפוש, עם ציטוט. בלי לנחש תאריכים, מספרים או שמות.
- לא אתרים של עורכי דין או משרדי עורכי דין.
- בין 4 ל-10 פריטים. אם אין, כתוב רק: אין עדכונים.
פורמט לכל פריט, בדיוק כך:
ITEM
כותרת: (עד 12 מילים)
תאריך: (YYYY-MM-DD)
מקור: (שם הגוף או האתר)
מה קרה: (משפט או שניים)
END`;
async function sweep(kind: 'gov' | 'news', debug = false) {
  const ask = kind === 'gov'
    ? 'חפש החלטות רשמיות ופסקי דין מהימים האחרונים (במקור הרשמי או כפי שדווחו באתרי החדשות): החלטות מיסוי וחוזרים של רשות המסים, החלטות ועדות ערר, פסקי דין של העליון והמחוזי בנדל"ן ובמקרקעין, החלטות מועצת רשות מקרקעי ישראל ומכרזים, מנהל התכנון, רשם המקרקעין, משרד הבינוי והשיכון והרשות להתחדשות עירונית, ריבית בנק ישראל ומשכנתאות, מדד מחירי הדירות של הלמ"ס, חקיקה בכנסת שנוגעת לדירות.'
    : 'חפש חדשות נדל"ן ומשפט מהימים האחרונים באתרי החדשות: מיסוי מקרקעין, פסקי דין בעסקאות דירה ובבתים משותפים, התחדשות עירונית ופינוי בינוי, משכנתאות וריבית, שינויי חקיקה ונהלים, תכנון ובנייה, ונתניה והשרון.';
  const content = await searchRun(CHEAP, SEARCH_SYS, `התאריך היום: ${ilDay()}.\n${ask}\nחפש, קרא, ותן את התשובה בפורמט שנקבע.`, kind === 'gov' ? [...GOV_DOMAINS, ...NEWS_DOMAINS] : NEWS_DOMAINS, 6, 5000);
  if (debug) { const txt = content.filter((c: Any) => c.type === 'text'); return [{ debug: true, blocks: content.length, texts: txt.length, cites: txt.reduce((a: number, c: Any) => a + (c.citations || []).length, 0), text: txt.map((c: Any) => c.text).join('').slice(0, 2500) }]; }
  return citedBlocks(content).map(({ field, cites }) => ({
    title: field('כותרת'), date: field('תאריך').slice(0, 10), what: field('מה קרה'), url: cites[0].url, source: field('מקור') || cites[0].title, via: kind,
  })).filter(x => x.title && x.url);
}
async function collectorItems() {
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  const [{ data: rows }, { data: srcs }] = await Promise.all([
    admin().from('hns_items').select('url,title,body,published_at,source_id').in('source_id', FEED_SRC).gte('fetched_at', since).order('fetched_at', { ascending: false }).limit(400),
    admin().from('hns_sources').select('id,name_he').in('id', FEED_SRC)]);
  const nm = Object.fromEntries((srcs || []).map((s: Any) => [s.id, s.name_he]));
  return (rows || []).filter((r: Any) => r.url && !NO_NWS.test(r.url) && KW.test(`${r.title} ${String(r.body || '').slice(0, 400)}`))
    .map((r: Any) => ({ title: clean(r.title), date: String(r.published_at || '').slice(0, 10), what: clean(String(r.body || '').replace(/<[^>]+>/g, ' ').slice(0, 280)), url: r.url, source: String(nm[r.source_id] || '').replace(/\s*(נדל"ן|חדשות|כסף|מקומי.*)$/, '').trim() || 'אתר חדשות', via: 'feed' }));
}
const RANK_SYS = `אתה העורך של לוח העדכונים במשרד עורכי דין לנדל"ן ומקרקעין בנתניה (יקיר דבול). מתוך רשימת עדכונים, בחר את אלה שחשובים לעבודה של המשרד וללקוחות שלו: מיסוי מקרקעין, פסיקה בעסקאות דירה ובבתים משותפים, התחדשות עירונית, חקיקה ונהלים, משכנתאות וריבית, רמ"י ותכנון, שוק הדירות, שכירות, ירושה ומקרקעין, נתניה והשרון.
כללים:
- אל תבחר עדכונים שלא קשורים לנדל"ן ולמשפט, עסקה בודדת או מחיר של דירה אחת בעיר אחרת, ידיעות על חברות בבורסה, ועדכונים כפולים (אותו אירוע פעמיים: בחר את המקור הרשמי אם יש, אחרת את המלא יותר).
- כותרת וסיכום בניסוח שלך, בעברית פשוטה. בלי להעתיק משפטים. רק עובדות שמופיעות בפריט.
- בלי מקף ארוך או בינוני. בלי "הכי".
- חשיבות 1 עד 5: 5 = שינוי שמשפיע על הרבה קונים, מוכרים או בעלי דירות (חוק, מס, פסק דין עקרוני, ריבית). 1 = מעניין אבל שולי.
החזר JSON בלבד: [{"i": מספר הפריט, "title": "עד 14 מילים", "summary": "משפט או שניים", "topic": "אחד מהנושאים: ${TOPICS.join(' / ')}", "imp": 1-5}]`;
async function feed(b: Any) {
  const day = ilDay(), id = `feed-${day}`;
  const cur = (await getDoc('upd', id)) || { date: day, items: [], runs: [] };
  // links already on the board in the last 10 days are not offered again (5.11.2026: Yakir saw nothing new, old items kept coming back)
  const { data: prev } = await db().select('data').eq('coll', 'upd').gte('id', `feed-${ilDay(new Date(Date.now() - 10 * 864e5))}`);
  const seen = new Set<string>(); (prev || []).forEach((r: Any) => (r.data.items || []).forEach((x: Any) => seen.add(x.url)));
  let cands: Any[] = await collectorItems();
  const notes: string[] = [];
  const doSweep = b.sweep !== false && !BRAKE && (b.force || !(cur.runs || []).some((r: Any) => r.sweep));
  if (doSweep) for (const k of ['gov', 'news'] as const) { try { cands = cands.concat(await sweep(k)); } catch (e) { notes.push(`${k}: ${(e as Error).message}`); } }
  else if (BRAKE) notes.push('brake: no searches');
  const uniq = new Map<string, Any>(); for (const c of cands) if (!seen.has(c.url) && !uniq.has(c.url)) uniq.set(c.url, c);
  // only fresh news: the board shows the last 3 days, so an item dated earlier is never offered (5.11.2026)
  const freshFrom = ilDay(new Date(Date.now() - 2 * 864e5));
  const list = [...uniq.values()].filter((c: Any) => !c.date || String(c.date).slice(0, 10) >= freshFrom).slice(0, 90);
  if (!list.length) { await merge('upd', id, { date: day, runs: [...(cur.runs || []), { at: new Date().toISOString(), sweep: doSweep, cands: 0, added: 0, notes }] }); return { added: 0, cands: 0, notes }; }
  const lines = list.map((c, i) => `${i + 1}. [${c.source}${c.date ? ', ' + c.date : ''}] ${c.title}${c.what ? ' | ' + c.what : ''}`).join('\n');
  const want = Math.max(8, 20 - (cur.items || []).length);
  const d = await claude({ model: BRAKE ? CHEAP : REG, max_tokens: 6000, system: RANK_SYS, messages: [{ role: 'user', content: `התאריך היום: ${day}.\nבחר עד ${want} עדכונים (רק את החשובים באמת, אפשר פחות). רק ידיעות מהיומיים האחרונים; ידיעה ישנה יותר לא נבחרת.\n\n${lines}` }] });
  const picked: Any[] = jsonOf(textOf(d));
  const items = picked.map((p: Any) => {
    const c = list[Number(p.i) - 1]; if (!c) return null;
    const t = clean(p.title), s = clean(p.summary);
    if (!t || badIn(`${t} ${s}`).length) return null;
    return { id: 'u' + hash(c.url), title: t, summary: s, topic: TOPICS.includes(p.topic) ? p.topic : 'שוק הדירות', imp: Math.min(5, Math.max(1, Number(p.imp) || 2)),
      source: { name: c.source, url: c.url }, date: c.date || day, via: c.via, at: new Date().toISOString() };
  }).filter(Boolean);
  const all = [...(cur.items || []), ...items].sort((a: Any, b2: Any) => b2.imp - a.imp);
  await merge('upd', id, { date: day, items: all, at: new Date().toISOString(), runs: [...(cur.runs || []), { at: new Date().toISOString(), sweep: doSweep, cands: list.length, added: items.length, notes }] });
  return { cands: list.length, added: items.length, total: all.length, sweep: doSweep, notes };
}

// ---------- source page (facts for the writing) ----------
async function sourcePage(url: string) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'accept-language': 'he' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { text: '', primary: [] as string[] };
    const html = await r.text();
    const primary = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]).filter(u => /(^https?:\/\/([a-z0-9-]+\.)*(gov\.il|knesset\.gov\.il|boi\.org\.il|cbs\.gov\.il)\/)/i.test(u) && !/\.(css|js|png|jpe?g|svg)(\?|$)/i.test(u)))].slice(0, 4);
    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#\d+;/g, '').trim()).filter(t => t.length > 40);
    return { text: paras.join('\n').slice(0, 7000), primary };
  } catch { return { text: '', primary: [] as string[] }; }
}

// ---------- the post image: ./img.ts ----------

// ---------- POST ----------
const POST_SYS = `אתה הקופירייטר של "יקיר דבול - משרד עורכי דין" (מקרקעין ונדל"ן, נתניה) לפייסבוק, לאינסטגרם, ללינקדאין ול-X. קהל: קונים, מוכרים ובעלי דירות. המטרה: לעצור את הגלילה בשתי שניות ולתת ערך אמיתי.
כללים מחייבים:
- שורת הפתיחה היא ה"הוק": קצרה, חדה, מסקרנת, נוגעת בכיס או בבית של הקורא (שאלה, מספר מפתיע, או "אם אתם..."). לא כותרת יבשה.
- טון חי וזורם, בגוף שני רבים ("אתם"), משפטים קצרים, פסקאות של שורה או שתיים. לא יבש ולא משפטי.
- לא כותבים "לפי הדיווח", "לפי הפרסום", "דווח ש". מייחסים את העובדה לגוף הראשוני עצמו: "עיריית נתניה החליטה", "בית המשפט קבע", "רשות המסים הציעה".
- רק עובדות שמופיעות בחומר שקיבלת. אסור להמציא מספרים, תאריכים, שמות, סעיפים או מספרי תיקים. לא מעתיקים משפטים מהמקור.
- כללי לשכת עורכי הדין: בלי "הכי", בלי "מומחה", בלי הבטחה לתוצאה, בלי "חינם" או "ללא עלות", בלי מחירים או שכר טרחה, בלי המלצות של לקוחות, בלי לשון הפלגה.
- בלי מקף ארוך או בינוני (— –). רק פסיק, נקודה או מקף רגיל.
- לא מזכירים משרדי עורכי דין אחרים. לא מזכירים את האתר nws או "חדשות נתניה והשרון".
מבנה הפוסט: הוק, 3 עד 4 פסקאות קצרות (מה קרה, מה זה אומר בפועל לכם, מה לבדוק או ממה להיזהר), ובסוף שאלה רכה או קריאה עדינה לתגובה (למשל "גרים במתחם? ספרו בתגובות איפה הפרויקט שלכם עומד"). אחר כך 3 עד 4 האשטגים בעברית בשורה נפרדת. בלי שורת יצירת קשר, בלי הסתייגות ובלי שורת מקור: הן מתווספות אוטומטית.
התמונה (בלי מקור ובלי טלפון עליה, הם מתווספים לבד): בחר תבנית אחת לפי התוכן:
- "number": יש מספר או עובדה אחת חזקה (40 מ״ר, 8%, 13 חודשים). hero = המספר עם היחידה, עד 8 תווים. heroLabel = מה המספר אומר, עד 24 תווים.
- "question": הסיפור עובד הכי טוב כשאלה ישירה לקורא. hook = השאלה.
- "split": החלטה או פסק דין שצריך כותרת עיתונאית; אפשר hero קצר לתג עגול (לא חובה).
- "list": יש 3 דברים מעשיים לבדוק או לדעת. items = 3 שורות, עד 30 תווים כל אחת.
hook = עד 40 תווים, החלק שעוצר את הגלילה: מה זה אומר לקורא (לא לחזור על המספר שכבר ב-hero), בלי לטעון ודאות שאין בעובדות ("יכולה לגדול", לא "תגדל"). sub = עד 55 תווים (לא חובה). kicker = 2 עד 3 מילים: הנושא.
photo = נושא התמונה, אחד מ: court (בית משפט), tax (מס), money (ריבית ומשכנתאות), urban (פינוי בינוי ובנייה), towers (בניינים), coast (עיר חוף), contract (חוזה ועסקה), home (בית ודירה).
החזר JSON בלבד:
{"tpl":"number|question|split|list", "kicker":"", "hero":"", "heroLabel":"", "hook":"", "sub":"", "items":[], "photo":"", "post":"הטקסט המלא", "sourceName":"שם הגוף הראשוני (עדיף) או האתר", "sourceUrl":"קישור למקור הראשוני אם יש, אחרת לכתבה"}`;
async function makePost(id: string, r: Any, dry = false) {
  const it = r.item || {};
  const pg = await sourcePage(it.source?.url || '');
  const fixes = (r.fixes || []).map((f: Any) => `- ${f.note}`).join('\n');
  const user = `העדכון: ${it.title}\nתקציר: ${it.summary}\nמקור: ${it.source?.name} ${it.source?.url}\nתאריך: ${it.date}\n${pg.primary.length ? `קישורים למקורות ראשוניים שמופיעים בכתבה: ${pg.primary.join(' ')}\n` : ''}${r.note ? `הערה של יקיר: ${r.note}\n` : ''}${fixes ? `תיקונים שיקיר ביקש לגרסה הקודמת:\n${fixes}\n${r.post?.post ? `הגרסה הקודמת:\n${r.post.post}\n` : ''}` : ''}\nהחומר מהמקור:\n${pg.text || '(לא הצלחנו לקרוא את העמוד; כתוב רק מהכותרת והתקציר, בזהירות)'}`;
  let o: Any = null, issues: string[] = [];
  for (let k = 0; k < 2; k++) {
    const d = await claude({ model: writer(), max_tokens: 6000, system: POST_SYS, messages: [{ role: 'user', content: k ? `${user}\n\nהטיוטה הקודמת נפסלה: ${issues.join(', ')}. כתוב מחדש לפי הכללים.` : user }] });
    o = jsonOf(textOf(d));
    for (const key of ['kicker', 'hero', 'heroLabel', 'hook', 'sub', 'post', 'sourceName']) o[key] = clean(o[key]);
    o.post = String(o.post).replace(/\n{3,}/g, '\n\n');
    o.items = (o.items || []).map(clean).filter(Boolean).slice(0, 3);
    o.headline = o.hook;
    issues = badIn([o.kicker, o.hero, o.heroLabel, o.hook, o.sub, o.post, ...o.items].join(' '));
    if (/לפי (?:ה)?דיווח|לפי (?:ה)?פרסום|כפי שדווח/.test(o.post)) issues.push('"לפי הדיווח"');
    if (!o.hook || !o.post) issues.push('חסר טקסט');
    if (!issues.length) break;
  }
  if (issues.length) throw new Error('הטקסט לא עבר את הבדיקה: ' + issues.join(', '));
  const srcUrl = /^https?:\/\//.test(String(o.sourceUrl || '')) && !NO_NWS.test(o.sourceUrl) ? o.sourceUrl : it.source?.url;
  // the hashtag lines go to the very end, after the source, the contact line and the disclaimer
  const tagLines = o.post.split('\n').filter((l: string) => /^\s*(#\S+\s*)+$/.test(l));
  const body = o.post.split('\n').filter((l: string) => !/^\s*(#\S+\s*)+$/.test(l)).join('\n').trim();
  // the source line: the primary body; when the link is a news report of it, say where it was published
  const isPrimary = /(^https?:\/\/([a-z0-9-]+\.)*(gov\.il|muni\.il|knesset\.gov\.il|boi\.org\.il|cbs\.gov\.il)\/)/i.test(String(srcUrl || ''));
  const outlet = String(it.source?.name || '').split(',')[0].trim();
  const srcLine = `${o.sourceName || outlet}${!isPrimary && outlet && o.sourceName && !o.sourceName.includes(outlet) ? `, כפי שפורסם ב-${outlet}` : ''}`;
  const text = `${body}\n\nמקור: ${srcLine}${srcUrl ? ` ${srcUrl}` : ''}\n\n${CONTACT}\n${DISCLAIMER}${tagLines.length ? `\n\n${tagLines.join(' ').trim()}` : ''}`;
  const v = Number(r.v || 0) + 1;
  // the template: as the writer chose, but never the same one three posts in a row; the photo: one of its subject not used lately
  const { data: last } = await db().select('data').eq('coll', 'updreq').eq('data->>kind', 'post').neq('id', id).order('updated_at', { ascending: false }).limit(8);
  const lastTpl = (last || []).map((x: Any) => x.data?.post?.tpl).filter(Boolean);
  const usedPh = new Set((last || []).map((x: Any) => x.data?.post?.photoId).filter(Boolean));
  const can: Record<string, boolean> = { number: !!o.hero, split: true, question: true, list: o.items.length >= 3 };
  let tpl: Tpl = (['number', 'question', 'split', 'list'].includes(o.tpl) && can[o.tpl]) ? o.tpl : (o.hero ? 'number' : 'question');
  if (lastTpl[0] === tpl && lastTpl[1] === tpl) tpl = (['number', 'split', 'list', 'question'] as Tpl[]).find(t => t !== tpl && can[t]) || tpl;
  const pool = PHOTOS[o.photo] || PHOTOS.home;
  const photoId = pool.find(p => !usedPh.has(p)) || pool[Math.floor(Math.random() * pool.length)];
  const pr = await fetch(photoUrl(photoId, 1350), { signal: AbortSignal.timeout(20000) });
  if (!pr.ok) throw new Error('photo ' + pr.status);
  const photoBytes = new Uint8Array(await pr.arrayBuffer());
  const card: Card = { tpl, kicker: o.kicker, hero: o.hero, heroLabel: o.heroLabel, hook: o.hook, sub: o.sub, items: o.items, photo: photoId };
  const png = await renderCard(card, 1350, photoBytes);
  const pr2 = await fetch(photoUrl(photoId, 1080), { signal: AbortSignal.timeout(20000) }).catch(() => null);
  const sq = pr2 && pr2.ok ? await renderCard(card, 1080, new Uint8Array(await pr2.arrayBuffer())) : null;
  const path = `upd/${id}-v${v}.png`;
  const up = await admin().storage.from('pv').upload(path, png, { contentType: 'image/png', upsert: true });
  if (up.error) throw new Error('image upload: ' + up.error.message);
  if (sq) await admin().storage.from('pv').upload(`upd/${id}-v${v}-sq.png`, sq, { contentType: 'image/png', upsert: true });
  o.tpl = tpl; o.photoId = photoId;
  const img = `${env('SUPABASE_URL')}/storage/v1/object/public/pv/${path}`;
  const t = r.tok || tok();
  await merge('updreq', id, { status: dry ? 'dry' : 'awaiting', v, tok: t, post: { ...o, text, img, imgSq: sq ? `${env('SUPABASE_URL')}/storage/v1/object/public/pv/upd/${id}-v${v}-sq.png` : '', sourceUrl: srcUrl }, sentAt: new Date().toISOString(), error: '' });
  if (dry) return { dry: true, img, tpl: o.tpl };
  return await sendPost(id, t, o.headline, text, img);
}
// the Telegram approval of a prepared post (photo with the buttons; the full text again when it is longer than a caption)
async function sendPost(id: string, t: string, headline: string, text: string, img: string) {
  const o = { headline };
  const cap = `📝 פוסט לאישור (פייסבוק, אינסטגרם, לינקדאין ו-X)\n${o.headline}\n\n${text}`;
  const sent = await tgApi('sendPhoto', { photo: img, caption: cap.length > 1000 ? cap.slice(0, 990) + '…' : cap, reply_markup: { inline_keyboard: buttons(t) } });
  let tgOk = !!sent?.ok;
  if (!tgOk) tgOk = !!(await tg(`📝 פוסט לאישור: ${o.headline}\n${img}\n\n${text}`, buttons(t)))?.ok;
  else if (cap.length > 1000) await tg(`הטקסט המלא של הפוסט:\n\n${text}`);
  await merge('updreq', id, { tgOk, tgMsg: sent?.result?.message_id || null });
  await merge('updreq', id, { status: 'awaiting' });
  return { post: o.headline, img };
}

// ---------- ARTICLE ----------
const ART_NEUTRAL = ['gov.il', 'knesset.gov.il', 'court.gov.il', 'boi.org.il', 'cbs.gov.il', 'kolzchut.org.il', 'wikipedia.org', 'wikisource.org', 'globes.co.il', 'calcalist.co.il', 'themarker.com', 'ynet.co.il', 'nadlancenter.co.il', 'bizportal.co.il'];
async function research(id: string, r: Any) {
  const it = r.item || {};
  const sys = `אתה חוקר משפטי במשרד עורכי דין למקרקעין. אסוף עובדות מדויקות לכתיבת מאמר ניתוח על העדכון: מה נקבע או השתנה, מי הצדדים או הגוף, תאריכים, סעיפי חוק רלוונטיים, ההלכה או הכלל שקדם, ומה המשמעות המעשית. רק ממקורות שקראת. לא אתרים של עורכי דין.
פורמט לכל עובדה:
FACT
עובדה: (משפט אחד או שניים)
END`;
  const content = await searchRun(CHEAP, sys, `העדכון: ${it.title}\n${it.summary}\nהמקור: ${it.source?.name} ${it.source?.url}\n${r.note ? `הערה של יקיר: ${r.note}\n` : ''}חפש את המקור הראשוני (פסק הדין, ההחלטה, החוק) ומקורות רקע, ותן 6 עד 14 עובדות.`, ART_NEUTRAL, 6, 5000);
  const facts = citedBlocks(content, 'FACT').map(({ field, cites }) => ({ fact: field('עובדה'), url: cites[0].url, title: cites[0].title, quote: cites[0].quote.slice(0, 300) })).filter(f => f.fact);
  if (facts.length < 3) throw new Error('נמצאו מעט מדי עובדות עם מקור');
  await merge('updreq', id, { status: 'write', facts, researchAt: new Date().toISOString(), lockAt: '' });
  return { facts: facts.length };
}
async function siteLinks() {
  const out: string[] = [];
  for (const kind of ['posts', 'pages']) for (let page = 1; page <= 4; page++) {
    const r = await fetch(`${SITE}/wp-json/wp/v2/${kind}?per_page=100&page=${page}&_fields=title,link`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; DabulOffice/1.0)' } }).catch(() => null);
    if (!r || !r.ok) break;
    const a = await r.json().catch(() => []);
    a.forEach((x: Any) => out.push(`${String(x.title?.rendered || '').replace(/&#8211;/g, '-').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, '')} | ${x.link}`));
    if (a.length < 100) break;
  }
  return out;
}
const basic = (u: string, p: string) => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode(`${u}:${p.replace(/\s+/g, '')}`)));
// 31.10.2026 (first live test): one synchronous call that writes 1,800+ words hit the edge gateway limit (504 after 150s) and
// nothing was saved. The write now goes through Anthropic's Message Batches API: one tick submits the request (batchId on the
// updreq doc) and the next ticks poll it; when it has ended, the text is checked, saved as a WP draft and sent to Yakir as before.
// Batches have no time limit on our side and cost half. The dry run (artdry) still calls the model directly.
function aiHdr() {
  const h: Record<string, string> = { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (env('ANTHROPIC_WORKSPACE_ID')) h['anthropic-workspace-id'] = env('ANTHROPIC_WORKSPACE_ID');
  return h;
}
async function batchSubmit(id: string, params: Any) {
  const r = await fetch('https://api.anthropic.com/v1/messages/batches', { method: 'POST', headers: aiHdr(), body: JSON.stringify({ requests: [{ custom_id: id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64), params }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error(`batch ${r.status}: ${String(j?.error?.message || '').slice(0, 160)}`);
  return String(j.id);
}
// null while the batch is still running; the message when it has ended; throws when the request failed
async function batchResult(batchId: string, model: string): Promise<Any | null> {
  const r = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, { headers: aiHdr() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`batch status ${r.status}`);
  if (j.processing_status !== 'ended') return null;
  if (!j.results_url) throw new Error('batch ended without results');
  const rr = await fetch(j.results_url, { headers: aiHdr() });
  const line = (await rr.text()).split('\n').map((x) => x.trim()).filter(Boolean)[0];
  const res = line ? JSON.parse(line).result : null;
  if (!res || res.type !== 'succeeded') throw new Error(`batch request ${res?.type || 'missing'}${res?.error?.error?.message ? ': ' + String(res.error.error.message).slice(0, 120) : ''}`);
  const msg = res.message, u = msg.usage || {};
  // batches are billed at half the list price
  await admin().rpc('ai_cost_add', { p_fn: 'upd', p_model: model, p_in: Math.round((Number(u.input_tokens || 0) + Number(u.cache_read_input_tokens || 0) + Number(u.cache_creation_input_tokens || 0)) / 2), p_out: Math.round(Number(u.output_tokens || 0) / 2) }).then(() => null, () => null);
  return msg;
}
async function writeArticle(id: string, r: Any, dry = false) {
  const it = r.item || {};
  // a submitted batch is polled first, without rebuilding the prompt (that reads the whole site index)
  let d: Any = null;
  if (!dry && r.batchId) {
    d = await batchResult(r.batchId, r.batchModel || writer());
    if (!d) {
      if (Date.now() - Date.parse(r.batchAt || '') > 3 * 3600e3) { await merge('updreq', id, { batchId: '', lockAt: '' }); throw new Error('הכתיבה לקחה יותר משלוש שעות, מנסה שוב'); }
      await merge('updreq', id, { lockAt: '' });
      return { waiting: r.batchId };
    }
  }
  const [wr, ex, links] = await Promise.all([getDoc('artcfg', 'writer'), getDoc('artcfg', 'exemplar'), d ? Promise.resolve([] as string[]) : siteLinks()]);
  const facts = (r.facts || []).map((f: Any, i: number) => `[${i + 1}] ${f.fact} (מקור: ${f.title} ${f.url})`).join('\n');
  const fixes = (r.fixes || []).map((f: Any) => `- ${f.note}`).join('\n');
  const sys = `אתה כותב מאמרי ניתוח לאתר dabullaw.co.il של "יקיר דבול - משרד עורכי דין". המאמר מנתח עדכון (פסק דין, החלטה או שינוי חקיקה) ומסביר לקוראים מה המשמעות עבורם.
${wr?.rules || ''}
${wr?.format || ''}
${wr?.template || ''}
${wr?.linkRules || ''}
כללים נוספים:
- כל עובדה משפטית רק מרשימת העובדות שקיבלת, עם הפניה [n] למקור שלה ורשימת מקורות בסוף כמו במאמר הדוגמה. אסור להמציא פסקי דין, סעיפים, סכומים או תאריכים.
- לא מזכירים את nws או "חדשות נתניה והשרון", ולא משרדי עורכי דין אחרים.
- מבנה ה-HTML, המחלקות (lvbl-...), שאלות ותשובות (בדיוק 5, lvbl-faq-item), סכמת JSON-LD, ורצועת הטלפון (tel:09-8613413) בדיוק כמו במאמר הדוגמה. 1,800 מילים לפחות.
- קישורים פנימיים: 3 עד 5, רק מרשימת עמודי האתר שקיבלת, כל כתובת פעם אחת.
פורמט התשובה, בדיוק כך:
<meta>{"title":"","slug":"באנגלית-עם-מקפים","keyword":"","metaTitle":"עד 60 תווים","metaDescription":"140 עד 155 תווים","excerpt":"","coverAlt":"","coverTitle":"","coverKicker":""}</meta>
<html>...כל המאמר...</html>`;
  const user = `העדכון: ${it.title}\n${it.summary}\nהמקור: ${it.source?.name} ${it.source?.url}\nתאריך: ${it.date}\n${r.note ? `הערה של יקיר: ${r.note}\n` : ''}${fixes ? `תיקונים שיקיר ביקש:\n${fixes}\n` : ''}\nהעובדות (עם מקורות):\n${facts}\n\nעמודי האתר לקישור פנימי (כותרת | כתובת):\n${links.slice(0, 400).join('\n')}\n\nמאמר הדוגמה (מבנה וסגנון בלבד, לא תוכן):\n${String(ex?.body || '').slice(0, 14000)}`;
  // 48k: the model thinks first (13.5k thinking tokens in the first live test cut the article at 20k)
  const params = { model: r.batchModel || writer(), max_tokens: 48000, system: sys, messages: [{ role: 'user', content: user }] };
  if (dry) d = await claude(params);
  else if (!d) {
    const batchId = await batchSubmit(id, params);
    await merge('updreq', id, { batchId, batchModel: params.model, batchAt: new Date().toISOString(), lockAt: '' });
    return { batch: batchId };
  }
  const t = textOf(d);
  const meta = JSON.parse((t.match(/<meta>([\s\S]*?)<\/meta>/) || [])[1] || '{}');
  let html = ((t.match(/<html>([\s\S]*)<\/html>/) || [])[1] || '').trim();
  html = html.replace(/\s*[—–]\s*/g, ' - ');
  for (const k of Object.keys(meta)) if (typeof meta[k] === 'string') meta[k] = clean(meta[k]);
  meta.slug = String(meta.slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const plain = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const words = plain.split(/\s+/).filter(Boolean).length;
  const issues = badIn(plain + ' ' + JSON.stringify(meta));
  if (d.stop_reason === 'max_tokens') issues.push('התשובה נחתכה');
  if (!meta.title || !html.includes('lvbl-article')) issues.push('מבנה חסר');
  if ((html.match(/lvbl-faq-item/g) || []).length !== 5) issues.push('צריך בדיוק 5 שאלות');
  if (words < 1200) issues.push(`קצר מדי (${words} מילים)`);
  if (dry) return { meta, words, issues, stop: d.stop_reason, html: html.slice(0, 1500) };
  if (issues.length) {
    const tries = Number(r.writeTries || 0) + 1;
    if (tries >= 2) throw new Error('המאמר לא עבר את הבדיקה: ' + issues.join(', '));
    await merge('updreq', id, { status: 'write', writeTries: tries, lastIssues: issues, batchId: '', lockAt: '' });
    return { retry: issues };
  }
  // a hidden draft on the site for the preview (nothing is published here)
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  const pr = await fetch(`${SITE}/wp-json/wp/v2/posts${r.article?.wpId ? '/' + r.article.wpId : ''}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ title: meta.title, status: 'draft', content: `${ex ? ex.style : ''}\n${html}`, categories: [1, 10] }) });
  const p: Any = await pr.json().catch(() => ({}));
  if (!pr.ok || !p.id) throw new Error(`טיוטה באתר נכשלה (${pr.status})`);
  const preview = `${SITE}/?p=${p.id}&preview=true`;
  const tk = r.tok || tok();
  await merge('updreq', id, { status: 'awaiting', tok: tk, v: Number(r.v || 0) + 1, writeTries: 0, batchId: '', article: { meta, html, words, wpId: p.id, preview }, sentAt: new Date().toISOString(), error: '' });
  await tg(`📰 מאמר לאישור\n\n${meta.title}\n${words} מילים · נכתב מ-${(r.facts || []).length} עובדות עם מקורות\nהעדכון: ${it.title}\n\nשום דבר לא עולה לאתר עד שתאשר. באישור הוא עובר את הבדיקה האוטומטית ועולה מחר ב-06:05.`,
    [[{ text: '👁 תצוגה מקדימה', url: preview }], ...buttons(tk)]);
  return { article: meta.title, words };
}

// ---------- after approval ----------
async function followUp() {
  const { data } = await db().select('id,data').eq('coll', 'updreq').eq('data->>status', 'approved').limit(10);
  const out: Any[] = [];
  for (const row of data || []) {
    const r = row.data;
    if (r.kind === 'post') {
      const p = await getDoc('pub', `pub-upd-${row.id}`); if (!p) continue;
      const res = p.result || {}; const ch = (p.channels || []) as string[];
      const done = ch.filter(c => res[c]?.ok); const failed = ch.filter(c => res[c] && res[c].ok === false && !res[c].pending);
      if (done.length === ch.length) {
        await merge('updreq', row.id, { status: 'published', publishedAt: new Date().toISOString(), links: Object.fromEntries(done.map(c => [c, res[c].url || ''])) });
        await tg(`✅ הפוסט עלה: ${r.post?.headline}\n${done.map(c => `${({ facebook: 'פייסבוק', instagram: 'אינסטגרם', linkedin: 'לינקדאין', x: 'X' } as Record<string, string>)[c] || c}: ${res[c].url || ''}`).join('\n')}`);
        out.push({ id: row.id, published: true });
      } else if (p.status === 'missed' || (failed.length && done.length + failed.length === ch.length)) {
        await merge('updreq', row.id, { status: 'failed', error: failed.map(c => `${c}: ${res[c]?.error || ''}`).join('; ') || 'לא פורסם' });
        await tg(`⚠️ הפוסט "${r.post?.headline}" לא עלה לכל הרשתות. ${failed.map(c => `${c}: ${res[c]?.error || ''}`).join(' · ')}`);
      }
    } else if (r.kind === 'article') {
      const j = await getDoc('artjob', `aj-upd-${row.id}`); if (!j) continue;
      if (j.status === 'scheduled') { await merge('updreq', row.id, { status: 'scheduled', publishAt: j.publishAt, wpLink: j.wpLink || '' }); out.push({ id: row.id, scheduled: j.publishAt }); }
      else if (j.status === 'held') { await merge('updreq', row.id, { status: 'held', error: (j.issues || []).join('; ') }); }
    }
  }
  return out;
}

async function work() {
  const { data } = await db().select('id,data').eq('coll', 'updreq').in('data->>status', ['queued', 'write']).limit(20);
  const rows = (data || []).sort((a: Any, b: Any) => String(a.data.created || '').localeCompare(String(b.data.created || '')));
  const res: Any[] = [];
  for (const row of rows.slice(0, 2)) {
    const r = row.data;
    if (r.lockAt && Date.now() - Date.parse(r.lockAt) < 9 * 60e3) continue;
    await merge('updreq', row.id, { lockAt: new Date().toISOString() });
    try {
      if (r.kind === 'post') res.push({ id: row.id, ...(await makePost(row.id, r)) });
      else if (r.kind === 'article') res.push({ id: row.id, ...(r.status === 'queued' ? await research(row.id, r) : await writeArticle(row.id, r)) });
      else await merge('updreq', row.id, { status: 'failed', error: 'סוג בקשה לא מוכר' });
    } catch (e) {
      const msg = String((e as Error).message || e).slice(0, 300);
      const tries = Number(r.tries || 0) + 1;
      if (tries >= 3) { await merge('updreq', row.id, { status: 'failed', error: msg, tries }); await tg(`⚠️ לא הצלחתי להכין את ה${r.kind === 'post' ? 'פוסט' : 'מאמר'} על "${r.item?.title}": ${msg}`); }
      else await merge('updreq', row.id, { error: msg, tries, lockAt: '' });
      res.push({ id: row.id, error: msg });
    }
  }
  const fu = await followUp().catch((e) => [{ error: String(e) }]);
  return { done: res, followUp: fu };
}

// ---------- the approval page (from Telegram, through portal.html#u=<a>&t=<token>) ----------
function page(title: string, body: string) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#ecedf2;font-family:Heebo,Assistant,Arial,sans-serif;color:#1f2937;line-height:1.7}main{max-width:620px;margin:24px auto;padding:28px 20px;background:#fff;border:1px solid #e2e0da;border-radius:14px}
.top{color:#fff;background:#17253F;margin:-28px -20px 20px;padding:14px 20px;border-radius:14px 14px 0 0;border-bottom:3px solid #C6A03C;font-weight:700}h1{color:#17253F;font-size:1.35rem;margin:0 0 12px}
img{max-width:100%;border-radius:10px;display:block;margin:0 0 14px}pre{white-space:pre-wrap;font:inherit;background:#f6f4ee;border-radius:10px;padding:12px 14px;margin:0 0 14px}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}button{border:0;border-radius:10px;padding:13px 20px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit}
.ok{background:#C6A03C;color:#17253F}.fix{background:#17253F;color:#fff}.no{background:#e5e7eb;color:#374151}textarea{width:100%;box-sizing:border-box;min-height:110px;border:1px solid #d1d5db;border-radius:10px;padding:10px;font:inherit}
.msg{background:#eef6ee;border-radius:10px;padding:12px 14px;font-weight:700}.muted{color:#6b7280;font-size:.92rem}a{color:#0b5fcc}</style></head>
<body><main><div class="top">יקיר דבול - משרד עורכי דין · לוח עדכונים</div><h1>${esc(title)}</h1>${body}</main></body></html>`, { headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
}
async function byTok(t: string) {
  if (!/^[a-f0-9]{24,}$/.test(t)) return null;
  const { data } = await db().select('id,data').eq('coll', 'updreq').eq('data->>tok', t).limit(1);
  return data && data[0] ? data[0] : null;
}
const STATE_TXT: Record<string, string> = { approved: 'כבר אושר.', published: 'כבר פורסם.', scheduled: 'כבר אושר ותוזמן לאתר.', cancelled: 'בוטל.', queued: 'נשלח לתיקון ומוכן מחדש.', write: 'בכתיבה מחדש.', failed: 'נכשל.' };
async function viewPage(a: string, t: string) {
  const row = await byTok(t); if (!row) return page('הקישור לא תקף', '<p>הקישור לא תקף, או שהבקשה כבר טופלה.</p>');
  const r = row.data, isPost = r.kind === 'post';
  const fn = `${env('SUPABASE_URL')}/functions/v1/upd`;
  const what = isPost
    ? `<img src="${esc(r.post?.img)}" alt=""><pre>${esc(r.post?.text)}</pre><p class="muted">יעלה לפייסבוק, לאינסטגרם, ללינקדאין ול-X כמה דקות אחרי האישור.</p>`
    : `<p><b>${esc(r.article?.meta?.title)}</b><br><span class="muted">${esc(r.article?.words)} מילים</span></p><p><a href="${esc(r.article?.preview)}" target="_blank" rel="noopener">👁 פתיחת התצוגה המקדימה באתר</a></p><p class="muted">באישור, המאמר עובר את הבדיקה האוטומטית (כללי לשכה וקישורים) ועולה לאתר מחר ב-06:05.</p>`;
  if (r.status !== 'awaiting') return page(isPost ? 'פוסט מלוח העדכונים' : 'מאמר מלוח העדכונים', `${what}<p class="msg">${esc(STATE_TXT[r.status] || 'הבקשה לא ממתינה לאישור.')}</p>`);
  const body = `<p class="muted">העדכון: ${esc(r.item?.title)}</p>${what}
<div class="row"><button class="ok" data-do="ok">✅ מאשר</button><button class="fix" data-do="showfix">✏️ לתקן</button><button class="no" data-do="no">✗ לבטל</button></div>
<div id="fx" ${a === 'fix' ? '' : 'hidden'}><label for="nt"><b>מה לשנות?</b></label><textarea id="nt" placeholder="למשל: כותרת חדה יותר, להדגיש את מס השבח"></textarea><div class="row"><button class="fix" data-do="fix">שליחה לתיקון</button></div></div>
<div id="out"></div>
<script>(function(){var F=${JSON.stringify(fn)},T=${JSON.stringify(t)},out=document.getElementById('out');
${a === 'fix' ? "setTimeout(function(){var n=document.getElementById('nt');if(n)n.focus();},200);" : ''}
document.addEventListener('click',function(e){var b=e.target.closest('button[data-do]');if(!b)return;var d=b.getAttribute('data-do');
if(d==='showfix'){document.getElementById('fx').hidden=false;document.getElementById('nt').focus();return;}
var note=d==='fix'?document.getElementById('nt').value.trim():'';if(d==='fix'&&!note){alert('כתבו מה לשנות');return;}
document.querySelectorAll('button').forEach(function(x){x.disabled=true;});b.textContent='רגע...';
fetch(F+'?a='+d+'&t='+T,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note:note})}).then(function(r){return r.json();}).then(function(j){out.innerHTML='<p class="msg">'+(j.msg||'בוצע')+'</p>';document.querySelectorAll('.row').forEach(function(x){x.hidden=true;});document.getElementById('fx').hidden=true;}).catch(function(){out.innerHTML='<p class="msg">משהו השתבש. נסו שוב בעוד דקה.</p>';document.querySelectorAll('button').forEach(function(x){x.disabled=false;});});});})();</script>`;
  return page(isPost ? 'פוסט לאישור' : 'מאמר לאישור', body);
}
async function act(a: string, t: string, note: string) {
  const row = await byTok(t); if (!row) return { ok: false, msg: 'הקישור לא תקף, או שהבקשה כבר טופלה.' };
  const r = row.data, id = row.id, isPost = r.kind === 'post';
  if (r.status !== 'awaiting') return { ok: false, msg: STATE_TXT[r.status] || 'הבקשה לא ממתינה לאישור.' };
  const now = new Date().toISOString();
  if (a === 'no') {
    if (!isPost && r.article?.wpId) await fetch(`${SITE}/wp-json/wp/v2/posts/${r.article.wpId}`, { method: 'DELETE', headers: { authorization: basic(env('WP_USER'), env('WP_APP_PASSWORD')) } }).catch(() => null);
    await merge('updreq', id, { status: 'cancelled', cancelledAt: now });
    return { ok: true, msg: 'בוטל. שום דבר לא עלה.' };
  }
  if (a === 'fix') {
    const n = clean(note).slice(0, 600); if (!n) return { ok: false, msg: 'כתבו מה לשנות.' };
    await merge('updreq', id, { status: isPost ? 'queued' : 'write', fixes: [...(r.fixes || []), { note: n, at: now }], lockAt: '', tries: 0, writeTries: 0, batchId: '' });
    return { ok: true, msg: 'קיבלתי. מכין גרסה מתוקנת ושולח אליך שוב לאישור.' };
  }
  if (a === 'ok') {
    if (isPost) {
      const at = ilNowPlus(6);
      // 31.10.2026 (Yakir): the board's posts go to Facebook, Instagram, LinkedIn and X. X gets a short version of its own
      // (the opening paragraphs up to 270 characters, no hashtags), not the long text cut in the middle.
      const paras = String(r.post.text || '').replace(/(^|\s)#\S+/g, '').split(/\n\s*\n/).map((x: string) => x.trim()).filter(Boolean);
      let textX = '';
      for (const q of paras) { const t = textX ? `${textX}\n\n${q}` : q; if (t.length > 270) break; textX = t; }
      if (!textX) textX = (paras[0] || r.post.headline || '').slice(0, 268).replace(/\s+\S*$/, '') + '…';
      await merge('pub', `pub-upd-${id}`, { at, kind: 'image', channels: ['facebook', 'instagram', 'linkedin', 'x'], owner: 'office', status: 'planned', series: 'upd', title: `לוח עדכונים: ${r.post.headline}`,
        text: r.post.text, textX, media: [r.post.img], created: now, note: 'מלוח העדכונים במערכת, יקיר אישר בטלגרם' });
      await merge('updreq', id, { status: 'approved', approvedAt: now, pubId: `pub-upd-${id}`, pubAt: at });
      return { ok: true, msg: `אושר. הפוסט יעלה לפייסבוק, לאינסטגרם, ללינקדאין ול-X ב-${at.slice(11)}, ותקבל הודעה עם הקישורים.` };
    }
    const m = r.article;
    await merge('artjob', `aj-upd-${id}`, { status: 'written', mode: 'new', source: 'upd', updReq: id, meta: m.meta, html: m.html, wpId: m.wpId, categories: [1, 10], writer: 'upd', created: now, topic: r.item?.title });
    await merge('updreq', id, { status: 'approved', approvedAt: now, artjob: `aj-upd-${id}` });
    return { ok: true, msg: 'אושר. המאמר עובר עכשיו בדיקה אוטומטית ויעלה לאתר מחר ב-06:05. תקבל הודעה עם כפתור עצירה.' };
  }
  return { ok: false, msg: 'פעולה לא מוכרת' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  const a = String(url.searchParams.get('a') || '').replace(/[^a-z]/g, ''), t = String(url.searchParams.get('t') || '').replace(/[^a-f0-9]/g, '');
  try {
    if (a && req.method === 'GET') return await viewPage(a, t);
    if (a && req.method === 'POST') { const b = await req.json().catch(() => ({})); return json(await act(a, t, String(b.note || ''))); }
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    await setup();
    const b: Any = await req.json().catch(() => ({}));
    if (b.action === 'feed') return json({ ok: true, ...(await feed(b)) });
    if (b.action === 'work') return json({ ok: true, ...(await work()) });
    if (b.action === 'imgtest') {
      const card: Card = { tpl: b.tpl || 'number', kicker: b.kicker || 'מיסוי מקרקעין', hero: b.hero || '8%', heroLabel: b.heroLabel || '', hook: b.hook || 'בדיקת תמונה לפוסט', sub: b.sub || '', items: b.items || [], photo: '' };
      const pid = (PHOTOS[b.photo] || PHOTOS.home)[0];
      const H = b.h === 1080 ? 1080 : 1350;
      const png = await renderCard(card, H, new Uint8Array(await (await fetch(photoUrl(pid, H))).arrayBuffer()));
      const up = await admin().storage.from('pv').upload('upd/_test.png', png, { contentType: 'image/png', upsert: true });
      return json({ ok: !up.error, error: up.error?.message, size: png.length });
    }
    if (b.action === 'postdry') { const r = await getDoc('updreq', String(b.id)); return json({ ok: true, ...(await makePost(String(b.id), r, true)) }); }
    if (b.action === 'postsend') { const r = await getDoc('updreq', String(b.id)); if (r?.status !== 'dry') return json({ ok: false, error: 'not a prepared post' }); return json({ ok: true, ...(await sendPost(String(b.id), r.tok, r.post.headline, r.post.text, r.post.img)) }); }
    if (b.action === 'sweepdebug') return json({ ok: true, res: await sweep(b.kind === 'news' ? 'news' : 'gov', true) });
    if (b.action === 'artdry') { const r = await getDoc('updreq', String(b.id)); return json({ ok: true, ...(await writeArticle(String(b.id), r, true)) }); }
    return json({ error: 'action?' }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
