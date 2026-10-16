"""Builds the service page "עורך דין לוועד בית ולנציגות בית משותף" (approved by Yakir 16.10.2026).
Uses the article template styles (lvbl) taken from 3611-pirok.html, plus a small "vb" block for the chips and service cards.
Output: vaad-bayit.html (post content) and vaad-bayit.json (payload for WordPress)."""
import json, re, hashlib, urllib.parse as up
from pathlib import Path

HERE = Path(__file__).parent
SITE = 'https://dabullaw.co.il/'
SLUG = 'עורך-דין-לוועד-בית'
URL = SITE + up.quote(SLUG).lower() + '/'
def u(slug): return SITE + up.quote(slug).lower() + '/'

L_DUES = SITE + 'neighbor-refuses-house-committee-dues-guide/'
L_ELECT = SITE + 'house-committee-election-guide/'
L_MAFKEAH = u('סכסוכי-שכנים-ובית-משותף-מפקח-רכוש-משות')
L_RENEW = u('נציגות-דיירים-במתחם-התחדשות-עירונית-2')
L_TAKANON = u('תשריט-ותקנון-בית-משותף-2')
L_CONTACT = u('צרו-קשר')

TITLE = 'עורך דין לוועד בית ולנציגות בית משותף'
SEO_TITLE = 'עורך דין לוועד בית ולנציגות בית משותף | יקיר דבול - משרד עורכי דין'
SEO_DESC = 'ליווי משפטי לוועד בית ולנציגות: גבייה מדייר שלא משלם, תביעה למפקח על רישום המקרקעין, אסיפות ופרוטוקולים, תקנון מוסכם וחוזים עם ספקים.'
FOCUS = 'עורך דין לוועד בית'

src = (HERE / '3611-pirok.html').read_text(encoding='utf-8')
LVBL = re.findall(r'<style[^>]*>.*?</style>', src, re.S)[0]
assert 'lvbl-article' in LVBL

VB = ('<style>.vb{--gold:#a8873f;--gold2:#8a6d2c;--gold3:#e4d19c;--ink:#1c1b19;--mut:#5f5a50;--line:#e4ded0;--soft:#f3ead3;color:var(--ink);margin:22px 0;font-size:16px;line-height:1.7}'
      ' .vb *{box-sizing:border-box} .vb .chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}'
      ' .vb .chips div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.45}'
      ' .vb .chips b{display:block;font-size:17px}'
      ' .vb .cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}'
      ' .vb .card{background:#fff;border:1.5px solid var(--line);border-radius:18px;padding:16px;display:grid;grid-template-columns:46px minmax(0,1fr);gap:12px;align-items:start}'
      ' .vb .ic{width:46px;height:46px;border-radius:14px;background:var(--ink);color:var(--gold3);display:grid;place-items:center}'
      ' .vb .ic svg{width:24px;height:24px;display:block} .vb .card>p,.vb .cards>p,.vb .chips>p{display:none}'
      ' .vb h3{font-size:18px;margin:0 0 4px;line-height:1.35;color:var(--ink)}'
      ' .vb p{margin:0;color:var(--mut);font-size:15px;line-height:1.6}'
      ' .vb p a{color:var(--gold2);font-weight:700}'
      ' @media (max-width:720px){.vb .chips{grid-template-columns:repeat(2,minmax(0,1fr))} .vb .cards{grid-template-columns:minmax(0,1fr)}}</style>')

def ref(n): return f'<sup class="citation-ref"><a href="#ref-{n}">[{n}]</a></sup>'
def check_list(items):
    return '<ul class="lvbl-ul lvbl-ul-check">' + ''.join(
        f'<li class="lvbl-li"><span class="lvbl-check" aria-hidden="true">✓</span><span class="lvbl-li-body">{t}</span></li>' for t in items) + '</ul>'
def num_list(items):
    return '<ol class="lvbl-ol">' + ''.join(
        f'<li class="lvbl-li lvbl-li-num"><span class="lvbl-num" aria-hidden="true">{i}</span><span class="lvbl-li-body"><strong>{h}</strong> {t}</span></li>'
        for i, (h, t) in enumerate(items, 1)) + '</ol>'
