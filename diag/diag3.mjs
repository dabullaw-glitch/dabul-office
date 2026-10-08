// Visual check: Netanya page (styles back), legal info page on phone (accessibility panel), menu at 1366 and phone,
// and captures of the home "about" section and the legal info page for the redesign mockups.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/v3'; fs.mkdirSync(OUT, { recursive: true });
const NET = 'https://dabullaw.co.il/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/';
const INFO = 'https://dabullaw.co.il/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/';
const b = await chromium.launch(); const rep = {};
const close = async (p) => { await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null); await p.waitForTimeout(300); };
const wake = async (p) => { await p.mouse.move(300, 300); await p.mouse.wheel(0, 300); await p.waitForTimeout(2500); await p.mouse.wheel(0, -300); await p.waitForTimeout(800); };
{ // desktop 1366
  const ctx = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' }); const p = await ctx.newPage();
  await p.goto('https://dabullaw.co.il/?v=3', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p);
  await p.screenshot({ path: `${OUT}/home-1366-header.jpg`, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1366, height: 200 } });
  const a = p.locator('header nav.elementor-nav-menu--main > ul > li > a', { hasText: 'קונים דירה' }).first(); await a.hover().catch(() => null); await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/home-1366-dropdown.jpg`, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1366, height: 700 } });
  // the "about" section
  const about = p.locator('text=הכירו את').first(); await about.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(1200);
  rep.aboutBox = await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); if (!h) return null; let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } const r = c.getBoundingClientRect(); return { id: c.dataset.id, y: r.top + scrollY, h: r.height, html: c.outerHTML.slice(0, 6000), text: c.innerText.slice(0, 1500) }; });
  if (rep.aboutBox) { await p.evaluate((y) => window.scrollTo(0, y - 20), rep.aboutBox.y); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/about-desktop.jpg`, type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1366, height: Math.min(860, Math.ceil(rep.aboutBox.h) + 40) } }); }
  await p.goto(NET, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p);
  for (const [t, n] of [['קישורים שימושיים', 'links'], ['שאלות ותשובות', 'faq']]) { const h = p.locator('h2', { hasText: t }).first(); await h.scrollIntoViewIfNeeded().catch(() => null); await p.evaluate(() => window.scrollBy(0, -260)); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/net-desktop-${n}.jpg`, type: 'jpeg', quality: 70 }); }
  rep.netVideo = await p.evaluate(() => { const f = document.querySelector('.lvbl-video-wrap iframe, .lvbl-video-wrap'); if (!f) return null; const r = f.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  await p.goto(INFO, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p);
  await p.screenshot({ path: `${OUT}/info-desktop.jpg`, type: 'jpeg', quality: 60, fullPage: false });
  rep.info = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, posts: document.querySelectorAll('article').length, pager: (document.querySelector('.pagination,.nav-links') || {}).innerText || '', title: document.title, cats: [...document.querySelectorAll('a[rel="category tag"]')].length }));
  await ctx.close();
}
{ // phone
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
  await p.goto(INFO + '?v=3', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p);
  rep.infoPhone = await p.evaluate(() => { const n = document.querySelector('nav.onetap-accessibility'); const cs = n ? getComputedStyle(n) : null; return { h: document.documentElement.scrollHeight, onetap: cs ? { pos: cs.position, vis: cs.visibility, disp: cs.display, left: cs.left } : null }; });
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/info-phone-bottom.jpg`, type: 'jpeg', quality: 60 });
  await p.goto(NET, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p);
  const h = p.locator('h2', { hasText: 'שאלות ותשובות' }).first(); await h.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/net-phone-faq.jpg`, type: 'jpeg', quality: 70 });
  await p.goto('https://dabullaw.co.il/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p);
  await p.locator('header a.elementor-icon[href*="off_canvas"]:visible, header .elementor-menu-toggle:visible').first().click().catch(() => null); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/menu-phone.jpg`, type: 'jpeg', quality: 70 });
  await p.locator('.elementor-element-6997576 a.elementor-item', { hasText: 'קונים דירה' }).first().click().catch(() => null); await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/menu-phone-sub.jpg`, type: 'jpeg', quality: 70 });
  rep.wazeHref = await p.evaluate(() => [...document.querySelectorAll('a[aria-label*="וויז"]')].map((a) => a.href.slice(0, 80)));
  await p.keyboard.press('Escape').catch(() => null);
  await p.goto('https://dabullaw.co.il/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p);
  const ab = p.locator('text=הכירו את').first(); await ab.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${OUT}/about-phone.jpg`, type: 'jpeg', quality: 75, fullPage: false });
  await ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/v3.json`, JSON.stringify(rep, null, 1)); console.log('done');
