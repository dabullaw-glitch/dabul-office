// gbpedit (28.10.2026): small, explicit edits to the office Google Business Profile that Yakir approved on 27.10.2026
// (stage 4 of the "first place in Netanya" plan). Cron secret only. One action per call:
//   {a:'cats', names:[...]}            read category names (no change)
//   {a:'setcats', primary, additional} replace the category list (primary + additional ids)
//   {a:'appt', url}                    set the appointment link attribute
//   {a:'lang', code}                   try to set the profile language
//   {a:'posts'}                        list posts with schedule + call to action (no change)
//   {a:'postcta', post, url}           add a "learn more" button to one post
import { createClient } from 'npm:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const S: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || S[k] || '';
let _a: Any = null;
const admin = () => _a || (_a = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
Deno.serve(async (req) => {
  const { data } = await admin().from('app_secrets').select('k,v'); (data || []).forEach((r: Any) => { S[r.k] = r.v; });
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GBP_CLIENT_ID'), client_secret: env('GBP_CLIENT_SECRET'), refresh_token: env('GBP_REFRESH_TOKEN'), grant_type: 'refresh_token' }) });
  const at = (await tr.json()).access_token;
  const g = async (u: string, method = 'GET', body?: Any) => { const r = await fetch(u, { method, headers: { authorization: 'Bearer ' + at, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j: Any = t; try { j = JSON.parse(t); } catch { /* text */ } return { s: r.status, j }; };
  const { data: st } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'gbp' }).maybeSingle();
  const acc = String(st?.data?.api?.accountId || '').replace(/^accounts\//, ''), loc = String(st?.data?.api?.locationId || '').replace(/^locations\//, '');
  const BI = 'https://mybusinessbusinessinformation.googleapis.com/v1';
  if (b.a === 'cats') return json(await g(`${BI}/categories:batchGet?languageCode=he&regionCode=IL&view=BASIC&${(b.names || []).map((n: string) => 'names=' + encodeURIComponent(n)).join('&')}`));
  if (b.a === 'setcats') return json(await g(`${BI}/locations/${loc}?updateMask=categories`, 'PATCH', { categories: { primaryCategory: { name: b.primary }, additionalCategories: (b.additional || []).map((n: string) => ({ name: n })) } }));
  if (b.a === 'appt') return json(await g(`${BI}/locations/${loc}/attributes?attributeMask=attributes/url_appointment`, 'PATCH', { name: `locations/${loc}/attributes`, attributes: [{ name: 'attributes/url_appointment', valueType: 'URL', uriValues: [{ uri: String(b.url) }] }] }));
  if (b.a === 'lang') return json(await g(`${BI}/locations/${loc}?updateMask=languageCode`, 'PATCH', { languageCode: String(b.code || 'he') }));
  if (b.a === 'posts') { const r = await g(`https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/localPosts?pageSize=50`); return json({ s: r.s, posts: (r.j?.localPosts || []).map((p: Any) => ({ name: p.name, state: p.state, created: p.createTime, updated: p.updateTime, topic: p.topicType, cta: p.callToAction || null, event: p.event || null, schedule: p.scheduledTime || p.publishTime || null, url: p.searchUrl || '', text: String(p.summary || '').slice(0, 60) })) }); }
  if (b.a === 'postcta') return json(await g(`https://mybusiness.googleapis.com/v4/${b.post}?updateMask=callToAction`, 'PATCH', { callToAction: { actionType: 'LEARN_MORE', url: String(b.url) } }));
  return json({ error: 'a?' }, 400);
});
