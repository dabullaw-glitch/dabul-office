"""Visual themes for the reel editor. Yakir (12.10.2026): every video gets a different, new and beautiful design;
the captions stay the same in every video (white, active word in gold). No music.
A theme sets colors, fonts, card shape, entrance motion and a few visual variants.
"""
import hashlib

FONTS = {  # family -> [(file stem, weight)] ; files in assets/fonts as <stem>-hebrew-<w>-normal.woff2 and -latin-
    'Heebo': [('heebo', 700), ('heebo', 800), ('heebo', 900)],
    'Frank Ruhl Libre': [('frank-ruhl-libre', 700), ('frank-ruhl-libre', 900)],
    'Rubik': [('rubik', 600), ('rubik', 800)],
    'Secular One': [('secular-one', 400)],
    'Assistant': [('assistant', 700), ('assistant', 800)],
    'Suez One': [('suez-one', 400)],
}

# motion: entrance tween for panels (from -> to). {T} is replaced by the theme tilt.
MOTION = {
    'pop':  ('{y:-40,scale:.85,opacity:0}', '{y:0,scale:1,opacity:1,duration:.4,ease:"back.out(1.7)"}'),
    'drop': ('{y:-140,rotation:-6,opacity:0}', '{y:0,rotation:{T},opacity:1,duration:.55,ease:"power3.out"}'),
    'blur': ('{filter:"blur(16px)",scale:1.08,opacity:0}', '{filter:"blur(0px)",scale:1,opacity:1,duration:.45,ease:"power2.out"}'),
    'snap': ('{x:-320,skewX:-14,opacity:0}', '{x:0,skewX:0,opacity:1,duration:.35,ease:"back.out(2.4)"}'),
    'wipe': ('{clipPath:"inset(0% 0% 0% 100%)",opacity:1}', '{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:.45,ease:"power3.out"}'),
    'rise': ('{y:90,opacity:0}', '{y:0,opacity:1,duration:.5,ease:"expo.out"}'),
}

