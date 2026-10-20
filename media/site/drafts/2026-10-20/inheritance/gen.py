#!/usr/bin/env python3
"""Drafts (not published) of two new pages for dabullaw.co.il: צו ירושה and צו קיום צוואה.
Inline-styled WordPress HTML fragments. Facts from gov.il and kolzchut (fees marked 'נכון ל-2026')."""
import json, pathlib, html

HERE = pathlib.Path(__file__).parent
NAVY, GOLD = '#17253F', '#C6A03C'
PHONE, PHONE_TEL = '09-8613413', '+97298613413'
SITE = 'https://dabullaw.co.il'

L = {
    'itur': SITE + '/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A6%D7%95-%D7%99%D7%A8%D7%95%D7%A9%D7%94/',
    'rishum': SITE + '/%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%9C%D7%90-%D7%9C%D7%A8%D7%99%D7%A9%D7%95%D7%9D-%D7%99%D7%A8%D7%95%D7%A9%D7%94/',
    'hub': SITE + '/%D7%A6%D7%95%D7%95%D7%90%D7%95%D7%AA-%D7%95%D7%99%D7%A8%D7%95%D7%A9%D7%95%D7%AA/',
    'online': SITE + '/online/inheritance-order/',
    'mechira': SITE + '/%D7%9E%D7%9B%D7%99%D7%A8%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%A9%D7%94%D7%AA%D7%A7%D7%91%D7%9C%D7%94-%D7%91%D7%99%D7%A8%D7%95%D7%A9%D7%94/',
}
SRC = {
    'gov_yerusha': ('הרשם לענייני ירושה: בקשה לצו ירושה (gov.il)', 'https://www.gov.il/he/service/inheritance_order'),
    'gov_kiyum': ('הרשם לענייני ירושה: בקשה לצו קיום צוואה (gov.il)', 'https://www.gov.il/he/service/probate_order'),
    'gov_hitnag_y': ('התנגדות למתן צו ירושה (gov.il)', 'https://www.gov.il/he/service/opposition_to_the_inheritance_order'),
    'gov_hitnag_k': ('התנגדות לצו קיום צוואה (gov.il)', 'https://www.gov.il/he/service/probate_objection'),
    'kz_yerusha': ('כל זכות: הגשת בקשה לצו ירושה', 'https://www.kolzchut.org.il/he/%D7%91%D7%A7%D7%A9%D7%94_%D7%9C%D7%A6%D7%95_%D7%99%D7%A8%D7%95%D7%A9%D7%94'),
    'kz_kiyum': ('כל זכות: הגשת בקשה לצו קיום צוואה', 'https://www.kolzchut.org.il/he/%D7%91%D7%A7%D7%A9%D7%94_%D7%9C%D7%A6%D7%95_%D7%A7%D7%99%D7%95%D7%9D_%D7%A6%D7%95%D7%95%D7%90%D7%94'),
    'guide_nowill': ('משרד המשפטים: מדריך ליורשים של מנוח שלא הותיר צוואה', 'https://www.gov.il/he/Departments/Guides/guide_with_no_will'),
    'guide_will': ('משרד המשפטים: מדריך לזכויות כשהמנוח הותיר צוואה', 'https://www.gov.il/he/departments/guides/guide_with_will'),
    'law': ('חוק הירושה, התשכ"ה-1965 (ויקיטקסט)', 'https://he.wikisource.org/wiki/%D7%97%D7%95%D7%A7_%D7%94%D7%99%D7%A8%D7%95%D7%A9%D7%94'),
}

F = "font-family:Heebo,Arial,sans-serif"
def a(url, text):
    return f'<a href="{url}" style="color:{NAVY};font-weight:600;text-decoration:underline;text-decoration-color:{GOLD};text-underline-offset:3px">{text}</a>'

def ref(n):
    return f'<sup style="font-size:12px"><a href="#src-{n}" style="color:{GOLD};text-decoration:none">[{n}]</a></sup>'

def h2(t):
    return (f'<h2 style="{F};color:{NAVY};font-size:28px;font-weight:700;margin:44px 0 6px;line-height:1.3">{t}</h2>'
            f'<div style="width:60px;height:3px;background:{GOLD};margin:0 0 18px"></div>')

def p(t):
    return f'<p style="{F};font-size:18px;line-height:1.85;color:#2b2f36;margin:0 0 16px">{t}</p>'

