#!/usr/bin/env python3
"""Builds the campaign review page (one self-contained HTML) from campaign.json + book/imgs.json."""
import json, html, pathlib
H = pathlib.Path(__file__).parent
C = json.load(open(H / 'campaign.json'))
I = json.load(open(H / 'book' / 'imgs.json'))
e = lambda s: html.escape(str(s), quote=True)
G, M = C['google'], C['meta']

def serp(g, combo, dcombo):
    url = 'dabullaw.co.il › ' + ('lp-buy-apartment' if g['key'] == 'buy' else 'lp-sell-apartment')
    t = ' · '.join(g['headlines'][i] for i in combo)
    d = ' '.join(g['descriptions'][i] for i in dcombo)
    sl = ''.join(f'<span>{e(s[0])}</span>' for s in G['sitelinks'][:4])
    return f'''<div class="serp"><div class="sp-top"><b class="sp-ad">ממומן</b><span class="sp-ic">יד</span><div><div class="sp-name">יקיר דבול - משרד עורכי דין</div><div class="sp-url">{e(url)}</div></div></div>
<div class="sp-t">{e(t)}</div><div class="sp-d">{e(d)}</div><div class="sp-sl">{sl}</div></div>'''

def chips(xs, cls='chip'):
    return ''.join(f'<span class="{cls}">{e(x)}</span>' for x in xs)

def gl(g):
    hl = ''.join(f'<li><span>{e(h)}</span><i>{len(h)}/30</i></li>' for h in g['headlines'])
    ds = ''.join(f'<li><span>{e(h)}</span><i>{len(h)}/90</i></li>' for h in g['descriptions'])
    return f'''<div class="grp"><div class="grp-h"><h3>קבוצת מודעות: {e(g['name'])}</h3><a href="{e(g['url'])}">{e(g['url'].split('?')[0].replace('https://',''))}</a></div>
<div class="two">{serp(g,(0,3,4),(0,1))}{serp(g,(2,8,10),(2,3))}</div>
<div class="cols"><div><h4>15 כותרות</h4><ol class="tl">{hl}</ol></div><div><h4>4 תיאורים</h4><ol class="tl">{ds}</ol><h4 style="margin-top:22px">מילות מפתח</h4><div class="chips">{chips(g['keywords'])}</div></div></div></div>'''

def fbad(a):
    prim = e(a['primary']).replace('\n', '<br>')
    return f'''<div class="fb"><div class="fb-post"><div class="fb-h"><span class="sp-ic">יד</span><div><b>יקיר דבול - משרד עורכי דין</b><small>ממומן</small></div></div>
<p class="fb-p">{prim}</p><img src="{I[a['img'][0]]}" alt="מודעה {e(a['headline'])}" loading="lazy">
<div class="fb-f"><div><small>{e(a['url'].split('/')[2])}</small><b>{e(a['headline'])}</b><small>{e(a['desc'])}</small></div><span>{e(a['cta'])}</span></div></div>
<div class="fb-story"><img src="{I[a['img'][1]]}" alt="סטורי {e(a['headline'])}" loading="lazy"><small>סטורי ורילס, 1080×1920</small></div></div>'''

LP = lambda k, t, u: f'''<div class="lp"><div class="lp-h"><h3>{t}</h3><span class="mono">{u}</span></div><div class="lp-v"><figure class="dk"><figcaption>מחשב</figcaption><div class="scr"><img src="{I[k+'-d']}" alt="{t} במחשב" loading="lazy"></div></figure>
<figure class="mb"><figcaption>טלפון</figcaption><div class="scr ph"><img src="{I[k+'-m']}" alt="{t} בטלפון" loading="lazy"></div></figure></div></div>'''

