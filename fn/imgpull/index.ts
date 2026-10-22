// imgpull (22.10.2026): copies a few images from the office website into docs tmpimg/<id> as base64, so the
// video workspace (which cannot reach the website directly) can read them. Only dabullaw.co.il addresses.
// POST (x-cron-secret) {items:[{id,url}]}. Read-only on the website.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const out: unknown[] = [];
  for (const it of (b.items || []).slice(0, 20)) {
    const url = String(it.url || ''), id = String(it.id || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
    if (!id || !/^https:\/\/dabullaw\.co\.il\/wp-content\/uploads\//.test(url)) { out.push({ id, error: 'bad' }); continue; }
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', accept: 'image/jpeg,image/png,image/*' } }).catch(() => null);
    if (!r || !r.ok) { out.push({ id, error: r ? r.status : 'fetch' }); continue; }
    const bytes = new Uint8Array(await r.arrayBuffer());
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const { error } = await admin().from('docs').upsert({ coll: 'tmpimg', id, data: { url, ct: r.headers.get('content-type'), size: bytes.length, b64: btoa(s), at: new Date().toISOString() } });
    out.push({ id, size: bytes.length, ct: r.headers.get('content-type'), error: error?.message });
  }
  return json({ ok: true, out });
});