THEMES = {
    'navy-gold': dict(
        label='כחול וזהב', fh='Heebo', fb='Heebo', fhw=900, motion='pop', tilt=0, thirds='house', num='circle',
        v={'--bg-a': '#173B7A', '--bg-b': '#050d20', '--pnl': 'rgba(10,22,48,.94)', '--pnl-fg': '#ffffff', '--acc': '#FFD45C',
           '--acc-fg': '#0E2A57', '--acc2': '#3F7AD6', '--muted': '#cfe0ff', '--bd': '4px solid #FFD45C', '--rad': '34px',
           '--shadow': '0 24px 60px rgba(0,0,0,.5)', '--blur': 'none', '--prog': '#FFD45C'}),
    'paper': dict(
        label='נייר ודיו', fh='Frank Ruhl Libre', fb='Assistant', fhw=900, motion='drop', tilt=-1.5, thirds='pie', num='square',
        v={'--bg-a': '#F3EBDD', '--bg-b': '#D9CBB3', '--pnl': '#FBF7EF', '--pnl-fg': '#1D1A16', '--acc': '#D94F2B',
           '--acc-fg': '#FFFFFF', '--acc2': '#2C5F5D', '--muted': '#6B5E4F', '--bd': '0 solid transparent', '--rad': '6px',
           '--shadow': '0 18px 42px rgba(40,25,10,.38)', '--blur': 'none', '--prog': '#D94F2B', '--ec-fg': '#1D1A16', '--ec-acc': '#D94F2B'}),
    'glass': dict(
        label='זכוכית', fh='Rubik', fb='Rubik', fhw=800, motion='blur', tilt=0, thirds='bar', num='ring',
        v={'--bg-a': '#2C5364', '--bg-b': '#0F2027', '--pnl': 'rgba(8,28,38,.5)', '--pnl-fg': '#FFFFFF', '--acc': '#3DDCC8',
           '--acc-fg': '#06312C', '--acc2': '#8FB8FF', '--muted': '#DDF6F2', '--bd': '2px solid rgba(255,255,255,.55)', '--rad': '42px',
           '--shadow': '0 20px 50px rgba(0,0,0,.35)', '--blur': 'blur(22px) saturate(1.4)', '--prog': '#3DDCC8'}),
    'bold': dict(
        label='בלוקים צבעוניים', fh='Secular One', fb='Heebo', fhw=400, motion='snap', tilt=-2, thirds='bar', num='square',
        v={'--bg-a': '#2D47FF', '--bg-b': '#1328C9', '--pnl': '#FFE14D', '--pnl-fg': '#111111', '--acc': '#2D47FF',
           '--acc-fg': '#FFFFFF', '--acc2': '#FF5A3C', '--muted': '#333333', '--bd': '5px solid #111111', '--rad': '0px',
           '--shadow': '14px 14px 0 #111111', '--blur': 'none', '--prog': '#FFE14D', '--ec-acc': '#FFE14D'}),
    'mono': dict(
        label='קווים נקיים', fh='Rubik', fb='Rubik', fhw=800, motion='wipe', tilt=0, thirds='pie', num='ring',
        v={'--bg-a': '#24272C', '--bg-b': '#0E1012', '--pnl': 'rgba(16,18,21,.9)', '--pnl-fg': '#F2F2F2', '--acc': '#B8F35A',
           '--acc-fg': '#14200A', '--acc2': '#F2F2F2', '--muted': '#B9BEC6', '--bd': '3px solid rgba(242,242,242,.85)', '--rad': '26px',
           '--shadow': '0 16px 40px rgba(0,0,0,.45)', '--blur': 'none', '--prog': '#B8F35A'}),
    'warm': dict(
        label='חם ורך', fh='Suez One', fb='Heebo', fhw=400, motion='rise', tilt=0, thirds='house', num='circle',
        v={'--bg-a': '#7A3B2E', '--bg-b': '#3A1F1A', '--pnl': '#FFF6EC', '--pnl-fg': '#3A1F1A', '--acc': '#E8A33D',
           '--acc-fg': '#3A1F1A', '--acc2': '#B5523B', '--muted': '#7A5A4C', '--bd': '0 solid transparent', '--rad': '28px',
           '--shadow': '0 22px 50px rgba(30,10,5,.45)', '--blur': 'none', '--prog': '#E8A33D'}),
    # 15.10.2026: the two extra looks Yakir asked for (styles/cinematic-gold.md, styles/boxed-navy.md). They are whole styles,
    # not just colours, so they are picked through pick_style(), never by the v3 theme rotation.
    'cinematic-gold': dict(
        label='קולנועי שחור וזהב', style='cinematic', fh='Heebo', fb='Heebo', fhw=900, motion='blur', tilt=0, thirds='pie', num='ring',
        v={'--bg-a': '#2A2B2E', '--bg-b': '#111214', '--pnl': 'rgba(20,20,22,.78)', '--pnl-fg': '#FFFFFF', '--acc': '#D4AF64',
           '--acc-fg': '#111214', '--acc2': '#C9A961', '--muted': '#CFCFD2', '--bd': '2px solid rgba(212,175,100,.85)', '--rad': '22px',
           '--shadow': '0 20px 50px rgba(0,0,0,.55)', '--blur': 'blur(14px)', '--prog': '#D4AF64'}),
    'boxed-navy': dict(
        label='קופסאות כחול וזהב', style='boxed', fh='Heebo', fb='Heebo', fhw=900, motion='rise', tilt=0, thirds='house', num='circle',
        v={'--bg-a': '#1A2C55', '--bg-b': '#0B1530', '--pnl': 'rgba(19,37,74,.93)', '--pnl-fg': '#FFFFFF', '--acc': '#E4B84A',
           '--acc-fg': '#13254A', '--acc2': '#3F6FC4', '--muted': '#C9D4EE', '--bd': '3px solid #E4B84A', '--rad': '20px',
           '--shadow': '0 20px 46px rgba(0,0,0,.45)', '--blur': 'none', '--prog': '#E4B84A'}),
}

STYLES = ['v3', 'cinematic', 'boxed']   # Yakir 12.10.2026: every video one of these three, in turn


def pick_style(plan, history=()):
    """plan['style'] wins. Otherwise the style used longest ago (history = newest first), so the three take turns."""
    if plan.get('style') in STYLES: return plan['style']
    hist = [h for h in history if h in STYLES]
    for st in STYLES:
        if st not in hist[:2]: return st
    return STYLES[0]


def pick_theme(plan, avoid=()):
    """plan['theme'] wins. Otherwise a stable pick from the title, skipping the recently used themes in `avoid`."""
    if plan.get('theme') in THEMES: return plan['theme']
    v3 = [n for n in THEMES if not THEMES[n].get('style')]
    names = [n for n in v3 if n not in set(avoid)] or v3
    h = int(hashlib.md5(plan.get('title', 'x').encode('utf-8')).hexdigest(), 16)
    return names[h % len(names)]


def font_css(theme):
    fams = {theme['fh'], theme['fb'], 'Heebo'}
    out = []
    for fam in fams:
        for stem, w in FONTS[fam]:
            for sub, rng in (('hebrew', 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F'), ('latin', 'U+0000-00FF,U+2150-218F,U+2070-209F')):
                out.append(f"@font-face{{font-family:'{fam}';src:url(assets/fonts/{stem}-{sub}-{w}-normal.woff2) format('woff2');font-weight:{w};unicode-range:{rng}}}")
    return '\n'.join(out)
