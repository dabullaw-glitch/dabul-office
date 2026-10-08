# Sharper cut-out photos of Yakir: AI upscale x4 (Real-ESRGAN), keep the transparent edge, save 1300 wide.
import os, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader
OUT = 'diag-results/up2'; os.makedirs(OUT, exist_ok=True)
torch.set_num_threads(os.cpu_count())
model = ModelLoader().load_from_file('RealESRGAN_x4plus.pth').model.eval()
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
    res = Image.fromarray((out * 255).round().astype(np.uint8)).convert('RGBA')
    al = img.convert('RGBA').split()[-1].resize(res.size, Image.LANCZOS); res.putalpha(al)
    return res
for n in ('cut-p1', 'cut-p2', 'cut-p3'):
    im = Image.open(f'mock/{n}.png'); big = up4(im)
    fin = big.resize((1300, round(big.height * 1300 / big.width)), Image.LANCZOS)
    fin.save(f'{OUT}/{n}-hd.webp', 'WEBP', quality=88, method=6); print(n, fin.size, os.path.getsize(f'{OUT}/{n}-hd.webp') // 1024, 'KB', flush=True)
