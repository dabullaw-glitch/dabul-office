// Shared helpers for the office edge functions.
// The office rules (tasks, messages, automations) are the same JS files the app uses;
// loadEngine() reads them from the website's files.
import { createClient } from 'npm:@supabase/supabase-js@2';

// settings you type in the office app (keys, bot tokens) live in a private table only the server can read
const SECRETS: Record<string, string> = {};
export const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
let secretsAt = 0;
export async function loadSecrets() {
  if (Date.now() - secretsAt < 60_000) return;
  const { data } = await admin().from('app_secrets').select('k,v');
  (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; });
  secretsAt = Date.now();
}
// deno-lint-ignore no-explicit-any
let _admin: any = null;
export const admin = () => _admin || (_admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });

export const sanitize = (k: string) => k.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
export const uid = (p = 'x') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- run the app's rule engine without a browser ----------
// The rule files are the same ones the office website serves, so the server always runs exactly
// the version that is live on the site.
const BOOT = `const g = globalThis, noop = () => {};
g.window = g;
g.document = g.document || { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], body: {}, createElement: () => ({ style: {} }), documentElement: { dataset: {} } };
g.requestAnimationFrame = g.requestAnimationFrame || (f => setTimeout(f, 0));
g.localStorage = g.localStorage || { getItem: () => null, setItem: noop };
g.matchMedia = g.matchMedia || (() => ({ matches: false }));`;
const POST = `(function(){ const O = globalThis.O; O.V = O.V || {}; const _get = O.get;
O.get = (c, id) => c === 'outbox' && id ? _get(c, String(id).replace(/[^A-Za-z0-9_\\-.~:@+]/g, '_')) : _get(c, id); })();`;
// deno-lint-ignore no-explicit-any
let ENGINE: any = null;
// the website's files live in the app_files table (see the "app" function).
// Same rules as the website: a row "x.js@ver" replaces "x.js" (newest wins), and rows "x.js~pVER" hold small
// text edits applied on top, so the server always runs exactly what the office app runs.
export async function appFile(name: string) {
  const sb = admin();
  const { data: rows } = await sb.from('app_files').select('name').like('name', name.replace(/[\\%_]/g, '\\$&') + '%');
  const names = ((rows || []) as { name: string }[]).map(r => r.name);
  const vers = names.filter(n => n.startsWith(name + '@')).sort();
  const pats = names.filter(n => n.startsWith(name + '~p')).sort();
  let { data } = await sb.from('app_files').select('body,ctype').eq('name', vers.length ? vers[vers.length - 1] : name).maybeSingle();
  if (!data && env('APP_URL')) { const r = await fetch(env('APP_URL').replace(/\/?$/, '/') + 'app/' + name, { cache: 'no-store' }); if (r.ok) data = { body: await r.text(), ctype: 'text/plain' }; }
  if (!data) throw new Error('app file missing: ' + name);
  const b64 = String(data.ctype).endsWith(';base64');
  let body = String(data.body);
  if (!b64) for (const pn of pats) {
    const { data: p } = await sb.from('app_files').select('body').eq('name', pn).maybeSingle();
    let pairs: unknown = null; try { pairs = JSON.parse(String(p && p.body)); } catch { continue; }
    if (!Array.isArray(pairs)) continue;
    for (const x of pairs as unknown[]) {
      if (!Array.isArray(x) || typeof x[0] !== 'string' || typeof x[1] !== 'string' || !x[0]) continue;
      if (x[2] === 'all') body = body.split(x[0]).join(x[1]);
      else { const i = body.indexOf(x[0]); if (i >= 0) body = body.slice(0, i) + x[1] + body.slice(i + x[0].length); }
    }
  }
  return { text: () => body, bytes: () => b64 ? Uint8Array.from(atob(body), c => c.charCodeAt(0)) : new TextEncoder().encode(body) };
}
export async function loadEngine() {
  if (ENGINE) return ENGINE;
  const files = await Promise.all(['core.js', 'engine.js', 'auto.js', 'remind.js', 'sales.js'].map(n => appFile(n).then(r => r.text())));
  const run = (code: string) => (0, eval)(code);
  run(BOOT); run(files[0]); run(files[1]); run(POST); run(files[2]); run(files[3]); run(files[4]);
  // insolvency report reminders (optional file)
  try { run((await appFile('insolv.js')).text()); } catch (_) { /* not published yet */ }
  // deno-lint-ignore no-explicit-any
  ENGINE = (globalThis as any).O;
  return ENGINE;
}

export const COLLS = ['clients','deals','plans','tasks','leads','matters','faq','templates','signatures','documents','notes','outbox','content','settings','signreqs'];

// load every document into the engine and route its writes to the database
export async function loadData(O: any, only?: string[]) {
  const sb = admin();
  const data: Record<string, Record<string, unknown>> = {};
  COLLS.forEach(c => data[c] = {});
  let from = 0;
  for (;;) {
    let q = sb.from('docs').select('coll,id,data').range(from, from + 999);
    if (only) q = q.in('coll', only);
    const { data: rows, error } = await q;
    if (error) throw error;
    rows!.forEach((r: any) => { (data[r.coll] = data[r.coll] || {})[r.id] = r.data; });
    if (rows!.length < 1000) break;
    from += 1000;
  }
  const S = O.S;
  S.data = data;
  COLLS.forEach(c => S.loaded[c] = true);
  S.canEdit = true; S.connected = true; S.sample = null;
  S.db = {
    doc: (path: string) => {
      const i = path.indexOf('/'), coll = path.slice(0, i), id = path.slice(i + 1);
      return {
        set: async (d: unknown) => { const { error } = await sb.from('docs').upsert({ coll, id, data: d, updated_at: new Date().toISOString() }); if (error) throw error; },
        update: async (d: unknown) => { const { error } = await sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: d }); if (error) throw error; },
        delete: async () => { const { error } = await sb.from('docs').delete().match({ coll, id }); if (error) throw error; },
      };
    },
  };
  O.bump();
  return sb;
}

export async function telegram(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  return r.ok;
}
