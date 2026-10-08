// (1) home on the computer via the preview address: hero edge + newsletter video; phone must stay the same
// (2) press: desktop article crops (like the existing press screenshots) and outlet logos
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/check21b'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled', '--autoplay-policy=no-user-gesture-required'] });
const HIDE = '.elementor-popup-modal,.onetap-container-toggle,.dabul-gbadge{display:none!important}';
for (const [w, h] of []) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, locale: 'he-IL' })).newPage();
  await p.goto(S + '?dblprev=1&c21=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: HIDE });
  await p.screenshot({ path: `${OUT}/hero-${w}.jpg`, type: 'jpeg', quality: 84 });
  rep['edges' + w] = await p.evaluate(() => ['6bb6c07', '464d8c8', 'a3067eb'].map((id) => { const r = document.querySelector('.elementor-element-' + id).getBoundingClientRect(); return [id, Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; }));
  await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:hidden!important}' });
  const nl = p.locator('#dbl-nl'); await nl.scrollIntoViewIfNeeded(); await p.waitForTimeout(4000);
  rep['nl' + w] = await p.evaluate(() => { const v = document.querySelector('#dbl-nl video'); return { built: document.getElementById('dbl-nl').classList.contains('dbl-nlv'), video: !!v, playing: v ? !v.paused : false, t: v ? v.currentTime : 0 }; });
  await nl.screenshot({ path: `${OUT}/nl-${w}.jpg`, type: 'jpeg', quality: 84 });
  await p.context().close();
}
if (false) {
  const p = await (await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' })).newPage();
  await p.goto(S + '?dblprev=1&c21p=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  rep.phone = await p.evaluate(() => ({ nlBuilt: document.getElementById('dbl-nl')?.classList.contains('dbl-nlv'), video: !!document.querySelector('#dbl-nl video') }));
}
// press
const A = { bizportal: 'https://www.bizportal.co.il/bizpoint-sponsored/news/article/20035319', emess: 'https://www.emess.co.il/rec/1916011' };
for (const [k, u] of Object.entries(A)) {
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 2400 }, locale: 'he-IL', userAgent: UA });
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
    const p = await ctx.newPage(); await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(8000);
    await p.evaluate(() => { document.querySelectorAll('*').forEach((e) => { const cs = getComputedStyle(e); if ((cs.position === 'fixed' || cs.position === 'sticky') && e.tagName !== 'HTML' && e.tagName !== 'BODY') e.style.setProperty('display', 'none', 'important'); }); document.querySelectorAll('iframe,[id*=google_ads],ins').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 200) e.style.setProperty('visibility', 'hidden', 'important'); }); });
    const box = await p.evaluate(() => {
      const h1 = document.querySelector('h1'); const r = h1.getBoundingClientRect();
      let c = h1; for (let i = 0; i < 6 && c.parentElement; i++) { const pr = c.parentElement.getBoundingClientRect(); if (pr.width > 900) break; c = c.parentElement; }
      const cr = c.getBoundingClientRect();
      return { x: Math.max(0, cr.left - 16), y: Math.max(0, r.top + scrollY - 30), w: Math.min(cr.width + 32, 1300 - Math.max(0, cr.left - 16)) };
    });
    rep[k] = box;
    await p.screenshot({ path: `${OUT}/press-${k}.jpg`, type: 'jpeg', quality: 88, clip: { x: box.x, y: box.y, width: box.w, height: Math.round(box.w * 1.57) }, fullPage: true });
    await ctx.close();
  } catch (e) { rep[k] = { err: String(e).slice(0, 300) }; }
}
// logos
{
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, deviceScaleFactor: 2, locale: 'he-IL', userAgent: UA });
  const r1 = await ctx.request.get('https://www.bizportal.co.il/static_content/Bizportal_logo_black_180.png'); if (r1.ok()) fs.writeFileSync(`${OUT}/logo-bizportal.png`, await r1.body());
  const p = await ctx.newPage(); await p.goto('https://www.emess.co.il/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(6000);
  await p.screenshot({ path: `${OUT}/logo-emess-area.png`, clip: { x: 560, y: 4, width: 250, height: 62 } });
  rep.emessLogo = await p.evaluate(() => [...document.querySelectorAll('header img, header svg, a img')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < 80 && r.left > 500 && r.left < 900; }).map((e) => [e.tagName, e.getAttribute('src') || '', Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().width)]));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
