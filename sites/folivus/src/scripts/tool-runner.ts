// Runs a tool page: reads the form drawn from the tool's JSON spec, imports the tool's own pure ES module and shows the
// result. Calculators: compute(inputs) -> { outputs, steps, notes, errors }. Generators: generate(inputs) -> { title, html|text, warnings }.
// Outputs without a value (for example a figure the writers could not verify yet, kept as null in the tool's CONFIG) are
// not shown at all: the page never prints an amount the tool did not compute.
const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const ils = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ₪';
const HEAD: Record<string, string> = { heir: 'יורש', fraction: 'חלק', percent: 'אחוז', amount: 'סכום', name: 'שם', label: 'פריט', value: 'ערך', share: 'חלק', date: 'תאריך', days: 'ימים', rate: 'שיעור', tax: 'מס', month: 'חודש', payment: 'תשלום', balance: 'יתרה', principal: 'קרן', interest: 'ריבית', from: 'מ', to: 'עד', step: 'שלב', deadline: 'מועד' };
const dt = (v: string) => { const d = new Date(v); return /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(+d) ? d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) : esc(v); };
const empty = (v: any) => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v)) || (Array.isArray(v) && v.length === 0);
function fmt(v: any, f?: string): string {
  if (f === 'html') return String(v);
  if (f === 'boolean' || typeof v === 'boolean') return v ? 'כן' : 'לא';
  if (f === 'date') return dt(String(v));
  if (f === 'list' || (Array.isArray(v) && f !== 'table')) return '<ul>' + ([] as any[]).concat(v).map((x) => `<li>${typeof x === 'object' && x ? esc(x.label ?? x.text ?? JSON.stringify(x)) : esc(x)}</li>`).join('') + '</ul>';
  if (f === 'table') return table(v);
  if (typeof v === 'object' && v) return esc(v.label ?? v.text ?? JSON.stringify(v));
  if (typeof v !== 'number') return esc(v);
  if (f === 'currency' || f === 'money') return ils(Math.round(v * 100) / 100);
  if (f === 'percent') return v.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + '%';
  if (f === 'days') return v.toLocaleString('he-IL') + ' ימים';
  return v.toLocaleString('he-IL', { maximumFractionDigits: 2 });
}
function table(v: any) {
  const t = Array.isArray(v)
    ? (v.length && typeof v[0] === 'object' && !Array.isArray(v[0])
      ? { head: Object.keys(v[0]).map((k) => HEAD[k] || k), rows: v.map((r: any) => Object.entries(r).map(([k, x]) => (k === 'amount' && typeof x === 'number' ? ils(x) : typeof x === 'number' ? fmt(x) : esc(x ?? '')))) }
      : { head: [], rows: v.map((r: any) => ([] as any[]).concat(r).map((x) => esc(x))) })
    : { head: (v.head || []).map(esc), rows: (v.rows || []).map((r: any[]) => r.map((x) => (typeof x === 'number' ? fmt(x) : esc(x)))) };
  return `<div style="overflow-x:auto" tabindex="0" role="region" aria-label="טבלה"><table>${t.head.length ? `<thead><tr>${t.head.map((x: string) => `<th scope="col">${x}</th>`).join('')}</tr></thead>` : ''}<tbody>${t.rows.map((r: string[]) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderCalc(res: any, outputs: any[]) {
  if (typeof res !== 'object' || !res) return `<p>${esc(res)}</p>`;
  const vals = res.outputs && typeof res.outputs === 'object' ? res.outputs : res;
  const has = (o: any) => o.id in vals && !empty(vals[o.id]);
  const prim = outputs.find((o) => o.primary && has(o)) || outputs.find((o) => ['currency', 'money'].includes(o.format) && typeof vals[o.id] === 'number') || null;
  let h = '';
  if (prim) h += `<p class="r-k">${esc(prim.label)}${res.label ? ' · ' + esc(res.label) : ''}</p><p class="big">${fmt(vals[prim.id], prim.format)}</p>`;
  else {
    // no amount to show: lead with the eligibility answer (text or yes/no), which is what the tool can say for sure
    const el = outputs.find((o) => has(o) && (o.format === 'text' || o.format === 'boolean'));
    h += `<p class="r-k">התוצאה</p>` + (el ? `<p class="big" style="font-size:var(--fs-28)">${esc(el.label)}: ${fmt(vals[el.id], el.format)}</p>` : '');
  }
  const pool = outputs.length ? outputs.filter((o) => o !== prim && has(o)) : Object.keys(vals).filter((k) => !['label', 'table', 'notes', 'steps'].includes(k) && !empty(vals[k])).map((k) => ({ id: k, label: k }));
  const simple = pool.filter((o: any) => !['table', 'list', 'html'].includes(o.format) && !Array.isArray(vals[o.id]) && !(typeof vals[o.id] === 'object'));
  const complex = pool.filter((o: any) => !simple.includes(o));
  if (simple.length) h += `<div class="kv">${simple.map((o: any) => `<div><span>${esc(o.label)}</span><b>${fmt(vals[o.id], o.format)}</b></div>`).join('')}</div>`;
  for (const o of complex as any[]) h += `<h3 style="font-size:var(--fs-16);margin:var(--sp-18) 0 var(--sp-6)">${esc(o.label)}</h3>${fmt(vals[o.id], o.format === 'html' ? 'html' : o.format || (Array.isArray(vals[o.id]) && typeof vals[o.id][0] === 'object' ? 'table' : 'list'))}`;
  const missing = outputs.filter((o) => ['currency', 'money', 'number'].includes(o.format) && o.id in vals && empty(vals[o.id]));
  if (missing.length) h += `<p class="elig"><span>לא מוצג סכום עבור: ${missing.map((o) => esc(o.label)).join(', ')}. הנתון הרשמי עוד לא אומת אצלנו, ולכן הכלי מציג רק את הזכאות.</span></p>`;
  if (res.table) h += table(res.table);
  const steps = ([] as any[]).concat(res.steps || []).filter(Boolean);
  if (steps.length) h += `<details><summary>פירוט החישוב</summary><ol>${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>`;
  const notes = ([] as any[]).concat(res.notes || res.note || res.warnings || []).filter(Boolean);
  if (notes.length) h += `<p class="note"><span>${notes.map(esc).join('<br>')}</span></p>`;
  return h;
}
const docText = (res: any) => (typeof res === 'string' ? res : res?.text ?? res?.body ?? res?.document ?? '');
function renderDoc(res: any) {
  const body = res?.html ? `<div class="doc-out doc-html" data-doc>${res.html}</div>` : `<div class="doc-out" data-doc>${esc(docText(res))}</div>`;
  const notes = ([] as any[]).concat(res?.warnings || res?.notes || []).filter(Boolean);
  return `<p class="r-k">המסמך שלכם</p><h2 style="font-size:var(--fs-20);margin:var(--sp-4) 0">${esc(res?.title || 'טיוטת מסמך')}</h2><p class="sub">זו טיוטה. קראו אותה, תקנו לפי הצורך ושמרו עותק.</p>${body}
    <div class="tool-acts"><button class="btn btn-w" type="button" data-copy>העתקה</button><button class="btn btn-o" type="button" data-dl>${res?.html ? 'הורדה כקובץ Word' : 'הורדה כקובץ טקסט'}</button><button class="btn btn-o" type="button" data-print>הדפסה או PDF</button></div>
    ${notes.length ? `<p class="note"><span><b>לבדיקה לפני שימוש:</b><br>${notes.map(esc).join('<br>')}</span></p>` : ''}`;
}
function wire(out: HTMLElement, res: any) {
  const doc = out.querySelector<HTMLElement>('[data-doc]');
  const html = res?.html ? String(res.html) : '';
  const page = (inner: string) => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${esc(res?.title || '')}</title><style>body{font:15px/1.8 Arial,sans-serif;direction:rtl;padding:40px;max-width:760px;margin:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}</style></head><body>${inner}</body></html>`;
  out.querySelector('[data-copy]')?.addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(doc?.innerText || docText(res)); (e.target as HTMLElement).textContent = 'הועתק'; } catch { (e.target as HTMLElement).textContent = 'לא הצלחנו להעתיק'; } });
  out.querySelector('[data-dl]')?.addEventListener('click', () => {
    const blob = html ? new Blob(['﻿' + page(html)], { type: 'application/msword' }) : new Blob(['﻿' + docText(res)], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (res?.title || 'document') + (html ? '.doc' : '.txt'); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  out.querySelector('[data-print]')?.addEventListener('click', () => {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(page(html || `<div style="white-space:pre-wrap">${esc(docText(res))}</div>`)); w.document.close(); w.focus(); w.print();
  });
}
document.querySelectorAll<HTMLElement>('[data-tool]').forEach((root) => {
  const spec = JSON.parse(root.dataset.tool!);
  const form = root.querySelector('form')!;
  const out = root.querySelector<HTMLElement>('[data-out]')!;
  const err = root.querySelector<HTMLElement>('[data-err]')!;
  const fail = (m: string) => { err.textContent = m; err.classList.add('show'); };
  form.querySelectorAll<HTMLInputElement>('input[data-num]').forEach((el) => el.addEventListener('blur', () => {
    const n = Number(el.value.replace(/[^\d.\-]/g, '')); if (el.value && !isNaN(n)) el.value = n.toLocaleString('he-IL', { maximumFractionDigits: 4 });
  }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.classList.remove('show');
    if (!spec.module) return;
    const vals: Record<string, any> = {}; const missing: string[] = [];
    for (const i of spec.inputs) {
      const els = form.querySelectorAll<HTMLInputElement>(`[name="${i.id}"]`);
      let v: any;
      if (i.type === 'radio') v = [...els].find((x) => x.checked)?.value ?? '';
      else if (i.type === 'checkbox' || i.type === 'boolean') v = !!els[0]?.checked;
      else v = (els[0] as any)?.value ?? '';
      if (['number', 'currency', 'money', 'percent', 'integer'].includes(i.type) && v !== '') v = Number(String(v).replace(/[^\d.\-]/g, ''));
      if (i.required && (v === '' || v == null || (typeof v === 'number' && isNaN(v)))) missing.push(i.label);
      vals[i.id] = v;
    }
    if (missing.length) return fail('חסר: ' + missing.join(', '));
    let res: any;
    try {
      const m = await import(/* @vite-ignore */ spec.module);
      res = spec.type === 'generator' ? (m.generate || m.default)(vals) : (m.compute || m.default)(vals);
      if (res && typeof res.then === 'function') res = await res;
    } catch (x) { console.error(x); return fail('משהו השתבש בחישוב. בדקו את הנתונים ונסו שוב.'); }
    const errs = ([] as any[]).concat(res?.errors || res?.error || []).filter(Boolean);
    if (errs.length) return fail(errs.join(' '));
    out.innerHTML = spec.type === 'generator' ? renderDoc(res) : renderCalc(res, spec.outputs);
    out.classList.add('show'); out.focus({ preventScroll: true }); out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    wire(out, res);
  });
});
// prefill from the home check: ?f_<input id>=value ... &run=1 (values stay in the address bar of this browser only)
{
  const qs = new URLSearchParams(location.search);
  const form = document.querySelector<HTMLFormElement>('[data-tool] form');
  let any = false;
  if (form) qs.forEach((v, k) => {
    if (!k.startsWith('f_')) return; const id = k.slice(2);
    const els = Array.from(form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(id)}"]`)); if (!els.length) return; any = true;
    const el = els[0];
    if (el.type === 'radio') els.forEach((r) => (r.checked = r.value === v));
    else if (el.type === 'checkbox') el.checked = v === 'true' || v === '1';
    else if (el.dataset.num && v !== '' && !isNaN(Number(v))) el.value = Number(v).toLocaleString('he-IL', { maximumFractionDigits: 4 });
    else el.value = v;
  });
  if (form && any && qs.get('run') === '1') form.requestSubmit();
}
