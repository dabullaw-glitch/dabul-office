// Directory engine for Folivus (folivus.com) and the lawyer portal of בלי חובות (blihovot.co.il). 2.11.2026.
// Spec: sites/folivus/SPEC.md. Data in docs: dir_lawyer, dir_review, dir_lead, dir_rank, dir_req. verify_jwt false, CORS *.
// Public:
//   GET  ?a=export&site=folivus|blihovot   public fields + reviews + ranks (the sites read it at build time)
//   POST ?a=lead     {site, lawyerId?, area, city, name, phone, message}      -> dir_lead + Telegram note
//   POST ?a=otp      {phone, lawyerId}   no SMS sender yet: answers {skip:true} and the review is checked by hand
//   POST ?a=review   {lawyerId, stars, text, name, phone, area}                -> dir_review 'pending' + dir_req
//   POST ?a=join | claim | remove                                               -> dir_req + Telegram with approve / reject links
//   POST ?a=decide   {id, t, act:'ok'|'no'}  from the approval page (<site>/ishur/#id=..&t=..&act=..)
// Never writes UPDATE/DELETE: new rows by insert, changes by docs_merge. Removal = status 'removed'.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const insert = async (coll: string, id: string, data: Any) => { const { error } = await db().insert({ coll, id, data }); if (error) throw new Error(error.message); };
const tok = () => crypto.randomUUID().replace(/-/g, '');
const uid = (p: string) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => new Date().toISOString();
const s = (v: unknown, max = 300) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const ml = (v: unknown, max = 2000) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);
const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => s(x, 60)).filter(Boolean).slice(0, 10);
const digits = (p: unknown) => String(p ?? '').replace(/\D/g, '');
const SITES = ['folivus', 'blihovot'];
const DEBT_AREAS = ['insolvency', 'enforcement'];   // בלי חובות: חדלות פירעון, הסדרי חובות (inside insolvency), הוצאה לפועל
const SITE_HE: Record<string, string> = { folivus: 'פוליבוס', blihovot: 'בלי חובות' };

async function sha(t: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t + '|' + env('CRON_SECRET')));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
async function tg(text: string, buttons?: Any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}
async function approveBase() {
  const st = await getDoc('settings', 'folivus').catch(() => null);
  return String(st?.approveBase || 'https://dabullaw-glitch.github.io/dabul-office/folivus/ishur/');
}
// a few requests per phone per hour, and per site per minute, so the forms can not be used to flood
async function tooMany(coll: string, phone: string) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db().select('id', { count: 'exact', head: true }).eq('coll', coll).eq('data->>phoneHash', await sha(phone)).gte('data->>created', since);
  return (count || 0) >= 4;
}

