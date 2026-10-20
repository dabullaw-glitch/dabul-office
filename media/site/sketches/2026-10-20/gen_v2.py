#!/usr/bin/env python3
"""Round 2 (20.10.2026): din reviews in the exact style of the existing recommendations page (.dbw),
and a lighter, shorter "when to call a lawyer" block in the home page style (.dwhy look, light version)."""
import os, html, json
from gen import ic, page, write, S, MAPS, REV, DIN, heb_date
D = os.path.dirname(os.path.abspath(__file__))

# the recommendations page's own CSS (copied from the live page, .dbw block), needed only for the local preview
DBW_LIVE = """.dbw{--dbw-ink:#141a2b;--dbw-gold:#c9a14f;--dbw-gold2:#e7cd96;--dbw-line:#e8e2d4;--dbw-muted:#6b6f7a;--dbw-navy:#101a33;direction:rtl;text-align:right;color:var(--dbw-ink);width:100%;max-width:1240px;margin:0 auto;padding:0 0 4px}.dbw *{box-sizing:border-box}
.dbw-st{display:inline-flex;gap:3px;vertical-align:middle}.dbw-st svg{width:17px;height:17px;fill:#f5b81b}
.dbw-av{flex:0 0 46px;width:46px;height:46px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px;line-height:1}
.dbw-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:stretch}
.dbw-rc{background:#fff;border:1px solid var(--dbw-line);border-radius:20px;padding:22px 24px 16px;margin:0;box-shadow:0 8px 24px rgba(16,26,51,.05);display:flex;flex-direction:column}
.dbw-rc header{display:flex;align-items:center;gap:12px;margin:0;padding:0;background:none}.dbw-rc header div{flex:1;min-width:0}.dbw-rc header b{display:block;font-size:16px}.dbw-rc header small{color:var(--dbw-muted);font-size:13px}
.dbw-rc .dbw-st{margin:14px 0 10px;display:flex}.dbw-rc p{margin:0 0 16px;line-height:1.75;font-size:15.5px;color:#2b3042}
.dbw-rc footer{margin-top:auto;padding-top:14px;border-top:1px solid #f0ebe0;color:#9a9fab;font-size:13px}
.dbw-tg{position:absolute;opacity:0;pointer-events:none}.dbw-more{text-align:center;margin:26px 0 0}
.dbw-more label{display:inline-flex;align-items:center;justify-content:center;height:50px;padding:0 30px;border-radius:999px;font-weight:800;font-size:16px;background:#fff;color:var(--dbw-navy);border:1px solid #d9cba6;cursor:pointer}
.dbw-x6{display:none}.dbw-tg:checked~.dbw-grid .dbw-rc{display:flex}.dbw-tg:checked~.dbw-more{display:none}
.dbw-lrh{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:56px 0 16px}.dbw-lrh h2{margin:0;font-size:22px;font-weight:800;color:var(--dbw-ink)}.dbw-lrh p{margin:4px 0 0;color:var(--dbw-muted);font-size:15px}.dbw-lrh a{color:#9a7a2c!important;font-weight:700;text-decoration:none;font-size:15px}
@media (max-width:1024px){.dbw-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767px){.dbw-grid{grid-template-columns:1fr;gap:16px}.dbw-x4{display:none}}
"""
# the only new CSS the din block adds on the live page
DIN2_CSS = """.dbw-din{margin-top:0}.dbw-din .dbw-lrh{margin-top:44px}
.dbw-din .dbw-lrh h2{display:flex;align-items:center;gap:10px}
.dbw-din .dmk{display:inline-flex;align-items:center;justify-content:center;height:26px;padding:0 9px;border-radius:7px;background:#0f3e7a;color:#fff;font:800 14px/1 Arial,sans-serif;letter-spacing:.3px}
.dbw-din .dbw-tp{display:inline-block;align-self:flex-start;margin:0 0 10px;font-size:12.5px;font-weight:700;color:#7c6331;background:#fbf4e3;border:1px solid #efdfb8;border-radius:999px;padding:4px 10px}
.dbw-din .dbw-rc .dbw-st{margin:12px 0 8px}
.dbw-din .dbw-rc footer{display:flex;justify-content:space-between;gap:8px}.dbw-din .dbw-rc footer a{color:#9a7a2c!important;font-weight:700;text-decoration:none}
"""
STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z"/></svg>'
AV = ['#1f3b73', '#9a7a2c', '#2e6b5a', '#7a3b52', '#38506e', '#8a5a2b']

