#!/usr/bin/env python3
"""Debt / enforcement / insolvency lead ads (Meta: feed 4:5 1080x1350 and story 9:16 1080x1920).
Yakir, 12.10.2026: the previous designs were poor and not inviting. New look: warm paper background,
navy type, warm gold accent, his real photo, calm and hopeful. Never imply the viewer has debts (Meta),
no superlatives, promises, results, 'free' or prices (Bar Association)."""
import pathlib
H = pathlib.Path(__file__).parent
FONTS = []
for fam, stem, ws in (('He', 'heebo', (400, 500, 700, 800, 900)), ('Fr', 'frank-ruhl-libre', (500, 700, 900))):
    for w in ws:
        FONTS.append(f"@font-face{{font-family:{fam};font-weight:{w};src:url('../fonts/{stem}-hebrew-{w}-normal.woff2')}}")
        FONTS.append(f"@font-face{{font-family:{fam};font-weight:{w};src:url('../fonts/{stem}-latin-{w}-normal.woff2');unicode-range:U+0000-00FF}}")
CHK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
ARR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'

CSS = '\n'.join(FONTS) + """
:root{--paper:#F6F0E5;--ink:#13294B;--mut:#5A6679;--gold:#E2A63B;--gold2:#F7D58A;--green:#2E7D5F;--mint:#E2EFE7;--card:#FFFFFF}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--paper)}
.A{position:relative;overflow:hidden;font-family:He,Arial,sans-serif;color:var(--ink);direction:rtl;
 background:radial-gradient(900px 700px at 8% 6%,#FCE6BC 0%,rgba(252,230,188,0) 70%),radial-gradient(900px 800px at 100% 100%,#E3ECE3 0%,rgba(227,236,227,0) 70%),var(--paper)}
.f{width:1080px;height:1350px}.s{width:1080px;height:1920px}
.brand{position:absolute;display:flex;align-items:center;gap:16px;font-weight:800;color:var(--ink)}
.brand img{height:1.9em;width:auto}
.brand span{display:block;line-height:1.1}.brand small{display:block;font-weight:500;color:var(--mut);font-size:.72em;margin-top:4px}
.h{font-weight:900;line-height:1.02;letter-spacing:-.012em;color:var(--ink)}
.h em{font-style:normal;background:linear-gradient(transparent 58%,var(--gold2) 58%,var(--gold2) 92%,transparent 92%);padding:0 6px}
.sub{font-weight:500;color:#3C4A60;line-height:1.42}
.cta{display:inline-flex;align-items:center;gap:18px;background:var(--ink);color:#fff;font-weight:800;border-radius:999px;box-shadow:0 22px 40px -20px rgba(19,41,75,.7)}
.cta svg{width:1em;height:1em;color:var(--gold2)}
.ctab{position:absolute;display:flex;align-items:center;gap:28px}
.ctab .note{display:flex;align-items:center;gap:10px;font-weight:600;color:var(--mut)}
.ctab .note svg{width:1.1em;height:1.1em;color:var(--green)}
.tag{display:inline-flex;align-items:center;gap:12px;background:var(--mint);color:var(--green);font-weight:800;border-radius:999px}
.tag i{width:.55em;height:.55em;border-radius:50%;background:var(--green)}
/* letter */
.paper{position:absolute;background:#fff;border-radius:14px;box-shadow:0 40px 80px -36px rgba(19,41,75,.55);padding:44px 46px}
.paper .lh{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #E9E3D7;padding-bottom:20px;margin-bottom:26px}
.paper .lh b{font-weight:800;color:#8A93A3}.paper .lh i{display:block;border-radius:50%;border:4px solid #D9D2C4}
.paper .ln{height:16px;border-radius:8px;background:#EEE8DD;margin-bottom:20px}
.paper .stampx{position:absolute;border:6px solid #C8553D;color:#C8553D;font-weight:900;border-radius:12px;transform:rotate(-10deg);opacity:.85}
.note2{position:absolute;background:#FFE6A6;border-radius:6px;box-shadow:0 40px 70px -34px rgba(110,70,0,.55);padding:44px 40px 40px}
.note2:before{content:'';position:absolute;top:-22px;left:50%;width:150px;height:44px;margin-left:-75px;background:rgba(255,255,255,.65);transform:rotate(-3deg);box-shadow:0 2px 6px rgba(0,0,0,.08)}
.note2 b{display:block;font-weight:900;color:var(--ink)}
.chk{display:flex;gap:16px;align-items:flex-start;font-weight:700;color:var(--ink);line-height:1.25}
.chk i{flex:none;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center}
.chk i svg{width:64%;height:64%}
/* quote */
.ph{position:absolute;bottom:0}
.ph img{display:block;width:100%;height:auto}
.halo{position:absolute;border-radius:50%;background:radial-gradient(circle at 50% 45%,#F9D995 0%,#F3C46A 55%,#EDB24F 100%)}
.qt{font-family:Fr,serif;font-weight:700;line-height:1.18;color:var(--ink)}
.qt .q2{color:var(--green)}
.qm{font-family:Fr,serif;font-weight:900;color:var(--gold);line-height:.6;display:block}
.sig{font-weight:800}.sig small{display:block;font-weight:500;color:var(--mut);margin-top:4px}
.plate{position:absolute;background:#fff;border-radius:18px;box-shadow:0 26px 50px -24px rgba(19,41,75,.6);font-weight:800;display:flex;align-items:center;gap:14px}
.plate i{width:.7em;height:.7em;border-radius:50%;background:var(--green)}
/* steps */
.tl{position:absolute;background:#fff;border-radius:28px;box-shadow:0 40px 80px -36px rgba(19,41,75,.55)}
.st{position:relative;display:flex;gap:26px;align-items:center}
.st .n{flex:none;border-radius:50%;display:grid;place-items:center;font-weight:900;background:#EFE8DA;color:var(--ink);position:relative;z-index:1}
.st.done .n{background:var(--green);color:#fff}
.st b{display:block;font-weight:800}.st span{display:block;font-weight:500;color:var(--mut);margin-top:4px}
.rail{position:absolute;width:6px;border-radius:3px;background:linear-gradient(#EFE8DA,#EFE8DA 70%,var(--green))}
.fine{font-weight:500;color:var(--mut)}
/* merge */
.fc{position:absolute;background:#fff;border-radius:18px;box-shadow:0 26px 50px -26px rgba(19,41,75,.55);display:flex;align-items:center;gap:16px;font-weight:700}
.fc .ic{flex:none;border-radius:12px;background:#F3E3DE;color:#B4513C;display:grid;place-items:center;font-weight:900}
.fc small{display:block;font-weight:500;color:var(--mut)}
.one{position:absolute;background:var(--ink);color:#fff;border-radius:26px;box-shadow:0 40px 80px -30px rgba(19,41,75,.8)}
.one b{display:block;font-weight:900}.one span{display:block;color:#C9D4E8;font-weight:500}
.one .pill{display:inline-flex;align-items:center;gap:10px;background:var(--gold2);color:var(--ink);font-weight:800;border-radius:999px}
.flow{position:absolute;overflow:visible}
"""


