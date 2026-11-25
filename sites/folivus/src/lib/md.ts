// Markdown to HTML for guides, articles and court pages, with:
// - internal link placeholders from the writers: [[area:slug]], [[tool:slug]], [[article:slug]], [[court:slug]], optional |text
// - ids on H2/H3 for the table of contents
// - external links open in a new tab with rel="noopener"; tables wrapped for horizontal scroll on phones
import { Marked } from 'marked';
import { areas, tools, articles, courts } from './data';
import { P, u } from '../config/routes';

export type Toc = { id: string; text: string; level: number }[];

function resolve(kind: string, slug: string): { href: string; text: string } | null {
  if (kind === 'area') { const a = areas().find((x) => x.slug === slug || x.he === slug); return a ? { href: u(P.area(a.he)), text: a.title } : null; }
  if (kind === 'tool') { const t = tools().find((x) => x.slug === slug || x.he === slug); return t ? { href: u(P.tool(t.he)), text: t.name } : null; }
  if (kind === 'article') { const t = articles().find((x) => x.slug === slug || x.he === slug); return t ? { href: u(P.article(t.he)), text: t.title } : null; }
  if (kind === 'court') { const t = courts().find((x) => x.slug === slug || x.he === slug); return t ? { href: u(P.court(t.he)), text: t.name } : null; }
  return null;
}

export function placeholders(src: string) {
  return src.replace(/\[\[(area|tool|article|court):([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, k, s, text) => {
    const r = resolve(k, String(s).trim());
    const label = (text || r?.text || '').trim();
    return r ? `[${label}](${r.href})` : label; // unknown target: keep the words, drop the link
  });
}

export function render(src: string, opts: { dropH1?: boolean } = {}) {
  const toc: Toc = [];
  let n = 0;
  const m = new Marked({ gfm: true, breaks: false });
  m.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        if (depth === 1 && opts.dropH1 !== false) return '';
        const lvl = Math.max(2, depth);
        const id = 's' + ++n;
        const plain = text.replace(/<[^>]+>/g, '');
        if (lvl <= 3) toc.push({ id, text: plain, level: lvl });
        return `<h${lvl} id="${id}">${text}</h${lvl}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const ext = /^https?:\/\//.test(href);
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
      table(token) {
        const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('');
        const rows = token.rows.map((r) => '<tr>' + r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('') + '</tr>').join('');
        return `<div class="tbl" role="region" aria-label="טבלה" tabindex="0"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
      },
    },
  });
  const html = m.parse(placeholders(src || '')) as string;
  return { html, toc };
}

export const words = (s: string) => String(s || '').split(/\s+/).filter(Boolean).length;
export const readMinutes = (s: string) => Math.max(1, Math.round(words(s) / 200));
