#!/usr/bin/env python3
"""Debt / enforcement / insolvency landing page for the Meta campaign (16.10.2026).
Hidden page lp-debt on dabullaw.co.il (noindex by snippet 60, blank template, not in the menu).
Reuses the CSS and icons of the real estate landing pages. Scripts avoid & and < (WordPress encodes them).
Usage: python3 build_lp_debt.py [IMG_BASE]"""
import sys, json, html, pathlib, urllib.parse
HERE = pathlib.Path(__file__).parent
RE = HERE.parent / 'realestate-2026-10' / 'build_lp.py'
src = RE.read_text()
ns = {'__file__': str(RE)}
exec(src[:src.index('def page(')].replace("IMG = sys.argv[1] if len(sys.argv) > 1 else 'img/'", "IMG = ''"), ns)
CSS, I_TEL, I_WA, I_FORM, esc = ns['CSS'], ns['I_TEL'], ns['I_WA'], ns['I_FORM'], ns['esc']
PHONE, PHONE_INTL, WA, API = ns['PHONE'], ns['PHONE_INTL'], ns['WA'], ns['API']
IMG = sys.argv[1] if len(sys.argv) > 1 else '../realestate-2026-10/lp/img/'
KEY = 'debt'

WA_MSG = 'שלום, הגעתי מהמודעה. אשמח לבדיקה ראשונית בנושא חובות והוצאה לפועל.'
WA_DOCS = 'שלום, השארתי עכשיו פרטים באתר בנושא חובות. מצרף/ת פירוט תיקים מההוצאה לפועל.'
wa = f'https://wa.me/{WA}?text=' + urllib.parse.quote(WA_MSG)
wa_docs = f'https://wa.me/{WA}?text=' + urllib.parse.quote(WA_DOCS)

STATUS = ['יש תיקים פתוחים בהוצאה לפועל', 'יש עיקול על משכורת או על חשבון', 'יש חובות, עוד אין תיקים', 'יש עיכוב יציאה מהארץ או הגבלה אחרת', 'משהו אחר']
# values match the debt ranges of the office system (app/sales.js DEBT_RANGES)
DEBT = [('עד 100 אלף', 'עד 100 אלף ₪'), ('100-300 אלף', '100 עד 300 אלף ₪'), ('מעל 300 אלף', 'מעל 300 אלף ₪'), ('לא ידוע', 'לא בטוח/ה')]
TIME = ['בבוקר', 'בצהריים', 'אחר הצהריים', 'בערב']

PATHS = [('איחוד תיקים', 'כל התיקים בתיק אחד, עם צו תשלומים חודשי אחד שנקבע לפי היכולת.'),
         ('הסדר עם הנושים', 'משא ומתן על הסכום ועל פריסת התשלומים, לפעמים בלי הליך משפטי.'),
         ('חדלות פירעון', 'הליך בשלבים לפי החוק, עם תכנית פירעון, ובסופו אפשרות לצו הפטר.'),
         ('עיקולים והגבלות', 'מה מותר לעקל ומה לא, ואיך מבקשים להסיר עיקול או הגבלה כשיש עילה לכך.')]
STEPS = [('שיחה ראשונה', 'מבינים את המצב: אילו חובות, אילו תיקים, ומה הכי דחוף עכשיו.'),
         ('פירוט התיקים', 'אוספים את כל התיקים והסכומים, כדי לראות את התמונה המלאה.'),
         ('בחירת מסלול', 'מסבירים את האפשרויות שהחוק מאפשר, ומה המשמעות של כל אחת מהן.'),
         ('הגשה וטיפול', 'מכינים ומגישים את הבקשות, ומלווים מול ההוצאה לפועל או הממונה.'),
         ('ליווי עד הסוף', 'ממשיכים איתכם עד סגירת התיקים או סיום ההליך.')]
INCL = ['איסוף ופירוט של כל התיקים בהוצאה לפועל', 'בדיקת עיקולים, הגבלות ומה מותר לעקל',
        'ניסוח בקשות להוצאה לפועל, כמו איחוד תיקים וצו תשלומים', 'משא ומתן מול הנושים',
        'בקשה לחדלות פירעון וליווי לאורך ההליך', 'זמינות בטלפון ובוואטסאפ לאורך כל הטיפול']
TOOLS = [('בקשה לאיחוד תיקים', 'מכינים ומגישים בקשה לאיחוד התיקים בהוצאה לפועל, עם טופס דיגיטלי.', 'לפרטים', '/online/consolidation-of-files/'),
         ('בקשה לצו חיוב בתשלומים', 'בקשה לפרוס חוב בהוצאה לפועל לתשלומים חודשיים לפי היכולת.', 'לפרטים', '/online/payment-order/')]
