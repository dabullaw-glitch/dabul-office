# Builds the online legal services pages (hub /online/ + one page per service) from svc-config.json.
# Each page: short direct answer, the order form (svc-app), what is included / not included, how it works,
# what to prepare, prices, FAQ (5, from the config), sources (no law firms), JSON-LD (Service+Offer, FAQPage,
# HowTo, BreadcrumbList). Written 10.10.2026 for Yakir's approval. Nothing here is published by this script.
import json, os, re, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
CFG = json.load(open(os.path.join(HERE, 'svc-config.json'), encoding='utf8'))
OUT = os.path.join(HERE, 'pages')
SITE = 'https://dabullaw.co.il'
BASE = SITE + '/online/'
W = 'https://dabullaw-glitch.github.io/dabul-office/media/widgets/'
VER = '20261011d'
FN = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/services'
VAT = CFG['vat']
SV = {s['id']: s for s in CFG['services']}
ORDER = ['precheck', 'zoom', 'company', 'registrar', 'tabu', 'inherit', 'poa', 'ichud', 'tashlumim']
GROUPS = [('מקרקעין', ['precheck', 'tabu']), ('ייעוץ', ['zoom']), ('חברות', ['company', 'registrar']),
          ('משפחה וירושה', ['inherit', 'poa']), ('הוצאה לפועל', ['ichud', 'tashlumim'])]

def ils(n): return '{:,.0f} ₪'.format(n)
def vat(n): return '{:,.0f} ₪'.format(round(n * (1 + VAT)))
def esc(s): return H.escape(str(s), quote=True)
def cite(n): return '<sup><a href="#src-%d">[%d]</a></sup>' % (n, n)

ICON = {
 'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/><path d="M8 11h6M11 8v6"/>',
 'video': '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
 'building': '<path d="M4 21V5l8-3v19M12 21V9l8 3v9"/><path d="M7 8h2M7 12h2M7 16h2M15 14h2M15 17h2"/><path d="M2 21h20"/>',
 'file-edit': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M14 3v5h5"/><path d="M19 8l-5-5"/><path d="M8 12h6M8 16h3"/><path d="M18.5 13.5l2 2L15 21h-2v-2z"/>',
 'home': '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 'stamp': '<path d="M9 3h6l-1 7h-4z"/><path d="M5 14h14v4H5zM4 21h16"/>',
 'scroll': '<path d="M7 3h11a2 2 0 0 1 2 2v2h-4"/><path d="M16 7v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h10"/><path d="M8 9h5M8 13h5"/>',
 'shield': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 'layers': '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
 'calendar': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6"/>',
}
def icon(name, sw='1.7'):
    k = name if name in ICON else 'layers'
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (sw, ICON[k])

WS = 'https://he.wikisource.org/wiki/'
SRC = {
 'mekarkein': (WS + '%D7%97%D7%95%D7%A7_%D7%94%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F', 'חוק המקרקעין, התשכ"ט-1969', 'ויקיטקסט'),
 'rights': ('https://www.gov.il/he/service/guide-register-rights', 'פעולות לרישום או עדכון זכויות בלשכת רישום המקרקעין', 'gov.il'),
 'caveat': ('https://www.gov.il/he/service/caveat_filling', 'בקשה לרישום או לביטול הערת אזהרה', 'gov.il'),
 'ethics': (WS + '%D7%9B%D7%9C%D7%9C%D7%99_%D7%9C%D7%A9%D7%9B%D7%AA_%D7%A2%D7%95%D7%A8%D7%9B%D7%99_%D7%94%D7%93%D7%99%D7%9F_(%D7%90%D7%AA%D7%99%D7%A7%D7%94_%D7%9E%D7%A7%D7%A6%D7%95%D7%A2%D7%99%D7%AA)', 'כללי לשכת עורכי הדין (אתיקה מקצועית), התשמ"ו-1986', 'ויקיטקסט'),
 'companies': (WS + '%D7%97%D7%95%D7%A7_%D7%94%D7%97%D7%91%D7%A8%D7%95%D7%AA', 'חוק החברות, התשנ"ט-1999', 'ויקיטקסט'),
 'compreg': ('https://www.gov.il/he/service/company_registration', 'רישום חברה ברשם החברות', 'gov.il'),
 'inheritance': (WS + '%D7%97%D7%95%D7%A7_%D7%94%D7%99%D7%A8%D7%95%D7%A9%D7%94', 'חוק הירושה, התשכ"ה-1965', 'ויקיטקסט'),
 'inhorder': ('https://www.gov.il/he/service/inheritance_order', 'בקשה לצו ירושה', 'gov.il'),
 'probate': ('https://www.gov.il/he/service/probate_order', 'בקשה לצו קיום צוואה', 'gov.il'),
 'capacity': (WS + '%D7%97%D7%95%D7%A7_%D7%94%D7%9B%D7%A9%D7%A8%D7%95%D7%AA_%D7%94%D7%9E%D7%A9%D7%A4%D7%98%D7%99%D7%AA_%D7%95%D7%94%D7%90%D7%A4%D7%95%D7%98%D7%A8%D7%95%D7%A4%D7%A1%D7%95%D7%AA', 'חוק הכשרות המשפטית והאפוטרופסות, התשכ"ב-1962, פרק ד׳1', 'ויקיטקסט'),
 'poadep': ('https://www.gov.il/he/service/edit_and_deposit_continuous_power_of_attorney', 'עריכה והפקדה של ייפוי כוח מתמשך', 'gov.il'),
 'hotzaa': (WS + '%D7%97%D7%95%D7%A7_%D7%94%D7%94%D7%95%D7%A6%D7%90%D7%94_%D7%9C%D7%A4%D7%95%D7%A2%D7%9C', 'חוק ההוצאה לפועל, התשכ"ז-1967', 'ויקיטקסט'),
 'ichudgov': ('https://www.gov.il/he/service/request_for_consolidation_portfolio', 'בקשה לאיחוד תיקים בהוצאה לפועל', 'gov.il'),
 'ichudkz': ('https://www.kolzchut.org.il/he/%D7%91%D7%A7%D7%A9%D7%94_%D7%9C%D7%90%D7%99%D7%97%D7%95%D7%93_%D7%AA%D7%99%D7%A7%D7%99%D7%9D_%D7%A9%D7%9C_%D7%97%D7%99%D7%99%D7%91_%D7%91%D7%94%D7%95%D7%A6%D7%90%D7%94_%D7%9C%D7%A4%D7%95%D7%A2%D7%9C', 'בקשה לאיחוד תיקים של חייב בהוצאה לפועל', 'כל-זכות'),
 'tashkz': ('https://www.kolzchut.org.il/he/%D7%91%D7%A7%D7%A9%D7%94_%D7%9C%D7%A6%D7%95_%D7%AA%D7%A9%D7%9C%D7%95%D7%9E%D7%99%D7%9D_%D7%A9%D7%9C_%D7%97%D7%99%D7%99%D7%91_%D7%91%D7%94%D7%95%D7%A6%D7%90%D7%94_%D7%9C%D7%A4%D7%95%D7%A2%D7%9C', 'בקשה לצו תשלומים של חייב בהוצאה לפועל', 'כל-זכות'),
}

