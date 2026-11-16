// rank (15.11.2026, Yakir: "תבנה את הכל ותעשה את כל החיבורים"): Google position tracking for dabullaw.co.il,
// shown in the office system under "קידום בגוגל".
//
// Keywords: docs coll "rankkw" (one doc per keyword). Settings and run state: docs settings/rank.
// Sources of keywords (action scan): the site itself (article titles + Yoast focus keywords, WordPress REST) and
// Google Search Console (queries the site already shows for, last 28 days, with their average position per device).
//
// Exact positions come from DataForSEO (Google Israel, Hebrew, mobile + desktop), only once Yakir saves his API login
// in the office screen (action save-key; stored in app_secrets DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD, never returned).
// Until then the table shows the Search Console average position, marked as such.
//   check    -> standard queue tasks for every tracked keyword x device (cheap), results picked up by collect
//   collect  -> reads finished tasks: position, ranking URL, top 3 competitors, SERP features, AI Overview citation
//   now {id} -> live check of one keyword (both devices), for the "בדיקה עכשיו" button
//   kwdata   -> monthly search volume, CPC and competition (Google Ads data via DataForSEO) + search intent (Claude)
//   gpt      -> ChatGPT search: does the answer for the keyword cite dabullaw.co.il (DataForSEO LLM scraper)
//   weekly   -> scan + check + gpt (cron, Sunday morning); collect sends the Telegram summary when the run is done
// Calls: from the office app (signed-in office user) or with x-cron-secret.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const SITE = 'https://dabullaw.co.il';
const HOST = 'dabullaw.co.il';
const D4S = 'https://api.dataforseo.com/v3';
const LOC = { location_name: 'Israel', language_name: 'Hebrew' };
// Google Ads data (volume, CPC) does not accept language_name Hebrew: it wants the codes (Israel 2376, Hebrew 'iw')
const KLOC = { location_code: 2376, language_code: 'iw' };
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;
const S: Record<string, string> = {};
let sAt = 0;
const env = (k: string) => Deno.env.get(k) || S[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }));
async function secrets(force = false) {
  if (!force && Date.now() - sAt < 60_000) return;
  const { data } = await sb().from('app_secrets').select('k,v');
  (data || []).forEach((r: { k: string; v: string }) => { S[r.k] = r.v; });
  sAt = Date.now();
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
const db = () => sb().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const allDocs = async (coll: string): Promise<Any[]> => {
  const out: Any[] = []; let from = 0;
  for (;;) {
    const { data } = await db().select('id,data').eq('coll', coll).range(from, from + 999);
    (data || []).forEach((r: Any) => out.push(Object.assign({ id: r.id }, r.data)));
    if (!data || data.length < 1000) break; from += 1000;
  }
  return out;
};
const merge = async (coll: string, id: string, patch: Any) => { const { error } = await sb().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch }); if (error) throw new Error(error.message); };
const today = () => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
const norm = (k: string) => String(k || '').replace(/[‏‎]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
async function kid(k: string) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(norm(k))));
  return 'k' + Array.from(h.slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}
async function tg(text: string) {
  const t = env('TELEGRAM_BOT_TOKEN'), c = env('TELEGRAM_CHAT_ID'); if (!t || !c) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: c, text: text.slice(0, 3900), disable_web_page_preview: true }) }).catch(() => null);
}

// ---------- auth ----------
async function allowed(req: Request) {
  if (req.headers.get('x-cron-secret') && req.headers.get('x-cron-secret') === env('CRON_SECRET')) return 'cron';
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''); if (!jwt) return '';
  const { data } = await sb().auth.getUser(jwt); const email = (data && data.user && data.user.email || '').toLowerCase(); if (!email) return '';
  const { data: u } = await sb().from('office_users').select('email').ilike('email', email).limit(1);
  return u && u.length ? email : '';
}

