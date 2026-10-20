#!/usr/bin/env python3
"""v2 of the Netanya page upgrade (post 3715, /עורך-דין-מקרקעין-בנתניה/), in the page's own visual language:
lvbl headings, lists, numbered steps and FAQ, the site's phone strip and Google reviews pill.
Text is the approved text from netanya-upgrade.html, with two accuracy fixes (see NOTES).
Outputs:
  netanya-upgrade-v2.html         preview: the live page snapshot with the new blocks in place ("חדש" chips are preview only)
  netanya-upgrade-v2.blocks.html  the blocks to paste, one per insertion point, plus the FAQ schema additions
Nothing is published."""
import json, re, sys, pathlib

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent / '_site'))
import shell

PHONE = '09-8613413'
S = 'https://dabullaw.co.il'
REVIEWS = S + '/%D7%94%D7%9E%D7%9C%D7%A6%D7%95%D7%AA/'

# small scoped addition for the service cards only, built from the lvbl tokens (colors, radius, border)
CARDS_CSS = ('<style id="dbl-ntn-css">.lvbl-article .dbl-ntn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.875rem;margin:1.25rem 0 2rem}'
             '.lvbl-article .dbl-ntn-cards a{display:block;text-decoration:none;font-weight:400;background:var(--lvbl-accent-softer);border:1px solid var(--lvbl-accent-chip-border);'
             'border-inline-start:4px solid var(--lvbl-accent);border-radius:.625rem;padding:1rem 1.15rem;color:var(--lvbl-fg);line-height:1.6}'
             '.lvbl-article .dbl-ntn-cards b{display:block;color:var(--lvbl-ink);font-size:1.15rem;font-weight:800;margin-bottom:.3rem}'
             '.lvbl-article .dbl-ntn-cards span{display:block;font-size:1rem}'
             '.lvbl-article .dbl-ntn-cards i{display:block;font-style:normal;color:var(--lvbl-accent);font-weight:700;font-size:1rem;margin-top:.5rem}'
             '.lvbl-article .dbl-ntn-cards a:hover{border-color:var(--lvbl-accent)}'
             '@media (max-width:640px){.lvbl-article .dbl-ntn-cards{grid-template-columns:1fr}}</style>')

CARDS = [
    ('%D7%9C%D7%99%D7%95%D7%95%D7%99-%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%A7%D7%95%D7%A0%D7%94/', 'קונים דירה יד שנייה', 'בדיקת נסח וזכויות, חוזה שמגן על הכסף, משכנתא ורישום.', 'ליווי בקניית דירה'),
    ('comprehensive-guide-selling-apartment-israel-legal-tax-stages/', 'מוכרים דירה', 'תכנון מס שבח, הסכם מכר, סילוק משכנתא וקבלת התמורה בבטחה.', 'ליווי במכירת דירה'),
    ('%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%9C%D7%90-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%9E%D7%A7%D7%91%D7%9C%D7%9F-2026/', 'קונים דירה מקבלן', 'ערבויות חוק המכר, מפרט, הצמדה למדד ואיחור במסירה.', 'קנייה מקבלן'),
    ('%D7%94%D7%AA%D7%97%D7%93%D7%A9%D7%95%D7%AA-%D7%A2%D7%99%D7%A8%D7%95%D7%A0%D7%99%D7%AA/', 'התחדשות עירונית', 'ייצוג בעלי דירות בפינוי בינוי ובתמ"א 38 מול היזם.', 'התחדשות עירונית'),
    ('%D7%9E%D7%99%D7%A1%D7%95%D7%99-%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F-%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%9C%D7%90/', 'מיסוי מקרקעין', 'מס רכישה, מס שבח, פטורים והיטל השבחה, לפני שחותמים.', 'מיסוי מקרקעין'),
]
STEPS = [
    ('שיחה ראשונה', 'מבינים את העסקה ומה כבר נחתם.'),
    ('בדיקות', 'נסח טאבו או רמ"י, תיק בניין בעיריית נתניה, חובות ועיקולים.'),
    ('משא ומתן וחוזה', 'תנאי תשלום, נאמנות ובטחונות.'),
    ('חתימה ודיווח', 'הערת אזהרה, דיווח למיסוי מקרקעין ואישורים.'),
    ('רישום', 'עד נסח טאבו חדש על שמכם.'),
]
CASES = [
    ('%D7%A7%D7%A0%D7%99%D7%99%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%9E%D7%A7%D7%91%D7%9C%D7%9F-%D7%9C%D7%9C%D7%90-%D7%A2%D7%95%D7%B4%D7%93/', 'קניית דירה מקבלן בלי עורך דין', 'זוג שסמך על הבטחות בעל פה של נציג המכירות, ומה התגלה כשבדקנו את החוזה.'),
    ('%D7%97%D7%95%D7%91%D7%95%D7%AA-%D7%94%D7%A7%D7%91%D7%9C%D7%9F-%D7%90%D7%99%D7%99%D7%9E%D7%95-%D7%9C%D7%91%D7%98%D7%9C-%D7%9E%D7%9B%D7%99%D7%A8%D7%94/', 'חובות של קבלן בנסח הטאבו של מוכרים', 'בדיקה שגרתית לפני מכירה חשפה עיקולים בגלל חובות של החברה שבנתה את הבניין. כך פתרנו את זה.'),
    ('%D7%97%D7%99%D7%A1%D7%9B%D7%95%D7%9F-%D7%91%D7%9E%D7%A1-%D7%A8%D7%9B%D7%99%D7%A9%D7%94/', 'תכנון מס רכישה ברכישת פנטהאוז', 'איך בדיקה של המצב המשפחתי של הקונים שינתה את חישוב מס הרכישה.'),
]
FAQ = [
    ('כבר חתמתי על זיכרון דברים. מה עושים עכשיו?', 'פונים לעורך דין עוד היום. זיכרון דברים יכול להיות חוזה מחייב, ומרגע החתימה רץ המועד לדיווח לרשות המסים, 30 יום. עורך הדין יבדוק מה בדיוק נחתם, אילו בדיקות עוד אפשר לעשות, ואיך להשלים את החוזה המלא בצורה שמגינה עליכם.'),
    ('מה מביאים לשיחה הראשונה?', 'את מה שיש לכם: כתובת הנכס, נסח טאבו או אישור זכויות אם כבר הוצאתם, זיכרון דברים או טיוטת חוזה אם קיימים, ופרטים על המשכנתא. אם אין לכם כלום מזה, זה בסדר. את הנסח והבדיקות המשרד מוציא בעצמו.'),
    ('מה ההבדל בין עורך הדין שלי לעורך הדין של הצד השני?', 'כל צד צריך עורך דין משלו. עורך הדין של המוכר, ובדירה מקבלן עורך הדין של הקבלן, מייצג רק את הצד שלו. עורך הדין שלכם בודק את הנכס, מנהל את המשא ומתן על החוזה ושומר על הכסף שלכם עד שהזכויות עוברות.'),
    # fix: removed "גם באנגלית ובצרפתית" (not verified anywhere in the office material)
    ('אני גר בחו"ל. אפשר לקנות דירה בנתניה בלי להגיע לארץ?', 'כן. אפשר לחתום בייפוי כוח שנחתם בקונסוליה או בפני נוטריון בחו"ל, ולהעביר את הכספים דרך חשבון נאמנות. המשרד מלווה גם עסקאות כאלה.'),
    ('המשרד מייצג גם דיירים בפינוי בינוי ובתמ"א 38 בנתניה?', 'כן. המשרד מייצג בעלי דירות מול היזם: בודק את התמורה בהסכם, את הערבויות ואת ערבות שכר הדירה לתקופת הפינוי, ומלווה עד מסירת הדירה החדשה.'),
]


