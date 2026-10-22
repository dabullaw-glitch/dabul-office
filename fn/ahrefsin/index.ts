// ahrefsin (22.10.2026): one-time intake of the Ahrefs Site Audit tables that Yakir opened in his own Chrome
// (the free plan has no export). The page sends compact rows here; they are stored in docs ahrefs/<id>.
// Accepts only requests with the one-time key below; switched off after the import.
import { json, cors, admin } from '../_shared/common.ts';
const KEY = 'ah-7f3c9e2b41d84a6b9c05e1f2d3a4b5c6';
const ON = false; // import done 22.10.2026
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!ON) return json({ error: 'off' }, 410);
  const b = await req.json().catch(() => ({}));
  if (b.key !== KEY || !b.id) return json({ error: 'unauthorized' }, 401);
  const id = String(b.id).replace(/[^a-z0-9-]/gi, '').slice(0, 60);
  const { error } = await admin().rpc('docs_merge', { p_coll: 'ahrefs', p_id: id, p_patch: { at: new Date().toISOString(), ...b.data } });
  return json({ ok: !error, error: error?.message });
});
