// Google Business Profile (18.10.2026, Yakir connected the Business Profile API: secrets GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN,
// ids in docs settings/gbp.api {accountId, locationId}). Handles reviews, stats, and (from 21.10.2026) the weekly posts directly (step=due).
// Cron (x-cron-secret): POST ?step=sync   reads the reviews into docs coll 'gbprev' (new review -> status 'new'; on the very first sync,
//                                         reviews without a reply -> 'old', so nothing floods Telegram)
//                       POST ?step=ask    sends Yakir every review with status 'drafted' (data.draft written by the daily task) with buttons
//                       POST ?step=stats  {month:'YYYY-MM'} monthly views/calls/website/directions -> docs gbpstats/<month> + Telegram
// Public (Telegram buttons through portal.html#w=<a>&t=<token>): ?a=ok | no   (ok publishes the reply on Google after a confirm click)
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const tok = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const self = () => `${env('SUPABASE_URL')}/functions/v1/gbp`;
const pub = (a: string, t: string) => `https://dabullaw-glitch.github.io/dabul-office/portal.html#w=${a}&t=${t}`;
const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const FORMJS = `<script>document.addEventListener('submit',function(e){var f=e.target;e.preventDefault();var b=f.querySelector('button');if(b){b.disabled=true;b.textContent='רגע...';}fetch(f.getAttribute('action'),{method:'POST'}).then(function(r){return r.text();}).then(function(t){document.open();document.write(t);document.close();});});</script>`;
function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#ecedf2;font-family:Assistant,Arial,sans-serif;color:#1f2937;line-height:1.7}main{max-width:560px;margin:40px auto;padding:32px 24px;background:#fff;border:1px solid #e2e0da;border-radius:14px}
.top{color:#fff;background:#141414;margin:-32px -24px 22px;padding:16px 24px;border-radius:14px 14px 0 0;border-bottom:3px solid #e4d19c;font-weight:700}h1{color:#141414;font-size:1.5rem;margin:0 0 12px}
blockquote{margin:0 0 14px;padding:12px 16px;background:#f6f4ee;border-radius:10px;white-space:pre-wrap}button{background:#e4d19c;color:#141414;border:0;border-radius:10px;padding:14px 22px;font-size:1.05rem;font-weight:700;cursor:pointer;font-family:inherit}</style></head>
<body><main><div class="top">יקיר דבול - משרד עורכי דין</div><h1>${esc(title)}</h1>${body}</main>${FORMJS}</body></html>`, { status, headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
}
async function tg(text: string, buttons?: Any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}
let AT = '', ATexp = 0;
async function access(): Promise<string> {
  if (AT && Date.now() < ATexp) return AT;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GBP_CLIENT_ID'), client_secret: env('GBP_CLIENT_SECRET'), refresh_token: env('GBP_REFRESH_TOKEN'), grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('google token: ' + r.status + ' ' + String(j.error || '') + ' ' + String(j.error_description || ''));
  AT = j.access_token; ATexp = Date.now() + (Number(j.expires_in || 3600) - 120) * 1000; return AT;
}
async function g(url: string, method = 'GET', body?: Any) {
  const r = await fetch(url, { method, headers: { authorization: 'Bearer ' + await access(), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`google ${r.status}: ${String(j?.error?.message || JSON.stringify(j)).slice(0, 300)}`);
  return j;
}
async function ids() {
  const s = (await getDoc('settings', 'gbp')) || {}; const a = s.api || {};
  if (!a.accountId || !a.locationId) throw new Error('settings/gbp.api has no accountId/locationId');
  return { acc: String(a.accountId).replace(/^accounts\//, ''), loc: String(a.locationId).replace(/^locations\//, ''), api: a };
}
async function sync() {
  const { acc, loc, api } = await ids();
  const first = !api.syncedAt; const out = { total: 0, added: 0, fresh: 0, replied: 0 };
  let pageToken = ''; const all: Any[] = []; let avg = 0, count = 0;
  for (let i = 0; i < 6; i++) {
    const j = await g(`https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/reviews?pageSize=50${pageToken ? '&pageToken=' + pageToken : ''}`);
    all.push(...(j.reviews || [])); avg = j.averageRating || avg; count = j.totalReviewCount || count;
    if (!j.nextPageToken) break; pageToken = j.nextPageToken;
  }
  for (const r of all) {
    out.total++; const id = 'rv-' + String(r.reviewId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120); if (id === 'rv-') continue;
    const prev = await getDoc('gbprev', id); const hasReply = !!(r.reviewReply && r.reviewReply.comment);
    const base = { name: r.name, stars: STARS[r.starRating] || 0, comment: String(r.comment || ''), reviewer: String(r.reviewer?.displayName || ''), created: r.createTime, updatedOnGoogle: r.updateTime };
    if (!prev) {
      await db().upsert({ coll: 'gbprev', id, data: { ...base, status: hasReply ? 'answered' : (first ? 'old' : 'new'), reply: hasReply ? r.reviewReply.comment : '', seen: new Date().toISOString() }, updated_at: new Date().toISOString() });
      out.added++; if (!hasReply && !first) out.fresh++;
    } else if (hasReply && !['answered', 'replied'].includes(prev.status)) { await merge('gbprev', id, { status: 'answered', reply: r.reviewReply.comment }); out.replied++; }
  }
  await merge('settings', 'gbp', { api: { ...api, syncedAt: new Date().toISOString(), reviews: count, rating: avg } });
  return { ok: true, first, count, avg, ...out };
}
const askText = (r: Any, again = false) => `${again ? '⏳ תזכורת: ' : ''}⭐ ביקורת ${r.stars ? r.stars + ' כוכבים' : ''} בגוגל${r.reviewer ? ' מאת ' + r.reviewer.split(' ')[0] : ''}\n\n"${String(r.comment || '(בלי טקסט, רק דירוג)').slice(0, 1200)}"\n\nטיוטת תשובה:\n${r.draft}\n\nלוחצים "לפרסם את התשובה" כדי שהיא תעלה בגוגל, או "לא לענות". רוצה לשנות נוסח? כתוב לי בצ'אט.`;
const btns = (t: string) => [[{ text: '✅ לפרסם את התשובה', url: pub('ok', t) }, { text: '✗ לא לענות', url: pub('no', t) }]];
async function ask(b: Any) {
  const { data } = await db().select('id,data').eq('coll', 'gbprev').eq('data->>status', 'drafted');
  const out: Any[] = [];
  for (const row of (data || []).slice(0, 10)) {
    const r = row.data; if (!r.draft) continue;
    const last = Date.parse(r.asked || 0); if (r.tok && !b.force && Date.now() - last < 20 * 3600e3) continue;
    const t = r.tok || tok(); await merge('gbprev', row.id, { tok: t, asked: new Date().toISOString() });
    await tg(askText(r, !!r.tok), btns(t)); out.push(row.id);
  }
  return { ok: true, sent: out };
}
async function byTok(t: string) { if (!/^[a-f0-9]{40}$/.test(t)) return null; const { data } = await db().select('id,data').eq('coll', 'gbprev').eq('data->>tok', t).limit(1); return data && data[0]; }
async function act(req: Request, a: string, t: string) {
  const row = await byTok(t); if (!row) return page('הקישור לא תקף', '<p>הביקורת לא נמצאה.</p>', 404);
  const r = row.data;
  if (['replied', 'answered'].includes(r.status)) return page('כבר נענתה', `<p>התשובה לביקורת הזו כבר מופיעה בגוגל.</p><blockquote>${esc(r.reply || r.draft)}</blockquote>`);
  if (r.status === 'skipped' && a === 'no') return page('לא נענה', '<p>הביקורת הזו לא תיענה.</p>');
  if (req.method !== 'POST') return page(a === 'ok' ? 'לפרסם את התשובה?' : 'לא לענות?', `<blockquote>${esc(r.comment || '(בלי טקסט)')}</blockquote><p><b>התשובה:</b></p><blockquote>${esc(r.draft)}</blockquote><form method="post" action="${self()}?a=${a}&t=${t}"><button type="submit">${a === 'ok' ? '✅ לפרסם בגוגל' : '✗ לא לענות'}</button></form>`);
  if (a === 'no') { await merge('gbprev', row.id, { status: 'skipped', skippedAt: new Date().toISOString() }); return page('לא נענה', '<p>בסדר, הביקורת הזו לא תיענה.</p>'); }
  await g(`https://mybusiness.googleapis.com/v4/${r.name}/reply`, 'PUT', { comment: String(r.draft).slice(0, 4000) });
  await merge('gbprev', row.id, { status: 'replied', reply: r.draft, repliedAt: new Date().toISOString() });
  return page('התשובה פורסמה', `<p>התשובה עלתה בגוגל, מתחת לביקורת.</p><blockquote>${esc(r.draft)}</blockquote>`);
}
async function stats(b: Any) {
  const { loc } = await ids();
  const now = new Date(); const m = String(b.month || '') || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const [y, mo] = m.split('-').map(Number); const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const metrics = ['BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', 'CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'];
  const q = metrics.map(x => 'dailyMetrics=' + x).join('&') + `&dailyRange.start_date.year=${y}&dailyRange.start_date.month=${mo}&dailyRange.start_date.day=1&dailyRange.end_date.year=${y}&dailyRange.end_date.month=${mo}&dailyRange.end_date.day=${last}`;
  const j = await g(`https://businessprofileperformance.googleapis.com/v1/locations/${loc}:fetchMultiDailyMetricsTimeSeries?${q}`);
  const sum: Record<string, number> = {};
  for (const s of j.multiDailyMetricTimeSeries || []) for (const d of s.dailyMetricTimeSeries || []) {
    const k = d.dailyMetric; sum[k] = (sum[k] || 0) + (d.timeSeries?.datedValues || []).reduce((a: number, v: Any) => a + Number(v.value || 0), 0);
  }
  const views = (sum.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) + (sum.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) + (sum.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) + (sum.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0);
  const res = { month: m, views, calls: sum.CALL_CLICKS || 0, website: sum.WEBSITE_CLICKS || 0, directions: sum.BUSINESS_DIRECTION_REQUESTS || 0, raw: sum, at: new Date().toISOString() };
  await db().upsert({ coll: 'gbpstats', id: m, data: res, updated_at: new Date().toISOString() });
  if (b.notify !== false) await tg(`📍 גוגל עסקי, חודש ${m.slice(5)}/${m.slice(0, 4)}:\nצפו בפרופיל: ${views}\nלחצו להתקשר: ${res.calls}\nנכנסו לאתר: ${res.website}\nביקשו מסלול הגעה: ${res.directions}`);
  return { ok: true, ...res };
}
async function locations() {
  const { acc, loc } = await ids();
  const j = await g(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${acc}/locations?pageSize=100&readMask=name,title,websiteUri,phoneNumbers,storefrontAddress,metadata,openInfo`);
  return { ok: true, main: loc, locations: (j.locations || []).map((l: Any) => ({ id: String(l.name || '').replace('locations/', ''), title: l.title, website: l.websiteUri || '', phone: l.phoneNumbers?.primaryPhone || '', address: (l.storefrontAddress?.addressLines || []).join(' ') + ' ' + (l.storefrontAddress?.locality || ''), verified: !!l.metadata?.hasVoiceOfMerchant, mapsUri: l.metadata?.mapsUri || '', status: l.openInfo?.status || '' })) };
}
// deletes ONE duplicate location; never the main one (Yakir approved deleting the unverified duplicate on 18.10.2026)
async function delDup(b: Any) {
  const { loc } = await ids(); const id = String(b.location || '').replace(/[^0-9]/g, '');
  if (!id || id === loc) throw new Error('refused: missing id or main location');
  const r = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${id}`, { method: 'DELETE', headers: { authorization: 'Bearer ' + await access() } });
  const t = await r.text(); if (!r.ok) throw new Error(`google ${r.status}: ${t.slice(0, 300)}`);
  await merge('settings', 'gbp', { duplicateDeleted: { id, title: String(b.title || ''), at: new Date().toISOString() } });
  return { ok: true, deleted: id };
}

// ---- weekly posts, published directly through the Business Profile API (Yakir, 21.10.2026: Postoria timed out on Google,
// so Claude publishes the Google Business posts directly). Calendar rows (docs coll 'pub') with channel 'gbpdirect',
// status 'planned' and a time that has come (Israel time, up to 6 hours late) are posted as a STANDARD local post with a
// photo and a "LEARN_MORE" button to the article. Cron: POST ?step=due every 10 minutes. Postoria ignores 'gbpdirect'.
const ilNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' }).slice(0, 16).replace(' ', 'T');
async function postDue(b: Any) {
  const { acc, loc } = await ids();
  const now = ilNow(); const minAt = new Date(Date.now() - 6 * 3600e3).toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' }).slice(0, 16).replace(' ', 'T');
  const { data } = await db().select('id,data').eq('coll', 'pub').eq('data->>status', 'planned').contains('data', { channels: ['gbpdirect'] });
  const set = (await getDoc('settings', 'pub')) || {}; const MEDIA = String(set.media || '');
  const out: Any[] = [];
  for (const row of data || []) {
    const r = row.data; const at = String(r.at || '');
    if (b.id ? row.id !== b.id : !(at <= now && at >= minAt)) continue;
    const prev = (r.result && r.result.gbp) || {}; if (prev.ok) continue;
    const text = String(r.textGbp || r.text || '').trim().slice(0, 1450);
    const link = r.gbpLink || r.link || 'https://dabullaw.co.il/';
    const img = ((r.media || []) as string[]).map(u => String(u).replace('{MEDIA}', MEDIA)).find(u => /^https:\/\//.test(u));
    const body: Any = { languageCode: 'he', topicType: 'STANDARD', summary: text, callToAction: { actionType: 'LEARN_MORE', url: link } };
    if (img) body.media = [{ mediaFormat: 'PHOTO', sourceUrl: img }];
    const tries = Number(prev.tries || 0) + 1;
    try {
      const j = await g(`https://mybusiness.googleapis.com/v4/accounts/${acc}/locations/${loc}/localPosts`, 'POST', body);
      await merge('pub', row.id, { status: 'published', result: { ...(r.result || {}), gbp: { ok: true, via: 'gbp-api', name: j.name || '', url: j.searchUrl || '', at: new Date().toISOString() } } });
      out.push({ id: row.id, ok: true, url: j.searchUrl || '' });
    } catch (e) {
      const err = String((e as Error).message || e).slice(0, 300);
      const late = at < minAt || tries >= 4;
      await merge('pub', row.id, { status: late ? 'missed' : 'planned', result: { ...(r.result || {}), gbp: { ok: false, via: 'gbp-api', error: err, tries, at: new Date().toISOString() } } });
      if (tries === 1 || late) await tg(`⚠️ הפוסט לגוגל עסקי ${late ? 'לא עלה' : 'לא עלה בניסיון הראשון, אנסה שוב בעוד 10 דקות'}: ${r.title || row.id}\n${err.slice(0, 200)}`);
      out.push({ id: row.id, ok: false, error: err });
    }
  }
  return { ok: true, posted: out };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url); const a = url.searchParams.get('a') || '', t = (url.searchParams.get('t') || '').replace(/[^a-f0-9]/g, '');
  try {
    if (a === 'ok' || a === 'no') return await act(req, a, t);
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
    const step = url.searchParams.get('step'); const b = await req.json().catch(() => ({}));
    if (step === 'sync') return json(await sync());
    if (step === 'ask') return json(await ask(b));
    if (step === 'stats') return json(await stats(b));
    if (step === 'locations') return json(await locations());
    if (step === 'deldup') return json(await delDup(b));
    if (step === 'due') return json(await postDue(b));
    if (step === 'ping') { await access(); const { acc, loc } = await ids(); return json({ ok: true, acc: !!acc, loc: !!loc }); }
    return json({ error: 'step?' }, 400);
  } catch (e) { console.error(e); return a ? page('משהו השתבש', '<p>נסו שוב בעוד דקה.</p>', 500) : json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
