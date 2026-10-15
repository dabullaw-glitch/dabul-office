"""Reel editor v3 (HyperFrames): builds index.html for one reel from a raw take + word timings + face track + an edit plan.

python3 build.py <plan.json> <words.json> <faces.json|-> <project_dir> [--avoid theme1,theme2]

Rules from Yakir (12.10.2026):
- the captions and the editing rhythm stay as they are (cuts without silences, punch-ins, active word in gold);
- graphics never cover his face: each graphic goes where there is free space (above the head, smaller, or the
  picture slides down / shrinks for a moment to make room), decided per beat from the face track;
- every video gets a different design (themes.py); no music at all (only light sound effects);
- (12.10.2026) not only "edit it as it is": when the camera was held crooked, he is off centre, too far, or the face is
  dark, the picture is fixed first (level, centre, small zoom, brightness), from the measurements in faces.json "fix".
  The plan can override it: "frameFix": {"rotate": deg, "dx": px, "dy": px, "zoom": x, "bright": x}, or false for none.

Three styles take turns (Yakir 12.10.2026, "כל פעם אחד מהם"): "v3" (the approved demo look, 6 colour themes),
"cinematic" (styles/cinematic-gold.md + the documentary quality bar in refs/README.md: quiet captions, full-screen gold
explainer cutaways while his voice continues, a stage timeline at the top, gold numbers that count up) and "boxed"
(styles/boxed-navy.md: name card, topic pill, hook box under the chin, navy caption boxes). --style=v3|cinematic|boxed,
or plan["style"]; otherwise --history=<styles, newest first> picks the one used longest ago.

The plan lists the source ranges to keep (silences inside them are cut automatically), caption fixes, and overlay
beats anchored to SOURCE seconds. Everything is mapped to the edited timeline here.
The project dir needs assets/take.mp4 (the 1080x1920 working copy that faces.json was tracked on); the other assets
(fonts, gsap, logos, sound effects) are copied from tools/reel-lab/assets.
"""
import sys, os, json, html, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from themes import THEMES, MOTION, pick_theme, pick_style, font_css

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
plan = json.load(open(args[0], encoding='utf-8'))
words_doc = json.load(open(args[1], encoding='utf-8'))
faces = json.load(open(args[2])) if args[2] != '-' and os.path.exists(args[2]) else None
proj = args[3]
os.makedirs(proj + '/assets', exist_ok=True)
for name in ('fonts', 'sfx'):
    shutil.copytree(f'{HERE}/assets/{name}', f'{proj}/assets/{name}', dirs_exist_ok=True)
for name in ('gsap.min.js', 'logo-d.png', 'logo-full.png'):
    shutil.copy(f'{HERE}/assets/{name}', f'{proj}/assets/{name}')

STYLE = opts.get('style') or pick_style(plan, [x for x in opts.get('history', '').split(',') if x])
TNAME = {'cinematic': 'cinematic-gold', 'boxed': 'boxed-navy'}.get(STYLE) or pick_theme(plan, [x for x in opts.get('avoid', '').split(',') if x])
TH = THEMES[TNAME]
MIN, MOUT = MOTION[TH['motion']]
MIN = MIN.replace('{T}', str(TH['tilt'])); MOUT = MOUT.replace('{T}', str(TH['tilt']))
NUM = TH['num']

FIX = plan.get('fix', {})
GAP = plan.get('gap', 0.30)      # a silence longer than this is cut
PAD = plan.get('pad', 0.09)      # breath kept on each side of a cut
END = plan.get('endCard', 2.8)
W, H = 1080, 1920
TOP = 150                        # keep clear of the app's top bar
CAP_TOP = 1250                   # captions sit on the chest
CAP_MAX = 290                    # captions never go lower than this (room for the name tag / phone at the bottom)

words = [w for s in words_doc['segments'] for w in s['words']]
for w in words: w['w'] = FIX.get(w['w'], w['w'])

# ---- 1. cuts: source ranges -> clips without long silences ----
clips = []
for a, b in plan['keep']:
    ws = [w for w in words if w['s'] >= a - 0.05 and w['e'] <= b + 0.3]
    if not ws: continue
    cur = [max(a, ws[0]['s'] - PAD), None]
    for i in range(1, len(ws)):
        if ws[i]['s'] - ws[i - 1]['e'] > GAP:
            cur[1] = ws[i - 1]['e'] + PAD; clips.append(tuple(cur)); cur = [ws[i]['s'] - PAD, None]
    cur[1] = min(b, ws[-1]['e'] + PAD + 0.05); clips.append(tuple(cur))
tl_clips = []; t = 0.0
for s, e in clips:
    d = round(e - s, 3); tl_clips.append((round(t, 3), round(s, 3), d)); t += d
BODY = round(t, 3); TOTAL = round(BODY + END, 2)
zooms = plan.get('zooms', [1.0, 1.12])

def T(src):  # source second -> timeline second (snaps into the clip that holds it)
    for st, ss, d in tl_clips:
        if ss <= src <= ss + d: return round(st + (src - ss), 3)
        if src < ss: return st
    return BODY

