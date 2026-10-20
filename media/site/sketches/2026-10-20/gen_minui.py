#!/usr/bin/env python3
"""Appointment letter page: Yakir Dabul appointed to 5 committees of the Israel Bar, Central District (7.12.2025).
Writes minui.preview.html (local look with a mock header) and frag-minui.html (page content for WordPress)."""
import json, os
from gen import ic, page, mock_header, HDR_CSS, write, S, MAPS
D = os.path.dirname(os.path.abspath(__file__))

IMG = 'ktav-minui-yakir-dabul-2025.webp'   # replaced by the media URL when published
PDF = 'ktav-minui-2025.pdf'

def u(p): return S + p

COMS = [
    ('ועדת הקשר נתניה', 'הקשר בין עורכי הדין בנתניה לבין הלשכה וועד המחוז. המשרד פועל בנתניה, ברחוב רזיאל 1.',
     u('/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/'), 'עורך דין מקרקעין בנתניה',
     'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'),
    ('ועדת התחדשות עירונית', 'פינוי בינוי ותמ״א 38. המשרד מייצג דיירים מול יזמים, מהחתימה ועד סיום הפרויקט.',
     u('/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/'), 'התחדשות עירונית',
     'M4 21V8l6-4v17M10 21V3h10v18M14 7h2M14 11h2M14 15h2M6.5 11h1M6.5 15h1M2 21h20'),
    ('ועדת חדלות פירעון', 'הליכי חדלות פירעון ליחידים, הסדרי חובות ושיקום כלכלי.',
     u('/%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%95%d7%97%d7%93%d7%9c%d7%95%d7%aa-%d7%a4%d7%99%d7%a8%d7%a2%d7%95%d7%9f/'), 'הוצאה לפועל וחדלות פירעון',
     'M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8'),
    ('ועדת הוצאה לפועל', 'תיקי הוצאה לפועל, עיקולים, הגבלות ואיחוד תיקים.',
     u('/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/'), 'עורך דין הוצאה לפועל בנתניה',
     'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6'),
    ('ועדת קניין ומקרקעין', 'קנייה ומכירה של דירות, רישום בטאבו, מיסוי מקרקעין ופירוק שיתוף.',
     u('/real-estate-lawyer/'), 'עורך דין נדל״ן',
     'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'),
]

