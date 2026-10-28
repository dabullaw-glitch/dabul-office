import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('dist'); const out = process.argv[2]; const pages = process.argv.slice(3);
const types = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.css': 'text/css', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end('404'); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(4321);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const pg of pages) for (const [w, tag] of [[1366, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://localhost:4321' + pg, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(400);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  const name = (pg.replace(/\//g, '_') || 'home') + '-' + tag;
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true }); console.log(name, 'scrollW', sw, w); await p.close();
}
await b.close(); srv.close();
