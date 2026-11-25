import { DB } from '../../config/brand';
const el = document.querySelector<HTMLElement>('[data-fol-track]');
if (el) {
  const slug = el.dataset.folTrack!;
  const send = (ev: string) => {
    const body = JSON.stringify({ p_slug: slug, p_event: ev });
    fetch(`${DB.url}/rest/v1/rpc/fol_track`, { method: 'POST', keepalive: true, headers: { apikey: DB.key, 'content-type': 'application/json' }, body }).catch(() => null);
  };
  if (!sessionStorage.getItem('fv:' + slug)) { sessionStorage.setItem('fv:' + slug, '1'); send('views'); }
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest('a'); if (!a) return;
    const h = a.getAttribute('href') || '';
    if (h.startsWith('tel:')) send('phone'); else if (/wa\.me|whatsapp/.test(h)) send('whatsapp'); else if (a.dataset.firmSite !== undefined || (a.target === '_blank' && /^https?:/.test(h) && !h.includes(location.host))) send('website');
  });
}
