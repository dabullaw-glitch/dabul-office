// Copies the writers' content (outside the repo) into content/, which the build reads.
//   node scripts/sync-content.mjs [source]   (default /home/claude/folivus-content)
// Copies areas/*.md, articles/*.md, courts/*.md, tools/*.json + tools/*.js and AREAS.json. Files written by the site
// itself (tools purchase-tax, lease-end-notice) are only replaced if the writers deliver the same slug.
// Each file is checked first: YAML/JSON must parse, no em/en dash, no "מומחה", no office mention; a failing file is
// skipped and listed, so one bad file never breaks the build.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
const SRC = process.argv[2] || '/home/claude/folivus-content';
const DST = path.resolve('content');
const bad = [/[–—]/, /מומח/, /דבול|dabul|יקיר|yakir/i, /folivus\.com/i];
let copied = 0, removed = 0; const skipped = []; const seen = new Set();
const KEEP = new Set(['tools/lease-end-notice.json', 'tools/lease-end-notice.js']);
function ok(file, text) {
  for (const re of bad) if (re.test(text)) return `forbidden text ${re}`;
  if (file.endsWith('.json')) { try { JSON.parse(text); } catch (e) { return 'bad JSON'; } }
  if (file.endsWith('.md')) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return 'no frontmatter';
    try { YAML.parse(m[1]); } catch (e) { return 'bad YAML'; }
  }
  if (file.endsWith('.js') && /\b(fetch|XMLHttpRequest|document\.cookie|localStorage|eval\(|import\()/.test(text)) return 'tool module must be pure (no network, storage or eval)';
  return '';
}
if (fs.existsSync(path.join(SRC, 'AREAS.json'))) { fs.copyFileSync(path.join(SRC, 'AREAS.json'), path.join(DST, 'AREAS.json')); copied++; }
for (const [dir, exts] of [['areas', ['.md']], ['articles', ['.md']], ['courts', ['.md']], ['tools', ['.json', '.js']]]) {
  const s = path.join(SRC, dir); if (!fs.existsSync(s)) continue;
  fs.mkdirSync(path.join(DST, dir), { recursive: true });
  for (const f of fs.readdirSync(s)) {
    if (!exts.some((e) => f.endsWith(e)) || f.startsWith('_') || f.startsWith('.')) continue;
    const text = fs.readFileSync(path.join(s, f), 'utf8');
    const why = ok(f, text);
    if (why) { skipped.push(`${dir}/${f}: ${why}`); continue; }
    fs.writeFileSync(path.join(DST, dir, f), text); copied++; seen.add(dir + '/' + f);
  }
  // mirror: files the writers removed or renamed disappear too (the site's own files stay)
  for (const f of fs.readdirSync(path.join(DST, dir))) {
    if (!seen.has(dir + '/' + f) && !KEEP.has(dir + '/' + f)) { fs.rmSync(path.join(DST, dir, f)); removed++; }
  }
}
if (removed) console.log(`[sync] removed ${removed} file(s) no longer in the source`);
console.log(`[sync] copied ${copied} file(s) from ${SRC}`);
if (skipped.length) console.log('[sync] skipped:\n  ' + skipped.join('\n  '));