# per service: the direct answer (with source numbers), who it is for, what to prepare, one extra section, sources, related
C = {
 'precheck': dict(
  ans='בדיקת דירה לפני קנייה היא בדיקה משפטית של המסמכים הרשמיים של הדירה, לפני שמציעים מחיר או חותמים על משהו. בודקים מי הבעלים, אם יש משכנתא, עיקול או הערת אזהרה, מה צמוד לדירה לפי הבית המשותף, ומה ידוע על ההיתרים והתכנון. ' + cite(1) + ' התשובה נשלחת אליכם במייל, עם המלצה מה לשאול ומה לבדוק עוד.',
  who=['מי שמצא דירה יד שנייה ורוצה לדעת שאין בה הפתעות, לפני שמציע מחיר', 'מי שרוצה להבין מה באמת נרשם על הדירה: חניה, מחסן, גג או חצר', 'מי שקונה דירה נוספת או מחליף דירה, ורוצה הערכה של מס הרכישה'],
  prep=['כתובת הדירה, ואם יש: גוש, חלקה ותת חלקה', 'המחיר המבוקש', 'קישור למודעה או צילומים, אם יש'],
  extra=('מה הבדיקה מגלה, ומה לא', '<p>נסח הטאבו מראה את הזכויות הרשומות: בעלים, משכנתאות, עיקולים והערות. ' + cite(2) + ' צו הבית המשותף מראה מה צמוד לכל דירה. אבל יש דברים שהמסמכים לא מראים: מצב פיזי של הדירה, רטיבות, או שווי שוק. לכן הבדיקה לא מחליפה שמאי או בודק מבנה, ואם צריך כזה, נכתוב לכם את זה בסיכום.</p>'),
  src=['mekarkein', 'rights'], rel=['tabu', 'zoom']),
 'zoom': dict(
  ans='ייעוץ משפטי בזום הוא פגישה מקוונת עם עו״ד יקיר דבול, בלי להגיע למשרד. בוחרים באתר אורך פגישה ומועד פנוי, כותבים בקצרה על מה מדובר ואפשר לצרף מסמכים. אחרי התשלום מקבלים במייל אישור וקישור לפגישה. מה שנאמר בפגישה חסוי, כמו בפגישה במשרד. ' + cite(1),
  who=['מי שעומד לחתום על חוזה ורוצה לשמוע מה חשוב לבדוק', 'מי שקיבל מכתב, דרישה או החלטה ורוצה להבין מה האפשרויות', 'מי שגר רחוק או לא יכול להגיע למשרד בשעות העבודה'],
  prep=['תיאור קצר של המקרה והשאלות', 'המסמכים הרלוונטיים, אם יש: חוזה, מכתב, החלטה'],
  extra=('30 או 60 דקות?', '<p>30 דקות מתאימות לשאלה ממוקדת, למשל סעיף בחוזה או החלטה אחת. 60 דקות מתאימות כשיש כמה נושאים, או כשצריך לעבור על מסמכים יחד. אם הפגישה מתארכת, אפשר לקבוע פגישה נוספת.</p>'),
  src=['ethics'], rel=['precheck', 'company']),
 'company': dict(
  ans='הקמת חברה בע״מ נעשית בבקשה מקוונת לרשם החברות, עם תקנון והצהרות של בעלי המניות והדירקטורים. ' + cite(1) + ' ' + cite(2) + ' ממלאים כאן את הפרטים, נפגשים פעם אחת לחתימה ולאימות החתימות, ואנחנו מגישים ומלווים עד שמתקבלת תעודת ההתאגדות.',
  who=['עצמאי שרוצה לעבור לפעול דרך חברה', 'שותפים שפותחים עסק יחד', 'מי שצריך חברה לנכס, להשקעה או לפרויקט'],
  prep=['שלוש אפשרויות לשם החברה', 'פרטי בעלי המניות והדירקטורים, וצילום תעודות הזהות שלהם', 'כתובת המשרד הרשום של החברה', 'חלוקת המניות בין השותפים'],
  extra=('חברת יחיד או חברה עם שותפים?', '<p>בחברת יחיד יש בעל מניות אחד, שהוא בדרך כלל גם הדירקטור. בחברה עם שותפים כדאי לחשוב מראש על חלוקת המניות ועל מי יהיה דירקטור. כשיש שותפים, מומלץ לשקול גם הסכם בעלי מניות, שקובע מה קורה במחלוקת, ביציאה של שותף או במכירה. הוא לא כלול בשירות הזה, ואפשר להזמין אותו בנפרד.</p>'),
  src=['companies', 'compreg'], rel=['registrar', 'zoom']),
 'registrar': dict(
  ans='כל שינוי בחברה, כמו העברת מניות, מינוי או סיום כהונה של דירקטור, שינוי כתובת או שינוי שם, צריך להיות מדווח לרשם החברות. ' + cite(1) + ' מסמנים כאן את השינויים, מקבלים מחיר מיד, ואנחנו מכינים את ההחלטות וההודעות, מאמתים חתימות ומגישים.',
  who=['חברה שמכניסה שותף או מוציאה שותף', 'חברה שמחליפה דירקטור או כתובת', 'חברה שצריכה להגיש דוח שנתי שלא הוגש'],
  prep=['מספר החברה (ח.פ.)', 'פרטי השינוי: מי נכנס, מי יוצא, הכתובת או השם החדש', 'צילום תעודות הזהות של החותמים'],
  extra=('לפני העברת מניות', '<p>העברת מניות יכולה להיות חייבת במס, גם כשלא עובר כסף. לכן כדאי לבדוק את זה עם רואה החשבון לפני החתימה. אם יש בחברה הסכם בעלי מניות, צריך לבדוק גם אותו, כי לפעמים יש בו זכות סירוב ראשונה או הגבלה על העברה.</p>'),
  src=['companies'], rel=['company', 'zoom']),
 'tabu': dict(
  ans='הערת אזהרה היא רישום בלשכת רישום המקרקעין (טאבו) שמזהיר כל מי שבודק את הנכס שיש התחייבות לגביו, למשל עסקת מכר. היא מגינה על הקונה עד שהבעלות נרשמת על שמו. ' + cite(1) + ' את הבקשה מגישים בטופס, עם חתימה מאומתת. ' + cite(2) + ' בשירות הזה מכינים את הבקשה, מאמתים את החתימות ומגישים באופן מקוון.',
  who=['קונים שחתמו על חוזה ורוצים לרשום הערת אזהרה לטובתם', 'בעלי נכס שצריכים לרשום או למחוק משכנתא', 'מי שצריך למחוק הערת אזהרה ישנה'],
  prep=['פרטי הנכס: גוש, חלקה ותת חלקה', 'החוזה או מסמך ההתחייבות', 'צילום תעודות הזהות של החותמים'],
  extra=('מתי רושמים הערת אזהרה?', '<p>בעסקת מכר רושמים הערת אזהרה לטובת הקונה זמן קצר אחרי החתימה, בדרך כלל לפני שמעבירים למוכר סכום משמעותי. כך, אם המוכר ינסה למכור את הדירה פעם נוספת או ייקח עליה הלוואה, ההערה תופיע בנסח.</p>'),
  src=['mekarkein', 'caveat', 'rights'], rel=['precheck', 'inherit']),
 'inherit': dict(
  ans='צו ירושה מבקשים כשאדם נפטר בלי צוואה, והרכוש מתחלק לפי החוק. צו קיום צוואה מבקשים כשיש צוואה, כדי לתת לה תוקף. ' + cite(1) + ' את הבקשה מגישים לרשם לענייני ירושה, היא מתפרסמת, ואם אין התנגדות הרשם נותן את הצו. ' + cite(2) + ' ' + cite(3),
  who=['יורשים שצריכים צו כדי לשחרר כספים מהבנק או לרשום דירה על שמם', 'מי שמחזיק בצוואה של קרוב שנפטר', 'משפחה שרוצה לסיים את הסידורים בלי לרוץ בין משרדים'],
  prep=['תעודת פטירה', 'פרטי היורשים וצילום תעודות הזהות שלהם', 'הצוואה המקורית, אם יש'],
  extra=('אחרי שמקבלים את הצו', '<p>הצו לבדו לא מעביר את הדירה על שם היורשים. כדי לרשום את הירושה בטאבו מגישים בקשה נפרדת ללשכת רישום המקרקעין. אפשר לבחור את הרישום בטופס, ואנחנו נטפל גם בו. כספים בבנק משתחררים בדרך כלל לפי הצו, אחרי שמציגים אותו לבנק.</p>'),
  src=['inheritance', 'inhorder', 'probate'], rel=['poa', 'tabu']),
 'poa': dict(
  ans='ייפוי כוח מתמשך הוא מסמך שבו אדם בוחר מראש מי יחליט בשבילו בענייני רכוש, בריאות או עניינים אישיים, אם יום אחד לא יוכל להחליט בעצמו. ' + cite(1) + ' עורכים אותו בפני עורך דין שעבר הכשרה מיוחדת, והוא נכנס לתוקף רק אחרי שהוא מופקד אצל האפוטרופוס הכללי. ' + cite(2),
  who=['מי שרוצה לבחור בעצמו מי ינהל את ענייניו, במקום שבית משפט ימנה אפוטרופוס', 'הורים מבוגרים שהילדים רוצים לסדר מראש את ניהול החשבונות והנכסים', 'זוגות שרוצים שכל אחד ימנה את השני'],
  prep=['פרטי הממנה ופרטי מיופי הכוח', 'צילום תעודות הזהות', 'מחשבה מראש: באילו עניינים מייפים כוח, ומי מחליף את מיופה הכוח אם צריך'],
  extra=('למה פגישה אחת היא חובה', '<p>החוק דורש שהממנה יחתום בפני עורך הדין, ושעורך הדין ישוחח איתו גם לבד, כדי לוודא שהוא מבין את המשמעות ושאף אחד לא לוחץ עליו. ' + cite(1) + ' לכן אי אפשר לסיים את התהליך רק באינטרנט. את כל השאר ממלאים כאן מראש, והפגישה עצמה קצרה.</p>'),
  src=['capacity', 'poadep'], rel=['inherit', 'zoom']),
 'ichud': dict(
  ans='איחוד תיקים הוא בקשה של חייב שיש נגדו שני תיקים או יותר בהוצאה לפועל, לרכז את כולם בתיק אחד עם תשלום חודשי אחד. ' + cite(1) + ' הרשם בודק אם אפשר לפרוע את החוב בתקופה שקבועה בחוק: שנתיים, 3 או 4 שנים, לפי גובה החוב. ' + cite(2) + ' בשירות הזה מכינים את הבקשה והשאלון, ומגישים אותה באופן מקוון.',
  who=['מי שיש נגדו כמה תיקים, ומשלם לכל זוכה בנפרד או לא מצליח לשלם', 'מי שרוצה תשלום חודשי אחד שמתאים להכנסה', 'מי שרוצה לבדוק אם איחוד תיקים מתאים לו, או הליך אחר'],
  prep=['רשימת התיקים מהאזור האישי באתר ההוצאה לפועל', 'תלושי שכר ודפי בנק של 6 החודשים האחרונים', 'פרטים על הכנסות, הוצאות ונכסים של משק הבית'],
  extra=('מה חשוב לדעת לפני שמגישים', '<p>אחרי ההגשה משלמים את התשלום הראשון שהצעתם, ורק אז הבקשה עוברת לרשם. ' + cite(2) + ' הגשת הבקשה לא עוצרת מעצמה עיקולים, ואפשר לבקש בנפרד להשהות אותם כל עוד עומדים בתשלומים. אחרי צו איחוד חלות הגבלות, כמו עיכוב יציאה מהארץ והגבלה על כרטיסי אשראי. תיקי מזונות ותיקי משכון ומשכנתא לא נכנסים לאיחוד.</p>'),
  src=['hotzaa', 'ichudkz', 'ichudgov'], rel=['tashlumim', 'zoom']),
 'tashlumim': dict(
  ans='צו חיוב בתשלומים הוא החלטה של רשם ההוצאה לפועל שפורסת את החוב לתשלומים חודשיים, לפי היכולת של החייב. ' + cite(1) + ' מגישים בקשה עם שאלון כלכלי ומסמכים, ומתחילים לשלם את הסכום שהצעתם עד להחלטה. ' + cite(2) + ' בשירות הזה מכינים את הבקשה והשאלון, ומגישים אותה באופן מקוון.',
  who=['מי שנפתח נגדו תיק בהוצאה לפועל, מכיר בחוב אבל לא יכול לשלם בבת אחת', 'מי שיש לו צו תשלומים ויכולת התשלום שלו השתנתה', 'מי שרוצה להסדיר תיק אחד לפני שהוא גדל בריבית ובהוצאות'],
  prep=['מספר התיק ושם הזוכה', 'תלושי שכר ודפי בנק של 6 החודשים האחרונים', 'פרטים על הכנסות, הוצאות ונכסים של משק הבית'],
  extra=('כדאי להגיש מהר', '<p>בתיק של פסק דין או שטרות מגישים בדרך כלל בתוך 20 יום מקבלת האזהרה, ובתיק תביעה על סכום קצוב בתוך 30 יום. אפשר להגיש גם אחר כך, אבל בינתיים החוב יכול לגדול בריבית ובהוצאות. ' + cite(2) + ' הצו לא מבטל מעצמו עיקולים או הגבלות שכבר הוטלו, ולכן לפעמים מגישים יחד איתו בקשה נוספת.</p>'),
  src=['hotzaa', 'tashkz'], rel=['ichud', 'zoom']),
}

