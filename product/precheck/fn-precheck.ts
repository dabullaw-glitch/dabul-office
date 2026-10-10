// precheck: the paid service "בדיקת דירה לפני קנייה" (and the course purchase, same payment flow).
// Written 10.10.2026, NOT deployed until Yakir approves. The card processor is still to be chosen: the only
// processor-specific parts are payLink() and the webhook parsing in paid(); everything else is ready.
//  POST ?step=order   (from the site page)  -> saves docs chk/<id> status 'pending', returns { payUrl }
//  POST ?step=buy     (from the course page) -> saves docs sale/<id> status 'pending', returns { payUrl }
//  POST ?step=paid    (the processor's server-to-server callback) -> marks paid, emails the client, Telegram to Yakir
//  POST {action:'send', id} (from the office system, signed in) -> emails the full answer with signed links to the files
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';

const SITE = 'https://dabullaw.co.il';
const PRICE = 490, VAT = 0.18, COURSE_PRICE = 390;
const TOPICS: [string, string][] = [
  ['tabu', 'נסח טאבו: בעלות, משכנתאות, עיקולים והערות'], ['condo', 'בית משותף: הצמדות (חניה, מחסן, גג, חצר)'],
  ['permit', 'תיק בניין והיתרים'], ['violations', 'חשד לחריגות בנייה'], ['planning', 'מידע תכנוני והתחדשות עירונית'],
  ['tax', 'הערכת מס רכישה'], ['questions', 'שאלות למוכר ולמתווך, ומה לבקש לפני חתימה'],
];
const MARK: Record<string, [string, string]> = { ok: ['תקין', '#1e7a3c'], note: ['שימו לב', '#a86a06'], risk: ['בעיה', '#c13b2e'], na: ['לא נבדק', '#8a8f98'] };
const DOCS: Record<string, string> = { tabu: 'נסח טאבו', tzav: 'צו בית משותף', takanon: 'תקנון', tashrit: 'תשריט', permit: 'היתר בנייה', tik: 'תיק בניין', plan: 'מידע תכנוני', other: 'מסמך נוסף' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const clip = (s: unknown, n = 400) => String(s ?? '').trim().slice(0, n);
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
// deno-lint-ignore no-explicit-any
const get = async (coll: string, id: string): Promise<any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };

async function tg(text: string) {
  const t = env('TELEGRAM_BOT_TOKEN'), c = env('TELEGRAM_CHAT_ID'); if (!t || !c) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: c, text: text.slice(0, 4000), disable_web_page_preview: true }) }).catch(() => null);
}
async function mail(to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('NL_FROM') || 'יקיר דבול - משרד עורכי דין <office@dabullaw.co.il>', to: [to], reply_to: 'office@dabullaw.co.il', subject, html }) });
  // deno-lint-ignore no-explicit-any
  const d: any = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d.message || r.status };
}
// 2 working days (Sunday to Thursday) after payment
function due(from: Date) { const d = new Date(from); let left = 2; while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 5 && w !== 6) left--; } return d; }

// ---- the card processor (to be chosen). Returns the hosted payment page for this order. ----
// deno-lint-ignore no-explicit-any
async function payLink(_kind: 'chk' | 'sale', _id: string, _amount: number, _o: any): Promise<string> {
  // TODO after Yakir chooses (Grow / Cardcom / other): create a payment page with the amount, the description,
  // the customer's name/email/phone, success URL (the page + #paid / #bought), and the callback URL ?step=paid&k=<kind>&id=<id>.
  return '';
}

// deno-lint-ignore no-explicit-any
async function order(b: any) {
  const o = { city: clip(b.city, 60), address: clip(b.address, 120), gush: clip(b.gush, 8).replace(/\D/g, ''), chelka: clip(b.chelka, 8).replace(/\D/g, ''), sub: clip(b.sub, 6).replace(/\D/g, ''),
    floor: clip(b.floor, 60), askPrice: clip(b.askPrice, 12).replace(/\D/g, ''), link: /^https?:\/\//.test(String(b.link || '')) ? clip(b.link, 500) : '',
    buyer: ['first', 'replace', 'extra', 'oleh', 'foreign'].includes(b.status) ? b.status : 'first', mortgage: b.mortgage === 'yes' ? 'yes' : b.mortgage === 'no' ? 'no' : '',
    worry: clip(b.worry, 1500), name: clip(b.name, 80), phone: clip(b.phone, 30), email: clip(b.email, 120).toLowerCase(), marketing: !!b.marketing, page: clip(b.page, 300) };
  if (!o.city || (!o.address && !(o.gush && o.chelka))) return json({ error: 'חסרה כתובת' }, 400);
  if (o.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email) || o.phone.replace(/\D/g, '').length < 9) return json({ error: 'חסרים פרטי קשר' }, 400);
  const id = 'chk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const amount = Math.round(PRICE * (1 + VAT) * 100) / 100;
  await merge('chk', id, Object.assign(o, { status: 'pending', amount, created: new Date().toISOString() }));
  const payUrl = await payLink('chk', id, amount, o);
  if (!payUrl) return json({ error: 'התשלום עוד לא מחובר' }, 503);
  return json({ ok: true, payUrl });
}