FAQ = [('הפנייה דיסקרטית?', 'כן. הפרטים נשארים במשרד ומשמשים רק כדי לחזור אליכם בנוגע לפנייה.'),
       ('כמה זה עולה?', 'שכר הטרחה נקבע בהסכם כתוב מראש, לפי המסלול ולפי מורכבות המקרה. בשיחה הראשונה תדעו מה כלול.'),
       ('הליך חדלות פירעון מתאים לכל אחד?', 'לא. הוא מיועד למי שלא יכול לשלם את חובותיו בתוך זמן סביר. לפעמים איחוד תיקים או הסדר עם הנושים מתאימים יותר, ולכן מתחילים בבדיקה.'),
       ('מה קורה לתיקים בהוצאה לפועל כשנפתח הליך חדלות פירעון?', 'מרגע שניתן צו לפתיחת הליכים, הליכי הגבייה בהוצאה לפועל מעוכבים, לפי החוק.'),
       ('איך יודעים אילו תיקים פתוחים?', 'את פירוט התיקים אפשר להוציא באזור האישי באתר רשות האכיפה והגבייה. אם קשה לכם, נעשה את זה יחד.'),
       ('צריך להגיע למשרד?', 'אפשר להיפגש במשרד ברחוב רזיאל 1 בנתניה, ואפשר גם בשיחת וידאו.')]

def opts(name, items, ph):
    o = ''.join(f'<option value="{esc(x[0])}">{esc(x[1])}</option>' if isinstance(x, tuple) else f'<option>{esc(x)}</option>' for x in items)
    return f'<select name="{name}" required><option value="">{esc(ph)}</option>' + o + '</select>'

def form(fid):
    return f'''<div class="fc" id="{fid}"><h2>בדיקה ראשונית, בשיחה קצרה</h2><p class="fs">3 שאלות קצרות, ועו״ד יקיר דבול חוזר אליכם. בדרך כלל באותו יום עבודה.</p>
<form data-dlp novalidate>
<label>מה המצב היום?</label>{opts('status', STATUS, 'בחרו')}
<label>בערך כמה חובות בסך הכול?</label>{opts('debt_range', DEBT, 'בחרו')}
<label>מתי נוח שנחזור אליכם?</label>{opts('preferred_time', TIME, 'בחרו')}
<label for="{fid}-n">שם</label><input id="{fid}-n" name="name" autocomplete="name" required>
<label for="{fid}-p">טלפון</label><input id="{fid}-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="btn b-d go" type="submit">שלחו ונחזור אליכם</button><p class="msg" aria-live="polite"></p>
<p class="note">שיחה דיסקרטית. הפרטים משמשים רק כדי לחזור אליכם. המידע בעמוד כללי ואינו ייעוץ משפטי.</p></form></div>'''

EXTRA_CSS = """
.dlp .fc select{width:100%;font:inherit;font-size:17px;padding:12px 14px;border:1.5px solid #d9d2c2;border-radius:10px;background:#fffdf8;color:var(--ink);appearance:auto}
.dlp .fc .ok .wa{display:flex;margin-top:16px;background:#1f7a4d;color:#fff;border-radius:999px;min-height:50px;align-items:center;justify-content:center;gap:8px;font-weight:700;text-decoration:none;padding:0 18px}
.dlp .fc .ok small{display:block;color:var(--mut);font-size:13.5px;margin-top:10px;line-height:1.5}
"""

