// dump everything the footer needs (texts and links) from the live footer
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/ftdata'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://dabullaw.co.il/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000);
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
const data = await p.evaluate(() => {
  const F = document.querySelector('[data-elementor-type="footer"]');
  const W = (id) => F.querySelector('.elementor-element-' + id);
  const items = (id) => [...(W(id)?.querySelectorAll('li') || [])].map((li) => [li.innerText.trim(), li.querySelector('a') ? li.querySelector('a').getAttribute('href') : '']);
  const heads = {}; F.querySelectorAll('.elementor-heading-title').forEach((h) => { const w = h.closest('.elementor-element'); heads[w.dataset.id] = h.innerText.trim(); });
  return { footerAttrs: [...F.attributes].map((a) => [a.name, a.value.slice(0, 120)]), heads, lists: Object.fromEntries(['023fe63', 'e3a6a41', 'cf26f1d', '270273d', '5f04f5a', '796bc41', 'bced874', '56f4633'].map((id) => [id, items(id)])),
    hours: W('a58e6fa')?.innerText, langLinks: [...(W('886145f')?.querySelectorAll('a') || [])].map((a) => [a.innerText.trim(), a.getAttribute('href')]),
    logo: W('35de91f')?.querySelector('img')?.outerHTML, mart: W('5d367c3')?.outerHTML.slice(0, 900), map: W('832a7d8')?.querySelector('iframe')?.outerHTML,
    copy: W('555996b')?.innerText, rc: W('02509a1')?.innerHTML, wa: W('f3a95db')?.closest('.e-con.e-child')?.outerHTML.slice(0, 3000),
    socials: [...F.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => /facebook|instagram|youtube|tiktok|linkedin|chat\.whatsapp|wa\.me|waze/.test(h || '')),
    footerHtmlLen: F.outerHTML.length, scripts: F.querySelectorAll('script').length, forms: F.querySelectorAll('form').length };
});
fs.writeFileSync(`${OUT}/data.json`, JSON.stringify(data, null, 1)); await b.close();
