// Cloudflare Pages Functions middleware (copied as is to the root of the nws-site branch, where Pages compiles functions/).
// 1. Old spam of the previous owner of the domain: before us, nws.co.il / www.nws.co.il served spam pages under /video/ and
//    spam sitemaps (adultleak*.xml). Those addresses answer 410 Gone on every host, so Google drops them fast.
//    Any other address that does not exist on our site also answers 410 (with our 404 page), instead of 404.
// 2. One canonical host: requests through the Pages address (nws-site.pages.dev) or www.nws.co.il get a permanent redirect (301)
//    to the same path on https://nws.co.il, so Google indexes only nws.co.il.
//    Preview deployments (<hash>.nws-site.pages.dev) are not redirected; _headers sends them X-Robots-Tag: noindex.
// 3. Stories the engine merged into another story (hns-feed "merged"): their old address /<section>/n<id>/ (and /ru, /fr, /en)
//    answers 301 to the main story, never 410. scripts/merged.mjs fills MERGED in the built copy (dist/functions) after every build:
//    { "<id>": { "he": "/city/n27/", "en": "/en/city/n27/", ... } }; a language without its own page goes to the Hebrew one.
// 4. (29.10.2026) A story whose section was changed in the management panel: its old address /<old section>/n<id>/ (a page that no
//    longer exists) answers 301 to the story's current page. scripts/merged.mjs fills MOVED with every built story page.
// 5. (29.10.2026) The management panel (its folder is known here only by the SHA-256 of its name, PANEL_H, so this file does not
//    reveal the address): never indexed, never cached, never framed, no referrer. The old /admin/ address no longer exists (it
//    answers like any other missing page).
// _routes.json keeps static files (images, icons) and the _redirects sources out of this function, so it runs only for pages and feeds.
const CANON = 'nws.co.il';
const MOVE = new Set(['nws-site.pages.dev', 'www.nws.co.il']);
const SPAM = /^\/video(\/|$)|adultleak|\/[^/]*leak[^/]*\.xml$/i;
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'geolocation=(), camera=(), microphone=()' };
const MERGED = {"25":{"he":"/flash/n23/"},"49":{"he":"/flash/n23/"}};
const MOVED = {"2":{"he":"/flash/n2/"},"23":{"he":"/flash/n23/"},"27":{"he":"/city/n27/"},"53":{"he":"/sharon/n53/"},"64":{"he":"/flash/n64/"},"65":{"he":"/city/n65/"},"71":{"he":"/police/n71/"},"76":{"he":"/sports/n76/"},"77":{"he":"/tourism/n77/"},"79":{"he":"/sports/n79/"},"80":{"he":"/city/n80/"},"83":{"he":"/sports/n83/"},"84":{"he":"/sports/n84/"},"85":{"he":"/flash/n85/"},"86":{"he":"/sports/n86/"},"87":{"he":"/city/n87/"},"91":{"he":"/flash/n91/"},"92":{"he":"/flash/n92/"},"93":{"he":"/tourism/n93/"},"94":{"he":"/real-estate/n94/"},"95":{"he":"/real-estate/n95/"},"96":{"he":"/transport/n96/"},"103":{"he":"/community/n103/"},"104":{"he":"/city/n104/"},"105":{"he":"/events/n105/"},"106":{"he":"/flash/n106/"},"107":{"he":"/city/n107/"},"108":{"he":"/city/n108/"},"109":{"he":"/city/n109/"},"110":{"he":"/sharon/n110/"},"111":{"he":"/sharon/n111/"},"113":{"he":"/community/n113/"},"116":{"he":"/sports/n116/"},"117":{"he":"/sports/n117/"},"118":{"he":"/tourism/n118/"},"119":{"he":"/sharon/n119/"},"120":{"he":"/events/n120/"},"121":{"he":"/sports/n121/"},"122":{"he":"/health/n122/"},"123":{"he":"/events/n123/"},"125":{"he":"/israel/n125/"},"127":{"he":"/israel/n127/"},"133":{"he":"/sports/n133/"},"134":{"he":"/city/n134/"},"136":{"he":"/police/n136/"},"137":{"he":"/blog/n137/"},"138":{"he":"/transport/n138/"},"139":{"he":"/transport/n139/"},"140":{"he":"/events/n140/"},"141":{"he":"/israel/n141/"},"142":{"he":"/community/n142/"},"143":{"he":"/israel/n143/"},"150":{"he":"/israel/n150/"},"155":{"he":"/israel/n155/"},"157":{"he":"/israel/n157/"},"160":{"he":"/sports/n160/"},"161":{"he":"/blog/n161/"},"162":{"he":"/israel/n162/"},"163":{"he":"/sports/n163/"},"164":{"he":"/flash/n164/"},"168":{"he":"/israel/n168/"},"169":{"he":"/israel/n169/"},"170":{"he":"/community/n170/"},"172":{"he":"/health/n172/"},"175":{"he":"/city/n175/"},"177":{"he":"/israel/n177/"},"179":{"he":"/tourism/n179/"},"180":{"he":"/sports/n180/"},"186":{"he":"/blog/n186/"},"188":{"he":"/city/n188/"},"189":{"he":"/israel/n189/"},"190":{"he":"/israel/n190/"},"192":{"he":"/city/n192/"},"193":{"he":"/sports/n193/"},"194":{"he":"/israel/n194/"},"195":{"he":"/sports/n195/"},"197":{"he":"/sports/n197/"},"199":{"he":"/israel/n199/"},"201":{"he":"/israel/n201/"},"204":{"he":"/sports/n204/"},"206":{"he":"/israel/n206/"},"207":{"he":"/israel/n207/"},"208":{"he":"/blog/n208/"},"210":{"he":"/israel/n210/"},"211":{"he":"/israel/n211/"},"213":{"he":"/community/n213/"},"214":{"he":"/israel/n214/"},"215":{"he":"/israel/n215/"},"216":{"he":"/tourism/n216/"},"220":{"he":"/blog/n220/"},"224":{"he":"/israel/n224/"},"228":{"he":"/israel/n228/"}};
const PANEL_H = '33868afa977d9a0ef40e886fe78228240f2540b69d3ec6bcfe4798aa542a0e43';
const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const STORY = /^\/(?:(ru|fr|en)\/)?[a-z-]+\/n(\d+)\/?$/;
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
  const st = STORY.exec(path);
  const mg = st && MERGED[st[2]];
  if (mg) {
    const to = mg[st[1] || 'he'] || mg.he;
    if (to) return new Response(null, { status: 301, headers: { Location: 'https://' + CANON + to, 'Cache-Control': 'public, max-age=86400', ...SEC } });
  }
  const res = await next();
  // an address that is not on our site: 410 with our own 404 page (menu, search, latest stories)
  if (res.status === 404) {
    const mv = st && MOVED[st[2]];
    const to = mv && (mv[st[1] || 'he'] || mv.he);
    if (to && to !== path) return new Response(null, { status: 301, headers: { Location: 'https://' + CANON + to, 'Cache-Control': 'public, max-age=3600', ...SEC } });
    return gone(await res.text());
  }
  const seg = path.split('/')[1] || '';
  if (seg && !seg.includes('.') && (await sha(seg.toLowerCase())) === PANEL_H) {
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SEC)) out.headers.set(k, v);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    out.headers.set('Cache-Control', 'no-store');
    out.headers.set('Referrer-Policy', 'no-referrer');
    out.headers.set('X-Frame-Options', 'DENY');
    out.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    return out;
  }
  // keep the site wide headers of _headers on pages that pass through here
  let out = res;
  for (const [k, v] of Object.entries(SEC)) {
    if (!out.headers.has(k)) { if (out === res) out = new Response(res.body, res); out.headers.set(k, v); }
  }
  return out;
}
