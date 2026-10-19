#!/usr/bin/env python3
"""Debt ads round 2 (19.10.2026). Yakir: the current ads look the same and are boring; wants a totally different look,
a mix of styles, and myth vs fact. Rules: Meta personal attributes (never imply the viewer has debts),
Bar Association (no superlatives, promises, results, free, prices, testimonials)."""
from gen import CSS as BASE, brand, cta_bar, chk, H, ARR, LOCK, CHK

EXTRA = """
@font-face{font-family:Am;font-weight:700;src:url('../fonts/amatic-sc-hebrew-700-normal.woff2')}
@font-face{font-family:Ka;font-weight:700;src:url('../fonts/karantina-hebrew-700-normal.woff2')}
@font-face{font-family:Ka;font-weight:400;src:url('../fonts/karantina-hebrew-400-normal.woff2')}
@font-face{font-family:Ru;font-weight:900;src:url('../fonts/rubik-hebrew-900-normal.woff2')}
.sq{width:1080px;height:1080px}
/* dark */
.dk{background:radial-gradient(900px 700px at 85% 10%,#1F3357 0%,rgba(31,51,87,0) 70%),radial-gradient(700px 600px at 0% 100%,#2A2111 0%,rgba(42,33,17,0) 70%),#0D1624;color:#fff}
.dk .kick{color:#F2B544;font-weight:700}
.dk .big{font-family:Ru,He,sans-serif;font-weight:900;line-height:.98;letter-spacing:-.02em}
.dk .big .g{color:#F2B544}
.dk .line{height:3px;background:linear-gradient(90deg,rgba(242,181,68,0),#F2B544)}
.dk .who b{display:block;font-weight:800}.dk .who span{display:block;color:#AFC0DA;font-weight:500;margin-top:6px}
.pillg{display:inline-flex;align-items:center;gap:16px;background:#F2B544;color:#0D1624;font-weight:900;border-radius:999px}
.pillg svg{width:1em;height:1em}
/* note */
.desk{background:repeating-linear-gradient(90deg,rgba(0,0,0,.025) 0 2px,transparent 2px 9px),radial-gradient(900px 900px at 30% 20%,#D9B98C 0%,#C29A6A 70%,#A97F52 100%)}
.stick{position:absolute;background:linear-gradient(160deg,#FFF3A8,#FFE36E);box-shadow:0 50px 70px -40px rgba(60,35,0,.75),0 2px 0 rgba(0,0,0,.05);font-family:Am,cursive;font-weight:700;color:#23324F}
.stick:before{content:'';position:absolute;top:-26px;left:50%;width:190px;height:52px;margin-left:-95px;background:rgba(255,255,255,.55);transform:rotate(-4deg)}
.todo{display:flex;align-items:center;gap:26px;line-height:1}
.box{flex:none;width:62px;height:62px;border:5px solid #23324F;border-radius:8px;position:relative}
.box.on:after{content:'';position:absolute;left:10px;top:-14px;width:24px;height:48px;border:solid #1E7A4F;border-width:0 9px 9px 0;transform:rotate(40deg)}
.strike{position:relative}.strike:after{content:'';position:absolute;right:-6px;left:-6px;top:52%;height:6px;background:#23324F;border-radius:3px;transform:rotate(-1.5deg);opacity:.75}
.circ{position:relative;color:#B3261E;white-space:nowrap;display:inline-block;padding:0 18px}
.circ svg{position:absolute;left:-34px;top:-30px;width:calc(100% + 68px);height:calc(100% + 60px);overflow:visible}
.card{position:absolute;background:#fff;border-radius:26px;box-shadow:0 40px 70px -36px rgba(40,25,0,.7)}
.av{border-radius:50%;overflow:hidden;background:#F3C46A;flex:none}.av img{width:100%;height:auto;display:block;margin-top:6%}
/* split */
.pan{position:absolute;border-radius:28px;overflow:hidden}
.pan .lab{position:absolute;top:22px;right:24px;font-weight:900;border-radius:999px;padding:8px 22px}
.env{position:absolute;white-space:nowrap;background:#fff;border-radius:10px;box-shadow:0 14px 26px -14px rgba(90,20,10,.55);font-weight:800;color:#7A2E21;display:flex;align-items:center;gap:10px;padding:14px 18px}
.env i{width:30px;height:22px;border:3px solid #C8553D;border-radius:3px;position:relative;flex:none}
.env i:after{content:'';position:absolute;left:3px;right:3px;top:2px;height:9px;border:solid #C8553D;border-width:0 3px 3px 0;transform:skewY(-28deg) rotate(0);display:none}
.fold{position:absolute;background:#fff;border-radius:22px;box-shadow:0 30px 50px -26px rgba(10,60,40,.6)}
.fold .tab{position:absolute;top:-30px;right:34px;background:#2E7D5F;color:#fff;font-weight:800;border-radius:12px 12px 0 0;padding:6px 22px}
/* myths */
.my{background:#0F1E36;color:#fff}
.my .ka{font-family:Ka,He,sans-serif;font-weight:700;line-height:.9}
.mtop{position:absolute;right:0;left:0;top:0;height:50%;background:#FBEDEA;color:#5B1F16}
.mbot{position:absolute;right:0;left:0;bottom:0;height:50%;background:#E6F2EA;color:#123B2B}
.stamp{display:inline-block;font-weight:900;border:6px solid currentColor;border-radius:14px;padding:4px 22px;transform:rotate(-4deg)}
.mtxt{font-weight:800;line-height:1.2}
.cross{text-decoration:line-through;text-decoration-color:#C8553D;text-decoration-thickness:7px}
.num{position:absolute;font-family:Ka,sans-serif;font-weight:700;opacity:.12;line-height:.8}
"""
CSS = BASE + EXTRA
HAND = '<svg viewBox="0 0 400 100" preserveAspectRatio="none"><path d="M20 55 C 30 10, 360 0, 385 45 C 400 85, 120 105, 40 85 C 5 75, 10 40, 60 28" fill="none" stroke="#C8352B" stroke-width="7" stroke-linecap="round"/></svg>'
CRED = 'חבר בוועדת חדלות פירעון והוצאה לפועל בלשכת עורכי הדין'


