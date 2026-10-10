# The online services hub, version 2 (10.10.2026): Yakir asked for a page that sells and invites, not a list.
# Hero with a live "order card", a strip of what you can trust, services by need (tabs), one spotlight service,
# how it works with real times, "who handles it" with Yakir's photo, FAQ and a closing call. Writes pages/online.html.
import json, os, re, html as H
import svcpages as P

SV, CFG, esc, ils, icon = P.SV, P.CFG, P.esc, P.ils, P.icon
PHOTO = 'https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-about.webp'

NEEDS = [
 ('home', 'קונים או מוכרים דירה', 'לפני שמציעים מחיר, ואחרי שחותמים', ['precheck', 'tabu', 'zoom']),
 ('biz', 'עסק וחברה', 'פותחים חברה או משנים משהו בה', ['company', 'registrar', 'zoom']),
 ('fam', 'משפחה וירושה', 'מסדרים מראש, או אחרי שמישהו נפטר', ['poa', 'inherit', 'zoom']),
 ('debt', 'חובות והוצאה לפועל', 'תשלום אחד שמתאים להכנסה', ['ichud', 'tashlumim', 'zoom']),
]
SIGN = {'none': 'הכול אונליין', 'digital': 'חתימה מהטלפון', 'meet': 'פגישת חתימה אחת'}
TIME = {'precheck': 'תשובה בתוך 2 ימי עבודה', 'zoom': 'מועד לבחירה באתר', 'company': 'הגשה בתוך 3 ימי עבודה מהחתימה', 'registrar': 'הגשה בתוך 3 ימי עבודה מהחתימה',
        'tabu': 'הגשה בתוך 2 ימי עבודה מהחתימה', 'inherit': 'הגשה בתוך 3 ימי עבודה', 'poa': 'פגישה בדרך כלל בתוך שבוע', 'ichud': 'הגשה בתוך 3 ימי עבודה', 'tashlumim': 'הגשה בתוך 3 ימי עבודה'}

def svc_card(sid, big=False):
    s = SV[sid]
    inc = ''.join('<li>%s</li>' % esc(x) for x in s['incl'][:3])
    return ('<a class="sc%s" href="/online/%s/"><span class="ic">%s</span><span class="tp"><b>%s</b><small>%s</small></span>'
            '<ul>%s</ul><span class="ft"><span class="pr">החל מ־<b>%s</b><em>+ מע״מ</em></span><span class="go">להזמנה <i>←</i></span></span>'
            '<span class="mt"><i>%s</i><i>%s</i></span></a>') % (' big' if big else '', s['slug'], icon(s['icon'], '1.6'), esc(s['title']), esc(s['card']), inc,
                                                                 ils(P.from_price(s)), esc(SIGN[s['sign']]), esc(TIME[sid]))

