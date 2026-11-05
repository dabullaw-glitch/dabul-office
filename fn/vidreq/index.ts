// vidreq (1.11.2026, Yakir: "בקשת סרטון" in the office system, HeyGen instead of filming, every step with his approval).
// Requests live in docs coll "vidreq" (written by the office app addon-video.js / addon-upd.js and by the scheduled task
// "סרטוני הייגן"). The script of a request is a row in coll "prompt" (same list as the teleprompter), linked by promptId.
// Statuses: new, writing, script-wait, script-fix, heygen, raw-wait, raw-ok, raw-fix, editing, final-wait, approved,
//           published, rejected, hold (Yakir stopped it), film (approved script, Yakir films it himself),
//           later (course lessons: editing starts later), test-done.
// Raw approval (Yakir 1.11.2026): every HeyGen video is checked by Yakir BEFORE editing: heygen -> raw-wait (Telegram with
// view + approve / ask for a fix) -> raw-ok (the scheduled task sends it to the cloud editor) or raw-fix (rawFixNote: the
// task makes the HeyGen video again and asks again).
// Nothing is published from here. A finished reel goes to the existing reels flow (reels?step=add: Telegram approval,
// then the next publishing slot and every network, exactly like the edited reels).
//
// Served by the reels function (the project has no room for another function): .../functions/v1/reels?vr=<step>
// Cron (header x-cron-secret):
//   POST ?vr=script {id, dry?}         script of the request is ready: Telegram to Yakir (read + approve / ask for a change)
//   POST ?vr=raw    {id, dry?}         the HeyGen video is ready (hg.videoId): status raw-wait, Telegram to Yakir
//                                        (view in HeyGen + approve for editing / ask for a fix). dry writes nothing.
//   POST ?vr=final  {id, url, captions?, dry?}
//                                        finished video (an mp4 on the office GitHub Pages site, media/hgv/<id>.mp4).
//                                        reel: handed to reels?step=add with its public link (5.11.2026: the storage is
//                                        full, nothing is copied there): the compressed copy media/reels-pub/hg-<file id>.mp4
//                                        made by the heygen-edit workflow, or the full file when that copy is missing.
//                                        other types: Telegram with view + approve / reject (pages below).
//   POST ?vr=sync {}                   request statuses follow their reel rows (approved, published, rejected)
//   POST ?vr=remind {force?}           scripts, raw HeyGen videos and finished videos still waiting for Yakir, once a day
// Public (Telegram buttons through the office site, portal.html#h=<a>&t=<token>):
//   ?a=sok | sfix  (script: approve / ask for a change, POST note)   ?a=vok | vno (finished video, not reels)
//   ?a=rok | rfix  (raw HeyGen video, token rtok: approve for editing / ask for a fix, POST note)
// Course lessons (5.11.2026, Yakir approved option A: his avatar opens and closes every lesson, in the middle the lesson
// slides with his voice): a request of type 'course' has {course, lesson, promptIds: [opening, closing]} (two scripts,
// shown and approved together); after approval it goes to 'heygen' (the scheduled task follows settings/heygen.courseRules).
//   GET ?a=deck&t=<ctok>  the lesson slides for the course-lesson workflow (only while the lesson is being assembled)
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
import { POD_ACTIONS, podPage, askPodScript, askPodFinal, remindPod } from './podcast.ts';
// Podcast (5.11.2026): POST ?vr=podscript {id} / ?vr=podfinal {id}, pages ?a=pok|pfix (script) and ?a=pfok|pffix (finished episode): ./podcast.ts
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
// a request's scripts: course lessons have two (opening + closing, promptIds), every other request one (promptId)
const PART: Record<string, string> = { open: 'פתיחה', close: 'סיום' };
async function scriptsOf(r: Any): Promise<Any[]> {
  const ids: string[] = Array.isArray(r.promptIds) && r.promptIds.length ? r.promptIds : (r.promptId ? [r.promptId] : []);
  const out: Any[] = []; for (const id of ids) { const p = await getDoc('prompt', id); if (p) out.push({ ...p, id }); } return out;
}
const many = (ps: Any[]) => ps.length > 1;
const partTitle = (p: Any, i: number) => `${PART[p.part] || 'חלק ' + (i + 1)}${p.sec ? ' (כ-' + p.sec + ' שניות)' : ''}`;
const short = (t: string, n = 700) => { const s = String(t || '').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '...' : s; };

