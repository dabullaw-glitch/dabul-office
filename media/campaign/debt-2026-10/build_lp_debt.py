#!/usr/bin/env python3
"""Debt / enforcement / insolvency landing page for the Meta campaign. Version 2 (16.10.2026): conversion focused,
with Google reviews and press coverage. Hidden page lp-debt on dabullaw.co.il (noindex by snippet 60, blank template).
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
IMG = sys.argv[1] if len(sys.argv) > 1 else '../../realestate-2026-10/lp/img/'

WA_MSG = 'שלום, הגעתי מהמודעה. אשמח לבדיקה ראשונית בנושא חובות והוצאה לפועל.'
WA_DOCS = 'שלום, השארתי עכשיו פרטים באתר בנושא חובות. מצרף/ת פירוט תיקים מההוצאה לפועל.'
wa = f'https://wa.me/{WA}?text=' + urllib.parse.quote(WA_MSG)
wa_docs = f'https://wa.me/{WA}?text=' + urllib.parse.quote(WA_DOCS)
GOOGLE_REVIEWS = 'https://search.google.com/local/reviews?placeid=ChIJFyPNpLBBHRURR161JAMeBb0'
RATING, RCOUNT = '4.9', '73'

STATUS = ['יש תיקים פתוחים בהוצאה לפועל', 'יש עיקול על משכורת או על חשבון', 'יש חובות, עוד אין תיקים', 'יש עיכוב יציאה מהארץ או הגבלה אחרת', 'משהו אחר']
# values match the debt ranges of the office system (app/sales.js DEBT_RANGES)
DEBT = [('עד 100 אלף', 'עד 100 אלף ₪'), ('100-300 אלף', '100 עד 300 אלף ₪'), ('מעל 300 אלף', 'מעל 300 אלף ₪'), ('לא ידוע', 'לא בטוח/ה')]
TIME = ['בבוקר', 'בצהריים', 'אחר הצהריים', 'בערב']

PAINS = ['מכתבים מההוצאה לפועל שכבר מפחדים לפתוח', 'עיקול על המשכורת או על חשבון הבנק',
         'עיכוב יציאה מהארץ או הגבלה אחרת', 'כמה תיקים אצל כמה נושים, ואין תמונה ברורה',
         'החוב רק גדל מחודש לחודש, בגלל ריבית והוצאות', 'טלפונים מנושים ומשרדי גבייה']
PATHS = [('איחוד תיקים', 'כל התיקים בתיק אחד, עם צו תשלומים חודשי אחד לפי היכולת.'),
         ('הסדר עם הנושים', 'משא ומתן על הסכום ועל פריסת התשלומים, לפעמים בלי הליך משפטי.'),
         ('חדלות פירעון', 'הליך לפי החוק, עם תכנית פירעון, ובסופו אפשרות לצו הפטר.'),
         ('הסרת עיקולים והגבלות', 'בודקים מה מותר לעקל, ומבקשים להסיר עיקול או הגבלה כשיש עילה לכך.')]
STEPS = [('שיחה ראשונה, דיסקרטית', 'מספרים לנו מה המצב. בלי שיפוטיות ובשפה פשוטה.'),
         ('תמונה מלאה ומסלול', 'אוספים את כל התיקים והסכומים, ומסבירים אילו דרכים החוק מאפשר במקרה שלכם.'),
         ('הגשה וליווי עד הסוף', 'מכינים ומגישים את הבקשות, ומלווים אתכם מול ההוצאה לפועל או הממונה עד סיום ההליך.')]
# Real Google reviews (site/reviews, trustindex 11.10.2026). Short excerpts, verbatim. Names shortened.
REVIEWS = [('ר', 'רומיאו נ.', 'הוציא אותי מהבור הגדול ביותר שהייתי בו בחיי, ממליץ בחום לכל מי ששוקל לבקש שירות'),
           ('G', 'Glemm D.', 'מה שאהבתי במיוחד בעבודה מול עו״ד יקיר דבול זה השקיפות והזמינות... יקיר מעדכן אותך בכל התפתחות בוואטסאפ או בטלפון'),
           ('א', 'אורלי א.', 'עבודתו מצטיינת באדיבות יושרה ונכונות לסייע'),
           ('ע', 'עידו ב.', 'יקיר פישט לנו את הכל, תרגם את המושגים המשפטיים המסובכים לשפה יומיומית וליווה אותנו צעד אחר צעד')]
# Press items from the site category "המשרד בתקשורת" (category 50), debt related first
PRESS = [('ynet', 'נדחה אב ל-10 שלא עובד וביקש פטור מחובות', 'https://www.ynet.co.il/articles/0,7340,L-5914748,00.html'),
         ('mako', 'תכנית שיקום: דירת בני זוג תימכר, יקבלו דיור חלופי לשלוש שנים', 'https://www.mako.co.il/finances-law/law-general/Article-8548995094e1871026.htm'),
         ('ynet', 'נעצר בנתב״ג בגלל חוב מזונות בן 30 שנה', 'https://www.ynet.co.il/articles/0,7340,L-5982010,00.html'),
         ('פסקדין', 'שופטת סירבה לתת הפטר לאב לעשרה: ״התנהגות כלכלית חסרת אחריות״', 'https://www.psakdin.co.il/Document/%D7%A9%D7%95%D7%A4%D7%98%D7%AA-%D7%A1%D7%99%D7%A8%D7%91%D7%94-%D7%9C%D7%AA%D7%AA-%D7%94%D7%A4%D7%98%D7%A8-%D7%9C%D7%90%D7%91-%D7%9C%D7%A2%D7%A9%D7%A8%D7%94-%D7%B4%D7%94%D7%AA%D7%A0%D7%94%D7%92%D7%95%D7%AA-%D7%9B%D7%9C%D7%9B%D7%9C%D7%99%D7%AA-%D7%97%D7%A1%D7%A8%D7%AA-%D7%90%D7%97%D7%A8%D7%99%D7%95%D7%AA%D7%B4')]
OUTLETS = ['ynet', 'mako', 'ערוץ 13', 'ישראל היום', 'מעריב', 'וואלה', 'ביזפורטל', 'ערוץ 7']
FAQ = [('הפנייה דיסקרטית?', 'כן. הפרטים נשארים במשרד ומשמשים רק כדי לחזור אליכם בנוגע לפנייה.'),
       ('כמה זה עולה?', 'שכר הטרחה נקבע בהסכם כתוב מראש, לפי המסלול ולפי מורכבות המקרה. בשיחה הראשונה תדעו מה כלול.'),
       ('הליך חדלות פירעון מתאים לכל אחד?', 'לא. הוא מיועד למי שלא יכול לשלם את חובותיו בתוך זמן סביר. לפעמים איחוד תיקים או הסדר עם הנושים מתאימים יותר, ולכן מתחילים בבדיקה.'),
       ('צריך להגיע למשרד?', 'אפשר להיפגש במשרד ברחוב רזיאל 1 בנתניה, ואפשר גם בשיחת וידאו.')]

I_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3 6.1 20.5l1.3-6.5L2.5 9.4l6.6-.8z"/></svg>'
STARS = f'<span class="stars" aria-label="5 כוכבים">{I_STAR * 5}</span>'
I_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
I_G = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>'

def opts(name, items, ph, req=False):
    o = ''.join(f'<option value="{esc(x[0])}">{esc(x[1])}</option>' if isinstance(x, tuple) else f'<option>{esc(x)}</option>' for x in items)
    return f'<select name="{name}"{" required" if req else ""}><option value="">{esc(ph)}</option>' + o + '</select>'

def form(fid, title, sub):
    return f'''<div class="fc" id="{fid}"><h2>{esc(title)}</h2><p class="fs">{esc(sub)}</p>
<form data-dlp novalidate>
<label>מה המצב היום?</label>{opts('status', STATUS, 'בחרו', True)}
<div class="row2"><div><label>בערך כמה חובות?</label>{opts('debt_range', DEBT, 'בחרו')}</div><div><label>מתי נוח לחזור?</label>{opts('preferred_time', TIME, 'בחרו')}</div></div>
<label for="{fid}-n">שם</label><input id="{fid}-n" name="name" autocomplete="name" required>
<label for="{fid}-p">טלפון</label><input id="{fid}-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="btn b-d go" type="submit">שיחזרו אליי לבדיקה</button><p class="msg" aria-live="polite"></p>
<p class="lock">{I_LOCK}שיחה דיסקרטית. הפרטים נשארים במשרד.</p>
<div class="fr">{STARS}<span><b>{RATING}</b> · {RCOUNT} ביקורות בגוגל</span></div></form></div>'''

EXTRA_CSS = """
.dlp .fc select{width:100%;font:inherit;font-size:16px;padding:12px 12px;border:1.5px solid #d9d2c2;border-radius:10px;background:#fffdf8;color:var(--ink);appearance:auto}
.dlp .fc .row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
.dlp .fc .go{background:var(--g);color:#14130f;font-size:18px;min-height:56px;box-shadow:0 8px 22px rgba(140,118,70,.35)}
.dlp .fc .go:hover{background:var(--g1)}
.dlp .fc .lock{display:flex;gap:7px;align-items:center;justify-content:center;font-size:13.5px;color:var(--mut);margin-top:12px}
.dlp .fc .lock svg{width:15px;height:15px;flex:none;color:var(--gd)}
.dlp .fc .fr{display:flex;gap:8px;align-items:center;justify-content:center;border-top:1px solid var(--line);margin-top:14px;padding-top:12px;font-size:14px;color:var(--mut)}
.dlp .fc .fr b{color:var(--ink)}
.dlp .fc .ok .wa{display:flex;margin-top:16px;background:#1f7a4d;color:#fff;border-radius:999px;min-height:50px;align-items:center;justify-content:center;gap:8px;font-weight:700;text-decoration:none;padding:0 18px}
.dlp .fc .ok small{display:block;color:var(--mut);font-size:13.5px;margin-top:10px;line-height:1.5}
.dlp .stars{display:inline-flex;gap:1px;color:#f2b33d;vertical-align:-2px}
.dlp .stars svg{width:16px;height:16px}
/* hero social proof */
.dlp .hp-proof{display:flex;flex-wrap:wrap;gap:12px 26px;margin-top:26px;align-items:center}
.dlp .hp-proof .rt{display:flex;gap:10px;align-items:center;color:#eee7d6;font-size:15px}
.dlp .hp-proof .rt b{font-size:22px;color:#fff;font-family:'Frank Ruhl Libre',Georgia,serif}
.dlp .hp-proof .gi{width:26px;height:26px;background:#fff;border-radius:50%;display:grid;place-items:center}
.dlp .hp-proof .gi svg{width:17px;height:17px}
.dlp .hp-proof .tv{font-size:14.5px;color:#cfc8b8}
.dlp .hp-proof .tv b{color:var(--g1);font-weight:700}
/* press strip */
.dlp .press{background:#fff;border-bottom:1px solid var(--line)}
.dlp .press .w{display:flex;gap:14px 34px;align-items:center;justify-content:center;flex-wrap:wrap;padding-block:20px}
.dlp .press .lb{font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--mut)}
.dlp .press .o{font-weight:700;font-size:19px;color:#3a3833;opacity:.78;white-space:nowrap}
/* pains */
.dlp .pains{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:30px;list-style:none}
.dlp .pains li{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px;display:flex;gap:12px;align-items:flex-start;font-size:16.5px;font-weight:500}
.dlp .pains li:before{content:"";flex:none;width:10px;height:10px;margin-top:8px;border-radius:50%;background:#b5483b;box-shadow:0 0 0 4px rgba(181,72,59,.12)}
.dlp .bridge{margin-top:30px;background:var(--d);color:#eee7d6;border-radius:16px;padding:24px 26px;display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.dlp .bridge p{font-size:18px;max-width:640px}
.dlp .bridge b{color:var(--g1)}
/* paths compact */
.dlp .risks.p4 .risk{padding:20px 20px}
/* reviews */
.dlp .rv-s{background:var(--g2)}
.dlp .rv-head{display:flex;gap:20px 40px;align-items:end;justify-content:space-between;flex-wrap:wrap}
.dlp .rv-score{display:flex;gap:14px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px}
.dlp .rv-score .big{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:42px;font-weight:700;line-height:1}
.dlp .rv-score small{display:block;color:var(--mut);font-size:13.5px;margin-top:2px}
.dlp .rv-score .gi{width:34px;height:34px}
.dlp .rv-score .gi svg{width:34px;height:34px}
.dlp .rvs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:30px}
.dlp .rv{margin:0;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px 20px 18px;display:flex;flex-direction:column;gap:12px}
.dlp .rv q{font-size:16px;line-height:1.6;quotes:"״" "״";flex:1}
.dlp .rv .who{display:flex;gap:10px;align-items:center;font-size:14.5px;font-weight:700}
.dlp .rv .av{width:36px;height:36px;border-radius:50%;background:var(--d);color:var(--g);display:grid;place-items:center;font-family:'Frank Ruhl Libre',Georgia,serif;font-size:17px;flex:none}
.dlp .rv .who small{display:block;font-weight:400;color:var(--mut);font-size:12.5px}
.dlp .rv-more{margin-top:20px;font-size:15px}
.dlp .rv-more a{color:var(--gd);font-weight:700}
/* press cards */
.dlp .pcs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:30px}
.dlp .pc{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid var(--line);border-top:3px solid var(--g);border-radius:12px;padding:18px 18px 16px;text-decoration:none}
.dlp .pc .src{font-weight:800;font-size:18px;color:#24221e}
.dlp .pc .hd{font-size:15.5px;line-height:1.5;flex:1}
.dlp .pc em{font-style:normal;font-size:13.5px;font-weight:700;color:var(--gd)}
/* steps 3 */
.dlp .steps.s3{grid-template-columns:repeat(3,minmax(0,1fr))}
.dlp .mid-cta{display:flex;justify-content:center;margin-top:36px}
@media (max-width:980px){
 .dlp .pains{grid-template-columns:1fr 1fr}
 .dlp .rvs,.dlp .pcs{grid-template-columns:1fr 1fr}
 .dlp .steps.s3{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:640px){
 .dlp .hero .sub{font-size:16.5px;margin-top:14px}
 .dlp .hero .ctas{display:none}
 .dlp .hp-proof{margin-top:18px;gap:10px 18px}
 .dlp .press .w{gap:10px 20px;padding-block:16px}
 .dlp .press .lb{flex:1 1 100%;text-align:center}
 .dlp .press .o{font-size:16px}
 .dlp .pains,.dlp .rvs,.dlp .pcs{grid-template-columns:minmax(0,1fr)}
 .dlp .bridge{padding:20px}
 .dlp .bridge .btn{flex:1 1 100%}
 .dlp .fc .row2{grid-template-columns:minmax(0,1fr)}
 .dlp .rvs{gap:12px}
 .dlp .rv-head{align-items:flex-start}
}
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
var p=f.parentNode;while(p.firstChild){p.removeChild(p.firstChild)}p.appendChild(d);(function(){var dr=g('debt_range'),V=dr==='מעל 300 אלף'?30000:dr==='100-300 אלף'?10000:dr==='עד 100 אלף'?3000:5000;ev('Lead',{content_name:'lp-debt',value:V,currency:'ILS'});try{if(window.fbq&&V>=10000){window.fbq('trackCustom','LeadHighValue',{value:V,currency:'ILS',content_name:'lp-debt'})}}catch(x){}})()};
var bad=function(){b.disabled=false;b.textContent='שיחזרו אליי לבדיקה';m.textContent='משהו השתבש. אפשר להתקשר: __PHONE__'};
fetch(A,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){if(j){if(j.ok){ok()}else{bad()}}else{bad()}}).catch(bad)})})})();"""
js = js.replace('__API__', API).replace('__WADOCS__', wa_docs).replace('__PHONE__', PHONE)
assert '&' not in js and '<' not in js

px = "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','2010050569657680');fbq('init','1836257987088375');fbq('track','PageView');fbq('track','ViewContent',{content_name:'lp-debt'});"
assert '&' not in px and '<' not in px

pains = ''.join(f'<li>{esc(x)}</li>' for x in PAINS)
paths = ''.join(f'<div class="risk"><div class="n">{i+1}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i, (t, d) in enumerate(PATHS))
steps = ''.join(f'<li><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for t, d in STEPS)
reviews = ''.join(f'<figure class="rv">{STARS}<q>{esc(t)}</q><figcaption class="who"><span class="av">{esc(a)}</span><span>{esc(n)}<small>ביקורת בגוגל</small></span></figcaption></figure>' for a, n, t in REVIEWS)
press = ''.join(f'<a class="pc" href="{esc(u)}" target="_blank" rel="noopener"><span class="src">{esc(s)}</span><span class="hd">{esc(h)}</span><em>לכתבה ←</em></a>' for s, h, u in PRESS)
outlets = ''.join(f'<span class="o">{esc(o)}</span>' for o in OUTLETS)
faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ)
ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
ldj = json.dumps(ld, ensure_ascii=False)
assert '&' not in ldj and '<' not in ldj
GI = f'<span class="gi">{I_G}</span>'

body = f'''<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&display=swap">
<style>{CSS.replace('__IMG__', IMG)}{EXTRA_CSS}</style>
<div class="dlp">
<header class="hero"><div class="w top" style="display:flex;padding-block:22px 0"><a class="logo" href="https://dabullaw.co.il/">יקיר דבול<small>משרד עורכי דין</small></a><a class="tel" href="tel:{PHONE_INTL}">{PHONE}</a></div>
<div class="w"><div><span class="kick">חובות, הוצאה לפועל וחדלות פירעון · נתניה והסביבה</span><h1>חובות בהוצאה לפועל?<br><em>בואו נעשה סדר</em>, צעד אחרי צעד.</h1>
<p class="sub">שיחה דיסקרטית עם עו״ד יקיר דבול: נבין אילו תיקים פתוחים, מה מותר לעקל, ואיזה מסלול מתאים לכם. איחוד תיקים, הסדר עם הנושים או חדלות פירעון.</p>
<div class="hp-proof"><div class="rt">{GI}<b>{RATING}</b>{STARS}<span>{RCOUNT} ביקורות בגוגל</span></div><div class="tv">כתבו עלינו: <b>ynet · mako · ערוץ 13 · ישראל היום</b></div></div>
<div class="ctas"><a class="btn b-g" href="tel:{PHONE_INTL}">{I_TEL}להתקשר עכשיו</a><a class="btn b-o" href="{esc(wa)}">{I_WA}לכתוב בוואטסאפ</a></div></div>
{form('f1', 'בדיקה ראשונית, דיסקרטית', '3 שאלות קצרות, ועו״ד יקיר דבול חוזר אליכם. בדרך כלל באותו יום עבודה.')}</div></header>
<div class="press"><div class="w"><span class="lb">המשרד בתקשורת</span>{outlets}</div></div>
<section class="s"><div class="w"><p class="eyebrow">מכירים את זה?</p><h2 class="st">כשהחובות מתחילים לנהל אתכם</h2><ul class="pains">{pains}</ul>
<div class="bridge"><p><b>יש מה לעשות.</b> החוק מאפשר כמה דרכים לעשות סדר בחובות. בהוצאה לפועל החוב ממשיך לצבור ריבית והוצאות, ולכן כדאי לבדוק מוקדם.</p><a class="btn b-g" href="#f1">{I_FORM}לבדיקה ראשונית</a></div></div></section>
<section class="s" style="padding-top:0"><div class="w"><p class="eyebrow">מה אפשר לעשות</p><h2 class="st">ארבע דרכים שהחוק מאפשר</h2><p class="ss">לא כל דרך מתאימה לכל מצב. לכן מתחילים בבדיקה, ורק אחריה מחליטים.</p><div class="risks p4">{paths}</div></div></section>
<section class="s rv-s"><div class="w"><div class="rv-head"><div><p class="eyebrow">המלצות</p><h2 class="st">מה לקוחות כותבים עלינו</h2></div>
<div class="rv-score">{GI}<div><span class="big">{RATING}</span></div><div>{STARS}<small>{RCOUNT} ביקורות בגוגל</small></div></div></div>
<div class="rvs">{reviews}</div><p class="rv-more"><a href="{esc(GOOGLE_REVIEWS)}" target="_blank" rel="noopener">לכל הביקורות בגוגל ←</a></p></div></section>
<section class="s"><div class="w"><p class="eyebrow">בתקשורת</p><h2 class="st">כתבות על חובות וחדלות פירעון</h2><p class="ss">מתוך הכתבות שבהן המשרד הופיע.</p><div class="pcs">{press}</div></div></section>
<section class="s steps-s"><div class="w"><p class="eyebrow">איך מתחילים</p><h2 class="st">שלושה שלבים, מול עורך דין אחד</h2><ol class="steps s3">{steps}</ol>
<div class="mid-cta"><a class="btn b-d" href="#f1">{I_FORM}אני רוצה בדיקה ראשונית</a></div></div></section>
<section class="s"><div class="w two"><div class="about"><div class="ph"><img src="{IMG}yakir-cutout.webp" alt="עו&quot;ד יקיר דבול" width="200" height="399"></div><div class="tx"><h3>עו"ד יקיר דבול</h3><p class="role">יקיר דבול - משרד עורכי דין, נתניה</p><p>את התיק מנהל עורך הדין עצמו, ואיתו אתם מדברים בכל שלב. בלי שיפוטיות, ובשפה פשוטה.</p>
<ul><li>חבר בוועדת חדלות פירעון והוצאה לפועל בלשכת עורכי הדין</li><li>זמין בטלפון ובוואטסאפ לאורך כל הטיפול</li><li>פגישה במשרד ברזיאל 1 או בשיחת וידאו</li></ul></div></div>
<div><p class="eyebrow">שאלות נפוצות</p><h2 class="st">לפני שמתחילים</h2><div class="faq">{faq}</div></div></div></section>
<section class="s final" id="contact"><div class="w"><div><h2 class="st">בואו נעשה סדר</h2><p class="ss">שיחה ראשונה קצרה ודיסקרטית. נבין את המצב ונגיד לכם מה השלב הבא.</p>
<div class="ctas"><a class="btn b-g" href="tel:{PHONE_INTL}">{I_TEL}<span dir="ltr">{PHONE}</span></a><a class="btn b-o" href="{esc(wa)}">{I_WA}וואטסאפ</a></div><p class="addr">יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה · ימים א' עד ה'</p></div>
{form('f2', 'השאירו פרטים', 'עו״ד יקיר דבול חוזר אליכם, בדרך כלל באותו יום עבודה.')}</div></section>
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
