#!/usr/bin/env python3
"""Static ad creatives for the online legal services campaign (Meta: feed 4:5 and story 9:16).
Same look as the service pages and explainer videos: navy blueprint grid, Karantina display type,
IBM Plex Sans Hebrew, sun yellow accent, the field's color on the pill. No prices anywhere (Yakir, 11.10.2026)."""
import json, html, pathlib
H = pathlib.Path(__file__).parent
C = json.load(open(H.parent / 'campaign.json', encoding='utf8'))
E = lambda s: html.escape(str(s), quote=True)
NM = '/tmp/claude-0/node_modules/@fontsource'
DOM = {'re': ('מקרקעין', '#2563EB', '#EAF1FF'), 'biz': ('חברות', '#7C3AED', '#F2ECFF'), 'fam': ('משפחה וירושה', '#DB2777', '#FDEDF5'),
       'consult': ('ייעוץ משפטי', '#0E9F6E', '#E7F7F0'), 'all': ('שירותים משפטיים אונליין', '#0E2A57', '#FFE14D')}
CHK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
ARR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
CSS = """
@font-face{font-family:K;font-weight:700;src:url('file://NM/karantina/files/karantina-hebrew-700-normal.woff2')}
@font-face{font-family:K;font-weight:700;src:url('file://NM/karantina/files/karantina-latin-700-normal.woff2');unicode-range:U+0000-00FF}
@font-face{font-family:P;font-weight:400;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-400-normal.woff2')}
@font-face{font-family:P;font-weight:500;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-500-normal.woff2')}
@font-face{font-family:P;font-weight:600;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-600-normal.woff2')}
@font-face{font-family:P;font-weight:700;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-hebrew-700-normal.woff2')}
@font-face{font-family:P;font-weight:400;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-latin-400-normal.woff2');unicode-range:U+0000-00FF}
@font-face{font-family:P;font-weight:600;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-latin-600-normal.woff2');unicode-range:U+0000-00FF}
@font-face{font-family:P;font-weight:700;src:url('file://NM/ibm-plex-sans-hebrew/files/ibm-plex-sans-hebrew-latin-700-normal.woff2');unicode-range:U+0000-00FF}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#0E2A57}
.A{position:relative;overflow:hidden;font-family:P,Arial,sans-serif;color:#fff;background:#0E2A57;
 background-image:radial-gradient(1200px 900px at 85% 0%,rgba(80,130,230,.28),transparent 60%),linear-gradient(rgba(127,166,240,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(127,166,240,.14) 1px,transparent 1px),linear-gradient(rgba(127,166,240,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(127,166,240,.05) 1px,transparent 1px);
 background-size:auto,135px 135px,135px 135px,33.75px 33.75px,33.75px 33.75px}
.f{width:1080px;height:1350px}.s{width:1080px;height:1920px}
.k{font-family:K,P,sans-serif;font-weight:700;line-height:.9;letter-spacing:.005em}
.brand{position:absolute;right:64px;display:flex;gap:14px;align-items:center;font-size:30px;font-weight:600;color:#C9D7F6}
.brand i{width:14px;height:14px;border-radius:50%;background:#FFE14D}
.pill{display:inline-flex;align-items:center;gap:12px;border-radius:99px;padding:10px 26px;font-size:30px;font-weight:700}
.title{color:#fff}
.title mark{background:linear-gradient(transparent 60%,#FFE14D 60%,#FFE14D 88%,transparent 88%);color:#fff;padding:0 8px}
.sub{color:#D6E2FA;font-weight:500;line-height:1.38}
.bl{display:grid;gap:16px}
.bl div{display:flex;gap:16px;align-items:center;font-weight:600;color:#fff}
.bl i{flex:none;border-radius:50%;background:#17915A;display:grid;place-items:center;color:#fff}
.bl i svg{width:62%;height:62%}
.cta{display:inline-flex;gap:16px;align-items:center;background:#FFE14D;color:#0E2A57;font-weight:700;border-radius:20px;box-shadow:0 22px 40px -18px rgba(0,0,0,.6)}
.cta svg{width:1em;height:1em}
.foot{position:absolute;left:64px;right:64px;display:flex;align-items:center;justify-content:space-between;gap:24px}
.who{display:flex;align-items:center;gap:20px}
.who .ph{border-radius:50%;overflow:hidden;border:4px solid #FFE14D;background:#13254A;flex:none}
.who .ph img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.who b{display:block;font-size:31px;font-weight:700;color:#fff}.who span{display:block;font-size:24px;color:#B9C8EA;font-weight:500}
.url{direction:ltr;font-weight:700;color:#FFE14D}
/* phone */
.phone{position:absolute;border-radius:58px;background:#0A1B3B;border:14px solid #1B3A72;box-shadow:0 60px 110px -40px rgba(0,0,0,.85);overflow:hidden}
.phone .scr{position:absolute;inset:0;background:#F6F8FC;color:#13203A;padding:40px 28px}
.phone .hd{font-size:25px;font-weight:700;color:#0E2A57;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.phone .hd i{width:46px;height:9px;border-radius:5px;background:#C9D5EE}
.phone .stp{font-size:20px;color:#5B6782;font-weight:600}
.phone .bar{height:12px;border-radius:6px;background:#E1E8F5;overflow:hidden;margin:8px 0 22px}.phone .bar i{display:block;height:100%;background:#FFE14D}
.phone .fld{font-size:20px;color:#5B6782;font-weight:600;margin:18px 0 7px}
.phone .inp{border-radius:14px;background:#fff;border:2px solid #E1E8F5;padding:13px 16px;font-size:23px;font-weight:600;color:#13203A;white-space:nowrap;overflow:hidden}
.phone .up{margin-top:24px;border:2px solid #17915A;border-radius:16px;padding:16px;font-size:22px;font-weight:700;color:#17915A;background:#E7F6EE;text-align:center}
.phone .go{margin-top:22px;border-radius:16px;padding:18px;font-size:24px;font-weight:700;color:#0E2A57;background:#FFE14D;text-align:center}
.phone .li{border:2px solid #E1E8F5;background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:14px}
.phone .li b{display:block;font-size:24px;color:#13203A}.phone .li span{display:block;font-size:19px;color:#5B6782;margin-top:3px}
.phone .li.on{border-color:#FFE14D;background:#FFF9DB}
/* white cards */
.card{position:absolute;background:#fff;color:#13203A;border-radius:30px;box-shadow:0 60px 110px -40px rgba(0,0,0,.85);overflow:hidden}
.card .top{background:#13254A;color:#fff;padding:24px 32px;font-size:26px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.card .top small{font-size:20px;color:#B9C8EA;font-weight:600}
.row{display:flex;gap:18px;align-items:center;padding:16px 30px;border-bottom:2px solid #EEF2F9;font-size:26px;font-weight:600}
.row i{width:44px;height:44px;border-radius:50%;background:#17915A;color:#fff;display:grid;place-items:center;flex:none}.row i svg{width:26px;height:26px}
.row:last-child{border-bottom:0}
.note{padding:20px 32px;background:#F6F8FC;font-size:22px;color:#5B6782;font-weight:600}
/* listing */
.lst .img{height:330px;background:linear-gradient(160deg,#9DB7E6 0%,#6E8FCB 45%,#E9D9B4 100%);position:relative}
.lst .img:after{content:'';position:absolute;left:12%;right:12%;bottom:0;height:62%;background:linear-gradient(#F4EFE4,#E3D8C2);clip-path:polygon(0 30%,50% 0,100% 30%,100% 100%,0 100%)}
.lst .bd{padding:24px 30px}
.lst .bd b{font-size:32px;display:block}
.tags{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}.tags span{background:#EAF1FF;color:#2563EB;font-weight:700;font-size:22px;border-radius:99px;padding:8px 18px}
.q{position:absolute;white-space:nowrap;background:#FFE14D;color:#0E2A57;font-weight:700;border-radius:18px;padding:14px 22px;box-shadow:0 24px 40px -18px rgba(0,0,0,.7);display:flex;gap:12px;align-items:center}
.q b{width:40px;height:40px;border-radius:50%;background:#0E2A57;color:#FFE14D;display:grid;place-items:center;font-size:26px;flex:none}
/* steps */
.steps{position:absolute;display:grid;gap:16px}
.steps .st{display:flex;gap:20px;align-items:center;background:#fff;color:#13203A;border-radius:22px;padding:20px 24px;box-shadow:0 30px 50px -28px rgba(0,0,0,.7)}
.steps .n{width:58px;height:58px;border-radius:50%;background:#17915A;color:#fff;display:grid;place-items:center;font-weight:700;font-size:26px;flex:none}
.steps .n.w{background:#E1E8F5;color:#0E2A57}
.steps b{display:block;font-size:27px}.steps span{display:block;font-size:20px;color:#5B6782;margin-top:2px}
/* nasach */
.nas .sec{padding:18px 32px;border-bottom:2px solid #EEF2F9}
.nas .sec small{display:block;font-size:19px;color:#5B6782;font-weight:600}
.nas .sec b{font-size:25px}
.stamp{position:absolute;border:6px solid #17915A;color:#17915A;border-radius:18px;font-weight:700;padding:8px 22px;transform:rotate(-8deg);background:rgba(231,246,238,.92);display:flex;gap:10px;align-items:center}
.stamp svg{width:1em;height:1em}
/* zoom */
.call{position:absolute;border-radius:30px;background:#0A1B3B;border:12px solid #1B3A72;box-shadow:0 60px 110px -40px rgba(0,0,0,.85);overflow:hidden}
.call .v{position:absolute;inset:0;background:#24324F}
.call .v img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}
.call .lab{position:absolute;right:20px;bottom:20px;background:rgba(9,25,54,.8);border-radius:12px;padding:8px 16px;font-size:22px;font-weight:600}
.call .me{position:absolute;left:20px;top:20px;width:30%;aspect-ratio:4/3;border-radius:16px;background:linear-gradient(160deg,#5A6E96,#2E3E61);border:3px solid rgba(255,255,255,.4)}
.call .bar{position:absolute;left:0;right:0;bottom:0;height:0}
.slot{position:absolute;background:#fff;color:#13203A;border-radius:22px;padding:20px 26px;box-shadow:0 30px 50px -28px rgba(0,0,0,.7)}
.slot small{display:block;font-size:20px;color:#5B6782;font-weight:600}.slot b{font-size:32px}
""".replace('NM', NM)


