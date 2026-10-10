// newsdigest: the monthly summary of real-estate news and rulings (Yakir, 10.10.2026: "סיכום חודשי, שיצטט לי את המקור
// ולא יעלה לפני שאני מאשר"). Nothing is published from here, ever: the result waits in the office system for Yakir.
// How: one Claude API call per topic, with Anthropic's web search. Every item keeps the source the model actually read:
// the link and the exact sentence come from the API's citations (text copied from the page), not from the model's words.
// An item with no citation is dropped.
// POST ?step=topic&t=<tax|rulings|law|market>[&month=YYYY-MM]   one topic (cron runs them a few minutes apart)
// POST ?step=finish[&month=YYYY-MM]                                 puts the topics together and sends one Telegram message
// Storage: docs coll 'digest', id 'dg-YYYY-MM': {month, status, t_<topic>:{items,at,cost}, items, cost}
import { createClient } from 'jsr:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const J = (d: Any, s = 200) => Response.json(d, { status: s });
let S: Record<string, string> = {};
async function secrets() { const { data } = await sb.from('app_secrets').select('k,v').in('k', ['ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID', 'CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']); S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])); }
const get = async (id: string) => { const { data } = await sb.from('docs').select('data').match({ coll: 'digest', id }).maybeSingle(); return data ? data.data : null; };
const merge = (id: string, patch: Any) => sb.rpc('docs_merge', { p_coll: 'digest', p_id: id, p_patch: patch });
async function tg(text: string) { if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return; await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: text.slice(0, 3900), disable_web_page_preview: true }) }).catch(() => null); }

