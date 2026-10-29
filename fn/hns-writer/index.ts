// hns-writer (29.10.2026): the writers' area of nws.co.il (חדשות נתניה והשרון), page https://nws.co.il/write/ (noindex).
// Approved by Yakir on 29.10.2026: opinion columnists (volunteers). A column is published inside an existing section with the label
// "טור דעה" and the writer's name; never a flash; no link to the writer's own site or business anywhere.
// This function serves ONLY writers. It has no admin action at all: the management panel works through hns-panel (Yakir's password
// and Telegram code) and the server only function hns-cols. A writer session can never reach either of them.
// Login: email + a permanent personal code. Yakir creates the writer in the panel; the code is generated there once, shown to him once,
//   and only its PBKDF2-SHA256 hash (210,000 rounds, random salt) is stored (hns_writers). A wrong email or code gets one answer
//   ("המייל או הקוד לא נכונים"), and an unknown email costs the same time as a known one.
// Rate limit: at most 5 failed logins in 15 minutes per email and per address (hns_writer_attempts); after that the login answers
//   "נסו שוב בעוד רבע שעה" without checking the code.
// Session: a random token (only its SHA-256 is stored, hns_writer_sessions), ends after 3 hours without activity and at most 12 hours
//   after login, on logout, when Yakir blocks the writer or resets the code. The page keeps the token in localStorage.
// A blocked writer cannot log in (the published columns stay on the site).
// POST JSON:
//   {action:'login', email, code}          -> {s, writer}
//   with {s}:
//   {action:'me'}                           the writer (name, role, allowed sections)
//   {action:'list'}                         the writer's own columns, newest first, with their status
//   {action:'get', id}                      one own column (with a signed link to its image, 1 hour)
//   {action:'save', id?, section, title, dek, body, image_alt?}   create or update an own column in status draft or returned
//   {action:'image', id, data, type}        upload one image (base64; JPEG, PNG or WebP by their real bytes; up to 3 MB) to the
//                                           private bucket nws-columns; replaces the column's earlier image
//   {action:'image_del', id}                remove the column's image
//   {action:'delete', id}                   delete an own draft that was never sent
//   {action:'submit', id}                   send for approval: status 'checking' (the writer cannot edit any more), the automatic check
//                                           runs in the background (Claude, the model of hns_config 'ai'; it only FLAGS, it never changes
//                                           the text), then status 'waiting' and one Telegram message to Yakir with buttons
//                                           (hns:col:ok:<id> / hns:col:ret:<id>, routed by inbound -> hns-publish -> hns-cols).
//                                           A test writer (is_test) never sends a Telegram message (the would-be message is kept in
//                                           the column history instead).
//   {action:'logout'}
// Statuses: draft (טיוטה), checking (בבדיקה), waiting (ממתין לאישור), returned (הוחזר עם הערות), published (פורסם).
// Text: paragraphs separated by an empty line; "## " opens a subheading, "> " a quote, **text** is bold. No HTML and no links are
// kept (tags and [text](link) markup are removed). Long and medium dashes become a comma or a hyphen.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  for (const r of data || []) S[(r as Any).k] = String((r as Any).v ?? '').trim();
}
const ORIGINS = /^https:\/\/(nws\.co\.il|[a-z0-9-]+\.nws-site\.pages\.dev|nws-site\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
let REQ: Request;
const cors = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return { 'access-control-allow-origin': ORIGINS.test(o) ? o : 'https://nws.co.il', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' };
};
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors(REQ), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// ---------- crypto ----------
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
async function sha(s: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 210000;
async function pbkdf2(pw: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations: iter }, key, 256));
}
const same = (a: Uint8Array, b: Uint8Array) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
// the code as typed: capitals and digits only (spaces, hyphens and small letters are forgiven)
const normCode = (c: unknown) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40);
const DUMMY_SALT = new Uint8Array(16);

const ipOf = (req: Request) => req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '';
const IDLE_H = 3, MAX_H = 12, FAIL_MAX = 5, FAIL_MIN = 15;