// deno-lint-ignore no-explicit-any
async function buy(b: any) {
  const o = { course: 'first-home', name: clip(b.name, 80), email: clip(b.email, 120).toLowerCase(), phone: clip(b.phone, 30), marketing: !!b.marketing, page: clip(b.page, 300) };
  if (o.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return json({ error: 'חסרים פרטים' }, 400);
  const id = 'sale-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await merge('sale', id, Object.assign(o, { status: 'pending', amount: COURSE_PRICE, created: new Date().toISOString() }));
  const payUrl = await payLink('sale', id, COURSE_PRICE, o);
  if (!payUrl) return json({ error: 'התשלום עוד לא מחובר' }, 503);
  return json({ ok: true, payUrl });
}

// the processor confirms a payment (it must be verified against the processor before anything is marked paid)
async function paid(kind: string, id: string, ref: string) {
  if (kind === 'chk') {
    const o = await get('chk', id); if (!o) return json({ error: 'no order' }, 404);
    if (o.status !== 'pending') return json({ ok: true, already: true });
    const now = new Date();
    await merge('chk', id, { status: 'paid', paidAt: now.toISOString(), due: due(now).toISOString(), payRef: ref });
    const dd = due(now).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'numeric' });
    await mail(o.email, 'קיבלנו את ההזמנה: בדיקת דירה לפני קנייה', `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1f2937;max-width:600px">
      <p>שלום ${esc(o.name.split(' ')[0])},</p><p>קיבלנו את ההזמנה והתשלום לבדיקת הדירה ב${esc([o.address, o.city].filter(Boolean).join(', '))}.</p>
      <p>התשובה המלאה תגיע למייל הזה עד <b>${esc(dd)}</b>. אם נצטרך פרט נוסף, נתקשר אליכם.</p>
      <p>שאלה? <a href="tel:098613413">09-8613413</a></p><p style="color:#6b7280;font-size:13px">יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה</p></div>`);
    await tg(`🏠 בדיקת דירה חדשה שולמה\n${o.name} · ${[o.address, o.city].filter(Boolean).join(', ')}${o.askPrice ? ' · ' + Number(o.askPrice).toLocaleString('he-IL') + ' ₪' : ''}\nלהחזיר תשובה עד ${dd}. במערכת: כספים > בדיקות דירה.`);
    return json({ ok: true });
  }
  if (kind === 'sale') {
    const o = await get('sale', id); if (!o) return json({ error: 'no sale' }, 404);
    if (o.status !== 'pending') return json({ ok: true, already: true });
    await merge('sale', id, { status: 'paid', paidAt: new Date().toISOString(), payRef: ref });
    // the personal course page is opened by the academy function (existing); here only the notice
    await tg(`🎓 רכישה חדשה של הקורס: ${o.name} (${o.email})`);
    return json({ ok: true });
  }
  return json({ error: 'kind?' }, 400);
}

