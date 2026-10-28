// hns-biz (28.10.2026): business directory of nws.co.il (חדשות נתניה והשרון). Payments are NOT connected.
// GET                          public feed of approved listings + categories, for the site build (scripts/biz.mjs).
// POST {action:'register',...}  public self-registration form (sites/nws /directory/join/). Checks: honeypot field, minimum
//                              fill time, field validation, rate limit per sender (3 an hour, 6 a day) and overall (40 an hour),
//                              duplicate phone in the same category, and Cloudflare Turnstile when NWS_TURNSTILE_SECRET exists
//                              in app_secrets (without it the check is skipped, so Turnstile can be switched on later).
//                              A new listing is 'pending' and Yakir gets one Telegram message with two buttons:
//                              "לאשר" (hns:biz:ok:<id>) and "לדחות" (hns:biz:no:<id>). The office bot (inbound) sends every hns:
//                              tap to hns-publish, which passes hns:biz: taps here as {action:'decide'}.
// POST (x-cron-secret): {action:'decide', data, cq?} | {action:'list', status?} | {action:'purge_test'} |
//                       {action:'register', test:true, tg?:bool}  (test listing: is_test, never in the feed)
// 28.10.2026 (business flows): POST {action:'request', type, ...}  every other public form of the site (contact, advertising,
//   sponsored article, promotion, banner, news tip with photo, correction, newsletter), see requests.ts. Table hns_requests.
//   Telegram buttons hns:biz:rq:<id> (handled) and hns:biz:sp:<id> (spam) come back here through hns-publish as {action:'decide'}.
//   A directory registration that asks for promotion or a sponsored article also opens a request (so it shows in the panel).
//   Confirmation emails go out only when NWS_MAIL_FROM (an nws.co.il sender) exists in app_secrets (lib.ts).
// The management panel (https://nws.co.il/admin/, edge function hns-panel) uses the same decide logic.
// No long or medium dash in any saved text.
import { Any, sb, S, secrets, J, CORS, clean, phoneOf, urlOk, emailOk, sha, ipOf, tg, mail } from './lib.ts';
import { request, requestDecide } from './requests.ts';

// Netanya (whole city), its neighborhoods and the nearby Sharon: same names as the site's places (sites/nws/src/data/places.ts)
export const AREAS = ['נתניה', 'מרכז העיר', 'פולג', 'רמת פולג', 'עיר ימים', 'קריית השרון', 'קריית נורדאו', 'אגמים', 'נאות שקד', 'נאות הרצל', 'דורה',
  'קריית צאנז', 'ותיקים', 'גבעת האירוסים', 'רמת חן', 'גלי ים', 'נאות גנים', 'נווה איתמר', 'נוף הטיילת', 'עין התכלת', 'פרדס הגדוד', 'רמת אפריים',
  'אופק הים', 'קריית רבין', 'כוכב הצפון', 'משכנות זבולון', 'סלע', 'רמת ידין', 'חפציבה', 'בית ינאי', 'אבן יהודה', 'קדימה צורן', 'עמק חפר', 'כפר יונה',
  'תל מונד', 'פרדסיה'];
const INTEREST: Record<string, string> = { featured: 'קידום במדריך (מומלץ)', sponsored: 'כתבת תוכן שיווקי' };

const BAR_WORDS = /הכי|הטוב ביותר|הטובים ביותר|מומחה|מומחים|מוביל|מובילים|מספר 1|מס׳ 1|הצלחה מובטחת|מבטיחים|ללא תחרות/;

async function categories() {
  const { data } = await sb.from('hns_biz_categories').select('slug,name_he,plural_he,sort').eq('active', true).order('sort');
  return data || [];
}

