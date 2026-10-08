// Visual check after today's fixes: new menu (desktop dropdown + phone), article covers in cards, review count, layout shifts.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/v2'; fs.mkdirSync(OUT, { recursive: true });
const SUB = 'https://dabullaw.co.il/legal-sublet-rental-agreement-guide/';
const init = () => { window.__ls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), n: (e.sources || []).map((s) => s.node && s.node.className ? String(s.node.className).slice(0, 60) : String(s.node && s.node.nodeName)) }); }).observe({ type: 'layout-shift', buffered: true }); };
const b = await chromium.launch(); const rep = {};
const close = async (p) => { await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null); };
// desktop: home with menu dropdown open, cards
{
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' }); await ctx.addInitScript(init); const p = await ctx.newPage();
  await p.goto('https://dabullaw.co.il/?v=' + Date.now() % 1000, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3500);
  rep.homeDesktopLS = await p.evaluate(() => window.__ls); await close(p);
  rep.menuTop = await p.evaluate(() => [...document.querySelectorAll('header nav.elementor-nav-menu--main > ul > li > a')].map((a) => a.textContent.trim()));
  for (const t of ['קונים דירה', 'מידע וכלים']) { const a = p.locator('header nav.elementor-nav-menu--main > ul > li > a', { hasText: t }).first(); await a.hover().catch(() => null); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/menu-desktop-${t === 'קונים דירה' ? 'buy' : 'info'}.jpg`, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1366, height: 640 } }); }
  const card = p.locator('text=מידע משפטי').first(); await card.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/home-cards.jpg`, type: 'jpeg', quality: 70 });
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' }); await ctx.addInitScript(init); const p = await ctx.newPage();
  await p.goto(SUB + '?v=' + Date.now() % 1000, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3500);
  rep.subDesktopLS = await p.evaluate(() => window.__ls); await close(p);
  await p.screenshot({ path: `${OUT}/sub-desktop-top.jpg`, type: 'jpeg', quality: 70 });
  rep.reviewCounts = await p.evaluate(() => (document.body.innerText.match(/\d+\s*ביקורות/g) || []));
  rep.featured = await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => /sublet|cover/.test(i.currentSrc || i.src)).map((i) => ({ src: (i.currentSrc || i.src).slice(-70), w: i.clientWidth, h: i.clientHeight, nw: i.naturalWidth, nh: i.naturalHeight, fit: getComputedStyle(i).objectFit, cls: String(i.closest('[data-widget_type]')?.getAttribute('data-widget_type') || '') })));
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55)); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/sub-desktop-mid.jpg`, type: 'jpeg', quality: 65, fullPage: true });
  await ctx.close();
}
{
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'he-IL' }); await ctx.addInitScript(init); const p = await ctx.newPage();
  await p.goto('https://dabullaw.co.il/?v=' + Date.now() % 1000, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3500); await close(p);
  const burger = p.locator('header .elementor-menu-toggle:visible, header a.elementor-icon[href*="off_canvas"]:visible').first(); await burger.click().catch(() => null); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/menu-mobile.jpg`, type: 'jpeg', quality: 70 });
  const sub = p.locator('text=קונים דירה').first(); await sub.click().catch(() => null); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/menu-mobile-open.jpg`, type: 'jpeg', quality: 70 });
  await p.goto(SUB, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000); await close(p);
  await p.screenshot({ path: `${OUT}/sub-mobile-top.jpg`, type: 'jpeg', quality: 70 });
  await ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/v2.json`, JSON.stringify(rep, null, 1)); console.log('done');
