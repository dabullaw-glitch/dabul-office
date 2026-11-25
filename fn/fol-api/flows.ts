// fol-api flows: checkout and fulfillment, firm self-service, reviews, removals, sponsored articles, admin, daily job.
import { Any, admin, pub, env, settings, siteBase, brandName, pageUrl, PAGE, clip, sha256, randKey, code6, sameText, hmac, ils, heDate,
  UUID, okEmail, normPhone, okPhone, emailHash, hostOf, domainMatch, rate, audit, ipKey, sendMail, notifyAdmin, telegram } from './common.ts';
import { makeTpl } from './mail.ts';
import { adIssues, normText, reviewIssues, reviewBlocked, displayName, price, checkSlots, cleanProfile, imageType } from './rules.ts';

export type R = [number, Any];
export const tplFor = (S: Any) => makeTpl(brandName(S), siteBase(S.launch), S.test_mode);
const lower = (e: unknown) => String(e || '').trim().toLowerCase();

// ---------- targets: the areas, cities, courts and tools that exist on the built site ----------
let T_CACHE: Any = null, T_AT = 0;
export async function targets(S: Any): Promise<Any> {
  if (S._targets) return S._targets;
  if (T_CACHE && Date.now() - T_AT < 10 * 60e3) return T_CACHE;
  const r = await fetch(siteBase(S.launch) + 'commerce-targets.json', { headers: { accept: 'application/json' } }).catch(() => null);
  const j: Any = r && r.ok ? await r.json().catch(() => null) : null;
  if (!j || !Array.isArray(j.areas)) return T_CACHE || null;
  T_CACHE = { areas: j.areas.map((x: Any) => x.slug), cities: j.cities.map((x: Any) => x.slug), courts: j.courts.map((x: Any) => x.slug), tools: j.tools.map((x: Any) => x.slug), raw: j };
  T_AT = Date.now(); return T_CACHE;
}

// ---------- auth ----------
export async function userFrom(req: Request) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok || tok.split('.').length !== 3) return null;
  const { data, error } = await admin().auth.getUser(tok);
  return error || !data || !data.user ? null : data.user;
}
const isAdmin = async (uid: string) => (await admin().rpc('fol_is_admin', { uid })).data === true;
async function owns(uid: string, firmId: string) {
  if (!uid || !UUID.test(String(firmId))) return false;
  const { data } = await admin().from('fol_firm_users').select('firm_id').eq('firm_id', firmId).eq('user_id', uid).maybeSingle();
  return !!data || await isAdmin(uid);
}
// the sign-in account of a firm owner (created on first payment or approved claim). Office staff accounts are never used.
export async function ensureUser(email: string): Promise<string | null> {
  const e = lower(email); if (!okEmail(e)) return null;
  const { data: office } = await admin().from('office_users').select('email').ilike('email', e).maybeSingle();
  if (office) return null;
  const { data: known } = await admin().from('fol_firm_users').select('user_id').eq('email', e).limit(1);
  if (known && known[0]) return known[0].user_id;
  const { data: c } = await admin().auth.admin.createUser({ email: e, email_confirm: true, user_metadata: { app: 'folivus' } });
  if (c && c.user) return c.user.id;
  const { data: g } = await admin().auth.admin.generateLink({ type: 'magiclink', email: e });
  return g && g.user ? g.user.id : null;
}
async function linkOwner(firmId: string, uid: string, email: string) {
  await admin().from('fol_firm_users').upsert({ firm_id: firmId, user_id: uid, email: lower(email), role: 'owner' }, { onConflict: 'firm_id,user_id', ignoreDuplicates: true });
}
// a ready session for this email (server side; used right after a verified claim, and by the self test)
export async function sessionFor(email: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: 'magiclink', email: lower(email) });
  const th = data?.properties?.hashed_token; if (error || !th) return null;
  let { data: v } = await pub().auth.verifyOtp({ token_hash: th, type: 'magiclink' });
  if (!v?.session) ({ data: v } = await pub().auth.verifyOtp({ token_hash: th, type: 'email' }));
  const s = v?.session; return s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at } : null;
}

// ---------- one-time codes ----------
async function newCode(purpose: string, ref: string) {
  const c = code6();
  await admin().from('fol_codes').insert({ purpose, ref_id: ref, code_hash: await sha256(c + ':' + ref), expires_at: new Date(Date.now() + 30 * 60e3).toISOString() });
  return c;
}
async function useCode(purpose: string, ref: string, c: string): Promise<string> {
  if (!UUID.test(ref) || !/^\d{6}$/.test(String(c))) return 'code';
  const { data: rows } = await admin().from('fol_codes').select('*').eq('purpose', purpose).eq('ref_id', ref).is('used_at', null).order('created_at', { ascending: false }).limit(1);
  const r = rows && rows[0]; if (!r) return 'code';
  if (new Date(r.expires_at).getTime() < Date.now()) return 'expired';
  if (r.attempts >= 5) return 'attempts';
  const ok = sameText(await sha256(String(c) + ':' + ref), r.code_hash);
  await admin().from('fol_codes').update(ok ? { used_at: new Date().toISOString(), attempts: r.attempts + 1 } : { attempts: r.attempts + 1 }).eq('id', r.id);
  return ok ? '' : 'code';
}

