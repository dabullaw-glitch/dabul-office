// privpull (24.11.2026): moves Yakir's own voice recordings out of the public GitHub repo into PRIVATE storage
// (bucket "files", path private/twin/<name>). Yakir approved on 24.11.2026 ("כן" to moving the voice recordings to private storage).
// POST (x-cron-secret) {path: "media/twin/<name>.mp3"} -> fetches the file from the repo at a fixed commit and stores it.
// GET  (x-cron-secret) ?sign=<name>&sec=<n> -> a short-lived signed link (max 2 hours) for a tool that needs the file once.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-cron-secret' };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
async function secret() { const { data } = await db.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle(); return data?.v || ''; }
const COMMIT = '1800db562'; // a commit that still holds the files
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const s = await secret();
  if (!s || req.headers.get('x-cron-secret') !== s) return json({ error: 'unauthorized' }, 401);
  const u = new URL(req.url);
  if (req.method === 'GET') {
    const name = String(u.searchParams.get('sign') || '');
    if (!/^[a-z0-9-]+\.(mp3|mp4|wav)$/i.test(name)) return json({ error: 'bad name' }, 400);
    const sec = Math.min(7200, Math.max(60, Number(u.searchParams.get('sec')) || 3600));
    const { data, error } = await db.storage.from('files').createSignedUrl('private/twin/' + name, sec);
    return error ? json({ error: error.message }, 404) : json({ url: data.signedUrl, expires_in: sec });
  }
  const b = await req.json().catch(() => ({}));
  const path = String(b.path || '');
  if (!/^media\/twin\/[a-z0-9-]+\.(mp3|mp4)$/i.test(path)) return json({ error: 'bad path' }, 400);
  const r = await fetch(`https://raw.githubusercontent.com/dabullaw-glitch/dabul-office/${COMMIT}/${path}`).catch(() => null);
  if (!r || !r.ok) return json({ error: 'fetch ' + (r ? r.status : 'failed') }, 502);
  const buf = new Uint8Array(await r.arrayBuffer());
  const name = path.split('/').pop()!;
  const { error } = await db.storage.from('files').upload('private/twin/' + name, buf, { upsert: true, contentType: name.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg' });
  return error ? json({ error: error.message }, 500) : json({ ok: true, stored: 'files/private/twin/' + name, bytes: buf.length });
});
