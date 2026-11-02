// Post-build guard for the lawyer portal (dist/orchei-din/**; sitemap and llms.txt for dashes and brands only): fails the build on en/em dashes,
// our own superlatives, the word "expert", or any mention of the law office or of the other directory brand.
// Client review text is the client's own words, so only the dash and brand rules apply to it.
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve('dist');
const strict = [
  [/[–—]/, 'en/em dash'],
  [/דבול|dabul(?!-office)|dabullaw\.co/i, 'law office mention'],
  [/folivus|פוליבוס/i, 'other brand mention'],
];
const words = [
  [/(^|[^֐-׿])הכי(?=[^֐-׿]|$)/, '"הכי"'],
  [/הטוב ביותר|הטובים ביותר/, '"הטוב ביותר"'],
  [/מומח/, '"מומחה"'],
];
let bad = 0, files = 0;
function check(p, onlyStrict = false) {
  files++;
  // the preview copy is served from the repo's GitHub Pages address; that is hosting, not content
  const t = fs.readFileSync(p, 'utf8').replace(/dabullaw-glitch\.github\.io/g, '');
  const noReviews = t.replace(/<p class="rv-text"[^>]*>[\s\S]*?<\/p>/g, '').replace(/"reviewBody":"(?:[^"\\]|\\.)*"/g, '');
  for (const [rules, s] of onlyStrict ? [[strict, t]] : [[strict, t], [words, noReviews]]) {
    for (const [re, name] of rules) {
      const m = s.match(re);
      if (m) { bad++; if (bad < 30) console.error(`[check-portal] ${name} in ${path.relative(dist, p)}: ...${s.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}...`); }
    }
  }
}
function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.html$/.test(f.name)) check(p);
  }
}
walk(path.join(dist, 'orchei-din'));
for (const f of ['sitemap.xml', 'llms.txt']) if (fs.existsSync(path.join(dist, f))) check(path.join(dist, f), true); // the rest of the site is checked by its own writing rules
if (!fs.existsSync(path.join(dist, 'orchei-din/index.html'))) { console.error('[check-portal] orchei-din/index.html is missing'); bad++; }
if (bad) { console.error(`[check-portal] ${bad} problem(s)`); process.exit(1); }
console.log(`[check-portal] ok: ${files} files, no dashes, superlatives, forbidden words or brand mentions`);
