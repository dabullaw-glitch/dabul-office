// fin (16.11.2026, Yakir: "מערכת מסודרת שאוספת את כל הקבלות וההוצאות ... ולוקחת גם את כל ההכנסות שלי מהמורנינג ...
// ואז אומר לי כמה מעמ ומס הכנסה אני צריך לשלם כל חודשיים"). Shown in the office system under "כספים".
//
// Income: tax documents he issues in Morning (305 חשבונית מס, 320 חשבונית מס קבלה, 330 חשבונית זיכוי), synced daily
//   into docs coll "fininc" (id m-<morning id>). Proformas (300) and plain receipts (400) are not counted (no VAT).
// Expenses: docs coll "finexp". They arrive from:
//   - the office app (photo / PDF uploaded to storage, then action "ingest" with the path),
//   - the Telegram bot (inbound forwards files whose caption starts with קבלה / הוצאה / חשבונית, action "ingest" with url),
//   - his two Gmail boxes through a small Google Apps Script in each box (action "mail", authorised by FIN_MAIL_KEY).
//   Every file is read by Claude: vendor, date, total, VAT, category, and whether it is clearly a business expense.
// VAT is bimonthly (Jan-Feb, Mar-Apr ...): VAT on income minus deductible VAT on business expenses (category share,
//   e.g. 2/3 for phone and car). Income tax advance = settings fin.advPct % of income before VAT.
// Cron (x-cron-secret): "daily" = Morning sync + a Telegram reminder 5 days before the 15th of the month after a period.
// Settings: docs settings/fin {advPct, lastSync, lastErr, remindedFor}.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const S: Record<string, string> = {};
let sAt = 0;
const env = (k: string) => Deno.env.get(k) || S[k] || '';
let _sb: Any = null;
const sb = () => _sb || (_sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }));
async function secrets(force = false) {
  if (!force && Date.now() - sAt < 60_000) return;
  const { data } = await sb().from('app_secrets').select('k,v');
  (data || []).forEach((r: { k: string; v: string }) => { S[r.k] = r.v; });
  sAt = Date.now();
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
const merge = async (coll: string, id: string, patch: Any) => { const { error } = await sb().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch }); if (error) throw new Error(error.message); };
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await sb().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const ilDay = (d = new Date()) => new Date(d.getTime() + 2 * 3600e3).toISOString().slice(0, 10);
const uid = (p: string) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function tg(text: string) {
  const t = env('TELEGRAM_BOT_TOKEN'), c = env('TELEGRAM_CHAT_ID'); if (!t || !c) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: c, text: text.slice(0, 3900), disable_web_page_preview: true }) }).catch(() => null);
}

// ---------- auth ----------
async function allowed(req: Request, b: Any) {
  if (req.headers.get('x-cron-secret') && req.headers.get('x-cron-secret') === env('CRON_SECRET')) return 'cron';
  if (b && b.action === 'mail' && env('FIN_MAIL_KEY') && b.key === env('FIN_MAIL_KEY')) return 'mail';
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''); if (!jwt) return '';
  const { data } = await sb().auth.getUser(jwt); const email = (data && data.user && data.user.email || '').toLowerCase(); if (!email) return '';
  const { data: u } = await sb().from('office_users').select('email').ilike('email', email).limit(1);
  return u && u.length ? email : '';
}

// ---------- periods ----------
export const periodOf = (date: string) => { const y = +date.slice(0, 4), m = +date.slice(5, 7); return `${y}-${Math.ceil(m / 2)}`; };
const periodDue = (p: string) => { const [y, n] = p.split('-').map(Number); const m = n * 2 + 1; return m > 12 ? `${y + 1}-01-15` : `${y}-${String(m).padStart(2, '0')}-15`; };
const PERIOD_NAMES = ['', 'ינואר-פברואר', 'מרץ-אפריל', 'מאי-יוני', 'יולי-אוגוסט', 'ספטמבר-אוקטובר', 'נובמבר-דצמבר'];
const periodName = (p: string) => { const [y, n] = p.split('-'); return `${PERIOD_NAMES[+n]} ${y}`; };

// ---------- categories (share of the VAT that may be deducted) ----------
const CATS: Record<string, number> = {
  'משרד וציוד': 1, 'תוכנה ומנויים': 1, 'אתר ואחסון': 1, 'פרסום ושיווק': 1, 'טלפון ותקשורת': 2 / 3, 'רכב ודלק': 2 / 3,
  'ביטוח מקצועי': 1, 'אגרות ורישום': 1, 'נסיעות וחניה': 1, 'ספרות והשתלמויות': 1, 'הנהלת חשבונות': 1, 'שכירות ואחזקת משרד': 1,
  'כיבוד ואירוח': 0, 'אחר': 1,
};