def pill(dom):
    n, c, bg = DOM[dom]
    if dom == 'all':
        return f'<span class="pill" style="background:#FFE14D;color:#0E2A57">{E(n)}</span>'
    return f'<span class="pill" style="background:{bg};color:{c}">{E(n)}</span>'


def title(lines, mark):
    return '<br>'.join(f'<mark>{E(l)}</mark>' if i == mark else E(l) for i, l in enumerate(lines))


def bullets(xs, sz):
    return '<div class="bl">' + ''.join(f'<div style="font-size:{sz}px"><i style="width:{int(sz*1.45)}px;height:{int(sz*1.45)}px">{CHK}</i><span>{E(x)}</span></div>' for x in xs) + '</div>'


def phone_form(v, x, y, w, h):
    rows = ''.join(f'<div class="fld">{E(q)}</div><div class="inp">{E(a)}</div>' for q, a in v['fields'])
    up = f'<div class="up">✓ {E(v["up"])}</div>' if v.get('up') else ''
    return (f'<div class="phone" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="scr"><div class="hd"><span>{E(v["head"])}</span><i></i></div>'
            f'<div class="stp">שלב {v.get("step", 3)} מתוך 4</div><div class="bar"><i style="width:{v.get("step", 3) * 25}%"></i></div>{rows}{up}<div class="go">המשך</div></div></div>')


