# Builds index.html for the "6 steps from signing to Tabu" film (27.10.2026). Run: python3 build.py
# 1080x1920, 30 fps. Music: Mixkit free track (m33, 123 bpm, a beat every ~0.49 s); each step is 10 beats.
# Photos: real office photos (clients blurred), the portrait and the office door / street. No AI imagery.

W, H = 1080, 1920
BEAT = 0.4925
B0 = 0.53
def beat(n): return round(B0 + n * BEAT, 3)

GOLD, GOLD2, NAVY, NAVY2 = '#C6A03C', '#E7CD96', '#0E1A2E', '#17253F'

STEPS = [
    ('s1', 'מיד אחרי החתימה', 'רושמים הערת אזהרה בטאבו', 'כך אף אחד אחר לא יוכל לקנות<br>את הדירה או לשעבד אותה', 'land', -1.6),
    ('s2', 'לפני כל תשלום', 'בודקים לאן הולך הכסף', 'לחשבון נאמנות, ואם יש משכנתא<br>על הדירה ישירות לבנק של המוכר', 'land', 1.4),
    ('s3', 'בתוך 30 יום', 'מדווחים לרשות המסים', 'מס רכישה אצלכם,<br>מס שבח אצל המוכר', 'port', -1.2),
    ('s4', 'לקראת המסירה', 'אישור עירייה לטאבו', 'המוכר מראה שאין חובות<br>ארנונה והיטל השבחה', 'port', 1.2),
    ('s5', 'ביום המסירה', 'חותמים על פרוטוקול מסירה', 'קוראים מונים ובודקים שהדירה<br>נמסרת כמו שכתוב בחוזה', 'land', -1.4),
    ('s6', 'אחרי המסירה', 'רושמים את הדירה על שמכם', 'בטאבו, בחברה המשכנת או ברשות<br>מקרקעי ישראל. רק אז זה סגור', 'sq', 1.5),
]
RECAP = ['הערת אזהרה', 'תשלום מוגן', 'דיווח למסים', 'אישור עירייה', 'פרוטוקול מסירה', 'רישום על שמכם']

# timeline: hook 8 beats, 6 steps x 10 beats, recap 10 beats, end 10 beats
S = [('hook', 0.0, beat(8))]
for i, st in enumerate(STEPS):
    S.append((st[0], beat(8 + 10 * i), beat(18 + 10 * i)))
S.append(('recap', beat(68), beat(78)))
S.append(('end', beat(78), beat(88)))
TOTAL = S[-1][2]
CUTS = [s[1] for s in S[1:]]

