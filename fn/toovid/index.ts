// toovid (25.11.2026): Team of One lesson videos (pilot, lesson 1) in Yakir's own voice. Everything stays private.
// The job (slides + narration text, paid material) lives in docs coll 'toovideo', id <job> (office-only table).
// The narration mp3 (made by the function `voice`) and the finished mp4 live in the private bucket 'files', too/videos/<job>/.
// The render runs in the GitHub workflow too-video.yml, which proves who it is with GitHub's own signed token (OIDC):
//  GET  ?gh=job&id=<job>   -> {deck, narration, audio: 15-min signed link, upload: signed upload link for lesson.mp4}
//  POST ?gh=done {id, sec, bytes, bounds} -> docs toovideo/<job> gets status 'rendered' (docs_merge)
// With x-cron-secret:  GET ?sign=<job>&days=<1..30> -> signed link to the finished mp4 for Yakir's review.
// Nothing is published to members here; the lesson's video_url is set only after Yakir approves.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6';
const GH_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const okId = (s: string) => /^[a-z0-9-]{1,40}$/.test(s);
async function gh(req: Request) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { payload } = await jwtVerify(tok, GH_JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'dabul-toovid' });
  return payload.repository === 'dabullaw-glitch/dabul-office' && payload.ref === 'refs/heads/main'
    && String(payload.job_workflow_ref || '').startsWith('dabullaw-glitch/dabul-office/.github/workflows/too-video.yml@refs/heads/main');
}
Deno.serve(async (req) => {
  const u = new URL(req.url);
  const mode = u.searchParams.get('gh');
  if (mode) {
    try { if (!(await gh(req))) return json({ error: 'forbidden' }, 403); } catch (_e) { return json({ error: 'unauthorized' }, 401); }
    if (mode === 'job') {
      const id = String(u.searchParams.get('id') || '');
      if (!okId(id)) return json({ error: 'bad id' }, 400);
      const { data: row } = await db.from('docs').select('data').match({ coll: 'toovideo', id }).maybeSingle();
      if (!row?.data?.deck || !row?.data?.narration) return json({ error: 'no job' }, 404);
      const base = `too/videos/${id}/`;
      const { data: a, error: e1 } = await db.storage.from('files').createSignedUrl(base + 'narration.mp3', 900);
      if (e1) return json({ error: 'audio: ' + e1.message }, 404);
      const { data: up, error: e2 } = await db.storage.from('files').createSignedUploadUrl(base + 'lesson.mp4', { upsert: true });
      if (e2) return json({ error: 'upload: ' + e2.message }, 500);
      return json({ deck: row.data.deck, narration: row.data.narration, audio: a.signedUrl, upload: up.signedUrl });
    }
    if (mode === 'done' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const id = String(b.id || '');
      if (!okId(id)) return json({ error: 'bad id' }, 400);
      const patch = { status: 'rendered', renderedAt: new Date().toISOString(), video: `files/too/videos/${id}/lesson.mp4`,
        sec: Number(b.sec) || null, bytes: Number(b.bytes) || null, bounds: Array.isArray(b.bounds) ? b.bounds.slice(0, 60) : null };
      const { error } = await db.rpc('docs_merge', { p_coll: 'toovideo', p_id: id, p_patch: patch });
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }
    return json({ error: 'mode?' }, 400);
  }
  const { data: s } = await db.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!s?.v || req.headers.get('x-cron-secret') !== s.v) return json({ error: 'unauthorized' }, 401);
  const id = String(u.searchParams.get('sign') || '');
  if (!okId(id)) return json({ error: 'bad id' }, 400);
  const days = Math.min(30, Math.max(1, Number(u.searchParams.get('days')) || 7));
  const { data, error } = await db.storage.from('files').createSignedUrl(`too/videos/${id}/lesson.mp4`, days * 86400);
  return error ? json({ error: error.message }, 404) : json({ url: data.signedUrl, days });
});
