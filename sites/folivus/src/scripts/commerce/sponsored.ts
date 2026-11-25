import { rpc, esc, heDate, $, mdLite } from './api';
const root = $('#sponsored'); const out = $('[data-out]', root);
const q = new URLSearchParams(location.search); const slug = q.get('a'); const test = q.get('fol_test') === '1';
(async () => {
  const list = (await rpc('fol_public_sponsored', { p_slug: slug && /^[a-z0-9-]{2,90}$/.test(slug) ? slug : null, p_test: test })) || [];
  const box = (a: any) => `<div class="cm-sponsor-box"><strong>${esc(a.label)}</strong>: המאמר נכתב בחסות ${esc(a.firm.name)}${a.test ? ' (בדיקה)' : ''}. הוא עבר עריכה לפי <a href="${esc(root.dataset.editorial!)}">מדיניות העריכה</a>, ואינו המלצה על המשרד.</div>`;
  if (slug) {
    const a = list[0]; if (!a) { out.innerHTML = '<p>המאמר לא נמצא.</p>'; return; }
    $('[data-title]').textContent = a.title; document.title = a.title;
    out.innerHTML = `${box(a)}<div class="prose">${mdLite(a.body_md || '')}</div><p class="small muted">פורסם ${esc(heDate(a.published_at))}. <a href="${esc(root.dataset.firmBase!.replace('__slug__', encodeURIComponent(a.firm.slug)))}">לעמוד המשרד</a></p>`;
  } else out.innerHTML = list.length ? list.map((a: any) => `<p><span class="badge">${esc(a.label)}</span> <a href="${esc(root.dataset.self!)}?a=${esc(a.slug)}">${esc(a.title)}</a> · ${esc(a.firm.name)}</p>`).join('') : '<p>אין כרגע תוכן ממומן.</p>';
})();
