// nws-push (29.10.2026, approved by Yakir): free web push notifications of nws.co.il for urgent flashes.
// No paid service: the standard Web Push protocol (VAPID, RFC 8292, and aes128gcm payload encryption, RFC 8291) done here with
// WebCrypto. The keys live in app_secrets (NWS_VAPID_PUBLIC, NWS_VAPID_PRIVATE, NWS_VAPID_SUBJECT); the public key is also in the
// site code (sites/nws/src/layouts/Base.astro).
// POST actions:
//   {action:'sub', sub:{endpoint, keys:{p256dh, auth}}}  open to the browser. Saves the browser's subscription (table nws_push_subs).
//     Only https addresses of the known push services; at most 5 new subscriptions a minute from one network address (kept in this
//     function's memory only). Nothing else about the reader is stored, only a coarse browser family ('chrome', 'safari'...).
//   {action:'unsub', endpoint}  open to the browser. Removes that subscription.
//   {action:'send', title, body, url, tag, endpoint?}  x-cron-secret only. Sends to every subscription (or to one endpoint, for
//     tests). A subscription the push service answers 404 or 410 (gone) is removed; one that keeps failing (20 times) too.
//   {action:'tick'}  x-cron-secret only, cron job "nws-push" every 2 minutes. Finds an urgent story published in the last 15
//     minutes that was not pushed yet (the isFlash rule of hns-feed, copied below), and pushes it: title "חדשות נתניה והשרון",
//     body the story title, url the story page on nws.co.il (only once that page is live, so a click never lands on a missing page).
//     At most one push every 10 minutes and 8 a day (Israel day), and never between 23:00 and 06:30 Israel time unless the story is
//     in the flash or police section AND looks like an emergency. Kill switch: hns_config k='nws_push' v {"off": true}.
//     Sent stories are kept in nws_push_log (story_id unique, so one story is never pushed twice, even by two ticks at once).
//   {action:'init'}  x-cron-secret only: makes the VAPID key pair (once, if missing) and answers the public key.
//   {action:'selftest'}  x-cron-secret only: a full round trip through Mozilla's free push service (see selftest below).
// No long or medium dashes in any text sent to readers.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'cache-control': 'no-store' };
const out = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
const SITE = 'https://nws.co.il';
const BRAND = 'חדשות נתניה והשרון';
const clean = (s: unknown) => String(s ?? '').replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ').replace(/\s{2,}/g, ' ').trim();
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

// ---------- base64url ----------
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function unb64u(s: string) {
  const t = s.replace(/-/g, '+').replace(/_/g, '/'); const p = t + '==='.slice((t.length + 3) % 4);
  const bin = atob(p); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}
const cat = (...a: Uint8Array[]) => { const n = a.reduce((s, x) => s + x.length, 0); const r = new Uint8Array(n); let o = 0; for (const x of a) { r.set(x, o); o += x.length; } return r; };
const te = new TextEncoder();

// ---------- secrets ----------
let SEC: Record<string, string> | null = null;
async function secrets() {
  if (SEC) return SEC;
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'NWS_VAPID_PUBLIC', 'NWS_VAPID_PRIVATE', 'NWS_VAPID_SUBJECT']);
  const s = Object.fromEntries((data || []).map((r: Any) => [r.k, String(r.v || '')]));
  if (s.NWS_VAPID_PUBLIC && s.NWS_VAPID_PRIVATE) SEC = s;
  return s;
}
async function authed(req: Request) {
  const s = await secrets();
  return !!s.CRON_SECRET && req.headers.get('x-cron-secret') === s.CRON_SECRET;
}

