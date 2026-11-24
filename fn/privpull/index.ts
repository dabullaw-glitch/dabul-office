// privpull (24.11.2026): moves Yakir's own voice recordings out of the public GitHub repo into PRIVATE storage
// (bucket "files", path private/twin/<name>). Yakir approved on 24.11.2026 ("כן" to moving the voice recordings to private storage).
// POST (x-cron-secret) {path: "media/twin/<name>.mp3"} -> fetches the file from the repo at a fixed commit and stores it.
// GET  (x-cron-secret) ?sign=<name>&sec=<n> -> a short-lived signed link (max 2 hours) for a tool that needs the file once.
// GET  ?gh=voice with Authorization: Bearer <GitHub Actions OIDC token> -> a 10-minute signed link to voice-pro.mp3, only for
//      the podcast-voice-test workflow of this repo on main (no stored secret needed; the token is signed by GitHub).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6';
const GH_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-cron-secret' };
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
async function secret() { const { data } = await db.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle(); return data?.v || ''; }
const COMMIT = '1800db562'; // a commit that still holds the files
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const u0 = new URL(req.url);
  if (req.method === 'GET' && u0.searchParams.get('gh') === 'voice') {
    try {
      const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      const { payload } = await jwtVerify(tok, GH_JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'dabul-privpull' });
      const ok = payload.repository === 'dabullaw-glitch/dabul-office' && payload.ref === 'refs/heads/main'
        && String(payload.job_workflow_ref || '').startsWith('dabullaw-glitch/dabul-office/.github/workflows/podcast-voice-test.yml@refs/heads/main');
      if (!ok) return json({ error: 'forbidden' }, 403);
      const { data, error } = await db.storage.from('files').createSignedUrl('private/twin/voice-pro.mp3', 600);
      return error ? json({ error: error.message }, 404) : json({ url: data.signedUrl });
    } catch (_e) { return json({ error: 'unauthorized' }, 401); }
  }
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
