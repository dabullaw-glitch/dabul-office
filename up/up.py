# Sharper versions of the site's photos: AI upscale (Real-ESRGAN x4, faithful model) then scale to the size the page needs.
import io, sys, urllib.request, urllib.parse, os, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader
OUT = 'diag-results/up'; os.makedirs(OUT, exist_ok=True)
torch.set_num_threads(os.cpu_count())
model = ModelLoader().load_from_file('RealESRGAN_x4plus.pth').model.eval()
def fetch(path):
    u = 'https://dabullaw.co.il/wp-content/uploads/' + '/'.join(urllib.parse.quote(p) for p in path.split('/'))
    r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60)
    return Image.open(io.BytesIO(r.read()))
def up4(img, tile=192, pad=16):
    rgb = img.convert('RGB'); a = np.asarray(rgb).astype(np.float32) / 255.0
    H, W, _ = a.shape; out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad); y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            t = torch.from_numpy(a[y0:y1, x0:x1].transpose(2, 0, 1)).unsqueeze(0)
            with torch.no_grad(): o = model(t).squeeze(0).clamp(0, 1).numpy().transpose(1, 2, 0)
            oy, ox = (y - y0) * 4, (x - x0) * 4; h, w = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + h, x * 4:x * 4 + w] = o[oy:oy + h, ox:ox + w]
    res = Image.fromarray((out * 255).round().astype(np.uint8))
    if img.mode in ('RGBA', 'LA', 'P'):
        al = img.convert('RGBA').split()[-1].resize(res.size, Image.LANCZOS); res = res.convert('RGBA'); res.putalpha(al)
    return res
jobs = [('2026/03/yakir-mob-2.webp', 'hero-phone', 1170), ('2026/04/יקיר-דבול-עורך-דין.webp', 'cutout', 1000), ('2026/05/bgmain.webp', 'hero-desktop-bg', 2400)]
for src, name, width in jobs:
    im = fetch(src); print(name, im.size, im.mode, flush=True)
    big = up4(im); h = round(big.height * width / big.width); fin = big.resize((width, h), Image.LANCZOS)
    fin.save(f'{OUT}/{name}.webp', 'WEBP', quality=84, method=6)
    im.save(f'{OUT}/{name}-orig.png'); fin.save(f'{OUT}/{name}-new.png')
    print(name, 'done', fin.size, os.path.getsize(f'{OUT}/{name}.webp') // 1024, 'KB', flush=True)