def brand(x, y, fs, center=False):
    st = f'top:{y}px;' + ('left:0;right:0;justify-content:center;' if center else f'right:{x}px;')
    return (f'<div class="brand" style="{st}font-size:{fs}px"><img src="../img/logo-d.png">'
            f'<div><span>יקיר דבול - משרד עורכי דין</span><small>חובות, הוצאה לפועל וחדלות פירעון</small></div></div>')


def cta_bar(x, y, fs, label='לבדיקה ראשונית', center=False):
    st = f'top:{y}px;' + ('left:0;right:0;justify-content:center;flex-direction:column;gap:22px;' if center else f'right:{x}px;')
    return (f'<div class="ctab" style="{st}"><div class="cta" style="font-size:{fs}px;padding:{int(fs*.62)}px {int(fs*1.25)}px">{label}{ARR}</div>'
            f'<div class="note" style="font-size:{int(fs*.66)}px">{LOCK}<span>שיחה דיסקרטית, ללא התחייבות</span></div></div>')


def chk(t, fs):
    s = int(fs * 1.5)
    return f'<div class="chk" style="font-size:{fs}px"><i style="width:{s}px;height:{s}px">{CHK}</i><span>{t}</span></div>'


# ---------- 1. letter ----------
def letter(F):
    if F:
        head = brand(64, 56, 30) + (
            '<div style="position:absolute;right:64px;left:64px;top:178px">'
            '<div class="h" style="font-size:104px">מכתב מההוצאה<br>לפועל הוא לא<br><em>סוף הדרך.</em></div>'
            '<div class="sub" style="font-size:34px;margin-top:26px;max-width:900px">לפני שמחליטים משהו, עושים סדר: מה פתוח, מה הסכומים בפועל, ומה החוק מאפשר.</div></div>')
        px, py, pw, ph, rot = 70, 700, 450, 460, -5
        nx, ny, nw, nrot, nfs = 470, 730, 540, 3, 34
        cta = cta_bar(64, 1214, 38)
    else:
        head = brand(0, 270, 32, center=True) + (
            '<div style="position:absolute;right:70px;left:70px;top:420px;text-align:center">'
            '<div class="h" style="font-size:118px">מכתב מההוצאה<br>לפועל הוא לא<br><em>סוף הדרך.</em></div>'
            '<div class="sub" style="font-size:40px;margin:34px auto 0;max-width:880px">לפני שמחליטים משהו, עושים סדר: מה פתוח, מה הסכומים בפועל, ומה החוק מאפשר.</div></div>')
        px, py, pw, ph, rot = 90, 950, 450, 420, -5
        nx, ny, nw, nrot, nfs = 450, 950, 560, 3, 34
        cta = cta_bar(0, 1420, 42, center=True)
    lines = ''.join(f'<div class="ln" style="width:{w}%"></div>' for w in (100, 92, 97, 70, 100, 85, 60))
    paper = (f'<div class="paper" style="left:{px}px;top:{py}px;width:{pw}px;height:{ph}px;transform:rotate({rot}deg)">'
             f'<div class="lh"><b style="font-size:26px">הודעה לחייב</b><i style="width:58px;height:58px"></i></div>{lines}'
             f'<div class="stampx" style="font-size:34px;padding:6px 20px;left:40px;bottom:46px">דחוף</div></div>')
    note = (f'<div class="note2" style="left:{nx}px;top:{ny}px;width:{nw}px;transform:rotate({nrot}deg)">'
            f'<b style="font-size:{nfs + 8}px;margin-bottom:26px">מה עושים עכשיו?</b>'
            f'<div style="display:grid;gap:22px">{chk("בודקים תיקים וסכומים", nfs)}{chk("מבינים מה מותר לעקל", nfs)}{chk("בוחרים מסלול לפי החוק", nfs)}</div></div>')
    return head + paper + note + cta