def ul(items):
    lis = ''.join(f'<li style="margin:0 0 8px">{i}</li>' for i in items)
    return f'<ul style="{F};font-size:18px;line-height:1.8;color:#2b2f36;margin:0 0 18px;padding-inline-start:22px">{lis}</ul>'

def box(title, body, bg='#F7F4EC', border=GOLD):
    return (f'<div style="{F};background:{bg};border-inline-start:5px solid {border};border-radius:10px;padding:20px 24px;margin:22px 0">'
            f'<div style="font-weight:700;color:{NAVY};font-size:19px;margin:0 0 8px">{title}</div>'
            f'<div style="font-size:17px;line-height:1.8;color:#2b2f36">{body}</div></div>')

def table(head, rows):
    th = ''.join(f'<th style="background:{NAVY};color:#fff;padding:12px 14px;text-align:right;font-weight:600">{h}</th>' for h in head)
    trs = ''
    for i, r in enumerate(rows):
        bg = '#fff' if i % 2 == 0 else '#F5F7FA'
        trs += '<tr>' + ''.join(f'<td style="padding:11px 14px;border-bottom:1px solid #E3E7EE;background:{bg};vertical-align:top">{c}</td>' for c in r) + '</tr>'
    return (f'<div style="overflow-x:auto;margin:10px 0 22px"><table style="{F};width:100%;border-collapse:collapse;font-size:16px;line-height:1.6;color:#2b2f36">'
            f'<thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')

def steps(items):
    out = ''
    for i, (t, d) in enumerate(items, 1):
        out += (f'<div style="display:flex;gap:16px;align-items:flex-start;margin:0 0 16px">'
                f'<div style="flex:0 0 40px;height:40px;border-radius:50%;background:{NAVY};color:{GOLD};font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center;{F}">{i}</div>'
                f'<div style="{F}"><div style="font-weight:700;color:{NAVY};font-size:19px;margin:6px 0 4px">{t}</div>'
                f'<div style="font-size:17px;line-height:1.75;color:#2b2f36">{d}</div></div></div>')
    return f'<div style="margin:8px 0 20px">{out}</div>'

def faq(items):
    out = ''
    for q, ans in items:
        out += (f'<details style="{F};border:1px solid #E3E7EE;border-radius:10px;margin:0 0 10px;background:#fff">'
                f'<summary style="cursor:pointer;padding:16px 18px;font-weight:700;color:{NAVY};font-size:18px">{q}</summary>'
                f'<div style="padding:0 18px 16px;font-size:17px;line-height:1.8;color:#2b2f36">{ans}</div></details>')
    return out

def cta(title, text):
    return (f'<div style="{F};background:{NAVY};border-radius:14px;padding:30px 28px;margin:36px 0;color:#fff;text-align:center">'
            f'<div style="font-size:24px;font-weight:700;margin:0 0 8px;color:#fff">{title}</div>'
            f'<div style="font-size:17px;line-height:1.7;margin:0 0 18px;color:#E8ECF3">{text}</div>'
            f'<a href="tel:{PHONE_TEL}" style="display:inline-block;background:{GOLD};color:{NAVY};font-weight:700;font-size:19px;padding:13px 30px;border-radius:30px;text-decoration:none">התקשרו: {PHONE}</a></div>')

def strip(text):
    return (f'<div style="{F};display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;border:1px solid {GOLD};border-radius:12px;padding:16px 20px;margin:26px 0;background:#FFFCF4">'
            f'<div style="font-size:17px;color:{NAVY};font-weight:600">{text}</div>'
            f'<a href="tel:{PHONE_TEL}" style="color:{NAVY};font-weight:700;font-size:18px;text-decoration:none;border-bottom:2px solid {GOLD}">{PHONE}</a></div>')

def sources(keys):
    lis = ''.join(f'<li id="src-{i}" style="margin:0 0 6px"><a href="{SRC[k][1]}" target="_blank" rel="noopener" style="color:{NAVY}">{SRC[k][0]}</a></li>' for i, k in enumerate(keys, 1))
    return h2('מקורות') + f'<ol style="{F};font-size:15px;line-height:1.7;color:#4a5160;padding-inline-start:22px">{lis}</ol>'