CSS = r"""<style>
.dh{--g:#b8932f;--g2:#8a6d2c;--g3:#f0e2bd;--ink:#141311;--ink2:#1f1d1a;--line:#e7e0d0;--mut:#6c675d;--paper:#faf8f3;color:var(--ink);font-size:17px;line-height:1.7;direction:rtl}
.dh *{box-sizing:border-box}
.dh a{color:inherit}
.dh .wrap{max-width:1240px;margin:0 auto;padding:0 20px}
.dh h2{font-size:clamp(26px,3.4vw,38px);line-height:1.15;margin:0 0 10px;font-weight:800;text-wrap:balance}
.dh .k{display:inline-flex;align-items:center;gap:8px;color:var(--g2);font-size:14px;font-weight:800;letter-spacing:.04em;margin:0 0 8px}
.dh .k::before{content:"";width:26px;height:2px;background:var(--g)}
.dh .lead{color:var(--mut);font-size:18px;max-width:62ch;margin:0;text-wrap:balance}
.dh section{padding:72px 0}
/* hero */
.dh .hero{background:radial-gradient(900px 520px at 90% -10%,rgba(184,147,47,.28),transparent 60%),radial-gradient(700px 400px at 0% 110%,rgba(184,147,47,.12),transparent 60%),var(--ink);color:#f4efe4;padding:28px 0 64px;overflow:hidden}
.dh .crumb{font-size:13.5px;color:#a79f8e;margin:0 0 28px}.dh .crumb a{color:#a79f8e;text-decoration:none}
.dh .hg{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:48px;align-items:center}
.dh .hero .k{color:var(--g3)}.dh .hero .k::before{background:var(--g3)}
.dh .hero h1{font-size:clamp(34px,5vw,58px);line-height:1.08;margin:0 0 18px;font-weight:800;color:#fff;letter-spacing:-.01em;text-wrap:balance}
.dh .hero h1 span{background:linear-gradient(120deg,var(--g3),var(--g));-webkit-background-clip:text;background-clip:text;color:transparent}
.dh .hero p.sub{color:#cfc7b6;font-size:19px;max-width:54ch;margin:0 0 26px}
.dh .btns{display:flex;flex-wrap:wrap;gap:12px}
.dh .b1,.dh .b2{display:inline-flex;align-items:center;gap:10px;text-decoration:none;border-radius:99px;padding:15px 28px;font-weight:800;font-size:17px;white-space:nowrap}
.dh .b1{background:linear-gradient(135deg,var(--g3),var(--g));color:#1c1b19;box-shadow:0 12px 30px -12px rgba(184,147,47,.7)}
.dh .b2{border:1.5px solid #4a443a;color:#f4efe4}
.dh .ticks{display:flex;flex-wrap:wrap;gap:8px 20px;margin:26px 0 0;padding:0;list-style:none;color:#d8d0bf;font-size:15px}
.dh .ticks li{display:flex;align-items:center;gap:8px}.dh .ticks li::before{content:"";width:18px;height:18px;border-radius:50%;background:rgba(184,147,47,.25) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f0e2bd' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E") center/12px no-repeat;flex:0 0 18px}
/* the order card in the hero */
.dh .oc{position:relative;justify-self:center;width:100%;max-width:400px}
.dh .oc .card{background:#fff;color:var(--ink);border-radius:26px;padding:20px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);transform:rotate(-2deg)}
.dh .oc .card .h{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.dh .oc .card .h i{width:40px;height:40px;border-radius:12px;background:var(--paper);color:var(--g2);display:grid;place-items:center}.dh .oc .card .h i svg{width:22px;height:22px}
.dh .oc .card .h b{display:block;font-size:16px;line-height:1.2}.dh .oc .card .h small{color:var(--mut);font-size:13px}
.dh .oc .st{display:flex;gap:6px;margin-bottom:14px}.dh .oc .st span{flex:1;height:5px;border-radius:5px;background:#eee8da}.dh .oc .st span.on{background:var(--g)}
.dh .oc .opt{display:flex;align-items:center;gap:10px;border:1.5px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:8px;font-size:14.5px;font-weight:700}
.dh .oc .opt.on{border-color:var(--g);background:var(--paper)}
.dh .oc .opt i{width:18px;height:18px;border-radius:50%;border:2px solid var(--line);flex:0 0 18px}.dh .oc .opt.on i{border-color:var(--g);background:var(--g);box-shadow:inset 0 0 0 3px #fff}
.dh .oc .opt em{margin-inline-start:auto;font-style:normal;color:var(--g2);font-size:13px}
.dh .oc .tot{display:flex;justify-content:space-between;align-items:baseline;background:var(--ink);color:#fff;border-radius:14px;padding:12px 14px;margin-top:12px}
.dh .oc .tot span{color:var(--g3);font-size:14px;font-weight:700}.dh .oc .tot b{font-size:24px}
.dh .oc .pay{display:block;text-align:center;margin-top:10px;background:linear-gradient(135deg,var(--g3),var(--g));border-radius:12px;padding:11px;font-weight:800;color:#1c1b19}
.dh .oc .badge{position:absolute;top:-30px;left:-34px;background:#fff;color:var(--ink);border-radius:14px;padding:8px 12px;font-size:13.5px;font-weight:800;box-shadow:0 16px 30px -14px rgba(0,0,0,.5);display:flex;align-items:center;gap:8px;transform:rotate(3deg)}
.dh .oc .badge i{width:26px;height:26px;border-radius:50%;background:#e9f6ee;color:#1f8f4e;display:grid;place-items:center;font-style:normal}
.dh .oc .badge2{top:auto;bottom:-16px;left:auto;right:-8px;transform:rotate(-3deg)}
.dh .oc .badge2 i{background:var(--paper);color:var(--g2)}
/* trust strip */
.dh .trust{background:#fff;border-bottom:1px solid var(--line);padding:0}
.dh .trust ul{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:0;padding:0;list-style:none}
.dh .trust li{display:flex;align-items:center;gap:12px;padding:22px 18px;border-inline-start:1px solid var(--line)}.dh .trust li:first-child{border-inline-start:0}
.dh .trust li i{width:44px;height:44px;border-radius:50%;background:var(--paper);color:var(--g2);display:grid;place-items:center;flex:0 0 44px}.dh .trust li i svg{width:22px;height:22px}
.dh .trust b{display:block;font-size:15.5px;line-height:1.3}.dh .trust small{color:var(--mut);font-size:13.5px;line-height:1.4;display:block}
/* services by need */
.dh .svc{background:var(--paper)}
.dh .tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:28px 0 18px}
.dh .tabs button{font:inherit;border:1.5px solid var(--line);background:#fff;border-radius:18px;padding:14px 16px;font-weight:800;font-size:16px;color:var(--ink);cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:right;transition:border-color .2s}.dh .tabs button:hover{border-color:var(--g)}
.dh .tabs button small{font-weight:600;color:var(--mut);font-size:13.5px;line-height:1.4}
.dh .tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}.dh .tabs button.on small{color:#cfc7b6}
.dh .panel{display:none}.dh .panel.on{display:block}
.dh .pg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.dh .sc{position:relative;display:flex;flex-direction:column;gap:12px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px;text-decoration:none;transition:transform .2s,box-shadow .2s,border-color .2s}
.dh .sc:hover{transform:translateY(-3px);box-shadow:0 24px 40px -26px rgba(28,27,25,.45);border-color:var(--g)}
.dh .sc .ic{width:52px;height:52px;border-radius:16px;background:linear-gradient(145deg,#fbf3dd,#efe1b8);color:var(--g2);display:grid;place-items:center}.dh .sc .ic svg{width:26px;height:26px}
.dh .sc .tp b{display:block;font-size:20px;line-height:1.25}.dh .sc .tp small{display:block;color:var(--mut);font-size:15px;line-height:1.55;margin-top:4px}
.dh .sc ul{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:14.5px;color:#3b3833;flex:1}
.dh .sc ul li{position:relative;padding-inline-start:22px;line-height:1.5}.dh .sc ul li::before{content:"";position:absolute;right:2px;top:.45em;width:11px;height:6px;border:solid var(--g);border-width:0 0 2px 2px;transform:rotate(-45deg)}
.dh .sc .ft{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:14px}
.dh .sc .pr{font-size:14px;color:var(--mut)}.dh .sc .pr b{display:block;font-size:26px;line-height:1.1;color:var(--ink);font-variant-numeric:tabular-nums}.dh .sc .pr em{font-style:normal;font-size:13px}
.dh .sc .go{display:inline-flex;align-items:center;gap:8px;background:var(--ink);color:#fff;border-radius:99px;padding:10px 18px;font-weight:800;font-size:15px}
.dh .sc .go i{font-style:normal;transition:transform .2s}.dh .sc:hover .go i{transform:translateX(-4px)}
.dh .sc .mt{display:flex;flex-wrap:wrap;gap:6px}.dh .sc .mt i{font-style:normal;font-size:12.5px;font-weight:700;color:var(--g2);background:var(--paper);border:1px solid var(--line);border-radius:99px;padding:3px 10px}
.dh .sc .mt{order:-1}
.dh .sc.big{background:var(--ink);color:#f4efe4;border-color:var(--ink)}
.dh .sc.big .tp small,.dh .sc.big ul{color:#cfc7b6}.dh .sc.big .ft{border-color:#3a352d}.dh .sc.big .pr b{color:#fff}.dh .sc.big .go{background:linear-gradient(135deg,var(--g3),var(--g));color:#1c1b19}
.dh .sc.big .mt i{background:#26231e;border-color:#3a352d;color:var(--g3)}.dh .sc.big .ic{background:#2a261f;color:var(--g3)}
.dh .alll{margin:18px 0 0;font-size:15px;color:var(--mut)}.dh .alll a{color:var(--g2);font-weight:800}
/* spotlight */
.dh .spot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;background:var(--ink);color:#f4efe4;border-radius:30px;overflow:hidden}
.dh .spot .tx{padding:44px 40px}
.dh .spot .tx .k{color:var(--g3)}.dh .spot h2{color:#fff}
.dh .spot .tx p{color:#cfc7b6;margin:0 0 18px}
.dh .spot .list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 24px;padding:0;list-style:none}
.dh .spot .list li{background:#1f1d1a;border:1px solid #33302a;border-radius:14px;padding:10px 12px;font-size:14.5px;line-height:1.45}
.dh .spot .list li b{display:block;color:var(--g3);font-size:13px}
.dh .spot .vis{background:linear-gradient(160deg,#2a2519,#141311);position:relative;padding:40px;display:grid;place-items:center}
.dh .doc{width:100%;max-width:360px;background:#fff;color:var(--ink);border-radius:18px;padding:18px;box-shadow:0 30px 60px -30px #000}
.dh .doc .t{font-weight:800;font-size:15px;margin-bottom:10px;display:flex;justify-content:space-between}.dh .doc .t span{color:var(--mut);font-weight:600;font-size:12.5px}
.dh .doc .r{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #eee8da;font-size:14px}.dh .doc .r:last-child{border:0}
.dh .doc .r i{font-style:normal;font-size:12px;font-weight:800;border-radius:99px;padding:2px 9px;margin-inline-start:auto}
.dh .doc .ok{background:#e9f6ee;color:#1f8f4e}.dh .doc .wa{background:#fbf2dc;color:#a86a06}
/* steps */
.dh .steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:34px 0 0;padding:0;list-style:none;position:relative}
.dh .steps::before{content:"";position:absolute;top:27px;right:12.5%;left:12.5%;height:2px;background:repeating-linear-gradient(90deg,var(--g) 0 8px,transparent 8px 14px)}
.dh .steps li{text-align:center;padding:0 14px;position:relative}
.dh .steps .n{width:56px;height:56px;border-radius:50%;background:#fff;border:2px solid var(--g);display:grid;place-items:center;margin:0 auto 14px;font-weight:800;font-size:20px;color:var(--g2);position:relative}
.dh .steps b{display:block;font-size:18px}.dh .steps span{color:var(--mut);font-size:15px;line-height:1.55;display:block;margin-top:4px}
.dh .steps em{display:inline-block;font-style:normal;margin-top:8px;font-size:12.5px;font-weight:800;color:var(--g2);background:var(--paper);border-radius:99px;padding:3px 10px}
/* who */
.dh .who{background:var(--paper)}
.dh .wg{display:grid;grid-template-columns:320px minmax(0,1fr);gap:40px;align-items:center}
.dh .ph{position:relative;border-radius:26px;overflow:hidden;aspect-ratio:4/5;max-width:100%;background:#ddd}
.dh .ph img{width:100%;height:100%;object-fit:cover;display:block}
.dh .ph .cap{position:absolute;inset:auto 0 0 0;padding:40px 18px 16px;background:linear-gradient(to top,rgba(20,19,17,.88),transparent);color:#fff}
.dh .ph .cap b{display:block;font-size:18px}.dh .ph .cap span{color:#d8d0bf;font-size:14px}
.dh .facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:22px 0 0}
.dh .facts div{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 16px}
.dh .facts b{display:block;font-size:28px;line-height:1.1;color:var(--g2)}.dh .facts span{font-size:14px;color:var(--mut)}
/* faq + close */
.dh .faq{max-width:860px}
.dh details{border-bottom:1px solid var(--line);padding:16px 0}
.dh summary{cursor:pointer;font-weight:800;font-size:17.5px;list-style:none;display:flex;justify-content:space-between;gap:12px}.dh summary::-webkit-details-marker{display:none}
.dh summary::after{content:"+";color:var(--g2);font-size:22px;line-height:1}.dh details[open] summary::after{content:"−"}
.dh details p{margin:10px 0 0;color:#3b3833}
.dh .close{background:radial-gradient(600px 300px at 0% 0%,rgba(184,147,47,.25),transparent 60%),linear-gradient(135deg,#1c1a16,#141311);color:#f4efe4;border-radius:30px;padding:44px 40px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
.dh .close h2{color:#fff;margin:0 0 6px}.dh .close p{margin:0;color:#cfc7b6}
.dh .terms{font-size:13.5px;color:var(--mut);margin:18px 0 0}
.dh .mbar{display:none}
@media (max-width:980px){
 .dh .hg,.dh .spot,.dh .wg{grid-template-columns:minmax(0,1fr)}
 .dh .oc{max-width:300px;margin-top:24px}.dh .oc .badge{left:-6px}
 .dh .trust ul{grid-template-columns:repeat(2,minmax(0,1fr))}.dh .trust li:nth-child(3){border-inline-start:0}.dh .trust li{border-top:1px solid var(--line)}
 .dh .pg{grid-template-columns:minmax(0,1fr)}
 .dh .steps{grid-template-columns:minmax(0,1fr);gap:18px}.dh .steps::before{top:28px;bottom:28px;right:27px;left:auto;width:2px;height:auto;background:repeating-linear-gradient(180deg,var(--g) 0 8px,transparent 8px 14px)}
 .dh .steps li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:4px 14px;text-align:right;padding:0}.dh .steps .n{grid-row:span 3;margin:0}
 .dh .ph{max-width:320px;aspect-ratio:1/1}
 .dh .spot .tx{padding:30px 22px}.dh .spot .vis{padding:26px 18px}
}
@media (max-width:640px){
 .dh{font-size:16.5px}.dh section{padding:52px 0}.dh .wrap{padding:0 16px}
 .dh .hero{padding:20px 0 48px}.dh .hero p.sub{font-size:17px}
 .dh .b1,.dh .b2{width:100%;justify-content:center}
 .dh .trust li{padding:14px 10px;gap:8px}.dh .trust li i{width:36px;height:36px;flex-basis:36px}.dh .trust b{font-size:14px}.dh .trust small{display:none}
 .dh .tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;margin-inline:-16px;padding:0 16px 4px;scrollbar-width:none}.dh .tabs button{border-radius:99px;padding:10px 16px}.dh .tabs::-webkit-scrollbar{display:none}.dh .tabs button{flex:0 0 auto}.dh .tabs button small{display:none}
 .dh .spot .list{grid-template-columns:minmax(0,1fr)}.dh .spot .vis{display:none}
 .dh .facts b{font-size:22px}
 .dh .close{padding:28px 20px;border-radius:22px}
 .dh .mbar{display:flex;position:fixed;bottom:88px;left:12px;right:12px;z-index:50;justify-content:center;background:var(--ink);color:#fff;border-radius:99px;padding:13px;font-weight:800;text-decoration:none;box-shadow:0 14px 30px -12px rgba(0,0,0,.6);transform:translateY(160%);transition:transform .3s}
 .dh .mbar.on{transform:none}
}
</style>"""

