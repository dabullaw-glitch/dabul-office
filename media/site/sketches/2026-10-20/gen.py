#!/usr/bin/env python3
"""Sketches 2026-10-20: top bar (A/B), din reviews block, home "when to call a lawyer" block, appointment page.
Builds standalone HTML files for local rendering. The site-ready fragments are written to frag-*.html."""
import json, os, html
D = os.path.dirname(os.path.abspath(__file__))
I = json.load(open(os.path.join(D, 'icons.json')))
FONTS = '../../../campaign/debt-2026-10/fonts/'
S = 'https://dabullaw.co.il'

def ic(k, cls='', size=None):
    v = I[k]
    st = f' style="width:{size}px;height:{size}px"' if size else ''
    return f'<svg class="{cls}" viewBox="0 0 {v["w"]} {v["h"]}" aria-hidden="true"{st}><path fill="currentColor" d="{v["d"]}"/></svg>'

FONT_CSS = ''.join(
    f"@font-face{{font-family:Heebo;font-weight:{w};src:url({FONTS}heebo-hebrew-{w}-normal.woff2) format('woff2');unicode-range:U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}}"
    f"@font-face{{font-family:Heebo;font-weight:{w};src:url({FONTS}heebo-latin-{w}-normal.woff2) format('woff2');unicode-range:U+0000-00FF}}"
    for w in (400, 500, 700, 800, 900))
FONT_CSS += f"@font-face{{font-family:Frank;font-weight:700;src:url({FONTS}frank-ruhl-libre-hebrew-700-normal.woff2) format('woff2')}}"
FONT_CSS += f"@font-face{{font-family:Frank;font-weight:900;src:url({FONTS}frank-ruhl-libre-hebrew-900-normal.woff2) format('woff2')}}"

BASE = FONT_CSS + """
*{box-sizing:border-box}body{margin:0;font-family:Heebo,Arial,sans-serif;background:#fff;color:#141a2b;direction:rtl}
a{color:inherit;text-decoration:none}
.lbl{font:700 13px Heebo;color:#7a6a45;background:#fbf6ea;border:1px dashed #c5a25a;border-radius:8px;padding:6px 12px;display:inline-block;margin:18px 24px 10px}
.ghost{opacity:.42;filter:grayscale(1)}
"""

SOCIAL = [
    ('fb', 'פייסבוק', 'https://www.facebook.com/dabullaw'),
    ('ig', 'אינסטגרם', 'https://www.instagram.com/dabullaw'),
    ('tt', 'טיקטוק', 'https://www.tiktok.com/@yakir.dabul'),
    ('yt', 'יוטיוב', 'https://www.youtube.com/channel/UCVooMwdZfVT_xo21a-Xpdbg'),
]
WA_GROUP = 'https://chat.whatsapp.com/ClLGh1qsjnpBnjIdKKu2lA'
MAPS = 'https://www.google.com/maps?cid=13620325646901534279'

# ---------------------------------------------------------------- 1. TOP BAR
TB_CSS = """
.dtb{font-family:Heebo,Arial,sans-serif;font-size:13.5px;line-height:1;position:relative;z-index:5}
.dtb .in{max-width:1240px;margin:0 auto;padding:0 20px;height:42px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.dtb .g{display:flex;align-items:center;gap:14px;min-width:0}
.dtb .it{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-weight:500}
.dtb .it svg{width:13px;height:13px}
.dtb .sep{width:1px;height:16px;opacity:.35;background:currentColor}
.dtb .fl{font-weight:700;letter-spacing:.2px;white-space:nowrap}
.dtb .soc{display:flex;gap:7px}
.dtb .ci{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;transition:.2s}
.dtb .ci svg{width:13px;height:13px}
.dtb .wa{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 13px 0 6px;border-radius:999px;font-weight:700;white-space:nowrap;transition:.2s}
.dtb .wa i{width:20px;height:20px;border-radius:50%;background:#25D366;color:#fff;display:inline-flex;align-items:center;justify-content:center}
.dtb .wa i svg{width:12px;height:12px}
.dtb .short{display:none}
/* A: dark */
.dtb-a{background:#141414;color:#ece6d8;border-bottom:1px solid rgba(197,162,90,.45)}
.dtb-a .it svg,.dtb-a .fl{color:#C5A25A}
.dtb-a .ci{border:1px solid #C5A25A;color:#E7CD96}
.dtb-a .ci:hover{background:#C5A25A;color:#141414}
.dtb-a .wa{border:1px solid rgba(231,205,150,.55);color:#E7CD96}
.dtb-a .wa:hover{background:#C5A25A;color:#141414}
/* B: gold */
.dtb-b{background:linear-gradient(90deg,#A88A4C,#C9A85F 50%,#A88A4C);color:#141414;border-bottom:1px solid #8e7440}
.dtb-b .it{font-weight:700}
.dtb-b .ci{background:#141414;color:#E7CD96}
.dtb-b .ci:hover{background:#fff;color:#141414}
.dtb-b .wa{background:#141414;color:#E7CD96}
.dtb-b .wa:hover{background:#fff;color:#141414}
@media (max-width:767px){
 .dtb .in{height:40px;padding:0 12px;gap:8px}
 .dtb .ph,.dtb .sep,.dtb .fl,.dtb .long,.dtb .wa b{display:none}
 .dtb .short{display:inline}
 .dtb .soc{gap:5px}.dtb .ci{width:27px;height:27px}
 .dtb .wa{padding:0 4px;height:27px;background:transparent!important;border:0!important}
 .dtb .wa i{width:27px;height:27px}.dtb .wa i svg{width:14px;height:14px}
}
"""

