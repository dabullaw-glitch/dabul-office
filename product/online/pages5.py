# The online legal services pages, version 5 (11.10.2026). On top of v4 (pages4.py). Yakir on v4:
#  - the buttons are too plain, upgrade them all;
#  - the "why order online" cards are plain too (screenshot);
#  - the previews must show the real site header at the top and the real footer at the bottom (on WordPress the theme
#    adds them by itself; the previews copy them from the live site so the whole page can be judged);
#  - every service gets its own explainer video instead of his photo.
# Writes pages/<slug>.html (WordPress) and pv/<slug>.html (previews with the site header and footer).
import os, re, json, sys
import pages4 as B
import svcpages as P

esc, ils = B.esc, B.ils
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'

# explainer videos: every service that has one rendered (media/video/<sid>-video.mp4)
VDIR = '/home/claude/dabul-office/media/video'
for sid in P.ORDER:
    f = os.path.join(VDIR, sid + '-video.mp4')
    if os.path.exists(f) and sid not in B.VIDEOS:
        secs = json.load(open(os.path.join(VDIR, sid + '-video.json'))).get('secs', 50) if os.path.exists(os.path.join(VDIR, sid + '-video.json')) else 50
        B.VIDEOS[sid] = (sid + '-video', secs)

CSS5 = r"""<style>
/* v5 buttons: a pill with the label and a round arrow chip, a light sweep on hover */
.dz .btn{position:relative;overflow:hidden;isolation:isolate;border-radius:999px;padding:8px 24px 8px 8px;min-height:58px;gap:14px;font-size:17px;letter-spacing:.005em;border:0;cursor:pointer;
 transition:transform .2s cubic-bezier(.2,.8,.2,1),box-shadow .2s,background .2s,color .2s,border-color .2s}
.dz .btn:not(:has(.ar)){padding:8px 24px}
.dz .btn > span{position:relative;z-index:1}
.dz .btn .ar,.dz .btn .ic{position:relative;z-index:1;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:none;transition:transform .25s cubic-bezier(.2,.8,.2,1),background .2s}
.dz .btn .ar svg,.dz .btn .ic svg{width:20px;height:20px}
.dz .btn .ic{width:34px;height:34px;margin-inline-start:-10px}
.dz .btn .ic svg{width:17px;height:17px}
.dz .btn:hover .ar{transform:translateX(-5px)}
.dz .btn::after{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.55) 48%,transparent 66%);transform:translateX(120%);transition:transform .7s}
.dz .btn:hover::after{transform:translateX(-120%)}
.dz .btn:active{transform:translateY(1px) scale(.99)}
.dz .btn:focus-visible{outline:3px solid #7FA6F0;outline-offset:3px}
.dz .btn.y{background:linear-gradient(180deg,#FFE97A,var(--sun) 45%,var(--sun2));color:var(--navy)!important;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 -2px 0 rgba(160,110,0,.18) inset,0 18px 34px -16px rgba(245,197,24,.95)}
.dz .btn.y:hover{transform:translateY(-2px);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 -2px 0 rgba(160,110,0,.18) inset,0 24px 40px -16px rgba(245,197,24,1)}
.dz .btn.y .ar{background:var(--navy);color:var(--sun)}
.dz .btn.g{background:rgba(255,255,255,.07);color:#fff!important;border:1.5px solid rgba(255,255,255,.28);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.dz .btn.g::after{background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.18) 48%,transparent 66%)}
.dz .btn.g:hover{border-color:#fff;background:rgba(255,255,255,.13);transform:translateY(-2px)}
.dz .btn.g .ic,.dz .btn.g .ar{background:rgba(255,225,77,.16);color:var(--sun)}
.dz .btn.n{background:linear-gradient(180deg,var(--navy2),var(--navy));color:#fff!important;box-shadow:0 18px 34px -18px rgba(14,42,87,.9)}
.dz .btn.n .ar{background:var(--sun);color:var(--navy)}.dz .btn.n:hover{transform:translateY(-2px)}
.dz .btn.o{background:#fff;color:var(--navy)!important;border:1.5px solid var(--line);box-shadow:0 10px 24px -18px rgba(14,42,87,.6)}
.dz .btn.o .ar{background:var(--soft);color:var(--navy)}.dz .btn.o:hover{border-color:var(--navy);transform:translateY(-2px)}
/* the "for details and order" pill on the service cards */
.dz .sc .go{display:inline-flex;align-items:center;gap:10px;background:var(--navy);color:#fff;border-radius:999px;padding:6px 6px 6px 16px;font-weight:800;font-size:15px;transition:background .2s}
.dz .sc .go i{width:32px;height:32px;border-radius:50%;background:var(--sun);color:var(--navy);display:grid;place-items:center;transition:transform .25s}
.dz .sc .go i svg{width:17px;height:17px}
.dz .sc:hover .go i{transform:translateX(-4px)}
.dz .mbar em{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:6px 6px 6px 14px}
.dz .mbar em i{width:30px;height:30px;border-radius:50%;background:var(--navy);color:var(--sun);display:grid;place-items:center}.dz .mbar em i svg{width:16px;height:16px}
.dz .fnav a{transition:transform .2s,box-shadow .2s,border-color .2s}
.dz .fnav a:hover{transform:translateY(-2px);box-shadow:0 12px 24px -16px rgba(14,42,87,.6)}
/* v5 advantages: a bento of cards, each with its own color, a figure and a small infographic */
.dz .advs{background:radial-gradient(900px 400px at 100% 0,rgba(37,99,235,.07),transparent 60%),radial-gradient(700px 360px at 0 100%,rgba(245,197,24,.12),transparent 60%),#F7F9FD}
.dz .bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:30px}
.dz .bx{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:8px;
 box-shadow:0 18px 40px -34px rgba(14,42,87,.6);transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s,border-color .25s}
.dz .bx:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--c) 40%,#fff);box-shadow:0 28px 50px -32px color-mix(in srgb,var(--c) 70%,transparent)}
.dz .bx::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--c),color-mix(in srgb,var(--c) 40%,#fff))}
.dz .bx .bi{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;color:#fff;background:linear-gradient(140deg,color-mix(in srgb,var(--c) 75%,#fff),var(--c));box-shadow:0 12px 22px -12px var(--c)}
.dz .bx .bi svg{width:26px;height:26px}
.dz .bx .bg{position:absolute;left:-18px;bottom:-22px;width:130px;height:130px;color:var(--c);opacity:.07;pointer-events:none}
.dz .bx .bg svg{width:100%;height:100%}
.dz .bx b{font-size:19px;line-height:1.3;margin-top:6px}
.dz .bx span.t{color:var(--mut);font-size:15.5px;line-height:1.55}
.dz .bx .chip{position:absolute;top:20px;left:20px;background:color-mix(in srgb,var(--c) 10%,#fff);color:var(--c);border-radius:99px;padding:4px 11px;font-size:13px;font-weight:800}
.dz .bx.big{grid-column:span 2;grid-row:span 2;padding:26px;background:linear-gradient(160deg,#fff 55%,#F2F6FF)}
.dz .bx.big b{font-size:24px}
.dz .rc{margin-top:auto;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;box-shadow:0 22px 40px -30px rgba(14,42,87,.7);max-width:400px;position:relative}
.dz .rc::after{content:"";position:absolute;inset:auto 14px -7px 14px;height:14px;background:radial-gradient(circle at 7px -2px,transparent 6px,#fff 6.5px) 0 0/14px 14px repeat-x}
.dz .rc .rl{display:flex;justify-content:space-between;gap:10px;font-size:15px;padding:5px 0;color:var(--ink)}
.dz .rc .rl em{font-style:normal;color:var(--mut)}
.dz .rc .rt{display:flex;justify-content:space-between;gap:10px;border-top:2px dashed var(--line);margin-top:6px;padding-top:10px;font-weight:800;font-size:18px}
.dz .rc .rt b{font-size:22px;margin:0;color:var(--navy)}
.dz .rc .ok{display:flex;gap:8px;align-items:center;margin-top:10px;color:var(--ok);font-weight:800;font-size:14.5px}.dz .rc .ok svg{width:18px;height:18px}
.dz .bx.wide{grid-column:1/-1;flex-direction:row;align-items:center;gap:18px;background:linear-gradient(110deg,var(--navy),var(--navy2));color:#fff;border:0}
.dz .bx.wide::before{background:linear-gradient(90deg,var(--sun),#fff3a8)}
.dz .bx.wide b{color:#fff;margin:0}.dz .bx.wide span.t{color:#C9D7F2}
.dz .bx.wide .bi{background:var(--sun);color:var(--navy);box-shadow:0 0 0 8px rgba(255,225,77,.16)}
.dz .bx.wide .seal{margin-inline-start:auto;flex:none;width:96px;height:96px;border-radius:50%;border:2px dashed rgba(255,225,77,.6);display:grid;place-items:center;text-align:center;color:var(--sun);font-weight:800;line-height:1.1;font-size:13px;transform:rotate(-8deg)}
.dz .bx.wide .seal strong{display:block;font-size:26px}
.dz .bx.wide .bg{color:#fff;opacity:.06}
@media (max-width:980px){.dz .bento{grid-template-columns:repeat(2,minmax(0,1fr))}.dz .bx.big{grid-row:auto}}
@media (max-width:640px){
 .dz .btn{min-height:54px;font-size:16.5px;justify-content:space-between}
 .dz .bento{grid-template-columns:minmax(0,1fr)}.dz .bx.big{grid-column:auto}
 .dz .bx.wide{flex-direction:column;align-items:flex-start}.dz .bx.wide .seal{margin:0;position:absolute;left:16px;top:16px;width:78px;height:78px;font-size:11px}.dz .bx.wide .seal strong{font-size:20px}
}
.dz .bx b,.dz .bx span.t{display:block}
.dz .bx.wide > div{flex:1;min-width:0}
@media (min-width:641px){.dz .bx.wide .seal{width:116px;height:116px;font-size:12px;padding:8px}.dz .bx.wide .seal strong{font-size:28px}}
.dz .vid .pl span{left:16px;white-space:normal;line-height:1.35;text-align:right}
@media (max-width:640px){.dz .vid .pl span{font-size:13px;bottom:10px;right:10px;left:10px}.dz .vid .pl i{width:68px;height:68px}}
@media (prefers-reduced-motion:reduce){.dz .btn,.dz .btn::after,.dz .bx,.dz .sc .go i{transition:none}}
</style>"""

