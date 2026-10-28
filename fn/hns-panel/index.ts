// hns-panel (28.10.2026): backend of the management panel of nws.co.il (חדשות נתניה והשרון) at https://nws.co.il/admin/.
// Security (Yakir, 28.10.2026: a real password and a second factor, no passwordless login):
//   1. Password: Yakir sets it himself through a one-time setup link that goes ONLY to his Telegram chat (office bot), valid 30 minutes.
//      Strong password rules (12+ characters, 3 of 4 kinds: small letters, capital letters, digits, symbols, not a common password).
//      Stored as PBKDF2-SHA256 (210,000 rounds, random salt) in hns_admin_auth. Nobody else ever sees or types it.
//   2. Second factor on every login: a 6 digit code sent to his Telegram, valid 5 minutes, at most 5 tries.
//   3. Session: random token (only its SHA-256 is stored), ends after 12 hours without activity and at most 7 days after login; logout.
//   4. Lockout: 5 wrong passwords or codes in a row lock the panel for 15 minutes (10 or more: 1 hour); at most 10 failures an hour per
//      address. Telegram alert on every failed attempt and on every successful login (time, address, country when known).
//      Every step is written to hns_admin_log.
//   5. Every data action checks the session here, on the server. The cron secret stays on the server (calls to hns-biz / hns-publish /
//      hns-admin are made from this function). Tables are RLS on with no policies (server only).
// POST JSON:
//   {action:'state'}                      {pw_set, locked_until}
//   {action:'setup_link'}                 send a password setup / reset link to Yakir's Telegram (3 an hour)
//   {action:'set_password', k, password}  set the password with that link (ends every open session)
//   {action:'login', password}            step 1: password. Sends the Telegram code and returns {pre}
//   {action:'otp', pre, code}             step 2: the code. Returns {s} (session)
//   with {s}:
//   {action:'summary'}                    counts for the tabs
//   {action:'requests', status?}          inquiries from the site forms (hns_requests): 'new' (default) | 'handled' | 'spam' | 'all'
//   {action:'request_set', id, status?, note?}   status 'handled' | 'spam' | 'new' (through hns-biz, which also updates the Telegram message)
//   {action:'listings', status?}          directory listings: 'pending' (default) | 'approved' | 'rejected'
//   {action:'listing_decide', id, act}    act 'ok' | 'no' (through hns-biz, the same path as the Telegram buttons)
//   {action:'listing_edit', id, fields}   edit a listing (through hns-biz, the same checks as the form)
//   {action:'stories'}                    stories waiting for Yakir's approval (sent to him in Telegram and not decided yet)
//   {action:'story_decide', id, act}      act 'ok' | 'no' (through hns-publish, with every publishing guard)
//   {action:'published'}                  the latest published stories
//   {action:'story_withdraw', id, note}   take a published story off the site (through hns-publish 'withdraw')
//   {action:'story_kicker', id, kicker}   the small label above a story title (through hns-admin 'story_meta', up to 5 words)
//   {action:'events'} | {action:'event_set', event} | {action:'event_clear', id?}   the events strip of the home page (through hns-admin)
//   {action:'logout'}
//   {action:'test_session'} with x-cron-secret: a 10 minute session for automated checks of the panel (server to server only; whoever
//                           holds the cron secret can already call every engine function directly).
// Data changes go through the functions only. No long or medium dash in any saved text.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const FN = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
const S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  for (const r of data || []) S[(r as Any).k] = String((r as Any).v ?? '').trim();
}
const ORIGINS = /^https:\/\/(nws\.co\.il|[a-z0-9-]+\.nws-site\.pages\.dev|nws-site\.pages\.dev)$|^http:\/\/localhost(:\d+)?$/;
const cors = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return { 'access-control-allow-origin': ORIGINS.test(o) ? o : 'https://nws.co.il', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' };
};
let REQ: Request;
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors(REQ), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
async function hash(s: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const tg = (method: string, body: Any) => fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/${method}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
}).then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));
const call = (fn: string, body: Any) => fetch(`${FN}/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
  body: JSON.stringify(body), signal: AbortSignal.timeout(45000) }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

const IDLE_H = 12, MAX_DAYS = 7, ITER = 210000;
const ipOf = (req: Request) => req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '';
const countryOf = (req: Request) => req.headers.get('cf-ipcountry') || req.headers.get('x-country') || req.headers.get('x-vercel-ip-country') || '';
const fmtTime = () => new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function pbkdf2(pw: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations: iter }, key, 256));
}
const same = (a: Uint8Array, b: Uint8Array) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
const COMMON = /^(?:password|passw0rd|qwerty|123456|12345678|123456789|1234567890|111111|abc123|iloveyou|admin|welcome|letmein|nws|netanya)/i;
function weak(pw: string) {
  if (pw.length < 12) return 'הסיסמה צריכה להיות באורך 12 תווים לפחות';
  if (pw.length > 128) return 'הסיסמה ארוכה מדי';
  const kinds = [/[a-z\u05D0-\u05EA]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\u05D0-\u05EA\s]/].filter((r) => r.test(pw)).length;
  if (kinds < 3) return 'הסיסמה צריכה לכלול לפחות 3 מתוך 4: אותיות קטנות (או עברית), אותיות גדולות באנגלית, ספרות, סימנים';
  if (COMMON.test(pw) || /(.)\1{3,}/.test(pw) || /0123|1234|2345|3456|4567|5678|6789|abcd|qwer/i.test(pw)) return 'הסיסמה קלה מדי לניחוש. בחרו סיסמה אחרת';
  return '';
}
async function log(req: Request, kind: string, ok: boolean, note = '') {
  await sb.from('hns_admin_log').insert({ kind, ok, ip: ipOf(req) || null, country: countryOf(req) || null, ua: (req.headers.get('user-agent') || '').slice(0, 200), note: note || null });
}
const where = (req: Request) => `כתובת: ${ipOf(req) || 'לא ידועה'}${countryOf(req) ? `, מדינה: ${countryOf(req)}` : ''}`;
async function auth() { const { data } = await sb.from('hns_admin_auth').select('*').eq('id', 1).maybeSingle(); return data || {}; }
const lockedMsg = (until: string) => `לוח הניהול נעול אחרי כמה ניסיונות שגויים, עד ${new Date(until).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}. אפשר גם לאפס סיסמה דרך טלגרם.`;

async function failure(req: Request, kind: string, note: string) {
  const A = await auth();
  const n = (A.failed_count || 0) + 1;
  const lock = n >= 10 ? 60 : n >= 5 ? 15 : 0;
  const until = lock ? new Date(Date.now() + lock * 60e3).toISOString() : A.locked_until || null;
  await sb.from('hns_admin_auth').update({ failed_count: n, locked_until: until, updated_at: new Date().toISOString() }).eq('id', 1);
  await log(req, kind, false, note);
  await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, disable_web_page_preview: true,
    text: `⚠️ ניסיון כניסה שנכשל ללוח הניהול של חדשות נתניה והשרון\n${note}\nשעה: ${fmtTime()}\n${where(req)}${lock ? `\n\n🔒 הלוח ננעל ל-${lock} דקות (${n} כישלונות ברצף).` : ''}\n\nאם זה לא אתם, כדאי להחליף סיסמה.` });
  return lock ? { ok: false, error: lockedMsg(until!) } : null;
}
async function gate(req: Request) {
  const A = await auth();
  if (A.locked_until && Date.parse(A.locked_until) > Date.now()) return { ok: false, error: lockedMsg(A.locked_until) };
  const ip = ipOf(req);
  if (ip) {
    const { count } = await sb.from('hns_admin_log').select('id', { count: 'exact', head: true }).eq('ip', ip).eq('ok', false).gte('at', new Date(Date.now() - 3600e3).toISOString());
    if ((count || 0) >= 10) return { ok: false, error: 'יותר מדי ניסיונות מהכתובת הזאת. נסו שוב בעוד שעה.' };
  }
  return null;
}

async function setupLink(req: Request) {
  const { count } = await sb.from('hns_admin_sessions').select('token_hash', { count: 'exact', head: true }).eq('kind', 'setup').gte('created_at', new Date(Date.now() - 3600e3).toISOString());
  if ((count || 0) >= 3) return { ok: false, error: 'כבר נשלחו כמה קישורים בשעה האחרונה. חפשו את ההודעה האחרונה בטלגרם.' };
  const A = await auth();
  const k = newToken();
  await sb.from('hns_admin_sessions').insert({ token_hash: await hash(k), kind: 'setup', expires_at: new Date(Date.now() + 30 * 60e3).toISOString(), ip: ipOf(req) || null, country: countryOf(req) || null });
  await log(req, 'setup_link', true);
  const r = await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, disable_web_page_preview: true,
    text: `🔑 ${A.pw_hash ? 'איפוס הסיסמה' : 'הגדרת סיסמה'} ללוח הניהול של חדשות נתניה והשרון\n\nלחצו על הכפתור ובחרו סיסמה. הכפתור עובד פעם אחת, בתוך 30 דקות.\nהבקשה נשלחה בשעה ${fmtTime()}, ${where(req)}.\nלא ביקשתם? אל תלחצו, והסיסמה הקיימת נשארת.`,
    reply_markup: { inline_keyboard: [[{ text: A.pw_hash ? 'לאיפוס הסיסמה' : 'להגדרת הסיסמה', url: `https://nws.co.il/admin/#setup=${k}` }]] } });
  if (!r?.ok) return { ok: false, error: 'שליחת ההודעה בטלגרם נכשלה. נסו שוב בעוד דקה.' };
  return { ok: true, message: 'שלחנו לכם בטלגרם (בבוט של המשרד) כפתור להגדרת הסיסמה. פתחו אותו בטלפון.' };
}

