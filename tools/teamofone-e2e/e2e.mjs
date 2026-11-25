// Team of One end-to-end check on the published preview. Saves ONLY results.json to ./out: pass/fail per step and counts.
// No screenshots, no page text, no account details, no error text (25.11.2026: the output branch is public).
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://dabullaw-glitch.github.io/dabul-office/teamofone/';
const EXPECT = (fs.existsSync('expect.txt') ? fs.readFileSync('expect.txt', 'utf8') : '').trim();
const SHA = EXPECT;
const RUN = process.env.GITHUB_RUN_ID || String(Date.now());
fs.mkdirSync('out', { recursive: true });
const R = { started: new Date().toISOString(), sha: SHA, steps: [], errors: {} };
const step = (name, ok) => { R.steps.push({ name, ok: !!ok }); console.log(ok ? 'OK ' : 'FAIL', name); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitBuild(page) {
  if (!SHA) { await page.goto(BASE, { waitUntil: 'domcontentloaded' }); return step('site is up', (await page.title()).length > 0); }
  for (let i = 0; i < 40; i++) {
    try { await page.goto(BASE + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' }); const b = await page.getAttribute('meta[name=build]', 'content').catch(() => null); if (b === SHA) return step('site built from this commit', true); } catch {}
    await sleep(15000);
  }
  step('site built from this commit', false);
}
const browser = await chromium.launch();
async function ctx(mobile) { return browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' } : { viewport: { width: 1440, height: 900 }, locale: 'he-IL' }); }
function watch(page, key) { R.errors[key] = 0; page.on('pageerror', () => R.errors[key]++); page.on('console', (m) => { if (m.type() === 'error') R.errors[key]++; }); }
// shot() is kept as a no-op so the flow stays the same; nothing is captured or saved.
async function shot() {}

try {
  const d = await ctx(false); const p = await d.newPage(); watch(p, 'desktop');
  await waitBuild(p);
  await p.goto(BASE, { waitUntil: 'networkidle' }); await shot(p, '01-home-desktop');
  step('home loads', (await p.locator('h1').first().textContent()).includes('צוות'));
  for (const [path, name] of [['maamarim/', '02-articles'], ['knisa/', '03-login'], ['tnaim/', '04-terms']]) { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await shot(p, name, false); }

  // student flow
  const email = `e2e-${RUN}@example.com`, pass = 'E2e-' + Math.random().toString(36).slice(2, 12) + '9!';
  await p.goto(BASE + 'knisa/?plan=course', { waitUntil: 'networkidle' });
  await p.fill('#n', 'בדיקה אוטומטית'); await p.fill('#e', email); await p.fill('#ph', '0500000000'); await p.fill('#p', pass); await p.check('#ok');
  await p.click('#bSign');
  await p.waitForURL(/kniya/, { timeout: 25000 }).then(() => step('signup and login', true)).catch(async () => { step('signup and login', false); });
  await p.waitForSelector('#go', { timeout: 15000 }).catch(() => {});
  await shot(p, '05-checkout', false);
  await p.click('#go').catch(() => {});
  await p.waitForURL(/ezor-ishi/, { timeout: 20000 }).then(() => step('test purchase', true)).catch(() => step('test purchase', false));
  await p.waitForSelector('.mods2', { timeout: 20000 }).catch(() => {});
  await shot(p, '06-member-area');
  step('member area shows access', await p.locator('text=הקורס המלא').count() > 0);
  const first = p.locator('.ls a').first(); await first.click();
  await p.waitForSelector('#mark', { timeout: 20000 }).catch(() => {});
  await shot(p, '07-lesson', false);
  await p.click('#mark').catch(() => {}); await sleep(1500);
  step('mark lesson done', (await p.locator('#mark').textContent().catch(() => '')).includes('סימנתי'));
  await p.goto(BASE + 'ezor-ishi/', { waitUntil: 'networkidle' }); await p.waitForSelector('.kp', { timeout: 15000 }).catch(() => {});
  step('progress counted', (await p.locator('.kp.dk b').textContent().catch(() => '')).trim() !== '0%');
  await p.goto(BASE + 'nihul/', { waitUntil: 'networkidle' }); await sleep(2500);
  step('admin panel blocked for students', await p.locator('text=אין הרשאה').count() > 0); await shot(p, '08-admin-blocked', false);

  // phone
  const m = await ctx(true); const q = await m.newPage(); watch(q, 'mobile');
  await q.goto(BASE, { waitUntil: 'networkidle' }); await shot(q, '09-home-mobile');
  step('no sideways scroll on phone', await q.evaluate(() => document.documentElement.scrollWidth <= 392));
  await q.goto(BASE + 'knisa/?m=login', { waitUntil: 'networkidle' }); await q.fill('#le', email); await q.fill('#lp', pass); await q.click('#bLog');
  await q.waitForURL(/ezor-ishi/, { timeout: 20000 }).then(() => step('login on phone', true)).catch(() => step('login on phone', false));
  await q.waitForSelector('.mods2', { timeout: 15000 }).catch(() => {}); await shot(q, '10-member-mobile');

  // admin: wait up to 4 minutes for this test account to be made an admin from outside, then open every section
  let admin = false;
  for (let i = 0; i < 24 && !admin; i++) { await p.goto(BASE + 'nihul/?t=' + i, { waitUntil: 'networkidle' }); await sleep(2500); admin = await p.locator('#snav button').count() > 0; if (!admin) await sleep(7500); }
  step('admin panel opens for an admin', admin);
  if (admin) {
    for (const k of ['overview', 'students', 'orders', 'articles', 'content', 'assets', 'plans', 'settings', 'log']) {
      await p.click(`#snav button[data-k=${k}]`); await sleep(2500); await shot(p, '11-admin-' + k);
      step('admin section ' + k, await p.locator('#pane .card, #pane .tbl2, #pane .empty').count() > 0);
    }
    await p.click('#snav button[data-k=students]'); await sleep(2000);
    await p.locator('[data-u]').first().click().catch(() => {}); await sleep(1500); await shot(p, '12-admin-student-modal', false);
    await p.keyboard.press('Escape');
    await p.click('#snav button[data-k=articles]'); await sleep(1500); await p.click('#na').catch(() => {}); await sleep(1000);
    await p.fill('#ab', '## בדיקה\nטקסט **מודגש** ורשימה:\n- אחת\n- שתיים').catch(() => {}); await sleep(500); await shot(p, '13-admin-article-editor', false);
  }
} catch { step('crash', false); }
R.finished = new Date().toISOString();
R.passed = R.steps.filter((x) => x.ok).length; R.failed = R.steps.length - R.passed;
fs.writeFileSync('out/results.json', JSON.stringify(R, null, 2));
await browser.close();
