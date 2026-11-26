// The home rights check: tabs by life event, a sentence with blanks, and one button. The button opens the matching
// free tool with the blanks filled in (the tool runs in the browser), or the area page when there is no tool for it.
// The check is kept for this tab only (sessionStorage) so result pages can show "ממשיכים מהבדיקה".
const root = document.querySelector<HTMLElement>('[data-check]');
if (root) {
  const EV: Record<string, { area: string; tool: string; au: string }> = JSON.parse(root.dataset.areas || '{}');
  const AREAS: Record<string, { h: string; t: string; g: string }> = JSON.parse(root.dataset.areaUrls || '{}');
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role=tab]'));
  const go = root.querySelector<HTMLButtonElement>('[data-go]')!;
  const CTA: Record<string, string> = { fired: 'מה מגיע לי?', home: 'כמה מס נשלם?', divorce: 'מה בודקים קודם?', accident: 'מה מגיע לי?', debt: 'מה אפשר לעשות?', estate: 'מי יורש ובאיזה חלק?', other: 'למי לפנות?' };
  let cur = 'fired';
  const num = (v: string) => Number(String(v).replace(/[^\d.]/g, '')) || 0;
  const val = (sel: string) => (root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-pane="${cur}"] [name="${sel}"]`)?.value || '');
  const txt = (sel: string) => { const s = root.querySelector<HTMLSelectElement>(`[data-pane="${cur}"] select[name="${sel}"]`); return s ? s.selectedOptions[0].textContent || '' : val(sel); };
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const q = (o: Record<string, string | number>) => '?' + Object.entries(o).map(([k, v]) => `f_${k}=${encodeURIComponent(String(v))}`).join('&') + '&run=1';
  const select = (k: string, focus = false) => {
    cur = k;
    tabs.forEach((t) => { const on = t.dataset.tab === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== k));
    go.textContent = CTA[k] || 'מה מגיע לי?';
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.tab!));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL: left = next
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length].dataset.tab!, true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0].dataset.tab!, true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1].dataset.tab!, true); }
    });
  });
  root.querySelectorAll<HTMLInputElement>('input[inputmode=numeric]').forEach((el) => el.addEventListener('blur', () => { const n = num(el.value); if (n) el.value = n.toLocaleString('en-US'); }));
  root.querySelectorAll('form').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); go.click(); }));
  const keep = (t: string, area: string, href: string) => { try { sessionStorage.setItem('fol-check', JSON.stringify({ t, area, href })); } catch {} };
  go.addEventListener('click', () => {
    const e = EV[cur]; let href = '', label = '';
    if (cur === 'fired') {
      const y = num(val('years')) || 1; const end = new Date(); const start = new Date(end); start.setFullYear(end.getFullYear() - y);
      href = e.tool + q({ start_date: iso(start), end_date: iso(end), last_monthly_salary: num(val('salary')), termination_reason: val('reason') });
      label = `${txt('reason')} אחרי ${txt('years')}, שכר ${num(val('salary')).toLocaleString('en-US')} ₪`;
    } else if (cur === 'home') {
      href = e.tool + q({ price: num(val('price')), buyer_type: val('type') }); label = `${txt('type')} ב־${num(val('price')).toLocaleString('en-US')} ₪`;
    } else if (cur === 'divorce') {
      href = e.tool + `?f_children_ages=${encodeURIComponent(val('ages'))}`; label = `${txt('kind')}, ילדים בגילים ${val('ages')}`;
    } else if (cur === 'accident') {
      if (val('kind') === 'road') { const a = AREAS['car-accidents']; keep('תאונת דרכים', 'car-accidents', ''); location.href = a ? a.h : e.au; return; }
      href = e.tool + q({ income_3_months: num(val('salary')) * 3, incapacity_days: val('days') }); label = `תאונת עבודה, ${txt('days')} בלי עבודה`;
    } else if (cur === 'debt') {
      keep(`${txt('kind')} מההוצאה לפועל, חוב ${num(val('sum')).toLocaleString('en-US')} ₪`, 'enforcement', e.tool); location.href = e.au; return;
    } else if (cur === 'estate') {
      href = e.tool + q({ spouse_type: val('spouse'), living_children: val('kids') }); label = `ירושה בלי צוואה, ${txt('spouse')} ו${txt('kids')}`;
    } else {
      const s = root.querySelector<HTMLTextAreaElement>('#o1')!; if (!s.value.trim()) { s.focus(); return; }
      suggest(true); return;
    }
    keep(label, e.area, href); location.href = href;
  });
  // "משהו אחר": a few words -> matching areas (no server, no storage)
  const RULES: [string[], string[]][] = [
    [['פוטר', 'פיטור', 'מעסיק', 'משכורת', 'שכר', 'שעות נוספות'], ['labor-law']], [['גירוש', 'גרוש', 'פרידה', 'נפרד'], ['divorce', 'family-law']],
    [['מזונות', 'משמורת', 'הסדרי ראייה'], ['alimony', 'family-law']], [['ירושה', 'צוואה', 'נפטר', 'עיזבון'], ['inheritance-wills']],
    [['ייפוי כוח', 'אפוטרופ', 'דמנציה'], ['enduring-poa', 'guardianship']], [['רטיבות', 'סדק', 'ליקוי', 'דליפה', 'עובש', 'קבלן'], ['construction-defects']],
    [['דירה', 'טאבו', 'משכנת', 'נכס', 'מגרש'], ['real-estate']], [['תמ"א', 'פינוי', 'יזם'], ['urban-renewal']], [['שכירות', 'שוכר', 'משכיר', 'פיקדון'], ['leases']],
    [['שכן', 'ועד בית', 'בית משותף', 'רכוש משותף', 'מחסן'], ['condominium']], [['תאונ', 'נפגעתי', 'נפצעתי'], ['car-accidents', 'torts']],
    [['רופא', 'בית חולים', 'ניתוח'], ['medical-malpractice']], [['ביטוח לאומי', 'נכות', 'קצבה', 'אבטלה'], ['national-insurance']], [['פוליסה', 'חברת ביטוח'], ['insurance']],
    [['משטרה', 'חקירה', 'נעצר', 'כתב אישום'], ['criminal']], [['רישיון', 'דוח', 'שלילה'], ['traffic']], [['חוב', 'הוצאה לפועל', 'עיקול'], ['enforcement', 'insolvency']],
    [['חברה', 'שותף', 'עסק', 'מניות'], ['corporate']], [['השמצה', 'לשון הרע', 'פרסמו עליי'], ['defamation']], [['ויזה', 'אזרחות', 'דרכון'], ['immigration', 'foreign-citizenship']],
    [['חוזה', 'הסכם', 'הפרה'], ['contracts']], [['ביטול עסקה', 'החזר כספי', 'מוצר'], ['consumer']], [['מילואים', 'צבא', 'משרד הביטחון'], ['military']],
  ];
  const out = root.querySelector<HTMLElement>('[data-story-out]')!;
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  function suggest(final = false) {
    const st = root!.querySelector<HTMLTextAreaElement>('#o1')!.value; const seen = new Set<string>(); const hit: string[] = [];
    RULES.forEach(([w, s]) => { if (w.some((x) => st.includes(x))) s.forEach((k) => { if (AREAS[k] && !seen.has(k)) { seen.add(k); hit.push(k); } }); });
    out.innerHTML = !st.trim() ? '' : hit.length
      ? '<p class="cap">נושאים שמתאימים לתיאור:</p>' + hit.slice(0, 3).map((k) => `<a class="qi" style="min-height:56px" href="${esc(AREAS[k].h)}"><span class="tx"><span class="tt">${esc(AREAS[k].t)}</span><span class="ty">${esc(AREAS[k].g)}</span></span></a>`).join('')
      : `<p class="cap">${final ? 'עוד לא זיהינו נושא. נסו מילים כמו ״פוטרתי״, ״ירושה״ או ״רטיבות״, או עברו לרשימת התחומים.' : ''}</p>`;
    if (final && hit[0]) out.querySelector<HTMLElement>('a')?.focus();
  }
  let tm: number | undefined;
  root.querySelector('#o1')?.addEventListener('input', () => { clearTimeout(tm); tm = window.setTimeout(() => suggest(false), 200); });
}
