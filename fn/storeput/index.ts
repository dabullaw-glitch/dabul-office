// storeput (22.10.2026): used to copy a finished video from the office GitHub Pages site into private storage
// (bucket "files", path reels/<name>.mp4) so the publishing calendar could post it. POST (x-cron-secret) {url, name}.
// 5.11.2026 (Yakir: the storage is full, free plan, no paid plan): nothing is copied to storage any more. The calendar
// publishes straight from the public link: put the GitHub Pages link in "videoUrl" on the pub row (fn/_shared/video-src.js).
// This answers with that link (after checking it is there), so an old caller gets what to write instead of a storage path.
import { loadSecrets, json, cors, env } from '../_shared/common.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const url = String(b.url || '');
  if (!/^https:\/\/dabullaw-glitch\.github\.io\/[^?#\s]+\.mp4$/i.test(url)) return json({ error: 'bad: only an mp4 link on https://dabullaw-glitch.github.io/ (nothing is copied to storage since 5.11.2026)' }, 400);
  const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
  if (!r || !r.ok) return json({ error: 'not on GitHub Pages yet: ' + (r ? r.status : 'failed') }, 502);
  return json({ ok: true, stored: false, videoUrl: url, bytes: Number(r.headers.get('content-length') || 0), note: 'storage is full (5.11.2026): write videoUrl on the pub row; no storage copy was made' });
});
