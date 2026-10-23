#!/usr/bin/env python3
"""Builds the HTML of the site page "מגזין הנדל״ן" (dabullaw.co.il/magazine/) from issues.json.
Approved by Yakir 23.10.2026: site colors (#141414, #E7CD96, #C5A25A, #A88A4C, #F8F8FD), site font (inherit),
a faint residential-buildings background in the hero, latest issue card, "בגיליון הזה" text,
author box, archive of all issues, contact CTA, disclaimer, and structured data for search engines.
Usage: python3 build_page.py issues.json > page.html            the hub page (newest issue first in the JSON list)
       python3 build_page.py issues.json --issue N > issue-N.html  the page of one issue (23.10.2026: every issue has its own page)
No links to outside sites on the pages (Yakir, 23.10.2026); internal links inside the text are written [text](url).
"""
import json, sys, html

e = html.escape
CONTACT = 'https://dabullaw.co.il/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/'
PAGE = 'https://dabullaw.co.il/magazine/'

CSS = """
.dmag{--ink:#141414;--g1:#E7CD96;--g2:#C5A25A;--g3:#A88A4C;--bg:#F8F8FD;--mut:#54595F;--line:#E7E7F1;
 color:var(--ink);font-family:inherit;font-size:17px;line-height:1.7;max-width:1192px;margin:0 auto;padding:24px 16px 64px}
.dmag *{box-sizing:border-box}
.dmag h1,.dmag h2,.dmag h3{margin:0;font-weight:800;color:inherit;text-wrap:balance}
.dmag a{text-decoration:none}
.dmag .hero{position:relative;overflow:hidden;border-radius:22px;background:radial-gradient(120% 140% at 85% 0%,#2a2620 0%,#141414 50%,#0B0B0B 100%);color:#fff;padding:52px 48px 56px}
.dmag .hero:before{content:"";position:absolute;inset:0;background:var(--heroimg) center 62%/cover no-repeat;opacity:.34;filter:grayscale(.2)}
.dmag .hero>*{position:relative}
.dmag .kick{color:var(--g2);font-weight:700;letter-spacing:.06em;font-size:15px;display:flex;align-items:center;gap:12px}
.dmag .kick:after{content:"";width:110px;height:2px;background:linear-gradient(to left,var(--g2),transparent)}
.dmag .hero h1{font-size:clamp(40px,6vw,72px);line-height:1.1;margin:12px 0 14px;color:var(--g1)}
.dmag .hero p{font-size:clamp(17px,2vw,21px);line-height:1.6;max-width:720px;color:#DCE2EC;margin:0}
.dmag .badges{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}
.dmag .badge{border:1.5px solid rgba(231,205,150,.6);color:#fff;border-radius:40px;padding:7px 16px;font-size:15px;font-weight:500}
.dmag .badge:hover{background:rgba(231,205,150,.12)}
.dmag .st{display:flex;align-items:center;gap:14px;font-size:15px;font-weight:800;color:var(--g3);letter-spacing:.06em;margin:52px 0 18px}
.dmag .st:after{content:"";flex:1;height:1px;background:var(--line)}
.dmag .latest{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:48px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:32px;box-shadow:0 10px 30px rgba(20,20,20,.06)}
.dmag .cover{position:relative;display:block}
.dmag .cover img{width:100%;height:auto;border-radius:8px;display:block;box-shadow:0 18px 40px rgba(0,0,0,.35)}
.dmag .new{position:absolute;top:-12px;right:-12px;background:var(--g1);color:var(--ink);font-weight:800;font-size:14px;border-radius:30px;padding:5px 14px}
.dmag .meta{font-size:15px;color:var(--mut);font-weight:500}
.dmag .latest h2{font-size:clamp(26px,3.2vw,40px);line-height:1.2;margin:8px 0 16px}
.dmag ul.heads{list-style:none;display:grid;gap:10px;margin:0 0 26px;padding:0}
.dmag ul.heads li{font-size:18px;display:flex;gap:12px;align-items:baseline}
.dmag ul.heads li:before{content:"";width:9px;height:9px;background:var(--g2);transform:rotate(45deg);flex:none;margin-top:8px}
.dmag .btns{display:flex;gap:10px;flex-wrap:wrap}
.dmag .btn{display:inline-flex;align-items:center;justify-content:center;border-radius:8px;padding:12px 22px;font-weight:700;font-size:16px;border:1.5px solid var(--ink)}
.dmag .btn.pri{background:var(--ink);color:var(--g1)}
.dmag .btn.sec{color:var(--ink);background:#fff}
.dmag .btn.sm{padding:8px 14px;font-size:14.5px}
.dmag .inside{margin-top:36px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:30px 32px}
.dmag .inside h2{font-size:26px;margin-bottom:4px}
.dmag .inside .sub{color:var(--mut);font-size:15px;margin:0 0 14px}
.dmag .story{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;padding:18px 0;border-top:1px solid var(--line)}
.dmag .story .n{width:40px;height:40px;border-radius:50%;background:var(--ink);color:var(--g1);display:flex;align-items:center;justify-content:center;font-weight:800}
.dmag .story h3{font-size:19px;margin-bottom:4px;line-height:1.4}
.dmag .story p{font-size:16px;line-height:1.65;color:#3a3f45;margin:0}
.dmag .story p b{color:var(--ink)}
.dmag .author{margin-top:36px;display:flex;gap:22px;align-items:center;background:#fff;border:1px solid var(--line);border-right:4px solid var(--g2);border-radius:16px;padding:24px 28px}
.dmag .author img{width:96px!important;height:96px!important;border-radius:50%;object-fit:cover;flex:none}
.dmag .author b{font-size:20px;display:block}
.dmag .author .role{color:var(--g3);font-weight:700;font-size:15px;margin:2px 0 6px}
.dmag .author p{font-size:15.5px;color:#3a3f45;line-height:1.6;margin:0}
.dmag .author .upd{font-size:13.5px;color:var(--mut);margin-top:6px}
.dmag .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.dmag .card{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.dmag .card img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;display:block}
.dmag .card .b{padding:18px 20px 20px;display:flex;flex-direction:column;gap:6px;flex:1}
.dmag .card .no{font-size:14px;color:var(--g3);font-weight:800}
.dmag .card .dt{align-self:flex-start;margin-top:-4px;font-size:13.5px;color:var(--mut);font-weight:500;white-space:nowrap;unicode-bidi:isolate}
.dmag .meta .dt{white-space:nowrap;unicode-bidi:isolate}
.dmag .card h3{font-size:19px;line-height:1.35}
.dmag .card p{font-size:15px;color:var(--mut);line-height:1.55;flex:1;margin:0 0 8px}
.dmag .cta{margin-top:52px;background:var(--ink);color:#fff;border-radius:16px;padding:30px 36px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.dmag .cta b{font-size:23px;display:block}
.dmag .cta span{display:block;color:#C9D1DD;font-size:16.5px;margin-top:4px}
.dmag .cta .btn{background:var(--g1);color:var(--ink);border-color:var(--g1)}
.dmag .disc{font-size:14px;color:var(--mut);margin-top:18px}
.dmag .story h3 a{color:inherit}
.dmag .srcname{font-size:14px;color:var(--mut);margin-top:6px}
.dmag .more{display:inline-block;margin-top:8px;font-weight:700;color:var(--g3);font-size:15px}
.dmag .toc{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 28px;margin-top:28px}
.dmag .toc b{display:block;font-size:17px;margin-bottom:8px}
.dmag .toc ol{margin:0;padding:0 22px 0 0;display:grid;gap:6px}
.dmag .toc a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--g2);text-underline-offset:3px}
.dmag .art{margin-top:28px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:8px 32px 28px}
.dmag .art section{padding-top:26px;scroll-margin-top:110px}
.dmag .art section+section{border-top:1px solid var(--line);margin-top:22px}
.dmag .art h2{font-size:clamp(22px,2.6vw,28px);line-height:1.3;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}
.dmag .art h2 .n{flex:none;width:36px;height:36px;border-radius:50%;background:var(--ink);color:var(--g1);display:inline-flex;align-items:center;justify-content:center;font-size:16px;margin-top:2px}
.dmag .art p{margin:0 0 12px;font-size:17px;line-height:1.8;color:#2b2f34}
.dmag .art p a{color:var(--g3);font-weight:700;text-decoration:underline;text-underline-offset:3px}
.dmag .means{background:var(--bg);border-right:4px solid var(--g2);border-radius:10px;padding:14px 18px;font-size:16.5px;line-height:1.7}
.dmag .means b{color:var(--g3)}
.dmag .faq{margin-top:28px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px 32px}
.dmag .faq h2{font-size:24px;margin-bottom:8px}
.dmag .faq h3{font-size:18px;margin:16px 0 4px}
.dmag .faq p{margin:0;font-size:16.5px;color:#3a3f45}
.dmag .pn{display:flex;justify-content:space-between;gap:12px;margin-top:28px;flex-wrap:wrap}
.dmag .crumbs{font-size:14px;color:#C9D1DD;margin-bottom:6px}
.dmag .crumbs a{color:var(--g1)}
.dmag .hero.small h1{font-size:clamp(30px,4.4vw,52px)}
@media (max-width:767px){
 .dmag .art{padding:4px 18px 20px}
 .dmag .art p{font-size:16px}
 .dmag .toc,.dmag .faq{padding:18px}
}
@media (max-width:767px){
 .dmag{padding:12px 12px 48px}
 .dmag .hero{padding:40px 20px 44px;border-radius:0;width:100vw;max-width:100vw;margin:-12px calc(50% - 50vw) 0}
 .dmag .latest{grid-template-columns:1fr;gap:24px;padding:20px}
 .dmag .cover{width:78%;margin:0 auto}
 .dmag ul.heads li{font-size:16.5px}
 .dmag .latest .btn{flex:1}
 .dmag .inside{padding:20px}
 .dmag .story{grid-template-columns:34px minmax(0,1fr);gap:10px}
 .dmag .story .n{width:32px;height:32px;font-size:14px}
 .dmag .story p{font-size:15px}
 .dmag .author{flex-direction:column;text-align:center;padding:20px}
 .dmag .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .dmag .card .b{padding:12px}
 .dmag .card h3{font-size:15.5px}
 .dmag .card p{display:none}
 .dmag .card .btns{flex-direction:column}
 .dmag .cta{padding:22px}
 .dmag .cta .btn{width:100%}
}
"""


