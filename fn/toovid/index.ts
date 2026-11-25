// toovid (25.11.2026): Team of One lesson videos (pilot, lesson 1) in Yakir's own voice. Everything stays private.
// The job (slides + narration text, paid material) lives in docs coll 'toovideo', id <job> (office-only table).
// The narration mp3 (made by the function `voice`) and the finished mp4 live in the private bucket 'files', too/videos/<job>/.
// The render runs in the GitHub workflow too-video.yml, which proves who it is with GitHub's own signed token (OIDC):
//  GET  ?gh=job&id=<job>   -> {deck, narration, audio: 15-min signed link, upload: signed upload link for lesson.mp4}
//  POST ?gh=done {id, sec, bytes, bounds} -> docs toovideo/<job> gets status 'rendered' (docs_merge)
// With x-cron-secret:  GET ?sign=<job>&days=<1..30> -> signed link to the finished mp4 for Yakir's review.
// Nothing is published to members before Yakir approves; then ?attach=<job> (below) copies the mp4 to the members bucket.
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
  // After Yakir approves a lesson video: GET ?attach=<job>[&drop=1] copies files/too/videos/<job>/lesson.mp4 to the private
  // members bucket 'too' (videos/<job>/lesson.mp4), where the storage rule too_files_read lets only logged-in members with
  // access (or the admin) sign it. The lesson page signs it for 2 hours (src/lib/video.js, video_url "too:<path>").
  // drop=1 removes the review copy from 'files' once the members copy is checked. The lesson's video_url is set separately.
  const att = u.searchParams.get('attach');
  if (att !== null) {
    if (!okId(att)) return json({ error: 'bad id' }, 400);
    const src = `too/videos/${att}/lesson.mp4`, dst = `videos/${att}/lesson.mp4`;
    const { data: blob, error: e1 } = await db.storage.from('files').download(src);
    if (e1 || !blob) return json({ error: 'download: ' + (e1?.message || 'empty') }, 404);
    const bytes = blob.size;
    const { error: e2 } = await db.storage.from('too').upload(dst, blob, { upsert: true, contentType: 'video/mp4', cacheControl: '3600' });
    if (e2) return json({ error: 'upload: ' + e2.message }, 500);
    const { data: ls } = await db.storage.from('too').list(`videos/${att}`);
    const got = Number(ls?.find((f: { name: string }) => f.name === 'lesson.mp4')?.metadata?.size || 0);
    if (got !== bytes) return json({ error: `size check ${got} != ${bytes}` }, 500);
    let dropped = false;
    if (u.searchParams.get('drop') === '1') dropped = !(await db.storage.from('files').remove([src])).error;
    await db.rpc('docs_merge', { p_coll: 'toovideo', p_id: att, p_patch: { member: 'too:' + dst, attachedAt: new Date().toISOString(), reviewCopyDropped: dropped } });
    return json({ ok: true, video_url: 'too:' + dst, bytes, dropped });
  }
  const id = String(u.searchParams.get('sign') || '');
  if (!okId(id)) return json({ error: 'bad id' }, 400);
  const days = Math.min(30, Math.max(1, Number(u.searchParams.get('days')) || 7));
  const { data, error } = await db.storage.from('files').createSignedUrl(`too/videos/${id}/lesson.mp4`, days * 86400);
  return error ? json({ error: error.message }, 404) : json({ url: data.signedUrl, days });
});