// ---------- VAPID (RFC 8292) ----------
let SIGN_KEY: CryptoKey | null = null;
async function signKey(pub: string, priv: string) {
  if (SIGN_KEY) return SIGN_KEY;
  const p = unb64u(pub);
  SIGN_KEY = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: priv, x: b64u(p.slice(1, 33)), y: b64u(p.slice(33, 65)), ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return SIGN_KEY;
}
const JWT_CACHE = new Map<string, { t: string; exp: number }>();
async function vapidAuth(endpoint: string, s: Record<string, string>) {
  const aud = new URL(endpoint).origin; const now = Math.floor(Date.now() / 1000);
  const c = JWT_CACHE.get(aud);
  if (c && c.exp - now > 3600) return `vapid t=${c.t}, k=${s.NWS_VAPID_PUBLIC}`;
  const exp = now + 12 * 3600;
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(te.encode(JSON.stringify({ aud, exp, sub: s.NWS_VAPID_SUBJECT || 'mailto:news@nws.co.il' })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signKey(s.NWS_VAPID_PUBLIC, s.NWS_VAPID_PRIVATE), te.encode(`${head}.${body}`)));
  const t = `${head}.${body}.${b64u(sig)}`;
  JWT_CACHE.set(aud, { t, exp });
  return `vapid t=${t}, k=${s.NWS_VAPID_PUBLIC}`;
}

