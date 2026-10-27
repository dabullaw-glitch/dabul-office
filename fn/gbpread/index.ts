// gbpread (27.10.2026): READ ONLY. Reads the full Google Business Profile of the office for the "first place in Netanya" plan
// (Yakir asked for a full check of the profile, stage 4). Changes nothing on Google. Cron secret only.
// POST {} -> location (categories, description, services, hours, website, phone, address, labels, service area, lat/lng),
//            attributes, media count + categories, last posts, review summary, available category ids that match a query.
import { createClient } from 'npm:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const S: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || S[k] || '';
let _a: Any = null;
const admin = () => _a || (_a = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
async function access() {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GBP_CLIENT_ID'), client_secret: env('GBP_CLIENT_SECRET'), refresh_token: env('GBP_REFRESH_TOKEN'), grant_type: 'refresh_token' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('token ' + r.status); return j.access_token as string;
}
Deno.serve(async (req) => {
  const { data } = await admin().from('app_secrets').select('k,v'); (data || []).forEach((r: Any) => { S[r.k] = r.v; });
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const at = await access();
  const g = async (u: string) => { const r = await fetch(u, { headers: { authorization: 'Bearer ' + at } }); const t = await r.text(); try { return { s: r.status, j: JSON.parse(t) }; } catch { return { s: r.status, j: t.slice(0, 300) }; } };
  const { data: st } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'gbp' }).maybeSingle();
  const acc = String(st?.data?.api?.accountId || '').replace(/^accounts\//, ''), loc = String(st?.data?.api?.locationId || '').replace(/^locations\//, '');
  const out: Any = {};
  const mask = 'name,title,categories,profile,serviceItems,regularHours,specialHours,moreHours,websiteUri,phoneNumbers,storefrontAddress,metadata,openInfo,serviceArea,labels,latlng,languageCode,storeCode,relationshipData';
  out.location = await g(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${loc}?readMask=${mask}`);
  out.attributes = await g(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${loc}/attributes`);
  const media = await g(`https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/media?pageSize=100`);
  out.media = { s: media.s, total: media.j?.totalMediaItemCount, items: (media.j?.mediaItems || []).map((m: Any) => ({ cat: m.locationAssociation?.category || '', fmt: m.mediaFormat, at: m.createTime, views: m.insights?.viewCount, desc: m.description || '' })) };
  const posts = await g(`https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/localPosts?pageSize=20`);
  out.posts = { s: posts.s, items: (posts.j?.localPosts || []).map((p: Any) => ({ at: p.createTime, state: p.state, topic: p.topicType, cta: p.callToAction?.url || '', text: String(p.summary || '').slice(0, 80) })) };
  const rev = await g(`https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/reviews?pageSize=50`);
  out.reviews = { s: rev.s, avg: rev.j?.averageRating, total: rev.j?.totalReviewCount, recent: (rev.j?.reviews || []).map((r: Any) => ({ at: String(r.createTime || '').slice(0, 10), star: r.starRating, replied: !!r.reviewReply, len: String(r.comment || '').length, netanya: /נתני/.test(String(r.comment || '')) })) };
  for (const q of (b.cats || ['עורך דין', 'מקרקעין', 'נדל', 'נוטריון'])) {
    const c = await g(`https://mybusinessbusinessinformation.googleapis.com/v1/categories?regionCode=IL&languageCode=he&view=BASIC&pageSize=50&filter=displayname=${encodeURIComponent(q)}`);
    out['cats:' + q] = (c.j?.categories || []).map((x: Any) => x.name + ' | ' + x.displayName);
  }
  return json(out);
});
