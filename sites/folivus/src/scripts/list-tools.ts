// Filter + sort for firm lists (see components/ListTools.astro). State is shared by the phone sheet and the desktop chips.
const SHORT: Record<string, string> = { rank: 'מיון: דירוג', reviews: 'מיון: ביקורות', name: 'מיון: שם' };
const done = new Set<string>();
document.querySelectorAll<HTMLElement>('[data-lt]').forEach((el) => {
  const id = el.dataset.lt!; if (done.has(id)) return; done.add(id);
  const list = document.getElementById(id); if (!list) return;
  const rows = Array.from(list.querySelectorAll<HTMLElement>('.fr'));
  const sheet = document.querySelector<HTMLElement>(`[data-lt-sheet="${id}"]`)!; const bg = document.querySelector<HTMLElement>(`[data-lt-bg="${id}"]`)!;
  const all = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-lt="${id}"] ${sel}, [data-lt-sheet="${id}"] ${sel}`));
  const f = new Set<string>(); let sort = 'rank'; let opener: HTMLElement | null = null;
  const pass = (r: HTMLElement) => (!f.has('claimed') || r.dataset.claimed === '1') && (!f.has('reviews') || Number(r.dataset.reviews) > 0) && (!f.has('ext') || r.dataset.ext === '1');
  const key = (r: HTMLElement) => sort === 'reviews' ? -Number(r.dataset.reviews) * 1000 - Number(r.dataset.score) : sort === 'name' ? 0 : Number(r.dataset.rank || 999);
  const apply = () => {
    const sorted = rows.slice().sort((a, b) => sort === 'name' ? String(a.dataset.name).localeCompare(String(b.dataset.name), 'he') : key(a) - key(b));
    sorted.forEach((r) => { list.appendChild(r); r.classList.toggle('rowhide', !pass(r)); });
    const n = rows.filter(pass).length;
    all('[data-lt-f]').forEach((b) => b.setAttribute('aria-pressed', String(f.has(b.dataset.ltF!))));
    all('[data-lt-s]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ltS === sort)));
    all('[data-lt-sort]').forEach((s) => ((s as unknown as HTMLSelectElement).value = sort));
    all('[data-lt-n]').forEach((c) => { c.textContent = String(f.size); c.hidden = f.size === 0; });
    all('[data-lt-sortshort]').forEach((c) => (c.textContent = SHORT[sort]));
    all('[data-lt-show]').forEach((c) => (c.textContent = n === 1 ? 'הצגת משרד אחד' : `הצגת ${n} משרדים`));
    const live = document.querySelector<HTMLElement>(`[data-lt-count="${id}"]`); if (live) live.textContent = n === rows.length ? (n === 1 ? 'משרד אחד ברשימה' : `${n} משרדים ברשימה`) : `מציגים ${n} מתוך ${rows.length} משרדים`;
  };
  const show = (on: boolean) => {
    sheet.hidden = !on; bg.hidden = !on; document.body.style.overflow = on ? 'hidden' : '';
    if (on) sheet.querySelector<HTMLElement>('[data-lt-close]')?.focus(); else opener?.focus();
  };
  all('[data-lt-open]').forEach((b) => b.addEventListener('click', () => { opener = b; show(true); }));
  all('[data-lt-close]').forEach((b) => b.addEventListener('click', () => show(false)));
  bg.addEventListener('click', () => show(false));
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { show(false); return; }
    if (e.key !== 'Tab') return;
    const fs = Array.from(sheet.querySelectorAll<HTMLElement>('button')); const first = fs[0], last = fs[fs.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  all('[data-lt-f]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.ltF!; f.has(k) ? f.delete(k) : f.add(k); apply(); }));
  all('[data-lt-s]').forEach((b) => b.addEventListener('click', () => { sort = b.dataset.ltS!; apply(); }));
  all('[data-lt-sort]').forEach((s) => s.addEventListener('change', () => { sort = (s as unknown as HTMLSelectElement).value; apply(); }));
  all('[data-lt-clear]').forEach((b) => b.addEventListener('click', () => { f.clear(); sort = 'rank'; apply(); }));
  apply();
});
