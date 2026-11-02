// Home search: maps free text to practice areas (simple word matching in the browser, nothing is sent anywhere),
// and sends area + city to the right page.
const norm = (s: string) => s.replace(/[״"׳'`]/g, '').replace(/\s+/g, ' ').trim();

export function initSearch() {
  const f = document.getElementById('search') as HTMLFormElement | null;
  if (!f) return;
  const kw: Record<string, string[]> = JSON.parse(f.dataset.kw || '{}');
  const names: Record<string, string> = JSON.parse(f.dataset.names || '{}');
  const B = f.dataset.base || '/';
  const q = f.querySelector('#q') as HTMLTextAreaElement;
  const out = f.querySelector('#match') as HTMLElement;
  const area = f.querySelector('#s-area') as HTMLSelectElement;
  const city = f.querySelector('#s-city') as HTMLSelectElement;
  const target = (a: string, c: string) => (a ? `${B}orchei-din/${a}/${c ? c + '/' : ''}` : c ? `${B}ir/${c}/` : `${B}orchei-din/`);

  const score = (text: string) => {
    const t = ' ' + norm(text) + ' ';
    const res: [string, number][] = [];
    for (const [slug, words] of Object.entries(kw)) {
      let s = 0;
      for (const w of words) {
        const n = norm(w);
        if (n.length < 2) continue;
        if (t.includes(n)) s += n.includes(' ') ? 3 : n.length > 3 ? 2 : 1;
      }
      if (s) res.push([slug, s]);
    }
    return res.sort((a, b) => b[1] - a[1]).slice(0, 3);
  };

  let timer = 0;
  let manual = false; // once the visitor picks an area by hand, the matcher stops changing it
  area.addEventListener('change', () => { manual = true; });
  const render = () => {
    const text = q.value;
    out.textContent = '';
    if (norm(text).length < 3) return;
    const m = score(text);
    const hint = document.createElement('span');
    hint.className = 'hint';
    if (!m.length) {
      hint.textContent = 'לא זיהינו תחום. אפשר לבחור תחום מהרשימה, או לנסות מילים אחרות.';
      out.append(hint);
      return;
    }
    hint.textContent = 'נראה שמתאים:';
    out.append(hint);
    for (const [slug] of m) {
      const a = document.createElement('a');
      a.href = target(slug, city.value);
      a.textContent = names[slug];
      a.addEventListener('click', () => { area.value = slug; manual = true; });
      out.append(a);
    }
    if (!manual) area.value = m[0][0];
  };
  q.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(render, 200); });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    let a = area.value;
    if (!a && q.value) a = score(q.value)[0]?.[0] || '';
    location.href = target(a, city.value);
  });
}