def topbar(var):
    soc = ''.join(f'<a class="ci" href="{u}" target="_blank" rel="noopener" aria-label="{n} של עו״ד יקיר דבול">{ic(k)}</a>' for k, n, u in SOCIAL)
    return f'''<div class="dtb dtb-{var}" role="region" aria-label="פרטי המשרד ורשתות חברתיות"><div class="in">
<div class="g"><a class="it" href="{MAPS}" target="_blank" rel="noopener">{ic('pin')}<span class="long">רזיאל 1, נתניה (קומת כניסה)</span><span class="short">רזיאל 1, נתניה</span></a><span class="sep"></span><a class="it ph" href="tel:098613413">{ic('phone')}09-8613413</a></div>
<div class="g"><span class="fl">עקבו אחריי</span><span class="soc">{soc}</span><a class="wa" href="{WA_GROUP}" target="_blank" rel="noopener" aria-label="הצטרפות לקבוצת הווטסאפ של המשרד"><i>{ic('wa')}</i><b>הצטרפו לקבוצת הווטסאפ</b></a></div>
</div></div>'''

MENU = ['אודות', 'קונים דירה', 'מוכרים דירה', 'התחדשות עירונית', 'מיסוי מקרקעין', 'מידע וכלים', 'צרו קשר']
HDR_CSS = """
.mh{background:#fff;box-shadow:0 2px 14px rgba(20,26,43,.07)}
.mh .in{max-width:1240px;margin:0 auto;padding:0 20px;height:86px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.mh img{height:54px}
.mh nav{display:flex;gap:26px;font:500 15.5px Heebo;color:#141a2b}
.mh .btn{display:inline-flex;gap:8px;align-items:center;background:#C5A25A;color:#141414;font:700 15px Heebo;padding:12px 20px;border-radius:6px}
.mh .btn svg{width:14px;height:14px}
.mh .burger{display:none;width:30px;height:20px;border-top:3px solid #141a2b;border-bottom:3px solid #141a2b;position:relative}
.mh .burger:after{content:"";position:absolute;inset:5.5px 0 auto;border-top:3px solid #141a2b}
.hero{height:170px;background:linear-gradient(180deg,#1b2238,#0e1324);position:relative;overflow:hidden}
.hero:after{content:"";position:absolute;inset:auto 0 0;height:60px;background:linear-gradient(transparent,#fff)}
.hero span{position:absolute;top:44px;right:0;left:0;text-align:center;font:800 30px Heebo;color:#fff;opacity:.85}
@media (max-width:767px){.mh .in{height:66px;padding:0 14px}.mh img{height:40px}.mh nav,.mh .btn{display:none}.mh .burger{display:block}.hero{height:120px}.hero span{font-size:21px;top:34px}}
"""

def mock_header():
    nav = ''.join(f'<a>{m}</a>' for m in MENU)
    return f'<div class="mh"><div class="in"><img src="logo-head.webp" alt=""><nav>{nav}</nav><a class="btn">{ic("phone")}09-8613413</a><span class="burger"></span></div></div><div class="hero" style="opacity:.75"><span>עורך דין מקרקעין בנתניה</span></div>'

def page(title, css, body):
    return f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>{BASE}{css}</style></head><body>{body}</body></html>'

def write(name, s):
    open(os.path.join(D, name), 'w', encoding='utf-8').write(s)

for v, label in (('a', 'אפשרות א: פס כהה עם אייקונים זהב'), ('b', 'אפשרות ב: פס זהב עם אייקונים כהים')):
    write(f'topbar-{v}.html', page('פס עליון ' + v, TB_CSS + HDR_CSS, f'<div class="lbl">{label}</div>' + topbar(v) + mock_header()))
write('frag-topbar.html', '<style>' + TB_CSS + '</style>\n' + topbar('a'))

