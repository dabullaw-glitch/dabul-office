#!/usr/bin/env python3
"""Round 4 (20.10.2026): same approved text as round 3, with a little design: kicker + divider, items in two columns
with small gold numbers, and the "how much" part in a soft framed box with two small buttons."""
from gen import page, write, S
from gen_v3 import ITEMS, TAMA, gv, gf
def u(p): return S + p
ITEMS4 = ITEMS + [('רישום בטאבו ובית משותף', '/land-registry-title-registration/', 'רישום הזכויות על שמכם, תיקון טעויות ברישום ורישום בית משותף.')]
CSS = """.dwn4-wrap{padding:72px 20px 64px;background:#fff}
.dwn4{--g:#b8932f;--g2:#d9c08a;--g3:#f0e2bd;--ink:#141311;--txt:#4a4740;--line:#eee6d3;max-width:1140px;margin:0 auto;font-family:"Noto Local","Heebo",Arial,sans-serif;color:var(--txt);direction:rtl;text-align:right}
.dwn4 *{box-sizing:border-box}
.dwn4 .hd{text-align:center;max-width:860px;margin:0 auto 34px}
.dwn4 .k{display:inline-flex;align-items:center;gap:10px;color:var(--g);font-size:14px;font-weight:800;letter-spacing:.04em;margin:0 0 10px}
.dwn4 .k::before,.dwn4 .k::after{content:"";width:26px;height:2px;background:var(--g)}
.dwn4 h2{margin:0;font-size:38px;line-height:1.25;font-weight:800;color:var(--ink);text-wrap:balance}
.dwn4 .hd p{margin:16px 0 0;font-size:18px;line-height:1.85}
.dwn4 ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:44px;counter-reset:w}
.dwn4 li{counter-increment:w;display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:14px;padding:18px 0;border-top:1px solid var(--line);font-size:16.5px;line-height:1.75}
.dwn4 li:nth-child(-n+2){border-top:0}
.dwn4 li::before{content:"0" counter(w);grid-row:span 2;width:40px;height:40px;border-radius:50%;border:1.5px solid var(--g2);color:var(--g);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;margin-top:2px}
.dwn4 li a{justify-self:start;color:var(--ink)!important;font-size:18px;font-weight:800;text-decoration:none;border-bottom:2px solid var(--g3);transition:border-color .2s}
.dwn4 li a:hover{border-bottom-color:var(--g)}
.dwn4 li a.in{font-size:inherit;font-weight:800}
.dwn4 li span{display:block}
.dwn4 .fee{margin-top:30px;background:#faf7f0;border:1px solid var(--line);border-radius:22px;padding:30px 34px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 34px;align-items:center}
.dwn4 .fee h2{font-size:28px;text-align:right}
.dwn4 .fee p{margin:0;font-size:17px;line-height:1.85;grid-column:1}
.dwn4 .fee .b{grid-column:2;grid-row:1/span 2;display:flex;flex-direction:column;gap:10px}
.dwn4 .fee .b a{display:inline-flex;justify-content:center;align-items:center;border-radius:99px;padding:12px 22px;font-weight:800;font-size:15.5px;text-decoration:none;white-space:nowrap}
.dwn4 .fee .b .p{background:linear-gradient(135deg,var(--g3),var(--g));color:#1c1b19!important}
.dwn4 .fee .b .s{border:1.5px solid var(--g);color:#7c5f1c!important;background:#fff}
@media (max-width:900px){.dwn4-wrap{padding:0 16px 40px;margin-top:-36px;position:relative}.dwn4 .hd .k{display:none}.dwn4 h2{font-size:27px}.dwn4 .hd p{font-size:16.5px}
.dwn4 ol{grid-template-columns:minmax(0,1fr)}.dwn4 li:nth-child(2){border-top:1px solid var(--line)}
.dwn4 li{grid-template-columns:34px minmax(0,1fr);font-size:15.5px;padding:14px 0}.dwn4 li::before{width:34px;height:34px;font-size:13px}.dwn4 li a{font-size:16.5px}
.dwn4 .fee{grid-template-columns:minmax(0,1fr);padding:22px 20px}.dwn4 .fee h2{font-size:22px}.dwn4 .fee p{font-size:15.5px}.dwn4 .fee .b{grid-column:1;grid-row:auto;flex-direction:row;flex-wrap:wrap}.dwn4 .fee .b a{flex:1}}
"""
def block():
    lis = []
    for t, p, d in ITEMS4:
        if d is None:
            lis.append(f'<li><a href="{u(p)}">פינוי בינוי ותמ״א 38</a><span>ייצוג הדיירים מול היזם, בדיקת ההסכם והבטוחות וליווי לאורך כל הפרויקט.</span></li>')
        else:
            lis.append(f'<li><a href="{u(p)}">{t}</a><span>{d}</span></li>')
    return f'''<div class="dwn4-wrap"><section class="dwn4" id="dbl-when" aria-labelledby="dwn4-h">
<div class="hd"><p class="k">עורך דין מקרקעין בנתניה</p><h2 id="dwn4-h">מתי תצטרכו עורך דין מקרקעין?</h2>
<p>קנייה או מכירה של דירה היא בדרך כלל ההחלטה הכלכלית הגדולה בחיים, ויש בה הרבה שלבים משפטיים: בדיקת הנכס, משא ומתן, חוזה, מיסים ורישום בטאבו. אלה המצבים העיקריים שבהם כדאי שיהיה לצידכם עורך דין מקרקעין:</p></div>
<ol>{''.join(lis)}</ol>
<div class="fee"><h2>כמה עולה עורך דין מקרקעין?</h2>
<p>שכר הטרחה של עורך דין מקרקעין לא קבוע. הוא תלוי בסוג העסקה, בהיקף שלה ובמורכבות. קניית דירה יד שנייה, רכישה מקבלן או ייצוג דיירים בפרויקט התחדשות דורשים היקפי עבודה שונים. כדאי לסכם את שכר הטרחה מראש ובכתב, ולבדוק מה בדיוק כלול בו: בדיקות מקדימות, משא ומתן, ניסוח החוזה, דיווח לרשות המסים ורישום הזכויות.</p>
<div class="b"><a class="p" href="{u('/calculators/')}">מחשבוני מס רכישה ומס שבח</a><a class="s" href="{u('/checklist/')}">צ׳קליסט לפני שקונים דירה</a></div></div>
</section></div>'''
write('home-when-v4.html', page('מתי לפנות', CSS, '<div class="lbl">סקיצה 3, גרסה רביעית: אותו תוכן, עם קצת עיצוב</div>' + gv + block() + gf))
write('frag-home-when-v4.html', '<style>' + CSS + '</style>\n' + block())
print('ok')
