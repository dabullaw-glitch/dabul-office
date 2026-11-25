// Map of Israel with the 25 cities of the index (geometry from the round 4 design canvas: a simple lon/lat projection).
// The same render function draws the first view on the server and every change in the browser, so the map works
// before JavaScript loads and the city list next to it is always the accessible way to pick a city.
export type MapCity = { slug: string; name: string; count: number; href: string; top: { label: string; n: number; href: string }[]; promo: { name: string; href: string; area: string } | null };
export const KX = 85.26, LON0 = 33.9, LAT0 = 33.45;
const P2 = (lon: number, lat: number) => [(lon - LON0) * KX, (LAT0 - lat) * 100];
const LAND: number[][] = [[35.105, 33.093], [35.2, 33.085], [35.3, 33.1], [35.4, 33.07], [35.5, 33.09], [35.52, 33.12], [35.54, 33.2], [35.57, 33.28], [35.62, 33.26], [35.66, 33.25], [35.73, 33.3], [35.78, 33.33], [35.83, 33.2], [35.87, 33.05], [35.85, 32.9], [35.8, 32.78], [35.75, 32.72], [35.66, 32.68], [35.57, 32.64], [35.56, 32.45], [35.55, 32.25], [35.53, 32.05], [35.55, 31.85], [35.57, 31.76], [35.58, 31.55], [35.56, 31.3], [35.52, 31.12], [35.45, 31.0], [35.38, 30.8], [35.3, 30.6], [35.2, 30.4], [35.16, 30.15], [35.08, 29.9], [35.0, 29.65], [34.98, 29.55], [34.95, 29.53], [34.9, 29.49], [34.8, 29.85], [34.68, 30.15], [34.55, 30.5], [34.43, 30.87], [34.27, 31.22], [34.22, 31.32], [34.3, 31.4], [34.38, 31.48], [34.47, 31.57], [34.53, 31.64], [34.6, 31.73], [34.645, 31.82], [34.7, 31.92], [34.74, 32.02], [34.765, 32.1], [34.8, 32.2], [34.835, 32.3], [34.865, 32.42], [34.89, 32.52], [34.92, 32.62], [34.95, 32.73], [34.96, 32.83], [35.0, 32.82], [35.04, 32.8], [35.07, 32.86], [35.08, 32.93], [35.09, 33.02]];
const KIN = [[35.54, 32.88], [35.59, 32.89], [35.64, 32.85], [35.65, 32.78], [35.62, 32.72], [35.58, 32.71], [35.55, 32.75], [35.535, 32.82]];
const DEAD = [[35.47, 31.76], [35.555, 31.755], [35.565, 31.55], [35.545, 31.35], [35.5, 31.1], [35.42, 31.1], [35.4, 31.3], [35.4, 31.5], [35.44, 31.7]];
const path = (pts: number[][]) => 'M' + pts.map((p) => { const xy = P2(p[0], p[1]); return xy[0].toFixed(1) + ' ' + xy[1].toFixed(1); }).join('L') + 'Z';
export const PATHS = { land: path(LAND), kin: path(KIN), dead: path(DEAD) };
// slug, lon, lat, label side in the whole country view, label side in the center view ('' = label only when selected)
export const POINTS: [string, number, number, string, string][] = [
  ['tel-aviv', 34.78, 32.08, 'w', 'w'], ['jerusalem', 35.21, 31.77, 'e', 'w'], ['haifa', 34.99, 32.79, 'w', ''], ['ramat-gan', 34.82, 32.07, '', ''],
  ['petah-tikva', 34.89, 32.09, '', 'e'], ['rishon-lezion', 34.8, 31.96, '', 'w'], ['netanya', 34.865, 32.32, 'w', 'w'], ['beer-sheva', 34.79, 31.25, 'e', ''],
  ['herzliya', 34.84, 32.165, '', 'w'], ['ashdod', 34.66, 31.8, '', 'w'], ['kfar-saba', 34.91, 32.175, '', 'e'], ['holon', 34.78, 32.01, '', 'w'],
  ['rehovot', 34.81, 31.895, '', 'e'], ['raanana', 34.87, 32.185, '', ''], ['hadera', 34.92, 32.44, '', 'w'], ['ashkelon', 34.575, 31.67, 'w', 'e'],
  ['modiin', 35.01, 31.9, '', 'e'], ['nazareth', 35.3, 32.7, '', ''], ['afula', 35.29, 32.61, 'e', ''], ['nahariya', 35.105, 33.0, 'w', ''],
  ['eilat', 34.95, 29.56, 'w', ''], ['karmiel', 35.3, 32.92, '', ''], ['tiberias', 35.525, 32.79, 'e', ''], ['kiryat-shmona', 35.57, 33.21, 'e', ''], ['dimona', 35.03, 31.07, 'e', ''],
];
export const VIEWS: Record<string, { x: number; y: number; w: number; h: number; n: string }> = {
  all: { x: 0, y: 0, w: 200, h: 410, n: 'כל הארץ' },
  center: { x: (34.54 - LON0) * KX, y: (LAT0 - 32.75) * 100, w: 61.1, h: 125.3, n: 'מרכז הארץ' },
};
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const pct = (v: number) => v.toFixed(2) + '%';
export const countText = (n: number) => (n === 0 ? 'עוד אין משרדים' : n === 1 ? 'משרד אחד' : n + ' משרדים');

