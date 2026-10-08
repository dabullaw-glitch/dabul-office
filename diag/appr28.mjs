// before/after crops for Yakir's approval of speed round 3: header (with a menu item under the mouse), a "למידע נוסף" card, phone bottom bar
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/appr28'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/';
const b = await chromium.launch();
for (const v of ['live', 'prev']) {
  const q = (v === 'prev' ? '?dblprev=1&a=' : '?a=') + Date.now();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' })).newPage();
  await p.goto(S + q, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3500);
  await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
  const item = p.locator('.elementor-element-b175daa .elementor-nav-menu--main > ul > li > a').nth(2); await item.hover(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/head-${v}.jpg`, type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1440, height: 110 } });
  const more = p.locator('.elementor-element-ff08b22').first(); await more.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const card = await more.evaluateHandle((e) => e.closest('.e-loop-item') || e.parentElement.parentElement);
  await card.asElement().screenshot({ path: `${OUT}/card-${v}.jpg`, type: 'jpeg', quality: 80 });
  const m = await (await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' })).newPage();
  await m.goto(S + q, { waitUntil: 'load', timeout: 90000 }); await m.waitForTimeout(3000);
  await m.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
  await m.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await m.waitForTimeout(1500);
  const foot = m.locator('#dbl-foot'); if (await foot.count()) await foot.first().screenshot({ path: `${OUT}/foot-${v}.jpg`, type: 'jpeg', quality: 80 });
  await m.evaluate(() => scrollTo(0, 0)); await m.waitForTimeout(800);
  await m.screenshot({ path: `${OUT}/phonetop-${v}.jpg`, type: 'jpeg', quality: 75 });
}
await b.close();
