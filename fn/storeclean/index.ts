// storeclean (17.11.2026, Yakir approved deleting the old reel copies in storage: "אוקיי"): removes files from the storage bucket
// 'files' under reels/ only (since 5.11.2026 every reel is published from its copy on GitHub Pages, these copies are not used).
// POST (x-cron-secret) {paths:[...], dry}. Answers what it removed. Nothing else can be removed through it.
import { createClient } from 'npm:@supabase/supabase-js@2';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
Deno.serve(async (req) => {
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!data?.v || req.headers.get('x-cron-secret') !== data.v) return J({ ok: false }, 401);
  const b = await req.json().catch(() => ({}));
  const paths = (Array.isArray(b.paths) ? b.paths : []).map(String).filter((p: string) => /^reels\/[A-Za-z0-9_.\-]+\.mp4$/.test(p)).slice(0, 100);
  if (b.dry) return J({ ok: true, dry: true, paths });
  const { data: removed, error } = await sb.storage.from('files').remove(paths);
  return J({ ok: !error, error: error?.message, removed: (removed || []).length });
});
