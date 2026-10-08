// Word count check for guides and articles: node scripts/words.mjs [slug ...]
// Counts only the body text (not the frontmatter, links' addresses or markdown signs) and flags items below the minimum for their kind.
import fs from 'node:fs';
import path from 'node:path';
const DIR = new URL('../src/content/guides/', import.meta.url).pathname;
export const MIN = { guide: 1200, pillar: 2500, article: 1000, explainer: 1000, checklist: 1000 };
const only = process.argv.slice(2);
let bad = 0;
const rows = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = fm ? fm[1] : '';
  const kind = (meta.match(/^kind:\s*(\w+)/m) || [])[1] || 'guide';
  const pillar = /^pillar:\s*true/m.test(meta);
  const body = raw.slice(fm ? fm[0].length : 0).replace(/\]\([^)]*\)/g, ']').replace(/[#*_>|`\[\]-]+/g, ' ');
  const words = body.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const min = pillar ? MIN.pillar : MIN[kind] || MIN.guide;
  return { slug: f.replace(/\.md$/, ''), kind: pillar ? 'pillar' : kind, words, min };
}).filter((r) => !only.length || only.includes(r.slug)).sort((a, b) => a.words - b.words);
for (const r of rows) { const ok = r.words >= r.min; if (!ok) bad++; console.log(`${ok ? 'OK ' : 'LOW'} ${String(r.words).padStart(5)} / ${r.min}  ${r.kind.padEnd(9)} ${r.slug}`); }
console.log(bad ? `\n${bad} item(s) below the minimum length.` : '\nAll items meet the minimum length.');
process.exitCode = bad ? 1 : 0;
