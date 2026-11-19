#!/usr/bin/env python3
"""Render an article infographic (landscape only, 1200 px wide).
usage: python3 render.py body.html out_basename
  body.html = only the inner part (the .top header + the .mid block), see examples/.
Writes out_basename.png and out_basename.webp, prints width, height, KB, and fails if
the card is too tall (landscape rule: height <= 760) or anything overflows."""
import sys, os, json
from playwright.sync_api import sync_playwright
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
fonts = os.path.join(here, '..', 'roni', 'fonts')
body, out = sys.argv[1], sys.argv[2]
html = open(os.path.join(here, 'base.html'), encoding='utf8').read().replace('FONTDIR', 'file://' + os.path.abspath(fonts)).replace('{{BODY}}', open(body, encoding='utf8').read())
tmp = out + '.tmp.html'; open(tmp, 'w', encoding='utf8').write(html)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 800})
    pg.goto('file://' + os.path.abspath(tmp)); pg.wait_for_timeout(400)
    info = pg.evaluate("""() => { const c=document.getElementById('card'); const r=c.getBoundingClientRect();
      const over=[...c.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='visible').length;
      const wide=[...c.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>1201||e.getBoundingClientRect().left<-1).length;
      return {h:Math.ceil(r.height), over, wide}; }""")
    pg.set_viewport_size({'width': 1200, 'height': info['h']})
    pg.screenshot(path=out + '.png', clip={'x': 0, 'y': 0, 'width': 1200, 'height': info['h']}); b.close()
os.remove(tmp)
Image.open(out + '.png').convert('RGB').save(out + '.webp', 'WEBP', quality=86, method=6)
kb = os.path.getsize(out + '.webp') // 1024
res = {'w': 1200, 'h': info['h'], 'webpKB': kb, 'overflow': info['over'], 'outside': info['wide']}
print(json.dumps(res))
if info['h'] > 760 or info['over'] or info['wide']:
    print('FAIL: too tall or overflow, shorten the text'); sys.exit(1)