import re
LINK = re.compile(r'\[([^\]]+)\]\((https://dabullaw\.co\.il/[^)\s]*)\)')


def rich(t):
    """escape the text, then turn [text](url) into internal links (only dabullaw.co.il)"""
    out, last = [], 0
    for m in LINK.finditer(t):
        out.append(e(t[last:m.start()])); out.append(f'<a href="{e(m.group(2))}">{e(m.group(1))}</a>'); last = m.end()
    out.append(e(t[last:]))
    return ''.join(out)


def srcname(s):
    """the source is written by name only, never as a link (Yakir, 23.10.2026)"""
    names = [t for t, _u in s.get('sources', [])]
    return f'<div class="srcname">מקור: {e(" · ".join(names))}</div>' if names else ''


def plain(t):
    return LINK.sub(lambda m: m.group(1), t)


def person(a):
    return {"@type": "Person", "@id": "https://dabullaw.co.il/#yakir", "name": "עו״ד יקיר דבול", "jobTitle": "עורך דין", "url": "https://dabullaw.co.il/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/", "image": a["img"]}


def author_box(a, upd):
    return f'''<aside class="author"><img src="{e(a["img"])}" alt="עו״ד יקיר דבול" width="96" height="96" loading="lazy"><div><b>עו״ד יקיר דבול</b><div class="role">יקיר דבול - משרד עורכי דין</div>
<p>מלווה יותר מ־100 עסקאות נדל״ן בשנה בשרון. חבר בחמש ועדות של לשכת עורכי הדין, מחוז מרכז, ובהן ועדת התחדשות עירונית וועדת מקרקעין. התראיין בחדשות 13, ישראל היום, וואלה נדל״ן וביזפורטל.</p><div class="upd">עודכן לאחרונה: {e(upd)}</div></div></aside>'''


