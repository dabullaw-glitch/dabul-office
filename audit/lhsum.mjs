// Summarise Lighthouse JSON files into audit-results/lighthouse.json (scores, core metrics, top opportunities).
import fs from 'node:fs';
const out = {};
for (const f of fs.readdirSync('lh').filter((x) => x.endsWith('.json'))) {
  try {
    const j = JSON.parse(fs.readFileSync('lh/' + f, 'utf8'));
    const a = j.audits || {};
    const m = (k) => a[k] ? { v: a[k].displayValue, score: a[k].score } : null;
    out[f.replace('.json', '')] = {
      scores: Object.fromEntries(Object.entries(j.categories || {}).map(([k, v]) => [k, Math.round((v.score || 0) * 100)])),
      fcp: m('first-contentful-paint'), lcp: m('largest-contentful-paint'), tbt: m('total-blocking-time'), cls: m('cumulative-layout-shift'), si: m('speed-index'),
      weight: m('total-byte-weight'), dom: m('dom-size'), unusedJs: m('unused-javascript'), unusedCss: m('unused-css-rules'), renderBlocking: m('render-blocking-resources'),
      lcpElement: (a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || '').slice(0, 200),
      opportunities: Object.values(a).filter((x) => x.details && x.details.type === 'opportunity' && x.score !== null && x.score < 0.9).sort((p, q) => (q.details.overallSavingsMs || 0) - (p.details.overallSavingsMs || 0)).slice(0, 8).map((x) => ({ id: x.id, title: x.title, ms: Math.round(x.details.overallSavingsMs || 0), kb: Math.round((x.details.overallSavingsBytes || 0) / 1024) })),
      a11yFails: Object.values(a).filter((x) => x.score === 0 && j.categories?.accessibility?.auditRefs?.some((r) => r.id === x.id)).map((x) => x.title).slice(0, 12),
      seoFails: Object.values(a).filter((x) => x.score === 0 && j.categories?.seo?.auditRefs?.some((r) => r.id === x.id)).map((x) => x.title).slice(0, 12),
      bpFails: Object.values(a).filter((x) => x.score === 0 && j.categories?.['best-practices']?.auditRefs?.some((r) => r.id === x.id)).map((x) => x.title).slice(0, 12),
    };
  } catch (e) { out[f] = { error: String(e).slice(0, 200) }; }
}
// detail dump: which files block, which lack caching, what shifts, which nodes fail accessibility
const det = {};
for (const f of fs.readdirSync('lh').filter((x) => x.endsWith('.json'))) {
  try {
    const j = JSON.parse(fs.readFileSync('lh/' + f, 'utf8')); const a = j.audits || {}; const d = {};
    const pick = (it) => { const o = {}; for (const [k, v] of Object.entries(it)) { if (v && typeof v === 'object' && v.type === 'node') o[k] = (v.selector || '') + ' :: ' + (v.snippet || '').slice(0, 160); else if (typeof v !== 'object') o[k] = typeof v === 'string' ? v.slice(0, 200) : v; } return o; };
    for (const id of ['render-blocking-resources', 'render-blocking-insight', 'uses-long-cache-ttl', 'cache-insight', 'layout-shifts', 'layout-shift-elements', 'cls-culprits-insight', 'largest-contentful-paint-element', 'lcp-discovery-insight', 'prioritize-lcp-image', 'lcp-phases-insight', 'font-display', 'font-display-insight', 'network-dependency-tree-insight', 'unused-javascript', 'third-party-summary', 'bootup-time']) {
      const x = a[id]; if (!x) continue;
      const items = (x.details?.items || []).flatMap((it) => it.items && Array.isArray(it.items) ? it.items : [it]).slice(0, 15).map(pick);
      d[id] = { score: x.score, display: x.displayValue || '', items };
    }
    const fails = {};
    for (const r of j.categories?.accessibility?.auditRefs || []) { const x = a[r.id]; if (x && x.score === 0) fails[r.id] = (x.details?.items || []).slice(0, 8).map((it) => it.node ? (it.node.selector || '') + ' :: ' + (it.node.snippet || '').slice(0, 180) : JSON.stringify(it).slice(0, 180)); }
    d.a11y = fails;
    det[f.replace('.json', '')] = d;
  } catch (e) { det[f] = { error: String(e).slice(0, 200) }; }
}
fs.mkdirSync('audit-results', { recursive: true });
fs.writeFileSync('audit-results/lh-details.json', JSON.stringify(det, null, 1));
fs.writeFileSync('audit-results/lighthouse.json', JSON.stringify(out, null, 1));
// run speed-details 20261008
