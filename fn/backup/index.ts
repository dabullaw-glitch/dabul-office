// backup (29.10.2026, Yakir approved): a daily backup of the whole database of the project (nws.co.il and the office system).
// Every table of the public schema, all rows, plus the list of scheduled jobs, saved as one gzip JSON file in the PRIVATE storage
// bucket 'backups': daily/YYYY-MM-DD.json.gz, kept 14 days; on Sundays also weekly/YYYY-MM-DD.json.gz, kept 8 weeks.
// The Supabase free plan has no automatic backups, so this is the way back after a mistaken delete or a bad change.
// Restore: download the file from the bucket, and insert the rows of the needed table (by hand, after checking).
// POST (x-cron-secret) {action:'run'} | {action:'list'}
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const BUCKET = 'backups';
const KEEP_DAYS = 14, KEEP_WEEKS = 8;
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const ilWeekday = () => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' }).format(new Date());

async function secret() {
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  return data?.v || '';
}

async function dumpTable(t: string) {
  const rows: Any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(t).select('*').range(from, from + 999);
    if (error) return { error: error.message, rows };
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return { rows };
}

async function gzip(text: string) {
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function prune(folder: string, keep: number) {
  const { data } = await sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
  const files = (data || []).filter((f: Any) => /\.json\.gz$/.test(f.name)).map((f: Any) => f.name).sort().reverse();
  const old = files.slice(keep).map((n: string) => `${folder}/${n}`);
  if (old.length) await sb.storage.from(BUCKET).remove(old);
  return old.length;
}

async function run() {
  const t0 = Date.now();
  const { data: tables, error } = await sb.rpc('backup_table_list');
  if (error) return { ok: false, error: error.message };
  const out: Any = { created: new Date().toISOString(), project: 'mgjmnvpnovkewvqevjmz', tables: {}, errors: {} };
  const counts: Record<string, number> = {};
  for (const t of tables as string[]) {
    const r = await dumpTable(t);
    out.tables[t] = r.rows; counts[t] = r.rows.length;
    if (r.error) out.errors[t] = r.error;
  }
  const { data: jobs } = await sb.rpc('backup_cron_jobs');
  out.cron = jobs || [];
  const gz = await gzip(JSON.stringify(out));
  const day = ilDay(new Date());
  const up = await sb.storage.from(BUCKET).upload(`daily/${day}.json.gz`, gz, { contentType: 'application/gzip', upsert: true });
  if (up.error) return { ok: false, error: up.error.message };
  let weekly = false;
  if (ilWeekday() === 'Sun') { await sb.storage.from(BUCKET).upload(`weekly/${day}.json.gz`, gz, { contentType: 'application/gzip', upsert: true }); weekly = true; }
  const pruned = (await prune('daily', KEEP_DAYS)) + (await prune('weekly', KEEP_WEEKS));
  const res = { ok: true, file: `daily/${day}.json.gz`, bytes: gz.length, tables: Object.keys(counts).length, rows: Object.values(counts).reduce((a, b) => a + b, 0), errors: Object.keys(out.errors), weekly, pruned, ms: Date.now() - t0 };
  await sb.from('docs').upsert({ coll: 'ops', id: 'backup-last', data: res, updated_at: new Date().toISOString() }, { onConflict: 'coll,id' });
  return res;
}

Deno.serve(async (req) => {
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
