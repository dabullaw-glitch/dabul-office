// probe.mjs: open a public page in a real browser (on the Actions runner) and record which fonts it uses, plus screenshots.
import { chromium } from 'playwright';
import fs from 'fs';
const url = process.argv[2]; const name = process.argv[3] || 'page';
fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'he-IL', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
const fontReqs = [];
p.on('request', (r) => { const u = r.url(); if (/\.(woff2?|ttf|otf)(\?|$)|fonts\.googleapis|typekit|fonts\.com/.test(u)) fontReqs.push(u); });
try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { console.log('goto', e.message); }
await p.waitForTimeout(3000);
const info = await p.evaluate(() => {
  const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { sel, text: (el.textContent || '').trim().slice(0, 60), family: s.fontFamily, weight: s.fontWeight, size: s.fontSize, lh: s.lineHeight, color: s.color }; };
  const fams = new Set(); document.fonts.forEach((f) => { if (f.status === 'loaded') fams.add(`${f.family} ${f.weight} ${f.style}`); });
  const faces = []; for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.type === 5) faces.push(r.cssText.slice(0, 300)); } catch (e) {} }
  return { title: document.title, loaded: [...fams], faces: faces.slice(0, 40), els: ['body', 'h1', 'h2', 'h3', 'nav a', 'header a', 'article p', 'p', '.title', 'time'].map(pick).filter(Boolean) };
});
info.fontReqs = [...new Set(fontReqs)];
fs.writeFileSync(`out/${name}.json`, JSON.stringify(info, null, 2));
await p.screenshot({ path: `out/${name}-desk.png` });
await p.setViewportSize({ width: 400, height: 900 }); await p.waitForTimeout(1500);
await p.screenshot({ path: `out/${name}-mob.png` });
await b.close();