/** the map layer (dots, labels, tooltip) for a view, a selected city and a hovered city */
export function layer(cities: MapCity[], view: string, sel: string, hov: string | null) {
  const V = VIEWS[view] || VIEWS.all; const zoom = view === 'center';
  const by = new Map(cities.map((c) => [c.slug, c]));
  const size = (n: number) => (zoom ? 13 : 9) + Math.sqrt(n) * (zoom ? 2.2 : 1.8);
  const pos = (p: [string, number, number, string, string]) => { const xy = P2(p[1], p[2]); return [(xy[0] - V.x) / V.w * 100, (xy[1] - V.y) / V.h * 100]; };
  const inView = (p: any) => { const q = pos(p); return q[0] >= 1 && q[0] <= 99 && q[1] >= 1 && q[1] <= 99; };
  const pts = POINTS.filter((p) => by.has(p[0]) && inView(p));
  const dots = pts.slice().sort((a, b) => by.get(b[0])!.count - by.get(a[0])!.count).map((p) => {
    const c = by.get(p[0])!; const on = c.slug === sel; const hv = c.slug === hov; const q = pos(p); const s = size(c.count);
    const st = `left:${pct(q[0])};top:${pct(q[1])};width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;background:${on ? 'var(--map-dot-on)' : 'var(--map-dot)'};border:${on ? '3px solid var(--map-dot-ring)' : hv ? '2px solid var(--map-dot-on)' : '1px solid var(--map-dot-line)'};box-shadow:${on ? '0 0 0 5px var(--map-dot-glow)' : 'none'}`;
    return `<span class="dot" data-city="${esc(c.slug)}" aria-hidden="true" title="${esc(c.name)}" style="${st}"></span>`;
  }).join('');
  const labels = pts.filter((p) => (zoom ? p[4] : p[3]) || p[0] === sel).map((p) => {
    const c = by.get(p[0])!; const side = (zoom ? p[4] : p[3]) || 'e'; const q = pos(p); const on = c.slug === sel; const off = (size(c.count) / 2 + 6).toFixed(1);
    const tf = side === 'w' ? `translate(calc(-100% - ${off}px), -50%)` : `translate(${off}px, -50%)`;
    return `<span class="mlabel" aria-hidden="true" style="left:${pct(q[0])};top:${pct(q[1])};transform:${tf};font-size:${on ? 14 : 12}px;font-weight:${on ? 700 : 600}">${esc(c.name)}</span>`;
  }).join('');
  let tip = '';
  const h = hov ? POINTS.find((p) => p[0] === hov) : null;
  if (h && by.has(h[0]) && inView(h)) { const c = by.get(h[0])!; const q = pos(h); const s = size(c.count); tip = `<span class="mtip" role="tooltip" style="left:${pct(q[0])};top:${pct(q[1])};transform:translate(-50%, calc(-100% - ${(s / 2 + 10).toFixed(1)}px))"><strong>${esc(c.name)}</strong><span class="num">${esc(countText(c.count))}</span></span>`; }
  return { vb: `${V.x.toFixed(2)} ${V.y.toFixed(2)} ${V.w} ${V.h}`, sw: zoom ? '0.35' : '0.8', sea: !zoom, html: dots + labels + tip, hint: zoom ? 'מציגים את מרכז הארץ.' : 'צפוף במרכז? בחרו ״מרכז הארץ״.' };
}