def din2():
    cards = []
    for i, (n, d, t, q) in enumerate(REV):
        cls = ' dbw-x6' if i >= 6 else (' dbw-x4' if i >= 3 else '')
        cards.append(f'''<article class="dbw-rc{cls}"><header><span class="dbw-av" style="background:{AV[i % len(AV)]}" aria-hidden="true">{html.escape(n[0])}</span><div><b>{html.escape(n)}</b><small>{heb_date(d)}</small></div></header>
<span class="dbw-st" role="img" aria-label="5 כוכבים מתוך 5">{STAR * 5}</span><span class="dbw-tp">{html.escape(t)}</span><p>{html.escape(q)}</p>
<footer><span>המלצה באתר din.co.il</span><a href="{DIN}" target="_blank" rel="noopener">למקור</a></footer></article>''')
    return f'''<section class="dbw dbw-din" id="din-reviews" aria-label="המלצות לקוחות מאתר din.co.il">
<div class="dbw-lrh"><div><h2>המלצות באתר din.co.il</h2><p>5.0 מתוך 5, על סמך 50 המלצות. כל המלצה מדורגת לפי זמינות, מקצועיות ויחס אישי.</p></div><a href="{DIN}" target="_blank" rel="noopener">לכל ההמלצות באתר din.co.il &larr;</a></div>
<input type="checkbox" id="dbw-tg-din" class="dbw-tg">
<div class="dbw-grid">{''.join(cards)}</div>
<div class="dbw-more"><label for="dbw-tg-din">עוד המלצות</label></div>
</section>'''

ghost_lr = '''<section class="dbw" style="opacity:.45"><div class="dbw-lrh" style="margin-top:20px"><div><h2>חוות דעת ב-LawReviews</h2><p>5.0 מתוך 5, על סמך 52 חוות דעת</p></div><a>לכל חוות הדעת באתר LawReviews &larr;</a></div>
<div style="background:#fff;border:1px solid #e8e2d4;border-radius:20px;height:250px;box-shadow:0 8px 24px rgba(16,26,51,.05)"></div></section>'''
ghost_vid = '<div style="opacity:.45;filter:grayscale(1);padding:60px 0 50px;text-align:center"><div style="font:800 32px Heebo">המלצות מלקוחות בוידאו</div><div style="width:70px;height:2px;background:#999;margin:14px auto 22px"></div><div style="display:flex;gap:16px;justify-content:center"><span style="width:170px;height:280px;border-radius:14px;background:#d9d9de"></span><span style="width:170px;height:280px;border-radius:14px;background:#d9d9de"></span><span style="width:170px;height:280px;border-radius:14px;background:#d9d9de"></span></div></div>'
wrap = 'body{background:#fff}.pg{padding:0 20px}'
write('din-reviews-v2.html', page('המלצות din', DBW_LIVE + DIN2_CSS + wrap, '<div class="lbl">סקיצה 2, גרסה חדשה: באותו עיצוב כמו ההמלצות הקיימות בעמוד</div><div class="pg">' + ghost_lr + din2() + ghost_vid + '</div>'))
write('frag-din-v2.html', '<style>' + DIN2_CSS + '</style>\n' + din2())

