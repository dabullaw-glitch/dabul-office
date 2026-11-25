// too-pay: real payments for the Team of One site (prepared 25.11.2026, Yakir: "תטפל בזה"). OFF while too_settings.test_mode
// is true: checkout refuses, renew does nothing, and the site keeps its no-charge test purchase (too_checkout_test).
// Provider: Morning (חשבונית ירוקה) hosted payment page with the clearing already connected there (Grow), the same API the
// office services use (MORNING_API_ID / MORNING_API_SECRET in app_secrets). Morning issues the receipt itself.
//
//  POST {action:'checkout', plan}  (Authorization: the student's sign-in)  -> { url } of a Morning payment page.
//        A 'pending' order is saved with the SHA-256 of a one-time secret key; the key itself goes only to Morning, inside
//        the callback address. Price is always computed here (launch offer from too_intro_price), never taken from the browser.
//  POST ?step=paid&o=<order>&k=<key>  -> Morning's server callback after payment. The key must match the order's hash and
//        the order must be 'pending'; then too_pay_grant (service role only) opens access. Repeats are harmless.
//  POST ?step=renew   (x-cron-secret)  -> monthly members whose month ends within 3 days get one email with a payment link.
//  POST ?step=status  (x-cron-secret)  -> what is ready for launch (true/false only, no secret values).
//  POST ?step=selftest (x-cron-secret) -> only while test_mode is on: a throwaway test student runs the whole server path
//        (checkout refused in test mode, wrong key refused, right key opens access, second callback changes nothing,
//        lower amount goes to review) and everything it made is removed again.
import { loadSecrets, env, admin, settings, siteBase, corsFor, clip, sha256, randKey, sameText, ils, heDate, telegram, sendMail, mailReady } from './common.ts';
import { tpl } from './mail.ts';

// deno-lint-ignore no-explicit-any
type Any = any;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// ---- Morning ----
const MORNING = 'https://api.greeninvoice.co.il/api/v1';
let mTok = '', mTokAt = 0;
async function morningToken() {
  if (mTok && Date.now() - mTokAt < 40 * 60e3) return mTok;
  const id = env('MORNING_API_ID'), secret = env('MORNING_API_SECRET'); if (!id || !secret) return '';
  const r = await fetch('https://api.morning.co/idp/v1/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }) }).catch(() => null);
  const j: Any = r ? await r.json().catch(() => ({})) : {};
  const t = j.accessToken || j.access_token || j.token; if (!r || !r.ok || !t) return '';
  mTok = t; mTokAt = Date.now(); return mTok;
}
async function morning(path: string, method = 'GET', body?: Any) {
  const t = await morningToken(); if (!t) return { status: 0, j: { errorMessage: 'no token' } as Any };
  const r = await fetch(MORNING + path, { method, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j: Any = await r.json().catch(() => ({}));
  return { status: r.status, j };
}
async function pluginId(): Promise<string> {
  const { data } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'pay' }).maybeSingle();
  const known = data && data.data && data.data.morning && data.data.morning.pluginId; if (known) return known;
  const { j } = await morning('/documents/info?type=320');
  const p = ((j && j.paymentPlugins) || []).find((x: Any) => x.active); return (p && p.id) || '';
}
// A Morning payment page for one order. Returns '' on any problem (Yakir gets a Telegram line).
async function payPage(order: Any, plan: Any, who: Any, key: string, site: string): Promise<string> {
  try {
    const plug = await pluginId();
    if (!plug) { await telegram('⚠️ צוות של אחד: אין סליקה פעילה במורנינג, ולכן לא נוצר דף תשלום.'); return ''; }
    const hook = `${env('SUPABASE_URL') || Deno.env.get('SUPABASE_URL')}/functions/v1/too-pay?step=paid&o=${order.id}&k=${key}`;
    const back = plan.kind === 'monthly' ? 'monthly' : 'course';
    const body = {
      description: `${plan.name}, Team of One`, type: 320, lang: 'he', currency: 'ILS', vatType: 0,
      amount: order.amount_ils, maxPayments: 1, pluginId: plug,
      client: { name: who.full_name || who.email, emails: [who.email], add: true },
      successUrl: `${site}ezor-ishi/?paid=${order.id}`, failureUrl: `${site}kniya/?plan=${back}&failed=1`,
      notifyUrl: hook, custom: order.id, remarks: `Team of One, הזמנה ${order.id}`,
    };
    const { status, j } = await morning('/payments/form', 'POST', body);
    const url = typeof j.url === 'string' ? j.url : (j.url && (j.url.he || j.url.origin)) || '';
    if (!url || j.errorCode) { await telegram(`⚠️ צוות של אחד: מורנינג לא יצר דף תשלום (${status} ${j.errorCode || ''}).`); return ''; }
    return url;
  } catch (e) { console.error(e); return ''; }
}

// ---- helpers ----
async function userFrom(req: Request) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok || tok.split('.').length !== 3) return null;
  const { data, error } = await admin().auth.getUser(tok);
  return error || !data || !data.user ? null : data.user;
}
async function newOrder(uid: string, plan: Any, amount: number, note: string) {
  const key = randKey(24);
  const { data, error } = await admin().from('too_orders').insert({ user_id: uid, plan_code: plan.code, amount_ils: amount, status: 'pending', provider: 'morning', note, pay_key_hash: await sha256(key) }).select('*').single();
  if (error) throw new Error('order: ' + error.message);
  return { order: data, key };
}

