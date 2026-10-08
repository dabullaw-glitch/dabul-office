// psi: runs Google PageSpeed Insights on a page of the site (the same test Yakir sees on pagespeed.web.dev)
// through the office service account, so it does not hit the shared daily limit of anonymous requests.
// Cron (x-cron-secret): GET ?strategy=mobile|desktop [&url=https://dabullaw.co.il/...]
// Saves a short summary to docs psi/<strategy>-<date> (scores, the 5 measures, field data, every check that is not perfect).
import { createClient } from 'jsr:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function secrets() { const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'GOOGLE_SA_JSON']); return Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])); }
async function token(S: Any): Promise<string> {
  const sa = JSON.parse(S.GOOGLE_SA_JSON); const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'openid https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); if (!j.access_token) throw new Error('google token: ' + JSON.stringify(j).slice(0, 200)); return j.access_token;
}
function summary(j: Any) {
  const r = j.lighthouseResult; if (!r) return { err: JSON.stringify(j).slice(0, 600) };
  const cat = Object.fromEntries(Object.entries(r.categories).map(([k, v]: Any) => [k, v.score === null ? null : Math.round(v.score * 100)]));
  const m = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'].map((k) => [k, r.audits[k] && r.audits[k].displayValue]));
  const field = Object.fromEntries(Object.entries((j.loadingExperience && j.loadingExperience.metrics) || {}).map(([k, v]: Any) => [k, [v.percentile, v.category]]));
  const bad = Object.values(r.audits as Any).filter((a: Any) => (a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable') || /insight$/.test(a.id) && a.score !== null && a.score < 1)
    .map((a: Any) => {
      const flat: string[] = [];
      const walk = (x: Any, d: number) => {
        if (!x || d > 7 || flat.length > 40) return; if (Array.isArray(x)) return x.forEach((y) => walk(y, d + 1)); if (typeof x !== 'object') return;
        if (x.node) flat.push('NODE ' + (x.node.selector || '') + ' | ' + String(x.node.snippet || '').slice(0, 240) + (x.score ? ' | score ' + x.score : ''));
        else if (x.url) flat.push('URL ' + x.url + ' | ' + ['wastedMs', 'wastedBytes', 'totalBytes', 'transferSize', 'cacheLifetimeMs', 'duration', 'score', 'mainThreadTime'].filter((k) => x[k] != null).map((k) => k + '=' + Math.round(x[k] * 1000) / 1000).join(' '));
        else if (x.label && x.value !== undefined && typeof x.value !== 'object') flat.push('KV ' + x.label + ' = ' + x.value);
        else if (x.text && typeof x.text === 'string') flat.push('TXT ' + x.text.slice(0, 200));
        for (const k of Object.keys(x)) if (k !== 'node' && typeof x[k] === 'object') walk(x[k], d + 1);
      };
      walk(a.details, 0);
      return { id: a.id, score: a.score, val: a.displayValue || '', items: flat.slice(0, 40) };
    });
  return { at: r.fetchTime, lh: r.lighthouseVersion, cat, m, field, bad };
}
Deno.serve(async (req) => {
  const S = await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return new Response('unauthorized', { status: 401 });
  const q = new URL(req.url).searchParams; const strategy = q.get('strategy') === 'desktop' ? 'desktop' : 'mobile';
  const page = q.get('url') || 'https://dabullaw.co.il/'; if (!/^https:\/\/([a-z0-9-]+\.)*(dabullaw\.co\.il|github\.io|pages\.dev)\//.test(page)) return Response.json({ error: 'url' }, { status: 400 });
  try {
    const t = await token(S);
    if (q.get('step') === 'enable') {
      // turn on the free PageSpeed API in the office Google Cloud project (one time)
      const proj = JSON.parse(S.GOOGLE_SA_JSON).project_id;
      const e = await fetch(`https://serviceusage.googleapis.com/v1/projects/${proj}/services/pagespeedonline.googleapis.com:enable`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: '{}' });
      return Response.json({ status: e.status, body: (await e.text()).slice(0, 600) });
    }
    const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(page)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo&locale=en`;
    const r = await fetch(u, { headers: { authorization: `Bearer ${t}` } }); const j = await r.json();
    const s: Any = r.ok ? summary(j) : { err: r.status + ' ' + JSON.stringify(j).slice(0, 500) };
    s.page = page; s.strategy = strategy;
    const id = `${strategy}-${new Date().toISOString().slice(0, 16)}`;
    await sb.from('docs').insert({ coll: 'psi', id, data: s, updated_at: new Date().toISOString() });
    return Response.json({ id, cat: s.cat, m: s.m, err: s.err });
  } catch (e) { return Response.json({ ok: false, error: String((e as Error).message || e) }, { status: 500 }); }
});
