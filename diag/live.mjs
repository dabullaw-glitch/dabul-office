// Live check: new about section (home) and new legal info page, phone + desktop.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/live'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il'; const INFO = S + '/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/';
const b = await chromium.launch(); const rep = {};
const close = async (p) => { await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null); await p.waitForTimeout(300); };
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
  await p.goto(S + '/?lv=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p);
  const a = p.locator('#about-yakir'); await a.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  await a.screenshot({ path: `${OUT}/about-${mode}.jpg`, type: 'jpeg', quality: 78 });
  rep['about-' + mode] = await p.evaluate(() => { const i = document.querySelector('#about-yakir img'); const d = document.querySelector('#about-yakir .disc').getBoundingClientRect(); const r = i.getBoundingClientRect(); return { img: [i.naturalWidth, i.complete], disc: [Math.round(d.left), Math.round(d.width)], imgBox: [Math.round(r.left), Math.round(r.width)], kick: document.querySelector('#about-yakir .kick').innerText }; });
  await p.goto(INFO + '?lv=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p);
  await p.screenshot({ path: `${OUT}/hub-${mode}-top.jpg`, type: 'jpeg', quality: 72 });
  rep['hub-' + mode] = await p.evaluate(() => { const h = document.querySelector('.dbl-hub h1').getBoundingClientRect(); const hd = [...document.querySelectorAll('header .elementor-sticky, header .e-con')].map((e) => e.getBoundingClientRect()).find((r) => r.height > 40); return { h1Top: Math.round(h.top), headerBottom: hd ? Math.round(hd.bottom) : null, cards: document.querySelectorAll('.dbl-hub .post').length }; });
  await p.mouse.wheel(0, 250); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/hub-${mode}-scrolled.jpg`, type: 'jpeg', quality: 72 });
  await p.locator('.dbl-hub .grid').scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/hub-${mode}-grid.jpg`, type: 'jpeg', quality: 72 });
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/hub-${mode}-bottom.jpg`, type: 'jpeg', quality: 72 });
  await p.goto(INFO + '?t=renewal', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000); await close(p);
  rep['filter-' + mode] = await p.evaluate(() => ({ h2: [...document.querySelectorAll('.dbl-hub h2')].map((x) => x.innerText), cards: document.querySelectorAll('.dbl-hub .post').length }));
  rep['errors-' + mode] = errs; await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
