// audiopull (22.10.2026): copies a licensed music track (Mixkit free license) into docs tmpaud/<id>-<n> as base64 parts,
// so the video workspace (which cannot reach the web) can read it. Only assets.mixkit.co music files.
// POST (x-cron-secret) {items:[{id,url}]}.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const out: unknown[] = [];
  for (const it of (b.items || []).slice(0, 4)) {
    const url = String(it.url || ''), id = String(it.id || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
    if (!id || !/^https:\/\/assets\.mixkit\.co\/music\/\d+\/\d+\.mp3$/.test(url)) { out.push({ id, error: 'bad' }); continue; }
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' } }).catch(() => null);
    if (!r || !r.ok) { out.push({ id, error: r ? r.status : 'fetch' }); continue; }
    const bytes = new Uint8Array(await r.arrayBuffer());
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const b64 = btoa(s); const size = 700000; const parts = Math.ceil(b64.length / size);
    for (let p = 0; p < parts; p++) {
      const { error } = await admin().from('docs').upsert({ coll: 'tmpaud', id: id + '-' + p, data: { url, part: p, parts, b64: b64.slice(p * size, (p + 1) * size), at: new Date().toISOString() } });
      if (error) { out.push({ id, error: error.message }); break; }
    }
    out.push({ id, bytes: bytes.length, parts });
  }
  return json({ ok: true, out });
});
