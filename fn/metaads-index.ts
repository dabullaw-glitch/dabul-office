// metaads: the office runs its own Meta (Facebook + Instagram) ad campaigns through the Marketing API (11.10.2026,
// Yakir: "אני רוצה שאתה תעשה את זה מקצה לקצה"). The token is META_ADS_TOKEN (saved by fbauth after Yakir approved the
// ads permissions); it is never returned. Campaign specs live in docs coll 'adcampaign' (one doc per campaign), and every
// id that Meta returns is written back into that doc, so each step can run again safely without creating duplicates.
// Everything is created PAUSED. Only {action:'activate'} turns a campaign on, and Claude calls it only after Yakir approves.
// Cron/Claude calls (x-cron-secret):
//   {action:'status'}                    -> permissions, ad accounts, pages, pixels (no secrets)
//   {action:'pixel', account}            -> the account's pixel (creates "dabullaw.co.il" if there is none), saved in settings/ads.meta.pixel
//   {action:'build', id}                 -> uploads images and videos, creates campaign, ad sets, creatives and ads (all paused)
//   {action:'activate', id} / {action:'pause', id}
//   {action:'budget', id, adset, daily}  -> changes an ad set's daily budget (in shekels)
//   {action:'insights', id, days?}       -> spend, impressions, clicks, landing page views and results per ad
//   {action:'get'|'post', path, params}  -> passthrough for checks and one-off objects (paging links are removed, they hold the token)
import { loadSecrets, json, cors, admin, env, telegram } from './_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const G = 'https://graph.facebook.com/v21.0';
const merge = (coll: string, id: string, patch: unknown) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };

async function proof(token: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env('META_APP_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(token)));
  return [...s].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function api(path: string, method = 'GET', params: Record<string, unknown> = {}) {
  const token = env('META_ADS_TOKEN'); if (!token) throw new Error('חשבון המודעות עוד לא מחובר (META_ADS_TOKEN)');
  const ap = env('META_APP_SECRET') ? await proof(token) : '';
  let r: Response;
  if (method === 'GET') {
    const u = new URL(G + path); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v)));
    u.searchParams.set('access_token', token); if (ap) u.searchParams.set('appsecret_proof', ap);
    r = await fetch(u);
  } else {
    const f = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => f.set(k, typeof v === 'string' ? v : JSON.stringify(v)));
    f.set('access_token', token); if (ap) f.set('appsecret_proof', ap);
    r = await fetch(G + path, { method, body: f });
  }
  const j: Any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) { const e = j.error || {}; throw new Error(`Meta ${r.status}: ${e.error_user_msg || e.message || 'error'}${e.error_subcode ? ' (' + e.error_subcode + ')' : ''}`); }
  return j;
}
const b64 = (buf: ArrayBuffer) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };

async function status() {
  const perms = (await api('/me/permissions')).data || [];
  const accts = (await api('/me/adaccounts', 'GET', { fields: 'account_id,name,account_status,currency,timezone_name,amount_spent', limit: '50' })).data || [];
  const out: Any = { perms: perms.filter((p: Any) => p.status === 'granted').map((p: Any) => p.permission), accounts: accts };
  for (const a of accts) { try { a.pixels = ((await api(`/act_${a.account_id}/adspixels`, 'GET', { fields: 'id,name,last_fired_time' })).data || []); } catch (e) { a.pixels = String((e as Error).message); } }
  return out;
}
async function pixel(account: string) {
  const list = (await api(`/act_${account}/adspixels`, 'GET', { fields: 'id,name,last_fired_time' })).data || [];
  let px = list[0];
  if (!px) { const c = await api(`/act_${account}/adspixels`, 'POST', { name: 'dabullaw.co.il' }); px = { id: c.id, name: 'dabullaw.co.il', created: true }; }
  const cur = (await getDoc('settings', 'ads')) || {};
  await merge('settings', 'ads', { meta: { ...(cur.meta || {}), pixel: { id: px.id, name: px.name, account, at: new Date().toISOString() } } });
  return px;
}

