#!/usr/bin/env python3
"""Builds the two campaign landing pages (buy / sell) as WordPress HTML blocks + local preview pages.
Usage: python3 build_lp.py [IMG_BASE]   (IMG_BASE defaults to local "img/" for preview)"""
import sys, json, html, pathlib
HERE = pathlib.Path(__file__).parent
IMG = sys.argv[1] if len(sys.argv) > 1 else 'img/'
PHONE, PHONE_INTL, WA = '09-8613413', '+97298613413', '972505580189'
API = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/lead'

PAGES = {
 'buy': dict(
  slug='lp-buy-apartment', topic='קניית דירה', wa='שלום, הגעתי מהמודעה על ליווי בקניית דירה',
  kick='ליווי משפטי בקניית דירה · נתניה והשרון',
  h1='קונים דירה?<br><em>בודקים הכל</em> לפני שחותמים.',
  sub='עו"ד יקיר דבול מלווה קונים בעסקאות דירה יד שנייה בנתניה ובשרון: בדיקת הנסח והתיק בעירייה, משא ומתן על החוזה, דיווח לרשות המסים ורישום הדירה על שמכם.',
  form_t='רוצים שנעבור על הדירה?', form_s='השאירו פרטים, ועורך הדין יחזור אליכם. בדרך כלל באותו יום עבודה.',
  risk_t='מה יכול להשתבש בקניית דירה יד שנייה', risk_s='את רוב הבעיות אפשר לגלות מראש, אם בודקים לפני שמשלמים.',
  risks=[('משכנתא או עיקול בנסח','רישום על הדירה שצריך לסלק לפני הרישום על שמכם, והחוזה צריך לקבוע איך.'),
         ('חריגות בנייה','מרפסת שנסגרה או חדר שנוסף בלי היתר. הקונה יורש את הבעיה, ולפעמים גם את הקנס.'),
         ('תשלום בלי הגנה','כסף שעובר למוכר לפני שנרשמה הערת אזהרה לטובתכם חשוף לעסקה נוספת בדירה.'),
         ('מס רכישה לא צפוי','הסכום תלוי במחיר ובשאלה אם זו דירה יחידה. כדאי לדעת אותו לפני שחותמים.')],
  steps_t='איך נראה הליווי, שלב אחרי שלב',
  steps=[('בדיקה לפני הצעת מחיר','נסח טאבו, צו בית משותף, תיק בניין, תוכניות באזור והערכת מס רכישה.'),
         ('משא ומתן וחוזה','בודקים את טיוטת המוכר, ומכניסים לחוזה את ההגנות שלכם: תשלומים בשלבים, ביטחונות ותאריך מסירה.'),
         ('חתימה והערת אזהרה','ביום החתימה מאמתים זהות מול הנסח, ומיד אחר כך רושמים הערת אזהרה לטובתכם.'),
         ('מס ודיווח','דיווח לרשות המסים בתוך 30 יום ותשלום מס רכישה במועד. בודקים אם מגיעות לכם הקלות.'),
         ('מסירה ורישום','אוספים את כל האישורים, מלווים את המסירה ורושמים את הדירה על שמכם בטאבו.')],
  incl=['בדיקת נסח טאבו, צו בית משותף ותיק הבניין','ניסוח החוזה ומשא ומתן מול עורך הדין של המוכר','תיאום מול הבנק למשכנתא ומכתב הכוונות של המוכר','דיווח לרשות המסים וחישוב מס רכישה','רישום הערת אזהרה, ובסוף רישום הבעלות על שמכם','זמינות בטלפון ובוואטסאפ לאורך כל העסקה'],
  tool=('עוד לא מצאתם דירה?','הורידו את הצ\'קליסט: 30 בדיקות לפני שקונים דירה יד שנייה, לפי סדר העסקה.','לצ\'קליסט','/checklist/'),
  tool2=('כמה מס רכישה תשלמו?','מחשבון מס רכישה 2026, לדירה יחידה ולדירה נוספת.','למחשבון','/calculators/purchase-tax/'),
  faq=[('כמה עולה עורך דין לקניית דירה?','שכר הטרחה נקבע בהסכם כתוב לפני שמתחילים, לפי סוג העסקה ומה היא כוללת. בשיחה הראשונה תדעו בדיוק כמה זה עולה ומה כלול.'),
       ('מתי כדאי לפנות לעורך דין?','לפני שחותמים על משהו, גם לא על "זכרון דברים" או טופס הצעה של מתווך. בישראל גם מסמך קצר כזה יכול להיות חוזה מחייב.'),
       ('הדירה לא רשומה בטאבו. זה בעיה?','לא בהכרח. דירות רבות רשומות ברשות מקרקעי ישראל או בחברה משכנת. בודקים אישור זכויות מהגוף הרלוונטי, והחוזה מותאם לכך.'),
       ('אפשר לחתום בלי להגיע למשרד?','כן. אפשר להיפגש במשרד ברחוב רזיאל 1 בנתניה, ובתיאום מראש גם אצלכם בבית באזור השרון.'),
       ('אתם מטפלים גם בעסקאות מחוץ לנתניה?','כן. המשרד בנתניה, ומלווה עסקאות בכל אזור השרון ובמרכז.')],
 ),
 'sell': dict(
  slug='lp-sell-apartment', topic='מכירת דירה', wa='שלום, הגעתי מהמודעה על ליווי במכירת דירה',
  kick='ליווי משפטי במכירת דירה · נתניה והשרון',
  h1='מוכרים דירה?<br><em>מכינים הכל</em> לפני שמפרסמים.',
  sub='עו"ד יקיר דבול מלווה מוכרים בנתניה ובשרון: בודקים מראש מה רשום על הדירה, מתכננים את מס השבח, מנסחים חוזה שמגן עליכם ודואגים שהכסף יגיע בזמן.',
  form_t='רוצים לדעת מה צריך להכין?', form_s='השאירו פרטים, ועורך הדין יחזור אליכם. בדרך כלל באותו יום עבודה.',
  risk_t='מה מעכב מכירה של דירה', risk_s='כשמכינים את המסמכים מראש, הקונה מקבל תשובות מהר והעסקה לא נתקעת.',
  risks=[('משכנתא שצריך לסלק','צריך לתאם עם הבנק איך הכסף של הקונה מסלק את המשכנתא, בלי שתישארו בלי דירה ובלי כסף.'),
         ('מס שבח שלא תוכנן','לפעמים מגיע פטור, ולפעמים כדאי לחכות או לפצל. את זה בודקים לפני שקובעים מחיר.'),
         ('חריגות בנייה','הקונה ועורך הדין שלו יבדקו את התיק בעירייה. עדיף לדעת לפניהם מה יימצא שם.'),
         ('ירושה או כמה בעלים','דירה שעוד רשומה על שם מי שנפטר, או עם כמה בעלים, צריכה הסדרה לפני שאפשר למכור.')],
  steps_t='איך נראה הליווי, שלב אחרי שלב',
  steps=[('הכנה לפני פרסום','נסח טאבו, משכנתאות, תיק הבניין וחישוב מס שבח, כדי לדעת כמה נשאר לכם ביד.'),
         ('הקונה והחוזה','עונים לשאלות של עורך הדין של הקונה, ומנסחים חוזה עם לוח תשלומים וביטחונות שמגנים עליכם.'),
         ('חתימה וקבלת תשלומים','מסדרים מראש מה עובר לבנק לסילוק המשכנתא ומה מגיע אליכם, ומתי.'),
         ('מס שבח ואישורים','דיווח לרשות המסים, בקשת פטור כשמגיע, ואישור העירייה והיטל השבחה.'),
         ('מסירה ורישום','מסירת הדירה, קבלת יתרת התמורה וסגירת העסקה בטאבו.')],
  incl=['בדיקת הנסח, המשכנתא ותיק הבניין לפני פרסום','חישוב מס שבח ובדיקת זכאות לפטור','ניסוח החוזה ומשא ומתן מול עורך הדין של הקונה','תיאום סילוק המשכנתא מול הבנק','דיווח לרשות המסים ואישור עירייה','זמינות בטלפון ובוואטסאפ לאורך כל העסקה'],
  tool=('כמה יישאר לכם מהמכירה?','מחשבון מכירת דירה נטו: מחיר, משכנתא, מס שבח והוצאות.','למחשבון','/calculators/sale-net/'),
  tool2=('מגיע לכם פטור ממס שבח?','בדיקה מהירה לדירת מגורים מזכה, לפי החוק.','לבדיקה','/calculators/shevach-exemption/'),
  faq=[('כמה עולה עורך דין למכירת דירה?','שכר הטרחה נקבע בהסכם כתוב לפני שמתחילים, לפי סוג העסקה ומה היא כוללת. בשיחה הראשונה תדעו בדיוק כמה זה עולה ומה כלול.'),
       ('מתי לפנות לעורך דין, לפני או אחרי שיש קונה?','לפני. כשהמסמכים מוכנים ומס השבח מחושב, אפשר לקבוע מחיר נכון ולענות לקונה מהר.'),
       ('יש על הדירה משכנתא. אפשר למכור?','כן, זה מצב נפוץ. החוזה קובע שחלק מהתשלום של הקונה עובר ישירות לבנק שלכם, לפי מכתב כוונות מהבנק.'),
       ('הדירה התקבלה בירושה. מה צריך?','קודם צו ירושה או צו קיום צוואה, ואז רישום על שם היורשים או מכירה ישירה. נבדוק מה מתאים במקרה שלכם.'),
       ('אפשר לחתום בלי להגיע למשרד?','כן. אפשר להיפגש במשרד ברחוב רזיאל 1 בנתניה, ובתיאום מראש גם אצלכם בבית באזור השרון.')],
 ),
}