# ---------------------------------------------------------------- 2. DIN REVIEWS
DIN = 'https://www.din.co.il/lawyers/14701/65412/'
REV = [
    ('נתן', '2026-07-26', 'פינוי מושכר', 'הגשנו תביעה לפינוי מושכר בעזרת עורך דין יקיר דבול וקיבלנו פסק דין לפינוי מהיר.'),
    ('יעקב', '2026-07-23', 'רכישה מכונס נכסים', 'רכישת דירה מכונס נכסים דורשת עורך דין בנתניה שיודע לזרז עניינים בבית משפט.'),
    ('מני', '2026-07-19', 'תיקון רישום בטאבו', 'עורך דין יקיר דבול עשה הליך של תיקון טעות ברישום בטאבו בזריזות מדהימה ואפשר לנו להתקדם במכירה.'),
    ('שרון', '2026-07-16', 'רכישת דירה יד שנייה', 'הוא בדק את הנכס בטאבו ובעירייה ביסודיות שיא, עלה על פרטים שאנחנו בכלל לא חשבנו עליהם'),
    ('איתן מ.', '2026-07-08', 'רכישה מקבלן', 'הוא שינה לפחות 15 סעיפים בחוזה לטובתנו.'),
    ('בן ה.', '2026-07-06', 'פירוק שיתוף בדירת ירושה', 'יקיר ביצע פירוק שיתוף במקרקעין מסודר ולאחר מכן טיפל בכל הליך מכירת דירה שהתקבלה בירושה.'),
    ('לירון נ.', '2026-07-05', 'איחור במסירה', 'עורך דין יקיר דבול נכנס לתמונה ותבע אותו על איחור במסירת דירה מקבלן.'),
    ('אייל מ.', '2026-06-24', 'מיסוי דירת ירושה', 'הוא עשה תכנון של מיסוי מקרקעין בצורה גאונית ופשוט שמר לנו על הכסף שקיבלנו מההורים.'),
    ('שימי י.', '2026-06-18', 'רישום בית משותף', 'הליך רישום בית משותף לקח זמן מול הרשויות, אבל יקיר לא הרפה עד שהושלם בהצלחה.'),
    ('שמעון י.', '2026-06-10', 'פינוי בינוי ותמ"א', 'עורך דין פינוי בינוי כמו יקיר הוא נכס.'),
    ('אלדד י.', '2026-05-27', 'נציגות בפינוי בינוי', 'הוא סיפק לנו ליווי מלא עד חתימת הסכם מול היזם והגן על כל הזכויות שלנו בפרויקט.'),
    ('ירון אמסלם', '2026-05-24', 'מכירת דירת ירושה', 'עורך דין מכירת דירה כמו יקיר דבול חסך לנו המון כסף ודאג לכל הניירת מול הטאבו.'),
]
DIN_CSS = """
.dnr{--g:#c9a14f;--g2:#e7cd96;--n:#101a33;--ln:#e8e2d4;--ink:#141a2b;--mut:#6b6f7c;background:#faf8f3;border-top:1px solid var(--ln);border-bottom:1px solid var(--ln);padding:64px 20px 70px;font-family:Heebo,Arial,sans-serif;color:var(--ink)}
.dnr .w{max-width:1180px;margin:0 auto}
.dnr .hd{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex-wrap:wrap;margin-bottom:34px}
.dnr .ey{display:inline-flex;align-items:center;gap:8px;font:700 13px Heebo;letter-spacing:.4px;color:#9a7b3c;margin-bottom:10px}
.dnr .ey:before{content:"";width:26px;height:2px;background:var(--g)}
.dnr h2{margin:0;font:800 34px/1.2 Heebo;text-wrap:balance}
.dnr .sub{margin:10px 0 0;color:var(--mut);font-size:16.5px;line-height:1.6;max-width:560px}
.dnr .score{display:flex;align-items:center;gap:18px;background:#fff;border:1px solid var(--ln);border-radius:16px;padding:16px 20px;box-shadow:0 6px 24px rgba(16,26,51,.05)}
.dnr .big{font:900 44px/1 Heebo;color:var(--n)}
.dnr .st{display:flex;gap:2px;color:var(--g)}.dnr .st svg{width:17px;height:17px}
.dnr .score small{display:block;color:var(--mut);font-size:13.5px;margin-top:5px}
.dnr .src{display:inline-flex;align-items:center;gap:6px;font:700 14px Heebo;color:var(--n);border-bottom:1px solid var(--g);padding-bottom:2px;margin-top:8px}
.dnr .src svg{width:11px;height:11px;color:var(--g)}
.dnr .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.dnr .rc{background:#fff;border:1px solid var(--ln);border-radius:16px;padding:22px 22px 18px;display:flex;flex-direction:column;gap:14px;position:relative}
.dnr .rc:before{content:"״";position:absolute;top:6px;left:18px;font:900 64px/1 Frank,serif;color:var(--g2);opacity:.6}
.dnr .top{display:flex;align-items:center;gap:12px}
.dnr .av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#f3e6c6,#e7cd96);color:var(--n);display:flex;align-items:center;justify-content:center;font:800 17px Heebo;flex:none}
.dnr .nm{font:700 16px Heebo}.dnr .dt{font-size:13px;color:var(--mut);margin-top:3px}
.dnr .chip{align-self:flex-start;font:700 12.5px Heebo;color:#7c6331;background:#fbf4e3;border:1px solid #efdfb8;border-radius:999px;padding:5px 11px}
.dnr q{quotes:none;font-size:16px;line-height:1.7;color:#2a2f3d;flex:1}
.dnr .rt{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--mut);border-top:1px solid #f0ebdf;padding-top:12px}
.dnr .rt b{color:var(--g);font-weight:800;margin-inline-start:3px}
.dnr .ft{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--mut)}
.dnr .ft a{color:var(--n);font-weight:700}
.dnr .more{display:none}.dnr #dnr-t{position:absolute;opacity:0;pointer-events:none}
.dnr #dnr-t:checked~.grid .more{display:flex}
.dnr .tg{display:flex;justify-content:center;margin-top:28px}
.dnr .tg label{cursor:pointer;font:700 15px Heebo;color:var(--n);border:1.5px solid var(--g);border-radius:999px;padding:12px 26px;background:#fff}
.dnr #dnr-t:checked~.tg .o{display:none}.dnr .c{display:none}.dnr #dnr-t:checked~.tg .c{display:inline}
.dnr .note{text-align:center;color:var(--mut);font-size:13px;margin-top:18px}
@media (max-width:1024px){.dnr .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767px){.dnr{padding:46px 16px 52px}.dnr h2{font-size:27px}.dnr .grid{grid-template-columns:1fr;gap:14px}.dnr .score{width:100%}.dnr .rc:nth-child(n+4):not(.more){display:none}.dnr #dnr-t:checked~.grid .rc{display:flex}}
"""

