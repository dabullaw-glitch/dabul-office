// Team of One full QA on the published preview (25.11.2026). Real browser, real Supabase, test mode only.
// Creates throwaway students (@example.invalid), runs every check, and writes ONLY pass/fail, counts and short notes to
// out/results.json (no lesson text, no screenshots of paid pages, no signed links). The accounts are removed afterwards
// from the database by the agent that runs this (same cleanup as the too-pay self test).
import { chromium } from 'playwright';
import fs from 'node:fs';

const ORIGIN = 'https://dabullaw-glitch.github.io';
const BASE = ORIGIN + '/dabul-office/teamofone/';
const SB = 'https://mgjmnvpnovkewvqevjmz.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nam1udnBub3ZrZXd2cWV2am16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NzU0NzAsImV4cCI6MjEwNjQ1MTQ3MH0.idwuw243J8oRWtpdonHhaK4iKHL2qvdMZD_2xQSWBko';
const RUN = process.env.GITHUB_RUN_ID || String(Date.now());
const OUT = 'out';
fs.mkdirSync(OUT, { recursive: true });
const R = { started: new Date().toISOString(), run: RUN, checks: [], pages: [], accounts: [], notes: [] };
const red = (s) => String(s ?? '').replace(/token=[^&\s"']+/g, 'token=X').replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]+/g, 'JWT').slice(0, 400);
const check = (area, name, ok, extra = '') => { R.checks.push({ area, name, ok: !!ok, extra: red(typeof extra === 'string' ? extra : JSON.stringify(extra)) }); console.log(ok ? 'PASS' : 'FAIL', area, '|', name); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = () => fs.writeFileSync(OUT + '/results.json', JSON.stringify(R, null, 1));

// ---------- visible-text rules ----------
const HE = 'א-ת';
const BAD = [
  ['em dash', /—/g], ['en dash', /–/g],
  ['הכי', new RegExp(`(^|[^${HE}])[ושכלבמ]?הכי(?=[^${HE}]|$)`, 'g')],
  ['מומחה', /מומח/g],
];
function badWords(text) {
  const hits = [];
  for (const [name, re] of BAD) { let m; re.lastIndex = 0; while ((m = re.exec(text))) { hits.push(name + ': ' + text.slice(Math.max(0, m.index - 25), m.index + 25).replace(/\s+/g, ' ')); if (hits.length > 6) break; } }
  return hits;
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const desk = { viewport: { width: 1440, height: 900 }, locale: 'he-IL' };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' };
function watch(page) {
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + red(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + red(m.text())); });
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && !/fonts\.(googleapis|gstatic)/.test(u)) errs.push(`http ${r.status()}: ${red(u.split('?')[0])}`); });
  page.on('requestfailed', (q) => { const u = q.url(); const f = q.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) errs.push(`failed: ${red(u.split('?')[0])} ${f}`); });
  return errs;
}
async function settle(page, ms = 1500) { await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); await sleep(ms); }

