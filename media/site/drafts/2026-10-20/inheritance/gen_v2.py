#!/usr/bin/env python3
"""v2 of the two inheritance drafts (צו ירושה, צו קיום צוואה), rebuilt in the site's approved lvbl article template
(same classes and boxes as the live articles). Text is taken unchanged from gen.py; only the markup changed.
Writes <name>-v2.html (WordPress post body) and <name>-v2.preview.html (the body inside a snapshot of a live
article page, for rendering). Nothing is published."""
import json, re, sys, pathlib

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE.parent / '_site'))
import shell

PHONE, PHONE_TEL = '09-8613413', '+97298613413'
SITE = 'https://dabullaw.co.il'

# ---------------------------------------------------------------- lvbl helpers (same names as gen.py)
def slug(t):
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'[:?!,."\'״׳()]', '', t)
    return re.sub(r'\s+', '-', t.strip())

H2S = []
def h2(t):
    i = slug(t)
    H2S.append((i, t))
    return f'<h2 id="{i}" class="lvbl-h2">{t}</h2>\n'

def a(url, text):
    return f'<a href="{url}">{text}</a>'

def ref(n):
    return f'<sup class="citation-ref"><a href="#ref-{n}">[{n}]</a></sup>'

def p(t):
    return f'<p class="lvbl-p">{t}</p>\n'

def ul(items):
    return '<ul class="lvbl-ul">' + ''.join(
        f'<li class="lvbl-li"><span class="lvbl-bullet" aria-hidden="true"></span><span class="lvbl-li-body">{i}</span></li>'
        for i in items) + '</ul>\n'

def box(title, body, **_):
    # approved template: notes are lvbl blockquotes ("שימו לב:", "טיפ פרקטי:")
    return f'<blockquote><p><strong>{title}:</strong> {body}</p></blockquote>\n'

def table(head, rows):
    th = ''.join(f'<th scope="col">{h}</th>' for h in head)
    trs = ''.join('<tr>' + ''.join(f'<td>{"<strong>" + c + "</strong>" if j == 0 else c}</td>' for j, c in enumerate(r)) + '</tr>' for r in rows)
    return f'<div class="lvbl-table-wrap">\n<table>\n<thead><tr>{th}</tr></thead>\n<tbody>{trs}</tbody>\n</table>\n</div>\n'

def steps(items):
    lis = ''.join(
        f'<li class="lvbl-li lvbl-li-num"><span class="lvbl-num" aria-hidden="true">{i}</span>'
        f'<span class="lvbl-li-body"><strong>{t}:</strong> {d}</span></li>\n'
        for i, (t, d) in enumerate(items, 1))
    return f'<ol class="lvbl-ol">\n{lis}</ol>\n'

def strip(text):
    # the phone strip used on the live site (Netanya page), same inline styles
    return ('<div style="background-color: #f5edda; border: 1px solid #d9c08a; border-right: 4px solid #b8932f; border-radius: 10px; '
            'padding: 14px 20px; margin: 28px 0; text-align: center; font-size: 17px; line-height: 1.6; color: #5c4528;">'
            f'{text} התקשרו: <strong><a style="color: #8b6f47; font-weight: 800; text-decoration: none; white-space: nowrap;" '
            f'href="tel:{PHONE}">{PHONE}</a></strong></div>\n')

def cta_box(title, text):
    # the accent CTA box used on the live site (Netanya page), same inline styles
    return ('<div style="background-color: #d9c08a; border: 1px solid #c9a961; border-radius: 14px; padding: 28px 32px; margin: 40px 0; text-align: center;">'
            f'<div style="color: #5c4528; font-size: 22px; font-weight: 800; margin: 0 0 10px; line-height: 1.35;">{title}</div>'
            f'<div style="color: #6b5530; font-size: 17px; line-height: 1.7; margin: 0;">{text} התקשרו: '
            f'<a style="color: #5c4528; font-weight: 800; text-decoration: underline; white-space: nowrap;" href="tel:{PHONE}">{PHONE}</a></div></div>\n')

