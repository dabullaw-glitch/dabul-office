# lp-debt v2 (Yakir approved 21.10.2026): short form, the form first, phone less prominent.
# Reads live-before.html (the page as it is on the site), writes live-after.html (to publish) and preview.html (sketch).
import re, sys
r = open('live-before.html', encoding='utf-8').read()
n0 = len(r)

def sub1(old, new, s, count=1):
    c = s.count(old)
    if c != count:
        sys.exit(f'expected {count} of {old[:60]!r}, found {c}')
    return s.replace(old, new)

# 1) both forms: drop "what is the situation" and "when to call back"; name, phone, then debt range as optional chips
STATUS = re.compile(r'<label>מה המצב היום\?</label><select name="status" required>.*?</select>\n', re.S)
ROW2 = re.compile(r'<div class="row2"><div><label>בערך כמה חובות\?</label><select name="debt_range">.*?</select></div><div><label>מתי נוח לחזור\?</label><select name="preferred_time">.*?</select></div></div>\n', re.S)
if len(STATUS.findall(r)) != 2 or len(ROW2.findall(r)) != 2: sys.exit('form parts not found twice')
r = STATUS.sub('', r)
r = ROW2.sub('', r)
CHIPS = ('<label class="opt">בערך כמה חובות? <span>(לא חובה)</span></label><div class="chips" role="radiogroup">'
         '<label><input type="radio" name="debt_range" value="עד 100 אלף"><span>עד 100 אלף ₪</span></label>'
         '<label><input type="radio" name="debt_range" value="100-300 אלף"><span>100 עד 300 אלף ₪</span></label>'
         '<label><input type="radio" name="debt_range" value="מעל 300 אלף"><span>מעל 300 אלף ₪</span></label>'
         '<label><input type="radio" name="debt_range" value="לא ידוע"><span>לא בטוח/ה</span></label></div>\n')
r = re.sub(r'(<label for="f(\d)-p">טלפון</label><input id="f\2-p"[^>]*>\n)', lambda m: m.group(1) + CHIPS, r)
if r.count('class="chips"') != 2: sys.exit('chips not added twice')
r = sub1('<p class="fs">3 שאלות קצרות, ועו״ד יקיר דבול חוזר אליכם. בדרך כלל באותו יום עבודה.</p>',
         '<p class="fs">רק שם וטלפון, ועו״ד יקיר דבול חוזר אליכם. בדרך כלל באותו יום עבודה.</p>', r)

# 2) hero: the gold button leads to the form; the phone stays as a small line under it
hero_ctas = re.search(r'<div class="ctas"><a class="btn b-g" href="tel:\+97298613413">.*?להתקשר עכשיו</a><a class="btn b-o" href="https://wa\.me/[^"]*">.*?לכתוב בוואטסאפ</a></div>', r, re.S)
if not hero_ctas: sys.exit('hero ctas not found')
FORM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'
r = r.replace(hero_ctas.group(0),
    '<div class="ctas"><a class="btn b-g" href="#f1">' + FORM_ICON + 'השאירו פרטים לבדיקה</a></div>'
    '<p class="alt">מעדיפים לדבר? <a href="tel:+97298613413" dir="ltr">09-8613413</a></p>')

# 3) phone bottom bar: one wide button to the form, the phone as a small icon
bar = re.search(r'<nav class="bar" aria-label="יצירת קשר">.*?</nav>', r, re.S)
if not bar: sys.exit('bar not found')
PHONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
r = r.replace(bar.group(0),
    '<nav class="bar" aria-label="יצירת קשר"><a class="m" href="#f1">' + FORM_ICON + 'השאירו פרטים ונחזור אליכם</a>'
    '<a class="t" href="tel:+97298613413" aria-label="להתקשר למשרד">' + PHONE_ICON + '</a></nav>')

# 4) styles for the chips, the small phone line and the new bar (added at the end of the page's style block)
CSS = '''
/* v2 21.10.2026: short form */
.dlp .fc label.opt{margin-top:14px}
.dlp .fc label.opt span{font-weight:400;color:var(--mut);font-size:13px}
.dlp .fc .chips{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dlp .fc .chips label{margin:0;position:relative;display:flex;align-items:center;justify-content:center;text-align:center;min-height:46px;border:1.5px solid #d9d2c2;border-radius:10px;padding:8px;cursor:pointer;font-size:15px;font-weight:500;background:#fffdf8}
.dlp .fc .chips input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
.dlp .fc .chips label:has(input:checked){background:var(--g2);border-color:var(--g);box-shadow:0 0 0 2px rgba(201,168,92,.25)}
.dlp .alt{margin-top:12px;font-size:15px;color:#cfc8b8}
.dlp .alt a{color:var(--g1);font-weight:700;text-decoration:none}
@media (max-width:640px){
  .dlp .alt{display:none}
 .dlp .bar{grid-template-columns:minmax(0,1fr) 56px}
 .dlp .bar a.m{flex-direction:row;gap:8px;font-size:16px;min-height:48px;justify-content:center}
 .dlp .bar a.t{justify-content:center;border:1px solid rgba(201,168,92,.45)}
}
</style>'''
k = r.index('</style>')
r = r[:k] + CSS + r[k + len('</style>'):]

# 5) the script: no "situation" question any more; debt range from the chips; the thank-you line without a time
js_old = "if(g('website')){return}if(!g('status')){m.textContent='בחרו מה המצב היום, בבקשה.';return}"
r = sub1(js_old, "if(g('website')){return}", r)
r = sub1("var m=f.querySelector('.msg'),b=f.querySelector('.go'),g=function(n){var x=f.elements[n];return x?String(x.value||'').trim():''};",
         "var m=f.querySelector('.msg'),b=f.querySelector('.go'),g=function(n){var x=f.elements[n];if(x&&x.length!==undefined&&!x.tagName){for(var i=0;i<x.length;i++){if(x[i].checked){return String(x[i].value||'').trim()}}return ''}return x?String(x.value||'').trim():''};", r)
r = sub1(",notes:'מצב: '+g('status')};", ",notes:g('debt_range')?'גובה חובות: '+g('debt_range'):'השאיר שם וטלפון בלבד'};", r)
# note: the form posts to the same office lead function, with the same Lead event and value as before

open('live-after.html', 'w', encoding='utf-8').write(r)
body = r.replace('<!-- wp:html -->', '').replace('<!-- /wp:html -->', '')
open('preview.html', 'w', encoding='utf-8').write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>lp-debt v2</title><style>body{margin:0}</style></head><body>' + body + '</body></html>')
print('ok', n0, len(r))