b = C['budget']
page = f'''<title>קמפיין נדל"ן אוקטובר</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Heebo:wght@300;400;500;700&display=swap">
<style>
:root{{--bg:#f7f4ec;--card:#fffdf8;--ink:#17161a;--mut:#625e55;--line:#e3dccb;--g:#b8923f;--gs:#f1e7cf;--dark:#121419;--dk2:#1c1f27;--ok:#2f7a4b;--serp:#fff;--serpt:#1a0dab;--serpu:#202124;--serpd:#4d5156;color-scheme:light}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#111216;--card:#1a1c22;--ink:#ece7dc;--mut:#a59f92;--line:#2e3038;--g:#d1b06a;--gs:#2a2518;--dark:#0b0c10;--dk2:#16181e;--ok:#6fbf8b;--serp:#202124;--serpt:#99c3ff;--serpu:#dadce0;--serpd:#bdc1c6;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#111216;--card:#1a1c22;--ink:#ece7dc;--mut:#a59f92;--line:#2e3038;--g:#d1b06a;--gs:#2a2518;--dark:#0b0c10;--dk2:#16181e;--ok:#6fbf8b;--serp:#202124;--serpt:#99c3ff;--serpu:#dadce0;--serpd:#bdc1c6;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--ink);font-family:Heebo,Arial,sans-serif;font-size:16px;line-height:1.6;direction:rtl}}
.wrap{{max-width:1180px;margin:0 auto;padding-inline:20px;padding-block:0 80px}}
h1,h2,h3,h4{{margin:0;text-wrap:balance}}
h2{{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:34px;line-height:1.15}}
h3{{font-size:19px}} h4{{font-size:14px;color:var(--mut);font-weight:500;letter-spacing:.04em;margin-bottom:10px}}
a{{color:var(--g)}}
.mono{{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:var(--mut);direction:ltr}}
header.top{{background:var(--dark);color:#eee7d6;padding-block:44px 40px}}
header.top .wrap{{padding-block:0}}
.status{{display:inline-flex;gap:8px;align-items:center;background:rgba(209,176,106,.14);border:1px solid rgba(209,176,106,.45);color:#e8d6a6;border-radius:999px;padding:5px 14px;font-size:14px;font-weight:500}}
.status i{{width:8px;height:8px;border-radius:50%;background:#e0b34f}}
header h1{{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:clamp(34px,5vw,54px);line-height:1.05;color:#fff;margin:16px 0 10px}}
header p{{color:#c9c2b2;max-width:720px;margin:0}}
nav.toc{{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}}
nav.toc a{{color:#eee7d6;text-decoration:none;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px 14px;font-size:14px}}
section{{padding-top:56px}}
.sec-h{{display:flex;gap:16px;align-items:baseline;margin-bottom:20px;border-bottom:2px solid var(--ink);padding-bottom:10px}}
.sec-h b{{font-family:'Frank Ruhl Libre',Georgia,serif;color:var(--g);font-size:34px;line-height:1}}
.lead{{color:var(--mut);max-width:760px;margin:0 0 22px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px}}
.kpis{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}}
.kpi small{{display:block;color:var(--mut);font-size:13.5px}}
.kpi b{{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:32px;line-height:1.1;font-variant-numeric:tabular-nums}}
.kpi span{{font-size:13.5px;color:var(--mut)}}
.split{{margin-top:16px}}
.bar{{display:flex;height:42px;border-radius:10px;overflow:hidden;font-weight:700;font-size:14px}}
.bar div{{display:flex;align-items:center;padding-inline:14px;color:#fff}}
.bar .g{{background:#3b6fd8;flex:{b['google']}}} .bar .m{{background:#7b5bd6;flex:{b['meta']}}}
.flow{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}}
.flow div{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;position:relative}}
.flow div:not(:last-child):after{{content:"←";position:absolute;left:-12px;top:50%;transform:translate(-50%,-50%);color:var(--g);font-weight:700}}
.flow b{{display:block;font-size:15px}} .flow span{{font-size:13.5px;color:var(--mut)}}
.lp{{margin-bottom:34px}}
.lp-h{{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px}}
.lp-v{{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}}
figure{{margin:0}} figcaption{{font-size:13px;color:var(--mut);margin-bottom:6px}}
.scr{{border:1px solid var(--line);border-radius:12px;overflow:auto;max-height:720px;background:#111}}
.scr img{{display:block;width:100%;height:auto}}
.scr.ph{{border-radius:26px;border:8px solid #22242b;max-height:640px}}
.grp{{margin-bottom:36px}}
.grp-h{{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline;margin-bottom:12px}}
.grp-h a{{font-size:13.5px;direction:ltr}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}}
.serp{{background:var(--serp);border:1px solid var(--line);border-radius:12px;padding:16px 18px;font-family:Arial,sans-serif;min-width:0}}
.sp-top{{display:flex;gap:10px;align-items:center;margin-bottom:6px}}
.sp-ad{{font-size:12px;font-weight:700;color:var(--serpu)}}
.sp-ic{{width:28px;height:28px;border-radius:50%;background:#121419;color:#d1b06a;display:grid;place-items:center;font-family:'Frank Ruhl Libre',serif;font-weight:700;font-size:13px;flex:none}}
.sp-name{{font-size:14px;color:var(--serpu)}} .sp-url{{font-size:12px;color:var(--serpd);direction:ltr;text-align:right}}
.sp-t{{color:var(--serpt);font-size:19px;line-height:1.3;margin-bottom:4px}}
.sp-d{{color:var(--serpd);font-size:14px;line-height:1.5}}
.sp-sl{{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px}} .sp-sl span{{color:var(--serpt);font-size:14px}}
.cols{{display:grid;grid-template-columns:1fr 1fr;gap:22px}}
.tl{{margin:0;padding:0;list-style:none;counter-reset:t;border:1px solid var(--line);border-radius:12px;background:var(--card)}}
.tl li{{counter-increment:t;display:grid;grid-template-columns:26px 1fr auto;gap:10px;padding:8px 14px;border-bottom:1px solid var(--line);font-size:15px;align-items:baseline}}
.tl li:last-child{{border-bottom:0}}
.tl li:before{{content:counter(t);color:var(--g);font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}}
.tl i{{font-style:normal;color:var(--mut);font-size:12px;font-variant-numeric:tabular-nums;direction:ltr}}
.chips{{display:flex;flex-wrap:wrap;gap:7px}}
.chip{{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:4px 12px;font-size:14px}}
.chip.neg{{text-decoration:line-through;text-decoration-color:rgba(180,60,50,.6);color:var(--mut)}}
.set{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}
.set .card h4{{margin-bottom:8px}}
.set p{{margin:0;font-size:15px}}
.sl{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:8px}}
.sl div{{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--card);font-size:13.5px;color:var(--mut)}}
.sl b{{display:block;color:var(--ink);font-size:14.5px}}
.fbwrap{{display:grid;gap:28px}}
.fb{{display:grid;grid-template-columns:minmax(0,440px) 220px;gap:18px;align-items:start}}
.fb-post{{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}}
.fb-h{{display:flex;gap:10px;align-items:center;padding:12px 14px 6px}}
.fb-h b{{display:block;font-size:14.5px}} .fb-h small{{color:var(--mut);font-size:12.5px}}
.fb-p{{margin:0;padding:4px 14px 12px;font-size:14.5px;line-height:1.55}}
.fb-post img{{display:block;width:100%;height:auto}}
.fb-f{{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;background:var(--gs)}}
.fb-f small{{display:block;color:var(--mut);font-size:12px}} .fb-f b{{display:block;font-size:15px;line-height:1.3}}
.fb-f span{{background:var(--line);border-radius:8px;padding:7px 12px;font-weight:700;font-size:13.5px;white-space:nowrap}}
.fb-story img{{display:block;width:100%;height:auto;border-radius:16px;border:1px solid var(--line)}}
.fb-story small{{display:block;color:var(--mut);font-size:12.5px;margin-top:6px;text-align:center}}
.steps{{counter-reset:s;list-style:none;margin:0;padding:0;display:grid;gap:10px}}
.steps li{{counter-increment:s;display:grid;grid-template-columns:36px 1fr;gap:12px;align-items:start;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}}
.steps li:before{{content:counter(s);width:30px;height:30px;border-radius:50%;background:var(--dark);color:#d1b06a;display:grid;place-items:center;font-weight:700;font-size:14px}}
.steps b{{display:block}} .steps span{{color:var(--mut);font-size:14.5px}}
.note{{border-inline-start:4px solid var(--g);background:var(--gs);padding:14px 18px;border-radius:8px;font-size:15px;margin-top:16px}}
.approve{{background:var(--dark);color:#eee7d6;border-radius:16px;padding:26px 28px;margin-top:40px}}
.approve h2{{color:#fff;font-size:28px;margin-bottom:8px}}
.approve p{{margin:0;color:#c9c2b2}}
.approve code{{background:rgba(209,176,106,.16);color:#f0dca8;border-radius:6px;padding:2px 8px;font-family:Heebo,sans-serif;font-weight:700}}
@media (max-width:900px){{.kpis{{grid-template-columns:1fr 1fr}}.flow{{grid-template-columns:1fr 1fr}}.flow div:after{{display:none}}.lp-v,.two,.cols,.fb{{grid-template-columns:minmax(0,1fr)}}.set{{grid-template-columns:minmax(0,1fr)}}.sl{{grid-template-columns:1fr 1fr}}.fb-story{{max-width:240px}}.mb{{max-width:320px}}}}
@media (max-width:520px){{.wrap{{padding-inline:16px}}h2{{font-size:28px}}.kpis{{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}.kpi b{{font-size:26px}}.flow{{grid-template-columns:minmax(0,1fr)}}.sl{{grid-template-columns:minmax(0,1fr)}}}}
</style>
<header class="top"><div class="wrap">
<span class="status"><i></i>טיוטה לאישור · שום דבר לא פורסם ולא חויב</span>
<h1>קמפיין נדל"ן: קונים ומוכרים דירה</h1>
<p>גוגל לחיפוש של מי שכבר צריך עורך דין, ופייסבוק ואינסטגרם למוכרים ולקונים בתחילת הדרך. שני דפי נחיתה חדשים, 6 עיצובים ו-30 כותרות לגוגל. תקציב {b['month']:,} ש"ח בחודש.</p>
<nav class="toc"><a href="#plan">התוכנית</a><a href="#lp">דפי נחיתה</a><a href="#google">גוגל</a><a href="#meta">פייסבוק ואינסטגרם</a><a href="#launch">אחרי האישור</a></nav>
</div></header>
<main class="wrap">
<section id="plan"><div class="sec-h"><b>1</b><h2>התוכנית במבט אחד</h2></div>
<div class="kpis">
<div class="card kpi"><small>תקציב חודשי</small><b>{b['month']:,} ש"ח</b><span>כ-50 ש"ח ביום</span></div>
<div class="card kpi"><small>מחיר קליק משוער בגוגל</small><b>10 עד 14 ש"ח</b><span>לפי Keyword Planner, אזור נתניה</span></div>
<div class="card kpi"><small>פניות משוערות בחודש</small><b>8 עד 15</b><span>טלפון, וואטסאפ וטופס, משני הערוצים</span></div>
<div class="card kpi"><small>הורדות צ'קליסט משוערות</small><b>15 עד 30</b><span>נכנסים לרשימת הדיוור</span></div>
</div>
<div class="split card" style="margin-top:14px"><h4>חלוקת התקציב</h4><div class="bar"><div class="g">גוגל חיפוש · {b['google']:,} ש"ח</div><div class="m">מטא · {b['meta']} ש"ח</div></div>
<p style="margin:12px 0 0;font-size:15px;color:var(--mut)">רוב הכסף הולך לגוגל, כי שם מחפשים "עורך דין לקניית דירה" ברגע שצריכים. במטא תקציב קטן, למוכרים שעוד לא חיפשו ולצ'קליסט, שבונה רשימה של קונים לאורך זמן.</p></div>
<div class="flow"><div><b>מחפשים או גוללים</b><span>גוגל, פייסבוק, אינסטגרם</span></div><div><b>דף נחיתה ייעודי</b><span>קונים או מוכרים, בלי תפריט שמסיח</span></div><div><b>טלפון, וואטסאפ או טופס</b><span>כל לחיצה נספרת בגוגל אנליטיקס</span></div><div><b>הפנייה אצלך</b><span>במערכת המשרד ובטלגרם, עם המקור</span></div></div>
<p class="note">ההערכות הן טווח סביר לתקציב הזה, לא הבטחה. אחרי שבועיים יהיו מספרים אמיתיים, ואז מעבירים כסף למה שמביא פניות.</p>
</section>
<section id="lp"><div class="sec-h"><b>2</b><h2>דפי נחיתה</h2></div>
<p class="lead">שני דפים חדשים, אחד לקונים ואחד למוכרים. אותו עיצוב כמו האתר (כהה וזהב), מותאמים לטלפון, עם פס קבוע למטה: התקשרו, וואטסאפ, השאירו פרטים. הדפים לא יופיעו בגוגל האורגני ולא בתפריט, רק למי שמגיע מהמודעות.</p>
{LP('buy','דף קונים','dabullaw.co.il/lp-buy-apartment/')}
{LP('sell','דף מוכרים','dabullaw.co.il/lp-sell-apartment/')}
</section>
<section id="google"><div class="sec-h"><b>3</b><h2>גוגל: מודעות חיפוש</h2></div>
<p class="lead">קמפיין חיפוש אחד עם שתי קבוצות. גוגל מרכיב בעצמו מודעות מתוך 15 הכותרות ו-4 התיאורים, ולומד מה עובד. כך זה ייראה, למשל:</p>
{''.join(gl(g) for g in G['groups'])}
<div class="set">
<div class="card"><h4>אזור</h4><p>{e(', '.join(C['geo']))}. רק אנשים שנמצאים באזור, לא "מתעניינים בו".</p></div>
<div class="card"><h4>שעות</h4><p>{e(G['schedule'])}. כשהמשרד יכול לענות לטלפון.</p></div>
<div class="card"><h4>הצעות מחיר</h4><p>{e(G['bidding'])}.</p></div>
</div>
<h4 style="margin-top:22px">קישורים נוספים מתחת למודעה</h4>
<div class="sl">{''.join(f'<div><b>{e(s[0])}</b>{e(s[1])}</div>' for s in G['sitelinks'])}</div>
<div class="cols" style="margin-top:22px"><div><h4>יתרונות קצרים</h4><div class="chips">{chips(G['callouts'])}</div><h4 style="margin-top:16px">רשימת שירותים</h4><div class="chips">{chips(G['snippet'][1])}</div></div>
<div><h4>מילים שלא יפעילו את המודעה</h4><div class="chips">{chips(G['negatives'],'chip neg')}</div></div></div>
</section>
<section id="meta"><div class="sec-h"><b>4</b><h2>פייסבוק ואינסטגרם</h2></div>
<p class="lead">{e(M['objective'])}. קהל: {e(M['audience'])}. שלוש מודעות, לכל אחת גרסה לפיד וגרסה לסטורי ורילס. מטא יעביר יותר תקציב למודעה שמביאה יותר.</p>
<div class="fbwrap">{''.join(fbad(a) for a in M['ads'])}</div>
<p class="note">מטא עשוי לסווג את המודעות כ"דיור" (קטגוריה מיוחדת). אם כן, אי אפשר לבחור גיל, והרדיוס המינימלי גדל. המודעות עצמן לא משתנות.</p>
</section>
<section id="launch"><div class="sec-h"><b>5</b><h2>מה קורה אחרי האישור</h2></div>
<ol class="steps">
<li><div><b>מעלה את שני דפי הנחיתה</b><span>עם גיבוי, בלי אינדוקס בגוגל ובלי תפריט. בודק שהטופס מגיע למערכת המשרד ולטלגרם.</span></div></li>
<li><div><b>מחבר מדידה</b><span>פנייה מהטופס, לחיצה על טלפון ולחיצה על וואטסאפ נספרות כהמרה בגוגל אדס, כדי שגוגל ילמד מי פונה.</span></div></li>
<li><div><b>יוצר את קמפיין גוגל במצב מושהה</b><span>בודק שהכל נכון, ומפעיל רק אחרי שאתה רואה אותו בחשבון.</span></div></li>
<li><div><b>יוצר את קמפיין מטא</b><span>מעלה את 6 העיצובים והטקסטים. גם הוא נפתח מושהה עד שהמודעות עוברות אישור של מטא.</span></div></li>
<li><div><b>מעקב</b><span>דוח קצר בטלגרם כל יום ראשון: כמה הוצא, כמה קליקים וכמה פניות. אחרי שבועיים מעבירים תקציב למה שעובד.</span></div></li>
</ol>
<div class="approve"><h2>לאישור</h2><p>אפשר לאשר הכל או חלק. למשל: <code>קמפיין: תעלה הכל</code>, או <code>קמפיין: רק גוגל</code>, או לכתוב מה לשנות. שום שקל לא יוצא לפני האישור שלך.</p></div>
</section>
</main>'''
(H / 'book' / 'index.html').write_text(page)
print('bytes', len(page.encode()))
