// node render.mjs [key...]  -> ../out/<key>-f.png (1080x1350) and <key>-s.png (1080x1920)
import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const only = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => /-(f|s)\.html$/.test(f)).filter(f => !only.length || only.some(k => f.startsWith(k + '-')));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const f of files) {
  const s = f.endsWith('-s.html');
  const p = await b.newPage({ viewport: { width: 1080, height: s ? 1920 : 1350 } });
  await p.goto('file://' + path.join(dir, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  // overflow check: any text box wider than its parent or outside the canvas
  const bad = await p.evaluate(() => { const W = innerWidth; const out = []; document.querySelectorAll('.h,.sub,.chk,.cta,.st,.fc,.qt,.plate,.note2,.paper,.brand,.tl,.one,.tag,.ctab').forEach(e => { const r = e.getBoundingClientRect(); if (r.right > W - 20 || r.left < 20 || e.scrollWidth > e.clientWidth + 2) out.push((e.className || e.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right)); }); return out; });
  await p.screenshot({ path: path.join(dir, '..', 'out', f.replace('.html', '.png')) });
  console.log(f, bad.length ? 'CHECK ' + bad.join(' | ') : 'ok');
  await p.close();
}
await b.close();