def h2(id_, t, lead=False): return f'<h2 id="{id_}" class="lvbl-h2{" lvbl-h2-lead" if lead else ""}">{t}</h2>'
def p(t, lead=False): return f'<p class="lvbl-p{" lvbl-p-lead" if lead else ""}">{t}</p>'
BOX = 'background-color: #f5edda; border: 1px solid #d9c08a; border-right: 4px solid #a8873f; border-radius: 10px; padding: 14px 20px; margin: 24px 0; color: #5c4528; line-height: 1.8;'
def box(label, t): return f'<div style="{BOX}"><strong>{label}:</strong> {t}</div>'
def a(href, t): return f'<a href="{href}">{t}</a>'

I = {
 'coins': '<path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
 'vote': '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M9 10V5h6v5"/><path d="m10 7 1.5 1.5L14 6"/>',
 'book': '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
 'roof': '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
 'pen': '<path d="M14 4l6 6-10 10H4v-6z"/><path d="M12 6l6 6"/>',
 'chat': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
}
def card(icon, title, text):
    return (f'<div class="card"><div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round">{I[icon]}</svg></div><div><h3>{title}</h3><p>{text}</p></div></div>')

STEPS = [
 ('מרכזים את המסמכים:', 'התקנון, החלטות האסיפה על גובה התשלום, פירוט החוב לפי חודשים והקבלות של מי ששילם.'),
 ('בודקים את החישוב:', 'שחלוקת ההוצאות תואמת את התקנון של הבניין, ואם אין תקנון מוסכם, את התקנון המצוי שבחוק. ' + ref(1)),
 ('שולחים מכתב התראה:', 'מכתב מעורך דין עם הסכום, הפירוט ומועד לתשלום. לא פעם המכתב מספיק כדי שהחוב ישולם.'),
 ('מגישים תביעה:', 'אם החוב לא שולם, הנציגות מגישה תביעה ל' + a(L_MAFKEAH, 'מפקח על רישום המקרקעין') + ', שיש לו סמכות של שופט בית משפט השלום. ' + ref(2)),
 ('גובים בפועל:', 'אם גם אחרי ההחלטה הדייר לא משלם, פותחים תיק בהוצאה לפועל על סמך ההחלטה.'),
]
FAQ = [
 ('האם ועד הבית יכול לתבוע דייר שלא משלם?',
  'כן. הנציגות, וגם בעל דירה, יכולים להגיש תביעה למפקח על רישום המקרקעין בסכסוך על תשלומי ועד בית. ' + ref(3) + ' לפני התביעה שולחים בדרך כלל מכתב התראה. אם אחרי ההחלטה החוב עדיין לא שולם, פותחים תיק בהוצאה לפועל.'),
 ('דייר בקומת הקרקע טוען שהוא לא משתמש במעלית. הוא פטור מתשלום?',
  'בדרך כלל לא. החובה להשתתף בהוצאות של הרכוש המשותף חלה על כל בעל דירה, לפי היחס בין שטח הדירה שלו לשטח כל הדירות, אלא אם התקנון קובע חלוקה אחרת. ' + ref(1) + ' גם טענות על איכות הניקיון או התחזוקה לא מצדיקות הפסקת תשלום.'),
 ('מי משלם ועד בית בדירה מושכרת?',
  'מול הנציגות, החובה לפי החוק היא של בעל הדירה. ' + ref(1) + ' בחוזה השכירות אפשר לקבוע שהשוכר ישלם את התשלום השוטף, אבל אם הוא לא משלם, הוועד יכול לדרוש את החוב מבעל הדירה.'),
 ('האם הוועד יכול לשנות לבד את התקנון?',
  'לא. שינוי של תקנון מוסכם דורש החלטה של בעלי דירות ששני שלישים מהרכוש המשותף צמודים לדירות שלהם. ' + ref(3) + ' בחלק מהנושאים, למשל הצמדה של חלק מהרכוש המשותף לדירה מסוימת, נדרשת הסכמה רחבה יותר.'),
 ('האם צריך עורך דין כדי להגיש תביעה למפקח?',
  'לא חובה. אפשר להגיש תביעה גם בלי עורך דין. עורך דין עוזר להכין את התביעה, לחשב את החוב לפי התקנון ולצרף את המסמכים הנכונים, כדי שהתיק לא יתעכב.'),
]
SOURCES = [
 ('https://he.wikisource.org/wiki/%D7%97%D7%95%D7%A7_%D7%94%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F', 'חוק המקרקעין, התשכ"ט-1969, פרק ו׳: בתים משותפים', 'ויקיטקסט'),
 ('https://www.gov.il/he/service/condominiums-supervisor-claims', 'הגשת תביעות וניהול הליכים בפני המפקח על רישום המקרקעין (בתים משותפים)', 'אתר השירותים הממשלתי gov.il'),
 ('https://www.kolzchut.org.il/he/%D7%AA%D7%A7%D7%A0%D7%95%D7%9F_%D7%91%D7%99%D7%AA_%D7%9E%D7%A9%D7%95%D7%AA%D7%A3', 'תקנון בית משותף', 'כל זכות'),
]
GLOSS = [
 ('נציגות הבית המשותף', 'הגוף שבעלי הדירות בוחרים כדי לנהל את הבית המשותף ולייצג אותם בענייני הבניין. בשפה היומיומית: ועד הבית.'),
 ('רכוש משותף', 'כל חלקי הבית המשותף חוץ מהדירות עצמן, כמו חדר המדרגות, הגג, המעלית והמקלט, אלא אם הוצמדו לדירה מסוימת.'),
 ('תקנון מצוי', 'התקנון שבחוק המקרקעין, שחל על בניין שאין לו תקנון מוסכם.'),
 ('תקנון מוסכם', 'תקנון שבעלי הדירות ניסחו בעצמם ורשמו בלשכת רישום המקרקעין, במקום התקנון המצוי.'),
 ('המפקח על רישום המקרקעין', 'ערכאה שיפוטית שמכריעה בסכסוכים בין בעלי דירות בבית משותף, בסמכות של שופט בית משפט השלום.'),
]

