#!/usr/bin/env python3
"""Debt ads round 4 (19.10.2026). Yakir rejected rounds 2-3 designs and sent competitor examples he likes:
big real photo, premium dark+gold or bold red, condensed heavy headline, short bullets, big button.
Concepts: OUT/IN (his idea), premium gold with photo, year-end (סוף שנה) timing.
Bar rules: mechanism of law, no promises; Meta: never 'you have debts'."""
from gen2 import CSS as B2, H

EXTRA = """
.gold{background:linear-gradient(180deg,#FFF1C2 0%,#F4C960 38%,#C8932F 70%,#F7D98A 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.K{font-family:Ka,He,sans-serif;font-weight:700;line-height:.92;letter-spacing:-.005em}
.L{font-family:He,sans-serif;font-weight:900;letter-spacing:-.02em;line-height:.8}
.cut{position:absolute;bottom:0}.cut img{display:block;width:100%;height:auto}
.btn-g{display:flex;align-items:center;justify-content:center;gap:16px;border-radius:16px;font-weight:900;color:#1A1205;
 background:linear-gradient(180deg,#FBE3A0,#E7B44E 55%,#C99332);box-shadow:0 18px 36px -16px rgba(0,0,0,.7),inset 0 2px 0 rgba(255,255,255,.6)}
.gl{display:flex;align-items:center;gap:18px;font-weight:800;color:#fff;white-space:nowrap}
.gl i{flex:none;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#FBE3A0,#C99332);color:#1A1205}
.gl i svg{width:60%;height:60%}
.rule{height:2px;background:linear-gradient(90deg,rgba(231,180,78,0),#E7B44E,rgba(231,180,78,0))}
.pill-o{display:inline-block;border:2px solid #E7B44E;border-radius:999px;color:#F4D58A;font-weight:800}
.plus{display:flex;align-items:center;gap:16px;font-weight:900;color:#fff}
.plus i{flex:none;border-radius:50%;background:#F08A7E;color:#7A1414;display:grid;place-items:center;font-style:normal;font-weight:900}
"""
CSS = B2 + EXTRA
CK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
ARRL = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
PHOTO = '../img/yakir-cutout.webp'


def page(body, bg):
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head>'
            f'<body><div class="A f" id="ad" style="background:{bg}">{body}</div></body></html>')


def gl(t, fs):
    s = int(fs * 1.3)
    return f'<div class="gl" style="font-size:{fs}px"><i style="width:{s}px;height:{s}px">{CK}</i>{t}</div>'


def outin():
    strike = 'text-decoration:line-through;text-decoration-color:#FF5A4E;text-decoration-thickness:6px'
    top = ('<div style="position:absolute;right:0;left:0;top:0;height:640px;background:linear-gradient(160deg,#5A0F12,#2A0709)"></div>'
           '<div class="L" style="position:absolute;right:56px;top:70px;font-size:250px;color:#FF5A4E">OUT</div>'
           f'<div style="position:absolute;right:60px;top:345px;display:grid;gap:8px;color:#F6D6D3;font-weight:900;font-size:58px;z-index:4">'
           f'<span style="{strike}">עיקולים</span><span style="{strike}">הגבלות</span><span style="{strike}">מרדף הנושים</span></div>')
    bot = ('<div style="position:absolute;right:0;left:0;top:640px;bottom:0;background:linear-gradient(160deg,#0E2A22,#06140F)"></div>'
           '<div class="L gold" style="position:absolute;right:56px;top:690px;font-size:250px;z-index:4">IN</div>'
           '<div style="position:absolute;right:60px;top:960px;display:grid;gap:18px;z-index:4">' + gl('עיכוב הליכים', 50) + gl('תכנית תשלום אחת', 50) + '</div>')
    head = ('<div style="position:absolute;left:56px;top:56px;text-align:left;z-index:4">'
            '<div class="K" style="font-size:96px;color:#fff;text-align:right">חדלות<br>פירעון</div></div>')
    photo = (f'<div class="cut" style="left:-20px;width:470px;bottom:150px;z-index:3;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6))"><img src="{PHOTO}"></div>'
             '<div style="position:absolute;left:0;right:0;bottom:150px;height:160px;background:linear-gradient(180deg,rgba(6,20,15,0),#06140F);z-index:3"></div>')
    cta = ('<div style="position:absolute;right:0;left:0;bottom:0;height:150px;background:#06140F;z-index:4"></div>'
           f'<div class="btn-g" style="position:absolute;right:56px;left:56px;bottom:34px;height:90px;font-size:42px;z-index:5">השאירו פרטים לבדיקה{ARRL}</div>')
    return page(top + bot + photo + head + cta, '#06140F')


