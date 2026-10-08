// press items: portrait screenshot of each article (like the other press cards) and the outlet logo
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/press20'; fs.mkdirSync(OUT, { recursive: true });
const rep = {};
const U = {
  bizportal: ['https://www.bizportal.co.il/bizpoint-sponsored/news/article/20035319', 'https://www.bizportal.co.il/'],
  emess: ['https://www.emess.co.il/rec/1916011', 'https://www.emess.co.il/'],
  news1: ['https://www.news1.co.il/ShowArticles.aspx?docId=521504&subjectId=42&ShowAll=True', 'https://www.news1.co.il/'],
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
for (const [k, [u, home]] of Object.entries(U)) {
  rep[k] = {};
  // article, phone width
  try {
    const ctx = await b.newContext({ viewport: { width: 430, height: 675 }, deviceScaleFactor: 1.6, isMobile: true, hasTouch: true, locale: 'he-IL', userAgent: devices['iPhone 13'].userAgent });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
    const p = await ctx.newPage(); await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (let i = 0; i < 12; i++) { await p.waitForTimeout(2500); const t = await p.title(); if (!/רק רגע|Just a moment|moment/i.test(t)) break; }
    await p.waitForTimeout(3000);
    rep[k].title = await p.title();
    rep[k].h1 = await p.evaluate(() => (document.querySelector('h1') || {}).innerText || '');
    rep[k].date = await p.evaluate(() => { const m = (n) => (document.querySelector(`meta[property="${n}"],meta[name="${n}"]`) || {}).content || ''; return m('article:published_time') || m('pubdate') || [...document.querySelectorAll('time,[class*=date],[class*=Date]')].slice(0, 4).map((e) => (e.getAttribute('datetime') || e.innerText || '').trim().slice(0, 40)).join(' | '); });
    // close cookie / popups if any
    await p.evaluate(() => { document.querySelectorAll('[id*=cookie],[class*=cookie],[class*=popup],[id*=popup],[class*=modal],[class*=Modal]').forEach((e) => { if (getComputedStyle(e).position === 'fixed') e.remove(); }); });
    const h1 = p.locator('h1').first();
    if (await h1.count()) { await h1.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -90)); }
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${k}-article.jpg`, type: 'jpeg', quality: 86 });
    await ctx.close();
  } catch (e) { rep[k].err = String(e).slice(0, 300); }
  // logo from the desktop home page
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, locale: 'he-IL', userAgent: UA });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
    const p = await ctx.newPage(); await p.goto(home, { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (let i = 0; i < 10; i++) { await p.waitForTimeout(2500); const t = await p.title(); if (!/רק רגע|Just a moment/i.test(t)) break; }
    await p.waitForTimeout(2500);
    const sel = await p.evaluate(() => {
      const cands = [...document.querySelectorAll('header img, header svg, a[class*=logo] img, [class*=logo] img, img[alt*=logo i], img[src*=logo i], [class*=logo] svg, #logo img, .logo')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 60 && r.height > 18 && r.top < 200 && r.width < 500; });
      cands.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const e = cands[0]; if (!e) return null; e.setAttribute('data-dbl-logo', '1'); const r = e.getBoundingClientRect(); return { tag: e.tagName, src: e.getAttribute('src') || '', w: r.width, h: r.height };
    });
    rep[k].logo = sel;
    if (sel) await p.locator('[data-dbl-logo="1"]').first().screenshot({ path: `${OUT}/${k}-logo.png`, omitBackground: true });
    await p.screenshot({ path: `${OUT}/${k}-home.jpg`, type: 'jpeg', quality: 60, clip: { x: 0, y: 0, width: 1366, height: 220 } });
    await ctx.close();
  } catch (e) { rep[k].logoErr = String(e).slice(0, 300); }
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