parts = []
parts.append(p('עורך דין לוועד בית מלווה את נציגות הבית המשותף בצד המשפטי של ניהול הבניין: גבייה מדיירים שלא משלמים, אסיפות והחלטות שעומדות במבחן, '
               'תקנון, חוזים עם ספקים וסכסוכים על הרכוש המשותף. רוב הסכסוכים בין בעלי הדירות מתבררים אצל המפקח על רישום המקרקעין, שיש לו סמכות של שופט '
               'בית משפט השלום. ' + ref(2) + ' בדף הזה תמצאו במה עורך דין יכול לעזור לוועד, איך נראה הליך גבייה ומה כדאי להכין לפני שפונים.', lead=True))
parts.append(h2('עיקרי-הדברים', 'עיקרי הדברים', lead=True))
parts.append(check_list([
 'כל בעל דירה חייב להשתתף בהוצאות ההחזקה והניהול של הרכוש המשותף, לפי שטח הדירה, אלא אם התקנון קובע אחרת. ' + ref(1),
 'הנציגות או בעלי הדירות יכולים להגיש תביעה למפקח על רישום המקרקעין, שיש לו סמכות של שופט שלום. ' + ref(2) + ' ' + ref(3),
 'שינוי של תקנון מוסכם דורש החלטה של בעלי דירות ששני שלישים מהרכוש המשותף צמודים לדירות שלהם. ' + ref(3),
 'עורך דין לוועד בית הוא לא חברת ניהול: הוא מטפל בצד המשפטי, וחברת הניהול בתפעול היומיומי.',
 'לפני תביעה שולחים בדרך כלל מכתב התראה, ולעיתים הוא מספיק כדי לסגור את החוב.',
]))
parts.append('<div class="vb" dir="rtl"><div class="chips"><div><b>סעיף 58</b>חובת ההשתתפות בהוצאות</div><div><b>סעיף 74</b>למפקח סמכות של שופט שלום</div>'
             '<div><b>2/3</b>מהרכוש המשותף לשינוי תקנון</div><div><b>תקנון מצוי</b>חל כשאין תקנון מוסכם</div></div></div>')
