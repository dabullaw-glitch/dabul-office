#!/usr/bin/env python3
"""LB10 2026 (LawBuzz) ranking page + boxes for the About page (992) and the Certificates page (990).
Yakir 23.10.2026: "use the certificate as it is, add it to certificates, a new page about it with all the schema for AI and
GEO SEO, write about it on the About page with a link to the new page; send a sketch before uploading".
Writes: lb10.preview.html (page with a mock header), lb10-box.preview.html (the About and Certificates boxes),
lb10-page.json (WordPress page body) and snippet-lb10-box.php (the boxes, injected like the appointment-letter box)."""
import json, os, sys, urllib.parse
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', '2026-10-20'))
from gen import ic, page, mock_header, HDR_CSS, S, MAPS  # noqa: E402
import gen_minui  # noqa: E402

def u(p): return S + p
ABOUT = u('/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/')
CERTS = u('/%d7%aa%d7%a2%d7%95%d7%93%d7%95%d7%aa-%d7%95%d7%94%d7%a1%d7%9e%d7%9b%d7%95%d7%aa-%d7%a2%d7%95%d7%b4%d7%93-%d7%99%d7%a7%d7%99%d7%a8-%d7%93%d7%91%d7%95%d7%9c/')
MINUI = u('/%d7%9b%d7%aa%d7%91-%d7%9e%d7%99%d7%a0%d7%95%d7%99-%d7%95%d7%a2%d7%93%d7%95%d7%aa-%d7%9c%d7%a9%d7%9b%d7%aa-%d7%a2%d7%95%d7%a8%d7%9b%d7%99-%d7%94%d7%93%d7%99%d7%9f/')
NETANYA = u('/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/')
DEFECTS = u('/calculators/defects-warranty/')
RE_LAWYER = u('/real-estate-lawyer/')
RATING = 'https://lawbuzz.co.il/rating/'
SLUG = 'דירוג-lb10-2026'
PAGE_URL = S + '/' + urllib.parse.quote(SLUG).lower() + '/'

IMG = 'lb10-2026-yakir-dabul.webp'            # local sketch; replaced by the media URL when published
IMG_SM = 'lb10-2026-yakir-dabul-600.webp'
ALT = 'תעודת ההוקרה של לובאז לעו״ד יקיר דבול: נכלל בדירוג LB10 2026 בין משרדי עורכי הדין המובילים, בתחומי מקרקעין וליקויי בנייה ונזקי רכוש'
AWARD = 'LB10 2026 של לובאז (LawBuzz): נכלל בין משרדי עורכי הדין המובילים בישראל בתחומי מקרקעין וליקויי בנייה ונזקי רכוש'