// ---------- Morning (the directory's OWN account: FOL_MORNING_API_ID / FOL_MORNING_API_SECRET) ----------
const MORNING = 'https://api.greeninvoice.co.il/api/v1';
let mTok = '', mTokAt = 0;
export async function morningToken() {
  if (mTok && Date.now() - mTokAt < 40 * 60e3) return mTok;
  const id = env('FOL_MORNING_API_ID'), secret = env('FOL_MORNING_API_SECRET'); if (!id || !secret) return '';
  const r = await fetch('https://api.morning.co/idp/v1/oauth/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }) }).catch(() => null);
  const j: Any = r ? await r.json().catch(() => ({})) : {};
  const t = j.accessToken || j.access_token || j.token; if (!r || !r.ok || !t) return '';
  mTok = t; mTokAt = Date.now(); return mTok;
}
async function morning(path: string, method = 'GET', body?: Any) {
  const t = await morningToken(); if (!t) return { status: 0, j: { errorMessage: 'no token' } as Any };
  const r = await fetch(MORNING + path, { method, headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, j: await r.json().catch(() => ({})) as Any };
}
async function payPage(S: Any, o: Any, plan: Any, key: string): Promise<string> {
  try {
    let plug = S.pay && S.pay.pluginId;
    if (!plug) { const { j } = await morning('/documents/info?type=320'); const p = ((j && j.paymentPlugins) || []).find((x: Any) => x.active); plug = (p && p.id) || ''; }
    if (!plug) return '';
    const hook = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fol-api?step=paid&o=${o.id}&k=${key}`;
    const max = Math.max(1, Math.min(12, Number(S.pay?.max_installments) || 1, Number(o.installments) || 1));
    // type 320 = tax invoice + receipt: Morning issues it to the buyer on payment. Amount includes VAT (same as the proven office flow).
    const body = {
      description: `${plan.name}, ${brandName(S)}`, type: 320, lang: 'he', currency: 'ILS', vatType: 0,
      amount: Number(o.total_ils), maxPayments: max, pluginId: plug,
      client: { name: o.firm_name || o.contact_name, emails: [o.email], phone: o.phone || '', add: true },
      successUrl: pageUrl(S, 'order', `?paid=${o.id}`), failureUrl: pageUrl(S, 'order', `?failed=${o.id}`),
      notifyUrl: hook, custom: o.id, remarks: `הזמנה ${o.id}`,
    };
    const { j } = await morning('/payments/form', 'POST', body);
    const url = typeof j.url === 'string' ? j.url : (j.url && (j.url.he || j.url.origin)) || '';
    return !url || j.errorCode ? '' : url;
  } catch (e) { console.error(e); return ''; }
}

// ---------- checkout ----------
const PROVIDER_CATS = ['שמאי מקרקעין', 'שמאי רכב', 'חוקר פרטי', 'מתורגמן', 'מגשר', 'רואה חשבון', 'מודד', 'מסירת כתבי בי-דין', 'הקלטה ותמלול', 'גרפולוג', 'אחר'];
const ADDON = ['court', 'tool', 'provider', 'card'];
// the card upgrade is stored as plan limits {card:true} (see sql/folivus_commerce.sql)
export const kindOf = (plan: Any) => (plan && plan.limits && plan.limits.card ? 'card' : plan?.kind);
const renewToken = (p: Any) => hmac(`renew|${p.id}|${new Date(p.ends_at).toISOString()}`);
export async function renewLink(S: Any, p: Any) { return pageUrl(S, 'order', `#renew=${p.id}.${await renewToken(p)}`); }
async function renewFrom(raw: unknown) {
  const [pid, tok] = String(raw || '').split('.');
  if (!UUID.test(pid || '') || !/^[a-f0-9]{40}$/.test(tok || '')) return null;
  const { data: p } = await admin().from('fol_placements').select('*').eq('id', pid).maybeSingle();
  if (!p || !sameText(await renewToken(p), tok)) return null;
  if (p.status === 'cancelled') return null;
  if (p.status === 'expired' && Date.now() - new Date(p.ends_at).getTime() > 60 * 86400e3) return null;
  return p;
}
function slotText(T: Any, p: Any) {
  const nm = (list: Any[], s: string) => (list || []).find((x: Any) => x.slug === s)?.name || s;
  const raw = T?.raw || {};
  if (p.kind === 'listing' && p.target === 'card') return 'כרטיס משרד מורחב';
  if (p.kind === 'listing') return `${nm(raw.areas, p.area_slug || p.area)}${(p.city_slug || p.city) ? ', ' + nm(raw.cities, p.city_slug || p.city) : ', כל הארץ ועמוד הבית'}`;
  if (p.kind === 'court' || p.kind === 'provider') return 'עמוד ' + nm(raw.courts, p.target);
  if (p.kind === 'tool') return 'עמוד ' + nm(raw.tools, p.target);
  return 'תוכן ממומן';
}

// builds a checked order row. Prices, limits and targets only from the server.
export async function prepareOrder(req: Request, b: Any, S: Any, user: Any): Promise<{ row?: Any; plan?: Any; error?: string; status?: number }> {
  const T = await targets(S); if (!T) return { error: 'targets_unavailable', status: 503 };
  let plan: Any, renew: Any = null;
  if (b.renew) {
    renew = await renewFrom(b.renew); if (!renew) return { error: 'renew_link', status: 400 };
    const { data } = await admin().from('fol_plans').select('*').eq('id', renew.plan_id).eq('active', true).maybeSingle(); plan = data;
  } else {
    const { data } = await admin().from('fol_plans').select('*').eq('id', clip(b.plan, 40)).eq('active', true).maybeSingle(); plan = data;
  }
  if (!plan || plan.kind === 'free') return { error: 'no_plan', status: 400 };
  const kind = kindOf(plan);
  let months = 1;
  if (plan.unit === 'month') {
    const allowed: number[] = plan.limits?.months || [1, 3, 6, 12];
    months = Number(b.months) || (renew ? 0 : 1);
    if (renew && !months) { const { data: ro } = await admin().from('fol_orders').select('months').eq('id', renew.order_id).maybeSingle(); months = Number(ro?.months) || 1; }
    if (!allowed.includes(months)) return { error: 'months', status: 400 };
  }
  const pr = price(plan, months, Number(S.pay?.vat_rate ?? 0.18));
  if (!pr) return { error: 'no_price', status: 400 };
  const c = b.contact || {};
  const contact = { name: normText(c.name, 80), email: lower(c.email), phone: normPhone(c.phone) };
  if (contact.name.length < 2) return { error: 'name', status: 400 };
  if (!okEmail(contact.email)) return { error: 'email', status: 400 };
  if (!okPhone(contact.phone)) return { error: 'phone', status: 400 };
  const inst = Math.max(1, Math.min(Number(S.pay?.max_installments) || 1, Math.floor(Number(b.installments) || 1)));
  const autoRenew = ADDON.includes(kind) && b.auto_renew === true && b.auto_renew_consent === true;
  const row: Any = {
    plan_id: plan.id, kind, contact_name: contact.name, email: contact.email, phone: contact.phone, months: plan.unit === 'month' ? months : null,
    net_ils: pr.net, vat_ils: pr.vat, total_ils: pr.total, amount: Math.round(pr.total), installments: inst, user_id: user ? user.id : null,
    auto_renew: autoRenew, auto_renew_consent_at: autoRenew ? new Date().toISOString() : null, firm_name: '',
  };
  if (renew) {
    row.renewal_of = renew.id; row.firm_id = renew.firm_id; row.target = renew.target;
    row.slots = renew.kind === 'listing' ? [{ area: renew.area_slug, city: renew.city_slug }] : [];
    if (renew.firm_id) { const { data: f } = await admin().from('fol_firms').select('name').eq('id', renew.firm_id).maybeSingle(); row.firm_name = f?.name || ''; }
    else row.firm_name = renew.advertiser?.name || contact.name;
    row.auto_renew = renew.auto_renew && !renew.auto_renew_cancelled_at;
    return { row, plan };
  }
  // what is bought
  if (kind === 'listing') {
    const r = checkSlots(plan, b.slots, T); if (r.error) return { error: r.error, status: 400 };
    row.slots = r.slots; row.areas = r.slots!.map((s) => s.area); row.cities = r.slots!.map((s) => s.city).filter(Boolean);
  } else if (plan.kind === 'court' || plan.kind === 'provider') {
    if (!T.courts.includes(String(b.target))) return { error: 'target', status: 400 }; row.target = String(b.target);
  } else if (plan.kind === 'tool') {
    if (!T.tools.includes(String(b.target))) return { error: 'target', status: 400 }; row.target = String(b.target);
  } else if (plan.kind === 'article') {
    const br = b.brief || {};
    const brief = { topic: normText(br.topic, 120), area: String(br.area || ''), points: normText(br.points, 1500), audience: normText(br.audience, 200) };
    if (brief.topic.length < 5) return { error: 'brief', status: 400 };
    if (!T.areas.includes(brief.area)) return { error: 'area', status: 400 };
    row.brief = brief;
  }
  if (plan.kind === 'provider') {
    const a = b.advertiser || {};
    const ad = { name: normText(a.name, 80), category: String(a.category || ''), phone: normPhone(a.phone), website: String(a.website || '').trim().slice(0, 200), text: normText(a.text, 160) };
    if (ad.name.length < 2) return { error: 'ad_name', status: 400 };
    if (!PROVIDER_CATS.includes(ad.category)) return { error: 'ad_category', status: 400 };
    if (!okPhone(ad.phone)) return { error: 'phone', status: 400 };
    if (ad.website && !/^https?:\/\/[^\s/]+\.[^\s]{2,}$/.test(ad.website)) return { error: 'website', status: 400 };
    const iss = adIssues(ad.name + ' ' + ad.text); if (iss.length) return { error: 'ad_text', status: 400 };
    row.advertiser = ad; row.firm_name = ad.name;
  } else {
    // whose firm: an existing listing (only its signed-in owner) or a new firm from the details
    if (b.firm_slug) {
      if (!user) return { error: 'login_required', status: 401 };
      const { data: f } = await admin().from('fol_firms').select('id,name,status').eq('slug', clip(b.firm_slug, 80)).maybeSingle();
      if (!f || !(await owns(user.id, f.id))) return { error: 'not_owner', status: 403 };
      row.firm_id = f.id; row.firm_name = f.name;
    } else {
      const fd = b.firm || {};
      const firm = { name: normText(fd.name, 120), city: String(fd.city || ''), address: normText(fd.address, 160), phone: normPhone(fd.phone || contact.phone),
        website: String(fd.website || '').trim().slice(0, 200), areas: (Array.isArray(fd.areas) ? fd.areas : []).map(String).filter((x: string) => T.areas.includes(x)).slice(0, 10) };
      if (firm.name.length < 2) return { error: 'firm_name', status: 400 };
      if (!T.cities.includes(firm.city)) return { error: 'city', status: 400 };
      if (!okPhone(firm.phone)) return { error: 'phone', status: 400 };
      if (firm.website && !/^https?:\/\/[^\s/]+\.[^\s]{2,}$/.test(firm.website)) return { error: 'website', status: 400 };
      { const { data: cr } = await admin().from('fol_cities').select('slug').eq('slug', firm.city).maybeSingle(); if (!cr) firm.city = ''; } // the firm row keeps a city only if fol_cities has it
      if (!firm.areas.length) firm.areas = (row.areas || [row.brief?.area]).filter(Boolean);
      if (adIssues(firm.name).length) return { error: 'firm_name_words', status: 400 };
      // the same firm is already listed: claim it first (no duplicate listings)
      const { data: dup } = await admin().from('fol_firms').select('id').eq('phone', firm.phone).neq('status', 'removed').limit(1);
      let isDup = !!(dup && dup.length);
      if (!isDup && firm.website) { const h = hostOf(firm.website); if (h) { const { data: d2 } = await admin().from('fol_firms').select('id').ilike('website', `%${h}%`).neq('status', 'removed').limit(1); isDup = !!(d2 && d2.length); } }
      if (isDup && !S._allowDup) return { error: 'firm_exists', status: 409 };
      row.details = { firm }; row.firm_name = firm.name;
    }
  }
  // sold out? (checked again inside the payment step)
  const slotsToCheck = kind === 'listing' ? row.slots : ['court', 'tool', 'provider'].includes(kind) ? [null] : [];
  for (const s of slotsToCheck) {
    const nat = plan.limits?.scope === 'nationwide';
    const { data: why } = await admin().rpc('fol_slot_free', { p_kind: plan.kind, p_target: row.target || null, p_area: s ? s.area : null,
      p_city: s ? s.city : null, p_home: !!(nat && plan.limits?.home), p_firm: plan.kind === 'provider' ? null : (row.firm_id || null) });
    if (why === 'full') return { error: 'sold_out', status: 409 };
  }
  return { row, plan };
}

export async function quote(req: Request, b: Any, S: Any): Promise<R> {
  const user = await userFrom(req);
  const p = await prepareOrder(req, { ...b, contact: b.contact || { name: 'בדיקה', email: 'quote@example.com', phone: '0500000000' }, firm: b.firm || { name: 'בדיקה', city: (await targets(S))?.cities?.[0], phone: '0500000000' } }, { ...S, _allowDup: true }, user);
  if (p.error && p.error !== 'firm_exists') return [p.status || 400, { error: p.error }];
  const r = p.row; return [200, { plan: p.plan.id, net: r.net_ils, vat: r.vat_ils, total: r.total_ils, max_installments: Math.min(12, Number(S.pay?.max_installments) || 1), months: r.months }];
}

export async function checkout(req: Request, b: Any, S: Any): Promise<R> {
  if (S.test_mode) return [409, { error: 'test_mode_on' }];
  if (!(await rate('checkout', await ipKeyOf(req), 10))) return [429, { error: 'rate' }];
  const user = await userFrom(req);
  const p = await prepareOrder(req, b, S, user); if (p.error) return [p.status || 400, { error: p.error }];
  const key = randKey(24);
  const { data: o, error } = await admin().from('fol_orders').insert({ ...p.row, status: 'pending', provider: 'morning', pay_key_hash: await sha256(key) }).select('*').single();
  if (error) { console.error(error); return [500, { error: 'order' }]; }
  const url = await payPage(S, o, p.plan, key);
  if (!url) { await admin().from('fol_orders').update({ status: 'failed', note: 'לא נוצר דף תשלום' }).eq('id', o.id); await telegram(S, 'לא נוצר דף תשלום במורנינג. צריך לבדוק את החיבור.'); return [502, { error: 'pay_unavailable' }]; }
  return [200, { url, order: o.id }];
}
const ipKeyOf = (req: Request) => ipKey(req);

// test mode only: the whole purchase without a charge (like the course site's test purchase)
export async function checkoutTest(req: Request, b: Any, S: Any): Promise<R> {
  if (!S.test_mode) return [409, { error: 'test_mode_off' }];
  if (!S._selftest && !(await rate('checkout_test', await ipKeyOf(req), 20))) return [429, { error: 'rate' }];
  const user = await userFrom(req);
  const p = await prepareOrder(req, b, S, user); if (p.error) return [p.status || 400, { error: p.error }];
  const { data: o, error } = await admin().from('fol_orders').insert({ ...p.row, status: 'pending', provider: 'test', is_test: true, note: 'רכישת בדיקה, בלי חיוב' }).select('*').single();
  if (error) { console.error(error); return [500, { error: 'order' }]; }
  const { data: g, error: ge } = await admin().rpc('fol_fulfill', { p_order: o.id, p_amount: Number(o.total_ils), p_ref: 'test', p_doc: '' });
  if (ge) { console.error(ge); return [500, { error: 'fulfill' }]; }
  if (g && g.review) return [409, { error: g.why === 'full' ? 'sold_out' : 'review', order: o.id }];
  await afterPaid(S, o.id, true);
  return [200, { ok: true, order: o.id, result: g }];
}

// what happens after money arrived: owner account, emails, admin notice
export async function afterPaid(S: Any, orderId: string, isTest: boolean) {
  const { data: o } = await admin().from('fol_orders').select('*').eq('id', orderId).single();
  const { data: plan } = await admin().from('fol_plans').select('*').eq('id', o.plan_id).single();
  if (o.firm_id && !o.user_id) {
    const uid = await ensureUser(o.email);
    if (uid) { await linkOwner(o.firm_id, uid, o.email); await admin().from('fol_orders').update({ user_id: uid }).eq('id', o.id); }
    else await audit('owner_link_failed', { order: o.id });
  }
  const T = await targets(S);
  const ids: string[] = (o.result && o.result.placements) || [];
  const { data: pls } = ids.length ? await admin().from('fol_placements').select('*').in('id', ids) : { data: [] };
  const items = (pls || []).map((p: Any) => slotText(T, p));
  const until = o.result?.ends_at ? heDate(o.result.ends_at) : '';
  const tpl = tplFor(S);
  const extra = plan.kind === 'article' ? 'צוות התוכן יכין טיוטה לפי מה שכתבתם, ותקבלו קישור לאישור לפני הפרסום.' : plan.kind === 'provider' ? 'המודעה מוצגת בעמוד בית המשפט עם התווית "מודעה".' : '';
  await sendMail(S, o.email, tpl.orderPaid({ firm: o.firm_name, product: plan.name, items, until, net: ils(o.net_ils), vat: ils(o.vat_ils), total: ils(o.total_ils), portal: pageUrl(S, 'portal'), extra }), o.id, isTest);
  await notifyAdmin(S, tpl.admin(`הזמנה שולמה: ${plan.name}`, [`משרד: ${o.firm_name}`, `סכום: ${ils(o.total_ils)}`, ...items, isTest ? 'רכישת בדיקה, בלי חיוב' : `אמצעי: ${o.provider}`]), `שולם ${ils(o.total_ils)} על ${plan.name} (${o.firm_name})`, o.id, isTest);
}

// Morning's server callback. The key in the address must match the order's hash (constant time); repeats change nothing.
export async function paid(url: URL, req: Request, S: Any): Promise<R> {
  const id = clip(url.searchParams.get('o'), 40), k = clip(url.searchParams.get('k'), 80);
  if (!UUID.test(id) || !/^[a-f0-9]{48}$/.test(k)) return [404, { ok: false }];
  const { data: o } = await admin().from('fol_orders').select('id,pay_key_hash,status,is_test').eq('id', id).maybeSingle();
  if (!o || !o.pay_key_hash || !sameText(await sha256(k), o.pay_key_hash)) return [404, { ok: false }];
  const p: Any = await req.json().catch(() => ({}));
  const amt = Number(p && p.amount);
  const ref = clip((p && (p.transactionId || p.reference || p.id)) || '', 120), doc = clip((p && (p.documentId || p.docId)) || '', 120);
  const { data: g, error } = await admin().rpc('fol_fulfill', { p_order: id, p_amount: Number.isFinite(amt) && amt > 0 ? amt : null, p_ref: ref, p_doc: doc });
  if (error) { console.error(error); await telegram(S, `תשלום התקבל אבל ההזמנה לא הופעלה (${id}). צריך לבדוק.`); return [500, { ok: false }]; }
  if (g && g.again) return [200, { ok: true, again: true }];
  const tpl = tplFor(S);
  if (g && g.review) { await notifyAdmin(S, tpl.admin('תשלום לבדיקה', [`הזמנה ${id}`, g.why === 'full' ? 'המקום נתפס לפני התשלום' : 'הסכום ששולם נמוך מהמחיר']), `תשלום לבדיקה (${id})`, id, !!o.is_test); return [200, { ok: true, review: true }]; }
  await afterPaid(S, id, !!o.is_test);
  return [200, { ok: true }];
}

export async function orderStatus(b: Any): Promise<R> {
  const id = String(b.order || ''); if (!UUID.test(id)) return [400, { error: 'order' }];
  const { data: o } = await admin().from('fol_orders').select('status,plan_id,result,is_test').eq('id', id).maybeSingle();
  if (!o) return [404, { error: 'order' }];
  return [200, { status: o.status, plan: o.plan_id, ends_at: o.result?.ends_at || null, test: o.is_test }];
}
export async function renewInfo(b: Any, S: Any): Promise<R> {
  const p = await renewFrom(b.renew); if (!p) return [400, { error: 'renew_link' }];
  const { data: plan } = await admin().from('fol_plans').select('*').eq('id', p.plan_id).maybeSingle();
  const { data: f } = p.firm_id ? await admin().from('fol_firms').select('name').eq('id', p.firm_id).maybeSingle() : { data: null };
  const { data: ro } = p.order_id ? await admin().from('fol_orders').select('months,contact_name,email,phone').eq('id', p.order_id).maybeSingle() : { data: null };
  const pr = price(plan, Number(ro?.months) || 1, Number(S.pay?.vat_rate ?? 0.18));
  return [200, { plan: plan.id, name: plan.name, item: slotText(await targets(S), p), firm: f?.name || p.advertiser?.name || '', ends_at: p.ends_at, status: p.status,
    price: pr, contact: ro ? { name: ro.contact_name, email: ro.email, phone: ro.phone } : null }];
}

// ---------- sign-in (magic link + code, sent by our own mail; the shared project's auth mail settings are not used) ----------
export async function login(req: Request, b: Any, S: Any): Promise<R> {
  const e = lower(b.email); if (!okEmail(e)) return [400, { error: 'email' }];
  if (!(await rate('login_ip', await ipKeyOf(req), 10))) return [429, { error: 'rate' }];
  if (!(await rate('login_email', await emailHash(e), 5))) return [200, { ok: true }];
  const { data: fu } = await admin().from('fol_firm_users').select('user_id').eq('email', e).limit(1);
  const { data: ad } = await admin().from('fol_admins').select('user_id').eq('email', e).limit(1);
  if (!(fu && fu.length) && !(ad && ad.length)) return [200, { ok: true }]; // same answer: nobody learns who is registered
  const { data, error } = await admin().auth.admin.generateLink({ type: 'magiclink', email: e });
  const th = data?.properties?.hashed_token, otp = data?.properties?.email_otp;
  if (error || !th) return [200, { ok: true }];
  await sendMail(S, e, tplFor(S).login(String(otp || ''), pageUrl(S, 'portal', `#login=${th}`)), 'login', S.test_mode);
  return [200, { ok: true }];
}
export async function loginVerify(req: Request, b: Any): Promise<R> {
  if (!(await rate('login_verify', await ipKeyOf(req), 20))) return [429, { error: 'rate' }];
  let v: Any = null;
  if (b.token_hash && /^[a-f0-9]{20,80}$/.test(String(b.token_hash))) {
    v = await pub().auth.verifyOtp({ token_hash: String(b.token_hash), type: 'magiclink' });
    if (!v?.data?.session) v = await pub().auth.verifyOtp({ token_hash: String(b.token_hash), type: 'email' });
  }
  else if (okEmail(lower(b.email)) && /^\d{6}$/.test(String(b.code))) {
    v = await pub().auth.verifyOtp({ email: lower(b.email), token: String(b.code), type: 'magiclink' });
    if (!v?.data?.session) v = await pub().auth.verifyOtp({ email: lower(b.email), token: String(b.code), type: 'email' });
  }
  const s = v?.data?.session; if (!s) return [401, { error: 'login' }];
  return [200, { session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at } }];
}

// ---------- claim an existing listing ----------
export async function claimStart(req: Request, b: Any, S: Any): Promise<R> {
  if (!(await rate('claim', await ipKeyOf(req), 5))) return [429, { error: 'rate' }];
  const { data: f } = await admin().from('fol_firms').select('id,slug,name,website,status,is_test').eq('slug', clip(b.firm, 80)).maybeSingle();
  if (!f || f.status === 'removed') return [404, { error: 'firm' }];
  const { count } = await admin().from('fol_firm_users').select('user_id', { count: 'exact', head: true }).eq('firm_id', f.id);
  if ((count || 0) > 0) return [409, { error: 'claimed' }];
  const name = normText(b.name, 80), e = lower(b.email), ph = normPhone(b.phone);
  if (name.length < 2) return [400, { error: 'name' }];
  if (!okEmail(e)) return [400, { error: 'email' }];
  if (ph && !okPhone(ph)) return [400, { error: 'phone' }];
  const dm = domainMatch(f.website, e);
  const { data: c, error } = await admin().from('fol_claims').insert({ firm_id: f.id, firm_slug: f.slug, name, email: e, phone: ph || null, license_no: clip(b.license, 20) || null,
    method: dm ? 'email_domain' : 'email_code', domain_match: dm, status: 'new', is_test: f.is_test }).select('id').single();
  if (error) return [500, { error: 'claim' }];
  const code = await newCode('claim', c.id);
  await sendMail(S, e, tplFor(S).claimCode(code, f.name), c.id, f.is_test);
  return [200, { ok: true, id: c.id, auto: dm }];
}
export async function claimVerify(req: Request, b: Any, S: Any): Promise<R> {
  if (!(await rate('claim_verify', await ipKeyOf(req), 20))) return [429, { error: 'rate' }];
  const id = String(b.id || ''); const why = await useCode('claim', id, String(b.code || ''));
  if (why) return [400, { error: why }];
  const { data: c } = await admin().from('fol_claims').select('*').eq('id', id).single();
  await admin().from('fol_claims').update({ verified_at: new Date().toISOString(), status: 'verified' }).eq('id', id);
  const { data: f } = await admin().from('fol_firms').select('id,name').eq('id', c.firm_id).single();
  if (c.domain_match) {
    const r = await approveClaim(S, id, null, true);
    if (!r.ok) return [500, { error: r.error }];
    return [200, { ok: true, approved: true, session: await sessionFor(c.email) }];
  }
  await notifyAdmin(S, tplFor(S).admin('בקשת בעלות לאישור', [`משרד: ${f.name}`, `מבקש: ${c.name}`, 'המייל לא בדומיין של אתר המשרד: צריך אימות ידני (מספר רישיון, טלפון המשרד או מסמך).']), `בקשת בעלות לאישור (${f.name})`, id, c.is_test);
  return [200, { ok: true, approved: false }];
}
export async function approveClaim(S: Any, id: string, actor: string | null, auto = false): Promise<Any> {
  const { data: c } = await admin().from('fol_claims').select('*').eq('id', id).maybeSingle();
  if (!c || !['new', 'verified'].includes(c.status)) return { ok: false, error: 'claim' };
  const uid = await ensureUser(c.email); if (!uid) return { ok: false, error: 'account' };
  await linkOwner(c.firm_id, uid, c.email);
  await admin().from('fol_firms').update({ claimed: true, claimed_at: new Date().toISOString() }).eq('id', c.firm_id);
  await admin().rpc('fol_firm_refresh', { p_firm: c.firm_id });
  await admin().from('fol_claims').update({ status: 'approved', user_id: uid, handled_at: new Date().toISOString() }).eq('id', id);
  await audit('claim_approved', { claim: id, auto }, actor);
  const { data: f } = await admin().from('fol_firms').select('name').eq('id', c.firm_id).single();
  await sendMail(S, c.email, tplFor(S).claimApproved(f.name, pageUrl(S, 'portal')), id, c.is_test);
  return { ok: true };
}

// ---------- firm portal ----------
export async function me(req: Request, S: Any): Promise<R> {
  const u = await userFrom(req); if (!u) return [401, { error: 'login' }];
  const adm = await isAdmin(u.id);
  const { data: links } = await admin().from('fol_firm_users').select('firm_id').eq('user_id', u.id);
  const ids = (links || []).map((x: Any) => x.firm_id);
  const out: Any[] = [];
  if (ids.length) {
    const { data: firms } = await admin().from('fol_firms').select('id,slug,name,city_slug,address,phone,website,areas,plan,plan_until,extended,extended_enabled,status,claimed,review_avg,review_count,hide_others').in('id', ids);
    const T = await targets(S);
    for (const f of firms || []) {
      const { data: draft } = await admin().from('fol_profile_drafts').select('data,status,issues,updated_at,published_at').eq('firm_id', f.id).maybeSingle();
      const { data: pls } = await admin().from('fol_placements').select('*').eq('firm_id', f.id).order('ends_at', { ascending: false }).limit(50);
      const placements = [];
      for (const p of pls || []) placements.push({ id: p.id, kind: p.kind, plan: p.plan_id, item: slotText(T, p), ends_at: p.ends_at, status: p.status,
        auto_renew: p.auto_renew && !p.auto_renew_cancelled_at, renew: p.status !== 'cancelled' ? await renewLink(S, p) : null });
      const { data: reviews } = await admin().from('fol_reviews').select('id,rating,title,body,author_display,status,firm_reply,published_at').eq('firm_id', f.id).in('status', ['published', 'held']).order('created_at', { ascending: false }).limit(100);
      const { data: sp } = await admin().from('fol_sponsored').select('id,title,status,body_md,brief,published_at,slug').eq('firm_id', f.id).order('created_at', { ascending: false });
      const since = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
      const { data: st } = await admin().from('fol_stats_daily').select('views,phone,website,whatsapp').eq('firm_id', f.id).gte('day', since);
      const stats = (st || []).reduce((a: Any, r: Any) => ({ views: a.views + r.views, phone: a.phone + r.phone, website: a.website + r.website, whatsapp: a.whatsapp + r.whatsapp }), { views: 0, phone: 0, website: 0, whatsapp: 0 });
      const { data: orders } = await admin().from('fol_orders').select('id,plan_id,status,total_ils,created_at,paid_at,is_test').eq('firm_id', f.id).order('created_at', { ascending: false }).limit(30);
      out.push({ firm: f, draft, placements, reviews, sponsored: sp, stats30: stats, orders });
    }
  }
  return [200, { email: u.email, admin: adm, firms: out, test_mode: S.test_mode }];
}
async function ownerOr401(req: Request, firmId: string): Promise<Any> {
  const u = await userFrom(req); if (!u) return [401, { error: 'login' }];
  if (!(await owns(u.id, firmId))) return [403, { error: 'not_owner' }];
  return u;
}
const imgPrefix = () => `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/fol-public/`;
export async function profileSave(req: Request, b: Any, submit: boolean, S: Any): Promise<R> {
  const u = await ownerOr401(req, String(b.firm)); if (Array.isArray(u)) return u as R;
  const { data: f } = await admin().from('fol_firms').select('id,name,plan,extended_enabled,extended,status').eq('id', b.firm).single();
  if (!f.extended_enabled) return [403, { error: 'not_enabled' }];
  let data = b.data;
  if (submit && !data) { const { data: d } = await admin().from('fol_profile_drafts').select('data').eq('firm_id', f.id).maybeSingle(); data = d?.data || {}; }
  const { data: clean, issues } = cleanProfile(data || {}, imgPrefix());
  const now = new Date().toISOString();
  if (!submit) {
    await admin().from('fol_profile_drafts').upsert({ firm_id: f.id, data: clean, status: 'draft', issues, updated_by: u.id, updated_at: now });
    return [200, { ok: true, issues, data: clean }];
  }
  const tpl = tplFor(S);
  if (issues.length) {
    await admin().from('fol_profile_drafts').upsert({ firm_id: f.id, data: clean, status: 'rejected', issues, updated_by: u.id, updated_at: now });
    return [200, { ok: false, published: false, issues }];
  }
  // automatic publish: the site adds the paid label itself; we store it with the profile so every page shows it
  const ext = { ...clean, label: f.plan !== 'free' ? 'משרד מקודם' : '', published_at: now };
  await admin().from('fol_firms').update({ extended: ext, updated_at: now }).eq('id', f.id);
  await admin().from('fol_profile_drafts').upsert({ firm_id: f.id, data: clean, status: 'published', issues: [], updated_by: u.id, updated_at: now, published_at: now });
  await audit('profile_published', { firm: f.id }, u.id);
  if (u.email) await sendMail(S, u.email, tpl.profileResult(f.name, true, [], pageUrl(S, 'portal')), f.id, S.test_mode);
  return [200, { ok: true, published: true, extended: ext }];
}
export async function upload(req: Request, b: Any, S: Any): Promise<R> {
  const u = await ownerOr401(req, String(b.firm)); if (Array.isArray(u)) return u as R;
  if (!(await rate('upload', u.id, 40))) return [429, { error: 'rate' }];
  const kind = b.kind === 'photo' ? 'photo' : 'logo';
  const max = kind === 'logo' ? 512 * 1024 : 1536 * 1024;
  const raw = String(b.data || '').replace(/^data:[^,]*,/, '');
  if (raw.length > Math.ceil(max * 4 / 3) + 8) return [413, { error: 'too_big' }];
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)); } catch { return [400, { error: 'file' }]; }
  if (bytes.length > max) return [413, { error: 'too_big' }];
  const type = imageType(bytes); if (!type) return [415, { error: 'type' }];
  const ext = type === 'image/png' ? 'png' : type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `firms/${b.firm}/${kind}-${randKey(8)}.${ext}`;
  const { error } = await admin().storage.from('fol-public').upload(path, bytes, { contentType: type, upsert: false, cacheControl: '31536000' });
  if (error) { console.error(error); return [500, { error: 'upload' }]; }
  return [200, { ok: true, url: imgPrefix() + path, path }];
}
export async function autoRenewCancel(req: Request, b: Any): Promise<R> {
  const pid = String(b.placement || ''); if (!UUID.test(pid)) return [400, { error: 'placement' }];
  const { data: p } = await admin().from('fol_placements').select('id,firm_id').eq('id', pid).maybeSingle(); if (!p) return [404, { error: 'placement' }];
  const u = await ownerOr401(req, p.firm_id); if (Array.isArray(u)) return u as R;
  await admin().from('fol_placements').update({ auto_renew: false, auto_renew_cancelled_at: new Date().toISOString() }).eq('id', pid);
  await audit('auto_renew_cancelled', { placement: pid }, u.id);
  return [200, { ok: true }];
}

