#!/usr/bin/env python3
"""Ad 5 'big debts / insolvency' (19.10.2026, Yakir approved: focus on high-value insolvency clients).
Meta personal-attributes policy: never address the viewer as having debts (no 'you have debts?')."""
import pathlib
from gen import CSS, brand, cta_bar, chk, H


def big():
    photo = ('<div class="halo" style="left:-70px;top:420px;width:600px;height:600px"></div>'
             '<div class="ph" style="left:-50px;width:540px"><img src="../img/yakir-cutout.webp"></div>'
             '<div class="plate" style="left:130px;bottom:60px;font-size:28px;padding:16px 26px"><i></i>עו״ד יקיר דבול</div>')
    txt = (brand(64, 56, 30) +
           '<div style="position:absolute;right:64px;width:520px;top:180px">'
           '<span class="tag" style="font-size:26px;padding:10px 22px"><i></i>חוק חדלות פירעון</span>'
           '<div class="h" style="font-size:92px;margin-top:26px">כשהחובות<br>גדולים,<br><em>יש הליך<br>בחוק.</em></div>'
           '<div style="display:grid;gap:22px;margin-top:44px">' +
           chk('כל החובות במסגרת אחת', 32) + chk('מול כל הנושים יחד', 32) + chk('בפיקוח בית המשפט', 32) +
           '</div></div>')
    cta = cta_bar(64, 1150, 36, label='לבדיקת התאמה')
    cta = cta.replace('class="ctab" style="', 'class="ctab" style="flex-direction:column;align-items:flex-start;gap:20px;')
    return photo + txt + cta


html = (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head>'
        f'<body><div class="A f" id="ad">{big()}</div></body></html>')
(H / 'big-f.html').write_text(html, encoding='utf8')
print('ok')