// ---- build a campaign from its spec (docs adcampaign/<id>) ----
async function uploadImage(acct: string, url: string) {
  const r = await fetch(url); if (!r.ok) throw new Error(`image ${r.status}: ${url}`);
  const j = await api(`/act_${acct}/adimages`, 'POST', { bytes: b64(await r.arrayBuffer()) });
  const img: Any = Object.values(j.images || {})[0]; if (!img || !img.hash) throw new Error('no image hash for ' + url);
  return img.hash as string;
}
async function uploadVideo(acct: string, url: string, name: string) {
  const j = await api(`/act_${acct}/advideos`, 'POST', { file_url: url, name });
  return j.id as string;
}
async function videoReady(id: string) {
  const v = await api(`/${id}`, 'GET', { fields: 'status' });
  return v.status && (v.status.video_status === 'ready');
}
// Placements. Meta retired 'video_feeds' (2490562) and IG 'explore' (2490589). A campaign spec may override any list
// with spec.placements = {fbFeed, igFeed, fbTall, igTall}, so a future retirement is fixed in data, not code.
let FB_FEED = ['feed', 'marketplace', 'profile_feed'];
let IG_FEED = ['stream', 'explore_home', 'profile_feed'];
let FB_TALL = ['story', 'facebook_reels'];
let IG_TALL = ['story', 'reels'];
function usePlacements(p: Any) { if (!p) return; if (p.fbFeed) FB_FEED = p.fbFeed; if (p.igFeed) IG_FEED = p.igFeed; if (p.fbTall) FB_TALL = p.fbTall; if (p.igTall) IG_TALL = p.igTall; }

function creativeSpec(spec: Any, ad: Any, assets: Any) {
  const text = { bodies: [{ text: ad.primary }], titles: [{ text: ad.headline }], descriptions: ad.desc ? [{ text: ad.desc }] : undefined, link_urls: [{ website_url: ad.url, display_url: 'dabullaw.co.il' }], call_to_action_types: [ad.ctaType || 'LEARN_MORE'] };
  const rules = [
    { customization_spec: { publisher_platforms: ['facebook', 'instagram'], facebook_positions: FB_FEED, instagram_positions: IG_FEED }, [ad.kind === 'video' ? 'video_label' : 'image_label']: { name: 'feed' } },
    { customization_spec: { publisher_platforms: ['facebook', 'instagram'], facebook_positions: FB_TALL, instagram_positions: IG_TALL }, [ad.kind === 'video' ? 'video_label' : 'image_label']: { name: 'tall' } },
  ];
  const feed: Any = { ...text, asset_customization_rules: rules, optimization_type: 'PLACEMENT' };
  if (ad.kind === 'video') {
    feed.videos = [{ video_id: assets.vf, thumbnail_hash: assets.tf, adlabels: [{ name: 'feed' }] }, { video_id: assets.vs, thumbnail_hash: assets.ts, adlabels: [{ name: 'tall' }] }];
    feed.ad_formats = ['SINGLE_VIDEO'];
  } else {
    feed.images = [{ hash: assets.f, adlabels: [{ name: 'feed' }] }, { hash: assets.s, adlabels: [{ name: 'tall' }] }];
    feed.ad_formats = ['SINGLE_IMAGE'];
  }
  Object.keys(feed).forEach(k => feed[k] === undefined && delete feed[k]);
  return { name: `${spec.short} · ${ad.name}`, object_story_spec: { page_id: spec.pageId, instagram_user_id: spec.igId }, asset_feed_spec: feed };
}
function simpleCreative(spec: Any, ad: Any, assets: Any) {
  // fallback: one asset for every placement (Meta adapts it)
  const oss: Any = { page_id: spec.pageId, instagram_user_id: spec.igId };
  const cta = { type: ad.ctaType || 'LEARN_MORE', value: { link: ad.url } };
  if (ad.kind === 'video') oss.video_data = { video_id: assets.vf, image_hash: assets.tf, message: ad.primary, title: ad.headline, link_description: ad.desc || '', call_to_action: cta };
  else oss.link_data = { image_hash: assets.f, link: ad.url, message: ad.primary, name: ad.headline, description: ad.desc || '', call_to_action: cta };
  return { name: `${spec.short} · ${ad.name}`, object_story_spec: oss };
}