CSS = r"""
.dlp{--d:#111318;--d2:#1b1e26;--g:#c9a85c;--gd:#8c7646;--g1:#e4d19c;--g2:#f6efdd;--ink:#16161a;--mut:#5d5a54;--line:#e8e2d4;--paper:#fbfaf6;
 direction:rtl;color:var(--ink);background:var(--paper);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:clip}
.dlp *{box-sizing:border-box}
.dlp h1,.dlp h2,.dlp h3,.dlp p,.dlp ul,.dlp ol{margin:0;padding:0}
.dlp .w{max-width:1160px;margin:0 auto;padding-inline:20px}
.dlp .serif{font-family:'Frank Ruhl Libre',Georgia,serif}
.dlp a{color:inherit}
.dlp .btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:52px;padding:0 24px;border-radius:999px;font-weight:700;font-size:17px;text-decoration:none;border:1.5px solid transparent;cursor:pointer;transition:transform .15s,background .15s}
.dlp .btn:hover{transform:translateY(-1px)}
.dlp .btn svg{width:20px;height:20px;flex:none}
.dlp .b-g{background:var(--g);color:#14130f}.dlp .b-g:hover{background:var(--g1)}
.dlp .b-o{border-color:rgba(228,209,156,.55);color:#fff}.dlp .b-o:hover{background:rgba(255,255,255,.06)}
.dlp .b-d{background:var(--d);color:#fff}
/* hero */
.dlp .hero{position:relative;background:var(--d);color:#eee7d6;isolation:isolate;overflow:hidden}
.dlp .hero:before{content:"";position:absolute;inset:0;background:url(__IMG__netanya-night.webp) center 70%/cover;opacity:.32;z-index:-2}
.dlp .hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,19,24,.55),rgba(17,19,24,.94) 62%);z-index:-1}
.dlp .hero .w{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:48px;align-items:center;padding-block:34px 64px}
.dlp .top{display:flex;justify-content:space-between;align-items:center;padding-block:22px 0}
.dlp .logo{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:700;font-size:22px;color:#fff;line-height:1.1;text-decoration:none}
.dlp .logo small{display:block;font-family:inherit;font-weight:400;font-size:12.5px;color:var(--g1);letter-spacing:.04em;margin-top:3px}
.dlp .top .tel{color:var(--g1);font-weight:700;text-decoration:none;direction:ltr;font-size:18px}
.dlp .kick{display:inline-block;color:var(--g);font-weight:500;font-size:15px;letter-spacing:.03em;margin-bottom:16px;border-bottom:1px solid rgba(201,168,92,.4);padding-bottom:6px}
.dlp h1{font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:700;font-size:clamp(38px,5.4vw,64px);line-height:1.06;color:#fff;text-wrap:balance}
.dlp h1 em{font-style:normal;color:var(--g)}
.dlp .sub{font-size:18.5px;color:#d6cfbf;max-width:560px;margin-top:20px;font-weight:300}
.dlp .ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.dlp .proof{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:30px;font-size:14.5px;color:#cfc8b8}
.dlp .proof span{display:inline-flex;gap:8px;align-items:center}
.dlp .proof i{width:6px;height:6px;background:var(--g);transform:rotate(45deg);display:inline-block}
/* form */
.dlp .fc{background:#fff;color:var(--ink);border-radius:18px;padding:30px 28px 26px;box-shadow:0 30px 70px rgba(0,0,0,.35);position:relative}
.dlp .fc:before{content:"";position:absolute;inset:0 0 auto 0;height:5px;border-radius:18px 18px 0 0;background:linear-gradient(90deg,var(--gd),var(--g),var(--g1))}
.dlp .fc h2{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:26px;line-height:1.15;font-weight:700}
.dlp .fc .fs{font-size:15px;color:var(--mut);margin:6px 0 18px}
.dlp .fc label{display:block;font-size:14px;font-weight:500;margin:12px 0 5px}
.dlp .fc input,.dlp .fc select,.dlp .fc textarea{width:100%;font:inherit;font-size:17px;padding:12px 14px;border:1.5px solid #d9d2c2;border-radius:10px;background:#fffdf8;color:var(--ink)}
.dlp .fc input:focus,.dlp .fc select:focus,.dlp .fc textarea:focus{outline:none;border-color:var(--g);box-shadow:0 0 0 3px rgba(201,168,92,.22)}
.dlp .fc textarea{min-height:76px;resize:vertical}
.dlp .fc .seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dlp .fc .seg label{margin:0;display:flex;align-items:center;justify-content:center;border:1.5px solid #d9d2c2;border-radius:10px;padding:11px 8px;cursor:pointer;font-size:16px;font-weight:500}
.dlp .fc .seg input{position:absolute;opacity:0;pointer-events:none;width:1px}
.dlp .fc .seg input:checked+span{color:#14130f}
.dlp .fc .seg label:has(input:checked){background:var(--g2);border-color:var(--g)}
.dlp .fc .go{width:100%;margin-top:18px}
.dlp .fc .note{font-size:12.5px;color:var(--mut);margin-top:12px;line-height:1.5}
.dlp .fc .msg{font-size:14px;color:#a3322a;margin-top:8px;min-height:1px}
.dlp .fc .ok{text-align:center;padding:26px 6px}
.dlp .fc .ok b{display:block;font-family:'Frank Ruhl Libre',Georgia,serif;font-size:26px;margin-bottom:8px}
.dlp .hp{position:absolute!important;left:-9999px!important}
/* trust */
.dlp .trust{background:var(--d2);color:#eee7d6;border-top:1px solid rgba(201,168,92,.25)}
.dlp .trust .w{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.dlp .trust div{padding:22px 18px;border-inline-start:1px solid rgba(201,168,92,.18)}
.dlp .trust div:first-child{border-inline-start:0}
.dlp .trust b{display:block;font-family:'Frank Ruhl Libre',Georgia,serif;font-size:26px;color:var(--g);line-height:1.1}
.dlp .trust span{font-size:14.5px;color:#cfc8b8}
/* sections */
.dlp section.s{padding-block:76px}
.dlp .st{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:clamp(30px,3.6vw,42px);line-height:1.12;font-weight:700;text-wrap:balance}
.dlp .ss{color:var(--mut);font-size:18px;margin-top:10px;max-width:640px}
.dlp .eyebrow{color:var(--gd);font-weight:700;font-size:14px;letter-spacing:.06em;margin-bottom:10px}
.dlp .risks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-top:36px}
.dlp .risk{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px 22px;position:relative}
.dlp .risk .n{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:15px;font-weight:700;color:var(--gd);width:34px;height:34px;border:1.5px solid var(--g);border-radius:50%;display:grid;place-items:center;margin-bottom:14px}
.dlp .risk h3{font-size:19px;line-height:1.3;margin-bottom:6px}
.dlp .risk p{font-size:15.5px;color:#45433d}
/* steps */
.dlp .steps-s{background:var(--g2)}
.dlp .steps{list-style:none;margin-top:38px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;counter-reset:s}
.dlp .steps li{position:relative;padding:0 0 0 22px;counter-increment:s}
.dlp .steps li:before{content:counter(s);display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--d);color:var(--g);font-family:'Frank Ruhl Libre',Georgia,serif;font-weight:700;font-size:20px;position:relative;z-index:1;margin-bottom:16px}
.dlp .steps li:after{content:"";position:absolute;top:23px;right:46px;left:-0px;height:2px;background:linear-gradient(90deg,var(--g1),var(--g))}
.dlp .steps li:last-child:after{display:none}
.dlp .steps h3{font-size:18.5px;line-height:1.3;margin-bottom:6px}
.dlp .steps p{font-size:15px;color:#45433d}
/* included + about */
.dlp .two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:start}
.dlp .incl{list-style:none;margin-top:26px;display:grid;gap:12px}
.dlp .incl li{display:grid;grid-template-columns:28px 1fr;gap:10px;font-size:17px;align-items:start}
.dlp .incl li:before{content:"";width:22px;height:22px;margin-top:3px;border-radius:6px;background:var(--d) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c9a85c' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/15px no-repeat}
.dlp .about{background:var(--d);color:#e8e1d1;border-radius:20px;display:grid;grid-template-columns:200px minmax(0,1fr);overflow:hidden;align-items:end}
.dlp .about .ph{align-self:stretch;background:linear-gradient(180deg,#232733,#111318);display:flex;align-items:flex-end;justify-content:center;padding-top:22px}
.dlp .about .ph img{width:100%;max-width:200px;height:auto;display:block}
.dlp .about .tx{padding:28px 28px 26px}
.dlp .about h3{font-family:'Frank Ruhl Libre',Georgia,serif;font-size:26px;color:#fff;line-height:1.15}
.dlp .about .role{color:var(--g1);font-size:14.5px;margin:4px 0 12px}
.dlp .about p{font-size:15.5px;color:#cfc8b8}
.dlp .about ul{list-style:none;margin-top:14px;display:grid;gap:7px;font-size:14.5px}
.dlp .about li{display:flex;gap:9px;align-items:baseline}
.dlp .about li:before{content:"";width:6px;height:6px;background:var(--g);transform:rotate(45deg);flex:none;position:relative;top:-2px}
/* tools */
.dlp .tools{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}
.dlp .tool{display:flex;justify-content:space-between;gap:18px;align-items:center;background:#fff;border:1px solid var(--line);border-inline-start:4px solid var(--g);border-radius:14px;padding:22px 24px;text-decoration:none}
.dlp .tool b{display:block;font-size:19px;margin-bottom:3px}
.dlp .tool span{font-size:15px;color:var(--mut)}
.dlp .tool em{font-style:normal;font-weight:700;color:var(--gd);white-space:nowrap}
/* faq */
.dlp .faq{margin-top:28px;border-top:1px solid var(--line)}
.dlp .faq details{border-bottom:1px solid var(--line)}
.dlp .faq summary{list-style:none;cursor:pointer;padding:20px 0;font-weight:700;font-size:18.5px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.dlp .faq summary::-webkit-details-marker{display:none}
.dlp .faq summary:after{content:"+";font-family:'Frank Ruhl Libre',Georgia,serif;font-size:28px;color:var(--g);line-height:1;transition:transform .2s}
.dlp .faq details[open] summary:after{transform:rotate(45deg)}
.dlp .faq p{padding:0 0 20px;color:#45433d;max-width:760px}
/* final */
.dlp .final{background:var(--d);color:#eee7d6}
.dlp .final .w{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:56px;align-items:center}
.dlp .final .st{color:#fff}
.dlp .final .ss{color:#cfc8b8}
.dlp .final .ctas{margin-top:26px}
.dlp .addr{margin-top:22px;font-size:15px;color:#a9a294}
.dlp .foot{background:#0b0c10;color:#8d877b;font-size:13px;padding-block:22px 96px;text-align:center;line-height:1.7}
.dlp .foot a{color:#bdb6a7}
/* sticky mobile bar */
.dlp .bar{display:none}
@media (max-width:980px){
 .dlp .hero .w,.dlp .final .w,.dlp .two{grid-template-columns:minmax(0,1fr);gap:34px}
 .dlp .risks{grid-template-columns:1fr 1fr}
 .dlp .steps{grid-template-columns:minmax(0,1fr);gap:22px}
 .dlp .steps li{display:grid;grid-template-columns:46px 1fr;gap:4px 16px;padding:0}
 .dlp .steps li:before{grid-row:span 2;margin:0}
 .dlp .steps li:after{top:46px;bottom:-22px;right:22px;left:auto;width:2px;height:auto;background:var(--g1)}
 .dlp .trust .w{grid-template-columns:1fr 1fr}
 .dlp .trust div:nth-child(3){border-inline-start:0}
 .dlp .trust div{border-top:1px solid rgba(201,168,92,.12)}
}
@media (max-width:640px){
 .dlp{font-size:16px}
 .dlp .w{padding-inline:16px}
 .dlp .hero .w{padding-block:22px 40px}
 .dlp .top .tel{font-size:16px}
 .dlp .sub{font-size:17px}
 .dlp .ctas .btn{flex:1 1 100%}
 .dlp .proof{display:grid;grid-template-columns:1fr;gap:8px}
 .dlp .fc{padding:24px 18px 20px}
 .dlp section.s{padding-block:54px}
 .dlp .risks{grid-template-columns:minmax(0,1fr)}
 .dlp .tools{grid-template-columns:minmax(0,1fr)}
 .dlp .tool{flex-direction:column;align-items:flex-start;gap:8px}
 .dlp .about{grid-template-columns:minmax(0,1fr)}
 .dlp .about .ph{height:250px;overflow:hidden;padding-top:18px;align-items:flex-start}
 .dlp .about .ph img{max-width:210px}
 .dlp .trust b{font-size:22px}
 .dlp .trust div{padding:16px 12px}
 .dlp .bar{display:grid;grid-template-columns:1fr 1fr 1fr;position:fixed;bottom:0;right:0;left:0;z-index:99;background:var(--d);border-top:1px solid rgba(201,168,92,.35);padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px));gap:8px}
 .dlp .bar a{display:flex;flex-direction:column;align-items:center;gap:2px;color:#eee7d6;text-decoration:none;font-size:12.5px;font-weight:500;padding:6px 0;border-radius:10px}
 .dlp .bar a.m{background:var(--g);color:#14130f;font-weight:700}
 .dlp .bar svg{width:20px;height:20px}
}
"""