FIELDS = [
    ('מקרקעין', 'קנייה ומכירה של דירות, רכישה מקבלן, מיסוי מקרקעין, התחדשות עירונית ורישום הזכויות בטאבו.',
     RE_LAWYER, 'עורך דין נדל״ן', 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'),
    ('ליקויי בנייה ונזקי רכוש', 'ליקויים בדירה חדשה מקבלן, תקופות הבדק והאחריות לפי חוק המכר, ודרישות לתיקון או לפיצוי.',
     DEFECTS, 'עד מתי הקבלן אחראי לליקויים', 'M4 21V9l8-6 8 6v12M9 21v-6h6v6M2 21h20M12 9v2'),
]
FAQ = [
    ('מה זה דירוג LB10?', 'LB10 הוא דירוג עורכות ועורכי הדין של ישראל שמפרסם אתר המשפט לובאז (LawBuzz). הדירוג מתפרסם פעם בשנה, לפי תחומי עיסוק.'),
    ('באילו תחומים נבחר עו״ד יקיר דבול?', 'בדירוג לשנת 2026 נכלל עו״ד יקיר דבול בשני תחומים: מקרקעין, וליקויי בנייה ונזקי רכוש.'),
    ('איך נקבע הדירוג?', 'לפי לובאז, הדירוג משלב עבודה עיתונאית וניתוח משפטי, ונשען על המלצות, שאלונים, פסקי דין ופרסומים בתקשורת ובדיגיטל. לפי לובאז, ההכללה בדירוג אינה כרוכה בתשלום.'),
    ('איפה אפשר לראות את הדירוג המלא?', 'הדירוג המלא מתפרסם באתר לובאז, בעמוד הדירוגים.'),
    ('איך פונים למשרד?', 'המשרד נמצא ברחוב רזיאל 1 בנתניה. אפשר להתקשר ל־09-8613413 או לכתוב בווטסאפ ל־050-5580189.'),
]

CSS = gen_minui.CSS + """
.dmn .paper.sq a{transform:rotate(-1.6deg)}
.dmn .paper.sq img{border:0}
.dmn .flds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:34px}
.dmn .flds .cm{grid-column:auto}
.dmn .flds .cm:after{content:none}
.dmn .faq{padding:60px 0 0}
.dmn .faq details{border:1px solid var(--ln);border-radius:14px;padding:16px 20px;margin-top:12px;background:#fff}
.dmn .faq summary{cursor:pointer;font:800 17.5px Heebo;color:var(--n);list-style:none;display:flex;justify-content:space-between;gap:12px}
.dmn .faq summary::-webkit-details-marker{display:none}
.dmn .faq summary:after{content:"+";color:var(--g);font:800 22px/1 Heebo}
.dmn .faq details[open] summary:after{content:"−"}
.dmn .faq details p{margin:10px 0 0;color:#30364a;font-size:16px;line-height:1.8}
.dmn .src{margin-top:14px;font-size:14px;color:var(--mut)}
.dmn .src a{color:#8a6c30;font-weight:700;text-decoration:underline}
@media (max-width:767px){.dmn .flds{grid-template-columns:1fr}}
"""

def body(img=IMG):
    cards = ''.join(f'''<article class="cm"><span class="ci"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="{svg}"/></svg></span><h3>{n}</h3><p>{d}</p><a href="{href}">באתר: {lt} {ic('arrow')}</a></article>''' for n, d, href, lt, svg in FIELDS)
    faq = ''.join(f'<details{" open" if i == 0 else ""}><summary>{q}</summary><p>{a}</p></details>' for i, (q, a) in enumerate(FAQ))
    links = [('אודות המשרד', ABOUT), ('תעודות והסמכות', CERTS), ('כתב מינוי לוועדות הלשכה', MINUI), ('עורך דין מקרקעין בנתניה', NETANYA)]
    lk = ''.join(f'<a href="{h}">{t}{ic("arrow")}</a>' for t, h in links)
    return f'''<div class="dmn">
<section class="top"><div class="w">
<nav class="bc" aria-label="פירורי לחם"><a href="{S}/">דף הבית</a><span>/</span><a href="{ABOUT}">אודות המשרד</a><span>/</span>דירוג LB10 2026</nav>
<div class="hg"><div>
<div class="ey">דירוג LB10 · לובאז 2026</div>
<h1>עו״ד יקיר דבול נבחר לדירוג <em>LB10 2026</em> של משרדי עורכי הדין המובילים בישראל</h1>
<p class="lead">בדירוג עורכות ועורכי הדין של ישראל לשנת 2026, שמפרסם אתר המשפט <b>לובאז (LawBuzz)</b>, נכלל עו״ד יקיר דבול בין משרדי עורכי הדין המובילים בשני תחומים: <b>מקרקעין</b>, ו<b>ליקויי בנייה ונזקי רכוש</b>.</p>
<div class="meta"><span>שנת הדירוג: <b>2026</b></span><span>מפרסם הדירוג: <b>לובאז</b></span><span>תחומים: <b>מקרקעין · ליקויי בנייה ונזקי רכוש</b></span></div>
</div>
<div class="paper sq"><span class="seal"><b>LB10</b>2026</span><a href="{img}" target="_blank" rel="noopener" aria-label="פתיחת תעודת ההוקרה בגודל מלא"><img src="{img}" width="1200" height="1200" alt="{ALT}" loading="eager"></a></div>
</div></div></section>

<section class="sec"><div class="w"><div class="sh"><h2>שני התחומים שבהם נבחר המשרד</h2>
<p>כך מופיעים התחומים בתעודת ההוקרה. ליד כל תחום תמצאו קישור למידע באתר.</p></div>
<div class="flds">{cards}</div></div></section>

<section><div class="w"><div class="two">
<div class="txt"><h2>מה זה דירוג LB10, ואיך הוא נקבע</h2>
<p>LB10 הוא הדירוג השנתי של עורכות ועורכי הדין בישראל, שמפרסם אתר המשפט לובאז. לפי לובאז, בדירוג לשנת 2026 נכללו כ־4,200 עורכי דין מתוך כ־80,000 עורכי הדין בישראל, כלומר פחות מ־6%.</p>
<p>לפי לובאז, הדירוג הוא מחקר עצמאי, וההכללה בו אינה כרוכה בתשלום. הוא משלב עבודה עיתונאית וניתוח משפטי, ונשען על המלצות, שאלונים, פסקי דין ופרסומים בתקשורת ובדיגיטל.</p>
<div class="facts"><div><small>הגוף המדרג</small><b>לובאז (LawBuzz)</b></div><div><small>שם הדירוג</small><b>LB10 2026</b></div><div><small>תחומים</small><b>2</b></div><div><small>מקום המשרד</small><b><a href="{MAPS}" target="_blank" rel="noopener">רזיאל 1, נתניה</a></b></div></div>
<p class="src">המקור: <a href="{RATING}" target="_blank" rel="noopener">הדירוג המלא באתר לובאז</a></p></div>
<blockquote><p>בהערכה רבה על הישגים שבזכותם נכללתם בין משרדי עורכי הדין המובילים לשנת 2026.</p><footer>מתוך תעודת ההוקרה, <b>לובאז</b>, דירוג LB10 2026</footer></blockquote>
</div></div></section>

<section class="full"><div class="w"><div class="sh"><h2>תעודת ההוקרה המלאה</h2><p>התעודה כפי שנשלחה מלובאז למשרד.</p></div>
<div class="doc"><img src="{img}" width="1200" height="1200" alt="{ALT}" loading="lazy"></div>
<div class="btns"><a class="btn bs" href="{RATING}" target="_blank" rel="noopener">לדירוג המלא באתר לובאז</a></div></div></section>

<section class="faq"><div class="w"><div class="sh"><h2>שאלות ותשובות על הדירוג</h2></div>{faq}</div></section>

<section class="more"><div class="w"><h2>עוד על המשרד</h2><div class="lk">{lk}</div>
<div class="cta"><div><h2>רוצים לדבר עם עו״ד יקיר דבול?</h2><p>המשרד ברחוב רזיאל 1 בנתניה. אפשר להתקשר, לכתוב בווטסאפ או להשאיר פרטים.</p></div>
<div class="btns"><a class="btn bp" href="tel:098613413">{ic('phone')}09-8613413</a><a class="btn bs" href="https://wa.me/972505580189" target="_blank" rel="noopener">{ic('wa')}ווטסאפ</a></div></div>
</div></section>
</div>'''

def schema(img_url):
    pid = S + '/#yakir-dabul'
    award_node = {"@type": "Thing", "name": "LB10 2026", "description": AWARD}
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": PAGE_URL + "#webpage", "url": PAGE_URL, "inLanguage": "he-IL",
         "name": "עו״ד יקיר דבול נבחר לדירוג LB10 2026 של לובאז",
         "about": {"@id": pid}, "primaryImageOfPage": {"@id": PAGE_URL + "#certificate"}, "datePublished": "2026-10-23",
         "isPartOf": {"@id": S + "/#website"}, "mentions": {"@type": "Organization", "name": "לובאז (LawBuzz)", "url": "https://lawbuzz.co.il/"},
         "citation": {"@type": "CreativeWork", "name": "דירוג LB10 2026, לובאז", "url": RATING}},
        {"@type": "Person", "@id": pid, "name": "יקיר דבול", "award": [AWARD]},
        {"@type": ["LegalService", "Organization"], "@id": S + "/#organization", "award": [AWARD]},
        {"@type": "ImageObject", "@id": PAGE_URL + "#certificate", "url": img_url, "contentUrl": img_url, "caption": ALT,
         "width": 1200, "height": 1200, "about": {"@id": pid}, "creator": {"@type": "Organization", "name": "לובאז (LawBuzz)", "url": "https://lawbuzz.co.il/"}},
        {"@type": "FAQPage", "@id": PAGE_URL + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
        {"@type": "BreadcrumbList", "@id": PAGE_URL + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": S + "/"},
            {"@type": "ListItem", "position": 2, "name": "אודות המשרד", "item": ABOUT},
            {"@type": "ListItem", "position": 3, "name": "דירוג LB10 2026", "item": PAGE_URL}]},
    ]}

