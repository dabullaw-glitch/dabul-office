// Share images (1200x630) for every guide, tool and the home page, made from an HTML template with a headless browser.
// Usage after "astro build": node scripts/og.mjs   (writes dist/og/*.png and dist/icon-512.png)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const DIST = 'dist', OUT = path.join(DIST, 'og'); fs.mkdirSync(OUT, { recursive: true });
const HUB = { 'hadlut-piraon': 'חדלות פירעון', 'hotzaa-lapoal': 'הוצאה לפועל', 'hesder-hov': 'הסדרי חוב', atzmaim: 'עצמאים ועסקים', achrei: 'אחרי החובות' };
const fm = (s) => { const m = /^---\n([\s\S]*?)\n---/.exec(s); const o = {}; if (m) for (const line of m[1].split('\n')) { const k = /^(\w+):\s*"?(.*?)"?\s*$/.exec(line); if (k) o[k[1]] = k[2]; } return o; };
const items = fs.readdirSync('src/content/guides').filter((f) => f.endsWith('.md')).map((f) => { const d = fm(fs.readFileSync(path.join('src/content/guides', f), 'utf8')); return { id: f.replace(/\.md$/, ''), title: d.title, tag: HUB[d.hub] || '' }; });
items.push({ id: 'default', title: 'יש דרך החוצה מהחובות', tag: 'המדריך הישראלי ליציאה מחובות' });
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync('public/fonts/' + f).toString('base64');
const css = `@font-face{font-family:H;font-weight:400;src:url(${font('heebo-hebrew-400-normal.woff2')})}@font-face{font-family:H;font-weight:700;src:url(${font('heebo-hebrew-700-normal.woff2')})}@font-face{font-family:F;font-weight:700;src:url(${font('frank-ruhl-libre-hebrew-700-normal.woff2')})}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;direction:rtl;font-family:H;background:#fbf8f3;color:#14233a;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(700px 380px at 92% -10%,rgba(242,169,59,.35),transparent 60%),linear-gradient(180deg,#f3ece1,#fbf8f3)}
.in{position:absolute;inset:64px 72px;display:flex;flex-direction:column}
.tag{align-self:flex-start;background:#e3f1ee;color:#0a524c;font-weight:700;font-size:30px;padding:8px 22px;border-radius:999px}
h1{font-family:F;font-size:66px;line-height:1.18;margin-top:34px;max-width:1000px}
.ft{margin-top:auto;display:flex;align-items:center;gap:16px;font-weight:700;font-size:34px}
.ft svg{width:58px;height:58px}.path{position:absolute;left:72px;bottom:86px;display:flex;gap:18px;align-items:center}
.path i{width:22px;height:22px;border-radius:50%;border:4px solid #0d6b63;display:block}.path i:last-child{background:#f2a93b;border-color:#f2a93b}.path b{width:44px;border-top:4px dotted #0d6b63;opacity:.6}`;
const logo = '<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#0d6b63"/><path d="M11 25a9 9 0 0 1 18 0" fill="#f2a93b"/><path d="M7 27.5h26" stroke="#fbf8f3" stroke-width="2.6" stroke-linecap="round"/><path d="M20 9.5v3.2M10.6 13.4l2.2 2.2M29.4 13.4l-2.2 2.2" stroke="#f2a93b" stroke-width="2.2" stroke-linecap="round"/></svg>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--headless=new'] } : {});
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const it of items) {
  await p.setContent(`<!doctype html><html lang="he"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="bg"></div><div class="in">${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}<h1>${esc(it.title)}</h1><div class="ft">${logo}<span>בלי חובות</span></div></div><div class="path"><i></i><b></b><i></i><b></b><i></i><b></b><i></i></div></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(OUT, it.id + '.png') });
}
await p.setViewportSize({ width: 512, height: 512 });
await p.setContent(`<!doctype html><html><body style="margin:0;width:512px;height:512px">${logo.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`);
await p.screenshot({ path: path.join(DIST, 'icon-512.png'), omitBackground: true });
await b.close();
console.log('og images:', items.length);
