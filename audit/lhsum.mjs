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
fs.mkdirSync('audit-results', { recursive: true });
fs.writeFileSync('audit-results/lighthouse.json', JSON.stringify(out, null, 1));