# ---- picture fix: level the camera, centre him, zoom a little if he is far, brighten a dark face ----
import math
def frame_fix():
    f = (faces or {}).get('fix') or {}; kx = W / (faces or {}).get('w', W); ky = H / (faces or {}).get('h', H)
    ov = plan.get('frameFix', {})
    if ov is False: return dict(r=0.0, dx=0.0, dy=0.0, s=1.0, b=1.0, why='off')
    why = []
    roll = float(f.get('roll', 0)); r = -roll if (0.4 <= abs(roll) <= 5 and f.get('n', 0) >= 12) else 0.0
    if r: why.append(f'level {r:+.1f} deg')
    fh = f.get('fh', 0) * ky; zoom = 1.0
    if fh and fh < 0.15 * H: zoom = min(1.2, 0.17 * H / fh); why.append(f'zoom {zoom:.2f} (far from camera)')
    cx = f.get('cx', W / 2) * kx; top = f.get('top', 0.24 * H) * ky
    b = 1.0; lu = f.get('luma', 128)
    if lu < 105: b = min(1.18, 120 / max(lu, 60)); why.append(f'brighten {b:.2f}')
    elif lu > 205: b = 0.95; why.append('darken 0.95')
    r = float(ov.get('rotate', r)); zoom = float(ov.get('zoom', zoom)); b = float(ov.get('bright', b))
    ox, oy = W / 2, H / 2; rr = math.radians(r)
    def place(s, x, y): return (ox + s * (math.cos(rr) * (x - ox) - math.sin(rr) * (y - oy)), oy + s * (math.sin(rr) * (x - ox) + math.cos(rr) * (y - oy)))
    s = max(zoom, math.cos(abs(rr)) + (H / W) * math.sin(abs(rr)))
    dx = dy = 0.0
    for _ in range(3):   # centre him (if he is more than 3% off), keep his head below the top bar, then grow s to cover the edges
        px, py = place(s, cx, top)
        dx = float(ov['dx']) if 'dx' in ov else (max(-0.09 * W, min(0.09 * W, W / 2 - px)) if abs(W / 2 - px) > 0.03 * W else 0.0)
        dy = float(ov['dy']) if 'dy' in ov else (max(-0.08 * H, 0.30 * H - py) if py > 0.36 * H else (max(0.0, min(0.04 * H, 0.05 * H - py)) if py < 0.05 * H else 0.0))
        s = max(zoom, (math.cos(abs(rr)) + (H / W) * math.sin(abs(rr))) * (1 + 2 * abs(dx) / W) * (1 + 2 * abs(dy) / H))
    if dx: why.append(f'centre {dx:+.0f}px')
    if dy: why.append(f'move {dy:+.0f}px up/down')
    return dict(r=round(r, 2), dx=round(dx, 1), dy=round(dy, 1), s=round(s, 4), b=round(b, 3), why=', '.join(why) or 'none needed')
FF = frame_fix()
def fix_pt(x, y):
    rr = math.radians(FF['r']); ox, oy = W / 2, H / 2
    return (ox + FF['s'] * (math.cos(rr) * (x - ox) - math.sin(rr) * (y - oy)) + FF['dx'], oy + FF['s'] * (math.sin(rr) * (x - ox) + math.cos(rr) * (y - oy)) + FF['dy'])

# ---- face geometry (output pixels, after the picture fix, before any layout move) ----
def face_src(src_t):
    if not faces: return (330, 470, 420, 520)
    i = max(0, min(len(faces['box']) - 1, int(round(src_t / faces['step']))))
    x, y, w, h = faces['box'][i]; kx, ky = W / faces['w'], H / faces['h']
    x, y, w, h = x * kx, y * ky, w * kx, h * ky
    if FF['r'] or FF['s'] != 1 or FF['dx'] or FF['dy']:
        pts = [fix_pt(px, py) for px, py in ((x, y - 0.08 * h), (x + w, y - 0.08 * h), (x, y + h), (x + w, y + h))]
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); t0, t1 = min(p[1] for p in pts), max(p[1] for p in pts)
        h2 = (t1 - t0) / 1.08; return (x0, t0 + 0.08 * h2, x1 - x0, h2)
    return (x, y, w, h)

def face_out(tl_t):
    for k, (st, ss, d) in enumerate(tl_clips):
        if st <= tl_t <= st + d or k == len(tl_clips) - 1:
            z = zooms[k % len(zooms)] + 0.025 * max(0, min(1, (tl_t - st) / d))
            x, y, w, h = face_src(ss + max(0, min(d, tl_t - st)))
            oy, ox = 0.34 * H, W / 2
            top = oy + (y - 0.08 * h - oy) * z; bot = oy + (y + h - oy) * z
            return (ox + (x - ox) * z, top, ox + (x + w - ox) * z, bot)
    return (330, 430, 750, 1000)

def face_span(t0, t1):
    pts = [face_out(t0 + (t1 - t0) * i / 8) for i in range(9)]
    return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[2] for p in pts), max(p[3] for p in pts))

# ---- 2. captions: chunks of up to 3 words, break on punctuation (unchanged look) ----
kept = [w for w in words if any(ss - 0.02 <= w['s'] and w['e'] <= ss + d + 0.25 for _, ss, d in tl_clips)]
chunks, cur = [], []
for w in kept:
    cur.append(w)
    if len(cur) >= plan.get('wordsPerChunk', 4 if STYLE == 'cinematic' else 3) or w['w'][-1:] in '.,?!:' or (cur and w['e'] - cur[0]['s'] > 1.5):
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
GOLD = set(plan.get('goldWords', []))
def esc(x): return html.escape(str(x), quote=True)
cap_html, cap_js = [], []
for i, ch in enumerate(chunks):
    st = T(ch[0]['s']); en = T(chunks[i + 1][0]['s']) if i + 1 < len(chunks) else min(BODY, T(ch[-1]['e']) + 0.4)
    if en - st < 0.25: en = st + 0.25
    spans = []
    for j, w in enumerate(ch):
        cls = 'w gold' if w['w'].strip('.,?!:') in GOLD else 'w'
        spans.append(f'<span class="{cls}" id="c{i}w{j}">{esc(w["w"].rstrip(".,"))}</span>')
    cap_html.append(f'<div class="cap clip" id="c{i}" data-start="{st}" data-duration="{round(en - st, 3)}" data-track-index="20"><div class="capin" id="ci{i}">{" ".join(spans)}</div></div>')
    if STYLE == 'cinematic':   # quiet captions: one phrase, small, soft fade, key word gold (no karaoke)
        cap_js.append(f'tl.fromTo("#ci{i}",{{opacity:0,filter:"blur(6px)"}},{{opacity:1,filter:"blur(0px)",duration:.22,ease:"power1.out"}},{st});'); continue
    if STYLE == 'boxed':       # navy caption box with a gold underline, rises in, no karaoke
        cap_js.append(f'tl.fromTo("#ci{i}",{{y:30,opacity:0}},{{y:0,opacity:1,duration:.2,ease:"power2.out"}},{st});'); continue
    cap_js.append(f'tl.fromTo("#ci{i}",{{y:26,scale:.92,opacity:0}},{{y:0,scale:1,opacity:1,duration:.16,ease:"back.out(2)"}},{st});')
    for j, w in enumerate(ch):
        ws_ = T(w['s']); g = w['w'].strip('.,?!:') in GOLD
        cap_js.append(f'tl.fromTo("#c{i}w{j}",{{color:"#ffffff",scale:1}},{{color:"#FFD45C",scale:1.08,duration:.08}},{ws_});')
        cap_js.append(f'tl.to("#c{i}w{j}",{{color:"{"#FFD45C" if g else "#ffffff"}",scale:1,duration:.12}},{max(ws_ + 0.1, T(w["e"]))});')