// ---------- reviews ----------
export async function inviteCreate(req: Request, b: Any, S: Any): Promise<R> {
  const u = await ownerOr401(req, String(b.firm)); if (Array.isArray(u)) return u as R;
  if (!(await rate('invite', u.id, 100, 86400))) return [429, { error: 'rate' }];
  const { data: f } = await admin().from('fol_firms').select('id,slug,is_test').eq('id', b.firm).single();
  const tok = randKey(16);
  await admin().from('fol_review_invites').insert({ firm_id: f.id, token_hash: await sha256(tok), created_by: u.id, expires_at: new Date(Date.now() + 60 * 86400e3).toISOString(), is_test: f.is_test });
  return [200, { ok: true, link: pageUrl(S, 'review', `?firm=${encodeURIComponent(f.slug)}#invite=${tok}`) }];
}
export async function reviewStart(req: Request, b: Any, S: Any): Promise<R> {
  if (!S._selftest && !(await rate('review', await ipKeyOf(req), 5))) return [429, { error: 'rate' }];
  if (b.website_hp) return [200, { ok: true }];
  const { data: f } = await admin().from('fol_firms').select('id,name,website,status,is_test').eq('slug', clip(b.firm, 80)).maybeSingle();
  if (!f || f.status !== 'published') return [404, { error: 'firm' }];
  const rating = Math.floor(Number(b.rating)); if (!(rating >= 1 && rating <= 5)) return [400, { error: 'rating' }];
  const title = normText(b.title, 80), body = normText(b.body, 2000), e = lower(b.email), name = normText(b.name, 40);
  if (body.length < 30) return [400, { error: 'body_short' }];
  if (name.length < 2) return [400, { error: 'name' }];
  if (!okEmail(e)) return [400, { error: 'email' }];
  if (b.consent !== true) return [400, { error: 'consent' }];
  if (reviewBlocked(title, body)) return [400, { error: 'words' }];
  const eh = await emailHash(e);
  const { count: dup } = await admin().from('fol_reviews').select('id', { count: 'exact', head: true }).eq('firm_id', f.id).eq('email_hash', eh)
    .in('status', ['published', 'held', 'pending']).gte('created_at', new Date(Date.now() - 365 * 86400e3).toISOString());
  if ((dup || 0) > 0) return [409, { error: 'duplicate' }];
  let inviteId: string | null = null;
  if (b.invite) {
    const { data: inv } = await admin().from('fol_review_invites').select('*').eq('token_hash', await sha256(String(b.invite))).maybeSingle();
    if (!inv || inv.firm_id !== f.id || inv.used_at || new Date(inv.expires_at).getTime() < Date.now()) return [400, { error: 'invite' }];
    inviteId = inv.id;
  }
  const issues = reviewIssues(title, body);
  if (domainMatch(f.website, e)) issues.push('self');
  const { data: r, error } = await admin().from('fol_reviews').insert({ firm_id: f.id, rating, title: title || null, body, author_display: displayName(name),
    area_slug: clip(b.area, 60) || null, verified_method: inviteId ? 'invite' : 'email_code', email_hash: eh, ip_hash: await ipKeyOf(req), invite_id: inviteId,
    moderation: issues, status: 'unverified', is_test: f.is_test }).select('id').single();
  if (error) { console.error(error); return [500, { error: 'review' }]; }
  const code = await newCode('review', r.id);
  await sendMail(S, e, tplFor(S).reviewCode(code, f.name), r.id, f.is_test);
  return [200, { ok: true, id: r.id }];
}
export async function reviewVerify(req: Request, b: Any, S: Any): Promise<R> {
  if (!S._selftest && !(await rate('review_verify', await ipKeyOf(req), 20))) return [429, { error: 'rate' }];
  const id = String(b.id || ''); const why = await useCode('review', id, String(b.code || '')); if (why) return [400, { error: why }];
  const { data: r } = await admin().from('fol_reviews').select('*').eq('id', id).single();
  if (r.status !== 'unverified') return [200, { ok: true, status: r.status }];
  const held = Array.isArray(r.moderation) && r.moderation.length > 0;
  const now = new Date().toISOString();
  await admin().from('fol_reviews').update({ verified_at: now, status: held ? 'held' : 'published', published_at: held ? null : now }).eq('id', id);
  if (r.invite_id) await admin().from('fol_review_invites').update({ used_at: now }).eq('id', r.invite_id);
  if (!held) await admin().rpc('fol_score_refresh', { p_firm: r.firm_id });
  else await notifyAdmin(S, tplFor(S).admin('חוות דעת ממתינה לבדיקה', [`סיבות: ${r.moderation.join(', ')}`]), 'חוות דעת ממתינה לבדיקה', id, r.is_test);
  return [200, { ok: true, status: held ? 'held' : 'published' }];
}
export async function reply(req: Request, b: Any): Promise<R> {
  const id = String(b.review || ''); if (!UUID.test(id)) return [400, { error: 'review' }];
  const { data: r } = await admin().from('fol_reviews').select('id,firm_id,status').eq('id', id).maybeSingle(); if (!r || r.status !== 'published') return [404, { error: 'review' }];
  const u = await ownerOr401(req, r.firm_id); if (Array.isArray(u)) return u as R;
  const text = normText(b.text, 1000); if (text.length < 2) return [400, { error: 'text' }];
  const issues = [...adIssues(text), ...reviewIssues('', text).filter((x) => x !== 'link').map(() => 'אין לפרסם בתגובה פרטים מזהים של לקוח או תיק.')];
  if (issues.length) return [400, { error: 'rules', issues: [...new Set(issues)] }];
  await admin().from('fol_reviews').update({ firm_reply: text, reply_at: new Date().toISOString() }).eq('id', id);
  await audit('review_reply', { review: id }, u.id);
  return [200, { ok: true }];
}