// ---------- payload encryption, aes128gcm (RFC 8291 + RFC 8188) ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource }, k, len * 8));
}
async function encrypt(payload: Uint8Array, p256dh: string, auth: string) {
  const ua = unb64u(p256dh); const authSecret = unb64u(auth);
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, cat(te.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // record size 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

async function pushOne(sub: Any, payload: Uint8Array, s: Record<string, string>, topic: string) {
  try {
    const body = await encrypt(payload, sub.keys.p256dh, sub.keys.auth);
    const headers: Record<string, string> = { Authorization: await vapidAuth(sub.endpoint, s), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'high' };
    if (topic) headers.Topic = topic;
    const r = await fetch(sub.endpoint, { method: 'POST', headers, body, signal: AbortSignal.timeout(15000) });
    const txt = r.ok ? '' : (await r.text().catch(() => '')).slice(0, 200);
    return { status: r.status, txt };
  } catch (e) { return { status: 0, txt: String((e as Error)?.message || e).slice(0, 200) }; }
}

async function sendAll(msg: { title: string; body: string; url: string; tag: string }, only?: string) {
  const s = await secrets();
  if (!s.NWS_VAPID_PUBLIC || !s.NWS_VAPID_PRIVATE) return { error: 'no keys' };
  const payload = te.encode(JSON.stringify(msg));
  const topic = /^[A-Za-z0-9_-]{1,32}$/.test(msg.tag) ? msg.tag : '';
  let subs: Any[] = [];
  if (only) { const { data } = await sb.from('nws_push_subs').select('id,endpoint,keys,fails').eq('endpoint', only).limit(1); subs = data || []; }
  else {
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('nws_push_subs').select('id,endpoint,keys,fails').order('id').range(from, from + 999);
      subs.push(...(data || [])); if (!data || data.length < 1000) break;
    }
  }
  const res = { sent: subs.length, ok: 0, gone: 0, failed: 0, statuses: {} as Record<string, number>, errors: [] as string[] };
  const okIds: number[] = []; const goneIds: number[] = []; const failed: Any[] = [];
  for (let i = 0; i < subs.length; i += 25) {
    await Promise.all(subs.slice(i, i + 25).map(async (sub) => {
      const r = await pushOne(sub, payload, s, topic);
      res.statuses[r.status] = (res.statuses[r.status] || 0) + 1;
      if (r.status >= 200 && r.status < 300) { res.ok++; okIds.push(sub.id); }
      else if (r.status === 404 || r.status === 410) { res.gone++; goneIds.push(sub.id); }
      else { res.failed++; failed.push(sub); if (res.errors.length < 5) res.errors.push(`${r.status} ${r.txt}`); }
    }));
  }
  const now = new Date().toISOString();
  for (let i = 0; i < okIds.length; i += 500) await sb.from('nws_push_subs').update({ last_ok: now, fails: 0 }).in('id', okIds.slice(i, i + 500));
  for (let i = 0; i < goneIds.length; i += 500) await sb.from('nws_push_subs').delete().in('id', goneIds.slice(i, i + 500));
  for (const f of failed) {
    if ((f.fails || 0) + 1 >= 20) await sb.from('nws_push_subs').delete().eq('id', f.id);
    else await sb.from('nws_push_subs').update({ fails: (f.fails || 0) + 1 }).eq('id', f.id);
  }
  return res;
}

// ---------- subscribe / unsubscribe from the browser ----------
const PUSH_HOST = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com)$/;
function validEndpoint(e: unknown) {
  if (typeof e !== 'string' || e.length > 1024) return false;
  try { const u = new URL(e); return u.protocol === 'https:' && PUSH_HOST.test(u.hostname) && !u.port; } catch { return false; }
}
function validKeys(k: Any) {
  try {
    if (!k || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 120 || k.auth.length > 40) return false;
    const p = unb64u(k.p256dh), a = unb64u(k.auth); return p.length === 65 && p[0] === 4 && a.length === 16;
  } catch { return false; }
}
function browser(ua: string) {
  if (/Edg\//.test(ua)) return 'edge';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/OPR\//.test(ua)) return 'opera';
  if (/Chrome\//.test(ua)) return /Android/.test(ua) ? 'chrome-android' : 'chrome';
  if (/Safari\//.test(ua)) return /iPhone|iPad|iPod/.test(ua) ? 'safari-ios' : 'safari';
  return 'other';
}
const RL = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  if (!ip) return false;
  const now = Date.now();
  if (RL.size > 5000) for (const [k, v] of RL) if (now - v.t > 60e3) RL.delete(k);
  const r = RL.get(ip);
  if (!r || now - r.t > 60e3) { RL.set(ip, { n: 1, t: now }); return false; }
  return ++r.n > 5;
}

// ---------- the automatic tick ----------
// Mirrors isFlash in fn/hns-feed/index.ts (29.10.2026, Yakir approved): which published stories are flashes. Keep the two in step.
// In: police and crime, accidents and injuries, road closures and traffic changes, water and power outages, public warnings,
// election results, and urgent national news. Out: the fixed recurring pieces (Shabbat times, daily weather, weekend guide, events
// of the week, day summary), culture and leisure, community, real estate, sports, data pieces, blog guides and sponsored content.
const NO_FLASH_SEC = new Set(['blog', 'leisure', 'community', 'realestate', 'sports', 'tourism', 'law']);
const URGENT = /נפגע|נפצע|פצוע|פצועים|הרוג|נהרג|נרצח|רצח|תאונ|שריפ|דליק|חסימ|נחסם|נחסמ|ייחסם|ייחסמו|ייסגר|ייסגרו|נסגר|סגירת|הסדרי תנועה|שינויי תנועה|עבודות|הפסק(ת|ות) (מים|חשמל)|אין מים|אין חשמל|אזהר|מזהיר|ריקול|החזרה מהמדפים|אזעק|פיגוע|ירי|דקיר|נדקר|תקפ|תקיפ|נעצר|עצור|חשוד|כתב אישום|נעדר|חילוץ|לכוד|קרס|קריסת|דליפ|זיהום|חובש|פונה|פונו|החייאה|תגובה אלרגית|תוצאות הבחירות|ספירת|מנדטים|שיעור ההצבעה|אחוז ההצבעה|שביתה|מתקפ|טיל|יירוט|רעידת אדמה/;
function isFlash(s: Any) {
  if (s.kind === 'sponsored' || s.kind === 'opinion' || s.format) return false;
  if (/^auto:|hns-recurring|hns-data/.test(String(s.notes || ''))) return false;
  if (NO_FLASH_SEC.has(s.section)) return false;
  if (s.section === 'flash' || s.section === 'police' || (s.closure && typeof s.closure === 'object')) return true;
  return URGENT.test(`${s.title || ''} ${s.dek || ''}`);
}
// at night (23:00 to 06:30) only a real emergency in the flash or police section wakes people up
const EMERGENCY = /הרוג|נהרג|נהרגו|נרצח|רצח|ירי|יריות|פיגוע|מחבל|אזעק|טיל|רקט|יירוט|רעידת אדמה|פצועים קשה|פצוע קשה|במצב קשה|אנוש|רב נפגעים|שריפה גדולה|שריפת ענק|פינוי תושבים|פונו תושבים|הוראות פיקוד העורף|היכנסו למרחב מוגן|חומרים מסוכנים|דליפת גז|קריסת|קרס|נעדר|נעדרת|נחטף|חטיפ|צונאמי|הצפה|שטפון/;
// section key to the URL slug of the site (sites/nws/src/data/sections.ts); an unknown section is shown under flash (lib/content.ts)
const SLUG: Record<string, string> = { flash: 'flash', national: 'israel', city: 'city', police: 'police', realestate: 'real-estate', sports: 'sports', transport: 'transport', community: 'community', health: 'health', leisure: 'events', sharon: 'sharon', tourism: 'tourism', law: 'law', blog: 'blog' };
const storyUrl = (s: Any) => `${SITE}/${SLUG[s.section] || 'flash'}/n${s.id}/`;
const ilParts = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map((p) => [p.type, p.value]));
// the start of today in Israel, as an instant (the offset is +02:00 or +03:00)
function ilDayStart() {
  const p = ilParts(); const day = `${p.year}-${p.month}-${p.day}`;
  for (const off of ['+03:00', '+02:00']) { const t = Date.parse(`${day}T00:00:00${off}`); const q = ilParts(new Date(t)); if (q.hour === '00' && `${q.year}-${q.month}-${q.day}` === day) return new Date(t); }
  return new Date(Date.now() - 24 * 3600e3);
}

async function tick() {
  const { data: cfg } = await sb.from('hns_config').select('v').eq('k', 'nws_push').maybeSingle();
  if ((cfg?.v as Any)?.off === true) return { skip: 'off' };
  const { count: subs } = await sb.from('nws_push_subs').select('id', { count: 'exact', head: true });
  if (!subs) return { skip: 'no subscribers', subs: 0 };
  const { data: last } = await sb.from('nws_push_log').select('created_at').order('created_at', { ascending: false }).limit(1);
  const lastAt = last?.[0] ? Date.parse(last[0].created_at) : 0;
  if (Date.now() - lastAt < 10 * 60e3) return { skip: 'gap', subs };
  const { count: today } = await sb.from('nws_push_log').select('id', { count: 'exact', head: true }).gte('created_at', ilDayStart().toISOString());
  if ((today || 0) >= 8) return { skip: 'day limit', subs };
  const since = new Date(Date.now() - 15 * 60e3).toISOString();
  const { data: rows } = await sb.from('hns_stories').select('id,section,title,dek,body,kind,format,notes,closure,published_at')
    .eq('state', 'published').gte('published_at', since).order('published_at', { ascending: true }).limit(30);
  const cands = (rows || []).filter((s: Any) => s.title && Array.isArray(s.body) && s.body.length && isFlash(s));
  if (!cands.length) return { skip: 'none', subs };
  const { data: done } = await sb.from('nws_push_log').select('story_id').in('story_id', cands.map((s: Any) => s.id));
  const sent = new Set((done || []).map((r: Any) => Number(r.story_id)));
  const p = ilParts(); const hm = Number(p.hour) * 60 + Number(p.minute); const night = hm >= 23 * 60 || hm < 6 * 60 + 30;
  for (const s of cands) {
    if (sent.has(Number(s.id))) continue;
    if (night && !((s.section === 'flash' || s.section === 'police') && EMERGENCY.test(`${s.title || ''} ${s.dek || ''}`))) continue;
    const url = storyUrl(s);
    // only once the page is live on the site (it is built within a few minutes of publishing)
    const pg = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (!pg || pg.status !== 200) { await pg?.body?.cancel().catch(() => {}); continue; }
    await pg.body?.cancel().catch(() => {});
    const msg = { title: BRAND, body: clip(clean(s.title), 140), url, tag: `n${s.id}` };
    // the unique story_id makes this the lock: a second tick at the same moment cannot push the same story
    const { data: ins, error } = await sb.from('nws_push_log').insert({ story_id: s.id, kind: 'auto', title: msg.title, body: msg.body, url }).select('id').maybeSingle();
    if (error || !ins) continue;
    const r: Any = await sendAll(msg);
    await sb.from('nws_push_log').update({ sent: r.sent ?? 0, ok: r.ok ?? 0, gone: r.gone ?? 0, failed: r.failed ?? 0 }).eq('id', ins.id);
    return { pushed: s.id, url, sent: r.sent, delivered: r.ok, gone: r.gone, failed: r.failed, statuses: r.statuses, errors: r.errors };
  }
  return { skip: night ? 'night' : 'page not live yet', subs, cands: cands.length };
}

// ---------- self test: a real subscription at Mozilla's free push service, end to end ----------
// Plays the browser: opens the push service's WebSocket, registers with our VAPID key, subscribes through the normal 'sub' path,
// pushes to that one subscription, waits for the message, decrypts it like a browser would, then unsubscribes. Nothing is shown to
// anyone and nothing is left behind. Answers what happened at each step.
async function decrypt(buf: Uint8Array, uaPriv: CryptoKey, uaPub: Uint8Array, authSecret: Uint8Array) {
  const salt = buf.slice(0, 16); const idlen = buf[20]; const asPub = buf.slice(21, 21 + idlen); const ct = buf.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPriv, 256));
  const ikm = await hkdf(authSecret, shared, cat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  let pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  let end = pt.length - 1; while (end >= 0 && pt[end] === 0) end--; pt = pt.slice(0, end); // drop the 0x02 delimiter and padding
  return new TextDecoder().decode(pt);
}
async function selftest(fnUrl: string) {
  const s = await secrets();
  const steps: Record<string, unknown> = {};
  const ws = new WebSocket('wss://push.services.mozilla.com/');
  const queue: Any[] = []; let waiter: ((m: Any) => void) | null = null;
  ws.onmessage = (e) => { let m: Any = {}; try { m = JSON.parse(String(e.data)); } catch { /* ignore */ } if (waiter) { const w = waiter; waiter = null; w(m); } else queue.push(m); };
  const next = (ms = 15000) => new Promise<Any>((res) => { if (queue.length) return res(queue.shift()); const t = setTimeout(() => { waiter = null; res(null); }, ms); waiter = (m) => { clearTimeout(t); res(m); }; });
  const opened = await new Promise<boolean>((res) => { ws.onopen = () => res(true); ws.onerror = () => res(false); setTimeout(() => res(false), 10000); });
  steps.ws = opened; if (!opened) return steps;
  let endpoint = '';
  try {
    ws.send(JSON.stringify({ messageType: 'hello', use_webpush: true, broadcasts: {} }));
    const hello = await next(); steps.hello = hello?.status ?? null;
    const channelID = crypto.randomUUID();
    ws.send(JSON.stringify({ messageType: 'register', channelID, key: s.NWS_VAPID_PUBLIC }));
    const reg = await next(); endpoint = String(reg?.pushEndpoint || ''); steps.register = reg?.status ?? null;
    steps.endpointHost = endpoint ? new URL(endpoint).hostname : '';
    if (!endpoint) return steps;
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
    const uaPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)); const auth = crypto.getRandomValues(new Uint8Array(16));
    const sr = await fetch(fnUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'nws-push selftest' }, body: JSON.stringify({ action: 'sub', sub: { endpoint, keys: { p256dh: b64u(uaPub), auth: b64u(auth) } } }) });
    steps.sub = sr.status; await sr.body?.cancel().catch(() => {});
    const msg = { title: BRAND, body: 'בדיקה פנימית של מערכת ההתראות', url: SITE + '/', tag: 'selftest' };
    const r: Any = await sendAll(msg, endpoint); steps.send = r.statuses; steps.sendErrors = r.errors;
    const note = await next(20000);
    steps.received = note?.messageType === 'notification';
    if (note?.messageType === 'notification') {
      ws.send(JSON.stringify({ messageType: 'ack', updates: [{ channelID: note.channelID, version: note.version }] }));
      steps.decrypted = await decrypt(unb64u(String(note.data || '')), kp.privateKey, uaPub, auth).catch((e) => 'decrypt failed: ' + String(e?.message || e));
      steps.match = steps.decrypted === JSON.stringify(msg);
    }
    ws.send(JSON.stringify({ messageType: 'unregister', channelID }));
  } finally {
    if (endpoint) await sb.from('nws_push_subs').delete().eq('endpoint', endpoint);
    try { ws.close(); } catch { /* closed */ }
  }
  return steps;
}