async function build(id: string) {
  const spec = await getDoc('adcampaign', id); if (!spec) throw new Error('no campaign spec ' + id);
  const acct = spec.account; const st: Any = spec.state || {}; const log: string[] = []; usePlacements(spec.placements);
  const save = async () => { await merge('adcampaign', id, { state: st, builtAt: new Date().toISOString() }); };
  st.assets = st.assets || {}; st.adsets = st.adsets || {}; st.creatives = st.creatives || {}; st.ads = st.ads || {}; st.errors = {};
  const t0 = Date.now(); const room = () => Date.now() - t0 < 110e3;
  // 1. assets
  for (const s of spec.adsets) for (const ad of s.ads) {
    const a = st.assets[ad.key] = st.assets[ad.key] || {};
    try {
      if (ad.kind === 'video') {
        if (!a.vf) a.vf = await uploadVideo(acct, ad.media.f, ad.name + ' 4x5');
        if (!a.vs) a.vs = await uploadVideo(acct, ad.media.s, ad.name + ' 9x16');
        if (!a.tf) a.tf = await uploadImage(acct, ad.media.pf);
        if (!a.ts) a.ts = await uploadImage(acct, ad.media.ps);
      } else {
        if (!a.f) a.f = await uploadImage(acct, ad.media.f);
        if (!a.s) a.s = await uploadImage(acct, ad.media.s);
      }
    } catch (e) { st.errors[ad.key] = String((e as Error).message).slice(0, 300); }
    if (!room()) { await save(); return { ok: true, partial: true, step: 'assets', log }; }
  }
  await save();
  // 2. campaign
  if (!st.campaign) {
    const c = await api(`/act_${acct}/campaigns`, 'POST', { name: spec.name, objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: [], buying_type: 'AUCTION', is_adset_budget_sharing_enabled: false })
      .catch(() => api(`/act_${acct}/campaigns`, 'POST', { name: spec.name, objective: 'OUTCOME_TRAFFIC', status: 'PAUSED', special_ad_categories: [], buying_type: 'AUCTION' }));
    st.campaign = c.id; log.push('campaign ' + c.id); await save();
  }
  // 3. ad sets
  const px = spec.pixelId || '';
  for (const s of spec.adsets) {
    if (st.adsets[s.key]) continue;
    const targeting: Any = { age_min: s.ageMin, age_max: s.ageMax, geo_locations: s.geo, publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: [...FB_FEED.filter(p => p !== 'profile_feed'), ...FB_TALL], instagram_positions: [...IG_FEED, ...IG_TALL], targeting_automation: { advantage_audience: 0 } };
    const body: Any = { name: s.name, campaign_id: st.campaign, daily_budget: String(Math.round(s.daily * 100)), billing_event: 'IMPRESSIONS', bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      optimization_goal: px ? 'LANDING_PAGE_VIEWS' : 'LINK_CLICKS', destination_type: 'WEBSITE', targeting, status: 'PAUSED' };
    // Traffic + landing page views: Meta counts page views through the pixel on the site, no promoted_object here
    // (sending one gives error 1885014). If Meta refuses landing page views, fall back to link clicks.
    const r = await api(`/act_${acct}/adsets`, 'POST', body)
      .catch(() => api(`/act_${acct}/adsets`, 'POST', { ...body, optimization_goal: 'LINK_CLICKS' }));
    st.adsets[s.key] = r.id; log.push('adset ' + s.key + ' ' + r.id); await save();
  }
  // 4. creatives and ads (videos must be processed first)
  for (const s of spec.adsets) for (const ad of s.ads) {
    if (st.ads[ad.key]) continue;
    const a = st.assets[ad.key] || {};
    if (st.errors[ad.key]) continue;
    if (ad.kind === 'video' && !((await videoReady(a.vf)) && (await videoReady(a.vs)))) { log.push(ad.key + ': video processing'); continue; }
    try {
      if (!st.creatives[ad.key]) {
        let c;
        try { c = await api(`/act_${acct}/adcreatives`, 'POST', creativeSpec(spec, ad, a)); st.creatives[ad.key] = { id: c.id, mode: 'placement' }; }
        catch (e1) { c = await api(`/act_${acct}/adcreatives`, 'POST', simpleCreative(spec, ad, a)); st.creatives[ad.key] = { id: c.id, mode: 'single', why: String((e1 as Error).message).slice(0, 200) }; }
        await save();
      }
      const r = await api(`/act_${acct}/ads`, 'POST', { name: ad.name, adset_id: st.adsets[s.key], creative: { creative_id: st.creatives[ad.key].id }, status: 'PAUSED' });
      st.ads[ad.key] = r.id; log.push('ad ' + ad.key + ' ' + r.id); await save();
    } catch (e) { st.errors[ad.key] = String((e as Error).message).slice(0, 300); await save(); }
    if (!room()) return { ok: true, partial: true, step: 'ads', log, state: st };
  }
  const want = spec.adsets.reduce((n: number, s: Any) => n + s.ads.length, 0);
  const done = Object.keys(st.ads).length;
  return { ok: true, done, want, complete: done === want, log, errors: st.errors, state: st };
}
async function setStatus(id: string, on: boolean) {
  const spec = await getDoc('adcampaign', id); const st = spec.state || {}; const s = on ? 'ACTIVE' : 'PAUSED';
  for (const a of Object.values(st.ads || {})) await api(`/${a}`, 'POST', { status: s });
  for (const a of Object.values(st.adsets || {})) await api(`/${a}`, 'POST', { status: s });
  if (st.campaign) await api(`/${st.campaign}`, 'POST', { status: s });
  await merge('adcampaign', id, { live: on, [on ? 'activatedAt' : 'pausedAt']: new Date().toISOString() });
  return { ok: true, status: s };
}
async function insights(id: string, days = 7) {
  const spec = await getDoc('adcampaign', id); const st = spec.state || {};
  if (!st.campaign) return { ok: false, error: 'not built' };
  const r = await api(`/${st.campaign}/insights`, 'GET', { level: 'ad', date_preset: days <= 7 ? 'last_7d' : days <= 14 ? 'last_14d' : 'last_30d',
    fields: 'ad_name,adset_name,spend,impressions,reach,frequency,clicks,inline_link_clicks,cpc,ctr,actions' });
  return { ok: true, rows: r.data || [] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ ok: false }, 401);
  try {
    const b: Any = await req.json().catch(() => ({}));
    if (b.action === 'status') return json(await status());
    if (b.action === 'pixel') return json(await pixel(String(b.account)));
    if (b.action === 'build') return json(await build(String(b.id)));
    if (b.action === 'activate') { const r = await setStatus(String(b.id), true); await telegram('▶️ הקמפיין במטא הופעל: ' + b.id).catch(() => false); return json(r); }
    if (b.action === 'pause') return json(await setStatus(String(b.id), false));
    if (b.action === 'budget') { const spec = await getDoc('adcampaign', String(b.id)); const as = spec.state.adsets[b.adset]; await api(`/${as}`, 'POST', { daily_budget: String(Math.round(+b.daily * 100)) }); return json({ ok: true }); }
    if (b.action === 'insights') return json(await insights(String(b.id), +b.days || 7));
    if (b.action === 'get') { const r = await api(String(b.path), 'GET', b.params || {}); if (r.paging) delete r.paging.next, delete r.paging.previous; return json(r); }
    if (b.action === 'post') return json(await api(String(b.path), 'POST', b.params || {})); // creates only; Claude never uses it to activate
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
