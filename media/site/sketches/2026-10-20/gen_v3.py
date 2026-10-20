#!/usr/bin/env python3
"""Round 3 (20.10.2026): home "when do you need a real estate lawyer" as plain text, like the example Yakir sent:
centered heading, short intro, bullet list (linked topic - one line), then "how much" heading and a paragraph."""
from gen import page, write, S
from gen_v2 import AREAS2  # noqa (kept for reference)
def u(p): return S + p
ITEMS = [
 ('קניית דירה יד שנייה', '/%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9E%D7%A7%D7%99%D7%A3-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%99%D7%93-%D7%A9%D7%A0%D7%99%D7%94/', 'בדיקת הנכס בטאבו ובעירייה, עיקולים והערות אזהרה, חוזה מסודר ושמירה על הכסף עד שהדירה רשומה על שמכם.'),
 ('רכישת דירה מקבלן', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%9e%d7%a7%d7%91%d7%9c%d7%9f-2026/', 'בדיקת החוזה והמפרט, ערבויות לפי חוק המכר וליווי עד קבלת המפתח.'),
 ('מכירת דירה', '/comprehensive-guide-selling-apartment-israel-legal-tax-stages/', 'חוזה המכר, סילוק המשכנתא, דיווח לרשות המסים והעברת הזכויות לקונה.'),
 ('מיסוי מקרקעין', '/%d7%9e%d7%99%d7%a1%d7%95%d7%99-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90/', 'מס שבח ומס רכישה, ובדיקה אילו פטורים והקלות מגיעים לכם.'),
 ('פינוי בינוי', '/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/', None),
 ('פירוק שיתוף במקרקעין', '/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%91%d7%9b%d7%99%d7%a0%d7%95%d7%a1-%d7%a0%d7%9b%d7%a1%d7%99%d7%9d-%d7%a4%d7%99%d7%a8%d7%95%d7%a7-%d7%a9%d7%99%d7%aa%d7%95%d7%a3/', 'כשהשותפים בנכס לא מסכימים איך להמשיך, בהסכמה או בהליך בבית המשפט.'),
 ('מכירת דירה שהתקבלה בירושה', '/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%a9%d7%94%d7%aa%d7%a7%d7%91%d7%9c%d7%94-%d7%91%d7%99%d7%a8%d7%95%d7%a9%d7%94/', 'צו ירושה, הסכמה בין היורשים, מיסוי ומכירה מסודרת.'),
]
TAMA = u('/%d7%99%d7%99%d7%a6%d7%95%d7%92-%d7%93%d7%99%d7%99%d7%a8%d7%99%d7%9d-%d7%91%d7%a4%d7%a8%d7%95%d7%99%d7%a7%d7%98-%d7%aa%d7%9e%d7%b4%d7%90-38/')
CSS = """.dwn3-wrap{padding:70px 20px 60px;background:#fff}
.dwn3{max-width:1100px;margin:0 auto;font-family:"Noto Local","Heebo",Arial,sans-serif;color:#4a4740;direction:rtl;text-align:right}
.dwn3 h2{margin:0 0 22px;text-align:center;font-size:38px;line-height:1.25;font-weight:800;color:#141311;text-wrap:balance}
.dwn3 h2+p,.dwn3 p{margin:0 0 22px;font-size:18px;line-height:1.95}
.dwn3 ul{margin:0 0 46px;padding:0 22px 0 0;list-style:none}
.dwn3 li{position:relative;font-size:18px;line-height:1.95;margin:0 0 4px}
.dwn3 li::before{content:"";position:absolute;right:-20px;top:.85em;width:7px;height:7px;border-radius:50%;background:#b8932f}
.dwn3 a{color:#8a6a1f!important;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(184,147,47,.45)}
.dwn3 a:hover{color:#141311!important;border-bottom-color:#141311}
@media (max-width:767px){.dwn3-wrap{padding:44px 16px 36px}.dwn3 h2{font-size:27px;margin-bottom:16px}.dwn3 p,.dwn3 li{font-size:16.5px;line-height:1.85}.dwn3 ul{margin-bottom:34px}}
"""
def block():
    lis = []
    for t, p, d in ITEMS:
        if d is None:
            lis.append(f'<li><a href="{u(p)}">פינוי בינוי</a> ו<a href="{TAMA}">תמ״א 38</a> - ייצוג הדיירים מול היזם, בדיקת ההסכם והבטוחות וליווי לאורך כל הפרויקט.</li>')
        else:
            lis.append(f'<li><a href="{u(p)}">{t}</a> - {d}</li>')
    return f'''<div class="dwn3-wrap"><section class="dwn3" id="dbl-when" aria-labelledby="dwn3-h">
<h2 id="dwn3-h">מתי תצטרכו עורך דין מקרקעין?</h2>
<p>קנייה או מכירה של דירה היא בדרך כלל ההחלטה הכלכלית הגדולה בחיים, ויש בה הרבה שלבים משפטיים: בדיקת הנכס, משא ומתן, חוזה, מיסים ורישום בטאבו. אלה המצבים העיקריים שבהם כדאי שיהיה לצידכם עורך דין מקרקעין:</p>
<ul>{''.join(lis)}</ul>
<h2>כמה עולה עורך דין מקרקעין?</h2>
<p>שכר הטרחה של עורך דין מקרקעין לא קבוע. הוא תלוי בסוג העסקה, בהיקף שלה ובמורכבות. קניית דירה יד שנייה, רכישה מקבלן או ייצוג דיירים בפרויקט התחדשות דורשים היקפי עבודה שונים. כדאי לסכם את שכר הטרחה מראש ובכתב, ולבדוק מה בדיוק כלול בו: בדיקות מקדימות, משא ומתן, ניסוח החוזה, דיווח לרשות המסים ורישום הזכויות.</p>
<p>לפני עסקה אפשר להיעזר גם ב<a href="{u('/calculators/')}">מחשבוני מס רכישה ומס שבח</a> ובצ׳קליסט <a href="{u('/checklist/')}">לפני שקונים דירה יד שנייה</a>.</p>
</section></div>'''
gv = '<div style="opacity:.45;filter:grayscale(1);padding:40px 20px;text-align:center;border-bottom:1px solid #eee;font:700 16px Heebo">החלק הקיים: סרטונים · <u>לכל הסרטונים</u></div>'
gf = '<div style="opacity:.45;filter:grayscale(1);background:#f6f6f9;padding:50px 20px 70px;text-align:center"><div style="font:800 34px Heebo">שאלות ותשובות</div><div style="width:64px;height:3px;background:#999;margin:16px auto 26px"></div><div style="max-width:760px;margin:0 auto;display:grid;gap:12px"><div style="height:54px;background:#fff;border-radius:8px"></div><div style="height:54px;background:#fff;border-radius:8px"></div></div></div>'
write('home-when-v3.html', page('מתי לפנות', CSS, '<div class="lbl">סקיצה 3, גרסה שלישית: כמו הדוגמה ששלחת</div>' + gv + block() + gf))
write('frag-home-when-v3.html', '<style>' + CSS + '</style>\n' + block())
print('ok')
