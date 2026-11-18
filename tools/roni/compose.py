# Roni the buyer ("רוני הרוכש") comic composer, 1080x1350. Panels are 1014px square images (HeyGen),
# bubbles are placed by hand per episode (box in panel coords, tail point). See tools/roni/README.md.
from PIL import Image, ImageDraw, ImageFont, features
import math, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))

NAVY = (23, 37, 63)
GOLD = (198, 160, 60)
CREAM = (251, 246, 236)
INK = (20, 20, 24)

def F(w, s):
    return ImageFont.truetype(os.path.join(HERE, 'fonts', f'heebo-{w}.ttf'), s, layout_engine=ImageFont.Layout.RAQM)

def tl(font, t):
    return font.getlength(t, direction='rtl', language='he')

def wrap(font, text, maxw):
    words = text.split(' ')
    lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if tl(font, t) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def draw_rtl_center(d, cx, y, text, font, fill):
    w = tl(font, text)
    d.text((cx + w / 2, y), text, font=font, fill=fill, direction='rtl', language='he', anchor='ra')

def bubble(img, box, text, tail, size=46, weight='700'):
    """box=(x0,y0,x1,y1) in panel coords; tail=(x,y) point the tail aims at"""
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    font = F(weight, size)
    lines = wrap(font, text, (x1 - x0) - 50)
    lh = int(size * 1.25)
    th = lh * len(lines)
    # shrink box height to fit text
    cy = (y0 + y1) / 2
    y0 = int(cy - th / 2 - 26); y1 = int(cy + th / 2 + 26)
    # tail
    bx = min(max(tail[0], x0 + 60), x1 - 60)
    by = y1 - 4
    ang = math.atan2(tail[1] - by, tail[0] - bx)
    tip = tail
    w = 26
    p1 = (bx - w, by); p2 = (bx + w, by)
    d.polygon([p1, tip, p2], fill='white', outline=INK)
    d.line([p1, tip], fill=INK, width=5); d.line([p2, tip], fill=INK, width=5)
    d.rounded_rectangle((x0, y0, x1, y1), radius=40, fill='white', outline=INK, width=5)
    # cover tail join
    d.polygon([(p1[0] + 5, by - 6), (tip[0] + (bx - tip[0]) * 0.15, tip[1] + (by - tip[1]) * 0.15 - 4), (p2[0] - 5, by - 6)], fill='white')
    cx = (x0 + x1) / 2
    ty = (y0 + y1) / 2 - th / 2
    for i, ln in enumerate(lines):
        draw_rtl_center(d, cx, ty + i * lh + 2, ln, font, INK)

def panel(path, bubbles):
    im = Image.open(path).convert('RGB')
    im = im.resize((1014, 1014))
    for b in bubbles:
        bubble(im, *b)
    return im

def build(ep_no, ep_title, panels, tip_title, tip_lines, out):
    W, H = 1080, 1350
    canvas = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(canvas)
    # header
    d.rectangle((0, 0, W, 132), fill=NAVY)
    draw_rtl_center(d, W / 2, 16, 'רוני הרוכש', F('900', 62), GOLD)
    draw_rtl_center(d, W / 2, 90, f'פרק {ep_no}: {ep_title}', F('500', 30), (255, 255, 255))
    # panels: RTL order -> 1 top-right, 2 top-left, 3 bottom-right, 4 bottom-left
    S = 480; g = 14; m = (W - 2 * S - g) // 2; top = 145
    pos = [(m + S + g, top), (m, top), (m + S + g, top + S + g), (m, top + S + g)]
    for im, (x, y) in zip(panels, pos):
        canvas.paste(im.resize((S, S), Image.LANCZOS), (x, y))
        d.rectangle((x, y, x + S - 1, y + S - 1), outline=INK, width=3)
    # tip box
    ty = top + 2 * S + g + 12
    d.rounded_rectangle((m, ty, W - m, H - 52), radius=18, fill=(255, 255, 255), outline=NAVY, width=4)
    d.rounded_rectangle((W - m - 250, ty - 2, W - m, ty + 44), radius=14, fill=GOLD)
    draw_rtl_center(d, W - m - 125, ty + 4, tip_title, F('800', 26), NAVY)
    f = F('500', 24)
    yy = ty + 54
    for ln in tip_lines:
        for sub in wrap(f, ln, W - 2 * m - 60):
            d.text((W - m - 28, yy), sub, font=f, fill=INK, direction='rtl', language='he', anchor='ra')
            yy += 31
    # footer
    d.rectangle((0, H - 44, W, H), fill=NAVY)
    draw_rtl_center(d, W / 2, H - 37, 'יקיר דבול - משרד עורכי דין  |  המידע כללי ואינו ייעוץ משפטי', F('500', 22), (255, 255, 255))
    canvas.save(out, quality=94)
    return yy

def ep01(out):
    os.chdir(os.path.join(HERE, 'ep01'))
    p1 = panel('p1.png', [
        ((330, 28, 995, 200), 'וואו! זאת הדירה! סוגר עכשיו!', (420, 300)),
        ((24, 150, 330, 270), 'רגע... בדקנו משהו?', (150, 390), 40),
    ])
    p2 = panel('p2.png', [
        ((300, 24, 780, 210), 'הנה 50 אלף מקדמה. רק שלא תמכור לאחר!', (400, 300)),
        ((790, 150, 995, 250), 'בשמחה!', (870, 360), 42),
        ((24, 170, 250, 262), 'רוני...', (140, 380), 42),
    ])
    p3 = panel('p3.png', [
        ((24, 22, 640, 210), 'עיקול?! משכנתא?! והוא בכלל לא הבעלים היחיד?!', (300, 380)),
        ((655, 118, 998, 262), 'אמרתי לך: קודם נסח.', (770, 450), 34),
    ])
    p4 = panel('p4b.png', [
        ((400, 30, 995, 230), 'הוצאת נסח לוקחת כמה דקות. בודקים אותו לפני שמשלמים.', (800, 470)),
        ((24, 180, 380, 310), 'אז מה עושים עכשיו?', (300, 490), 40),
    ])
    y = build(1, 'המקדמה', [p1, p2, p3, p4], 'מה היה צריך לעשות?', [
        'לפני שמשלמים שקל, מוציאים נסח טאבו ובודקים מי הבעלים ואם רשומים משכנתא, עיקול או הערות.',
        'ואת הכסף משלמים רק לפי חוזה חתום, שעורך דין בדק.',
    ], out)
    return y

if __name__ == '__main__':
    # example: python3 compose.py /tmp/ep01.jpg  (rebuilds episode 1 from tools/roni/ep01/*.png)
    print('tip text ends at', ep01(os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'roni-ep01.jpg')))
