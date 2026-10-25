// gbpphoto (25.10.2026, Yakir asked: put the LB10 2026 certificate in the Google Business photos, and a post about it).
// Cron secret only. POST ?step=photo {url (https jpg/png), category?, description?} -> one photo in the profile's photos
//                   POST ?step=post  {text, url (https jpg/png), link?}               -> one STANDARD post with the photo
// Uses the same Google connection as the gbp function. Nothing else.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
async function access(): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GBP_CLIENT_ID'), client_secret: env('GBP_CLIENT_SECRET'), refresh_token: env('GBP_REFRESH_TOKEN'), grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('google token: ' + r.status + ' ' + String(j.error || ''));
  return j.access_token;
}
async function g(url: string, body: Any) {
  const r = await fetch(url, { method: 'POST', headers: { authorization: 'Bearer ' + await access(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`google ${r.status}: ${String(j?.error?.message || JSON.stringify(j)).slice(0, 400)}`);
  return j;
}
async function ids() {
  const { data } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'gbp' }).maybeSingle();
  const a = (data && data.data && data.data.api) || {};
  if (!a.accountId || !a.locationId) throw new Error('settings/gbp.api has no accountId/locationId');
  return { acc: String(a.accountId).replace(/^accounts\//, ''), loc: String(a.locationId).replace(/^locations\//, '') };
}
const okImg = (u: string) => /^https:\/\/\S+\.(jpe?g|png)(\?\S*)?$/i.test(u);
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const step = new URL(req.url).searchParams.get('step'); const b: Any = await req.json().catch(() => ({}));
  try {
    const { acc, loc } = await ids(); const base = `https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}`;
    const url = String(b.url || ''); if (!okImg(url)) throw new Error('url must be an https jpg or png');
    if (step === 'photo') {
      const cat = /^[A-Z_]+$/.test(String(b.category || '')) ? String(b.category) : 'ADDITIONAL';
      const body: Any = { mediaFormat: 'PHOTO', locationAssociation: { category: cat }, sourceUrl: url };
      if (b.description) body.description = String(b.description).slice(0, 300);
      const j = await g(`${base}/media`, body);
      return json({ ok: true, name: j.name || '', googleUrl: j.googleUrl || '' });
    }
    if (step === 'post') {
      const text = String(b.text || '').trim(); if (!text) throw new Error('text?');
      const body: Any = { languageCode: 'he', topicType: 'STANDARD', summary: text.slice(0, 1450), media: [{ mediaFormat: 'PHOTO', sourceUrl: url }] };
      if (b.link) body.callToAction = { actionType: 'LEARN_MORE', url: String(b.link) };
      const j = await g(`${base}/localPosts`, body);
      return json({ ok: true, name: j.name || '', url: j.searchUrl || '', state: j.state || '' });
    }
    return json({ error: 'step?' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