function approvalText(L: Any, cat: string) {
  const lines = [
    '🏪 עסק חדש ביקש להצטרף למדריך העסקים, חדשות נתניה והשרון', '',
    `שם העסק: ${L.name}`, `קטגוריה: ${cat}`, `אזור: ${L.area}${L.areas_served?.length ? ` (משרת גם: ${L.areas_served.join(', ')})` : ''}`,
    `טלפון: ${L.phone}`, L.whatsapp ? `וואטסאפ: ${L.whatsapp}` : '', L.email ? `מייל: ${L.email}` : '', L.website ? `אתר: ${L.website}` : '',
    L.address ? `כתובת: ${L.address}` : '', L.license_no ? `מספר רישיון: ${L.license_no}` : '', L.logo_url ? `לוגו: ${L.logo_url}` : '',
    L.contact_name ? `איש קשר: ${L.contact_name}${L.contact_phone ? `, ${L.contact_phone}` : ''}` : '', '',
    'תיאור:', L.description, '',
    L.interest?.length ? `מעוניין גם ב: ${L.interest.map((i: string) => INTEREST[i] || i).join(', ')} (התשלום עוד לא מחובר, צריך לחזור אליו)` : 'רישום בסיסי בלי עלות',
    L.category === 'lawyers' && BAR_WORDS.test(`${L.name} ${L.description}`) ? '\n⚠️ שימו לב: בתיאור יש מילים שאסורות בפרסום של עורכי דין (למשל "הכי", "מומחה", "מוביל"). כדאי לדחות ולבקש נוסח אחר.' : '',
    '', 'אחרי אישור העסק יופיע באתר תוך כרבע שעה.',
  ];
  return lines.filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').slice(0, 4000);
}