I_TEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
I_WA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.5-.3z"/></svg>'
I_FORM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'

def esc(s): return html.escape(s, quote=True)

def form(p, fid):
    other = 'sell' if p is PAGES['buy'] else 'buy'
    me = 'buy' if p is PAGES['buy'] else 'sell'
    return f'''<div class="fc" id="{fid}"><h2>{esc(p['form_t'])}</h2><p class="fs">{esc(p['form_s'])}</p>
<form data-dlp novalidate><div class="seg" role="radiogroup" aria-label="מה אתם עושים"><label><input type="radio" name="kind" value="קניית דירה"{' checked' if me=='buy' else ''}><span>קונים דירה</span></label><label><input type="radio" name="kind" value="מכירת דירה"{' checked' if me=='sell' else ''}><span>מוכרים דירה</span></label></div>
<label for="{fid}-n">שם מלא</label><input id="{fid}-n" name="name" autocomplete="name" required>
<label for="{fid}-p">טלפון</label><input id="{fid}-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" required>
<label for="{fid}-m">כמה מילים על הדירה (לא חובה)</label><textarea id="{fid}-m" name="msg" placeholder="עיר, שלב בעסקה, שאלה שמטרידה אתכם"></textarea>
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="btn b-d go" type="submit">שלחו ונחזור אליכם</button><p class="msg" aria-live="polite"></p>
<p class="note">הפרטים משמשים רק כדי לחזור אליכם בנוגע לפנייה. המידע בעמוד כללי ואינו ייעוץ משפטי.</p></form></div>'''