# ---------- 2. quote ----------
def quote(F):
    if F:
        photo = ('<div class="halo" style="left:-60px;top:330px;width:620px;height:620px"></div>'
                 '<div class="ph" style="left:-40px;width:560px"><img src="../img/yakir-cutout.webp"></div>'
                 '<div class="plate" style="left:150px;bottom:66px;font-size:28px;padding:16px 26px"><i></i>עו״ד יקיר דבול</div>')
        txt = (brand(64, 56, 30) +
               '<div style="position:absolute;right:64px;width:470px;top:190px">'
               '<span class="qm" style="font-size:190px">״</span>'
               '<div class="qt" style="font-size:64px;margin-top:6px;white-space:nowrap">חובות לא נעלמים<br>כשמתעלמים מהם.<br><span class="q2">אבל לחוק יש<br>מסלולים בשבילם.</span></div>'
               '<div class="sig" style="font-size:30px;margin-top:40px">עו״ד יקיר דבול<small>נתניה והשרון</small></div>'
               '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:40px">' + ''.join(f'<span class="tag" style="font-size:26px;padding:10px 22px"><i></i>{t}</span>' for t in ('איחוד תיקים', 'הסדר עם נושים', 'חדלות פירעון')) + '</div></div>')
        cta = cta_bar(64, 1150, 36)
        cta = cta.replace('class="ctab" style="', 'class="ctab" style="flex-direction:column;align-items:flex-start;gap:20px;')
    else:
        photo = ('<div class="halo" style="left:215px;top:1000px;width:650px;height:650px"></div>'
                 '<div class="ph" style="left:270px;width:540px;bottom:-140px"><img src="../img/yakir-cutout.webp"></div>')
        txt = (brand(0, 270, 32, center=True) +
               '<div style="position:absolute;right:80px;left:80px;top:350px;text-align:center">'
               '<span class="qm" style="font-size:200px">״</span>'
               '<div class="qt" style="font-size:66px">חובות לא נעלמים<br>כשמתעלמים מהם.<br><span class="q2">אבל לחוק יש<br>מסלולים בשבילם.</span></div></div>')
        cta = ('<div class="plate" style="left:50%;transform:translateX(-50%);top:1380px;font-size:32px;padding:22px 34px;flex-direction:column;gap:18px;align-items:center;white-space:nowrap">'
               '<span style="display:flex;align-items:center;gap:14px"><i></i>עו״ד יקיר דבול · נתניה והשרון</span>'
               f'<span class="cta" style="font-size:40px;padding:22px 48px">לבדיקה ראשונית{ARR}</span></div>')
    return photo + txt + cta


