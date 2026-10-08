// Read-only: finds wording that conflicts with the bar advertising rules on the main pages (text + Elementor widget id).
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'preview-results'; fs.mkdirSync(OUT, { recursive: true });
const urls = JSON.parse(fs.readFileSync('preview/copyscan-urls.json', 'utf8'));
const RX = /(הטוב(?:ים|ה|ות)? ביותר|הכי טוב|מבטיח(?:ה|ים|ות)?|מובטח(?:ת|ים)?|להבטיח|מומח(?:ה|ים|ית|יות)|מיטבי(?:ת|ות|ים)?|ללא פשרות|ייחודי(?:ת)?|מאות לקוחות|מרוצים|מקסימלי(?:ת)?|מוביל(?:ה|ים)? |אולטימטיבי|100%|ללא תחרות|בלעדי(?:ת)?|הצוות שלי|הצוות שלנו|צוות המשרד|\bאנו\b|\bאנחנו\b|לקוחותינו|משרדנו|24\/7|לחצו >>>|>>>|ללא דופי|תוצאות|הצלחה מוכחת|שיעור הצלחה|חינם|ללא עלות)/;
const b = await chromium.launch(); const rep = {};
for (const [name, url] of urls) {
  const p = await b.newPage({ viewport: { width: 1366, height: 900 }, locale: 'he-IL' });
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500);
    rep[name] = await p.evaluate((src) => {
      const rx = new RegExp(src);
      const skip = el => el.closest('.elementor-location-header, .elementor-location-footer, script, style, noscript, [class*="onetap"], .ti-widget, .rpi-cnt, nav');
      const out = []; const seen = new Set();
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) {
        const t = (n.nodeValue || '').trim(); if (t.length < 3 || !rx.test(t)) continue;
        const el = n.parentElement; if (!el || skip(el)) continue;
        const blk = el.closest('p, li, h1, h2, h3, h4, h5, h6, .elementor-widget-container, summary, td') || el;
        const text = (blk.innerText || t).replace(/\s+/g, ' ').trim().slice(0, 600);
        if (seen.has(text)) continue; seen.add(text);
        const wid = el.closest('[data-id]'); const pop = el.closest('[data-elementor-type="popup"]');
        out.push({ text, term: (t.match(rx) || [''])[0], widget: wid ? wid.dataset.id : '', type: wid ? (wid.dataset.widget_type || wid.dataset.element_type || '') : '', doc: (el.closest('[data-elementor-id]') || {}).dataset?.elementorId || '', popup: !!pop, hidden: !blk.getClientRects().length });
      }
      const meta = document.querySelector('meta[name="description"]'); const ogd = document.querySelector('meta[property="og:description"]');
      return { title: document.title, desc: meta ? meta.content : '', ogdesc: ogd ? ogd.content : '', hits: out };
    }, RX.source);
  } catch (e) { rep[name] = { error: String(e).slice(0, 150) }; }
  await p.close();
}
await b.close(); fs.writeFileSync(`${OUT}/copyscan.json`, JSON.stringify(rep, null, 1)); console.log('pages', Object.keys(rep).length);
