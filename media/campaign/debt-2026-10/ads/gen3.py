#!/usr/bin/env python3
"""Debt ads round 3 (19.10.2026). Yakir: people scroll fast, the message must land in 2 seconds:
this is about insolvency, and it stops garnishments and restrictions. One dominant line, the word
'חדלות פירעון' big, one strong symbol, one button. Legal mechanism, not a promise (Bar rules);
never 'you have debts' (Meta)."""
from gen2 import CSS, ARR, H

X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
CK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
EXTRA = """
.bar3{position:absolute;right:0;left:0;top:0;background:#F2B544;color:#0D1624;font-weight:900;text-align:center}
.oct{position:absolute;clip-path:polygon(29.3% 0,70.7% 0,100% 29.3%,100% 70.7%,70.7% 100%,29.3% 100%,0 70.7%,0 29.3%);background:#D7261E;display:grid;place-items:center}
.oct .in{position:absolute;inset:16px;clip-path:inherit;background:#fff}
.oct .in2{position:absolute;inset:30px;clip-path:inherit;background:#D7261E;display:grid;place-items:center;color:#fff;font-family:Ru,He,sans-serif;font-weight:900}
.xchip{display:flex;align-items:center;gap:18px;background:#fff;color:#13294B;font-weight:900;border-radius:18px;box-shadow:0 18px 30px -18px rgba(0,0,0,.6)}
.xchip i{flex:none;border-radius:50%;background:#D7261E;color:#fff;display:grid;place-items:center}
.xchip i svg{width:62%;height:62%}
.ck i{background:#2E7D5F}
.fineL{color:#8FA2C0;font-weight:500}
"""
CSS3 = CSS + EXTRA


def wrap(body, cls):
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS3}</style></head>'
            f'<body><div class="A f {cls}" id="ad">{body}</div></body></html>')


def chip(t, fs, ok=False):
    s = int(fs * 1.35)
    return f'<div class="xchip{" ck" if ok else ""}" style="font-size:{fs}px;padding:{int(fs*.45)}px {int(fs*.6)}px"><i style="width:{s}px;height:{s}px">{CK if ok else X}</i>{t}</div>'


def foot(top):
    return (f'<div style="position:absolute;right:64px;left:64px;top:{top}px;display:flex;justify-content:space-between;align-items:center;gap:24px">'
            '<div style="color:#fff;font-size:30px;font-weight:800;line-height:1.2">עו״ד יקיר דבול<span style="display:block;font-size:22px;color:#AFC0DA;font-weight:500;margin-top:6px">נתניה, השרון והמשולש · שיחה דיסקרטית</span></div>'
            f'<span class="pillg" style="font-size:40px;padding:26px 44px;white-space:nowrap">לבדיקה עכשיו{ARR}</span></div>')


FINE = '<div class="fineL" style="position:absolute;right:64px;left:64px;bottom:34px;font-size:21px">מרגע צו פתיחת הליכים. כל מקרה נבחן לגופו.</div>'


def stop():
    return wrap(
        '<div class="bar3" style="font-size:64px;padding:26px 0">חדלות פירעון</div>'
        '<div class="oct" style="right:50%;margin-right:-250px;top:190px;width:500px;height:500px"><div class="in"></div><div class="in2" style="font-size:150px">עצור</div></div>'
        '<div style="position:absolute;right:64px;left:64px;top:730px;display:flex;justify-content:center;gap:18px;flex-wrap:wrap">'
        + chip('עיקולים', 46) + chip('הגבלות', 46) + chip('גבייה', 46) + '</div>'
        '<div class="big" style="position:absolute;right:40px;left:40px;top:880px;text-align:center;font-size:78px;line-height:1.05">ההוצאה לפועל<br><span class="g">נעצרת.</span></div>'
        + foot(1110) + FINE, 'dk')


def strike():
    rows = ''.join(f'<div style="display:flex;align-items:center;gap:26px;font-family:Ru,He,sans-serif;font-weight:900;font-size:128px;line-height:1"><span style="position:relative">{t}'
                   f'<span style="position:absolute;right:-14px;left:-14px;top:50%;height:16px;margin-top:-8px;background:#D7261E;border-radius:8px;transform:rotate(-3deg)"></span></span></div>' for t in ('עיקולים.', 'הגבלות.', 'מכתבים.'))
    return wrap(
        '<div class="bar3" style="font-size:64px;padding:26px 0">חדלות פירעון</div>'
        f'<div style="position:absolute;right:64px;left:64px;top:200px;display:grid;gap:34px;color:#fff">{rows}</div>'
        '<div class="big" style="position:absolute;right:64px;left:64px;top:770px;font-size:96px;line-height:1.02"><span class="g">הליך אחד<br>שעוצר את כולם.</span></div>'
        + foot(1110) + FINE, 'dk')


def face():
    return wrap(
        '<div class="bar3" style="font-size:64px;padding:26px 0">חדלות פירעון</div>'
        '<div class="halo" style="left:-90px;top:420px;width:560px;height:560px;background:radial-gradient(circle at 50% 45%,#2E4D80 0%,#1C3156 70%)"></div>'
        '<div class="ph" style="left:-60px;width:520px;bottom:0"><img src="../img/yakir-cutout.webp"></div>'
        '<div style="position:absolute;right:64px;width:560px;top:190px">'
        '<div class="big" style="font-size:96px;line-height:1">עו״ד<br>לחדלות<br><span class="g">פירעון</span></div>'
        '<div style="display:grid;gap:22px;margin-top:46px">' + chip('עצירת עיקולים', 42, True) + chip('עצירת הגבלות', 42, True) + chip('תכנית תשלום אחת', 42, True) + '</div>'
        '<span class="pillg" style="font-size:40px;padding:26px 44px;margin-top:46px">לבדיקה עכשיו' + ARR + '</span>'
        '<div style="color:#AFC0DA;font-size:24px;margin-top:22px;font-weight:600">נתניה, השרון והמשולש · שיחה דיסקרטית</div></div>'
        + FINE.replace('right:64px;left:64px', 'right:64px;left:auto'), 'dk')


if __name__ == '__main__':
    for k, v in {'v3-stop-f': stop(), 'v3-strike-f': strike(), 'v3-face-f': face()}.items():
        (H / f'{k}.html').write_text(v, encoding='utf8')
    print('ok')
