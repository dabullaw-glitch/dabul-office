// speed round 2 check: same look with and without (?dblprev=1), the moment before late style files arrive, and what downloads
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/speed16'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
const HIDE = '.elementor-popup-modal{display:none!important}';
for (const mode of ['phone', 'desktop']) {
  for (const v of ['now', 'new', 'early']) { try {
    const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
    if (v === 'early') await ctx.route(/onetap|deafe|document-embedder|fadeInRight|slideInUp|google_maps|widget-video|price-list/, (r) => r.request().resourceType() === 'stylesheet' ? r.abort() : r.continue());
    const p = await ctx.newPage(); let bytes = 0; const imgs = [];
    p.on('response', async (r) => { try { const n = (await r.body()).length; bytes += n; if (r.request().resourceType() === 'image' && n > 40000) imgs.push([n, r.url().slice(-70)]); } catch {} });
    await p.goto(S + (v === 'now' ? '?c16=' : '?dblprev=1&c16=') + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3500);
    await p.addStyleTag({ content: HIDE });
    await p.screenshot({ path: `${OUT}/${mode}-${v}-top.jpg`, type: 'jpeg', quality: 80 });
    try { const H = await p.evaluate(() => Math.min(document.documentElement.scrollHeight, 12000)); const vw = p.viewportSize(); await p.setViewportSize({ width: vw.width, height: H }); await p.waitForTimeout(1500); await p.screenshot({ path: `${OUT}/${mode}-${v}-full.jpg`, type: 'jpeg', quality: 60 }); await p.setViewportSize(vw); } catch (e) { rep['err-' + mode + v] = String(e).slice(0, 300); }
    rep[mode + '-' + v] = { bytes, imgs, late: await p.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].filter((l) => l.getAttribute('onload')).length) };
    await ctx.close();
  } catch (e) { rep['fail-' + mode + v] = String(e).slice(0, 400); } }
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