parts.append(p('<strong>נעים להכיר: אני עו&quot;ד יקיר דבול, עורך דין מקרקעין. אני מלווה ועדי בתים ונציגויות בגבייה, באסיפות ובסכסוכים בבניין, '
               'ומתמנה על ידי בית המשפט בתיקי רישום בתים משותפים.</strong>'))

parts.append(h2('במה-עוזר-עורך-דין-לוועד-בית', 'במה עורך דין לוועד בית עוזר?'))
parts.append('<div class="vb" dir="rtl"><div class="cards">' + ''.join([
 card('coins', 'גביית חובות ועד בית', 'מכתב התראה, תביעה למפקח וגבייה בהוצאה לפועל מול ' + a(L_DUES, 'דייר שמסרב לשלם ועד בית') + '.'),
 card('vote', 'אסיפות והחלטות', 'זימון, מניין, הצבעה ופרוטוקול, כדי שההחלטה תעמוד גם אם מישהו יערער עליה. הרחבה ב' + a(L_ELECT, 'בחירת ועד בית באסיפה כללית') + '.'),
 card('book', 'תקנון מוסכם', 'ניסוח או תיקון של ' + a(L_TAKANON, 'תקנון לבית המשותף') + ': חלוקת ההוצאות, שימוש ברכוש המשותף, חניות ומחסנים.'),
 card('roof', 'סכסוכים על הרכוש המשותף', 'השתלטות על גג, מחסן או לובי, בנייה בלי הסכמה ונזילות בין דירות.'),
 card('pen', 'חוזים עם ספקים', 'בדיקת הסכמים עם חברת ניהול, ניקיון, מעליות או שיפוץ, לפני שהוועד חותם.'),
 card('chat', 'ייעוץ שוטף לנציגות', 'תשובה משפטית כשהוועד צריך להחליט: עבודות בבניין, דייר שמשפץ, עמדת טעינה לרכב חשמלי או אישור היעדר חובות למוכר.'),
]) + '</div></div>')

parts.append(h2('דייר-לא-משלם-ועד-בית', 'דייר לא משלם ועד בית: כך נראה הטיפול'))
parts.append(p('ועד בית שלא מצליח לגבות מכמה דיירים נשאר בלי כסף לניקיון, לחשמל ולתיקונים. החוק נותן לנציגות דרך מסודרת לגבות, צעד אחרי צעד:'))
parts.append(num_list(STEPS))
parts.append(box('טיפ מעשי', 'רשמו פרוטוקול בכל אסיפה ושמרו את ההחלטות על גובה התשלום החודשי. בתביעת גבייה, המסמכים האלה הם הבסיס להוכחת החוב.'))
parts.append(box('שימו לב', 'אסור לנתק לדייר שלא משלם מים או חשמל, או למנוע ממנו להשתמש במעלית. צעד כזה חושף את הוועד לתביעה. פועלים רק בדרך החוקית: התראה, תביעה וגבייה.'))

parts.append(h2('מתי-כדאי-לפנות', 'בדקו: מתי כדאי לפנות לעורך דין?'))
parts.append(p('אם אחד המצבים האלה מוכר לכם מהבניין, כדאי לבדוק את המצב המשפטי לפני שהבעיה גדלה:'))
parts.append(check_list([
 'דייר לא משלם כבר כמה חודשים, והפניות של הוועד לא עזרו.',
 'דייר בונה, סוגר או משתמש בשטח משותף בלי הסכמה של השכנים.',
 'הבניין רוצה לשנות את חלוקת ההוצאות או לנסח תקנון מוסכם.',
 'הוועד עומד לחתום על חוזה גדול: חברת ניהול, שיפוץ או מעליות.',
 'יש מחלוקת אם אסיפה או החלטה התקבלו כדין.',
]))