js = """(function(){var A='__API__';function q(k){try{return new URLSearchParams(location.search).get(k)||''}catch(e){return ''}}
var src=q('utm_source')||(q('fbclid')?'facebook':'')||'website';var camp=q('utm_campaign'),ad=q('utm_content');
function ev(n,p){try{if(window.fbq){window.fbq('track',n,p)}}catch(x){}try{if(window.gtag){window.gtag('event',n=='Lead'?'generate_lead':'contact',p)}}catch(x){}}
document.addEventListener('click',function(e){var a=e.target.closest?e.target.closest('a'):null;if(!a){return}var h=a.getAttribute('href')||'';if(h.indexOf('tel:')===0){ev('Contact',{method:'phone',page:'lp-debt'})}else if(h.indexOf('wa.me')!==-1){ev('Contact',{method:'whatsapp',page:'lp-debt'})}},true);
document.querySelectorAll('form[data-dlp]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var m=f.querySelector('.msg'),b=f.querySelector('.go'),g=function(n){var x=f.elements[n];return x?String(x.value||'').trim():''};
var tel=g('phone').replace(/[^0-9+]/g,'');
if(g('website')){return}if(!g('status')){m.textContent='בחרו מה המצב היום, בבקשה.';return}if(!(g('name').length>1)){m.textContent='כתבו שם, בבקשה.';return}if(!(tel.replace(/[^0-9]/g,'').length>8)){m.textContent='כתבו מספר טלפון תקין, בבקשה.';return}
m.textContent='';b.disabled=true;b.textContent='שולחים...';
var body={name:g('name'),phone:tel,topic:'חובות והוצאה לפועל',source:src==='facebook'?'facebook':'website',form:'lp-debt',campaign:camp||'',ad_name:ad||'',debt_range:g('debt_range'),preferred_time:g('preferred_time'),page:location.href.split('#')[0].slice(0,300),notes:'מצב: '+g('status')};
var ok=function(){var d=document.createElement('div');d.className='ok';var t=document.createElement('b');t.textContent='תודה, קיבלנו.';d.appendChild(t);
d.appendChild(document.createTextNode('עו״ד יקיר דבול יחזור אליכם'+(g('preferred_time')?' '+g('preferred_time'):' בהקדם')+'. רוצים לחסוך זמן? שלחו כבר עכשיו בוואטסאפ את פירוט התיקים.'));
var w=document.createElement('a');w.className='wa';w.href='__WADOCS__';w.target='_blank';w.rel='noopener';w.textContent='שליחת פירוט התיקים בוואטסאפ';d.appendChild(w);
var s=document.createElement('small');s.textContent='את הפירוט מוציאים באזור האישי באתר רשות האכיפה והגבייה. אין פירוט? אפשר לשלוח גם צילום של מכתב שקיבלתם. דחוף? __PHONE__';d.appendChild(s);
var p=f.parentNode;while(p.firstChild){p.removeChild(p.firstChild)}p.appendChild(d);ev('Lead',{content_name:'lp-debt'})};
var bad=function(){b.disabled=false;b.textContent='שלחו ונחזור אליכם';m.textContent='משהו השתבש. אפשר להתקשר: __PHONE__'};
fetch(A,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){if(j){if(j.ok){ok()}else{bad()}}else{bad()}}).catch(bad)})})})();"""
js = js.replace('__API__', API).replace('__WADOCS__', wa_docs).replace('__PHONE__', PHONE)
assert '&' not in js and '<' not in js

px = "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','2010050569657680');fbq('track','PageView');fbq('track','ViewContent',{content_name:'lp-debt'});"
assert '&' not in px and '<' not in px

