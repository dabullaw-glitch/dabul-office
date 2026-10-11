// reviews (11.10.2026, Yakir: "לקוחות ממליצים" on the home page updates by itself when new Google reviews come in).
//  GET                         -> public JSON for the website widget: {google:{rating,count,url,reviews[]}, lawreviews:{...}, at}
//                                 (cached 30 min at the edge; read from docs site/reviews)
//  POST {refresh:true} + cron  -> Google Places (New) with the office service account: rating, count and the latest reviews.
//                                 Google returns only 5 reviews per call, so new ones are added to the stored list and kept;
//                                 the list grows over time. LawReviews: rating and count from the public profile page.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (d: unknown, s = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', ...extra } });
const PLACE = 'ChIJFyPNpLBBHRURR161JAMeBb0';
const GURL = `https://search.google.com/local/reviews?placeid=${PLACE}`;

const b64url = (b: ArrayBuffer | Uint8Array | string) => { const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer); let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
async function gtoken() {
  const sa = JSON.parse(env('GOOGLE_SA_JSON')), now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); return { t: j.access_token as string, project: sa.project_id as string };
}

// deno-lint-ignore no-explicit-any
async function getDoc(): Promise<any> { const { data } = await sb().from('docs').select('data').match({ coll: 'site', id: 'reviews' }).maybeSingle(); return data ? data.data : null; }

async function google() {
  const { t } = await gtoken();
  const r = await fetch(`https://places.googleapis.com/v1/places/${PLACE}?languageCode=he`, { headers: { authorization: `Bearer ${t}`, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri' } });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, status: r.status, error: j.error?.message || '', reason: j.error?.details?.[0]?.reason || '' };
  // deno-lint-ignore no-explicit-any
  const reviews = (j.reviews || []).map((v: any) => ({
    id: String(v.name || '').split('/').pop() || '', name: v.authorAttribution?.displayName || '', photo: v.authorAttribution?.photoUri || '',
    rating: v.rating || 5, text: v.originalText?.text || v.text?.text || '', at: v.publishTime || '', ago: v.relativePublishTimeDescription || '',
  })).filter((v: { text: string }) => v.text);
  return { ok: true, rating: j.rating, count: j.userRatingCount, reviews };
}

// LawReviews: rating and count from the public profile (best effort; the stored values stay if the page changes)
async function lawreviews(url: string) {
  if (!url) return null;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (dabullaw.co.il reviews widget)' } });
    const h = await r.text();
    const ld = [...h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
    for (const x of ld.flat()) { const a = x && (x.aggregateRating || x?.['@graph']?.find?.((g: { aggregateRating?: unknown }) => g.aggregateRating)?.aggregateRating); if (a) return { rating: +a.ratingValue, count: +(a.reviewCount || a.ratingCount) }; }
    const m = h.match(/([0-9.]+)\s*מתוך\s*5[^0-9]{0,40}?(\d+)\s*חוות/); if (m) return { rating: +m[1], count: +m[2] };
    return { status: r.status, none: true };
  } catch (e) { return { error: String(e) }; }
}

async function refresh() {
  const old = (await getDoc()) || {};
  const g = await google();
  const out: Record<string, unknown> = { at: new Date().toISOString() };
  if (g.ok) {
    const byId = new Map<string, unknown>();
    // deno-lint-ignore no-explicit-any
    for (const v of (old.google?.reviews || []) as any[]) byId.set(v.id || v.name + v.at, v);
    for (const v of g.reviews) byId.set(v.id || v.name + v.at, v);
    // deno-lint-ignore no-explicit-any
    const all = [...byId.values()].sort((a: any, b: any) => String(b.at).localeCompare(String(a.at)));
    out.google = { rating: g.rating, count: g.count, url: GURL, reviews: all.slice(0, 60) };
  } else out.googleError = g;
  const lw = await lawreviews(old.lawreviews?.url || '');
  if (lw && 'rating' in lw && lw.rating) out.lawreviews = { ...(old.lawreviews || {}), rating: lw.rating, count: lw.count };
  else out.lawError = lw;
  await sb().rpc('docs_merge', { p_coll: 'site', p_id: 'reviews', p_patch: out });
  return json({ ok: g.ok, google: g.ok ? { rating: g.rating, count: g.count, got: g.reviews.length } : g, lawreviews: lw });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (req.method === 'GET') {
    const d = (await getDoc()) || {};
    // public: only what the widget shows
    // deno-lint-ignore no-explicit-any
    const pub = (x: any) => x ? { rating: x.rating, count: x.count, url: x.url, reviews: (x.reviews || []).filter((v: { rating: number }) => (v.rating || 5) >= 4).slice(0, 30).map((v: any) => ({ name: v.name, photo: v.photo, rating: v.rating, text: v.text, at: v.at, ago: v.ago })) } : null;
    return json({ google: pub(d.google), lawreviews: pub(d.lawreviews), at: d.at || '' }, 200, { 'cache-control': 'public, max-age=1800, s-maxage=1800' });
  }
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  try { return await refresh(); } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
