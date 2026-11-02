// Post-build guard: fails the build if the output has em/en dashes, our own superlatives, the word "expert",
// or mentions of an unrelated brand. Hebrew has no \b, so word edges are checked by hand.
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve('dist');
const rules = [
  [/[–—]/, 'en/em dash'],
  [/(^|[^֐-׿])הכי(?=[^֐-׿]|$)/, '"הכי"'],
  [/הטוב ביותר|הטובים ביותר/, '"הטוב ביותר"'],
  [/מומח/, '"מומחה"'],
  [/דבול|dabul/i, 'brand mention'],
];
let bad = 0;
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(html|xml|txt|js|css|json)$/.test(f.name)) {
      // the preview copy lives under the repo's GitHub Pages address; that is hosting, not content
      const t = fs.readFileSync(p, 'utf8').replace(/dabullaw-glitch\.github\.io/g, '').replace(/\/dabul-office\//g, '/');
      for (const [re, name] of rules) {
        const m = t.match(re);
        if (m) { bad++; if (bad < 30) console.error(`[check] ${name} in ${path.relative(dist, p)}: ...${t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}...`); }
      }
    }
  }
}
walk(dist);
if (bad) { console.error(`[check] ${bad} problem(s)`); process.exit(1); }
console.log('[check] ok: no dashes, superlatives or forbidden words');