CTA = f'''<div class="cta"><div><b>יש לכם שאלה על עסקה שראיתם במגזין?</b><span>השאירו פרטים ונחזור אליכם.</span></div><a class="btn" href="{CONTACT}">השארת פרטים</a></div>
<p class="disc">המידע במגזין כללי ואינו ייעוץ משפטי. לפני החלטה בעסקה, כדאי להתייעץ עם עורך דין.</p></div>'''


def ldjson(ld):
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '</script>'


def build(d):
    issues = d['issues']
    L = issues[0]
    a = d['author']
    Lp = L.get('page') or L['pdf']
    out = [f'<style>{CSS}</style>', f'<div class="dmag" style="--heroimg:url({e(d["heroImg"])})">']
    out.append(f'''<header class="hero"><div class="kick">גיליון חדש בכל יום שישי</div><h1>מגזין הנדל״ן</h1>
<p>כל שבוע, החדשות החשובות בנדל״ן, במיסוי ובהתחדשות עירונית, ומה הן אומרות לכם. בשפה פשוטה, בעשרה עמודים קצרים, מעו״ד יקיר דבול.</p>
<div class="badges"><a class="badge" href="{e(Lp)}">לקריאת הגיליון האחרון</a><a class="badge" href="{e(L["pdf"])}" download>הורדה כקובץ PDF</a><a class="badge" href="#archive">ארכיון כל הגיליונות</a></div></header>''')
    heads = ''.join(f'<li>{e(h)}</li>' for h in L['heads'])
    out.append(f'''<div class="st">הגיליון של השבוע</div><section class="latest"><a class="cover" href="{e(Lp)}"><img src="{e(L["cover"])}" alt="שער מגזין הנדל״ן, גיליון {L["no"]}, {e(L["dates"])}" width="800" height="1000" loading="eager"><span class="new">חדש</span></a>
<div><div class="meta">גיליון #{L["no"]} · <span class="dt" dir="ltr">{e(L["dates"])}</span></div><h2><a href="{e(Lp)}" style="color:inherit">{e(L["title"])}</a></h2><ul class="heads">{heads}</ul>
<div class="btns"><a class="btn pri" href="{e(Lp)}">לקריאת הגיליון</a><a class="btn sec" href="{e(L["pdf"])}" target="_blank" rel="noopener">צפייה במגזין</a></div></div></section>''')
    st = []
    for i, s in enumerate(L['stories'], 1):
        st.append(f'<div class="story"><span class="n">{i}</span><div><h3>{e(s["h"])}</h3><p>{e(s["what"])} <b>מה זה אומר לכם:</b> {e(s["means"])}</p>{srcname(s)}</div></div>')
    more = f'<a class="more" href="{e(Lp)}">לקריאת הגיליון המלא ←</a>' if L.get('page') else ''
    out.append(f'<section class="inside" aria-labelledby="dmag-in"><h2 id="dmag-in">בגיליון הזה</h2><p class="sub">עיקרי הדברים בקצרה.</p>{"".join(st)}{more}</section>')
    out.append(author_box(a, L['updated']))
    cards = []
    for it in issues:
        ip = it.get('page') or it['pdf']
        cards.append(f'''<article class="card"><a href="{e(ip)}"><img src="{e(it["cover"])}" alt="שער מגזין הנדל״ן, גיליון {it["no"]}" width="800" height="1000" loading="lazy"></a><div class="b"><span class="no">גיליון #{it["no"]}</span><span class="dt" dir="ltr">{e(it["dates"])}</span><h3><a href="{e(ip)}" style="color:inherit">{e(it["title"])}</a></h3><p>{e(it["blurb"])}</p>
<div class="btns"><a class="btn pri sm" href="{e(ip)}">לקריאה</a><a class="btn sec sm" href="{e(it["pdf"])}" download>הורדה</a></div></div></article>''')
    out.append(f'<div class="st" id="archive">כל הגיליונות</div><section class="grid">{"".join(cards)}</section>')
    out.append(CTA)
    pr = person(a)
    periodical = {"@type": "Periodical", "@id": PAGE + "#periodical", "name": "מגזין הנדל״ן", "inLanguage": "he", "url": PAGE, "author": pr,
                  "publisher": {"@type": "LegalService", "name": "יקיר דבול - משרד עורכי דין", "url": "https://dabullaw.co.il/"},
                  "description": "מגזין שבועי: החדשות החשובות בנדל״ן, במיסוי ובהתחדשות עירונית, ומה הן אומרות לקוראים."}
    parts = [{"@type": "PublicationIssue", "issueNumber": str(it["no"]), "name": f'מגזין הנדל״ן, גיליון {it["no"]}: {it["title"]}', "datePublished": it["date"],
              "url": it.get("page") or it["pdf"], "image": it["cover"], "author": pr, "isPartOf": {"@id": PAGE + "#periodical"}} for it in issues]
    out.append(ldjson({"@context": "https://schema.org", "@graph": [periodical, {"@type": "CollectionPage", "url": PAGE, "name": "מגזין הנדל״ן", "inLanguage": "he", "dateModified": L["date"], "mainEntity": {"@id": PAGE + "#periodical"}, "hasPart": parts}]}))
    return '\n'.join(out)


