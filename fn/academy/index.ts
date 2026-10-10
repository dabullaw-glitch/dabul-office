// Courses site backend (no AI). Public:
//   GET  ?a=buy&c=<course>            -> { url } payment page for the course (empty until a payment provider is set)
//   GET  ?a=course&c=<course>&t=<tok>&d=<device> -> the course with all lessons for a buyer; &preview=1 -> lesson 1 open, the rest locked
//   POST ?a=code {t,c}                -> emails the buyer a 6-digit code to open the course on a new device
//   POST ?a=verify {t,c,code}         -> checks the code and returns a device key { d } (up to MAXDEV devices per buyer)
//   POST ?a=resend {email}            -> emails the personal link again (always the same answer, to not reveal who bought)
//   POST ?a=done {t,d,c,n}            -> marks a lesson as finished
//   POST ?a=paid&k=<ACADEMY_HOOK_KEY>&c=<course>  -> payment provider notice: opens access and emails the personal link
// Cron (x-cron-secret): ?step=grant {email,name,c} -> gives access by hand (tests, gifts, a payment the provider missed)
//                       ?step=resetdev {email,c}   -> clears the buyer's devices (a buyer who changed phone and computer)
// Anti-sharing (Yakir, 10.10.2026: "שיהיה לו כניסה רק אליו אבל שלא יוכל להעביר את זה לכולם"):
//   the personal link alone is not enough. The first device that opens it is remembered; any other device needs a code
//   that is sent to the buyer's own email, and a buyer can have at most MAXDEV devices. The course shows the buyer's name.
import { loadSecrets, json, cors, admin, env } from './common.ts';

// deno-lint-ignore no-explicit-any
type Any = any;
const SITE = 'https://dabullaw-glitch.github.io/dabul-office/portal.html';
const MAXDEV = 3;
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const doc = async (coll: string, id: string): Promise<Any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) && e.length < 160;
const hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const course = (c: string) => String(c || 'first-home').replace(/[^a-z0-9-]/g, '');
const clean = (t: unknown) => String(t || '').replace(/[^a-f0-9]/g, '').slice(0, 80);
const mask = (e: string) => { const [u, d] = String(e).split('@'); return u && d ? u.slice(0, 2) + '***@' + d : ''; };
const newKey = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');

async function tg(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }) }).catch(() => null);
}
async function mail(to: string, subject: string, html: string) {
  if (!env('RESEND_API_KEY') || !env('NL_FROM')) return false;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env('NL_FROM'), to: [to], subject, html }) });
  return r.ok;
}
const frame = (inner: string) => `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#ecedf2;font-family:Arial,sans-serif;color:#1c1b19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#161616;padding:22px 28px;color:#e4d19c;font-size:22px;font-weight:bold">הקורסים של עו״ד יקיר דבול</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.7;text-align:right">${inner}
<p style="margin:16px 0 0;font-size:13px;color:#8f8b82">הקורס מוסר מידע כללי בלבד ואינו ייעוץ משפטי. יקיר דבול, משרד עורכי דין, רזיאל 1 נתניה, 09-8613413.</p>
</td></tr></table></td></tr></table></body></html>`;
const linkMail = (name: string, title: string, url: string) => frame(`<p style="margin:0 0 12px">${name ? `שלום ${esc(name)},` : 'שלום,'}</p>
<p style="margin:0 0 18px">הקורס <b>${esc(title)}</b> פתוח עבורכם. זה הקישור האישי שלכם:</p>
<p style="margin:0 0 22px"><a href="${url}" style="display:inline-block;background:#e4d19c;color:#1a1a1a;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:6px">לכניסה לקורס</a></p>
<p style="margin:0 0 6px;font-size:14px;color:#66645f">הגישה אישית: הקורס נפתח בעד ${MAXDEV} מכשירים שלכם. כשנכנסים ממכשיר חדש, נשלח קוד למייל הזה. שמרו את המייל. אם הקישור יילך לאיבוד, אפשר לקבל אותו שוב בעמוד "כניסה לקורס שלי".</p>`);
const codeMail = (name: string, code: string) => frame(`<p style="margin:0 0 12px">${name ? `שלום ${esc(name)},` : 'שלום,'}</p>
<p style="margin:0 0 14px">ביקשתם לפתוח את הקורס במכשיר חדש. זה הקוד שלכם:</p>
<p style="margin:0 0 18px;font-size:34px;font-weight:bold;letter-spacing:8px;direction:ltr;text-align:center;background:#f7f1e3;border-radius:10px;padding:12px">${code}</p>
<p style="margin:0;font-size:14px;color:#66645f">הקוד בתוקף ל־15 דקות. אם לא אתם ביקשתם אותו, אפשר להתעלם מהמייל, והקורס נשאר סגור במכשיר האחר.</p>`);