css = f"""
@font-face{{font-family:'Heebo';font-weight:700;src:url(assets/fonts/heebo-hebrew-700-normal.woff2) format('woff2'),url(assets/fonts/heebo-latin-700-normal.woff2) format('woff2')}}
@font-face{{font-family:'Heebo';font-weight:800;src:url(assets/fonts/heebo-hebrew-800-normal.woff2) format('woff2'),url(assets/fonts/heebo-latin-800-normal.woff2) format('woff2')}}
@font-face{{font-family:'Heebo';font-weight:900;src:url(assets/fonts/heebo-hebrew-900-normal.woff2) format('woff2'),url(assets/fonts/heebo-latin-900-normal.woff2) format('woff2')}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:{NAVY}}}
#root{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:{NAVY};font-family:'Heebo',sans-serif;color:#fff;direction:rtl}}
.scene{{position:absolute;inset:0;overflow:hidden}}
.abs{{position:absolute}}
.bg{{position:absolute;inset:-40px;width:{W+80}px;height:{H+80}px;object-fit:cover}}
.shade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,26,46,.55) 0%,rgba(14,26,46,.35) 35%,rgba(14,26,46,.92) 58%,{NAVY} 75%)}}
.prog{{position:absolute;top:118px;left:90px;right:90px;display:flex;gap:14px;direction:rtl}}
.prog i{{flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,.18);font-style:normal;overflow:hidden;position:relative}}
.prog i b{{position:absolute;inset:0;background:{GOLD};transform-origin:100% 50%}}
.plab{{position:absolute;top:150px;left:0;right:0;text-align:center;font-weight:700;font-size:32px;letter-spacing:.04em;color:{GOLD2}}}
.card{{position:absolute;border:12px solid #fff;border-radius:14px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 2px rgba(198,160,60,.6)}}
.card img{{display:block;width:100%;height:100%;object-fit:cover}}
.num{{position:absolute;left:465px;width:150px;height:150px;border-radius:50%;border:5px solid {GOLD};background:{NAVY2};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:78px;color:{GOLD2};box-shadow:0 0 0 12px rgba(198,160,60,.14);direction:ltr}}
.kick{{position:absolute;left:0;right:0;text-align:center;font-weight:800;font-size:40px;color:{GOLD};letter-spacing:.03em}}
.ttl{{position:absolute;left:50px;right:50px;text-align:center;font-weight:900;font-size:80px;line-height:1.08;color:#fff;text-wrap:balance}}
.txt{{position:absolute;left:60px;right:60px;text-align:center;font-weight:700;font-size:46px;line-height:1.35;color:{GOLD2}}}
.gl{{position:absolute;left:440px;width:200px;height:6px;border-radius:3px;background:linear-gradient(90deg,{GOLD},{GOLD2},{GOLD})}}
.wipe{{position:absolute;top:-200px;width:1400px;height:2400px;background:linear-gradient(90deg,rgba(198,160,60,0),{GOLD} 30%,{GOLD2} 50%,{GOLD} 70%,rgba(198,160,60,0))}}
.row{{position:absolute;right:150px;left:150px;height:118px;display:flex;align-items:center;gap:34px;font-weight:800;font-size:58px;color:#fff;border-bottom:2px solid rgba(231,205,150,.22)}}
.ck{{width:74px;height:74px;flex:none;border-radius:50%;background:{GOLD};display:flex;align-items:center;justify-content:center}}
.ck svg{{width:44px;height:44px}}
.rn{{font-weight:900;color:{GOLD2};font-size:44px;width:60px;direction:ltr;text-align:center}}
.pill{{position:absolute;display:flex;align-items:center;justify-content:center;gap:22px;height:120px;border-radius:70px;font-weight:900;font-size:62px;direction:ltr}}
"""

h, tl, SETS = [], [], []
def add(x): h.append(x)
def T(x): tl.append(x)
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#0E1A2E" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>'
PHONE = '<svg viewBox="0 0 24 24" width="58" height="58" fill="#0E1A2E"><path d="M20.1 15.6l-3.3-1.4a1.6 1.6 0 00-1.8.4l-1.3 1.5a12.6 12.6 0 01-5.8-5.8l1.5-1.3a1.6 1.6 0 00.4-1.8L8.4 3.9a1.6 1.6 0 00-1.8-.9L3.6 3.7A1.6 1.6 0 002.4 5.3 16.3 16.3 0 0018.7 21.6a1.6 1.6 0 001.6-1.2l.7-3a1.6 1.6 0 00-.9-1.8z"/></svg>'

# faint D mark across the whole film
add(f'<img id="dmark" class="clip abs" data-start="0" data-duration="{TOTAL}" data-track-index="0" src="assets/img/dmark.png" alt="" style="left:-120px;top:1250px;width:620px;opacity:.05">')

