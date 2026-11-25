// Review form: send -> code by email -> verify. The server decides if it is published at once or held for a check.
import { api, rest, $, say, errText } from './api';
const root = $('#review'); const top = $('[data-top]', root);
const firm = new URLSearchParams(location.search).get('firm') || '';
const invite = new URLSearchParams(location.hash.slice(1)).get('invite') || '';
let id = '';
($('[data-terms-link]', root) as HTMLAnchorElement).href = root.dataset.terms!;
($('[data-method-link]', root) as HTMLAnchorElement).href = root.dataset.method!;
(async () => {
  if (!/^[a-z0-9-]{2,80}$/.test(firm)) { say(top, 'לא נבחר משרד. נכנסים לטופס מעמוד המשרד.', 'bad'); $('[data-form]', root).classList.add('cm-hidden'); return; }
  const j = await rest(`fol_firms?slug=eq.${firm}&select=name`);
  if (Array.isArray(j) && j[0]) document.querySelectorAll('[data-firm-name]').forEach((e) => { e.textContent = j[0].name; });
  if (invite) say(top, 'המשרד הזמין אתכם לכתוב חוות דעת. החוות דעת תסומן "הוזמן על ידי המשרד".', 'info');
})();
$('[data-send]', root).addEventListener('click', async () => {
  const v = (s: string) => ($(s) as HTMLInputElement).value;
  const rating = (document.querySelector('input[name=rating]:checked') as HTMLInputElement | null)?.value;
  const r = await api('review_start', { firm, invite: invite || undefined, rating: Number(rating), title: v('#r-title'), body: v('#r-body'), name: v('#r-name'), email: v('#r-mail'), consent: ($('#r-ok') as HTMLInputElement).checked, website_hp: v('#r-hp') });
  if (r.status !== 200) return say(top, errText(r), 'bad');
  id = r.id; $('[data-form]', root).classList.add('cm-hidden'); $('[data-verify]', root).classList.remove('cm-hidden'); top.className = 'msg';
});
$('[data-check]', root).addEventListener('click', async () => {
  const r = await api('review_verify', { id, code: ($('#r-code') as HTMLInputElement).value });
  if (r.status !== 200) return say(top, errText(r), 'bad');
  $('[data-verify]', root).classList.add('cm-hidden');
  say(top, r.state === 'published' ? 'תודה. חוות הדעת אומתה ותופיע בעמוד המשרד בעדכון הקרוב.' : 'תודה. חוות הדעת אומתה ועוברת בדיקה קצרה לפני פרסום.', 'ok');
});