// ---------- Morning ----------
const M = 'https://api.greeninvoice.co.il/api/v1';
// Morning moved the token to its OAuth server in June 2026 (same key, as client_id / client_secret; see fn/services).
async function morningToken() {
  const r = await fetch('https://api.morning.co/idp/v1/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: env('MORNING_API_ID'), client_secret: env('MORNING_API_SECRET'), grant_type: 'client_credentials' }) });
  const j: Any = await r.json().catch(() => ({}));
  const t = j.accessToken || j.access_token || j.token;
  if (!r.ok || !t) throw new Error('החיבור למורנינג נכשל (' + r.status + ')');
  return t as string;
}
const TYPE_NAME: Record<number, string> = { 305: 'חשבונית מס', 320: 'חשבונית מס קבלה', 330: 'חשבונית זיכוי' };
async function syncIncome(fromDate?: string) {
  const tok = await morningToken();
  const from = fromDate || `${new Date().getFullYear() - (new Date().getMonth() < 2 ? 1 : 0)}-01-01`;
  let page = 1, n = 0; const seen: string[] = [];
  for (;;) {
    const r = await fetch(M + '/documents/search', { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
      body: JSON.stringify({ page, pageSize: 100, fromDate: from, toDate: ilDay(), type: [305, 320, 330], sort: 'documentDate' }) });
    const j: Any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('מורנינג: ' + (j.errorMessage || r.status));
    const items: Any[] = j.items || [];
    for (const d of items) {
      // a cancelled invoice stays and its credit note (330) offsets it, so every tax document is counted
      const cur = d.currency || 'ILS';
      const rate = cur === 'ILS' ? 1 : (+d.currencyRate || 1);
      let total = (+d.amountLocal || +d.amount || 0) * (d.amountLocal ? 1 : rate);
      let vat = (+d.vatLocal || +d.vat || 0) * (d.vatLocal ? 1 : rate);
      if (d.type === 330) { total = -Math.abs(total); vat = -Math.abs(vat); }
      const date = String(d.documentDate || d.creationDate || '').slice(0, 10);
      const id = 'm-' + d.id; seen.push(id);
      await merge('fininc', id, { date, period: periodOf(date), number: d.number || '', type: d.type, typeName: TYPE_NAME[d.type] || '', client: (d.client && d.client.name) || '',
        desc: d.description || '', total: Math.round(total * 100) / 100, vat: Math.round(vat * 100) / 100, net: Math.round((total - vat) * 100) / 100, currency: cur, url: d.url && (d.url.he || d.url.origin) || '' });
      n++;
    }
    if (items.length < 100 || page >= (j.pages || 1)) break;
    page++;
  }
  await merge('settings', 'fin', { lastSync: new Date().toISOString(), lastErr: '', incomeDocs: n });
  return { n };
}
async function peekMorning() { // field names of one document, without the values (for checking the mapping)
  const tok = await morningToken();
  const r = await fetch(M + '/documents/search', { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify({ page: 1, pageSize: 1, type: [305, 320] }) });
  const j: Any = await r.json().catch(() => ({}));
  const d = (j.items || [])[0] || {};
  return { status: r.status, total: j.total, keys: Object.keys(d), sample: { type: d.type, currency: d.currency, amount: typeof d.amount, vat: typeof d.vat, amountLocal: typeof d.amountLocal, documentDate: d.documentDate, status: d.status } };
}

// ---------- reading a receipt with Claude ----------
const PROMPT = (ctx: string) => `אתה מנהל חשבונות של משרד עורכי דין קטן (עוסק מורשה, יקיר דבול, נתניה). התקבל מסמך או מייל.
${ctx}
קבע אם זו קבלה או חשבונית על הוצאה ששילם המשרד או יקיר (ולא חשבונית שהמשרד הוציא ללקוח, ולא פרסומת, ולא הודעה בלי סכום).
החזר JSON בלבד:
{"isExpense":true/false,"vendor":"שם העסק שגבה","date":"YYYY-MM-DD","total":0,"vat":0,"currency":"ILS","desc":"מה נקנה, עד 8 מילים",
"category":"אחד מ: ${Object.keys(CATS).join(', ')}","business":"yes / no / check","reason":"משפט קצר"}
- החזר תמיד JSON בלבד, בלי שום טקסט לפני או אחרי. total ו-vat הם מספרים בלבד (למשל 89.8), בלי סימן מטבע.
- total הוא הסכום ששולם בפועל כולל מע"מ. vat הוא המע"מ שמופיע במסמך; אם אין מע"מ (ספק מחו"ל, עוסק פטור) כתוב 0.
- סכום במטבע זר: כתוב את הסכום והמטבע כפי שהם.
- business: yes רק כשברור שזו הוצאה של המשרד (תוכנה, אתר, פרסום, ציוד משרדי, ביטוח מקצועי, אגרות, לשכת עורכי הדין). no כשברור שזו הוצאה פרטית (סופר, בגדים, הוצאות בית). check בכל מקרה אחר.
- אם המסמך הוא חשבונית שיקיר דבול הוציא ללקוח, isExpense=false.`;
async function readDoc(bytes: Uint8Array | null, mime: string, ctx: string) {
  const content: Any[] = [];
  if (bytes) {
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const b64 = btoa(bin);
    if (mime === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
    else if (/^image\/(jpeg|png|webp|gif)$/.test(mime)) content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } });
  }
  content.push({ type: 'text', text: PROMPT(ctx) });
  const h: Record<string, string> = { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (env('ANTHROPIC_WORKSPACE_ID')) h['anthropic-workspace-id'] = env('ANTHROPIC_WORKSPACE_ID');
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 600, messages: [{ role: 'user', content }] }) });
  const j: Any = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('fin ai', r.status, JSON.stringify(j).slice(0, 300)); return null; }
  const t = (j.content || []).map((c: Any) => c.text || '').join('');
  const m = (t.match(/\{[\s\S]*\}/) || ['{}'])[0];
  try { return JSON.parse(m); } catch { /* a Hebrew quote (בע"מ) inside a value */ }
  try { return JSON.parse(m.replace(/([\u0590-\u05FF])"([\u0590-\u05FF])/g, '$1״$2')); } catch { console.error('fin ai parse', t.slice(0, 300)); return null; }
}
// 17.11.2026: read twice before giving up (a busy moment or a broken answer left 3 mails as "לא זוהה" with 0)
async function readTwice(bytes: Uint8Array | null, mime: string, ctx: string) {
  for (let i = 0; i < 2; i++) { const a = await readDoc(bytes, mime, ctx).catch(() => null); if (a && (a.isExpense === false || amount(a.total) > 0)) return a; await new Promise(res => setTimeout(res, 1500)); }
  return null;
}
// 17.11.2026: the model sometimes writes the amount as text ("89.80 ₪", "1,234.50"); read the number out of it
const amount = (v: unknown) => { if (typeof v === 'number') return isFinite(v) ? v : 0; const s = String(v ?? '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').replace(/,(?=\d{3}\b)/g, ''); const m = s.match(/-?\d+(?:\.\d+)?/); return m ? +m[0] : 0; };
async function sha1(bytes: Uint8Array) { const h = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)); return Array.from(h.slice(0, 12), b => b.toString(16).padStart(2, '0')).join(''); }
const extFor = (mime: string) => ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' } as Record<string, string>)[mime] || 'bin';

