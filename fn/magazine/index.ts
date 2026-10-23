// magazine (23.10.2026): the weekly "מגזין הנדל״ן" of Yakir's office, after he approves each issue.
// Yakir approved: Thursday a single WhatsApp message to the office group (the PDF + the week's main points + a link to
// https://dabullaw.co.il/magazine/), Friday a carousel on Facebook, Instagram and LinkedIn, and the site page updated.
// Nothing goes out before Yakir taps "מאשר" in the office Telegram bot.
// Data: docs coll "magazine", id "issue-NNN": {no, dates, title, pdf, cover, slides[], waText, social, pageBody (url of a
//   JSON {content}), waAt, siteAt ("YYYY-MM-DDTHH:MM", Israel time), token, state: draft|approved|done, sent:{}}
// POST (x-cron-secret) {action:'request', id}  -> Telegram to Yakir: cover, main points, buttons (approve, open the PDF)
// GET  ?a=ok&id=issue-NNN&t=TOKEN               -> approves: state=approved + the Friday carousel row in the content calendar
// POST (x-cron-secret) {action:'tick'}          -> cron: Thursday WhatsApp, Friday site page (the carousel goes out via postoria)
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PAGE_ID = 7776;
const merge = (id: string, patch: unknown) => admin().rpc('docs_merge', { p_coll: 'magazine', p_id: id, p_patch: patch });
const tg = (m: string, body: Record<string, unknown>) => fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), ...body }) }).then(r => r.json()).catch(() => null);
function ilToMs(at: string) {
  const guess = Date.parse(at + ':00Z');
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3;
}
// Supabase serves HTML from functions as plain text, so the approval answer is a small page on the office GitHub site
const page = (state: 'ok' | 'already' | 'bad', no = 0) => Response.redirect(`https://dabullaw-glitch.github.io/dabul-office/media/magazine/ok.html?s=${state}&n=${no}`, 302);

async function getIssue(id: string) {
  const { data } = await admin().from('docs').select('data').match({ coll: 'magazine', id }).maybeSingle();
  return data ? data.data : null;
}

async function request(id: string) {
  const x = await getIssue(id); if (!x) return { ok: false, error: 'no issue' };
  const base = `${env('SUPABASE_URL')}/functions/v1/magazine`;
  const okUrl = `${base}?a=ok&id=${encodeURIComponent(id)}&t=${encodeURIComponent(x.token)}`;
  const caption = `📰 מגזין הנדל״ן, גיליון #${x.no} (${x.dates}) מוכן לאישור.\n\n${String(x.waText || '').slice(0, 700)}\n\nאחרי האישור: ביום חמישי הודעה אחת לקבוצת הוואטסאפ, וביום שישי קרוסלה בפייסבוק, באינסטגרם ובלינקדאין ועדכון העמוד באתר.`;
  const kb = { inline_keyboard: [[{ text: '✅ מאשר את הגיליון', url: okUrl }], [{ text: '📄 צפייה במגזין המלא', url: x.pdf }]] };
  const r = await tg('sendPhoto', { photo: x.cover, caption: caption.slice(0, 1020), reply_markup: kb });
  if (!r || !r.ok) await tg('sendMessage', { text: caption.slice(0, 3900), reply_markup: kb, disable_web_page_preview: true });
  await merge(id, { requestedAt: new Date().toISOString() });
  return { ok: true };
}

async function approve(id: string, t: string) {
  const x = await getIssue(id);
  if (!x || !x.token || t !== x.token) return page('bad');
  if (x.state === 'approved' || x.state === 'done') return page('already', x.no);
  const now = new Date().toISOString();
  // the Friday carousel joins the content calendar; postoria publishes it at its time
  const at = String(x.siteAt);
  await admin().from('docs').upsert({ coll: 'pub', id: `pub-magazine-${x.no}`, data: { at, kind: 'carousel', owner: 'office', status: 'planned', title: `מגזין הנדל״ן #${x.no}`, text: x.social || '', media: x.slides || [], channels: ['facebook', 'instagram', 'linkedin'], series: 'magazine', created: now }, updated_at: now }, { onConflict: 'coll,id' });
  await merge(id, { state: 'approved', approvedAt: now });
  await tg('sendMessage', { text: `✅ גיליון #${x.no} אושר. חמישי: קבוצת הוואטסאפ. שישי: הרשתות והאתר.` });
  return page('ok', x.no);
}

