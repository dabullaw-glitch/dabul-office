// Step-by-step helper for official requests (consolidation, payment order, objection...).
// Everything stays in the browser: answers are kept in localStorage on this device only, and the result
// (a field-by-field summary, a documents checklist and a PDF) is generated locally.
import type { Block } from './hebrewPdf';

export type Field = {
  id: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checks' | 'rows';
  help?: string; options?: string[]; placeholder?: string; req?: boolean; half?: boolean;
  cols?: { id: string; label: string; type: 'text' | 'number' | 'select'; options?: string[] }[];
  showIf?: (v: Vals) => boolean;
};
export type Step = { title: string; intro?: string; fields: Field[] };
export type Result = { verdict?: { tone: 'ok' | 'warn' | 'info'; title: string; text: string }; blocks: Block[] };
export type Vals = Record<string, any>;
export type Helper = { id: string; title: string; formName: string; steps: Step[]; result: (v: Vals) => Result };

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
export const num = (x: unknown) => { const n = parseFloat(String(x ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
export const ils = (x: number) => `${nf.format(Math.round(x))} ₪`;
export const fmtDate = (d: Date) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
export const addDays = (iso: string, days: number) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + days); return d; };

export function blocksToHtml(blocks: Block[]) {
  return blocks.map((b) => {
    if ('gap' in b) return '';
    if ('h' in b) return `<h3 class="bq-h">${esc(b.h)}</h3>`;
    if ('h2' in b) return `<h4 class="bq-h2">${esc(b.h2)}</h4>`;
    if ('p' in b) return `<p${b.muted ? ' class="muted"' : ''}>${esc(b.p).replace(/\n/g, '<br>')}</p>`;
    if ('box' in b) return `<div class="bq-box">${esc(b.box).replace(/\n/g, '<br>')}</div>`;
    if ('kv' in b) return `<dl class="bq-kv">${b.kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v || '-')}</dd>`).join('')}</dl>`;
    if ('list' in b) return `<${b.check ? 'ul class="bq-check"' : 'ol'}>${b.list.map((x) => `<li>${esc(x)}</li>`).join('')}</${b.check ? 'ul' : 'ol'}>`;
    if ('table' in b) return `<div class="tbl"><table><thead><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return '';
  }).join('');
}

