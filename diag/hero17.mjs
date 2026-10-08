// desktop hero text: where each line starts, so the name, title, tagline and points can share one right edge
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/hero17'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 800]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, locale: 'he-IL' })).newPage();
  await p.goto(S + '?h17=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  rep[w] = await p.evaluate(() => {
    const box = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; };
    const hero = document.querySelector('.elementor-element-9056c3a');
    const els = [...hero.querySelectorAll('.elementor-element')].map((e) => { const cs = getComputedStyle(e); return { id: e.dataset.id, cls: e.className.replace(/elementor-element |e-con-full|e-flex|e-con |e-child|elementor-widget /g, '').slice(0, 70), box: box(e), pad: cs.paddingRight + '/' + cs.paddingLeft, mar: cs.marginRight + '/' + cs.marginLeft, w: cs.width, maxw: cs.maxWidth, txt: (e.innerText || '').slice(0, 30).replace(/\n/g, ' '), fs: (e.querySelector('h1,h2,h3,p,span,li') ? getComputedStyle(e.querySelector('h1,h2,h3,p,span,li')).fontSize : '') }; });
    const hb = document.querySelector('[data-elementor-type="header"] img'); 
    return { els, logo: hb ? box(hb) : null, heroBox: box(hero) };
  });
  await p.screenshot({ path: `${OUT}/now-${w}.jpg`, type: 'jpeg', quality: 80 });
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
