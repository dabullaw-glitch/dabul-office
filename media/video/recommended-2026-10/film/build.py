# Builds index.html for the recommendations film (22.10.2026). Run: python3 build.py
# 1080x1920, 30 fps, music "Raising Me Higher" (Mixkit free license), cuts on the music beats (about 0.544 s).
import json

W, H = 1080, 1920
TOTAL = 39.0
GOLD = '#C9A24F'

# scene list: (id, start, end, kind, data)
S = [
    ('hook', 0.00, 2.76, 'hook', {}),
    ('g1', 2.76, 6.04, 'review', {'img': 'g-1.jpg', 'w': 913, 'h': 345, 'label': 'ביקורת בגוגל', 'quote': '״יקיר פישט לנו<br>את הכל״', 'chip': ('Google', '4.9', '74 ביקורות')}),
    ('p30', 6.04, 8.22, 'photo', {'img': 'r30-blur.jpg', 'bg': 'r30-bg.jpg', 'ar': 2048 / 1536, 'quote': 'רגע החתימה', 'rot': -2}),
    ('c02', 8.22, 11.49, 'chat', {'img': 'r02.jpg', 'ar': 1.0, 'label': 'הודעות שאנחנו מקבלים', 'quote': '״תודה רבה רבה<br>על הכל״'}),
    ('lr1', 11.49, 14.77, 'review', {'img': 'lr-1.jpg', 'w': 923, 'h': 359, 'label': 'המלצה בלוירוויוז', 'quote': '״יחס של משפחה״', 'chip': ('LawReviews', '5.0', '52 המלצות')}),
    ('p31', 14.77, 16.95, 'photo', {'img': 'r31-blur.jpg', 'bg': 'r31-bg.jpg', 'ar': 1600 / 1200, 'quote': 'עוד עסקה נחתמה', 'rot': 2}),
    ('fb1', 16.95, 20.22, 'review', {'img': 'fb-1.jpg', 'w': 956, 'h': 186, 'label': 'המלצה בפייסבוק', 'quote': '״נתן לנו ביטחון<br>מלא בתהליך״', 'chip': ('Facebook', '100%', 'ממליצים')}),
    ('c21', 20.22, 23.50, 'chat', {'img': 'r21.jpg', 'ar': 1179 / 1633, 'label': 'הודעות שאנחנו מקבלים', 'quote': '״קנינו בית!״'}),
    ('p24', 23.50, 25.63, 'photo', {'img': 'r24-blur.jpg', 'bg': 'r24-bg.jpg', 'ar': 2040 / 1530, 'quote': 'ליווי אישי, פנים אל פנים', 'rot': -1.5}),
    ('mont', 25.63, 28.96, 'montage', {'cards': [('g-2.jpg', 913, 306), ('fb-2.jpg', 956, 222), ('lr-2.jpg', 923, 360), ('g-3.jpg', 900, 346)]}),
    ('c16', 28.96, 31.14, 'chat', {'img': 'r16.jpg', 'ar': 1.0, 'label': 'הרגע שכולם מחכים לו', 'quote': '״מצ״ב אישור<br>רישום בטאבו״'}),
    ('stats', 31.14, 34.41, 'stats', {}),
    ('end', 34.41, TOTAL, 'end', {}),
]
CUTS = [s[1] for s in S[1:]]

STAR = '<svg viewBox="0 0 24 24" class="st"><path d="M12 2.6l2.9 6 6.6.8-4.9 4.6 1.2 6.5L12 17.3 6.2 20.5l1.2-6.5L2.5 9.4l6.6-.8z"/></svg>'
BIGSTARS = STAR.replace('class="st"','class="st" style="width:74px;height:74px"')*5
STARS = '<span class="stars">' + STAR * 5 + '</span>'

