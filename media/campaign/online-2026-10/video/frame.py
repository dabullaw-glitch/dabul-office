#!/usr/bin/env python3
"""Branded frame around each cut video: 4:5 (1080x1350) for the feed, 9:16 (1080x1920) for stories and reels.
Writes frame-<sid>-<f|s>.html (transparent where the video goes), renders PNGs with Playwright, then composes with ffmpeg."""
import json, html, pathlib, subprocess, sys
H = pathlib.Path(__file__).parent
sys.path.insert(0, str(H.parent / 'ads'))
import gen as G  # same fonts, colors and pills as the static ads
E = lambda s: html.escape(str(s), quote=True)
VJ = json.load(open(H / 'videos.json', encoding='utf8'))
LAY = {'f': dict(W=1080, Hh=1350, vy=372), 's': dict(W=1080, Hh=1920, vy=640)}
VH = 608  # 1280x720 scaled to 1080 wide

CSS = G.CSS + """
html,body{background:transparent!important}
.fr{position:relative;width:1080px;color:#fff;font-family:P,Arial,sans-serif}
.band{position:absolute;left:0;right:0;background:#0E2A57;background-image:linear-gradient(rgba(127,166,240,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(127,166,240,.14) 1px,transparent 1px);background-size:135px 135px}
.edge{position:absolute;left:0;right:0;height:6px;background:#FFE14D}
.hk2{color:#FFE14D;font-weight:700}
"""


def frame(sid, fmt):
    v = VJ[sid]; L = LAY[fmt]; vy = L['vy']; W, Hh = L['W'], L['Hh']
    top = f'<div class="band" style="top:0;height:{vy}px"></div><div class="edge" style="top:{vy - 6}px"></div>'
    bot = f'<div class="band" style="top:{vy + VH}px;height:{Hh - vy - VH}px"></div><div class="edge" style="top:{vy + VH}px"></div>'
    if fmt == 'f':
        txt = (f'<div class="brand" style="top:40px"><i></i>יקיר דבול - משרד עורכי דין</div>'
               f'<div style="position:absolute;right:64px;left:64px;top:104px">{G.pill(v["dom"])}'
               f'<div class="k" style="font-size:112px;margin-top:22px">{E(v["hook"][0])}</div></div>'
               f'<div class="hk2" style="position:absolute;right:64px;top:{vy - 84}px;font-size:40px">{E(v["hook"][1])}</div>'
               f'<div style="position:absolute;left:64px;right:64px;top:{vy + VH + 60}px;display:flex;align-items:center;justify-content:space-between">'
               f'{G.who(96)}<div class="cta" style="font-size:38px;padding:22px 36px">{E(v["cta"])}{G.ARR}</div></div>'
               f'<div style="position:absolute;left:64px;right:64px;top:{vy + VH + 210}px;text-align:center;font-size:28px;color:#B9C8EA;font-weight:600">'
               f'ממלאים אונליין · משלמים באתר · עורך הדין מטפל</div>')
    else:
        txt = (f'<div class="brand" style="top:236px;right:0;left:0;justify-content:center"><i></i>יקיר דבול - משרד עורכי דין</div>'
               f'<div style="position:absolute;right:60px;left:60px;top:300px;text-align:center">{G.pill(v["dom"])}'
               f'<div class="k" style="font-size:132px;margin-top:22px">{E(v["hook"][0])}</div>'
               f'<div class="hk2" style="font-size:44px;margin-top:14px">{E(v["hook"][1])}</div></div>'
               f'<div style="position:absolute;left:60px;right:60px;top:{vy + VH + 70}px;text-align:center">'
               f'<div class="cta" style="font-size:46px;padding:26px 50px">{E(v["cta"])}{G.ARR}</div>'
               f'<div style="display:flex;justify-content:center;margin-top:44px">{G.who(104)}</div></div>')
    return f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="fr" style="height:{Hh}px">{top}{bot}{txt}</div></body></html>'


RENDER = r"""
import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
const [,, ...fs] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const f of fs) { const s = f.endsWith('-s.html'); const p = await b.newPage({ viewport: { width: 1080, height: s ? 1920 : 1350 } });
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(120);
  await p.screenshot({ path: f.replace('.html', '.png'), omitBackground: true }); await p.close(); }
await b.close();
"""

if __name__ == '__main__':
    only = sys.argv[1:]
    sids = [s for s in VJ if not only or s in only]
    files = []
    for sid in sids:
        for fmt in ('f', 's'):
            p = H / f'frame-{sid}-{fmt}.html'; p.write_text(frame(sid, fmt), encoding='utf8'); files.append(str(p))
    (H / 'render.mjs').write_text(RENDER)
    subprocess.run(['node', str(H / 'render.mjs'), *files], check=True)
    for sid in sids:
        for fmt in ('f', 's'):
            L = LAY[fmt]
            out = H.parent / 'out' / f'{sid}-video-{fmt}.mp4'
            fc = f'[0:v]scale=1080:{VH},pad=1080:{L["Hh"]}:0:{L["vy"]}:color=0x0E2A57[b];[b][1:v]overlay=0:0,format=yuv420p[v]'
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(H / f'{sid}-cut.mp4'), '-i', str(H / f'frame-{sid}-{fmt}.png'), '-filter_complex', fc,
                            '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-r', '25', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(out)], check=True)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '4.2', '-i', str(out), '-frames:v', '1', '-q:v', '3', str(out).replace('.mp4', '.jpg')], check=True)
            print(out.name, round(out.stat().st_size / 1e6, 1), 'MB')