# ---- 3. video clips with alternating framing (jump-cut punch-ins) ----
vid_html, vid_js = [], []
for k, (st, ss, d) in enumerate(tl_clips):
    z = zooms[k % len(zooms)]
    vid_html.append(f'<div class="vw" id="w{k}"><video id="v{k}" class="clip" src="assets/take.mp4" data-start="{st}" data-duration="{d}" data-media-start="{ss}" data-track-index="0" playsinline data-has-audio="true"></video></div>')
    vid_js.append(f'tl.fromTo("#w{k}",{{scale:{z}}},{{scale:{round(z + 0.025, 3)},duration:{d},ease:"none"}},{st});')

# ---- 4. overlay beats: markup per kind (panels are laid out later, away from the face) ----
def num(n, extra=''): return f'<span class="num {NUM} hf"{extra}>{esc(n)}</span>'

def thirds_svg(bid):
    v = TH['thirds']
    if v == 'pie':
        return (f'<svg viewBox="0 0 320 320" width="320" height="320"><g id="{bid}h">'
                f'<circle cx="160" cy="160" r="140" style="fill:var(--acc2)"/>'
                f'<path id="{bid}r1" d="M160 160 L160 20 A140 140 0 0 1 281.2 230 Z" style="fill:var(--acc)"/>'
                f'<path id="{bid}r3" d="M160 160 L38.8 230 A140 140 0 0 1 160 20 Z" style="fill:var(--muted)"/>'
                f'<line x1="160" y1="160" x2="160" y2="20" stroke="var(--pnl)" stroke-width="8"/><line x1="160" y1="160" x2="281.2" y2="230" stroke="var(--pnl)" stroke-width="8"/><line x1="160" y1="160" x2="38.8" y2="230" stroke="var(--pnl)" stroke-width="8"/>'
                f'</g></svg>')
    if v == 'bar':
        return (f'<svg viewBox="0 0 640 170" width="640" height="170"><g id="{bid}h">'
                f'<rect id="{bid}r1" x="10" y="20" width="200" height="130" rx="14" style="fill:var(--acc)"/>'
                f'<rect id="{bid}r2" x="220" y="20" width="200" height="130" rx="14" style="fill:var(--acc2)"/>'
                f'<rect id="{bid}r3" x="430" y="20" width="200" height="130" rx="14" style="fill:var(--acc)"/>'
                f'<text x="110" y="108" class="svgt" style="fill:var(--acc-fg)">⅓</text><text x="320" y="108" class="svgt" style="fill:#fff">⅓</text><text x="530" y="108" class="svgt" style="fill:var(--acc-fg)">⅓</text>'
                f'</g></svg>')
    return (f'<svg viewBox="0 0 600 300" width="600" height="300"><g id="{bid}h">'
            f'<path d="M70 140 L300 30 L530 140" fill="none" style="stroke:var(--acc)" stroke-width="14" stroke-linejoin="round"/>'
            f'<rect id="{bid}r1" x="95" y="135" width="137" height="150" rx="6" style="fill:var(--acc2)"/><rect id="{bid}r2" x="232" y="135" width="136" height="150" style="fill:var(--acc)"/><rect id="{bid}r3" x="368" y="135" width="137" height="150" rx="6" style="fill:var(--acc2)"/>'
            f'<text x="163" y="228" class="svgt" style="fill:#fff">⅓</text><text x="300" y="228" class="svgt" style="fill:var(--acc-fg)">⅓</text><text x="437" y="228" class="svgt" style="fill:#fff">⅓</text></g></svg>')

