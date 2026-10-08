// detailed summary of PageSpeed Insights / Lighthouse reports: every audit that is not perfect, with its items
import fs from 'node:fs';
const out = {};
for (const f of process.argv.slice(2)) {
  let r; try { r = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { out[f] = { err: String(e) }; continue; }
  if (r.lighthouseResult) { out[f + ':field'] = r.loadingExperience && r.loadingExperience.metrics; r = r.lighthouseResult; }
  if (!r.categories) { out[f] = { err: JSON.stringify(r).slice(0, 400) }; continue; }
  const cat = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, v.score === null ? null : Math.round(v.score * 100)]));
  const m = ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'].map((k) => [k, r.audits[k] && r.audits[k].displayValue]);
  const bad = Object.values(r.audits).filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' || /layout-shift|lcp|unsized|reflow|network-dependency|render-block|cache|image-delivery|document-latency|font/.test(a.id))
    .map((a) => {
      const flat = [];
      const walk = (x, d) => { if (!x || d > 6 || flat.length > 40) return; if (Array.isArray(x)) return x.forEach((y) => walk(y, d + 1)); if (typeof x === 'object') {
        if (x.node) flat.push('NODE ' + (x.node.selector || '') + ' | ' + (x.node.snippet || '').slice(0, 220) + (x.score ? ' | score ' + x.score : ''));
        else if (x.url) flat.push('URL ' + x.url + ' | ' + ['wastedMs', 'wastedBytes', 'totalBytes', 'transferSize', 'cacheLifetimeMs', 'duration', 'score'].filter((k) => x[k] != null).map((k) => k + '=' + Math.round(x[k] * 1000) / 1000).join(' '));
        else if (x.label && x.value !== undefined && typeof x.value !== 'object') flat.push('KV ' + x.label + ' = ' + x.value);
        for (const k of Object.keys(x)) if (k !== 'node' && typeof x[k] === 'object') walk(x[k], d + 1);
      } };
      walk(a.details, 0);
      return { id: a.id, score: a.score, val: a.displayValue || '', items: flat.slice(0, 40) };
    });
  out[f] = { cat, m, bad };
}
fs.mkdirSync('diag-results/lh', { recursive: true });
fs.writeFileSync('diag-results/lh/detail.json', JSON.stringify(out, null, 1));