def heb_date(d):
    y, m, dd = d.split('-');
    return f'{int(dd)}.{int(m)}.{y}'

def din_block():
    stars = ''.join(ic('star') for _ in range(5))
    cards = []
    for i, (n, d, t, q) in enumerate(REV):
        more = ' more' if i >= 6 else ''
        cards.append(f'''<article class="rc{more}"><div class="top"><span class="av" aria-hidden="true">{n[0]}</span><div><div class="nm">{html.escape(n)}</div><div class="dt">{heb_date(d)}</div></div></div>
<span class="chip">{html.escape(t)}</span><q>{html.escape(q)}</q>
<div class="rt"><span>זמינות<b>5</b></span><span>מקצועיות<b>5</b></span><span>יחס אישי<b>5</b></span></div>
<div class="ft"><span>פורסם באתר <a href="{DIN}" target="_blank" rel="noopener">din.co.il</a></span><span class="st" aria-label="5 מתוך 5">{stars}</span></div></article>''')
    return f'''<section class="dnr" id="din-reviews" aria-labelledby="dnr-h"><div class="w">
<div class="hd"><div><div class="ey">המלצות מאתר din.co.il</div><h2 id="dnr-h">מה לקוחות כתבו על המשרד באתר din</h2>
<p class="sub">לקוחות המשרד מדרגים את עו״ד יקיר דבול באתר din.co.il לפי זמינות, מקצועיות ויחס אישי. כאן כמה מההמלצות, ואת כולן אפשר לקרוא באתר עצמו.</p></div>
<div class="score"><div class="big">5.0</div><div><div class="st" aria-hidden="true">{stars}</div><small>ממוצע 50 המלצות באתר din.co.il</small><a class="src" href="{DIN}" target="_blank" rel="noopener">לכל ההמלצות ב din {ic('arrow')}</a></div></div></div>
<input type="checkbox" id="dnr-t">
<div class="grid">{''.join(cards)}</div>
<div class="tg"><label for="dnr-t"><span class="o">להצגת המלצות נוספות</span><span class="c">להצגת פחות המלצות</span></label></div>
<p class="note">ההמלצות מובאות בקיצור, כפי שפורסמו באתר din.co.il. הדירוג נכון ליום פרסום העמוד.</p>
</div></section>'''

DIN_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": S + "/#legalservice",
    "sameAs": [DIN],
}

