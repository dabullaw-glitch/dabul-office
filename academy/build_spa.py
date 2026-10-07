# Builds the courses site as ONE self-contained page (academy-app.html) that lives inside the office system:
# it is stored in app_files and opened at portal.html#academy (no separate website, no extra hosting).
# Routes: #academy (home) · #academy/first-home · #academy/learn (&t=<personal token>) · #academy/terms
import pathlib, re
R = pathlib.Path(__file__).parent
S = R / 'src'
css = (R / 'academy.css').read_text()
js = (R / 'academy.js').read_text()
journey = (S / 'journey.svg.html').read_text()
# the gold gradient is defined once, outside the views (a gradient inside a hidden view would not paint in the other view)
import re as _re
_defs = _re.search(r'<defs>.*?</defs>', journey, _re.S).group(0)
journey = journey.replace(_defs, '')
GLOBAL_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + _defs + '</svg>'

def body(name):
    t = (S / f'{name}.html').read_text().replace('{{JOURNEY}}', journey)
    t = t.split('{{TOP}}', 1)[1].split('{{FOOT}}', 1)[0]
    return re.sub(r'<script[^>]*></script>', '', t).strip()

def links(t):
    rep = [('href="index.html#', 'href="#academy/home/'), ('href="index.html"', 'href="#academy"'),
           ('href="first-home.html#', 'href="#academy/first-home/'), ('href="first-home.html"', 'href="#academy/first-home"'),
           ('href="learn.html?preview=1"', 'href="#academy/learn/preview"'), ('href="learn.html"', 'href="#academy/learn"'),
           ('href="terms.html"', 'href="#academy/terms"')]
    for a, b in rep: t = t.replace(a, b)
    return t

views = {v: body(f) for v, f in [('home', 'index'), ('first-home', 'first-home'), ('learn', 'learn'), ('terms', 'terms')]}
titles = {'home': 'הקורסים של עו״ד יקיר דבול', 'first-home': 'קונים דירה ראשונה, בלי הפתעות | הקורסים של עו״ד יקיר דבול',
          'learn': 'הקורס שלי | הקורסים של עו״ד יקיר דבול', 'terms': 'תנאי רכישה וביטול | הקורסים של עו״ד יקיר דבול'}
top = (S / 'top.html').read_text(); foot = (S / 'foot.html').read_text()

router = r'''
// ---- router: one page, several views, chosen by the address after the # ----
(() => {
  const T = %s;
  const parse = () => { const h = location.hash.slice(1).split('&'); const p = h[0].split('/'); const q = new URLSearchParams(h.slice(1).join('&'));
    return { view: T[p[1]] ? p[1] : 'home', sub: p[2] || '', q }; };
  let shown = '';
  const go = () => {
    const r = parse();
    document.querySelectorAll('[data-view]').forEach(v => { v.hidden = v.dataset.view !== r.view; });
    document.title = T[r.view];
    document.querySelectorAll('.top nav a').forEach(a => a.removeAttribute('aria-current'));
    if (r.view !== shown) { window.scrollTo(0, 0); shown = r.view; document.dispatchEvent(new CustomEvent('academy:view', { detail: r })); }
    const el = r.sub && r.sub !== 'preview' && document.querySelector(`[data-view="${r.view}"] #${CSS.escape(r.sub)}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    document.querySelectorAll(`[data-view="${r.view}"] .reveal:not(.in)`).forEach(e => io && io.observe(e));
  };
  // links like href="#how" inside a view scroll inside that view instead of leaving the courses site
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    const h = a.getAttribute('href'); if (/^#academy/.test(h)) return;
    const el = document.querySelector(`[data-view="${parse().view}"] ${h.length > 1 ? '#' + CSS.escape(h.slice(1)) : 'body'}`);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .12 }) : null;
  window.addEventListener('hashchange', go);
  window.__academyRoute = parse;
  go();
})();
''' % repr(titles).replace("'", '"')

# the player: reads the personal token from #academy/learn&t=..., preview from #academy/learn/preview, and starts when the view opens
pjs = js
pjs = pjs.replace("if (!$('#player')) return;", "const startPlayer = () => {\n  if (startPlayer.done) return; startPlayer.done = true;")
pjs = pjs.replace("const hashTok = (location.hash.match(/t=([a-f0-9]{20,64})/) || [])[1];", "const rt = window.__academyRoute(); const hashTok = (rt.q.get('t') || '').replace(/[^a-f0-9]/g, '') || null;")
pjs = pjs.replace("history.replaceState(null, '', location.pathname + location.search);", "history.replaceState(null, '', location.pathname + location.search + '#academy/learn');")
pjs = pjs.replace("const preview = new URLSearchParams(location.search).get('preview');", "const preview = rt.sub === 'preview';")
pjs = pjs.replace('href="first-home.html#buy"', 'href="#academy/first-home/buy"')
assert 'const startPlayer' in pjs, 'player hook'
pjs = pjs.rstrip()
assert pjs.endswith('})();')
pjs = pjs[:-len('})();')] + "};\n  document.addEventListener('academy:view', e => { if (e.detail.view === 'learn') startPlayer(); });\n  if (window.__academyRoute && window.__academyRoute().view === 'learn') startPlayer();\n})();"
for k in ["const rt = window.__academyRoute()", "rt.sub === 'preview'", "#academy/learn'"]:
    assert k in pjs, k

html = f'''<!doctype html><html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
<meta name="theme-color" content="#161616"><title>{titles['home']}</title>
<style>
{css}
</style></head><body>
{GLOBAL_DEFS}
{links(top)}
{''.join(f'<div data-view="{v}"{"" if v == "home" else " hidden"}>' + links(b) + '</div>' + chr(10) for v, b in views.items())}
{links(foot)}
<script>{router}</script>
<script>{pjs}</script>
</body></html>
'''
(R / 'academy-app.html').write_text(html)
print('built academy-app.html', len(html))
