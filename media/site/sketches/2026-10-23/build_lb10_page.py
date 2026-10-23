#!/usr/bin/env python3
"""Turns the approved Claude design page (canvas "עמוד דירוג LB10 2026", Main.dc.html) into the WordPress page body.
Yakir approved the computer and phone page on 23.10.2026 ("מעולה, אפשר להעלות").
Drops the mock site header/footer, points the images to the media library and the links to the real pages,
adds the structured data. Writes lb10-page.json ({title, slug, status, template, content, excerpt})."""
import json, os, re, sys, urllib.parse
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
import gen_lb10 as g  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/18c4b77b-4875-5419-b847-7a72812c5e0f/scratchpad/lb10-design/project/Main.dc.html'
CERT = 'https://dabullaw.co.il/wp-content/uploads/2026/10/lb10-2026-yakir-dabul.webp'
NIGHT = 'https://dabullaw.co.il/wp-content/uploads/2026/10/lb10-netanya-night.webp'
YAKIR = 'https://dabullaw.co.il/wp-content/uploads/2026/10/lb10-yakir-dabul.webp'

s = open(SRC, encoding='utf-8').read()
css = re.search(r'<style>(.*?)</style>', s, re.S).group(1)
css = css.replace('body{margin:0}\n', '').replace('a{color:#8b6f47}a:hover{color:#5e4a2c}', '.lb a:hover{opacity:.9}')
# keep the site's own headings from recoloring the page (dark sections set the color on the section)
css += '\n.lb h1,.lb h2,.lb h3{color:inherit;font-family:Heebo,Arial,sans-serif;letter-spacing:0}\n.lb p{margin-bottom:0}\n.lb ul{margin-right:0}\n.lb img{max-width:100%}\n'
body = s[s.index('<div class="lb"'):s.rindex('</x-dc>')]
# drop the mock top bar, header and footer of the sketch
body = re.sub(r'\n<div style="background: #141414; color: #ece6d8;.*?</header>\n', '\n', body, flags=re.S)
body = re.sub(r'\n<footer style="background: #0b0b0b;.*?</footer>', '', body, flags=re.S)
body = body.replace('/_blob/b215366a2d6929f2cfbb3b5472192a41', CERT).replace('/_blob/99a8df62b2d39042f77740957028fe1b', NIGHT).replace('/_blob/2b43996b3f2ddb963cd86a2ebb428231', YAKIR)
body = body.replace("font-family: 'Frank Ruhl Libre', serif; ", '')
# real links, in the order they appear
links = [
    ('>דף הבית</a>', g.S + '/'), ('>אודות המשרד</a>', g.ABOUT),
    ('>למידע על עסקאות מקרקעין ←</a>', g.RE_LAWYER), ('>עד מתי הקבלן אחראי לליקויים ←</a>', g.DEFECTS),
]
for text, url in links:
    i = body.index(text); j = body.rindex('href="#"', 0, i)
    body = body[:j] + f'href="{url}"' + body[j + len('href="#"'):]
for title, url in [('אודות המשרד', g.ABOUT), ('תעודות והסמכות', g.CERTS), ('כתב מינוי לוועדות הלשכה', g.MINUI), ('עורך דין מקרקעין בנתניה', g.NETANYA)]:
    i = body.index(f'<b style="font-size: 17px;">{title}</b>'); j = body.rindex('href="#"', 0, i)
    body = body[:j] + f'href="{url}"' + body[j + len('href="#"'):]
assert 'href="#"' not in body, 'a link was left empty'
body = body.replace('href="https://lawbuzz.co.il/rating/"', 'href="https://lawbuzz.co.il/rating/" target="_blank" rel="noopener"')
body = body.replace('href="https://wa.me/972505580189"', 'href="https://wa.me/972505580189" target="_blank" rel="noopener"')
for bad in ('—', '–'):
    assert bad not in body, 'long dash in the page'
schema = g.schema(CERT)
content = ('<!-- wp:html -->\n<style>' + css + '</style>\n' + body.strip() + '\n<script type="application/ld+json">'
           + json.dumps(schema, ensure_ascii=False) + '</script>\n<!-- /wp:html -->')
out = {'title': 'עו״ד יקיר דבול נבחר לדירוג LB10 2026 של משרדי עורכי הדין המובילים בישראל', 'slug': g.SLUG, 'status': 'publish',
       'template': 'elementor_header_footer', 'content': content,
       'excerpt': 'בדירוג עורכות ועורכי הדין של ישראל לשנת 2026, שמפרסם אתר המשפט לובאז, נכלל עו״ד יקיר דבול בין משרדי עורכי הדין המובילים בתחומי מקרקעין וליקויי בנייה ונזקי רכוש.'}
open(os.path.join(D, 'lb10-page.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False))
print('ok', len(content), g.PAGE_URL)
