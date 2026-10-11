# The online legal services pages, version 3 (11.10.2026). Yakir: version 2 was confusing (dark colors, too many
# badges, a fake order card in the hero). This version is light and plain: white and warm-white backgrounds, black
# text, one accent color (gold) for prices, numbers and icons, black buttons. Every page answers at the top: what
# you get, how much it costs, how long it takes, then one button to order. The photo is shown whole (no crop, no
# text on it), the name under it. Content comes from svc-config.json and svcpages.py, as before.
# Writes pages/<slug>.html (WordPress fragments) and pv/<slug>.html (stand-alone previews).
import json, os, re, html as H
import svcpages as P
import hub2 as HB

SV, C, CFG, esc, ils, icon = P.SV, P.C, P.CFG, P.esc, P.ils, P.icon
PHOTO = HB.PHOTO
FIXED = {'precheck', 'tashlumim', 'ichud', 'poa'}  # one price, no options that change it

def is_from(sid):
    return sid not in FIXED or len(P.price_rows(SV[sid])) > 1

SVG = {
 'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'laptop': '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
 'pen': '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
 'back': '<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
 'phone': '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
 'x': '<path d="M7 7l10 10M17 7L7 17"/>',
 'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
}
def ic(name, sw='2'):
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (sw, SVG[name])

SIGN_ICON = {'none': 'laptop', 'digital': 'pen', 'meet': 'pen'}
SIGN_TXT = {'none': 'הכול אונליין, בלי להגיע', 'digital': 'חתימה מהטלפון, בלי להגיע', 'meet': 'פגישה קצרה אחת לחתימה'}