// ---- checkout ----
async function checkout(req: Request, b: Any, S: Any): Promise<Any[]> {
  if (S.test_mode !== false) return [409, { error: 'test_mode_on' }];
  const u = await userFrom(req); if (!u) return [401, { error: 'not_logged_in' }];
  const { data: prof } = await admin().from('too_profiles').select('id,email,full_name,blocked').eq('id', u.id).maybeSingle();
  if (!prof || prof.blocked) return [403, { error: 'no_profile' }];
  const code = clip(b.plan, 30);
  const { data: plan } = await admin().from('too_plans').select('*').eq('code', code).eq('active', true).maybeSingle();
  if (!plan) return [400, { error: 'no_plan' }];
  if (plan.kind === 'one_time') {
    const { data: has } = await admin().from('too_access').select('id').eq('user_id', u.id).eq('kind', 'course').eq('revoked', false).is('ends_at', null).limit(1);
    if (has && has.length) return [409, { error: 'has_access' }];
  }
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await admin().from('too_orders').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'pending').gte('created_at', since);
  if ((count || 0) >= 8) return [429, { error: 'rate' }];
  const { data: intro } = await admin().rpc('too_intro_price', { p_uid: u.id, p_plan: plan.code });
  const amount = intro !== null && intro !== undefined ? Number(intro) : Number(plan.price_ils);
  if (!(amount > 0)) return [400, { error: 'no_plan' }];
  const { order, key } = await newOrder(u.id, plan, amount, intro !== null && intro !== undefined ? 'תשלום, מבצע חודש ראשון' : 'תשלום');
  const url = await payPage(order, plan, { email: prof.email || u.email, full_name: prof.full_name }, key, siteBase(S.launch));
  if (!url) { await admin().from('too_orders').update({ status: 'failed', note: 'לא נוצר דף תשלום' }).eq('id', order.id); return [502, { error: 'pay_unavailable' }]; }
  return [200, { url }];
}

// ---- Morning's callback ----
async function paid(url: URL, req: Request, S: Any): Promise<Any[]> {
  const id = clip(url.searchParams.get('o'), 40), k = clip(url.searchParams.get('k'), 80);
  if (!UUID.test(id) || !/^[a-f0-9]{48}$/.test(k)) return [404, { ok: false }];
  const { data: o } = await admin().from('too_orders').select('*').eq('id', id).maybeSingle();
  if (!o || !o.pay_key_hash || !sameText(await sha256(k), o.pay_key_hash)) return [404, { ok: false }];
  const p: Any = await req.json().catch(() => ({}));
  const amt = Number(p && p.amount); const ref = clip((p && (p.transactionId || p.documentId || p.id || p.reference)) || '', 120);
  const { data: g, error } = await admin().rpc('too_pay_grant', { p_order: id, p_amount: Number.isFinite(amt) && amt > 0 ? Math.floor(amt) : null, p_ref: ref });
  if (error) { console.error(error); await telegram(`⚠️ צוות של אחד: תשלום התקבל אבל הגישה לא נפתחה (הזמנה ${id}). צריך לבדוק.`); return [500, { ok: false }]; }
  if (g && g.again) return [200, { ok: true, again: true }];
  const { data: prof } = await admin().from('too_profiles').select('email,full_name').eq('id', o.user_id).maybeSingle();
  const { data: plan } = await admin().from('too_plans').select('*').eq('code', o.plan_code).maybeSingle();
  const say = (t: string) => S.quiet ? Promise.resolve() : telegram(t);
  if (g && g.review) { await say(`⚠️ צוות של אחד: התקבל תשלום נמוך מהמחיר (הזמנה ${id}). הגישה לא נפתחה, צריך לבדוק במורנינג.`); return [200, { ok: true }]; }
  const site = siteBase(S.launch);
  if (prof && prof.email) {
    let m;
    if (plan && plan.kind === 'monthly') {
      const { data: last } = await admin().from('too_access').select('ends_at').eq('user_id', o.user_id).eq('kind', 'subscription').eq('revoked', false).order('ends_at', { ascending: false }).limit(1);
      m = tpl.paidMonthly(prof.full_name || '', ils(o.amount_ils), last && last[0] ? heDate(last[0].ends_at) : '', site);
    } else m = tpl.paidCourse(prof.full_name || '', plan ? plan.name : '', ils(o.amount_ils), site);
    await sendMail(S.mail, prof.email, m.subject, m.html);
  }
  await say(`💳 צוות של אחד: שולם ${ils(o.amount_ils)} על ${plan ? plan.name : o.plan_code}.`);
  return [200, { ok: true }];
}