def block_top():
    cards = ''.join(f'<a href="{S}/{u}"><b>{t}</b><span>{d}</span><i>{l} ←</i></a>' for u, t, d, l in CARDS)
    steps = ''.join(
        f'<li class="lvbl-li lvbl-li-num"><span class="lvbl-num" aria-hidden="true">{i}</span><span class="lvbl-li-body"><strong>{t}:</strong> {d}</span></li>\n'
        for i, (t, d) in enumerate(STEPS, 1))
    return (
        '<!-- dbl-ntn: services + steps + reviews (new) -->\n'
        '<h2 id="sherutim" class="lvbl-h2">במה המשרד מלווה אתכם בנתניה</h2>\n'
        '<p class="lvbl-p">עו"ד יקיר דבול מלווה קונים ומוכרים של דירות בנתניה ובשרון, משלב הבדיקות ועד שהדירה רשומה על שמכם בטאבו. בחרו את סוג העסקה שלכם:</p>\n'
        f'<div class="dbl-ntn-cards">{cards}</div>\n'
        '<h3 class="lvbl-h3"><span class="lvbl-h3-dot" aria-hidden="true"></span>איך זה עובד, בחמישה שלבים</h3>\n'
        f'<ol class="lvbl-ol">\n{steps}</ol>\n'
        # fix: the full process section already has id="hatahalich" on the live page, so the link goes there
        '<p class="lvbl-p">הפירוט המלא של כל שלב נמצא בהמשך העמוד, בפרק <a href="#hatahalich">"התהליך המלא"</a>.</p>\n'
        # the Google reviews pill, same markup as the one already on the page
        f'<div class="no-toc" style="text-align:center;margin:26px 0;"><a href="{REVIEWS}" style="text-decoration:none;">'
        '<div style="display:inline-flex; align-items:center; gap:12px; background:#f2f2f2; border-radius:12px; padding:14px 24px; flex-wrap:wrap; justify-content:center;">'
        '<span style="font-size:18px; color:#000000; font-weight:600;">מְעוּלֶּה</span>'
        '<span style="color:#FBBC04; font-size:22px; letter-spacing:2px;">★★★★★</span>'
        '<span style="font-size:17px; color:#000000; font-weight:600;">74 ביקורות</span>'
        '<span style="font-size:20px; font-weight:700;"><span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC04;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span></span>'
        '</div><div style="margin-top:8px;color:#8b6f47;font-size:16px;text-decoration:underline;">לקריאת מה לקוחות כתבו</div></a></div>\n'
        '<div style="background-color: #f5edda; border: 1px solid #d9c08a; border-right: 4px solid #b8932f; border-radius: 10px; padding: 14px 20px; margin: 28px 0; text-align: center; font-size: 17px; line-height: 1.6; color: #5c4528;">'
        f'רוצים לדבר על העסקה שלכם? התקשרו: <strong><a style="color: #8b6f47; font-weight: 800; text-decoration: none; white-space: nowrap;" href="tel:{PHONE}">{PHONE}</a></strong></div>\n'
    )