def premium():
    bg = 'radial-gradient(800px 900px at 15% 40%,#2A3550 0%,rgba(42,53,80,0) 60%),linear-gradient(160deg,#151B28,#07090E)'
    photo = (f'<div class="cut" style="left:-50px;width:560px;bottom:0;filter:drop-shadow(-10px 0 30px rgba(231,180,78,.25))"><img src="{PHOTO}"></div>'
             '<div style="position:absolute;left:470px;top:60px;width:3px;height:520px;background:linear-gradient(#E7B44E,rgba(231,180,78,0));transform:rotate(18deg);opacity:.6"></div>')
    txt = ('<div style="position:absolute;right:56px;width:560px;top:64px;text-align:center">'
           '<img src="../img/logo-d.png" style="height:96px">'
           '<div style="display:flex;align-items:center;gap:14px;justify-content:center;color:#E8DCC0;font-size:30px;font-weight:600;margin-top:6px"><span class="rule" style="width:70px"></span>עו״ד יקיר דבול<span class="rule" style="width:70px"></span></div>'
           '<span class="pill-o" style="font-size:30px;padding:8px 26px;margin-top:26px">לבעלי חובות מעל 100,000 ₪</span>'
           '<div class="K" style="font-size:138px;margin-top:26px;color:#fff">עיכוב הליכים</div>'
           '<div class="K gold" style="font-size:138px">בהוצאה לפועל</div>'
           '<div class="rule" style="margin:30px 20px"></div>'
           '<div style="display:grid;gap:20px;justify-items:start;padding-right:30px">' + gl('עצירת עיקולים', 38) + gl('תכנית אחת מול כל הנושים', 38) + gl('פגישה בנתניה או בזום', 38) + '</div>'
           '<div style="margin-top:34px;color:#E8DCC0;font-size:26px;font-weight:600;line-height:1.4">חבר בוועדת חדלות פירעון והוצאה לפועל<br>בלשכת עורכי הדין</div></div>'
           f'<div class="btn-g" style="position:absolute;right:56px;width:560px;bottom:60px;height:100px;font-size:46px">השאירו פרטים עכשיו{ARRL}</div>')
    return page(photo + txt, bg)


def yearend():
    bg = 'radial-gradient(900px 900px at 80% 20%,#B3262B 0%,rgba(179,38,43,0) 70%),linear-gradient(170deg,#8E1B1F,#4E0B0E)'
    photo = f'<div class="cut" style="left:-90px;width:500px;bottom:0;filter:drop-shadow(0 20px 40px rgba(0,0,0,.5))"><img src="{PHOTO}"></div>'
    cal = ('<div style="position:absolute;right:60px;top:70px;width:200px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 24px 40px -18px rgba(0,0,0,.6);text-align:center;transform:rotate(4deg)">'
           '<div style="background:#1A1A1A;color:#fff;font-weight:800;font-size:30px;padding:10px 0">דצמבר</div>'
           '<div class="L" style="font-size:120px;color:#B3262B;padding:20px 0 14px">31</div></div>')
    txt = ('<div style="position:absolute;right:60px;width:600px;top:330px">'
           '<div class="K" style="font-size:150px;color:#fff">סוף שנה.</div>'
           '<div class="K" style="font-size:118px;color:#FFD9D4;margin-top:6px">הזמן להסדר<br>מול הבנקים.</div>'
           '<div style="display:grid;gap:22px;margin-top:44px">'
           + ''.join(f'<div class="plus" style="font-size:38px;white-space:nowrap"><i style="width:50px;height:50px;font-size:38px">+</i>{t}</div>' for t in ('עיכוב הליכים בהוצאה לפועל', 'עצירת עיקולים', 'הסדר מול הבנקים והנושים')) +
           '</div></div>'
           '<div style="position:absolute;right:0;left:0;bottom:0;height:150px;background:#F08A7E;display:flex;align-items:center;justify-content:center;gap:22px">'
           f'<span class="K" style="font-size:84px;color:#4E0B0E">בדיקה ראשונה, ללא התחייבות</span></div>'
           '<div style="position:absolute;left:40px;top:60px;color:#fff;text-align:left;font-weight:800;font-size:28px;line-height:1.25">עו״ד יקיר דבול<br><span style="font-weight:500;color:#FFD9D4;font-size:24px">חדלות פירעון והסדרי חובות</span></div>')
    return page(photo + cal + txt, bg)


if __name__ == '__main__':
    for k, v in {'v4-outin-f': outin(), 'v4-premium-f': premium(), 'v4-yearend-f': yearend()}.items():
        (H / f'{k}.html').write_text(v, encoding='utf8')
    print('ok')
