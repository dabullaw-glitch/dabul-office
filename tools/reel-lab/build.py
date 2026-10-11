"""Reel editor v2 (HyperFrames): builds index.html for one reel from a raw take + word timings + an edit plan.
python3 build.py <plan.json> <words.json> <project_dir>
The plan lists the source ranges to keep (silences inside them are cut out automatically), caption fixes,
and overlay beats anchored to SOURCE seconds. Everything is mapped to the edited timeline here.
"""
import sys, json, html

plan = json.load(open(sys.argv[1], encoding='utf-8'))
words_doc = json.load(open(sys.argv[2], encoding='utf-8'))
proj = sys.argv[3]
FIX = plan.get('fix', {})
GAP = plan.get('gap', 0.30)      # a silence longer than this is cut
PAD = plan.get('pad', 0.09)      # breath kept on each side of a cut
END = plan.get('endCard', 2.8)

words = [w for s in words_doc['segments'] for w in s['words']]
for w in words: w['w'] = FIX.get(w['w'], w['w'])

# ---- 1. cuts: source ranges -> clips without long silences ----
clips = []  # (src_start, src_end)
for a, b in plan['keep']:
    ws = [w for w in words if w['s'] >= a - 0.05 and w['e'] <= b + 0.3]
    if not ws: continue
    cur = [max(a, ws[0]['s'] - PAD), None]
    for i in range(1, len(ws)):
        gap = ws[i]['s'] - ws[i - 1]['e']
        if gap > GAP:
            cur[1] = ws[i - 1]['e'] + PAD; clips.append(tuple(cur)); cur = [ws[i]['s'] - PAD, None]
    cur[1] = min(b, ws[-1]['e'] + PAD + 0.05); clips.append(tuple(cur))
tl_clips = []; t = 0.0
for s, e in clips:
    d = round(e - s, 3); tl_clips.append((round(t, 3), round(s, 3), d)); t += d
BODY = round(t, 3); TOTAL = round(BODY + END, 2)

def T(src):  # source second -> timeline second (snaps into the clip that holds it)
    best = None
    for st, ss, d in tl_clips:
        if ss <= src <= ss + d: return round(st + (src - ss), 3)
        if src < ss and best is None: return st
    return BODY

# ---- 2. captions: chunks of up to 3 words, break on punctuation ----
kept = [w for w in words if any(ss - 0.02 <= w['s'] and w['e'] <= ss + d + 0.25 for _, ss, d in tl_clips)]
chunks, cur = [], []
for w in kept:
    cur.append(w)
    if len(cur) >= plan.get('wordsPerChunk', 3) or w['w'][-1:] in '.,?!:' or (cur and w['e'] - cur[0]['s'] > 1.5):
        chunks.append(cur); cur = []
if cur: chunks.append(cur)
GOLD = set(plan.get('goldWords', []))

def esc(x): return html.escape(x, quote=True)
cap_html, cap_js = [], []
for i, ch in enumerate(chunks):
    st = T(ch[0]['s']); en = T(chunks[i + 1][0]['s']) if i + 1 < len(chunks) else min(BODY, T(ch[-1]['e']) + 0.4)
    if en - st < 0.25: en = st + 0.25
    spans = []
    for j, w in enumerate(ch):
        clean = w['w'].strip('.,?!:')
        cls = 'w gold' if clean in GOLD else 'w'
        spans.append(f'<span class="{cls}" id="c{i}w{j}">{esc(w["w"].rstrip(".,"))}</span>')
    cap_html.append(f'<div class="cap clip" id="c{i}" data-start="{st}" data-duration="{round(en - st, 3)}" data-track-index="20"><div class="capin" id="ci{i}">{" ".join(spans)}</div></div>')
    cap_js.append(f'tl.fromTo("#ci{i}",{{y:26,scale:.92,opacity:0}},{{y:0,scale:1,opacity:1,duration:.16,ease:"back.out(2)"}},{st});')
    for j, w in enumerate(ch):
        ws_ = T(w['s'])
        cap_js.append(f'tl.fromTo("#c{i}w{j}",{{color:"#ffffff",scale:1}},{{color:"#FFD45C",scale:1.08,duration:.08}},{ws_});')
        if j < len(ch) - 1 or True:
            cap_js.append(f'tl.to("#c{i}w{j}",{{color:"{"#FFD45C" if w["w"].strip(".,?!:") in GOLD else "#ffffff"}",scale:1,duration:.12}},{max(ws_ + 0.1, T(w["e"]))});')