beats = []   # dicts: id, kind, st, en, inner (html of the panel), low (bottom placement), track
sfx = []
def add_sfx(name, at, vol): sfx.append((name, max(0, at), vol))
ov_js = []
for n, b in enumerate(plan['beats']):
    kind = b['kind']; st = T(b['at']) if 'at' in b else b.get('t', 0); en = T(b['to']) if 'to' in b else st + b.get('dur', 2.5)
    if STYLE == 'cinematic' and kind not in ('hook', 'name', 'cta') and en - st > 5.0: en = st + 5.0   # cutaways stay short (2-5 s)
    bid = b['id']; P = f'{bid}P'; d = round(en - st, 3); low = False; inner = ''
    out = f'tl.to("#{P}",{{opacity:0,y:-24,duration:.25,ease:"power2.in"}},{round(en - 0.25, 3)});'
    if kind == 'hook' and STYLE == 'cinematic':   # huge white question, revealed word by word with a soft blur
        lines = [x for x in (b.get('l1'), b.get('l2'), b.get('l3')) if x]; wid = 0; rows = []
        for li, ln in enumerate(lines):
            ws_ = []
            for wd in ln.split():
                g = ' gold' if wd.strip('?.!,') in GOLD or (li == len(lines) - 1 and wd == ln.split()[-1]) else ''
                ws_.append(f'<span class="hw{g}" id="{bid}w{wid}">{esc(wd)}</span>'); wid += 1
            rows.append('<div class="hbl hf">' + ' '.join(ws_) + '</div>')
        inner = f'<div class="hookbig" id="{P}">{"".join(rows)}</div>'
        ov_js += [f'tl.fromTo("#{bid}w{k}",{{opacity:0,filter:"blur(14px)",y:18}},{{opacity:1,filter:"blur(0px)",y:0,duration:.55,ease:"power2.out"}},{round(st + 0.1 + 0.16 * k, 3)});' for k in range(wid)]
        ov_js.append(f'tl.to("#{P}",{{opacity:0,filter:"blur(10px)",duration:.4,ease:"power1.in"}},{round(en - 0.4, 3)});')
        add_sfx('whoosh', st, 0.12)
    elif kind == 'hook' and STYLE == 'boxed':     # wide navy box with a gold bottom line, under the chin (never on the face)
        fs1 = min(84, int(1560 / max(1, len(b['l1'])))); fs2 = min(84, int(1560 / max(1, len(b['l2']))))
        inner = (f'<div class="hookbox pnl" id="{P}"><div class="hb1 hf" id="{bid}a" style="font-size:{fs1}px">{esc(b["l1"])}</div><div class="hb2 hf" id="{bid}b" style="font-size:{fs2}px">{esc(b["l2"])}</div></div>')
        ov_js += [f'tl.fromTo("#{P}",{{y:50,opacity:0}},{{y:0,opacity:1,duration:.45,ease:"power3.out"}},{st});',
                  f'tl.fromTo("#{bid}b",{{x:-40,opacity:0}},{{x:0,opacity:1,duration:.4,ease:"power3.out"}},{round(st + 0.35, 3)});', out]
        add_sfx('whoosh', st, 0.22)
    elif kind == 'name' and STYLE == 'boxed':
        continue   # the boxed style has its own name card all through the video
    elif kind == 'name' and STYLE == 'cinematic':  # small white name beside him, no box
        low = True
        inner = f'<div class="qname" id="{P}"><span class="hf">{esc(b["name"])}</span><i></i><small>{esc(b["role"])}</small></div>'
        ov_js += [f'tl.fromTo("#{P}",{{opacity:0,x:30}},{{opacity:1,x:0,duration:.7,ease:"power2.out"}},{st});',
                  f'tl.to("#{P}",{{opacity:0,duration:.5}},{round(en - 0.5, 3)});']
    elif kind == 'proof':   # a real document from the case, personal details already blurred; full screen, slow zoom to the key line
        fn = os.path.basename(b['img']); shutil.copy(b['img'], f'{proj}/assets/{fn}')
        inner = (f'<div class="proof" id="{P}"><div class="pimgw"><img id="{bid}i" src="assets/{fn}" style="transform-origin:{esc(b.get("focus", "50% 40%"))}"/></div>'
                 f'<div class="pnote">מקרה אמיתי · פרטים מזהים הוסתרו</div>{("<div class=pcap>" + esc(b["caption"]) + "</div>") if b.get("caption") else ""}</div>')
        ov_js += [f'tl.fromTo("#{P}",{{opacity:0,y:40,scale:.94}},{{opacity:1,y:0,scale:1,duration:.55,ease:"power2.out"}},{st});',
                  f'tl.fromTo("#{bid}i",{{scale:1}},{{scale:{b.get("zoom", 1.35)},duration:{max(1.0, d - 0.6)},ease:"sine.inOut"}},{round(st + 0.5, 3)});', out]
        add_sfx('whoosh', st, 0.18)
    elif kind == 'count':   # a big number that counts up (days, years, steps). Never prices, never promised results
        inner = (f'<div class="count pnl" id="{P}"><div class="cnum hf"><span id="{bid}n">0</span>{esc(b.get("suffix", ""))}</div>'
                 f'<div class="clab hf">{esc(b["label"])}</div>{("<div class=csub>" + esc(b["sub"]) + "</div>") if b.get("sub") else ""}</div>')
        n_to = b['n']; dec = 1 if isinstance(n_to, float) and n_to % 1 else 0
        ov_js += [f'tl.fromTo("#{P}",{MIN},{MOUT},{st});',
                  f'(function(){{const o={{v:0}},el=document.getElementById("{bid}n");tl.fromTo(o,{{v:0}},{{v:{n_to},duration:{min(1.2, max(0.5, d - 0.6))},ease:"power2.out",onUpdate:()=>{{el.textContent=o.v.toFixed({dec})}}}},{round(st + 0.15, 3)});}})();', out]
        add_sfx('tick', st + 0.2, 0.25); add_sfx('pop', st + 0.15 + min(1.2, max(0.5, d - 0.6)), 0.28)
    elif kind == 'hook':
        inner = (f'<div class="hook" id="{P}"><div class="pill" id="{bid}p">{esc(b["kicker"])}</div>'
                 f'<div class="big hf" id="{bid}a">{esc(b["l1"])}</div><div class="big acc hf" id="{bid}b">{esc(b["l2"])}</div></div>')
        ov_js += [f'tl.fromTo("#{bid}p",{MIN},{MOUT},{st});',
                  f'tl.fromTo("#{bid}a",{{y:60,opacity:0,scale:.9}},{{y:0,opacity:1,scale:1,duration:.42,ease:"back.out(1.6)"}},{round(st + 0.12, 3)});',
                  f'tl.fromTo("#{bid}b",{{y:60,opacity:0,scale:.9}},{{y:0,opacity:1,scale:1,duration:.42,ease:"back.out(1.6)"}},{round(st + 0.3, 3)});', out]
        add_sfx('hit', st, 0.4); add_sfx('whoosh', st + 0.1, 0.25)
    elif kind == 'name':
        low = True
        inner = (f'<div class="ltbox pnl" id="{P}"><img src="assets/logo-d.png" class="ltlogo"/><div>'
                 f'<div class="ltname hf">{esc(b["name"])}</div><div class="ltrole">{esc(b["role"])}</div></div></div>')
        ov_js += [f'tl.fromTo("#{P}",{{x:420,opacity:0}},{{x:0,opacity:1,duration:.5,ease:"power3.out"}},{st});',
                  f'tl.to("#{P}",{{x:420,opacity:0,duration:.35,ease:"power2.in"}},{round(en - 0.35, 3)});']
        add_sfx('whoosh', st, 0.22)
    elif kind == 'thirds':
        inner = f'<div class="card pnl" id="{P}">{thirds_svg(bid)}<div class="cardt hf">{esc(b["text"])}</div></div>'
        ov_js.append(f'tl.fromTo("#{P}",{MIN},{MOUT},{st});')
        if 'split' in b:
            sp = T(b['split'])
            ov_js += [f'tl.to("#{bid}r1",{{x:24,y:-10,duration:.3,ease:"power3.out"}},{sp});', f'tl.to("#{bid}r3",{{x:-24,y:-10,duration:.3,ease:"power3.out"}},{sp});']
            add_sfx('pop', sp, 0.3)
        ov_js.append(out); add_sfx('pop', st, 0.35)
    elif kind == 'stack':
        rows = ''.join(f'<div class="srow pnl" id="{bid}i{k}">{num(k + 1)}<span>{esc(it["text"])}</span></div>' for k, it in enumerate(b['items']))
        summ = f'<div class="ssum hf" id="{bid}s">{esc(b["summary"])}</div>' if b.get('summary') else ''
        inner = f'<div class="stack" id="{P}">{rows}{summ}</div>'
        for k, it in enumerate(b['items']):
            at = T(it['at']); ov_js.append(f'tl.fromTo("#{bid}i{k}",{MIN},{MOUT},{at});'); add_sfx('pop', at, 0.3)
        if b.get('summary'):
            at = T(b['summaryAt']); ov_js.append(f'tl.fromTo("#{bid}s",{{scale:.6,opacity:0}},{{scale:1,opacity:1,duration:.3,ease:"back.out(2)"}},{at});'); add_sfx('pop', at, 0.35)
        ov_js.append(out)
    elif kind == 'boom':
        inner = f'<div class="boomwrap" id="{P}"><div class="boomt hf" id="{bid}t">{esc(b["text"])}</div></div>'
        ov_js += [f'tl.fromTo("#{bid}f",{{opacity:.7}},{{opacity:0,duration:.6,ease:"power2.out"}},{st});',
                  f'tl.fromTo("#{bid}t",{{scale:1.5,opacity:0,rotation:-6}},{{scale:1,opacity:1,rotation:-3,duration:.28,ease:"power4.out"}},{st});',
                  f'tl.to("#{bid}t",{{x:"+=10",yoyo:true,repeat:5,duration:.04}},{round(st + 0.28, 3)});', out,
                  f'tl.fromTo("#stage",{{scale:1}},{{scale:1.12,duration:.18,ease:"power3.out"}},{st}); tl.to("#stage",{{scale:1,duration:.4,ease:"power2.inOut"}},{round(en, 3)});']
        add_sfx('riser', st - 1.15, 0.25); add_sfx('hit', st, 0.5)
    elif kind == 'title':
        inner = f'<div class="ttl hf" id="{P}"><span class="ttlnum">{esc(b["num"])}</span><span class="ttltxt">{esc(b["text"])}</span></div>'
        ov_js += [f'tl.fromTo("#{P}",{MIN},{MOUT},{st});', out]; add_sfx('whoosh', st, 0.25)
    elif kind == 'option':
        nid = f' id="{bid}n"'
        inner = f'<div class="opt pnl" id="{P}">{num(b["num"], nid)}<div class="optt hf">{esc(b["text"])}</div></div>'
        ov_js += [f'tl.fromTo("#{P}",{MIN},{MOUT},{st});',
                  f'tl.fromTo("#{bid}n",{{scale:0,rotation:-90}},{{scale:1,rotation:0,duration:.4,ease:"back.out(2.2)"}},{round(st + 0.15, 3)});', out]
        add_sfx('whoosh', st, 0.28)
    elif kind == 'stamp':
        inner = (f'<div class="doc" id="{P}"><div class="docl"></div><div class="docl s"></div><div class="docl"></div><div class="docl s"></div><div class="docl"></div>'
                 f'<div class="stampx hf" id="{bid}s">{esc(b["text"])}</div></div>')
        sa = T(b['stampAt']) if 'stampAt' in b else st + 0.45
        ov_js += [f'tl.fromTo("#{P}",{{y:80,opacity:0,rotation:4}},{{y:0,opacity:1,rotation:-2,duration:.4,ease:"power3.out"}},{st});',
                  f'tl.fromTo("#{bid}s",{{scale:3,opacity:0,rotation:-25}},{{scale:1,opacity:1,rotation:-12,duration:.2,ease:"power4.in"}},{sa});', out]
        add_sfx('hit', sa + 0.18, 0.45)
    elif kind == 'term':
        sub = f'<div class="terms" id="{bid}s">{esc(b["sub"])}</div>' if b.get('sub') else ''
        inner = f'<div class="term pnl" id="{P}"><div class="termk">{esc(b["kicker"])}</div><div class="termt hf">{esc(b["text"])}</div>{sub}</div>'
        ov_js += [f'tl.fromTo("#{P}",{MIN},{MOUT},{st});', out]
        if b.get('sub'): ov_js.append(f'tl.fromTo("#{bid}s",{{opacity:0,y:12}},{{opacity:1,y:0,duration:.3}},{T(b["subAt"])});')
        add_sfx('whoosh', st, 0.25)
    elif kind == 'cta' and STYLE == 'cinematic':   # gold outline pill with an arrow
        low = True
        inner = f'<div class="ctaq hf" id="{P}"><span>{esc(b.get("label", "פנו אלינו"))}</span><b>{esc(b["text"])}</b><i>&larr;</i></div>'
        ov_js += [f'tl.fromTo("#{P}",{{opacity:0,y:40}},{{opacity:1,y:0,duration:.6,ease:"power2.out"}},{st});']
        add_sfx('pop', st, 0.2)
    elif kind == 'cta':
        low = True
        inner = (f'<div class="ctab" id="{P}"><svg viewBox="0 0 24 24" width="54" height="54"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg><span>{esc(b["text"])}</span></div>')
        ov_js += [f'tl.fromTo("#{P}",{{y:120,opacity:0}},{{y:0,opacity:1,duration:.4,ease:"back.out(1.6)"}},{st});',
                  f'tl.to("#{P}",{{scale:1.05,yoyo:true,repeat:3,duration:.3,ease:"sine.inOut"}},{round(st + 0.5, 3)});']
        add_sfx('pop', st, 0.35)
    else:
        continue
    full = (STYLE == 'cinematic' and kind not in ('hook', 'name', 'cta') and d >= 1.5) or kind == 'proof'   # proofs are always full screen
    beats.append(dict(id=bid, kind=kind, st=st, en=en, d=d, inner=inner, low=low, track=30 + n, full=full))

