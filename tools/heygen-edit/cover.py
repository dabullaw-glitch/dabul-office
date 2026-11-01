"""Cover ("שער") for an edited reel (Yakir 1.11.2026): a still title image shown for the first second, before the video
runs, so every network shows a designed cover with the title, like the office procedure for his other videos.
Usage: python3 cover.py <id>   (reads media/hgv/<id>.mp4, <id>.plan.json, <id>.result.json; writes media/hgv/<id>.cover.jpg
and replaces media/hgv/<id>.mp4 with [1 s cover + the video], kept under 44 MB for the reels storage).
Background: the clean first frame of the edit (no captions yet). Text: the hook (kicker pill, line 1 white, line 2 accent).
Rendered with Chromium (Playwright) so the Hebrew fonts of the reel editor are used.
"""
import base64, json, os, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / 'tools/reel-lab/assets/fonts'
LOGO = ROOT / 'tools/reel-lab/assets/logo-d.png'
ACC = {'navy-gold': '#FFD45C', 'mono': '#B8F35A', 'glass': '#3DDCC8', 'bold': '#FFE14D', 'warm': '#E8A33D', 'paper': '#D94F2B',
       'cinematic-gold': '#E4C46A', 'boxed-navy': '#FFD45C'}


def b64(p):
    return base64.b64encode(Path(p).read_bytes()).decode()


def run(cmd):
    subprocess.run(cmd, check=True)


def main(vid):
    d = ROOT / 'media/hgv'
    mp4, plan, res = d / f'{vid}.mp4', json.loads((d / f'{vid}.plan.json').read_text()), json.loads((d / f'{vid}.result.json').read_text())
    hook = next((b for b in plan.get('beats', []) if b.get('kind') == 'hook'), {})
    kicker, l1, l2 = hook.get('kicker', ''), hook.get('l1', plan.get('title', '')), hook.get('l2', '')
    acc = ACC.get(res.get('theme') or '', ACC.get(res.get('style') or '', '#E4C46A'))
    tmp = Path(tempfile.mkdtemp())
    run(['ffmpeg', '-y', '-v', 'error', '-ss', '0', '-i', str(mp4), '-frames:v', '1', str(tmp / 'bg.jpg')])
    html = f"""<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{{font-family:H;font-weight:900;src:url(data:font/woff2;base64,{b64(FONTS / 'heebo-hebrew-900-normal.woff2')}) format('woff2')}}
@font-face{{font-family:H;font-weight:700;src:url(data:font/woff2;base64,{b64(FONTS / 'heebo-hebrew-700-normal.woff2')}) format('woff2')}}
html,body{{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:H}}
.bg{{position:absolute;inset:0;background:url(data:image/jpeg;base64,{b64(tmp / 'bg.jpg')}) center/cover}}
.sh{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.45) 30%,rgba(0,0,0,0) 48%,rgba(0,0,0,0) 72%,rgba(0,0,0,.7) 100%)}}
.top{{position:absolute;top:150px;left:60px;right:60px;text-align:center}}
.pill{{display:inline-block;background:{acc};color:#111;font-weight:900;font-size:46px;padding:8px 34px;border-radius:40px;margin-bottom:26px}}
.l1{{color:#fff;font-weight:900;font-size:112px;line-height:1.08;text-shadow:0 6px 24px rgba(0,0,0,.7)}}
.l2{{color:{acc};font-weight:900;font-size:112px;line-height:1.08;margin-top:8px;text-shadow:0 6px 24px rgba(0,0,0,.7)}}
.bot{{position:absolute;bottom:110px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:22px;color:#fff}}
.bot img{{height:92px}} .bot b{{font-size:46px;font-weight:900;display:block}} .bot span{{font-size:32px;font-weight:700;color:{acc}}}
</style></head><body><div class="bg"></div><div class="sh"></div>
<div class="top">{f'<div class="pill">{kicker}</div><br>' if kicker else ''}<div class="l1">{l1}</div>{f'<div class="l2">{l2}</div>' if l2 else ''}</div>
<div class="bot"><img src="data:image/png;base64,{b64(LOGO)}"><div><b>עו״ד יקיר דבול</b><span>מקרקעין ונדל״ן · נתניה</span></div></div>
</body></html>"""
    (tmp / 'c.html').write_text(html, encoding='utf-8')
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1080, 'height': 1920})
        pg.goto((tmp / 'c.html').as_uri()); pg.wait_for_timeout(400); pg.screenshot(path=str(tmp / 'cover.png')); b.close()
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(tmp / 'cover.png'), '-q:v', '3', str(d / f'{vid}.cover.jpg')])
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp4)]).decode().strip())
    total = dur + 1.0
    vbr = max(1500, min(9000, int(44 * 8 * 1024 / total) - 160))
    out = tmp / 'out.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', '1', '-framerate', '30', '-i', str(tmp / 'cover.png'),
         '-f', 'lavfi', '-t', '1', '-i', 'anullsrc=r=48000:cl=stereo', '-i', str(mp4),
         '-filter_complex', '[0:v]scale=1080:1920,format=yuv420p,setsar=1[c];[2:v]scale=1080:1920,format=yuv420p,setsar=1,fps=30[v];'
         '[2:a]aresample=48000[a];[c][1:a][v][a]concat=n=2:v=1:a=1[ov][oa]',
         '-map', '[ov]', '-map', '[oa]', '-c:v', 'libx264', '-preset', 'medium', '-b:v', f'{vbr}k', '-maxrate', f'{vbr}k',
         '-bufsize', f'{vbr * 2}k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(out)])
    os.replace(out, mp4)
    r = json.loads((d / f'{vid}.result.json').read_text()); r['cover'] = f'{vid}.cover.jpg'; r['coverSec'] = 1.0
    (d / f'{vid}.result.json').write_text(json.dumps(r, ensure_ascii=False, indent=1))
    print(vid, 'cover ok', os.path.getsize(mp4))


if __name__ == '__main__':
    for v in sys.argv[1:]:
        main(v)