def build_issue(d, no):
    issues = d['issues']
    k = next(n for n, it in enumerate(issues) if it['no'] == no)
    I = issues[k]
    a = d['author']
    newer = issues[k - 1] if k > 0 else None
    older = issues[k + 1] if k + 1 < len(issues) else None
    out = [f'<style>{CSS}</style>', f'<div class="dmag" style="--heroimg:url({e(d["heroImg"])})">']
    out.append(f'''<header class="hero small"><div class="crumbs"><a href="{PAGE}">מגזין הנדל״ן</a> · גיליון #{I["no"]} · <span dir="ltr" style="unicode-bidi:isolate">{e(I["dates"])}</span></div><h1>מגזין הנדל״ן, גיליון {I["no"]}: {e(I["title"])}</h1>
<p>{e(I["intro"])}</p>
<div class="badges"><a class="badge" href="{e(I["pdf"])}" target="_blank" rel="noopener">צפייה במגזין המלא</a><a class="badge" href="{e(I["pdf"])}" download>הורדה כקובץ PDF</a><a class="badge" href="{PAGE}#archive">כל הגיליונות</a></div></header>''')
    toc = ''.join(f'<li><a href="#s{i}">{e(s["h"])}</a></li>' for i, s in enumerate(I['stories'], 1))
    out.append(f'<nav class="toc" aria-label="תוכן הגיליון"><b>בגיליון הזה</b><ol>{toc}</ol></nav>')
    secs = []
    for i, s in enumerate(I['stories'], 1):
        paras = ''.join(f'<p>{rich(t)}</p>' for t in s.get('body') or [s['what']])
        secs.append(f'<section id="s{i}"><h2><span class="n">{i}</span><span>{e(s["h"])}</span></h2>{paras}<div class="means"><b>מה זה אומר לכם:</b> {e(s["means"])}</div>{srcname(s)}</section>')
    out.append(f'<article class="art">{"".join(secs)}</article>')
    if I.get('faq'):
        qa = ''.join(f'<h3>{e(q)}</h3><p>{e(x)}</p>' for q, x in I['faq'])
        out.append(f'<section class="faq"><h2>שאלות קצרות על הגיליון</h2>{qa}</section>')
    out.append(author_box(a, I['updated']))
    nav = []
    if older: nav.append(f'<a class="btn sec" href="{e(older.get("page") or older["pdf"])}">→ גיליון #{older["no"]}</a>')
    nav.append(f'<a class="btn pri" href="{PAGE}#archive">כל הגיליונות</a>')
    if newer: nav.append(f'<a class="btn sec" href="{e(newer.get("page") or newer["pdf"])}">גיליון #{newer["no"]} ←</a>')
    out.append(f'<div class="pn">{"".join(nav)}</div>')
    out.append(CTA)
    pr = person(a)
    url = I['page']
    art = {"@type": "NewsArticle", "@id": url + "#article", "headline": f'מגזין הנדל״ן, גיליון {I["no"]}: {I["title"]}', "description": I.get("seoDesc", I["blurb"]),
           "inLanguage": "he", "datePublished": I["date"], "dateModified": I["date"], "image": I["cover"], "url": url, "mainEntityOfPage": url, "author": pr,
           "publisher": {"@type": "Organization", "name": "יקיר דבול - משרד עורכי דין", "url": "https://dabullaw.co.il/"},
           "isPartOf": {"@type": "PublicationIssue", "issueNumber": str(I["no"]), "isPartOf": {"@type": "Periodical", "@id": PAGE + "#periodical", "name": "מגזין הנדל״ן", "url": PAGE}},
           "articleSection": [s["h"] for s in I["stories"]]}
    graph = [art, {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "דף הבית", "item": "https://dabullaw.co.il/"}, {"@type": "ListItem", "position": 2, "name": "מגזין הנדל״ן", "item": PAGE}, {"@type": "ListItem", "position": 3, "name": f'גיליון {I["no"]}', "item": url}]}]
    if I.get('faq'):
        graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": x}} for q, x in I['faq']]})
    out.append(ldjson({"@context": "https://schema.org", "@graph": graph}))
    return '\n'.join(out)


if __name__ == '__main__':
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    if '--issue' in sys.argv:
        print(build_issue(data, int(sys.argv[sys.argv.index('--issue') + 1])))
    else:
        print(build(data))