# ---------- 3. steps ----------
STEPS = [('בקשה וצו פתיחת הליכים', 'הגבייה בהוצאה לפועל מעוכבת'), ('תקופת ביניים', 'בדיקת המצב ותשלום חודשי'),
         ('תכנית פירעון', 'לפי היכולת, לתקופה מוגדרת'), ('הפטר מהחובות', 'בסוף הדרך, כשהתנאים מתקיימים')]


def steps(F):
    def tl(x, y, w, fs, gap, pad):
        n = int(fs * 2.1)
        rows = ''.join(f'<div class="st{" done" if i == 3 else ""}"><span class="n" style="width:{n}px;height:{n}px;font-size:{fs}px">'
                       f'{CHK if i == 3 else i + 1}</span><div><b style="font-size:{fs}px">{a}</b><span style="font-size:{int(fs*.78)}px">{b}</span></div></div>'
                       for i, (a, b) in enumerate(STEPS))
        rail = f'<div class="rail" style="right:{pad + n // 2 - 3}px;top:{pad + n // 2}px;bottom:{pad + n // 2}px"></div>'
        return (f'<div class="tl" style="left:{x}px;top:{y}px;width:{w}px;padding:{pad}px">{rail}'
                f'<div style="display:grid;gap:{gap}px;position:relative">{rows}</div></div>')
    if F:
        return (brand(64, 56, 30) +
                '<div style="position:absolute;right:64px;left:64px;top:170px">'
                '<span class="tag" style="font-size:28px;padding:10px 24px"><i></i>חוק חדלות פירעון ושיקום כלכלי</span>'
                '<div class="h" style="font-size:104px;margin-top:26px">הליך בשלבים,<br><em>עם נקודת סיום.</em></div></div>' +
                tl(64, 560, 952, 36, 30, 40) +
                '<div class="fine" style="position:absolute;right:64px;top:1138px;font-size:24px">כל מקרה נבחן לגופו.</div>' +
                cta_bar(64, 1194, 38))
    return (brand(0, 270, 32, center=True) +
            '<div style="position:absolute;right:70px;left:70px;top:400px;text-align:center">'
            '<span class="tag" style="font-size:32px;padding:12px 28px"><i></i>חוק חדלות פירעון ושיקום כלכלי</span>'
            '<div class="h" style="font-size:118px;margin-top:30px">הליך בשלבים,<br><em>עם נקודת סיום.</em></div></div>' +
            tl(70, 790, 940, 38, 32, 42) +
            '<div class="fine" style="position:absolute;left:0;right:0;text-align:center;top:1398px;font-size:28px">כל מקרה נבחן לגופו.</div>' +
            cta_bar(0, 1450, 42, center=True))


