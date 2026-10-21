// gscinspect (21.10.2026): asks Google itself (Search Console URL Inspection API, read only, free quota 2,000 a day)
// how it sees each page of dabullaw.co.il: indexed or not and why, the canonical Google chose vs ours, last crawl,
// robots and rich-result (FAQ, breadcrumbs) problems. Replaces the paid Ahrefs export. No site changes, no AI calls.
// POST ?step=urls             reads the Yoast sitemaps -> docs gscinspect/urls {urls[]}
// POST ?step=run {offset,n}   inspects n urls (default 40) from offset -> docs gscinspect/r-<offset>
// POST ?step=sum              summary of all results -> docs gscinspect/summary
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const doc = async (coll: string, id: string): Promise<Any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let tok: { v: string; exp: number } | null = null;
async function token(): Promise<string> {
  if (tok && tok.exp > Date.now() + 60_000) return tok.v;
  const sa = JSON.parse(env('GOOGLE_SA_JSON'));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('google token: ' + JSON.stringify(j).slice(0, 200));
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tok.v;
}
async function urls() {
  const get = async (u: string) => (await fetch(u, { headers: { 'user-agent': UA } })).text();
  const idx = await get('https://dabullaw.co.il/sitemap_index.xml');
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const out = new Set<string>();
  for (const m of maps) { const x = await get(m); for (const l of x.matchAll(/<loc>([^<]+)<\/loc>/g)) { const u = l[1].trim(); if (!/\.(jpe?g|png|webp|gif|svg)$/i.test(u)) out.add(u); } }
  const list = [...out];
  await merge('gscinspect', 'urls', { at: new Date().toISOString(), maps, urls: list });
  return { maps: maps.length, urls: list.length };
}
async function run(offset: number, n: number) {
  const all: string[] = (await doc('gscinspect', 'urls'))?.urls || [];
  const part = all.slice(offset, offset + n); const res: Any[] = [];
  const t = await token();
  const one = async (u: string): Promise<Any> => {
    const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: u.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase()), siteUrl: env('GSC_SITE'), languageCode: 'he' }) });
    const j: Any = await r.json().catch(() => ({}));
    if (!r.ok) return { u, error: `${r.status} ${String(j?.error?.message || '').slice(0, 160)}` };
    const x = j.inspectionResult || {}; const ix = x.indexStatusResult || {}; const rich = x.richResultsResult || {};
    return { u, verdict: ix.verdict, coverage: ix.coverageState, indexing: ix.indexingState, robots: ix.robotsTxtState, fetch: ix.pageFetchState,
      lastCrawl: ix.lastCrawlTime, userCanonical: ix.userCanonical, googleCanonical: ix.googleCanonical, sitemap: (ix.sitemap || []).length > 0, referring: (ix.referringUrls || []).length,
      rich: rich.verdict || null, richIssues: (rich.detectedItems || []).flatMap((d: Any) => (d.items || []).flatMap((it: Any) => (it.issues || []).map((s: Any) => `${d.richResultType}: ${s.issueMessage} (${s.severity})`))).slice(0, 6) };
  };
  // Hebrew addresses: Yoast writes %d7.. in lower case, Google knows them only as %D7.. (lower case = "unknown to Google")
  // 8 at a time (Google allows 600 a minute per site), so 40 pages take about 20 seconds
  for (let i = 0; i < part.length; i += 8) {
    const got = await Promise.all(part.slice(i, i + 8).map((u) => one(u).catch((e) => ({ u, error: String((e as Error).message || e).slice(0, 160) }))));
    res.push(...got); if (got.some((g: Any) => String(g.error || '').startsWith('429'))) break;
  }
  await merge('gscinspect', `r-${offset}`, { at: new Date().toISOString(), offset, n: res.length, res });
  return { offset, done: res.length, errors: res.filter((x) => x.error).length, next: offset + res.length < all.length ? offset + res.length : null, total: all.length };
}
async function sum() {
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'gscinspect').like('id', 'r-%');
  const all: Any[] = (data || []).flatMap((d: Any) => d.data.res || []);
  const by = (k: string) => all.reduce((m: Any, x: Any) => { const v = x[k] || (x.error ? 'error' : '—'); m[v] = (m[v] || 0) + 1; return m; }, {});
  const norm = (s: string) => { try { return decodeURIComponent(s || '').replace(/\/+$/, ''); } catch { return s; } };
  const notIndexed = all.filter((x) => x.verdict && x.verdict !== 'PASS').map((x) => ({ u: x.u, coverage: x.coverage, lastCrawl: x.lastCrawl }));
  const canon = all.filter((x) => x.googleCanonical && x.userCanonical && norm(x.googleCanonical) !== norm(x.userCanonical)).map((x) => ({ u: x.u, ours: x.userCanonical, google: x.googleCanonical }));
  const rich = all.filter((x) => (x.richIssues || []).length).map((x) => ({ u: x.u, issues: x.richIssues }));
  const s = { at: new Date().toISOString(), inspected: all.length, verdict: by('verdict'), coverage: by('coverage'), notIndexed, canonicalMismatch: canon, richIssues: rich, errors: all.filter((x) => x.error).length };
  await merge('gscinspect', 'summary', s);
  return { inspected: all.length, verdict: s.verdict, coverage: s.coverage, notIndexed: notIndexed.length, canonicalMismatch: canon.length, rich: rich.length };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const u = new URL(req.url); const step = u.searchParams.get('step'); const b = await req.json().catch(() => ({}));
  try {
    if (step === 'urls') return json({ ok: true, ...(await urls()) });
    if (step === 'run') return json({ ok: true, ...(await run(Number(b.offset || 0), Math.min(Number(b.n || 40), 60))) });
    if (step === 'sum') return json({ ok: true, ...(await sum()) });
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
