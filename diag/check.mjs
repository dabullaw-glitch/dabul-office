import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/check2'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
const ctxOf = (mode) => mode === 'phone' ? b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
const noCookie = async (p) => { await p.evaluate(() => document.querySelectorAll('[class*=cookie],[id*=cookie],[class*=cky],[id*=cky]').forEach((e) => { if (getComputedStyle(e).position === 'fixed') e.style.display = 'none'; })); };
for (const mode of ['phone', 'desktop']) {
  const ctx = await ctxOf(mode);
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000);
  for (let y = 0; y < 16000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500); await noCookie(p);
  rep['vid-' + mode] = await p.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.height), Math.round(b.left), Math.round(b.width)]; };
    const imgs = [...document.querySelectorAll('.dbl-yt img')];
    return { n: imgs.length, ours: imgs.filter((i) => /video-/.test(i.currentSrc)).length, yt: imgs.filter((i) => /ytimg/.test(i.currentSrc)).map((i) => i.currentSrc), sample: imgs.slice(0, 3).map((i) => [i.currentSrc, i.naturalWidth]), vnew: [...document.querySelectorAll('.dbl-vgrid')].map(r), items: [...document.querySelectorAll('.e-loop-item')].slice(0, 4).map(r), docH: document.documentElement.scrollHeight };
  });
  const tops = await p.evaluate(() => [...document.querySelectorAll('.dbl-vgrid, .e-loop-item')].slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().top + scrollY)));
  let k = 0; for (const t of tops.slice(0, 4)) { await p.evaluate((t) => scrollTo(0, t - 90), t); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/vid-${mode}-${k++}.jpg`, quality: 72 }); }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