paths = ''.join(f'<div class="risk"><div class="n">{i+1}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i, (t, d) in enumerate(PATHS))
steps = ''.join(f'<li><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for t, d in STEPS)
incl = ''.join(f'<li>{esc(x)}</li>' for x in INCL)
tools = ''.join(f'<a class="tool" href="https://dabullaw.co.il{u}"><div><b>{esc(t)}</b><span>{esc(d)}</span></div><em>{esc(c)} ←</em></a>' for t, d, c, u in TOOLS)
faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ)
ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
ldj = json.dumps(ld, ensure_ascii=False)
assert '&' not in ldj and '<' not in ldj

body = f'''<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&display=swap">
<style>{CSS.replace('__IMG__', IMG)}{EXTRA_CSS}</style>
<div class="dlp">
<header class="hero"><div class="w top" style="display:flex;padding-block:22px 0"><a class="logo" href="https://dabullaw.co.il/">יקיר דבול<small>משרד עורכי דין</small></a><a class="tel" href="tel:{PHONE_INTL}">{PHONE}</a></div>
<div class="w"><div><span class="kick">חובות, הוצאה לפועל וחדלות פירעון · נתניה והסביבה</span><h1>תיקים בהוצאה לפועל?<br><em>עושים סדר</em>, צעד אחרי צעד.</h1>
<p class="sub">עו״ד יקיר דבול בודק איתכם את התמונה המלאה: אילו תיקים פתוחים, מה מותר לעקל, ואיזה מסלול שהחוק מאפשר מתאים לכם. איחוד תיקים, הסדר עם הנושים או הליך חדלות פירעון.</p>
<div class="ctas"><a class="btn b-g" href="tel:{PHONE_INTL}">{I_TEL}להתקשר עכשיו</a><a class="btn b-o" href="{esc(wa)}">{I_WA}לכתוב בוואטסאפ</a></div>
<div class="proof"><span><i></i>שיחה דיסקרטית</span><span><i></i>עורך הדין עצמו מטפל בתיק</span><span><i></i>משרד ברחוב רזיאל 1, נתניה</span></div></div>
{form('f1')}</div></header>
<div class="trust"><div class="w"><div><b>דיסקרטי</b><span>הפרטים נשארים במשרד</span></div><div><b>1 על 1</b><span>מול עורך הדין, מהשיחה הראשונה</span></div><div><b>חבר ועדה</b><span>בוועדת חדלות פירעון והוצאה לפועל בלשכת עורכי הדין</span></div><div><b>באותו יום</b><span>בדרך כלל חוזרים אליכם באותו יום עבודה</span></div></div></div>
<section class="s"><div class="w"><p class="eyebrow">מה אפשר לעשות</p><h2 class="st">ארבעה מסלולים שהחוק מאפשר</h2><p class="ss">לא כל מסלול מתאים לכל מצב. לכן מתחילים בבדיקה, ורק אחריה מחליטים.</p><div class="risks">{paths}</div></div></section>
<section class="s steps-s"><div class="w"><p class="eyebrow">התהליך</p><h2 class="st">איך נראה הטיפול, שלב אחרי שלב</h2><ol class="steps">{steps}</ol></div></section>
<section class="s"><div class="w two"><div><p class="eyebrow">מה כולל הטיפול</p><h2 class="st">הכל במקום אחד, מול עורך דין אחד</h2><ul class="incl">{incl}</ul></div>
<div class="about"><div class="ph"><img src="{IMG}yakir-cutout.webp" alt="עו&quot;ד יקיר דבול" width="200" height="399"></div><div class="tx"><h3>עו"ד יקיר דבול</h3><p class="role">עורך דין, נתניה</p><p>את התיק מנהל עורך הדין עצמו, ואיתו אתם מדברים בכל שלב. בלי שיפוטיות, ובשפה פשוטה.</p>
<ul><li>חבר בוועדת חדלות פירעון והוצאה לפועל בלשכת עורכי הדין</li><li>משרד ברחוב רזיאל 1, נתניה</li><li>פגישה במשרד או בשיחת וידאו</li></ul></div></div></div></section>
<section class="s" style="padding-top:0"><div class="w"><p class="eyebrow">אפשר גם אונליין</p><h2 class="st" style="font-size:clamp(26px,3vw,34px)">בקשות להוצאה לפועל, מהטלפון</h2><div class="tools">{tools}</div></div></section>
<section class="s steps-s"><div class="w"><p class="eyebrow">שאלות נפוצות</p><h2 class="st">מה שואלים אותנו לפני שמתחילים</h2><div class="faq">{faq}</div></div></section>
<section class="s final" id="contact"><div class="w"><div><h2 class="st">בואו נעשה סדר</h2><p class="ss">שיחה ראשונה קצרה ודיסקרטית. נבין את המצב ונגיד לכם מה השלב הבא.</p>
<div class="ctas"><a class="btn b-g" href="tel:{PHONE_INTL}">{I_TEL}<span dir="ltr">{PHONE}</span></a><a class="btn b-o" href="{esc(wa)}">{I_WA}וואטסאפ</a></div><p class="addr">יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה · ימים א' עד ה'</p></div>
{form('f2')}</div></section>
<div class="foot">© יקיר דבול - משרד עורכי דין · <a href="https://dabullaw.co.il/">dabullaw.co.il</a><br>המידע בעמוד הוא מידע כללי ואינו מהווה ייעוץ משפטי. כל מקרה נבדק לגופו.</div>
<nav class="bar" aria-label="יצירת קשר"><a href="tel:{PHONE_INTL}">{I_TEL}התקשרו</a><a href="{esc(wa)}">{I_WA}וואטסאפ</a><a class="m" href="#f1">{I_FORM}בדיקה ראשונית</a></nav>
</div>
<script type="application/ld+json">{ldj}</script>
<script nowprocket data-no-optimize="1" data-no-minify="1">{px}</script>
<script nowprocket data-no-optimize="1">{js}</script>'''

out = HERE / 'lp'; out.mkdir(exist_ok=True)
(out / 'debt.fragment.html').write_text(body)
fonts = '../../../docs/buyer-checklist/fonts/'
prev = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>חובות</title>
<style>@font-face{{font-family:Heebo;src:url({fonts}heebo-hebrew-400-normal.woff2);font-weight:400}}@font-face{{font-family:Heebo;src:url({fonts}heebo-hebrew-300-normal.woff2);font-weight:300}}@font-face{{font-family:Heebo;src:url({fonts}heebo-hebrew-500-normal.woff2);font-weight:500}}@font-face{{font-family:Heebo;src:url({fonts}heebo-hebrew-700-normal.woff2);font-weight:700}}@font-face{{font-family:'Frank Ruhl Libre';src:url({fonts}frank-ruhl-libre-hebrew-700-normal.woff2);font-weight:700}}
body{{margin:0;font-family:Heebo,Arial,sans-serif}}</style></head><body>{body}</body></html>'''
(out / 'debt.preview.html').write_text(prev)
print('ok', len(body))
