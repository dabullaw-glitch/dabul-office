// gscsite (16.11.2026): puts a second site of Yakir (first: blihovot.co.il, the separate debt information site) into
// Google Search Console with the office service account, so Google learns about it and reads its sitemap.
// Only for sites we publish ourselves (the verification file is added to the site build).
// POST ?step=token  {site}            -> the verification file name Google wants (FILE method)
// POST ?step=verify {site, owners?}   -> Google checks the file; the service account (and owners) become verified owners
// POST ?step=add    {site, sitemap}   -> adds the property to Search Console and submits the sitemap
// POST ?step=status {site}            -> sitemap status (submitted, indexed counts, errors)
// Auth: x-cron-secret. No changes to dabullaw.co.il.
import { loadSecrets, json, cors, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const SCOPES = 'https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters';
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function token(): Promise<string> {
  const sa = JSON.parse(env('GOOGLE_SA_JSON'));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('google token: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}
const ALLOWED = ['https://blihovot.co.il/'];
async function g(method: string, url: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: Any = {}; try { j = t ? JSON.parse(t) : {}; } catch { j = { raw: t.slice(0, 300) }; }
  return { status: r.status, ok: r.ok, j };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const step = new URL(req.url).searchParams.get('step'); const b: Any = await req.json().catch(() => ({}));
  const site = String(b.site || ALLOWED[0]);
  if (!ALLOWED.includes(site)) return json({ error: 'site not allowed' }, 400);
  const enc = encodeURIComponent(site);
  try {
    if (step === 'token') return json(await g('POST', 'https://www.googleapis.com/siteVerification/v1/token', { site: { type: 'SITE', identifier: site }, verificationMethod: 'FILE' }));
    if (step === 'verify') {
      const owners = Array.isArray(b.owners) ? b.owners.filter((x: string) => /^[^@\s]+@[^@\s]+$/.test(x)) : [];
      const v = await g('POST', 'https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=FILE', { site: { type: 'SITE', identifier: site } });
      if (!v.ok || !owners.length) return json(v);
      const id = encodeURIComponent(v.j.id || site);
      const all = [...new Set([...(v.j.owners || []), ...owners])];
      return json({ verify: v, owners: await g('PUT', `https://www.googleapis.com/siteVerification/v1/webResource/${id}`, { site: { type: 'SITE', identifier: site }, owners: all }) });
    }
    if (step === 'add') {
      const add = await g('PUT', `https://www.googleapis.com/webmasters/v3/sites/${enc}`);
      const sm = b.sitemap ? await g('PUT', `https://www.googleapis.com/webmasters/v3/sites/${enc}/sitemaps/${encodeURIComponent(String(b.sitemap))}`) : null;
      return json({ add, sitemap: sm });
    }
    if (step === 'status') return json(await g('GET', `https://www.googleapis.com/webmasters/v3/sites/${enc}/sitemaps`));
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
