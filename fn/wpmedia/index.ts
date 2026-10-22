// wpmedia (22.10.2026): uploads an image from the office GitHub Pages site into the WordPress media library
// (the video/site workspace cannot reach the website directly). POST (x-cron-secret) {items:[{url,filename,alt,title}]}.
// Only https://dabullaw-glitch.github.io/ sources; jpg/png/webp. Adds media only, changes nothing else.
import { loadSecrets, json, cors, env } from '../_shared/common.ts';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const auth = 'Basic ' + btoa(env('WP_USER') + ':' + env('WP_APP_PASSWORD').replace(/ /g, ''));
  const b = await req.json().catch(() => ({}));
  const out: unknown[] = [];
  for (const it of (b.items || []).slice(0, 6)) {
    const url = String(it.url || ''), fn = String(it.filename || '').replace(/[^a-z0-9._-]/gi, '');
    if (!/^https:\/\/dabullaw-glitch\.github\.io\/[^?#]+\.(jpe?g|png|webp)$/i.test(url) || !fn) { out.push({ url, error: 'bad' }); continue; }
    const r = await fetch(url).catch(() => null);
    if (!r || !r.ok) { out.push({ url, error: r ? r.status : 'fetch' }); continue; }
    const bytes = new Uint8Array(await r.arrayBuffer());
    const ct = /\.png$/i.test(fn) ? 'image/png' : /\.webp$/i.test(fn) ? 'image/webp' : 'image/jpeg';
    const up = await fetch('https://dabullaw.co.il/wp-json/wp/v2/media', { method: 'POST', headers: { authorization: auth, 'user-agent': UA, 'content-type': ct, 'content-disposition': `attachment; filename="${fn}"` }, body: bytes });
    const j = await up.json().catch(() => ({}));
    if (!up.ok) { out.push({ url, status: up.status, error: j?.message || 'upload' }); continue; }
    if (it.alt || it.title) {
      await fetch(`https://dabullaw.co.il/wp-json/wp/v2/media/${j.id}`, { method: 'POST', headers: { authorization: auth, 'user-agent': UA, 'content-type': 'application/json' }, body: JSON.stringify({ alt_text: it.alt || '', title: it.title || '' }) }).catch(() => null);
    }
    out.push({ id: j.id, source_url: j.source_url, w: j.media_details?.width, h: j.media_details?.height });
  }
  return json({ ok: true, out });
});