async function grant(email: string, name: string, c: string, source: Any) {
  email = email.trim().toLowerCase();
  const id = `en-${c}-${(await hex(email)).slice(0, 16)}`;
  const prev = await doc('enroll', id);
  const t = prev?.token || crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  await merge('enroll', id, { course: c, email, name: name || prev?.name || '', token: t, status: 'active', created: prev?.created || new Date().toISOString(), payments: [...(prev?.payments || []), source].slice(-10) });
  const cdoc = await doc('course', c);
  const sent = await mail(email, `הקורס שלכם מוכן: ${cdoc?.title || ''}`, linkMail(name, cdoc?.title || '', `${SITE}#academy/learn&t=${t}`));
  await merge('enroll', id, { mailedAt: new Date().toISOString(), mailOk: sent });
  return { id, sent, isNew: !prev };
}
async function byToken(t: string, c: string): Promise<Any> {
  if (!t) return null;
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'enroll').eq('data->>token', t).eq('data->>status', 'active').limit(1);
  const r = data && data[0]; return r && (!c || r.data.course === c) ? r : null;
}
async function deviceOk(en: Any, d: string) {
  if (!d) return false; const h = await hex(d);
  return (en.data.devices || []).some((x: Any) => x.h === h);
}
async function addDevice(en: Any, ua: string) {
  const key = newKey(); const devs = (en.data.devices || []).slice();
  devs.push({ h: await hex(key), at: new Date().toISOString(), ua: String(ua || '').slice(0, 120) });
  await merge('enroll', en.id, { devices: devs });
  en.data.devices = devs;
  return key;
}

