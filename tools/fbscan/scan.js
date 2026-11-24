// Facebook groups feed scan. Runs in Yakir's Chrome on https://www.facebook.com/groups/feed/ (Claude in Chrome javascript_tool).
// Result: the page body is replaced by <pre id="fbout"> holding a compact JSON array [{g,i,a,t}] (group key, post id, author, text).
// The send SQL keeps only groups approved in docs fbleads/groups.on, adds the group name and post url,
// and posts the list to fbleads with the secret taken inside the database (the secret never passes through the browser or the chat).
const WORDS = /עו["״']?ד|עורך דין|עורכת דין|עורכי דין|דירה|דירות|נכס|נדל["״]?ן|טאבו|נסח|רישום|חוזה|הסכם|זיכרון דברים|קבלן|יזם|פינוי|בינוי|תמ["״]?א|התחדשות|מס רכישה|מס שבח|היטל|משכנתא|ירושה|צוואה|עיזבון|ייפוי כוח|יפוי כח|אפוטרופ|שכירות|שוכר|משכיר|ועד בית|בית משותף|שכנ|גוש|חלקה|רמ["״]?י|מינהל|חכירה|הערת אזהרה|מכירה|קנייה|קניה|רוכש|מוכר|עיקול|הוצאה לפועל|פירוק שיתוף|חניה|מחסן|גג|היתר|חריג/; // same first filter as fbleads, so only relevant text is sent
window.__fb = new Map(); const sleep = ms => new Promise(r => setTimeout(r, ms));
window.scrollTo(0, 0); await sleep(1500);
const grab = () => { const feed = document.querySelector('[role=feed]'); if (!feed) return;
  [...feed.children].forEach(p => { const outer = p.querySelector('[role=article]') || p;
    const a = [...p.querySelectorAll('a[href*="/groups/"]')].map(x => x.href).find(h => /\/groups\/[^/?]+\/(posts|permalink)\/\d+/.test(h)); if (!a) return;
    const m = a.match(/\/groups\/([^/?]+)\/(?:posts|permalink)\/(\d+)/); const gid = m[1], pid = m[2];
    let el = p.querySelector('[data-ad-preview="message"],[data-ad-comet-preview="message"]'); let text = el ? el.innerText : '';
    if (!text) { const c = [...outer.querySelectorAll('div[dir=auto]')].filter(d => d.closest('[role=article]') === outer || outer === p).map(d => d.innerText || '').sort((x, y) => y.length - x.length); text = c[0] || ''; }
    const au = (outer.querySelector('h2 a, h3 a, h4 a, strong a') || {}).innerText || '';
    const prev = window.__fb.get(pid); if (!prev || (prev.text || '').length < text.length) window.__fb.set(pid, { gid, pid, text: text.trim().slice(0, 2000), author: au.trim() }); }); };
for (let i = 0; i < 16; i++) {
  document.querySelectorAll('[role=feed] div[role=button]').forEach(b => { const t = (b.innerText || '').trim(); if (t === 'עוד' || t === 'See more' || t === 'הצג עוד') { const ar = b.closest('[role=article]'); if (ar && !ar.parentElement.closest('[role=article]')) { try { b.click() } catch (e) { } } } });
  await sleep(500); grab(); window.scrollBy(0, 2500); await sleep(1800); grab(); }
const all = [...window.__fb.values()];
const posts = all.filter(x => x.text.length >= 15 && WORDS.test(x.text)).map(x => ({ g: x.gid, i: x.pid, a: x.author, t: x.text }));
document.body.innerHTML = '<article><pre id="fbout"></pre></article>';
document.getElementById('fbout').textContent = JSON.stringify(posts);
`seen ${all.length}, kept ${posts.length}`;