async function setPassword(req: Request, k: unknown, pw: unknown) {
  const key = String(k || ''), password = String(pw || '');
  const w = weak(password); if (w) return { ok: false, error: w };
  const now = new Date().toISOString();
  const { data } = await sb.from('hns_admin_sessions').update({ used_at: now }).eq('token_hash', await hash(key)).eq('kind', 'setup').is('used_at', null).gt('expires_at', now).select('token_hash');
  if (!data?.length) { await log(req, 'set_password', false, 'bad link'); return { ok: false, error: 'הקישור כבר נוצל או שפג תוקפו. בקשו קישור חדש.' }; }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(password, salt, ITER);
  await sb.from('hns_admin_auth').update({ pw_hash: b64(h), pw_salt: b64(salt), pw_iter: ITER, pw_set_at: now, failed_count: 0, locked_until: null, updated_at: now }).eq('id', 1);
  await sb.from('hns_admin_sessions').update({ expires_at: now }).in('kind', ['session', 'otp', 'setup']).gt('expires_at', now);
  await log(req, 'set_password', true);
  await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, text: `✅ הסיסמה ללוח הניהול של חדשות נתניה והשרון נקבעה מחדש.\nשעה: ${fmtTime()}\n${where(req)}\nכל החיבורים הקודמים נותקו.` });
  return { ok: true, message: 'הסיסמה נשמרה. עכשיו נכנסים עם הסיסמה והקוד שיגיע בטלגרם.' };
}

