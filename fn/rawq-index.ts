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
// 12.10.2026 (later): big uploads from the phone browser stalled, so Yakir uploads videos to the Google Drive folder
// "גלם לעריכה - העלאה מהטלפון" (shared read-only with the office service account). Each new video there becomes a rawvid
// (id dr-<driveId>, source 'drive', status new); a file named like a script is matched to it and the script is marked filmed.
//  POST {scan:true}  (no secret, it only imports from that folder; the teleprompter and the office system call it on load)
//  GET ?drive=<id>&e=..&s=..  -> streams the Drive file (signed like join), so the editor gets one plain download link.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const TTL = 8 * 24 * 3600;
const RAW_FOLDER = '1RKXVlU9yG5QIdBbyDIsXT8PK6khi0Tbm';

const b64url = (b: ArrayBuffer | Uint8Array | string) => { const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer); let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
let tokCache = { t: '', exp: 0 };
async function gtoken() {
  if (tokCache.t && Date.now() < tokCache.exp) return tokCache.t;
  const sa = JSON.parse(env('GOOGLE_SA_JSON')), now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); if (!j.access_token) throw new Error('google token: ' + JSON.stringify(j).slice(0, 200));
  tokCache = { t: j.access_token, exp: Date.now() + 50 * 60e3 }; return j.access_token as string;
}
const norm = (x: string) => String(x || '').replace(/\.[A-Za-z0-9]{2,4}$/, '').replace(/[^\u0590-\u05FFA-Za-z0-9]+/g, ' ').trim();
// new videos in the Drive folder -> rawvid docs
async function scanDrive() {
  const q = encodeURIComponent(`'${RAW_FOLDER}' in parents and trashed=false and mimeType contains 'video/'`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=200&fields=files(id,name,size,mimeType,createdTime,videoMediaMetadata)`, { headers: { authorization: `Bearer ${await gtoken()}` } });
  const j = await r.json(); if (!r.ok) throw new Error('drive list: ' + (j.error?.message || r.status));
  // deno-lint-ignore no-explicit-any
  const files: any[] = j.files || []; if (!files.length) return { found: 0, added: 0 };
  const ids = files.map(f => 'dr-' + f.id);
  const { data: have } = await sb().from('docs').select('id').eq('coll', 'rawvid').in('id', ids);
  const known = new Set((have || []).map((x: { id: string }) => x.id));
  const { data: ps } = await sb().from('docs').select('id,data').eq('coll', 'prompt');
  // deno-lint-ignore no-explicit-any
  const prompts = (ps || []).filter((x: any) => !x.data.arch).map((x: any) => ({ id: x.id, t: norm(x.data.title), st: x.data.status }));
  let added = 0;
  for (const f of files) {
    if (known.has('dr-' + f.id)) continue;
    const n = norm(f.name);
    const hit = prompts.find(p => p.t.length >= 6 && n.length >= 6 && (n.includes(p.t) || p.t.includes(n)));
    const m = f.videoMediaMetadata || {};
    const now = new Date().toISOString();
    const { error } = await sb().from('docs').insert({ coll: 'rawvid', id: 'dr-' + f.id, updated_at: now, data: { source: 'drive', driveId: f.id, driveLink: `https://drive.google.com/file/d/${f.id}/view`,
      name: f.name, mime: f.mimeType || '', title: hit ? (ps || []).find((x: { id: string }) => x.id === hit.id)?.data?.title || n : n, script: hit ? hit.id : '', part: 1, parts: 1, mode: 'full', text: '',
      sec: m.durationMillis ? Math.round(Number(m.durationMillis) / 1000) : 0, w: m.width || 0, h: m.height || 0, size: Number(f.size || 0), status: 'new', created: f.createdTime || now } });
    if (error) continue;
    added++;
    if (hit && hit.st !== 'done') await sb().rpc('docs_merge', { p_coll: 'prompt', p_id: hit.id, p_patch: { status: 'filmed', filmedAt: now } });
  }
  return { found: files.length, added };
}
async function driveStream(u: URL) {
  const id = u.searchParams.get('drive') || '', exp = Number(u.searchParams.get('e') || 0), s = u.searchParams.get('s') || '';
  if (!id || !exp || exp < Date.now() / 1000 || s !== await sign(id, exp)) return new Response('link expired or invalid', { status: 403 });
  const { data } = await sb().from('docs').select('data').match({ coll: 'rawvid', id }).maybeSingle();
  if (!data?.data?.driveId) return new Response('not found', { status: 404 });
  const d = data.data;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${d.driveId}?alt=media`, { headers: { authorization: `Bearer ${await gtoken()}` } });
  if (!r.ok || !r.body) return new Response('drive ' + r.status, { status: 502 });
  const h: Record<string, string> = { 'content-type': r.headers.get('content-type') || 'video/mp4', 'content-disposition': `attachment; filename="${id}.${extOf(d)}"` };
  const cl = r.headers.get('content-length'); if (cl) h['content-length'] = cl;
  return new Response(r.body, { headers: h });
}

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization, apikey, x-client-info', 'access-control-allow-methods': 'POST, GET' } });
  if (req.method === 'GET' && u.searchParams.get('join')) return join(u);
  if (req.method === 'GET' && u.searchParams.get('drive')) return driveStream(u);
  if (req.method === 'POST' && u.searchParams.get('scan')) {
    try { const r = await scanDrive(); return new Response(JSON.stringify({ ok: true, ...r }), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }); }
    catch (e) { return new Response(JSON.stringify({ ok: false, error: String((e as Error).message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }); }
  }
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
    let scan = null; try { scan = await scanDrive(); } catch (e) { scan = { error: String((e as Error).message || e) }; }
    const { data } = await sb().from('docs').select('id,data').eq('coll', 'rawvid').eq('data->>status', 'new');
    // deno-lint-ignore no-explicit-any
    const rows = (data || []).sort((a: any, b: any) => String(a.data.created || '').localeCompare(String(b.data.created || '')));
    const items = [];
    for (const r of rows) {
      const d = r.data; let url = d.driveLink || ''; const chunks: string[] = [];
      const list = paths(d);
      if (d.driveId) {
        const exp = Math.floor(Date.now() / 1000) + TTL;
        url = `${env('SUPABASE_URL')}/functions/v1/rawq?drive=${encodeURIComponent(r.id)}&e=${exp}&s=${await sign(r.id, exp)}`;
      } else if (list.length > 1) {
        const exp = Math.floor(Date.now() / 1000) + TTL;
        url = `${env('SUPABASE_URL')}/functions/v1/rawq?join=${encodeURIComponent(r.id)}&e=${exp}&s=${await sign(r.id, exp)}`;
        for (const p of list) { const { data: s } = await sb().storage.from('files').createSignedUrl(p, TTL, { download: true }); chunks.push(s?.signedUrl || ''); }
      } else if (list.length === 1) {
        const { data: s } = await sb().storage.from('files').createSignedUrl(list[0], TTL, { download: true });
        url = s?.signedUrl || '';
      }
      items.push({ id: r.id, title: d.title || '', script: d.script || '', part: d.part || 1, parts: d.parts || 1, mode: d.mode || 'full', sec: d.sec || 0, size: d.size || 0,
        text: d.text || '', source: d.source || 'teleprompter', name: d.name || '', driveId: d.driveId || '', url, chunks, created: d.created || '' });
    }
    return json({ ok: true, scan, items });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
