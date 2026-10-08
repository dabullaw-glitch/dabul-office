// Read-only mockups on the real site (nothing is saved): mobile bottom bar instead of the floating buttons, and the proposed menu.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'preview-results'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il';
const ART = S + '/%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%9e%d7%a7%d7%99%d7%a3-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%99%d7%93-%d7%a9%d7%a0%d7%99%d7%94/';
const BAR = `<div id="pv-bar" style="position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:rgba(255,255,255,.97);box-shadow:0 -4px 16px rgba(0,0,0,.12);direction:rtl;font-family:inherit">
<a style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:12px;background:#141414;color:#e4d19c;font-weight:800;font-size:17px;text-decoration:none">📞 התקשרו</a>
<a style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:12px;background:#25d366;color:#fff;font-weight:800;font-size:17px;text-decoration:none"><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg> וואטסאפ</a></div>`;
const MENU = [
 ['קונים דירה', ['עורך דין לרכישת דירה', 'דירה יד שנייה', 'דירה מקבלן', 'בדיקות לפני רכישה', "צ'קליסט לרוכשים", 'קנייה מכונס נכסים', 'תושבי חוץ ועולים']],
 ['מוכרים דירה', ['עורך דין למכירת דירה', 'מכירה עם משכנתא', 'דירה שהתקבלה בירושה', 'פירוק שיתוף', 'לפני שמפרסמים למכירה']],
 ['התחדשות עירונית', ['ייצוג דיירים בפינוי בינוי ותמ"א 38', 'נציגות דיירים', 'חוזה עם היזם', 'שכר דירה בתקופת הבנייה']],
 ['מיסוי מקרקעין', ['מס רכישה ומחשבון', 'מס שבח', 'היטל השבחה', 'מיסוי לתושבי חוץ']],
 ['מידע וכלים', ['מאמרים', 'מחשבון מס רכישה', 'מילון מונחים', 'סרטונים']],
 ['אודות', ['אודות המשרד', 'תעודות והסמכות', 'בתקשורת', 'המלצות']],
];
const b = await chromium.launch();
async function hideFloaters(p) {
  await p.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el); if (s.position !== 'fixed') continue;
      if (el.closest('.elementor-location-header')) continue;
      const t = (el.innerText || '') + ' ' + el.innerHTML.slice(0, 3000);
      if (/פנו אלינו|whatsapp|wa\.me|elementor-icon/i.test(t) && el.getBoundingClientRect().height < 200) el.style.setProperty('display', 'none', 'important');
    }
  });
}
for (const [name, url] of [['article', ART], ['home', S + '/']]) {
  const c = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await c.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/m-${name}-before.jpg`, type: 'jpeg', quality: 75 });
  await p.mouse.wheel(0, 500); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/m-${name}-before-scrolled.jpg`, type: 'jpeg', quality: 75 });
  await p.getByText('הבנתי', { exact: true }).first().click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(600);
  await hideFloaters(p); await p.evaluate(h => { document.body.insertAdjacentHTML('beforeend', h); document.body.style.paddingBottom = '70px';
    for (const el of document.querySelectorAll('body *')) { const st = getComputedStyle(el); if (st.position === 'fixed' && /onetap/i.test(String(el.className) + el.id) && el.getBoundingClientRect().height < 120) { el.style.setProperty('bottom', '78px', 'important'); el.style.setProperty('top', 'auto', 'important'); } } }, BAR);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/m-${name}-after-scrolled.jpg`, type: 'jpeg', quality: 75 });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/m-${name}-after.jpg`, type: 'jpeg', quality: 75 });
  await c.close();
}
// desktop menu
{
  const c = await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' }); const p = await c.newPage();
  await p.goto(S + '/', { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.evaluate((M) => {
    const ul = document.querySelector('.elementor-location-header nav.elementor-nav-menu--main ul.elementor-nav-menu'); if (!ul) return;
    ul.innerHTML = M.map(([t, items], i) => `<li class="menu-item menu-item-has-children" style="position:relative"><a class="elementor-item" href="#">${t} ▾</a>${i === 0 ? `<ul class="sub-menu" style="display:block;position:absolute;top:100%;right:0;min-width:240px;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.15);border-top:3px solid #c9a85c;padding:8px 0;z-index:9999;list-style:none;margin:0">${items.map(x => `<li style="padding:9px 18px;font-size:15px;color:#1c1b19;white-space:nowrap">${x}</li>`).join('')}</ul>` : ''}</li>`).join('');
  }, MENU);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/m-menu-desktop.jpg`, type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1366, height: 520 } });
  await c.close();
}
// mobile menu: our own panel over the real header
{
  const c = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await c.newPage();
  await p.goto(S + '/', { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500); await hideFloaters(p);
  await p.evaluate((M) => {
    const h = document.querySelector('.elementor-location-header'); const top = h ? h.getBoundingClientRect().bottom : 70;
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:${top}px;left:0;right:0;bottom:0;background:#fff;z-index:99998;overflow:auto;direction:rtl;font-family:inherit;padding:8px 18px 90px`;
    d.innerHTML = M.map(([t, items], i) => `<div style="border-bottom:1px solid #eee"><div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;font-weight:800;font-size:18px;color:#1c1b19">${t}<span style="color:#a8873f">${i === 0 ? '▴' : '▾'}</span></div>${i === 0 ? `<div style="padding:0 12px 10px">${items.map(x => `<div style="padding:8px 0;color:#444;font-size:16px">${x}</div>`).join('')}</div>` : ''}</div>`).join('') + `<a style="display:flex;align-items:center;justify-content:center;margin-top:16px;height:50px;border-radius:12px;background:#0a9e2a;color:#fff;font-weight:800;font-size:18px;text-decoration:none">📞 09-8613413</a>`;
    document.body.appendChild(d);
  }, MENU);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/m-menu-mobile.jpg`, type: 'jpeg', quality: 78 });
  await c.close();
}
await b.close(); console.log('mockups done');