# ---- 3. video clips with alternating framing (jump-cut punch-ins) ----
vid_html, vid_js = [], []
zooms = plan.get('zooms', [1.0, 1.12])
for k, (st, ss, d) in enumerate(tl_clips):
    z = zooms[k % len(zooms)]
    vid_html.append(f'<div class="vw" id="w{k}"><video id="v{k}" class="clip" src="assets/take.mp4" data-start="{st}" data-duration="{d}" data-media-start="{ss}" data-track-index="0" playsinline data-has-audio="true"></video></div>')
    vid_js.append(f'tl.fromTo("#w{k}",{{scale:{z}}},{{scale:{round(z + 0.025, 3)},duration:{d},ease:"none"}},{st});')

# ---- 4. overlay beats from the plan (anchored to source seconds) ----
ov_html, ov_js, sfx = [], [], []
def add_sfx(name, src_t, vol=0.6, at=None):
    sfx.append((name, at if at is not None else T(src_t), vol))
for b in plan['beats']:
    kind = b['kind']; st = T(b['at']) if 'at' in b else b.get('t', 0); en = T(b['to']) if 'to' in b else st + b.get('dur', 2.5)
    bid = b['id']; d = round(en - st, 3)
    if kind == 'hook':
        ov_html.append(f'<div class="ov clip hook" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="30"><div class="pill" id="{bid}p">{esc(b["kicker"])}</div><div class="big" id="{bid}a">{esc(b["l1"])}</div><div class="big goldt" id="{bid}b">{esc(b["l2"])}</div></div>')
        ov_js += [f'tl.fromTo("#{bid}p",{{y:-40,opacity:0}},{{y:0,opacity:1,duration:.35,ease:"power3.out"}},{st});',
                  f'tl.fromTo("#{bid}a",{{y:60,opacity:0,scale:.9}},{{y:0,opacity:1,scale:1,duration:.42,ease:"back.out(1.6)"}},{st + 0.12});',
                  f'tl.fromTo("#{bid}b",{{y:60,opacity:0,scale:.9}},{{y:0,opacity:1,scale:1,duration:.42,ease:"back.out(1.6)"}},{st + 0.3});',
                  f'tl.to("#{bid}",{{opacity:0,y:-30,duration:.3,ease:"power2.in"}},{round(en - 0.3, 3)});']
        add_sfx('hit', 0, 0.55, st); add_sfx('whoosh', 0, 0.35, st + 0.1)
    elif kind == 'name':
        ov_html.append(f'<div class="ov clip lower" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="31"><div class="ltbox" id="{bid}x"><img src="assets/logo-d.png" class="ltlogo"/><div><div class="ltname">{esc(b["name"])}</div><div class="ltrole">{esc(b["role"])}</div></div></div></div>')
        ov_js += [f'tl.fromTo("#{bid}x",{{x:-420,opacity:0}},{{x:0,opacity:1,duration:.5,ease:"power3.out"}},{st});',
                  f'tl.to("#{bid}x",{{x:-420,opacity:0,duration:.35,ease:"power2.in"}},{round(en - 0.35, 3)});']
        add_sfx('whoosh', 0, 0.3, st)
    elif kind == 'thirds':
        ov_html.append(f'''<div class="ov clip topcard" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="32"><div class="card" id="{bid}c">
<svg viewBox="0 0 600 300" width="600" height="300"><g id="{bid}h">
<path d="M70 140 L300 30 L530 140" fill="none" stroke="#FFD45C" stroke-width="14" stroke-linejoin="round"/>
<rect id="{bid}r1" x="95" y="135" width="137" height="150" rx="6" fill="#2D5BA8"/><rect id="{bid}r2" x="232" y="135" width="136" height="150" fill="#3F7AD6"/><rect id="{bid}r3" x="368" y="135" width="137" height="150" rx="6" fill="#2D5BA8"/>
<text x="163" y="228" class="svgt">⅓</text><text x="300" y="228" class="svgt">⅓</text><text x="437" y="228" class="svgt">⅓</text></g></svg>
<div class="cardt">{esc(b["text"])}</div></div></div>''')
        ov_js += [f'tl.fromTo("#{bid}c",{{y:-50,opacity:0,scale:.85}},{{y:0,opacity:1,scale:1,duration:.4,ease:"back.out(1.7)"}},{st});']
        for n, r in enumerate(('r1', 'r2', 'r3')):
            ov_js.append(f'tl.fromTo("#{bid}{r}",{{y:0}},{{y:{[-14, 10, -8][n]},duration:.35,ease:"power2.out"}},{round(st + 0.6 + n * 0.12, 3)});')
        if 'split' in b:
            sp = T(b['split'])
            ov_js += [f'tl.to("#{bid}r1",{{x:-26,duration:.3,ease:"power3.out"}},{sp});', f'tl.to("#{bid}r3",{{x:26,duration:.3,ease:"power3.out"}},{sp});']
            add_sfx('pop', 0, 0.45, sp)
        ov_js.append(f'tl.to("#{bid}c",{{opacity:0,y:-40,duration:.3}},{round(en - 0.3, 3)});')
        add_sfx('pop', 0, 0.5, st)
    elif kind == 'stack':
        items = b['items']
        rows = ''.join(f'<div class="srow" id="{bid}i{n}"><span class="snum">{n + 1}</span><span>{esc(it["text"])}</span></div>' for n, it in enumerate(items))
        ov_html.append(f'<div class="ov clip topcard" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="33"><div class="stack">{rows}<div class="ssum" id="{bid}s">{esc(b.get("summary", ""))}</div></div></div>')
        for n, it in enumerate(items):
            at = T(it['at'])
            ov_js.append(f'tl.fromTo("#{bid}i{n}",{{x:300,opacity:0}},{{x:0,opacity:1,duration:.32,ease:"power3.out"}},{at});'); add_sfx('pop', 0, 0.45, at)
        if b.get('summary'):
            at = T(b['summaryAt'])
            ov_js.append(f'tl.fromTo("#{bid}s",{{scale:.6,opacity:0}},{{scale:1,opacity:1,duration:.3,ease:"back.out(2)"}},{at});'); add_sfx('pop', 0, 0.5, at)
        ov_js.append(f'tl.to("#{bid} .stack",{{opacity:0,duration:.25}},{round(en - 0.25, 3)});')
    elif kind == 'boom':
        ov_html.append(f'<div class="ov clip boom" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="34"><div class="flash" id="{bid}f"></div><div class="boomt" id="{bid}t">{esc(b["text"])}</div></div>')
        ov_js += [f'tl.fromTo("#{bid}f",{{opacity:.75}},{{opacity:0,duration:.6,ease:"power2.out"}},{st});',
                  f'tl.fromTo("#{bid}t",{{scale:2.2,opacity:0,rotation:-6}},{{scale:1,opacity:1,rotation:-3,duration:.28,ease:"power4.out"}},{st});',
                  f'tl.to("#{bid}t",{{x:"+=10",yoyo:true,repeat:5,duration:.04}},{round(st + 0.28, 3)});',
                  f'tl.to("#{bid}t",{{opacity:0,scale:.9,duration:.25}},{round(en - 0.25, 3)});']
        # camera punch on the clip that holds this moment
        ov_js.append(f'tl.fromTo("#stage",{{scale:1}},{{scale:1.18,duration:.18,ease:"power3.out"}},{st}); tl.to("#stage",{{scale:1,duration:.4,ease:"power2.inOut"}},{round(en, 3)});')
        add_sfx('riser', 0, 0.35, max(0, st - 1.15)); add_sfx('hit', 0, 0.7, st)
    elif kind == 'title':
        ov_html.append(f'<div class="ov clip topcard" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="35"><div class="ttl" id="{bid}t"><span class="ttlnum">{esc(b["num"])}</span><span class="ttltxt">{esc(b["text"])}</span></div></div>')
        ov_js += [f'tl.fromTo("#{bid}t",{{y:-60,opacity:0,scale:.8}},{{y:0,opacity:1,scale:1,duration:.38,ease:"back.out(1.8)"}},{st});',
                  f'tl.to("#{bid}t",{{opacity:0,y:-30,duration:.25}},{round(en - 0.25, 3)});']
        add_sfx('whoosh', 0, 0.35, st)
    elif kind == 'option':
        ov_html.append(f'<div class="ov clip topcard" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="36"><div class="opt" id="{bid}o"><div class="optn">{esc(b["num"])}</div><div class="optt">{esc(b["text"])}</div></div></div>')
        ov_js += [f'tl.fromTo("#{bid}o",{{x:500,opacity:0}},{{x:0,opacity:1,duration:.36,ease:"power3.out"}},{st});',
                  f'tl.fromTo("#{bid} .optn",{{scale:0,rotation:-90}},{{scale:1,rotation:0,duration:.4,ease:"back.out(2.2)"}},{round(st + 0.15, 3)});',
                  f'tl.to("#{bid}o",{{x:-500,opacity:0,duration:.3,ease:"power2.in"}},{round(en - 0.3, 3)});']
        add_sfx('whoosh', 0, 0.4, st)
    elif kind == 'stamp':
        ov_html.append(f'''<div class="ov clip topcard" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="37"><div class="doc" id="{bid}d">
<div class="docl"></div><div class="docl s"></div><div class="docl"></div><div class="docl s"></div><div class="docl"></div>
<div class="stampx" id="{bid}s">{esc(b["text"])}</div></div></div>''')
        sa = T(b.get('stampAt', b['at'])) if 'stampAt' in b else st + 0.45
        ov_js += [f'tl.fromTo("#{bid}d",{{y:80,opacity:0,rotation:4}},{{y:0,opacity:1,rotation:-2,duration:.4,ease:"power3.out"}},{st});',
                  f'tl.fromTo("#{bid}s",{{scale:3,opacity:0,rotation:-25}},{{scale:1,opacity:1,rotation:-12,duration:.2,ease:"power4.in"}},{sa});',
                  f'tl.to("#{bid}d",{{opacity:0,duration:.25}},{round(en - 0.25, 3)});']
        add_sfx('hit', 0, 0.6, round(sa + 0.18, 3))
    elif kind == 'term':
        ov_html.append(f'<div class="ov clip topcard" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="38"><div class="term" id="{bid}t"><div class="termk">{esc(b["kicker"])}</div><div class="termt">{esc(b["text"])}</div><div class="terms" id="{bid}s">{esc(b.get("sub", ""))}</div></div></div>')
        ov_js += [f'tl.fromTo("#{bid}t",{{clipPath:"inset(0 0 0 100%)"}},{{clipPath:"inset(0 0 0 0%)",duration:.45,ease:"power3.out"}},{st});',
                  f'tl.to("#{bid}t",{{opacity:0,duration:.25}},{round(en - 0.25, 3)});']
        if b.get('sub'):
            ov_js.append(f'tl.fromTo("#{bid}s",{{opacity:0,y:12}},{{opacity:1,y:0,duration:.3}},{T(b["subAt"])});')
        add_sfx('whoosh', 0, 0.35, st)
    elif kind == 'cta':
        ov_html.append(f'<div class="ov clip lower" id="{bid}" data-start="{st}" data-duration="{d}" data-track-index="39"><div class="ctab" id="{bid}c"><svg viewBox="0 0 24 24" width="54" height="54"><path fill="#0E2A57" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg><span>{esc(b["text"])}</span></div></div>')
        ov_js += [f'tl.fromTo("#{bid}c",{{y:120,opacity:0}},{{y:0,opacity:1,duration:.4,ease:"back.out(1.6)"}},{st});',
                  f'tl.to("#{bid}c",{{scale:1.05,yoyo:true,repeat:3,duration:.3,ease:"sine.inOut"}},{round(st + 0.5, 3)});']
        add_sfx('pop', 0, 0.5, st)