css = f"""
@font-face{{font-family:'Heebo';font-weight:700;src:url(assets/fonts/heebo-hebrew-700-normal.woff2) format('woff2'),url(assets/fonts/heebo-latin-700-normal.woff2) format('woff2')}}
@font-face{{font-family:'Heebo';font-weight:800;src:url(assets/fonts/heebo-hebrew-800-normal.woff2) format('woff2')}}
@font-face{{font-family:'Heebo';font-weight:900;src:url(assets/fonts/heebo-hebrew-900-normal.woff2) format('woff2')}}
@font-face{{font-family:'HeeboL';font-weight:700;src:url(assets/fonts/heebo-latin-700-normal.woff2) format('woff2')}}
@font-face{{font-family:'HeeboL';font-weight:800;src:url(assets/fonts/heebo-latin-800-normal.woff2) format('woff2')}}
:root{{--gold:{GOLD};--gold2:#E6CB86;--ink:#F4EFE4;--ground:#111214;--muted:#B9B3A6}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--ground)}}
#root{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:radial-gradient(1200px 900px at 50% 38%,#26221a 0%,#141416 55%,#0d0e10 100%);font-family:'Heebo','HeeboL',sans-serif;color:var(--ink);direction:rtl}}
.scene{{position:absolute;inset:0;overflow:hidden}}
.abs{{position:absolute}}
.label{{position:absolute;top:300px;left:0;right:0;text-align:center;font-weight:700;font-size:34px;letter-spacing:.06em;color:var(--gold)}}
.label i{{display:inline-block;width:46px;height:3px;background:var(--gold);vertical-align:middle;margin:0 18px;font-style:normal}}
.quote{{position:absolute;top:360px;left:60px;right:60px;text-align:center;font-weight:900;font-size:84px;line-height:1.12;color:var(--ink);text-wrap:balance}}
.card{{position:absolute;left:60px;width:960px;background:#fff;border-radius:30px;box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 2px rgba(201,162,79,.55);overflow:hidden;padding:18px 0}}
.card img{{display:block;width:100%;height:auto}}
.chip{{position:absolute;height:76px;padding:0 30px;border-radius:40px;background:rgba(255,255,255,.08);border:2px solid rgba(201,162,79,.7);display:flex;align-items:center;gap:16px;white-space:nowrap;font-weight:800;font-size:34px;color:var(--ink)}}
.chip b{{font-family:'HeeboL','Heebo';font-weight:800;color:#fff}}
.chip .n{{font-family:'HeeboL','Heebo';color:var(--gold2)}}
.chip .sub{{font-weight:700;color:var(--muted);font-size:30px}}
.stars{{display:inline-flex;gap:4px;direction:ltr}}
.st{{width:32px;height:32px;fill:#F5B82E}}
.photo{{position:absolute;left:70px;width:940px;border:14px solid #fff;border-radius:10px;box-shadow:0 40px 90px rgba(0,0,0,.6)}}
.photo img{{display:block;width:100%;height:100%;object-fit:cover}}
.bgimg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.phone{{position:absolute;left:220px;top:620px;width:640px;height:820px;border-radius:56px 56px 0 0;background:#060606;border:3px solid rgba(201,162,79,.8);border-bottom:0;padding:20px 20px 0;-webkit-mask-image:linear-gradient(180deg,#000 62%,rgba(0,0,0,0) 98%);mask-image:linear-gradient(180deg,#000 62%,rgba(0,0,0,0) 98%)}}
.screen{{position:relative;width:100%;height:100%;border-radius:38px 38px 0 0;overflow:hidden;background:#efe7dc}}
.screen img{{position:absolute;left:0;top:0;width:100%;height:auto}}
.pfade{{position:absolute;left:-60px;right:-60px;bottom:-60px;height:340px;background:linear-gradient(180deg,rgba(17,18,20,0),#111214 85%);z-index:4}}
.notch{{position:absolute;top:30px;left:50%;width:150px;height:30px;margin-left:-75px;border-radius:20px;background:#060606;z-index:3}}
.logo{{position:absolute;top:190px;left:50%;width:300px;margin-left:-150px}}
.gline{{position:absolute;left:140px;right:140px;height:3px;background:linear-gradient(90deg,rgba(201,162,79,0),var(--gold),rgba(201,162,79,0))}}
.wipe{{position:absolute;top:-200px;width:1500px;height:2400px;background:linear-gradient(90deg,#b8913f,#E6CB86 45%,#b8913f)}}
.big{{font-family:'HeeboL','Heebo';font-weight:800}}
"""

h = []  # html parts
tl = []  # gsap lines
SETS = []
def add(x): h.append(x)
def T(x): tl.append(x)

def logo_and_line(sid):
    add(f'<img id="{sid}-logo" class="logo" src="assets/img/logo-full.png" alt="">')