pops, ticks = [], []
for sid, a, b in S:
    dur = round(b - a, 3)
    add(f'<div id="{sid}" class="scene clip" data-start="{a}" data-duration="{dur}" data-track-index="1">')
    if sid == 'hook':
        add(f'<img id="hk-bg" class="bg" src="assets/img/hook-bg.jpg" alt="">')
        add(f'<div class="abs" style="inset:0;background:linear-gradient(180deg,{NAVY} 0%,rgba(14,26,46,.75) 40%,rgba(14,26,46,.2) 100%)"></div>')
        add(f'<img id="hk-cut" class="abs" src="assets/img/yakir-cut.png" alt="" style="left:240px;top:780px;width:600px;height:auto">')
        add(f'<div class="abs" style="left:0;right:0;bottom:0;height:260px;background:linear-gradient(180deg,rgba(14,26,46,0),{NAVY})"></div>')
        add(f'<div id="hk-k" class="kick" style="top:190px">עו״ד יקיר דבול, עורך דין מקרקעין</div>')
        add(f'<div id="hk-t" class="ttl" style="top:270px;font-size:150px">קניתם דירה?</div>')
        add(f'<div id="hk-gl" class="gl" style="top:470px"></div>')
        add(f'<div id="hk-s" class="ttl" style="top:520px;font-size:66px;font-weight:800;color:{GOLD2}">6 שלבים מהחתימה<br>ועד שהיא רשומה על שמכם</div>')
        T(f'tl.fromTo("#hk-bg",{{scale:1.12}},{{scale:1.0,duration:{dur},ease:"none"}},{a});')
        T(f'tl.from("#hk-cut",{{y:420,opacity:0,duration:0.9,ease:"power3.out"}},{a+0.1});')
        T(f'tl.fromTo("#hk-cut",{{scale:1}},{{scale:1.05,transformOrigin:"50% 100%",duration:{dur-1:.2f},ease:"none"}},{a+1});')
        T(f'tl.from("#hk-k",{{y:-30,opacity:0,duration:0.45,ease:"power2.out"}},{a+0.2});')
        T(f'tl.from("#hk-t",{{scale:0.6,opacity:0,duration:0.55,ease:"back.out(2)"}},{beat(0)});')
        T(f'tl.fromTo("#hk-gl",{{scaleX:0}},{{scaleX:1,duration:0.6,ease:"power3.out"}},{beat(1)});')
        T(f'tl.from("#hk-s",{{y:50,opacity:0,duration:0.5,ease:"power3.out"}},{beat(2)});')
        pops.append(beat(0))
    elif sid.startswith('s') and len(sid) == 2:
        i = int(sid[1]) - 1
        _, kick, title, body, shape, rot = STEPS[i]
        if shape == 'land':
            cx, cy, cw, ch = 60, 240, 960, 720
        elif shape == 'port':
            cx, cy, cw, ch = 255, 230, 570, 760
        else:
            cx, cy, cw, ch = 190, 240, 700, 700
        top = cy + ch + 70
        add(f'<img id="{sid}-bg" class="bg" src="assets/img/{sid}-bg.jpg" alt="">')
        add(f'<div class="shade"></div>')
        segs = ''.join(f'<i><b id="{sid}-p{k}" style="transform:scaleX({1 if k < i else 0})"></b></i>' for k in range(6))
        add(f'<div class="prog">{segs}</div>')
        add(f'<div id="{sid}-pl" class="plab">שלב {i+1} מתוך 6</div>')
        add(f'<div id="{sid}-c" class="card" style="left:{cx}px;top:{cy}px;width:{cw}px;height:{ch}px"><img id="{sid}-i" src="assets/img/{sid}.jpg" alt=""></div>')
        add(f'<div id="{sid}-n" class="num" style="top:{top}px">0{i+1}</div>')
        add(f'<div id="{sid}-k" class="kick" style="top:{top+178}px">{kick}</div>')
        add(f'<div id="{sid}-t" class="ttl" style="top:{top+238}px">{title}</div>')
        add(f'<div id="{sid}-x" class="txt" style="top:{top+430}px">{body}</div>')
        SETS.append(f'gsap.set("#{sid}-c",{{rotation:{rot}}});')
        T(f'tl.fromTo("#{sid}-bg",{{scale:1.1}},{{scale:1.0,duration:{dur},ease:"none"}},{a});')
        T(f'tl.from("#{sid}-c",{{y:-260,scale:0.85,opacity:0,duration:0.6,ease:"power3.out"}},{a+0.05});')
        T(f'tl.fromTo("#{sid}-i",{{scale:1.14}},{{scale:1.0,duration:{dur},ease:"none"}},{a});')
        T(f'tl.fromTo("#{sid}-p{i}",{{scaleX:0}},{{scaleX:1,duration:{dur-0.4:.2f},ease:"none"}},{a+0.2});')
        T(f'tl.from("#{sid}-pl",{{opacity:0,duration:0.3}},{a+0.1});')
        T(f'tl.from("#{sid}-n",{{scale:0,rotation:-90,duration:0.5,ease:"back.out(2.4)"}},{a+0.35});')
        T(f'tl.from("#{sid}-k",{{y:30,opacity:0,duration:0.35,ease:"power2.out"}},{a+0.6});')
        T(f'tl.from("#{sid}-t",{{y:60,opacity:0,duration:0.45,ease:"power3.out"}},{a+0.75});')
        T(f'tl.from("#{sid}-x",{{y:40,opacity:0,duration:0.45,ease:"power3.out"}},{a+1.15});')
        pops.append(a + 0.4)
    elif sid == 'recap':
        add(f'<div class="abs" style="inset:0;background:radial-gradient(1100px 900px at 50% 40%,{NAVY2} 0%,{NAVY} 70%)"></div>')
        add(f'<div id="rc-t" class="ttl" style="top:250px;font-size:96px">בקיצור</div>')
        add(f'<div id="rc-gl" class="gl" style="top:375px"></div>')
        for k, lab in enumerate(RECAP):
            add(f'<div id="rc-r{k}" class="row" style="top:{470 + k*150}px"><span class="ck" id="rc-c{k}">{CHECK}</span><span>{lab}</span><span class="rn" style="margin-right:auto">0{k+1}</span></div>')
            T(f'tl.from("#rc-r{k}",{{x:-700,opacity:0,duration:0.38,ease:"power3.out"}},{a+0.3+k*0.33:.3f});')
            T(f'tl.from("#rc-c{k}",{{scale:0,duration:0.3,ease:"back.out(3)"}},{a+0.5+k*0.33:.3f});')
            ticks.append(a + 0.5 + k * 0.33)
        add(f'<div id="rc-f" class="txt" style="top:1420px;font-size:50px">שלב אחד שמדלגים עליו<br>יכול לעלות הרבה כסף</div>')
        T(f'tl.from("#rc-t",{{y:-40,opacity:0,duration:0.4,ease:"power2.out"}},{a+0.05});')
        T(f'tl.fromTo("#rc-gl",{{scaleX:0}},{{scaleX:1,duration:0.5,ease:"power3.out"}},{a+0.2});')
        T(f'tl.from("#rc-f",{{y:40,opacity:0,duration:0.45,ease:"power3.out"}},{a+2.3:.3f});')
    elif sid == 'end':
        add(f'<div class="abs" style="inset:0;background:radial-gradient(1200px 1000px at 50% 75%,#22355a 0%,{NAVY} 65%)"></div>')
        add(f'<img id="end-logo" class="abs" src="assets/img/logo.png" alt="" style="left:190px;top:170px;width:700px;height:auto">')
        add(f'<div id="end-t" class="ttl" style="top:420px;font-size:84px">קונים דירה?</div>')
        add(f'<div id="end-s" class="txt" style="top:540px;font-size:50px;color:#fff">מלווה אתכם בכל שלב,<br>מהבדיקות ועד הטאבו</div>')
        add(f'<img id="end-cut" class="abs" src="assets/img/yakir-cut.png" alt="" style="left:290px;top:820px;width:500px;height:auto">')
        add(f'<div class="abs" style="left:0;right:0;top:1500px;bottom:0;background:linear-gradient(180deg,rgba(14,26,46,0),{NAVY} 30%)"></div>')
        add(f'<div id="end-ph" class="pill" style="left:200px;width:680px;top:1560px;background:linear-gradient(90deg,{GOLD},{GOLD2});color:{NAVY}">{PHONE}<span>09-8613413</span></div>')
        add(f'<div id="end-w" class="kick" style="top:1720px;font-size:46px;color:{GOLD2};direction:ltr">dabullaw.co.il</div>')
        T(f'tl.from("#end-logo",{{y:-40,opacity:0,duration:0.6,ease:"power3.out"}},{a+0.1});')
        T(f'tl.from("#end-t",{{scale:0.7,opacity:0,duration:0.5,ease:"back.out(2)"}},{a+0.4});')
        T(f'tl.from("#end-s",{{y:40,opacity:0,duration:0.45,ease:"power3.out"}},{a+0.75});')
        T(f'tl.from("#end-cut",{{y:500,opacity:0,duration:0.8,ease:"power3.out"}},{a+0.3});')
        T(f'tl.from("#end-ph",{{scale:0.6,opacity:0,duration:0.5,ease:"back.out(2)"}},{a+1.2});')
        T(f'tl.fromTo("#end-ph",{{scale:1}},{{scale:1.04,duration:{BEAT},yoyo:true,repeat:5,ease:"sine.inOut"}},{a+1.8:.3f});')
        T(f'tl.from("#end-w",{{opacity:0,duration:0.5}},{a+1.5});')
    add('</div>')

