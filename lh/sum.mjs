// short summary of a Lighthouse report: scores, the failing accessibility checks with the elements, and the speed items
import fs from 'node:fs';
const out = {};
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const cat = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const a11y = r.categories.accessibility.auditRefs.map((x) => r.audits[x.id]).filter((a) => a.score !== null && a.score < 1).map((a) => ({ id: a.id, title: a.title, items: (a.details && a.details.items || []).slice(0, 12).map((i) => (i.node && (i.node.selector + ' | ' + (i.node.snippet || '').slice(0, 140))) || JSON.stringify(i).slice(0, 160)) }));
  const perf = ['render-blocking-resources', 'uses-long-cache-ttl', 'unused-css-rules', 'unused-javascript', 'font-display', 'largest-contentful-paint-element', 'server-response-time', 'uses-responsive-images', 'modern-image-formats', 'bootup-time', 'third-party-summary', 'total-byte-weight']
    .map((id) => r.audits[id]).filter(Boolean).map((a) => ({ id: a.id, score: a.score, val: a.displayValue, items: (a.details && a.details.items || []).slice(0, 14).map((i) => [i.url || (i.node && i.node.selector) || i.entity || i.label || '', i.wastedMs || i.totalBytes || i.cacheLifetimeMs || i.transferSize || i.wastedBytes || ''].join(' | ').slice(0, 200)) }));
  const ins = Object.keys(r.audits).filter((k) => /insight$/.test(k)).map((k) => r.audits[k]).filter((a) => a.score !== null && a.score < 1).map((a) => ({ id: a.id, val: a.displayValue, items: JSON.stringify(a.details || {}).match(/https?:[^"\\]+|"(?:wastedMs|wastedBytes|cacheLifetimeMs|transferSize|duration)":[0-9.]+/g)?.slice(0, 40) }));
  const m = ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'].map((k) => [k, r.audits[k].displayValue]);
  out[f] = { cat, m, a11y, perf, ins };
}
fs.writeFileSync('diag-results/lh/summary.json', JSON.stringify(out, null, 1));
# rerun Thu Oct  8 15:36:05 IDT 2026