async function register(b: Any, req: Request, admin: boolean) {
  const test = admin && !!b.test;
  // bots: the hidden field is filled, or the form was sent too fast. They get a normal "thanks" and nothing is saved.
  if (!test && (clean(b.company_fax) || Number(b.t || 0) < 3000)) return { ok: true, id: null };
  const ip = ipOf(req);
  const ipHash = await sha(`${ip}|${S.CRON_SECRET}`);
  if (!test && S.NWS_TURNSTILE_SECRET) {
    const fd = new FormData(); fd.set('secret', S.NWS_TURNSTILE_SECRET); fd.set('response', String(b.turnstile || '')); if (ip !== 'none') fd.set('remoteip', ip);
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd, signal: AbortSignal.timeout(10000) }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!v.success) return { ok: false, status: 400, error: 'בדיקת האבטחה לא עברה. רעננו את הדף ונסו שוב.' };
  }
  const cats = await categories();
  const cat = cats.find((c: Any) => c.slug === b.category);
  const L: Any = {
    category: cat?.slug, name: clean(b.name, 80), area: clean(b.area, 40),
    areas_served: (Array.isArray(b.areas_served) ? b.areas_served : []).map((x: unknown) => clean(x, 40)).filter((x: string) => AREAS.includes(x)).slice(0, 12),
    address: clean(b.address, 120) || null, phone: phoneOf(b.phone), whatsapp: b.whatsapp ? phoneOf(b.whatsapp) : '',
    email: b.email ? emailOk(clean(b.email, 200)) : '', website: b.website ? urlOk(clean(b.website, 200)) : '',
    description: clean(b.description, 1200), logo_url: b.logo_url ? urlOk(clean(b.logo_url, 400)) : '',
    license_no: clean(b.license_no, 30) || null, contact_name: clean(b.contact_name, 60) || null, contact_phone: b.contact_phone ? phoneOf(b.contact_phone) || null : null,
    interest: (Array.isArray(b.interest) ? b.interest : []).filter((x: string) => INTEREST[x]),
    consent: b.consent === true || b.consent === 'on' || b.consent === '1',
  };
  const errs: Record<string, string> = {};
  if (!L.category) errs.category = 'בחרו קטגוריה';
  if (L.name.length < 2) errs.name = 'כתבו את שם העסק';
  if (!AREAS.includes(L.area)) errs.area = 'בחרו אזור';
  if (!L.phone) errs.phone = 'מספר טלפון לא תקין';
  if (b.whatsapp && !L.whatsapp) errs.whatsapp = 'מספר וואטסאפ לא תקין';
  if (b.email && !L.email) errs.email = 'כתובת מייל לא תקינה';
  if (b.website && !L.website) errs.website = 'כתובת אתר לא תקינה';
  if (b.logo_url && !L.logo_url) errs.logo_url = 'קישור ללוגו לא תקין';
  if (L.description.length < 30) errs.description = 'כתבו תיאור של לפחות 30 תווים';
  if (L.category === 'lawyers' && !L.license_no) errs.license_no = 'לעורכי דין צריך מספר רישיון בלשכה';
  if (!L.consent) errs.consent = 'צריך לאשר את פרסום הפרטים';
  if (Object.keys(errs).length) return { ok: false, status: 400, error: 'יש שדות שצריך לתקן', fields: errs };

  if (!test) {
    const hourAgo = new Date(Date.now() - 3600e3).toISOString(), dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { data: mine } = await sb.from('hns_biz_listings').select('created_at').eq('ip_hash', ipHash).gte('created_at', dayAgo);
    const lastHour = (mine || []).filter((r: Any) => r.created_at >= hourAgo).length;
    const { count: all } = await sb.from('hns_biz_listings').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo);
    if (lastHour >= 3 || (mine || []).length >= 6 || (all || 0) >= 40) return { ok: false, status: 429, error: 'נשלחו יותר מדי טפסים. נסו שוב מאוחר יותר.' };
    const { data: dup } = await sb.from('hns_biz_listings').select('id').eq('phone', L.phone).eq('category', L.category).in('status', ['pending', 'approved']).eq('is_test', false).limit(1);
    if (dup?.length) return { ok: true, id: dup[0].id, duplicate: true, message: 'העסק כבר רשום אצלנו או ממתין לבדיקה. נחזור אליכם אם צריך.' };
  }
  const now = new Date().toISOString();
  const row = { ...L, whatsapp: L.whatsapp || null, email: L.email || null, website: L.website || null, logo_url: L.logo_url || null,
    status: 'pending', plan: 'free', consent_at: now, ip_hash: ipHash, is_test: test, notes: test ? 'test' : null };
  const { data: ins, error } = await sb.from('hns_biz_listings').insert(row).select('*').single();
  if (error) return { ok: false, status: 500, error: 'שמירה נכשלה, נסו שוב בעוד דקה' };
  let sent = false;
  if (!test || b.tg) {
    const r = await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, text: approvalText(ins, cat?.plural_he || L.category), disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: '✅ לאשר', callback_data: `hns:biz:ok:${ins.id}` }, { text: '✗ לדחות', callback_data: `hns:biz:no:${ins.id}` }]] } });
    if (r?.ok) { sent = true; await sb.from('hns_biz_listings').update({ tg_sent_at: new Date().toISOString(), tg_message_id: r.result?.message_id ?? null }).eq('id', ins.id); }
  }
  // a wish for promotion or a sponsored article is a purchase request: it also goes to hns_requests (shown in the panel,
  // no second Telegram message: the approval message above already says it)
  for (const it of L.interest as string[]) {
    await sb.from('hns_requests').insert({ type: it === 'sponsored' ? 'sponsored' : 'promote', offer: it, name: L.contact_name || null, phone: L.contact_phone || L.phone,
      email: L.email || null, business: L.name, message: `ביקשו בטופס ההצטרפות למדריך (עסק #${ins.id}).`, page: '/directory/join/', consent: true, consent_at: now,
      ip_hash: ipHash, is_test: test, extra: { listing_id: ins.id }, tg_sent_at: sent ? new Date().toISOString() : null });
  }
  if (L.email && !test) await mail(L.email, 'קיבלנו את הרישום שלכם למדריך העסקים, חדשות נתניה והשרון', [
    'שלום,', `קיבלנו את הבקשה לרשום את "${L.name}" במדריך העסקים של חדשות נתניה והשרון.`,
    'אנחנו בודקים כל רישום לפני שהוא עולה לאתר. אחרי האישור העסק יופיע במדריך בתוך זמן קצר.',
    L.interest.length ? 'ראינו שאתם מתעניינים גם בקידום. התשלום עוד לא מחובר לאתר, ונחזור אליכם עם הפרטים.' : '',
    'אם לא אתם שלחתם את הטופס, אפשר להתעלם מהמייל הזה.'].filter(Boolean));
  return { ok: true, id: ins.id, sent, ...(test ? { preview: approvalText(ins, cat?.plural_he || L.category) } : {}) };
}

