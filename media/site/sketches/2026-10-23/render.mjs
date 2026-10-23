import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
const files = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const f of files) {
  for (const [tag, vp, dpr] of [['d', { width: 1366, height: 200 }, 1], ['m', { width: 390, height: 200 }, 2]]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: dpr });
    await p.goto('file://' + process.cwd() + '/' + f);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `out/${f.replace('.html', '')}-${tag}.png`, fullPage: true });
    await p.close();
  }
}
await b.close();
