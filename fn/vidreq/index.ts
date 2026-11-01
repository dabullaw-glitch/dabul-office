// vidreq (1.11.2026, Yakir: "בקשת סרטון" in the office system, HeyGen instead of filming, every step with his approval).
// Requests live in docs coll "vidreq" (written by the office app addon-video.js / addon-upd.js and by the scheduled task
// "סרטוני הייגן"). The script of a request is a row in coll "prompt" (same list as the teleprompter), linked by promptId.
// Statuses: new, writing, script-wait, script-fix, heygen, editing, final-wait, approved, published, rejected,
//           film (approved script, Yakir films it himself), later (course lessons: editing starts later), test-done.
// Nothing is published from here. A finished reel goes to the existing reels flow (reels?step=add: Telegram approval,
// then the next publishing slot and every network, exactly like the edited reels).
//
// Served by the reels function (the project has no room for another function): .../functions/v1/reels?vr=<step>
// Cron (header x-cron-secret):
//   POST ?vr=script {id, dry?}         script of the request is ready: Telegram to Yakir (read + approve / ask for a change)
//   POST ?vr=final  {id, url, captions?, dry?}
//                                        finished video (an mp4 on the office GitHub Pages site, media/hgv/<id>.mp4).
//                                        reel: copied to storage files/reels/hg-<id>.mp4 and handed to reels?step=add.
//                                        other types: Telegram with view + approve / reject (pages below).
//   POST ?vr=sync {}                   request statuses follow their reel rows (approved, published, rejected)
//   POST ?vr=remind {force?}           scripts and finished videos still waiting for Yakir, once a day
// Public (Telegram buttons through the office site, portal.html#h=<a>&t=<token>):
//   ?a=sok | sfix  (script: approve / ask for a change, POST note)   ?a=vok | vno (finished video, not reels)
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const tok = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const self = () => `${env('SUPABASE_URL')}/functions/v1/reels`;
const pub = (a: string, t: string) => `https://dabullaw-glitch.github.io/dabul-office/portal.html#h=${a}&t=${t}`;
const OFFICE = 'https://dabullaw-glitch.github.io/dabul-office/#video';
const now = () => new Date().toISOString();
const TYPE: Record<string, string> = { reel: 'רילס לרשתות', course: 'שיעור בקורס', other: 'סרטון' };
const FORMJS = `<script>document.addEventListener('submit',function(e){var f=e.target;e.preventDefault();var b=f.querySelector('button');if(b){b.disabled=true;b.textContent='רגע...';}fetch(f.getAttribute('action'),{method:'POST',body:new URLSearchParams(new FormData(f))}).then(function(r){return r.text();}).then(function(t){document.open();document.write(t);document.close();});});</script>`;
function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#ecedf2;font-family:Assistant,Arial,sans-serif;color:#1f2937;line-height:1.7}main{max-width:620px;margin:24px auto;padding:28px 20px;background:#fff;border:1px solid #e2e0da;border-radius:14px}
.top{color:#fff;background:#141414;margin:-28px -20px 20px;padding:14px 20px;border-radius:14px 14px 0 0;border-bottom:3px solid #e4d19c;font-weight:700}h1{color:#141414;font-size:1.4rem;margin:0 0 10px}
.scr{white-space:pre-wrap;background:#f7f6f2;border:1px solid #e2e0da;border-radius:10px;padding:14px 16px;font-size:1.08rem;line-height:1.75}.muted{color:#6b7280;font-size:.95rem}
textarea{width:100%;box-sizing:border-box;min-height:120px;border:1px solid #d6d3cc;border-radius:10px;padding:10px;font:inherit;font-size:1rem}
.row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}a.lnk{color:#0b5fcc}
button{background:#e4d19c;color:#141414;border:0;border-radius:10px;padding:14px 22px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit}button.sec{background:#eef0f4}</style></head>
<body><main><div class="top">יקיר דבול - משרד עורכי דין</div><h1>${esc(title)}</h1>${body}</main>${FORMJS}</body></html>`, { status, headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
}
async function tg(text: string, buttons?: Any[], dry = false) {
  if (dry) { console.log('[dry telegram]', text, JSON.stringify(buttons || [])); return { dry: true, text, buttons }; }
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return { sent: false };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
  return { sent: !!(r && r.ok) };
}
const short = (t: string, n = 700) => { const s = String(t || '').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '...' : s; };

// ---- script ready: ask Yakir ----
async function askScript(id: string, dry: boolean, reminder = false) {
  const r = await getDoc('vidreq', id); if (!r) return { ok: false, error: 'no request' };
  const p = r.promptId ? await getDoc('prompt', r.promptId) : null; if (!p) return { ok: false, error: 'no script (promptId)' };
  const t = r.stok || tok();
  if (!reminder) await merge('vidreq', id, { status: 'script-wait', stok: t, asked: now(), ...(dry ? { dryRun: true } : {}) });
  const how = r.mode === 'self' ? 'אחרי האישור הוא יחכה לך בטלפרומטר לצילום.' : 'אחרי האישור הסרטון יוכן בהייגן ויערך, ויגיע אליך שוב לאישור סופי לפני כל פרסום.';
  const text = `${reminder ? '⏳ תזכורת: ' : ''}📝 תסריט חדש מחכה לאישור שלך: ${p.title || r.topic || ''}\n(${TYPE[r.type] || 'סרטון'}${p.sec ? ', כ-' + p.sec + ' שניות' : ''})\n\n${short(p.text)}\n\n${how}`;
  const out = await tg(text, [[{ text: '✅ קריאה ואישור', url: pub('sok', t) }], [{ text: '✏️ צריך שינוי', url: pub('sfix', t) }, { text: '📂 במערכת המשרד', url: OFFICE }]], dry);
  if (reminder) await merge('vidreq', id, { reminded: now() });
  return { ok: true, id, status: 'script-wait', telegram: out };
}

// ---- finished video ----
async function final(b: Any, dry: boolean) {
  const id = String(b.id || ''); const r = await getDoc('vidreq', id); if (!r) return { ok: false, error: 'no request' };
  const url = String(b.url || '');
  if (!/^https:\/\/dabullaw-glitch\.github\.io\/dabul-office\/media\/hgv\/[a-z0-9-]+\.mp4$/.test(url)) return { ok: false, error: 'url must be media/hgv/<id>.mp4 on the office GitHub Pages site' };
  const p = r.promptId ? await getDoc('prompt', r.promptId) : null;
  const title = String((p && p.title) || r.topic || 'סרטון');
  if ((r.type || 'reel') === 'reel') {
    const name = 'hg-' + id.replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 50);
    const path = `reels/${name}.mp4`;
    const cap = String((p && p.caption) || '');
    const captions = b.captions || { facebook: cap, instagram: cap, tiktok: cap, youtubeTitle: `${title} | עורך דין יקיר דבול`, youtubeDesc: cap, youtubeTags: '' };
    if (dry) return { ok: true, dry: true, would: { copy: url + ' -> files/' + path, reelsAdd: { path, link: url, name: title, captions } } };
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) return { ok: false, error: 'download ' + (res ? res.status : 'failed') + ' (GitHub Pages may need a minute)' };
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 200000) return { ok: false, error: 'file too small ' + buf.length };
    const up = await admin().storage.from('files').upload(path, buf, { contentType: 'video/mp4', upsert: true });
    if (up.error) return { ok: false, error: 'storage: ' + up.error.message };
    const add = await fetch(`${env('SUPABASE_URL')}/functions/v1/reels?step=add`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': env('CRON_SECRET') },
      body: JSON.stringify({ reels: [{ path, link: url, name: title, folder: 'heygen/' + id, captions, bytes: buf.length }] }) }).then(x => x.json()).catch(e => ({ error: String(e) }));
    const reelId = 'rl-' + name;
    await merge('vidreq', id, { status: 'final-wait', finalUrl: url, finalAt: now(), reelId, reelPath: path, bytes: buf.length });
    if (r.promptId) await merge('prompt', r.promptId, { status: 'filmed', hgFinal: url, reelId });
    return { ok: true, id, reelId, path, bytes: buf.length, reels: add };
  }
  const t = r.vtok || tok();
  await merge('vidreq', id, { status: 'final-wait', finalUrl: url, finalAt: now(), vtok: t });
  const out = await tg(`🎬 ${TYPE[r.type] || 'סרטון'} מוכן לאישור סופי: ${title}\n\nלוחצים "צפייה בסרטון", ואז "מאשר" או "לא מאשר". שום דבר לא עולה לפני האישור שלך.`,
    [[{ text: '👁 צפייה בסרטון', url }], [{ text: '✅ מאשר', url: pub('vok', t) }, { text: '✗ לא מאשר', url: pub('vno', t) }]], dry);
  return { ok: true, id, status: 'final-wait', telegram: out };
}

// request statuses follow their reel rows
async function sync() {
  const { data } = await db().select('id,data').eq('coll', 'vidreq').eq('data->>status', 'final-wait');
  const out: Any[] = [];
  for (const row of data || []) {
    const r = row.data; if (!r.reelId) continue;
    const reel = await getDoc('reel', r.reelId); if (!reel) continue;
    const st = reel.status === 'published' ? 'published' : ['approved', 'handed'].includes(reel.status) ? 'approved' : reel.status === 'rejected' ? 'rejected' : '';
    if (st) { await merge('vidreq', row.id, { status: st, [st + 'At']: now(), publishAt: reel.publishAt || '' }); out.push({ id: row.id, status: st }); }
  }
  return { ok: true, out };
}
async function remind(b: Any) {
  const { data } = await db().select('id,data').eq('coll', 'vidreq').in('data->>status', ['script-wait', 'final-wait']);
  const out: Any[] = [];
  for (const row of data || []) {
    const r = row.data; if (r.test || r.dryRun) continue;
    const last = Date.parse(r.reminded || r.asked || r.finalAt || r.created || 0);
    if (!b.force && Date.now() - last < 20 * 3600e3) continue;
    if (r.status === 'script-wait') out.push(await askScript(row.id, !!b.dry, true));
    else if (!r.reelId && r.vtok) {   // reels are reminded by the reels function itself
      await tg(`⏳ תזכורת: ${TYPE[r.type] || 'סרטון'} מחכה לאישור הסופי שלך: ${r.topic || ''}`, [[{ text: '👁 צפייה בסרטון', url: r.finalUrl }], [{ text: '✅ מאשר', url: pub('vok', r.vtok) }, { text: '✗ לא מאשר', url: pub('vno', r.vtok) }]], !!b.dry);
      await merge('vidreq', row.id, { reminded: now() }); out.push({ id: row.id, reminded: true });
    }
  }
  return { ok: true, out };
}

// ---- public pages ----
async function byTok(field: string, t: string) {
  if (!/^[a-f0-9]{40}$/.test(t)) return null;
  const { data } = await db().select('id,data').eq('coll', 'vidreq').eq(`data->>${field}`, t).limit(1); return data && data[0];
}
async function scriptPage(req: Request, a: string, t: string) {
  const row = await byTok('stok', t); if (!row) return page('הקישור לא תקף', '<p>הבקשה לא נמצאה.</p>', 404);
  const r = row.data; const p = r.promptId ? await getDoc('prompt', r.promptId) : null;
  if (!p) return page('התסריט לא נמצא', '<p>אולי הוא נמחק או הוחלף. אפשר לראות הכל במערכת המשרד, במסך סרטונים.</p>', 404);
  const title = esc(p.title || r.topic || '');
  const done = !['script-wait', 'script-fix', 'writing', 'new'].includes(r.status);
  if (done) return page('התסריט כבר אושר', `<p>${title}</p><p class="muted">אפשר לראות את מצב הסרטון במערכת המשרד, במסך סרטונים.</p><p><a class="lnk" href="${OFFICE}">פתיחת מערכת המשרד</a></p>`);
  if (req.method !== 'POST') {
    const scr = `<div class="scr">${esc(p.text || '')}</div>${p.caption ? `<p class="muted"><b>הטקסט שיעלה עם הסרטון:</b><br>${esc(p.caption)}</p>` : ''}`;
    if (a === 'sok') return page('אישור התסריט', `<p><b>${title}</b></p>${scr}<p class="muted">${r.mode === 'self' ? 'אחרי האישור התסריט יחכה לך בטלפרומטר.' : 'אחרי האישור הסרטון יוכן בהייגן, ייערך, ויגיע אליך לאישור סופי. שום דבר לא מתפרסם לפני האישור הסופי שלך.'}</p>
      <form method="post" action="${self()}?a=sok&t=${t}"><div class="row"><button type="submit">✅ מאשר את התסריט</button></div></form>
      <p><a class="lnk" href="${pub('sfix', t)}">✏️ צריך שינוי</a> · <a class="lnk" href="${OFFICE}">עריכה במערכת המשרד</a></p>`);
    return page('מה לשנות בתסריט?', `<p><b>${title}</b></p>${scr}<form method="post" action="${self()}?a=sfix&t=${t}"><p>כתוב במילים פשוטות מה לשנות, ונכתוב גרסה חדשה ונשלח אליך שוב:</p><textarea name="note" required></textarea><div class="row"><button type="submit">שליחה</button></div></form>`);
  }
  if (a === 'sok') {
    const next = r.mode === 'self' ? 'film' : (r.type === 'course' ? 'later' : 'heygen');
    await merge('prompt', r.promptId, { status: 'ready', approvedAt: now(), approvedBy: 'telegram', mode: r.mode === 'self' ? 'self' : 'heygen' });
    await merge('vidreq', row.id, { status: next, scriptApprovedAt: now() });
    return page('התסריט אושר', `<p>${title}</p><p>${next === 'film' ? 'הוא מחכה לך בטלפרומטר, במסך סרטונים במערכת המשרד.' : next === 'later' ? 'שיעורי הקורס יוכנו כשמסלול העריכה של הקורס יהיה מוכן.' : 'הסרטון יוכן בהייגן בסבב הקרוב (עד כמה שעות), ייערך, ויגיע אליך לאישור סופי.'}</p>`);
  }
  const form = await req.text().catch(() => ''); const note = (new URLSearchParams(form).get('note') || '').trim().slice(0, 2000);
  if (!note) return page('לא נכתב מה לשנות', `<p>נסו שוב: <a class="lnk" href="${pub('sfix', t)}">מה לשנות</a></p>`, 400);
  await merge('vidreq', row.id, { status: 'script-fix', fixNote: note, fixAt: now(), fixes: [...(r.fixes || []), { note, at: now() }] });
  return page('קיבלתי', `<p>נכתוב גרסה חדשה לפי ההערה ונשלח אליך שוב לאישור.</p><p class="muted">${esc(note)}</p>`);
}
async function videoPage(req: Request, a: string, t: string) {
  const row = await byTok('vtok', t); if (!row) return page('הקישור לא תקף', '<p>הסרטון לא נמצא.</p>', 404);
  const r = row.data; const title = esc(r.topic || '');
  if (['approved', 'published'].includes(r.status)) return page('כבר אושר', `<p>${title}</p>`);
  if (r.status === 'rejected' && a === 'vno') return page('לא אושר', `<p>${title}</p>`);
  if (req.method !== 'POST') return page(a === 'vok' ? 'אישור סופי' : 'לא לאשר?', `<p>${title}</p><p><a class="lnk" href="${esc(r.finalUrl)}">👁 צפייה בסרטון</a></p><form method="post" action="${self()}?a=${a}&t=${t}"><div class="row"><button type="submit">${a === 'vok' ? '✅ מאשר' : '✗ לא מאשר'}</button></div></form>`);
  if (a === 'vno') { await merge('vidreq', row.id, { status: 'rejected', rejectedAt: now() }); return page('לא אושר', `<p>${title} לא ישמש.</p>`); }
  await merge('vidreq', row.id, { status: 'approved', approvedAt: now(), ...(r.type === 'course' ? { courseReady: true } : {}) });
  return page('אושר', `<p>${title} אושר.</p>${r.type === 'course' ? '<p class="muted">השיעור מסומן כמוכן לקורס. הוא לא עולה לקונים עד שתאשר את פרסום הקורס.</p>' : ''}`);
}

// called first by the reels function: answers vidreq requests, or null for everything else
export async function handleVidreq(req: Request, url: URL): Promise<Response | null> {
  const a = url.searchParams.get('a') || '', t = (url.searchParams.get('t') || '').replace(/[^a-f0-9]/g, ''), step = url.searchParams.get('vr');
  if (!['sok', 'sfix', 'vok', 'vno'].includes(a) && !step) return null;
  try {
    if (a === 'sok' || a === 'sfix') return await scriptPage(req, a, t);
    if (a === 'vok' || a === 'vno') return await videoPage(req, a, t);
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    const b = await req.json().catch(() => ({}));
    if (step === 'script') return json(await askScript(String(b.id || ''), !!b.dry));
    if (step === 'final') return json(await final(b, !!b.dry));
    if (step === 'sync') return json(await sync());
    if (step === 'remind') return json(await remind(b));
    return json({ error: 'vr?' }, 400);
  } catch (e) { console.error(e); return a ? page('משהו השתבש', '<p>נסו שוב בעוד דקה.</p>', 500) : json({ ok: false, error: String((e as Error).message || e) }, 500); }
}