add(f'<img id="dmark" class="clip abs" data-start="0" data-duration="{TOTAL}" data-track-index="0" src="assets/img/dmark.png" alt="" style="left:390px;top:1440px;width:300px;opacity:.07">')
for sid, a, b, kind, d in S:
    dur = round(b - a + (0.0 if sid == 'end' else 0.0), 3)
    add(f'<div id="{sid}" class="scene clip" data-start="{a}" data-duration="{dur}" data-track-index="1">')
    if kind == 'hook':
        # floating screenshot cards behind the title, already on screen at frame 0
        floats = [('g-1.jpg', 913, 345, -7, 40, 330), ('lr-2.jpg', 923, 360, 6, 120, 1330), ('fb-1.jpg', 956, 186, -4, 60, 1080)]
        for i, (img, w0, h0, rot, x, y) in enumerate(floats):
            add(f'<div id="hk-f{i}" class="card" style="left:{x}px;top:{y}px;width:{int(w0*0.82)}px;transform-origin:50% 50%;opacity:.38"><img src="assets/img/{img}" alt=""></div>')
            T(f'tl.fromTo("#hk-f{i}",{{rotation:{rot},y:{40 if i%2 else -40},scale:1}},{{rotation:{rot*0.6},y:{-30 if i%2 else 30},scale:1.04,duration:2.76,ease:"none"}},{a});')
        add('<div id="hk-dim" class="abs" style="inset:0;background:radial-gradient(700px 520px at 50% 47%,rgba(13,14,16,.92),rgba(13,14,16,.55))"></div>')
        add(f'<div id="hk-stars" class="abs" style="top:690px;left:0;right:0;display:flex;justify-content:center"><span class="stars" style="gap:12px">{BIGSTARS}</span></div>')
        add('<div id="hk-t1" class="abs" style="top:800px;left:40px;right:40px;text-align:center;font-weight:900;font-size:120px;line-height:1.05">מה הלקוחות<br>שלנו אומרים?</div>')
        add('<div id="hk-gl" class="gline" style="top:1090px"></div>')
        T(f'tl.fromTo("#hk-t1",{{scale:1.0}},{{scale:1.06,duration:2.76,ease:"none"}},{a});')
        T(f'tl.from("#hk-stars .st",{{scale:0.4,opacity:0.25,duration:0.35,stagger:0.09,ease:"back.out(3)"}},{a+0.05});')
        T(f'tl.fromTo("#hk-gl",{{scaleX:0.2}},{{scaleX:1,duration:0.8,ease:"power3.out"}},{a+0.1});')
    elif kind == 'review':
        logo_and_line(sid)
        w0, h0 = d['w'], d['h']
        ch = round(h0 * 960 / w0) + 36
        top = 760
        add(f'<div id="{sid}-lab" class="label"><i></i>{d["label"]}<i></i></div>')
        add(f'<div id="{sid}-q" class="quote">{d["quote"]}</div>')
        p, n, sub = d['chip']
        add(f'<div id="{sid}-chip" class="chip" style="top:{top-110}px;left:0;right:0;margin:0 auto;width:fit-content"><b>{p}</b>{STARS}<span class="n">{n}</span><span class="sub">{sub}</span></div>')
        add(f'<div id="{sid}-card" class="card" style="top:{top}px"><img src="assets/img/{d["img"]}" alt="צילום מסך של המלצה"></div>')
        T(f'tl.from("#{sid}-lab",{{y:-30,opacity:0,duration:0.4,ease:"power2.out"}},{a+0.12});')
        T(f'tl.from("#{sid}-q",{{y:60,opacity:0,duration:0.5,ease:"power3.out"}},{a+0.18});')
        T(f'tl.from("#{sid}-chip",{{scale:0.6,opacity:0,duration:0.45,ease:"back.out(2.2)"}},{a+0.42});')
        T(f'tl.from("#{sid}-chip .st",{{scale:0,duration:0.3,stagger:0.06,ease:"back.out(3)"}},{a+0.55});')
        T(f'tl.from("#{sid}-card",{{y:260,rotation:-3,opacity:0,duration:0.6,ease:"power3.out"}},{a+0.3});')
        T(f'tl.to("#{sid}-card",{{scale:1.035,duration:{dur-0.9:.2f},ease:"none"}},{a+0.9});')
    elif kind == 'photo':
        ph_h = round(940 / d['ar'])
        top = 1300 - ph_h - 60
        add(f'<img id="{sid}-bg" class="bgimg" src="assets/img/{d["bg"]}" alt="">')
        logo_and_line(sid)
        add(f'<div id="{sid}-q" class="quote" style="top:330px;font-size:88px">{d["quote"]}</div>')
        add(f'<div id="{sid}-ph" class="photo" style="top:{top}px;height:{ph_h+28}px"><img id="{sid}-img" src="assets/img/{d["img"]}" alt="לקוחות במשרד"></div>')
        SETS.append(f'gsap.set("#{sid}-ph",{{rotation:{d["rot"]}}});')
        T(f'tl.fromTo("#{sid}-bg",{{scale:1.15}},{{scale:1.0,duration:{dur},ease:"none"}},{a});')
        T(f'tl.from("#{sid}-ph",{{y:180,scale:0.86,opacity:0,duration:0.55,ease:"power3.out"}},{a+0.05});')
        T(f'tl.fromTo("#{sid}-img",{{scale:1.12}},{{scale:1.0,duration:{dur},ease:"none"}},{a});')
        T(f'tl.from("#{sid}-q",{{y:50,opacity:0,duration:0.45,ease:"power3.out"}},{a+0.2});')
    elif kind == 'chat':
        logo_and_line(sid)
        img_h = round(600 / d['ar'])
        add(f'<div id="{sid}-lab" class="label"><i></i>{d["label"]}<i></i></div>')
        add(f'<div id="{sid}-q" class="quote">{d["quote"]}</div>')
        add(f'<div id="{sid}-phone" class="phone"><div class="notch"></div><div class="screen"><img id="{sid}-img" src="assets/img/{d["img"]}" alt="הודעה מלקוח"></div></div>')
        T(f'tl.from("#{sid}-lab",{{y:-30,opacity:0,duration:0.4,ease:"power2.out"}},{a+0.12});')
        T(f'tl.from("#{sid}-q",{{y:60,opacity:0,duration:0.5,ease:"power3.out"}},{a+0.18});')
        T(f'tl.from("#{sid}-phone",{{y:520,duration:0.65,ease:"power3.out"}},{a});')
        scroll = max(0, img_h - 640)
        if scroll:
            T(f'tl.to("#{sid}-img",{{y:-{scroll},duration:{dur-0.9:.2f},ease:"sine.inOut"}},{a+0.7});')
        else:
            T(f'tl.fromTo("#{sid}-img",{{scale:1.0,transformOrigin:"50% 100%"}},{{scale:1.06,duration:{dur},ease:"none"}},{a});')
    elif kind == 'montage':
        logo_and_line(sid)
        add(f'<div id="{sid}-q" class="quote" style="top:330px">ועוד עשרות<br>לקוחות ממליצים</div>')
        add(f'<div id="{sid}-chips" class="abs" style="top:600px;left:0;right:0;display:flex;justify-content:center;gap:18px;font-weight:800;font-size:30px;color:var(--gold2)"><span>Google</span><span>·</span><span>LawReviews</span><span>·</span><span>Facebook</span></div>')
        T(f'tl.from("#{sid}-q",{{y:60,opacity:0,duration:0.45,ease:"power3.out"}},{a+0.1});')
        T(f'tl.from("#{sid}-chips",{{opacity:0,duration:0.4}},{a+0.3});')
        step = 0.68
        for i, (img, w0, h0) in enumerate(d['cards']):
            ch = round(h0 * 960 / w0)
            top = 700 + i * 120
            rot = [-3, 2.5, -1.5, 2][i]
            add(f'<div id="{sid}-c{i}" class="card" style="top:{top}px"><img src="assets/img/{img}" alt="צילום מסך של המלצה"></div>')
            SETS.append(f'gsap.set("#{sid}-c{i}",{{rotation:{rot}}});')
            T(f'tl.from("#{sid}-c{i}",{{x:{-1200 if i%2 else 1200},rotation:{rot*4},duration:0.5,ease:"power3.out"}},{a+0.25+i*step:.2f});')
    elif kind == 'stats':
        add(f'<div id="{sid}-q" class="quote" style="top:300px;font-size:80px">מה אומרים עלינו</div>')
        rows = [('Google', '4.9', '74 ביקורות'), ('LawReviews', '5.0', '52 המלצות'), ('Facebook', '100%', 'ממליצים')]
        for i, (p, n, sub) in enumerate(rows):
            y = 520 + i * 250
            add(f'<div id="{sid}-r{i}" class="abs" style="top:{y}px;left:90px;right:90px;height:210px;border-radius:28px;background:rgba(255,255,255,.06);border:2px solid rgba(201,162,79,.55);display:flex;align-items:center;justify-content:space-between;padding:0 56px">'
                f'<div style="display:flex;flex-direction:column;gap:6px"><span style="font-family:HeeboL,Heebo;font-weight:800;font-size:46px;color:#fff">{p}</span><span style="font-weight:700;font-size:34px;color:var(--muted)">{sub}</span></div>'
                f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><span id="{sid}-n{i}" class="big" style="font-size:104px;line-height:1;color:var(--gold2)">{n}</span>{STARS}</div></div>')
            T(f'tl.from("#{sid}-r{i}",{{x:{900 if i%2==0 else -900},opacity:0,duration:0.5,ease:"power3.out"}},{a+0.25+i*0.3:.2f});')
        T(f'tl.from("#{sid}-q",{{y:-40,opacity:0,duration:0.45,ease:"power2.out"}},{a+0.05});')
    elif kind == 'end':
        add('<div id="end-glow" class="abs" style="inset:0;background:radial-gradient(800px 700px at 50% 40%,rgba(201,162,79,.22),rgba(0,0,0,0) 70%)"></div>')
        add('<img id="end-logo" class="abs" src="assets/img/logo-full.png" alt="" style="top:430px;left:90px;width:900px">')
        add('<div id="end-gl" class="gline" style="top:720px"></div>')
        add('<div id="end-t" class="abs" style="top:780px;left:0;right:0;text-align:center;font-weight:900;font-size:82px;line-height:1.15">יקיר דבול<br><span style="font-weight:700;font-size:56px;color:var(--muted)">משרד עורכי דין · נתניה</span></div>')
        add('<div id="end-ph" class="abs" style="top:1010px;left:50%;width:640px;margin-left:-320px;height:120px;border-radius:60px;background:linear-gradient(90deg,#b8913f,#E6CB86 50%,#b8913f);display:flex;align-items:center;justify-content:center;font-family:HeeboL,Heebo;font-weight:800;font-size:66px;color:#141414;direction:ltr">09-8613413</div>')
        add('<div id="end-d" class="abs" style="top:1200px;left:0;right:0;text-align:center;font-weight:700;font-size:32px;color:var(--muted)">המידע כללי ואינו ייעוץ משפטי</div>')
        T(f'tl.from("#end-logo",{{y:40,opacity:0,duration:0.6,ease:"power3.out"}},{a+0.1});')
        T(f'tl.fromTo("#end-gl",{{scaleX:0}},{{scaleX:1,duration:0.7,ease:"power3.out"}},{a+0.4});')
        T(f'tl.from("#end-t",{{y:50,opacity:0,duration:0.5,ease:"power3.out"}},{a+0.5});')
        T(f'tl.from("#end-ph",{{scale:0.7,opacity:0,duration:0.5,ease:"back.out(2)"}},{a+0.8});')
        T(f'tl.from("#end-d",{{opacity:0,duration:0.5}},{a+1.1});')
        T(f'tl.fromTo("#end-ph",{{scale:1}},{{scale:1.04,duration:0.5,yoyo:true,repeat:5,ease:"sine.inOut"}},{a+1.4});')
    if kind in ('review', 'photo', 'chat', 'montage'):
        T(f'tl.from("#{sid}-logo",{{opacity:0,duration:0.3}},{a});')
    add('</div>')

# gold wipes centred on every cut
for i, c in enumerate(CUTS):
    wid = f'wp{i}'
    st = round(c - 0.24, 3)
    add(f'<div id="{wid}" class="clip abs" data-start="{st}" data-duration="0.5" data-track-index="2" style="inset:0;z-index:20;pointer-events:none"><div id="{wid}-p" class="wipe" style="left:0"></div></div>')
    sign = 1 if i % 2 == 0 else -1
    T(f'tl.fromTo("#{wid}-p",{{x:{1180*sign},skewX:{-12*sign}}},{{x:{-1600*sign},skewX:{-12*sign},duration:0.5,ease:"power2.inOut"}},{st});')

# sound
aud = [f'<audio id="music" class="clip" data-start="0" data-duration="{TOTAL}" data-track-index="10" data-volume="0.75" data-fade-out="2.2" src="assets/music.mp3"></audio>']
for i, c in enumerate(CUTS):
    aud.append(f'<audio id="sw{i}" class="clip" data-start="{max(0, round(c-0.3,3))}" data-duration="0.55" data-track-index="11" data-volume="0.32" src="assets/sfx/whoosh.wav"></audio>')
pops = []
for sid, a, b, kind, d in S:
    if kind in ('review', 'chat'):
        pops.append(a + 0.42)
    if kind == 'montage':
        pops += [a + 0.25 + i * 0.68 for i in range(4)]
    if kind == 'stats':
        pops += [a + 0.25 + i * 0.3 for i in range(3)]
for i, p in enumerate(pops):
    aud.append(f'<audio id="pp{i}" class="clip" data-start="{round(p,3)}" data-duration="0.16" data-track-index="12" data-volume="0.35" src="assets/sfx/pop.wav"></audio>')
aud.append(f'<audio id="endhit" class="clip" data-start="{S[-1][1]+0.1:.3f}" data-duration="1.2" data-track-index="13" data-volume="0.4" src="assets/sfx/hit.wav"></audio>')

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
print('ok', len(html), 'cuts', CUTS)