# ---- 5. measure the panels in the real fonts (headless Chromium), so the layout knows their size ----
CSS = open(f'{HERE}/reel.css', encoding='utf-8').read()
VARS = ':root{' + ';'.join(f'{k}:{v}' for k, v in TH['v'].items()) + f';--fh:"{TH["fh"]}";--fb:"{TH["fb"]}";--fhw:{TH["fhw"]}}}'
HEAD = f'<meta charset="UTF-8"/><style>{font_css(TH)}\n{VARS}\n{CSS}</style>'
sizes = {}
try:
    from playwright.sync_api import sync_playwright
    mhtml = f'<!doctype html><html lang="he"><head>{HEAD}</head><body><div id="root">' + ''.join(
        f'<div class="ov" style="position:absolute;inset:0"><div class="slot" id="m_{b["id"]}" style="transform:translateX(-50%)">{b["inner"]}</div></div>' for b in beats) + '</div></body></html>'
    open(f'{proj}/_measure.html', 'w', encoding='utf-8').write(mhtml)
    exe = os.environ.get('REEL_CHROME') or next((p for p in ('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',) if os.path.exists(p)), None)
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=exe) if exe else pw.chromium.launch()
        pg = br.new_page(viewport={'width': W, 'height': H})
        pg.goto('file://' + os.path.abspath(f'{proj}/_measure.html')); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        for b in beats:
            r = pg.evaluate(f'(() => {{const r=document.getElementById("m_{b["id"]}").getBoundingClientRect(); return [r.width, r.height]}})()')
            sizes[b['id']] = r
        br.close()
    os.remove(f'{proj}/_measure.html')