async function decide(data: string, cq: Any) {
  const [, , act, idStr] = String(data || '').split(':'); // hns:biz:ok:<id>
  if (act === 'rq' || act === 'sp' || act === 'rn') return requestDecide(act, Number(idStr), cq, cq?.by || 'yakir');
  const answer = (text: string) => cq?.id ? tg('answerCallbackQuery', { callback_query_id: cq.id, text }) : null;
  const edit = (text: string) => cq?.chat_id && cq?.message_id ? tg('editMessageText', { chat_id: cq.chat_id, message_id: cq.message_id, text, disable_web_page_preview: true }) : null;
  const id = Number(idStr);
  if (!['ok', 'no'].includes(act) || !id) { await answer('פעולה לא מוכרת'); return { ok: false, error: 'bad data' }; }
  const { data: L } = await sb.from('hns_biz_listings').select('id,name,status,tg_message_id').eq('id', id).maybeSingle();
  if (!L) { await answer('העסק לא נמצא'); return { ok: false, error: 'not found' }; }
  if (L.status !== 'pending') { await answer(L.status === 'approved' ? 'כבר אושר' : 'כבר נדחה'); return { ok: true, already: L.status }; }
  const now = new Date().toISOString();
  const status = act === 'ok' ? 'approved' : 'rejected';
  const { data: upd } = await sb.from('hns_biz_listings').update({ status, decided_at: now, decided_by: 'yakir', updated_at: now }).eq('id', id).eq('status', 'pending').select('id');
  if (!upd?.length) { await answer('כבר טופל'); return { ok: true, already: true }; }
  if (!cq?.message_id && L.tg_message_id && S.TELEGRAM_CHAT_ID) cq = { ...(cq || {}), chat_id: S.TELEGRAM_CHAT_ID, message_id: L.tg_message_id }; // decided in the panel
  if (status === 'approved') { await answer('אושר ✓ יופיע באתר תוך כרבע שעה'); await edit(`✅ אושר למדריך העסקים: ${L.name}\nיופיע באתר תוך כרבע שעה.`); }
  else { await answer('נדחה'); await edit(`✗ לא אושר למדריך העסקים: ${L.name}`); }
  return { ok: true, [status]: id };
}