// ---------- text ----------
const clean = (s: unknown) => String(s ?? '').replace(/\r/g, '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/[ \t]{2,}/g, ' ').trim();
const strip = (s: string) => s.replace(/<[^>]{0,300}>/g, ' ').replace(/\[([^\]\n]{1,200})\]\([^)\s]{1,500}\)/g, '$1');
const oneLine = (s: unknown, n: number) => clean(strip(String(s ?? '')).replace(/\s*\n\s*/g, ' ')).replace(/\*\*/g, '').slice(0, n);
// the body: one text, an empty line between paragraphs -> blocks ("## ", "> " or a paragraph with **bold**)
function blocksOf(v: unknown): string[] {
  const raw = Array.isArray(v) ? v.map((x) => String(x ?? '')).join('\n\n') : String(v ?? '');
  const out: string[] = [];
  for (const p0 of strip(raw.replace(/\r/g, '')).split(/\n[ \t]*\n/)) {
    let p = p0.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
    p = clean(p);
    if (!p) continue;
    let kind = '';
    if (/^#{1,6}\s*/.test(p)) { kind = '## '; p = p.replace(/^#{1,6}\s*/, ''); }
    else if (/^>\s*/.test(p)) { kind = '> '; p = p.replace(/^>\s*/, ''); }
    // bold only in balanced pairs; a heading is bold anyway
    if (kind === '## ' || (p.match(/\*\*/g) || []).length % 2) p = p.replace(/\*\*/g, '');
    p = p.replace(/\*\*\s*\*\*/g, '').trim();
    if (!p) continue;
    out.push(kind + p.slice(0, kind === '## ' ? 140 : 3000));
  }
  return out.slice(0, 80);
}
const textLen = (blocks: string[]) => blocks.join('').length;
// sections a writer may be given (every news section except the flashes and the guides)
const SEC_HE: Record<string, string> = { national: 'חדשות ארציות', city: 'העירייה', police: 'משטרה ופלילים', realestate: 'נדל״ן ותכנון', sports: 'ספורט', transport: 'תחבורה',
  community: 'קהילה וחינוך', health: 'בריאות', leisure: 'תרבות ופנאי', sharon: 'השרון', tourism: 'תיירות', law: 'חוק ומשפט' };
const STATUS_HE: Record<string, string> = { draft: 'טיוטה', checking: 'בבדיקה', waiting: 'ממתין לאישור', returned: 'הוחזר עם הערות', published: 'פורסם' };

// ---------- login and session ----------
async function failures(email: string, ip: string) {
  const since = new Date(Date.now() - FAIL_MIN * 60e3).toISOString();
  const { count: e } = await sb.from('hns_writer_attempts').select('id', { count: 'exact', head: true }).eq('email', email).eq('ok', false).gte('at', since);
  const { count: i } = ip ? await sb.from('hns_writer_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).eq('ok', false).gte('at', since) : { count: 0 };
  return Math.max(e || 0, i || 0);
}
async function login(req: Request, emailIn: unknown, codeIn: unknown) {
  const email = String(emailIn ?? '').trim().toLowerCase().slice(0, 200), code = normCode(codeIn), ip = ipOf(req);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || code.length < 8) return { ok: false, error: 'צריך למלא מייל וקוד אישי' };
  if ((await failures(email, ip)) >= FAIL_MAX) {
    await sb.from('hns_writer_attempts').insert({ email, ip: ip || null, ok: false, note: 'locked' });
    return { ok: false, error: `יותר מדי ניסיונות שגויים. נסו שוב בעוד ${FAIL_MIN} דקות.` };
  }
  const { data: w } = await sb.from('hns_writers').select('id,name,role,sections,status,code_hash,code_salt,code_iter').eq('email', email).maybeSingle();
  let ok = false;
  if (w?.code_hash && w.code_salt) ok = same(await pbkdf2(code, unb64(w.code_salt), w.code_iter || ITER), unb64(w.code_hash));
  else await pbkdf2(code, DUMMY_SALT, ITER); // same time for an unknown email
  if (!ok) {
    await sb.from('hns_writer_attempts').insert({ email, ip: ip || null, ok: false, note: w ? 'bad code' : 'no writer' });
    const left = FAIL_MAX - (await failures(email, ip));
    return { ok: false, error: left > 0 ? 'המייל או הקוד לא נכונים' : `המייל או הקוד לא נכונים. נסו שוב בעוד ${FAIL_MIN} דקות.` };
  }
  if (w!.status !== 'active') {
    await sb.from('hns_writer_attempts').insert({ email, ip: ip || null, ok: false, note: 'blocked' });
    return { ok: false, error: 'הגישה שלכם לאזור הכותבים סגורה. לשאלות פנו לעורך.' };
  }
  await sb.from('hns_writer_attempts').insert({ email, ip: ip || null, ok: true, note: 'login' });
  const s = newToken(), now = new Date();
  await sb.from('hns_writer_sessions').insert({ token_hash: await sha(s), writer_id: w!.id, expires_at: new Date(+now + MAX_H * 3600e3).toISOString(), last_seen: now.toISOString(),
    ip: ip || null, ua: (req.headers.get('user-agent') || '').slice(0, 200) });
  await sb.from('hns_writers').update({ last_login_at: now.toISOString() }).eq('id', w!.id);
  return { ok: true, s, idle_hours: IDLE_H, max_hours: MAX_H, writer: pub(w) };
}
const pub = (w: Any) => ({ name: w.name, role: w.role || '', sections: (w.sections || []).filter((k: string) => SEC_HE[k]).map((k: string) => ({ key: k, name: SEC_HE[k] })) });
async function session(s: unknown) {
  const key = String(s ?? '');
  if (key.length < 20 || key.length > 100) return null;
  const h = await sha(key);
  const { data } = await sb.from('hns_writer_sessions').select('token_hash,writer_id,last_seen').eq('token_hash', h).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!data) return null;
  const end = () => sb.from('hns_writer_sessions').update({ expires_at: new Date().toISOString() }).eq('token_hash', h);
  if (Date.now() - Date.parse(data.last_seen) > IDLE_H * 3600e3) { await end(); return null; }
  const { data: w } = await sb.from('hns_writers').select('id,name,role,sections,status,is_test').eq('id', data.writer_id).maybeSingle();
  if (!w || w.status !== 'active') { await end(); return null; }
  if (Date.now() - Date.parse(data.last_seen) > 2 * 60e3) await sb.from('hns_writer_sessions').update({ last_seen: new Date().toISOString() }).eq('token_hash', h);
  return { h, w };
}

