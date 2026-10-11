#!/usr/bin/env python3
"""Review page for the online services Meta campaign (draft for Yakir's approval). Reads ../campaign.json."""
import json, html, pathlib
H = pathlib.Path(__file__).parent
C = json.load(open(H.parent / 'campaign.json', encoding='utf8'))
M = C['meta']
CR = {c['key']: c for c in C['creatives']}
E = lambda s: html.escape(str(s), quote=True)
P = lambda s: '<br>'.join(E(x) for x in str(s).split('\n'))
CHK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def media(key, kind, fmt='f'):
    if kind == 'video':
        return (f'<video controls preload="none" playsinline poster="img/{key}-video-{fmt}-poster.jpg"><source src="vid/{key}-video-{fmt}.mp4" type="video/mp4"></video>')
    return f'<img src="img/{key}-{fmt}.jpg" alt="{E(" ".join(CR[key]["title"]))}" loading="lazy">'


def post(ad, n):
    k, kind = ad['key'], ad['kind']
    dom = ad['url'].split('?')[0].replace('https://', '')
    label = 'סרטון' if kind == 'video' else 'תמונה'
    return f'''<article class="ad" id="ad-{E(k)}-{kind}">
 <div class="ad-meta"><span class="num">{n}</span><span class="tag">{label}</span><span class="tag ghost">פיד 4:5 · סטורי 9:16</span></div>
 <div class="ad-pair">
  <div class="fb">
   <div class="fb-h"><img src="img/yakir.webp" alt=""><div><b>יקיר דבול - משרד עורכי דין</b><span>ממומן</span></div></div>
   <p class="fb-t">{P(ad['primary'])}</p>
   <div class="fb-m">{media(k, kind, 'f')}</div>
   <div class="fb-l"><div><small dir="ltr">{E(dom)}</small><b>{E(ad['headline'])}</b><span>{E(ad.get('desc', ''))}</span></div><span class="btn">{E(ad['cta'])}</span></div>
  </div>
  <figure class="story">{media(k, kind, 's')}<figcaption>סטורי ורילס</figcaption></figure>
 </div>
 <details class="url"><summary>הקישור במודעה</summary><code dir="ltr">{E(ad['url'])}</code></details>
</article>'''


def adset(s, start):
    ads = ''.join(post(a, start + i) for i, a in enumerate(s['ads']))
    return f'''<section class="set" id="set-{s['key']}">
 <header class="set-h"><div><span class="eyebrow">קהל {s['key']}</span><h3>{E(s['name'])}</h3></div><div class="set-b"><b>{s['day']} ₪</b><span>ליום · כ-{round(s['day'] * 30.4):,} ₪ בחודש</span></div></header>
 <dl class="set-d"><div><dt>איפה</dt><dd>{E(s['geo'])}</dd></div><div><dt>גילאים</dt><dd>{E(s['age'])}</dd></div><div><dt>למה כך</dt><dd>{E(s['why'])}</dd></div><div><dt>מי רואה</dt><dd>{E(s['interests'])}</dd></div></dl>
 <div class="ads">{ads}</div>
</section>'''


def spare(sp):
    k, kind = sp['key'], sp['kind']
    src = f'<img src="img/{k}-video-f-poster.jpg" alt="" loading="lazy"><span class="play" aria-hidden="true"></span>' if kind == 'video' else f'<img src="img/{k}-f.jpg" alt="" loading="lazy">'
    if kind == 'video':
        src = f'<video controls preload="none" playsinline poster="img/{k}-video-f-poster.jpg"><source src="vid/{k}-video-f.mp4" type="video/mp4"></video>'
    who = {'A': 'קהל A', 'B': 'קהל B'}.get(sp['for'], sp['for'])
    return f'<figure class="sp">{src}<figcaption><b>{E(sp["headline"])}</b><span>{"סרטון" if kind == "video" else "תמונה"} · {E(who)}</span></figcaption></figure>'


n = 1; sets = ''
for s in M['adsets']:
    sets += adset(s, n); n += len(s['ads'])
spares = ''.join(spare(s) for s in M['spares'])
total_day = sum(s['day'] for s in M['adsets'])