# ---------------------------------------------------------------- content: exactly the approved text from gen.py
src = (HERE / 'gen.py').read_text()
data = src[src.index('# ---------------------------------------------------------------- צו ירושה'):src.index('for name, d in')]
G = dict(globals())
exec(compile(src[src.index('L = {'):src.index('F = "font-family')], 'gen.py', 'exec'), G)  # L, SRC
G.update(dict(h2=h2, a=a, ref=ref, p=p, ul=ul, box=box, table=table, steps=steps, strip=strip))
exec(compile(src[src.index('import re\ndef strip_tags'):src.index('def page(d):')], 'gen.py', 'exec'), G)  # strip_tags
exec(compile(src[src.index('def schema(d):'):src.index('import re\ndef strip_tags')], 'gen.py', 'exec'), G)  # schema
exec(compile(data, 'gen.py', 'exec'), G)
Y, K, SRC, L = G['Y'], G['K'], G['SRC'], G['L']

DOMAIN = lambda u: re.match(r'https?://([^/]+)', u).group(1)

GLOSS = {
    'Y': [
        ('עיזבון', 'כל הרכוש, הזכויות והחובות שהשאיר אדם שנפטר.'),
        ('יורשים על פי דין', 'מי שיורשים לפי חוק הירושה כשאין צוואה: בן או בת הזוג, הילדים, ולפעמים ההורים או האחים.'),
        ('הרשם לענייני ירושה', 'הגוף במשרד המשפטים שמקבל בקשות לצו ירושה ולצו קיום צוואה, ונותן את הצו כשאין התנגדות.'),
        ('תצהיר הסתלקות', 'הצהרה של יורש שהוא מוותר על חלקו בעיזבון, כולו או חלקו.'),
        ('התנגדות', 'בקשה של מי שחושב שהצו לא נכון. כשמוגשת התנגדות, התיק עובר לבית המשפט לענייני משפחה.'),
    ],
    'K': [
        ('זוכה בצוואה', 'מי שהמנוח השאיר לו רכוש בצוואה.'),
        ('עיזבון', 'כל הרכוש, הזכויות והחובות שהשאיר אדם שנפטר.'),
        ('הרשם לענייני ירושה', 'הגוף במשרד המשפטים שמקבל בקשות לצו קיום צוואה ולצו ירושה, ונותן את הצו כשאין התנגדות.'),
        ('הוכחת צוואה', 'הליך נפרד שמגישים כשהצוואה המקורית אבדה, כדי להוכיח מה היה כתוב בה.'),
        ('התנגדות לצוואה', 'בקשה של מי שחושב שהצוואה פסולה. כשמוגשת התנגדות, התיק עובר לבית המשפט לענייני משפחה.'),
    ],
}

DISCLAIMER = 'אין באמור משום ייעוץ משפטי. המידע נכון למועד הפרסום וכפוף לנסיבות פרטניות. בכל שאלה ספציפית מומלץ להיוועץ עם עורך דין.'

def faq(items):
    out = ''.join(
        f'<details class="lvbl-faq-item">\n<summary class="lvbl-faq-q"><span class="lvbl-faq-num">{i}</span><span class="lvbl-faq-qt">{q}</span></summary>\n'
        f'<div class="lvbl-faq-a">\n<p class="lvbl-p">{x}</p>\n</div>\n</details>\n'
        for i, (q, x) in enumerate(items, 1))
    return f'<div class="lvbl-faq">\n{out}</div>\n'

def refs(keys):
    lis = ''.join(
        f'<li id="ref-{i}" class="lvbl-li lvbl-li-num"><span class="lvbl-num" aria-hidden="true">{i}</span><span class="lvbl-li-body">'
        f'<strong>[{i}]</strong> <a href="{SRC[k][1]}" target="_blank" rel="noopener noreferrer">{SRC[k][0]}</a>, <em>{DOMAIN(SRC[k][1])}</em></span></li>\n'
        for i, k in enumerate(keys, 1))
    return f'<ol class="lvbl-refs article-sources lvbl-ol">\n{lis}</ol>\n'

def glossary(items):
    return '<div class="lvbl-glossary">\n<dl>\n' + ''.join(f'<dt>{t}</dt>\n<dd>{d}</dd>\n' for t, d in items) + '</dl>\n</div>\n'