STEPS = {
 'none': [('ממלאים את הטופס', 'כמה דקות, מהטלפון או מהמחשב. אפשר לצרף מסמכים.'), ('משלמים באתר', 'רואים את המחיר המלא לפני התשלום, כולל מע״מ.'), ('עורך הדין מטפל', 'עו״ד יקיר דבול עובר על הפרטים ועל המסמכים.'), ('מקבלים תשובה', 'במייל, או בפגישה בזום במועד שבחרתם.')],
 'digital': [('ממלאים את הטופס', 'פרטי התיק, המצב הכלכלי ומסמכים. אפשר להשלים מסמכים אחר כך.'), ('משלמים באתר', 'רואים את המחיר המלא לפני התשלום, כולל מע״מ.'), ('חותמים מהטלפון', 'על ייפוי כוח לייצוג ועל הבקשה, בחתימה דיגיטלית.'), ('אנחנו מגישים ומעדכנים', 'הגשה מקוונת לרשות האכיפה והגבייה, ועדכון עד ההחלטה.')],
 'meet': [('ממלאים את הטופס', 'כל הפרטים והמסמכים, מהטלפון או מהמחשב.'), ('משלמים באתר', 'רואים את המחיר המלא לפני התשלום, כולל מע״מ.'), ('פגישה קצרה לחתימה', 'במשרד בנתניה, או אצלכם בבית בתוספת מחיר.'), ('אנחנו מגישים ומעדכנים', 'הגשה מקוונת ומעקב עד שהרישום או הצו מתקבלים.')],
}