// ---------- DataForSEO ----------
const d4sOn = () => !!(env('DATAFORSEO_LOGIN') && env('DATAFORSEO_PASSWORD'));
async function d4s(path: string, body?: unknown, login?: string, pass?: string) {
  const auth = 'Basic ' + btoa(`${login || env('DATAFORSEO_LOGIN')}:${pass || env('DATAFORSEO_PASSWORD')}`);
  const r = await fetch(D4S + path, body === undefined ? { headers: { authorization: auth } } : { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.status_code && j.status_code >= 40000)) throw new Error(`DataForSEO ${j.status_code || r.status}: ${j.status_message || 'error'}`);
  // one-task calls: a task error comes back inside a 200 answer, so surface it
  const t0 = j.tasks && j.tasks.length === 1 ? j.tasks[0] : null;
  if (t0 && t0.status_code >= 40000) throw new Error(`DataForSEO ${t0.status_code}: ${t0.status_message || 'error'}`);
  return j;
}
async function addSpend(cost: number) {
  if (!cost) return;
  const st = (await getDoc('settings', 'rank')) || {};
  const m = today().slice(0, 7);
  const spent = Object.assign({}, st.spent || {}); spent[m] = Math.round(((spent[m] || 0) + cost) * 10000) / 10000;
  await merge('settings', 'rank', { spent });
}

