// Cloudflare Pages Functions middleware (copied as is to the root of the nws-site branch, where Pages compiles functions/).
// 1. Old spam of the previous owner of the domain: before us, nws.co.il / www.nws.co.il served spam pages under /video/ and
//    spam sitemaps (adultleak*.xml). Those addresses answer 410 Gone on every host, so Google drops them fast.
//    Any other address that does not exist on our site also answers 410 (with our 404 page), instead of 404.
// 2. One canonical host: requests through the Pages address (nws-site.pages.dev) or www.nws.co.il get a permanent redirect (301)
//    to the same path on https://nws.co.il, so Google indexes only nws.co.il.
//    Preview deployments (<hash>.nws-site.pages.dev) are not redirected; _headers sends them X-Robots-Tag: noindex.
// _routes.json keeps static files (images, icons) and the _redirects sources out of this function, so it runs only for pages and feeds.
const CANON = 'nws.co.il';
const MOVE = new Set(['nws-site.pages.dev', 'www.nws.co.il']);
const SPAM = /^\/video(\/|$)|adultleak|\/[^/]*leak[^/]*\.xml$/i;
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'geolocation=(), camera=(), microphone=()' };
const GONE_HTML = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>העמוד הוסר</title></head>'
  + '<body style="font-family:sans-serif;text-align:center;padding:60px 16px"><h1>העמוד הזה לא קיים באתר</h1><p><a href="https://nws.co.il/">לעמוד הראשי של חדשות נתניה והשרון</a></p></body></html>';
const gone = (body = GONE_HTML) => new Response(body, { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, max-age=3600', ...SEC } });

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* keep raw */ }
  if (SPAM.test(path)) return gone();
  if (MOVE.has(url.hostname)) {
    url.protocol = 'https:'; url.hostname = CANON; url.port = '';
    return new Response(null, { status: 301, headers: { Location: url.toString(), 'Cache-Control': 'public, max-age=86400' } });
  }
  const res = await next();
  // an address that is not on our site: 410 with our own 404 page (menu, search, latest stories)
  if (res.status === 404) return gone(await res.text());
  // keep the site wide headers of _headers on pages that pass through here
  let out = res;
  for (const [k, v] of Object.entries(SEC)) {
    if (!out.headers.has(k)) { if (out === res) out = new Response(res.body, res); out.headers.set(k, v); }
  }
  return out;
}