ghost_top = '<div class="ghost" style="padding:30px 20px;text-align:center;font:700 16px Heebo;color:#141a2b;border-top:1px solid #eee">החלק הקיים: חוות דעת ב LawReviews &nbsp;·&nbsp; <u>לכל חוות הדעת על עורך דין יקיר דבול באתר LawReviews.co.il</u></div>'
ghost_bot = '<div class="ghost" style="padding:46px 20px 60px;text-align:center"><div style="font:800 32px Heebo">המלצות מלקוחות בוידאו</div><div style="display:flex;gap:16px;justify-content:center;margin-top:20px"><span style="width:170px;height:300px;border-radius:14px;background:#d9d9de"></span><span style="width:170px;height:300px;border-radius:14px;background:#d9d9de"></span><span style="width:170px;height:300px;border-radius:14px;background:#d9d9de"></span></div></div>'
write('din-reviews.html', page('המלצות din', DIN_CSS, '<div class="lbl">סקיצה: איך זה משתלב בעמוד ההמלצות</div>' + ghost_top + din_block() + ghost_bot))
write('frag-din.html', '<style>' + DIN_CSS + '</style>\n' + din_block() + '\n<script type="application/ld+json">' + json.dumps(DIN_SCHEMA, ensure_ascii=False) + '</script>')

# ---------------------------------------------------------------- 3. HOME: WHEN TO CALL A LAWYER
def u(p):  # site path (already encoded or plain)
    return S + p