parts.append(h2('ההבדל-מחברת-ניהול', 'עורך דין לוועד בית או חברת ניהול: מה ההבדל?'))
parts.append('<div class="lvbl-table-wrap"><table><thead><tr><th>נושא</th><th>חברת ניהול</th><th>עורך דין לוועד בית</th></tr></thead><tbody>'
             '<tr><td><strong>התפקיד</strong></td><td>ניקיון, תחזוקה, תיאום ספקים וגבייה שוטפת</td><td>ייעוץ משפטי, החלטות, תקנון, מכתבי התראה ותביעות</td></tr>'
             '<tr><td><strong>דייר שלא משלם</strong></td><td>תזכורות ודרישות תשלום</td><td>מכתב התראה, תביעה למפקח וגבייה בהוצאה לפועל</td></tr>'
             '<tr><td><strong>חוזים</strong></td><td>עובדת לפי החוזה שנחתם</td><td>בודק ומנסח את החוזה לפני החתימה</td></tr>'
             '<tr><td><strong>סכסוכים בבניין</strong></td><td>לא מטפלת בהם</td><td>ייצוג אצל המפקח על רישום המקרקעין ובבית המשפט</td></tr>'
             '</tbody></table></div>')
parts.append(p('אנחנו לא חברת ניהול. בבניינים רבים חברת הניהול ועורך הדין עובדים יחד: החברה מתפעלת את הבניין, ועורך הדין נכנס כשצריך החלטה משפטית או הליך.'))

parts.append(h2('ועד-בית-או-נציגות-בהתחדשות', 'ועד בית רגיל או נציגות בהתחדשות עירונית?'))
parts.append(p('הדף הזה עוסק בניהול השוטף של בית משותף. בפרויקט תמ&quot;א 38 או פינוי בינוי הדיירים בוחרים לפעמים נציגות לפרויקט, עם תפקיד אחר: '
               'משא ומתן מול היזם ובחירת עורך דין לדיירים. על כך בהרחבה ב' + a(L_RENEW, 'נציגות דיירים במתחם התחדשות עירונית') + '.'))

parts.append(h2('איך-מתנהל-הליווי', 'איך מתנהל הליווי?'))
parts.append(num_list([
 ('שיחה ראשונה:', 'מספרים מה קורה בבניין ומה הוועד רוצה להשיג.'),
 ('בדיקת מסמכים:', 'תקנון, פרוטוקולים, פירוט חובות וחוזים קיימים.'),
 ('הצעת שכר טרחה בכתב:', 'לייעוץ שוטף או לטיפול בתיק מסוים, לפי היקף העבודה.'),
 ('טיפול ועדכונים:', 'מכתבים, תביעה או ליווי של אסיפה, עם עדכון לוועד בכל שלב.'),
]))

parts.append(h2('מה-הצעד-הבא', 'מה הצעד הבא שלכם?'))
parts.append(p('ועד בית עובד בהתנדבות, ולרוב מגלה את הצד המשפטי רק כשיש בעיה: דייר שלא משלם, שכן שבונה על הגג או אסיפה שמישהו טוען שלא התקיימה כדין. '
               'בדיקה מוקדמת של התקנון, ההחלטות והחוזים חוסכת בדרך כלל זמן, כסף ומתח בין השכנים.'))
parts.append(p('משרד עו&quot;ד יקיר דבול מלווה ועדי בתים ונציגויות בבתים משותפים: גבייה, אסיפות, תקנון, חוזים וסכסוכים על הרכוש המשותף.'))
parts.append(p('אין באמור משום ייעוץ משפטי. המידע כללי, נכון למועד הפרסום וכפוף לנסיבות פרטניות ולשינויי חקיקה ופסיקה. בכל שאלה ספציפית מומלץ להיוועץ בעורך דין. '
               'התוכן נבדק מול המקורות המופיעים ברשימת המקורות בסוף הדף, בליווי מקצועי של עו&quot;ד יקיר דבול.'))
parts.append('<div style="background-color: #d9c08a; border: 1px solid #c9a961; border-radius: 14px; padding: 28px 32px; margin: 40px 0; text-align: center;">'
             '<div style="color: #5c4528; font-size: 22px; font-weight: 800; margin: 0 0 10px; line-height: 1.35;">הוועד צריך תשובה משפטית?</div>'
             '<div style="color: #6b5530; font-size: 17px; line-height: 1.7; margin: 0;">לגבייה מדייר שלא משלם, אסיפה, תקנון או סכסוך על הרכוש המשותף, '
             f'<a style="color: #5c4528; font-weight: 800; text-decoration: underline;" href="{L_CONTACT}">צרו קשר</a> עם משרד עו&quot;ד יקיר דבול, או התקשרו 09-8613413.</div></div>')