// ---------- REST helpers (Node side) ----------
async function api(path, { token, method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(SB + path, { method, headers: { apikey: KEY, Authorization: 'Bearer ' + (token || KEY), 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}
async function sign(path, token) {
  const r = await api('/storage/v1/object/sign/too/' + path.split('/').map(encodeURIComponent).join('/'), { token, method: 'POST', body: { expiresIn: 120 } });
  const s = r.j && (r.j.signedURL || r.j.signedUrl);
  return { status: r.status, url: s ? SB + '/storage/v1' + s : '' };
}
async function rangeGet(url) { const r = await fetch(url, { headers: { Range: 'bytes=0-1023' } }); const b = await r.arrayBuffer(); return { status: r.status, len: b.byteLength, type: r.headers.get('content-type') || '' }; }

// =============== 1. public pages crawl ===============
const START = ['', 'kursim/', 'maamarim/', 'knisa/', 'tnaim/', 'pratiut/', 'negishut/', 'kelim/', 'etgar/', 'robots.txt', 'sitemap.xml'];
const seen = new Set(), queue = START.map((p) => BASE + p), linkMap = {};
const norm = (u) => { const x = new URL(u); x.hash = ''; return x.href; };
const ctxA = await browser.newContext(desk);
const pA = await ctxA.newPage();
const errsA = watch(pA);
let buildSha = '';
while (queue.length && seen.size < 120) {
  const url = norm(queue.shift()); if (seen.has(url)) continue; seen.add(url);
  errsA.length = 0;
  const res = await pA.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => ({ status: () => 0, e }));
  await settle(pA);
  const status = res && res.status ? res.status() : 0;
  const final = pA.url();
  const isHtml = !/\.(txt|xml)$/.test(new URL(url).pathname);
  const P = { url: url.replace(BASE, '/'), status, final: final.replace(BASE, '/'), errors: [...new Set(errsA)].slice(0, 12) };
  if (isHtml) {
    const info = await pA.evaluate(() => ({
      text: document.title + '\n' + (document.body ? document.body.innerText : ''),
      robots: (document.querySelector('meta[name=robots]') || {}).content || '',
      build: (document.querySelector('meta[name=build]') || {}).content || '',
      noalt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')).slice(0, 5),
      broken: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src')).slice(0, 5),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
      ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
      h1: (document.querySelector('h1') || {}).innerText || '',
    })).catch(() => null);
    if (info) {
      buildSha = buildSha || info.build;
      P.noindex = /noindex/.test(info.robots); P.bad = badWords(info.text); P.noalt = info.noalt; P.brokenImg = info.broken; P.ids = info.ids.length; P.h1 = info.h1.slice(0, 60);
      P.moreCourses = info.text.includes('קורסים נוספים') || info.ids.includes('more-courses');
      for (const l of info.links) {
        if (!l.startsWith(ORIGIN)) continue;
        (linkMap[norm(l)] ||= new Set()).add(P.url);
        if (l.startsWith(BASE)) { const h = new URL(l); if (h.hash) (R._hashes ||= []).push([norm(l), h.hash.slice(1), P.url]); if (!seen.has(norm(l)) && !/\/(ezor-ishi|nihul)\//.test(h.pathname)) queue.push(l); }
      }
      P._ids = info.ids;
    }
  } else {
    P.body = (await pA.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 300);
  }
  R.pages.push(P);
}
// every internal link target answers 200 (pages, also those not crawled because they need login)
const outside = [];
for (const [l, from] of Object.entries(linkMap)) {
  if (!l.startsWith(BASE)) { outside.push(l + ' <- ' + [...from][0]); continue; }
  const p = R.pages.find((x) => norm(BASE + x.url.slice(1)) === l);
  let st = p ? p.status : 0;
  if (!p) { const r = await fetch(l, { redirect: 'follow' }).catch(() => null); st = r ? r.status : 0; }
  if (st !== 200) R.notes.push(`broken link ${l.replace(BASE, '/')} (${st}) from ${[...from].slice(0, 3).join(', ')}`);
  check('crawl', 'link ' + l.replace(BASE, '/'), st === 200, st === 200 ? '' : 'status ' + st + ' from ' + [...from].slice(0, 3).join(', '));
}
check('crawl', 'no links to the same host outside the site', outside.length === 0, outside.slice(0, 5));
for (const [l, h, from] of R._hashes || []) {
  const p = R.pages.find((x) => norm(BASE + x.url.slice(1)) === l);
  if (p && p._ids && h) check('crawl', `anchor ${l.replace(BASE, '/')}#${h}`, p._ids.includes(decodeURIComponent(h)), 'from ' + from);
}
delete R._hashes;
for (const P of R.pages) {
  const isHtml = !/\.(txt|xml)$/.test(P.url);
  check('public', 'loads ' + P.url, P.status === 200, P.status);
  if (!isHtml) continue;
  check('public', 'no console/network errors ' + P.url, P.errors.length === 0, P.errors);
  check('public', 'noindex ' + P.url, P.noindex);
  check('public', 'no dashes/הכי/מומחה ' + P.url, (P.bad || []).length === 0, P.bad);
  check('public', 'images have alt ' + P.url, (P.noalt || []).length === 0, P.noalt);
  check('public', 'images load ' + P.url, (P.brokenImg || []).length === 0, P.brokenImg);
  delete P._ids;
}
const home = R.pages.find((p) => p.url === '/');
check('public', 'home has the courses section (קורסים נוספים / #more-courses)', home && home.moreCourses);
const kurs = R.pages.filter((p) => /^\/kursim\//.test(p.url));
check('public', 'course catalog pages crawled (kursim)', kurs.length >= 1, kurs.map((k) => k.url));
const arts = R.pages.filter((p) => /^\/maamarim\/[^/]+\/$/.test(p.url));
check('public', 'article pages found and crawled', arts.length >= 3, arts.map((a) => a.url));
const robots = R.pages.find((p) => p.url === '/robots.txt');
check('public', 'robots.txt closes the preview', robots && /Disallow:\s*\/\s*$/m.test(robots.body || ''), robots && robots.body);
R.build = buildSha;

// phone: no sideways scroll on public pages
const ctxPh = await browser.newContext(phone); const pPh = await ctxPh.newPage();
for (const P of R.pages.filter((p) => !/\.(txt|xml)$/.test(p.url) && p.status === 200)) {
  await pPh.goto(BASE + P.url.slice(1), { waitUntil: 'domcontentloaded' }).catch(() => {}); await settle(pPh, 800);
  const w = await pPh.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]).catch(() => [0, 0]);
  check('layout', 'phone no sideways scroll ' + P.url, w[0] <= w[1] + 1, w);
}
await ctxPh.close();
// client-rendered article page (maamar/?s=)
if (arts[0]) {
  const slug = arts[0].url.split('/')[2]; errsA.length = 0;
  await pA.goto(BASE + 'maamar/?s=' + slug, { waitUntil: 'domcontentloaded' }); await settle(pA);
  check('public', 'maamar/?s= renders an article', await pA.locator('article.prose').count() > 0, [...errsA]);
}
save();

// =============== 2. anonymous access ===============
{
  const a2 = await api('/rest/v1/too_lesson_content?select=lesson_id,body_md&lesson_id=eq.2');
  check('access', 'anon cannot read paid lesson text', a2.status >= 400 || (Array.isArray(a2.j) && a2.j.length === 0), a2.status);
  const a1 = await api('/rest/v1/too_lesson_content?select=lesson_id&limit=100');
  check('access', 'anon reads no lesson text rows at all', a1.status >= 400 || (Array.isArray(a1.j) && a1.j.length === 0), { status: a1.status, n: Array.isArray(a1.j) ? a1.j.length : null });
  const s1 = await sign('lessons/m1-l1-task-map.xlsx');
  check('access', 'anon cannot sign a lesson file', !s1.url, s1.status);
  const s2 = await sign('videos/l01/lesson.mp4');
  check('access', 'anon cannot sign a lesson video', !s2.url, s2.status);
  const pub = await fetch(SB + '/storage/v1/object/public/too/videos/l01/lesson.mp4', { headers: { Range: 'bytes=0-10' } });
  check('access', 'bucket too is not public', pub.status >= 400, pub.status);
  for (const fn of ['too_admin_users', 'too_admin_orders', 'too_admin_stats']) {
    const r = await api('/rest/v1/rpc/' + fn, { method: 'POST', body: {} });
    check('access', 'anon refused ' + fn, r.status >= 400 || r.j === null || (Array.isArray(r.j) && r.j.length === 0), r.status);
  }
  const ck = await fetch(SB + '/functions/v1/too-pay', { method: 'POST', headers: { 'content-type': 'application/json', apikey: KEY, Origin: ORIGIN }, body: JSON.stringify({ action: 'checkout', plan: 'course' }) });
  const ckj = await ck.json().catch(() => ({}));
  check('purchase', 'anon real checkout refused', ck.status >= 400 && !ckj.url, { s: ck.status, e: ckj.error });
  errsA.length = 0;
  await pA.goto(BASE + 'ezor-ishi/shiur/?id=2', { waitUntil: 'domcontentloaded' }); await settle(pA);
  check('access', 'anon lesson page sends to login', /\/knisa\//.test(pA.url()), pA.url().replace(BASE, '/'));
  await pA.goto(BASE + 'nihul/', { waitUntil: 'domcontentloaded' }); await settle(pA, 2500);
  const nihulAnon = (await pA.locator('#snav button').count()) === 0;
  check('access', 'anon admin panel closed', nihulAnon, pA.url().replace(BASE, '/'));
}
await ctxA.close();
save();

// =============== 3. students ===============
// The file "public-only" next to this script skips the student part (no accounts are created). Remove it for a full run;
// the throwaway accounts then have to be removed from the database afterwards.
if (fs.existsSync('public-only')) { R.publicOnly = true; R.finished = new Date().toISOString(); R.summary = { total: R.checks.length, failed: R.checks.filter((c) => !c.ok).length }; save(); await browser.close(); console.log(JSON.stringify(R.summary)); process.exit(0); }
async function newStudent(tag) {
  const ctx = await browser.newContext(desk); const page = await ctx.newPage(); const errs = watch(page);
  const email = `qa-${tag}-${RUN}@example.invalid`, pass = 'Qa-' + Math.random().toString(36).slice(2, 12) + '9!';
  R.accounts.push(email);
  await page.goto(BASE + 'knisa/', { waitUntil: 'domcontentloaded' }); await settle(page, 800);
  await page.fill('#n', 'בדיקת איכות'); await page.fill('#e', email); await page.fill('#p', pass); await page.check('#ok');
  await page.click('#bSign');
  const ok = await page.waitForURL(/ezor-ishi/, { timeout: 30000 }).then(() => true).catch(() => false);
  check('signup', `signup + auto login (${tag})`, ok, ok ? '' : await page.locator('#err1').textContent().catch(() => ''));
  await settle(page);
  const tok = async () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('too-auth')).access_token; } catch { return ''; } });
  return { ctx, page, errs, email, pass, tok };
}
const me = async (S) => (await api('/rest/v1/rpc/too_me', { token: await S.tok(), method: 'POST', body: {} })).j;
async function lessonPage(S, id) {
  S.errs.length = 0;
  await S.page.goto(BASE + 'ezor-ishi/shiur/?id=' + id, { waitUntil: 'domcontentloaded' });
  await S.page.waitForSelector('.lessonw, .card', { timeout: 20000 }).catch(() => {}); await settle(S.page, 1200);
  return S.page.evaluate(() => ({
    prose: !!document.querySelector('.prose'), box: (document.querySelector('.prose') || { innerText: '' }).innerText.includes('מה תצאו איתו'),
    files: document.querySelectorAll('[data-dl]').length, video: !!document.querySelector('.vid2 video'), locked: document.body.innerText.includes('השיעור נעול'),
    joinMsg: document.body.innerText.includes('הסרטון של השיעור פתוח לחברי הקהילה'), mark: !!document.querySelector('#mark'),
    bad: '', text: document.body.innerText,
  })).then((x) => { const b = badWords(x.text); delete x.text; x.bad = b; return x; });
}
async function buy(S, plan) {
  S.errs.length = 0;
  await S.page.goto(BASE + 'kniya/?plan=' + plan, { waitUntil: 'domcontentloaded' });
  await S.page.waitForSelector('#go, #pay, .card p', { timeout: 20000 }).catch(() => {}); await settle(S.page, 800);
  const v = await S.page.evaluate(() => ({ text: document.getElementById('box').innerText, go: !!document.getElementById('go'), pay: !!document.getElementById('pay') }));
  return v;
}
const lessonsByMod = {}; let allContent = [];

// ---- N: signed in, no purchase ----
const N = await newStudent('none');
{
  const m = await me(N);
  check('member', 'no-access: too_me access false', m && m.access === false && (m.modules || []).length === 0, { access: m && m.access, modules: m && m.modules });
  const v = await N.page.evaluate(() => ({ mods: document.querySelectorAll('.mods2 .m2').length, lib: document.querySelectorAll('#lib li').length, none: document.body.innerText.includes('אין עדיין גישה') }));
  check('member', 'no-access: 14 modules listed', v.mods === 14, v.mods);
  check('member', 'no-access: library 13 items listed', v.lib === 13, v.lib);
  check('member', 'no-access: shows "no access yet"', v.none);
  const tok = await N.tok();
  const c = await api('/rest/v1/too_lesson_content?select=lesson_id&limit=200', { token: tok });
  const ids = Array.isArray(c.j) ? c.j.map((x) => x.lesson_id) : [];
  check('access', 'no-access: reads only the free preview text', ids.length === 1 && ids[0] === 1, ids);
  const s = await sign('lessons/m1-l1-task-map.xlsx', tok);
  check('access', 'no-access: cannot sign lesson 1 file', !s.url, s.status);
  const sv = await sign('videos/l01/lesson.mp4', tok);
  check('access', 'no-access: cannot sign lesson 1 video', !sv.url, sv.status);
  const l1 = await lessonPage(N, 1);
  check('member', 'no-access: free lesson 1 text opens', l1.prose && l1.box, l1);
  check('member', 'no-access: free lesson 1 shows join message, no video', !l1.video && l1.joinMsg, l1);
  const l2 = await lessonPage(N, 2);
  check('access', 'no-access: lesson 2 locked, no text', l2.locked && !l2.prose && l2.files === 0, l2);
  const l51 = await lessonPage(N, 51);
  check('access', 'no-access: course 11 lesson locked', l51.locked && !l51.prose, l51);
  const l38 = await lessonPage(N, 38);
  check('access', 'no-access: library item locked', l38.locked && !l38.prose, l38);
  for (const fn of ['too_admin_users', 'too_admin_orders', 'too_admin_stats']) {
    const r = await api('/rest/v1/rpc/' + fn, { token: tok, method: 'POST', body: {} });
    check('access', 'student refused ' + fn, r.status >= 400, r.status);
  }
  await N.page.goto(BASE + 'nihul/', { waitUntil: 'domcontentloaded' }); await settle(N.page, 2500);
  check('access', 'student sees "אין הרשאה" on admin panel', await N.page.locator('text=אין הרשאה').count() > 0 && await N.page.locator('#snav button').count() === 0);
  // purchase pages in test mode
  const k11 = await buy(N, 'module-11');
  check('purchase', 'kniya module-11: single-course view', k11.text.includes('קורס בודד: גישה לכל החיים לקורס הזה') && /249/.test(k11.text), k11.text.slice(0, 200));
  check('purchase', 'kniya module-11: only the test button (no real pay)', k11.go && !k11.pay && k11.text.includes('לא יבוצע חיוב'));
  check('purchase', 'kniya module-11: no dashes/הכי/מומחה', badWords(k11.text).length === 0, badWords(k11.text));
  const kc = await buy(N, 'course');
  check('purchase', 'kniya course: 990, test button only', /990/.test(kc.text) && kc.go && !kc.pay, kc.text.slice(0, 160));
  const km = await buy(N, 'monthly');
  check('purchase', 'kniya monthly: 1 ₪ intro then 95', /1\s*₪/.test(km.text) && /95/.test(km.text) && km.go && !km.pay, km.text.slice(0, 200));
  check('purchase', 'purchase pages: no console errors', N.errs.length === 0, N.errs);
  for (const plan of ['course', 'monthly', 'module-11']) {
    const r = await fetch(SB + '/functions/v1/too-pay', { method: 'POST', headers: { 'content-type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + tok, Origin: ORIGIN }, body: JSON.stringify({ action: 'checkout', plan }) });
    const j = await r.json().catch(() => ({}));
    check('purchase', `real checkout refused in test mode (${plan})`, r.status === 409 && j.error === 'test_mode_on' && !j.url, { s: r.status, e: j.error });
  }
  const o = await api('/rest/v1/too_orders?select=id', { token: tok });
  check('purchase', 'no-access: no orders were created by checks', Array.isArray(o.j) && o.j.length === 0, o.j);
}
await N.ctx.close();
save();

// ---- A: buys course 11 only ----
const A = await newStudent('m11');
{
  await buy(A, 'module-11');
  await A.page.click('#go');
  const ok = await A.page.waitForURL(/perek\/\?id=11/, { timeout: 30000 }).then(() => true).catch(() => false);
  await settle(A.page);
  check('purchase', 'module-11 test purchase goes to the course page', ok && (await A.page.locator('text=הקורס פתוח לכם').count()) > 0, A.page.url().replace(BASE, '/'));
  const m = await me(A);
  check('purchase', 'module-11 buyer: modules [11], no membership', m && m.access === false && m.course === false && JSON.stringify(m.modules) === '[11]' && !m.sub_ends, { access: m.access, course: m.course, modules: m.modules, sub: m.sub_ends });
  const tok = await A.tok();
  const o = await api('/rest/v1/too_orders?select=plan_code,amount_ils,status,provider', { token: tok });
  check('purchase', 'module-11 buyer: one test order 249', Array.isArray(o.j) && o.j.length === 1 && o.j[0].plan_code === 'module-11' && o.j[0].amount_ils === 249 && o.j[0].status === 'test', o.j);
  const c = await api('/rest/v1/too_lesson_content?select=lesson_id,attachments&limit=200', { token: tok });
  const ids = Array.isArray(c.j) ? c.j.map((x) => x.lesson_id).sort((a, b) => a - b) : [];
  check('access', 'module-11 buyer reads only course 11 + free preview', JSON.stringify(ids) === JSON.stringify([1, 51, 52, 53, 54, 55, 56]), ids);
  const a51 = (c.j || []).find((x) => x.lesson_id === 51);
  if (a51 && a51.attachments[0]) { const s = await sign(a51.attachments[0].path, tok); const g = s.url ? await rangeGet(s.url) : {}; check('access', 'module-11 buyer downloads a course 11 file', g.status === 206 || g.status === 200, { sign: s.status, get: g.status }); }
  const s12 = await sign('lessons/m1-l2-privacy-rules.docx', tok);
  check('access', 'module-11 buyer cannot sign a main-course file', !s12.url, s12.status);
  const sv = await sign('videos/l02/lesson.mp4', tok);
  check('access', 'module-11 buyer cannot sign a main-course video', !sv.url, sv.status);
  const sa = await sign('videos/l01/lesson.mp4', tok);
  R.notes.push('module-11 buyer and lesson 1 (free preview) video signing: ' + (sa.url ? 'allowed' : 'refused') + ' (page shows the join message either way)');
  const ezor = await (async () => { await A.page.goto(BASE + 'ezor-ishi/', { waitUntil: 'domcontentloaded' }); await A.page.waitForSelector('.mods2', { timeout: 20000 }).catch(() => {}); await settle(A.page); return A.page.evaluate(() => ({ t: document.body.innerText.includes('קורס בודד: אתר שמביא פניות מגוגל'), kp: (document.querySelector('.kp.dk span') || {}).innerText || '', lock: document.querySelectorAll('.mods2 a').length })); })();
  check('member', 'module-11 buyer: personal area shows the single course pill', ezor.t, ezor);
  for (const id of [51, 53, 56]) { const L = await lessonPage(A, id); check('member', `module-11 buyer opens lesson ${id}`, L.prose && L.box && L.files >= 1 && !L.locked, L); }
  for (const id of [2, 57, 38]) { const L = await lessonPage(A, id); check('access', `module-11 buyer locked out of lesson ${id}`, L.locked && !L.prose, L); }
  const L1 = await lessonPage(A, 1); check('access', 'module-11 buyer still sees free preview text', L1.prose, L1);
  // progress
  await lessonPage(A, 51); await A.page.click('#mark').catch(() => {}); await sleep(2000);
  const mk = await A.page.locator('#mark').textContent().catch(() => '');
  await A.page.goto(BASE + 'ezor-ishi/', { waitUntil: 'domcontentloaded' }); await A.page.waitForSelector('.kp', { timeout: 20000 }).catch(() => {}); await settle(A.page);
  const kp = await A.page.locator('.kp.dk span').textContent().catch(() => '');
  check('member', 'module-11 buyer: progress marking works (1 of 6)', mk.includes('סימנתי') && /1 מתוך 6/.test(kp), { mk, kp });
  const k11 = await buy(A, 'module-11');
  check('purchase', 'module-11 owner: kniya says already has it, no buttons', k11.text.includes('כבר יש לכם גישה לקורס הזה') && !k11.go && !k11.pay, k11.text.slice(0, 120));
  await A.page.goto(BASE + 'nihul/', { waitUntil: 'domcontentloaded' }); await settle(A.page, 2500);
  check('access', 'module-11 buyer: admin panel refused', await A.page.locator('text=אין הרשאה').count() > 0);
  check('member', 'module-11 buyer pages: no console errors', A.errs.length === 0, A.errs);
}
await A.ctx.close();
save();

// ---- M: monthly with the 1 ₪ intro ----
const M = await newStudent('monthly');
{
  const v = await buy(M, 'monthly');
  check('purchase', 'monthly: intro 1 ₪ shown before buying', /1\s*₪/.test(v.text) && v.text.includes('מבצע השקה'));
  await M.page.click('#go');
  const ok = await M.page.waitForURL(/ezor-ishi\/\?welcome=1/, { timeout: 30000 }).then(() => true).catch(() => false);
  check('purchase', 'monthly test purchase opens the personal area', ok);
  const m = await me(M);
  const days = m && m.sub_ends ? (new Date(m.sub_ends) - Date.now()) / 864e5 : 0;
  check('purchase', 'monthly: membership on, no course, about one month, renews', m && m.access === true && m.course === false && days > 27 && days < 32 && m.sub_renew === true, { access: m.access, course: m.course, days: Math.round(days), renew: m.sub_renew, modules: m.modules });
  const tok = await M.tok();
  const o = await api('/rest/v1/too_orders?select=plan_code,amount_ils,status', { token: tok });
  check('purchase', 'monthly: one test order of 1 ₪', Array.isArray(o.j) && o.j.length === 1 && o.j[0].plan_code === 'monthly' && o.j[0].amount_ils === 1 && o.j[0].status === 'test', o.j);
  const v2 = await buy(M, 'monthly');
  check('purchase', 'monthly: intro is not offered twice (shows 95)', !v2.text.includes('מבצע השקה') && /95/.test(v2.text), v2.text.slice(0, 120));
  const c = await api('/rest/v1/too_lesson_content?select=lesson_id&limit=200', { token: tok });
  check('access', 'monthly member reads all 71 lesson texts', Array.isArray(c.j) && c.j.length === 71, Array.isArray(c.j) ? c.j.length : c.status);
  const L = await lessonPage(M, 60); check('member', 'monthly member opens a course 12 lesson', L.prose && !L.locked, L);
}
await M.ctx.close();
save();

// ---- C: full course ----
const C = await newStudent('course');
{
  await buy(C, 'course'); await C.page.click('#go');
  const ok = await C.page.waitForURL(/ezor-ishi\/\?welcome=1/, { timeout: 30000 }).then(() => true).catch(() => false);
  check('purchase', 'course test purchase opens the personal area', ok);
  const m = await me(C);
  const days = m && m.sub_ends ? (new Date(m.sub_ends) - Date.now()) / 864e5 : 0;
  check('purchase', 'course: course + 3 bonus months', m && m.access === true && m.course === true && days > 85 && days < 95, { course: m.course, days: Math.round(days), renew: m.sub_renew });
  const tok = await C.tok();
  const o = await api('/rest/v1/too_orders?select=plan_code,amount_ils,status', { token: tok });
  check('purchase', 'course: one test order of 990', Array.isArray(o.j) && o.j.length === 1 && o.j[0].plan_code === 'course' && o.j[0].amount_ils === 990 && o.j[0].status === 'test', o.j);
  await C.page.waitForSelector('.mods2', { timeout: 20000 }).catch(() => {}); await settle(C.page);
  const v = await C.page.evaluate(() => ({ mods: [...document.querySelectorAll('.mods2 .m2 .nn')].map((e) => +e.innerText), lib: document.querySelectorAll('#lib li').length, full: document.body.innerText.includes('הקורס המלא'), locks: (document.querySelector('.mods2') || { innerText: '' }).innerText.split('🔒').length - 1, dl: document.querySelectorAll('[data-dl]').length }));
  check('member', 'member: modules 1-14 listed in order', JSON.stringify(v.mods) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), v.mods);
  check('member', 'member: library 13 items, nothing locked', v.lib === 13 && v.locks === 0, v);
  check('member', 'member: 12 skill/template downloads offered', v.dl === 12, v.dl);
  const c = await api('/rest/v1/too_lesson_content?select=lesson_id,attachments,video_url&limit=200', { token: tok });
  allContent = Array.isArray(c.j) ? c.j : [];
  check('access', 'member reads all 71 lesson texts', allContent.length === 71, allContent.length);
  const les = await api('/rest/v1/too_lessons?select=id,module_id,n,kind&order=n', { token: tok });
  for (const l of les.j || []) (lessonsByMod[l.module_id ?? 'lib'] ||= []).push(l.id);
  // several lessons in every module (first, middle, last) + every library item
  const pick = [];
  for (const [k, ids] of Object.entries(lessonsByMod)) { if (k === 'lib') pick.push(...ids); else pick.push(...new Set([ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]])); }
  for (const id of pick) {
    const exp = ((allContent.find((x) => x.lesson_id === id) || {}).attachments || []).length;
    const L = await lessonPage(C, id);
    const errs = [...C.errs];
    check('member', `lesson ${id}: text, "מה תצאו איתו", ${exp} file button(s), no errors`, L.prose && L.box && L.files === exp && L.mark && !L.locked && errs.length === 0 && L.bad.length === 0, { ...L, errs });
  }
  // every attachment signs and downloads (range 206)
  let nf = 0; const badF = [];
  for (const x of allContent) for (const a of x.attachments || []) { nf++; const s = await sign(a.path, tok); const g = s.url ? await rangeGet(s.url) : { status: s.status }; if (!(g.status === 206 || g.status === 200) || !(g.len > 0)) badF.push(x.lesson_id + ':' + a.path + ':' + g.status); }
  check('member', `all ${nf} lesson files sign and download`, nf > 0 && badF.length === 0, badF);
  const assets = await api('/rest/v1/too_assets?select=path&published=eq.true', { token: tok });
  const badA = [];
  for (const a of assets.j || []) { const s = await sign(a.path, tok); const g = s.url ? await rangeGet(s.url) : { status: s.status }; if (!(g.status === 206 || g.status === 200)) badA.push(a.path + ':' + g.status); }
  check('member', `all ${(assets.j || []).length} skills/templates download`, (assets.j || []).length === 12 && badA.length === 0, badA);
  // a real click download in the browser
  await lessonPage(C, 52);
  const dl = await Promise.all([C.page.waitForEvent('download', { timeout: 20000 }).catch(() => null), C.page.click('[data-dl]').catch(() => {})]);
  check('member', 'clicking a file button downloads the file', !!dl[0] && /\.(docx|xlsx)$/.test(dl[0].suggestedFilename()), dl[0] ? dl[0].suggestedFilename() : 'no download');
  // videos 1-3
  for (const id of [1, 2, 3]) {
    const L = await lessonPage(C, id);
    const src = await C.page.getAttribute('.vid2 video', 'src').catch(() => '');
    const g = src ? await rangeGet(src) : { status: 0 };
    const play = src ? await C.page.evaluate(async () => {
      const v = document.querySelector('.vid2 video'); v.muted = true;
      if (v.readyState < 1) await new Promise((r) => { v.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 15000); });
      try { await v.play(); } catch (e) { return { err: String(e), d: v.duration }; }
      await new Promise((r) => setTimeout(r, 3000)); const t = v.currentTime; v.pause();
      return { d: Math.round(v.duration), t, err: v.error ? v.error.code : null };
    }) : {};
    check('video', `lesson ${id} video: signed link answers 206`, L.video && /\/object\/sign\/too\/videos\//.test(src || '') && g.status === 206 && /video/.test(g.type), { status: g.status, type: g.type });
    check('video', `lesson ${id} video plays`, play.d > 60 && play.t > 0.5 && !play.err, play);
  }
  // progress
  await lessonPage(C, 5); await C.page.click('#mark').catch(() => {}); await sleep(2000);
  await lessonPage(C, 5);
  const mk = await C.page.locator('#mark').textContent().catch(() => '');
  await C.page.goto(BASE + 'ezor-ishi/', { waitUntil: 'domcontentloaded' }); await C.page.waitForSelector('.kp', { timeout: 20000 }).catch(() => {}); await settle(C.page);
  const kp = await C.page.locator('.kp.dk b').textContent().catch(() => '');
  check('member', 'member: progress saved after reload and counted', mk.includes('סימנתי') && kp.trim() !== '0%', { mk, kp });
  // course pages (perek) and other member pages
  for (const p of ['ezor-ishi/perek/?id=1', 'ezor-ishi/perek/?id=11', 'ezor-ishi/perek/?id=14', 'ezor-ishi/kehila/', 'ezor-ishi/laiv/', 'ezor-ishi/etgar/']) {
    C.errs.length = 0;
    await C.page.goto(BASE + p, { waitUntil: 'domcontentloaded' }); await settle(C.page, 2500);
    const t = await C.page.evaluate(() => document.body.innerText);
    check('member', 'member page ' + p + ' loads clean', !/לא נמצא|משהו השתבש/.test(t) && C.errs.length === 0 && badWords(t).length === 0, { errs: [...C.errs], bad: badWords(t) });
  }
  await C.page.goto(BASE + 'nihul/', { waitUntil: 'domcontentloaded' }); await settle(C.page, 2500);
  check('access', 'member (not admin): admin panel refused', await C.page.locator('text=אין הרשאה').count() > 0 && await C.page.locator('#snav button').count() === 0);
  // phone layout of member pages
  const st = await C.ctx.storageState();
  const ph = await browser.newContext({ ...phone, storageState: st }); const pp = await ph.newPage();
  for (const p of ['ezor-ishi/', 'ezor-ishi/shiur/?id=2', 'ezor-ishi/perek/?id=11', 'kniya/?plan=module-12']) {
    await pp.goto(BASE + p, { waitUntil: 'domcontentloaded' }); await settle(pp, 2500);
    const w = await pp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check('layout', 'phone no sideways scroll ' + p, w[0] <= w[1] + 1, w);
  }
  await ph.close();
}
await C.ctx.close();

R.finished = new Date().toISOString();
R.summary = { total: R.checks.length, failed: R.checks.filter((c) => !c.ok).length };
save();
await browser.close();
console.log(JSON.stringify(R.summary));