def phone_list(v, x, y, w, h):
    rows = ''.join(f'<div class="li{" on" if i == 0 else ""}"><b>{E(a)}</b><span>{E(b)}</span></div>' for i, (a, b) in enumerate(v['items']))
    return f'<div class="phone" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="scr"><div class="hd"><span>{E(v["head"])}</span><i></i></div>{rows}</div></div>'


def doc_check(v, x, y, w):
    rows = ''.join(f'<div class="row"><i>{CHK}</i><span>{E(r)}</span></div>' for r in v['rows'])
    return f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px"><div class="top"><span>{E(v["head"])}</span><small>{E(v["small"])}</small></div>{rows}<div class="note">{E(v["note"])}</div></div>'


def listing(v, x, y, w, qpos):
    tags = ''.join(f'<span>{E(t)}</span>' for t in v['tags'])
    qs = ''.join(f'<div class="q" style="{p};font-size:{fs}px"><b>?</b><span>{E(q)}</span></div>' for q, (p, fs) in zip(v['qs'], qpos))
    return f'<div class="card lst" style="left:{x}px;top:{y}px;width:{w}px"><div class="img"></div><div class="bd"><b>{E(v["head"])}</b><div class="tags">{tags}</div></div></div>{qs}'


def steps(v, x, y, w):
    rows = ''.join(f'<div class="st"><span class="n{"" if i < v.get("done", 2) else " w"}">{i + 1}</span><div><b>{E(a)}</b><span>{E(b)}</span></div></div>' for i, (a, b) in enumerate(v['steps']))
    return f'<div class="steps" style="left:{x}px;top:{y}px;width:{w}px">{rows}</div>'


def nasach(v, x, y, w, sx, sy, sfs):
    secs = ''.join(f'<div class="sec"><small>{E(a)}</small><b{" dir=ltr style=display:inline-block" if any(ch.isdigit() for ch in b) else ""}>{E(b)}</b></div>' for a, b in v['secs'])
    return (f'<div class="card nas" style="left:{x}px;top:{y}px;width:{w}px"><div class="top"><span>{E(v["head"])}</span><small>{E(v["small"])}</small></div>{secs}</div>'
            f'<div class="stamp" style="left:{sx}px;top:{sy}px;font-size:{sfs}px">{CHK}<span>{E(v["stamp"])}</span></div>')


