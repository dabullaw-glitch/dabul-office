// phone hero: the live page (new spacing) and three slightly more see-through versions
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/glass'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
await p.goto('https://dabullaw.co.il/?g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
const V = {
  now: '',
  g1: '.dbl-ph ul{background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.02))!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important}',
  g2: '.dbl-ph:before{background:linear-gradient(180deg,rgba(8,13,30,.86) 0%,rgba(8,13,30,.6) 42%,rgba(8,13,30,.28) 100%)!important}',
  g3: '.dbl-ph ul{background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.02))!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important}.dbl-ph:before{background:linear-gradient(180deg,rgba(8,13,30,.86) 0%,rgba(8,13,30,.6) 42%,rgba(8,13,30,.28) 100%)!important}',
};
for (const [k, css] of Object.entries(V)) {
  await p.evaluate((css) => { document.getElementById('dbl-gl')?.remove(); const st = document.createElement('style'); st.id = 'dbl-gl'; st.textContent = css; document.head.appendChild(st); }, css);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${k}.jpg`, type: 'jpeg', quality: 86 });
}
await b.close();