ADV5 = [  # icon, title, text, chip, color
    ('car', 'בלי נסיעות ובלי המתנה', 'ממלאים מהטלפון, בזמן שנוח לכם. גם בערב.', 'מכל מקום', '#2563EB'),
    ('user', 'עורך הדין עצמו מטפל', 'עו״ד יקיר דבול קורא כל הזמנה ומטפל בה, מההתחלה ועד הסוף.', 'בלי מתווכים', '#7C3AED'),
    ('lock', 'תשלום מאובטח וקבלה', 'אשראי או ביט בדף תשלום מאובטח, וקבלה נשלחת אליכם למייל.', 'אשראי · ביט', '#0E9F6E'),
    ('mail', 'עדכון בכל שלב', 'מייל כשההזמנה מתקבלת, כשמתחילים, וכשהתשובה מוכנה.', '3 עדכונים', '#EA580C'),
]

def receipt(sid):
    s = B.SV[sid]; fp = P.from_price(s); v = round(fp * P.VAT, 2)
    return ('<div class="rc" aria-label="דוגמה לסיכום מחיר"><div class="rl"><span>%s</span><span>%s</span></div><div class="rl"><em>מע״מ</em><em>%s</em></div>'
            '<div class="rt"><span>סה״כ לתשלום</span><b>%s</b></div><div class="ok">%s<span>זה המחיר. בלי תוספות בהמשך.</span></div></div>') % (
        esc(s['title']), ils(fp), '{:,.2f} ₪'.format(v).replace('.00 ', ' '), '{:,.2f} ₪'.format(fp + v).replace('.00 ', ' '), B.ic('check', '2.6'))

