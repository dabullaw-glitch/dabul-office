// Post-build guard for the lawyer portal (dist/orchei-din/**; sitemap and llms.txt for dashes and brands only): fails the build on en/em dashes,
// our own superlatives, the word "expert", or any link to the law office website (his name in the lawyer list is allowed) or of the other directory brand.
// Client review text is the client's own words, so only the dash and brand rules apply to it.
// Sponsored content (dist/tochen-memuman/**) is the one exception to "no link to the law office website": a clearly labelled paid article
// may link to its sponsor (at most 2 outbound links per article, 12.11.2026), and the Bar advertising words rules apply to the whole page.
// Everywhere else on the site (any other page) a link to the law office website fails the build.
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve('dist');
const strict = [
  [/[–—]/, 'en/em dash'],
  [/dabullaw\.co/i, 'link to the law office website'],
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
// sponsored pages: dashes, superlatives, "expert", "leading"; at most 2 outbound links per article
const spWords = [...words, [/מוביל/, '"מוביל"']];
function checkSponsored(p) {
  files++;
  const t = fs.readFileSync(p, 'utf8').replace(/dabullaw-glitch\.github\.io/g, '');
  const rel = path.relative(dist, p);
  for (const [re, name] of [strict[0], [strict[2][0], strict[2][1]], ...spWords]) {
    const m = t.match(re);
    if (m) { bad++; console.error(`[check-portal] ${name} in ${rel}: ...${t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}...`); }
  }
  // 12.11.2026: at most 2 outbound links per sponsored article (marketplace rule), regular follow links
  const ext = [...t.matchAll(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>/g)].filter((m) => !/blihovot\.co\.il|dabullaw-glitch/.test(m[1]));
  if (/tochen-memuman[\\/][^\\/]+[\\/]index\.html$/.test(rel) && ext.length > 2) { bad++; console.error(`[check-portal] ${ext.length} outbound links in ${rel} (max 2): ${ext.map((m) => m[1]).join(' ')}`); }
}
// every other page: no link to (or mention of the address of) the law office website
function walkAll(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    const r = path.relative(dist, p).split(path.sep);
    if (f.isDirectory()) { if (!['orchei-din', 'pagefind', 'og', 'assets'].includes(r[0]) || r.length > 1) walkAll(p); }
    else if (/\.html$/.test(f.name) && r[0] !== 'orchei-din') {
      if (r[0] === 'tochen-memuman') { checkSponsored(p); continue; }
      const t = fs.readFileSync(p, 'utf8').replace(/dabullaw-glitch\.github\.io/g, '');
      const m = t.match(strict[1][0]);
      if (m) { bad++; console.error(`[check-portal] link to the law office website outside tochen-memuman/ in ${r.join('/')}: ...${t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}...`); }
    }
  }
}
walkAll(dist);
for (const f of ['sitemap.xml', 'llms.txt']) if (fs.existsSync(path.join(dist, f))) check(path.join(dist, f), true); // the rest of the site is checked by its own writing rules
if (!fs.existsSync(path.join(dist, 'orchei-din/index.html'))) { console.error('[check-portal] orchei-din/index.html is missing'); bad++; }
if (bad) { console.error(`[check-portal] ${bad} problem(s)`); process.exit(1); }
console.log(`[check-portal] ok: ${files} files checked (portal, sponsored content, sitemap, llms.txt); the law office website is linked only from sponsored pages, at most 2 outbound links each`);
