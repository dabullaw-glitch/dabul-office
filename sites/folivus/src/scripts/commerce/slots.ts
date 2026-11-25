// Paid slots on a page, read live from the database (fol_public_slots), so a purchase shows up right after payment.
// Always labelled with the label the database gives ("מודעה", "בחסות", "משרד מקודם"). Empty = nothing, or a small join link.
import { rpc, esc } from './api';
const PLAN: Record<string, string> = { court: 'court-page', provider: 'service-provider', tool: 'tool-sponsor' };
const test = new URLSearchParams(location.search).get('fol_test') === '1';
const ini = (n: string) => String(n || '').replace(/\([^)]*\)/g, ' ').split(/\s+/).filter((w) => w && !['משרד', 'עורכי', 'דין', "ושות'", 'ושות׳'].includes(w)).slice(0, 2);
const tile = (n: string) => { const m = ini(n); return `<span class="lt lt-b" aria-hidden="true">${m.length === 2 ? `<span>${esc(m[0])}</span><i></i><span>${esc(m[1])}</span>` : `<span>${esc(m[0] || '')}</span>`}</span>`; };
document.querySelectorAll<HTMLElement>('[data-slots-kind]').forEach(async (el) => {
  const d = el.dataset; const kind = d.slotsKind!;
  const list = (await rpc('fol_public_slots', { p_kind: kind, p_target: d.target || null, p_area: d.area || null, p_city: d.city || null, p_test: test })) || [];
  const href = (s: string) => d.firmBase!.replace('__slug__', encodeURIComponent(s));
  const lbl = (x: any) => `${esc(x.label)}${x.test ? ' (בדיקה)' : ''}`;
  let items = '';
  if (kind === 'tool') {
    items = list.filter((x: any) => x.firm).slice(0, 1).map((x: any) => `<div class="sponsor">${tile(x.firm.name)}<span class="stack" style="min-width:0"><span class="row-top"><span class="tag">${lbl(x)}</span><span class="cap">החסות לא משנה את החישוב</span></span><a class="tap" href="${esc(href(x.firm.slug))}" style="color:var(--on-ink);font-weight:600;text-decoration:none">${esc(x.firm.name)}</a></span></div>`).join('');
  } else {
    const rows = list.map((x: any) => x.firm
      ? `<article class="row"><span class="row-b"><span class="row-top"><span class="tag">${lbl(x)}</span></span><span class="row-n" style="font-size:var(--fs-16)"><a class="row-link" href="${esc(href(x.firm.slug))}">${esc(x.firm.name)}</a></span>${x.firm.phone ? `<span class="row-m num">${esc(x.firm.phone)}</span>` : ''}</span></article>`
      : `<article class="row"><span class="row-b"><span class="row-top"><span class="tag">${lbl(x)}</span><span class="cap">${esc(x.ad.category)}</span></span><span class="row-n" style="font-size:var(--fs-16)">${esc(x.ad.name)}</span>${x.ad.text ? `<span class="row-m">${esc(x.ad.text)}</span>` : ''}<span class="flex" style="position:relative;z-index:1">${x.ad.phone ? `<a class="btn btn-s" href="tel:${esc(String(x.ad.phone).replace(/[^0-9+]/g, ''))}">${esc(x.ad.phone)}</a>` : ''}${x.ad.website ? `<a class="btn btn-s" href="${esc(x.ad.website)}" rel="sponsored noopener" target="_blank">לאתר</a>` : ''}</span></span></article>`).join('');
    items = rows ? `<div class="list">${rows}</div>` : '';
  }
  const plan = PLAN[kind];
  const join = d.cta && plan ? `<a class="more" href="${esc(d.order!)}?plan=${plan}${d.target ? '&target=' + encodeURIComponent(d.target) : ''}"><span>${items ? 'להופיע כאן' : 'המקום פנוי: להופיע כאן'}</span></a>` : '';
  if (!items && !join) return;
  el.innerHTML = `${d.title && items && kind !== 'tool' ? `<h3 class="h4">${esc(d.title)}</h3>` : ''}${items}${join}`;
  el.classList.add('stack', 'gp8');
  el.hidden = false;
});
