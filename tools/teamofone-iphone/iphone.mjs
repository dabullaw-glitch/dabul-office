// Opens the public pages of the Team of One site in Safari's engine (WebKit) as an iPhone,
// scrolls each page, and saves screenshots and layout checks to out/. No account is created.
import { webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://dabullaw-glitch.github.io/dabul-office/teamofone/';
const want = fs.existsSync('expect.txt') ? fs.readFileSync('expect.txt', 'utf8').trim() : '';
fs.mkdirSync('out', { recursive: true });
const res = { want, built: null, pages: {} };
const b = await webkit.launch();
const c = await b.newContext({ ...devices['iPhone 13'] });
const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
if (want) { for (let i = 0; i < 40; i++) { await p.goto(BASE + '?v=' + Date.now()); const v = await p.getAttribute('meta[name=build]', 'content'); res.built = v; if (v === want) break; await p.waitForTimeout(15000); } }
for (const [path, name] of [['', 'home'], ['maamarim/', 'articles'], ['knisa/', 'login'], ['tnaim/', 'terms']]) {
  await p.goto(BASE + path + '?v=' + Date.now()); await p.waitForTimeout(2000);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let k = 0;
  for (let y = 0; y < H; y += 700) {
    await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(700);
    if (name === 'home' || k < 3) await p.screenshot({ path: `out/${name}-${String(k).padStart(2, '0')}.png` });
    k++;
  }
  res.pages[name] = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const tiles = ['t1', 't2'].map((id) => { const t = document.getElementById(id); if (!t) return null; return [...t.children].filter((x) => { const r = x.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.width > 20; }).length; });
    return { scrollWidth: document.documentElement.scrollWidth, vw, tilesOnScreen: tiles };
  });
}
res.errs = errs; fs.writeFileSync('out/results.json', JSON.stringify(res, null, 1)); await b.close();