// ---------- columns ----------
const COLS = 'id,created_at,updated_at,status,section,title,dek,body,image_path,image_alt,submitted_at,returned_at,return_note,story_id,published_at';
async function own(wid: number, id: unknown) {
  const n = Number(id); if (!Number.isInteger(n) || n <= 0) return null;
  const { data } = await sb.from('hns_columns').select(`${COLS},history`).eq('id', n).eq('writer_id', wid).maybeSingle();
  return data;
}
async function storyUrl(storyId: number | null) {
  if (!storyId) return '';
  const { data } = await sb.from('hns_stories').select('id,section,state').eq('id', storyId).maybeSingle();
  if (!data || data.state !== 'published') return '';
  const SLUG: Record<string, string> = { national: 'israel', city: 'city', realestate: 'real-estate', community: 'community', sports: 'sports', leisure: 'events', sharon: 'sharon',
    tourism: 'tourism', law: 'law', police: 'police', transport: 'transport', health: 'health', blog: 'blog', flash: 'flash' };
  return `https://nws.co.il/${SLUG[data.section] || 'city'}/n${data.id}/`;
}
const view = (c: Any) => ({ id: c.id, status: c.status, status_he: STATUS_HE[c.status] || c.status, section: c.section, section_he: SEC_HE[c.section] || '', title: c.title || '', dek: c.dek || '',
  body: c.body || [], has_image: !!c.image_path, image_alt: c.image_alt || '', created_at: c.created_at, updated_at: c.updated_at, submitted_at: c.submitted_at, returned_at: c.returned_at,
  return_note: c.status === 'returned' ? c.return_note || '' : '', published_at: c.published_at, editable: c.status === 'draft' || c.status === 'returned' });
