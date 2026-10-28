// Renders social share images (1200x630) for the site, every section and every article, plus the logo and the touch icon.
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const root = path.resolve('.');
const arts = JSON.parse(fs.readFileSync('src/data/articles.json', 'utf8')).articles || [];
const sec = { flash: ['מבזקים', '#C8102E', 'road'], city: ['העירייה', '#6D3FC0', 'council'], realestate: ['נדל״ן ותכנון', '#E08A00', 'crane'], community: ['קהילה וחינוך', '#0B5FCC', 'council'], sports: ['ספורט', '#1E8A4C', 'stadium'], leisure: ['בילוי ואירועים', '#D6337A', 'concert'], sharon: ['השרון', '#0E8A8A', 'road'], tourism: ['תיירות', '#2B8FD8', 'beach'], law: ['חוק ומשפט', '#3B4656', 'council'] };
const svg = (n) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'public/img', n + '.svg')).toString('base64');
const font = `<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@700;800&family=Heebo:wght@500;700&display=swap" rel="stylesheet">`;
const card = (title, label, color, img) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">${font}<style>
body{margin:0;width:1200px;height:630px;font-family:Rubik,Heebo,Arial,sans-serif;background:#0E1726;color:#fff;position:relative;overflow:hidden}
.im{position:absolute;inset:0;background:url(${svg(img)}) center/cover;opacity:.45}
.sh{position:absolute;inset:0;background:linear-gradient(to top,rgba(14,23,38,.97) 30%,rgba(14,23,38,.35))}
.c{position:absolute;inset:0;padding:56px 64px;display:flex;flex-direction:column;justify-content:flex-end;gap:22px}
.lb{align-self:flex-start;background:${color};padding:8px 18px;border-radius:10px;font-weight:700;font-size:30px}
h1{margin:0;font-weight:800;font-size:${title.length > 70 ? 54 : 64}px;line-height:1.15}
.br{position:absolute;top:44px;left:64px;display:flex;align-items:center;gap:14px;direction:ltr}
.br b{font-weight:800;font-size:56px;letter-spacing:-2px}.br i{width:14px;height:14px;border-radius:50%;background:#C8102E;margin-top:-30px}
.br span{font-size:26px;font-weight:700;direction:rtl}
.bar{position:absolute;bottom:0;left:0;right:0;height:12px;background:${color}}
</style></head><body><div class="im"></div><div class="sh"></div><div class="br"><b>NWS</b><i></i><span>חדשות נתניה והשרון</span></div>
<div class="c">${label ? `<span class="lb">${label}</span>` : ''}<h1>${title}</h1></div><div class="bar"></div></body></html>`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
const shot = async (html, out) => { await p.setContent(html, { waitUntil: 'networkidle' }).catch(() => {}); await p.evaluate(() => document.fonts.ready); fs.mkdirSync(path.dirname(out), { recursive: true }); await p.screenshot({ path: out, type: 'png' }); };
await shot(card('מה שקורה עכשיו בנתניה ובשרון', '', '#0B5FCC', 'beach'), 'public/og/default.png');
for (const [k, [n, c, im]] of Object.entries(sec)) await shot(card(esc(n) + ' בנתניה', esc(n), c, im), `public/og/s/${k}.png`);
for (const a of arts) { const [n, c, im] = sec[a.section] || sec.city; await shot(card(esc(a.title), esc(n), c, a.imageHint || im), `public/og/a/${a.slug}.png`); }
// logo 512 and touch icon 180
const logo = (s) => `<!doctype html><html><head>${font}<style>body{margin:0;width:${s}px;height:${s}px;background:#0E1726;display:flex;align-items:center;justify-content:center;font-family:Rubik,Arial}b{color:#fff;font-weight:800;font-size:${s * 0.36}px;letter-spacing:-${s * 0.01}px;position:relative}i{position:absolute;top:${s * 0.02}px;right:-${s * 0.07}px;width:${s * 0.06}px;height:${s * 0.06}px;border-radius:50%;background:#C8102E}</style></head><body><b>NWS<i></i></b></body></html>`;
await p.setViewportSize({ width: 512, height: 512 }); await shot(logo(512), 'public/logo.png');
await p.setViewportSize({ width: 180, height: 180 }); await shot(logo(180), 'public/apple-touch-icon.png');
await b.close(); console.log('og done', arts.length);