CSS = """
.dmn{--g:#c9a14f;--g2:#e7cd96;--n:#101a33;--n2:#17223f;--ln:#e8e2d4;--ink:#141a2b;--mut:#5f6472;font-family:Heebo,Arial,sans-serif;color:var(--ink);background:#fff;overflow:hidden}
.dmn *{box-sizing:border-box}
.dmn .w{max-width:1180px;margin:0 auto;padding:0 20px}
.dmn .top{background:radial-gradient(1200px 500px at 85% -10%,#22305a 0,transparent 60%),linear-gradient(180deg,var(--n),#0c1428);color:#fff;padding:26px 0 0;position:relative}
.dmn .top:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(231,205,150,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(231,205,150,.06) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(180deg,#000,transparent 85%);-webkit-mask-image:linear-gradient(180deg,#000,transparent 85%)}
.dmn .bc{position:relative;font-size:13.5px;color:#aeb4c6;display:flex;gap:8px;flex-wrap:wrap}
.dmn .bc a{color:#d9dce6}.dmn .bc span{opacity:.6}
.dmn .hg{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.9fr);gap:56px;align-items:end;padding-top:34px}
.dmn .ey{display:inline-flex;align-items:center;gap:10px;font:700 13.5px Heebo;letter-spacing:.5px;color:var(--g2)}
.dmn .ey:before{content:"";width:30px;height:2px;background:var(--g)}
.dmn h1{margin:16px 0 0;font:800 42px/1.18 Heebo;text-wrap:balance}
.dmn h1 em{font-style:normal;color:var(--g2)}
.dmn .lead{margin:20px 0 0;font-size:18px;line-height:1.8;color:#d3d7e2;max-width:640px}
.dmn .lead b{color:#fff}
.dmn .meta{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 54px}
.dmn .meta span{display:inline-flex;align-items:center;gap:8px;font:500 14px Heebo;color:#efe6cf;border:1px solid rgba(231,205,150,.35);background:rgba(255,255,255,.03);border-radius:999px;padding:8px 15px}
.dmn .meta b{color:var(--g2);font-weight:700}
.dmn .paper{position:relative;align-self:end;margin-bottom:-120px;z-index:2}
.dmn .paper a{display:block;background:#fff;padding:12px;border-radius:6px;box-shadow:0 30px 60px rgba(5,10,25,.45),0 0 0 1px rgba(231,205,150,.4);transform:rotate(-2.2deg);transition:transform .3s}
.dmn .paper a:hover{transform:rotate(0) scale(1.01)}
.dmn .paper img{display:block;width:100%;height:auto;border:1px solid #eee}
.dmn .seal{position:absolute;top:-22px;left:-22px;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f1dca8,#c9a14f 60%,#9b7a35);color:#1a1405;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font:800 13px/1.2 Heebo;box-shadow:0 8px 20px rgba(0,0,0,.35);transform:rotate(-8deg);z-index:3}
.dmn .seal b{font:900 26px/1 Heebo}
.dmn .sec{padding:150px 0 30px}
.dmn h2{margin:0;font:800 32px/1.25 Heebo;text-wrap:balance}
.dmn .sh{max-width:660px}
.dmn .sh p{margin:12px 0 0;color:var(--mut);font-size:17px;line-height:1.75}
.dmn .coms{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px;margin-top:34px;counter-reset:c}
.dmn .cm{grid-column:span 2;border:1px solid var(--ln);border-radius:16px;padding:24px 22px 20px;background:linear-gradient(180deg,#fffdf8,#fff 110px);display:flex;flex-direction:column;gap:12px;position:relative;counter-increment:c}
.dmn .cm:nth-child(4){grid-column:2/span 2}
.dmn .cm:after{content:"0" counter(c);position:absolute;top:18px;left:20px;font:900 30px/1 Frank,serif;color:#efe3c5}
.dmn .ci{width:50px;height:50px;border-radius:13px;background:var(--n);display:flex;align-items:center;justify-content:center}
.dmn .ci svg{width:25px;height:25px;stroke:var(--g2);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.dmn h3{margin:4px 0 0;font:800 20px/1.3 Heebo}
.dmn .cm p{margin:0;color:var(--mut);font-size:15px;line-height:1.7;flex:1}
.dmn .cm a{display:inline-flex;align-items:center;gap:7px;font:700 14.5px Heebo;color:#8a6c30}
.dmn .cm a svg{width:11px;height:11px}
.dmn .two{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:48px;align-items:start;padding:70px 0 20px}
.dmn .txt p{font-size:17px;line-height:1.85;color:#30364a;margin:16px 0 0}
.dmn blockquote{margin:0;background:var(--n);color:#f3ecdb;border-radius:18px;padding:34px 32px 28px;position:relative}
.dmn blockquote:before{content:"״";position:absolute;top:2px;right:22px;font:900 90px/1 Frank,serif;color:var(--g);opacity:.55}
.dmn blockquote p{margin:18px 0 0;font:500 20px/1.7 Heebo}
.dmn blockquote footer{margin-top:18px;font-size:14px;color:#b9bfd0}
.dmn blockquote footer b{color:var(--g2)}
.dmn .facts{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dmn .facts div{border:1px solid var(--ln);border-radius:12px;padding:14px 16px}
.dmn .facts small{display:block;color:var(--mut);font-size:13px}
.dmn .facts b{display:block;margin-top:4px;font:800 16.5px Heebo}
.dmn .full{padding:60px 0 10px;text-align:center}
.dmn .full .sh{margin:0 auto}
.dmn .doc{max-width:620px;margin:30px auto 0;background:#fff;padding:14px;border-radius:8px;box-shadow:0 20px 50px rgba(16,26,51,.14),0 0 0 1px var(--ln)}
.dmn .doc img{display:block;width:100%;height:auto}
.dmn .btns{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:24px}
.dmn .btn{display:inline-flex;align-items:center;gap:9px;font:700 15.5px Heebo;border-radius:9px;padding:13px 22px}
.dmn .btn svg{width:15px;height:15px}
.dmn .bp{background:var(--g);color:#141414}.dmn .bs{border:1.5px solid var(--n);color:var(--n)}
.dmn .more{padding:60px 0 0}
.dmn .lk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:22px}
.dmn .lk a{border:1px solid var(--ln);border-radius:14px;padding:18px;display:flex;justify-content:space-between;align-items:center;font:700 16px Heebo;color:var(--n);transition:.2s}
.dmn .lk a:hover{border-color:var(--g);background:#fffaf0}
.dmn .lk svg{width:12px;height:12px;color:var(--g)}
.dmn .cta{margin:60px 0 70px;background:linear-gradient(120deg,var(--n),var(--n2));border-radius:20px;padding:34px 36px;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;color:#fff}
.dmn .cta h2{color:#fff;font-size:26px}.dmn .cta p{margin:8px 0 0;color:#c9cedb;font-size:16px}
.dmn .cta .btns{margin:0}.dmn .cta .bs{border-color:rgba(231,205,150,.6);color:#f1e7cf}
@media (max-width:980px){.dmn .hg,.dmn .two{grid-template-columns:1fr;gap:30px}.dmn .paper{max-width:420px;margin:0 auto -90px}.dmn .sec{padding-top:120px}
 .dmn .coms{grid-template-columns:1fr 1fr}.dmn .cm,.dmn .cm:nth-child(4){grid-column:auto}.dmn .cm:last-child{grid-column:1/-1}.dmn .lk{grid-template-columns:1fr 1fr}}
@media (max-width:767px){.dmn h1{font-size:29px}.dmn .lead{font-size:16.5px}.dmn .meta{margin-bottom:40px}.dmn h2{font-size:25px}
 .dmn .coms{grid-template-columns:1fr}.dmn .cm:last-child{grid-column:auto}.dmn .paper{max-width:300px}.dmn .seal{width:78px;height:78px;font-size:11px;left:-14px}.dmn .seal b{font-size:21px}
 .dmn blockquote{padding:28px 22px 22px}.dmn blockquote p{font-size:17.5px}.dmn .cta{padding:26px 22px}.dmn .lk{grid-template-columns:1fr}}
"""