def zoom(v, x, y, w, h, sx, sy):
    return (f'<div class="call" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="v"><img src="../img/yakir-cutout.webp" style="object-fit:contain;object-position:50% 100%;background:linear-gradient(160deg,#36507F,#1C2C4D)"></div><div class="me"></div>'
            f'<div class="lab">{E(v["label"])}</div></div><div class="slot" style="left:{sx}px;top:{sy}px"><small>{E(v["slot_small"])}</small><b>{E(v["slot"])}</b></div>')


def visual(c, fmt):
    v = c['visual']; t = v['type']; F = fmt == 'f'
    if t == 'phone_form':
        return phone_form(v, 64, 770, 440, 860) if F else phone_form(v, 290, 1230, 500, 980)
    if t == 'phone_list':
        return phone_list(v, 64, 770, 440, 860) if F else phone_list(v, 290, 1230, 500, 980)
    # card visuals: on the story they are the same layout, enlarged with zoom and centered
    z = 1 if F else 1.32
    wrap = (lambda h: h) if F else (lambda h: f'<div style="position:absolute;left:0;top:0;zoom:{z}">{h}</div>')
    X = (lambda x: x) if F else (lambda x: int(x / z))
    if t == 'doc_check':
        return doc_check(v, 50, 770, 480) if F else wrap(doc_check(v, X(170), X(1230), 560))
    if t == 'listing':
        q = [('left:{}px;top:{}px'.format(a, b), 24) for a, b in ((150, 810), (90, 885), (170, 960))]
        if F: return listing(v, 50, 780, 460, q)
        q = [('left:{}px;top:{}px'.format(X(a), X(b)), 24) for a, b in ((330, 1260), (250, 1360), (350, 1460))]
        return wrap(listing(v, X(190), X(1230), 530, q))
    if t == 'steps':
        return steps(v, 50, 790, 480) if F else wrap(steps(v, X(170), X(1230), 560))
    if t == 'nasach':
        return nasach(v, 50, 790, 470, 230, 1150, 28) if F else wrap(nasach(v, X(170), X(1230), 560, X(250), X(1700), 30))
    if t == 'zoom':
        return zoom(v, 50, 800, 480, 380, 250, 1110) if F else zoom(v, 140, 1240, 800, 540, 150, 1700)
    raise ValueError(t)


def who(sz):
    return (f'<div class="who"><div class="ph" style="width:{sz}px;height:{sz}px"><img src="../img/yakir-portrait.webp"></div>'
            f'<div><b>עו״ד יקיר דבול</b><span>רזיאל 1, נתניה</span></div></div>')


def text_block(c, fmt):
    if fmt == 'f':
        return (f'<div class="brand" style="top:52px"><i></i>יקיר דבול - משרד עורכי דין</div>'
                f'<div style="position:absolute;right:64px;top:124px;left:64px">{pill(c["dom"])}'
                f'<div class="title k" style="font-size:{c.get("fs_f", 132)}px;margin-top:26px">{title(c["title"], c["mark"])}</div>'
                f'<div class="sub" style="font-size:32px;margin-top:24px;max-width:930px">{E(c["sub"])}</div></div>'
                f'<div style="position:absolute;right:64px;top:800px;width:440px;display:flex;flex-direction:column;gap:34px;align-items:flex-start">'
                f'{bullets(c["bullets"], 26)}<div class="cta" style="font-size:34px;padding:20px 32px">{E(c["cta"])}{ARR}</div></div>'
                f'<div style="position:absolute;right:64px;bottom:50px">{who(92)}</div>')
    return (f'<div class="brand" style="top:240px;right:0;left:0;justify-content:center"><i></i>יקיר דבול - משרד עורכי דין</div>'
            f'<div style="position:absolute;right:70px;left:70px;top:316px;text-align:center">{pill(c["dom"])}'
            f'<div class="title k" style="font-size:{c.get("fs_s", 160)}px;margin-top:30px">{title(c["title"], c["mark"])}</div>'
            f'<div class="sub" style="font-size:36px;margin:28px auto 0;max-width:900px">{E(c["sub"])}</div>'
            f'<div class="cta" style="font-size:42px;padding:24px 46px;margin-top:40px">{E(c["cta"])}{ARR}</div></div>')


def page(c, fmt):
    cls = 'A f' if fmt == 'f' else 'A s'
    body = text_block(c, fmt) + visual(c, fmt)
    return f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="{cls}" id="ad">{body}</div></body></html>'


if __name__ == '__main__':
    for c in C['creatives']:
        for fmt in ('f', 's'):
            (H / f'{c["key"]}-{fmt}.html').write_text(page(c, fmt), encoding='utf8')
    print('ok', len(C['creatives']))