except Exception as e:  # fallback estimates
    print('measure fallback:', e, file=sys.stderr)
EST = {'hook': (1000, 380), 'thirds': (680, 420), 'stack': (900, 420), 'boom': (900, 200), 'title': (700, 200), 'option': (940, 175),
       'stamp': (440, 430), 'term': (960, 280), 'name': (640, 140), 'cta': (560, 120), 'count': (700, 420), 'proof': (920, 1300)}
for b in beats: b['w'], b['h'] = sizes.get(b['id'], EST[b['kind']])

# ---- 6. layout: keep every panel off the face ----
# modes: band (fits above the head, maybe a little smaller), push (picture slides down by D), split (picture shrinks to the bottom)
GAPF = 34; SPLIT = 0.6; PUSH_MAX = 430
CAP_Y = {'boxed': 1470, 'cinematic': 1215}.get(STYLE, CAP_TOP)
def chin_fit(b, fb, wfit):
    top = fb + 40; room = CAP_Y - 30 - top
    if room <= 0: return False
    k = min(wfit, room / b['h'])
    if k < 0.72 * wfit: return False
    b.update(mode='chin', s=round(k, 3), y=round(top + max(0, (room - b['h'] * k) / 2)), D=0); return True
for b in beats:
    if b['low']:
        b['mode'] = 'low'; continue
    if b.get('full'):   # cinematic cutaway: the picture is dimmed and blurred behind a full-screen scene, the voice goes on
        k = min(1.0, 960 / b['w'], 1000 / max(b['h'], 1)); b.update(mode='full', s=round(k, 3), y=round((H - b['h'] * k) / 2 - 60)); continue
    if b['kind'] == 'hook' and STYLE == 'boxed':
        fl, ft, fr, fb = face_span(b['st'], b['en']); k = min(1.0, 1000 / b['w'])
        y = fb + 40
        if y + b['h'] * k <= H - 330:
            b.update(mode='chin', s=round(k, 3), y=round(y), D=0); continue
    fl, ft, fr, fb = face_span(b['st'], b['en'])
    if b['kind'] == 'boom': ft = 0.34 * H + (ft - 0.34 * H) * 1.12   # the camera punch lifts the head
    space = ft - GAPF - TOP; wfit = min(1.0, 1000 / b['w'])
    h = b['h'] * wfit   # first make it fit the width, then find room in height
    if h <= space:
        b.update(mode='band', s=wfit, y=TOP + (space - h) / 2, D=0)
    elif h * 0.82 <= space:
        b.update(mode='band', s=round(wfit * space / h, 3), y=TOP, D=0)
    elif h - space <= 260:
        D = h - space + 8; b.update(mode='push', s=wfit, y=TOP, D=round(D))
    elif chin_fit(b, fb, wfit):
        pass   # 15.10.2026: no room above the head -> the graphic sits under the chin (on the chest), the picture stays whole
    elif h - space <= PUSH_MAX:
        D = h - space + 8; b.update(mode='push', s=wfit, y=TOP, D=round(D))
    else:
        ft2 = H - (H - ft) * SPLIT; space2 = ft2 - GAPF - TOP
        k = min(1.0, space2 / h); b.update(mode='split', s=round(wfit * max(k, 0.55), 3), y=TOP + max(0, (space2 - h * k) / 2), D=0, chin=H - (H - fb) * SPLIT)

