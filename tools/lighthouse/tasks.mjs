// Long main-thread tasks from a Lighthouse trace (9.11.2026): for every task of 10ms or more on the page's main thread,
// the time spent per kind of work (style, layout, script by file:line, timers, events). Usage: node tasks.mjs trace.json lhr.json
import fs from 'node:fs';
const [tf, rf] = process.argv.slice(2);
const t = JSON.parse(fs.readFileSync(tf, 'utf8')); const ev = t.traceEvents || t;
const lhr = rf ? JSON.parse(fs.readFileSync(rf, 'utf8')) : null;
const nav = ev.find(e => e.name === 'navigationStart' && e.args?.data?.isLoadingMainFrame && e.args?.data?.documentLoaderURL?.startsWith('http'));
const t0 = nav.ts; const pid = nav.pid;
const thr = ev.find(e => e.pid === pid && e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const tid = thr ? thr.tid : nav.tid;
const xs = ev.filter(e => e.pid === pid && e.tid === tid && e.ph === 'X' && e.ts >= t0 && typeof e.dur === 'number').sort((a, b) => a.ts - b.ts || b.dur - a.dur);
const fcp = ev.find(e => e.name === 'firstContentfulPaint' && e.pid === pid);
const lbl = (e) => {
  const d = e.args?.data || e.args?.beginData || {};
  if (e.name === 'EvaluateScript' || e.name === 'v8.compile' || e.name === 'v8.compileModule') return e.name + ' ' + (d.url || '').replace('https://dabullaw.co.il', '').slice(0, 80) + ':' + (d.lineNumber ?? '');
  if (e.name === 'FunctionCall') return 'FunctionCall ' + (d.url || '').replace('https://dabullaw.co.il', '').slice(0, 80) + ':' + (d.lineNumber ?? '') + ' ' + (d.functionName || '');
  if (e.name === 'TimerFire' || e.name === 'EventDispatch') return e.name + ' ' + (d.type || d.timerId || '');
  if (e.name === 'ParseAuthorStyleSheet') return e.name + ' ' + (d.styleSheetUrl || '').slice(-60);
  return e.name;
};
const tasks = xs.filter(e => e.name === 'RunTask' && e.dur >= 10000);
const out = [];
for (const task of tasks) {
  const end = task.ts + task.dur;
  const kids = xs.filter(e => e !== task && e.ts >= task.ts && e.ts + e.dur <= end + 1);
  // self time per event: its duration minus its direct children
  const stack = []; const self = new Map(); const ctx = new Map();
  for (const e of kids) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) self.set(parent, (self.get(parent) ?? parent.dur) - e.dur);
    if (!self.has(e)) self.set(e, e.dur);
    // attribute to the nearest script/style/event ancestor for context
    const top = [...stack].reverse().find(s => /EvaluateScript|FunctionCall|TimerFire|EventDispatch|ParseHTML|UpdateLayoutTree|Layout|FireAnimationFrame|v8.compile/.test(s.name));
    ctx.set(e, top ? lbl(top) : '');
    stack.push(e);
  }
  const agg = new Map();
  for (const [e, s] of self) { if (s < 300) continue; const k = (/^(EvaluateScript|FunctionCall|TimerFire|EventDispatch|ParseAuthorStyleSheet|v8\.compile)/.test(e.name) ? lbl(e) : e.name + (ctx.get(e) ? ' < ' + ctx.get(e) : '')); agg.set(k, (agg.get(k) || 0) + s); }
  const ult = kids.filter(e => e.name === 'UpdateLayoutTree').map(e => [Math.round(e.dur / 1000), e.args?.elementCount]);
  const lay = kids.filter(e => e.name === 'Layout').map(e => [Math.round(e.dur / 1000), e.args?.beginData?.dirtyObjects, e.args?.beginData?.totalObjects]);
  out.push({ at: Math.round((task.ts - t0) / 1000), ms: Math.round(task.dur / 1000), top: [...agg].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, Math.round(v / 100) / 10]), styleRecalcs: ult.filter(x => x[0] >= 2).slice(0, 8), layouts: lay.filter(x => x[0] >= 2).slice(0, 8) });
}
const sum = {}; for (const e of xs) if (e.name === 'RunTask') {} 
const total = tasks.reduce((s, x) => s + x.dur, 0) / 1000;
const res = { fcp: fcp ? Math.round((fcp.ts - t0) / 1000) : null, tasksOver10ms: out.length, totalMs: Math.round(total), score: lhr ? Math.round(lhr.categories.performance.score * 100) : null, tbt: lhr?.audits['total-blocking-time']?.numericValue, longTasks: lhr?.audits['long-tasks']?.details?.items?.slice(0, 10).map(x => [x.url.replace('https://dabullaw.co.il', ''), Math.round(x.startTime), Math.round(x.duration)]), tasks: out };
console.log(JSON.stringify(res, null, 1));