// ---- monthly renewal emails ----
async function renew(S: Any): Promise<Any[]> {
  if (S.test_mode !== false) return [200, { skipped: 'test_mode_on' }];
  if (!mailReady(S.mail)) return [200, { skipped: 'mail_off' }];
  const now = new Date(), soon = new Date(Date.now() + 3 * 86400e3);
  const { data: rows } = await admin().from('too_access').select('id,user_id,ends_at').eq('kind', 'subscription').eq('revoked', false).eq('auto_renew', true).gt('ends_at', now.toISOString()).lte('ends_at', soon.toISOString()).limit(300);
  const { data: plan } = await admin().from('too_plans').select('*').eq('code', 'monthly').eq('active', true).maybeSingle();
  if (!plan) return [200, { skipped: 'no_plan' }];
  let sent = 0; const site = siteBase(S.launch);
  for (const a of rows || []) {
    const { data: later } = await admin().from('too_access').select('id').eq('user_id', a.user_id).eq('kind', 'subscription').eq('revoked', false).gt('ends_at', a.ends_at).limit(1);
    if (later && later.length) continue;
    const { data: done } = await admin().from('too_audit').select('id').eq('action', 'renew_mail').eq('detail->>access', String(a.id)).limit(1);
    if (done && done.length) continue;
    const { data: prof } = await admin().from('too_profiles').select('email,full_name,blocked').eq('id', a.user_id).maybeSingle();
    if (!prof || prof.blocked || !prof.email) continue;
    const { order, key } = await newOrder(a.user_id, plan, Number(plan.price_ils), 'חידוש מנוי');
    const url = await payPage(order, plan, prof, key, site);
    if (!url) { await admin().from('too_orders').update({ status: 'failed', note: 'לא נוצר דף תשלום לחידוש' }).eq('id', order.id); continue; }
    const m = tpl.renew(prof.full_name || '', heDate(a.ends_at), ils(plan.price_ils), url, site);
    if (await sendMail(S.mail, prof.email, m.subject, m.html)) {
      sent++; await admin().from('too_audit').insert({ actor: a.user_id, action: 'renew_mail', detail: { access: String(a.id), order: order.id } });
    }
  }
  return [200, { ok: true, sent }];
}

// ---- readiness (no secret values) ----
async function status(S: Any): Promise<Any[]> {
  return [200, {
    test_mode: S.test_mode, launch: S.launch || null, mail_ready_setting: S.mail_ready === true, mail_from_set: mailReady(S.mail),
    verify_signup: !!(S.mail && S.mail.verify_signup), morning_keys: !!(env('MORNING_API_ID') && env('MORNING_API_SECRET')), resend_key: !!env('RESEND_API_KEY'),
    morning_token: !!(await morningToken()),
  }];
}

