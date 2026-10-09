// Opens each address in a real browser (like a visitor) and records where it ends up, its title and main heading,
// so links are added to the site only after they were seen working. Usage: node links.mjs <name> <url> [<url> ...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [name, ...urls] = process.argv.slice(2);
const out = new URL(`../visual/${name}`, import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'he-IL', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', viewport: { width: 1280, height: 900 } });
const res = [];
let i = 0;
for (const u of urls) {
  const p = await ctx.newPage(); let status = null;
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 }); status = r ? r.status() : null;
    await p.waitForTimeout(7000);
    const info = await p.evaluate(() => ({ title: document.title, h1: (document.querySelector('h1') || {}).innerText || '', text: document.body ? document.body.innerText.slice(0, 400) : '' }));
    await p.screenshot({ path: `${out}/${String(i).padStart(2, '0')}.png` }).catch(() => {});
    res.push({ i, u, status, final: p.url(), ...info });
  } catch (e) { res.push({ i, u, status, error: String(e.message || e).slice(0, 200) }); }
  await p.close(); i++;
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(res, null, 1));
for (const r of res) console.log(r.i, r.status, r.u, '|', r.title, '|', r.h1);