parts.append(h2('faq', 'שאלות ותשובות'))
parts.append('<div class="lvbl-faq">' + ''.join(
 f'<details class="lvbl-faq-item"><summary class="lvbl-faq-q"><span class="lvbl-faq-num">{i}</span><span class="lvbl-faq-qt">{q}</span></summary>'
 f'<div class="lvbl-faq-a"><p class="lvbl-p">{ans}</p></div></details>' for i, (q, ans) in enumerate(FAQ, 1)) + '</div>')
parts.append(h2('sources', f'מקורות שצוטטו בדף ({len(SOURCES)})'))
parts.append('<ol class="lvbl-refs article-sources lvbl-ol">' + ''.join(
 f'<li id="ref-{i}" class="lvbl-li lvbl-li-num"><span class="lvbl-num" aria-hidden="true">{i}</span><span class="lvbl-li-body"><strong>[{i}]</strong> '
 f'<a href="{href}" target="_blank" rel="noopener noreferrer">{t}</a>, <em>{site}</em></span></li>' for i, (href, t, site) in enumerate(SOURCES, 1)) + '</ol>')
parts.append(h2('glossary', 'מילון מושגים'))
parts.append('<div class="lvbl-glossary"><dl>' + ''.join(f'<dt>{t}</dt><dd>{d}</dd>' for t, d in GLOSS) + '</dl></div>')

strip = lambda s: re.sub(r'<[^>]+>', '', s).replace('&quot;', '"')
graph = {'@context': 'https://schema.org', '@graph': [
 {'@type': 'WebPage', '@id': URL + '#webpage', 'url': URL, 'name': TITLE, 'description': SEO_DESC, 'inLanguage': 'he-IL'},
 {'@type': 'Service', '@id': URL + '#service', 'name': TITLE, 'serviceType': 'ליווי משפטי לוועדי בתים ולנציגויות בבתים משותפים', 'url': URL,
  'areaServed': {'@type': 'AdministrativeArea', 'name': 'השרון'},
  'provider': {'@type': 'LegalService', 'name': 'יקיר דבול - משרד עורכי דין', 'url': SITE, 'telephone': '+972-9-8613413',
               'address': {'@type': 'PostalAddress', 'streetAddress': 'רזיאל 1', 'addressLocality': 'נתניה', 'addressCountry': 'IL'}}},
 {'@type': 'HowTo', '@id': URL + '#howto', 'name': 'דייר לא משלם ועד בית: כך נראה הטיפול', 'inLanguage': 'he-IL',
  'step': [{'@type': 'HowToStep', 'position': i, 'name': strip(h).rstrip(':'), 'text': re.sub(r'\s*\[\d\]', '', strip(t)).strip()} for i, (h, t) in enumerate(STEPS, 1)]},
 {'@type': 'FAQPage', '@id': URL + '#faq', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub(r'\s*\[\d\]', '', strip(ans)).strip()}} for q, ans in FAQ]},
 {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'דף הבית', 'item': SITE}, {'@type': 'ListItem', 'position': 2, 'name': TITLE, 'item': URL}]},
]}
LD = '<script type="application/ld+json">' + json.dumps(graph, ensure_ascii=False) + '</script>'

content = LVBL + VB + '<div class="lvbl-article" data-audience="adults_30_60" data-font-scale="lg">' + '\n'.join(parts) + '</div>' + LD
for bad in ['—', '–', 'מומחה', 'הכי ', 'חינם']:
    assert bad not in re.sub(r'<style.*?</style>', '', content, flags=re.S), bad
(HERE / 'vaad-bayit.html').write_text(content, encoding='utf-8')
payload = {'title': TITLE, 'slug': SLUG, 'status': 'publish', 'categories': [1, 10], 'content': content,
           'excerpt': SEO_DESC, 'meta': {'_yoast_wpseo_title': SEO_TITLE, '_yoast_wpseo_metadesc': SEO_DESC, '_yoast_wpseo_focuskw': FOCUS}}
(HERE / 'vaad-bayit.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
print(URL, len(content), hashlib.md5(json.dumps(payload, ensure_ascii=False).encode()).hexdigest())
print('links:', sorted(set(re.findall(r'href="(https://dabullaw[^"]+)"', content))))