def price_rows(s):
    rows = []
    if s.get('base'): rows.append((s['title'], s['base']))
    for f in s['fields']:
        for o in f.get('opts', []) or []:
            if o.get('p'): rows.append((o.get('line') or o['l'], o['p']))
        if f['t'] == 'list' and f.get('each'):
            rows.append(('%s נוסף (מעבר ל־%d)' % (f['item'], f.get('free', 0)), f['each']))
    if s['sign'] == 'meet':
        for k in ('home', 'home2'):
            m = CFG['meeting'][k]; rows.append((m.get('line') or m['l'], m['p']))
    return rows

def from_price(s): return s.get('from') or s.get('base') or 0

CSS = """<style>
.dsv{--g:#a8873f;--g2:#8a6d2c;--g3:#e4d19c;--ink:#1c1b19;--mut:#6c675d;--line:#e4ded0;--paper:#fbfaf6;--soft:#f3ead3;color:var(--ink);max-width:1180px;margin:0 auto;padding:18px 16px 56px;font-size:17px;line-height:1.75;direction:rtl}
.dsv *{box-sizing:border-box}
.dsv a{color:var(--g2)}
.dsv .crumb{font-size:14px;color:var(--mut);margin:0 0 10px}.dsv .crumb a{color:var(--mut);text-decoration:none}
.dsv .k{color:var(--g2);font-weight:800;font-size:14px;letter-spacing:.03em;margin:0 0 6px}
.dsv h1{font-size:clamp(28px,4vw,40px);line-height:1.2;margin:0 0 12px;text-wrap:balance}
.dsv h2{font-size:clamp(22px,3vw,28px);line-height:1.3;margin:0 0 12px;text-wrap:balance}
.dsv .ans{font-size:18px;max-width:75ch;margin:0 0 16px}
.dsv .chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
.dsv .chip{display:inline-flex;align-items:center;gap:6px;background:var(--paper);border:1px solid var(--line);border-radius:99px;padding:6px 14px;font-size:14.5px;font-weight:700}
.dsv .chip b{color:var(--g2)}
.dsv .go{display:inline-flex;align-items:center;justify-content:center;background:var(--ink);color:#fff;text-decoration:none;border-radius:99px;padding:13px 26px;font-weight:800}
.dsv section{margin:44px 0 0}
.dsv .order{margin-top:26px;scroll-margin-top:90px}
.dsv .two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.dsv .box{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.dsv .box h3{margin:0 0 8px;font-size:18px}
.dsv ul.ok,.dsv ul.no{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.dsv ul.ok li,.dsv ul.no li{position:relative;padding-inline-start:26px}
.dsv ul.ok li::before{content:"";position:absolute;right:0;top:.55em;width:14px;height:8px;border:solid var(--g);border-width:0 0 2.5px 2.5px;transform:rotate(-45deg)}
.dsv ul.no li::before{content:"";position:absolute;right:3px;top:.85em;width:12px;height:2px;background:#b9b09e}
.dsv .steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;counter-reset:s;list-style:none;margin:0;padding:0}
.dsv .steps li{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:16px 16px 14px;counter-increment:s}
.dsv .steps li::before{content:counter(s);display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--g3);font-weight:800;font-size:14px;margin-bottom:8px}
.dsv .steps b{display:block}.dsv .steps span{color:var(--mut);font-size:15px;line-height:1.6}
.dsv table.pr{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-variant-numeric:tabular-nums}
.dsv table.pr th,.dsv table.pr td{padding:10px 14px;border-bottom:1px solid var(--line);text-align:right}
.dsv table.pr th{background:var(--paper);font-size:14.5px;color:var(--mut)}
.dsv table.pr td:nth-child(n+2){white-space:nowrap}
.dsv .note{font-size:14.5px;color:var(--mut);margin:10px 0 0}
.dsv details{border-bottom:1px solid var(--line);padding:12px 0}
.dsv summary{cursor:pointer;font-weight:800;list-style:none}.dsv summary::-webkit-details-marker{display:none}
.dsv summary::after{content:"+";float:left;color:var(--g2);font-weight:800}.dsv details[open] summary::after{content:"−"}
.dsv details p{margin:8px 0 0;color:#3b3833}
.dsv .srcs{font-size:14.5px;color:var(--mut)}.dsv .srcs ol{padding-inline-start:20px;margin:6px 0}
.dsv sup a{text-decoration:none;font-size:12px}
.dsv .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.dsv .card{display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;text-decoration:none;color:var(--ink);transition:border-color .2s,transform .2s}
.dsv .card:hover{border-color:var(--g);transform:translateY(-2px)}
.dsv .card i{width:44px;height:44px;border-radius:12px;background:var(--soft);color:var(--g2);display:grid;place-items:center}.dsv .card i svg{width:24px;height:24px}
.dsv .card .gt{position:absolute;top:18px;left:18px;font-size:12.5px;font-weight:800;color:var(--g2);background:var(--paper);border:1px solid var(--line);border-radius:99px;padding:2px 10px}.dsv .card{position:relative}.dsv .card b{font-size:18px}.dsv .card span{color:var(--mut);font-size:15px;line-height:1.6;flex:1}
.dsv .card em{font-style:normal;font-weight:800;color:var(--g2);font-size:15px}
.dsv .grp{margin:26px 0 10px;color:var(--g2);font-weight:800;font-size:15px}
.dsv .hero{background:var(--ink);color:#f4efe4;border-radius:26px;padding:34px 30px;background-image:radial-gradient(900px 400px at 85% -10%,rgba(168,135,63,.28),transparent 60%)}
.dsv .hero h1{color:#fff}.dsv .hero .ans{color:#d8d0bf}.dsv .hero .k{color:var(--g3)}
.dsv .hero .chip{background:rgba(255,255,255,.06);border-color:#3b362e;color:#f4efe4}.dsv .hero .chip b{color:var(--g3)}
.dsv .ctab{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.dsv .ctab p{margin:0}
@media (max-width:900px){.dsv{font-size:16.5px}.dsv .two,.dsv .cards{grid-template-columns:minmax(0,1fr)}.dsv .steps{grid-template-columns:repeat(2,minmax(0,1fr))}.dsv .hero{padding:24px 18px;border-radius:20px}.dsv table.pr th,.dsv table.pr td{padding:9px 10px}}
@media (max-width:480px){.dsv .steps{grid-template-columns:minmax(0,1fr)}}
@media (max-width:860px){.dsv .sv-bar{bottom:88px;border-radius:16px;margin-inline:4px}}
</style>"""

