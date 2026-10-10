// Buffer connection for the office (11.10.2026, Yakir: publish to Facebook, LinkedIn and X through Buffer instead of Grok Bot).
// action 'save' {key}: an office user pastes the Buffer API key in the publishing board. The key is tested against
//   the Buffer API (account, organizations, channels) and saved in app_secrets (BUFFER_API_KEY) only if it works.
// action 'status': what the board shows (settings/pub.buffer).
// cron (x-cron-secret) {action:'channels'}: re-reads the channels with the saved key.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { loadSecrets, env, admin, cors, json, telegram } from '../_shared/common.ts';

const API = 'https://api.buffer.com';
// deno-lint-ignore no-explicit-any
async function gql(key: string, query: string, variables: any = {}) {
  const r = await fetch(API, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  // deno-lint-ignore no-explicit-any
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d.errors) throw new Error((d.errors && d.errors[0] && d.errors[0].message) || `Buffer ${r.status}`);
  return d.data;
}
async function readChannels(key: string) {
  const a = await gql(key, '{ account { id name organizations { id name } } }');
  const orgs = (a && a.account && a.account.organizations) || [];
  const channels: { id: string; name: string; displayName: string; service: string; org: string; paused: boolean }[] = [];
  for (const o of orgs) {
    const c = await gql(key, 'query($i: ChannelsInput!) { channels(input: $i) { id name displayName service isQueuePaused } }', { i: { organizationId: o.id } });
    // deno-lint-ignore no-explicit-any
    (c.channels || []).forEach((x: any) => channels.push({ id: x.id, name: x.displayName || x.name, displayName: x.displayName || '', service: x.service, org: o.id, paused: !!x.isQueuePaused }));
  }
  return { account: a.account ? a.account.name : '', orgs: orgs.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })), channels };
}
async function isOffice(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!auth) return false;
  const u = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: ok, error } = await u.rpc('is_office_user'); return !error && ok === true;
}
// deno-lint-ignore no-explicit-any
const merge = (patch: any) => admin().rpc('docs_merge', { p_coll: 'settings', p_id: 'pub', p_patch: patch });
const SVC: Record<string, string> = { facebook: 'פייסבוק', linkedin: 'לינקדאין', twitter: 'X', instagram: 'אינסטגרם', tiktok: 'טיקטוק', youtube: 'יוטיוב', threads: 'Threads', pinterest: 'Pinterest', googlebusiness: 'גוגל עסקי', google: 'גוגל עסקי' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  // deno-lint-ignore no-explicit-any
  const b: any = await req.json().catch(() => ({}));
  const cron = env('CRON_SECRET') && req.headers.get('x-cron-secret') === env('CRON_SECRET');
  try {
    if (cron && b.action === 'channels') {
      const key = env('BUFFER_API_KEY'); if (!key) return json({ ok: false, error: 'no key' });
      const r = await readChannels(key);
      await merge({ buffer: { ok: true, check: 'done', checkedAt: new Date().toISOString(), account: r.account, orgs: r.orgs, channels: r.channels } });
      return json({ ok: true, ...r });
    }
    if (!(await isOffice(req))) return json({ error: 'אין הרשאה' }, 401);
    if (b.action === 'status') {
      const { data } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle();
      return json({ buffer: (data && data.data && data.data.buffer) || {}, hasKey: !!env('BUFFER_API_KEY') });
    }
    if (b.action === 'save') {
      const key = String(b.key || '').trim();
      if (key.length < 20 || /\s/.test(key)) return json({ error: 'המפתח לא נראה תקין' }, 400);
      let r;
      try { r = await readChannels(key); } catch (e) { return json({ error: 'Buffer לא קיבל את המפתח: ' + String((e as Error).message || e).slice(0, 160) }, 400); }
      const { error } = await admin().from('app_secrets').upsert({ k: 'BUFFER_API_KEY', v: key }, { onConflict: 'k' });
      if (error) return json({ error: 'השמירה נכשלה' }, 500);
      const now = new Date().toISOString();
      await merge({ buffer: { ok: true, check: 'done', saved: now, checkedAt: now, account: r.account, orgs: r.orgs, channels: r.channels } });
      const list = r.channels.map(c => `${SVC[c.service] || c.service}: ${c.name}`).join('\n');
      await telegram(`🔗 Buffer מחובר למערכת המשרד.\nהערוצים שנמצאו:\n${list || 'לא נמצאו ערוצים'}`).catch(() => false);
      return json({ ok: true, channels: r.channels });
    }
    return json({ error: 'action?' }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e).slice(0, 300) }, 500);
  }
});
