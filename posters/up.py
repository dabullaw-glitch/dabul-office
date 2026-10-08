# Sharp preview pictures for the site videos.
# YouTube blocks downloads from this server, so: take YouTube's largest picture of each video (1280x720),
# cut out the vertical video from the middle, AI-upscale it (Real-ESRGAN x4) and save 1080 wide.
import io, sys, os, urllib.request, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader
OUT = 'posters-out'; os.makedirs(OUT, exist_ok=True)
shard, nsh = int(sys.argv[1]), int(sys.argv[2])
torch.set_num_threads(os.cpu_count())
model = ModelLoader().load_from_file('RealESRGAN_x4plus.pth').model.eval()
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}
def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30); return Image.open(io.BytesIO(r.read())).convert('RGB')
    except Exception as e: return None
def up4(img, tile=200, pad=16):
    a = np.asarray(img).astype(np.float32) / 255.0
    H, W, _ = a.shape; out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad); y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            t = torch.from_numpy(a[y0:y1, x0:x1].transpose(2, 0, 1)).unsqueeze(0)
            with torch.no_grad(): o = model(t).squeeze(0).clamp(0, 1).numpy().transpose(1, 2, 0)
            oy, ox = (y - y0) * 4, (x - x0) * 4; h, w = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + h, x * 4:x * 4 + w] = o[oy:oy + h, ox:ox + w]
    return Image.fromarray((out * 255).round().astype(np.uint8))
def content_box(im):
    a = np.asarray(im).astype(np.float32).mean(axis=2)
    cols = np.where(a.mean(axis=0) > 14)[0]; rows = np.where(a.mean(axis=1) > 14)[0]
    return (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1)
ids = [l.strip() for l in open('posters/ids.txt') if l.strip()]
log = open(f'{OUT}/log-{shard}.txt', 'w')
for i, vid in enumerate(ids):
    if i % nsh != shard: continue
    src = None
    for f in ('maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg'):
        src = get(f'https://i.ytimg.com/vi/{vid}/{f}')
        if src and src.width > 200: break
    if not src: print(vid, 'FAIL', file=log, flush=True); continue
    box = content_box(src); crop = src.crop(box)
    # keep a true 9:16 frame from the middle
    w, h = crop.size
    if w / h > 9 / 16: nw = round(h * 9 / 16); crop = crop.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    big = up4(crop); fin = big.resize((1080, round(big.height * 1080 / big.width)), Image.LANCZOS)
    fin.save(f'{OUT}/{vid}.webp', 'WEBP', quality=86, method=6)
    print(vid, 'OK', f, src.size, box, crop.size, fin.size, os.path.getsize(f'{OUT}/{vid}.webp') // 1024, 'KB', file=log, flush=True)
