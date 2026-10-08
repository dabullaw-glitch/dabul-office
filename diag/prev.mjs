// preview check of the new footer and the new phone hero (only on ?dblprev=1)
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/prev'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
  for (const [n, u] of [['home', 'https://dabullaw.co.il/?dblprev=1'], ['art', 'https://dabullaw.co.il/?p=4308&dblprev=1']]) {
    await p.goto(u, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
    await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
    if (n === 'home') await p.screenshot({ path: `${OUT}/${mode}-hero.jpg`, type: 'jpeg', quality: 82 });
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
    const f = p.locator('footer[data-elementor-type="footer"]'); await f.scrollIntoViewIfNeeded();
    await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:hidden!important}#dbl-cbar{display:none!important}' });
    await p.waitForTimeout(800); await f.screenshot({ path: `${OUT}/${mode}-${n}-footer.jpg`, type: 'jpeg', quality: 80 });
    rep[mode + n] = await p.evaluate(() => ({ newFoot: !!document.getElementById('dbl-foot'), ph: !!document.querySelector('.dbl-ph'), phVisible: (() => { const e = document.querySelector('.dbl-ph'); return e ? getComputedStyle(e).display : null; })(), heroHidden: getComputedStyle(document.querySelector('.elementor-element-9056c3a') || document.body).display, links: [...document.querySelectorAll('#dbl-foot a')].map((a) => a.href) }));
    await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:visible!important}' });
  }
  rep[mode + '-errors'] = errs;
  await ctx.close();
}
// check every footer link answers
const links = [...new Set(rep.desktophome.links)].filter((h) => h.startsWith('https://dabullaw.co.il'));
const ctx = await b.newContext(); const st = {};
for (const h of links) { try { const r = await ctx.request.get(h, { maxRedirects: 0, timeout: 30000 }); st[decodeURIComponent(h)] = r.status(); } catch (e) { st[h] = 'ERR'; } }
rep.status = st;
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
