
import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
const [,, ...fs] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const f of fs) { const s = f.endsWith('-s.html'); const p = await b.newPage({ viewport: { width: 1080, height: s ? 1920 : 1350 } });
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(120);
  await p.screenshot({ path: f.replace('.html', '.png'), omitBackground: true }); await p.close(); }
await b.close();