// panel edit of a listing (any status). Same cleaning and checks as the form; an approved listing changes on the site after the next build.
async function listingEdit(idIn: unknown, f: Any) {
  const id = Number(idIn); if (!id) return { ok: false, error: 'id' };
  const p: Any = {}, errs: Record<string, string> = {};
  if (f.name !== undefined) { p.name = clean(f.name, 80); if (p.name.length < 2) errs.name = 'שם קצר מדי'; }
  if (f.description !== undefined) { p.description = clean(f.description, 1200); if (p.description.length < 30) errs.description = 'תיאור של 30 תווים לפחות'; }
  if (f.category !== undefined) { const cats = await categories(); if (!cats.some((c: Any) => c.slug === f.category)) errs.category = 'קטגוריה לא מוכרת'; else p.category = f.category; }
  if (f.area !== undefined) { if (!AREAS.includes(f.area)) errs.area = 'אזור לא מוכר'; else p.area = f.area; }
  if (f.phone !== undefined) { p.phone = phoneOf(f.phone); if (!p.phone) errs.phone = 'טלפון לא תקין'; }
  if (f.whatsapp !== undefined) { p.whatsapp = f.whatsapp ? phoneOf(f.whatsapp) || null : null; if (f.whatsapp && !p.whatsapp) errs.whatsapp = 'וואטסאפ לא תקין'; }
  if (f.email !== undefined) { p.email = f.email ? emailOk(clean(f.email, 200)) || null : null; if (f.email && !p.email) errs.email = 'מייל לא תקין'; }
  if (f.website !== undefined) { p.website = f.website ? urlOk(clean(f.website, 200)) || null : null; if (f.website && !p.website) errs.website = 'אתר לא תקין'; }
  if (f.logo_url !== undefined) { p.logo_url = f.logo_url ? urlOk(clean(f.logo_url, 400)) || null : null; if (f.logo_url && !p.logo_url) errs.logo_url = 'קישור לא תקין'; }
  if (f.address !== undefined) p.address = clean(f.address, 120) || null;
  if (f.license_no !== undefined) p.license_no = clean(f.license_no, 30) || null;
  if (f.notes !== undefined) p.notes = clean(f.notes, 500) || null;
  if (f.plan !== undefined) { if (!['free', 'featured'].includes(f.plan)) errs.plan = 'free או featured'; else p.plan = f.plan; }
  if (f.featured_until !== undefined) p.featured_until = f.featured_until ? new Date(String(f.featured_until)).toISOString() : null;
  if (Object.keys(errs).length) return { ok: false, error: 'יש שדות שצריך לתקן', fields: errs };
  if (!Object.keys(p).length) return { ok: false, error: 'אין מה לשנות' };
  p.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('hns_biz_listings').update(p).eq('id', id).select('*').maybeSingle();
  if (error || !data) return { ok: false, error: 'השמירה נכשלה' };
  return { ok: true, listing: data };
}

async function feed() {
  const cats = await categories();
  const { data, error } = await sb.from('hns_biz_listings')
    .select('id,created_at,updated_at,category,name,area,areas_served,address,phone,whatsapp,email,website,description,logo_url,license_no,plan,featured_until')
    .eq('status', 'approved').eq('is_test', false).order('id');
  if (error) throw new Error('db');
  const now = Date.now();
  const listings = (data || []).map((r: Any) => ({
    id: r.id, slug: `b${r.id}`, category: r.category, name: clean(r.name), area: r.area, areasServed: r.areas_served || [], address: r.address || '',
    phone: r.phone, whatsapp: r.whatsapp || '', email: r.email || '', website: r.website || '', description: clean(r.description), logo: r.logo_url || '',
    license: r.license_no || '', featured: r.plan === 'featured' && (!r.featured_until || Date.parse(r.featured_until) > now),
    created: r.created_at, updated: r.updated_at,
  }));
  return { ok: true, generated: new Date().toISOString(), categories: cats, count: listings.length, listings };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  await secrets();
  try {
    if (req.method === 'GET') return J(await feed(), 200, { 'cache-control': 'public, max-age=60' });
    const b: Any = await req.json().catch(() => ({}));
    const admin = !!S.CRON_SECRET && req.headers.get('x-cron-secret') === S.CRON_SECRET;
    if (b.action === 'register') { const r: Any = await register(b, req, admin); return J(r, r.status || 200); }
    if (b.action === 'request') { const r: Any = await request(b, req, admin); return J(r, r.status || 200); }
    if (!admin) return J({ ok: false }, 401);
    if (b.action === 'listing_edit') return J(await listingEdit(b.id, b.fields || {}));
    if (b.action === 'decide') return J(await decide(b.data, b.cq));
    if (b.action === 'list') {
      const { data } = await sb.from('hns_biz_listings').select('id,created_at,category,name,area,status,plan,is_test,tg_sent_at').eq('status', b.status || 'pending').order('id', { ascending: false }).limit(100);
      return J({ ok: true, listings: data || [] });
    }
    if (b.action === 'purge_test') {
      const { data } = await sb.from('hns_biz_listings').delete().eq('is_test', true).select('id');
      return J({ ok: true, deleted: (data || []).map((r: Any) => r.id) });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
