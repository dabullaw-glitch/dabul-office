// storeclean (17.11.2026, Yakir approved deleting the old reel copies in storage: "אוקיי"): removes files from the storage bucket
// 'files' under reels/ only (since 5.11.2026 every reel is published from its copy on GitHub Pages, these copies are not used).
// POST (x-cron-secret) {paths:[...], dry}. Answers what it removed. Nothing else can be removed through it.
// 25.11.2026 (Yakir approved 20:02 "כן": delete the old replaced videos of lessons 2-4 of the first-home course, and make the
// narration files smaller; the project is on the free plan, 1 GB):
//  POST (x-cron-secret) {action:'course-old', dry} -> removes ONLY the six files in COURSE_OLD (private bucket 'course'),
//      after checking each is not the current video/poster of any lesson in docs course/first-home. Answers paths + sizes.
//  GitHub Actions (OIDC token, audience 'dabul-storage', only .github/workflows/narr-recode.yml on main):
//    GET  ?gh=list -> the narration MP3 files under NARR (bucket, path, size) with a 1-hour signed download link
//    POST ?gh=up {files:[{bucket,path}]} -> a signed upload link to the SAME path (upsert, only paths under NARR), so the
//                     run writes the smaller copy in place.
//    POST ?gh=done {results:[...]} -> docs agents/storage-cleanup-2026-11-25 {narration} (docs_merge).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const GH_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const COURSE_OLD = [
  'first-home/fh-l02-b65200-3.mp4', 'first-home/fh-l02-b65200-3.jpg',
  'first-home/fh-l03-316678.mp4', 'first-home/fh-l03-316678.jpg',
  'first-home/fh-l04-a08245.mp4', 'first-home/fh-l04-a08245.jpg',
];
// narration only (text-to-speech output); never the voice-clone source recording under files/private/
const NARR: Record<string, string[]> = {
  pv: ['course/first-home', 'svcvo', 'ytvo', 'tts'],
  files: ['course/first-home', 'podcast', 'too/videos', 'reels/vr-voice-pilot', 'voice/test'],
};
// deno-lint-ignore no-explicit-any
type Any = any;
async function walk(bucket: string, prefix: string, out: Any[], depth = 0) {
  if (depth > 4) return;
  for (let off = 0; ; off += 1000) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000, offset: off });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const x of data || []) {
      const p = `${prefix}/${x.name}`;
      if (x.id === null) await walk(bucket, p, out, depth + 1);
      else if (/\.mp3$/i.test(x.name)) out.push({ bucket, path: p, size: Number(x.metadata?.size) || 0 });
    }
    if (!data || data.length < 1000) break;
  }
}
async function ghOk(req: Request) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { payload } = await jwtVerify(tok, GH_JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'dabul-storage' });
  return payload.repository === 'dabullaw-glitch/dabul-office' && payload.ref === 'refs/heads/main'
    && String(payload.job_workflow_ref || '').startsWith('dabullaw-glitch/dabul-office/.github/workflows/narr-recode.yml@refs/heads/main');
}
Deno.serve(async (req) => {
  const url = new URL(req.url); const gh = url.searchParams.get('gh');
  if (gh) {
    try { if (!(await ghOk(req))) return J({ ok: false, error: 'forbidden' }, 403); } catch (_e) { return J({ ok: false, error: 'unauthorized' }, 401); }
    if (gh === 'list') {
      const files: Any[] = [];
      for (const [bucket, prefixes] of Object.entries(NARR)) for (const p of prefixes) await walk(bucket, p, files);
      for (const bucket of Object.keys(NARR)) {
        const mine = files.filter((f) => f.bucket === bucket);
        for (let i = 0; i < mine.length; i += 200) {
          const { data } = await sb.storage.from(bucket).createSignedUrls(mine.slice(i, i + 200).map((f) => f.path), 3600);
          const by: Record<string, string> = {}; (data || []).forEach((x: Any) => { if (x?.signedUrl && !x.error) by[x.path] = x.signedUrl; });
          for (const f of mine.slice(i, i + 200)) f.dl = by[f.path] || '';
        }
      }
      return J({ ok: true, files });
    }
    if (gh === 'up' && req.method === 'POST') {
      const b = await req.json().catch(() => ({})); const out: Any[] = [];
      for (const f of (Array.isArray(b.files) ? b.files : []).slice(0, 1000)) {
        const bucket = String(f.bucket || ''), path = String(f.path || '');
        if (!NARR[bucket] || !/\.mp3$/i.test(path) || path.includes('..') || !NARR[bucket].some((p) => path.startsWith(p + '/'))) continue;
        const u = await sb.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });
        if (u.data?.signedUrl) out.push({ bucket, path, up: u.data.signedUrl });
      }
      return J({ ok: true, files: out });
    }
    if (gh === 'done' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const results = (Array.isArray(b.results) ? b.results : []).slice(0, 2000);
      await sb.rpc('docs_merge', { p_coll: 'agents', p_id: 'storage-cleanup-2026-11-25', p_patch: { narration: { at: new Date().toISOString(), run: String(b.run || ''), summary: b.summary || null, results } } });
      return J({ ok: true, n: results.length });
    }
    return J({ ok: false, error: 'gh?' }, 400);
  }
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!data?.v || req.headers.get('x-cron-secret') !== data.v) return J({ ok: false }, 401);
  const b = await req.json().catch(() => ({}));
  if (b.action === 'course-old') {
    const { data: cd } = await sb.from('docs').select('data').match({ coll: 'course', id: 'first-home' }).maybeSingle();
    const live = new Set<string>();
    for (const l of (cd?.data?.lessons || [])) for (const k of ['video', 'poster']) if (typeof l[k] === 'string') live.add(l[k]);
    const clash = COURSE_OLD.filter((p) => live.has(`sb:course/${p}`));
    if (clash.length) return J({ ok: false, error: 'still in use', clash }, 409);
    const { data: list } = await sb.storage.from('course').list('first-home', { limit: 1000 });
    const sizes: Record<string, number> = {};
    for (const x of list || []) sizes[`first-home/${x.name}`] = Number(x.metadata?.size) || 0;
    const found = COURSE_OLD.filter((p) => p in sizes).map((p) => ({ path: p, bytes: sizes[p] }));
    if (b.dry) return J({ ok: true, dry: true, found });
    const { data: removed, error } = await sb.storage.from('course').remove(found.map((f) => f.path));
    return J({ ok: !error, error: error?.message, removed: (removed || []).map((r: Any) => r.name), found });
  }
  const paths = (Array.isArray(b.paths) ? b.paths : []).map(String).filter((p: string) => /^reels\/[A-Za-z0-9_.\-]+\.mp4$/.test(p)).slice(0, 100);
  if (b.dry) return J({ ok: true, dry: true, paths });
  const { data: removed, error } = await sb.storage.from('files').remove(paths);
  return J({ ok: !error, error: error?.message, removed: (removed || []).length });
});