def app_embed(sid):
    return ('<link rel="stylesheet" href="%ssvc-app.css?ver=%s">' % (W, VER) +
            '<div class="svc-app" data-svc="%s" data-cfg="%ssvc-config.json" data-fn="%s"></div>' % (sid, W, FN) +
            '<script nowprocket data-no-optimize="1" defer src="%ssvc-app.js?ver=%s"></script>' % (W, VER))

def card(sid, tag=False):
    s = SV[sid]
    return '<a class="card" href="/online/%s/"><i>%s</i>%s<b>%s</b><span>%s</span><em>החל מ־%s + מע״מ ←</em></a>' % (s['slug'], icon(s['icon']), ('<small class="gt">%s</small>' % esc(s['group'])) if tag else '', esc(s['title']), esc(s['card']), ils(from_price(s)))

def service_page(sid):
    s, c = SV[sid], C[sid]
    url = BASE + s['slug'] + '/'
    srcs = [SRC[k] for k in c['src']]
    fp = from_price(s)
    chips = '<div class="chips"><span class="chip">החל מ־<b>%s</b> + מע״מ</span><span class="chip">%s</span><span class="chip">%s</span></div>' % (
        ils(fp), {'none': 'הכול אונליין', 'digital': 'הכול אונליין, חתימה מהטלפון', 'meet': 'אונליין + פגישת חתימה אחת'}[s['sign']], esc(s['group']))
    head = ('<p class="crumb"><a href="/">דף הבית</a> › <a href="/online/">שירותים משפטיים אונליין</a> › %s</p>' % esc(s['title']) +
            '<header><p class="k">שירות משפטי אונליין</p><h1>%s</h1><p class="ans">%s</p>%s<a class="go" href="#order">להזמנה ←</a></header>' % (esc(s['h1']), c['ans'], chips))
    order = '<section class="order" id="order" aria-label="טופס הזמנה"><h2>הזמנה אונליין</h2>%s</section>' % app_embed(sid)
    inc = ('<section><div class="two"><div class="box"><h3>מה כלול</h3><ul class="ok">%s</ul></div><div class="box"><h3>מה לא כלול</h3><ul class="no">%s%s</ul></div></div></section>' % (
        ''.join('<li>%s</li>' % esc(x) for x in s['incl']), ''.join('<li>%s</li>' % esc(x) for x in s['excl']),
        ('<li>%s</li>' % esc(s['gov'])) if s['gov'] else ''))
    who = '<section><h2>למי השירות מתאים</h2><ul class="ok">%s</ul></section>' % ''.join('<li>%s</li>' % esc(x) for x in c['who'])
    st = STEPS[s['sign']]
    steps = '<section><h2>איך זה עובד</h2><ol class="steps">%s</ol><p class="note">%s</p></section>' % (''.join('<li><b>%s</b><span>%s</span></li>' % (esc(a), esc(b)) for a, b in st), esc(s['sla']))
    prep = '<section><h2>מה צריך להכין</h2><ul class="ok">%s</ul></section>' % ''.join('<li>%s</li>' % esc(x) for x in c['prep'])
    rows = price_rows(s)
    price = ('<section><h2>מחירים</h2><div style="overflow-x:auto"><table class="pr"><thead><tr><th>מה</th><th>לפני מע״מ</th><th>כולל מע״מ</th></tr></thead><tbody>%s</tbody></table></div><p class="note">%s המחיר הסופי מחושב בטופס לפי מה שבוחרים, ומוצג לפני התשלום.</p></section>' % (
        ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % (esc(a), ils(p), vat(p)) for a, p in rows), esc(s['gov'] or 'אגרות ותשלומים למדינה, אם יש, לא כלולים.')))
    ex_h, ex_b = c['extra']
    extra = '<section><h2>%s</h2>%s</section>' % (esc(ex_h), ex_b)
    faq = '<section><h2>שאלות נפוצות</h2>%s</section>' % ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in s['faq'])
    rel = '<section><h2>שירותים קשורים</h2><div class="cards">%s</div></section>' % ''.join(card(x) for x in c['rel'] + ['__hub'] if x != '__hub')
    cta = '<section><div class="ctab"><p><b>יש שאלה לפני שמזמינים?</b><br>אפשר להתקשר: 09-8613413</p><a class="go" href="#order">להזמנה ←</a></div></section>'
    src = '<section class="srcs"><h2>מקורות</h2><ol>%s</ol><p>המידע בעמוד הוא כללי ואינו ייעוץ משפטי למקרה מסוים.</p></section>' % ''.join(
        '<li id="src-%d"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a>, <em>%s</em></li>' % (i + 1, u, esc(t), esc(w)) for i, (u, t, w) in enumerate(srcs))
    offer = {"@type": "Offer", "price": str(round(fp * (1 + VAT))), "priceCurrency": "ILS", "url": url, "availability": "https://schema.org/InStock"}
    if s['sign'] == 'meet' or len(rows) > 1:
        offer = {"@type": "AggregateOffer", "lowPrice": str(round(fp * (1 + VAT))), "priceCurrency": "ILS", "url": url}
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "@id": url + "#service", "name": s['title'], "serviceType": s['title'], "url": url, "description": re.sub(r'<[^>]+>', '', c['ans']).strip(),
         "provider": {"@id": SITE + "/#organization"}, "areaServed": {"@type": "Country", "name": "Israel"}, "availableChannel": {"@type": "ServiceChannel", "serviceUrl": url}, "offers": offer},
        {"@type": "HowTo", "@id": url + "#howto", "name": "איך מזמינים: " + s['title'], "step": [{"@type": "HowToStep", "position": i + 1, "name": a, "text": b} for i, (a, b) in enumerate(st)]},
        {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in s['faq']]},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "שירותים משפטיים אונליין", "item": BASE},
            {"@type": "ListItem", "position": 3, "name": s['title'], "item": url}]}]}
    body = '<div class="dsv">' + head + order + inc + who + steps + prep + price + extra + faq + rel + cta + src + '</div>'
    return CSS + body + '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>'

