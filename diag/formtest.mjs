// End-to-end check of the contact form: submit one clearly marked test lead from the home page form.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/formtest'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36' });
const p = await ctx.newPage(); const net = [];
p.on('response', async (r) => { if (/admin-ajax/.test(r.url())) { net.push({ st: r.status(), body: (await r.text().catch(() => '')).slice(0, 400) }); } });
await p.goto('https://dabullaw.co.il/?ft=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
try {
const form = p.locator('form.elementor-form:visible').first();
rep.fields = await form.evaluate((f) => [...f.querySelectorAll('input,textarea,select')].map((i) => ({ n: i.name, t: i.type, req: i.required, ph: i.placeholder })));
await form.scrollIntoViewIfNeeded();
await form.locator('input[type="text"]:visible').first().fill('בדיקת מערכת Claude');
await form.locator('input[type="tel"]:visible').first().fill('000');
const em = form.locator('input[type="email"]'); if (await em.count()) await em.first().fill('');
const ta = form.locator('textarea'); if (await ta.count()) await ta.first().fill('בדיקה: ליד מהאתר למערכת המשרד. אפשר למחוק.');
await form.evaluate((f) => f.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }));
await p.waitForTimeout(1500);
await form.locator('button[type="submit"]').first().click();
await p.waitForTimeout(9000);
rep.msg = await form.evaluate((f) => (f.querySelector('.elementor-message') || {}).innerText || '');
rep.net = net;
await form.screenshot({ path: `${OUT}/form.jpg`, type: 'jpeg', quality: 70 });
} catch (e) { rep.err = String(e).slice(0, 600); await p.screenshot({ path: `${OUT}/page.jpg`, type: 'jpeg', quality: 60 }).catch(() => null); }
rep.net = net;
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