// ---- self test (test mode only) ----
async function selftest(req: Request, S: Any): Promise<Any[]> {
  if (S.test_mode !== true) return [409, { error: 'only_in_test_mode' }];
  const R: Any[] = []; const ok = (name: string, pass: boolean, extra: Any = '') => R.push({ name, pass, extra });
  const email = `selftest-${randKey(4)}@example.invalid`;
  const { data: cu, error: ce } = await admin().auth.admin.createUser({ email, password: randKey(16), email_confirm: true, user_metadata: { app: 'teamofone', selftest: true } });
  if (ce || !cu?.user) return [500, { error: 'create_user', detail: ce?.message }];
  const uid = cu.user.id;
  try {
    await admin().from('too_profiles').insert({ id: uid, email, full_name: 'בדיקה אוטומטית' });
    const [c1, b1] = await checkout(req, { plan: 'course' }, S);
    ok('checkout refused while test_mode is on', c1 === 409 && b1.error === 'test_mode_on', b1);
    const [c2, b2] = await checkout(new Request('https://x', { headers: {} }), { plan: 'course' }, { ...S, test_mode: false });
    ok('checkout without sign-in refused', c2 === 401, b2);
    const { data: plan } = await admin().from('too_plans').select('*').eq('code', 'course').single();
    const { order, key } = await newOrder(uid, plan, plan.price_ils, 'בדיקה אוטומטית');
    const call = (k: string, body: Any = {}) => paid(new URL(`https://x/?step=paid&o=${order.id}&k=${k}`), new Request('https://x', { method: 'POST', body: JSON.stringify(body) }), { ...S, mail: {}, quiet: true });
    const [w1] = await call(randKey(24)); ok('callback with a wrong key refused', w1 === 404);
    const { data: h0 } = await admin().rpc('too_has_access', { uid }); ok('no access before payment', h0 === false);
    const [r1, j1] = await call(key, { amount: plan.price_ils, transactionId: 'selftest' }); const { data: h1 } = await admin().rpc('too_has_access', { uid });
    ok('callback with the right key opens access', r1 === 200 && h1 === true, j1);
    const { count: a1 } = await admin().from('too_access').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    const [r2, j2] = await call(key, { amount: plan.price_ils }); const { count: a2 } = await admin().from('too_access').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    ok('second callback changes nothing', r2 === 200 && j2.again === true && a1 === a2, { a1, a2 });
    const { data: mp } = await admin().from('too_plans').select('*').eq('code', 'monthly').single();
    const o2 = await newOrder(uid, mp, mp.price_ils, 'בדיקה אוטומטית');
    const [r3] = await paid(new URL(`https://x/?step=paid&o=${o2.order.id}&k=${o2.key}`), new Request('https://x', { method: 'POST', body: JSON.stringify({ amount: 1 }) }), { ...S, mail: {}, quiet: true });
    const { data: st } = await admin().from('too_orders').select('status').eq('id', o2.order.id).single();
    ok('lower amount goes to review, no access', r3 === 200 && st.status === 'review');
  } finally {
    await admin().from('too_access').delete().eq('user_id', uid);
    await admin().from('too_orders').delete().eq('user_id', uid);
    await admin().from('too_audit').delete().eq('actor', uid);
    await admin().from('too_profiles').delete().eq('id', uid);
    await admin().auth.admin.deleteUser(uid);
  }
  const { count: left } = await admin().from('too_profiles').select('id', { count: 'exact', head: true }).eq('email', email);
  ok('test student removed', (left || 0) === 0);
  return [200, { ok: R.every((x) => x.pass), steps: R }];
}

Deno.serve(async (req) => {
  let S: Any = {};
  try { S = await settings(['test_mode', 'launch', 'mail', 'mail_ready']); } catch { /* defaults */ }
  const cors = corsFor(req, S.launch);
  const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return out(405, { error: 'method' });
  try {
    await loadSecrets();
    const url = new URL(req.url); const step = url.searchParams.get('step') || '';
    if (step === 'paid') { const [s, b] = await paid(url, req, S); return out(s as number, b); }
    if (step) {
      const sec = req.headers.get('x-cron-secret') || '';
      if (!env('CRON_SECRET') || !sameText(sec, env('CRON_SECRET'))) return out(401, { error: 'auth' });
      const fn: Record<string, () => Promise<Any[]>> = { renew: () => renew(S), status: () => status(S), selftest: () => selftest(req, S) };
      if (!fn[step]) return out(404, { error: 'step' });
      const [s, b] = await fn[step](); return out(s, b);
    }
    const b: Any = await req.json().catch(() => ({}));
    if (b.action === 'checkout') { const [s, r] = await checkout(req, b, S); return out(s as number, r); }
    return out(400, { error: 'action' });
  } catch (e) { console.error(e); return out(500, { error: 'server' }); }
});
