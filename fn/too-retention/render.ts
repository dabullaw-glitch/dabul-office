// Team of One re-engagement emails: template (too_mail_templates) + values (too_mail_log.vars) -> subject and HTML.
// The same rules run in the admin panel preview (sites/teamofone/src/lib/mailtpl.js); keep the two in step.
// {{name}} is replaced by the value. A list becomes bullet lines. A line whose value is empty is dropped, so a mail never
// shows an empty sentence. Rules for the texts: simple Hebrew, no em or en dashes, no "הכי", never "מומחה", no promises.
import { esc } from './common.ts';

// deno-lint-ignore no-explicit-any
type Any = any;
const empty = (v: Any) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

export function fill(text: string, vars: Any): string {
  return String(text || '').split('\n').map((line) => {
    const keys = [...line.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    if (keys.some((k) => empty(vars[k]))) return null;
    if (keys.length === 1 && Array.isArray(vars[keys[0]]) && line.trim() === `{{${keys[0]}}}`) return vars[keys[0]].map((x: Any) => '- ' + String(x)).join('\n');
    return line.replace(/\{\{(\w+)\}\}/g, (_m, k) => Array.isArray(vars[k]) ? vars[k].join(', ') : String(vars[k]));
  }).filter((l) => l !== null).join('\n');
}

function inline(t: string) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
export function mdToHtml(src: string): string {
  let out = '', list = false, para: string[] = [];
  const P = 'margin:0 0 12px';
  const flushP = () => { if (para.length) { out += `<p style="${P}">${inline(para.join(' '))}</p>`; para = []; } };
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

function frame(title: string, inner: string, site: string) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F4F1EA;font-family:Arial,Helvetica,sans-serif;color:#0B0B0C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden" dir="rtl">
<tr><td style="background:#0B0B0C;padding:22px 26px;text-align:right"><span style="display:inline-block;background:#D7FF3B;color:#0B0B0C;font-weight:bold;border-radius:8px;padding:4px 10px;font-size:14px">Team of One</span>
<div style="color:#F4F1EA;font-size:22px;font-weight:bold;margin-top:12px;line-height:1.3">${esc(title)}</div></td></tr>
<tr><td style="padding:24px 26px;font-size:16px;line-height:1.7;text-align:right">${inner}</td></tr>
<tr><td style="padding:16px 26px;border-top:1px solid #ECE7DC;font-size:13px;color:#6B6B6B;text-align:right">קיבלתם את המייל הזה כי אתם חברים באתר <a href="${esc(site)}" style="color:#0B0B0C">Team of One</a>. אפשר לענות למייל הזה בכל שאלה.</td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (href: string, text: string) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#0B0B0C;color:#D7FF3B;text-decoration:none;font-weight:bold;border-radius:12px;padding:13px 22px">${esc(text)}</a></p>`;

export function render(t: Any, vars: Any, site: string): { subject: string; html: string } {
  const v = { ...(vars || {}) };
  // no first name: "שלום {{first}}," becomes "שלום," instead of disappearing
  const src = v.first ? String(t.body_md || '') : String(t.body_md || '').replace(/שלום \{\{first\}\},/g, 'שלום,');
  const body = fill(src, v);
  const subject = fill(t.subject, v).split('\n')[0] || 'Team of One';
  const cta = t.cta_text && t.cta_path != null ? btn(site + String(t.cta_path).replace(/^\/+/, ''), t.cta_text) : '';
  return { subject, html: frame(subject, mdToHtml(body) + cta, site) };
}