# frame moves: one state per beat, smooth in/out, no bouncing between close beats
def state(b):
    if b['mode'] == 'push': return {'y': b['D'], 'scale': 1, 'r': 0, 'cap': min(b['D'], CAP_MAX)}
    if b['mode'] == 'split': return {'y': 0, 'scale': SPLIT, 'r': round(44 / SPLIT), 'cap': min(CAP_MAX, b['chin'] + 40 - CAP_TOP)}
    return None
NEUTRAL = {'y': 0, 'scale': 1, 'r': 0, 'cap': 0}
frame_js = []
moving = sorted([b for b in beats if state(b)], key=lambda b: b['st'])
for i, b in enumerate(moving):
    s = state(b); t_in = max(0, b['st'] - 0.3)
    prev = moving[i - 1] if i else None
    if not (prev and b['st'] - prev['en'] < 0.9):
        pass  # coming from neutral
    frame_js.append(f'tl.to("#frame",{{y:{s["y"]},scale:{s["scale"]},borderRadius:{s["r"]},duration:.35,ease:"power2.inOut"}},{round(t_in, 3)});')
    frame_js.append(f'tl.to("#caps",{{y:{round(s["cap"])},duration:.35,ease:"power2.inOut"}},{round(t_in, 3)});')
    nxt = moving[i + 1] if i + 1 < len(moving) else None
    if not (nxt and nxt['st'] - b['en'] < 0.9):
        frame_js.append(f'tl.to("#frame",{{y:0,scale:1,borderRadius:0,duration:.35,ease:"power2.inOut"}},{round(b["en"], 3)});')
        frame_js.append(f'tl.to("#caps",{{y:0,duration:.35,ease:"power2.inOut"}},{round(b["en"], 3)});')

ov_html = []
for b in beats:
    if b['mode'] == 'low':
        style = f'transform:translateX(-50%) scale({round(min(1.0, 1000 / b["w"]), 3)})'; cls = 'slot low'
    else:
        style = f'top:{round(b["y"])}px;transform:translateX(-50%) scale({b["s"]})'; cls = 'slot'
    flash = f'<div class="flash" id="{b["id"]}f"></div>' if b['kind'] == 'boom' else ''
    if b['mode'] == 'full':
        flash = (f'<div class="cutbg" id="{b["id"]}k"></div><svg class="cutline" viewBox="0 0 1080 40" width="1080" height="40"><path id="{b["id"]}g" d="M60 20 H1020" '
                 f'stroke="var(--acc)" stroke-width="3" fill="none" stroke-dasharray="960" stroke-dashoffset="960"/></svg>')
        ov_js.extend([f'tl.fromTo("#{b["id"]}k",{{opacity:0}},{{opacity:1,duration:.45,ease:"power1.out"}},{b["st"]});',
                      f'tl.to("#{b["id"]}g",{{strokeDashoffset:0,duration:.8,ease:"power2.inOut"}},{round(b["st"] + 0.15, 3)});',
                      f'tl.to("#{b["id"]}k",{{opacity:0,duration:.4,ease:"power1.in"}},{round(b["en"] - 0.35, 3)});',
                      f'tl.to("#stage",{{filter:"blur(22px) brightness(.35)",duration:.45,ease:"power1.out"}},{b["st"]});',
                      f'tl.to("#stage",{{filter:"blur(0px) brightness(1)",duration:.4,ease:"power1.in"}},{round(b["en"] - 0.35, 3)});'])
    ov_html.append(f'<div class="ov clip" id="{b["id"]}" data-start="{b["st"]}" data-duration="{b["d"]}" data-track-index="{b["track"]}">{flash}<div class="{cls}" style="{style}">{b["inner"]}</div></div>')

# ---- 6b. style furniture ----
if STYLE == 'boxed':
    topic = plan.get('topic', '')
    ov_html.append(f'''<div class="ov clip" id="bxcard" data-start="0.2" data-duration="{round(BODY - 0.2, 3)}" data-track-index="85">
<div class="bxname pnl" id="bxn"><img src="assets/logo-d.png"/><div><b class="hf">עו״ד יקיר דבול</b><small>משרד עורכי דין · נתניה</small></div></div>
{('<div class="bxtopic hf" id="bxt">' + esc(topic) + '</div>') if topic else ''}</div>''')
    ov_js += ['tl.fromTo("#bxn",{x:200,opacity:0},{x:0,opacity:1,duration:.5,ease:"power3.out"},0.25);',
              'tl.fromTo("#bxt",{x:-200,opacity:0},{x:0,opacity:1,duration:.5,ease:"power3.out"},0.4);' if topic else '']
    busy = []   # the card steps aside while a graphic uses the top of the frame (close graphics are joined into one gap)
    for b in sorted([b for b in beats if b['mode'] in ('band', 'push', 'split')], key=lambda b: b['st']):
        if busy and b['st'] - busy[-1][1] < 1.2: busy[-1][1] = max(busy[-1][1], b['en'])
        else: busy.append([b['st'], b['en']])
    for a0, a1 in busy:
        ov_js += [f'tl.to("#bxcard",{{opacity:0,duration:.2}},{round(max(0, a0 - 0.2), 3)});', f'tl.to("#bxcard",{{opacity:1,duration:.3}},{round(a1, 3)});']
