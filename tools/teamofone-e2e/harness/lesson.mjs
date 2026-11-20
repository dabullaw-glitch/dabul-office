import { open } from './harness.mjs';
const h = await open();
await h.page.goto(h.base + 'ezor-ishi/shiur/?id=1'); await h.page.waitForTimeout(1500);
await h.page.screenshot({ path: '/tmp/h-lesson.png', fullPage: true });
console.log('mark exists', await h.page.locator('#mark').count());
await h.page.click('#mark', { timeout: 5000 }).then(() => console.log('clicked')).catch((e) => console.log('click fail', String(e).slice(0, 300)));
await h.page.waitForTimeout(800); console.log('text', await h.page.locator('#mark').textContent().catch(() => '')); console.log('errs', h.errs);
await h.close(); (await import("./harness.mjs")).srv.close();
