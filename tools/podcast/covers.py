"""Podcast covers (TASK.md 6b, pipeline.4_cover). Rendered with Chromium (Playwright) in the task's sandbox, then committed.
Usage: python3 tools/podcast/covers.py <epNN> <cover.json>
  cover.json = docs podcast/epNN.cover ({show:{line1,line2,line3}, episode:{kicker,line1,line2,line3}})
Writes media/podcast/cover.jpg (show, 3000x3000), media/podcast/<epNN>.jpg (episode, 3000x3000),
media/podcast/<epNN>-yt.jpg (YouTube thumbnail 1280x720) and media/podcast/<epNN>-ytbg.png (1920x1080 background of the
YouTube video, with an empty band at the bottom for the sound wave drawn by the podcast-mix workflow).
Photo: a real frame of Yakir from his studio footage (media/twin/office-suit-hq.mp4 at PHOTO_T seconds, mouth closed).
Colors of the office: black #141414, gold #e4d19c.
"""
import base64, json, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / 'tools/reel-lab/assets/fonts'
LOGO = ROOT / 'tools/reel-lab/assets/logo-d.png'
SRC = ROOT / 'media/twin/office-suit-hq.mp4'
PHOTO_T = '18.6'
OUT = ROOT / 'media/podcast'
BLACK, GOLD = '#141414', '#e4d19c'


def b64(p):
    return base64.b64encode(Path(p).read_bytes()).decode()


def css(photo, w, h):
    return f"""
@font-face{{font-family:H;font-weight:900;src:url(data:font/woff2;base64,{b64(FONTS / 'heebo-hebrew-900-normal.woff2')}) format('woff2')}}
@font-face{{font-family:H;font-weight:700;src:url(data:font/woff2;base64,{b64(FONTS / 'heebo-hebrew-700-normal.woff2')}) format('woff2')}}
html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden;font-family:H;background:{BLACK};direction:rtl}}
.ph{{position:absolute;top:0;bottom:0;left:0;background:url(data:image/jpeg;base64,{photo}) center 22%/cover}}
.fade{{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,rgba(20,20,20,0) 0%,rgba(20,20,20,0) 45%,{BLACK} 100%)}}
.txt{{position:absolute;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;text-align:right;color:#fff}}
.k{{display:inline-block;align-self:flex-start;background:{GOLD};color:{BLACK};font-weight:900;border-radius:999px}}
.l1{{font-weight:900;line-height:1.02;color:#fff}}
.l2{{font-weight:900;line-height:1.08;color:{GOLD}}}
.l3{{font-weight:700;color:#d9d9d9}}
.bar{{background:{GOLD};border-radius:4px}}
.logo{{position:absolute;opacity:.95}}
"""


def page(kind, c, photo, w, h):
    if kind == 'square':
        k = c.get('kicker', '')
        return f"""<!doctype html><html><head><meta charset="utf-8"><style>{css(photo, w, h)}
.ph,.fade{{width:46%}} .txt{{width:58%;padding:0 54px 0 20px;box-sizing:border-box}}
.k{{font-size:40px;padding:6px 30px;margin-bottom:28px}} .l1{{font-size:{108 if len(c['line1']) < 12 else 92}px}}
.l2{{font-size:{70 if len(c.get('line2', '')) < 26 else 46}px;margin-top:22px}} .bar{{width:120px;height:8px;margin:40px 0 30px}}
.l3{{font-size:30px;line-height:1.35}} .logo{{right:54px;bottom:48px;height:70px}}
</style></head><body><div class="ph"></div><div class="fade"></div>
<div class="txt">{f'<div class="k">{k}</div>' if k else ''}<div class="l1">{c['line1']}</div><div class="l2">{c.get('line2', '')}</div>
<div class="bar"></div><div class="l3">{c.get('line3', '')}</div></div>
<img class="logo" src="data:image/png;base64,{b64(LOGO)}"></body></html>"""
    # wide (YouTube thumbnail / video background)
    band = kind == 'ytbg'
    k = c.get('kicker', '')
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{css(photo, w, h)}
.ph,.fade{{width:40%}} .txt{{width:62%;padding:0 {int(w*0.045)}px {int(h*0.22) if band else 0}px 20px;box-sizing:border-box}}
.k{{font-size:{int(h*0.05)}px;padding:{int(h*0.008)}px {int(h*0.035)}px;margin-bottom:{int(h*0.03)}px}}
.l1{{font-size:{int(h*0.15)}px}} .l2{{font-size:{int(h*0.12)}px;margin-top:{int(h*0.015)}px}}
.bar{{width:{int(h*0.12)}px;height:{max(4, int(h*0.008))}px;margin:{int(h*0.04)}px 0 {int(h*0.03)}px}} .l3{{font-size:{int(h*0.04)}px}}
.logo{{right:{int(w*0.045)}px;top:{int(h*0.05)}px;height:{int(h*0.08)}px}}
</style></head><body><div class="ph"></div><div class="fade"></div>
<div class="txt">{f'<div class="k">{k}</div>' if k else ''}<div class="l1">{c['line1']}</div><div class="l2">{c.get('line2', '')}</div>
<div class="bar"></div><div class="l3">{c.get('line3', '')}</div></div>
{'' if band else f'<img class="logo" src="data:image/png;base64,{b64(LOGO)}">'}</body></html>"""


def main(ep, cover_json):
    cv = json.loads(Path(cover_json).read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', PHOTO_T, '-i', str(SRC), '-frames:v', '1', '-q:v', '2',
                    str(tmp / 'photo.jpg')], check=True)
    photo = b64(tmp / 'photo.jpg')
    jobs = [('square', cv['show'], 1000, 1000, 3, OUT / 'cover.jpg'),
            ('square', cv['episode'], 1000, 1000, 3, OUT / f'{ep}.jpg'),
            ('yt', cv['episode'], 1280, 720, 1, OUT / f'{ep}-yt.jpg'),
            ('ytbg', cv['episode'], 1920, 1080, 1, OUT / f'{ep}-ytbg.png')]
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        for kind, c, w, h, sc, out in jobs:
            (tmp / 'c.html').write_text(page(kind, c, photo, w, h), encoding='utf-8')
            pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=sc)
            pg.goto((tmp / 'c.html').as_uri()); pg.wait_for_timeout(400)
            shot = tmp / 'shot.png'; pg.screenshot(path=str(shot)); pg.close()
            if out.suffix == '.png':
                shot.replace(out)
            else:
                subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(shot), '-q:v', '2', str(out)], check=True)
            print(out.relative_to(ROOT))
        b.close()


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