// store one expense; returns the saved record or {skipped}
async function addExpense(o: { bytes: Uint8Array | null; mime: string; name?: string; path?: string; source: string; ctx: string; mailbox?: string; msgId?: string; note?: string; key?: string; subject?: string; from?: string }) {
  const hash = o.key || (o.bytes ? await sha1(o.bytes) : '');
  if (hash) { const { data } = await sb().from('docs').select('id').eq('coll', 'finexp').eq('data->>hash', hash).limit(1); if (data && data.length) return { skipped: 'כבר קיים', id: data[0].id }; }
  let path = o.path || '';
  if (o.bytes && !path) {
    const day = ilDay();
    path = `fin/${day.slice(0, 7)}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.${extFor(o.mime)}`;
    const up = await sb().storage.from('files').upload(path, o.bytes, { contentType: o.mime });
    if (up.error) throw new Error('השמירה נכשלה');
  }
  const ai: Any = await readTwice(o.bytes, o.mime, o.ctx) || {};
  if (o.source === 'mail' && ai.isExpense === false) { if (path) await sb().storage.from('files').remove([path]); return { skipped: 'לא קבלה על הוצאה' }; }
  const cat = CATS[ai.category] !== undefined ? ai.category : 'אחר';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(ai.date || '') ? ai.date : ilDay();
  const cur = String(ai.currency || 'ILS').toUpperCase();
  const total = Math.round(amount(ai.total) * 100) / 100, vat = cur === 'ILS' ? Math.round(amount(ai.vat) * 100) / 100 : 0;
  const fromName = String(o.from || '').replace(/<[^>]*>/g, '').replace(/"/g, '').trim();
  const mailUrl = o.msgId && o.mailbox ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(o.mailbox)}#all/${o.msgId}` : '';
  const rec = { date, period: periodOf(date), vendor: ai.vendor || fromName || o.name || 'לא זוהה', desc: ai.desc || (o.subject ? String(o.subject).slice(0, 120) : ''), subject: o.subject || '', fromMail: o.from || '', mailUrl, unread: !(total > 0), total, vat, net: Math.round((total - vat) * 100) / 100, currency: cur,
    category: cat, vatShare: CATS[cat], biz: 'yes', aiBiz: ai.business || '', // 17.11.2026 (Yakir): everything that comes in is a business expense; he deletes what is not
    reason: ai.reason || '', notReceipt: ai.isExpense === false,
    file: path ? 'sbfile:' + path : '', mime: o.mime, source: o.source, mailbox: o.mailbox || '', msgId: o.msgId || '', note: o.note || '', hash, at: new Date().toISOString(),
    needsCheck: !total || cur !== 'ILS' || ai.isExpense === false };
  const id = uid('x');
  const { error } = await sb().from('docs').insert({ coll: 'finexp', id, data: rec });
  if (error) throw new Error(error.message);
  return Object.assign({ id }, rec);
}
const line = (r: Any) => `${r.vendor} · ₪${Math.round(r.total).toLocaleString('he-IL')}${r.vat ? ` (מע"מ ₪${Math.round(r.vat).toLocaleString('he-IL')})` : ''} · ${r.category}`;

// ---------- the period summary ----------
async function all(coll: string) {
  const out: Any[] = []; for (let f = 0; ; f += 1000) { const { data } = await sb().from('docs').select('id,data').eq('coll', coll).range(f, f + 999); (data || []).forEach((r: Any) => out.push(Object.assign({ id: r.id }, r.data))); if (!data || data.length < 1000) break; }
  return out;
}
export async function summary(p: string) {
  const st = (await getDoc('settings', 'fin')) || {};
  const inc = (await all('fininc')).filter(x => x.period === p), exp = (await all('finexp')).filter(x => x.period === p && x.biz !== 'no');
  const vatOut = inc.reduce((a, x) => a + (+x.vat || 0), 0), incomeNet = inc.reduce((a, x) => a + (+x.net || 0), 0);
  const vatIn = exp.reduce((a, x) => a + (+x.vat || 0) * (x.vatShare === undefined ? 1 : +x.vatShare), 0);
  const adv = st.advPct ? incomeNet * (+st.advPct) / 100 : null;
  return { period: p, name: periodName(p), due: periodDue(p), vatOut, vatIn, vat: vatOut - vatIn, incomeNet, adv, advPct: st.advPct || null, nInc: inc.length, nExp: exp.length };
}

async function daily() {
  let err = '';
  try { await syncIncome(); } catch (e) { err = String((e as Error).message || e); await merge('settings', 'fin', { lastErr: err, lastTry: new Date().toISOString() }); }
  // reminder: 5 days before the 15th, for the period that just ended
  const today = ilDay(); const d = +today.slice(8, 10), m = +today.slice(5, 7), y = +today.slice(0, 4);
  if (m % 2 === 1 && d >= 10 && d <= 14) {
    const prevM = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y; const p = `${py}-${Math.ceil(prevM / 2)}`;
    const st = (await getDoc('settings', 'fin')) || {};
    if (st.remindedFor !== p) {
      const s = await summary(p);
      await tg(`🧾 תשלומים לתקופה ${s.name}, עד 15 בחודש:\n• מע"מ: ₪${Math.round(s.vat).toLocaleString('he-IL')} (מע"מ עסקאות ₪${Math.round(s.vatOut).toLocaleString('he-IL')} פחות מע"מ תשומות ₪${Math.round(s.vatIn).toLocaleString('he-IL')})\n• מקדמת מס הכנסה: ${s.adv == null ? 'חסר אחוז מקדמות בהגדרות' : '₪' + Math.round(s.adv).toLocaleString('he-IL')}\nהערכה בלבד. הסכום הסופי לפי רואה החשבון.${env('APP_URL') ? '\n👉 ' + env('APP_URL') + '#fin' : ''}`);
      await merge('settings', 'fin', { remindedFor: p });
    }
  }
  return { ok: true, err };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    await secrets();
    const b: Any = await req.json().catch(() => ({}));
    const who = await allowed(req, b); if (!who) return json({ error: 'אין הרשאה' }, 401);
    const a = String(b.action || '');
    if (a === 'daily') return json(await daily());
    if (a === 'sync') return json(await syncIncome(b.from));
    if (a === 'peek') return json(await peekMorning());
    if (a === 'summary') return json(await summary(b.period || periodOf(ilDay())));
    if (a === 'settings') { const p: Any = {}; if (b.advPct !== undefined) p.advPct = Math.max(0, Math.min(50, +b.advPct || 0)); await merge('settings', 'fin', p); return json({ ok: true }); }
    if (a === 'mail-key') { // creates (once) the key the Gmail script uses; returned only to a signed-in office user
      if (who === 'cron' || who === 'mail') return json({ error: 'אין הרשאה' }, 401);
      let k = env('FIN_MAIL_KEY');
      if (!k || b.renew) { k = crypto.randomUUID().replace(/-/g, ''); await sb().from('app_secrets').upsert({ k: 'FIN_MAIL_KEY', v: k }, { onConflict: 'k' }); await secrets(true); }
      return json({ key: k, url: env('SUPABASE_URL') + '/functions/v1/fin' });
    }
    if (a === 'ingest') { // from the app (path in storage) or from the Telegram bot (url)
      let bytes: Uint8Array | null = null, mime = String(b.mime || ''), path = '';
      if (b.path) { const { data, error } = await sb().storage.from('files').download(String(b.path).replace(/^sbfile:/, '')); if (error) throw new Error('הקובץ לא נמצא'); bytes = new Uint8Array(await data.arrayBuffer()); path = String(b.path).replace(/^sbfile:/, ''); mime = mime || data.type; }
      else if (b.url) { const r = await fetch(String(b.url)); if (!r.ok) throw new Error('ההורדה נכשלה'); bytes = new Uint8Array(await r.arrayBuffer()); mime = mime || r.headers.get('content-type') || 'application/octet-stream'; }
      if (!bytes) return json({ error: 'אין קובץ' }, 400);
      if (bytes.length > 12e6) return json({ error: 'הקובץ גדול מדי' }, 400);
      const rec: Any = await addExpense({ bytes, mime, name: b.name, path, source: b.source || 'upload', ctx: b.note ? `הערה שצורפה: ${b.note}` : '', note: b.note || '' });
      if (b.source === 'telegram') await tg(rec.skipped ? `🧾 הקבלה כבר קיימת במערכת.` : `🧾 נקלטה הוצאה: ${line(rec)}${env('APP_URL') ? '\n👉 ' + env('APP_URL') + '#fin' : ''}`);
      return json(rec);
    }
    if (a === 'mail') { // from the Gmail script: one message, with its attachments (base64) or only its text
      const files: Any[] = Array.isArray(b.files) ? b.files.slice(0, 5) : [];
      const ctx = `מייל מאת: ${String(b.from || '').slice(0, 200)}\nנושא: ${String(b.subject || '').slice(0, 300)}\nתאריך: ${String(b.date || '').slice(0, 30)}${files.length ? '' : '\nתוכן המייל:\n' + String(b.text || '').slice(0, 15000)}`;
      const out: Any[] = [];
      if (!files.length) out.push(await addExpense({ bytes: null, mime: '', source: 'mail', ctx, mailbox: b.mailbox, msgId: b.msgId, key: 'mail:' + b.msgId, subject: b.subject, from: b.from }));
      for (const f of files) {
        let bin: string; try { bin = atob(String(f.b64 || '')); } catch { continue; }
        const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        out.push(await addExpense({ bytes, mime: String(f.mime || 'application/pdf'), name: f.name, source: 'mail', ctx, mailbox: b.mailbox, msgId: b.msgId, subject: b.subject, from: b.from }));
      }
      return json({ ok: true, n: out.filter(x => !x.skipped).length });
    }
    return json({ error: 'פעולה לא מוכרת' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