def advantages5(title='למה להזמין אצלנו אונליין', sid='precheck'):
    big = ('<div class="bx big" style="--c:#0E2A57"><span class="chip">מחיר סופי</span><span class="bi">%s</span><b>מחיר ידוע מראש</b>'
           '<span class="t">רואים את המחיר הסופי, כולל מע״מ, לפני שמשלמים. כך נראה הסיכום בסוף הטופס:</span>%s<span class="bg">%s</span></div>') % (B.ic('tag', '1.8'), receipt(sid), B.ic('tag', '1.2'))
    small = ''.join('<div class="bx" style="--c:%s"><span class="chip">%s</span><span class="bi">%s</span><b>%s</b><span class="t">%s</span><span class="bg">%s</span></div>' % (
        c, esc(ch), B.ic(i, '1.8'), esc(t), esc(x), B.ic(i, '1.2')) for i, t, x, ch, c in ADV5)
    wide = ('<div class="bx wide" style="--c:#FFE14D"><span class="bi">%s</span><div><b>החזר מלא</b><span class="t">מבטלים לפני שהטיפול התחיל? כל הסכום חוזר אליכם. בלי שאלות ובלי דמי ביטול.</span></div>'
            '<span class="seal"><span><strong>100%%</strong>החזר לפני<br>תחילת הטיפול</span></span><span class="bg">%s</span></div>') % (B.ic('back', '2'), B.ic('back', '1.2'))
    return ('<section class="advs"><div class="w"><span class="kick">היתרונות</span><h2>%s</h2><p class="lead">שירות משפטי אמיתי, עם עורך דין אמיתי. רק בלי הנסיעה, בלי ההמתנה ובלי הפתעות במחיר.</p>'
            '<div class="bento">%s%s%s</div></div></section>') % (esc(title), big, small, wide)