/** the panel of the selected city */
export function panel(c: MapCity) {
  const max = Math.max(1, ...c.top.map((t) => t.n));
  const top = c.top.length ? `<ul class="toplist">${c.top.map((t) => `<li class="stack gp4"><a href="${esc(t.href)}"><span>${esc(t.label)}</span><span class="cap num">${esc(countText(t.n))}</span></a><span class="bar" aria-hidden="true"><span style="width:${Math.round(t.n / max * 100)}%"></span></span></li>`).join('')}</ul>` : `<p class="cityp-empty">עוד אין משרדים מהעיר באינדקס. משרדים מהעיר יכולים להצטרף בחינם.</p>`;
  const promo = c.promo ? `<div style="display:flex;gap:var(--sp-12);align-items:center;padding-top:var(--sp-14);border-top:1px solid var(--ink-line)"><span class="stack" style="min-width:0"><span class="plbl"><svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5 20.5 12 12 20.5 3.5 12z" fill="currentColor"></path></svg><span>משרד מקודם ב${esc(c.name)}</span></span><a class="tap" href="${esc(c.promo.href)}" style="color:var(--on-ink);font-weight:600;text-decoration:none">${esc(c.promo.name)}</a><span class="cap">${esc(c.promo.area)}</span></span></div>` : '';
  return `<div class="stack gp4"><p class="eyebrow">העיר שנבחרה</p><h3 class="cityp-n">${esc(c.name)}</h3><p class="cap num">${esc(countText(c.count))} באינדקס</p></div>
<div class="stack gp12"><p class="h4">${c.top.length ? 'התחומים הנפוצים בעיר' : 'התחומים בעיר'}</p>${top}</div>${promo}
<a class="btn btn-w btn-lg btn-block" href="${esc(c.href)}"><span>לכל עורכי הדין ב${esc(c.name)}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path></svg></a>`;
}

/** browser side: wires dots, the city list and the two views */
export function mount(root: HTMLElement) {
  const cities: MapCity[] = JSON.parse(root.dataset.cities || '[]');
  let view = 'all', sel = root.dataset.sel || (cities[0] && cities[0].slug) || '', hov: string | null = null;
  const svg = root.querySelector('svg')!; const lay = root.querySelector<HTMLElement>('[data-layer]')!;
  const sea = root.querySelector<HTMLElement>('[data-sea]'); const hint = root.querySelector<HTMLElement>('[data-hint]');
  const pan = root.querySelector<HTMLElement>('[data-panel]')!;
  const draw = () => {
    const L = layer(cities, view, sel, hov);
    svg.setAttribute('viewBox', L.vb); svg.querySelectorAll('path').forEach((p) => p.setAttribute('stroke-width', L.sw));
    lay.innerHTML = L.html; if (sea) sea.hidden = !L.sea; if (hint) hint.textContent = L.hint;
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    root.querySelectorAll<HTMLButtonElement>('.cbtn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === sel)));
  };
  const pick = (slug: string) => { const c = cities.find((x) => x.slug === slug); if (!c) return; sel = slug; pan.innerHTML = panel(c); draw(); };
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-city],[data-view]'); if (!t) return;
    if (t.dataset.view) { view = t.dataset.view; hov = null; draw(); return; }
    if (t.dataset.city) pick(t.dataset.city);
  });
  const over = (e: Event) => { const t = (e.target as HTMLElement).closest<HTMLElement>('.dot,.cbtn'); const v = t ? t.dataset.city || null : null; if (v !== hov) { hov = v; draw(); if (t && t.classList.contains('dot') && e.type === 'focusin') lay.querySelector<HTMLElement>(`.dot[data-city="${v}"]`)?.focus(); } };
  lay.addEventListener('mouseover', over); root.querySelector('[data-mapwrap]')?.addEventListener('mouseleave', () => { if (hov) { hov = null; draw(); } });
  draw();
}
