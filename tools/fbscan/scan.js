// Facebook groups scan v5. Runs in Yakir's Chrome (Claude in Chrome javascript_tool) on either
//   https://www.facebook.com/groups/feed/                                   (KEY = '')
//   https://www.facebook.com/groups/<KEY>/?sorting_setting=CHRONOLOGICAL     (KEY = approved group key)
// '__KEY__' is replaced by the SQL that hands out this script. Relevant posts are collected in this browser's
// localStorage '__dblscan' across pages; dump.js prints them all at the end of the run and clears the store.
const KEY = '__KEY__';
const WORDS = /עו["״']?ד|עורך דין|עורכת דין|עורכי דין|דירה|דירות|נכס|נדל["״]?ן|טאבו|נסח|רישום|חוזה|הסכם|זיכרון דברים|קבלן|יזם|פינוי|בינוי|תמ["״]?א|התחדשות|מס רכישה|מס שבח|היטל|משכנתא|ירושה|צוואה|עיזבון|ייפוי כוח|יפוי כח|אפוטרופ|שכירות|שוכר|משכיר|ועד בית|בית משותף|שכנ|גוש|חלקה|רמ["״]?י|מינהל|חכירה|הערת אזהרה|מכירה|קנייה|קניה|רוכש|מוכר|עיקול|הוצאה לפועל|פירוק שיתוף|חניה|מחסן|גג|היתר|חריג|חוב|חובות|חדלות|פשיטת רגל/; // same idea as the fbleads first filter
const sleep = ms => new Promise(r => setTimeout(r, ms));
let acc = {}; try { acc = JSON.parse(localStorage.getItem('__dblscan') || '{}') || {}; } catch (e) { acc = {}; }
const seen = new Set();
await sleep(3000); window.scrollTo(0, 0); await sleep(1000);
if (/login/.test(location.href) || document.querySelector('input[name=pass]')) { 'logged out'; } else {
const grab = () => { const feed = document.querySelector('[role=feed]'); if (!feed) return;
  [...feed.children].forEach(p => { const outer = p.querySelector('[role=article]') || p;
    const a = [...p.querySelectorAll('a[href*="/groups/"]')].map(x => x.href).find(h => /\/groups\/[^/?]+\/(posts|permalink)\/\d+/.test(h)); if (!a) return;
    const m = a.match(/\/groups\/([^/?]+)\/(?:posts|permalink)\/(\d+)/); const gid = KEY || m[1], pid = m[2]; seen.add(pid);
    let el = p.querySelector('[data-ad-preview="message"],[data-ad-comet-preview="message"]'); let text = el ? el.innerText : '';
    if (!text) { const c = [...outer.querySelectorAll('div[dir=auto]')].filter(d => d.closest('[role=article]') === outer || outer === p).map(d => d.innerText || '').sort((x, y) => y.length - x.length); text = c[0] || ''; }
    text = text.trim().slice(0, 2000);
    if (text.length < 15 || !WORDS.test(text)) return;
    const au = ((outer.querySelector('h2 a, h3 a, h4 a, strong a') || {}).innerText || '').trim();
    const prev = acc[pid]; if (!prev || (prev.t || '').length < text.length) acc[pid] = { g: gid, i: pid, a: au, t: text }; }); };
const rounds = KEY ? 6 : 16;
for (let i = 0; i < rounds; i++) {
  document.querySelectorAll('[role=feed] div[role=button]').forEach(b => { const t = (b.innerText || '').trim(); if (t === 'עוד' || t === 'See more' || t === 'הצג עוד') { const ar = b.closest('[role=article]'); if (ar && !ar.parentElement.closest('[role=article]')) { try { b.click() } catch (e) { } } } });
  await sleep(500); grab(); window.scrollBy(0, 2500); await sleep(1800); grab(); }
try { localStorage.setItem('__dblscan', JSON.stringify(acc)); } catch (e) { }
`seen ${seen.size}, stored ${Object.keys(acc).length}`; }