// the full answer, from the office system
// deno-lint-ignore no-explicit-any
function answerHtml(o: any, links: { kind: string; url: string }[]) {
  const sec = o.sections || {};
  const block = ([k, title]: [string, string]) => { const v = sec[k] || {}; if (!v.text && !v.mark) return ''; const [lbl, c] = MARK[v.mark] || ['', '#8a8f98'];
    return `<tr><td style="padding:14px 0;border-top:1px solid #eee3cf"><div style="font-weight:800;color:#5c4528;font-size:16px">${esc(title)} ${lbl ? `<span style="display:inline-block;font-size:12px;color:#fff;background:${c};border-radius:99px;padding:1px 9px;margin-right:6px">${lbl}</span>` : ''}</div><div style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin-top:6px">${esc(v.text || '')}</div></td></tr>`; };
  const f = o.flags || {}; const rec = [f.appraiser && 'שמאי', f.inspector && 'בודק מבנה', f.engineer && 'מהנדס או אדריכל'].filter(Boolean);
  const where = [o.address, o.city].filter(Boolean).join(', ') + (o.gush ? ` · גוש ${o.gush} חלקה ${o.chelka}${o.sub ? ' תת ' + o.sub : ''}` : '');
  return `<div dir="rtl" style="background:#f7f4ee;padding:20px 10px;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e6dcc6" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 22px 8px">
    <div style="color:#8b6f47;font-weight:800;font-size:13px">יקיר דבול - משרד עורכי דין</div><h1 style="margin:6px 0 4px;font-size:22px;color:#5c4528">בדיקת הדירה שלכם מוכנה</h1>
    <div style="color:#6b7280;font-size:14px">${esc(where)}</div><p style="font-size:15px;line-height:1.7">שלום ${esc(String(o.name || '').split(' ')[0])}, בדקנו את המסמכים הרשמיים של הנכס. הנה מה שמצאנו, נושא אחרי נושא.</p></td></tr>
    ${o.summary ? `<tr><td style="padding:0 22px"><div style="background:#faf6ee;border-radius:12px;padding:14px"><div style="font-weight:800;color:#5c4528">בשורה התחתונה</div><div style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin-top:6px">${esc(o.summary)}</div>${rec.length ? `<div style="margin-top:8px;font-size:14px;color:#a86a06"><b>מומלץ להוסיף:</b> ${rec.join(', ')}. העלות שלהם לא כלולה בבדיקה.</div>` : ''}</div></td></tr>` : ''}
    <tr><td style="padding:0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${TOPICS.map(block).join('')}</table></td></tr>
    ${links.length ? `<tr><td style="padding:6px 22px"><div style="font-weight:800;color:#5c4528">המסמכים שהזמנו ובדקנו</div><ul style="margin:6px 0 0;padding-right:18px;font-size:15px">${links.map(l => `<li><a href="${esc(l.url)}" style="color:#8b6f47">${esc(DOCS[l.kind] || l.kind)}</a></li>`).join('')}</ul><div style="font-size:12.5px;color:#6b7280">הקישורים פעילים 30 יום. כדאי לשמור את הקבצים.</div></td></tr>` : ''}
    <tr><td style="padding:16px 22px"><div style="border:1px solid #e6dcc6;border-radius:12px;padding:12px 14px;font-size:15px;line-height:1.7">רוצים שנמשיך איתכם לעסקה? <b>490 ₪ ששילמתם מקוזזים משכר הטרחה</b> אם נחתם הסכם בתוך 90 יום.<br>טלפון: <a href="tel:098613413" style="color:#8b6f47;font-weight:800">09-8613413</a></div></td></tr>
    <tr><td style="padding:0 22px 20px;font-size:12px;color:#6b7280;line-height:1.6">הבדיקה מבוססת על המסמכים הרשמיים שהיו זמינים ועל המידע שמסרתם. היא אינה מחליפה שמאי, מהנדס או בודק מבנה, ואינה אישור לחתום על חוזה.<br>יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה</td></tr></table></div>`;
}
async function send(req: Request, id: string) {
  // only a signed-in office user may send
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await admin().auth.getUser(token); if (!u || !u.user) return json({ error: 'צריך להתחבר' }, 401);
  const { data: okUser } = await admin().rpc('is_office_user_id', { p_uid: u.user.id }).catch(() => ({ data: null }));
  if (okUser === false) return json({ error: 'אין הרשאה' }, 403);
  const o = await get('chk', id); if (!o) return json({ error: 'ההזמנה לא נמצאה' }, 404);
  if (!o.email || !o.summary) return json({ error: 'חסר מייל או סיכום' }, 400);
  const links: { kind: string; url: string }[] = [];
  for (const f of o.files || []) { const { data } = await admin().storage.from('files').createSignedUrl(f.path, 30 * 86400, { download: f.name }); if (data?.signedUrl) links.push({ kind: f.kind, url: data.signedUrl }); }
  const r = await mail(o.email, 'בדיקת הדירה שלכם מוכנה', answerHtml(o, links));
  if (!r.ok) return json({ error: 'המייל לא נשלח: ' + r.error }, 502);
  await merge('chk', id, { status: 'sent', sentAt: new Date().toISOString(), mailId: r.id, sentCount: (o.sentCount || 0) + 1 });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url); const step = url.searchParams.get('step') || '';
  try {
    // deno-lint-ignore no-explicit-any
    const b: any = await req.json().catch(() => ({}));
    if (step === 'order') return await order(b);
    if (step === 'buy') return await buy(b);
    if (step === 'paid') return json({ error: 'התשלום עוד לא מחובר' }, 503); // enabled with the processor's signature check
    if (b.action === 'send') return await send(req, String(b.id || ''));
    return json({ error: 'step?' }, 400);
  } catch (e) { console.error(e); return json({ error: String((e as Error).message || e) }, 500); }
});
// paid() is wired to step=paid once the processor's callback can be verified (signature / server lookup by ref).
export { paid };
