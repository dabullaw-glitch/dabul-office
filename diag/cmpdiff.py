# pixel difference between live and preview screenshots, and a side-by-side strip of the places that differ
import json, sys
from PIL import Image, ImageChops
out = 'diag-results/cmp27'; rep = json.load(open(f'{out}/rep.json'))
for n in ['desk', 'phone']:
    a = Image.open(f'{out}/{n}-live.png').convert('RGB'); b = Image.open(f'{out}/{n}-prev.png').convert('RGB')
    h = min(a.height, b.height); a2 = a.crop((0, 0, a.width, h)); b2 = b.crop((0, 0, b.width, h))
    d = ImageChops.difference(a2, b2).convert('L').point(lambda x: 255 if x > 40 else 0)
    box = d.getbbox(); rows = []
    px = sum(1 for v in d.getdata() if v)
    # bands of rows that differ
    w = d.width; data = d.load(); cur = None
    step = 4
    for y in range(0, h, step):
        diff = any(data[x, y] for x in range(0, w, 3))
        if diff and cur is None: cur = y
        if not diff and cur is not None: rows.append((cur, y)); cur = None
    if cur is not None: rows.append((cur, h))
    rep[f'{n}-diff'] = {'pixels': px, 'bbox': box, 'bands': rows[:40], 'hl': a.height, 'hp': b.height}
    for i, (y0, y1) in enumerate(rows[:6]):
        y0 = max(0, y0 - 60); y1 = min(h, y1 + 60)
        s = Image.new('RGB', (w * 2 + 20, y1 - y0), 'red'); s.paste(a2.crop((0, y0, w, y1)), (0, 0)); s.paste(b2.crop((0, y0, w, y1)), (w + 20, 0))
        s.save(f'{out}/{n}-band{i}.jpg', quality=70)
    for v in ['live', 'prev']:
        im = Image.open(f'{out}/{n}-{v}.png').convert('RGB'); im.thumbnail((im.width // 2, 99999)); im.save(f'{out}/{n}-{v}-s.jpg', quality=60)
import os
for n in ['desk', 'phone']:
    for v in ['live', 'prev']: os.remove(f'{out}/{n}-{v}.png')
json.dump(rep, open(f'{out}/rep.json', 'w'), indent=1)
