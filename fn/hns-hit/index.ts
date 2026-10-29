// hns-hit (29.10.2026): the cookieless visit counter of nws.co.il (Yakir: "how many visits, which pages were visited").
// The site layout sends ONE beacon per page view (navigator.sendBeacon, text/plain JSON): {p: path, r: referrer host, d: device
// ('m' phone / 't' tablet / 'd' computer, from the screen width), l: page language}. Only from https://nws.co.il, never from a
// preview build, never from a noindex page (404, search) and never from the management panel.
// Privacy: no cookie, nothing stored in the browser, no IP address, no user agent, no identifier of any kind. The table hns_hits
// keeps only counts per Israel day, path, referring site, device type and language; hns_hits_now keeps single views (path,
// referring site, device, time) for 48 hours, for the "now" box of the panel. A view is a "visit" (entries) when the referrer is
// not nws.co.il itself (an entry into the site), so visits are counted without following anyone.
// Bots are ignored (user agent words, and the browser script also skips navigator.webdriver). Rate limit: at most 40 views a
// minute from one network address, kept only in this function's memory (never written anywhere).
// POST only. The answer is always 204 with no body (a refused beacon looks the same as a counted one).
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SITE = /^https:\/\/nws\.co\.il(\/|$)/;
const BOT = /bot\b|bot\/|crawl|spider|slurp|bingpreview|yandex|baidu|duckduck|facebookexternalhit|facebookcatalog|whatsapp|telegrambot|preview|headless|lighthouse|pagespeed|phantom|selenium|puppeteer|playwright|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|okhttp|monitor|uptime|pingdom|semrush|ahrefs|mj12|petal|bytespider|gptbot|claude|perplexity|chatgpt|applebot|amazonbot|dataprovider|scrapy|feed|rss/i;
const H = { 'access-control-allow-origin': 'https://nws.co.il', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'cache-control': 'no-store' };
const done = () => new Response(null, { status: 204, headers: H });

// per address, in memory only: {count, window start}
const RL = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  if (!ip) return false;
  const now = Date.now();
  if (RL.size > 5000) for (const [k, v] of RL) if (now - v.t > 60e3) RL.delete(k);
  const r = RL.get(ip);
  if (!r || now - r.t > 60e3) { RL.set(ip, { n: 1, t: now }); return false; }
  r.n++;
  return r.n > 40;
}
const ilDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// referring site: a host name only, without www./m./l. and with the big search engines under one name
function refHost(x: unknown) {
  let h = String(x ?? '').trim().toLowerCase();
  if (!h) return '';
  if (!/^[a-z0-9.-]{1,120}$/.test(h)) return 'other';
  h = h.replace(/^(www|m|l|lm|mobile|amp)\./, '');
  if (/(^|\.)google\.[a-z.]+$/.test(h) || h === 'com.google.android.googlequicksearchbox' || h === 'com.google.android.gm') return 'google';
  if (/(^|\.)bing\.com$/.test(h)) return 'bing';
  if (/(^|\.)facebook\.com$|^fb\.me$/.test(h)) return 'facebook.com';
  if (/(^|\.)instagram\.com$/.test(h)) return 'instagram.com';
  if (h === 't.co' || /(^|\.)(x|twitter)\.com$/.test(h)) return 'x.com';
  if (/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/.test(h)) return 'telegram';
  if (/(^|\.)whatsapp\.com$|^wa\.me$/.test(h)) return 'whatsapp';
  if (h === 'nws.co.il') return 'nws.co.il';
  return h;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
  if (req.method !== 'POST') return done();
  try {
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    if (!(origin === 'https://nws.co.il' || (!origin && SITE.test(referer)))) return done();
    if (BOT.test(req.headers.get('user-agent') || '')) return done();
    const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    if (limited(ip)) return done();
    const raw = (await req.text()).slice(0, 1200);
    let b: Record<string, unknown> = {};
    try { b = JSON.parse(raw); } catch { return done(); }
    let path = String(b.p ?? '').split(/[?#]/)[0];
    if (!/^\/[A-Za-z0-9\-._~/%]{0,150}$/.test(path)) return done();
    try { path = decodeURIComponent(path); } catch { /* keep */ }
    if (/^\/(yakirdab|admin)(\/|$)/i.test(path) || /\.(xml|json|txt|js|css|png|jpe?g|webp|svg|ico)$/i.test(path)) return done();
    if (!path.endsWith('/')) path += '/';
    const ref = refHost(b.r);
    const device = ({ m: 'mobile', t: 'tablet', d: 'desktop' } as Record<string, string>)[String(b.d)] || 'other';
    const lang = ['he', 'ru', 'fr', 'en'].includes(String(b.l)) ? String(b.l) : '';
    const entry = ref !== 'nws.co.il';
    await sb.rpc('hns_hit_add', { p_day: ilDay(), p_path: path, p_ref: ref, p_dev: device, p_lang: lang, p_entry: entry });
    // keep only 48 hours of single views
    if (Math.random() < 0.02) await sb.from('hns_hits_now').delete().lt('at', new Date(Date.now() - 48 * 3600e3).toISOString());
  } catch { /* a counter never fails the page */ }
  return done();
});
