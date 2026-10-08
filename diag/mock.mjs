// Read-only design mockups on the live site (nothing is saved): 1) the home "about" section, 2) the legal info hub page.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/mock'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il';
const INFO = S + '/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const CUT = S + '/wp-content/uploads/2026/04/%D7%99%D7%A7%D7%99%D7%A8-%D7%93%D7%91%D7%95%D7%9C-%D7%A2%D7%95%D7%A8%D7%9A-%D7%93%D7%99%D7%9F.webp';
const WA = 'https://wa.me/972505580189';
const ICON = {
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.4.2 4.2 1.8 4.8 4.8"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M4 7h16"/><path d="M4 7l-2.5 6a3 3 0 0 0 5 0L4 7zM20 7l-2.5 6a3 3 0 0 0 5 0L20 7z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
};
const ABOUT_CSS = `
.dbl-about{--g:#c9a961;--g2:#e4d19c;--ink:#14213d;--tx:#3a4252;--bg:#f7f6f2;background:linear-gradient(180deg,#fff 0,var(--bg) 100%);padding:72px 24px 64px;direction:rtl;font-family:inherit}
.dbl-about .w{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}
.dbl-about .kick{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:.3px;color:#8b6f47;background:#fff;border:1px solid #eadfc8;border-radius:999px;padding:6px 14px}
.dbl-about h2{font-size:42px;line-height:1.15;margin:16px 0 6px;color:var(--ink);font-weight:800}
.dbl-about h2 span{display:block;font-size:24px;font-weight:500;color:#8b6f47;margin-top:6px}
.dbl-about .bar{width:64px;height:4px;border-radius:2px;background:var(--g);margin:18px 0 22px}
.dbl-about p{font-size:17px;line-height:1.85;color:var(--tx);margin:0 0 14px}
.dbl-about h3{font-size:19px;color:var(--ink);margin:22px 0 8px;font-weight:800}
.dbl-about .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0 8px}
.dbl-about .card{background:#fff;border:1px solid #ece6da;border-radius:16px;padding:20px 20px 16px;box-shadow:0 6px 20px rgba(20,33,61,.05)}
.dbl-about .card .ic{width:44px;height:44px;border-radius:12px;background:#f6efe0;color:#8b6f47;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.dbl-about .card .ic svg{width:24px;height:24px}
.dbl-about .card h4{font-size:17px;margin:0 0 6px;color:var(--ink);font-weight:800}
.dbl-about .card p{font-size:15px;line-height:1.7;margin:0}
.dbl-about blockquote{margin:18px 0 0;padding:14px 18px;border-inline-start:4px solid var(--g);background:#fff;border-radius:0 12px 12px 0;font-size:15.5px;line-height:1.8;color:var(--tx)}
.dbl-about .cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}
.dbl-about .btn{display:inline-flex;align-items:center;gap:8px;height:50px;padding:0 24px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none}
.dbl-about .btn.gold{background:var(--ink);color:var(--g2)}
.dbl-about .btn.wa{background:#fff;color:#128c4b;border:1.5px solid #25d366}
.dbl-about .btn.wa svg{width:20px;height:20px}
.dbl-about .ph{position:relative;display:flex;justify-content:center}
.dbl-about .ph .disc{position:relative;width:100%;max-width:440px;aspect-ratio:4/5;border-radius:220px 220px 28px 28px;background:radial-gradient(120% 90% at 50% 10%,#1d2b52 0,#0b1530 70%);overflow:hidden;box-shadow:0 30px 60px rgba(11,21,48,.25)}
.dbl-about .ph .disc:after{content:"";position:absolute;inset:12px;border-radius:208px 208px 20px 20px;border:1.5px solid rgba(228,209,156,.45);pointer-events:none}
.dbl-about .ph img{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:96%;width:auto;max-width:none;object-fit:contain}
.dbl-about .badge{position:absolute;background:#fff;border-radius:16px;box-shadow:0 12px 30px rgba(20,33,61,.15);padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink)}
.dbl-about .badge b{font-size:24px;color:#8b6f47;font-weight:800}
.dbl-about .b1{right:-8px;bottom:56px}.dbl-about .b2{left:-8px;top:52px}
.dbl-about .b2 .st{color:#f4b400;letter-spacing:1px}
.dbl-about .facts{max-width:1200px;margin:44px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:0;background:var(--ink);border-radius:18px;overflow:hidden}
.dbl-about .fact{padding:20px 22px;color:#e9e4d8;font-size:15px;line-height:1.5;display:flex;gap:12px;align-items:center}
.dbl-about .fact+.fact{border-inline-start:1px solid rgba(228,209,156,.18)}
.dbl-about .fact strong{display:block;color:var(--g2);font-size:22px;font-weight:800}
.dbl-about .fact .ic{flex:0 0 40px;height:40px;border-radius:50%;border:1px solid rgba(228,209,156,.4);color:var(--g2);display:flex;align-items:center;justify-content:center}
.dbl-about .fact .ic svg{width:20px;height:20px}
@media (max-width:900px){.dbl-about{padding:44px 16px 40px}.dbl-about .w{grid-template-columns:1fr;gap:28px}.dbl-about .ph{order:-1}.dbl-about .ph .disc{max-width:300px}
.dbl-about h2{font-size:30px}.dbl-about h2 span{font-size:19px}.dbl-about p{font-size:16px}.dbl-about .cards{grid-template-columns:1fr}.dbl-about .facts{grid-template-columns:1fr;margin-top:28px}
.dbl-about .fact+.fact{border-inline-start:0;border-top:1px solid rgba(228,209,156,.18)}.dbl-about .badge{padding:9px 12px;font-size:12.5px}.dbl-about .badge b{font-size:19px}.dbl-about .b1{right:0;bottom:30px}.dbl-about .b2{left:0;top:24px}
.dbl-about .btn{flex:1;justify-content:center}}`;
function aboutHTML(t) {
  return `<style>${ABOUT_CSS}</style><section class="dbl-about"><div class="w">
<div class="tx"><span class="kick">עו״ד יקיר דבול · דיני מקרקעין · נתניה</span>
<h2>הכירו את יקיר דבול<span>עורך דין מקרקעין</span></h2><div class="bar"></div>
<p>${t.intro}</p>
<h3>היתרון שלנו</h3><p>${t.adv}</p>
<div class="cards"><div class="card"><div class="ic">${ICON.team}</div><h4>ליווי מקצועי עם מומחים חיצוניים</h4><p>${t.ext}</p></div>
<div class="card"><div class="ic">${ICON.route}</div><h4>ליווי מלא מהתחלה ועד הסוף</h4><p>${t.full}</p></div></div>
<blockquote>${t.lead}</blockquote>
<div class="cta"><a class="btn gold" href="#">קראו עליי עוד ←</a><a class="btn wa" href="${WA}">${ICON.wa} שיחה בוואטסאפ</a></div></div>
<div class="ph"><div class="disc"><img src="${CUT}" alt="עו״ד יקיר דבול"></div>
<div class="badge b1"><b>100+</b><span>עסקאות מקרקעין<br>בכל שנה</span></div>
<div class="badge b2"><span style="font-weight:800">4.9</span><span class="st">★★★★★</span><span>73 ביקורות בגוגל</span></div></div></div>
<div class="facts"><div class="fact"><span class="ic">${ICON.scale}</span><span><strong>מעל 100</strong>עסקאות מקרקעין מדי שנה</span></div>
<div class="fact"><span class="ic">${ICON.team}</span><span><strong>לשכת עורכי הדין</strong>חבר ועדות הקניין, המקרקעין וההתחדשות העירונית</span></div>
<div class="fact"><span class="ic">${ICON.route}</span><span><strong>24/7</strong>זמינות למקרי חירום</span></div></div></section>`;
}
const b = await chromium.launch(); const rep = {};
const close = async (p) => { await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null); await p.waitForTimeout(300); };
const wake = async (p) => { await p.mouse.move(300, 300); await p.mouse.wheel(0, 300); await p.waitForTimeout(2500); await p.mouse.wheel(0, -300); await p.waitForTimeout(600); };
async function hideFloat(p) { await p.addStyleTag({ content: '.dabul-gbadge{display:none!important}' }); await p.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const s = getComputedStyle(el); if (s.position === 'fixed' && !el.closest('header') && el.getBoundingClientRect().height < 200 && el.getBoundingClientRect().top > 200) el.style.setProperty('visibility', 'hidden', 'important'); } }); }
// ---------- 1. about section ----------
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(S + '/?v=m1', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p); await hideFloat(p);
  const box = await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } c.id = 'dbl-old-about'; const ps = [...c.querySelectorAll('p')].map((x) => x.innerHTML.trim()).filter(Boolean); return { ps }; });
  rep['about-' + mode] = box.ps.map((x) => x.slice(0, 80));
  const el = p.locator('#dbl-old-about'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  await el.screenshot({ path: `${OUT}/about-${mode}-before.jpg`, type: 'jpeg', quality: 78 });
  const ps = box.ps; const find = (re) => ps.find((x) => re.test(x.replace(/<[^>]+>/g, ''))) || '';
  const t = { intro: find(/מספק ליווי/), adv: find(/ניסיון משפטי/), ext: find(/שמאי/), lead: find(/המשרד מובל/), full: find(/לאורך כל הדרך/) };
  rep['about-text-' + mode] = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.length]));
  await p.evaluate((h) => { const o = document.getElementById('dbl-old-about'); o.insertAdjacentHTML('afterend', '<div id="dbl-new-about">' + h + '</div>'); o.style.display = 'none'; }, aboutHTML(t));
  await p.waitForTimeout(1500);
  const n = p.locator('#dbl-new-about'); await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  await n.screenshot({ path: `${OUT}/about-${mode}-after.jpg`, type: 'jpeg', quality: 80 });
  rep['cut-' + mode] = await p.evaluate(() => { const i = document.querySelector('#dbl-new-about img'); return i ? { ok: i.complete, w: i.naturalWidth, h: i.naturalHeight } : null; });
  await ctx.close();
}
// ---------- 2. legal info hub ----------
const posts = await (await fetch(S + '/wp-json/wp/v2/posts?per_page=9&_embed=wp:featuredmedia,wp:term', { headers: { 'user-agent': UA } })).json();
const cats = await (await fetch(S + '/wp-json/wp/v2/categories?per_page=60&orderby=count&order=desc&hide_empty=true&_fields=id,name,count,link', { headers: { 'user-agent': UA } })).json();
rep.cats = cats.map((c) => c.name + ':' + c.count);
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&#8211;/g, '-').replace(/&#822[01];/g, '"').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, '').replace(/\s+/g, ' ').trim();
const cards = posts.map((x) => { const img = x._embedded?.['wp:featuredmedia']?.[0]; const src = img?.media_details?.sizes?.medium_large?.source_url || img?.source_url || ''; const cat = (x._embedded?.['wp:term']?.[0] || []).find((c) => c.slug !== 'uncategorized' && !/מידע משפטי/.test(c.name))?.name || 'מקרקעין ונדל״ן'; const d = new Date(x.date); return { t: strip(x.title.rendered), e: strip(x.excerpt.rendered).slice(0, 150), src, cat, date: d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) }; });
const TOPICS = ['קונים דירה', 'מוכרים דירה', 'התחדשות עירונית', 'מיסוי מקרקעין', 'שכירות', 'ירושה ונכסים', 'בתים משותפים', 'תושבי חוץ'];
const GUIDES = [['רכישת דירה יד שנייה', 'המדריך המלא, משלב הבדיקות ועד הרישום'], ['מכירת דירה', 'השלבים המשפטיים ותכנון המס'], ['מיסוי מקרקעין', 'מס רכישה, מס שבח והיטל השבחה'], ['פינוי בינוי ותמ"א 38', 'מה חשוב לדיירים לפני שחותמים']];
const HUB_CSS = `.dbl-hub{--g:#c9a961;--g2:#e4d19c;--ink:#14213d;--tx:#4a5263;direction:rtl;font-family:inherit;background:#f7f6f2}
.dbl-hub .hero{background:radial-gradient(120% 140% at 85% 0,#1d2b52 0,#0b1530 60%);color:#fff;padding:56px 24px 48px}
.dbl-hub .in{max-width:1200px;margin:0 auto}
.dbl-hub .crumb{font-size:13px;color:#b9c0d4;margin-bottom:10px}.dbl-hub .crumb a{color:var(--g2);text-decoration:none}
.dbl-hub h1{font-size:44px;margin:0 0 10px;font-weight:800;color:#fff}.dbl-hub .sub{font-size:18px;line-height:1.7;color:#d6dbe8;max-width:680px;margin:0 0 24px}
.dbl-hub .search{display:flex;max-width:620px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.dbl-hub .search input{flex:1;border:0;padding:16px 18px;font-size:16px;font-family:inherit;outline:0;direction:rtl}
.dbl-hub .search button{border:0;background:var(--g);color:var(--ink);font-weight:800;padding:0 26px;font-size:16px;font-family:inherit}
.dbl-hub .chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.dbl-hub .chip{border:1px solid rgba(228,209,156,.45);color:#f1ead7;border-radius:999px;padding:8px 16px;font-size:14.5px;text-decoration:none}
.dbl-hub .sec{max-width:1200px;margin:0 auto;padding:40px 24px 8px}
.dbl-hub h2{font-size:26px;color:var(--ink);margin:0 0 18px;font-weight:800;display:flex;align-items:center;gap:12px}.dbl-hub h2:after{content:"";flex:1;height:1px;background:#e3dccd}
.dbl-hub .guides{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dbl-hub .guide{background:#fff;border:1px solid #ece6da;border-radius:16px;padding:20px;border-top:4px solid var(--g);text-decoration:none}
.dbl-hub .guide b{display:block;font-size:17px;color:var(--ink);margin-bottom:6px}.dbl-hub .guide span{font-size:14.5px;color:var(--tx);line-height:1.6}
.dbl-hub .guide i{display:block;font-style:normal;color:#8b6f47;font-weight:700;font-size:14px;margin-top:12px}
.dbl-hub .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.dbl-hub .post{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ece6da;display:flex;flex-direction:column;box-shadow:0 6px 18px rgba(20,33,61,.05)}
.dbl-hub .post .im{aspect-ratio:1200/630;background:#efe9dd;overflow:hidden}.dbl-hub .post .im img{width:100%;height:100%;object-fit:cover;display:block}
.dbl-hub .post .bd{padding:16px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}
.dbl-hub .post .cat{font-size:12.5px;font-weight:800;color:#8b6f47;letter-spacing:.2px}
.dbl-hub .post h3{font-size:18px;line-height:1.45;margin:0;color:var(--ink);font-weight:800;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.dbl-hub .post p{font-size:14.5px;line-height:1.65;color:var(--tx);margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dbl-hub .post .ft{margin-top:auto;padding-top:10px;border-top:1px solid #f0ebe1;display:flex;justify-content:space-between;font-size:13px;color:#8a90a0}.dbl-hub .post .ft b{color:#8b6f47}
.dbl-hub .pager{display:flex;justify-content:center;gap:8px;padding:30px 0 10px}.dbl-hub .pager span{min-width:42px;height:42px;border-radius:10px;border:1px solid #e3dccd;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ink);padding:0 12px}.dbl-hub .pager .on{background:var(--ink);color:var(--g2);border-color:var(--ink)}
.dbl-hub .help{max-width:1152px;margin:30px auto 48px;background:#fff;border:1px solid #ece6da;border-radius:18px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.dbl-hub .help b{font-size:19px;color:var(--ink)}.dbl-hub .help span{display:block;font-size:15px;color:var(--tx);margin-top:4px}
.dbl-hub .help .bt{display:flex;gap:10px}.dbl-hub .help a{height:46px;padding:0 20px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;font-weight:800;text-decoration:none}
.dbl-hub .help .ph{background:var(--ink);color:var(--g2)}.dbl-hub .help .wa{border:1.5px solid #25d366;color:#128c4b}.dbl-hub .help .wa svg{width:18px;height:18px}
@media (max-width:900px){.dbl-hub .hero{padding:34px 16px 30px}.dbl-hub h1{font-size:32px}.dbl-hub .sub{font-size:16px}.dbl-hub .chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}.dbl-hub .chip{white-space:nowrap}
.dbl-hub .sec{padding:28px 16px 4px}.dbl-hub .guides{grid-template-columns:1fr 1fr;gap:10px}.dbl-hub .guide{padding:14px}.dbl-hub .guide b{font-size:15.5px}.dbl-hub .guide span{font-size:13.5px}
.dbl-hub .grid{grid-template-columns:1fr;gap:16px}.dbl-hub .help{margin:20px 16px 36px}.dbl-hub .help .bt{width:100%}.dbl-hub .help a{flex:1;justify-content:center}}`;
const hubHTML = `<style>${HUB_CSS}</style><div class="dbl-hub"><div class="hero"><div class="in"><div class="crumb"><a href="#">דף הבית</a> / מידע משפטי</div>
<h1>מידע משפטי</h1><p class="sub">מדריכים, הסברים וכלים בנושאי מקרקעין ונדל״ן, בשפה פשוטה. נכתבים ומתעדכנים במשרד עו״ד יקיר דבול.</p>
<div class="search"><input placeholder="חיפוש: מס שבח, הערת אזהרה, פינוי בינוי..."><button>חיפוש</button></div>
<div class="chips">${TOPICS.map((t) => `<a class="chip" href="#">${t}</a>`).join('')}</div></div></div>
<div class="sec"><h2>מדריכים מרכזיים</h2><div class="guides">${GUIDES.map(([a, s]) => `<a class="guide" href="#"><b>${a}</b><span>${s}</span><i>למדריך ←</i></a>`).join('')}</div></div>
<div class="sec"><h2>מאמרים אחרונים</h2><div class="grid">${cards.map((c) => `<article class="post"><div class="im">${c.src ? `<img src="${c.src}" alt="">` : ''}</div><div class="bd"><span class="cat">${c.cat}</span><h3>${c.t}</h3><p>${c.e}</p><div class="ft"><span>${c.date}</span><b>לקריאה ←</b></div></div></article>`).join('')}</div>
<div class="pager"><span>→</span><span class="on">1</span><span>2</span><span>3</span><span>…</span><span>←</span></div></div>
<div class="help"><div><b>יש לכם שאלה על עסקה מסוימת?</b><span>מדברים איתנו ישירות, בלי טפסים.</span></div><div class="bt"><a class="ph" href="#">09-8613413</a><a class="wa" href="${WA}">${ICON.wa} וואטסאפ</a></div></div></div>`;
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(INFO + '?v=m1', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p); await wake(p); await hideFloat(p);
  await p.screenshot({ path: `${OUT}/info-${mode}-before.jpg`, type: 'jpeg', quality: 72 });
  await p.evaluate((h) => { const m = document.querySelector('main#content, main.site-main, main') || document.querySelector('#content'); m.outerHTML = '<main id="dbl-hub-wrap">' + h + '</main>'; }, hubHTML);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/info-${mode}-after-top.jpg`, type: 'jpeg', quality: 78 });
  const w = p.locator('#dbl-hub-wrap'); await w.screenshot({ path: `${OUT}/info-${mode}-after-full.jpg`, type: 'jpeg', quality: 70 });
  await ctx.close();
}
await b.close(); fs.writeFileSync(`${OUT}/mock.json`, JSON.stringify(rep, null, 1)); console.log('done');