def block_cases():
    lis = ''.join(
        f'<li class="lvbl-li"><span class="lvbl-bullet" aria-hidden="true"></span><span class="lvbl-li-body"><strong><a href="{S}/{u}">{t}</a></strong>: {d}</span></li>\n'
        for u, t, d in CASES)
    return ('<!-- dbl-ntn: case stories (new) -->\n'
            '<h2 id="mikrim" class="lvbl-h2">מקרים מהמשרד</h2>\n'
            f'<ul class="lvbl-ul">\n{lis}</ul>\n')


def faq_items(start):
    return ''.join(
        f'<details class="lvbl-faq-item">\n<summary class="lvbl-faq-q"><span class="lvbl-faq-num">{i}</span><span class="lvbl-faq-qt">{q}</span></summary>\n'
        f'<div class="lvbl-faq-a">\n<p class="lvbl-p">{a}</p>\n</div>\n</details>\n'
        for i, (q, a) in enumerate(FAQ, start))


def faq_schema_items():
    return [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]


NEW_TAG = '<div class="dbl-new-tag">חדש</div>'
TAG_CSS = ('<style>.dbl-new-tag{display:inline-block;margin:28px 0 -14px;background:#8b6f47;color:#fff;font:700 12px/1 "Noto Sans Hebrew",Arial;'
           'padding:5px 10px;border-radius:99px}</style>')


def build_preview():
    s = shell.load('netanya')
    a = s.index(shell.LVBL_START)
    art_end = s.index('</script></p>', a)
    seg = s[a:art_end]
    # 1. services, steps, reviews: right after the intro, before the first section
    seg = seg.replace('<h2 id="mekomi"', NEW_TAG + block_top() + '<h2 id="mekomi"', 1)
    # 2. cases: before "איך מגיעים אלינו"
    seg = seg.replace('<h2 id="eich-magiim"', NEW_TAG + block_cases() + '<h2 id="eich-magiim"', 1)
    # 3. FAQ: five new questions appended to the nine existing ones
    n = seg.count('lvbl-faq-num')
    last = seg.rfind('</details>') + len('</details>\n')
    seg = seg[:last] + faq_items(n + 1) + seg[last:]
    seg = seg.replace('<span class="lvbl-faq-num">10</span>', '<span class="lvbl-faq-num" style="background:#8b6f47;color:#fff">10</span>')
    s = s[:a] + CARDS_CSS + seg + s[art_end:]
    # FAQ schema additions inside the existing JSON-LD graph
    s = s.replace('"FAQPage",\n      "mainEntity": [\n', '"FAQPage",\n      "mainEntity": [\n        '
                  + ',\n        '.join(json.dumps(x, ensure_ascii=False) for x in faq_schema_items()) + ',\n', 1)
    h2s = re.findall(r'<h2 id="([^"]+)" class="lvbl-h2[^"]*">(.*?)</h2>', s[a:])
    s = shell.fill_toc(s, h2s)
    s = shell.unlazy(s)
    s = s.replace('</head>', shell.PREVIEW_CSS + TAG_CSS + '</head>', 1)
    return s


def build_blocks():
    out = ['<!-- Netanya page upgrade v2: blocks to add to post 3715. Everything existing stays as it is. -->',
           '<!-- A. once, at the top of the post content (scoped styles for the service cards only) -->', CARDS_CSS,
           '<!-- B. right after the "נעים להכיר" paragraph, before <h2 id="mekomi"> -->', block_top(),
           '<!-- C. before <h2 id="eich-magiim"> -->', block_cases(),
           '<!-- D. inside <div class="lvbl-faq">, after the 9th question -->', faq_items(10),
           '<!-- E. add these five entries to "mainEntity" of the FAQPage in the page JSON-LD -->',
           '<!--\n' + json.dumps(faq_schema_items(), ensure_ascii=False, indent=1) + '\n-->',
           '<!-- F. text fixes in the existing content, only if Yakir approves:\n'
           '  1. "עו"ד יקיר דבול והצוות המשפטי מעורבים באופן אישי" -> "עו"ד יקיר דבול מעורב באופן אישי"\n'
           '  2. "One-Stop-Shop" -> "מענה מלא במקום אחד", "Full Service" -> "ליווי מלא"\n'
           '  3. link text "המפית הכי יקרה שתחתמו עליה" -> "המפית היקרה שתחתמו עליה" -->']
    return '\n'.join(out) + '\n'


(HERE / 'netanya-upgrade-v2.html').write_text(build_preview())
(HERE / 'netanya-upgrade-v2.blocks.html').write_text(build_blocks())
print('ok')