HUB_FAQ = [
 ('איך עובד שירות משפטי אונליין?', 'בוחרים שירות, ממלאים טופס קצר ומצרפים מסמכים, ורואים את המחיר המלא לפני התשלום. אחרי התשלום עו״ד יקיר דבול מטפל, ומעדכן אתכם במייל ובטלפון.'),
 ('צריך להגיע למשרד?', 'בבדיקת דירה, בייעוץ בזום ובבקשות בהוצאה לפועל לא. בשירותים שבהם החוק דורש חתימה בפני עורך דין, כמו ייפוי כוח מתמשך או הקמת חברה, יש פגישה קצרה אחת, במשרד בנתניה או אצלכם בבית.'),
 ('המחיר כולל אגרות?', 'לא. אגרות ותשלומים למדינה משולמים בנפרד, וכתוב בכל שירות אם יש כאלה. המחירים באתר הם לפני מע״מ, והמחיר הסופי כולל מע״מ מוצג לפני התשלום.'),
 ('מה אם המקרה שלי מורכב?', 'בחלק מהשירותים, לפי מה שממלאים, הטופס מסמן שהמקרה צריך בדיקה קצרה. אז לא משלמים מיד: נחזור אליכם, ונגיד אם השירות מתאים או מה המחיר.'),
]

