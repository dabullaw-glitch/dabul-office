// Internal links, automatically: the first time an article mentions a key term (from src/data/terms.json),
// it becomes a link to the guide that explains it. Never inside headings or existing links, never to the article itself,
// at most MAX links per article, and each target page only once.
import fs from 'node:fs';
import path from 'node:path';

const MAX = 8;
const BASE = (process.env.BASE ?? '/dabul-office/bli-hovot/').replace(/\/?$/, '/');

function loadTerms() {
  const p = path.resolve('src/data/terms.json');
  // a guide link is used only if that guide exists (and is not a draft), so there are never broken links
  const list = JSON.parse(fs.readFileSync(p, 'utf8')).filter((t) => {
    const m = /^madrich\/([^/]+)\//.exec(t.href); if (!m) return true;
    const f = path.resolve('src/content/guides', m[1] + '.md');
    return fs.existsSync(f) && !/^draft:\s*true/m.test(fs.readFileSync(f, 'utf8').slice(0, 3000));
  });
  // longer terms first, so "צו לשיקום כלכלי" wins over "שיקום כלכלי"
  return list.flatMap((t) => t.terms.map((term) => ({ term, href: t.href }))).sort((a, b) => b.term.length - a.term.length);
}

// Hebrew letters attach prefixes (ב, ל, ה, ו, מ, ש, כ). Allow up to two of them before the term, and require a word edge after it.
const HEB = 'א-ת';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function autolink() {
  const terms = loadTerms();
  return (tree, file) => {
    const self = String(file.path || file.history?.[0] || '');
    const selfSlug = path.basename(self).replace(/\.mdx?$/, '');
    const used = new Set(); let count = 0;
    const walk = (node, parent, banned) => {
      if (count >= MAX) return;
      if (node.type === 'heading' || node.type === 'link' || node.type === 'linkReference' || node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') banned = true;
      if (node.type === 'text' && !banned && parent) {
        for (const { term, href } of terms) {
          if (count >= MAX) break;
          if (used.has(href) || href.includes(`/${selfSlug}/`)) continue;
          const re = new RegExp(`(^|[^${HEB}])((?:[ובלהמשכ]{0,2})${esc(term)})(?=$|[^${HEB}])`);
          const m = re.exec(node.value);
          if (!m) continue;
          const start = m.index + m[1].length, end = start + m[2].length;
          const before = node.value.slice(0, start), word = node.value.slice(start, end), after = node.value.slice(end);
          const idx = parent.children.indexOf(node);
          const link = { type: 'link', url: BASE + href.replace(/^\//, ''), title: null, children: [{ type: 'text', value: word }] };
          const parts = [];
          if (before) parts.push({ type: 'text', value: before });
          parts.push(link);
          const rest = { type: 'text', value: after };
          if (after) parts.push(rest);
          parent.children.splice(idx, 1, ...parts);
          used.add(href); count++;
          if (after) walk(rest, parent, banned);
          return;
        }
        return;
      }
      if (node.children) for (const c of [...node.children]) walk(c, node, banned);
    };
    walk(tree, null, false);
  };
}