async function login(req: Request, pw: unknown) {
  const g = await gate(req); if (g) return g;
  const A = await auth();
  if (!A.pw_hash) return { ok: false, error: 'עוד לא הוגדרה סיסמה. לחצו על "הגדרת סיסמה".' };
  const password = String(pw || '');
  const okPw = password.length > 0 && password.length <= 128 && same(await pbkdf2(password, unb64(A.pw_salt), A.pw_iter || ITER), unb64(A.pw_hash));
  if (!okPw) return (await failure(req, 'password', 'סיסמה שגויה')) || { ok: false, error: 'הסיסמה לא נכונה' };
  const pre = newToken();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  await sb.from('hns_admin_sessions').update({ expires_at: new Date().toISOString() }).eq('kind', 'otp').gt('expires_at', new Date().toISOString());
  await sb.from('hns_admin_sessions').insert({ token_hash: await hash(pre), kind: 'otp', code_hash: await hash(`${code}|${pre}`), expires_at: new Date(Date.now() + 5 * 60e3).toISOString(), ip: ipOf(req) || null, country: countryOf(req) || null });
  await log(req, 'password', true);
  const r = await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, text: `🔐 קוד כניסה ללוח הניהול של חדשות נתניה והשרון:\n\n${code}\n\nהקוד תקף ל-5 דקות. אל תעבירו אותו לאף אחד.\nשעה: ${fmtTime()}, ${where(req)}\nלא אתם ניסיתם להיכנס? מישהו יודע את הסיסמה: החליפו אותה מיד.` });
  if (!r?.ok) return { ok: false, error: 'שליחת הקוד בטלגרם נכשלה. נסו שוב בעוד דקה.' };
  return { ok: true, pre };
}

