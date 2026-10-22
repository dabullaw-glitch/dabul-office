// docmove: moves big, archived working documents (site backups, temporary work files) out of the docs table into
// private storage (bucket "files", folder docarchive/<coll>/<id>.json), and leaves a small pointer in the table.
// Why (22.10.2026): the office functions read the whole docs table page by page; the big backups made a page too
// heavy and the evening run failed on a database time limit. Nothing is lost: the full document is in storage, and
// the pointer says where (movedTo). Temporary transfer files (tmpaud, tmpimg) only get their base64 emptied.
// POST {"coll":"sitebak","limit":40}  (header x-cron-secret). Returns how many were moved and how many are left.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = ['sitebak', 'tmpwork', 'tmpaud', 'tmpimg', 'tmp', 'artbak'];
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: sec } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!sec || req.headers.get('x-cron-secret') !== sec.v) return json({ error: 'unauthorized' }, 401);
  const body = await req.json().catch(() => ({}));
  const coll = String(body.coll || ''), limit = Math.min(Math.max(+body.limit || 30, 1), 100);
  if (!ALLOWED.includes(coll)) return json({ error: 'coll not allowed' }, 400);
  // only documents not moved yet; ids first, then one at a time (some are large)
  const { data: ids, error } = await sb.from('docs').select('id').eq('coll', coll).is('data->>movedTo', null).order('id').limit(limit);
  if (error) return json({ error: error.message }, 500);
  let moved = 0, emptied = 0;
  const fails: string[] = [];
  for (const r of ids || []) {
    const { data: row } = await sb.from('docs').select('data').eq('coll', coll).eq('id', r.id).maybeSingle();
    if (!row) continue;
    // deno-lint-ignore no-explicit-any
    const d = (row.data || {}) as Record<string, any>;
    if (coll === 'tmpaud' || coll === 'tmpimg') {
      // temporary transfers that were already used: keep the record, drop the file content
      const { error: e } = await sb.rpc('docs_merge', { p_coll: coll, p_id: r.id, p_patch: { b64: '', movedTo: 'emptied (temporary transfer, already used)', movedAt: new Date().toISOString(), archived: true } });
      if (e) fails.push(r.id); else emptied++;
      continue;
    }
    const safe = r.id.replace(/[^A-Za-z0-9_\-.~]/g, '_');
    let hh = 0; for (const ch of r.id) hh = (hh * 31 + ch.codePointAt(0)!) >>> 0;
    const path = `docarchive/${coll}/${safe}${safe === r.id ? '' : '-' + hh.toString(36)}.json`;
    const up = await sb.storage.from('files').upload(path, new Blob([JSON.stringify({ coll, id: r.id, data: d })], { type: 'application/json' }), { upsert: true });
    if (up.error) { fails.push(r.id + ': ' + up.error.message); continue; }
    // check the stored copy before emptying the table row
    const chk = await sb.storage.from('files').download(path);
    if (chk.error) { fails.push(r.id + ': check ' + chk.error.message); continue; }
    const back = JSON.parse(await chk.data.text());
    if (JSON.stringify(back.data) !== JSON.stringify(d)) { fails.push(r.id + ': copy differs'); continue; }
    // deno-lint-ignore no-explicit-any
    const patch: Record<string, any> = { movedTo: 'files/' + path, movedAt: new Date().toISOString(), archived: true };
    // small values (ids, dates, short notes) stay readable in the table; anything big is emptied
    for (const [k, v] of Object.entries(d)) {
      if (k in patch) continue;
      const small = v === null || typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 200);
      if (!small) patch[k] = null;
    }
    const { error: e } = await sb.rpc('docs_merge', { p_coll: coll, p_id: r.id, p_patch: patch });
    if (e) fails.push(r.id + ': merge ' + e.message); else moved++;
  }
  const { count } = await sb.from('docs').select('id', { count: 'exact', head: true }).eq('coll', coll).is('data->>movedTo', null);
  return json({ ok: true, coll, moved, emptied, left: count, fails });
});
