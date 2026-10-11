// services: the online legal services ordered on dabullaw.co.il (written 10.10.2026, for Yakir's approval).
// The service definitions (questions, prices) come from svc-config.json on the website, the same file the order form
// uses, and the price is always recomputed here. Orders are kept in docs coll "svc" (the office panel addon-svc.js),
// the client's files in the private "files" bucket under svc/<id>/. The payment (Morning) is the last missing piece:
// only payLink() and the "paid" callback depend on it.
//  POST {action:'slots', svc}                      -> free Zoom times
//  POST {action:'order', svc, a, c, meet, files}   -> saves the order, returns signed upload links for the files
//  POST {action:'uploaded', id, token}             -> files are in: notify the office, email the client, return payUrl
//  POST ?step=paid&id=&k=                          -> Morning's server callback after payment (k: the order's secret key)
//  POST {action:'admin-file'|'admin-mail'|'admin-status', ...} with the office user's sign-in -> office panel actions
import { createClient } from 'npm:@supabase/supabase-js@2';
import { loadSecrets, json, cors, admin, env, telegram } from '../_shared/common.ts';

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
    } else if (f.t === 'slot') out[f.k] = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$|^later$/.test(String(v || '')) ? String(v) : '';
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
const safeName = (n: string) => String(n || 'file').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-80);
const today = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---- the payment (Morning, connected 11.10.2026: MORNING_API_ID / MORNING_API_SECRET in app_secrets) ----
// payLink: a hosted Morning payment page for the order total (credit card / Bit, by the clearing connected in Morning).
// Morning issues the receipt itself. The callback URL carries a secret key known only to this server and Morning.
// Without clearing in Morning (or on any error) there is no link: the client gets one by email later and Yakir a Telegram.
const MORNING = 'https://api.greeninvoice.co.il/api/v1';
let mTok = '', mTokAt = 0;
async function morningToken() {
  if (mTok && Date.now() - mTokAt < 40 * 60e3) return mTok;
  const id = env('MORNING_API_ID'), secret = env('MORNING_API_SECRET');
  if (!id || !secret) return '';
  const r = await fetch(MORNING + '/account/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, secret }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.token) return '';
  mTok = j.token; mTokAt = Date.now(); return mTok;
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
      amount: o.price.total, maxPayments: 1, pluginId,
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
  if (o.status === 'paid' || o.paidAt) return json({ ok: true, again: true });
  // deno-lint-ignore no-explicit-any
  const p: any = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  await merge('svc', id, { status: 'paid', paidAt: now, payment: { amount: p.amount ?? o.price.total, doc: p.documentId || p.id || '', ref: clip(p.transactionId || p.reference || '', 80) },
    log: (o.log || []).concat([{ at: now, kind: 'paid', text: 'התשלום התקבל במורנינג' }]) });
  if (o.svc === 'precheck') await admin().rpc('docs_merge', { p_coll: 'chk', p_id: id, p_patch: { status: 'paid', paidAt: now } });
  await telegram(`💳 שולם: ${o.title} · ${ils(o.price.total)}\n👤 ${o.c.name} · 📞 ${o.c.phone}\nמספר: ${id}`).catch(() => false);
  return json({ ok: true });
}

// ---- free Zoom times ----
async function slots() {
  const c = await cfg(), h = c.hours, d = today(), names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const { data } = await admin().from('docs').select('data').eq('coll', 'svc').eq('data->>svc', 'zoom').gte('data->>slot', ymd(d));
  const taken = new Set((data || []).filter((r: { data: { status: string } }) => !['cancelled', 'refund'].includes(r.data.status)).map((r: { data: { slot: string } }) => r.data.slot));
  const block = new Set(((await getDoc('settings', 'svc'))?.blocked || []) as string[]); // days or "date time" Yakir closed
  const days = []; d.setDate(d.getDate() + (h.notBefore || 1));
  while (days.length < h.horizon) {
    const date = ymd(d);
    if (h.days.includes(d.getDay()) && !block.has(date)) {
      const times = h.slots.filter((t: string) => !taken.has(`${date} ${t}`) && !block.has(`${date} ${t}`));
      if (times.length) days.push({ date, dow: names[d.getDay()], label: `${d.getDate()}.${d.getMonth() + 1}`, times });
    }
    d.setDate(d.getDate() + 1);
  }
  return json({ days });
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
  // the slot must still be free
  if (a.slot && a.slot !== 'later') {
    const { data } = await admin().from('docs').select('id,data').eq('coll', 'svc').eq('data->>slot', a.slot);
    if ((data || []).some((r: { data: { status: string } }) => !['cancelled', 'refund'].includes(r.data.status))) return json({ ok: false, error: 'המועד שבחרתם נתפס הרגע. חזרו שלב אחד ובחרו מועד אחר.' }, 409);
  }
  // not more than 5 orders from the same phone in an hour
  const { data: recent } = await admin().from('docs').select('id').eq('coll', 'svc').eq('data->c->>phone', ct.phone).gte('data->>created', new Date(Date.now() - 3600_000).toISOString());
  if ((recent || []).length >= 5) return json({ ok: false, error: 'נשלחו כבר כמה הזמנות. נחזור אליכם.' }, 429);
  const files = (Array.isArray(b.files) ? b.files : []).slice(0, 30)
    // deno-lint-ignore no-explicit-any
    .filter((f: any) => svc.fields.some((x: { k: string; t: string }) => x.k === f.k && x.t === 'file') && FILE_RE.test(String(f.name)) && +f.size > 0 && +f.size <= 15 * 1024 * 1024);
  const p = price(svc, c, a, meet), rv = reviews(svc, a);
  const now = new Date().toISOString(), d = today();
  const id = `S${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${rand(4).toUpperCase()}`;
  const token = rand(24);
  const uploads = [], stored = [];
  for (const f of files) {
    const path = `svc/${id}/${f.k}-${f.i}-${safeName(f.name)}`;
    const { data, error } = await admin().storage.from('files').createSignedUploadUrl(path);
    if (error || !data) continue;
    uploads.push({ k: f.k, i: f.i, url: data.signedUrl });
    stored.push({ k: f.k, name: clip(f.name, 120), size: +f.size, path, up: false });
  }
  const o = { svc: svc.id, title: svc.title, a, c: ct, meet, price: p, review: rv, status: 'draft', token, files: stored, slot: a.slot || '',
    created: now, page: clip(b.page, 300), ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim(), log: [{ at: now, kind: 'created', text: 'הזמנה נשלחה מהאתר' }] };
  const { error } = await admin().from('docs').insert({ coll: 'svc', id, data: o });
  if (error) { console.error(error); return json({ ok: false, error: 'השמירה נכשלה' }, 500); }
  return json({ ok: true, id, token, uploads, review: rv.length > 0 });
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
  const review = (o.review || []).length > 0, now = new Date().toISOString();
  const payUrl = review ? '' : await payLink(id, o);
  const status = review ? 'review' : 'awaiting';
  await merge('svc', id, { files, status, payUrl, log: (o.log || []).concat([{ at: now, kind: 'files', text: ((n: number) => n === 1 ? 'קובץ אחד התקבל' : `${n} קבצים התקבלו`)(files.filter((f: { up: boolean }) => f.up).length) }]) });
  // the precheck service keeps its own answer panel (addon-check, coll chk)
  if (o.svc === 'precheck') {
    const a = o.a || {};
    await admin().from('docs').upsert({ coll: 'chk', id, data: { svcId: id, city: a.city, address: a.address, gush: a.gush, chelka: a.helka, sub: a.sub, floor: a.floor, askPrice: a.askPrice, link: a.link,
      buyer: a.buyer, mortgage: a.mortgage, worry: a.worry, reg: a.reg, name: o.c.name, phone: o.c.phone, email: o.c.email, status: review ? 'review' : 'pending', created: o.created, page: o.page } });
  }
  const c = await cfg(); const svc = c.services.find((s: { id: string }) => s.id === o.svc) || { title: o.title };
  const when = o.slot && o.slot !== 'later' ? `\n🗓 ${o.slot.split(' ')[0].split('-').reverse().join('.')} ${o.slot.split(' ')[1] || ''}` : '';
  await telegram(`${review ? '🔎 הזמנה אונליין לבדיקה לפני תשלום' : '🛒 הזמנה אונליין חדשה (ממתינה לתשלום)'}\n${svc.title} · ${ils(o.price.total)}\n👤 ${o.c.name}\n📞 ${o.c.phone}\n✉️ ${o.c.email}${when}${review ? `\n⚠️ ${o.review.join(', ')}` : ''}\nמספר: ${id}`).catch(() => false);
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
  return shell(o.status === 'review' ? 'קיבלנו את הפרטים' : 'ההזמנה התקבלה', `<p style="font-size:15px;line-height:1.7">שלום ${esc(first)}, קיבלנו את ההזמנה שלכם: <b>${esc(svc.title)}</b>. מספר הזמנה: <b>${esc(id)}</b>.</p>${next}${slotTxt}${meetTxt}
    <table role="presentation" width="100%" style="font-size:14.5px;margin-top:8px" cellpadding="0" cellspacing="0">${rows}</table>
    ${svc.gov ? `<p style="font-size:12.5px;color:#6b7280">${esc(svc.gov)}</p>` : ''}<p style="font-size:12.5px;color:#6b7280">המחירים כוללים מע״מ. ביטול לפני שהטיפול התחיל: החזר מלא.</p>`);
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
    if (b.action === 'slots') return await slots();
    if (b.action === 'order') return await order(b, req);
    if (b.action === 'uploaded') return await uploaded(b);
    if (String(b.action || '').startsWith('admin-')) return await adminAction(req, b);
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, error: 'שגיאה בשרת' }, 500); }
});