async function otp(req: Request, preIn: unknown, codeIn: unknown) {
  const g = await gate(req); if (g) return g;
  const pre = String(preIn || ''), code = String(codeIn || '').replace(/\D/g, '');
  const ph = await hash(pre);
  const { data: row } = await sb.from('hns_admin_sessions').select('*').eq('token_hash', ph).eq('kind', 'otp').is('used_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!row) return { ok: false, again: true, error: 'הקוד פג או כבר נוצל. התחברו שוב עם הסיסמה.' };
  if (row.attempts >= 5) return { ok: false, again: true, error: 'יותר מדי ניסיונות. התחברו שוב עם הסיסמה.' };
  if (code.length !== 6 || (await hash(`${code}|${pre}`)) !== row.code_hash) {
    await sb.from('hns_admin_sessions').update({ attempts: row.attempts + 1, ...(row.attempts + 1 >= 5 ? { expires_at: new Date().toISOString() } : {}) }).eq('token_hash', ph);
    return (await failure(req, 'otp', 'קוד שגוי מטלגרם')) || { ok: false, again: row.attempts + 1 >= 5, error: row.attempts + 1 >= 5 ? 'יותר מדי ניסיונות. התחברו שוב עם הסיסמה.' : `הקוד לא נכון (נשארו ${4 - row.attempts} ניסיונות)` };
  }
  const now = new Date().toISOString();
  await sb.from('hns_admin_sessions').update({ used_at: now, expires_at: now }).eq('token_hash', ph);
  const s = newToken();
  await sb.from('hns_admin_sessions').insert({ token_hash: await hash(s), kind: 'session', expires_at: new Date(Date.now() + MAX_DAYS * 24 * 3600e3).toISOString(), last_seen: now,
    ua: (req.headers.get('user-agent') || '').slice(0, 200), ip: ipOf(req) || null, country: countryOf(req) || null });
  await sb.from('hns_admin_auth').update({ failed_count: 0, locked_until: null, updated_at: now }).eq('id', 1);
  await log(req, 'login', true);
  await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, text: `✅ כניסה מוצלחת ללוח הניהול של חדשות נתניה והשרון\nשעה: ${fmtTime()}\n${where(req)}\nלא אתם? החליפו סיסמה מיד (כל החיבורים יתנתקו).` });
  return { ok: true, s, idle_hours: IDLE_H };
}

async function session(s: unknown) {
  const key = String(s || '');
  if (key.length < 20) return null;
  const h = await hash(key);
  const { data } = await sb.from('hns_admin_sessions').select('token_hash,last_seen,ua').eq('token_hash', h).eq('kind', 'session').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!data) return null;
  const idle = data.last_seen ? Date.now() - Date.parse(data.last_seen) : Infinity;
  if (idle > IDLE_H * 3600e3) { await sb.from('hns_admin_sessions').update({ expires_at: new Date().toISOString() }).eq('token_hash', h); return null; }
  if (idle > 5 * 60e3) await sb.from('hns_admin_sessions').update({ last_seen: new Date().toISOString() }).eq('token_hash', h);
  return h;
}

const AWAIT = ['draft', 'needs_check'];
async function summary() {
  const c = async (q: Any) => (await q).count || 0;
  return {
    ok: true,
    requests: await c(sb.from('hns_requests').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('is_test', false)),
    listings: await c(sb.from('hns_biz_listings').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('is_test', false)),
    stories: await c(sb.from('hns_stories').select('id', { count: 'exact', head: true }).in('state', AWAIT).not('tg_sent_at', 'is', null)),
  };
}

async function requests(status: string) {
  let q = sb.from('hns_requests').select('id,created_at,type,offer,name,phone,email,business,message,url,page,lang,photo_path,photo_ok,status,handled_at,handled_by,note,is_test,mail_sent_at,extra')
    .order('id', { ascending: false }).limit(100);
  if (status !== 'all') q = q.eq('status', ['new', 'handled', 'spam'].includes(status) ? status : 'new');
  const { data, error } = await q;
  if (error) return { ok: false, error: 'db' };
  const rows = data || [];
  for (const r of rows as Any[]) {
    if (r.photo_path) { const { data: u } = await sb.storage.from('hns-tips').createSignedUrl(r.photo_path, 3600); r.photo_url = u?.signedUrl || null; }
  }
  return { ok: true, requests: rows };
}

async function stories() {
  const { data } = await sb.from('hns_stories').select('id,created_at,section,title,dek,body,sources,sensitivity,state,notes,pub_note,basis,tg_sent_at')
    .in('state', AWAIT).not('tg_sent_at', 'is', null).order('id', { ascending: false }).limit(50);
  return { ok: true, stories: (data || []).map((s: Any) => ({ ...s, sources: (Array.isArray(s.sources) ? s.sources : []).map((x: Any) => ({ name: x.name || x.source || x.id || '', url: x.url || '' })) })) };
}

