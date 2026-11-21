// gscq (21.11.2026): read-only Search Console query for dabullaw.co.il, for diagnostics from SQL
// (which pages show for which queries, by date range, device). Yakir asked to check why two articles dropped.
// POST {startDate, endDate, dimensions[], dimensionFilterGroups?, rowLimit?, type?}  -> Search Console rows.
// Auth: x-cron-secret. Scope webmasters.readonly: it cannot change anything.
import { createClient } from 'npm:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const S: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || S[k] || '';
async function secrets() {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'GOOGLE_SA_JSON', 'GSC_SITE']);
  (data || []).forEach((r: { k: string; v: string }) => { S[r.k] = r.v; });
}
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function token(): Promise<string> {
  const sa = JSON.parse(env('GOOGLE_SA_JSON')); const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` })).json();
  if (!t.access_token) throw new Error('token'); return t.access_token;
}
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
Deno.serve(async (req) => {
  await secrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b: Any = await req.json().catch(() => ({}));
  const body: Any = { startDate: b.startDate, endDate: b.endDate, dimensions: b.dimensions || ['query'], rowLimit: Math.min(Number(b.rowLimit || 100), 1000), dataState: 'all' };
  if (b.dimensionFilterGroups) body.dimensionFilterGroups = b.dimensionFilterGroups;
  if (b.type) body.type = b.type;
  try {
    const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env('GSC_SITE'))}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); return json({ status: r.status, rows: j.rows || [], error: j.error ? j.error.message : undefined });
  } catch (e) { return json({ error: String((e as Error).message || e) }, 500); }
});
