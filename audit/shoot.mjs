// Read-only visual audit of dabullaw.co.il: screenshots (mobile + desktop), sticky elements, CTA inventory, timings.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const OUT = 'audit-results';
fs.mkdirSync(OUT, { recursive: true });
const SITE = 'https://dabullaw.co.il';
const PAGES = [
  ['home', '/'],
  ['netanya', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/'],
  ['masrechisha', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%9c%d7%9e%d7%a1-%d7%a8%d7%9b%d7%99%d7%a9%d7%94-2025-%d7%9b%d7%9e%d7%94-%d7%aa%d7%a9%d7%9c%d7%9e%d7%95-%d7%9c%d7%9e%d7%93%d7%99%d7%a0%d7%94-%d7%95%d7%90%d7%99/'],
  ['article', '/%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%9e%d7%a7%d7%99%d7%a3-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%99%d7%93-%d7%a9%d7%a0%d7%99%d7%94/'],
  ['urban', '/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/'],
  ['contact', '/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/'],
  ['english', '/real-estate-lawyer-netanya-english/'],
  ['buyer', '/%d7%9c%d7%99%d7%95%d7%95%d7%99-%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%a7%d7%95%d7%a0%d7%94/'],
];

const report = { at: new Date().toISOString(), pages: {} };
const browser = await chromium.launch();

async function inspect(page) {
  return await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
    const fixed = [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); return (s.position === 'fixed' || s.position === 'sticky') && vis(el); })
      .map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: String(el.className).slice(0, 80), text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }; })
      .filter((x) => x.h < 400);
    const ctas = [...document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp"], button, .elementor-button')].filter(vis).slice(0, 60)
      .map((el) => { const r = el.getBoundingClientRect(); return { text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 50), href: (el.getAttribute('href') || '').slice(0, 60), y: Math.round(r.top + window.scrollY) }; });
    const h1 = [...document.querySelectorAll('h1')].map((h) => h.innerText.trim().slice(0, 80));
    const firstScreen = (document.body.innerText || '').replace(/\s+\n/g, '\n').slice(0, 0);
    const fold = window.innerHeight;
    const aboveFold = [...document.querySelectorAll('h1,h2,h3,p,a,button,input,label')].filter((el) => { const r = el.getBoundingClientRect(); return vis(el) && r.top >= 0 && r.top < fold; })
      .map((el) => (el.innerText || el.placeholder || el.value || '').replace(/\s+/g, ' ').trim()).filter((t) => t).slice(0, 40);
    const a11yIcons = [...document.querySelectorAll('[class*="onetap"],[id*="onetap"],[class*="ea11y"],[id*="ea11y"],[class*="pojo-a11y"],[id*="pojo-a11y"]')].filter(vis).length;
    const imgsBroken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && vis(i)).map((i) => i.currentSrc || i.src).slice(0, 20);
    return { h1, fixed, ctas, aboveFold, a11yIcons, imgsBroken, docHeight: document.documentElement.scrollHeight };
  });
}

for (const [name, path] of PAGES) {
  const rec = {};
  for (const mode of ['mobile', 'desktop']) {
    const ctx = mode === 'mobile'
      ? await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL' })
      : await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' });
    const page = await ctx.newPage();
    const failed = [];
    page.on('requestfailed', (r) => failed.push(r.url().slice(0, 120)));
    const t0 = Date.now();
    let status = 0;
    try {
      const resp = await page.goto(SITE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      status = resp ? resp.status() : 0;
    } catch (e) { rec[mode] = { error: String(e).slice(0, 200) }; await ctx.close(); continue; }
    const dcl = Date.now() - t0;
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
    const load = Date.now() - t0;
    await page.waitForTimeout(2500);
    const perf = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const res = performance.getEntriesByType('resource'); const lcp = window.__lcp || null; return { ttfb: n ? Math.round(n.responseStart) : null, transferKB: Math.round((res.reduce((a, r) => a + (r.transferSize || 0), 0) + (n ? n.transferSize : 0)) / 1024), requests: res.length + 1 }; });
    await page.screenshot({ path: `${OUT}/${name}-${mode}-fold.jpg`, type: 'jpeg', quality: 55 });
    const info = await inspect(page);
    // scroll mid-page to reveal sticky bars
    await page.evaluate(() => window.scrollTo(0, Math.min(1800, document.documentElement.scrollHeight / 3)));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}-${mode}-mid.jpg`, type: 'jpeg', quality: 55 });
    const midFixed = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return (s.position === 'fixed' || s.position === 'sticky') && r.width > 4 && r.height > 4 && r.height < 400 && s.display !== 'none' && s.visibility !== 'hidden'; }).map((el) => { const r = el.getBoundingClientRect(); return { text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60), top: Math.round(r.top), h: Math.round(r.height) }; }));
    await page.evaluate(() => window.scrollTo(0, 0));
    if (mode === 'mobile' && ['home', 'article', 'contact', 'english'].includes(name)) {
      await page.screenshot({ path: `${OUT}/${name}-${mode}-full.jpg`, type: 'jpeg', quality: 40, fullPage: true }).catch(() => {});
    }
    rec[mode] = { status, dclMs: dcl, loadMs: load, ...perf, ...info, midFixed, failed: failed.slice(0, 15) };
    await ctx.close();
  }
  report.pages[name] = rec;
}

// WhatsApp button flow on mobile home
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.goto(SITE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  const cand = page.locator('a, button, div[role=button], .elementor-button').filter({ hasText: /וואטסאפ|WhatsApp|Whatsapp/ }).first();
  const iconCand = page.locator('[class*="whatsapp"], [href*="whatsapp"], [class*="wa-"], img[src*="whatsapp"]').first();
  let clicked = '';
  if (await cand.count()) { await cand.click({ timeout: 5000 }).catch(() => {}); clicked = 'text'; }
  else if (await iconCand.count()) { await iconCand.click({ timeout: 5000 }).catch(() => {}); clicked = 'icon'; }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/home-mobile-whatsapp-click.jpg`, type: 'jpeg', quality: 55 });
  report.whatsappFlow = { clicked, url: page.url() };
  await ctx.close();
} catch (e) { report.whatsappFlow = { error: String(e).slice(0, 200) }; }

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log('done');
