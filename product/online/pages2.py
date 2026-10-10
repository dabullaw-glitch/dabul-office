# The 9 online service pages, version 2 (10.10.2026): the same look as the new hub (hub2.py), approved by Yakir.
# Content comes from svcpages.py (answers, who, what to prepare, extra section, sources) and svc-config.json
# (included, not included, prices, FAQ). Writes pages/<slug>.html. Not published until Morning payment is connected.
import json, os, re
import svcpages as P
import hub2 as HB

SV, C, CFG, esc, ils, icon = P.SV, P.C, P.CFG, P.esc, P.ils, P.icon

EXTRA_CSS = r"""<style>
.dh .hero .ans{color:#d8d0bf;font-size:18.5px;max-width:60ch;margin:0 0 24px}
.dh .hero .ans strong{color:#fff;font-weight:700}
.dh .hero sup a,.dh sup a{color:var(--g3);text-decoration:none;font-size:12px;font-weight:800}
.dh section:not(.hero) sup a{color:var(--g2)}
.dh .sum{justify-self:center;width:100%;max-width:400px;background:#fff;color:var(--ink);border-radius:26px;padding:22px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);position:relative}
.dh .sum .h{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.dh .sum .h i{width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#fbf3dd,#efe1b8);color:var(--g2);display:grid;place-items:center}.dh .sum .h i svg{width:24px;height:24px}
.dh .sum .h b{display:block;font-size:18px;line-height:1.25}.dh .sum .h small{color:var(--mut);font-size:13.5px}
.dh .sum .p{display:flex;align-items:baseline;gap:8px;margin:4px 0 12px}.dh .sum .p b{font-size:34px;line-height:1;font-variant-numeric:tabular-nums}.dh .sum .p span{color:var(--mut);font-size:14px}
.dh .sum ul{list-style:none;margin:0 0 16px;padding:14px 0 0;border-top:1px solid var(--line);display:grid;gap:8px;font-size:14.5px}
.dh .sum ul li{position:relative;padding-inline-start:24px;line-height:1.45}.dh .sum ul li::before{content:"";position:absolute;right:2px;top:.4em;width:12px;height:7px;border:solid var(--g);border-width:0 0 2.5px 2.5px;transform:rotate(-45deg)}
.dh .sum .b1{width:100%;justify-content:center}
.dh .sum .badge{position:absolute;top:-16px;left:18px;background:var(--ink);color:var(--g3);border-radius:99px;padding:6px 12px;font-size:13px;font-weight:800;box-shadow:0 10px 24px -12px rgba(0,0,0,.6)}
.dh .order{background:var(--paper);scroll-margin-top:80px}
.dh .order .in{background:#fff;border:1px solid var(--line);border-radius:28px;padding:26px;margin-top:22px;box-shadow:0 30px 60px -40px rgba(28,27,25,.4)}
.dh .inc{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:16px;margin-top:24px}
.dh .box{border-radius:22px;padding:24px;border:1px solid var(--line);background:#fff}
.dh .box h3{margin:0 0 12px;font-size:19px;display:flex;align-items:center;gap:10px}
.dh .box h3 i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center}.dh .box h3 i svg{width:18px;height:18px}
.dh .box.yes{background:var(--ink);color:#f4efe4;border-color:var(--ink)}.dh .box.yes h3 i{background:#2a261f;color:var(--g3)}
.dh .box.no h3 i{background:var(--paper);color:var(--mut)}
.dh .box ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.dh .box li{position:relative;padding-inline-start:28px;line-height:1.55}
.dh .box.yes li::before{content:"";position:absolute;right:2px;top:.45em;width:13px;height:7px;border:solid var(--g3);border-width:0 0 2.5px 2.5px;transform:rotate(-45deg)}
.dh .box.no li{color:var(--mut)}.dh .box.no li::before{content:"";position:absolute;right:3px;top:.8em;width:12px;height:2px;background:#c9c1ae}
.dh .fit{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:24px}
.dh .fit div{background:#fff;border:1px solid var(--line);border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:10px}
.dh .fit i{width:42px;height:42px;border-radius:50%;background:var(--paper);color:var(--g2);display:grid;place-items:center;font-style:normal;font-weight:800}
.dh .fit p{margin:0;line-height:1.6}
.dh .sla{display:inline-flex;align-items:center;gap:8px;margin:26px 0 0;background:var(--paper);border:1px solid var(--line);border-radius:99px;padding:8px 16px;font-size:15px;font-weight:700}
.dh .two2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-top:24px;align-items:start}
.dh .prep li{padding:12px 46px 12px 14px;border:1px solid var(--line);border-radius:14px;background:#fff;position:relative;list-style:none;line-height:1.5}
.dh .prep{margin:0;padding:0;display:grid;gap:10px;counter-reset:pp}
.dh .prep li::before{counter-increment:pp;content:counter(pp);position:absolute;right:12px;top:50%;margin-top:-13px;width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--g3);font-size:13px;font-weight:800;display:grid;place-items:center}
.dh .prt{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;font-variant-numeric:tabular-nums}
.dh .prt th,.dh .prt td{padding:12px 16px;text-align:right;border-bottom:1px solid var(--line)}
.dh .prt tr:last-child td{border-bottom:0}
.dh .prt th{background:var(--ink);color:var(--g3);font-size:14px;font-weight:800}
.dh .prt td:nth-child(n+2){white-space:nowrap;font-weight:700}
.dh .prt tr:first-child td{background:#fbf6e8}
.dh .note{font-size:14.5px;color:var(--mut);margin:12px 0 0}
.dh .xbox{background:#fff;border:1px solid var(--line);border-inline-start:5px solid var(--g);border-radius:20px;padding:24px 26px;margin-top:20px}
.dh .xbox p{margin:0;line-height:1.8}
.dh .pg[style*="--rn:2"]{grid-template-columns:repeat(2,minmax(0,1fr))}@media (max-width:980px){.dh .pg[style*="--rn:2"]{grid-template-columns:minmax(0,1fr)}}
.dh .srcs{font-size:14.5px;color:var(--mut)}.dh .srcs ol{padding-inline-start:20px;margin:8px 0}.dh .srcs a{color:var(--g2)}
@media (max-width:980px){.dh .inc,.dh .two2{grid-template-columns:minmax(0,1fr)}.dh .fit{grid-template-columns:minmax(0,1fr)}.dh .sum{max-width:360px;margin-top:20px}}
@media (max-width:640px){.dh .order .in{padding:14px 10px;border-radius:20px}.dh .hero .ans{font-size:16.5px}.dh .prt th,.dh .prt td{padding:10px}.dh .box{padding:18px}.dh .sum{display:none}}
</style>"""