# ---- 5. end card ----
ec = BODY
ov_html.append(f'''<div class="ov clip endc" id="endc" data-start="{ec}" data-duration="{END}" data-track-index="50">
<img src="assets/logo-d.png" id="eclogo" class="eclogo"/>
<div class="ecname" id="ecn">יקיר דבול - משרד עורכי דין</div>
<div class="ecline" id="ecl">מקרקעין, ירושה וחלוקת עיזבון · נתניה</div>
<div class="ecphone" id="ecp">09-8613413</div>
<div class="ecweb" id="ecw">dabullaw.co.il</div>
<div class="ecdisc">המידע כללי ואינו ייעוץ משפטי</div></div>''')
ov_js += [f'tl.fromTo("#endc",{{opacity:0}},{{opacity:1,duration:.35}},{ec});',
          f'tl.fromTo("#eclogo",{{scale:.4,opacity:0,rotation:-20}},{{scale:1,opacity:1,rotation:0,duration:.6,ease:"back.out(1.8)"}},{round(ec + 0.1, 3)});',
          f'tl.fromTo("#ecn",{{y:40,opacity:0}},{{y:0,opacity:1,duration:.4}},{round(ec + 0.45, 3)});',
          f'tl.fromTo("#ecl",{{y:30,opacity:0}},{{y:0,opacity:1,duration:.4}},{round(ec + 0.6, 3)});',
          f'tl.fromTo("#ecp",{{scale:.7,opacity:0}},{{scale:1,opacity:1,duration:.4,ease:"back.out(2)"}},{round(ec + 0.8, 3)});',
          f'tl.fromTo("#ecw",{{opacity:0}},{{opacity:1,duration:.4}},{round(ec + 1.0, 3)});']