TRUST = [
 ('shield', 'עו״ד יקיר דבול מטפל בעצמו', 'לא מוקד ולא מערכת אוטומטית'),
 ('search', 'מחיר סופי לפני התשלום', 'כולל מע״מ, בלי תוספות בהמשך'),
 ('layers', 'החזר מלא', 'אם מבטלים לפני שהטיפול התחיל'),
 ('calendar', 'זמני טיפול ידועים', 'כתוב בכל שירות כמה זמן זה לוקח'),
]

def hub_page():
    url = P.BASE
    pre = SV['precheck']
    tabs = ''.join('<button type="button" class="%s" data-t="%s" aria-pressed="%s">%s <small>%s</small></button>' % ('on' if i == 0 else '', k, 'true' if i == 0 else 'false', esc(t), esc(sub)) for i, (k, t, sub, ids) in enumerate(NEEDS))
    panels = ''.join('<div class="panel%s" data-p="%s"><div class="pg">%s</div></div>' % (' on' if i == 0 else '', k, ''.join(svc_card(x, big=(j == 0)) for j, x in enumerate(ids))) for i, (k, t, sub, ids) in enumerate(NEEDS))
    hero = ('<div class="hero"><div class="wrap"><p class="crumb"><a href="/">דף הבית</a> › שירותים משפטיים אונליין</p><div class="hg"><div>'
            '<p class="k">שירותים משפטיים אונליין</p><h1>עורך דין, <span>בלי לצאת מהבית.</span></h1>'
            '<p class="sub">בדיקת דירה לפני קנייה, ייעוץ בזום, הקמת חברה, רישום בטאבו, צו ירושה, ייפוי כוח מתמשך ובקשות בהוצאה לפועל. בוחרים שירות, ממלאים טופס קצר ורואים מחיר סופי. עו״ד יקיר דבול מטפל מכאן.</p>'
            '<div class="btns"><a class="b1" href="#services">לבחירת שירות ←</a><a class="b2" href="/online/zoom-consultation/">ייעוץ קצר בזום</a></div>'
            '<ul class="ticks"><li>מחיר קבוע, מוצג מראש</li><li>תשלום מאובטח</li><li>מסמכים מהטלפון</li></ul></div>'
            '<div class="oc" aria-hidden="true"><div class="card"><div class="h"><i>%s</i><div><b>%s</b><small>שלב 2 מתוך 5</small></div></div>'
            '<div class="st"><span class="on"></span><span class="on"></span><span></span><span></span><span></span></div>'
            '<div class="opt on"><i></i>זו תהיה הדירה היחידה שלנו</div><div class="opt"><i></i>מחליפים דירה</div><div class="opt"><i></i>דירה נוספת או להשקעה</div>'
            '<div class="tot"><span>סה״כ כולל מע״מ</span><b>%s</b></div><span class="pay">לתשלום מאובטח</span></div>'
            '<span class="badge"><i>✓</i>המחיר ידוע לפני התשלום</span><span class="badge badge2"><i>⏱</i>%s</span></div>'
            '</div></div></div>') % (icon(pre['icon']), esc(pre['title']), P.vat(pre['base']), esc(TIME['precheck']))
    trust = '<div class="trust"><div class="wrap"><ul>%s</ul></div></div>' % ''.join('<li><i>%s</i><span><b>%s</b><small>%s</small></span></li>' % (icon(a), esc(b), esc(c)) for a, b, c in TRUST)
    svc = ('<section class="svc" id="services"><div class="wrap"><p class="k">בוחרים לפי מה שצריך</p><h2>במה אפשר לעזור לכם היום?</h2>'
           '<p class="lead">לכל שירות מחיר קבוע ופירוט של מה כלול. בחרו את הנושא, ותראו את השירותים שמתאימים לו.</p>'
           '<div class="tabs" role="tablist">%s</div>%s<p class="alll">9 שירותים בסך הכול. לא מצאתם את מה שחיפשתם? <a href="/online/zoom-consultation/">קבעו ייעוץ קצר בזום ←</a></p></div></section>') % (tabs, panels)
    spot = ('<section><div class="wrap"><div class="spot"><div class="tx"><p class="k">לפני שמציעים מחיר על דירה</p><h2>בדיקת דירה לפני קנייה</h2>'
            '<p>לפני שנותנים מקדמה או חותמים, בודקים את המסמכים הרשמיים של הדירה. התשובה מגיעה במייל, נושא אחרי נושא, עם המלצה מה לשאול את המוכר.</p>'
            '<ul class="list"><li><b>טאבו</b>בעלות, משכנתאות, עיקולים והערות</li><li><b>בית משותף</b>מה באמת צמוד: חניה, מחסן, גג</li><li><b>תיק בניין</b>היתרים וחשד לחריגות</li><li><b>מס רכישה</b>הערכה לפי המצב שלכם</li></ul>'
            '<div class="btns"><a class="b1" href="/online/apartment-check/">להזמנת בדיקה, %s + מע״מ ←</a></div></div>'
            '<div class="vis" aria-hidden="true"><div class="doc"><div class="t">סיכום הבדיקה <span>דוגמה</span></div>'
            '<div class="r">נסח טאבו<i class="ok">תקין</i></div><div class="r">הצמדות בבית המשותף<i class="wa">לבדוק</i></div><div class="r">היתר בנייה אחרון<i class="ok">תקין</i></div>'
            '<div class="r">מידע תכנוני באזור<i class="ok">נבדק</i></div><div class="r">מס רכישה משוער<i class="ok">חושב</i></div><div class="r">שאלות למוכר<i class="wa">4 שאלות</i></div></div></div></div></div></section>') % ils(pre['base'])
    steps = [('בוחרים שירות', 'כל שירות עם מחיר קבוע ופירוט של מה כלול.', 'דקה'), ('ממלאים טופס', 'מהטלפון או מהמחשב, ומצרפים מסמכים.', 'כ־5 דקות'),
             ('רואים מחיר ומשלמים', 'המחיר המלא, כולל מע״מ, מוצג לפני התשלום.', 'תשלום מאובטח'), ('עורך הדין מטפל', 'עדכונים במייל ובטלפון, עד שהעניין מסתיים.', 'זמן ידוע מראש')]
    how = ('<section><div class="wrap"><p class="k">איך זה עובד</p><h2>ארבעה צעדים פשוטים</h2>'
           '<ol class="steps">%s</ol></div></section>') % ''.join('<li><span class="n">%d</span><b>%s</b><span>%s</span><em>%s</em></li>' % (i + 1, esc(a), esc(b), esc(c)) for i, (a, b, c) in enumerate(steps))
    who = ('<section class="who"><div class="wrap"><div class="wg"><div class="ph"><img src="%s" alt="עו״ד יקיר דבול" loading="lazy" decoding="async" width="841" height="1264"><div class="cap"><b>עו״ד יקיר דבול</b><span>עורך דין מקרקעין</span></div></div>'
           '<div><p class="k">מי מטפל בכם</p><h2>אונליין, אבל לא אוטומטי</h2>'
           '<p class="lead">כל הזמנה מגיעה ישירות לעו״ד יקיר דבול. הוא קורא את מה שכתבתם, עובר על המסמכים, ואם משהו לא ברור הוא מתקשר. מי שמזמין ייעוץ בזום, מדבר איתו.</p>'
           '<div class="facts"><div><b><bdi dir="ltr">+100</bdi></b><span>עסקאות מקרקעין בכל שנה</span></div><div><b>4</b><span>ועדות בלשכת עורכי הדין</span></div><div><b>1</b><span>עורך דין שמטפל מההתחלה עד הסוף</span></div></div>'
           '</div></div></div></section>') % PHOTO
    faq = ('<section><div class="wrap faq"><p class="k">שאלות נפוצות</p><h2>לפני שמזמינים</h2>%s</div></section>') % ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in P.HUB_FAQ)
    close = ('<section style="padding-top:0"><div class="wrap"><div class="close"><div><h2>לא בטוחים איזה שירות מתאים?</h2><p>קבעו ייעוץ קצר בזום, או התקשרו: 09-8613413</p></div>'
             '<div class="btns"><a class="b1" href="/online/zoom-consultation/">לקביעת ייעוץ בזום ←</a><a class="b2" href="#services">לכל השירותים</a></div></div>'
             '<p class="terms">%s</p></div></section>') % esc(' '.join(CFG['terms']))
    js = ('<script>(function(){var r=document.getElementById("dbl-online");if(!r)return;r.addEventListener("click",function(e){var b=e.target.closest(".tabs button");if(!b)return;'
          'r.querySelectorAll(".tabs button").forEach(function(x){x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",x===b?"true":"false")});'
          'r.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.getAttribute("data-p")===b.getAttribute("data-t"))});});'
          'var m=r.querySelector(".mbar"),h=r.querySelector(".hero"),s=r.querySelector("#services");if(m&&"IntersectionObserver" in window){var vis={h:1,s:0};var io=new IntersectionObserver(function(es){es.forEach(function(x){vis[x.target===h?"h":"s"]=x.isIntersecting});m.classList.toggle("on",!vis.h&&!vis.s)});io.observe(h);io.observe(s);}})();</script>')
    items = [{"@type": "ListItem", "position": i + 1, "url": P.BASE + SV[x]['slug'] + '/', "name": SV[x]['title']} for i, x in enumerate(P.ORDER)]
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url + "#page", "name": "שירותים משפטיים אונליין", "url": url, "inLanguage": "he-IL", "isPartOf": {"@id": P.SITE + "/#website"}, "mainEntity": {"@id": url + "#list"}},
        {"@type": "ItemList", "@id": url + "#list", "itemListElement": items},
        {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in P.HUB_FAQ]},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "דף הבית", "item": P.SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "שירותים משפטיים אונליין", "item": url}]}]}
    body = '<div class="dh" id="dbl-online">' + hero + trust + svc + spot + how + who + faq + close + '<a class="mbar" href="#services">לבחירת שירות ←</a></div>'
    return CSS + body + js + '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>'

if __name__ == '__main__':
    html = hub_page()
    for bad in ('—', '–', 'מומחה', 'חינם', 'הטוב ביותר', 'הכי '):
        assert bad not in html, bad
    open(os.path.join(P.OUT, 'online.html'), 'w', encoding='utf8').write(html)
    print('online', len(html))
