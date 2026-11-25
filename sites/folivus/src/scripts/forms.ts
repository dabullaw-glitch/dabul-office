// All site forms post to the database function fol_submit (validated, rate limited). In the preview the forms are
// not connected (data-live="0") and say so instead of sending.
const ERR: Record<string, string> = {
  name: 'נא לכתוב שם מלא.', phone: 'מספר הטלפון לא נראה תקין.', email: 'כתובת המייל לא נראית תקינה.',
  consent: 'צריך לאשר את מדיניות הפרטיות.', contact: 'נא להשאיר טלפון או מייל.', rate: 'נשלחו יותר מדי בקשות. נסו שוב בעוד שעה.',
  busy: 'יש עומס כרגע. נסו שוב בעוד כמה דקות.',
};
document.querySelectorAll<HTMLFormElement>('form[data-kind]').forEach((form) => {
  const msg = form.querySelector<HTMLElement>('[data-msg]')!;
  const show = (t: string, cls: string) => { msg.className = 'msg show ' + cls; msg.textContent = t; msg.focus?.(); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const p: Record<string, any> = {};
    new FormData(form).forEach((v, k) => { p[k] = typeof v === 'string' ? v.trim() : v; });
    form.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => { p[c.name] = c.checked; });
    if (form.dataset.live !== '1') { show('זו גרסת תצוגה: הטופס עובד, אבל עדיין לא שולח. בהשקה הבקשה תישמר ותטופל.', 'info'); return; }
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]'); if (btn) btn.disabled = true;
    try {
      const r = await fetch(form.dataset.endpoint!, { method: 'POST', headers: { 'content-type': 'application/json', apikey: form.dataset.key!, Authorization: 'Bearer ' + form.dataset.key }, body: JSON.stringify({ kind: form.dataset.kind, p }) });
      const j = await r.json();
      if (j?.ok) { form.reset(); show(form.dataset.ok || 'תודה, הבקשה התקבלה.', 'ok'); }
      else show(ERR[j?.error] || 'משהו השתבש. נסו שוב.', 'bad');
    } catch { show('אין חיבור כרגע. נסו שוב בעוד כמה דקות.', 'bad'); }
    if (btn) btn.disabled = false;
  });
});
