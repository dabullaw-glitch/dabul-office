// storeput (22.10.2026): copies a finished video from the office GitHub Pages site into private storage
// (bucket "files", path reels/<name>.mp4) so the publishing calendar can post it. POST (x-cron-secret) {url, name}.
// Only https://dabullaw-glitch.github.io/ mp4 files.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const url = String(b.url || ''), name = String(b.name || '').replace(/[^a-z0-9-]/gi, '').slice(0, 60);
  if (!/^https:\/\/(dabullaw-glitch\.github\.io\/|raw\.githubusercontent\.com\/dabullaw-glitch\/)[^?#]+\.mp4$/i.test(url) || !name) return json({ error: 'bad' }, 400);
  const r = await fetch(url).catch(() => null);
  if (!r || !r.ok) return json({ error: 'fetch ' + (r ? r.status : '') }, 502);
  const buf = new Uint8Array(await r.arrayBuffer());
  const path = 'reels/' + name + '.mp4';
  const up = await admin().storage.from('files').upload(path, buf, { contentType: 'video/mp4', upsert: true });
  if (up.error) return json({ error: up.error.message }, 500);
  return json({ ok: true, path, bytes: buf.length });
});
