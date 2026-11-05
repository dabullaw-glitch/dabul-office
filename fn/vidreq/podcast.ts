// Weekly podcast "נדל״ן בגובה העיניים" (Yakir 5.11.2026: "משימה קבועה אחת לשבוע לשלוח אליי תוכן לאישור ואחרי שאני מאשר
// להעביר את זה לעריכה ואז לפרסום של פרק פודקאסט שבועי. כל פעם על נושא אחר.").
// Episodes are docs coll "podcast" id epNN. Two approvals, both with Telegram buttons (no chat needed):
//   gate 1, the script:   POST ?vr=podscript {id}  -> status 'script-wait', token ptok, Telegram (read + approve / ask a change)
//                          ?a=pok  -> 'script-approved' (+ the 1-minute clip enters the HeyGen flow: prompt + vidreq rows)
//                          ?a=pfix -> 'script-fix' {fixNote}
//   gate 2, the edit:     POST ?vr=podfinal {id} -> status 'final-wait', token ftok, Telegram (listen + approve / ask a fix)
//                          ?a=pfok -> 'final-approved' (published on the release day by the scheduled task)
//                          ?a=pffix -> 'final-fix' {finalFixNote}
// The scheduled task "סרטוני הייגן" (tools/heygen-edit/TASK.md section 6b) does the voice, the mix and the publishing.
import { cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const tok = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const self = () => `${env('SUPABASE_URL')}/functions/v1/reels`;
const pub = (a: string, t: string) => `https://dabullaw-glitch.github.io/dabul-office/portal.html#h=${a}&t=${t}`;
const SITE = 'https://dabullaw-glitch.github.io/dabul-office/';
const now = () => new Date().toISOString();
const FORMJS = `<script>document.addEventListener('submit',function(e){var f=e.target;e.preventDefault();var b=f.querySelector('button');if(b){b.disabled=true;b.textContent='רגע...';}fetch(f.getAttribute('action'),{method:'POST',body:new URLSearchParams(new FormData(f))}).then(function(r){return r.text();}).then(function(t){document.open();document.write(t);document.close();});});</script>`;
function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#ecedf2;font-family:Assistant,Arial,sans-serif;color:#1f2937;line-height:1.7}main{max-width:680px;margin:24px auto;padding:28px 20px;background:#fff;border:1px solid #e2e0da;border-radius:14px}
.top{color:#fff;background:#141414;margin:-28px -20px 20px;padding:14px 20px;border-radius:14px 14px 0 0;border-bottom:3px solid #e4d19c;font-weight:700}h1{color:#141414;font-size:1.4rem;margin:0 0 10px}h2{font-size:1.1rem;margin:22px 0 6px}
.scr{white-space:pre-wrap;background:#f7f6f2;border:1px solid #e2e0da;border-radius:10px;padding:14px 16px;font-size:1.05rem;line-height:1.8}.muted{color:#6b7280;font-size:.95rem}
textarea{width:100%;box-sizing:border-box;min-height:120px;border:1px solid #d6d3cc;border-radius:10px;padding:10px;font:inherit;font-size:1rem}audio{width:100%;margin:8px 0}img{max-width:100%;border-radius:10px}
.row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}a.lnk{color:#0b5fcc}.sticky{position:sticky;bottom:0;background:#fff;padding:10px 0;border-top:1px solid #eee}
button{background:#e4d19c;color:#141414;border:0;border-radius:10px;padding:14px 22px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit}</style></head>
<body><main><div class="top">נדל״ן בגובה העיניים · יקיר דבול - משרד עורכי דין</div><h1>${esc(title)}</h1>${body}</main>${FORMJS}</body></html>`, { status, headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
}
async function tg(text: string, buttons?: Any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return { sent: false };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
  return { sent: !!(r && r.ok) };
}
const okId = (id: string) => /^ep\d{2,3}$/.test(id);
const minutes = (e: Any) => Math.round(Number((e.mix && e.mix.duration) || e.sec || 0) / 60);
async function byTok(field: string, t: string) {
  if (!/^[a-f0-9]{40}$/.test(t)) return null;
  const { data } = await db().select('id,data').eq('coll', 'podcast').eq(`data->>${field}`, t).limit(1); return data && data[0];
}

// ---- gate 1: the script ----
export async function askPodScript(id: string, reminder = false) {
  if (!okId(id)) return { ok: false, error: 'id must be epNN' };
  const e = await getDoc('podcast', id); if (!e || !e.script) return { ok: false, error: 'no episode or no script' };
  const t = e.ptok || tok();
  await merge('podcast', id, reminder ? { reminded: now() } : { status: 'script-wait', ptok: t, askedAt: now() });
  const first = String(e.description || '').split('\n')[0];
  const text = `${reminder ? '⏳ תזכורת: ' : ''}🎙 הפרק של השבוע בפודקאסט מחכה לאישור שלך\n${e.title || ''}\n\n${first}\n\n(כ-${minutes(e) || 11} דקות, וגם תסריט לקטע של דקה עם האווטאר)\nאחרי האישור: הקלטה בקול שלך, עריכה, ואז הפרק המוכן יגיע אליך לאישור סופי. שום דבר לא עולה לפני האישור הסופי שלך.`;
  const out = await tg(text, [[{ text: '✅ קריאה ואישור', url: pub('pok', t) }], [{ text: '✏️ צריך שינוי', url: pub('pfix', t) }]]);
  return { ok: true, id, status: reminder ? e.status : 'script-wait', telegram: out };
}
// ---- gate 2: the finished episode ----
export async function askPodFinal(id: string, reminder = false) {
  if (!okId(id)) return { ok: false, error: 'id must be epNN' };
  const e = await getDoc('podcast', id); if (!e || !e.mix || !e.mix.mp3) return { ok: false, error: 'no mix yet' };
  const t = e.ftok || tok();
  await merge('podcast', id, reminder ? { reminded: now() } : { status: 'final-wait', ftok: t, finalAskedAt: now() });
  const text = `${reminder ? '⏳ תזכורת: ' : ''}🎧 הפרק ערוך ומוכן לאישור סופי\n${e.title || ''}\n\nלוחצים "האזנה ואישור", שומעים, ומאשרים או כותבים מה לתקן. אחרי האישור הוא יעלה ביום רביעי ב-19:00 לספוטיפיי, אפל, יוטיוב ולאתר.`;
  const out = await tg(text, [[{ text: '🎧 האזנה ואישור', url: pub('pfok', t) }], [{ text: '✏️ צריך תיקון', url: pub('pffix', t) }]]);
  return { ok: true, id, status: reminder ? e.status : 'final-wait', telegram: out };
}
export async function remindPod(force = false) {
  const { data } = await db().select('id,data').eq('coll', 'podcast').in('data->>status', ['script-wait', 'final-wait']);
  const out: Any[] = [];
  for (const row of data || []) {
    const e = row.data; if (e.test) continue;
    const last = Math.max(Date.parse(e.reminded || 0) || 0, Date.parse((e.status === 'final-wait' ? e.finalAskedAt : e.askedAt) || 0) || 0);
    if (!force && Date.now() - last < 20 * 3600e3) continue;
    out.push(e.status === 'final-wait' ? await askPodFinal(row.id, true) : await askPodScript(row.id, true));
  }
  return out;
}

// the 1-minute avatar clip enters the normal HeyGen flow once the script is approved (type 'other', never a fixed slot)
async function startClip(id: string, e: Any) {
  if (!e.clip || !e.clip.script || e.clip.req) return;
  const n = Number(e.n || id.slice(2)); const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const pid = `h${ymd}-pod-${id}-clip`, rid = `vr-pod-${id}-clip`;
  if (await getDoc('vidreq', rid)) { await merge('podcast', id, { clip: { ...e.clip, req: rid, status: 'approved' } }); return; }
  const { data: mx } = await db().select('data').eq('coll', 'prompt').order('data->order', { ascending: false }).limit(1);
  const order = (Number(mx && mx[0] && mx[0].data && mx[0].data.order) || 0) + 1;
  await db().insert({ coll: 'prompt', id: pid, data: { id: pid, by: 'podcast', req: rid, sec: e.clip.sec || 60, mode: 'heygen', type: 'podcast-clip', order,
    style: 'teleprompter-natural', title: e.clip.title || e.title, text: e.clip.script, caption: e.clip.caption || '', status: 'ready', created: now(), approvedAt: now(), approvedBy: 'telegram' } });
  await db().insert({ coll: 'vidreq', id: rid, data: { mode: 'heygen', type: 'other', source: 'podcast', podcast: id, promptId: pid, status: 'heygen', created: now(),
    topic: `פודקאסט פרק ${n}: קטע של דקה`, notes: `קטע הדקה של פרק ${n} בפודקאסט "נדל״ן בגובה העיניים". התסריט אושר בטלגרם. אנכי 9:16. פרסום: יום רביעי 13:00 (podcast/show.clipSlot), לא במשבצות של ראשון, שלישי וחמישי.` } });
  await merge('podcast', id, { clip: { ...e.clip, req: rid, promptId: pid, status: 'approved' } });
}

// ---- public pages (Telegram buttons through portal.html#h=<a>&t=<token>) ----
async function readNote(req: Request) { const f = await req.text().catch(() => ''); return (new URLSearchParams(f).get('note') || '').trim().slice(0, 3000); }
async function scriptPage(req: Request, a: string, t: string) {
  const row = await byTok('ptok', t); if (!row) return page('הקישור לא תקף', '<p>הפרק לא נמצא.</p>', 404);
  const e = row.data; const title = esc(e.title || '');
  if (!['script-wait', 'script-fix', 'draft'].includes(e.status)) return page('התסריט כבר אושר', `<p>${title}</p><p class="muted">הפרק בהכנה. הוא יגיע אליך לאישור סופי לפני כל פרסום.</p>`);
  if (req.method !== 'POST') {
    const clip = e.clip && e.clip.script ? `<h2>הקטע של דקה עם האווטאר (לרשתות)</h2><div class="scr">${esc(e.clip.script)}</div>` : '';
    const desc = e.description ? `<h2>התיאור בספוטיפיי ובאפל</h2><div class="scr">${esc(e.description)}</div>` : '';
    const body = `<p class="muted">כ-${minutes(e) || 11} דקות · הקול שלך מהייגן${e.sources && e.sources.length ? ' · ' + e.sources.length + ' מקורות נבדקו' : ''}</p><h2>התסריט</h2><div class="scr">${esc(e.script)}</div>${clip}${desc}`;
    if (a === 'pok') return page('אישור הפרק', `<p><b>${title}</b></p>${body}<p class="muted">אחרי האישור: הקלטה בקול שלך, עריכה עם מוזיקה ועטיפה, ואז הפרק המוכן יגיע אליך לאישור סופי.</p>
      <div class="sticky"><form method="post" action="${self()}?a=pok&t=${t}"><div class="row"><button type="submit">✅ מאשר את התסריט</button></div></form><p><a class="lnk" href="${pub('pfix', t)}">✏️ צריך שינוי</a></p></div>`);
    return page('מה לשנות בפרק?', `<p><b>${title}</b></p><form method="post" action="${self()}?a=pfix&t=${t}"><p>כתוב במילים פשוטות מה לשנות (או נושא אחר לגמרי), ונשלח אליך גרסה חדשה:</p><textarea name="note" required></textarea><div class="row"><button type="submit">שליחה</button></div></form>${body}`);
  }
  if (a === 'pok') {
    await merge('podcast', row.id, { status: 'script-approved', approvedAt: now(), approvedBy: 'telegram' });
    await startClip(row.id, e).catch(err => console.error('clip', err));
    return page('התסריט אושר', `<p>${title}</p><p>ההקלטה בקול שלך והעריכה יתחילו בסבב הקרוב. הפרק המוכן יגיע אליך לאישור סופי.</p>`);
  }
  const note = await readNote(req); if (!note) return page('לא נכתב מה לשנות', `<p>נסו שוב: <a class="lnk" href="${pub('pfix', t)}">מה לשנות</a></p>`, 400);
  await merge('podcast', row.id, { status: 'script-fix', fixNote: note, fixAt: now(), fixes: [...(e.fixes || []), { note, at: now() }] });
  return page('קיבלתי', `<p>נכתוב גרסה חדשה לפי ההערה ונשלח אליך שוב לאישור.</p><p class="muted">${esc(note)}</p>`);
}
async function finalPage(req: Request, a: string, t: string) {
  const row = await byTok('ftok', t); if (!row) return page('הקישור לא תקף', '<p>הפרק לא נמצא.</p>', 404);
  const e = row.data; const title = esc(e.title || '');
  if (e.status !== 'final-wait') {
    const what = ['final-approved', 'published', 'published-feed'].includes(e.status) ? 'הפרק כבר אושר. הוא עולה ביום רביעי ב-19:00.' : 'ביקשת תיקון. הפרק יתוקן ויגיע אליך שוב.';
    return page('כבר טופל', `<p><b>${title}</b></p><p>${what}</p>`);
  }
  const mp3 = SITE + String(e.mix.mp3), mp4 = e.mix.mp4 ? SITE + String(e.mix.mp4) : '', cover = e.mix.covers && e.mix.covers.episode ? SITE + String(e.mix.covers.episode) : '';
  const listen = `${cover ? `<img src="${esc(cover)}" alt="" style="max-width:260px">` : ''}<audio controls preload="none" src="${esc(mp3)}"></audio>${mp4 ? `<p><a class="lnk" href="${esc(mp4)}" target="_blank" rel="noopener">👁 הגרסה ליוטיוב (סרטון)</a></p>` : ''}<p class="muted">כ-${minutes(e)} דקות</p>`;
  if (req.method !== 'POST') {
    if (a === 'pfok') return page('אישור סופי לפרק', `<p><b>${title}</b></p>${listen}<p class="muted">אחרי האישור הפרק יעלה ביום רביעי ב-19:00 לספוטיפיי, אפל, יוטיוב ולאתר.</p>
      <form method="post" action="${self()}?a=pfok&t=${t}"><div class="row"><button type="submit">✅ מאשר לפרסום</button></div></form><p><a class="lnk" href="${pub('pffix', t)}">✏️ צריך תיקון</a></p>`);
    return page('מה לתקן בפרק?', `<p><b>${title}</b></p>${listen}<form method="post" action="${self()}?a=pffix&t=${t}"><p>מה לתקן? (למשל מילה שנשמעת לא נכון, משפט להוריד, המוזיקה)</p><textarea name="note" required></textarea><div class="row"><button type="submit">שליחה</button></div></form>`);
  }
  if (a === 'pfok') { await merge('podcast', row.id, { status: 'final-approved', finalApprovedAt: now(), finalApprovedBy: 'telegram' }); return page('הפרק אושר', `<p>${title}</p><p>הוא יעלה ביום רביעי ב-19:00.</p>`); }
  const note = await readNote(req); if (!note) return page('לא נכתב מה לתקן', `<p>נסו שוב: <a class="lnk" href="${pub('pffix', t)}">מה לתקן</a></p>`, 400);
  await merge('podcast', row.id, { status: 'final-fix', finalFixNote: note, finalFixAt: now(), finalFixes: [...(e.finalFixes || []), { note, at: now() }] });
  return page('קיבלתי', `<p>נתקן לפי ההערה ונשלח אליך שוב.</p><p class="muted">${esc(note)}</p>`);
}
export const POD_ACTIONS = ['pok', 'pfix', 'pfok', 'pffix'];
export async function podPage(req: Request, a: string, t: string) {
  return (a === 'pok' || a === 'pfix') ? await scriptPage(req, a, t) : await finalPage(req, a, t);
}
