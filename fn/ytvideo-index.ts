// ytvideo: the office's own short answer videos for the YouTube slots in the publishing calendar ("own-video" rows).
// Free end to end: narration with Google Text-to-Speech (office service account, free tier), the picture is rendered by the
// GitHub Action .github/workflows/office-video.yml (tools/office-video/render.mjs), and the file is served from GitHub Pages.
//
// Scripts: docs coll 'ytscript', id = short ascii slug:
//   { status: 'new' | 'voiced' | 'ready' | 'stopped', at (YYYY-MM-DDTHH:MM Israel), pubId, title (the question), link (the article),
//     description, tags, voice?, scenes: [{ type, ..., say }] }
//
// GET  ?a=next&have=a,b public (used by the GitHub Action): the earliest script without a video (ids in 'have' are skipped), with narration links
//                       (made here and cached by text in the public "pv" bucket). Only our own scripts are ever returned.
// POST ?step=attach     cron: when media/yt/<id>.mp4 is live on GitHub Pages, the video goes into its calendar row (media,
//                       description) and Yakir gets a Telegram message with the video and a stop link.
// GET  ?stop=<token>    stops that video (the calendar row becomes "skipped").
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const cors = { 'Access-Control-Allow-Origin': '*' };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
const text = (m: string) => new Response(m, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => sb().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const VOICE = 'he-IL-Chirp3-HD-Charon';

const b64url = (b: ArrayBuffer | Uint8Array | string) => { const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer); let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
let tokCache = { t: '', exp: 0 };
async function gtoken() {
  if (tokCache.t && Date.now() < tokCache.exp) return tokCache.t;
  const sa = JSON.parse(env('GOOGLE_SA_JSON')), now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); tokCache = { t: j.access_token, exp: Date.now() + 50 * 60e3 }; return j.access_token as string;
}
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)))).slice(0, 6).map((x) => x.toString(16).padStart(2, '0')).join('');
async function synth(say: string, voice: string) {
  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', { method: 'POST', headers: { authorization: `Bearer ${await gtoken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text: say }, voice: { languageCode: 'he-IL', name: voice }, audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 } }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || String(r.status));
  return Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
}

// deno-lint-ignore no-explicit-any
async function next(skip: string[]): Promise<any> {
  const { data } = await sb().from('docs').select('id,data').eq('coll', 'ytscript').in('data->>status', ['new', 'voiced']);
  // deno-lint-ignore no-explicit-any
  const rows = (data || []).sort((a: any, b: any) => String(a.data.at).localeCompare(String(b.data.at)));
  for (const row of rows) {
    const s = row.data; const voice = s.voice || VOICE;
    // a script whose video is already in the repo is skipped (the attach step picks it up once GitHub Pages serves it)
    if (skip.includes(row.id)) continue;
    const scenes = s.scenes || []; let changed = false;
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i]; if (!sc.say) continue;
      const h = await hash(`${voice}|${sc.say}`);
      if (sc.audio && sc.ah === h) continue;
      const bytes = await synth(sc.say, voice);
      const path = `ytvo/${row.id}/${String(i + 1).padStart(2, '0')}-${h}.mp3`;
      const up = await sb().storage.from('pv').upload(path, bytes, { upsert: true, contentType: 'audio/mpeg' });
      if (up.error) throw new Error(up.error.message);
      sc.audio = sb().storage.from('pv').getPublicUrl(path).data.publicUrl; sc.ah = h; changed = true;
    }
    if (changed || s.status !== 'voiced') await merge('ytscript', row.id, { scenes, status: 'voiced', voicedAt: new Date().toISOString() });
    return { id: row.id, title: s.title, link: s.link || '', scenes };
  }
  return { id: null };
}

// deno-lint-ignore no-explicit-any
async function tg(msg: string, buttons?: any[]) {
  if (!env('TELEGRAM_BOT_TOKEN') || !env('TELEGRAM_CHAT_ID')) return;
  await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text: msg.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}

async function attach() {
  const { data: cfg } = await sb().from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle();
  const media = String(cfg?.data?.media || 'https://dabullaw-glitch.github.io/dabul-office/media/');
  const { data } = await sb().from('docs').select('id,data').eq('coll', 'ytscript').eq('data->>status', 'voiced');
  const done: string[] = [];
  for (const row of data || []) {
    const s = row.data, file = `yt/${row.id}.mp4`;
    const h = await fetch(media + file, { method: 'HEAD' }).catch(() => null);
    if (!h || !h.ok) continue;
    const token = crypto.randomUUID().replace(/-/g, '');
    if (s.pubId) {
      const note = `הסרטון מוכן בקובץ המצורף (media), לפרסם אותו כמו שהוא ביוטיוב. כותרת הסרטון: ${s.title}. התיאור: הטקסט של השורה (text). תגיות: ${s.tags || ''}`;
      await merge('pub', s.pubId, { media: [`{MEDIA}${file}`], text: s.description || '', note, ytTitle: s.title, ytTags: s.tags || '', videoReady: new Date().toISOString() });
    }
    await merge('ytscript', row.id, { status: 'ready', file, readyAt: new Date().toISOString(), stopToken: token });
    const when = String(s.at || '').replace('T', ' בשעה ');
    await tg(`🎬 סרטון יוטיוב מוכן: ${s.title}\nיעלה ב-${when}, לפי לוח הפרסום.\n\nאפשר לצפות עכשיו. אם משהו לא מתאים, לוחצים "לא לפרסם".`,
      [[{ text: '▶️ צפייה בסרטון', url: media + file }], [{ text: '⛔ לא לפרסם', url: `${env('SUPABASE_URL')}/functions/v1/ytvideo?stop=${token}` }]]);
    done.push(row.id);
  }
  return { attached: done };
}

async function stop(token: string) {
  const { data } = await sb().from('docs').select('id,data').eq('coll', 'ytscript').eq('data->>stopToken', token).limit(1);
  const row = data && data[0];
  if (!row) return text('הקישור לא תקף, או שהסרטון כבר טופל.');
  if (row.data.pubId) await merge('pub', row.data.pubId, { status: 'skipped', skipReason: 'יקיר עצר את הסרטון' });
  await merge('ytscript', row.id, { status: 'stopped', stoppedAt: new Date().toISOString() });
  await tg(`⛔ הסרטון "${row.data.title}" לא יפורסם.`);
  return text('✓ הסרטון לא יפורסם. אפשר לסגור את הדף.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  try {
    if (url.searchParams.get('a') === 'next') return json(await next((url.searchParams.get('have') || '').split(',').filter(Boolean)));
    const st = url.searchParams.get('stop'); if (st) return await stop(st.replace(/[^a-f0-9]/g, ''));
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    if (url.searchParams.get('step') === 'attach') return json(await attach());
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