# ---------------------------------------------------------------- boxes for About (992) and Certificates (990)
BOX_CSS = """.dlb{--g:#c9a14f;--g2:#e7cd96;--n:#101a33;max-width:1100px;margin:34px auto;padding:0 20px;direction:rtl;text-align:right;font-family:"Noto Local","Heebo",Arial,sans-serif;box-sizing:border-box}
.dlb .dlb-in{display:flex;align-items:center;gap:26px;background:linear-gradient(120deg,#0c1428,var(--n) 55%,#1d2a50);border:1px solid rgba(231,205,150,.45);border-radius:20px;padding:22px 26px;color:#fff;box-shadow:0 14px 34px rgba(16,26,51,.14)}
.dlb .dlb-im{flex:none;display:block;width:132px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px rgba(231,205,150,.6),0 10px 22px rgba(0,0,0,.4);transform:rotate(-3deg);transition:transform .2s}
.dlb .dlb-im:hover{transform:rotate(0) scale(1.03)}
.dlb .dlb-im img{display:block;width:100%;height:auto}
.dlb .t{flex:1;min-width:0}
.dlb small{display:block;color:var(--g2);font-size:13px;font-weight:700;letter-spacing:.3px}
.dlb b{display:block;font-size:21px;font-weight:800;line-height:1.3;margin-top:4px;color:#fff}
.dlb p{margin:8px 0 0;color:#c9cedb;font-size:15px;line-height:1.7}
.dlb .go{flex:none;display:inline-flex;align-items:center;gap:8px;background:var(--g);color:#141414!important;font-weight:800;font-size:15px;border-radius:999px;padding:12px 20px;white-space:nowrap;text-decoration:none!important}
@media (max-width:767px){.dlb .dlb-in{flex-wrap:wrap;gap:16px;padding:18px}.dlb .dlb-im{width:92px}.dlb .t{flex-basis:calc(100% - 112px)}.dlb b{font-size:18px}.dlb .go{width:100%;justify-content:center}}"""

