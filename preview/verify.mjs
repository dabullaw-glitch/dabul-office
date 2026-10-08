// Read-only check after the approved fixes: screenshots + TOC behaviour + accessibility widgets. No form is submitted.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'preview-results'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il';
const ART = S + '/%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%9e%d7%a7%d7%99%d7%a3-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%99%d7%93-%d7%a9%d7%a0%d7%99%d7%94/';
const TEST = S + '/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/';
const b = await chromium.launch(); const rep = {};
async function ctxFor(mode) { return mode === 'mobile' ? b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' }); }
async function wake(p) { await p.mouse.move(100, 200); await p.mouse.wheel(0, 120); await p.waitForTimeout(3500); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800); }
for (const mode of ['mobile', 'desktop']) {
  const r = rep[mode] = {};
  // home
  let c = await ctxFor(mode); let p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 150)));
  await p.goto(S + '/', { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/v-home-${mode}.jpg`, type: 'jpeg', quality: 75 });
  r.homeButtons = await p.evaluate(() => [...document.querySelectorAll('.elementor-element-9f8d625,.elementor-element-20bfd48')].map(e => getComputedStyle(e).display + '/' + Math.round(e.getBoundingClientRect().height)));
  r.badge = await p.evaluate(() => { const x = document.querySelector('.dabul-gbadge'); if (!x) return null; const q = x.getBoundingClientRect(); return { label: x.getAttribute('aria-label'), w: Math.round(q.width), h: Math.round(q.height), y: Math.round(q.top + scrollY) }; });
  await wake(p);
  r.a11y = await p.evaluate(() => {
    const vis = el => { const q = el.getBoundingClientRect(); const s = getComputedStyle(el); return q.width > 8 && q.height > 8 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05; };
    const pick = sel => [...document.querySelectorAll(sel)].filter(vis).map(e => { const q = e.getBoundingClientRect(); return { tag: e.tagName, id: e.id, cls: String(e.className).slice(0, 60), x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }; }).filter(o => o.w < 120 && o.h < 120).slice(0, 6);
    return { onetap: pick('[class*="onetap"] button, button[class*="onetap"], .onetap-container-toggle, [class*="onetap-toggle"]'), ally: pick('#ea11y-root button, [class*="ea11y-widget"] button, button[class*="ea11y"], #ea11y-root [role="button"]') };
  });
  await p.screenshot({ path: `${OUT}/v-home-${mode}-woke.jpg`, type: 'jpeg', quality: 70 });
  r.homeErrs = errs.slice(0, 5); await c.close();
  // article TOC
  c = await ctxFor(mode); p = await c.newPage();
  await p.goto(ART, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/v-article-${mode}.jpg`, type: 'jpeg', quality: 75 });
  const tocState = () => p.evaluate(() => [...document.querySelectorAll('.elementor-widget-table-of-contents')].filter(w => w.getBoundingClientRect().width > 0).map(w => { const bd = w.querySelector('.elementor-toc__body'); return { id: w.dataset.id, collapsed: w.classList.contains('elementor-toc--collapsed'), bodyH: bd ? Math.round(bd.getBoundingClientRect().height) : -1, items: w.querySelectorAll('.elementor-toc__list-item').length }; }));
  r.tocBefore = await tocState();
  r.firstParaY = await p.evaluate(() => { const q = [...document.querySelectorAll('.elementor-widget-theme-post-content p, article p, .elementor-location-single p')].find(x => x.innerText.trim().length > 60); return q ? Math.round(q.getBoundingClientRect().top) : null; });
  await wake(p); r.tocAfterJs = await tocState();
  const tg = p.locator('.elementor-widget-table-of-contents:visible .elementor-toc__header').first();
  if (await tg.count()) { await tg.click().catch(() => {}); await p.waitForTimeout(1200); r.tocAfterClick = await tocState(); await p.screenshot({ path: `${OUT}/v-article-${mode}-tocopen.jpg`, type: 'jpeg', quality: 70 }); }
  await c.close();
  // testimonials
  c = await ctxFor(mode); p = await c.newPage();
  await p.goto(TEST, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500); await wake(p);
  r.testimonialsNoAlt = await p.evaluate(() => [...document.images].filter(i => !i.hasAttribute('alt')).map(i => (i.currentSrc || i.src).slice(0, 80)).slice(0, 30));
  await c.close();
}
await b.close(); fs.writeFileSync(`${OUT}/verify.json`, JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep));
