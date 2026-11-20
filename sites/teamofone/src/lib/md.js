// Small, safe markdown to HTML (escapes all HTML first). Used for articles and lessons, on the server and in the browser.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function inline(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|\.{1,2}\/[^\s)]*|#[^\s)]*)\)/g, (m, a, h) => `<a href="${h}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${a}</a>`);
}
export function md(src) {
  const lines = esc(src || '').replace(/\r/g, '').split('\n');
  let out = '', list = null, para = [], table = null;
  const flushP = () => { if (para.length) { out += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } };
  const flushL = () => { if (list) { out += `</${list}>`; list = null; } };
  const flushT = () => { if (table) { out += '<div class="tbl"><table><thead><tr>' + table[0].map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' + table.slice(1).map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>'; table = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    if (/^\|.*\|$/.test(l)) { flushP(); flushL(); const cells = l.slice(1, -1).split('|').map((c) => c.trim()); if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; (table = table || []).push(cells); continue; } else flushT();
    if (!l) { flushP(); flushL(); continue; }
    let m;
    if ((m = l.match(/^(#{2,4})\s+(.*)$/))) { flushP(); flushL(); const n = m[1].length; out += `<h${n}>${inline(m[2])}</h${n}>`; continue; }
    if ((m = l.match(/^&gt;\s?(.*)$/))) { flushP(); flushL(); out += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
    if ((m = l.match(/^[-*]\s+(.*)$/))) { flushP(); if (list !== 'ul') { flushL(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = l.match(/^\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { flushL(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL(); flushT();
  return out;
}
export const words = (s) => String(s || '').split(/\s+/).filter(Boolean).length;