def page(sid):
    s, c = SV[sid], C[sid]
    url = P.BASE + s['slug'] + '/'
    fp = P.from_price(s)
    st = P.STEPS[s['sign']]
    rows = P.price_rows(s)
    srcs = [P.SRC[k] for k in c['src']]
    hero = ('<div class="hero"><div class="wrap"><p class="crumb"><a href="/">דף הבית</a> › <a href="/online/">שירותים משפטיים אונליין</a> › %s</p><div class="hg"><div>'
            '<p class="k">שירות משפטי אונליין · %s</p><h1>%s</h1><p class="ans">%s</p>'
            '<div class="btns"><a class="b1" href="#order">להזמנה עכשיו ←</a><a class="b2" href="tel:098613413">שאלה לפני? 09-8613413</a></div>'
            '<ul class="ticks"><li>%s</li><li>%s</li><li>מחיר סופי לפני התשלום</li></ul></div>'
            '<div class="sum"><span class="badge">%s</span><div class="h"><i>%s</i><div><b>%s</b><small>%s</small></div></div>'
            '<div class="p"><span>החל מ־</span><b>%s</b><span>+ מע״מ</span></div><ul>%s</ul><a class="b1" href="#order">להזמנה ←</a></div>'
            '</div></div></div>') % (esc(s['title']), esc(s['group']), esc(s['h1']), c['ans'], esc(HB.SIGN[s['sign']]), esc(HB.TIME[sid]),
                                     esc(HB.TIME[sid]), icon(s['icon'], '1.6'), esc(s['title']), esc(HB.SIGN[s['sign']]), ils(fp),
                                     ''.join('<li>%s</li>' % esc(x) for x in s['incl'][:4]))
    trust = '<div class="trust"><div class="wrap"><ul>%s</ul></div></div>' % ''.join('<li><i>%s</i><span><b>%s</b><small>%s</small></span></li>' % (icon(a), esc(b), esc(d)) for a, b, d in HB.TRUST)
    order = ('<section class="order" id="order"><div class="wrap"><p class="k">הזמנה אונליין</p><h2>ממלאים, רואים מחיר, משלמים</h2>'
             '<p class="lead">כמה דקות, מהטלפון או מהמחשב. המחיר מתעדכן לפי מה שבוחרים, והמחיר הסופי מוצג לפני התשלום.</p>'
             '<div class="in">%s</div></div></section>') % P.app_embed(sid)
    inc = ('<section><div class="wrap"><p class="k">מה מקבלים</p><h2>מה כלול במחיר, ומה לא</h2><div class="inc">'
           '<div class="box yes"><h3><i>%s</i>מה כלול</h3><ul>%s</ul></div>'
           '<div class="box no"><h3><i>%s</i>מה לא כלול</h3><ul>%s%s</ul></div></div></div></section>') % (
        icon('shield'), ''.join('<li>%s</li>' % esc(x) for x in s['incl']), icon('layers'),
        ''.join('<li>%s</li>' % esc(x) for x in s['excl']), ('<li>%s</li>' % esc(s['gov'])) if s['gov'] else '')
    fit = ('<section style="padding-top:0"><div class="wrap"><p class="k">למי זה מתאים</p><h2>למי השירות מתאים</h2><div class="fit">%s</div></div></section>') % ''.join(
        '<div><i>%d</i><p>%s</p></div>' % (i + 1, esc(x)) for i, x in enumerate(c['who']))
    how = ('<section style="background:var(--paper)"><div class="wrap"><p class="k">איך זה עובד</p><h2>ארבעה צעדים, ואנחנו מטפלים</h2><ol class="steps">%s</ol>'
           '<div style="text-align:center"><span class="sla">⏱ %s</span></div></div></section>') % (
        ''.join('<li><span class="n">%d</span><b>%s</b><span>%s</span></li>' % (i + 1, esc(a), esc(b)) for i, (a, b) in enumerate(st)), esc(s['sla']))
    prep_price = ('<section><div class="wrap"><div class="two2"><div><p class="k">מה צריך להכין</p><h2>כדאי שיהיה לידכם</h2><ol class="prep">%s</ol>'
                  '<p class="note">אם חסר משהו, אפשר להשלים אחר כך. נגיד לכם בדיוק מה עוד צריך.</p></div>'
                  '<div><p class="k">מחירים</p><h2>מחיר קבוע, בלי הפתעות</h2><div style="overflow-x:auto"><table class="prt"><thead><tr><th>מה</th><th>לפני מע״מ</th><th>כולל מע״מ</th></tr></thead><tbody>%s</tbody></table></div>'
                  '<p class="note">%s המחיר הסופי מחושב בטופס לפי מה שבוחרים.</p></div></div></div></section>') % (
        ''.join('<li>%s</li>' % esc(x) for x in c['prep']),
        ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % (esc(a), ils(p), P.vat(p)) for a, p in rows),
        esc(s['gov'] or 'אגרות ותשלומים למדינה, אם יש, לא כלולים.'))
    ex_h, ex_b = c['extra']
    extra = '<section style="padding-top:0"><div class="wrap"><p class="k">חשוב לדעת</p><h2>%s</h2><div class="xbox">%s</div></div></section>' % (esc(ex_h), ex_b)
    who = ('<section class="who"><div class="wrap"><div class="wg"><div class="ph"><img src="%s" alt="עו״ד יקיר דבול" loading="lazy" decoding="async" width="841" height="1264"><div class="cap"><b>עו״ד יקיר דבול</b><span>עורך דין מקרקעין</span></div></div>'
           '<div><p class="k">מי מטפל בכם</p><h2>אונליין, אבל לא אוטומטי</h2>'
           '<p class="lead">ההזמנה מגיעה ישירות לעו״ד יקיר דבול. הוא קורא את מה שכתבתם, עובר על המסמכים, ואם משהו לא ברור הוא מתקשר אליכם.</p>'
           '<div class="facts"><div><b><bdi dir="ltr">+100</bdi></b><span>עסקאות מקרקעין בכל שנה</span></div><div><b>4</b><span>ועדות בלשכת עורכי הדין</span></div><div><b>1</b><span>עורך דין שמטפל מההתחלה עד הסוף</span></div></div>'
           '</div></div></div></section>') % HB.PHOTO
    faq = '<section><div class="wrap faq"><p class="k">שאלות נפוצות</p><h2>שאלות על %s</h2>%s</div></section>' % (esc(s['title']), ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in s['faq']))
    rel = '<section style="background:var(--paper)"><div class="wrap"><p class="k">עוד שירותים</p><h2>אולי יתאים לכם גם</h2><div class="pg" style="margin-top:22px;--rn:%d">%s</div><p class="alll"><a href="/online/">לכל השירותים המשפטיים אונליין ←</a></p></div></section>' % (len(c['rel']), ''.join(HB.svc_card(x) for x in c['rel']))
    close = ('<section><div class="wrap"><div class="close"><div><h2>מוכנים להתחיל?</h2><p>ממלאים את הטופס בכמה דקות, ורואים את המחיר הסופי לפני התשלום.</p></div>'
             '<div class="btns"><a class="b1" href="#order">להזמנה ←</a><a class="b2" href="/online/zoom-consultation/">קודם ייעוץ קצר בזום</a></div></div>'
             '<div class="srcs"><h2 style="font-size:20px;margin:30px 0 4px">מקורות</h2><ol>%s</ol><p>המידע בעמוד הוא כללי ואינו ייעוץ משפטי למקרה מסוים. %s</p></div></div></section>') % (
        ''.join('<li id="src-%d"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a>, <em>%s</em></li>' % (i + 1, u, esc(t), esc(w)) for i, (u, t, w) in enumerate(srcs)), esc(' '.join(CFG['terms'])))
    js = ('<script>(function(){var r=document.getElementById("dbl-svc");if(!r||!("IntersectionObserver" in window))return;var m=r.querySelector(".mbar"),h=r.querySelector(".hero"),o=r.querySelector("#order"),v={h:1,o:0};'
          'var io=new IntersectionObserver(function(es){es.forEach(function(x){v[x.target===h?"h":"o"]=x.isIntersecting});m.classList.toggle("on",!v.h&&!v.o)});io.observe(h);io.observe(o);})();</script>')
    offer = {"@type": "Offer", "price": str(round(fp * (1 + P.VAT))), "priceCurrency": "ILS", "url": url, "availability": "https://schema.org/InStock"}
    if s['sign'] == 'meet' or len(rows) > 1:
        offer = {"@type": "AggregateOffer", "lowPrice": str(round(fp * (1 + P.VAT))), "priceCurrency": "ILS", "url": url}
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "@id": url + "#service", "name": s['title'], "serviceType": s['title'], "url": url, "description": re.sub(r'<[^>]+>', '', c['ans']).strip(),
         "provider": {"@id": P.SITE + "/#organization"}, "areaServed": {"@type": "Country", "name": "Israel"}, "availableChannel": {"@type": "ServiceChannel", "serviceUrl": url}, "offers": offer},
        {"@type": "HowTo", "@id": url + "#howto", "name": "איך מזמינים: " + s['title'], "step": [{"@type": "HowToStep", "position": i + 1, "name": a, "text": b} for i, (a, b) in enumerate(st)]},
        {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in s['faq']]},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": P.SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "שירותים משפטיים אונליין", "item": P.BASE},
            {"@type": "ListItem", "position": 3, "name": s['title'], "item": url}]}]}
    body = '<div class="dh" id="dbl-svc">' + hero + trust + order + inc + fit + how + prep_price + extra + who + faq + rel + close + '<a class="mbar" href="#order">להזמנה ←</a></div>'
    return HB.CSS + EXTRA_CSS + body + js + '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>'

if __name__ == '__main__':
    for sid in P.ORDER:
        html = page(sid)
        for bad in ('—', '–', 'מומחה', 'חינם', 'הטוב ביותר', 'הכי '):
            assert bad not in html, (sid, bad)
        open(os.path.join(P.OUT, SV[sid]['slug'] + '.html'), 'w', encoding='utf8').write(html)
        print(SV[sid]['slug'], len(html))