def box(kind, img_sm=IMG_SM, img=IMG, page_url=PAGE_URL):
    if kind == 'about':
        txt = ('<small>דירוג LB10 · לובאז 2026</small><b>נבחרתי לדירוג LB10 2026 של משרדי עורכי הדין המובילים בישראל</b>'
               '<p>בדירוג עורכות ועורכי הדין של ישראל לשנת 2026, שמפרסם אתר המשפט לובאז, נכלל המשרד בין משרדי עורכי הדין המובילים בתחומי המקרקעין וליקויי הבנייה ונזקי הרכוש.</p>')
        go = 'על הדירוג והתעודה'
    else:
        txt = ('<small>תעודת הוקרה · לובאז 2026</small><b>דירוג LB10 2026: משרדי עורכי הדין המובילים בישראל</b>'
               '<p>תעודת ההוקרה של לובאז לעו״ד יקיר דבול, על הכללתו בדירוג לשנת 2026 בתחומי מקרקעין וליקויי בנייה ונזקי רכוש. לחיצה על התעודה פותחת אותה בגודל מלא.</p>')
        go = 'לעמוד הדירוג'
    return (f'<div class="dlb" id="dabul-lb10-box"><style>{BOX_CSS}</style><div class="dlb-in">'
            f'<a class="dlb-im" href="{img}" target="_blank" rel="noopener" aria-label="תעודת ההוקרה בגודל מלא"><img src="{img_sm}" width="600" height="600" alt="{ALT}" loading="lazy"></a>'
            f'<span class="t">{txt}</span><a class="go" href="{page_url}">{go} &larr;</a></div></div>')

def wp_content(img_url):
    return '<!-- wp:html -->\n<style>' + CSS + '</style>\n' + body(img_url) + '\n<script type="application/ld+json">' + json.dumps(schema(img_url), ensure_ascii=False) + '</script>\n<!-- /wp:html -->'

def snippet(img_url, img_sm_url):
    about, certs = box('about', img_sm_url, img_url), box('certs', img_sm_url, img_url)
    return ("""/* dabul: LB10 2026 (LawBuzz) box on the About page and the Certificates page (Yakir 23.10.2026).
   About (992): right after the appointment-letter box. Certificates (990): right before the appointment-letter box.
   Page output only, nothing changed in Elementor. Undo: deactivate. */
add_filter('elementor/frontend/the_content', function ($content) {
	if (is_admin()) return $content;
	if (!is_page(992) && !is_page(990)) return $content;
	if (strpos($content, 'id="dabul-lb10-box"') !== false) return $content;
	$m = strpos($content, 'id="dabul-minui-box"');
	if ($m === false) return $content;
	$s = strrpos(substr($content, 0, $m), '<div');
	if ($s === false) return $content;
	if (is_page(992)) {
		$e = strpos($content, '</a></div>', $m);
		if ($e === false) return $content;
		$e += strlen('</a></div>');
		$h = <<<'DBLLB10A'
""" + about + """
DBLLB10A;
		return substr($content, 0, $e) . $h . substr($content, $e);
	}
	$h = <<<'DBLLB10C'
""" + certs + """
DBLLB10C;
	return substr($content, 0, $s) . $h . substr($content, $s);
}, 22);
""")

def w(name, s):
    open(os.path.join(D, name), 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    css = HDR_CSS + CSS
    w('lb10.preview.html', page('דירוג LB10 2026', css, mock_header().split('<div class="hero"')[0] + body() + '<div style="background:#141414;height:120px;opacity:.85"></div>'))
    demo = ('<div style="max-width:1100px;margin:24px auto 0;padding:0 20px;font:700 14px Heebo;color:#7a6a45">בעמוד אודות: מתחת לתיבת כתב המינוי</div>' + box('about') +
            '<div style="max-width:1100px;margin:40px auto 0;padding:0 20px;font:700 14px Heebo;color:#7a6a45">בעמוד תעודות והסמכות: מעל תיבת כתב המינוי</div>' + box('certs'))
    w('lb10-box.preview.html', page('תיבות LB10', '', demo))
    print('ok', PAGE_URL)
