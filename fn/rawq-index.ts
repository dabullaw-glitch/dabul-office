// rawq (11.10.2026): the editing queue of the teleprompter takes, for the weekly reels editor (Claude Code on Yakir's computer).
// The teleprompter uploads each take to the private bucket "files" (rawvideo/...) and lists it in docs coll "rawvid" (status new).
// The editor works from Google Drive, so a scheduled task calls this function and writes the queue into a Drive file
// ("תור לעריכה"), with download links valid for 8 days. Cron secret only.
//  POST {}                           -> {ok, items:[{id, title, script, part, parts, mode, sec, text, url, created}]}  (status new, oldest first)
//  POST {done:[{id, driveId, name}]} -> marks those takes 'edited' (with the Drive file of the edited reel)
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

Deno.serve(async (req) => {
  await loadSecrets().catch(() => {});
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
        await sb().rpc('docs_merge', { p_coll: 'rawvid', p_id: id, p_patch: { status: 'edited', editedAt: now, editedDriveId: String(d.driveId || ''), editedName: String(d.name || ''), editedBy: 'claude-code' } });
        out.push({ id, ok: true });
      }
      return json({ ok: true, done: out });
    }
    const { data } = await sb().from('docs').select('id,data').eq('coll', 'rawvid').eq('data->>status', 'new');
    // deno-lint-ignore no-explicit-any
    const rows = (data || []).sort((a: any, b: any) => String(a.data.created || '').localeCompare(String(b.data.created || '')));
    const items = [];
    for (const r of rows) {
      const d = r.data; let url = d.driveLink || '';
      const f = String(d.file || '');
      if (f.startsWith('files/')) {
        const { data: s } = await sb().storage.from('files').createSignedUrl(f.slice(6), 8 * 24 * 3600, { download: true });
        url = s?.signedUrl || '';
      }
      items.push({ id: r.id, title: d.title || '', script: d.script || '', part: d.part || 1, parts: d.parts || 1, mode: d.mode || 'full', sec: d.sec || 0, size: d.size || 0, text: d.text || '', source: d.source || 'teleprompter', url, created: d.created || '' });
    }
    return json({ ok: true, items });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
