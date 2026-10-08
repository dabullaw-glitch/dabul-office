import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/vpage'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  for (let y = 0; y < 20000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500);
  rep[mode] = await p.evaluate(() => {
    const g = document.querySelector('.elementor-loop-container'); const cs = getComputedStyle(g);
    const items = [...g.children].map((it) => { const h = Math.round(it.getBoundingClientRect().height); const inner = it.querySelector('.e-con-inner') || it.firstElementChild; const kids = inner ? [...inner.children].map((k) => [k.className.slice(0, 50), Math.round(k.getBoundingClientRect().height)]) : []; const con = it.querySelector('.e-con'); const ccs = con ? getComputedStyle(con) : null; return { h, kids, conH: con ? Math.round(con.getBoundingClientRect().height) : null, conMin: ccs && ccs.minHeight, conHeight: ccs && ccs.height, conFlex: ccs && ccs.flexDirection, conJust: ccs && ccs.justifyContent }; });
    const styles = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch (e) { return []; } }).map((r) => r.cssText).filter((t) => /984d9ff|76f9f98|c6971e4|e-loop-item|post-5230|elementor-5230/.test(t)).slice(0, 40);
    return { autoRows: cs.gridAutoRows, rows: cs.gridTemplateRows.slice(0, 200), align: cs.alignItems, items: items.slice(0, 30), styles };
  });
  for (const y of [1, 3]) { await p.evaluate((y) => scrollTo(0, y * innerHeight * 1.5), y); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${mode}-${y}.jpg`, quality: 60 }); }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