add_sfx('hit', 0, 0.45, ec + 0.1)

# ---- 6. audio: music bed (ducked under the voice) + effects ----
aud = [f'<audio id="bed" src="assets/sfx/bed.wav" data-start="0" data-duration="{TOTAL}" data-track-index="60" data-volume="1" '
       f'data-automation=\'{{"version":1,"lanes":[{{"target":"volume","points":[{{"t":0,"v":0.0}},{{"t":0.6,"v":0.16}},{{"t":{BODY - 0.2},"v":0.16}},{{"t":{BODY + 0.3},"v":0.45}},{{"t":{TOTAL - 0.6},"v":0.4}},{{"t":{TOTAL},"v":0}}]}}]}}\'></audio>']
for n, (name, at, vol) in enumerate(sorted(sfx, key=lambda x: x[1])):
    dur = {'whoosh': 0.55, 'pop': 0.16, 'riser': 1.2, 'hit': 1.2, 'tick': 0.06}[name]
    aud.append(f'<audio id="fx{n}" src="assets/sfx/{name}.wav" data-start="{round(at, 3)}" data-duration="{dur}" data-track-index="{61 + n % 6}" data-volume="{vol}"></audio>')

CSS = open(__file__.replace('build.py', 'reel.css'), encoding='utf-8').read()
doc = f'''<!doctype html>
<html lang="he" data-resolution="portrait"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="assets/gsap.min.js"></script><style>{CSS}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1080" data-height="1920">
<div id="stage">{"".join(vid_html)}</div><div class="grade"></div>
{"".join(ov_html)}
{"".join(cap_html)}
<div class="prog"><div class="progf" id="progf"></div></div>
{"".join(aud)}
</div>
<script>
const tl = gsap.timeline({{paused:true}});
{chr(10).join(vid_js)}
{chr(10).join(cap_js)}
{chr(10).join(ov_js)}
tl.fromTo("#progf",{{scaleX:0}},{{scaleX:1,duration:{BODY},ease:"none"}},0);
tl.to(".prog",{{opacity:0,duration:.2}},{BODY});
window.__timelines["main"] = tl;
</script></body></html>'''
open(proj + '/index.html', 'w', encoding='utf-8').write(doc)
print(json.dumps({'clips': len(tl_clips), 'body': BODY, 'total': TOTAL, 'captions': len(chunks), 'sfx': len(sfx)}))
