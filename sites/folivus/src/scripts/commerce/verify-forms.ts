// Claim and removal forms: send -> code by email -> verify. Claim on the firm's own email domain signs in at once.
import { api, setSession, say, errText } from './api';
document.querySelectorAll<HTMLFormElement>('form[data-cm-form]').forEach((form) => {
  const kind = form.dataset.cmForm!; const msg = form.querySelector<HTMLElement>('[data-msg]')!;
  const codeBox = document.querySelector<HTMLElement>(`[data-cm-code="${kind}"]`)!; let id = '';
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!form.reportValidity()) return;
    const p: Record<string, any> = {}; new FormData(form).forEach((v, k) => { p[k] = typeof v === 'string' ? v.trim() : v; });
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!; btn.disabled = true;
    const r = await api(kind === 'claim' ? 'claim_start' : 'removal', p); btn.disabled = false;
    if (r.status !== 200) return say(msg, errText(r), 'bad');
    if (!r.id) return say(msg, 'תודה. הבקשה התקבלה.', 'ok');
    id = r.id; form.classList.add('cm-hidden'); codeBox.classList.remove('cm-hidden');
  });
  codeBox.querySelector('[data-cm-check]')!.addEventListener('click', async () => {
    const m = codeBox.querySelector<HTMLElement>('[data-msg2]')!;
    const code = codeBox.querySelector<HTMLInputElement>('input')!.value;
    const r = await api(kind === 'claim' ? 'claim_verify' : 'removal_verify', { id, code });
    if (r.status !== 200) return say(m, errText(r), 'bad');
    if (kind === 'claim' && r.approved && r.session) { setSession(r.session); say(m, 'הבעלות אושרה. מעבירים אתכם לאזור המשרדים...', 'ok'); setTimeout(() => { location.href = form.dataset.portal || '../' + encodeURI('אזור-משרדים') + '/'; }, 1200); return; }
    if (kind === 'claim') return say(m, 'המייל אומת. הבקשה עוברת אימות ידני קצר, ונעדכן אתכם במייל.', 'ok');
    say(m, r.hidden ? 'האימות הצליח והפרופיל הוסתר מהאתר.' : 'האימות הצליח. הבקשה בטיפול, תוך 48 שעות לכל היותר.', 'ok');
  });
});