async function courseView(req: Request, c: string, t: string, d: string, preview: boolean) {
  const cd = await doc('course', c); if (!cd) return { ok: false };
  const en: Any = await byToken(t, c);
  if (!en && !preview) return { ok: false };
  let newDevice = '';
  if (en) {
    const devs = en.data.devices || [];
    if (!(await deviceOk(en, d))) {
      // the first device that opens the personal link is remembered without a code; every other device needs a code
      if (!devs.length) newDevice = await addDevice(en, req.headers.get('user-agent') || '');
      else return { ok: false, verify: true, mail: mask(en.data.email), limit: devs.length >= MAXDEV };
    }
  }
  const buyer = !!en;
  const lessons = (cd.lessons || []).map((l: Any) => {
    const open = buyer || l.free;
    return { n: l.n, title: l.title, minutes: l.minutes || 0, summary: l.summary || '', locked: !open, html: open ? l.html : '', video: open ? (l.video || '') : '', deck: open && l.deck ? { scenes: l.deck.scenes || [] } : null };
  });
  if (en) await merge('enroll', en.id, { lastSeen: new Date().toISOString(), visits: (Number(en.data.visits) || 0) + 1, firstSeen: en.data.firstSeen || new Date().toISOString() });
  return { ok: true, title: cd.title, lessons, done: en?.data?.done || [], buyer, owner: en ? (en.data.name || mask(en.data.email)) : '', newDevice: newDevice || undefined };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url); const a = url.searchParams.get('a'); const c = course(url.searchParams.get('c') || '');
  try {
    if (a === 'buy') { const cfg = (await doc('course', c))?.sale || {}; return json({ url: cfg.open && cfg.payUrl ? cfg.payUrl : '', price: cfg.price || null }); }
    if (a === 'course') return json(await courseView(req, c, clean(url.searchParams.get('t')), clean(url.searchParams.get('d')), url.searchParams.get('preview') === '1'));
    if (a === 'code' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const en = await byToken(clean(b.t), course(b.c || c));
      if (!en) return json({ ok: false, msg: 'הקישור הזה לא פעיל.' });
      if ((en.data.devices || []).length >= MAXDEV) return json({ ok: false, msg: `הקורס כבר פתוח ב־${MAXDEV} מכשירים. להחלפת מכשיר התקשרו: 09-8613413.` });
      const now = Date.now(); const recent = (en.data.codeTimes || []).filter((x: number) => now - x < 3600e3);
      if (recent.length >= 5) return json({ ok: false, msg: 'נשלחו כבר כמה קודים בשעה האחרונה. נסו שוב מאוחר יותר.' });
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
      await merge('enroll', en.id, { codeH: await hex(code + en.id), codeExp: now + 15 * 60e3, codeTries: 0, codeTimes: [...recent, now] });
      const sent = await mail(en.data.email, 'קוד כניסה לקורס', codeMail(en.data.name, code));
      return json(sent ? { ok: true } : { ok: false, msg: 'המייל לא נשלח. נסו שוב, או התקשרו: 09-8613413.' });
    }
    if (a === 'verify' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const en = await byToken(clean(b.t), course(b.c || c));
      if (!en) return json({ ok: false, msg: 'הקישור הזה לא פעיל.' });
      const x = en.data; const code = String(b.code || '').replace(/\D/g, '');
      if (!x.codeH || Date.now() > Number(x.codeExp || 0)) return json({ ok: false, msg: 'הקוד פג. בקשו קוד חדש.' });
      if (Number(x.codeTries || 0) >= 5) return json({ ok: false, msg: 'יותר מדי ניסיונות. בקשו קוד חדש.' });
      if ((await hex(code + en.id)) !== x.codeH) { await merge('enroll', en.id, { codeTries: Number(x.codeTries || 0) + 1 }); return json({ ok: false, msg: 'הקוד לא נכון. בדקו ונסו שוב.' }); }
      if ((x.devices || []).length >= MAXDEV) { await tg(`🔒 ניסיון לפתוח את הקורס במכשיר רביעי: ${x.name || x.email}. אם זה בסדר, אפשר לאפס מכשירים.`); return json({ ok: false, msg: `הקורס כבר פתוח ב־${MAXDEV} מכשירים. להחלפת מכשיר התקשרו: 09-8613413.` }); }
      await merge('enroll', en.id, { codeH: null, codeExp: null, codeTries: 0 });
      const d = await addDevice(en, req.headers.get('user-agent') || '');
      return json({ ok: true, d });
    }
    if (a === 'resend' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const email = String(b.email || '').trim().toLowerCase();
      if (okEmail(email)) {
        const { data } = await admin().from('docs').select('id,data').eq('coll', 'enroll').eq('data->>email', email).eq('data->>status', 'active').limit(5);
        for (const r of data || []) { const cd = await doc('course', r.data.course); await mail(email, `הקישור שלכם לקורס: ${cd?.title || ''}`, linkMail(r.data.name, cd?.title || '', `${SITE}#academy/learn&t=${r.data.token}`)); }
      }
      return json({ ok: true });
    }
    if (a === 'done' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const r = await byToken(clean(b.t), '');
      if (!r || !(await deviceOk(r, clean(b.d)))) return json({ ok: false });
      const done = [...new Set([...(r.data.done || []), Number(b.n)])].filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
      await merge('enroll', r.id, { done, doneAt: new Date().toISOString() });
      return json({ ok: true });
    }
    if (a === 'paid' && req.method === 'POST') {
      if (!env('ACADEMY_HOOK_KEY') || url.searchParams.get('k') !== env('ACADEMY_HOOK_KEY')) return json({ ok: false }, 401);
      const ct = req.headers.get('content-type') || ''; let b: Any = {};
      if (ct.includes('json')) b = await req.json().catch(() => ({})); else { const f = await req.formData().catch(() => null); if (f) f.forEach((v, k) => { b[k] = String(v); }); }
      const flat: Any = { ...b, ...(b.data || {}), ...(b.customer || {}), ...(b.payer || {}) };
      const email = String(flat.email || flat.payerEmail || flat.customer_email || flat.Email || flat.payer_email || '').trim();
      const name = String(flat.fullName || flat.full_name || flat.name || flat.payerFullName || flat.customer_name || '').trim().slice(0, 80);
      await merge('payhook', `ph-${Date.now()}`, { course: c, body: b, at: new Date().toISOString() });
      if (!okEmail(email)) { await tg(`⚠️ התקבל תשלום לקורס בלי מייל תקין. צריך לבדוק במערכת הסליקה ולתת גישה ידנית.`); return json({ ok: true }); }
      const g = await grant(email, name, c, { at: new Date().toISOString(), sum: flat.sum || flat.amount || flat.total || null, ref: flat.transactionId || flat.asmachta || flat.transaction_id || flat.id || null });
      await tg(`🎓 רכישה חדשה של הקורס: ${name || email}\n${g.sent ? 'הקישור האישי נשלח למייל.' : '⚠️ המייל עם הקישור לא נשלח, צריך לבדוק.'}`);
      return json({ ok: true });
    }
    const step = url.searchParams.get('step');
    if (step === 'grant' || step === 'resetdev') {
      if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
      const b = await req.json().catch(() => ({}));
      if (!okEmail(String(b.email || ''))) return json({ ok: false, error: 'email' }, 400);
      if (step === 'resetdev') {
        const id = `en-${course(b.c || 'first-home')}-${(await hex(String(b.email).trim().toLowerCase())).slice(0, 16)}`;
        if (!(await doc('enroll', id))) return json({ ok: false, error: 'not found' }, 404);
        await merge('enroll', id, { devices: [], devReset: new Date().toISOString() });
        return json({ ok: true });
      }
      return json({ ok: true, ...(await grant(String(b.email), String(b.name || ''), course(b.c || 'first-home'), { at: new Date().toISOString(), manual: true, note: b.note || '' })) });
    }
    return json({ error: 'a?' }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