const hist = (c: Any, what: string, extra: Any = {}) => [...(Array.isArray(c?.history) ? c.history : []), { at: new Date().toISOString(), what, by: 'writer', ...extra }].slice(-40);

async function list(wid: number) {
  const { data } = await sb.from('hns_columns').select(COLS).eq('writer_id', wid).order('id', { ascending: false }).limit(200);
  const out = [];
  for (const c of data || []) out.push({ ...view(c), body: undefined, url: c.status === 'published' ? await storyUrl(c.story_id) : '' });
  return { ok: true, columns: out };
}
async function get(wid: number, id: unknown) {
  const c = await own(wid, id); if (!c) return { ok: false, error: 'הטור לא נמצא' };
  let image_url = '';
  if (c.image_path) { const { data: u } = await sb.storage.from('nws-columns').createSignedUrl(c.image_path, 3600); image_url = u?.signedUrl || ''; }
  return { ok: true, column: { ...view(c), image_url, url: c.status === 'published' ? await storyUrl(c.story_id) : '' } };
}
async function save(w: Any, b: Any) {
  const allowed: string[] = (w.sections || []).filter((k: string) => SEC_HE[k]);
  if (!allowed.length) return { ok: false, error: 'עוד לא הוגדרו לכם מדורים. פנו לעורך.' };
  const section = String(b.section ?? '');
  if (!allowed.includes(section)) return { ok: false, error: 'בחרו מדור מהרשימה' };
  const title = oneLine(b.title, 160), dek = oneLine(b.dek, 300), body = blocksOf(b.body), image_alt = oneLine(b.image_alt, 200);
  if (textLen(body) > 15000) return { ok: false, error: 'הטור ארוך מדי (עד 15,000 תווים)' };
  const patch: Any = { section, title: title || null, dek: dek || null, body, image_alt: image_alt || null, updated_at: new Date().toISOString() };
  if (b.id) {
    const c = await own(w.id, b.id); if (!c) return { ok: false, error: 'הטור לא נמצא' };
    if (c.status !== 'draft' && c.status !== 'returned') return { ok: false, error: 'אי אפשר לערוך טור שנשלח לאישור' };
    const { data, error } = await sb.from('hns_columns').update({ ...patch, history: hist(c, 'save') }).eq('id', c.id).eq('writer_id', w.id).in('status', ['draft', 'returned']).select('id').maybeSingle();
    if (error || !data) return { ok: false, error: 'השמירה נכשלה. נסו שוב.' };
    return { ok: true, id: c.id };
  }
  // at most 30 open drafts per writer
  const { count } = await sb.from('hns_columns').select('id', { count: 'exact', head: true }).eq('writer_id', w.id).eq('status', 'draft');
  if ((count || 0) >= 30) return { ok: false, error: 'יש לכם כבר 30 טיוטות. סיימו או מחקו חלק מהן.' };
  const { data, error } = await sb.from('hns_columns').insert({ ...patch, writer_id: w.id, status: 'draft', history: [{ at: new Date().toISOString(), what: 'create', by: 'writer' }] }).select('id').single();
  if (error) return { ok: false, error: 'השמירה נכשלה. נסו שוב.' };
  return { ok: true, id: data.id };
}
function sniff(u: Uint8Array) {
  if (u.length > 3 && u[0] === 0xFF && u[1] === 0xD8 && u[2] === 0xFF) return { type: 'image/jpeg', ext: 'jpg' };
  if (u.length > 8 && u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (u.length > 12 && String.fromCharCode(...u.slice(0, 4)) === 'RIFF' && String.fromCharCode(...u.slice(8, 12)) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}
async function image(w: Any, b: Any) {
  const c = await own(w.id, b.id); if (!c) return { ok: false, error: 'קודם שומרים את הטור, ואז מוסיפים תמונה' };
  if (c.status !== 'draft' && c.status !== 'returned') return { ok: false, error: 'אי אפשר לשנות טור שנשלח לאישור' };
  const raw = String(b.data ?? '').replace(/^data:[^,]{0,60},/, '');
  if (raw.length > 4.3e6) return { ok: false, error: 'התמונה גדולה מדי. עד 3 מגה.' };
  let bytes: Uint8Array;
  try { bytes = unb64(raw); } catch { return { ok: false, error: 'הקובץ לא נקרא. נסו תמונה אחרת.' }; }
  if (bytes.length > 3 * 1024 * 1024) return { ok: false, error: 'התמונה גדולה מדי. עד 3 מגה.' };
  if (bytes.length < 2000) return { ok: false, error: 'התמונה קטנה מדי' };
  const kind = sniff(bytes);
  if (!kind) return { ok: false, error: 'אפשר להעלות רק תמונה מסוג JPG, PNG או WEBP' };
  const path = `w${w.id}/c${c.id}-${b64url(crypto.getRandomValues(new Uint8Array(6)))}.${kind.ext}`;
  const { error } = await sb.storage.from('nws-columns').upload(path, bytes, { contentType: kind.type, upsert: false });
  if (error) return { ok: false, error: 'העלאת התמונה נכשלה. נסו שוב.' };
  if (c.image_path) await sb.storage.from('nws-columns').remove([c.image_path]);
  await sb.from('hns_columns').update({ image_path: path, updated_at: new Date().toISOString(), history: hist(c, 'image') }).eq('id', c.id);
  const { data: u } = await sb.storage.from('nws-columns').createSignedUrl(path, 3600);
  return { ok: true, image_url: u?.signedUrl || '' };
}
async function imageDel(w: Any, id: unknown) {
  const c = await own(w.id, id); if (!c) return { ok: false, error: 'הטור לא נמצא' };
  if (c.status !== 'draft' && c.status !== 'returned') return { ok: false, error: 'אי אפשר לשנות טור שנשלח לאישור' };
  if (c.image_path) await sb.storage.from('nws-columns').remove([c.image_path]);
  await sb.from('hns_columns').update({ image_path: null, updated_at: new Date().toISOString(), history: hist(c, 'image_del') }).eq('id', c.id);
  return { ok: true };
}
async function del(w: Any, id: unknown) {
  const c = await own(w.id, id); if (!c) return { ok: false, error: 'הטור לא נמצא' };
  if (c.status !== 'draft' || c.submitted_at) return { ok: false, error: 'אפשר למחוק רק טיוטה שעוד לא נשלחה' };
  if (c.image_path) await sb.storage.from('nws-columns').remove([c.image_path]);
  await sb.from('hns_columns').delete().eq('id', c.id).eq('writer_id', w.id).eq('status', 'draft');
  return { ok: true };
}

// ---------- the automatic check (flags only) ----------
const CHECK_SYSTEM = `אתה בודק טורי דעה לפני פרסום באתר חדשות מקומי בישראל (חדשות נתניה והשרון). אתה לא עורך ולא משנה את הטקסט. אתה רק מסמן נקודות שהעורך צריך לבדוק בעצמו לפני פרסום.
סמן רק את הסוגים האלה:
- defamation: חשש ללשון הרע נגד אדם, עסק או גוף מזוהה בשמו (האשמה בעבירה, בחוסר יושר, ביזוי), כשאין לכך ביסוס בטקסט.
- facts: טענה עובדתית מפורשת שצריך לבדוק לפני פרסום (מספרים, החלטות, ציטוטים של אנשים, אירועים).
- copying: קטע שנראה מועתק מאתר או מפרסום אחר, או ציטוט ארוך מאוד ממקור אחר.
- ad: פרסומת סמויה (קידום עסק, מוצר, שירות, אתר או מספר טלפון, הזמנה לפנות לכותב לצורך עסקי).
- hate: הסתה, שנאה או גזענות נגד קבוצה, או קריאה לאלימות.
- privacy: פרטים אישיים של אנשים פרטיים (שם מלא יחד עם כתובת, טלפון, מצב רפואי, קטינים מזוהים).
כללים: ציין רק דברים אמיתיים מהטקסט, עם ציטוט קצר ומדויק מהטקסט (עד 20 מילים). ביקורת חריפה על גוף ציבורי או על נבחר ציבור בתפקידו היא חלק לגיטימי מטור דעה, ואינה לשון הרע כשלא מייחסים לו עבירה. אם אין מה לסמן, החזר רשימה ריקה.
כתוב בעברית פשוטה, בלי קו ארוך ובלי קו בינוני.
החזר JSON בלבד, בלי שום טקסט נוסף: {"flags":[{"type":"defamation|facts|copying|ad|hate|privacy","level":"high|check","quote":"...","note":"..."}],"summary":"משפט אחד"}`;
const FLAG_HE: Record<string, string> = { defamation: 'חשש ללשון הרע', facts: 'טענה עובדתית לבדיקה', copying: 'חשש להעתקה', ad: 'חשש לפרסומת סמויה', hate: 'הסתה או שנאה', privacy: 'פרטים אישיים', check: 'הבדיקה האוטומטית' };
// checks that need no AI: links, phones, emails, very long quotes
function ruleFlags(c: Any) {
  const flags: Any[] = [];
  const all = [c.title, c.dek, ...(c.body || [])].join('\n');
  const url = all.match(/https?:\/\/\S+|www\.\S+|\b[a-z0-9-]{2,}\.(?:co\.il|org\.il|com|net|org|info|biz|io|il)\b/i);
  if (url) flags.push({ type: 'ad', level: 'high', quote: url[0].slice(0, 80), note: 'יש בטקסט כתובת של אתר. באתר לא מפרסמים קישור לאתר או לעסק של הכותב.' });
  const phone = all.match(/(?:\+972[- ]?|0)(?:5\d|[2-4]|[89]|7\d)[- ]?\d{3}[- ]?\d{4}\b/);
  if (phone) flags.push({ type: 'ad', level: 'high', quote: phone[0], note: 'יש בטקסט מספר טלפון.' });
  const mail = all.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
  if (mail) flags.push({ type: 'privacy', level: 'high', quote: mail[0].slice(0, 80), note: 'יש בטקסט כתובת מייל.' });
  for (const p of c.body || []) {
    const q = String(p).replace(/^>\s*/, '');
    const quoted = q.match(/["“”״]([^"“”״]{300,})["“”״]/);
    if ((/^>\s/.test(p) && q.length > 400) || quoted) { flags.push({ type: 'copying', level: 'check', quote: (quoted ? quoted[1] : q).slice(0, 90) + '...', note: 'ציטוט ארוך מאוד. כדאי לוודא שלא הועתק ממקור אחר, ולקצר.' }); break; }
  }
  return flags;
}
const ilDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
async function aiCheck(c: Any) {
  if (!S.ANTHROPIC_API_KEY) throw new Error('no key');
  const { data: cfg } = await sb.from('hns_config').select('v').eq('k', 'ai').maybeSingle();
  const model = (cfg?.v as Any)?.model || 'claude-sonnet-5-5';
  const text = `מדור: ${SEC_HE[c.section] || c.section}\nכותרת: ${c.title}\nפתיח: ${c.dek || ''}\n\nהטור:\n${(c.body || []).join('\n\n')}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model, max_tokens: 2000, system: CHECK_SYSTEM, messages: [{ role: 'user', content: text }] }),
    signal: AbortSignal.timeout(90000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  await sb.rpc('hns_ai_bump', { p_day: ilDay(), p_n: 1 }).then(() => null, () => null);
  const out = String((j.content || []).filter((x: Any) => x.type === 'text').map((x: Any) => x.text).join('')).replace(/```(?:json)?/g, '');
  const m = out.match(/\{[\s\S]*\}/); if (!m) throw new Error('no json');
  const o = JSON.parse(m[0]);
  const flags = (Array.isArray(o.flags) ? o.flags : []).filter((f: Any) => FLAG_HE[f?.type]).slice(0, 15)
    .map((f: Any) => ({ type: f.type, level: f.level === 'high' ? 'high' : 'check', quote: clean(f.quote).slice(0, 200), note: clean(f.note).slice(0, 400) }));
  return { flags, summary: clean(o.summary).slice(0, 300), model };
}
async function runCheck(id: number) {
  const { data: c } = await sb.from('hns_columns').select('*').eq('id', id).maybeSingle();
  if (!c || c.status !== 'checking') return;
  const { data: w } = await sb.from('hns_writers').select('id,name,role,is_test').eq('id', c.writer_id).maybeSingle();
  let res: Any;
  try { const ai = await aiCheck(c); res = { flags: [...ruleFlags(c), ...ai.flags], summary: ai.summary, model: ai.model, ok: true }; }
  catch (e) { res = { flags: [...ruleFlags(c), { type: 'check', level: 'check', quote: '', note: 'הבדיקה האוטומטית לא רצה הפעם. כדאי לקרוא את הטור בעיון.' }], summary: '', ok: false, error: String((e as Error).message || e).slice(0, 160) }; }
  const now = new Date().toISOString();
  const msg = tgText(c, w, res);
  const testRun = !!w?.is_test;
  const { data: upd } = await sb.from('hns_columns').update({ status: 'waiting', check_result: res, check_at: now, updated_at: now,
    history: [...(Array.isArray(c.history) ? c.history : []), { at: now, what: 'checked', by: 'auto', flags: res.flags.length }].slice(-40) })
    .eq('id', id).eq('status', 'checking').select('id').maybeSingle();
  if (!upd) return;
  const kb = { inline_keyboard: [[{ text: '✅ לפרסם', callback_data: `hns:col:ok:${id}` }, { text: '↩️ להחזיר לכותב', callback_data: `hns:col:ret:${id}` }],
    [{ text: 'לתצוגה מלאה בלוח הניהול', url: `https://nws.co.il/yakirdab/#col/${id}` }]] };
  if (testRun) {
    // a test writer: no Telegram message; the message that would have been sent is kept in the history
    await sb.from('hns_columns').update({ history: [...(Array.isArray(c.history) ? c.history : []), { at: now, what: 'checked', by: 'auto', flags: res.flags.length }, { at: now, what: 'telegram_dry', text: msg.slice(0, 1500) }].slice(-40) }).eq('id', id);
    return;
  }
  const r = await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: msg, disable_web_page_preview: true, reply_markup: kb }), signal: AbortSignal.timeout(15000) }).then((x) => x.json()).catch(() => null);
  if (r?.ok) await sb.from('hns_columns').update({ tg_message_id: r.result?.message_id ?? null }).eq('id', id);
}
function tgText(c: Any, w: Any, res: Any) {
  const flags = (res.flags || []) as Any[];
  const fl = flags.length ? flags.map((f) => `${f.level === 'high' ? '🔴' : '🟡'} ${FLAG_HE[f.type] || f.type}${f.quote ? `: "${f.quote}"` : ''}${f.note ? `\n   ${f.note}` : ''}`).join('\n') : 'הבדיקה האוטומטית לא מצאה משהו לסמן.';
  const words = (c.body || []).join(' ').split(/\s+/).filter(Boolean).length;
  return clean(`✍️ טור דעה לאישור, חדשות נתניה והשרון\n\n${c.title}\n${c.dek || ''}\n\nכותב: ${w?.name || ''}${w?.role ? `, ${w.role}` : ''}\nמדור: ${SEC_HE[c.section] || c.section}\nאורך: ${words} מילים${c.image_path ? ', עם תמונה' : ''}\n\nמה הבדיקה האוטומטית סימנה (היא רק מסמנת, לא משנה את הטקסט):\n${fl}${res.summary ? `\n\n${res.summary}` : ''}\n\nהטקסט המלא והתמונה בלוח הניהול.`).slice(0, 3900);
}
async function submit(w: Any, id: unknown) {
  const c = await own(w.id, id); if (!c) return { ok: false, error: 'הטור לא נמצא' };
  if (c.status !== 'draft' && c.status !== 'returned') return { ok: false, error: 'הטור כבר נשלח' };
  if (!c.section || !(w.sections || []).includes(c.section)) return { ok: false, error: 'בחרו מדור לפני השליחה' };
  if (!c.title || c.title.length < 8) return { ok: false, error: 'חסרה כותרת' };
  if (!c.dek || c.dek.length < 15) return { ok: false, error: 'חסר משפט פתיחה' };
  const words = (c.body || []).join(' ').split(/\s+/).filter(Boolean).length;
  if (words < 150) return { ok: false, error: `הטור קצר מדי (${words} מילים). צריך לפחות 150 מילים.` };
  // at most 5 sends a day per writer (each send runs the automatic check)
  const { data: today } = await sb.from('hns_columns').select('history').eq('writer_id', w.id).gte('submitted_at', new Date(Date.now() - 864e5).toISOString());
  const sends = (today || []).reduce((n: number, r: Any) => n + (r.history || []).filter((h: Any) => h.what === 'submit' && Date.now() - Date.parse(h.at) < 864e5).length, 0);
  if (sends >= 5) return { ok: false, error: 'אפשר לשלוח עד 5 פעמים ביום. נסו שוב מחר.' };
  const now = new Date().toISOString();
  const { data } = await sb.from('hns_columns').update({ status: 'checking', submitted_at: now, updated_at: now, return_note: null, history: hist(c, 'submit') })
    .eq('id', c.id).eq('writer_id', w.id).in('status', ['draft', 'returned']).select('id').maybeSingle();
  if (!data) return { ok: false, error: 'השליחה נכשלה. רעננו את הדף.' };
  // the check runs after the answer (EdgeRuntime keeps the function alive until it ends)
  const job = runCheck(c.id).catch(async () => {
    await sb.from('hns_columns').update({ status: 'waiting', check_result: { flags: [{ type: 'check', level: 'check', quote: '', note: 'הבדיקה האוטומטית נכשלה' }], ok: false } }).eq('id', c.id).eq('status', 'checking');
  });
  // deno-lint-ignore no-explicit-any
  const ER = (globalThis as any).EdgeRuntime;
  if (ER?.waitUntil) ER.waitUntil(job); else await job;
  return { ok: true, id: c.id, status: 'checking' };
}

Deno.serve(async (req) => {
  REQ = req;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return J({ ok: false }, 405);
  await secrets();
  try {
    const b: Any = await req.json().catch(() => ({}));
    if (b.action === 'login') return J(await login(req, b.email, b.code));
    const ss = await session(b.s);
    if (!ss) return J({ ok: false, auth: false, error: 'צריך להתחבר מחדש' }, 401);
    const w = ss.w;
    switch (b.action) {
      case 'me': return J({ ok: true, writer: pub(w) });
      case 'list': return J(await list(w.id));
      case 'get': return J(await get(w.id, b.id));
      case 'save': return J(await save(w, b));
      case 'image': return J(await image(w, b));
      case 'image_del': return J(await imageDel(w, b.id));
      case 'delete': return J(await del(w, b.id));
      case 'submit': return J(await submit(w, b.id));
      case 'logout': await sb.from('hns_writer_sessions').update({ expires_at: new Date().toISOString() }).eq('token_hash', ss.h); return J({ ok: true });
    }
    return J({ ok: false, error: 'פעולה לא מוכרת' }, 400);
  } catch (e) { console.error(e); return J({ ok: false, error: 'שגיאת שרת. נסו שוב בעוד דקה.' }, 500); }
});
