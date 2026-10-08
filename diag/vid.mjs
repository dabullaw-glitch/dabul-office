// Videos: picture + play button, loads on click.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/vid'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); let yt = 0; p.on('request', (r) => { if (/youtube\.com\/(embed|s\/player|iframe_api)|ytimg\.com\/.*\.js/.test(r.url())) yt++; });
  await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?v=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
  await p.mouse.wheel(0, 700); await p.waitForTimeout(2500);
  rep[mode] = { ytRequestsBeforeClick: yt, facades: await p.locator('.dbl-yt').count() };
  await p.screenshot({ path: `${OUT}/videos-${mode}.jpg`, type: 'jpeg', quality: 70 });
  const f = p.locator('.dbl-yt').first(); await f.scrollIntoViewIfNeeded(); await f.click(); await p.waitForTimeout(4000);
  rep[mode].iframeAfterClick = await p.locator('.dbl-yt iframe').count(); rep[mode].ytAfter = yt;
  await p.screenshot({ path: `${OUT}/videos-${mode}-clicked.jpg`, type: 'jpeg', quality: 70 });
  await p.goto('https://dabullaw.co.il/%D7%A2%D7%95%D7%A8%D7%9A-%D7%93%D7%99%D7%9F-%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F-%D7%91%D7%A0%D7%AA%D7%A0%D7%99%D7%94/?v=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  const v = p.locator('.lvbl-video-wrap'); if (await v.count()) { await v.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/netanya-${mode}.jpg`, type: 'jpeg', quality: 70 }); rep[mode].netanyaBox = await v.first().evaluate((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]); }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