function fieldHtml(f: Field, v: Vals) {
  const val = v[f.id];
  const id = `bq-${f.id}`;
  const help = f.help ? `<span class="bq-help">${esc(f.help)}</span>` : '';
  if (f.type === 'checks') {
    const sel: string[] = Array.isArray(val) ? val : [];
    return `<fieldset class="bq-f"><legend>${esc(f.label)}</legend>${help}${f.options!.map((o, i) => `<label class="bq-opt"><input type="checkbox" name="${f.id}" value="${esc(o)}" ${sel.includes(o) ? 'checked' : ''} id="${id}-${i}"> ${esc(o)}</label>`).join('')}</fieldset>`;
  }
  if (f.type === 'rows') {
    const rows: Vals[] = Array.isArray(val) && val.length ? val : [{}];
    return `<fieldset class="bq-f bq-rows" data-rows="${f.id}"><legend>${esc(f.label)}</legend>${help}
      <div class="bq-rowlist">${rows.map((r, i) => `<div class="bq-row" data-i="${i}">${f.cols!.map((c) => c.type === 'select'
        ? `<label><span>${esc(c.label)}</span><select data-col="${c.id}">${c.options!.map((o) => `<option ${r[c.id] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`
        : `<label><span>${esc(c.label)}</span><input data-col="${c.id}" ${c.type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(r[c.id] ?? '')}"></label>`).join('')}
        <button type="button" class="bq-del" data-del="${i}" aria-label="הסרת השורה">✕</button></div>`).join('')}</div>
      <button type="button" class="bq-add" data-add="${f.id}">+ הוספת שורה</button></fieldset>`;
  }
  let input = '';
  if (f.type === 'select') input = `<select id="${id}" data-f="${f.id}">${f.options!.map((o) => `<option ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.type === 'textarea') input = `<textarea id="${id}" data-f="${f.id}" rows="4" placeholder="${esc(f.placeholder || '')}">${esc(val ?? '')}</textarea>`;
  else input = `<input id="${id}" data-f="${f.id}" type="${f.type === 'date' ? 'date' : 'text'}" ${f.type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(val ?? '')}" placeholder="${esc(f.placeholder || '')}">`;
  return `<div class="bq-f${f.half ? ' half' : ''}"><label for="${id}">${esc(f.label)}${f.req ? ' <b aria-hidden="true">*</b>' : ''}</label>${help}${input}</div>`;
}

export function mount(root: HTMLElement, h: Helper, onPdf: (r: Result) => void, onCopy: (r: Result) => void) {
  const KEY = 'bq-' + h.id;
  let v: Vals = {}; try { v = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  let step = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const total = h.steps.length;

  function collect() {
    root.querySelectorAll<HTMLInputElement>('[data-f]').forEach((el) => { v[el.dataset.f!] = el.value; });
    root.querySelectorAll<HTMLFieldSetElement>('fieldset.bq-f:not(.bq-rows)').forEach((fs) => {
      const name = fs.querySelector<HTMLInputElement>('input[type=checkbox]')?.name; if (!name) return;
      v[name] = [...fs.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')].map((x) => x.value);
    });
    root.querySelectorAll<HTMLElement>('[data-rows]').forEach((fs) => {
      v[fs.dataset.rows!] = [...fs.querySelectorAll<HTMLElement>('.bq-row')].map((row) => {
        const o: Vals = {}; row.querySelectorAll<HTMLInputElement>('[data-col]').forEach((el) => { o[el.dataset.col!] = el.value; }); return o;
      });
    });
    save();
  }

  function draw() {
    if (step >= total) return drawResult();
    const s = h.steps[step];
    root.innerHTML = `<div class="bq-prog" aria-hidden="true"><span style="width:${Math.round(((step + 1) / (total + 1)) * 100)}%"></span></div>
      <p class="bq-stepno">שלב ${step + 1} מתוך ${total + 1}</p>
      <h2 class="bq-title" tabindex="-1">${esc(s.title)}</h2>${s.intro ? `<p class="bq-intro">${esc(s.intro)}</p>` : ''}
      <div class="bq-fields">${s.fields.filter((f) => !f.showIf || f.showIf(v)).map((f) => fieldHtml(f, v)).join('')}</div>
      <p class="bq-err" role="alert"></p>
      <div class="bq-nav">${step > 0 ? '<button type="button" class="btn btn-ghost" data-nav="back">חזרה</button>' : '<span></span>'}<button type="button" class="btn btn-teal" data-nav="next">${step === total - 1 ? 'לתוצאה ולמסמך' : 'המשך'}</button></div>`;
    root.querySelector<HTMLElement>('.bq-title')?.focus({ preventScroll: true });
  }

  function drawResult() {
    const r = h.result(v);
    root.innerHTML = `<div class="bq-prog" aria-hidden="true"><span style="width:100%"></span></div>
      <p class="bq-stepno">שלב ${total + 1} מתוך ${total + 1}</p><h2 class="bq-title" tabindex="-1">ההכנה שלכם ל${esc(h.formName)}</h2>
      ${r.verdict ? `<div class="bq-verdict ${r.verdict.tone}"><b>${esc(r.verdict.title)}</b><p>${esc(r.verdict.text)}</p></div>` : ''}
      <div class="bq-actions"><button type="button" class="btn btn-sun" data-act="pdf">הורדת PDF</button><button type="button" class="btn btn-ghost" data-act="copy">העתקת הטקסט</button><button type="button" class="btn btn-ghost" data-nav="back">חזרה לעריכה</button></div>
      <p class="bq-msg" role="status" aria-live="polite"></p>
      <div class="bq-out prose">${blocksToHtml(r.blocks)}</div>
      <p class="bq-reset"><button type="button" class="lnk" data-act="reset">ניקוי כל הנתונים מהמכשיר</button></p>`;
    root.querySelector<HTMLElement>('.bq-title')?.focus({ preventScroll: true });
    (window as any).dataLayer?.push({ event: 'bakasha_result', helper: h.id });
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const add = t.closest<HTMLElement>('[data-add]'); if (add) { collect(); (v[add.dataset.add!] ||= []).push({}); save(); draw(); return; }
    const del = t.closest<HTMLElement>('[data-del]');
    if (del) { collect(); const fs = del.closest<HTMLElement>('[data-rows]')!; const arr: Vals[] = v[fs.dataset.rows!] || []; arr.splice(+del.dataset.del!, 1); v[fs.dataset.rows!] = arr; save(); draw(); return; }
    const nav = t.closest<HTMLElement>('[data-nav]');
    if (nav) {
      if (step < total) collect();
      if (nav.dataset.nav === 'next') {
        const missing = h.steps[step].fields.filter((f) => f.req && (!f.showIf || f.showIf(v)) && !String(v[f.id] ?? '').trim());
        if (missing.length) { root.querySelector('.bq-err')!.textContent = `חסר: ${missing.map((f) => f.label).join(', ')}`; return; }
        step++;
      } else step = Math.max(0, step - 1);
      draw(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    const act = t.closest<HTMLElement>('[data-act]');
    if (act) {
      const m = root.querySelector('.bq-msg');
      if (act.dataset.act === 'pdf') { if (m) m.textContent = 'מכין את הקובץ...'; onPdf(h.result(v)); if (m) setTimeout(() => (m.textContent = 'הקובץ נוצר.'), 1200); }
      if (act.dataset.act === 'copy') { onCopy(h.result(v)); if (m) m.textContent = 'הטקסט הועתק.'; }
      if (act.dataset.act === 'reset') { v = {}; save(); try { localStorage.removeItem(KEY); } catch {} step = 0; draw(); }
    }
  });
  root.addEventListener('change', (e) => { if ((e.target as HTMLElement).matches('select[data-f], input[type=checkbox]')) { collect(); const before = root.querySelectorAll('.bq-f').length; draw(); if (root.querySelectorAll('.bq-f').length === before) return; } });
  draw();
}