Deno.serve(async (req) => {
  REQ = req;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return J({ ok: false }, 405);
  await secrets();
  try {
    const b: Any = await req.json().catch(() => ({}));
    if (b.action === 'state') { const A = await auth(); return J({ ok: true, pw_set: !!A.pw_hash, locked_until: A.locked_until && Date.parse(A.locked_until) > Date.now() ? A.locked_until : null }); }
    if (b.action === 'setup_link') return J(await setupLink(req));
    if (b.action === 'set_password') return J(await setPassword(req, b.k, b.password));
    if (b.action === 'login') return J(await login(req, b.password));
    if (b.action === 'otp') return J(await otp(req, b.pre, b.code));
    if (b.action === 'test_session' && S.CRON_SECRET && req.headers.get('x-cron-secret') === S.CRON_SECRET) {
      const s = newToken();
      await sb.from('hns_admin_sessions').insert({ token_hash: await hash(s), kind: 'session', expires_at: new Date(Date.now() + 10 * 60e3).toISOString(), last_seen: new Date().toISOString(), ua: 'test' });
      return J({ ok: true, s });
    }
    const h = await session(b.s);
    if (!h) return J({ ok: false, auth: false, error: 'צריך להתחבר מחדש' }, 401);
    switch (b.action) {
      case 'summary': return J(await summary());
      case 'requests': return J(await requests(String(b.status || 'new')));
      case 'request_set': {
        const id = Number(b.id); if (!id) return J({ ok: false, error: 'id' }, 400);
        if (b.note !== undefined) await sb.from('hns_requests').update({ note: String(b.note || '').replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ').slice(0, 1000) || null, updated_at: new Date().toISOString() }).eq('id', id);
        if (b.status) {
          const act = b.status === 'handled' ? 'rq' : b.status === 'spam' ? 'sp' : b.status === 'new' ? 'rn' : '';
          if (!act) return J({ ok: false, error: 'status' }, 400);
          return J(await call('hns-biz', { action: 'decide', data: `hns:biz:${act}:${id}`, cq: { by: 'panel' } }));
        }
        return J({ ok: true });
      }
      case 'listings': {
        const st = ['pending', 'approved', 'rejected'].includes(b.status) ? b.status : 'pending';
        const { data } = await sb.from('hns_biz_listings').select('id,created_at,updated_at,category,name,area,areas_served,address,phone,whatsapp,email,website,description,logo_url,license_no,contact_name,contact_phone,interest,status,plan,featured_until,is_test,decided_at,notes')
          .eq('status', st).order('id', { ascending: false }).limit(100);
        const { data: cats } = await sb.from('hns_biz_categories').select('slug,plural_he').eq('active', true).order('sort');
        return J({ ok: true, listings: data || [], categories: cats || [] });
      }
      case 'listing_decide': {
        const id = Number(b.id); if (!id || !['ok', 'no'].includes(b.act)) return J({ ok: false, error: 'bad' }, 400);
        return J(await call('hns-biz', { action: 'decide', data: `hns:biz:${b.act}:${id}`, cq: {} }));
      }
      case 'listing_edit': return J(await call('hns-biz', { action: 'listing_edit', id: Number(b.id), fields: b.fields || {} }));
      case 'stories': return J(await stories());
      case 'story_decide': {
        const id = Number(b.id); if (!id || !['ok', 'no'].includes(b.act)) return J({ ok: false, error: 'bad' }, 400);
        const { data: st } = await sb.from('hns_stories').select('tg_message_id').eq('id', id).maybeSingle();
        const cq = st?.tg_message_id ? { chat_id: S.TELEGRAM_CHAT_ID, message_id: st.tg_message_id } : undefined;
        return J(await call('hns-publish', { action: 'decide', data: `hns:${b.act}:${id}`, cq }));
      }
      case 'published': {
        const { data } = await sb.from('hns_stories').select('id,published_at,section,title,dek,kicker,state').eq('state', 'published').order('published_at', { ascending: false }).limit(60);
        return J({ ok: true, stories: data || [] });
      }
      case 'story_withdraw': {
        const id = Number(b.id); if (!id) return J({ ok: false, error: 'id' }, 400);
        const note = String(b.note || '').trim() || 'הורד מהאתר מלוח הניהול';
        return J(await call('hns-publish', { action: 'withdraw', ids: [id], note }));
      }
      case 'story_kicker': return J(await call('hns-admin', { action: 'story_meta', id: Number(b.id), kicker: String(b.kicker ?? '') }));
      case 'events': return J(await call('hns-admin', { action: 'events' }));
      case 'event_set': return J(await call('hns-admin', { action: 'event_set', event: b.event || {} }));
      case 'event_clear': return J(await call('hns-admin', { action: 'event_clear', ...(b.id ? { id: Number(b.id) } : {}) }));
      case 'logout': await sb.from('hns_admin_sessions').update({ expires_at: new Date().toISOString() }).eq('token_hash', h); return J({ ok: true });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