CSS = r"""<style>
.ds{--ink:#16191d;--ink2:#30363d;--mut:#5d6570;--line:#e3e5e9;--soft:#f6f7f8;--warm:#faf7f0;--gold:#b0822a;--gold2:#8a6620;--goldbg:#f5ecd8;--ok:#2d7a4b;
 direction:rtl;color:var(--ink);font-size:17px;line-height:1.7;background:#fff}
.ds *{box-sizing:border-box}
.ds a{color:inherit}
.ds .w{max-width:1120px;margin:0 auto;padding:0 20px}
.ds section{padding:64px 0}
.ds h1{font-size:clamp(30px,4.2vw,46px);line-height:1.15;margin:0 0 14px;font-weight:800;letter-spacing:-.01em;text-wrap:balance}
.ds h2{font-size:clamp(25px,3vw,34px);line-height:1.2;margin:0 0 10px;font-weight:800;text-wrap:balance}
.ds h3{font-size:19px;line-height:1.3;margin:0 0 6px;font-weight:800}
.ds p{margin:0 0 12px}
.ds .lbl{display:inline-block;color:var(--gold2);font-size:14.5px;font-weight:800;letter-spacing:.02em;margin:0 0 10px}
.ds .lead{color:var(--mut);font-size:18.5px;max-width:60ch}
.ds .crumb{font-size:14px;color:var(--mut);margin:0 0 26px}.ds .crumb a{text-decoration:none;color:var(--mut)}.ds .crumb a:hover{color:var(--ink)}
.ds .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:15px 26px;font-weight:800;font-size:17px;text-decoration:none!important;line-height:1.2;transition:transform .15s,box-shadow .15s}
.ds .btn svg{width:18px;height:18px}
.ds .btn.p{background:var(--ink);color:#fff!important;box-shadow:0 10px 24px -14px rgba(22,25,29,.8)}
.ds .btn.p:hover{transform:translateY(-1px)}
.ds .btn.s{background:#fff;color:var(--ink)!important;border:1.5px solid var(--line)}
.ds .btn.s:hover{border-color:var(--ink2)}
.ds .btns{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 0}
.ds .ticks{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:8px}
.ds .ticks li{display:flex;gap:10px;align-items:flex-start;font-size:16.5px}
.ds .ticks li svg{width:20px;height:20px;flex:none;color:var(--ok);margin-top:3px}
/* hero */
.ds .hero{background:var(--warm);padding:30px 0 60px;border-bottom:1px solid var(--line)}
.ds .hg{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:48px;align-items:start}
/* price card */
.ds .pc{background:#fff;border:1px solid var(--line);border-radius:20px;padding:24px;box-shadow:0 24px 50px -34px rgba(22,25,29,.35)}
.ds .pc .t{font-weight:800;font-size:17px;margin:0 0 10px}
.ds .pc .pr{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ds .pc .pr small{color:var(--mut);font-size:15px}
.ds .pc .pr b{font-size:44px;line-height:1;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums}
.ds .pc .vat{color:var(--mut);font-size:15px;margin:6px 0 16px}
.ds .pc ul{list-style:none;margin:0 0 18px;padding:16px 0 0;border-top:1px solid var(--line);display:grid;gap:12px}
.ds .pc li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;line-height:1.45}
.ds .pc li svg{width:20px;height:20px;flex:none;color:var(--gold);margin-top:1px}
.ds .pc li b{display:block;font-size:15.5px}
.ds .pc li span{color:var(--mut);font-size:14.5px}
.ds .pc .btn{width:100%}
.ds .pc .call{display:block;text-align:center;margin-top:12px;color:var(--mut);font-size:15px;text-decoration:none}
.ds .pc .call b{color:var(--ink)}
.ds .pc .sec{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--mut);font-size:13.5px;margin-top:10px}
.ds .pc .sec svg{width:14px;height:14px}
/* steps */
.ds .steps{list-style:none;margin:26px 0 0;padding:0;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:14px;counter-reset:s}
.ds .steps li{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;counter-increment:s}
.ds .steps li::before{content:counter(s);display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--goldbg);color:var(--gold2);font-weight:800;margin:0 0 12px}
.ds .steps b{display:block;font-size:17px;margin:0 0 4px}
.ds .steps span{color:var(--mut);font-size:15.5px;line-height:1.55;display:block}
.ds .sla{margin:18px 0 0;color:var(--ink2);font-weight:700;display:flex;gap:8px;align-items:center}
.ds .sla svg{width:20px;height:20px;color:var(--gold)}
/* included */
.ds .two{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:18px;margin-top:24px}
.ds .box{border:1px solid var(--line);border-radius:18px;padding:24px;background:#fff}
.ds .box ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
.ds .box li{display:flex;gap:10px;align-items:flex-start;font-size:16px;line-height:1.5}
.ds .box li svg{width:20px;height:20px;flex:none;margin-top:2px}
.ds .box.yes li svg{color:var(--ok)}
.ds .box.no{background:var(--soft)}
.ds .box.no li{color:var(--mut)}.ds .box.no li svg{color:#9aa1aa}
.ds .fit{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:22px}
.ds .fit div{border:1px solid var(--line);border-radius:16px;padding:18px 20px;font-size:16px;line-height:1.55;background:#fff}
/* order */
.ds .order{background:var(--warm);border-top:1px solid var(--line);border-bottom:1px solid var(--line);scroll-margin-top:70px}
.ds .order .oh{max-width:760px;margin:0 auto 18px;text-align:center}
.ds .order .oh .lead{margin:0 auto}
.ds .prep{max-width:760px;margin:0 auto 16px;background:#fff;border:1px dashed #d8cdb4;border-radius:14px;padding:14px 18px;font-size:15.5px}
.ds .prep b{display:block;margin:0 0 4px}
.ds .prep ul{margin:0;padding-inline-start:20px;color:var(--ink2)}
.ds .order .form{max-width:760px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 24px 50px -36px rgba(22,25,29,.35)}
.ds .order .pay{max-width:760px;margin:14px auto 0;display:flex;justify-content:center;gap:16px;flex-wrap:wrap;color:var(--mut);font-size:14px}
.ds .order .pay span{display:inline-flex;gap:6px;align-items:center}.ds .order .pay svg{width:16px;height:16px;color:var(--ok)}
/* who */
.ds .who .wg{display:grid;grid-template-columns:300px minmax(0,1fr);gap:44px;align-items:center}
.ds .ph{margin:0;border-radius:20px;overflow:hidden;background:#141414;box-shadow:0 26px 50px -32px rgba(22,25,29,.6);max-width:300px}
.ds .ph img{display:block;width:100%;height:auto;aspect-ratio:841/1264;object-fit:cover}
.ds .ph figcaption{padding:12px 16px 14px;color:#fff;border-top:2px solid var(--gold)}
.ds .ph figcaption b{display:block;font-size:17px}.ds .ph figcaption span{color:#cfc7b6;font-size:14px}
.ds .facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}
.ds .facts div{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fff}
.ds .facts b{display:block;font-size:26px;color:var(--gold2);line-height:1.1}
.ds .facts span{color:var(--mut);font-size:14.5px;line-height:1.4;display:block;margin-top:4px}
/* faq */
.ds .faq{max-width:820px}
.ds details{border-bottom:1px solid var(--line);padding:4px 0}
.ds summary{cursor:pointer;list-style:none;padding:14px 0;font-weight:800;font-size:17.5px;display:flex;justify-content:space-between;gap:12px}
.ds summary::-webkit-details-marker{display:none}
.ds summary::after{content:"+";color:var(--gold);font-size:24px;line-height:1}
.ds details[open] summary::after{content:"−"}
.ds details p{color:var(--ink2);margin:0 0 14px}
/* service cards (hub and related) */
.ds .grp{margin-top:34px}
.ds .grp h3{font-size:16px;color:var(--mut);font-weight:800;margin:0 0 12px;letter-spacing:.02em}
.ds .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.ds .sc{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;text-decoration:none!important;transition:border-color .15s,box-shadow .15s,transform .15s}
.ds .sc:hover{border-color:#cbb68a;box-shadow:0 20px 40px -30px rgba(22,25,29,.45);transform:translateY(-2px)}
.ds .sc .ti{display:flex;gap:12px;align-items:center}
.ds .sc .ti i{width:44px;height:44px;border-radius:12px;background:var(--goldbg);color:var(--gold2);display:grid;place-items:center;flex:none}
.ds .sc .ti i svg{width:22px;height:22px}
.ds .sc .ti b{font-size:19px;line-height:1.25}
.ds .sc p{color:var(--mut);font-size:15.5px;line-height:1.55;margin:0;flex:1}
.ds .sc .mt{display:flex;flex-wrap:wrap;gap:6px 14px;color:var(--ink2);font-size:14px}
.ds .sc .mt span{display:inline-flex;gap:5px;align-items:center}.ds .sc .mt svg{width:15px;height:15px;color:var(--gold)}
.ds .sc .ft{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding-top:14px;margin-top:4px}
.ds .sc .tg{align-self:flex-start;font-size:12.5px;font-weight:800;color:var(--gold2);background:var(--goldbg);border-radius:99px;padding:2px 10px;margin-bottom:-2px}
.ds .sc .ft .pz{white-space:nowrap}
.ds .sc .ft .pz small{display:block;color:var(--mut);font-size:13px;line-height:1.2}
.ds .sc .ft .pz b{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}
.ds .sc .ft .pz em{font-style:normal;color:var(--mut);font-size:13.5px;margin-inline-start:4px}
.ds .sc .ft .go{background:var(--ink);color:#fff;border-radius:10px;padding:10px 14px;font-weight:800;font-size:15px;white-space:nowrap}
.ds .help{margin-top:28px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;background:var(--soft);border-radius:16px;padding:18px 22px}
.ds .help p{margin:0}
.ds .trust{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.ds .trust div{display:flex;gap:12px;align-items:flex-start}
.ds .trust i{width:40px;height:40px;border-radius:12px;background:var(--goldbg);color:var(--gold2);display:grid;place-items:center;flex:none}.ds .trust i svg{width:20px;height:20px}
.ds .trust b{display:block;font-size:16px}.ds .trust span{color:var(--mut);font-size:14.5px;line-height:1.4}
.ds .xbox{border-inline-start:4px solid var(--gold);background:var(--warm);border-radius:12px;padding:16px 20px;max-width:820px}
.ds .xbox p{margin:0}
.ds sup a{color:var(--gold2);text-decoration:none;font-weight:800;font-size:12px}
.ds .srcs{font-size:14px;color:var(--mut);border-top:1px solid var(--line);padding-top:20px}
.ds .srcs ol{padding-inline-start:20px;margin:6px 0 12px}
.ds .mbar{display:none}
@media (max-width:960px){
 .ds .hg,.ds .who .wg{grid-template-columns:minmax(0,1fr)}
 .ds .hg{gap:28px}.ds .pc{max-width:460px}
 .ds .cards{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ds .steps{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ds .trust{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ds .ph{max-width:300px;margin:0 auto}
}
@media (max-width:640px){
 .ds{font-size:16.5px}.ds section{padding:46px 0}.ds .w{padding:0 16px}
 .ds .hero{padding:20px 0 40px}
 .ds .btns .btn{flex:1 1 100%}
 .ds .cards,.ds .two,.ds .fit,.ds .steps,.ds .facts{grid-template-columns:minmax(0,1fr)}
 .ds .trust{grid-template-columns:minmax(0,1fr)}
 .ds .order .form{padding:14px;border-radius:16px}
 .ds .steps li{display:grid;grid-template-columns:34px minmax(0,1fr);gap:0 12px;padding:14px 16px}.ds .steps li::before{grid-row:span 2;margin:0}
 .ds .fit div{padding:14px 16px}
 .ds .mbar{display:flex;position:fixed;inset:auto 10px calc(10px + env(safe-area-inset-bottom,0px)) 10px;z-index:60;align-items:center;justify-content:space-between;gap:10px;background:var(--ink);color:#fff;border-radius:14px;padding:10px 10px 10px 16px;box-shadow:0 16px 36px -14px rgba(0,0,0,.6);transform:translateY(140%);transition:transform .25s;text-decoration:none!important}
 .ds .mbar.on{transform:none}
 .ds .mbar span{font-size:14px;color:#d9d3c6}.ds .mbar span b{color:#fff;font-size:17px}
 .ds .mbar em{font-style:normal;background:#fff;color:var(--ink);border-radius:10px;padding:10px 14px;font-weight:800;font-size:15px}
}
</style>"""

