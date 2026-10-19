import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const files = fs.readdirSync(dir).filter(f => /^v4-.*\.html$/.test(f));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const f of files) {
  const q = f.endsWith('-q.html');
  const p = await b.newPage({ viewport: { width: 1080, height: q ? 1080 : 1350 } });
  await p.goto('file://' + path.join(dir, f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  const bad = await p.evaluate(() => { const W = innerWidth, Hh = innerHeight; const out = []; document.querySelectorAll('#ad *').forEach(e => { if (!e.textContent.trim() || e.children.length) return; const r = e.getBoundingClientRect(); if (r.width && (r.right > W - 10 || r.left < 10 || r.bottom > Hh - 4)) out.push(e.textContent.trim().slice(0, 20) + ':' + Math.round(r.left) + '-' + Math.round(r.right) + '/' + Math.round(r.bottom)); }); return out; });
  await p.screenshot({ path: path.join(dir, '..', 'out', f.replace('.html', '.png')) });
  console.log(f, bad.length ? 'CHECK ' + bad.join(' | ') : 'ok'); await p.close();
}
await b.close();