// every URL anywhere inside a SERP item (AI Overview references, ChatGPT sources...)
function urlsIn(o: Any, out: string[] = []): string[] {
  if (!o) return out;
  if (typeof o === 'string') { if (/^https?:\/\//.test(o)) out.push(o); return out; }
  if (Array.isArray(o)) { o.forEach(x => urlsIn(x, out)); return out; }
  if (typeof o === 'object') Object.values(o).forEach(x => urlsIn(x, out));
  return out;
}
const ours = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') === HOST; } catch { return false; } };

// one finished SERP -> what we keep
function readSerp(res: Any) {
  const items: Any[] = (res && res.items) || [];
  const org = items.filter(i => i.type === 'organic');
  const mine = org.find(i => ours(i.url || ''));
  const top = org.filter(i => !ours(i.url || '')).slice(0, 3).map(i => ({ p: i.rank_group, d: String(i.domain || '').replace(/^www\./, ''), u: i.url, t: String(i.title || '').slice(0, 120) }));
  const feat = [...new Set(((res && res.item_types) || items.map(i => i.type)).filter((t: string) => t !== 'organic'))];
  const aio = items.find(i => i.type === 'ai_overview');
  const aioUrls = aio ? urlsIn(aio) : [];
  const local = items.find(i => i.type === 'local_pack' && /דבול|dabul/i.test(JSON.stringify(i)));
  return {
    pos: mine ? mine.rank_group : null, abs: mine ? mine.rank_absolute : null, url: mine ? mine.url : '',
    top, feat, aio: aio ? { on: true, cited: aioUrls.some(ours) } : { on: false, cited: false }, localPack: !!local,
    total: res && res.se_results_count || null,
  };
}

// keeps the history and the before / now / first values for one keyword
async function storeSerp(id: string, dev: 'm' | 'd', r: ReturnType<typeof readSerp>, depth: number) {
  const k = (await getDoc('rankkw', id)) || {};
  const d = today();
  // history rows: {day, m, d, mu, du} (m = mobile position, d = desktop position)
  const hist: Any[] = Array.isArray(k.hist) ? k.hist.filter((x: Any) => x && x.day).slice() : [];
  let h = hist.find(x => x.day === d);
  if (!h) { h = { day: d }; hist.push(h); }
  h[dev] = r.pos; h[dev + 'u'] = r.url;
  hist.sort((a, b) => a.day.localeCompare(b.day));
  const last = Object.assign({}, k.last || {});
  const prev = Object.assign({}, k.prev || {});
  const first = Object.assign({}, k.first || {});
  // the previous check of this device (an earlier day) becomes "before"
  const older = hist.filter(x => x.day < d && dev in x);
  if (older.length) prev[dev] = older[older.length - 1][dev]; else if (!(dev in prev)) prev[dev] = undefined;
  if (!(dev in first)) first[dev] = r.pos;
  last[dev] = r.pos; last[dev + 'u'] = r.url; last[dev + 'top'] = r.top; last.at = new Date().toISOString(); last.depth = depth;
  last.feat = r.feat; if (dev === 'd' || !last.aio) last.aio = r.aio; if (r.aio && r.aio.cited) last.aio = r.aio;
  last.localPack = r.localPack || last.localPack || false;
  const best = Object.assign({}, k.best || {});
  if (r.pos && (!best[dev] || r.pos < best[dev])) best[dev] = r.pos;
  await merge('rankkw', id, { hist: hist.slice(-80), last, prev, first, best });
}

// ---------- keyword sources ----------
async function wpAll(type: string) {
  const auth = 'Basic ' + btoa(`${env('WP_USER')}:${env('WP_APP_PASSWORD')}`);
  const out: Any[] = [];
  for (let p = 1; p <= 6; p++) {
    const r = await fetch(`${SITE}/wp-json/wp/v2/${type}?status=publish&per_page=100&page=${p}&context=edit&_fields=id,link,title,meta`, { headers: { authorization: auth } });
    if (!r.ok) break; const j = await r.json().catch(() => []); if (!Array.isArray(j) || !j.length) break;
    out.push(...j); if (j.length < 100) break;
  }
  return out;
}
const b64url = (b: ArrayBuffer | string) => { const by = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b); let s = ''; by.forEach(x => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
let gTok = '', gAt = 0;
async function gscToken() {
  if (gTok && Date.now() - gAt < 3000e3) return gTok;
  const sa = JSON.parse(env('GOOGLE_SA_JSON')); const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` })).json();
  if (!t.access_token) throw new Error('Search Console token'); gTok = t.access_token; gAt = Date.now(); return gTok;
}
async function gsc(body: Any) {
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env('GSC_SITE'))}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${await gscToken()}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error('Search Console ' + r.status); return (j.rows || []) as Any[];
}
const ago = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

async function scan() {
  const have = new Map((await allDocs('rankkw')).map(k => [k.id, k]));
  const add = new Map<string, Any>();
  const put = async (kw: string, src: string, page: string, extra: Any = {}) => {
    kw = String(kw || '').replace(/\s+/g, ' ').trim(); if (kw.length < 3 || kw.length > 90) return;
    const id = await kid(kw); const cur = add.get(id) || { kw, src: [], page: '' };
    if (!cur.src.includes(src)) cur.src.push(src); if (!cur.page && page) cur.page = page;
    Object.assign(cur, extra); add.set(id, cur);
  };
  // 1. the site: Yoast focus keyword of every article / page, and the title as a candidate
  for (const type of ['posts', 'pages']) {
    for (const p of await wpAll(type)) {
      const fk = p.meta && p.meta._yoast_wpseo_focuskw; const link = p.link || '';
      if (fk) await put(fk, 'site', link);
    }
  }
  // 2. Search Console: queries with impressions in the last 28 days (+ the page that showed)
  const rows = await gsc({ startDate: ago(30), endDate: ago(2), dimensions: ['query', 'page'], rowLimit: 5000 });
  const byQ = new Map<string, Any>();
  for (const r of rows) {
    const q = r.keys[0], pg = r.keys[1]; const o = byQ.get(q) || { impr: 0, clicks: 0, posW: 0, page: pg, pageImpr: 0 };
    o.impr += r.impressions; o.clicks += r.clicks; o.posW += r.position * r.impressions; if (r.impressions > o.pageImpr) { o.page = pg; o.pageImpr = r.impressions; }
    byQ.set(q, o);
  }
  const top = [...byQ.entries()].filter(([, o]) => o.impr >= 3).sort((a, b) => b[1].impr - a[1].impr).slice(0, 600);
  for (const [q, o] of top) await put(q, 'gsc', o.page, { gsc28: { impr: o.impr, clicks: o.clicks, pos: Math.round(o.posW / o.impr * 10) / 10, at: today() } });
  let added = 0, updated = 0;
  for (const [id, v] of add) {
    const cur = have.get(id);
    if (!cur) { await merge('rankkw', id, Object.assign({ kw: v.kw, src: v.src, page: v.page, tracked: false, added: new Date().toISOString() }, v.gsc28 ? { gsc28: v.gsc28 } : {})); added++; }
    else { const src = [...new Set([...(cur.src || []), ...v.src])]; await merge('rankkw', id, Object.assign({ src }, v.page && !cur.page ? { page: v.page } : {}, v.gsc28 ? { gsc28: v.gsc28 } : {})); updated++; }
  }
  await gscDevices();
  await merge('settings', 'rank', { lastScan: new Date().toISOString(), scanCount: add.size });
  return { found: add.size, added, updated };
}

// Search Console average position per device for the tracked keywords (free; shown until exact checks exist)
async function gscDevices() {
  const kws = (await allDocs('rankkw')).filter(k => k.tracked && !k.hidden);
  if (!kws.length) return 0;
  const rows = await gsc({ startDate: ago(9), endDate: ago(2), dimensions: ['query', 'device'], rowLimit: 25000 });
  const m = new Map<string, Any>();
  for (const r of rows) { const q = norm(r.keys[0]); const o = m.get(q) || {}; o[r.keys[1] === 'MOBILE' ? 'm' : r.keys[1] === 'DESKTOP' ? 'd' : 't'] = { pos: Math.round(r.position * 10) / 10, impr: r.impressions, clicks: r.clicks }; m.set(q, o); }
  for (const k of kws) {
    const o = m.get(norm(k.kw)) || {};
    const g7 = { m: o.m ? o.m.pos : null, d: o.d ? o.d.pos : null, mi: o.m ? o.m.impr : 0, di: o.d ? o.d.impr : 0, at: today() };
    const gh: Any[] = Array.isArray(k.gh) ? k.gh.filter((x: Any) => x && x.day && x.day !== today()) : [];
    gh.push({ day: today(), m: g7.m, d: g7.d }); gh.sort((a, b) => a.day.localeCompare(b.day));
    await merge('rankkw', k.id, { g7, gprev: k.g7 && k.g7.at !== today() ? { m: k.g7.m, d: k.g7.d, at: k.g7.at } : (k.gprev || null), gh: gh.slice(-40) });
  }
  return kws.length;
}

// ---------- exact checks (DataForSEO) ----------
async function check(ids?: string[]) {
  if (!d4sOn()) return { skipped: 'not-connected' };
  const st = (await getDoc('settings', 'rank')) || {};
  const depth = Math.min(100, Math.max(10, +st.depth || 50));
  const kws = (await allDocs('rankkw')).filter(k => k.tracked && !k.hidden && (!ids || ids.includes(k.id)));
  const tasks: Any[] = [];
  for (const k of kws) for (const dev of ['mobile', 'desktop']) tasks.push(Object.assign({ keyword: k.kw, device: dev, os: dev === 'mobile' ? 'android' : 'windows', depth, load_async_ai_overview: true, tag: `${k.id}|${dev === 'mobile' ? 'm' : 'd'}` }, LOC));
  let posted = 0, cost = 0; const pending: string[] = [];
  for (let i = 0; i < tasks.length; i += 100) {
    const j = await d4s('/serp/google/organic/task_post', tasks.slice(i, i + 100));
    cost += j.cost || 0;
    (j.tasks || []).forEach((t: Any) => { if (t.id && t.status_code < 40000) { pending.push(t.id); posted++; } });
  }
  await addSpend(cost);
  await merge('settings', 'rank', { pending: [...new Set([...(st.pending || []), ...pending])], runAt: new Date().toISOString(), runTasks: posted, runDone: 0, depth });
  return { posted, cost };
}
async function collect() {
  if (!d4sOn()) return { skipped: 'not-connected' };
  const st = (await getDoc('settings', 'rank')) || {};
  let pend: string[] = st.pending || []; if (!pend.length) return { done: 0 };
  const ready = await d4s('/serp/google/organic/tasks_ready');
  const ids = new Set<string>(); (ready.tasks || []).forEach((t: Any) => (t.result || []).forEach((r: Any) => ids.add(r.id)));
  let done = 0, cost = 0;
  for (const id of pend.filter(x => ids.has(x)).slice(0, 120)) {
    try {
      const j = await d4s(`/serp/google/organic/task_get/advanced/${id}`);
      cost += j.cost || 0;
      const t = (j.tasks || [])[0]; const res = t && t.result && t.result[0]; const tag = t && t.data && t.data.tag || '';
      const [kwId, dev] = String(tag).split('|');
      if (res && kwId) await storeSerp(kwId, dev === 'd' ? 'd' : 'm', readSerp(res), +(t.data.depth || 50));
      pend = pend.filter(x => x !== id); done++;
    } catch (e) { console.error('collect', id, e); }
  }
  // tasks older than 3 days are dropped
  if (st.runAt && Date.now() - Date.parse(st.runAt) > 3 * 864e5) pend = [];
  await addSpend(cost);
  const runDone = (st.runDone || 0) + done;
  await merge('settings', 'rank', { pending: pend, runDone, collectAt: new Date().toISOString() });
  if (!pend.length && st.runTasks && !st.runReported) { await merge('settings', 'rank', { runReported: st.runAt }); await report(); }
  return { done, left: pend.length };
}
async function liveOne(id: string) {
  if (!d4sOn()) throw new Error('השירות עוד לא מחובר');
  const k = await getDoc('rankkw', id); if (!k) throw new Error('המילה לא נמצאה');
  const st = (await getDoc('settings', 'rank')) || {}; const depth = Math.min(100, Math.max(10, +st.depth || 50));
  let cost = 0;
  for (const dev of ['mobile', 'desktop']) {
    const j = await d4s('/serp/google/organic/live/advanced', [Object.assign({ keyword: k.kw, device: dev, os: dev === 'mobile' ? 'android' : 'windows', depth, load_async_ai_overview: true }, LOC)]);
    cost += j.cost || 0;
    const res = j.tasks && j.tasks[0] && j.tasks[0].result && j.tasks[0].result[0];
    if (res) await storeSerp(id, dev === 'mobile' ? 'm' : 'd', readSerp(res), depth);
  }
  await addSpend(cost);
  return { ok: true, cost };
}

// ---------- keyword data: volume, CPC, competition, intent ----------
async function kwdata(ids?: string[]) {
  const kws = (await allDocs('rankkw')).filter(k => !k.hidden && (ids ? ids.includes(k.id) : k.tracked));
  if (!kws.length) return { n: 0 };
  let n = 0;
  if (d4sOn()) {
    let cost = 0;
    for (let i = 0; i < kws.length; i += 900) {
      const part = kws.slice(i, i + 900);
      const j = await d4s('/keywords_data/google_ads/search_volume/live', [Object.assign({ keywords: part.map(k => k.kw.slice(0, 80)) }, KLOC)]);
      cost += j.cost || 0;
      const rows: Any[] = (j.tasks && j.tasks[0] && j.tasks[0].result) || [];
      const map = new Map(rows.map(r => [norm(r.keyword), r]));
      for (const k of part) {
        const r = map.get(norm(k.kw)); if (!r) continue;
        await merge('rankkw', k.id, { vol: r.search_volume ?? null, cpc: r.cpc ?? null, comp: r.competition ?? null, compIdx: r.competition_index ?? null, bidLow: r.low_top_of_page_bid ?? null, bidHigh: r.high_top_of_page_bid ?? null, trend: (r.monthly_searches || []).slice(0, 12).map((m: Any) => [m.year, m.month, m.search_volume]), volAt: today() });
        n++;
      }
    }
    await addSpend(cost);
  }
  // search intent in Hebrew (Claude), for keywords that have none yet
  const need = kws.filter(k => !k.intent).slice(0, 300);
  for (let i = 0; i < need.length; i += 60) {
    const part = need.slice(i, i + 60);
    const prompt = `סווג כל מילת חיפוש בעברית לכוונת החיפוש העיקרית שלה. ענה ב-JSON בלבד: מערך של אובייקטים {"i":מספר,"intent":"info"|"commercial"|"transactional"|"navigational","local":true|false}.
info = מחפש מידע או הסבר. commercial = משווה או בודק לפני שבוחר שירות. transactional = רוצה לקבל שירות או לפנות עכשיו. navigational = מחפש אתר או גוף מסוים. local = החיפוש קשור למקום (עיר, אזור, "ליד").
${part.map((k, j) => `${j}. ${k.kw}`).join('\n')}`;
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: Object.assign({ 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, env('ANTHROPIC_WORKSPACE_ID') ? { 'anthropic-workspace-id': env('ANTHROPIC_WORKSPACE_ID') } : {}), body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }) });
      const j = await r.json(); const txt = (j.content || []).map((c: Any) => c.text || '').join('');
      const arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
      for (const a of arr) { const k = part[+a.i]; if (k && a.intent) await merge('rankkw', k.id, { intent: a.intent, local: !!a.local }); }
    } catch (e) { console.error('intent', e); }
  }
  await merge('settings', 'rank', { kwdataAt: new Date().toISOString() });
  return { n };
}

// ---------- ChatGPT search ----------
async function gpt(ids?: string[]) {
  if (!d4sOn()) return { skipped: 'not-connected' };
  const kws = (await allDocs('rankkw')).filter(k => k.tracked && !k.hidden && (!ids || ids.includes(k.id))).slice(0, 150);
  let n = 0, cost = 0; const errs: string[] = [];
  // each answer takes about 15 seconds, so ask 6 at a time
  const one = async (k: Any) => {
    try {
      const j = await d4s('/ai_optimization/chat_gpt/llm_scraper/live/advanced', [Object.assign({ keyword: k.kw }, LOC)]);
      cost += j.cost || 0;
      const res = j.tasks && j.tasks[0] && j.tasks[0].result && j.tasks[0].result[0];
      const urls = urlsIn(res); const text = JSON.stringify(res || '');
      await merge('rankkw', k.id, { gpt: { at: today(), cited: urls.some(ours), named: /דבול|dabul/i.test(text), sources: [...new Set(urls.map(u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }).filter(Boolean))].slice(0, 8) } });
      n++;
    } catch (e) { errs.push(String((e as Error).message || e)); }
  };
  for (let i = 0; i < kws.length && errs.length <= 3; i += 6) await Promise.all(kws.slice(i, i + 6).map(one));
  await addSpend(cost);
  await merge('settings', 'rank', { gptAt: new Date().toISOString(), gptErr: errs[0] || '' });
  return { n, cost, err: errs[0] || '' };
}

// ---------- weekly summary to Telegram ----------
async function report() {
  // exact positions (mobile) when checked, otherwise the Search Console average
  const kws = (await allDocs('rankkw')).filter(k => k.tracked && !k.hidden && (k.last || k.g7));
  if (!kws.length) return;
  const exact = kws.some(k => k.last);
  const cur = (k: Any) => k.last ? k.last.m : (k.g7 ? k.g7.m : null);
  const prv = (k: Any) => k.last ? (k.prev ? k.prev.m : null) : (k.gprev ? k.gprev.m : null);
  const mv = (k: Any) => { const c = cur(k), p = prv(k); return c && p ? p - c : 0; };
  const fmt = (v: Any) => v ? (exact ? String(v) : String(Math.round(v))) : 'לא נמצא';
  const up = kws.filter(k => mv(k) >= 3).sort((a, b) => mv(b) - mv(a));
  const down = kws.filter(k => mv(k) <= -3).sort((a, b) => mv(a) - mv(b));
  const top10 = kws.filter(k => cur(k) && cur(k) <= 10).length, top3 = kws.filter(k => cur(k) && cur(k) <= 3).length;
  const aio = kws.filter(k => k.last && k.last.aio && k.last.aio.cited).length, gp = kws.filter(k => k.gpt && (k.gpt.cited || k.gpt.named)).length;
  const line = (k: Any) => `• ${k.kw}: ${fmt(prv(k))} ← ${fmt(cur(k))}`;
  await tg([`📈 מיקומים בגוגל (נייד), סיכום שבועי${exact ? '' : ' (מיקום ממוצע מכלי המעקב של גוגל)'}`, `במעקב: ${kws.length} מילים · בעמוד הראשון: ${top10} · בשלושת הראשונים: ${top3}`,
    exact ? `מצוטט בתשובת הבינה המלאכותית של גוגל: ${aio} · מופיע בחיפוש של צ׳אט ג׳י פי טי: ${gp}` : '',
    up.length ? `\nעלו:\n${up.slice(0, 8).map(line).join('\n')}` : '', down.length ? `\nירדו:\n${down.slice(0, 8).map(line).join('\n')}` : '',
    `\nהטבלה המלאה: מערכת המשרד ← קידום בגוגל`].filter(Boolean).join('\n'));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    await secrets();
    const who = await allowed(req); if (!who) return json({ error: 'אין הרשאה' }, 401);
    const b = await req.json().catch(() => ({}));
    const a = String(b.action || '');
    if (a === 'status') {
      const st = (await getDoc('settings', 'rank')) || {};
      let balance: number | null = null, err = '';
      if (d4sOn()) { try { const j = await d4s('/appendix/user_data'); balance = j.tasks && j.tasks[0] && j.tasks[0].result && j.tasks[0].result[0] && j.tasks[0].result[0].money ? j.tasks[0].result[0].money.balance : null; } catch (e) { err = String((e as Error).message); } }
      return json({ connected: d4sOn(), login: d4sOn() ? env('DATAFORSEO_LOGIN').replace(/^(.{2}).*(@.*)?$/, '$1***$2') : '', balance, err, settings: st });
    }
    if (a === 'save-key') {
      const login = String(b.login || '').trim(), pass = String(b.password || '').trim();
      if (!login || !pass) return json({ error: 'חסר שם משתמש או סיסמה' }, 400);
      try { await d4s('/appendix/user_data', undefined, login, pass); } catch (e) { return json({ error: 'החיבור לא הצליח. בדוק שהעתקת את פרטי הגישה לממשק ולא את סיסמת הכניסה לאתר. (' + String((e as Error).message).slice(0, 80) + ')' }, 400); }
      for (const [k, v] of [['DATAFORSEO_LOGIN', login], ['DATAFORSEO_PASSWORD', pass]]) { const { error } = await sb().from('app_secrets').upsert({ k, v }, { onConflict: 'k' }); if (error) throw new Error(error.message); }
      await secrets(true); await merge('settings', 'rank', { connectedAt: new Date().toISOString() });
      return json({ ok: true });
    }
    if (a === 'settings') { const p: Any = {}; if (b.depth) p.depth = Math.min(100, Math.max(10, +b.depth)); if (b.freq) p.freq = b.freq === 'daily' ? 'daily' : 'weekly'; await merge('settings', 'rank', p); return json({ ok: true }); }
    if (a === 'scan') return json(await scan());
    if (a === 'gsc') return json({ n: await gscDevices() });
    if (a === 'add') {
      const list = (Array.isArray(b.kws) ? b.kws : String(b.kws || '').split(/\n|,/)).map((x: string) => String(x).replace(/\s+/g, ' ').trim()).filter((x: string) => x.length >= 2 && x.length <= 90).slice(0, 200);
      const ids: string[] = [];
      for (const kw of list) { const id = await kid(kw); const cur = await getDoc('rankkw', id); ids.push(id);
        await merge('rankkw', id, cur ? { tracked: true, hidden: false, src: [...new Set([...(cur.src || []), 'own'])] } : { kw, src: ['own'], tracked: true, hidden: false, added: new Date().toISOString() }); }
      // first data for the new words: Search Console average now, volume and intent, an exact check when connected
      EdgeRuntime.waitUntil((async () => { try { await gscDevices(); await kwdata(ids); if (d4sOn()) await check(ids); } catch (e) { console.error(e); } })());
      return json({ ok: true, n: ids.length });
    }
    if (a === 'track') {
      const ids: string[] = (b.ids || [b.id]).filter(Boolean);
      for (const id of ids) await merge('rankkw', id, b.on === false ? { tracked: false } : { tracked: true, hidden: false });
      if (b.on !== false) EdgeRuntime.waitUntil((async () => { try { await gscDevices(); await kwdata(ids); if (d4sOn()) await check(ids); } catch (e) { console.error(e); } })());
      return json({ ok: true });
    }
    if (a === 'hide') { for (const id of (b.ids || [b.id]).filter(Boolean)) await merge('rankkw', id, { hidden: true, tracked: false }); return json({ ok: true }); }
    if (a === 'unhide') { for (const id of (b.ids || [b.id]).filter(Boolean)) await merge('rankkw', id, { hidden: false }); return json({ ok: true }); }
    if (a === 'check') return json(await check(b.ids));
    if (a === 'collect') return json(await collect());
    if (a === 'now') return json(await liveOne(String(b.id || '')));
    if (a === 'kwdata') return json(await kwdata(b.ids));
    if (a === 'gpt') return json(await gpt(b.ids));
    if (a === 'report') { await report(); return json({ ok: true }); }
    if (a === 'weekly') {
      const st = (await getDoc('settings', 'rank')) || {};
      const daily = st.freq === 'daily', sunday = new Date(Date.now() + 2 * 3600e3).getUTCDay() === 0;
      if (!daily && !sunday && !b.force) return json({ skipped: 'not today' });
      await merge('settings', 'rank', { runReported: '' });
      const out: Any = { scan: await scan().catch(e => String(e)) };
      if (d4sOn()) {
        out.check = await check().catch(e => String(e));
        if (sunday || b.force) out.gpt = await gpt().catch(e => String(e));
        if (!st.kwdataAt || Date.now() - Date.parse(st.kwdataAt) > 28 * 864e5) out.kwdata = await kwdata().catch(e => String(e));
      } else {
        out.kwdata = await kwdata().catch(e => String(e));
        if (sunday) await report().catch(() => null);
      }
      return json(out);
    }
    return json({ error: 'פעולה לא מוכרת' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e).slice(0, 300) }, 500);
  }
});