def hub_page():
    url = BASE
    groups = '<div class="cards">%s</div>' % ''.join(card(x, True) for g, ids in GROUPS for x in ids)
    steps = STEPS['meet']
    gen = [('בוחרים שירות', 'כל שירות עם מחיר קבוע ופירוט של מה כלול.'), ('ממלאים טופס קצר', 'מהטלפון או מהמחשב, עם מסמכים.'), ('רואים מחיר ומשלמים', 'המחיר המלא מוצג לפני התשלום.'), ('עורך הדין מטפל', 'עדכונים במייל ובטלפון עד הסוף.')]
    head = ('<p class="crumb"><a href="/">דף הבית</a> › שירותים משפטיים אונליין</p>'
            '<header class="hero"><p class="k">יקיר דבול - משרד עורכי דין</p><h1>שירותים משפטיים אונליין</h1>'
            '<p class="ans">שירותים משפטיים במחיר קבוע, שמזמינים ומשלמים באתר: בדיקת דירה לפני קנייה, ייעוץ בזום, הקמת חברה ושינויים ברשם החברות, רישום בטאבו, צו ירושה, ייפוי כוח מתמשך ובקשות בהוצאה לפועל. ממלאים טופס קצר, רואים את המחיר לפני התשלום, ועו״ד יקיר דבול מטפל.</p>'
            '<div class="chips"><span class="chip"><b>9</b> שירותים</span><span class="chip">מחיר קבוע, מוצג מראש</span><span class="chip">עורך הדין עצמו מטפל</span></div></header>')
    svcs = '<section><h2>בוחרים שירות</h2>%s</section>' % groups
    how = '<section><h2>איך זה עובד</h2><ol class="steps">%s</ol></section>' % ''.join('<li><b>%s</b><span>%s</span></li>' % (esc(a), esc(b)) for a, b in gen)
    terms = '<section><h2>חשוב לדעת</h2><ul class="ok">%s</ul></section>' % ''.join('<li>%s</li>' % esc(t) for t in CFG['terms'])
    faq = '<section><h2>שאלות נפוצות</h2>%s</section>' % ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in HUB_FAQ)
    cta = '<section><div class="ctab"><p><b>לא בטוחים איזה שירות מתאים?</b><br>אפשר להתקשר: 09-8613413, או לקבוע ייעוץ קצר בזום.</p><a class="go" href="/online/zoom-consultation/">לייעוץ בזום ←</a></div></section>'
    items = [{"@type": "ListItem", "position": i + 1, "url": BASE + SV[x]['slug'] + '/', "name": SV[x]['title']} for i, x in enumerate(ORDER)]
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url + "#page", "name": "שירותים משפטיים אונליין", "url": url, "inLanguage": "he-IL", "isPartOf": {"@id": SITE + "/#website"}, "mainEntity": {"@id": url + "#list"}},
        {"@type": "ItemList", "@id": url + "#list", "itemListElement": items},
        {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in HUB_FAQ]},
        {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "דף הבית", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "שירותים משפטיים אונליין", "item": url}]}]}
    return CSS + '<div class="dsv">' + head + svcs + how + terms + faq + cta + '</div><script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False) + '</script>'

