import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/vpage'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  for (let y = 0; y < 20000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(200); }
  await p.waitForTimeout(1500); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${mode}-full.jpg`, fullPage: true, quality: 60 });
  rep[mode] = await p.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.height), Math.round(b.left), Math.round(b.width)]; };
    const vids = [...document.querySelectorAll('.elementor-widget-video, .elementor-widget-dblvideo, .dbl-yt-box, .dbl-vid')].map((w) => ({ cls: w.className.slice(0, 80), id: w.dataset.id, box: r(w) }));
    // the chain of parents of the first video, with heights, paddings, margins, gaps
    const first = document.querySelector('.elementor-widget-video, .elementor-widget-dblvideo');
    const chain = []; let e = first; for (let i = 0; e && i < 7; i++, e = e.parentElement) { const cs = getComputedStyle(e); chain.push({ cls: e.className.slice(0, 90), id: e.dataset.id, box: r(e), pad: cs.padding, mar: cs.margin, gap: cs.gap, disp: cs.display, gtc: cs.gridTemplateColumns.slice(0, 60), minh: cs.minHeight }); }
    const kids = first ? [...first.parentElement.children].map((c) => ({ cls: c.className.slice(0, 70), box: r(c) })) : [];
    return { n: vids.length, vids: vids.slice(0, 40), chain, kids, docH: document.documentElement.scrollHeight };
  });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