// ---------- removal / fix requests (acknowledged at once; verified owner removal hides the listing at once; 48h SLA) ----------
export async function removal(req: Request, b: Any, S: Any): Promise<R> {
  if (!S._selftest && !(await rate('removal', await ipKeyOf(req), 5))) return [429, { error: 'rate' }];
  if (b.website_hp) return [200, { ok: true }];
  const { data: f } = await admin().from('fol_firms').select('id,slug,name,is_test').eq('slug', clip(b.firm, 80)).maybeSingle();
  const name = normText(b.name, 80), e = lower(b.email), ph = normPhone(b.phone);
  if (name.length < 2) return [400, { error: 'name' }];
  if (!okEmail(e)) return [400, { error: 'email' }];
  if (ph && !okPhone(ph)) return [400, { error: 'phone' }];
  const kind = b.type === 'fix' ? 'fix' : 'remove';
  const now = Date.now();
  const { data: r, error } = await admin().from('fol_removals').insert({ firm_id: f?.id || null, firm_slug: f?.slug || clip(b.firm, 80) || null, kind, requester_name: name,
    role: normText(b.role, 60) || null, email: e, phone: ph || null, details: normText(b.details, 1500) || null, ip_hash: await ipKeyOf(req),
    status: 'new', due_at: new Date(now + 48 * 3600e3).toISOString(), ack_at: new Date(now).toISOString(), is_test: !!f?.is_test }).select('id').single();
  if (error) { console.error(error); return [500, { error: 'removal' }]; }
  const code = await newCode('removal', r.id);
  await sendMail(S, e, tplFor(S).removalAck(code, f?.name || 'הפרופיל', kind), r.id, !!f?.is_test);
  await notifyAdmin(S, tplFor(S).admin(`בקשת ${kind === 'fix' ? 'תיקון' : 'הסרה'} חדשה`, [`משרד: ${f?.name || clip(b.firm, 80) || 'לא צוין'}`, 'יעד טיפול: 48 שעות']), `בקשת ${kind === 'fix' ? 'תיקון' : 'הסרה'} (${f?.name || ''})`, r.id, !!f?.is_test);
  return [200, { ok: true, id: r.id }];
}
export async function removalVerify(req: Request, b: Any, S: Any): Promise<R> {
  if (!S._selftest && !(await rate('removal_verify', await ipKeyOf(req), 20))) return [429, { error: 'rate' }];
  const id = String(b.id || ''); const why = await useCode('removal', id, String(b.code || '')); if (why) return [400, { error: why }];
  const { data: r } = await admin().from('fol_removals').select('*').eq('id', id).single();
  const { data: f } = r.firm_id ? await admin().from('fol_firms').select('id,name,website,status').eq('id', r.firm_id).maybeSingle() : { data: null };
  const { data: own } = f ? await admin().from('fol_firm_users').select('user_id').eq('firm_id', f.id).eq('email', r.email).limit(1) : { data: [] };
  const owner = !!f && (domainMatch(f.website, r.email) || !!(own && own.length));
  const now = new Date().toISOString();
  if (owner && r.kind === 'remove' && f.status === 'published') {
    await admin().from('fol_firms').update({ status: 'hidden', hidden_reason: 'owner_request', removal_requested_at: r.created_at, updated_at: now }).eq('id', f.id);
    await admin().from('fol_removals').update({ status: 'hidden', verified_at: now, owner_verified: true, handled_at: now }).eq('id', id);
    await sendMail(S, r.email, tplFor(S).removalDone(f.name, true), id, r.is_test);
    await audit('removal_auto_hidden', { removal: id, firm: f.id });
    return [200, { ok: true, hidden: true }];
  }
  await admin().from('fol_removals').update({ status: 'verified', verified_at: now, owner_verified: owner }).eq('id', id);
  return [200, { ok: true, hidden: false }];
}