YOAST = {
 'hub': ('שירותים משפטיים אונליין במחיר קבוע | יקיר דבול - משרד עורכי דין', 'בדיקת דירה, ייעוץ בזום, הקמת חברה, רישום בטאבו, צו ירושה, ייפוי כוח מתמשך ובקשות בהוצאה לפועל. מזמינים באתר, רואים מחיר מראש, ועורך הדין מטפל.'),
}
for sid in ORDER:
    s = SV[sid]
    YOAST[sid] = ('%s אונליין | יקיר דבול - משרד עורכי דין' % s['title'] if 'אונליין' not in s['title'] else '%s | יקיר דבול - משרד עורכי דין' % s['title'],
                  (s['card'] + ' החל מ־%s + מע״מ.' % ils(from_price(s)))[:158])

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    meta = []
    pages = [('hub', 'online', hub_page())] + [(sid, SV[sid]['slug'], service_page(sid)) for sid in ORDER]
    for sid, slug, html in pages:
        assert '—' not in html and '–' not in html, slug
        assert 'מומחה' not in html and 'חינם' not in html and 'הכי ' not in html and 'הטוב ביותר' not in html, slug
        open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf8').write(html)
        t, d = YOAST[sid]
        txt = H.unescape(re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>', ' ', html, flags=re.S))
        meta.append(dict(id=sid, slug=slug, title=('שירותים משפטיים אונליין' if sid == 'hub' else SV[sid]['title']), ytitle=t, ydesc=d, words=len(txt.split())))
        print(slug, len(html), len(txt.split()), len(t), len(d))
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
