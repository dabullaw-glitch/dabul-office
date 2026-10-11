// morningprobe (11.10.2026): read-only check of the clearing (payment plugins) in Morning, for the online services.
// cron only (x-cron-secret). Reads GET /documents/info?type=320 and saves the plugin list to settings/pay.morning.plugins
// (id, name, active, ecommerce). When an active plugin with ecommerce appears, it tells Yakir on Telegram once.
import { loadSecrets, env, admin, cors, json, telegram } from '../_shared/common.ts';
const M = 'https://api.greeninvoice.co.il/api/v1';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const tr = await fetch(M + '/account/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: env('MORNING_API_ID'), secret: env('MORNING_API_SECRET') }) });
  // deno-lint-ignore no-explicit-any
  const tj: any = await tr.json().catch(() => ({}));
  if (!tj.token) return json({ ok: false, error: 'token ' + tr.status });
  const r = await fetch(M + '/documents/info?type=320', { headers: { authorization: `Bearer ${tj.token}` } });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  // deno-lint-ignore no-explicit-any
  const plugins = (j.paymentPlugins || []).map((p: any) => ({ id: p.id, name: p.friendlyName || p.name || '', active: !!p.active, ecommerce: p.ecommerce, ecommerceRequested: p.ecommerceRequested, type: p.type }));
  const { data: cur } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'pay' }).maybeSingle();
  const m = (cur && cur.data && cur.data.morning) || {};
  const ready = plugins.find((p: { active: boolean; ecommerce: unknown }) => p.active && p.ecommerce !== false);
  const patch = { morning: { ...m, plugins, pluginsAt: new Date().toISOString(), ...(ready ? { pluginId: ready.id, pluginName: ready.name } : {}) } };
  await admin().rpc('docs_merge', { p_coll: 'settings', p_id: 'pay', p_patch: patch });
  if (ready && !m.readyTold) {
    await admin().rpc('docs_merge', { p_coll: 'settings', p_id: 'pay', p_patch: { morning: { ...patch.morning, readyTold: new Date().toISOString() } } });
    await telegram(`💳 הסליקה במורנינג פעילה (${ready.name || 'Grow'}). אפשר לעשות הזמנת ניסיון בשירותים המקוונים.`).catch(() => false);
  }
  return json({ ok: true, status: r.status, plugins, ready: !!ready });
});