def wrap(body, cls, fmt):
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head>'
            f'<body><div class="A {fmt} {cls}" id="ad">{body}</div></body></html>')


def dark():
    return wrap(
        '<div style="position:absolute;right:72px;left:72px;top:70px;display:flex;align-items:center;gap:16px;font-size:30px;font-weight:800">'
        '<img src="../img/logo-d.png" style="height:56px;filter:brightness(1.6)"><span>יקיר דבול - משרד עורכי דין</span></div>'
        '<div style="position:absolute;right:72px;left:72px;top:250px">'
        '<div class="kick" style="font-size:38px">מכתבים מההוצאה לפועל לא נעלמים במגירה.</div>'
        '<div class="big" style="font-size:212px;margin-top:40px">להתעלם<br>לא עוזר.<br><span class="g">לבדוק כן.</span></div></div>'
        '<div class="line" style="position:absolute;right:72px;left:72px;top:1040px"></div>'
        '<div style="position:absolute;right:72px;left:72px;top:1080px;display:flex;justify-content:space-between;align-items:center;gap:30px">'
        f'<div class="who" style="font-size:34px"><b>עו״ד יקיר דבול</b><span style="font-size:24px">{CRED}</span></div>'
        f'<span class="pillg" style="font-size:36px;padding:24px 40px;white-space:nowrap">לבדיקה דיסקרטית{ARR}</span></div>'
        f'<div style="position:absolute;right:72px;top:1250px;font-size:24px;color:#8FA2C0;display:flex;gap:10px;align-items:center"><span style="width:26px;height:26px;color:#8FA2C0">{LOCK}</span>שיחה ראשונה, ללא התחייבות. הפרטים נשארים במשרד.</div>',
        'dk', 'f')