// ---- script ready: ask Yakir ----
async function askScript(id: string, dry: boolean, reminder = false) {
  const r = await getDoc('vidreq', id); if (!r) return { ok: false, error: 'no request' };
  const ps = await scriptsOf(r); const p = ps[0]; if (!p) return { ok: false, error: 'no script (promptId)' };
  const t = r.stok || tok();
  if (!reminder) await merge('vidreq', id, { status: 'script-wait', stok: t, asked: now(), ...(dry ? { dryRun: true } : {}) });
  const course = r.type === 'course';
  const how = r.mode === 'self' ? 'אחרי האישור הוא יחכה לך בטלפרומטר לצילום.'
    : course ? 'אחרי האישור שני הקטעים יוכנו בהייגן, השיעור כולו יורכב (פתיחה, השקפים בקול שלך, סיום), ויגיע אליך לאישור סופי לפני שהוא נכנס לקורס.'
    : 'אחרי האישור הסרטון יוכן בהייגן ויערך, ויגיע אליך שוב לאישור סופי לפני כל פרסום.';
  const body = many(ps) ? ps.map((x, i) => `${partTitle(x, i)}:\n${short(x.text, 1500)}`).join('\n\n') : short(p.text);
  const head = course ? (r.topic || p.title || '') : (p.title || r.topic || '');
  const text = `${reminder ? '⏳ תזכורת: ' : ''}📝 ${many(ps) ? 'תסריטים חדשים מחכים' : 'תסריט חדש מחכה'} לאישור שלך: ${head}\n(${TYPE[r.type] || 'סרטון'}${!many(ps) && p.sec ? ', כ-' + p.sec + ' שניות' : ''})\n\n${body}\n\n${how}`;
  const out = await tg(text, [[{ text: '✅ קריאה ואישור', url: pub('sok', t) }], [{ text: '✏️ צריך שינוי', url: pub('sfix', t) }, { text: '📂 במערכת המשרד', url: OFFICE }]], dry);
  if (reminder) await merge('vidreq', id, { reminded: now() });
  return { ok: true, id, status: 'script-wait', telegram: out };
}

// ---- raw HeyGen video ready: Yakir checks it before editing ----
const hgId = (r: Any) => String((r && r.hg && r.hg.videoId) || '').replace(/[^A-Za-z0-9_-]/g, '');
const hgView = (vid: string) => `https://app.heygen.com/videos/${vid}`;
const rawButtons = (vid: string, t: string) => [[{ text: '👁 צפייה בסרטון', url: hgView(vid) }], [{ text: '✅ מאשר, לעריכה', url: pub('rok', t) }, { text: '✏️ צריך תיקון', url: pub('rfix', t) }], [{ text: '📂 במערכת המשרד', url: OFFICE }]];
async function askRaw(id: string, dry: boolean, reminder = false) {
  const r = await getDoc('vidreq', id); if (!r) return { ok: false, error: 'no request' };
  const vid = hgId(r); if (!vid) return { ok: false, error: 'no hg.videoId' };
  const p = r.promptId ? await getDoc('prompt', r.promptId) : null;
  const title = String((p && p.title) || r.topic || 'סרטון');
  // a new token for every new raw video (old Telegram buttons of a video that was fixed stop working); reminders reuse it
  const t = reminder && r.rtok ? String(r.rtok) : tok();
  if (!dry) await merge('vidreq', id, reminder ? { rtok: t, reminded: now() } : { status: 'raw-wait', rtok: t, rawAskedAt: now() });
  const text = `${reminder ? '⏳ תזכורת: ' : ''}🎥 הסרטון מהייגן מוכן לבדיקה: ${title}\n\nצפייה, ואז אישור לעריכה או בקשת תיקון. שום דבר לא עולה לפני האישור הסופי שלך.`;
  const out = await tg(text, rawButtons(vid, t), dry);
  return { ok: true, id, status: 'raw-wait', ...(dry ? { dry: true, wrote: false } : {}), telegram: out };
}