def page(key):
    p = PAGES[key]
    wa = f'https://wa.me/{WA}?text=' + __import__('urllib.parse').parse.quote(p['wa'])
    risks = ''.join(f'<div class="risk"><div class="n">{i+1}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i,(t,d) in enumerate(p['risks']))
    steps = ''.join(f'<li><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for t,d in p['steps'])
    incl = ''.join(f'<li>{esc(x)}</li>' for x in p['incl'])
    tools = ''.join(f'<a class="tool" href="https://dabullaw.co.il{u}"><div><b>{esc(t)}</b><span>{esc(d)}</span></div><em>{esc(c)} ←</em></a>' for t,d,c,u in (p['tool'],p['tool2']))
    faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in p['faq'])
    ld = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in p['faq']]}
    js = """(function(){var A='__API__';function q(k){try{return new URLSearchParams(location.search).get(k)||''}catch(e){return ''}}
var src=q('utm_source')||(q('gclid')?'google':'')||(q('fbclid')?'facebook':'')||'website';var camp=q('utm_campaign');
document.querySelectorAll('form[data-dlp]').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var m=f.querySelector('.msg'),b=f.querySelector('.go'),g=function(n){var x=f.elements[n];return x?String(x.value||'').trim():''};
var k=f.querySelector('input[name=kind]:checked');var tel=g('phone').replace(/[^0-9+]/g,'');
if(g('website')){return}if(g('name').length<2){m.textContent='כתבו שם, בבקשה.';return}if(tel.replace(/[^0-9]/g,'').length<9){m.textContent='כתבו מספר טלפון תקין, בבקשה.';return}
m.textContent='';b.disabled=true;b.textContent='שולחים...';
var body={name:g('name'),phone:tel,topic:(k?k.value:'__TOPIC__'),source:'ads-'+src,form:'lp-__KEY__',page:location.href.split('#')[0].slice(0,300),notes:(g('msg')?g('msg')+'\\n':'')+'קמפיין: '+(camp||src)};
var ok=function(){f.parentNode.innerHTML='<div class="ok"><b>תודה, קיבלנו.</b>עורך הדין יחזור אליכם בהקדם, בדרך כלל באותו יום עבודה.<br>דחוף? <a href="tel:__PHONE_INTL__" dir="ltr">__PHONE__</a></div>';try{window.gtag&&window.gtag('event','generate_lead',{form_name:'lp-__KEY__',page_path:location.pathname})}catch(x){}};
var bad=function(){b.disabled=false;b.textContent='שלחו ונחזור אליכם';m.textContent='משהו השתבש. אפשר להתקשר: __PHONE__'};
fetch(A,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){j&&j.ok?ok():bad()}).catch(bad)})})})();"""
    js = js.replace('__API__',API).replace('__TOPIC__',p['topic']).replace('__KEY__',key).replace('__PHONE_INTL__',PHONE_INTL).replace('__PHONE__',PHONE)
    body = f'''<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&display=swap">
<style>{CSS.replace('__IMG__', IMG)}</style>
<div class="dlp">
<header class="hero"><div class="w top" style="display:flex;padding-block:22px 0"><a class="logo" href="https://dabullaw.co.il/">יקיר דבול<small>משרד עורכי דין · מקרקעין ונדל"ן</small></a><a class="tel" href="tel:{PHONE_INTL}">{PHONE}</a></div>
<div class="w"><div><span class="kick">{esc(p['kick'])}</span><h1>{p['h1']}</h1><p class="sub">{esc(p['sub'])}</p>
<div class="ctas"><a class="btn b-g" href="tel:{PHONE_INTL}">{I_TEL}להתקשר עכשיו</a><a class="btn b-o" href="{esc(wa)}">{I_WA}לכתוב בוואטסאפ</a></div>
<div class="proof"><span><i></i>עורך הדין עצמו מטפל בתיק</span><span><i></i>שכר טרחה בהסכם כתוב מראש</span><span><i></i>משרד ברחוב רזיאל 1, נתניה</span></div></div>
{form(p,'f1')}</div></header>
<div class="trust"><div class="w"><div><b>+100</b><span>עסקאות מקרקעין בכל שנה</span></div><div><b>1 על 1</b><span>מול עורך הדין, מהשיחה הראשונה ועד הטאבו</span></div><div><b>4</b><span>ועדות בלשכת עורכי הדין שבהן הוא חבר</span></div><div><b>באותו יום</b><span>בדרך כלל חוזרים אליכם באותו יום עבודה</span></div></div></div>
<section class="s"><div class="w"><p class="eyebrow">למה עורך דין מההתחלה</p><h2 class="st">{esc(p['risk_t'])}</h2><p class="ss">{esc(p['risk_s'])}</p><div class="risks">{risks}</div></div></section>
<section class="s steps-s"><div class="w"><p class="eyebrow">התהליך</p><h2 class="st">{esc(p['steps_t'])}</h2><ol class="steps">{steps}</ol></div></section>
<section class="s"><div class="w two"><div><p class="eyebrow">מה כולל הליווי</p><h2 class="st">הכל במקום אחד, מול עורך דין אחד</h2><ul class="incl">{incl}</ul></div>
<div class="about"><div class="ph"><img src="{IMG}yakir-cutout.webp" alt="עו&quot;ד יקיר דבול" width="200" height="399"></div><div class="tx"><h3>עו"ד יקיר דבול</h3><p class="role">עורך דין מקרקעין ונדל"ן, נתניה</p><p>אצלנו את התיק מנהל עורך הדין עצמו, ואיתו אתם מדברים בכל שלב. כשצריך, עובדים יחד עם שמאי, מהנדס או יועץ משכנתאות.</p>
<ul><li>מתמנה על ידי בית המשפט בתיקי רישום בתים משותפים</li><li>חבר ב-4 ועדות בלשכת עורכי הדין</li><li>משרד ברחוב רזיאל 1, נתניה</li></ul></div></div></div></section>
<section class="s" style="padding-top:0"><div class="w"><p class="eyebrow">כלים בלי הרשמה</p><h2 class="st" style="font-size:clamp(26px,3vw,34px)">אפשר להתחיל לבד</h2><div class="tools">{tools}</div></div></section>
<section class="s steps-s"><div class="w"><p class="eyebrow">שאלות נפוצות</p><h2 class="st">מה שואלים אותנו לפני שמתחילים</h2><div class="faq">{faq}</div></div></section>
<section class="s final" id="contact"><div class="w"><div><h2 class="st">בואו נדבר על הדירה שלכם</h2><p class="ss">שיחה ראשונה קצרה, ונגיד לכם מה צריך לבדוק ומה השלב הבא.</p>
<div class="ctas"><a class="btn b-g" href="tel:{PHONE_INTL}">{I_TEL}<span dir="ltr">{PHONE}</span></a><a class="btn b-o" href="{esc(wa)}">{I_WA}וואטסאפ</a></div><p class="addr">יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה · ימים א' עד ה'</p></div>
{form(p,'f2')}</div></section>
<div class="foot">© יקיר דבול - משרד עורכי דין · <a href="https://dabullaw.co.il/">dabullaw.co.il</a><br>המידע בעמוד הוא מידע כללי ואינו מהווה ייעוץ משפטי. כל מקרה נבדק לגופו.</div>
<nav class="bar" aria-label="יצירת קשר"><a href="tel:{PHONE_INTL}">{I_TEL}התקשרו</a><a href="{esc(wa)}">{I_WA}וואטסאפ</a><a class="m" href="#f1">{I_FORM}השאירו פרטים</a></nav>
</div>
<script type="application/ld+json">{json.dumps(ld,ensure_ascii=False)}</script>
<script nowprocket data-no-optimize="1">{js}</script>'''
    return body