def note():
    items = [('on', 'לפתוח את כל המכתבים', 'strike'), ('on', 'לעשות רשימה של התיקים', 'strike'), ('', 'לדבר עם עורך דין', 'circ')]
    rows = ''.join(f'<div class="todo"><span class="box {o}"></span><span class="{c}">{t}{HAND if c == "circ" else ""}</span></div>' for o, t, c in items)
    return wrap(
        '<div class="stick" style="right:90px;top:110px;width:900px;height:760px;transform:rotate(-2.5deg);padding:90px 80px">'
        f'<div style="font-size:120px;margin-bottom:56px">לעשות השבוע:</div><div style="display:grid;gap:52px;font-size:86px">{rows}</div></div>'
        '<div class="card" style="right:70px;left:70px;top:930px;padding:40px 44px;display:flex;align-items:center;gap:34px">'
        '<div class="av" style="width:170px;height:170px"><img src="../img/yakir-cutout.webp"></div>'
        '<div style="flex:1"><div class="h" style="font-size:54px;line-height:1.1">את הצעד השלישי<br>עושים איתנו.</div>'
        f'<div style="font-size:26px;color:#5A6679;margin-top:14px;font-weight:600">עו״ד יקיר דבול · חובות, הוצאה לפועל וחדלות פירעון</div>'
        f'<span class="cta" style="font-size:32px;padding:18px 36px;margin-top:24px">לשיחה דיסקרטית{ARR}</span></div></div>',
        'desk', 'f')


ENVS = [('בנק', 60, 40, -8), ('כרטיס אשראי', 170, 150, 6), ('הלוואה', 40, 260, 4), ('הוצאה לפועל', 150, 370, -6), ('ספק', 70, 480, 9), ('ארנונה', 220, 560, -3)]


def split():
    envs = ''.join(f'<div class="env" style="left:{x}px;top:{y + 90}px;transform:rotate({r}deg);font-size:28px"><i></i>{t}</div>' for t, x, y, r in ENVS)
    return wrap(
        brand(64, 56, 30) +
        '<div style="position:absolute;right:64px;left:64px;top:170px"><div class="h" style="font-size:88px">מערימה של תיקים,<br><em>למסגרת אחת.</em></div></div>'
        f'<div class="pan" style="right:64px;top:440px;width:460px;height:720px;background:#F8E3DD"><span class="lab" style="background:#C8553D;color:#fff;font-size:28px">לפני</span>{envs}</div>'
        '<div style="position:absolute;left:478px;top:760px;width:124px;height:124px;border-radius:50%;background:#13294B;color:#F7D58A;display:grid;place-items:center;z-index:3;box-shadow:0 20px 30px -14px rgba(0,0,0,.5)">'
        f'<span style="width:64px;height:64px">{ARR}</span></div>'
        '<div class="pan" style="left:64px;top:440px;width:460px;height:720px;background:#E2EFE7"><span class="lab" style="background:#2E7D5F;color:#fff;font-size:28px">בהליך חדלות פירעון</span>'
        '<div class="fold" style="left:28px;right:28px;top:200px;padding:44px 30px"><span class="tab" style="font-size:26px">תיק אחד</span>'
        f'<div style="display:grid;gap:30px">{chk("תכנית אחת", 31)}{chk("מול כל הנושים", 31)}{chk("בפיקוח בית משפט", 31)}</div></div></div>'
        + cta_bar(64, 1214, 36, label='לבדיקת התאמה'),
        '', 'f')


MYTHS = [('בחדלות פירעון לוקחים את הבית.', 'דירת מגורים נמכרת רק באישור בית משפט, ורק בתנאים שקובע החוק.'),
         ('זה רק למי שאין לו שום הכנסה.', 'גם שכירים ועצמאים עם הכנסה נכנסים להליך, כשהחובות גדולים מהיכולת לשלם.'),
         ('גם בהליך, ההוצאה לפועל ממשיכה לגבות.', 'מרגע צו פתיחת הליכים, הליכי הגבייה בהוצאה לפועל מעוכבים.'),
         ('זה הליך שלא נגמר אף פעם.', 'ההליך בנוי לתקופה מוגדרת, עם תכנית פירעון, ובסופה אפשר לבקש הפטר.')]