// ---------- sponsored articles ----------
export async function sponsoredReady(S: Any, id: string, title: string, body: string): Promise<R> {
  if (!UUID.test(id)) return [400, { error: 'id' }];
  const { data: s } = await admin().from('fol_sponsored').select('*').eq('id', id).maybeSingle();
  if (!s || !['brief', 'changes', 'awaiting_firm'].includes(s.status)) return [409, { error: 'status' }];
  const t = normText(title, 140), md = normText(body, 30000);
  if (t.length < 5 || md.length < 200) return [400, { error: 'draft_short' }];
  const iss = adIssues(t + '\n' + md); if (iss.length) return [400, { error: 'rules', issues: iss }];
  const tok = randKey(16);
  await admin().from('fol_sponsored').update({ title: t, body_md: md, status: 'awaiting_firm', approve_token_hash: await sha256(tok), updated_at: new Date().toISOString() }).eq('id', id);
  const { data: users } = await admin().from('fol_firm_users').select('email').eq('firm_id', s.firm_id);
  const { data: f } = await admin().from('fol_firms').select('name').eq('id', s.firm_id).single();
  const link = pageUrl(S, 'portal', `#approve=${id}.${tok}`);
  for (const u of users || []) if (u.email) await sendMail(S, u.email, tplFor(S).articleApproval(f.name, t, link), id, s.is_test);
  return [200, { ok: true, link: S._selftest ? link : undefined }];
}
async function sponsoredByToken(raw: unknown) {
  const [id, tok] = String(raw || '').split('.');
  if (!UUID.test(id || '') || !/^[a-f0-9]{32}$/.test(tok || '')) return null;
  const { data: s } = await admin().from('fol_sponsored').select('*').eq('id', id).maybeSingle();
  if (!s || !s.approve_token_hash || !sameText(await sha256(tok), s.approve_token_hash)) return null;
  return s;
}
export async function sponsoredView(b: Any): Promise<R> {
  const s = await sponsoredByToken(b.approve); if (!s) return [404, { error: 'link' }];
  const { data: f } = await admin().from('fol_firms').select('name').eq('id', s.firm_id).single();
  return [200, { id: s.id, title: s.title, body_md: s.body_md, brief: s.brief, status: s.status, firm: f.name }];
}
export async function sponsoredDecide(b: Any, S: Any): Promise<R> {
  const s = await sponsoredByToken(b.approve); if (!s) return [404, { error: 'link' }];
  if (s.status !== 'awaiting_firm') return [409, { error: 'status', status: s.status }];
  const now = new Date().toISOString();
  if (b.decision === 'approve') {
    const slug = 'sponsored-' + randKey(5);
    await admin().from('fol_sponsored').update({ status: 'published', slug, approved_at: now, published_at: now, approve_token_hash: null, updated_at: now }).eq('id', s.id);
    await notifyAdmin(S, tplFor(S).admin('תוכן ממומן אושר ופורסם', [`כותרת: ${s.title}`]), `תוכן ממומן פורסם: ${s.title}`, s.id, s.is_test);
    return [200, { ok: true, status: 'published', slug, url: pageUrl(S, 'sponsored', `?a=${slug}`) }];
  }
  await admin().from('fol_sponsored').update({ status: 'changes', firm_note: normText(b.note, 1500), approve_token_hash: null, updated_at: now }).eq('id', s.id);
  await notifyAdmin(S, tplFor(S).admin('המשרד ביקש שינויים בתוכן הממומן', [`כותרת: ${s.title}`, `הערות: ${normText(b.note, 300)}`]), 'בקשת שינויים בתוכן ממומן', s.id, s.is_test);
  return [200, { ok: true, status: 'changes' }];
}