out = HERE / 'lp'
out.mkdir(exist_ok=True)
for k in PAGES:
    frag = page(k)
    (out / f'{k}.fragment.html').write_text(frag)
    prev = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{PAGES[k]['topic']}</title>
<style>@font-face{{font-family:Heebo;src:url(../../../docs/buyer-checklist/fonts/heebo-hebrew-300-normal.woff2);font-weight:300}}@font-face{{font-family:Heebo;src:url(../../../docs/buyer-checklist/fonts/heebo-hebrew-400-normal.woff2);font-weight:400}}@font-face{{font-family:Heebo;src:url(../../../docs/buyer-checklist/fonts/heebo-hebrew-500-normal.woff2);font-weight:500}}@font-face{{font-family:Heebo;src:url(../../../docs/buyer-checklist/fonts/heebo-hebrew-700-normal.woff2);font-weight:700}}
@font-face{{font-family:'Frank Ruhl Libre';src:url(../../../docs/buyer-checklist/fonts/frank-ruhl-libre-hebrew-700-normal.woff2);font-weight:700}}@font-face{{font-family:'Frank Ruhl Libre';src:url(../../../docs/buyer-checklist/fonts/frank-ruhl-libre-hebrew-500-normal.woff2);font-weight:500}}
body{{margin:0;font-family:Heebo,Arial,sans-serif}}</style></head><body>{frag}</body></html>'''
    (out / f'{k}.preview.html').write_text(prev)
print('ok', [str(p) for p in out.iterdir()])
