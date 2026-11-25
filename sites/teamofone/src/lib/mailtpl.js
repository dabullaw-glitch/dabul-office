// Preview of the re-engagement emails in the admin panel. Same rules as fn/too-retention/render.ts (keep them in step):
// {{name}} is replaced by the value, a list becomes bullet lines, a line whose value is empty is dropped.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const empty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
export function fill(text, vars) {
  return String(text || '').split('\n').map((line) => {
    const keys = [...line.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    if (keys.some((k) => empty(vars[k]))) return null;
    if (keys.length === 1 && Array.isArray(vars[keys[0]]) && line.trim() === `{{${keys[0]}}}`) return vars[keys[0]].map((x) => '- ' + String(x)).join('\n');
    return line.replace(/\{\{(\w+)\}\}/g, (_m, k) => Array.isArray(vars[k]) ? vars[k].join(', ') : String(vars[k]));
  }).filter((l) => l !== null).join('\n');
}
const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
function mdToHtml(src) {
  let out = '', list = false, para = [];
  const flushP = () => { if (para.length) { out += `<p style="margin:0 0 12px">${inline(para.join(' '))}</p>`; para = []; } };
  const flushL = () => { if (list) { out += '</ul>'; list = false; } };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const l = raw.trim();
    if (!l) { flushP(); flushL(); continue; }
    const m = l.match(/^[-*]\s+(.*)$/);
    if (m) { flushP(); if (!list) { out += '<ul style="margin:0 0 12px;padding-inline-start:20px">'; list = true; } out += `<li style="margin:4px 0">${inline(m[1])}</li>`; continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL();
  return out;
}
export function renderMail(t, vars, site) {
  const v = { ...(vars || {}) };
  const src = v.first ? String(t.body_md || '') : String(t.body_md || '').replace(/שלום \{\{first\}\},/g, 'שלום,');
  const subject = fill(t.subject, v).split('\n')[0] || 'Team of One';
  const cta = t.cta_text && t.cta_path != null ? `<p style="margin:22px 0"><a href="${esc(site + String(t.cta_path).replace(/^\/+/, ''))}" style="display:inline-block;background:#0B0B0C;color:#D7FF3B;text-decoration:none;font-weight:bold;border-radius:12px;padding:13px 22px">${esc(t.cta_text)}</a></p>` : '';
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${esc(subject)}</title></head><body style="margin:0;background:#F4F1EA;font-family:Arial,Helvetica,sans-serif;color:#0B0B0C"><div style="max-width:560px;margin:16px auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:#0B0B0C;padding:20px 24px"><span style="background:#D7FF3B;color:#0B0B0C;font-weight:bold;border-radius:8px;padding:4px 10px;font-size:14px">Team of One</span><div style="color:#F4F1EA;font-size:21px;font-weight:bold;margin-top:12px">${esc(subject)}</div></div><div style="padding:22px 24px;font-size:16px;line-height:1.7">${mdToHtml(fill(src, v))}${cta}</div></div></body></html>`;
  return { subject, html };
}
// Example values for the preview of a template (when there is no real log row yet).
export const SAMPLE = { first: 'דנה', days: 9, lesson: 'טיוטת תשובה לכל פנייה', lessons: 6, path: 14, hours: 7.5, badges: 3, until: '24.12.2026', event: 'מפגש חודשי: שאלות ותשובות', drops: ['תבנית: טיוטת תשובה לפנייה ראשונה'], next: ['מדריך: דוגמה אחת טובה שווה יותר מהסבר ארוך', 'כלים וחדשות: בודקים כלי חדש ב-15 דקות'] };
