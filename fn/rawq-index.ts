// rawq (11.10.2026): the editing queue of the teleprompter takes, for the weekly reels editor (Claude Code on Yakir's computer).
// The teleprompter uploads each take to the private bucket "files" (rawvideo/...) and lists it in docs coll "rawvid" (status new).
// The editor works from Google Drive, so a scheduled task calls this function and writes the queue into a Drive file
// ("תור לעריכה"), with download links valid for 8 days. Cron secret only.
//  POST {}                           -> {ok, items:[{id, title, script, part, parts, mode, sec, text, url, created, name, source, chunks}]}
//                                       (status new, oldest first)
//  POST {done:[{id, driveId, name}]} -> marks those takes 'edited' (with the Drive file of the edited reel) and deletes the raw
//                                       files from storage (the free plan has 1 GB; the raw video stays on Yakir's phone)
// 12.10.2026: Yakir can also upload videos he filmed with the phone camera (source 'upload'). The free plan takes at most 50 MB
// per file, so the teleprompter page uploads a big video in pieces of 45 MB (data.chunks = ['files/...p01', ...], in order).
// For those, "url" is one link to this function that joins the pieces back into the original file while downloading:
//  GET ?join=<id>&e=<expiry unix>&s=<signature>      (signed with CRON_SECRET, valid 8 days; no other access)
// "chunks" also lists a signed link per piece: if the joined link ever fails, download the pieces in order and join them
// (cat part1 part2 ... > video.mp4); the bytes are the original file.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const TTL = 8 * 24 * 3600;

async function sign(id: string, exp: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('CRON_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`join:${id}:${exp}`));
  return Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}
const paths = (d: { file?: string; chunks?: string[] }) => (Array.isArray(d.chunks) && d.chunks.length ? d.chunks : [d.file || ''])
  .map(String).filter(f => f.startsWith('files/')).map(f => f.slice(6));
const extOf = (d: { name?: string; mime?: string }) => {
  const m = String(d.name || '').match(/\.([A-Za-z0-9]{2,4})$/); if (m) return m[1].toLowerCase();
  return /quicktime/.test(String(d.mime || '')) ? 'mov' : /webm/.test(String(d.mime || '')) ? 'webm' : 'mp4';
};

// streams the pieces of one uploaded video, in order, as one file
async function join(u: URL) {
  const id = u.searchParams.get('join') || '', exp = Number(u.searchParams.get('e') || 0), s = u.searchParams.get('s') || '';
  if (!id || !exp || exp < Date.now() / 1000 || s !== await sign(id, exp)) return new Response('link expired or invalid', { status: 403 });
  const { data } = await sb().from('docs').select('data').match({ coll: 'rawvid', id }).maybeSingle();
  if (!data) return new Response('not found', { status: 404 });
  const d = data.data, list = paths(d);
  if (!list.length) return new Response('no file', { status: 404 });
  const urls: string[] = [];
  for (const p of list) { const { data: x } = await sb().storage.from('files').createSignedUrl(p, 3600); if (!x?.signedUrl) return new Response('piece missing', { status: 404 }); urls.push(x.signedUrl); }
  const body = new ReadableStream({
    async start(ctl) {
      try {
        for (const url of urls) {
          const r = await fetch(url); if (!r.ok || !r.body) throw new Error('piece ' + r.status);
          const rd = r.body.getReader();
          for (;;) { const { done, value } = await rd.read(); if (done) break; ctl.enqueue(value); }
        }
        ctl.close();
      } catch (e) { ctl.error(e); }
    }
  });
  const h: Record<string, string> = { 'content-type': String(d.mime || 'video/mp4').split(';')[0], 'content-disposition': `attachment; filename="${id}.${extOf(d)}"` };
  if (d.size) h['content-length'] = String(d.size);
  return new Response(body, { headers: h });
}

Deno.serve(async (req) => {
  await loadSecrets().catch(() => {});
  const u = new URL(req.url);
  if (req.method === 'GET' && u.searchParams.get('join')) return join(u);
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  // deno-lint-ignore no-explicit-any
  const b: any = await req.json().catch(() => ({}));
  try {
    if (Array.isArray(b.done)) {
      const now = new Date().toISOString(), out = [];
      for (const d of b.done.slice(0, 50)) {
        const id = String(d.id || ''); if (!id) continue;
        const { data } = await sb().from('docs').select('data').match({ coll: 'rawvid', id }).maybeSingle();
        if (!data) { out.push({ id, ok: false }); continue; }
        const del = paths(data.data);
        let removed = 0;
        if (del.length) { const { data: rm } = await sb().storage.from('files').remove(del); removed = (rm || []).length; }
        await sb().rpc('docs_merge', { p_coll: 'rawvid', p_id: id, p_patch: { status: 'edited', editedAt: now, editedDriveId: String(d.driveId || ''), editedName: String(d.name || ''), editedBy: 'claude-code', rawDeleted: removed > 0 ? now : '' } });
        out.push({ id, ok: true, rawDeleted: removed });
      }
      return json({ ok: true, done: out });
    }
    const { data } = await sb().from('docs').select('id,data').eq('coll', 'rawvid').eq('data->>status', 'new');
    // deno-lint-ignore no-explicit-any
    const rows = (data || []).sort((a: any, b: any) => String(a.data.created || '').localeCompare(String(b.data.created || '')));
    const items = [];
    for (const r of rows) {
      const d = r.data; let url = d.driveLink || ''; const chunks: string[] = [];
      const list = paths(d);
      if (list.length > 1) {
        const exp = Math.floor(Date.now() / 1000) + TTL;
        url = `${env('SUPABASE_URL')}/functions/v1/rawq?join=${encodeURIComponent(r.id)}&e=${exp}&s=${await sign(r.id, exp)}`;
        for (const p of list) { const { data: s } = await sb().storage.from('files').createSignedUrl(p, TTL, { download: true }); chunks.push(s?.signedUrl || ''); }
      } else if (list.length === 1) {
        const { data: s } = await sb().storage.from('files').createSignedUrl(list[0], TTL, { download: true });
        url = s?.signedUrl || '';
      }
      items.push({ id: r.id, title: d.title || '', script: d.script || '', part: d.part || 1, parts: d.parts || 1, mode: d.mode || 'full', sec: d.sec || 0, size: d.size || 0,
        text: d.text || '', source: d.source || 'teleprompter', name: d.name || '', url, chunks, created: d.created || '' });
    }
    return json({ ok: true, items });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
