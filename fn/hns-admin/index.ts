// hns-admin (28.10.2026): small admin actions for the HNS (nws.co.il) news engine. POST with x-cron-secret.
//   {action:'outlets'}                      the media outlet list (table hns_outlets, used by hns-write and hns-publish)
//   {action:'outlet_add', names:[...]}      add names (do not add common Hebrew words such as דבר, הון, הארץ or כאן alone)
//   {action:'outlet_remove', names:[...]}   remove names
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

Deno.serve(async (req) => {
  const { data: sec } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!sec?.v || req.headers.get('x-cron-secret') !== sec.v) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  const names = (Array.isArray(b.names) ? b.names : []).map((x: unknown) => String(x ?? '').trim()).filter(Boolean).slice(0, 50);
  if (b.action === 'outlet_add' && names.length) {
    const { data, error } = await sb.from('hns_outlets').upsert(names.map((name: string) => ({ name })), { onConflict: 'name' }).select('name');
    return J({ ok: !error, added: (data || []).map((r: Any) => r.name), error: error?.message });
  }
  if (b.action === 'outlet_remove' && names.length) {
    const { data, error } = await sb.from('hns_outlets').delete().in('name', names).select('name');
    return J({ ok: !error, removed: (data || []).map((r: Any) => r.name), error: error?.message });
  }
  if (b.action === 'outlets') {
    const { data } = await sb.from('hns_outlets').select('name').order('name');
    return J({ ok: true, outlets: (data || []).map((r: Any) => r.name) });
  }
  return J({ ok: false, error: 'unknown action' }, 400);
});
