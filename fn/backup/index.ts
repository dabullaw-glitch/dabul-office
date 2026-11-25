// backup (29.10.2026, Yakir approved): a daily backup of the whole database of the project (nws.co.il and the office system).
// Every table of the public schema, all rows, plus the list of scheduled jobs, saved as one gzip JSON file in the PRIVATE storage
// bucket 'backups': daily/YYYY-MM-DD.json.gz; on Sundays also weekly/YYYY-MM-DD.json.gz. Rotation (keep 7 daily, 4 weekly) is PAUSED
// since 25.11.2026: all files are kept until docs ops/backup-settings has prune=true (see pruneEnabled).
// The Supabase free plan has no automatic backups, so this is the way back after a mistaken delete or a bad change.
// Restore: download the file from the bucket, and insert the rows of the needed table (by hand, after checking).
// POST (x-cron-secret) {action:'run'} | {action:'list'}
// Off-site copy (29.10.2026, Yakir chose an encrypted copy in a private repository): POST {action:'offsite'} with the header
// x-gh-oidc = a GitHub Actions identity token of the private repository dabullaw-glitch/dabul-backups (audience 'dabul-backup').
// No secret is stored on GitHub: GitHub proves which repository and branch is asking. The answer is the newest daily file,
// encrypted with AES-256-GCM (key BACKUP_ENC_KEY in app_secrets; a copy of the key is kept by Yakir). File format: 'NWSBK1' + 12 byte
// iv + ciphertext. Decrypt with tools/decrypt.mjs in that repository.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const BUCKET = 'backups';
const KEEP_DAYS = 7, KEEP_WEEKS = 4; // 17.11.2026: 7 days and 4 weeks (used only when rotation is on, see pruneEnabled below)
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ilWeekday = () => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' }).format(new Date());

async function secret() {
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  return data?.v || '';
}

// 25.11.2026 (Yakir approved 21:01): the backup is written as a stream. From 17.11 the old run() (all rows parsed into one
// object, then JSON.stringify, then gzip) passed the 256 MB worker memory limit every night (code 546).
// Now each table is read page by page (PAGE rows, ordered by its primary key from rpc backup_table_keys), and the raw JSON
// text of each page goes straight from the database API into gzip, without parsing. Memory stays small whatever the size.
// The file format is unchanged: {"created","project","tables":{"<table>":[rows...]},"errors":{},"cron":[...]}.
const PAGE = 500;
const enc = new TextEncoder();
const REST = `${Deno.env.get('SUPABASE_URL')}/rest/v1/`;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Rotation switch (25.11.2026): deleting old files is PAUSED by default. Old files are deleted only when the row
// docs ops/backup-settings has data.prune = true (set it with docs_merge('ops','backup-settings','{"prune":true}')).
// Paused because the off-site copy in the private GitHub repository cannot be refreshed yet, so every file is kept.
async function pruneEnabled() {
  const { data } = await sb.from('docs').select('data').eq('coll', 'ops').eq('id', 'backup-settings').maybeSingle();
  return data?.data?.prune === true;
}

async function prune(folder: string, keep: number) {
  const { data } = await sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
  const files = (data || []).filter((f: Any) => /\.json\.gz$/.test(f.name)).map((f: Any) => f.name).sort().reverse();
  const old = files.slice(keep).map((n: string) => `${folder}/${n}`);
  if (old.length) await sb.storage.from(BUCKET).remove(old);
  return old.length;
}

// One page of a table as raw bytes of the JSON array without the outer [ ]. Rows are counted from Content-Range.
async function* pageBytes(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const HOLD = 16;
  let started = false, carry = new Uint8Array(0);
  for await (const ch of body) {
    let c = ch;
    if (!started) {
      let i = 0;
      while (i < c.length && (c[i] === 32 || c[i] === 10 || c[i] === 13 || c[i] === 9)) i++;
      if (i < c.length) { if (c[i] !== 91) throw new Error('page does not start with ['); i++; started = true; }
      c = c.subarray(i);
    }
    const all = new Uint8Array(carry.length + c.length); all.set(carry, 0); all.set(c, carry.length);
    if (all.length > HOLD) { yield all.slice(0, all.length - HOLD); carry = all.slice(all.length - HOLD); } else carry = all;
  }
  let e = carry.length;
  while (e > 0 && (carry[e - 1] === 32 || carry[e - 1] === 10 || carry[e - 1] === 13 || carry[e - 1] === 9)) e--;
  if (e === 0 || carry[e - 1] !== 93) throw new Error('page does not end with ]');
  if (e - 1 > 0) yield carry.slice(0, e - 1);
}