PAGE = f'''<title>קמפיין שירותים אונליין</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=Karantina:wght@700&display=swap">
<style>
/* layout: one reading column; ads shown the way they appear on the phone (feed post + story beside it) */
:root{{--bg:#F2F5FB;--surface:#FFFFFF;--ink:#0E1E3D;--muted:#56637F;--line:#D9E1EF;--navy:#0E2A57;--sun:#FFE14D;--sunInk:#0E2A57;--ok:#17915A;--warn:#B45309;--soft:#E9EEF8;
 --display:"Karantina","IBM Plex Sans Hebrew",sans-serif;--body:"IBM Plex Sans Hebrew",Arial,sans-serif}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#0A1530;--surface:#111F42;--ink:#EEF2FB;--muted:#A3B2D3;--line:#22386A;--navy:#0E2A57;--soft:#16295A;--ok:#3CC487;--warn:#F59E0B;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0A1530;--surface:#111F42;--ink:#EEF2FB;--muted:#A3B2D3;--line:#22386A;--navy:#0E2A57;--soft:#16295A;--ok:#3CC487;--warn:#F59E0B;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.6;margin:0;direction:rtl}}
.wrap{{max-width:1080px;margin:0 auto;padding-inline:20px;padding-block:28px 80px}}
h1,h2,h3{{text-wrap:balance;margin:0}}
.hero{{background:var(--navy);color:#fff;border-radius:22px;padding:34px 30px;position:relative;overflow:hidden;
 background-image:linear-gradient(rgba(127,166,240,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(127,166,240,.14) 1px,transparent 1px);background-size:44px 44px}}
.hero .st{{display:inline-flex;gap:8px;align-items:center;background:var(--sun);color:var(--sunInk);font-weight:700;font-size:14px;border-radius:99px;padding:5px 14px}}
.hero h1{{font-family:var(--display);font-weight:700;font-size:clamp(46px,8vw,84px);line-height:.95;margin:16px 0 10px;letter-spacing:.01em}}
.hero h1 mark{{background:linear-gradient(transparent 60%,var(--sun) 60%,var(--sun) 88%,transparent 88%);color:#fff;padding:0 4px}}
.hero p{{color:#D6E2FA;max-width:62ch;margin:0;font-size:17px}}
.facts{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:26px}}
.facts div{{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 14px;min-width:0}}
.facts dt{{font-size:13px;color:#B9C8EA}}.facts dd{{margin:2px 0 0;font-weight:700;font-size:19px;color:#fff}}
h2{{font-family:var(--display);font-size:clamp(36px,5vw,52px);font-weight:700;line-height:1;margin:56px 0 8px;color:var(--ink)}}
.lead{{color:var(--muted);max-width:68ch;margin:0 0 20px}}
.tree{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
.tree .root{{grid-column:1/-1;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 20px;display:flex;flex-wrap:wrap;gap:8px 28px;align-items:baseline}}
.tree .root b{{font-size:18px}}.tree .root span{{color:var(--muted)}}
.node{{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;min-width:0}}
.node .eyebrow{{font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.04em}}
.node h3{{font-size:20px;margin:2px 0 8px}}
.node .money{{font-family:var(--display);font-size:44px;line-height:1;color:var(--ink)}}
.node .money small{{font-family:var(--body);font-size:15px;color:var(--muted);margin-inline-start:6px}}
.node ul{{margin:10px 0 0;padding-inline-start:18px;color:var(--muted)}}
.set{{margin-top:34px}}
.set-h{{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;border-bottom:3px solid var(--sun);padding-bottom:12px}}
.eyebrow{{font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.04em}}
.set-h h3{{font-size:26px}}
.set-b{{text-align:left}}.set-b b{{font-family:var(--display);font-size:46px;line-height:1;display:block}}.set-b span{{color:var(--muted);font-size:14px}}
.set-d{{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px 22px;margin:16px 0 8px}}
.set-d dt{{font-size:13px;font-weight:700;color:var(--muted)}}.set-d dd{{margin:0;font-size:15px}}
.ads{{display:grid;gap:30px;margin-top:18px}}
.ad{{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:18px}}
.ad-meta{{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}}
.num{{width:30px;height:30px;border-radius:50%;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px}}
.tag{{background:var(--sun);color:var(--sunInk);font-weight:700;font-size:13px;border-radius:99px;padding:3px 12px}}
.tag.ghost{{background:var(--soft);color:var(--muted)}}
.ad-pair{{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,.75fr);gap:20px;align-items:start}}
.fb{{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}}
.fb-h{{display:flex;gap:10px;align-items:center;padding:12px 14px}}.fb-h img{{width:40px;height:40px;border-radius:50%;object-fit:cover}}
.fb-h b{{display:block;font-size:15px}}.fb-h span{{font-size:12px;color:var(--muted)}}
.fb-t{{margin:0;padding:0 14px 12px;font-size:15px;line-height:1.55}}
.fb-m img,.fb-m video,.story img,.story video{{display:block;width:100%;height:auto;max-width:100%;background:#0E2A57}}
.fb-l{{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:var(--soft)}}
.fb-l div{{min-width:0}}.fb-l small{{display:block;color:var(--muted);font-size:12px;text-align:right}}.fb-l b{{display:block;font-size:15px}}.fb-l span{{font-size:13px;color:var(--muted)}}
.btn{{flex:none;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font-weight:700;font-size:14px;color:var(--ink)}}
.story{{margin:0;border-radius:14px;overflow:hidden;border:1px solid var(--line)}}
.story figcaption{{font-size:13px;color:var(--muted);padding:8px 10px;text-align:center}}
details.url{{margin-top:12px;font-size:13px;color:var(--muted)}}details.url code{{display:block;word-break:break-all;margin-top:6px;background:var(--soft);padding:8px 10px;border-radius:8px;color:var(--ink)}}
.spares{{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}}
.sp{{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden}}
.sp img,.sp video{{display:block;width:100%;height:auto}}
.sp figcaption{{padding:10px 12px}}.sp b{{display:block;font-size:15px}}.sp span{{font-size:13px;color:var(--muted)}}
.tbl{{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:16px}}
table{{border-collapse:collapse;width:100%;min-width:560px;font-size:15px}}
th,td{{text-align:right;padding:12px 16px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{font-size:13px;color:var(--muted);font-weight:700;background:var(--soft)}}
tr:last-child td{{border-bottom:0}}
td b{{white-space:nowrap}}
.terms{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:16px}}
.terms div{{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px}}.terms b{{display:block}}.terms span{{color:var(--muted);font-size:15px}}
.todo{{display:grid;gap:14px}}
.todo article{{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px}}
.todo h3{{font-size:20px;display:flex;gap:10px;align-items:center}}
.todo h3 .num{{flex:none}}
.todo ol{{margin:10px 0 0;padding-inline-start:22px}}.todo li{{margin:6px 0}}
.todo p{{margin:8px 0 0;color:var(--muted)}}
.opt{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:12px}}
.opt div{{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--soft)}}.opt b{{display:block}}.opt span{{font-size:14px;color:var(--muted)}}
.checks{{display:grid;gap:10px;list-style:none;padding:0;margin:0}}
.checks li{{display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px}}
.checks svg{{width:22px;height:22px;flex:none;color:var(--ok);margin-top:2px}}
.checks li.n svg{{color:var(--warn)}}
code{{font-family:ui-monospace,Menlo,monospace;font-size:13px}}
@media (max-width:760px){{.tree{{grid-template-columns:1fr}}.ad-pair{{grid-template-columns:1fr}}.story{{max-width:260px}}.hero{{padding:26px 20px}}}}
</style>
<div class="wrap">
<header class="hero">
 <span class="st">טיוטה לאישור · שום דבר עוד לא עלה</span>
 <h1>שירותים משפטיים <mark>אונליין</mark></h1>
 <p>קמפיין בפייסבוק ובאינסטגרם שמביא אנשים לדפי השירותים באתר, כדי שיזמינו וישלמו אונליין. במודעות אין מחירים: המחיר מופיע רק באתר, לפני התשלום.</p>
 <dl class="facts">
  <div><dt>תקציב</dt><dd>1,000 ₪ לחודש</dd></div>
  <div><dt>ביום</dt><dd>{total_day} ₪</dd></div>
  <div><dt>איפה</dt><dd>פייסבוק ואינסטגרם</dd></div>
  <div><dt>קהלים</dt><dd>2</dd></div>
  <div><dt>מודעות פעילות</dt><dd>{n - 1}</dd></div>
  <div><dt>מודעות בהמתנה</dt><dd>{len(M['spares'])}</dd></div>
 </dl>
</header>

<h2>המבנה</h2>
<p class="lead">קמפיין אחד ושני קהלים. כל קהל מקבל תקציב יומי קבוע, כדי ששניהם יקבלו חשיפה. המטרה בחודש הראשון היא כניסות לדפי השירותים, כי בתקציב הזה מטא לא תצבור מספיק הזמנות כדי ללמוד מהן לבד.</p>
<div class="tree">
 <div class="root"><b>קמפיין: שירותים משפטיים אונליין</b><span>{E(M['objective'])}</span><span>{E(M['placements'])}</span></div>
 {''.join(f"""<div class="node"><span class="eyebrow">קהל {s['key']}</span><h3>{E(s['name'])}</h3><div class="money">{s['day']} ₪<small>ליום · כ-{round(s['day'] * 30.4):,} ₪ בחודש</small></div><ul><li>{E(s['geo'])}</li><li>גילאים {E(s['age'])}</li><li>{len(s['ads'])} מודעות</li></ul></div>""" for s in M['adsets'])}
</div>

<h2>המודעות</h2>
<p class="lead">כך המודעות ייראו בטלפון. משמאל לכל מודעה בפיד מופיעה הגרסה לסטורי ולרילס. כל קישור מסומן, כך שבכל הזמנה רואים מאיזו מודעה היא הגיעה (זה מופיע גם בהודעת הטלגרם על הזמנה ששולמה).</p>
{sets}

<h2>מודעות בהמתנה</h2>
<p class="lead">אחרי שבועיים עד שלושה אנשים מתחילים לראות את אותן מודעות שוב ושוב, והתוצאות יורדות. אז מחליפים את המודעות החלשות באלה. הן מוכנות, עם אותו טקסט וקישור לשירות.</p>
<div class="spares">{spares}</div>

<h2>החודש הראשון</h2>
<div class="tbl"><table>
<thead><tr><th>מתי</th><th>מה קורה</th><th>מה אני בודק</th></tr></thead>
<tbody>
<tr><td><b>ימים 1 עד 3</b></td><td>מטא לומדת מי מגיב לכל מודעה. התוצאות קופצות, וזה רגיל.</td><td>שהמודעות אושרו, שהתקציב יוצא, ושהקישורים פותחים את הדף הנכון.</td></tr>
<tr><td><b>סוף שבוע 1</b></td><td>יש מספיק נתונים להשוואה בין המודעות.</td><td>מחיר לכניסה לדף בכל מודעה. מודעה שמביאה כניסות ביוקר בהרבה מהאחרות נעצרת.</td></tr>
<tr><td><b>סוף שבוע 2</b></td><td>רואים אילו שירותים מביאים הזמנות.</td><td>הזמנות שהתחילו והזמנות ששולמו, לפי מודעה. אפשר להעביר תקציב בין שני הקהלים.</td></tr>
<tr><td><b>שבוע 3</b></td><td>רענון: מכניסים מודעות מההמתנה במקום החלשות.</td><td>כמה פעמים בממוצע כל אדם ראה את המודעה. מעל 3 פעמים זה הזמן לרענן.</td></tr>
<tr><td><b>סוף החודש</b></td><td>סיכום ליקיר והחלטה על החודש הבא.</td><td>כמה עלתה הזמנה ששולמה, ואילו שירותים כדאי לחזק.</td></tr>
</tbody></table></div>
<div class="terms">
 <div><b>כניסה לדף</b><span>מישהו לחץ על המודעה והדף באתר נפתח אצלו עד הסוף. זה המדד העיקרי בחודש הראשון.</span></div>
 <div><b>הזמנה שהתחילה</b><span>מישהו התחיל למלא את טופס השירות באתר.</span></div>
 <div><b>הזמנה ששולמה</b><span>התשלום עבר. זו התוצאה שבאמת מעניינת, והיא תגיע לך כמו היום בטלגרם, עם שם המודעה.</span></div>
 <div><b>תדירות</b><span>כמה פעמים בממוצע אותו אדם ראה את המודעה. כשהיא עולה, מרעננים.</span></div>
</div>

<h2>לפני שמעלים</h2>
<div class="todo">
 <article><h3><span class="num">1</span>פיקסל של מטא באתר</h3>
  <p>הפיקסל הוא קוד קטן באתר שמספר למטא מי נכנס לדף, מי התחיל הזמנה ומי שילם. בלעדיו מטא לא יודעת מה עובד, ואי אפשר למדוד הזמנות מהקמפיין. כרגע אין פיקסל באתר. אתה רק יוצר אותו ושולח לי מספר, ואת ההתקנה באתר אני עושה.</p>
  <ol>
   <li>נכנסים ל-<code dir="ltr">business.facebook.com</code> ובוחרים את העסק שלך.</li>
   <li>בתפריט בצד לוחצים "מנהל האירועים" (Events Manager).</li>
   <li>לוחצים על הכפתור הירוק "חיבור מקורות נתונים" (Connect data sources), בוחרים "אינטרנט" (Web) ולוחצים "חיבור".</li>
   <li>בשם כותבים <code dir="ltr">dabullaw.co.il</code> ולוחצים "יצירה" (Create). אם מוצע להזין כתובת אתר, מדלגים.</li>
   <li>על המסך יופיע מספר ארוך, 15 או 16 ספרות, ליד השם, שנקרא "מזהה מערך נתונים" (Dataset ID). מעתיקים אותו ושולחים לי כאן. זה לא קוד סודי.</li>
  </ol>
  <p>אחרי שאקבל את המספר: אתקין את הפיקסל, אחבר אותו לטופס ההזמנה ולעמוד התודה אחרי התשלום, ואבדוק שהוא עובד לפני שהקמפיין עולה.</p>
 </article>
 <article><h3><span class="num">2</span>איך הקמפיין עולה למטא</h3>
  <p>החיבור שדרכו אני מעלה קמפיינים ישירות לחשבון המודעות שלך (Adspirer) מאפשר 15 פעולות בחודש, וכל ה-15 של החודש הזה כבר נוצלו. יש שלוש דרכים:</p>
  <div class="opt">
   <div><b>א. מחכים ל-1.11</b><span>המכסה מתחדשת, ואני מעלה הכל לבד. בלי עלות, אבל הקמפיין מתחיל רק בעוד כשלושה שבועות.</span></div>
   <div><b>ב. אתה מעלה עכשיו, עם הדרכה</b><span>אני שולח הוראות לחיצה אחרי לחיצה, וכל הקבצים והטקסטים מוכנים להעתקה. בערך 20 עד 30 דקות.</span></div>
   <div><b>ג. שדרוג החיבור</b><span>מכסה גדולה יותר ואני מעלה הכל עכשיו. זה כרוך בתשלום חודשי ל-Adspirer, ולכן רק באישור שלך.</span></div>
  </div>
 </article>
 <article><h3><span class="num">3</span>קמפיין חדלות פירעון וחובות</h3>
  <p>כמו שקבעת: 1,000 ₪ לחודש, כלומר כ-33 ₪ ליום. התקציב שם מתעדכן באותה דרך שתבחר בסעיף 2. שני השירותים המקוונים של חובות (איחוד תיקים וצו חיוב בתשלומים) לא נכנסו לקמפיין הזה. אם תרצה, אפשר להוסיף אותם לקמפיין החובות, מתוך התקציב שלו.</p>
 </article>
</div>

<h2>בדיקות</h2>
<ul class="checks">
 <li>{CHK}<span>אין מחיר באף מודעה, לא בתמונה, לא בסרטון ולא בטקסט. בסרטונים חתכתי את החלק שמראה את המחיר.</span></li>
 <li>{CHK}<span>כללי הפרסום של לשכת עורכי הדין: שם עורך הדין מופיע בכל מודעה. אין "מומחה", אין "הכי" או "הטוב ביותר", אין הבטחה לתוצאה, ואין המלצות של לקוחות.</span></li>
 <li>{CHK}<span>כללי מטא: המודעות לא פונות לאדם לפי מאפיין אישי שלו (גיל, בריאות, מצב כלכלי). למשל, "מי יחליט בשבילכם, אם לא תוכלו?" במקום פנייה לגיל או לבריאות.</span></li>
 <li>{CHK}<span>מה שמובטח במודעות הוא מה שכתוב בדפי השירות: תשובה בתוך 2 ימי עבודה בבדיקת דירה, ופגישה אחת לחתימה בשירותים שדורשים חתימה.</span></li>
 <li>{CHK}<span>כל הפרטים בטפסים ובנסח שבתמונות הם דוגמה (שמות, גוש וחלקה), וגם מסומנים כך.</span></li>
 <li class="n">{CHK}<span>לתשומת לבך: בסרטון של בדיקת הדירה מופיעה בהתחלה מודעת דירה לדוגמה עם מחיר מבוקש של הדירה (2,150,000 ₪) והערכת מס רכישה לדוגמה. אלה לא המחיר שלנו. אם אתה מעדיף, אוריד גם אותם.</span></li>
 <li>{CHK}<span>כל הקישורים נבדקו ופותחים את דף השירות הנכון.</span></li>
</ul>
</div>'''

(H / 'index.html').write_text(PAGE, encoding='utf8')
print('ok', n - 1, 'ads')