def price_html(sid, big=True):
    s = SV[sid]; fp = P.from_price(s)
    pre = '<small>החל מ־</small>' if is_from(sid) else ''
    return pre, ils(fp), P.vat(fp)

def card(sid, tag=False):
    s = SV[sid]
    pre, p, _ = price_html(sid)
    return ('<a class="sc" href="/online/%s/">%s<div class="ti"><i>%s</i><b>%s</b></div><p>%s</p>'
            '<div class="mt"><span>%s%s</span><span>%s%s</span></div>'
            '<div class="ft"><div class="pz">%s<b>%s</b><em>+ מע״מ</em></div><span class="go">לפרטים ולהזמנה ←</span></div></a>') % (
        s['slug'], ('<span class="tg">%s</span>' % esc(s['group'])) if tag else '', icon(s['icon'], '1.7'), esc(s['title']), esc(s['card']),
        ic('clock'), esc(HB.TIME[sid]), ic(SIGN_ICON[s['sign']]), esc(SIGN_TXT[s['sign']]), pre or '<small>מחיר</small>', p)

def photo(src):
    return ('<figure class="ph"><img src="%s" alt="עו״ד יקיר דבול" loading="lazy" decoding="async" width="841" height="1264">'
            '<figcaption><b>עו״ד יקיר דבול</b><span>עורך דין מקרקעין, נתניה</span></figcaption></figure>') % src