async function run() {
  const t0 = Date.now();
  const { data: tables, error } = await sb.rpc('backup_table_list');
  if (error) return { ok: false, error: error.message };
  const { data: keys } = await sb.rpc('backup_table_keys');
  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const unordered: string[] = [];
  async function* parts(): AsyncGenerator<Uint8Array> {
    yield enc.encode(`{"created":${JSON.stringify(new Date().toISOString())},"project":"mgjmnvpnovkewvqevjmz","tables":{`);
    let firstT = true;
    for (const t of tables as string[]) {
      yield enc.encode((firstT ? '' : ',') + JSON.stringify(t) + ':[');
      firstT = false;
      const pk: string[] = (keys || {})[t] || [];
      if (!pk.length) unordered.push(t);
      const order = pk.length ? '&order=' + pk.map((c) => encodeURIComponent(c) + '.asc').join(',') : '';
      let n = 0;
      for (let from = 0; ; from += PAGE) {
        const r = await fetch(`${REST}${encodeURIComponent(t)}?select=*${order}&limit=${PAGE}&offset=${from}`, {
          headers: { apikey: KEY, authorization: `Bearer ${KEY}`, accept: 'application/json' },
        });
        if (!r.ok || !r.body) { errors[t] = `${r.status} ${(await r.text().catch(() => '')).slice(0, 300)}`; break; }
        const m = /^(\d+)-(\d+)\//.exec(r.headers.get('content-range') || '');
        const got = m ? Number(m[2]) - Number(m[1]) + 1 : 0;
        if (got > 0) {
          if (n) yield enc.encode(',');
          for await (const b of pageBytes(r.body)) yield b;
        } else await r.body.cancel();
        n += got;
        if (got < PAGE) break;
      }
      counts[t] = n;
      yield enc.encode(']');
    }
    yield enc.encode('},"errors":' + JSON.stringify(errors));
    const { data: jobs } = await sb.rpc('backup_cron_jobs');
    yield enc.encode(',"cron":' + JSON.stringify(jobs || []) + '}');
  }
  const it = parts();
  const src = new ReadableStream<Uint8Array>({
    async pull(c) { const { value, done } = await it.next(); if (done) c.close(); else c.enqueue(value); },
  });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const ch of src.pipeThrough(new CompressionStream('gzip') as Any) as Any) { chunks.push(ch as Uint8Array); bytes += ch.length; }
  const gz = new Blob(chunks as Any[]);
  chunks.length = 0;
  const day = ilDay(new Date());
  const up = await sb.storage.from(BUCKET).upload(`daily/${day}.json.gz`, gz, { contentType: 'application/gzip', upsert: true });
  if (up.error) return { ok: false, error: up.error.message };
  let weekly = false;
  if (ilWeekday() === 'Sun') { await sb.storage.from(BUCKET).upload(`weekly/${day}.json.gz`, gz, { contentType: 'application/gzip', upsert: true }); weekly = true; }
  const doPrune = await pruneEnabled();
  const pruned = doPrune ? (await prune('daily', KEEP_DAYS)) + (await prune('weekly', KEEP_WEEKS)) : 0;
  const res = { ok: true, file: `daily/${day}.json.gz`, bytes, tables: Object.keys(counts).length, rows: Object.values(counts).reduce((a, b) => a + b, 0), counts, errors: Object.keys(errors), weekly, prune: doPrune, pruned, unordered, ms: Date.now() - t0, streamed: true };
  await sb.rpc('docs_merge', { p_coll: 'ops', p_id: 'backup-last', p_patch: res });
  return res;
}

const GH_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const OFFSITE_REPO = 'dabullaw-glitch/dabul-backups';
async function offsite(tok: string) {
  const { payload } = await jwtVerify(tok, GH_JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'dabul-backup' });
  if (payload.repository !== OFFSITE_REPO || payload.ref !== 'refs/heads/main') return J({ ok: false, error: 'repo' }, 403);
  const { data: files } = await sb.storage.from(BUCKET).list('daily', { limit: 100 });
  const name = (files || []).map((f: Any) => f.name).filter((n: string) => /\.json\.gz$/.test(n)).sort().pop();
  if (!name) return J({ ok: false, error: 'no backup' }, 404);
  const { data: blob, error } = await sb.storage.from(BUCKET).download(`daily/${name}`);
  if (error || !blob) return J({ ok: false, error: 'download' }, 500);
  const { data: k } = await sb.from('app_secrets').select('v').eq('k', 'BACKUP_ENC_KEY').maybeSingle();
  if (!k?.v) return J({ ok: false, error: 'key' }, 500);
  const raw = Uint8Array.from(atob(k.v), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await blob.arrayBuffer()));
  const out = new Uint8Array(6 + 12 + ct.length);
  out.set(new TextEncoder().encode('NWSBK1'), 0); out.set(iv, 6); out.set(ct, 18);
  await sb.rpc('docs_merge', { p_coll: 'ops', p_id: 'backup-offsite-last', p_patch: { at: new Date().toISOString(), file: name, bytes: out.length, run: payload.run_id || null } });
  return new Response(out, { headers: { 'content-type': 'application/octet-stream', 'x-backup-file': name.replace('.json.gz', '') } });
}

Deno.serve(async (req) => {
  const gh = req.headers.get('x-gh-oidc');
  if (gh) { try { return await offsite(gh); } catch (_e) { return J({ ok: false }, 401); } }
  const s = await secret();
  if (!s || req.headers.get('x-cron-secret') !== s) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'run') return J(await run());
    if (b.action === 'list') {
      const d = await sb.storage.from(BUCKET).list('daily', { limit: 100 }); const w = await sb.storage.from(BUCKET).list('weekly', { limit: 100 });
      return J({ ok: true, daily: (d.data || []).map((f: Any) => f.name), weekly: (w.data || []).map((f: Any) => f.name) });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