// ---------- export ----------
async function exportSite(site: string) {
  if (!SITES.includes(site)) return json({ error: 'site?' }, 400);
  const [{ data: L }, { data: R }, { data: K }] = await Promise.all([
    db().select('data').eq('coll', 'dir_lawyer').limit(5000),
    db().select('data').eq('coll', 'dir_review').eq('data->>status', 'live').limit(20000),
    db().select('data').eq('coll', 'dir_rank').limit(500),
  ]);
  const byLawyer: Record<string, Any[]> = {};
  for (const r of (R || []).map((x: Any) => x.data)) (byLawyer[r.lawyerId] ||= []).push({ stars: r.stars, text: r.text, name: r.name, area: r.area, created: r.created });
  const lawyers = (L || []).map((x: Any) => x.data)
    .filter((l: Any) => l && l.status === 'live' && (!Array.isArray(l.sites) || !l.sites.length || l.sites.includes(site)))
    .filter((l: Any) => site !== 'blihovot' || (l.areas || []).some((a: string) => DEBT_AREAS.includes(a)))
    .map((l: Any) => {
      const reviews = (byLawyer[l.id] || []).sort((a, b) => String(b.created).localeCompare(String(a.created)));
      const avg = reviews.length ? Math.round(reviews.reduce((t, r) => t + Number(r.stars || 0), 0) / reviews.length * 10) / 10 : 0;
      const out: Any = {
        id: l.id, name: l.name, firm: l.firm, title: l.title || 'עו"ד', cities: l.cities || [], regions: l.regions || [],
        areas: site === 'blihovot' ? (l.areas || []).filter((a: string) => DEBT_AREAS.includes(a)) : (l.areas || []),
        phone: l.phone, whatsapp: l.whatsapp, email: l.email, site: l.site, address: l.address, about: l.about,
        licenseYear: l.licenseYear, languages: l.languages || [], photo: l.photo, source: l.source || 'public', sourceUrl: l.sourceUrl,
        verified: !!l.verified, plan: l.plan || 'free', planUntil: l.planUntil, featured: l.featured || { areas: [], cities: [] },
        recognitions: l.recognitions || [], responseRate: l.responseRate, sites: l.sites, status: 'live',
        reviews, reviewCount: reviews.length, avg, updated: l.updated || l.created,
      };
      for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === null || out[k] === '') delete out[k];
      return out;
    });
  const ranks = (K || []).map((x: Any) => x.data).filter((r: Any) => r && r.year && r.area && Array.isArray(r.list));
  return new Response(JSON.stringify({ at: now(), site, lawyers, ranks }), { headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

// ---------- public forms ----------
async function lead(b: Any) {
  const site = SITES.includes(b.site) ? b.site : 'folivus';
  const phone = digits(b.phone); const name = s(b.name, 80);
  if (!name || phone.length < 9) return json({ ok: false, error: 'missing' }, 400);
  if (await tooMany('dir_lead', phone)) return json({ ok: true });
  const lawyerId = s(b.lawyerId, 80).replace(/[^a-z0-9-]/g, '');
  const law = lawyerId ? await getDoc('dir_lawyer', lawyerId) : null;
  const id = uid('dl');
  const row = { id, site, lawyerId: law ? lawyerId : null, area: s(b.area, 60), city: s(b.city, 60), name, phone: s(b.phone, 30), phoneHash: await sha(phone),
    message: ml(b.message, 2000), page: s(b.page, 200), created: now(), sentTo: 'site-list', status: 'new' };
  await insert('dir_lead', id, row);
  await tg(`📥 פנייה חדשה ב${SITE_HE[site]}\n${name} · ${row.phone}\n${row.area ? 'תחום: ' + row.area + '\n' : ''}${row.city ? 'עיר: ' + row.city + '\n' : ''}${law ? 'לעורך הדין: ' + law.name + (law.plan && law.plan !== 'free' ? ' (מנוי)' : ' (פרופיל לא בתשלום, הפנייה נשמרה ברשימת האתר)') + '\n' : ''}${row.message ? '\n' + row.message.slice(0, 600) : ''}`);
  return json({ ok: true, id });
}

async function request(kind: string, b: Any) {
  const site = SITES.includes(b.site) ? b.site : 'folivus';
  const phone = digits(b.phone); const name = s(b.name, 80);
  if (!name || phone.length < 9) return json({ ok: false, error: 'missing' }, 400);
  if (await tooMany('dir_req', phone)) return json({ ok: true });
  const lawyerId = s(b.lawyerId, 80).replace(/[^a-z0-9-]/g, '');
  const law = lawyerId ? await getDoc('dir_lawyer', lawyerId) : null;
  const id = uid('dq'), t = tok();
  const data: Any = { name, phone: s(b.phone, 30), email: s(b.email, 120), firm: s(b.firm, 120), site: s(b.site_url || b.siteUrl || '', 200),
    areas: arr(b.area || b.areas), cities: arr(b.city || b.cities), licenseYear: Number(b.licenseYear) || null, plan: s(b.plan, 20),
    message: ml(b.message, 1500), sub: s(b.kind, 20), page: s(b.page, 200) };
  if (kind === 'join' && typeof b.site === 'string' && !SITES.includes(b.site)) data.site = s(b.site, 200);
  let review: Any = null;
  if (kind === 'review') {
    const stars = Math.max(1, Math.min(5, Number(b.stars || b.star) || 0));
    if (!law || !stars) return json({ ok: false, error: 'missing' }, 400);
    const rid = uid('dr');
    review = { id: rid, lawyerId, stars, text: ml(b.text, 1500), name: name.split(/\s+/).slice(0, 1).join('') + (name.split(/\s+/)[1] ? ' ' + name.split(/\s+/)[1][0] + '.' : ''),
      area: s(b.area, 60), verified: false, phoneHash: await sha(phone), status: 'pending', created: now(), site };
    await insert('dir_review', rid, review);
    data.reviewId = rid; data.stars = stars; data.text = review.text;
  }
  await insert('dir_req', id, { id, kind, site, lawyerId: law ? lawyerId : null, data, phoneHash: await sha(phone), token: t, status: 'new', created: now() });
  const base = await approveBase();
  const link = (act: string) => `${base}#id=${id}&t=${t}&act=${act}`;
  const HE: Record<string, string> = { join: 'בקשת הצטרפות', claim: 'בקשה לקבל פרופיל', remove: data.sub === 'update' ? 'בקשת עדכון פרטים' : 'בקשת הסרה', review: 'חוות דעת חדשה' };
  const lines = [`🗂 ${HE[kind]} ב${SITE_HE[site]}`, `${name} · ${data.phone}${data.email ? ' · ' + data.email : ''}`];
  if (law) lines.push('פרופיל: ' + law.name);
  if (kind === 'review') lines.push(`${'★'.repeat(data.stars)} ${data.text.slice(0, 500)}`, 'כדאי להתקשר ולוודא שזה לקוח אמיתי לפני האישור.');
  if (kind === 'join') lines.push(`תחומים: ${data.areas.join(', ') || '-'} · ערים: ${data.cities.join(', ') || '-'}${data.plan ? ' · חבילה: ' + data.plan : ''}`);
  if (kind === 'claim') lines.push('לפני האישור: לוודא בטלפון של המשרד שמי שפנה הוא עורך הדין.');
  if (data.message) lines.push(data.message.slice(0, 500));
  await tg(lines.join('\n'), [[{ text: '✅ לאשר', url: link('ok') }, { text: '✗ לדחות', url: link('no') }]]);
  return json({ ok: true, id });
}

// ---------- approval (from <site>/ishur/) ----------
const slug = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
async function decide(b: Any) {
  const id = s(b.id, 40).replace(/[^a-z0-9-]/g, ''), t = s(b.t, 64).replace(/[^a-f0-9]/g, ''), act = b.act === 'ok' ? 'ok' : 'no';
  const q = id ? await getDoc('dir_req', id) : null;
  if (!q || !t || q.token !== t) return json({ ok: false, msg: 'הקישור לא תקין או שפג תוקפו.' }, 404);
  if (q.status !== 'new') return json({ ok: true, msg: 'הבקשה כבר טופלה (' + (q.status === 'approved' ? 'אושרה' : 'נדחתה') + ').' });
  const d = q.data || {};
  let msg = 'נדחה. לא שינינו כלום באתר.';
  if (act === 'ok') {
    if (q.kind === 'review' && d.reviewId) { await merge('dir_review', d.reviewId, { status: 'live', verified: true, verifiedBy: 'phone-call', approvedAt: now() }); msg = 'חוות הדעת אושרה ותופיע בבנייה הבאה של האתר.'; }
    if (q.kind === 'claim' && q.lawyerId) { await merge('dir_lawyer', q.lawyerId, { verified: true, source: 'claimed', claim: { name: d.name, phone: d.phone, email: d.email, at: now() }, updated: now() }); msg = 'הפרופיל סומן כמאומת ושויך למשרד.'; }
    if (q.kind === 'remove' && q.lawyerId) {
      if (d.sub === 'update') { msg = 'סומן כמאושר. את השינויים עצמם צריך להכניס לפרופיל לפי מה שכתבו בהערות.'; }
      else { await merge('dir_lawyer', q.lawyerId, { status: 'removed', removedAt: now(), removedBy: 'request ' + id }); msg = 'הפרופיל הוסר ויירד מהאתר בבנייה הבאה.'; }
    }
    if (q.kind === 'join') {
      let lid = slug(d.firm || '') || ('law-' + id.slice(3));
      if (!/^[a-z0-9-]{3,}$/.test(lid) || await getDoc('dir_lawyer', lid)) lid = 'law-' + id.slice(3);
      await insert('dir_lawyer', lid, { id: lid, name: d.name, firm: d.firm || undefined, title: 'עו"ד', cities: d.cities || [], areas: d.areas || [], phone: d.phone,
        email: d.email || undefined, site: d.site || undefined, licenseYear: d.licenseYear || undefined, languages: [], source: 'self', verified: true,
        plan: 'free', requestedPlan: d.plan || undefined, featured: { areas: [], cities: [] }, sites: q.site === 'blihovot' ? ['blihovot', 'folivus'] : ['folivus'],
        status: 'live', created: now(), updated: now(), fromReq: id });
      msg = 'עורך הדין נוסף לאתר (חבילה בסיסית). יופיע בבנייה הבאה של האתר.';
    }
  } else if (q.kind === 'review' && d.reviewId) await merge('dir_review', d.reviewId, { status: 'rejected', rejectedAt: now() });
  await merge('dir_req', id, { status: act === 'ok' ? 'approved' : 'rejected', decidedAt: now() });
  return json({ ok: true, msg });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url); const a = url.searchParams.get('a') || '';
  try {
    if (a === 'export') return await exportSite(url.searchParams.get('site') || 'folivus');
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    const b = await req.json().catch(() => ({}));
    if (b && b.website) return json({ ok: true });   // bot trap field
    if (a === 'lead') return await lead(b);
    if (a === 'otp') return json({ ok: true, skip: true });
    if (['review', 'join', 'claim', 'remove'].includes(a)) return await request(a, b);
    if (a === 'decide') return await decide(b);
    return json({ error: 'a?' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, error: 'server' }, 500); }
});