def myths():
    out = {}
    out['myth-0'] = wrap(
        '<div class="num" style="left:40px;top:60px;font-size:900px">4</div>'
        '<div style="position:absolute;right:80px;left:80px;top:90px;display:flex;align-items:center;gap:16px;font-size:30px;font-weight:800">'
        '<img src="../img/logo-d.png" style="height:56px;filter:brightness(1.6)"><span>עו״ד יקיר דבול</span></div>'
        '<div style="position:absolute;right:80px;left:80px;top:250px"><span class="stamp" style="color:#F2B544;font-size:40px">מיתוס מול עובדה</span>'
        '<div class="ka" style="font-size:250px;margin-top:40px">4 דברים<br><span style="color:#F2B544">שלא נכונים</span></div>'
        '<div style="font-size:44px;font-weight:700;margin-top:24px;color:#C9D4E8">על חדלות פירעון</div></div>'
        f'<div style="position:absolute;left:80px;bottom:80px;font-size:34px;font-weight:800;color:#F2B544;display:flex;align-items:center;gap:14px">החליקו<span style="width:40px;height:40px">{ARR}</span></div>',
        'my', 'sq')
    for i, (m, f) in enumerate(MYTHS, 1):
        out[f'myth-{i}'] = wrap(
            f'<div class="mtop"><div class="num" style="left:50px;bottom:-30px;font-size:300px;color:#5B1F16;opacity:.08">{i}</div>'
            f'<div style="position:absolute;right:80px;left:80px;top:70px"><span class="stamp" style="color:#C8553D;font-size:40px">מיתוס</span>'
            f'<div class="mtxt cross" style="font-size:84px;margin-top:40px;line-height:1.15">{m}</div></div></div>'
            '<div class="mbot"><div style="position:absolute;right:80px;left:80px;top:60px"><span class="stamp" style="color:#2E7D5F;font-size:40px;transform:rotate(3deg)">עובדה</span>'
            f'<div class="mtxt" style="font-size:58px;margin-top:34px;font-weight:700">{f}</div></div>'
            '<div style="position:absolute;right:80px;bottom:34px;font-size:22px;color:#4C6B5C;font-weight:600">מידע כללי. כל מקרה נבחן לגופו.</div></div>',
            'my', 'sq')
    out['myth-5'] = wrap(
        '<div class="halo" style="left:-80px;top:330px;width:540px;height:540px"></div>'
        '<div class="ph" style="left:-50px;width:470px;bottom:-60px"><img src="../img/yakir-cutout.webp"></div>'
        '<div style="position:absolute;right:70px;width:540px;top:110px">'
        '<div class="ka" style="font-size:150px">יש עוד<br><span style="color:#F2B544">שאלות?</span></div>'
        '<div style="font-size:40px;font-weight:700;margin-top:30px;line-height:1.3">בשיחה ראשונה עושים סדר: מה פתוח, ואיזה מסלול מתאים.</div>'
        '<div style="font-size:25px;color:#AFC0DA;margin-top:26px;font-weight:500;line-height:1.45">עו״ד יקיר דבול<br>חבר בוועדת חדלות פירעון והוצאה לפועל<br>בלשכת עורכי הדין</div>'
        f'<span class="pillg" style="font-size:34px;padding:22px 38px;margin-top:40px">לבדיקה דיסקרטית{ARR}</span></div>',
        'my', 'sq')
    return out


if __name__ == '__main__':
    pages = {'v2-dark-f': dark(), 'v2-note-f': note(), 'v2-split-f': split()}
    pages.update({f'v2-{k}-q': v for k, v in myths().items()})
    for k, v in pages.items():
        (H / f'{k}.html').write_text(v, encoding='utf8')
    print('ok', len(pages))