// ---------- make the VAPID keys (once) ----------
async function init() {
  const s = await secrets();
  if (s.NWS_VAPID_PUBLIC && s.NWS_VAPID_PRIVATE) return { public: s.NWS_VAPID_PUBLIC, made: false };
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const pub = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const rows = [{ k: 'NWS_VAPID_PUBLIC', v: pub }, { k: 'NWS_VAPID_PRIVATE', v: String(jwk.d) }];
  if (!s.NWS_VAPID_SUBJECT) rows.push({ k: 'NWS_VAPID_SUBJECT', v: 'mailto:news@nws.co.il' });
  const { error } = await sb.from('app_secrets').insert(rows);
  if (error) return { error: 'insert failed' };
  SEC = null;
  return { public: pub, made: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  if (req.method !== 'POST') return out({ ok: false }, 405);
  let b: Any = {};
  try { b = await req.json(); } catch { return out({ ok: false, error: 'bad json' }, 400); }
  const action = String(b?.action || '');
  if (action === 'sub') {
    const sub = b.sub || {};
    if (!validEndpoint(sub.endpoint) || !validKeys(sub.keys)) return out({ ok: false, error: 'bad subscription' }, 400);
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';
    const { data: ex } = await sb.from('nws_push_subs').select('id').eq('endpoint', sub.endpoint).maybeSingle();
    if (ex) { await sb.from('nws_push_subs').update({ keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, fails: 0 }).eq('id', ex.id); return out({ ok: true }); }
    if (limited(ip)) return out({ ok: false, error: 'slow down' }, 429);
    const { error } = await sb.from('nws_push_subs').upsert({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, ua: browser(req.headers.get('user-agent') || ''), fails: 0 }, { onConflict: 'endpoint' });
    return error ? out({ ok: false, error: 'db' }, 500) : out({ ok: true });
  }
  if (action === 'unsub') {
    if (!validEndpoint(b.endpoint)) return out({ ok: false, error: 'bad endpoint' }, 400);
    await sb.from('nws_push_subs').delete().eq('endpoint', b.endpoint);
    return out({ ok: true });
  }
  if (!(await authed(req))) return out({ ok: false }, 401);
  if (action === 'init') return out({ ok: true, ...(await init()) });
  if (action === 'send') {
    const title = clip(clean(b.title || BRAND), 80), body = clip(clean(b.body), 160);
    const url = typeof b.url === 'string' && b.url.startsWith(SITE + '/') ? b.url : SITE + '/';
    if (!body) return out({ ok: false, error: 'no body' }, 400);
    const tag = String(b.tag || '').slice(0, 32);
    const r: Any = await sendAll({ title, body, url, tag }, typeof b.endpoint === 'string' ? b.endpoint : undefined);
    if (!b.endpoint && !r.error) await sb.from('nws_push_log').insert({ kind: 'manual', title, body, url, sent: r.sent, ok: r.ok, gone: r.gone, failed: r.failed });
    return out({ ...r, delivered: r.ok, ok: !r.error });
  }
  if (action === 'tick') return out({ ok: true, ...(await tick()) });
  if (action === 'selftest') return out({ ok: true, ...(await selftest(`${Deno.env.get('SUPABASE_URL')}/functions/v1/nws-push`)) });
  return out({ ok: false, error: 'unknown action' }, 400);
});
