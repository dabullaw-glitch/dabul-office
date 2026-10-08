// Finished reels: Yakir approves each one in Telegram, it gets a publish slot, and the scheduled task hands it to Grok Bot
// (Facebook + YouTube). Instagram and TikTok go out through the office system from the shared publishing calendar.
// Cron (x-cron-secret): POST ?step=add {reels:[{driveId,name,link,folder,captions:{facebook,youtubeTitle,youtubeDesc,youtubeTags,instagram,tiktok}}]}
//                       POST ?step=handed {id, grokFile}   (the task copied the reel to the Grok Bot folder)
//                       POST ?step=remind {}               (sends again every reel still waiting for Yakir, with its buttons)
// Public (opened from the Telegram buttons through the office site, portal.html#v=<a>&t=<token>): ?a=ok | no
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const tok = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const self = () => `${env('SUPABASE_URL')}/functions/v1/reels`;
const pub = (a: string, t: string) => `https://dabullaw-glitch.github.io/dabul-office/portal.html#v=${a}&t=${t}`;
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const FORMJS = `<script>document.addEventListener('submit',function(e){var f=e.target;e.preventDefault();var b=f.querySelector('button');if(b){b.disabled=true;b.textContent='רגע...';}fetch(f.getAttribute('action'),{method:'POST'}).then(function(r){return r.text();}).then(function(t){document.open();document.write(t);document.close();});});</script>`;
function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#ecedf2;font-family:Assistant,Arial,sans-serif;color:#1f2937;line-height:1.7}main{max-width:560px;margin:40px auto;padding:32px 24px;background:#fff;border:1px solid #e2e0da;border-radius:14px}
.top{color:#fff;background:#141414;margin:-32px -24px 22px;padding:16px 24px;border-radius:14px 14px 0 0;border-bottom:3px solid #e4d19c;font-weight:700}h1{color:#141414;font-size:1.5rem;margin:0 0 12px}
button{background:#e4d19c;color:#141414;border:0;border-radius:10px;padding:14px 22px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit}</style></head>
<body><main><div class="top">יקיר דבול - משרד עורכי דין</div><h1>${esc(title)}</h1>${body}</main>${FORMJS}</body></html>`, { status, headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
}
async function tg(text: string, buttons?: Any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}
// Israel local time parts for a UTC instant
const il = (d: Date) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value])); return p; };
const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
// the next free publishing slot (default: Sunday, Tuesday, Thursday at 19:00 Israel time), at least 3 hours from now
async function nextSlot(): Promise<string> {
  const cfg = (await getDoc('settings', 'social')) || {};
  const days: number[] = cfg.videoSlots?.days || [0, 2, 4]; const hm: string = cfg.videoSlots?.time || '19:00';
  const { data } = await db().select('data').eq('coll', 'reel').in('data->>status', ['approved', 'handed', 'published']);
  const taken = new Set((data || []).map((r: Any) => String(r.data.publishAt || '').slice(0, 16)));
  const start = Date.now() + 3 * 3600e3;
  // walk hour by hour for up to two years (8.10.2026: it stopped at 60 days, and when every weekly slot in that
  // window was taken all approved reels got "now + 3 hours", the same day and hour)
  for (let h = 0; h < 24 * 730; h++) {
    const d = new Date(Math.ceil(start / 3600e3) * 3600e3 + h * 3600e3); const p = il(d);
    if (!days.map(Number).includes(wd[p.weekday])) continue;
    if (`${p.hour}:00` !== hm.slice(0, 3) + '00' && `${p.hour}:${p.minute}` !== hm) continue;
    const iso = d.toISOString().slice(0, 16); if (taken.has(iso)) continue;
    return d.toISOString();
  }
  // never fall back to one shared time: one week after the last taken slot
  const last = [...taken].sort().pop();
  return new Date((last ? Date.parse(last + ':00Z') : start) + 7 * 24 * 3600e3).toISOString();
}
const when = (iso: string) => { const p = il(new Date(iso)); return `יום ${DAYS[wd[p.weekday]]} ${p.day}.${p.month} בשעה ${p.hour}:${p.minute}`; };
const askButtons = (link: string, t: string) => [[{ text: '👁 צפייה בסרטון', url: link || 'https://drive.google.com' }], [{ text: '✅ מאשר, לפרסם', url: pub('ok', t) }, { text: '✗ לא לפרסם', url: pub('no', t) }]];
const askText = (name: string, reminder = false) => `${reminder ? '⏳ תזכורת: רילס מחכה לאישור שלך' : '🎬 רילס חדש מוכן לאישור'}: ${name}\n\nלוחצים "צפייה בסרטון", ואז "מאשר, לפרסם" או "לא לפרסם".\nאחרי אישור הוא מתוזמן לבד: גרוק בוט מפרסם בפייסבוק וביוטיוב, ומערכת המשרד באינסטגרם ובטיקטוק לפי לוח הפרסום.`;

async function add(b: Any) {
  const out: Any[] = [];
  for (const r of (b.reels || []).slice(0, 30)) {
    const driveId = String(r.driveId || '').replace(/[^A-Za-z0-9_-]/g, ''); if (!driveId) continue;
    const id = 'rl-' + driveId; const prev = await getDoc('reel', id);
    if (prev) { out.push({ id, skipped: prev.status }); continue; }
    const c = r.captions || {}; const t = tok();
    await db().upsert({ coll: 'reel', id, data: { driveId, name: String(r.name || ''), link: String(r.link || ''), folder: String(r.folder || ''), captions: c, status: 'awaiting', tok: t, created: new Date().toISOString(), asked: new Date().toISOString() }, updated_at: new Date().toISOString() });
    await tg(askText(String(r.name || '')), askButtons(String(r.link || ''), t));
    out.push({ id, added: true });
  }
  return { ok: true, out };
}
// send again every reel that is still waiting (once a day at most per reel unless forced)
async function remind(b: Any) {
  const { data } = await db().select('id,data').eq('coll', 'reel').eq('data->>status', 'awaiting');
  const out: Any[] = [];
  for (const row of data || []) {
    const r = row.data; const last = Date.parse(r.reminded || r.asked || r.created || 0);
    if (!b.force && Date.now() - last < 20 * 3600e3) { out.push({ id: row.id, skipped: 'recent' }); continue; }
    await tg(askText(String(r.name || ''), true), askButtons(String(r.link || ''), String(r.tok)));
    await merge('reel', row.id, { reminded: new Date().toISOString() });
    out.push({ id: row.id, reminded: true });
  }
  return { ok: true, out };
}
async function byTok(t: string) { if (!/^[a-f0-9]{40}$/.test(t)) return null; const { data } = await db().select('id,data').eq('coll', 'reel').eq('data->>tok', t).limit(1); return data && data[0]; }
async function act(req: Request, a: string, t: string) {
  const row = await byTok(t); if (!row) return page('הקישור לא תקף', '<p>הסרטון לא נמצא.</p>', 404);
  const r = row.data, name = esc(r.name);
  if (['approved', 'handed', 'published'].includes(r.status)) return page('כבר אושר', `<p>${name} מתוזמן ל${esc(when(r.publishAt))}.</p>`);
  if (r.status === 'rejected' && a === 'no') return page('לא יפורסם', `<p>${name} לא יפורסם.</p>`);
  if (req.method !== 'POST') return page(a === 'ok' ? 'אישור פרסום' : 'לא לפרסם?', `<p>${name}</p><p>${a === 'ok' ? 'הסרטון יתוזמן לפרסום בתזמון הפנוי הבא: פייסבוק ויוטיוב דרך גרוק בוט, ואינסטגרם וטיקטוק דרך מערכת המשרד.' : 'הסרטון לא יפורסם.'}</p><form method="post" action="${self()}?a=${a}&t=${t}"><button type="submit">${a === 'ok' ? '✅ מאשר, לפרסם' : '✗ לא לפרסם'}</button></form>`);
  if (a === 'no') { await merge('reel', row.id, { status: 'rejected', rejectedAt: new Date().toISOString() }); return page('לא יפורסם', `<p>${name} לא יפורסם.</p>`); }
  const at = await nextSlot();
  await merge('reel', row.id, { status: 'approved', approvedAt: new Date().toISOString(), publishAt: at });
  await tg(`✅ אישרת את ${r.name}. הוא יפורסם ב${when(at)}: בפייסבוק וביוטיוב דרך גרוק בוט, ובאינסטגרם ובטיקטוק דרך מערכת המשרד.`);
  return page('אושר', `<p>${name} יפורסם ב${esc(when(at))}.</p><p>פייסבוק ויוטיוב דרך גרוק בוט, אינסטגרם וטיקטוק דרך מערכת המשרד. אין צורך לעשות שום דבר נוסף.</p>`);
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url); const a = url.searchParams.get('a') || '', t = (url.searchParams.get('t') || '').replace(/[^a-f0-9]/g, '');
  try {
    if (a === 'ok' || a === 'no') return await act(req, a, t);
    const step = url.searchParams.get('step');
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    const b = await req.json().catch(() => ({}));
    if (step === 'add') return json(await add(b));
    if (step === 'remind') return json(await remind(b));
    if (step === 'handed') { await merge('reel', String(b.id), { status: 'handed', handedAt: new Date().toISOString(), grokFile: b.grokFile || '' }); return json({ ok: true }); }
    if (step === 'slot') return json({ at: await nextSlot() });
    return json({ error: 'step?' }, 400);
  } catch (e) { console.error(e); return a ? page('משהו השתבש', '<p>נסו שוב בעוד דקה.</p>', 500) : json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
