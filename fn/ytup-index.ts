// ytup: the office's own YouTube uploader (official YouTube Data API, no cost), so the question videos do not depend on Grok.
// One-time setup by Yakir: an OAuth client in the Google Cloud project "dabul-office" (app_secrets YT_CLIENT_ID, YT_CLIENT_SECRET),
// then he opens ?a=connect once and approves with the channel's Google account. The refresh token is kept in app_secrets YT_REFRESH.
//
// GET  ?a=connect        -> Google consent screen (YouTube upload + read)
// GET  ?a=cb&code=...    -> saves the refresh token, shows the channel name
// GET  ?a=status         -> { connected, channel }
// POST ?step=publish     cron: calendar rows with owner 'system', channel youtube and a ready video (media .mp4) whose time has come
//                        are uploaded with their title (ytTitle), description (text) and tags (ytTags), then marked published.
// While the Google project is not yet audited, YouTube keeps API uploads private; settings/pub.ytPrivacy says what to request.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const page = (title: string, body: string) => new Response(`${title}\n\n${body}`, { headers: { 'content-type': 'text/plain; charset=utf-8' } }); // Supabase serves function HTML as plain text, so plain text it is
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => sb().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const SELF = () => `${env('SUPABASE_URL')}/functions/v1/ytup`;
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';

async function access() {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('YT_CLIENT_ID'), client_secret: env('YT_CLIENT_SECRET'), refresh_token: env('YT_REFRESH'), grant_type: 'refresh_token' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('google token: ' + (j.error_description || j.error || r.status));
  return j.access_token as string;
}
async function channel(tok: string) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: { authorization: `Bearer ${tok}` } });
  const j = await r.json(); const c = j.items?.[0]; return c ? { id: c.id, title: c.snippet?.title } : null;
}
async function tg(msg: string) {
  if (!env('TELEGRAM_BOT_TOKEN') || !env('TELEGRAM_CHAT_ID')) return;
  await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text: msg.slice(0, 4000), disable_web_page_preview: true }) }).catch(() => null);
}
const ilNow = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).replace(' ', 'T');

async function publish() {
  if (!env('YT_REFRESH')) return { skipped: 'not connected' };
  const { data: cfg } = await sb().from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle();
  const MEDIA = String(cfg?.data?.media || 'https://dabullaw-glitch.github.io/dabul-office/media/');
  const privacy = String(cfg?.data?.ytPrivacy || 'public');
  const now = ilNow();
  const { data } = await sb().from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'system').eq('data->>status', 'planned').lte('data->>at', now);
  // deno-lint-ignore no-explicit-any
  const rows = (data || []).filter((r: any) => (r.data.channels || []).includes('youtube') && (r.data.media || []).some((m: string) => /\.mp4$/i.test(m)));
  const out: unknown[] = [];
  if (!rows.length) return { uploaded: out };
  const tok = await access();
  for (const row of rows) {
    const d = row.data;
    if (d.ytUploading && Date.now() - Date.parse(d.ytUploading) < 30 * 60e3) continue; // another run is on it
    await merge('pub', row.id, { ytUploading: new Date().toISOString() });
    try {
      const file = String(d.media.find((m: string) => /\.mp4$/i.test(m))).replace('{MEDIA}', MEDIA);
      const vid = await fetch(file); if (!vid.ok) throw new Error(`video file ${vid.status}`);
      const bytes = new Uint8Array(await vid.arrayBuffer());
      const title = String(d.ytTitle || d.topic || d.title).slice(0, 100);
      const tags = String(d.ytTags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 15);
      const meta = { snippet: { title, description: String(d.text || '').slice(0, 4900), tags, categoryId: '27', defaultLanguage: 'he', defaultAudioLanguage: 'he' },
        status: { privacyStatus: privacy, selfDeclaredMadeForKids: false, embeddable: true } };
      const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
        headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(bytes.length) }, body: JSON.stringify(meta) });
      const loc = init.headers.get('location'); if (!init.ok || !loc) throw new Error(`upload start ${init.status}: ${(await init.text()).slice(0, 300)}`);
      const up = await fetch(loc, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: bytes });
      const j = await up.json(); if (!up.ok || !j.id) throw new Error(`upload ${up.status}: ${JSON.stringify(j).slice(0, 300)}`);
      const status = j.status?.privacyStatus || privacy;
      await merge('pub', row.id, { status: 'published', publishedAt: new Date().toISOString(), verify: { ...(d.verify || {}), youtube: { id: j.id, by: 'ytup', privacy: status } }, ytUploading: null });
      await tg(`▶️ עלה ליוטיוב: ${title}\nhttps://youtu.be/${j.id}${status !== 'public' ? `\n(כרגע ${status === 'private' ? 'פרטי' : status}, עד שגוגל יאשר את החיבור)` : ''}`);
      out.push({ id: row.id, yt: j.id, privacy: status });
    } catch (e) {
      const msg = String((e as Error).message || e);
      await merge('pub', row.id, { ytUploading: null, ytError: msg, ytErrorAt: new Date().toISOString() });
      if ((d.ytErrors || 0) < 1) await tg(`⚠️ העלאה ליוטיוב נכשלה: ${d.topic || d.title}\nננסה שוב בעוד כמה דקות.\n${msg.slice(0, 200)}`);
      await merge('pub', row.id, { ytErrors: (d.ytErrors || 0) + 1 });
      out.push({ id: row.id, error: msg });
    }
  }
  return { uploaded: out };
}

Deno.serve(async (req) => {
  await loadSecrets().catch(() => {});
  const url = new URL(req.url); const a = url.searchParams.get('a');
  try {
    if (a === 'connect') {
      if (!env('YT_CLIENT_ID')) return page('עוד לא מוכן', 'חסר מזהה החיבור של גוגל. צריך להשלים קודם את ההגדרה בגוגל קלאוד.');
      const q = new URLSearchParams({ client_id: env('YT_CLIENT_ID'), redirect_uri: SELF() + '?a=cb', response_type: 'code', scope: SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' });
      return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q, 302);
    }
    if (a === 'cb') {
      const code = url.searchParams.get('code'); if (!code) return page('החיבור בוטל', 'לא התקבל אישור מגוגל. אפשר לנסות שוב מהקישור.');
      const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: env('YT_CLIENT_ID'), client_secret: env('YT_CLIENT_SECRET'), redirect_uri: SELF() + '?a=cb', grant_type: 'authorization_code' }) });
      const j = await r.json(); if (!j.refresh_token) return page('משהו לא הסתדר', 'גוגל לא החזיר הרשאה קבועה. אפשר לנסות שוב מהקישור.');
      const { error } = await sb().from('app_secrets').upsert({ k: 'YT_REFRESH', v: j.refresh_token }, { onConflict: 'k' });
      if (error) return page('משהו לא הסתדר', 'לא הצלחתי לשמור את החיבור.');
      const ch = await channel(j.access_token);
      await merge('settings', 'pub', { ytConnected: { at: new Date().toISOString(), channel: ch } });
      await tg(`✅ ערוץ היוטיוב חובר למערכת${ch ? `: ${ch.title}` : ''}.`);
      return page('✓ היוטיוב מחובר', `הערוץ ${ch?.title || ''} מחובר למערכת של המשרד. אפשר לסגור את הדף.`);
    }
    if (a === 'status') { if (!env('YT_REFRESH')) return json({ connected: false }); return json({ connected: true, channel: await channel(await access()) }); }
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    if (url.searchParams.get('step') === 'publish') return json(await publish());
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