async function sendWa(x: any) {
  const url = `${(env('GREEN_API_URL') || 'https://api.green-api.com').replace(/\/$/, '')}/waInstance${env('GREEN_API_INSTANCE')}/sendFileByUrl/${env('GREEN_API_TOKEN')}`;
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chatId: env('WA_GROUP_ID'), urlFile: x.pdf, fileName: `מגזין-הנדלן-גיליון-${x.no}.pdf`, caption: x.waText }) });
  const j: any = await r.json().catch(() => ({}));
  return r.ok && j.idMessage ? { ok: true, id: j.idMessage } : { ok: false, error: `green ${r.status} ${JSON.stringify(j).slice(0, 160)}` };
}

async function updateSite(x: any) {
  const b: any = await fetch(x.pageBody).then(r => r.json()).catch(() => null);
  if (!b || !b.content) return { ok: false, error: 'page body missing' };
  const auth = 'Basic ' + btoa(env('WP_USER') + ':' + env('WP_APP_PASSWORD').replace(/ /g, ''));
  const r = await fetch(`https://dabullaw.co.il/wp-json/wp/v2/pages/${PAGE_ID}`, { method: 'POST', headers: { authorization: auth, 'user-agent': UA, 'content-type': 'application/json' }, body: JSON.stringify({ content: b.content }) });
  if (!r.ok) return { ok: false, error: `wp ${r.status}` };
  await fetch('https://dabullaw.co.il/wp-json/dabul/v1/rocketopt', { method: 'POST', headers: { authorization: auth, 'user-agent': UA, 'content-type': 'application/json' }, body: JSON.stringify({ purge: 1 }) }).catch(() => null);
  return { ok: true };
}

async function tick() {
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'magazine').eq('data->>state', 'approved');
  const now = Date.now(), log: string[] = [];
  for (const r of data || []) {
    const x = r.data, sent = { ...(x.sent || {}) };
    if (!sent.wa && x.waAt && now >= ilToMs(x.waAt) && now - ilToMs(x.waAt) < 6 * 3600e3) {
      const s = await sendWa(x); sent.wa = s.ok ? { at: new Date().toISOString(), id: s.id } : null; log.push(`${r.id} wa ${JSON.stringify(s)}`);
      if (!s.ok) { await tg('sendMessage', { text: `⚠️ מגזין הנדל״ן #${x.no}: השליחה לקבוצת הוואטסאפ נכשלה, אנסה שוב בעוד 10 דקות.` }); }
      else await tg('sendMessage', { text: `✅ מגזין הנדל״ן #${x.no} נשלח לקבוצת הוואטסאפ.` });
    }
    if (!sent.site && x.siteAt && now >= ilToMs(x.siteAt)) {
      const s = await updateSite(x); sent.site = s.ok ? { at: new Date().toISOString() } : null; log.push(`${r.id} site ${JSON.stringify(s)}`);
      if (s.ok) await tg('sendMessage', { text: `✅ מגזין הנדל״ן #${x.no} עלה לאתר: https://dabullaw.co.il/magazine/`, disable_web_page_preview: true });
    }
    const done = sent.wa && sent.site;
    await merge(r.id, { sent, ...(done ? { state: 'done', doneAt: new Date().toISOString() } : {}) });
  }
  return { ok: true, log };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const u = new URL(req.url);
  if (req.method === 'GET' && u.searchParams.get('a') === 'ok') return await approve(String(u.searchParams.get('id') || ''), String(u.searchParams.get('t') || ''));
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ ok: false }, 401);
  const b: any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'request') return json(await request(String(b.id || '')));
    if (b.action === 'tick') return json(await tick());
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) { return json({ ok: false, error: String(e) }, 500); }
});