TRUST = [('shield', 'עורך הדין עצמו מטפל', 'עו״ד יקיר דבול, לא מוקד'), ('search', 'מחיר ידוע מראש', 'המחיר הסופי מוצג לפני התשלום'),
         ('layers', 'החזר מלא', 'אם מבטלים לפני שהטיפול התחיל'), ('calendar', 'זמן טיפול ידוע', 'כתוב בכל שירות')]

def old_ld(slug):
    h = open(os.path.join(P.OUT, slug + '.html'), encoding='utf8').read()
    m = re.search(r'<script type="application/ld\+json">.*?</script>', h, re.S)
    return m.group(0) if m else ''

def srcs_html(sid):
    srcs = [P.SRC[k] for k in C[sid]['src']]
    return ('<div class="srcs"><b>מקורות</b><ol>%s</ol><p>המידע בעמוד הוא כללי ואינו ייעוץ משפטי למקרה מסוים. %s</p></div>') % (
        ''.join('<li id="src-%d"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a>, <em>%s</em></li>' % (i + 1, u, esc(t), esc(w)) for i, (u, t, w) in enumerate(srcs)),
        esc(' '.join(CFG['terms'])))

def service(sid, ld, photo_src):
    s, c = SV[sid], C[sid]
    pre, p, pv = price_html(sid)
    vat_line = ('%s כולל מע״מ' % pv) if not is_from(sid) else 'המחיר המדויק מחושב בטופס לפי מה שבוחרים, לפני התשלום'
    sig = s['sign']
    hero = ('<div class="hero"><div class="w"><p class="crumb"><a href="/">דף הבית</a> › <a href="/online/">שירותים משפטיים אונליין</a> › %s</p>'
            '<div class="hg"><div><span class="lbl">שירות משפטי אונליין · %s</span><h1>%s</h1><p class="lead">%s</p>'
            '<ul class="ticks">%s</ul>'
            '<div class="btns"><a class="btn p" href="#order">להזמנה עכשיו ←</a><a class="btn s" href="tel:098613413">%sשאלה לפני? 09-8613413</a></div></div>'
            '<aside class="pc" aria-label="מחיר וזמנים"><p class="t">%s</p><div class="pr">%s<b>%s</b><small>+ מע״מ</small></div><p class="vat">%s</p>'
            '<ul><li>%s<div><b>%s</b><span>%s</span></div></li><li>%s<div><b>%s</b><span>%s</span></div></li><li>%s<div><b>החזר מלא</b><span>אם מבטלים לפני שהטיפול התחיל</span></div></li></ul>'
            '<a class="btn p" href="#order">להזמנה עכשיו ←</a><span class="sec">%sתשלום מאובטח באשראי או בביט</span></aside></div></div></div>') % (
        esc(s['title']), esc(s['group']), esc(s['title']), esc(s['card']),
        ''.join('<li>%s<span>%s</span></li>' % (ic('check', '2.4'), esc(x)) for x in s['incl'][:3]),
        ic('phone'), esc(s['title']), pre, p, esc(vat_line),
        ic('clock'), 'כמה זמן', esc(s['sla']), ic(SIGN_ICON[sig]), 'איך', esc(SIGN_TXT[sig]), ic('back'), ic('lock'))
    st = P.STEPS[sig]
    how = ('<section><div class="w"><span class="lbl">איך זה עובד</span><h2>ארבעה צעדים פשוטים</h2><ol class="steps" style="--n:4">%s</ol>'
           '<p class="sla">%s%s</p></div></section>') % (''.join('<li><b>%s</b><span>%s</span></li>' % (esc(a), esc(b)) for a, b in st), ic('clock'), esc(s['sla']))
    inc = ('<section style="padding-top:0"><div class="w"><span class="lbl">מה מקבלים</span><h2>מה כלול במחיר</h2><div class="two">'
           '<div class="box yes"><h3>כלול</h3><ul>%s</ul></div><div class="box no"><h3>לא כלול</h3><ul>%s%s</ul></div></div></div></section>') % (
        ''.join('<li>%s<span>%s</span></li>' % (ic('check', '2.4'), esc(x)) for x in s['incl']),
        ''.join('<li>%s<span>%s</span></li>' % (ic('x'), esc(x)) for x in s['excl']), ('<li>%s<span>%s</span></li>' % (ic('x'), esc(s['gov']))) if s['gov'] else '')
    fit = ('<section style="padding-top:0"><div class="w"><span class="lbl">למי זה מתאים</span><h2>השירות מתאים לכם אם</h2><div class="fit">%s</div></div></section>') % ''.join('<div>%s</div>' % esc(x) for x in c['who'])
    order = ('<section class="order" id="order"><div class="w"><div class="oh"><span class="lbl">ההזמנה</span><h2>מזמינים בכמה דקות</h2>'
             '<p class="lead">ממלאים את הטופס שלב אחרי שלב. בסוף רואים את המחיר הסופי, ורק אז משלמים.</p></div>'
             '<div class="prep"><b>כדאי שיהיה לידכם:</b><ul>%s</ul></div>'
             '<div class="form">%s</div><div class="pay"><span>%sתשלום מאובטח</span><span>%sקבלה נשלחת למייל</span><span>%sביטול לפני תחילת הטיפול: החזר מלא</span></div></div></section>') % (
        ''.join('<li>%s</li>' % esc(x) for x in c['prep']), P.app_embed(sid), ic('lock'), ic('check'), ic('check'))
    ex_h, ex_b = c['extra']
    extra = '<section><div class="w"><span class="lbl">חשוב לדעת</span><h2>%s</h2><div class="xbox">%s</div></div></section>' % (esc(ex_h), ex_b)
    who = ('<section class="who" style="background:var(--soft)"><div class="w"><div class="wg">%s<div><span class="lbl">מי מטפל בכם</span><h2>עורך הדין עצמו, לא מערכת אוטומטית</h2>'
           '<p class="lead">ההזמנה מגיעה ישירות לעו״ד יקיר דבול. הוא קורא את מה שכתבתם ועובר על המסמכים, ואם משהו לא ברור, הוא מתקשר אליכם.</p>'
           '<div class="facts"><div><b><bdi dir="ltr">+100</bdi></b><span>עסקאות מקרקעין בכל שנה</span></div><div><b>4</b><span>ועדות בלשכת עורכי הדין</span></div><div><b>1</b><span>עורך דין שמלווה אתכם עד הסוף</span></div></div>'
           '</div></div></div></section>') % photo(photo_src)
    faq = '<section><div class="w faq"><span class="lbl">שאלות נפוצות</span><h2>שאלות על %s</h2>%s</div></section>' % (
        esc(s['title']), ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in s['faq']))
    rel = ('<section style="background:var(--soft)"><div class="w"><span class="lbl">עוד שירותים</span><h2>אולי יתאים לכם גם</h2><div class="cards" style="margin-top:20px">%s</div>'
           '<p style="margin-top:18px"><a href="/online/" style="font-weight:800;color:var(--gold2)">לכל השירותים ←</a></p></div></section>') % ''.join(card(x) for x in c['rel'])
    end = ('<section style="padding-top:30px"><div class="w">%s</div></section>') % srcs_html(sid)
    mbar = '<a class="mbar" href="#order"><span>%s %s<b>%s</b> + מע״מ</span><em>להזמנה ←</em></a>' % (esc(s['title']), 'מ־' if is_from(sid) else '', p)
    js = ('<script>(function(){var r=document.getElementById("dbl-svc");if(!r||!("IntersectionObserver" in window))return;var m=r.querySelector(".mbar"),h=r.querySelector(".hero"),o=r.querySelector("#order"),v={h:1,o:0};'
          'var io=new IntersectionObserver(function(es){es.forEach(function(x){v[x.target===h?"h":"o"]=x.isIntersecting});m.classList.toggle("on",!v.h&&!v.o)});io.observe(h);io.observe(o);})();</script>')
    return CSS + '<div class="ds" id="dbl-svc">' + hero + how + inc + fit + order + extra + who + faq + rel + end + mbar + '</div>' + js + ld

