// Read-only: downloads public site images and renders the proposed page inside the real site header/footer (no site changes).
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import sharp from 'sharp';
const OUT = 'preview-results';
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const assets = JSON.parse(fs.readFileSync('preview/assets.json', 'utf8'));
for (const [name, url] of Object.entries(assets)) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA } });
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).png().toFile(`${OUT}/asset-${name}.png`);
    const m = await sharp(buf).metadata();
    console.log(name, r.status, m.width, m.height, m.hasAlpha);
  } catch (e) { console.log(name, 'ERR', String(e).slice(0, 120)); }
}
const COMP = 'preview/component.html';
if (fs.existsSync(COMP)) {
  const html = fs.readFileSync(COMP, 'utf8');
  const target = fs.existsSync('preview/target.txt') ? fs.readFileSync('preview/target.txt', 'utf8').trim() : 'https://dabullaw.co.il/';
  const browser = await chromium.launch();
  for (const mode of ['desktop', 'mobile']) {
    const ctx = mode === 'mobile' ? await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL', userAgent: UA });
    const page = await ctx.newPage();
    await page.goto(target, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);
    const ok = await page.evaluate((h) => {
      const head = document.querySelector('.elementor-location-header');
      const foot = document.querySelector('.elementor-location-footer');
      if (!head || !foot) return 'no header/footer';
      // remove everything between header and footer, keep site chrome (logo, menu, footer, floating buttons)
      let n = head.nextSibling; while (n && n !== foot) { const x = n.nextSibling; n.remove(); n = x; }
      const wrap = document.createElement('main'); wrap.id = 'pv-main'; wrap.innerHTML = h;
      foot.parentNode.insertBefore(wrap, foot);
      for (const s of wrap.querySelectorAll('script')) { const t = document.createElement('script'); t.textContent = s.textContent; s.replaceWith(t); }
      window.scrollTo(0, 0);
      return 'ok';
    }, html);
    console.log(mode, ok);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/page-${mode}-fold.jpg`, type: 'jpeg', quality: 80 });
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/page-${mode}-full.jpg`, type: 'jpeg', quality: 72, fullPage: true });
    // form state with "call me" ticked
    if (mode === 'mobile') {
      await page.evaluate(() => { const c = document.querySelector('.dabul-cl [name=callme]'); if (c) { c.click(); c.closest('form').scrollIntoView(); } });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/page-mobile-form.jpg`, type: 'jpeg', quality: 80 });
    }
    await ctx.close();
  }
  await browser.close();
}
console.log('done');