// ---------- daily job ----------
export async function daily(S: Any, now = new Date()): Promise<R> {
  const out: Any = {};
  const { data: ex } = await admin().rpc('fol_expire'); out.expire = ex;
  const T = await targets(S); const tpl = tplFor(S);
  // reminders 30 / 7 / 1 days before the end, and one note on the day it ended (each once)
  const { data: pls } = await admin().from('fol_placements').select('*').in('status', ['active', 'expired'])
    .lte('ends_at', new Date(now.getTime() + 30 * 86400e3).toISOString()).gte('ends_at', new Date(now.getTime() - 3 * 86400e3).toISOString()).limit(500);
  let sent = 0;
  for (const p of pls || []) {
    const left = (new Date(p.ends_at).getTime() - now.getTime()) / 86400e3;
    const step = left <= 0 ? '0' : left <= 1 ? '1' : left <= 7 ? '7' : '30';
    if (p.status === 'expired' && step !== '0') continue;
    if (p.reminders && p.reminders[step]) continue;
    const { data: plan } = await admin().from('fol_plans').select('*').eq('id', p.plan_id).single();
    const { data: ro } = p.order_id ? await admin().from('fol_orders').select('months,email,firm_name').eq('id', p.order_id).maybeSingle() : { data: null };
    const pr = price(plan, Number(ro?.months) || 1, Number(S.pay?.vat_rate ?? 0.18));
    const to: string[] = [];
    if (p.firm_id) { const { data: us } = await admin().from('fol_firm_users').select('email').eq('firm_id', p.firm_id); (us || []).forEach((u: Any) => u.email && to.push(u.email)); }
    if (!to.length && ro?.email) to.push(ro.email);
    const { data: f } = p.firm_id ? await admin().from('fol_firms').select('name').eq('id', p.firm_id).maybeSingle() : { data: null };
    const auto = p.auto_renew && !p.auto_renew_cancelled_at;
    const m = tpl.renew({ firm: f?.name || p.advertiser?.name || ro?.firm_name || '', product: plan.name, item: slotText(T, p), until: heDate(p.ends_at), days: Number(step), total: pr ? ils(pr.total) : '', link: await renewLink(S, p), auto });
    for (const e of [...new Set(to)]) await sendMail(S, e, m, p.id, p.is_test);
    await admin().from('fol_placements').update({ reminders: { ...(p.reminders || {}), [step]: now.toISOString() } }).eq('id', p.id);
    sent++;
  }
  out.reminders = sent;
  // removal requests close to the 48 hour limit
  const { data: due } = await admin().from('fol_removals').select('id,firm_slug,due_at').in('status', ['new', 'verified']).lte('due_at', new Date(now.getTime() + 12 * 3600e3).toISOString());
  if (due && due.length) await notifyAdmin(S, tpl.admin('בקשות הסרה או תיקון קרובות למועד', due.map((r: Any) => `${r.firm_slug || r.id}: עד ${heDate(r.due_at)}`)), `${due.length} בקשות הסרה קרובות למועד`, 'sla', false);
  out.sla_alerts = (due || []).length;
  out.sites = S._selftest ? { skipped: 'selftest' } : await siteCheck(40);
  out.monthly = await monthlyStats(S, now);
  // housekeeping: old codes and rate rows; outbox html kept 30 days
  await admin().from('fol_codes').delete().lt('created_at', new Date(now.getTime() - 2 * 86400e3).toISOString());
  await admin().from('fol_audit').delete().like('action', 'rl:%').lt('at', new Date(now.getTime() - 3 * 86400e3).toISOString());
  await admin().from('fol_mail_log').update({ html: null }).lt('at', new Date(now.getTime() - 30 * 86400e3).toISOString()).not('html', 'is', null);
  return [200, { ok: true, ...out }];
}
// does each firm's website answer? (GET with a short timeout; oldest check first; no phone calls)
export async function siteCheck(limit: number, onlyIds?: string[]) {
  let q = admin().from('fol_firms').select('id,website').eq('status', 'published').not('website', 'is', null).order('site_checked_at', { ascending: true, nullsFirst: true }).limit(limit);
  if (onlyIds) q = admin().from('fol_firms').select('id,website').in('id', onlyIds);
  const { data } = await q; let bad = 0; const rows = data || [];
  const one = async (f: Any) => {
    let st = 0;
    try { const r = await fetch(String(f.website).startsWith('http') ? f.website : 'https://' + f.website, { redirect: 'follow', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; directory-link-check)' } }); st = r.status; await r.body?.cancel(); } catch { st = 0; }
    const ok = st > 0 && st < 500 && st !== 404 && st !== 410;
    if (!ok) bad++;
    await admin().from('fol_firms').update({ site_status: st, site_ok: ok, site_checked_at: new Date().toISOString() }).eq('id', f.id);
  };
  for (let i = 0; i < rows.length; i += 8) await Promise.all(rows.slice(i, i + 8).map(one)); // 8 at a time, 6 s each at most
  return { checked: rows.length, broken: bad };
}
// on the 1st of each month (Israel time): last month's numbers to each paid firm, once
export async function monthlyStats(S: Any, now: Date, force = false, onlyFirm?: string) {
  const il = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  if (!force && il.getDate() !== 1) return { skipped: 'not_first' };
  const first = new Date(il.getFullYear(), il.getMonth() - 1, 1), last = new Date(il.getFullYear(), il.getMonth(), 0);
  const key = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`;
  if (!force) { const { count } = await admin().from('fol_audit').select('id', { count: 'exact', head: true }).eq('action', 'monthly_stats').eq('key', key); if ((count || 0) > 0) return { skipped: 'done' }; }
  const d = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const { data: paidFirms } = await admin().from('fol_placements').select('firm_id').eq('status', 'active').not('firm_id', 'is', null);
  const ids = [...new Set((paidFirms || []).map((x: Any) => x.firm_id))].filter((x) => !onlyFirm || x === onlyFirm);
  const month = first.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  let sent = 0;
  for (const id of ids) {
    const { data: st } = await admin().from('fol_stats_daily').select('views,phone,website,whatsapp').eq('firm_id', id).gte('day', d(first)).lte('day', d(last));
    const s = (st || []).reduce((a: Any, r: Any) => ({ views: a.views + r.views, phone: a.phone + r.phone, website: a.website + r.website, whatsapp: a.whatsapp + r.whatsapp }), { views: 0, phone: 0, website: 0, whatsapp: 0 });
    const { data: f } = await admin().from('fol_firms').select('name,is_test').eq('id', id).single();
    const { data: us } = await admin().from('fol_firm_users').select('email').eq('firm_id', id);
    for (const u of us || []) if (u.email) { await sendMail(S, u.email, tplFor(S).monthly(f.name, month, s, pageUrl(S, 'portal')), String(id), f.is_test); sent++; }
  }
  if (!force) await admin().from('fol_audit').insert({ action: 'monthly_stats', key, detail: { sent } });
  return { month: key, sent };
}

// ---------- admin (admin role only: fol_admins) ----------
const SETTABLE = ['test_mode', 'launch', 'mail', 'pay', 'limits', 'notify', 'sales', 'brand'];
export async function adminOp(req: Request, b: Any, S: Any): Promise<R> {
  const u = await userFrom(req); if (!u) return [401, { error: 'login' }];
  if (!(await isAdmin(u.id))) return [403, { error: 'not_admin' }];
  const op = String(b.op || ''); const id = String(b.id || ''); const now = new Date().toISOString();
  const lim = 200;
  const list = async (t: string, cols: string, f?: (q: Any) => Any, order = 'created_at') => { let q = admin().from(t).select(cols).order(order, { ascending: false }).limit(lim); if (f) q = f(q); const { data } = await q; return [200, { rows: data || [] }] as R; };
  switch (op) {
    case 'overview': {
      const c = async (t: string, f: (q: Any) => Any) => (await f(admin().from(t).select('*', { count: 'exact', head: true }))).count || 0;
      const soon = new Date(Date.now() + 30 * 86400e3).toISOString();
      const { data: paidRows } = await admin().from('fol_orders').select('total_ils').eq('status', 'paid').eq('is_test', false);
      return [200, {
        test_mode: S.test_mode, orders_pending: await c('fol_orders', (q) => q.eq('status', 'pending')), orders_review: await c('fol_orders', (q) => q.eq('status', 'review')),
        orders_paid: (paidRows || []).length, revenue: (paidRows || []).reduce((a: number, r: Any) => a + Number(r.total_ils), 0),
        placements_active: await c('fol_placements', (q) => q.eq('status', 'active')), renewals_30: await c('fol_placements', (q) => q.eq('status', 'active').lte('ends_at', soon)),
        reviews_held: await c('fol_reviews', (q) => q.eq('status', 'held')), removals_open: await c('fol_removals', (q) => q.in('status', ['new', 'verified'])),
        claims_waiting: await c('fol_claims', (q) => q.eq('status', 'verified')), sites_broken: await c('fol_firms', (q) => q.eq('site_ok', false)),
        sponsored_briefs: await c('fol_sponsored', (q) => q.in('status', ['brief', 'changes'])), outbox: await c('fol_mail_log', (q) => q.eq('status', 'outbox')),
      }];
    }
    case 'orders': return list('fol_orders', 'id,created_at,plan_id,kind,firm_name,contact_name,email,phone,total_ils,installments,status,provider,provider_ref,provider_doc,paid_at,is_test,note,auto_renew', (q) => b.status ? q.eq('status', b.status) : q);
    case 'payments': return list('fol_orders', 'id,paid_at,plan_id,firm_name,net_ils,vat_ils,total_ils,paid_amount,provider,provider_ref,provider_doc,is_test', (q) => q.eq('status', 'paid'), 'paid_at');
    case 'firms': return list('fol_firms', 'id,slug,name,city_slug,phone,website,plan,plan_until,status,claimed,is_sample,is_test,review_avg,review_count,site_ok,site_status,hidden_reason', (q) => b.q ? q.ilike('name', `%${clip(b.q, 60)}%`) : b.broken ? q.eq('site_ok', false) : q, 'updated_at');
    case 'reviews': return list('fol_reviews', 'id,firm_id,rating,title,body,author_display,status,moderation,verified_method,verified_at,firm_reply,created_at,is_test', (q) => b.status ? q.eq('status', b.status) : q);
    case 'removals': return list('fol_removals', 'id,firm_slug,kind,requester_name,role,email,phone,details,status,owner_verified,due_at,created_at,is_test');
    case 'claims': return list('fol_claims', 'id,firm_slug,name,email,phone,license_no,method,domain_match,status,verified_at,created_at,is_test');
    case 'placements': return list('fol_placements', 'id,firm_id,plan_id,kind,target,area_slug,city_slug,home,starts_at,ends_at,status,auto_renew,reminders,is_test', (q) => b.renewals ? q.eq('status', 'active').lte('ends_at', new Date(Date.now() + 60 * 86400e3).toISOString()) : q, b.renewals ? 'ends_at' : 'created_at');
    case 'sponsored': return list('fol_sponsored', 'id,firm_id,title,brief,status,firm_note,slug,published_at,ends_at,is_test,created_at');
    case 'outbox': return list('fol_mail_log', 'id,at,template,to_masked,subject,status,html,is_test', undefined, 'at');
    case 'settings_get': { const { data } = await admin().from('fol_settings').select('key,value'); return [200, { rows: data || [] }]; }
    case 'settings_set': {
      const k = String(b.key || ''); if (!SETTABLE.includes(k)) return [400, { error: 'key' }];
      if (b.value === undefined || JSON.stringify(b.value).length > 4000) return [400, { error: 'value' }];
      await admin().from('fol_settings').upsert({ key: k, value: b.value, updated_at: now }); await audit('setting', { key: k }, u.id); return [200, { ok: true }];
    }
    case 'firm_hide': case 'firm_publish':
      if (!UUID.test(id)) return [400, { error: 'id' }];
      await admin().from('fol_firms').update(op === 'firm_hide' ? { status: 'hidden', hidden_reason: normText(b.reason, 200) || 'admin', updated_at: now } : { status: 'published', hidden_reason: null, updated_at: now }).eq('id', id);
      await audit(op, { firm: id }, u.id); return [200, { ok: true }];
    case 'profile_unpublish':
      if (!UUID.test(id)) return [400, { error: 'id' }];
      await admin().from('fol_firms').update({ extended: {}, updated_at: now }).eq('id', id);
      await admin().from('fol_profile_drafts').update({ status: 'rejected', issues: [normText(b.reason, 200) || 'הוסר על ידי מנהל האתר'] }).eq('firm_id', id);
      await audit(op, { firm: id }, u.id); return [200, { ok: true }];
    case 'review_publish': case 'review_hide': case 'review_reject': {
      if (!UUID.test(id)) return [400, { error: 'id' }];
      const { data: r } = await admin().from('fol_reviews').select('firm_id,verified_at').eq('id', id).single();
      if (op === 'review_publish' && !r.verified_at) return [409, { error: 'not_verified' }];
      await admin().from('fol_reviews').update({ status: op === 'review_publish' ? 'published' : op === 'review_hide' ? 'hidden' : 'rejected', published_at: op === 'review_publish' ? now : null }).eq('id', id);
      await admin().rpc('fol_score_refresh', { p_firm: r.firm_id }); await audit(op, { review: id }, u.id); return [200, { ok: true }];
    }
    case 'removal_done': case 'removal_reject': case 'removal_hide': {
      if (!UUID.test(id)) return [400, { error: 'id' }];
      const { data: r } = await admin().from('fol_removals').select('*').eq('id', id).single();
      if (op === 'removal_hide' && r.firm_id) await admin().from('fol_firms').update({ status: 'hidden', hidden_reason: 'removal_request', updated_at: now }).eq('id', r.firm_id);
      await admin().from('fol_removals').update({ status: op === 'removal_reject' ? 'rejected' : op === 'removal_hide' ? 'hidden' : 'done', handled_at: now, admin_note: normText(b.note, 500) || null }).eq('id', id);
      if (op !== 'removal_reject' && r.email) await sendMail(S, r.email, tplFor(S).removalDone(r.firm_slug || '', op === 'removal_hide'), id, r.is_test);
      await audit(op, { removal: id }, u.id); return [200, { ok: true }];
    }
    case 'claim_approve': { const r = await approveClaim(S, id, u.id); return r.ok ? [200, { ok: true }] : [400, { error: r.error }]; }
    case 'claim_reject':
      if (!UUID.test(id)) return [400, { error: 'id' }];
      await admin().from('fol_claims').update({ status: 'rejected', handled_at: now, admin_note: normText(b.note, 500) || null }).eq('id', id); await audit(op, { claim: id }, u.id); return [200, { ok: true }];
    case 'placement_cancel': {
      if (!UUID.test(id)) return [400, { error: 'id' }];
      const { data: p } = await admin().from('fol_placements').update({ status: 'cancelled', updated_at: now }).eq('id', id).select('firm_id').single();
      if (p?.firm_id) await admin().rpc('fol_firm_refresh', { p_firm: p.firm_id });
      await audit(op, { placement: id }, u.id); return [200, { ok: true }];
    }
    case 'order_mark_paid': { // a payment that arrived outside the payment page (bank transfer): same automatic fulfillment
      if (!UUID.test(id)) return [400, { error: 'id' }];
      const { data: g, error } = await admin().rpc('fol_fulfill', { p_order: id, p_amount: null, p_ref: 'manual:' + normText(b.ref, 60), p_doc: normText(b.doc, 60) });
      if (error) return [400, { error: 'fulfill' }];
      if (g && g.ok && !g.again) { const { data: o } = await admin().from('fol_orders').select('is_test').eq('id', id).single(); await afterPaid(S, id, !!o?.is_test); }
      await audit(op, { order: id }, u.id); return [200, { ok: true, result: g }];
    }
    case 'sponsored_draft': return sponsoredReady(S, id, String(b.title || ''), String(b.body_md || ''));
    case 'run_daily': return daily(S);
    case 'site_check': return [200, await siteCheck(Math.min(100, Number(b.limit) || 40))];
  }
  return [400, { error: 'op' }];
}