# gold sweep between scenes
for k, c in enumerate(CUTS):
    wid = f'wp{k}'
    st = round(c - 0.25, 3)
    sign = 1 if k % 2 == 0 else -1
    add(f'<div id="{wid}" class="clip abs" data-start="{st}" data-duration="0.5" data-track-index="2" style="inset:0;z-index:20;pointer-events:none"><div id="{wid}-p" class="wipe" style="left:0"></div></div>')
    T(f'tl.fromTo("#{wid}-p",{{x:{1180*sign},skewX:{-12*sign}}},{{x:{-1600*sign},skewX:{-12*sign},duration:0.5,ease:"power2.inOut"}},{st});')

aud = [f'<audio id="music" class="clip" data-start="0" data-duration="{TOTAL}" data-track-index="10" data-volume="0.8" data-fade-out="2.0" src="assets/music.mp3"></audio>']
for i, c in enumerate(CUTS):
    aud.append(f'<audio id="sw{i}" class="clip" data-start="{max(0, round(c-0.3,3))}" data-duration="0.55" data-track-index="11" data-volume="0.28" src="assets/sfx/whoosh.wav"></audio>')
for i, p in enumerate(pops):
    aud.append(f'<audio id="pp{i}" class="clip" data-start="{round(p,3)}" data-duration="0.16" data-track-index="12" data-volume="0.32" src="assets/sfx/pop.wav"></audio>')
for i, p in enumerate(ticks):
    aud.append(f'<audio id="tk{i}" class="clip" data-start="{round(p,3)}" data-duration="0.2" data-track-index="13" data-volume="0.35" src="assets/sfx/tick.wav"></audio>')
aud.append(f'<audio id="endhit" class="clip" data-start="{S[-1][1]+0.1:.3f}" data-duration="1.2" data-track-index="14" data-volume="0.4" src="assets/sfx/hit.wav"></audio>')

html = f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<script src="assets/gsap.min.js"></script>
<style>{css}</style>
</head>
<body>
<div id="root" data-composition-id="root" data-width="{W}" data-height="{H}" data-start="0" data-duration="{TOTAL}">
{chr(10).join(h)}
{chr(10).join(aud)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
{chr(10).join(SETS)}
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tl)}
tl.set({{}}, {{}}, {TOTAL});
window.__timelines["root"] = tl;
</script>
</body>
</html>
"""
open('index.html', 'w').write(html)
print('ok', len(html), 'total', TOTAL, 'cuts', CUTS)