# ---------------------------------------------------------------- home: "when to call", round 2
def u(p): return S + p
ICONS = {  # same line style as the "why choose me" icons on the home page
 'buy': '<path class="sf ln" d="M8 21L24 8l16 13v19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z"/><path class="ln" d="M19 42V30h10v12"/><circle class="ac" cx="35" cy="13" r="5"/><path class="hl" d="M32.8 13.2l1.6 1.6 2.9-3.1"/>',
 'sell': '<path class="sf ln" d="M10 6h20l8 8v28H10z"/><path class="ln" d="M30 6v8h8M15 20h14M15 26h18M15 32h10"/><path class="ac" d="M28 37l3 3 7-8" style="fill:none;stroke:#b8932f;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"/>',
 'renew': '<path class="sf ln" d="M6 42V18l10-6v30M16 42V8h14v34M30 42V20l12 5v17"/><path class="ln" d="M20 14h6M20 20h6M20 26h6M3 42h42"/><circle class="ac" cx="36" cy="12" r="3"/><path class="ln" d="M36 6v-2M42 12h2M40.2 7.8l1.4-1.4"/>',
 'will': '<path class="sf ln" d="M12 5h18l7 7v31H12z"/><path class="ln" d="M30 5v7h7M17 18h14M17 24h14M17 30h8"/><path class="ac" d="M26 38c2-3 4-3 5 0s3 3 5 0" style="fill:none;stroke:#b8932f;stroke-width:2;stroke-linecap:round"/>',
}
AREAS2 = [
    ('buy', 'קונים דירה', 'לפני שחותמים ומעבירים כסף.', u('/real-estate-lawyer/'), [
        ('יד שנייה', '/%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9E%D7%A7%D7%99%D7%A3-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%99%D7%93-%D7%A9%D7%A0%D7%99%D7%94/'),
        ('מקבלן', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%9e%d7%a7%d7%91%d7%9c%d7%9f-2026/'),
        ('מכונס נכסים', '/%D7%A7%D7%A0%D7%99%D7%99%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%9E%D7%9B%D7%95%D7%A0%D7%A1-%D7%A0%D7%9B%D7%A1%D7%99%D7%9D-%D7%94%D7%96%D7%93%D7%9E%D7%A0%D7%95%D7%AA-%D7%A4%D7%96-%D7%90%D7%95-%D7%94%D7%A8/'),
        ('מס רכישה', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%9c%d7%9e%d7%a1-%d7%a8%d7%9b%d7%99%d7%a9%d7%94-2025-%d7%9b%d7%9e%d7%94-%d7%aa%d7%a9%d7%9c%d7%9e%d7%95-%d7%9c%d7%9e%d7%93%d7%99%d7%a0%d7%94-%d7%95%d7%90%d7%99/')]),
    ('sell', 'מוכרים דירה', 'חוזה, משכנתא ומס שבח.', u('/comprehensive-guide-selling-apartment-israel-legal-tax-stages/'), [
        ('מס שבח', '/%d7%9e%d7%a1-%d7%a9%d7%91%d7%97-%d7%91%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%90%d7%99%d7%9a-%d7%9c%d7%90-%d7%9c%d7%aa%d7%aa-%d7%9c%d7%9e%d7%93%d7%99%d7%a0%d7%94-25-%d7%9e%d7%94/'),
        ('דירה עם משכנתא', '/selling-apartment-with-mortgage-legal-guide/'),
        ('היטל השבחה', '/%D7%94%D7%99%D7%98%D7%9C-%D7%94%D7%A9%D7%91%D7%97%D7%94-%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%9C%D7%90-%D7%9C%D7%91%D7%A2%D7%9C%D7%99-%D7%A0%D7%9B%D7%A1%D7%99%D7%9D-%D7%9E%D7%95%D7%9B/'),
        ('פירוק שיתוף', '/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%91%d7%9b%d7%99%d7%a0%d7%95%d7%a1-%d7%a0%d7%9b%d7%a1%d7%99%d7%9d-%d7%a4%d7%99%d7%a8%d7%95%d7%a7-%d7%a9%d7%99%d7%aa%d7%95%d7%a3/')]),
    ('renew', 'הבניין בהתחדשות עירונית', 'ייצוג הדיירים מול היזם.', u('/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/'), [
        ('פינוי בינוי', '/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/'),
        ('תמ״א 38', '/%d7%99%d7%99%d7%a6%d7%95%d7%92-%d7%93%d7%99%d7%99%d7%a8%d7%99%d7%9d-%d7%91%d7%a4%d7%a8%d7%95%d7%99%d7%a7%d7%98-%d7%aa%d7%9e%d7%b4%d7%90-38/'),
        ('חוזה היזם', '/%d7%91%d7%93%d7%99%d7%a7%d7%aa-%d7%97%d7%95%d7%96%d7%94-%d7%99%d7%96%d7%9d-%d7%a4%d7%99%d7%a0%d7%95%d7%99-%d7%91%d7%99%d7%a0%d7%95%d7%99/'),
        ('נציגות דיירים', '/%d7%a0%d7%a6%d7%99%d7%92%d7%95%d7%aa-%d7%93%d7%99%d7%99%d7%a8%d7%99%d7%9d-%d7%91%d7%9e%d7%aa%d7%97%d7%9d-%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa-2/')]),
    ('will', 'ירושה וצוואה', 'לסדר מראש, ולטפל נכון אחר כך.', u('/%d7%a6%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%95%d7%99%d7%a8%d7%95%d7%a9%d7%95%d7%aa/'), [
        ('צוואה', '/%d7%a6%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%95%d7%99%d7%a8%d7%95%d7%a9%d7%95%d7%aa/'),
        ('ייפוי כוח מתמשך', '/%d7%99%d7%99%d7%a4%d7%95%d7%99-%d7%9b%d7%97-%d7%9e%d7%aa%d7%9e%d7%a9%d7%9a/'),
        ('צו ירושה', '/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%a8%d7%99%d7%a9%d7%95%d7%9d-%d7%99%d7%a8%d7%95%d7%a9%d7%94/'),
        ('דירת ירושה', '/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%a9%d7%94%d7%aa%d7%a7%d7%91%d7%9c%d7%94-%d7%91%d7%99%d7%a8%d7%95%d7%a9%d7%94/')]),
]
PLACES2 = [('נתניה', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/'),
           ('עיר ימים', '/real-estate-lawyer-ir-yamim-netanya/'), ('קריית נורדאו', '/real-estate-lawyer-kiryat-nordau-netanya/'),
           ('דורה ורמת ידין', '/real-estate-lawyer-dora-ramat-yadin-netanya/'), ('גבעת האירוסים', '/orech-din-mekarkein-givat-hairusim-netanya/'),
           ('קדימה צורן', '/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a7%d7%93%d7%99%d7%9e%d7%94-%d7%a6%d7%95%d7%a8%d7%9f/')]

WHEN2_CSS = """.dwn2-wrap{padding:56px 20px;background:#fff}
.dwn2{--g:#b8932f;--g2:#d9c08a;--g3:#f0e2bd;--ink:#141311;--mut:#6d675b;--line:#ece4d0;max-width:1240px;margin:0 auto;font-family:"Noto Local","Heebo",Arial,sans-serif;color:var(--ink);direction:rtl;text-align:right}
.dwn2 *{box-sizing:border-box}
.dwn2 .k{display:inline-flex;align-items:center;gap:8px;color:var(--g);font-size:14px;font-weight:800;letter-spacing:.04em;margin:0 0 10px}
.dwn2 .k::before{content:"";width:26px;height:2px;background:var(--g)}
.dwn2 h2{font-size:40px;line-height:1.15;margin:0 0 10px;font-weight:800;color:var(--ink);text-wrap:balance}
.dwn2 .sub{color:var(--mut);font-size:18px;line-height:1.6;margin:0 0 30px}
.dwn2 .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.dwn2 .c{background:#fbf9f4;border:1px solid var(--line);border-radius:20px;padding:22px 20px 20px;display:flex;flex-direction:column;gap:6px;transition:border-color .2s,transform .2s,box-shadow .2s}
.dwn2 .c:hover{border-color:var(--g2);transform:translateY(-2px);box-shadow:0 14px 30px rgba(20,19,17,.07)}
.dwn2 .ic{width:52px;height:52px;display:block;margin-bottom:6px}
.dwn2 .ic svg{width:52px;height:52px;overflow:visible}
.dwn2 .ic .ln{fill:none;stroke:var(--g);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.dwn2 .ic .sf{fill:rgba(184,147,47,.09)}.dwn2 .ic .ac{fill:var(--g)}.dwn2 .ic .hl{fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.dwn2 h3{margin:0;font-size:20px;line-height:1.3;font-weight:800}
.dwn2 h3 a{color:var(--ink)!important;text-decoration:none}
.dwn2 .c>p{margin:0 0 10px;color:var(--mut);font-size:15px;line-height:1.55}
.dwn2 .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
.dwn2 .tags a{font-size:14px;font-weight:600;color:#3a352b!important;text-decoration:none;background:#fff;border:1px solid var(--line);border-radius:99px;padding:6px 12px;transition:.2s}
.dwn2 .tags a:hover{border-color:var(--g);color:#7c5f1c!important}
.dwn2 .loc{margin-top:22px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;font-size:15px;color:var(--mut)}
.dwn2 .loc b{color:var(--ink);font-weight:700}
.dwn2 .loc a{color:#7c5f1c!important;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(184,147,47,.4)}
@media (max-width:1100px){.dwn2 .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:900px){.dwn2-wrap{padding:32px 12px}.dwn2 h2{font-size:28px;margin-bottom:6px}.dwn2 .sub{font-size:16px;margin-bottom:16px}
.dwn2 .grid{grid-template-columns:minmax(0,1fr);gap:10px}
.dwn2 .c{display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:14px;row-gap:2px;padding:16px}
.dwn2 .ic{grid-row:span 2;width:44px;height:44px;margin:0}.dwn2 .ic svg{width:44px;height:44px}
.dwn2 h3{font-size:17.5px;align-self:end}.dwn2 .c>p{margin:0;font-size:14.5px}
.dwn2 .tags{grid-column:1/-1;margin-top:10px}.dwn2 .tags a{font-size:13.5px;padding:5px 11px}
.dwn2 .loc{font-size:14px}}
"""

def when2():
    cards = ''.join(f'''<div class="c"><span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true">{ICONS[k]}</svg></span><h3><a href="{href}">{t}</a></h3><p>{s}</p>
<div class="tags">{''.join(f'<a href="{u(p)}">{n}</a>' for n, p in links)}</div></div>''' for k, t, s, href, links in AREAS2)
    loc = ' · '.join(f'<a href="{u(p)}">{n}</a>' for n, p in PLACES2)
    return f'''<div class="dwn2-wrap"><section class="dwn2" id="dbl-when" aria-labelledby="dwn2-h">
<p class="k">מתי פונים אליי</p>
<h2 id="dwn2-h">מתי כדאי לפנות לעורך דין?</h2>
<p class="sub">ארבעה מצבים שבהם כדאי שיהיה לצידכם עורך דין. בחרו את המצב שלכם וקראו עוד.</p>
<div class="grid">{cards}</div>
<p class="loc"><b>המשרד ברזיאל 1, נתניה.</b> מידע לפי אזור: {loc}</p>
</section></div>'''

ghost_vid2 = '<div style="opacity:.45;filter:grayscale(1);padding:40px 20px;text-align:center;border-bottom:1px solid #eee;font:700 16px Heebo">החלק הקיים: סרטונים · <u>לכל הסרטונים</u></div>'
ghost_faq2 = '<div style="opacity:.45;filter:grayscale(1);background:#f6f6f9;padding:50px 20px 70px;text-align:center"><div style="font:800 34px Heebo">שאלות ותשובות</div><div style="width:64px;height:3px;background:#999;margin:16px auto 26px"></div><div style="max-width:760px;margin:0 auto;display:grid;gap:12px"><div style="height:54px;background:#fff;border-radius:8px"></div><div style="height:54px;background:#fff;border-radius:8px"></div></div></div>'
write('home-when-v2.html', page('מתי לפנות', WHEN2_CSS, '<div class="lbl">סקיצה 3, גרסה חדשה: דף הבית, מעל שאלות ותשובות</div>' + ghost_vid2 + when2() + ghost_faq2))
write('frag-home-when-v2.html', '<style>' + WHEN2_CSS + '</style>\n' + when2())
print('ok')