// the month that just ended (Israel time), unless one is given
function lastMonth(): string { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); }
const HE_MONTH = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const monthName = (m: string) => `${HE_MONTH[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;

const TOPICS: Record<string, { name: string; ask: string; domains?: string[] }> = {
  tax: { name: 'מיסוי מקרקעין', ask: 'שינויים במיסוי מקרקעין בישראל: מס רכישה, מס שבח, היטל השבחה, החלטות מיסוי וחוזרים של רשות המסים, ופסקי דין של ועדות ערר או בתי משפט בנושא.' },
  rulings: { name: 'פסיקה', ask: 'פסקי דין חשובים בישראל בעסקאות דירה ונדל"ן: הסכמי מכר, זיכרון דברים, הפרת חוזה, בתים משותפים, התחדשות עירונית (פינוי בינוי ותמ"א), ירושה במקרקעין ופירוק שיתוף.' },
  law: { name: 'חקיקה ונהלים', ask: 'חקיקה, תקנות ונהלים חדשים בישראל שנוגעים לקונים ולמוכרים של דירות: חוק המקרקעין, חוק המכר (דירות), רשם המקרקעין (טאבו), רשות מקרקעי ישראל, דירה בהנחה, התחדשות עירונית.' },
  market: { name: 'שוק ונתניה', ask: 'נתונים והחלטות שמשפיעים על קונים ומוכרים בשרון ובנתניה: מדד מחירי הדירות של הלמ"ס, ריבית בנק ישראל ומשכנתאות, והחלטות של הוועדה המקומית נתניה על פינוי בינוי והתחדשות עירונית.' },
};

const SYSTEM = `אתה עוזר מחקר במשרד עורכי דין לנדל"ן בנתניה. המשימה: למצוא ברשת עדכונים אמיתיים מחודש מסוים, ולסכם אותם בעברית פשוטה ללקוחות (קונים ומוכרים של דירות).
כללים:
- רק עדכונים שפורסמו בחודש המבוקש, ורק ממקורות אמינים: אתרי ממשלה (gov.il), בתי המשפט, הכנסת, הלמ"ס, בנק ישראל, עיריית נתניה, ועיתונות כלכלית מוכרת (גלובס, כלכליסט, דה מרקר, ynet, מרכז הנדל"ן, ביזפורטל). לא אתרים של משרדי עורכי דין.
- כל טענה עובדתית חייבת להישען על מקור שקראת בחיפוש. אם לא מצאת מקור, אל תכתוב אותה. אל תנחש תאריכים, מספרים או שמות.
- בין 2 ל־4 עדכונים. אם לא מצאת עדכון אמיתי מהחודש, כתוב רק: אין עדכונים.
- בלי מקפים ארוכים. בלי לשון הפלגה. בלי הבטחות.
פורמט התשובה הסופית, בדיוק כך, לכל עדכון:
ITEM
כותרת: (עד 12 מילים)
תאריך: (YYYY-MM-DD, כפי שמופיע במקור)
מה קרה: (2 עד 3 משפטים)
מה זה אומר לקונים ולמוכרים: (משפט או שניים)
END`;

// deno-lint-ignore no-explicit-any
async function claude(body: any): Promise<any> {
  const models = ['claude-sonnet-5-5', 'claude-sonnet-4-5'];
  let last = '';
  for (const model of models) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}), body: JSON.stringify(Object.assign({ model }, body)) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) return Object.assign(d, { _model: model });
    last = `${r.status} ${d?.error?.message || ''}`;
    if (r.status !== 404 && !/model/i.test(last)) break;
  }
  throw new Error('Claude API: ' + last);
}

// joins the answer's text blocks and remembers which citations sit in which part of the text
// deno-lint-ignore no-explicit-any
function parse(content: any[]) {
  let text = ''; const marks: { at: number; url: string; title: string; quote: string }[] = [];
  for (const b of content || []) if (b.type === 'text') {
    for (const c of b.citations || []) if (c.url && c.cited_text) marks.push({ at: text.length, url: c.url, title: c.title || '', quote: String(c.cited_text).trim() });
    text += b.text;
  }
  const items: Any[] = []; const re = /ITEM([\s\S]*?)END/g; let m;
  while ((m = re.exec(text))) {
    const start = m.index, end = m.index + m[0].length, body = m[1];
    const field = (k: string) => { const x = body.match(new RegExp(k + '\\s*:\\s*([^\\n]+(?:\\n(?!\\S+[^\\n]*:)[^\\n]+)*)')); return x ? x[1].trim() : ''; };
    const cites = marks.filter(c => c.at >= start && c.at <= end);
    if (!cites.length) continue; // no source the model really read: the item is dropped
    const src = cites[0];
    const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ' - ').trim();
    items.push({ title: clean(field('כותרת')), date: field('תאריך').slice(0, 10), what: clean(field('מה קרה')), why: clean(field('מה זה אומר לקונים ולמוכרים')),
      url: src.url, source: src.title, quote: src.quote.slice(0, 400), more: [...new Set(cites.slice(1).map(c => c.url))].filter(u => u !== src.url).slice(0, 3) });
  }
  return { text, items };
}

async function topic(t: string, month: string) {
  const T = TOPICS[t]; if (!T) return { error: 'topic?' };
  const id = 'dg-' + month;
  if (!(await get(id))) await merge(id, { month, status: 'collecting', created: new Date().toISOString() });
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  const messages: Any[] = [{ role: 'user', content: `החודש: ${monthName(month)} (${month}).\nהנושא: ${T.ask}\nחפש, קרא את המקורות, ותן את התשובה בפורמט שנקבע.` }];
  let d: Any = null, content: Any[] = [], inTok = 0, outTok = 0, searches = 0;
  // a long search can pause the turn; it is resumed (at most twice) by sending the answer so far back
  for (let round = 0; round < 3; round++) {
    d = await claude({ max_tokens: 3000, system: SYSTEM, tools, messages });
    content = content.concat(d.content || []);
    inTok += d.usage?.input_tokens || 0; outTok += d.usage?.output_tokens || 0; searches += d.usage?.server_tool_use?.web_search_requests || 0;
    if (d.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: d.content });
  }
  const { items } = parse(content);
  const cost = +((inTok * 3 + outTok * 15) / 1e6 + searches * 0.01).toFixed(3);
  await merge(id, { ['t_' + t]: { name: T.name, items: items.map(x => Object.assign(x, { topic: T.name })), at: new Date().toISOString(), cost, searches, model: d._model } });
  return { topic: t, items: items.length, cost, searches };
}

async function finish(month: string) {
  const id = 'dg-' + month, dg = await get(id);
  if (!dg) return { error: 'nothing collected' };
  const all: Any[] = []; let cost = 0;
  for (const k of Object.keys(TOPICS)) { const x = dg['t_' + k]; if (!x) continue; cost += x.cost || 0; (x.items || []).forEach((it: Any) => all.push(it)); }
  // the same link twice (two topics found the same story): keep one
  const seen = new Set<string>(); const items = all.filter(it => (seen.has(it.url) ? false : (seen.add(it.url), true)))
    .map((it, i) => Object.assign(it, { id: `${month}-${i + 1}`, status: 'pending' }));
  await merge(id, { status: 'pending', items, cost: +cost.toFixed(3), readyAt: new Date().toISOString() });
  const lines = items.map((it, i) => `${i + 1}. ${it.title}\n   ${it.topic} · ${it.date || ''}\n   מקור: ${it.url}`).join('\n\n');
  await tg(`🗞 הסיכום החודשי של ${monthName(month)} מוכן לאישורך\n\n${items.length ? lines : 'לא נמצאו החודש עדכונים עם מקור מאומת.'}\n\nלכל פריט יש קישור למקור וציטוט מדויק מתוכו. שום דבר לא פורסם. מה שתאשר יהפוך לטיוטות (מאמר, פוסט, ניוזלטר) ביומן התוכן.\nעלות החודש: כ־${cost.toFixed(2)} $`);
  return { items: items.length, cost };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ error: 'unauthorized' }, 401);
  if (!S.ANTHROPIC_API_KEY) return J({ error: 'no ANTHROPIC_API_KEY' }, 500);
  const url = new URL(req.url), step = url.searchParams.get('step');
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month')! : lastMonth();
  try {
    if (step === 'topic') return J(await topic(url.searchParams.get('t') || '', month));
    if (step === 'finish') return J(await finish(month));
    return J({ error: 'step?' }, 400);
  } catch (e) {
    const msg = String((e as Error).message || e).slice(0, 300);
    console.error('newsdigest', msg);
    try { await merge('dg-' + month, { lastError: msg, lastErrorAt: new Date().toISOString() }); } catch (_) { /* nothing more to do */ }
    if (step === 'finish') await tg('⚠️ הסיכום החודשי נתקע: ' + msg);
    return J({ ok: false, error: msg }, 500);
  }
});