def article(d, key):
    """Order follows the approved live article: lead, עיקרי הדברים, sections, FAQ, sources, glossary."""
    H2S.clear()
    body_h2 = d['_h2s']  # collected while gen.py data was built
    H2S.extend(body_h2)
    H2S.insert(0, ('עיקרי-הדברים', 'עיקרי הדברים'))
    out = '<div class="lvbl-article" data-audience="adults_30_60" data-font-scale="lg">\n'
    out += f'<p class="lvbl-p lvbl-p-lead">{d["lead"]}</p>\n'
    out += '<h2 id="עיקרי-הדברים" class="lvbl-h2 lvbl-h2-lead">עיקרי הדברים</h2>\n<ul class="lvbl-ul lvbl-ul-check">\n'
    out += ''.join(f'<li class="lvbl-li"><span class="lvbl-check" aria-hidden="true">✓</span><span class="lvbl-li-body">{k}</span></li>\n' for k in d['key'])
    out += '</ul>\n'
    out += ('<p class="lvbl-p"><strong>נעים להכיר: עו"ד יקיר דבול, חבר ב-5 ועדות של לשכת עורכי הדין. המשרד מגיש בקשות לצו ירושה '
            'ולצו קיום צוואה לרשם לענייני ירושה בכל הארץ, בהגשה מקוונת ובחתימה מרחוק.</strong></p>\n')
    out += d['body']
    out += cta_box(d['cta_t'], d['cta_x'])
    out += p(DISCLAIMER)
    out += '<h2 id="faq" class="lvbl-h2">שאלות ותשובות</h2>\n' + faq(d['faq'])
    out += f'<h2 id="sources-cited" class="lvbl-h2">מקורות שצוטטו במאמר ({len(d["src"])})</h2>\n' + refs(d['src'])
    out += '<h2 id="glossary" class="lvbl-h2">מילון מושגים</h2>\n' + glossary(GLOSS[key])
    out += '<p>' + G['schema'](d) + '</p>\n</div>'
    H2S.extend([('faq', 'שאלות ותשובות'), ('sources-cited', 'מקורות'), ('glossary', 'מילון מושגים')])
    return out


def lead_box(s, topic, page_url):
    """The mid-article lead box (dlbm) that the live articles carry, with this page's topic."""
    i = s.index('<div class="dlbm"')
    j = s.index('<h2', i)
    box = s[i:j]
    box = re.sub(r'name="topic" value="[^"]*"', f'name="topic" value="{topic}"', box)
    box = re.sub(r'name="page" value="[^"]*"', f'name="page" value="{page_url}"', box)
    box = re.sub(r'redirect=[^"]*', 'redirect=' + page_url, box)
    return box


# gen.py builds Y['body'] / K['body'] while calling h2(); split the collected headings per page
# (data exec above ran Y first, then K)
all_h2 = list(H2S)
ny = Y['body'].count('<h2 ')
Y['_h2s'], K['_h2s'] = all_h2[:ny], all_h2[ny:]

shell_src = shell.load('article')
for name, d, key in [('tzav-yerusha', Y, 'Y'), ('tzav-kiyum-tzavaa', K, 'K')]:
    art = article(d, key)
    # citation chips go after the punctuation, as in the live articles
    art = re.sub(r' (<sup class="citation-ref">.*?</sup>)([.,])', r'\2 \1', art)
    # mid-article lead box: after the steps section (before the fees heading), as on the live articles
    fees_h2 = [m.start() for m in re.finditer(r'<h2 id="כמה-עולה', art)][0]
    art = art[:fees_h2] + lead_box(shell_src, d['crumb'], d['url']) + art[fees_h2:]
    (HERE / f'{name}-v2.html').write_text(art)
    meta = json.loads((HERE / f'{name}.meta.json').read_text())
    prev = shell.build('article', title=meta['title'], h1=d['h1'],
                       crumbs=shell.crumbs_html([('דף הבית', SITE + '/'), ('צוואות וירושות', L['hub']), (d['crumb'], d['url'])]),
                       article_html=art, h2s=list(H2S), date='אוקטובר 21, 2026')
    (HERE / f'{name}-v2.preview.html').write_text(prev)
    print(name, len(art), 'h2:', len(H2S))