AREAS = [
    dict(icon='M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', title='קנייה ומכירה של דירה', href=u('/real-estate-lawyer/'),
         more='עורך דין נדל״ן', lead='העסקה הכלכלית הגדולה של רוב האנשים, עם הרבה שלבים משפטיים בדרך.', items=[
        ('קניית דירה יד שנייה', '/%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9E%D7%A7%D7%99%D7%A3-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%99%D7%93-%D7%A9%D7%A0%D7%99%D7%94/', 'בדיקת הזכויות בטאבו ובעירייה, עיקולים, שעבודים והערות אזהרה, ניסוח החוזה והבטחת הכסף עד העברת הבעלות.'),
        ('רכישת דירה מקבלן', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%9e%d7%a7%d7%91%d7%9c%d7%9f-2026/', 'בדיקת החוזה והמפרט, ערבויות לפי חוק המכר, פנקס שוברים וליווי עד המסירה.'),
        ('מכירת דירה', '/comprehensive-guide-selling-apartment-israel-legal-tax-stages/', 'חוזה המכר, סילוק המשכנתא, דיווח לרשות המסים והעברת הזכויות לקונה.'),
        ('מיסוי מקרקעין', '/%d7%9e%d7%99%d7%a1%d7%95%d7%99-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90/', 'מס שבח ומס רכישה, ובדיקת הפטורים וההקלות שהחוק מאפשר.'),
        ('פירוק שיתוף במקרקעין', '/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%91%d7%9b%d7%99%d7%a0%d7%95%d7%a1-%d7%a0%d7%9b%d7%a1%d7%99%d7%9d-%d7%a4%d7%99%d7%a8%d7%95%d7%a7-%d7%a9%d7%99%d7%aa%d7%95%d7%a3/', 'כשהשותפים בנכס לא מסכימים על ההמשך, בהסכמה או בהליך בבית המשפט.'),
    ]),
    dict(icon='M4 21V8l6-4v17M10 21V3h10v18M14 7h2M14 11h2M14 15h2M6.5 11h1M6.5 15h1M2 21h20', title='התחדשות עירונית', href=u('/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/'),
         more='עורך דין פינוי בינוי', lead='הבניין שלכם נכנס לפרויקט? כדאי שמישהו ידאג לדיירים מהיום הראשון.', items=[
        ('ייצוג דיירים בפינוי בינוי ותמ״א 38', '/%d7%99%d7%99%d7%a6%d7%95%d7%92-%d7%93%d7%99%d7%99%d7%a8%d7%99%d7%9d-%d7%91%d7%a4%d7%a8%d7%95%d7%99%d7%a7%d7%98-%d7%aa%d7%9e%d7%b4%d7%90-38/', 'ייצוג הדיירים מול היזם, משא ומתן על התמורות והבטוחות.'),
        ('בדיקת חוזה היזם', '/%d7%91%d7%93%d7%99%d7%a7%d7%aa-%d7%97%d7%95%d7%96%d7%94-%d7%99%d7%96%d7%9d-%d7%a4%d7%99%d7%a0%d7%95%d7%99-%d7%91%d7%99%d7%a0%d7%95%d7%99/', 'מה לבדוק לפני שחותמים, ואילו סעיפים חשוב לשנות.'),
        ('ערבויות שהיזם חייב לתת', '/developer-guarantees-tenant-urban-renewal/', 'ערבות בנקאית, ביטוחים ושכר דירה בתקופת הבנייה.'),
        ('נציגות דיירים', '/%d7%a0%d7%a6%d7%99%d7%92%d7%95%d7%aa-%d7%93%d7%99%d7%99%d7%a8%d7%99%d7%9d-%d7%91%d7%9e%d7%aa%d7%97%d7%9d-%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa-2/', 'בחירת נציגות וליווי שלה לאורך כל הפרויקט.'),
        ('ועד בית ובית משותף', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9c%d7%95%d7%95%d7%a2%d7%93-%d7%91%d7%99%d7%aa/', 'ייעוץ לוועד ולנציגות, אסיפות, החלטות וחברת ניהול.'),
    ]),
    dict(icon='M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8', title='חובות, הוצאה לפועל וחדלות פירעון', href=u('/%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%95%d7%97%d7%93%d7%9c%d7%95%d7%aa-%d7%a4%d7%99%d7%a8%d7%a2%d7%95%d7%9f/'),
         more='עורך דין הוצאה לפועל וחדלות פירעון', lead='כשהחובות מצטברים, יש דרכים מסודרות שקבועות בחוק להתמודד איתם.', items=[
        ('חדלות פירעון ליחיד', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%a2%d7%a9%d7%99-%d7%a4%d7%aa%d7%99%d7%97%d7%aa-%d7%94%d7%9c%d7%99%d7%9a-%d7%97%d7%93%d7%9c%d7%95%d7%aa-%d7%a4%d7%99%d7%a8%d7%a2%d7%95%d7%9f-%d7%9c/', 'הליך מסודר מול הממונה ובית המשפט, בדרך לצו הפטר.'),
        ('עיקולים והגבלות', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%91%d7%99%d7%98%d7%95%d7%9c-%d7%a2%d7%99%d7%a7%d7%95%d7%9c%d7%99%d7%9d-%d7%95%d7%94%d7%92%d7%91%d7%9c%d7%95%d7%aa-%d7%91%d7%94/', 'בדיקת התיקים והפעולות האפשריות מול ההוצאה לפועל.'),
        ('איחוד תיקים', '/%d7%90%d7%99%d7%97%d7%95%d7%93-%d7%aa%d7%99%d7%a7%d7%99%d7%9d-%d7%91%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c/', 'תשלום חודשי אחד במקום הרבה תיקים פתוחים.'),
        ('הסדר חובות מול הנושים', '/%d7%9c%d7%9e%d7%97%d7%95%d7%a7-%d7%90%d7%aa-%d7%94%d7%97%d7%95%d7%91%d7%95%d7%aa-%d7%91%d7%9c%d7%99-%d7%94%d7%9b%d7%aa%d7%9d-%d7%a9%d7%9c-%d7%a4%d7%a9%d7%99%d7%98%d7%aa-%d7%a8%d7%92%d7%9c-%d7%94/', 'משא ומתן ישיר על סכום ופריסה שאפשר לעמוד בהם.'),
        ('הגנה על דירת המגורים', '/%d7%94%d7%92%d7%a0%d7%94-%d7%a2%d7%9c-%d7%93%d7%99%d7%a8%d7%aa-%d7%9e%d7%92%d7%95%d7%a8%d7%99%d7%9d-%d7%91%d7%94%d7%9c%d7%99%d7%9a-%d7%97%d7%93%d7%9c%d7%95%d7%aa-%d7%a4%d7%99%d7%a8%d7%a2%d7%95%d7%9f-2/', 'מה קורה לבית בהליך חדלות פירעון, ומה אפשר לעשות.'),
    ]),
    dict(icon='M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', title='צוואות, ירושות וייפוי כוח מתמשך', href=u('/%d7%a6%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%95%d7%99%d7%a8%d7%95%d7%a9%d7%95%d7%aa/'),
         more='צוואות וירושות', lead='לסדר את הדברים מראש, ולטפל נכון בעזבון כשהרגע מגיע.', items=[
        ('עריכת צוואה', '/%d7%a1%d7%95%d7%92%d7%99-%d7%a6%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%94%d7%93%d7%a8%d7%9b%d7%99%d7%9d-%d7%94%d7%97%d7%95%d7%a7%d7%99%d7%95%d7%aa-%d7%9c%d7%a2%d7%a8%d7%99%d7%9b%d7%aa%d7%9f/', 'צוואה ברורה שמונעת מחלוקות במשפחה.'),
        ('ייפוי כוח מתמשך', '/%d7%99%d7%99%d7%a4%d7%95%d7%99-%d7%9b%d7%97-%d7%9e%d7%aa%d7%9e%d7%a9%d7%9a/', 'לקבוע מראש מי יחליט בשבילכם, בענייני רכוש, בריאות ועניינים אישיים.'),
        ('צו ירושה וצו קיום צוואה', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%a8%d7%99%d7%a9%d7%95%d7%9d-%d7%99%d7%a8%d7%95%d7%a9%d7%94/', 'הגשת הבקשה לרשם לענייני ירושה ורישום הזכויות.'),
        ('מכירת דירה שהתקבלה בירושה', '/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%a9%d7%94%d7%aa%d7%a7%d7%91%d7%9c%d7%94-%d7%91%d7%99%d7%a8%d7%95%d7%a9%d7%94/', 'הסכמה בין היורשים, מיסוי ומכירה מסודרת.'),
        ('מיסוי דירת ירושה', '/misui-mirkain-yerusha-mas-shevach/', 'מתי יש פטור ממס שבח, ומה כדאי לבדוק לפני המכירה.'),
    ]),
]
PLACES = [
    ('עורך דין מקרקעין בנתניה', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/'),
    ('עיר ימים', '/real-estate-lawyer-ir-yamim-netanya/'),
    ('קריית נורדאו', '/real-estate-lawyer-kiryat-nordau-netanya/'),
    ('דורה ורמת ידין', '/real-estate-lawyer-dora-ramat-yadin-netanya/'),
    ('גבעת האירוסים', '/orech-din-mekarkein-givat-hairusim-netanya/'),
    ('קדימה צורן', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a7%d7%93%d7%99%d7%9e%d7%94-%d7%a6%d7%95%d7%a8%d7%9f/'),
    ('הוצאה לפועל בנתניה', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/'),
    ('הוצאה לפועל בחדרה', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%91%d7%97%d7%93%d7%a8%d7%94/'),
]
WHEN_CSS = """
.dwn{--g:#c9a14f;--g2:#e7cd96;--n:#101a33;--ln:#e8e2d4;--ink:#141a2b;--mut:#5f6472;padding:74px 20px 80px;font-family:Heebo,Arial,sans-serif;color:var(--ink);background:#fff}
.dwn .w{max-width:1180px;margin:0 auto}
.dwn .hd{text-align:center;max-width:780px;margin:0 auto 44px}
.dwn .ey{font:700 13px Heebo;letter-spacing:.5px;color:#9a7b3c}
.dwn h2{margin:10px 0 0;font:800 38px/1.2 Heebo;text-wrap:balance}
.dwn .dv{width:64px;height:3px;background:var(--g);margin:18px auto 0;border-radius:3px}
.dwn .hd p{margin:18px 0 0;font-size:17.5px;line-height:1.75;color:var(--mut)}
.dwn .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.dwn .ar{border:1px solid var(--ln);border-radius:18px;padding:28px 28px 22px;background:linear-gradient(180deg,#fffdf8,#fff 120px);display:flex;flex-direction:column}
.dwn .at{display:flex;gap:16px;align-items:flex-start}
.dwn .ico{width:52px;height:52px;border-radius:14px;background:var(--n);display:flex;align-items:center;justify-content:center;flex:none}
.dwn .ico svg{width:26px;height:26px;stroke:var(--g2);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.dwn h3{margin:2px 0 0;font:800 22px/1.3 Heebo}
.dwn h3 a:hover{color:#9a7b3c}
.dwn .ld{margin:6px 0 0;color:var(--mut);font-size:15px;line-height:1.6}
.dwn ul{list-style:none;margin:20px 0 0;padding:0;display:flex;flex-direction:column}
.dwn li{padding:12px 0;border-top:1px solid #f1ece0;font-size:15.5px;line-height:1.65;color:#3a3f4c;display:flex;gap:10px}
.dwn li:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--g);margin-top:9px;flex:none}
.dwn li a{color:var(--n);font-weight:700;border-bottom:1px solid rgba(201,161,79,.55)}
.dwn li a:hover{color:#9a7b3c}
.dwn .mr{margin-top:auto;padding-top:16px;display:inline-flex;align-items:center;gap:8px;font:700 15px Heebo;color:#8a6c30}
.dwn .mr svg{width:12px;height:12px}
.dwn .band{margin-top:28px;display:grid;grid-template-columns:1.15fr 1fr;gap:0;border-radius:18px;overflow:hidden;background:var(--n);color:#e9e6de}
.dwn .band>div{padding:30px 32px}
.dwn .band h3{color:#fff;font-size:23px}
.dwn .band p{margin:10px 0 0;font-size:15.5px;line-height:1.75;color:#cfd2db}
.dwn .band p a{color:var(--g2);font-weight:700;border-bottom:1px solid rgba(231,205,150,.5)}
.dwn .band .pl{background:#16213f;border-inline-start:1px solid rgba(231,205,150,.18)}
.dwn .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.dwn .chips a{font:500 14px Heebo;color:#f1e7cf;border:1px solid rgba(231,205,150,.4);border-radius:999px;padding:7px 14px}
.dwn .chips a:hover{background:var(--g);color:#141414}
.dwn .cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.dwn .cta a{display:inline-flex;align-items:center;gap:8px;font:700 15px Heebo;border-radius:8px;padding:11px 18px}
.dwn .cta .p{background:var(--g);color:#141414}.dwn .cta .s{border:1px solid rgba(231,205,150,.55);color:#f1e7cf}
.dwn .cta svg{width:15px;height:15px}
@media (max-width:900px){.dwn .grid,.dwn .band{grid-template-columns:1fr}.dwn .band .pl{border-inline-start:0;border-top:1px solid rgba(231,205,150,.18)}}
@media (max-width:767px){.dwn{padding:50px 16px 56px}.dwn h2{font-size:28px}.dwn .hd p{font-size:16px}.dwn .ar{padding:22px 18px 18px}.dwn h3{font-size:19.5px}.dwn .band>div{padding:24px 20px}}
"""

def when_block():
    cards = []
    for a in AREAS:
        lis = ''.join(f'<li><span><a href="{u(p)}">{t}</a>: {d}</span></li>' for t, p, d in a['items'])
        cards.append(f'''<article class="ar"><div class="at"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="{a['icon']}"/></svg></span><div><h3><a href="{a['href']}">{a['title']}</a></h3><p class="ld">{a['lead']}</p></div></div>
<ul>{lis}</ul><a class="mr" href="{a['href']}">למידע המלא: {a['more']} {ic('arrow')}</a></article>''')
    chips = ''.join(f'<a href="{u(p)}">{t}</a>' for t, p in PLACES)
    return f'''<section class="dwn" id="when-lawyer" aria-labelledby="dwn-h"><div class="w">
<div class="hd"><div class="ey">תחומי העיסוק של המשרד</div><h2 id="dwn-h">מתי כדאי לפנות לעורך דין?</h2><div class="dv"></div>
<p>רוב האנשים פוגשים עורך דין ברגעים הגדולים: קנייה או מכירה של דירה, פרויקט התחדשות בבניין, חובות שהצטברו או ירושה במשפחה. אלה המצבים שבהם המשרד מלווה לקוחות בנתניה והסביבה, וכל נושא מקושר למדריך מפורט באתר.</p></div>
<div class="grid">{''.join(cards)}</div>
<div class="band"><div><h3>כמה עולה עורך דין?</h3>
<p>שכר הטרחה לא אחיד. הוא נקבע לפי סוג העניין, ההיקף והמורכבות. בפגישה הראשונה מסבירים מה כולל הליווי, ומסכמים את שכר הטרחה מראש ובכתב.</p>
<p>לפני עסקת דירה אפשר להיעזר ב<a href="{u('/calculators/')}">מחשבוני מס רכישה ומס שבח</a> וב<a href="{u('/checklist/')}">צ׳קליסט לפני שקונים דירה יד שנייה</a>.</p>
<div class="cta"><a class="p" href="{u('/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/')}">{ic('phone')}לתיאום פגישה</a><a class="s" href="https://wa.me/972505580189" target="_blank" rel="noopener">{ic('wa')}כתבו לנו בווטסאפ</a></div></div>
<div class="pl"><h3>המשרד בנתניה, ללקוחות מכל האזור</h3>
<p>המשרד ברחוב <a href="{MAPS}" target="_blank" rel="noopener">רזיאל 1, נתניה</a>. ריכזנו מידע לפי שכונות ואזורים:</p>
<div class="chips">{chips}</div></div></div>
</div></section>'''

OFFERS = {
    "@context": "https://schema.org", "@type": "LegalService", "@id": S + "/#legalservice",
    "hasOfferCatalog": {"@type": "OfferCatalog", "name": "תחומי העיסוק של המשרד", "itemListElement": [
        {"@type": "OfferCatalog", "name": a['title'], "url": a['href'], "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": t, "url": u(p), "description": d, "areaServed": {"@type": "City", "name": "נתניה"}}}
            for t, p, d in a['items']]} for a in AREAS]},
}
faq_ghost = '<div class="ghost" style="background:#f6f6f9;padding:50px 20px 70px;text-align:center"><div style="font:800 34px Heebo">שאלות ותשובות</div><div style="width:64px;height:3px;background:#999;margin:16px auto 26px"></div><div style="max-width:760px;margin:0 auto;display:grid;gap:12px"><div style="height:54px;background:#fff;border-radius:8px"></div><div style="height:54px;background:#fff;border-radius:8px"></div><div style="height:54px;background:#fff;border-radius:8px"></div></div></div>'
vid_ghost = '<div class="ghost" style="padding:30px 20px;text-align:center;border-bottom:1px solid #eee"><div style="font:700 16px Heebo">החלק הקיים: סרטונים &nbsp;·&nbsp; <u>לכל הסרטונים</u></div></div>'
write('home-when.html', page('מתי לפנות לעורך דין', WHEN_CSS, '<div class="lbl">סקיצה: דף הבית, מעל שאלות ותשובות</div>' + vid_ghost + when_block() + faq_ghost))
write('frag-home-when.html', '<style>' + WHEN_CSS + '</style>\n' + when_block())  # home already has hasOfferCatalog in its schema
print('ok')
