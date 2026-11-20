import { open, state } from './harness.mjs';
const out = '/tmp/hs/'; (await import('node:fs')).mkdirSync(out, { recursive: true });
const errs = {};
for (const mobile of [false, true]) {
  const h = await open({ mobile }); const p = h.page; const tag = mobile ? 'm' : 'd';
  for (const [path, name] of [['ezor-ishi/', 'member'], ['kniya/?plan=course', 'checkout']]) { await p.goto(h.base + path); await p.waitForTimeout(1500); await p.screenshot({ path: out + tag + '-' + name + '.png', fullPage: true }); }
  state.admin = true;
  await p.goto(h.base + 'nihul/'); await p.waitForTimeout(1500);
  for (const k of ['overview', 'students', 'content', 'articles', 'settings']) { await p.click(`#snav button[data-k=${k}]`); await p.waitForTimeout(900); await p.screenshot({ path: out + tag + '-admin-' + k + '.png', fullPage: !mobile }); }
  await p.click('#snav button[data-k=students]'); await p.waitForTimeout(700); await p.click('[data-u]'); await p.waitForTimeout(700); await p.screenshot({ path: out + tag + '-admin-modal.png' });
  state.admin = false;
  errs[tag] = h.errs.filter((e) => !e.includes('ERR_FAILED')); await h.close();
}
const h = await open({ session: false }); await h.page.goto(h.base + 'knisa/'); await h.page.waitForTimeout(800); await h.page.screenshot({ path: out + 'd-login.png' }); await h.close();
console.log(JSON.stringify(errs)); (await import("./harness.mjs")).srv.close();
