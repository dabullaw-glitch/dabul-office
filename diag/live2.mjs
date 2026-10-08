// Live: new hero photo + one-click video.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/live2'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const rep = {};
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto('https://dabullaw.co.il/?l2=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}/hero-${mode}.jpg`, type: 'jpeg', quality: 75 });
  rep[mode] = { heroBg: await p.evaluate(() => getComputedStyle(document.querySelector('.elementor-element-9056c3a')).backgroundImage.slice(0, 120)), deskImg: await p.evaluate(() => { const i = document.querySelector('.elementor-element-2c91460 img'); return i ? [i.currentSrc, i.naturalWidth, Math.round(i.getBoundingClientRect().height)] : null; }) };
  await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?l2=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
  const f = p.locator('.dbl-yt').nth(1); await f.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await f.click(); await p.waitForTimeout(7000);
  rep[mode].afterClick = await p.evaluate(() => { const d = document.querySelectorAll('.dbl-yt')[1]; const fr = d.querySelector('iframe'); return { iframe: !!fr, src: fr ? fr.src.slice(0, 140) : '', playBtn: !!d.querySelector('.dbl-yt-play'), yt: !!(window.YT && window.YT.Player) }; });
  await f.screenshot({ path: `${OUT}/video-${mode}-clicked.jpg`, type: 'jpeg', quality: 75 });
  rep[mode].errors = errs; await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
