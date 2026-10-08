// press page: the 3 new articles (title, picture, date) and how the existing press items look
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/press19'; fs.mkdirSync(OUT, { recursive: true });
const rep = {};
const U = {
  bizportal: 'https://www.bizportal.co.il/bizpoint-sponsored/news/article/20035319',
  emess: 'https://www.emess.co.il/rec/1916011',
  news1: 'https://www.news1.co.il/ShowArticles.aspx?docId=521504&subjectId=42&ShowAll=True',
};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
for (const [k, u] of Object.entries(U)) {
  const p = await ctx.newPage();
  try {
    await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(6000);
    rep[k] = await p.evaluate(() => {
      const m = (n) => (document.querySelector(`meta[property="${n}"],meta[name="${n}"]`) || {}).content || '';
      const h1 = (document.querySelector('h1') || {}).innerText || '';
      const times = [...document.querySelectorAll('time,[class*=date],[class*=Date]')].slice(0, 6).map((e) => (e.getAttribute('datetime') || e.innerText || '').trim().slice(0, 60));
      return { title: m('og:title') || document.title, h1, desc: m('og:description') || m('description'), image: m('og:image'), pub: m('article:published_time') || m('pubdate') || m('date'), times, url: location.href };
    });
    await p.screenshot({ path: `${OUT}/${k}-top.jpg`, type: 'jpeg', quality: 82 });
    const img = rep[k].image;
    if (img) { const r = await ctx.request.get(img); if (r.ok()) { const buf = await r.body(); const ext = (r.headers()['content-type'] || '').includes('png') ? 'png' : (r.headers()['content-type'] || '').includes('webp') ? 'webp' : 'jpg'; fs.writeFileSync(`${OUT}/${k}-og.${ext}`, buf); rep[k].ogFile = `${k}-og.${ext}`; rep[k].ogBytes = buf.length; } }
  } catch (e) { rep[k] = { err: String(e).slice(0, 300) }; }
  await p.close();
}
// existing press page and two existing pictures
const p = await ctx.newPage();
await p.goto('https://dabullaw.co.il/category/press/?p19=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
await p.screenshot({ path: `${OUT}/press-page.jpg`, type: 'jpeg', quality: 70, fullPage: true });
for (const f of ['2026/06/Screenshot_35.jpg', '2026/04/Screenshot_1.jpg', '2026/01/k4.webp']) { const r = await ctx.request.get('https://dabullaw.co.il/wp-content/uploads/' + f); if (r.ok()) fs.writeFileSync(`${OUT}/old-${f.split('/').pop()}`, await r.body()); }
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
