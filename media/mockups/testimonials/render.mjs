import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const [w,name] of [[1440,'desktop'],[390,'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: w<500?2:1 });
  await p.goto('file://' + process.cwd() + '/index.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  const ov = await p.evaluate(()=>document.documentElement.scrollWidth - innerWidth);
  await p.screenshot({ path: `testimonials-${name}.png`, fullPage: true }); console.log(name,'overflow',ov);
}
await b.close();