def upgrade_buttons(h):
    # <a class="btn ..">label ←</a>  ->  label + round arrow chip;  <a class="btn .."><svg..>label</a>  ->  icon chip + label
    def one(m):
        open_, inner = m.group(1), m.group(2)
        icon = ''
        mi = re.match(r'(<svg.*?</svg>)(.*)$', inner, re.S)
        if mi: icon, inner = '<i class="ic">%s</i>' % mi.group(1), mi.group(2)
        arrow = inner.rstrip().endswith('←')
        label = inner.rstrip().rstrip('←').rstrip()
        return '%s%s<span>%s</span>%s</a>' % (open_, icon, label, ('<i class="ar">%s</i>' % ARROW) if arrow else '')
    h = re.sub(r'(<a class="btn [^"]*"[^>]*>)(.*?)</a>', one, h, flags=re.S)
    h = h.replace('<span class="go">לפרטים ולהזמנה ←</span>', '<span class="go">לפרטים ולהזמנה<i>%s</i></span>' % ARROW)
    h = h.replace('<em>להזמנה ←</em>', '<em>להזמנה<i>%s</i></em>' % ARROW)
    return h

# patch v4: new advantages on the hub and on every service page (with that service's price in the receipt)
_service4 = B.service
def service5(sid, ld, photo):
    B.advantages = lambda title='למה להזמין אצלנו אונליין': advantages5(title, sid)
    return upgrade_buttons(_service4(sid, ld, photo).replace(B.CSS, B.CSS + CSS5, 1))
_hub4 = B.hub
def hub5(ld, photo):
    B.advantages = lambda title='למה להזמין אצלנו אונליין': advantages5(title, 'precheck')
    return upgrade_buttons(_hub4(ld, photo).replace(B.CSS, B.CSS + CSS5, 1))

# ---- previews: the live site's header and footer around the page ----
LIVE = '/tmp/claude-0/fetch-wt/fetched/shots/live-legal.html'
def site_frame():
    h = open(LIVE, encoding='utf8').read()
    hd = re.search(r'<header data-elementor-type="header".*?</header>', h, re.S).group(0)
    ft = re.search(r'<footer data-elementor-type="footer".*?</footer>', h, re.S).group(0)
    body = re.search(r'<body([^>]*)>', h).group(1)
    return hd, ft, body

if __name__ == '__main__':
    V = sys.argv[1] if len(sys.argv) > 1 else '1'
    PV = os.path.join(P.HERE, 'pv'); os.makedirs(PV, exist_ok=True)
    hd, ft, body = site_frame()
    head = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>preview</title>'
            '<link rel="stylesheet" href="site.css?v=%s"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&family=Noto+Sans+Hebrew:wght@300;400;500;700&display=swap">'
            '<style>.dz{font-family:Heebo,Arial,sans-serif}.elementor-location-header,.elementor-location-footer{font-family:"Noto Local","Noto Sans Hebrew",sans-serif}</style></head><body%s>' % (V, body))
    out = [('online', hub5(B.old_ld('online'), B.PHOTO))] + [(B.SV[sid]['slug'], service5(sid, B.old_ld(B.SV[sid]['slug']), B.PHOTO)) for sid in P.ORDER]
    for slug, html in out:
        for bad in ('—', '–', 'מומחה', 'חינם', 'הטוב ביותר', 'הכי '):
            assert bad not in html, (slug, bad)
        open(os.path.join(P.OUT, slug + '.html'), 'w', encoding='utf8').write(html)
        pv = html.replace(B.PHOTO, 'yakir-about.webp')
        pv = re.sub(r'href="/online/([a-z-]+)/', r'href="\1.html', pv).replace('href="/online/"', 'href="online.html"')
        open(os.path.join(PV, slug + '.html'), 'w', encoding='utf8').write(head + hd + '<main>' + pv + '</main>' + ft + '</body></html>')
        print(slug, len(html), 'video' if (slug == 'online' or any(s in B.SV and B.SV[s]['slug'] == slug for s in B.VIDEOS)) else 'photo')
