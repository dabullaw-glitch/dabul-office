// Do the article cards in a home page post carousel (Elementor loop carousel, e.g. "מידע משפטי") show their pictures?
// Opens the page like a visitor on an iPhone (Safari engine), an Android phone and a computer, scrolls to the carousel
// under the given heading, then for ~40 seconds (autoplay + arrow clicks) records for every card on screen whether its
// picture has really loaded. Pictures of the carousel are saved. Usage: node loopcar.mjs <url> <heading> <name>
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const [URL_, HEADING, name] = process.argv.slice(2);
const out = new URL(`../visual/${name}`, import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const report = {};
const runs = [
  ['iphone', webkit, { ...devices['iPhone 13'] }],
  ['android', chromium, { ...devices['Pixel 7'] }],
  ['computer', chromium, { viewport: { width: 1366, height: 900 } }],
];
for (const [dev, engine, opts] of runs) {
  const b = await engine.launch();
  const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
  const failed = []; p.on('requestfailed', (r) => { if (/uploads/.test(r.url())) failed.push(r.url().slice(-90)); });
  try {
    await p.goto(URL_, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(1500);
    // first touch / mouse move (WP Rocket starts the page scripts on it)
    await p.mouse.move(100, 200).catch(() => {}); await p.mouse.move(120, 260).catch(() => {});
    await p.evaluate(() => { for (const t of ['touchstart', 'mousemove', 'scroll']) { try { window.dispatchEvent(new Event(t)); document.dispatchEvent(new Event(t)); } catch (e) {} } });
    await p.waitForTimeout(2500);
    await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' }).catch(() => {});
    const target = await p.evaluate((hd) => { const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === hd); return h ? h.getBoundingClientRect().top + scrollY - 60 : -1; }, HEADING);
    let y = 0; while (y < target) { const s = Math.min(500, target - y); await p.mouse.wheel(0, s).catch(() => {}); y += s; await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(150); }
    await p.waitForTimeout(800);
    const probe = () => p.evaluate((hd) => {
      const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === hd);
      if (!h) return { err: 'no heading' };
      const all = [...document.querySelectorAll('.elementor-widget-loop-carousel')];
      const car = all.find((c) => h.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (!car) return { err: 'no carousel' };
      const r0 = car.getBoundingClientRect();
      const cards = [...car.querySelectorAll('.swiper-slide')].map((s) => {
        const r = s.getBoundingClientRect(); const im = s.querySelector('img');
        const m = (s.className.match(/e-loop-item-(\d+)/) || [])[1];
        const vis = r.width > 5 && r.right > r0.left + 5 && r.left < r0.right - 5 && r.right > 0 && r.left < innerWidth;
        return vis ? { post: m, clone: s.classList.contains('swiper-slide-duplicate'), src: im ? (im.currentSrc || im.src).slice(-70) : null,
          loaded: !!(im && im.complete && im.naturalWidth > 2 && !(im.currentSrc || im.src).startsWith('data:')), cls: im ? im.className : '' } : null;
      }).filter(Boolean);
      return { swiper: !!car.querySelector('.swiper-initialized,.swiper-container-initialized'), cards };
    }, HEADING);
    const samples = [];
    const shot = async (tag) => { const el = await p.$(`xpath=//h2[normalize-space(.)="${HEADING}"]/following::div[contains(@class,"elementor-widget-loop-carousel")][1]`); if (el) await el.screenshot({ path: `${out}/${dev}-${tag}.png` }).catch(() => {}); };
    await shot('00');
    for (let i = 0; i < 24; i++) { samples.push({ t: i, how: 'wait', ...(await probe()) }); if (i % 6 === 5) await shot(`w${String(i).padStart(2, '0')}`); await p.waitForTimeout(1000); }
    // the visitor clicks "next" through all the cards
    for (let i = 0; i < 14; i++) {
      const nxt = await p.$(`xpath=//h2[normalize-space(.)="${HEADING}"]/following::div[contains(@class,"elementor-widget-loop-carousel")][1]//*[contains(@class,"elementor-swiper-button-next")]`);
      if (nxt) await nxt.click({ timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(1200);
      samples.push({ t: 24 + i, how: 'next', ...(await probe()) });
      await shot(`n${String(i).padStart(2, '0')}`);
    }
    const empty = {}; const ok = {};
    for (const s of samples) for (const c of s.cards || []) { const k = c.post + (c.clone ? 'c' : ''); if (c.loaded) ok[k] = (ok[k] || 0) + 1; else empty[k] = (empty[k] || 0) + 1; }
    report[dev] = { errors, failed, empty, ok, samples };
    console.log(dev, 'EMPTY(post:count)', JSON.stringify(empty), 'OK', JSON.stringify(ok), 'failed', failed.length, 'errors', errors.length);
  } catch (e) { report[dev] = { error: String(e).slice(0, 300) }; console.log(dev, 'ERROR', String(e).slice(0, 300)); }
  await b.close();
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