HUB_STEPS = [('בוחרים שירות', 'לכל שירות יש מחיר קבוע ופירוט מלא של מה כלול.'), ('ממלאים טופס ומשלמים', 'כמה דקות מהטלפון או מהמחשב. המחיר הסופי מוצג לפני התשלום.'),
             ('עורך הדין מטפל', 'עו״ד יקיר דבול עובר על הפרטים, ומעדכן אתכם במייל עד הסוף.')]

def hub(ld, photo_src):
    hero = ('<div class="hero"><div class="w"><p class="crumb"><a href="/">דף הבית</a> › שירותים משפטיים אונליין</p><div class="hg"><div>'
            '<span class="lbl">שירותים משפטיים אונליין</span><h1>שירות משפטי במחיר קבוע, בלי לצאת מהבית</h1>'
            '<p class="lead">בוחרים שירות, ממלאים טופס קצר ומשלמים באתר. עו״ד יקיר דבול מטפל בעצמו, ואתם יודעים מראש כמה זה עולה ומתי תקבלו תשובה.</p>'
            '<ul class="ticks"><li>%s<span>9 שירותים, לכל אחד מחיר קבוע</span></li><li>%s<span>תשלום מאובטח באתר, קבלה למייל</span></li><li>%s<span>החזר מלא אם מבטלים לפני שהטיפול התחיל</span></li></ul>'
            '<div class="btns"><a class="btn p" href="#services">לבחירת שירות ←</a><a class="btn s" href="tel:098613413">%sשאלה לפני? 09-8613413</a></div></div>'
            '%s</div></div></div>') % (ic('check', '2.4'), ic('check', '2.4'), ic('check', '2.4'), ic('phone'), photo(photo_src))
    how = ('<section><div class="w"><span class="lbl">איך זה עובד</span><h2>שלושה צעדים</h2><ol class="steps" style="--n:3">%s</ol></div></section>') % ''.join(
        '<li><b>%s</b><span>%s</span></li>' % (esc(a), esc(b)) for a, b in HUB_STEPS)
    groups = '<div class="cards" style="margin-top:26px">%s</div>' % ''.join(card(x, True) for g, ids in P.GROUPS for x in ids)
    svcs = ('<section id="services" style="background:var(--soft);scroll-margin-top:60px"><div class="w"><span class="lbl">בוחרים שירות</span><h2>במה אפשר לעזור לכם?</h2>'
            '<p class="lead">לחיצה על שירות פותחת את כל הפרטים: מה כלול, כמה זמן זה לוקח, והטופס להזמנה.</p>%s'
            '<div class="help"><p><b>לא בטוחים מה מתאים לכם?</b> התקשרו 09-8613413, או קבעו ייעוץ קצר בזום.</p><a class="btn s" href="/online/zoom-consultation/">לייעוץ בזום ←</a></div></div></section>') % groups
    trust = '<section><div class="w"><div class="trust">%s</div></div></section>' % ''.join('<div><i>%s</i><p><b>%s</b><span>%s</span></p></div>' % (icon(a), esc(b), esc(d)) for a, b, d in TRUST)
    faq = '<section style="padding-top:0"><div class="w faq"><span class="lbl">שאלות נפוצות</span><h2>שאלות על השירותים אונליין</h2>%s</div></section>' % ''.join(
        '<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in P.HUB_FAQ)
    return CSS + '<div class="ds">' + hero + how + svcs + trust + faq + '</div>' + ld

if __name__ == '__main__':
    import sys
    PV = os.path.join(P.HERE, 'pv'); os.makedirs(PV, exist_ok=True)
    head = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>preview</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap"><style>body{margin:0;background:#fff;font-family:Heebo,Arial,sans-serif}</style></head><body>'
    out = [('online', hub(old_ld('online'), PHOTO))] + [(SV[sid]['slug'], service(sid, old_ld(SV[sid]['slug']), PHOTO)) for sid in P.ORDER]
    for slug, html in out:
        for bad in ('—', '–', 'מומחה', 'חינם', 'הטוב ביותר', 'הכי '):
            assert bad not in html, (slug, bad)
        open(os.path.join(P.OUT, slug + '.html'), 'w', encoding='utf8').write(html)
        pv = html.replace(PHOTO, 'yakir-about.webp')
        pv = re.sub(r'href="/online/([a-z-]+)/', r'href="\1.html', pv).replace('href="/online/"', 'href="online.html"')
        open(os.path.join(PV, slug + '.html'), 'w', encoding='utf8').write(head + pv + '</body></html>')
        print(slug, len(html))
