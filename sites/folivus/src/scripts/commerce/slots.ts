import { rpc, esc } from './api';
const PLAN: Record<string, string> = { court: 'court-page', provider: 'service-provider', tool: 'tool-sponsor' };
const test = new URLSearchParams(location.search).get('fol_test') === '1';
document.querySelectorAll<HTMLElement>('[data-slots-kind]').forEach(async (el) => {
  const d = el.dataset;
  const list = (await rpc('fol_public_slots', { p_kind: d.slotsKind, p_target: d.target || null, p_area: d.area || null, p_city: d.city || null, p_test: test })) || [];
  const href = (s: string) => d.firmBase!.replace('__slug__', encodeURIComponent(s));
  const items = list.map((x: any) => x.firm
    ? `<div class="cm-slot"><span class="cm-label">${esc(x.label)}${x.test ? ' (בדיקה)' : ''}</span><strong><a href="${esc(href(x.firm.slug))}">${esc(x.firm.name)}</a></strong>${x.firm.phone ? `<a href="tel:${esc(x.firm.phone)}">${esc(x.firm.phone)}</a>` : ''}</div>`
    : `<div class="cm-slot"><span class="cm-label">${esc(x.label)}${x.test ? ' (בדיקה)' : ''}</span><strong>${esc(x.ad.name)}</strong><span class="small muted">${esc(x.ad.category)}${x.ad.text ? ' · ' + esc(x.ad.text) : ''}</span><br>${x.ad.phone ? `<a href="tel:${esc(x.ad.phone)}">${esc(x.ad.phone)}</a>` : ''}${x.ad.website ? ` · <a href="${esc(x.ad.website)}" rel="sponsored noopener" target="_blank">לאתר</a>` : ''}</div>`).join('');
  const plan = PLAN[d.slotsKind!];
  const join = d.cta && plan ? `<p class="xs muted mb0"><a href="${esc(d.order!)}?plan=${plan}${d.target ? '&target=' + encodeURIComponent(d.target) : ''}">להופיע כאן</a></p>` : '';
  if (!items && !join) return;
  el.innerHTML = `${d.title && items ? `<h2 style="font-size:1.05rem">${esc(d.title)}</h2>` : ''}${items}${join}`;
  el.hidden = false;
});
