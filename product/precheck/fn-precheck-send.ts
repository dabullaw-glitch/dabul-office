// precheck (11.10.2026): sends the written answer of "בדיקת דירה לפני קנייה" from the office system to the client.
// Orders and payment of the service go through the "services" function (docs svc/<id> and chk/<id>); this function
// only does the last step:
//  POST {action:'send', id} with the office user's sign-in -> emails the full answer with 30-day links to the files
import { createClient } from 'npm:@supabase/supabase-js@2';
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';

const TOPICS: [string, string][] = [
  ['tabu', 'נסח טאבו: בעלות, משכנתאות, עיקולים והערות'], ['condo', 'בית משותף: הצמדות (חניה, מחסן, גג, חצר)'],
  ['permit', 'תיק בניין והיתרים'], ['violations', 'חשד לחריגות בנייה'], ['planning', 'מידע תכנוני והתחדשות עירונית'],
  ['tax', 'הערכת מס רכישה'], ['questions', 'שאלות למוכר ולמתווך, ומה לבקש לפני חתימה'],
];
const MARK: Record<string, [string, string]> = { ok: ['תקין', '#1e7a3c'], note: ['שימו לב', '#a86a06'], risk: ['בעיה', '#c13b2e'], na: ['לא נבדק', '#8a8f98'] };
const DOCS: Record<string, string> = { tabu: 'נסח טאבו', tzav: 'צו בית משותף', takanon: 'תקנון', tashrit: 'תשריט', permit: 'היתר בנייה', tik: 'תיק בניין', plan: 'מידע תכנוני', other: 'מסמך נוסף' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
// deno-lint-ignore no-explicit-any
const get = async (coll: string, id: string): Promise<any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };

async function mail(to: string, subject: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('NL_FROM') || 'יקיר דבול - משרד עורכי דין <office@dabullaw.co.il>', to: [to], reply_to: 'office@dabullaw.co.il', subject, html }) });
  // deno-lint-ignore no-explicit-any
  const d: any = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d.message || r.status };
}
async function office(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const u = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: me } = await u.auth.getUser(); if (!me?.user) return false;
  const { data: ok, error } = await u.rpc('is_office_user'); return !error && ok === true;
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
  if (!(await office(req))) return json({ error: 'צריך להתחבר למערכת המשרד' }, 401);
  const o = await get('chk', id); if (!o) return json({ error: 'ההזמנה לא נמצאה' }, 404);
  if (!o.email || !o.summary) return json({ error: 'חסר מייל או סיכום' }, 400);
  const links: { kind: string; url: string }[] = [];
  for (const f of o.files || []) { const { data } = await admin().storage.from('files').createSignedUrl(f.path, 30 * 86400, { download: f.name }); if (data?.signedUrl) links.push({ kind: f.kind, url: data.signedUrl }); }
  const r = await mail(o.email, 'בדיקת הדירה שלכם מוכנה', answerHtml(o, links));
  if (!r.ok) return json({ error: 'המייל לא נשלח: ' + r.error }, 502);
  await merge('chk', id, { status: 'sent', sentAt: new Date().toISOString(), mailId: r.id, sentCount: (o.sentCount || 0) + 1 });
  // the same order in "הזמנות אונליין" (docs svc/<id>) becomes done, with a line in its history
  const sv = await get('svc', id);
  if (sv) await merge('svc', id, { status: 'done', log: (sv.log || []).concat([{ at: new Date().toISOString(), kind: 'mail', text: 'התשובה המלאה של בדיקת הדירה נשלחה ללקוח' }]) });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  try {
    // deno-lint-ignore no-explicit-any
    const b: any = await req.json().catch(() => ({}));
    if (b.action === 'send') return await send(req, String(b.id || ''));
    return json({ error: 'action?' }, 400);
  } catch (e) { console.error(e); return json({ error: String((e as Error).message || e) }, 500); }
});
