# builds the pages from src/ (shared head, header, footer and the journey graphic)
import pathlib
S = pathlib.Path(__file__).parent / 'src'
parts = {k: (S / f'{k}.html').read_text() for k in ['head', 'top', 'foot']}
parts['journey'] = (S / 'journey.svg.html').read_text()
for name in ['index', 'first-home', 'learn', 'terms']:
    t = (S / f'{name}.html').read_text()
    for k, v in parts.items(): t = t.replace('{{' + k.upper() + '}}', v)
    (S.parent / f'{name}.html').write_text(t)
print('built')
