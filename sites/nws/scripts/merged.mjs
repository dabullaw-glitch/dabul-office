// After every build: the stories the engine merged into another one (feed.json "merged": [{id, section, into, intoSection}])
// get a 301 from their old address to the main story. The map goes into the built middleware (dist/functions/_middleware.js,
// placeholder /*MERGED*/{}/*END*/), so the redirect works for every section path and language prefix and never answers 410.
// The target of each language is that language's page of the main story when it was built, else the Hebrew page.
import fs from 'node:fs';
import path from 'node:path';
const MW = 'dist/functions/_middleware.js';
let merged = [];
try { merged = JSON.parse(fs.readFileSync('src/data/feed.json', 'utf8')).merged || []; } catch { /* no feed */ }
const LANGS = { he: '', ru: '/ru', fr: '/fr', en: '/en' };
// the built page of story n<id> under a language prefix: dist<prefix>/<section>/n<id>/index.html
function pageOf(id, pre) {
  const root = path.join('dist', pre);
  let dirs = [];
  try { dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { return ''; }
  for (const d of dirs) if (fs.existsSync(path.join(root, d.name, `n${id}`, 'index.html'))) return `${pre}/${d.name}/n${id}/`;
  return '';
}
const map = {};
for (const m of merged) {
  const id = Number(m?.id), into = Number(m?.into);
  if (!id || !into || id === into) continue;
  const he = pageOf(into, '');
  if (!he) continue;
  const to = { he };
  for (const [l, pre] of Object.entries(LANGS)) if (l !== 'he') { const p = pageOf(into, pre); if (p) to[l] = p; }
  map[id] = to;
}
// 29.10.2026 (management panel): every built story page by id, so an old address of a story whose section was changed in the
// panel (/<old section>/n<id>/) answers 301 to its current page instead of 410. Used by the middleware only when the requested
// page does not exist (placeholder /*MOVED*/{}/*END*/).
const moved = {};
for (const [l, pre] of Object.entries(LANGS)) {
  const root = path.join('dist', pre);
  let dirs = [];
  try { dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { continue; }
  for (const d of dirs) {
    let subs = [];
    try { subs = fs.readdirSync(path.join(root, d.name), { withFileTypes: true }).filter((x) => x.isDirectory() && /^n\d+$/.test(x.name)); } catch { continue; }
    for (const x of subs) if (fs.existsSync(path.join(root, d.name, x.name, 'index.html'))) (moved[x.name.slice(1)] ||= {})[l] = `${pre}/${d.name}/${x.name}/`;
  }
}
if (!fs.existsSync(MW)) { console.warn('merged: no built middleware'); process.exit(0); }
let src = fs.readFileSync(MW, 'utf8');
if (!src.includes('/*MERGED*/{}/*END*/')) { console.warn('merged: placeholder not found'); process.exit(0); }
src = src.replace('/*MERGED*/{}/*END*/', JSON.stringify(map));
if (src.includes('/*MOVED*/{}/*END*/')) src = src.replace('/*MOVED*/{}/*END*/', JSON.stringify(moved));
fs.writeFileSync(MW, src);
console.log(`merged: ${Object.keys(map).length} redirects, ${Object.keys(moved).length} story pages known`);