// ---- finished video ----
async function final(b: Any, dry: boolean) {
  const id = String(b.id || ''); const r = await getDoc('vidreq', id); if (!r) return { ok: false, error: 'no request' };
  const url = String(b.url || '');
  const course = r.type === 'course';
  const okUrl = /^https:\/\/dabullaw-glitch\.github\.io\/dabul-office\/media\/hgv\/[a-z0-9-]+\.mp4$/.test(url)
    || (course && /^https:\/\/dabullaw-glitch\.github\.io\/dabul-office\/media\/course\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/.test(url));
  if (!okUrl) return { ok: false, error: 'url must be media/hgv/<id>.mp4 (course lessons: media/course/<course>/<file>.mp4) on the office GitHub Pages site' };
  const p = r.promptId ? await getDoc('prompt', r.promptId) : null;
  const title = String((p && p.title) || r.topic || 'סרטון');
  if ((r.type || 'reel') === 'reel') {
    const name = 'hg-' + id.replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 50);
    const cap = String((p && p.caption) || '');
    const captions = b.captions || { facebook: cap, instagram: cap, tiktok: cap, youtubeTitle: `${title} | עורך דין יקיר דבול`, youtubeDesc: cap, youtubeTags: '' };
    // 5.11.2026 (Yakir: the storage is full, no paid plan): the reel is published from its public link, nothing goes to storage.
    // First choice: the small copy for publishing (heygen-edit workflow: media/reels-pub/hg-<file id>.mp4); else the full file.
    const fileId = url.split('/').pop()!.slice(0, -4);
    const small = `https://dabullaw-glitch.github.io/dabul-office/media/reels-pub/hg-${fileId}.mp4`;
    if (dry) return { ok: true, dry: true, would: { reelsAdd: { key: name, videoUrl: small + ' (or ' + url + ')', link: url, name: title, captions } } };
    const head = async (u: string) => { const x = await fetch(u, { method: 'HEAD' }).catch(() => null); return x && x.ok ? (Number(x.headers.get('content-length') || 0) || 999999) : -1; };
    let videoUrl = small, bytes = await head(small);
    if (bytes < 200000) { videoUrl = url; bytes = await head(url); }
    if (bytes < 200000) return { ok: false, error: 'the video is not on GitHub Pages yet (' + bytes + '); GitHub Pages may need a minute' };
    const add = await fetch(`${env('SUPABASE_URL')}/functions/v1/reels?step=add`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': env('CRON_SECRET') },
      body: JSON.stringify({ reels: [{ key: name, videoUrl, link: url, name: title, folder: 'heygen/' + id, captions, bytes, priority: 'heygen' }] }) }).then(x => x.json()).catch(e => ({ error: String(e) }));
    const reelId = 'rl-' + name;
    // 1.11.2026 (Yakir: HeyGen videos go to the front of the queue): mark the reel row, also when it already existed
    if (await getDoc('reel', reelId)) await merge('reel', reelId, { priority: 'heygen' });
    await merge('vidreq', id, { status: 'final-wait', finalUrl: url, finalAt: now(), reelId, videoUrl, bytes });
    if (r.promptId) await merge('prompt', r.promptId, { status: 'filmed', hgFinal: url, reelId });
    return { ok: true, id, reelId, videoUrl, bytes, reels: add };
  }
  const t = r.vtok || tok();
  await merge('vidreq', id, { status: 'final-wait', finalUrl: url, finalAt: now(), vtok: t });
  const out = await tg(`🎬 ${TYPE[r.type] || 'סרטון'} מוכן לאישור סופי: ${course ? (r.topic || title) : title}\n\nלוחצים "צפייה בסרטון", ואז "מאשר" או "לא מאשר". ${course ? 'השיעור נכנס לקורס רק אחרי האישור שלך.' : 'שום דבר לא עולה לפני האישור שלך.'}`,
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
  const { data } = await db().select('id,data').eq('coll', 'vidreq').in('data->>status', ['script-wait', 'raw-wait', 'final-wait']);
  const out: Any[] = [];
  for (const row of data || []) {
    const r = row.data; if (r.test || r.dryRun) continue;
    const last = r.status === 'raw-wait' ? Math.max(Date.parse(r.reminded || 0) || 0, Date.parse(r.rawAskedAt || 0) || 0) : Date.parse(r.reminded || r.asked || r.finalAt || r.created || 0);
    if (!b.force && Date.now() - last < 20 * 3600e3) continue;
    if (r.status === 'script-wait') out.push(await askScript(row.id, !!b.dry, true));
    else if (r.status === 'raw-wait') out.push(await askRaw(row.id, !!b.dry, true));
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
  const r = row.data; const ps = await scriptsOf(r); const p = ps[0];
  if (!p) return page('התסריט לא נמצא', '<p>אולי הוא נמחק או הוחלף. אפשר לראות הכל במערכת המשרד, במסך סרטונים.</p>', 404);
  const title = esc(r.type === 'course' ? (r.topic || p.title || '') : (p.title || r.topic || ''));
  const done = !['script-wait', 'script-fix', 'writing', 'new'].includes(r.status);
  if (done) return page('התסריט כבר אושר', `<p>${title}</p><p class="muted">אפשר לראות את מצב הסרטון במערכת המשרד, במסך סרטונים.</p><p><a class="lnk" href="${OFFICE}">פתיחת מערכת המשרד</a></p>`);
  if (req.method !== 'POST') {
    const scr = many(ps) ? ps.map((x, i) => `<h2 style="font-size:1.1rem;margin:18px 0 6px">${esc(partTitle(x, i))}</h2><div class="scr">${esc(x.text || '')}</div>`).join('')
      : `<div class="scr">${esc(p.text || '')}</div>${p.caption ? `<p class="muted"><b>הטקסט שיעלה עם הסרטון:</b><br>${esc(p.caption)}</p>` : ''}`;
    const after = r.mode === 'self' ? 'אחרי האישור התסריט יחכה לך בטלפרומטר.'
      : r.type === 'course' ? 'אחרי האישור שני הקטעים יוכנו בהייגן, השיעור כולו יורכב (פתיחה, השקפים בקול שלך, סיום), ויגיע אליך לאישור סופי. השיעור נכנס לקורס רק אחרי האישור הסופי שלך.'
      : 'אחרי האישור הסרטון יוכן בהייגן, ייערך, ויגיע אליך לאישור סופי. שום דבר לא מתפרסם לפני האישור הסופי שלך.';
    if (a === 'sok') return page(many(ps) ? 'אישור התסריטים' : 'אישור התסריט', `<p><b>${title}</b></p>${scr}<p class="muted">${after}</p>
      <form method="post" action="${self()}?a=sok&t=${t}"><div class="row"><button type="submit">✅ מאשר ${many(ps) ? 'את שני התסריטים' : 'את התסריט'}</button></div></form>
      <p><a class="lnk" href="${pub('sfix', t)}">✏️ צריך שינוי</a> · <a class="lnk" href="${OFFICE}">עריכה במערכת המשרד</a></p>`);
    return page('מה לשנות בתסריט?', `<p><b>${title}</b></p>${scr}<form method="post" action="${self()}?a=sfix&t=${t}"><p>כתוב במילים פשוטות מה לשנות, ונכתוב גרסה חדשה ונשלח אליך שוב:</p><textarea name="note" required></textarea><div class="row"><button type="submit">שליחה</button></div></form>`);
  }
  if (a === 'sok') {
    // course lessons with a lesson number go to HeyGen (settings/heygen.courseRules); older course requests wait ('later')
    const next = r.mode === 'self' ? 'film' : (r.type === 'course' ? (r.lesson ? 'heygen' : 'later') : 'heygen');
    for (const x of ps) await merge('prompt', x.id, { status: 'ready', approvedAt: now(), approvedBy: 'telegram', mode: r.mode === 'self' ? 'self' : 'heygen' });
    await merge('vidreq', row.id, { status: next, scriptApprovedAt: now() });
    return page('התסריט אושר', `<p>${title}</p><p>${next === 'film' ? 'הוא מחכה לך בטלפרומטר, במסך סרטונים במערכת המשרד.' : next === 'later' ? 'שיעורי הקורס יוכנו כשמסלול העריכה של הקורס יהיה מוכן.' : r.type === 'course' ? 'שני הקטעים יוכנו בהייגן בסבבים הקרובים, השיעור יורכב, ויגיע אליך לאישור סופי.' : 'הסרטון יוכן בהייגן בסבב הקרוב (עד כמה שעות), ייערך, ויגיע אליך לאישור סופי.'}</p>`);
  }
  const form = await req.text().catch(() => ''); const note = (new URLSearchParams(form).get('note') || '').trim().slice(0, 2000);
  if (!note) return page('לא נכתב מה לשנות', `<p>נסו שוב: <a class="lnk" href="${pub('sfix', t)}">מה לשנות</a></p>`, 400);
  await merge('vidreq', row.id, { status: 'script-fix', fixNote: note, fixAt: now(), fixes: [...(r.fixes || []), { note, at: now() }] });
  return page('קיבלתי', `<p>נכתוב גרסה חדשה לפי ההערה ונשלח אליך שוב לאישור.</p><p class="muted">${esc(note)}</p>`);
}
async function rawPage(req: Request, a: string, t: string) {
  const row = await byTok('rtok', t); if (!row) return page('הקישור לא תקף', '<p>הבקשה לא נמצאה.</p>', 404);
  const r = row.data; const p = r.promptId ? await getDoc('prompt', r.promptId) : null;
  const title = esc((p && p.title) || r.topic || '');
  const vid = hgId(r);
  const view = vid ? `<p><a class="lnk" href="${hgView(vid)}" target="_blank" rel="noopener">👁 צפייה בסרטון</a></p>` : '';
  if (r.status !== 'raw-wait') {
    const what = ['raw-fix', 'heygen'].includes(r.status) ? 'ביקשת תיקון. הסרטון יוכן מחדש בהייגן ויישלח אליך שוב לבדיקה.'
      : ['rejected', 'hold'].includes(r.status) ? 'הבקשה הזאת נעצרה.'
      : 'הסרטון כבר אושר לעריכה. אחרי העריכה הוא יגיע אליך לאישור סופי, ושום דבר לא מתפרסם לפני כן.';
    return page('כבר טופל', `<p><b>${title}</b></p><p>${what}</p><p class="muted">אפשר לראות את מצב הסרטון במערכת המשרד, במסך סרטונים.</p><p><a class="lnk" href="${OFFICE}">פתיחת מערכת המשרד</a></p>`);
  }
  if (req.method !== 'POST') {
    if (a === 'rok') return page('אישור הסרטון לעריכה', `<p><b>${title}</b></p>${view}<p class="muted">אחרי האישור הסרטון ייערך (כתוביות, גרפיקה וסיום), ויגיע אליך לאישור סופי. שום דבר לא מתפרסם לפני האישור הסופי שלך.</p>
      <form method="post" action="${self()}?a=rok&t=${t}"><div class="row"><button type="submit">✅ מאשר, לעריכה</button></div></form>
      <p><a class="lnk" href="${pub('rfix', t)}">✏️ צריך תיקון</a> · <a class="lnk" href="${OFFICE}">במערכת המשרד</a></p>`);
    return page('מה לתקן בסרטון?', `<p><b>${title}</b></p>${view}<form method="post" action="${self()}?a=rfix&t=${t}"><p>מה לתקן בסרטון? (למשל מילה שנשמעת לא נכון, תנועה, מראה)</p><textarea name="note" required></textarea><div class="row"><button type="submit">שליחה</button></div></form>`);
  }
  if (a === 'rok') {
    await merge('vidreq', row.id, { status: 'raw-ok', rawApprovedAt: now(), rawApprovedBy: 'telegram' });
    return page('הסרטון אושר לעריכה', `<p>${title}</p><p>הסרטון ייערך בסבב הקרוב (עד כמה שעות), ויגיע אליך לאישור סופי לפני כל פרסום.</p>`);
  }
  const form = await req.text().catch(() => ''); const note = (new URLSearchParams(form).get('note') || '').trim().slice(0, 2000);
  if (!note) return page('לא נכתב מה לתקן', `<p>נסו שוב: <a class="lnk" href="${pub('rfix', t)}">מה לתקן</a></p>`, 400);
  await merge('vidreq', row.id, { status: 'raw-fix', rawFixNote: note, rawFixAt: now(), rawFixes: [...(r.rawFixes || []), { note, at: now(), videoId: vid, by: 'telegram' }] });
  return page('קיבלתי', `<p>נתקן לפי ההערה, נכין את הסרטון מחדש בהייגן ונשלח אליך שוב לבדיקה.</p><p class="muted">${esc(note)}</p>`);
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

// the slides of a course lesson for the course-lesson workflow (GitHub Actions has no secrets): token ctok on the request,
// answered only while the lesson is being voiced / assembled / waits for the final approval (or on a test request)
async function deckJson(t: string) {
  const row = await byTok('ctok', t); if (!row) return json({ ok: false, error: 'not found' }, 404);
  const r = row.data;
  if (r.type !== 'course' || !(['voice', 'assembling', 'final-wait'].includes(r.status) || (r.test && r.status !== 'test-done'))) return json({ ok: false, error: 'closed' }, 403);
  const c = await getDoc('course', String(r.course || 'first-home')); const ls: Any[] = (c && c.lessons) || [];
  const l = ls.find(x => Number(x.n) === Number(r.lesson)); if (!l) return json({ ok: false, error: 'no lesson' }, 404);
  const nx = ls.find(x => Number(x.n) === Number(r.lesson) + 1);
  return json({ ok: true, course: r.course || 'first-home', n: l.n, of: ls.length, title: l.title, nextTitle: nx ? nx.title : '', scenes: (l.deck && l.deck.scenes) || [] });
}

// called first by the reels function: answers vidreq requests, or null for everything else
export async function handleVidreq(req: Request, url: URL): Promise<Response | null> {
  const a = url.searchParams.get('a') || '', t = (url.searchParams.get('t') || '').replace(/[^a-f0-9]/g, ''), step = url.searchParams.get('vr');
  if (!['sok', 'sfix', 'vok', 'vno', 'rok', 'rfix', 'deck', ...POD_ACTIONS].includes(a) && !step) return null;
  try {
    if (a === 'deck') return await deckJson(t);
    if (POD_ACTIONS.includes(a)) return await podPage(req, a, t);
    if (a === 'sok' || a === 'sfix') return await scriptPage(req, a, t);
    if (a === 'vok' || a === 'vno') return await videoPage(req, a, t);
    if (a === 'rok' || a === 'rfix') return await rawPage(req, a, t);
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    const b = await req.json().catch(() => ({}));
    if (step === 'script') return json(await askScript(String(b.id || ''), !!b.dry));
    if (step === 'raw') return json(await askRaw(String(b.id || ''), !!b.dry));
    if (step === 'final') return json(await final(b, !!b.dry));
    if (step === 'sync') return json(await sync());
    if (step === 'remind') { const r = await remind(b); return json({ ...r, podcast: b.dry ? [] : await remindPod(!!b.force) }); }
    if (step === 'podscript') return json(await askPodScript(String(b.id || '')));
    if (step === 'podfinal') return json(await askPodFinal(String(b.id || '')));
    return json({ error: 'vr?' }, 400);
  } catch (e) { console.error(e); return a ? page('משהו השתבש', '<p>נסו שוב בעוד דקה.</p>', 500) : json({ ok: false, error: String((e as Error).message || e) }, 500); }
}
