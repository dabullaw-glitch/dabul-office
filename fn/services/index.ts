// services: the online legal services ordered on dabullaw.co.il (written 10.10.2026; v4 11.10.2026: orders linked to client cards;
// v5 11.10.2026: every order records where the buyer came from, src.ch, for the office report "מכירות אונליין").
// v9 9.11.2026 (Yakir approved): (1) uploaded files are stored under a technical ASCII name (storage refused Hebrew names, so
// no file ever uploaded and orders with Hebrew file names stopped before payment); a file that still fails does not stop the
// order, Yakir gets a Telegram that a document is missing. (2) an order that was not completed holds its time for 30 minutes
// only, and the same client can retry the same time. (3) the Zoom times come from Yakir's Google Calendar (dabullaw@gmail.com,
// shared with the service account): Sunday to Thursday, from tomorrow for 14 days, meetings between 10:00 and 15:00 (ending by
// 15:00), every half hour by the chosen length; any busy time in the calendar is not offered. (4) after payment the meeting is
// added to his calendar with the client's name, phone and topic.
// The service definitions (questions, prices) come from svc-config.json on the website, the same file the order form
// uses, and the price is always recomputed here. Orders are kept in docs coll "svc" (the office panel addon-svc.js),
// the client's files in the private "files" bucket under svc/<id>/.
//  POST {action:'slots', svc, len}                 -> free Zoom times for that length (minutes)
//  POST {action:'order', svc, a, c, meet, files}   -> saves the order, returns signed upload links for the files
//  POST {action:'uploaded', id, token, failed}     -> files are in: notify the office, email the client, return payUrl
//  POST ?step=paid&id=&k=                          -> Morning's server callback after payment (k: the order's secret key)
//  POST {action:'admin-file'|'admin-mail'|'admin-status', ...} with the office user's sign-in -> office panel actions
import { createClient } from 'npm:@supabase/supabase-js@2';
import { loadSecrets, json, cors, admin, env, telegram } from './_shared/common.ts';

const CFG_URL = 'https://dabullaw-glitch.github.io/dabul-office/media/widgets/svc-config.json';
const SITE = 'https://dabullaw.co.il';
// deno-lint-ignore no-explicit-any
let CFG: any = null, cfgAt = 0;
async function cfg() {
  if (CFG && Date.now() - cfgAt < 300_000) return CFG;
  const r = await fetch(CFG_URL + '?t=' + Math.floor(Date.now() / 300_000), { cache: 'no-store' });
  if (!r.ok) { if (CFG) return CFG; throw new Error('config'); }
  CFG = await r.json(); cfgAt = Date.now(); return CFG;
}
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const clip = (s: unknown, n = 300) => String(s ?? '').trim().slice(0, n);
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const ils = (n: number) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(n) + ' ₪';
const rand = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[b % 56]).join(''); };
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
// deno-lint-ignore no-explicit-any
const getDoc = async (coll: string, id: string): Promise<any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };

// ---- the same rules as the order form (svc-app.js) ----
// deno-lint-ignore no-explicit-any
function visible(f: any, a: any) {
  const w = f.when; if (!w) return true; const v = a[w.k];
  if (w.v !== undefined) return v === w.v;
  if (w.has !== undefined) return Array.isArray(v) && v.includes(w.has);
  if (w.not !== undefined) return v !== undefined && v !== '' && v !== w.not;
  if (w.min !== undefined) return Array.isArray(v) && v.length >= w.min;
  return true;
}
// deno-lint-ignore no-explicit-any
function price(svc: any, c: any, a: any, meet: string) {
  const lines: { l: string; p: number }[] = []; let net = 0;
  const add = (l: string, p: number) => { if (p) { lines.push({ l, p }); net += p; } };
  if (svc.base) add(svc.title, svc.base);
  for (const f of svc.fields) {
    if (!visible(f, a)) continue;
    // deno-lint-ignore no-explicit-any
    if (f.t === 'choice') for (const o of f.opts || []) if (a[f.k] === o.v && o.p) add(o.line || o.l, o.p);
    // deno-lint-ignore no-explicit-any
    if (f.t === 'checks') for (const o of f.opts || []) if (Array.isArray(a[f.k]) && a[f.k].includes(o.v) && o.p) add(o.line || o.l, o.p);
    if (f.t === 'list' && f.each) { const n = (a[f.k] || []).length, extra = Math.max(0, n - (f.free || 0)); if (extra) add((f.line || f.item) + (extra > 1 ? ' × ' + extra : ''), extra * f.each); }
  }
  if (svc.sign === 'meet' && meet && c.meeting[meet]?.p) add(c.meeting[meet].line || c.meeting[meet].l, c.meeting[meet].p);
  const vat = Math.round(net * c.vat * 100) / 100;
  return { lines, net, vat, total: Math.round((net + vat) * 100) / 100 };
}
// deno-lint-ignore no-explicit-any
function reviews(svc: any, a: any) {
  const out: string[] = [];
  for (const f of svc.fields) {
    if (!visible(f, a) || !f.opts) continue;
    for (const o of f.opts) { const on = f.t === 'checks' ? (Array.isArray(a[f.k]) && a[f.k].includes(o.v)) : a[f.k] === o.v; if (on && o.review) out.push(o.review); }
  }
  return out;
}
// keep only the answers the service asks, in the shape it asks them (nothing else is stored)
// deno-lint-ignore no-explicit-any
function cleanAnswers(svc: any, a: any) {
  // deno-lint-ignore no-explicit-any
  const out: any = {};
  for (const f of svc.fields) {
    if (!visible(f, a) || f.t === 'file') continue;
    const v = a[f.k];
    if (f.t === 'choice') { if ((f.opts || []).some((o: { v: string }) => o.v === v)) out[f.k] = v; }
    else if (f.t === 'checks') { if (Array.isArray(v)) out[f.k] = v.filter(x => (f.opts || []).some((o: { v: string }) => o.v === x)); }
    else if (f.t === 'list') {
      // deno-lint-ignore no-explicit-any
      out[f.k] = (Array.isArray(v) ? v : []).slice(0, f.max || 10).map((r: any) => { const o: Record<string, string> = {}; for (const g of f.fields) o[g.k] = clip(r?.[g.k], 200); return o; });
    } else if (f.t === 'slot') out[f.k] = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$|^later$/.test(String(v || '')) ? String(v) : '';
    else out[f.k] = clip(v, f.t === 'textarea' ? 3000 : 300);
  }
  return out;
}
// deno-lint-ignore no-explicit-any
function missing(svc: any, a: any) {
  for (const f of svc.fields) {
    if (!visible(f, a) || !f.req || f.t === 'file') continue;
    const v = a[f.k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return f.q;
  }
  for (const f of svc.fields) {
    if (!visible(f, a) || f.t !== 'list') continue;
    const r = f.lim && f.lim[a[f.lim.k]], min = r ? r[0] : (f.min || 0), max = r ? r[1] : (f.max || 10), n = (a[f.k] || []).length;
    if (n < min || n > max) return f.q;
    // deno-lint-ignore no-explicit-any
    for (const row of a[f.k] || []) for (const g of f.fields) if (g.req && !String((row as any)[g.k] || '').trim()) return f.q + ': ' + g.q;
  }
  return '';
}
const okPhone = (p: string) => { const s = String(p || '').trim(); if (/^(\+|00)/.test(s)) { const x = digits(s); return x.length >= 8 && x.length <= 15; } let d = digits(s); if (d.startsWith('972')) d = '0' + d.slice(3); return /^0\d{8,9}$/.test(d); };
const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
const FILE_RE = /\.(pdf|jpe?g|png|heic|heif|webp|docx?|tiff?)$/i;
// 9.11.2026: the storage key is technical ASCII only (the storage refuses Hebrew and other non ASCII names); the original
// name stays in the order record for the office panel and the download name.
const fileExt = (n: string) => { const m = String(n || '').toLowerCase().match(/\.(pdf|jpe?g|png|heic|heif|webp|docx?|tiff?)$/); return m ? '.' + m[1] : ''; };
const today = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const normPhone = (p: string) => { let d = digits(p); if (d.startsWith('972')) d = '0' + d.slice(3); return d; };

// ---- the payment (Morning, connected 11.10.2026: MORNING_API_ID / MORNING_API_SECRET in app_secrets) ----
// payLink: a hosted Morning payment page for the order total (credit card / Bit, by the clearing connected in Morning).
// Morning issues the receipt itself. The callback URL carries a secret key known only to this server and Morning.
// Without clearing in Morning (or on any error) there is no link: the client gets one by email later and Yakir a Telegram.
const MORNING = 'https://api.greeninvoice.co.il/api/v1';
let mTok = '', mTokAt = 0;
// 9.11.2026: Morning moved the token to its OAuth server in June 2026 (the old /account/token answers 404 for every key, so
// no payment link was created since then). Same API key, sent as client_id / client_secret; the token lives one hour.
async function morningToken() {
  if (mTok && Date.now() - mTokAt < 40 * 60e3) return mTok;
  const id = env('MORNING_API_ID'), secret = env('MORNING_API_SECRET');
  if (!id || !secret) { await telegram('⚠️ חסרים פרטי החיבור למורנינג, ולכן לא נוצרים קישורי תשלום באתר.').catch(() => false); return ''; }
  const r = await fetch('https://api.morning.co/idp/v1/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  const t = j.accessToken || j.access_token || j.token;
  if (!r.ok || !t) { await telegram(`⚠️ מורנינג לא מאשר את החיבור (${r.status} ${String(j.error || j.errorMessage || '').slice(0, 80)}), ולכן לא נוצרים קישורי תשלום באתר.`).catch(() => false); return ''; }
  mTok = t; mTokAt = Date.now(); return mTok;
}
// deno-lint-ignore no-explicit-any
async function morning(path: string, method = 'GET', body?: any) {
  const t = await morningToken(); if (!t) return { status: 0, j: { errorMessage: 'no token' } };
  const r = await fetch(MORNING + path, { method, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  return { status: r.status, j };
}
// the active payment plugin (clearing) in Morning; remembered in settings/pay.morning.pluginId
async function plugin(): Promise<string> {
  const s = await getDoc('settings', 'pay'); const known = s && s.morning && s.morning.pluginId;
  if (known) return known;
  const { j } = await morning('/documents/info?type=320');
  // deno-lint-ignore no-explicit-any
  const p = ((j && j.paymentPlugins) || []).find((x: any) => x.active);
  if (p && p.id) await merge('settings', 'pay', { morning: { ...(s && s.morning || {}), pluginId: p.id, pluginName: p.friendlyName || '' } });
  return (p && p.id) || '';
}
// deno-lint-ignore no-explicit-any
async function payLink(id: string, o: any): Promise<string> {
  try {
    if (!(await morningToken())) return '';
    const pluginId = await plugin();
    if (!pluginId) { await telegram(`⚠️ אין סליקה פעילה במורנינג, ולכן להזמנה ${id} לא נוצר קישור תשלום. הלקוח יקבל קישור במייל אחר כך.`).catch(() => false); return ''; }
    const payKey = rand(24);
    const hook = `${env('SUPABASE_URL')}/functions/v1/services?step=paid&id=${encodeURIComponent(id)}&k=${payKey}`;
    const body = {
      description: `${o.title} (הזמנה ${id})`, type: 320, lang: 'he', currency: 'ILS', vatType: 0,
      // 11.11.2026 (Yakir approved): payment in up to 3 credit card payments, on orders of 300 ILS or more.
      // Morning accepted maxPayments 3 with the Grow clearing in a test form the same day.
      amount: o.price.total, maxPayments: o.price.total >= 300 ? 3 : 1, pluginId,
      client: { name: o.c.name, emails: o.c.email ? [o.c.email] : [], phone: o.c.phone || '', add: true },
      successUrl: `${SITE}/online/thanks/?id=${encodeURIComponent(id)}`, failureUrl: `${SITE}/online/thanks/?id=${encodeURIComponent(id)}&failed=1`,
      notifyUrl: hook, custom: id, remarks: `הזמנה מקוונת ${id}`,
    };
    const { status, j } = await morning('/payments/form', 'POST', body);
    const url = typeof j.url === 'string' ? j.url : (j.url && (j.url.he || j.url.origin)) || '';
    if (!url || j.errorCode) {
      await telegram(`⚠️ מורנינג לא יצר קישור תשלום להזמנה ${id} (${status} ${j.errorCode || ''} ${String(j.errorMessage || '').slice(0, 120)}).`).catch(() => false);
      return '';
    }
    await merge('svc', id, { payKey, payAt: new Date().toISOString() });
    return url;
  } catch (e) { console.error(e); return ''; }
}
// Morning's server callback after a successful payment: the order becomes "paid" (only with the order's secret key)
async function paid(url: URL, req: Request) {
  const id = clip(url.searchParams.get('id'), 40), k = clip(url.searchParams.get('k'), 40);
  const o = id ? await getDoc('svc', id) : null;
  if (!o || !o.payKey || k !== o.payKey) return json({ ok: false }, 404);
  if (o.status === 'paid' || o.paidAt) { if (!o.calEventId) await addToCalendar(id, o).catch((e) => { console.error(e); return ''; }); return json({ ok: true, again: true }); }
  // deno-lint-ignore no-explicit-any
  const p: any = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  await merge('svc', id, { status: 'paid', paidAt: now, payment: { amount: p.amount ?? o.price.total, doc: p.documentId || p.id || '', ref: clip(p.transactionId || p.reference || '', 80) },
    log: (o.log || []).concat([{ at: now, kind: 'paid', text: 'התשלום התקבל במורנינג' }]) });
  if (o.svc === 'precheck') await admin().rpc('docs_merge', { p_coll: 'chk', p_id: id, p_patch: { status: 'paid', paidAt: now } });
  // 9.11.2026: the database call is not a promise with .catch (that crashed this callback after every payment, so no
  // Telegram and nothing after it ran)
  if (o.clientId) { const { error: ne } = await admin().from('docs').insert({ coll: 'notes', id: 'n-' + Date.now().toString(36) + rand(4).toLowerCase(), data: { refType: 'client', refId: o.clientId, kind: 'system', date: now, text: `התקבל תשלום ${ils(o.price.total)} עבור ${o.title} (הזמנה מהאתר ${id})` } }); if (ne) console.error(ne); }
  let zl = '';
  try { zl = await zoomMeeting(id, o); if (zl) await zoomMail(id, o, zl); } catch (e) { console.error(e); await telegram(`⚠️ לא נוצר קישור זום להזמנה ${id} (${String((e as Error).message || e).slice(0, 120)}). צריך לשלוח ללקוח קישור ידנית.`).catch(() => false); }
  const ev = await addToCalendar(id, o).catch((e) => { console.error(e); return ''; });
  await telegram(`${zl ? '🎥 נוצר קישור זום ונשלח ללקוח במייל.\n' : ''}💳 שולם: ${o.title} · ${ils(o.price.total)}\n👤 ${o.c.name} · 📞 ${o.c.phone}${o.slot && o.slot !== 'later' ? `\n🗓 ${o.slot.split(' ')[0].split('-').reverse().join('.')} ${o.slot.split(' ')[1] || ''}${ev ? ' (נכנס ליומן)' : ' (⚠️ לא נכנס ליומן, צריך להוסיף ידנית)'}` : ''}${o.src && o.src.chName ? `\n📣 מקור: ${o.src.chName}` : ''}\nמספר: ${id}`).catch(() => false);
  return json({ ok: true });
}

// ---- Yakir's Google Calendar (9.11.2026) ----
// The calendar is shared with the service account (GOOGLE_SA_JSON). Busy times come from the free/busy query, which also
// covers recurring events and reminders; events marked "free" in the calendar are not busy.
const CAL_ID = () => (CFG && CFG.hours && CFG.hours.calendar) || 'dabullaw@gmail.com';
const b64url = (b: Uint8Array | string) => btoa(typeof b === 'string' ? unescape(encodeURIComponent(b)) : String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
let gTok = '', gTokAt = 0;
async function gToken(): Promise<string> {
  if (gTok && Date.now() - gTokAt < 45 * 60e3) return gTok;
  const sa = JSON.parse(env('GOOGLE_SA_JSON') || '{}'); if (!sa.client_email || !sa.private_key) throw new Error('no service account');
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claim + '.' + b64url(sig) }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('google token ' + r.status + ' ' + (j.error || ''));
  gTok = j.access_token; gTokAt = Date.now(); return gTok;
}
// Israel local "YYYY-MM-DD" + "HH:MM" -> epoch ms (handles summer / winter time)
function ilOffsetMs(t: number) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t));
  const g = (k: string) => +(p.find(x => x.type === k)?.value || 0);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - t;
}
function ilTime(date: string, hm: string) {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - ilOffsetMs(guess); t = guess - ilOffsetMs(t); return t;
}
const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMin = (s: string) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
let busyCache: { at: number; list: [number, number][] } | null = null;
async function busyTimes(fromMs: number, toMs: number): Promise<[number, number][]> {
  if (busyCache && Date.now() - busyCache.at < 60_000) return busyCache.list;
  const t = await gToken();
  const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify({ timeMin: new Date(fromMs).toISOString(), timeMax: new Date(toMs).toISOString(), timeZone: 'Asia/Jerusalem', items: [{ id: CAL_ID() }] }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  const cal = j.calendars && j.calendars[CAL_ID()];
  if (!r.ok || !cal || (cal.errors && cal.errors.length)) throw new Error('freebusy ' + r.status + ' ' + JSON.stringify((cal && cal.errors) || j.error || '').slice(0, 200));
  const list = (cal.busy || []).map((b: { start: string; end: string }) => [Date.parse(b.start), Date.parse(b.end)] as [number, number]);
  busyCache = { at: Date.now(), list }; return list;
}
// one Telegram to Yakir at most every 6 hours when the calendar cannot be read (the form then offers no times)
async function calAlert(why: string) {
  try {
    const s = await getDoc('settings', 'svc'); const last = s && s.calAlertAt ? Date.parse(s.calAlertAt) : 0;
    if (Date.now() - last < 6 * 3600e3) return;
    await merge('settings', 'svc', { calAlertAt: new Date().toISOString() });
    await telegram(`⚠️ טופס הייעוץ בזום באתר לא מצליח לקרוא את היומן שלך, ולכן כרגע לא מוצגים מועדים (הלקוחות מתבקשים לכתוב מתי נוח להם). פרטים: ${why.slice(0, 200)}`);
  } catch (e) { console.error(e); }
}
// orders that hold a time: everything except cancelled / refunded, and a draft (not completed) only for 30 minutes
// deno-lint-ignore no-explicit-any
function holds(r: any, exceptPhone = '') {
  const o = r.data || {}; if (!o.slot || o.slot === 'later') return false;
  if (['cancelled', 'refund'].includes(o.status)) return false;
  if (o.status === 'draft') {
    if (Date.now() - Date.parse(o.created || 0) > 30 * 60e3) return false;
    if (exceptPhone && normPhone(o.c?.phone || '') === exceptPhone) return false;
  }
  return true;
}
// deno-lint-ignore no-explicit-any
const orderSpan = (o: any): [number, number] => { const [d, t] = String(o.slot).split(' '); const s = ilTime(d, t); return [s, s + (+o.slotLen || +o.a?.len || 60) * 60e3]; };
const overlaps = (a: [number, number], list: [number, number][]) => list.some(b => a[0] < b[1] && b[0] < a[1]);
// the free start times for a meeting of len minutes
async function freeDays(len: number, exceptPhone = '') {
  const c = await cfg(), h = c.hours, names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const from = toMin(h.from || '10:00'), to = toMin(h.to || '15:00'), step = +h.step || 30, span = Math.max(1, +h.horizonDays || 14);
  const d = today(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + (h.notBefore ?? 1));
  const first = ymd(d), endD = new Date(d); endD.setDate(endD.getDate() + span);
  const busy = await busyTimes(ilTime(first, '00:00'), ilTime(ymd(endD), '00:00'));
  const { data } = await admin().from('docs').select('data').eq('coll', 'svc').gte('data->>slot', first);
  const taken = (data || []).filter((r: { data: unknown }) => holds(r, exceptPhone)).map((r: { data: unknown }) => orderSpan((r as { data: unknown }).data));
  const block = new Set(((await getDoc('settings', 'svc'))?.blocked || []) as string[]); // days or "date time" Yakir closed
  const days = [];
  for (let i = 0; i < span; i++, d.setDate(d.getDate() + 1)) {
    const date = ymd(d);
    if (!h.days.includes(d.getDay()) || block.has(date)) continue;
    const times: string[] = [];
    for (let m = from; m + len <= to; m += step) {
      const t = hm(m), s = ilTime(date, t), iv: [number, number] = [s, s + len * 60e3];
      if (block.has(`${date} ${t}`) || overlaps(iv, busy) || overlaps(iv, taken)) continue;
      times.push(t);
    }
    if (times.length) days.push({ date, dow: names[d.getDay()], label: `${d.getDate()}.${d.getMonth() + 1}`, times });
  }
  return days;
}
const lenOf = (v: unknown) => (+String(v || '') === 60 ? 60 : 30);
// deno-lint-ignore no-explicit-any
async function slots(b: any) {
  try { return json({ days: await freeDays(lenOf(b.len)), cal: 'ok' }); }
  catch (e) { console.error(e); await calAlert(String((e as Error).message || e)); return json({ days: [], cal: 'error' }); }
}
// ---- Zoom (9.11.2026, Yakir: "תעשה את כל החיבורים... ושישלח גם קישור ללקוח לזום") ----
// Server-to-Server OAuth app in Yakir's Zoom account (free plan: meetings are limited to 40 minutes, he accepted that).
// Secrets in app_secrets: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET (optional ZOOM_USER, default "me" is not
// allowed for this app type, so the account owner's email is used). Without them nothing happens (Yakir sends the link).
let zTok = '', zTokAt = 0;
async function zoomToken(): Promise<string> {
  if (zTok && Date.now() - zTokAt < 50 * 60e3) return zTok;
  const acc = env('ZOOM_ACCOUNT_ID'), id = env('ZOOM_CLIENT_ID'), sec = env('ZOOM_CLIENT_SECRET');
  if (!acc || !id || !sec) return '';
  const r = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(acc)}`, { method: 'POST', headers: { authorization: 'Basic ' + btoa(id + ':' + sec) } });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('zoom token ' + r.status + ' ' + (j.reason || j.error || ''));
  zTok = j.access_token; zTokAt = Date.now(); return zTok;
}
// creates the Zoom meeting for a paid order (once) and returns its join link
// deno-lint-ignore no-explicit-any
async function zoomMeeting(id: string, o: any): Promise<string> {
  if (o.zoom && o.zoom.join) return o.zoom.join;
  if (!o.slot || o.slot === 'later') return '';
  const t = await zoomToken(); if (!t) return '';
  const user = env('ZOOM_USER') || 'dabullaw@gmail.com';
  const [d, hmv] = String(o.slot).split(' ');
  const r = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(user)}/meetings`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify({ topic: `ייעוץ עם עו״ד יקיר דבול: ${o.c.name}`, type: 2, start_time: `${d}T${hmv}:00`, timezone: 'Asia/Jerusalem', duration: +o.slotLen || 30,
      agenda: `הזמנה ${id}`, settings: { waiting_room: true, join_before_host: false, mute_upon_entry: false, approval_type: 2 } }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.join_url) throw new Error('zoom meeting ' + r.status + ' ' + (j.message || ''));
  await merge('svc', id, { zoom: { id: j.id, join: j.join_url, pass: j.password || '', at: new Date().toISOString() } });
  o.zoom = { join: j.join_url, pass: j.password || '' };
  return j.join_url;
}
// the client's email with the Zoom link
// deno-lint-ignore no-explicit-any
async function zoomMail(id: string, o: any, link: string) {
  const [d, t] = String(o.slot).split(' '); const first = String(o.c.name || '').split(' ')[0];
  const html = shell('הקישור לפגישה בזום', `<p style="font-size:15px;line-height:1.7">שלום ${esc(first)}, תודה על התשלום. הפגישה שלכם עם עו״ד יקיר דבול נקבעה ל־<b>${esc(d.split('-').reverse().join('.'))} בשעה ${esc(t)}</b> (${+o.slotLen || 30} דקות).</p>
    <p><a href="${esc(link)}" style="display:inline-block;background:#1c1b19;color:#fff;text-decoration:none;border-radius:99px;padding:12px 22px;font-weight:800">כניסה לפגישה בזום</a></p>
    <p style="font-size:13.5px;color:#6b7280;line-height:1.6;word-break:break-all">אם הכפתור לא נפתח, אפשר להעתיק את הקישור: ${esc(link)}${o.zoom && o.zoom.pass ? `<br>סיסמה: ${esc(o.zoom.pass)}` : ''}</p>
    <p style="font-size:14.5px;line-height:1.7">כדאי להיכנס כמה דקות לפני, ממחשב או מהטלפון. אם צריך לשנות מועד, אפשר להשיב למייל הזה עד 24 שעות לפני הפגישה. מספר הזמנה: ${esc(id)}.</p>`);
  const r = await mail(o.c.email, 'הקישור לפגישת הייעוץ בזום', html);
  if (r.ok) await merge('svc', id, { zoomMailedAt: new Date().toISOString(), log: (o.log || []).concat([{ at: new Date().toISOString(), kind: 'mail', text: 'נשלח ללקוח מייל עם הקישור לזום' }]) });
  return r.ok;
}
// after payment: the meeting goes into Yakir's calendar
// deno-lint-ignore no-explicit-any
async function addToCalendar(id: string, o: any): Promise<string> {
  if (!o.slot || o.slot === 'later' || o.calEventId) return o.calEventId || '';
  const c = await cfg(); const svc = c.services.find((s: { id: string }) => s.id === o.svc) || { fields: [] };
  const [d, t] = String(o.slot).split(' '); const len = +o.slotLen || 60;
  const end = hm(toMin(t) + len);
  // deno-lint-ignore no-explicit-any
  const label = (k: string) => { const f = svc.fields.find((x: any) => x.k === k); const v = o.a?.[k]; const op = f && (f.opts || []).find((x: { v: string }) => x.v === v); return op ? op.l : (v || ''); };
  const desc = [`טלפון: ${o.c.phone}`, `מייל: ${o.c.email}`, `נושא: ${label('area')}`, o.a?.topic ? `במה נעסוק: ${o.a.topic}` : '', o.a?.other ? `הצד השני: ${o.a.other}` : '', o.c.note ? `הערה: ${o.c.note}` : '',
    `אורך: ${len} דקות · שולם ${ils(o.price.total)}`, `מספר הזמנה: ${id}`, o.zoom && o.zoom.join ? `זום: ${o.zoom.join}` : 'הקישור לזום עוד לא נשלח ללקוח.'].filter(Boolean).join('\n');
  const tk = await gToken();
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL_ID())}/events`, { method: 'POST', headers: { authorization: `Bearer ${tk}`, 'content-type': 'application/json' },
    body: JSON.stringify({ summary: `ייעוץ בזום: ${o.c.name}`, description: desc, location: (o.zoom && o.zoom.join) || '', start: { dateTime: `${d}T${t}:00`, timeZone: 'Asia/Jerusalem' }, end: { dateTime: `${d}T${end}:00`, timeZone: 'Asia/Jerusalem' } }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) { console.error('calendar insert', r.status, JSON.stringify(j).slice(0, 300)); return ''; }
  await merge('svc', id, { calEventId: j.id });
  return j.id;
}

// ---- where the buyer came from (11.10.2026, Yakir: the finances must show where every sale comes from) ----
// The form sends the first visit's source (utm, click ids, the outside referrer, the landing page) and the page that led
// to the form. Here it is cleaned and given one channel name, so the office report can count sales per channel.
// deno-lint-ignore no-explicit-any
function cleanSrc(x: any) {
  const t = (k: string, n = 200) => clip(x?.[k], n);
  const one = (v: any) => v && typeof v === 'object' ? { utm_source: clip(v.utm_source, 80).toLowerCase(), utm_medium: clip(v.utm_medium, 80).toLowerCase(), utm_campaign: clip(v.utm_campaign, 120), utm_term: clip(v.utm_term, 120), utm_content: clip(v.utm_content, 120), gclid: v.gclid ? 1 : 0, fbclid: v.fbclid ? 1 : 0, ref: clip(v.ref, 200), landing: clip(v.landing, 300), at: clip(v.at, 30) } : null;
  return { first: one(x?.first), last: one(x?.last), from: t('from', 300) };
}
const CH: Record<string, string> = { gads: 'גוגל ממומן', fbads: 'פייסבוק/אינסטגרם ממומן', seo: 'גוגל אורגני', bing: 'בינג', social: 'רשתות חברתיות', ai: 'צ׳אטבוטים (AI)', email: 'מייל / ניוזלטר', wa: 'וואטסאפ', ref: 'אתרים מפנים', site: 'מתוך האתר', direct: 'ישיר / לא ידוע' };
// deno-lint-ignore no-explicit-any
function channel(v: any): string {
  if (!v) return 'direct';
  const s = v.utm_source || '', m = v.utm_medium || '', r = String(v.ref || '').toLowerCase();
  if (v.gclid || (/google/.test(s) && /cpc|ppc|paid|ads/.test(m))) return 'gads';
  if (v.fbclid && /cpc|paid|ads/.test(m) || (/facebook|fb|instagram|ig|meta/.test(s) && /cpc|paid|ads/.test(m))) return 'fbads';
  if (/mail|newsletter/.test(m + s)) return 'email';
  if (/whatsapp|wa/.test(s) || /whatsapp/.test(r)) return 'wa';
  if (/facebook|fb|instagram|ig|tiktok|linkedin|youtube|twitter|x\.com/.test(s + ' ' + r) || v.fbclid) return 'social';
  if (/chatgpt|openai|perplexity|gemini|claude|copilot/.test(s + ' ' + r)) return 'ai';
  if (/google\./.test(r)) return 'seo';
  if (/bing\.|duckduckgo|yahoo/.test(r)) return 'bing';
  if (s) return 'ref';
  if (r && !/dabullaw\.co\.il/.test(r)) return 'ref';
  return 'direct';
}

// ---- a new order ----
// deno-lint-ignore no-explicit-any
async function order(b: any, req: Request) {
  if (String(b.website || '').trim()) return json({ ok: true, id: 'x', token: 'x', uploads: [] }); // spam trap
  const c = await cfg();
  // deno-lint-ignore no-explicit-any
  const svc = c.services.find((s: any) => s.id === b.svc); if (!svc) return json({ ok: false, error: 'שירות לא מוכר' }, 400);
  const a = cleanAnswers(svc, b.a || {});
  const miss = missing(svc, a); if (miss) return json({ ok: false, error: 'חסר: ' + miss }, 400);
  const ct = { name: clip(b.c?.name, 80), phone: clip(b.c?.phone, 30), email: clip(b.c?.email, 120).toLowerCase(), note: clip(b.c?.note, 2000) };
  if (!ct.name || !okPhone(ct.phone) || !okEmail(ct.email)) return json({ ok: false, error: 'פרטי הקשר לא תקינים' }, 400);
  const meet = svc.sign === 'meet' ? (c.meeting[b.meet] ? b.meet : 'office') : '';
  // the time must still be free: in the calendar, and not held by another order (this client's own unfinished try does not count)
  const slotLen = a.slot && a.slot !== 'later' ? lenOf(a.len) : 0;
  if (slotLen) {
    const [d, t] = a.slot.split(' ');
    let days: { date: string; times: string[] }[] = [];
    try { days = await freeDays(slotLen, normPhone(ct.phone)); } catch (e) { console.error(e); return json({ ok: false, code: 'slot', error: 'לא הצלחנו לבדוק עכשיו את המועד. נסו שוב בעוד דקה, או התקשרו 09-8613413.' }, 503); }
    if (!days.some(x => x.date === d && x.times.includes(t))) return json({ ok: false, code: 'slot', error: 'המועד שבחרתם כבר לא פנוי. בחרו בבקשה מועד אחר.' }, 409);
  }
  // not more than 5 orders from the same phone in an hour
  const { data: recent } = await admin().from('docs').select('id').eq('coll', 'svc').eq('data->c->>phone', ct.phone).gte('data->>created', new Date(Date.now() - 3600_000).toISOString());
  if ((recent || []).length >= 5) return json({ ok: false, error: 'נשלחו כבר כמה הזמנות. נחזור אליכם.' }, 429);
  const files = (Array.isArray(b.files) ? b.files : []).slice(0, 30)
    // deno-lint-ignore no-explicit-any
    .filter((f: any) => svc.fields.some((x: { k: string; t: string }) => x.k === f.k && x.t === 'file') && FILE_RE.test(String(f.name)) && +f.size > 0 && +f.size <= 15 * 1024 * 1024);
  const p = price(svc, c, a, meet), rv = reviews(svc, a);
  const now = new Date().toISOString(), dd = today();
  const id = `S${String(dd.getFullYear()).slice(2)}${String(dd.getMonth() + 1).padStart(2, '0')}${String(dd.getDate()).padStart(2, '0')}-${rand(4).toUpperCase()}`;
  const token = rand(24);
  const uploads = [], stored = [];
  for (const f of files) {
    const path = `svc/${id}/${String(f.k).replace(/[^a-z0-9_]/gi, '')}-${+f.i || 0}-${rand(6)}${fileExt(f.name)}`;
    const { data, error } = await admin().storage.from('files').createSignedUploadUrl(path);
    if (error || !data) { console.error('signed upload', error); continue; }
    uploads.push({ k: f.k, i: f.i, url: data.signedUrl });
    stored.push({ k: f.k, name: clip(f.name, 120), size: +f.size, path, up: false });
  }
  const o = { svc: svc.id, title: svc.title, a, c: ct, meet, price: p, review: rv, status: 'draft', token, files: stored, slot: a.slot || '', slotLen,
    created: now, page: clip(b.page, 300), src: (() => { const x = cleanSrc(b.src || {}); const ch = channel(x.last || x.first); return { ...x, ch, chName: CH[ch], firstCh: channel(x.first) }; })(), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(), log: [{ at: now, kind: 'created', text: 'הזמנה נשלחה מהאתר' }] };
  const { error } = await admin().from('docs').insert({ coll: 'svc', id, data: o });
  if (error) { console.error(error); return json({ ok: false, error: 'השמירה נכשלה' }, 500); }
  return json({ ok: true, id, token, uploads, review: rv.length > 0 });
}

// ---- the client card in the office system (11.10.2026, Yakir: what a client bought shows in his card) ----
// An existing card with the same phone or email is used; otherwise a new card is opened (tag "אונליין").
// deno-lint-ignore no-explicit-any
async function linkClient(id: string, o: any): Promise<string> {
  if (o.clientId) return o.clientId;
  const ph = normPhone(o.c.phone), em = String(o.c.email || '').trim().toLowerCase();
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'clients');
  // deno-lint-ignore no-explicit-any
  const hit = (data || []).find((r: any) => (ph && ph.length >= 9 && normPhone(r.data?.phone || '') === ph) || (em && String(r.data?.email || '').trim().toLowerCase() === em));
  let cid = hit ? hit.id : '';
  const today = ymd(new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })));
  if (!cid) {
    cid = 'c-' + Date.now().toString(36) + rand(4).toLowerCase();
    await admin().from('docs').insert({ coll: 'clients', id: cid, data: { name: o.c.name, phone: o.c.phone, email: em, idNo: '', address: '', notes: '', tags: ['אונליין'], source: 'אתר: שירותים אונליין' + (o.src && o.src.chName ? ' · ' + o.src.chName : ''), created: today } });
  }
  await admin().from('docs').insert({ coll: 'notes', id: 'n-' + Date.now().toString(36) + rand(4).toLowerCase(), data: { refType: 'client', refId: cid, kind: 'system', date: new Date().toISOString(), text: `הזמנה מהאתר: ${o.title} · ${ils(o.price.total)} · מספר ${id}` } });
  return cid;
}

// ---- after the files were uploaded ----
// deno-lint-ignore no-explicit-any
async function uploaded(b: any) {
  const id = clip(b.id, 40), o = await getDoc('svc', id);
  if (!o || o.token !== b.token) return json({ ok: false, error: 'not found' }, 404);
  if (o.status !== 'draft') return json({ ok: true, payUrl: o.payUrl || '' });
  const { data: list } = await admin().storage.from('files').list(`svc/${id}`, { limit: 100 });
  const have = new Set((list || []).map((x: { name: string }) => `svc/${id}/${x.name}`));
  // deno-lint-ignore no-explicit-any
  const files = (o.files || []).map((f: any) => ({ ...f, up: have.has(f.path) }));
  // deno-lint-ignore no-explicit-any
  const lost = files.filter((f: any) => !f.up).map((f: any) => f.name).concat((Array.isArray(b.failed) ? b.failed : []).map((x: unknown) => clip(x, 120)).filter((n: string) => n && !files.some((f: { name: string; up: boolean }) => f.name === n && f.up)));
  const lostNames = [...new Set(lost)];
  const review = (o.review || []).length > 0, now = new Date().toISOString();
  const clientId = await linkClient(id, o).catch((e) => { console.error(e); return ''; });
  const payUrl = review ? '' : await payLink(id, o);
  const status = review ? 'review' : 'awaiting';
  const upN = files.filter((f: { up: boolean }) => f.up).length;
  await merge('svc', id, { files, status, payUrl, clientId, missingFiles: lostNames, log: (o.log || []).concat([{ at: now, kind: 'files', text: (upN === 1 ? 'קובץ אחד התקבל' : `${upN} קבצים התקבלו`) + (lostNames.length ? ` · לא עלו: ${lostNames.join(', ')}` : '') }]) });
  // the precheck service keeps its own answer panel (addon-check, coll chk)
  if (o.svc === 'precheck') {
    const a = o.a || {};
    await admin().from('docs').upsert({ coll: 'chk', id, data: { svcId: id, city: a.city, address: a.address, gush: a.gush, chelka: a.helka, sub: a.sub, floor: a.floor, askPrice: a.askPrice, link: a.link,
      buyer: a.buyer, mortgage: a.mortgage, worry: a.worry, reg: a.reg, clientId, name: o.c.name, phone: o.c.phone, email: o.c.email, status: review ? 'review' : 'pending', created: o.created, page: o.page } });
  }
  const c = await cfg(); const svc = c.services.find((s: { id: string }) => s.id === o.svc) || { title: o.title };
  const when = o.slot && o.slot !== 'later' ? `\n🗓 ${o.slot.split(' ')[0].split('-').reverse().join('.')} ${o.slot.split(' ')[1] || ''}` : '';
  // Telegram (Yakir, 11.10.2026): when a client paid (payment webhook), and here only when an order needs his check before
  // payment. Orders that only wait for payment are not sent. 9.11.2026: also when a document the client attached did not upload.
  if (review) await telegram(`🔎 הזמנה אונליין לבדיקה לפני תשלום\n${svc.title} · ${ils(o.price.total)}\n👤 ${o.c.name}\n📞 ${o.c.phone}\n✉️ ${o.c.email}${when}\n⚠️ ${o.review.join(', ')}${o.src && o.src.chName ? `\n📣 מקור: ${o.src.chName}` : ''}\nמספר: ${id}`).catch(() => false);
  if (lostNames.length) await telegram(`📎 חסר מסמך בהזמנה מהאתר\n${svc.title} · ${o.c.name} · 📞 ${o.c.phone}\nהמסמכים שלא עלו: ${lostNames.join(', ')}\nההזמנה המשיכה לתשלום. כדאי לבקש מהלקוח לשלוח את המסמך במייל.\nמספר: ${id}`).catch(() => false);
  await mail(o.c.email, review ? `קיבלנו את הפרטים: ${svc.title}` : `ההזמנה התקבלה: ${svc.title}`, receipt({ ...o, files, status, payUrl }, svc, id)).catch(() => null);
  return json({ ok: true, payUrl });
}

async function mail(to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('NL_FROM') || 'יקיר דבול - משרד עורכי דין <office@dabullaw.co.il>', to: [to], reply_to: 'office@dabullaw.co.il', subject, html }) });
  // deno-lint-ignore no-explicit-any
  const d: any = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d.message || r.status };
}
// deno-lint-ignore no-explicit-any
function shell(title: string, inner: string) {
  return `<div dir="rtl" style="background:#f7f4ee;padding:20px 10px;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" style="max-width:620px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e6dcc6" cellpadding="0" cellspacing="0"><tr><td style="padding:22px">
    <div style="color:#8b6f47;font-weight:800;font-size:13px">יקיר דבול - משרד עורכי דין</div><h1 style="margin:6px 0 10px;font-size:21px;color:#1c1b19">${esc(title)}</h1>${inner}
    <p style="font-size:12.5px;color:#6b7280;line-height:1.6;margin:18px 0 0">שאלות? אפשר להשיב למייל הזה או להתקשר: 09-8613413<br>יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה</p></td></tr></table></div>`;
}
// deno-lint-ignore no-explicit-any
function receipt(o: any, svc: any, id: string) {
  const first = String(o.c.name || '').split(' ')[0];
  const rows = o.price.lines.map((l: { l: string; p: number }) => `<tr><td style="padding:4px 0">${esc(l.l)}</td><td style="padding:4px 0;text-align:left">${ils(l.p)}</td></tr>`).join('')
    + `<tr><td style="padding:4px 0;color:#6b7280">מע״מ</td><td style="padding:4px 0;text-align:left;color:#6b7280">${ils(o.price.vat)}</td></tr><tr><td style="padding:8px 0;font-weight:800;border-top:1px solid #e6dcc6">סה״כ</td><td style="padding:8px 0;text-align:left;font-weight:800;border-top:1px solid #e6dcc6">${ils(o.price.total)}</td></tr>`;
  const next = o.status === 'review'
    ? '<p style="font-size:15px;line-height:1.7">לפי מה שמילאתם, המקרה צריך בדיקה קצרה לפני שמתחילים. נעבור על הפרטים ונחזור אליכם בתוך יום עבודה, לפני כל תשלום.</p>'
    : o.payUrl ? `<p style="font-size:15px;line-height:1.7">כדי שנתחיל, נשאר רק לשלם:</p><p><a href="${esc(o.payUrl)}" style="display:inline-block;background:#1c1b19;color:#fff;text-decoration:none;border-radius:99px;padding:12px 22px;font-weight:800">לתשלום מאובטח</a></p>`
    : '<p style="font-size:15px;line-height:1.7">נשלח אליכם בהקדם קישור לתשלום מאובטח. אחרי התשלום נתחיל לטפל.</p>';
  const meetTxt = o.meet ? `<p style="font-size:14.5px;line-height:1.7"><b>חתימה:</b> ${esc((CFG?.meeting?.[o.meet] || {}).l || '')}. נתאם איתכם מועד.</p>` : '';
  const slotTxt = o.slot && o.slot !== 'later' ? `<p style="font-size:14.5px"><b>המועד שבחרתם:</b> ${esc(o.slot.split(' ')[0].split('-').reverse().join('.'))} בשעה ${esc(o.slot.split(' ')[1] || '')}. הקישור לזום יישלח אחרי התשלום.</p>` : '';
  const lostTxt = (o.files || []).some((f: { up: boolean }) => !f.up) ? '<p style="font-size:14.5px;line-height:1.7">חלק מהמסמכים שצירפתם לא עלו. אפשר פשוט להשיב למייל הזה ולצרף אותם.</p>' : '';
  return shell(o.status === 'review' ? 'קיבלנו את הפרטים' : 'ההזמנה התקבלה', `<p style="font-size:15px;line-height:1.7">שלום ${esc(first)}, קיבלנו את ההזמנה שלכם: <b>${esc(svc.title)}</b>. מספר הזמנה: <b>${esc(id)}</b>.</p>${next}${slotTxt}${meetTxt}${lostTxt}
    <table role="presentation" width="100%" style="font-size:14.5px;margin-top:8px" cellpadding="0" cellspacing="0">${rows}</table>
    ${svc.gov ? `<p style="font-size:12.5px;color:#6b7280">${esc(svc.gov)}</p>` : ''}<p style="font-size:12.5px;color:#6b7280">המחירים כוללים מע״מ.</p>`);
}

// ---- the office panel ----
async function office(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const u = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: me } = await u.auth.getUser(); if (!me?.user) return false;
  const { data: ok, error } = await u.rpc('is_office_user'); return !error && ok === true;
}
// deno-lint-ignore no-explicit-any
async function adminAction(req: Request, b: any) {
  if (!(await office(req))) return json({ ok: false, error: 'צריך להתחבר למערכת' }, 401);
  const id = clip(b.id, 40), o = await getDoc('svc', id); if (!o) return json({ ok: false, error: 'לא נמצא' }, 404);
  if (b.action === 'admin-file') {
    // deno-lint-ignore no-explicit-any
    const f = (o.files || []).find((x: any) => x.path === b.path); if (!f) return json({ ok: false, error: 'קובץ לא נמצא' }, 404);
    const { data } = await admin().storage.from('files').createSignedUrl(f.path, 600, { download: f.name });
    return json({ ok: !!data?.signedUrl, url: data?.signedUrl || '' });
  }
  if (b.action === 'admin-status') {
    const st = ['review', 'awaiting', 'paid', 'working', 'done', 'cancelled', 'refund'].includes(b.status) ? b.status : '';
    if (!st) return json({ ok: false, error: 'סטטוס?' }, 400);
    await merge('svc', id, { status: st, log: (o.log || []).concat([{ at: new Date().toISOString(), kind: 'status', text: clip(b.note, 300) || st }]) });
    return json({ ok: true });
  }
  if (b.action === 'admin-mail') {
    const subject = clip(b.subject, 150), text = clip(b.text, 5000); if (!subject || !text) return json({ ok: false, error: 'חסר נושא או תוכן' }, 400);
    const html = shell(subject, `<div style="white-space:pre-wrap;font-size:15px;line-height:1.7">${esc(text)}</div>`);
    const r = await mail(o.c.email, subject, html); if (!r.ok) return json({ ok: false, error: 'המייל לא נשלח: ' + r.error }, 502);
    await merge('svc', id, { log: (o.log || []).concat([{ at: new Date().toISOString(), kind: 'mail', text: subject }]) });
    return json({ ok: true });
  }
  return json({ ok: false, error: 'action?' }, 400);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  try {
    if (url.searchParams.get('step') === 'paid') return await paid(url, req); // Morning's callback (secret key per order)
    // deno-lint-ignore no-explicit-any
    const b: any = await req.json().catch(() => ({}));
    if (b.action === 'slots') return await slots(b);
    if (b.action === 'order') return await order(b, req);
    if (b.action === 'uploaded') return await uploaded(b);
    if (String(b.action || '').startsWith('admin-')) return await adminAction(req, b);
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, error: 'שגיאה בשרת' }, 500); }
});