ALT = 'כתב מינוי של עו״ד יקיר דבול לחבר בוועדות לשכת עורכי הדין, מחוז מרכז, מיום 22 בדצמבר 2025'

def body(img=IMG, pdf=PDF):
    cards = ''.join(f'''<article class="cm"><span class="ci"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="{svg}"/></svg></span><h3>{n}</h3><p>{d}</p><a href="{href}">באתר: {lt} {ic('arrow')}</a></article>''' for n, d, href, lt, svg in COMS)
    links = [('אודות המשרד', '/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/'), ('תעודות והסמכות', '/%d7%aa%d7%a2%d7%95%d7%93%d7%95%d7%aa-%d7%95%d7%94%d7%a1%d7%9e%d7%9b%d7%95%d7%aa-%d7%a2%d7%95%d7%b4%d7%93-%d7%99%d7%a7%d7%99%d7%a8-%d7%93%d7%91%d7%95%d7%9c/'),
             ('משרדנו בתקשורת', '/%d7%9e%d7%94%d7%aa%d7%a7%d7%a9%d7%95%d7%a8%d7%aa/'), ('המלצות לקוחות', '/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/')]
    lk = ''.join(f'<a href="{u(p)}">{t}{ic("arrow")}</a>' for t, p in links)
    return f'''<div class="dmn">
<section class="top"><div class="w">
<nav class="bc" aria-label="פירורי לחם"><a href="{S}/">דף הבית</a><span>/</span><a href="{u('/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/')}">אודות המשרד</a><span>/</span>כתב מינוי לוועדות לשכת עורכי הדין</nav>
<div class="hg"><div>
<div class="ey">לשכת עורכי הדין · מחוז מרכז</div>
<h1>עו״ד יקיר דבול מונה לחבר ב<em>חמש ועדות</em> של לשכת עורכי הדין</h1>
<p class="lead">ב 7 בדצמבר 2025 מינה <b>ועד מחוז מרכז של לשכת עורכי הדין</b> את עו״ד יקיר דבול לחבר בוועדת הקשר נתניה, ועדת התחדשות עירונית, ועדת חדלות פירעון, ועדת הוצאה לפועל וועדת קניין ומקרקעין. אלה בדיוק התחומים שבהם המשרד עובד כל יום.</p>
<div class="meta"><span>תאריך המינוי: <b>7.12.2025</b></span><span>כתב המינוי: <b>22.12.2025</b></span><span>חתום בידי <b>יו״ר ועד מחוז מרכז</b></span></div>
</div>
<div class="paper"><span class="seal"><b>5</b>ועדות<br>בלשכה</span><a href="{pdf}" target="_blank" rel="noopener" aria-label="פתיחת כתב המינוי המלא"><img src="{img}" width="1406" height="1988" alt="{ALT}" loading="eager"></a></div>
</div></div></section>

<section class="sec"><div class="w"><div class="sh"><h2>חמש הוועדות שאליהן מונה עו״ד דבול</h2>
<p>כל אחת מהוועדות קשורה ישירות לתחומי העיסוק של המשרד. ליד כל ועדה תמצאו את המידע הרלוונטי באתר.</p></div>
<div class="coms">{cards}</div></div></section>

<section><div class="w"><div class="two">
<div class="txt"><h2>מה המינוי אומר בפועל</h2>
<p>הוועדות של לשכת עורכי הדין הן המקום שבו עורכי דין מהמחוז דנים בשינויים בחקיקה, בפסיקה ובנהלים, ומעבירים את עמדת הלשכה לגופים הרלוונטיים. החברות בוועדות היא תפקיד ציבורי במסגרת הלשכה, לצד העבודה השוטפת במשרד.</p>
<p>עבור לקוחות המשרד המשמעות פשוטה: מי שמטפל בעסקת הדירה, בפרויקט ההתחדשות בבניין או בהליך החובות שלכם, נמצא קרוב לשיח המקצועי בתחום ומכיר מקרוב את מה שמשתנה בו.</p>
<div class="facts"><div><small>הגוף הממנה</small><b>ועד מחוז מרכז, לשכת עורכי הדין</b></div><div><small>התפקיד</small><b>חבר ועדה</b></div><div><small>מספר ועדות</small><b>5</b></div><div><small>מקום המשרד</small><b><a href="{MAPS}" target="_blank" rel="noopener">רזיאל 1, נתניה</a></b></div></div></div>
<blockquote><p>לוועדות השונות תרומה חשובה לפעילות המחוז בפרט ולפעילות הלשכה בכלל.</p><footer>מתוך כתב המינוי, <b>עו״ד רומי קנבל</b>, יו״ר ועד מחוז מרכז</footer></blockquote>
</div></div></section>

<section class="full"><div class="w"><div class="sh"><h2>כתב המינוי המלא</h2><p>כתב המינוי כפי שנשלח מוועד מחוז מרכז של לשכת עורכי הדין.</p></div>
<div class="doc"><img src="{img}" width="1406" height="1988" alt="{ALT}" loading="lazy"></div>
<div class="btns"><a class="btn bs" href="{pdf}" target="_blank" rel="noopener">לצפייה בכתב המינוי (PDF)</a></div></div></section>

<section class="more"><div class="w"><h2>עוד על המשרד</h2><div class="lk">{lk}</div>
<div class="cta"><div><h2>רוצים לדבר עם עו״ד יקיר דבול?</h2><p>המשרד ברחוב רזיאל 1 בנתניה. אפשר להתקשר, לכתוב בווטסאפ או להשאיר פרטים.</p></div>
<div class="btns"><a class="btn bp" href="tel:098613413">{ic('phone')}09-8613413</a><a class="btn bs" href="https://wa.me/972505580189" target="_blank" rel="noopener">{ic('wa')}ווטסאפ</a></div></div>
</div></section>
</div>'''

def schema(img_url, page_url):
    roles = [{"@type": "OrganizationRole", "roleName": "חבר ועדה", "startDate": "2025-12-07",
              "memberOf": {"@type": "Organization", "name": f"{n}, לשכת עורכי הדין מחוז מרכז",
                           "parentOrganization": {"@type": "Organization", "name": "לשכת עורכי הדין בישראל, מחוז מרכז", "url": "https://www.merkazbar.org.il/"}}}
             for n, *_ in COMS]
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "Person", "@id": S + "/#yakir-dabul", "name": "יקיר דבול", "memberOf": roles},
        {"@type": "ImageObject", "@id": page_url + "#letter", "url": img_url, "contentUrl": img_url, "caption": ALT, "width": 1406, "height": 1988,
         "about": {"@id": S + "/#yakir-dabul"}},
    ]}

if __name__ == '__main__':
    write('minui.preview.html', page('כתב מינוי', HDR_CSS + CSS, mock_header().split('<div class="hero"')[0] + body() + '<div style="background:#141414;height:120px;opacity:.85"></div>'))
    print('ok')