if STYLE == 'cinematic' and plan.get('stages'):
    stg = plan['stages']; n_ = len(stg)
    ticks = ''.join(f'<div class="tlk" style="right:{round(120 + i * 840 / max(1, n_ - 1))}px"><i></i><span>{esc(x["label"])}</span></div>' for i, x in enumerate(stg))
    ov_html.append(f'<div class="ov clip" id="tline" data-start="0" data-duration="{BODY}" data-track-index="86"><div class="tlbar"><div class="tlbase"></div><div class="tlfill" id="tlf"></div>{ticks}<div class="tldot" id="tld"></div></div></div>')
    for i, x in enumerate(stg):
        at = T(x['at']) if 'at' in x else 0; xr = round(i * 840 / max(1, n_ - 1))
        ov_js += [f'tl.to("#tld",{{x:{-xr},duration:.7,ease:"power2.inOut"}},{at});', f'tl.to("#tlf",{{width:{xr},duration:.7,ease:"power2.inOut"}},{at});',
                  f'tl.to("#tline .tlk:nth-child({i + 3})",{{opacity:1,duration:.3}},{at});']
        if i: add_sfx('tick', at, 0.18)

# ---- 7. end card ----
ec = BODY
ov_html.append(f'''<div class="ov clip endc" id="endc" data-start="{ec}" data-duration="{END}" data-track-index="90">
<img src="assets/logo-d.png" id="eclogo" class="eclogo"/>
<div class="ecname hf" id="ecn">יקיר דבול - משרד עורכי דין</div>
<div class="ecline" id="ecl">{esc(plan.get('endLine', 'מקרקעין, ירושה וחלוקת עיזבון · נתניה'))}</div>
<div class="ecphone" id="ecp">09-8613413</div>
<div class="ecweb" id="ecw">dabullaw.co.il</div>
<div class="ecdisc">המידע כללי ואינו ייעוץ משפטי</div></div>''')
ov_js += [f'tl.fromTo("#endc",{{opacity:0}},{{opacity:1,duration:.35}},{ec});',
          f'tl.fromTo("#eclogo",{{scale:.4,opacity:0,rotation:-20}},{{scale:1,opacity:1,rotation:0,duration:.6,ease:"back.out(1.8)"}},{round(ec + 0.1, 3)});',
          f'tl.fromTo("#ecn",{{y:40,opacity:0}},{{y:0,opacity:1,duration:.4}},{round(ec + 0.45, 3)});',
          f'tl.fromTo("#ecl",{{y:30,opacity:0}},{{y:0,opacity:1,duration:.4}},{round(ec + 0.6, 3)});',
          f'tl.fromTo("#ecp",{{scale:.7,opacity:0}},{{scale:1,opacity:1,duration:.4,ease:"back.out(2)"}},{round(ec + 0.8, 3)});',
          f'tl.fromTo("#ecw",{{opacity:0}},{{opacity:1,duration:.4}},{round(ec + 1.0, 3)});']
add_sfx('hit', ec + 0.1, 0.35)

# ---- 8. audio: NO music. Only light sound effects under the voice ----
aud = []
for n, (name, at, vol) in enumerate(sorted(sfx, key=lambda x: x[1])):
    dur = {'whoosh': 0.55, 'pop': 0.16, 'riser': 1.2, 'hit': 1.2, 'tick': 0.06}[name]
    aud.append(f'<audio id="fx{n}" src="assets/sfx/{name}.wav" data-start="{round(at, 3)}" data-duration="{dur}" data-track-index="{61 + n % 6}" data-volume="{vol}"></audio>')

doc = f'''<!doctype html>
<html lang="he" data-resolution="portrait"><head>{HEAD.replace('<meta charset="UTF-8"/>', '<meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/><script src="assets/gsap.min.js"></script>')}</head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920" data-theme="{TNAME}" data-style="{STYLE}">
<div id="bg"></div>
<div id="frame"><div id="stage"><div id="fix" style="position:absolute;inset:0;transform-origin:50% 50%;transform:translate({FF['dx']}px,{FF['dy']}px) rotate({FF['r']}deg) scale({FF['s']}){';filter:brightness(' + str(FF['b']) + ')' if FF['b'] != 1 else ''}">{"".join(vid_html)}</div></div><div class="grade"></div></div>
{"".join(ov_html)}
<div id="caps">{"".join(cap_html)}</div>
<div class="prog"><div class="progf" id="progf"></div></div>
{"".join(aud)}
</div>
<script>
const tl = gsap.timeline({{paused:true}});
{chr(10).join(vid_js)}
{chr(10).join(frame_js)}
{chr(10).join(cap_js)}
{chr(10).join(ov_js)}
tl.fromTo("#progf",{{scaleX:0}},{{scaleX:1,duration:{BODY},ease:"none"}},0);
tl.to(".prog",{{opacity:0,duration:.2}},{BODY});
window.__timelines["main"] = tl;
</script></body></html>'''
open(proj + '/index.html', 'w', encoding='utf-8').write(doc)
print(json.dumps({'sizes': {b['id']: [round(b['w']), round(b['h'])] for b in beats}}), file=sys.stderr)
print(json.dumps({'fix': FF, 'style': STYLE, 'theme': TNAME, 'clips': len(tl_clips), 'body': BODY, 'total': TOTAL, 'captions': len(chunks), 'sfx': len(sfx),
                  'layout': {b['id']: (b['mode'], b.get('s'), b.get('D')) for b in beats}}, ensure_ascii=False))
