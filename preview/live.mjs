// Read-only check of a live page: screenshots + form behaviour without submitting any data.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'preview-results'; fs.mkdirSync(OUT, { recursive: true });
const url = fs.readFileSync('preview/live-url.txt', 'utf8').trim();
const b = await chromium.launch(); const rep = {};
for (const mode of ['desktop', 'mobile']) {
  const ctx = mode === 'mobile' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  const resp = await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(2000);
  await p.screenshot({ path: `${OUT}/live-${mode}-fold.jpg`, type: 'jpeg', quality: 78 });
  await p.mouse.move(200, 300); await p.mouse.wheel(0, 200); await p.waitForTimeout(2500); // wakes delayed scripts
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/live-${mode}-full.jpg`, type: 'jpeg', quality: 70, fullPage: true });
  const r = { status: resp.status(), errs };
  r.scriptRan = await p.evaluate(() => document.querySelector('.dabul-cl')?.classList.contains('anim') || false);
  r.hiddenAfterScroll = await p.evaluate(() => [...document.querySelectorAll('.dabul-cl .rv')].filter((e) => getComputedStyle(e).opacity < 0.5).length);
  await p.locator('.dabul-cl [name=callme]').check(); await p.waitForTimeout(300);
  r.phoneShown = await p.evaluate(() => getComputedStyle(document.querySelector('.dabul-cl .phone')).display !== 'none');
  await p.locator('.dabul-cl .btn').click(); await p.waitForTimeout(500);
  r.emptySubmitMsg = await p.evaluate(() => document.querySelector('.dabul-cl .msg').textContent);
  r.hScroll = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (mode === 'mobile') { await p.locator('#cl-form').scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/live-mobile-form.jpg`, type: 'jpeg', quality: 78 }); }
  rep[mode] = r; await ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/live.json`, JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep));