def schema(d):
    g = [
        {'@type': 'Article', 'headline': d['h1'], 'description': d['meta'], 'inLanguage': 'he-IL', 'datePublished': '2026-10-21', 'dateModified': '2026-10-21',
         'author': {'@type': 'Person', 'name': 'עו"ד יקיר דבול', 'url': SITE + '/'},
         'publisher': {'@type': 'LegalService', 'name': 'יקיר דבול - משרד עורכי דין', 'url': SITE + '/', 'telephone': PHONE},
         'mainEntityOfPage': d['url']},
        {'@type': 'HowTo', 'name': d['howto_name'], 'step': [{'@type': 'HowToStep', 'position': i, 'name': t, 'text': strip_tags(x)} for i, (t, x) in enumerate(d['steps'], 1)]},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': strip_tags(x)}} for q, x in d['faq']]},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'דף הבית', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'צוואות וירושות', 'item': L['hub']},
            {'@type': 'ListItem', 'position': 3, 'name': d['crumb'], 'item': d['url']}]},
    ]
    return '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': g}, ensure_ascii=False) + '</script>'

import re
def strip_tags(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()

def page(d):
    body = (f'<div dir="rtl" style="{F};max-width:860px;margin:0 auto;padding:10px 16px 40px;color:#2b2f36">'
            f'<h1 style="{F};color:{NAVY};font-size:38px;font-weight:800;line-height:1.25;margin:10px 0 14px">{d["h1"]}</h1>'
            + p(f'<strong>{d["lead"]}</strong>')
            + box('עיקרי הדברים', ul(d['key']), bg='#F3F5F9', border=NAVY)
            + p('נעים להכיר: עו"ד יקיר דבול, חבר ב-5 ועדות של לשכת עורכי הדין. המשרד מגיש בקשות לצו ירושה ולצו קיום צוואה לרשם לענייני ירושה בכל הארץ, בהגשה מקוונת ובחתימה מרחוק.')
            + d['body'] + faq_block(d) + cta(d['cta_t'], d['cta_x']) + sources(d['src']) + '</div>' + schema(d))
    return body

def faq_block(d):
    return h2('שאלות נפוצות') + faq(d['faq'])

# ---------------------------------------------------------------- צו ירושה
Y = {
    'url': SITE + '/%D7%A6%D7%95-%D7%99%D7%A8%D7%95%D7%A9%D7%94/',
    'crumb': 'צו ירושה',
    'h1': 'צו ירושה: איך מגישים בקשה, כמה זה עולה וכמה זמן לוקח',
    'meta': 'צו ירושה נדרש כשהמנוח לא השאיר צוואה. מי מגיש, אילו מסמכים, אגרה של 507 ש"ח בהגשה מקוונת (2026), תוך כמה זמן ניתן הצו ומה עושים כשיש התנגדות.',
    'lead': 'צו ירושה הוא המסמך שקובע מי היורשים של אדם שנפטר בלי צוואה, ובאיזה חלק כל אחד יורש. מגישים אותו לרשם לענייני ירושה, בדרך כלל באופן מקוון, והצו ניתן ככלל תוך 50 יום מהגשה תקינה.',
    'key': [
        f'צו ירושה מגישים כשאין צוואה. כשיש צוואה מגישים בקשה לצו קיום צוואה {ref(1)}',
        f'אגרת פתיחת בקשה מקוונת: 507 ש"ח, ועוד 66 ש"ח הוצאות פרסום (נכון ל-2026). בהגשה ידנית: 597 ש"ח {ref(1)}',
        f'הצו ניתן ככלל לא יאוחר מ-50 יום מהגשה תקינה, כולל תקופת הפרסום {ref(1)}',
        f'הצו דיגיטלי בלבד, ונשלח ישירות לבנקים, לרשות המסים ולטאבו {ref(1)}',
        f'אם מוגשת התנגדות, התיק עובר לבית המשפט לענייני משפחה {ref(2)}',
    ],
    'howto_name': 'איך מגישים בקשה לצו ירושה',
    'steps': [
        ('בודקים שאין צוואה', 'לפני הכל בודקים אם המנוח הפקיד צוואה אצל הרשם לענייני ירושה. הבדיקה נעשית באתר הרשם ואינה כרוכה בתשלום. אם יש צוואה, ההליך הוא צו קיום צוואה.'),
        ('אוספים את פרטי היורשים', 'צריך את הפרטים של כל היורשים על פי דין: בן או בת הזוג, הילדים, ולפעמים ההורים או האחים. לכל יורש שולחים הודעה על הגשת הבקשה בדואר רשום או במסירה אישית.'),
        ('מכינים את המסמכים', 'טופס הבקשה, אישור על משלוח ההודעה ליורשים, תצהיר הסתלקות של מי שמוותר על חלקו (מאומת בידי עורך דין), ייפוי כוח אם יש ייצוג, ותעודת פטירה אם למנוח לא הייתה תעודת זהות ישראלית.'),
        ('מגישים ומשלמים אגרה', 'מגישים את הבקשה באתר הרשם ומשלמים את האגרה. עורך דין חייב להגיש באופן מקוון. כשבין היורשים יש אחים, אחיינים, סבים, דודים או בני דודים, ההגשה ידנית בלבד.'),
        ('פרסום והמתנה להתנגדויות', 'אחרי שהבקשה נמצאה תקינה, הרשם מפרסם הודעה ברשומות ובאתר שלו. כל עוד הצו לא ניתן, אפשר להגיש נגדו התנגדות.'),
        ('מקבלים את הצו', 'הרשם נותן את הצו באופן דיגיטלי, שולח אותו בדוא"ל ומעביר אותו ישירות לגופים כמו בנקים, חברות ביטוח, רשות המסים ולשכת רישום המקרקעין.'),
    ],
}
Y['body'] = (
    h2('מתי צריך צו ירושה')
    + p(f'כשאדם נפטר, הרכוש שלו (העיזבון) לא עובר לבד ליורשים. בנק לא ישחרר כסף מחשבון, והטאבו לא ירשום דירה על שם היורשים, בלי צו. כשהמנוח לא השאיר צוואה, העיזבון מתחלק לפי הסדר שקובע חוק הירושה (סעיפים 10 ו-11), והצו קובע מי היורשים ומה החלק של כל אחד {ref(3)}.')
    + p(f'אם הייתה צוואה, מגישים {a(SITE + "/%D7%A6%D7%95-%D7%A7%D7%99%D7%95%D7%9D-%D7%A6%D7%95%D7%95%D7%90%D7%94/", "בקשה לצו קיום צוואה")} במקום. אם הצוואה לא כללה את כל הרכוש, אפשר להגיש גם צו ירושה על היתרה {ref(1)}. לא בטוחים אם כבר ניתן צו? {a(L["itur"], "כך מאתרים צו ירושה קיים")}.')
    + box('שימו לב', 'בקשה שמוגשת עם פרטים חסרים או בלי הודעה לכל היורשים לא נחשבת תקינה, וספירת הזמן מתחילה רק כשהיא מתוקנת. הודעת הדוא"ל הראשונה מהרשם מאשרת רק שהטופס נשלח, לא שהבקשה תקינה.', bg='#FFF6F2', border='#C0492B')
    + h2('איך מגישים: שלב אחרי שלב')
    + steps(Y['steps'])
    + strip('רוצים שנגיש את הבקשה בשבילכם? עובדים עם יורשים מכל הארץ, בלי להגיע למשרד.')
    + h2('כמה עולה צו ירושה: האגרות')
    + table(['מה משלמים', 'סכום', 'הערות'], [
        ['אגרת פתיחת בקשה, הגשה מקוונת', '507 ש"ח', 'נכון ל-2026'],
        ['הוצאות פרסום', '66 ש"ח', 'נכון ל-2026'],
        ['אגרת פתיחת בקשה, הגשה ידנית', '597 ש"ח', 'נכון ל-2026'],
        ['רישום הירושה בטאבו כחלק מהבקשה', '183 ש"ח', 'נכון ל-2025, אם מסמנים בטופס'],
    ])
    + p(f'בני משפחה מדרגה ראשונה של חללי צה"ל ופעולות איבה, וכן של מי שנפטר בשירות צבאי או במילואים, פטורים מהאגרות {ref(1)}. שכר הטרחה של עורך דין הוא נפרד מהאגרות.')
    + h2('כמה זמן לוקח לקבל צו ירושה')
    + p(f'לפי הרשם לענייני ירושה, הצו ניתן ככלל לא יאוחר מ-50 יום מיום ההגשה התקינה, כולל תקופת הפרסום, אלא אם נדרשים מסמכים או פרטים נוספים {ref(1)}. התנגדות או בקשה להשלמת מסמכים מאריכות את הזמן.')
    + h2('מה קורה כשיש התנגדות')
    + p(f'מי שחושב שהצו לא נכון יכול להגיש התנגדות כל עוד הצו לא ניתן. ההתנגדות מוגשת עם תצהיר מאומת בידי עורך דין ואישור תשלום אגרה {ref(2)}. כשמוגשת התנגדות, הרשם מעביר את הבקשה לבית המשפט לענייני משפחה. התיק עובר לבית המשפט גם כשהמדינה צד לבקשה, או כשהאפוטרופוס הכללי מנהל את הרכוש של אחד הצדדים {ref(1)}.')
    + h2('אחרי הצו: מה עושים עם הדירה')
    + p(f'בבקשה עצמה אפשר לסמן שהזכויות בדירה יירשמו בטאבו על שם היורשים, בלי בקשה נפרדת {ref(1)}. מה עוד צריך לבדוק: {a(L["rishum"], "המדריך לרישום ירושה בטאבו")}, ואם מוכרים: {a(L["mechira"], "מכירת דירה שהתקבלה בירושה")}. כל הנושאים במקום אחד: {a(L["hub"], "צוואות וירושות")}.')
)
Y['faq'] = [
    ('האם אפשר להגיש צו ירושה בלי עורך דין?', 'כן. יורש שאינו מיוצג יכול להגיש בעצמו, באופן מקוון או ידני. עורך דין עוזר לוודא שהבקשה תקינה מההתחלה, ומטפל בהודעות ליורשים, בתצהירי הסתלקות ובמקרים עם קטינים או יורשים בחו"ל.'),
    ('כמה עולה אגרת צו ירושה ב-2026?', 'בהגשה מקוונת 507 ש"ח, ועוד 66 ש"ח הוצאות פרסום. בהגשה ידנית 597 ש"ח. רישום הירושה בטאבו במסגרת הבקשה עולה 183 ש"ח (נכון ל-2025).'),
    ('תוך כמה זמן ניתן צו ירושה?', 'ככלל לא יאוחר מ-50 יום מיום ההגשה התקינה, כולל תקופת הפרסום. אם הרשם מבקש מסמכים נוספים או שמוגשת התנגדות, זה לוקח יותר.'),
    ('מה ההבדל בין צו ירושה לצו קיום צוואה?', 'צו ירושה מגישים כשאין צוואה, והעיזבון מתחלק לפי החוק. צו קיום צוואה מגישים כשיש צוואה, והעיזבון מתחלק לפי מה שכתוב בה.'),
    ('האם צריך להציג את הצו בבנק?', 'לא. הצו דיגיטלי בלבד, והרשם שולח אותו ישירות לבנקים, לחברות הביטוח, לרשות המסים, לרשות מקרקעי ישראל ולטאבו.'),
]
Y['src'] = ['kz_yerusha', 'gov_hitnag_y', 'law', 'gov_yerusha', 'guide_nowill']
Y['cta_t'] = 'צריכים צו ירושה?'
Y['cta_x'] = 'נבדוק את המצב, נכין את הבקשה ונגיש אותה לרשם לענייני ירושה. עובדים עם יורשים מכל הארץ, כולל חתימה מרחוק.'

# ---------------------------------------------------------------- צו קיום צוואה
K = {
    'url': SITE + '/%D7%A6%D7%95-%D7%A7%D7%99%D7%95%D7%9D-%D7%A6%D7%95%D7%95%D7%90%D7%94/',
    'crumb': 'צו קיום צוואה',
    'h1': 'צו קיום צוואה: איך מגישים בקשה, מה צריך וכמה זמן זה לוקח',
    'meta': 'צו קיום צוואה הופך את הצוואה למחייבת. מי מגיש, אילו מסמכים, משלוח הצוואה המקורית תוך 7 ימים, אגרה של 507 ש"ח (2026), ומה קורה כשיש התנגדות.',
    'lead': 'צו קיום צוואה הוא ההחלטה שהופכת את הצוואה של המנוח למחייבת, כך שאפשר לחלק את העיזבון לפיה. מגישים אותו לרשם לענייני ירושה, שולחים אליו את הצוואה המקורית תוך 7 ימים, והצו ניתן ככלל תוך 50 יום מהגשה תקינה.',
    'key': [
        f'מגיש את הבקשה מי שרשום כזוכה בצוואה, או עורך דין מטעמו {ref(1)}',
        f'את הצוואה המקורית שולחים בדואר רשום או מוסרים במשרדי הרשם תוך 7 ימים מההגשה המקוונת {ref(1)}',
        f'אגרת פתיחת בקשה מקוונת: 507 ש"ח, ועוד 66 ש"ח הוצאות פרסום (נכון ל-2026) {ref(1)}',
        f'כשהזוכים אינם בני משפחה, צריך להודיע גם לילדים ולבן הזוג של המנוח {ref(1)}',
        f'התנגדות מעבירה את התיק לבית המשפט לענייני משפחה {ref(2)}',
    ],
    'howto_name': 'איך מגישים בקשה לצו קיום צוואה',
    'steps': [
        ('מאתרים את הצוואה המקורית', 'צריך את המקור, לא צילום. אם הצוואה הופקדה אצל הרשם לענייני ירושה, בודקים זאת באתר הרשם. אם המקור לא נמצא, מגישים בנוסף בקשה להוכחת הצוואה ומשלמים אגרה נוספת.'),
        ('שולחים הודעה לזוכים ולמשפחה', 'כל מי שרשום כזוכה בצוואה מקבל הודעה בדואר רשום או במסירה אישית. כשהזוכים אינם בני משפחה, מודיעים גם לילדים ולבן הזוג של המנוח, ואם אין כאלה, להורים או לאחים.'),
        ('מכינים את המסמכים', 'טופס הבקשה, סריקה של הצוואה, אישורי משלוח ההודעות, תצהיר הסתלקות של מי שמוותר (מאומת בידי עורך דין), ייפוי כוח אם יש ייצוג, ותרגום נוטריוני למסמך בשפה זרה שאינה אנגלית.'),
        ('מגישים, משלמים ושולחים את המקור', 'מגישים באתר הרשם ומשלמים את האגרה. תוך 7 ימים שולחים את הצוואה המקורית בדואר רשום, או מוסרים אותה במשרדי הרשם במחוז שבו גר המנוח.'),
        ('פרסום והמתנה להתנגדויות', 'אחרי שהבקשה נמצאה תקינה, הרשם מפרסם הודעה ברשומות ובאתר שלו. כל עוד הצו לא ניתן, אפשר להגיש נגדו התנגדות.'),
        ('מקבלים את הצו', 'הצו ניתן באופן דיגיטלי, נשלח בדוא"ל ומועבר ישירות לבנקים, לחברות הביטוח, לרשות המסים, לרשות מקרקעי ישראל ולטאבו.'),
    ],
}
K['body'] = (
    h2('מה זה צו קיום צוואה ולמה צריך אותו')
    + p(f'צוואה לבד לא מספיקה כדי לקבל את הירושה. כל עוד לא ניתן צו קיום, הבנק לא יעביר כספים לפי הצוואה והטאבו לא ירשום דירה על שם הזוכים. הצו מאשר שהצוואה תקפה, ומאפשר לבצע אותה {ref(3)}.')
    + p(f'אם הצוואה לא כוללת את כל הרכוש, מגישים על היתרה גם {a(SITE + "/%D7%A6%D7%95-%D7%99%D7%A8%D7%95%D7%A9%D7%94/", "בקשה לצו ירושה")}. אם בכלל לא הייתה צוואה, ההליך הוא צו ירושה בלבד. כל הנושאים במקום אחד: {a(L["hub"], "צוואות וירושות")}.')
    + box('שימו לב', 'בלי הצוואה המקורית התיק לא מתקדם. אם המקור לא נשלח לרשם תוך 7 ימים מההגשה המקוונת, הבקשה לא תטופל. אם המקור אבד, צריך הליך נפרד להוכחת הצוואה.', bg='#FFF6F2', border='#C0492B')
    + h2('איך מגישים: שלב אחרי שלב')
    + steps(K['steps'])
    + strip('רוצים שנגיש את הבקשה בשבילכם? עובדים עם זוכים בצוואה מכל הארץ, בלי להגיע למשרד.')
    + h2('כמה עולה צו קיום צוואה: האגרות')
    + table(['מה משלמים', 'סכום', 'הערות'], [
        ['אגרת פתיחת בקשה, הגשה מקוונת', '507 ש"ח', 'נכון ל-2026'],
        ['הוצאות פרסום', '66 ש"ח', 'נכון ל-2026'],
        ['אגרת פתיחת בקשה, הגשה ידנית', '597 ש"ח', 'נכון ל-2026'],
        ['רישום הזכויות בטאבו כחלק מהבקשה', '183 ש"ח', 'נכון ל-2025, אם מסמנים בטופס'],
    ])
    + p(f'אם הצוואה המקורית לא נמצאה, משלמים בנוסף אגרת "כל בקשה אחרת" על הבקשה להוכחת הצוואה {ref(1)}. שכר הטרחה של עורך דין הוא נפרד מהאגרות.')
    + h2('כמה זמן לוקח לקבל צו קיום צוואה')
    + p(f'ככלל, הצו ניתן לא יאוחר מ-50 יום מהגשה תקינה, כולל תקופת הפרסום, אלא אם נדרשים מסמכים או פרטים נוספים {ref(1)}. הזמן נספר רק אחרי שהצוואה המקורית הגיעה לרשם והבקשה נמצאה תקינה.')
    + h2('התנגדות לצוואה')
    + p(f'מי שחושב שהצוואה פסולה, למשל בגלל השפעה בלתי הוגנת או פגם בעריכתה, יכול להגיש התנגדות כל עוד הצו לא ניתן {ref(2)}. התיק עובר אז לבית המשפט לענייני משפחה, וההליך יכול להימשך זמן רב. אחרי שהצו ניתן, אפשר לבקש לתקן או לבטל אותו בבקשה נפרדת {ref(1)}.')
    + h2('אחרי הצו: רישום ומכירה של דירה')
    + p(f'בבקשה עצמה אפשר לסמן שהזכויות בדירה יירשמו בטאבו על שם הזוכים {ref(1)}. להמשך: {a(L["rishum"], "רישום ירושה בטאבו")} ו{a(L["mechira"], "מכירת דירה שהתקבלה בירושה")}.')
)
K['faq'] = [
    ('האם חייבים את הצוואה המקורית?', 'כן. את המקור שולחים לרשם בדואר רשום או מוסרים במשרדיו תוך 7 ימים מההגשה המקוונת. אם המקור אבד, מגישים בקשה להוכחת הצוואה.'),
    ('מי יכול להגיש בקשה לצו קיום צוואה?', 'מי שרשום כזוכה בצוואה, או עורך דין מטעמו. עורך דין חייב להגיש באופן מקוון, ומי שמגיש בעצמו יכול להגיש מקוון או ידני.'),
    ('כמה עולה אגרת צו קיום צוואה ב-2026?', 'בהגשה מקוונת 507 ש"ח, ועוד 66 ש"ח הוצאות פרסום. בהגשה ידנית 597 ש"ח.'),
    ('תוך כמה זמן ניתן צו קיום צוואה?', 'ככלל לא יאוחר מ-50 יום מהגשה תקינה, כולל הפרסום. התנגדות או בקשה להשלמת מסמכים מאריכות את הזמן.'),
    ('אפשר להגיש בבית הדין הרבני?', 'כן, בתנאי שכל הצדדים מסכימים. במקרה כזה מגישים טופס סמכות והקנאה. ברוב המקרים מגישים לרשם לענייני ירושה.'),
]
K['src'] = ['kz_kiyum', 'gov_hitnag_k', 'guide_will', 'gov_kiyum', 'law']
K['cta_t'] = 'צריכים צו קיום צוואה?'
K['cta_x'] = 'נבדוק את הצוואה ואת המסמכים, נכין את הבקשה ונגיש אותה לרשם לענייני ירושה. עובדים עם זוכים מכל הארץ, כולל חתימה מרחוק.'

for name, d in [('tzav-yerusha', Y), ('tzav-kiyum-tzavaa', K)]:
    frag = page(d)
    (HERE / f'{name}.html').write_text(frag)
    prev = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap" rel="stylesheet">'
            f'<title>{d["h1"]}</title><style>body{{margin:0;background:#fff}}</style></head><body>' + frag.replace('<details ', '<details open ') + '</body></html>')
    (HERE / f'{name}.preview.html').write_text(prev)
    meta = {'title': d['h1'] + ' | יקיר דבול - משרד עורכי דין', 'description': d['meta'], 'slug': d['url'].replace(SITE, '')}
    (HERE / f'{name}.meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(name, len(frag))
