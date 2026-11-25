// narrpriv (25.11.2026, one-off, DISABLED after use: the deployed function now answers 410; Yakir approved 25.11.2026 21:32 "כן"): moves the paid first-home course narration
// (lessons 2-10, bucket 'pv' = PUBLIC) to the PRIVATE bucket 'files' under the same path, and keeps a private copy of the
// podcast episode files before they are taken off GitHub Pages. Cron secret only. Never returns or logs a signed link.
//  POST {action:'copy', lesson:n}    -> copy pv/course/first-home/lNN-*.mp3 to files/<same path>, sha256 of both compared
//  POST {action:'verify', lesson:n}  -> every deck ref of lesson n is sb:files/..., signed (2 h, like academy) and answers 200/206
//  POST {action:'delete', lesson:n}  -> removes the pv copy ONLY when the files copy has the same sha256 and the deck no
//                                       longer points at the pv URL
//  POST {action:'podcast', ep:'ep04'} -> copies media/podcast/<ep>.mp3/.mp4 from GitHub Pages to files/podcast/<ep>/<ep>.mp3/.mp4
//                                       (sha256 + git blob sha1 of the source, sha256 of the stored copy)
import { createClient } from 'npm:@supabase/supabase-js@2';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });
const PATH = /^course\/first-home\/l(0[2-9]|10)-s\d\d-[0-9a-f]{10}\.mp3$/;
const PUB = 'https://mgjmnvpnovkewvqevjmz.supabase.co/storage/v1/object/public/pv/';
const REF_OK = /^sb:files\/course\/[a-z0-9-]+\/[a-z0-9-]+\.mp3$/;   // the academy's own check (fn/academy/index.ts)
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
const sha256 = async (u: Uint8Array) => hex(await crypto.subtle.digest('SHA-256', u));
async function dl(bucket: string, path: string): Promise<Uint8Array | null> {
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
async function list(n: number) {
  const nn = String(n).padStart(2, '0');
  const { data, error } = await sb.storage.from('pv').list('course/first-home', { limit: 1000, search: `l${nn}-` });
  if (error) throw new Error('list: ' + error.message);
  return (data || []).map((x: { name: string }) => `course/first-home/${x.name}`).filter((p: string) => PATH.test(p) && p.includes(`/l${nn}-`));
}
async function lessonDeck(n: number) {
  const { data } = await sb.from('docs').select('data').match({ coll: 'course', id: 'first-home' }).single();
  const l = (data.data.lessons || []).find((x: { n: number }) => +x.n === n);
  return l;
}
Deno.serve(async (req) => {
  const { data: s } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').single();
  if (!s?.v || req.headers.get('x-cron-secret') !== s.v) return J({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === 'podcast') {
      const ep = String(b.ep || ''); if (!/^ep\d{2}$/.test(ep)) return J({ ok: false, error: 'bad ep' }, 400);
      const out: unknown[] = [];
      for (const ext of ['mp3', 'mp4']) {
        const r = await fetch(`https://dabullaw-glitch.github.io/dabul-office/media/podcast/${ep}.${ext}`);
        if (!r.ok) { out.push({ ext, ok: false, status: r.status }); continue; }
        let src: Uint8Array | null = new Uint8Array(await r.arrayBuffer());
        const head = new TextEncoder().encode(`blob ${src.length}\0`); const g = new Uint8Array(head.length + src.length); g.set(head); g.set(src, head.length);
        const gitSha1 = hex(await crypto.subtle.digest('SHA-1', g));
        const shaSrc = await sha256(src); const bytes = src.length;
        const path = `podcast/${ep}/${ep}.${ext}`;
        const up = await sb.storage.from('files').upload(path, src, { upsert: true, contentType: ext === 'mp3' ? 'audio/mpeg' : 'video/mp4' });
        src = null;
        if (up.error) { out.push({ ext, ok: false, error: up.error.message }); continue; }
        const back = await dl('files', path);
        const shaStored = back ? await sha256(back) : '';
        out.push({ ext, path: 'files/' + path, bytes, gitSha1, sha256: shaSrc, stored: shaStored, ok: shaStored === shaSrc });
      }
      return J({ ok: out.every((x: any) => x.ok), files: out });
    }
    const n = +b.lesson; if (!(n >= 2 && n <= 10)) return J({ ok: false, error: 'lesson must be 2..10 (lesson 1 is free and stays public)' }, 400);
    if (b.action === 'copy') {
      const paths = await list(n), out: unknown[] = [];
      for (const p of paths) {
        const a = await dl('pv', p); if (!a) { out.push({ p, ok: false, error: 'pv read' }); continue; }
        const ha = await sha256(a);
        let bb = await dl('files', p);
        if (!bb) {
          const up = await sb.storage.from('files').upload(p, a, { upsert: false, contentType: 'audio/mpeg' });
          if (up.error) { out.push({ p, ok: false, error: up.error.message }); continue; }
          bb = await dl('files', p);
        }
        const hb = bb ? await sha256(bb) : '';
        out.push({ p, bytes: a.length, sha256: ha, ok: ha === hb });
      }
      return J({ ok: out.length > 0 && out.every((x: any) => x.ok), lesson: n, count: out.length, files: out });
    }
    if (b.action === 'verify') {
      const l = await lessonDeck(n); const refs: string[] = [];
      for (const sc of (l?.deck?.scenes || [])) for (const k of ['audio', 'gaudio']) if (sc[k]) refs.push(String(sc[k]));
      const bad = refs.filter((r) => !REF_OK.test(r));
      const paths = refs.filter((r) => REF_OK.test(r)).map((r) => r.slice('sb:files/'.length));
      const { data } = await sb.storage.from('files').createSignedUrls(paths, 2 * 3600);
      let okN = 0; const fails: unknown[] = [];
      for (const x of data || []) {
        if (!x?.signedUrl || x.error) { fails.push({ p: x?.path, error: 'no signed link' }); continue; }
        const r = await fetch(x.signedUrl, { headers: { range: 'bytes=0-1' } }); await r.body?.cancel();
        if (r.status === 200 || r.status === 206) okN++; else fails.push({ p: x.path, status: r.status });
      }
      const pubLeft: unknown[] = [];
      for (const p of paths) { const r = await fetch(PUB + p, { headers: { range: 'bytes=0-1' } }); await r.body?.cancel(); if (r.status < 400) pubLeft.push({ p, status: r.status }); }
      return J({ ok: bad.length === 0 && fails.length === 0 && okN === paths.length, lesson: n, refs: refs.length, notPrivate: bad.length, signedOk: okN, fails, publicStillAnswers: pubLeft.length });
    }
    if (b.action === 'delete') {
      const l = await lessonDeck(n); const deckTxt = JSON.stringify(l?.deck || {});
      const paths = await list(n), out: unknown[] = [];
      for (const p of paths) {
        if (deckTxt.includes(PUB + p)) { out.push({ p, ok: false, error: 'deck still points at the public file' }); continue; }
        if (!deckTxt.includes(`sb:files/${p}`)) { out.push({ p, ok: false, error: 'deck has no private ref for it' }); continue; }
        const a = await dl('pv', p), bb = await dl('files', p);
        if (!a || !bb) { out.push({ p, ok: false, error: 'missing copy' }); continue; }
        const ha = await sha256(a), hb = await sha256(bb);
        if (ha !== hb) { out.push({ p, ok: false, error: 'sha256 differs' }); continue; }
        const { error } = await sb.storage.from('pv').remove([p]);
        out.push({ p, sha256: ha, ok: !error, error: error?.message });
      }
      return J({ ok: out.every((x: any) => x.ok), lesson: n, removed: out.filter((x: any) => x.ok).length, files: out });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