# ---------- 4. merge ----------
FILES = [('בנק', 'תיק 1'), ('כרטיס אשראי', 'תיק 2'), ('ספק', 'תיק 3'), ('הלוואה', 'תיק 4')]


def merge(F):
    if F:
        head = (brand(64, 56, 30) +
                '<div style="position:absolute;right:64px;left:64px;top:180px">'
                '<div class="h" style="font-size:102px;white-space:nowrap">כמה תיקים,<br><em>תשלום חודשי אחד.</em></div>'
                '<div class="sub" style="font-size:34px;margin-top:26px;max-width:900px">איחוד תיקים בהוצאה לפועל, לפי היכולת. בודקים יחד אם זה מתאים.</div></div>')
        fx, fy, fw, fh, fg, ffs = 600, 640, 416, 108, 24, 32
        ox, oy, ow, ofs = 64, 700, 420, 40
        cta = cta_bar(64, 1214, 38)
        sx0, sy0 = fx, fy
    else:
        head = (brand(0, 270, 32, center=True) +
                '<div style="position:absolute;right:70px;left:70px;top:410px;text-align:center">'
                '<div class="h" style="font-size:94px;white-space:nowrap">כמה תיקים,<br><em>תשלום חודשי אחד.</em></div>'
                '<div class="sub" style="font-size:40px;margin:34px auto 0;max-width:860px">איחוד תיקים בהוצאה לפועל, לפי היכולת. בודקים יחד אם זה מתאים.</div></div>')
        fx, fy, fw, fh, fg, ffs = 590, 880, 420, 100, 20, 30
        ox, oy, ow, ofs = 70, 920, 420, 40
        cta = cta_bar(0, 1400, 42, center=True)
    cards, ends = '', []
    for i, (a, b) in enumerate(FILES):
        y = fy + i * (fh + fg)
        ic = int(fh * .58)
        cards += (f'<div class="fc" style="left:{fx}px;top:{y}px;width:{fw}px;height:{fh}px;padding:0 24px;font-size:{ffs}px">'
                  f'<span class="ic" style="width:{ic}px;height:{ic}px;font-size:{int(ffs*.8)}px">{i + 1}</span><div>{a}<small style="font-size:{int(ffs*.72)}px">{b}, עם ריבית והוצאות</small></div></div>')
        ends.append((fx, y + fh // 2))
    total_h = 4 * fh + 3 * fg
    oh = int(total_h * .78)
    oy = fy + (total_h - oh) // 2
    one = (f'<div class="one" style="left:{ox}px;top:{oy}px;width:{ow}px;height:{oh}px;padding:36px 34px;display:flex;flex-direction:column;justify-content:center;gap:16px">'
           f'<span class="pill" style="font-size:{int(ofs*.62)}px;padding:8px 20px;align-self:flex-start">תיק מאוחד</span>'
           f'<b style="font-size:{ofs}px;line-height:1.15">צו תשלומים<br>חודשי אחד</b><span style="font-size:{int(ofs*.66)}px">נקבע לפי היכולת</span></div>')
    # connector lines from each file card to the merged card
    tx, ty = ox + ow, oy + oh // 2
    paths = ''.join(f'<path d="M{x} {y} C {x - 70} {y}, {tx + 70} {ty}, {tx + 6} {ty}" fill="none" stroke="#C9BFAE" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>' for x, y in ends)
    svg = f'<svg class="flow" style="left:0;top:0" width="1080" height="1920" viewBox="0 0 1080 1920">{paths}<circle cx="{tx + 6}" cy="{ty}" r="10" fill="#E2A63B"/></svg>'
    return head + svg + cards + one + cta


LAYOUT = {'letter': letter, 'quote': quote, 'steps': steps, 'merge': merge}


def page(key, fmt):
    body = LAYOUT[key](fmt == 'f')
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head>'
            f'<body><div class="A {fmt}" id="ad">{body}</div></body></html>')


if __name__ == '__main__':
    for k in LAYOUT:
        for fmt in ('f', 's'):
            (H / f'{k}-{fmt}.html').write_text(page(k, fmt), encoding='utf8')
    print('ok')
