// Animated explainers. `guides` = where each one is embedded automatically (under "בקצרה").
export const ANIMS = [
  { id: 'hadlut-path', title: 'הדרך בחדלות פירעון, מהבקשה ועד ההפטר', caption: 'חמש תחנות, בדרך כלל כ-4 שנים', alt: 'ציר זמן של הליך חדלות פירעון: בקשה, צו לפתיחת הליכים, תקופת ביניים של כשנה, צו לשיקום כלכלי של כ-3 שנים, והפטר.', guides: ['ma-ze-hadlut-piraon', 'tkufat-habeinayim', 'tzav-shikum-kalkali', 'tzav-ptichat-halichim', 'pshitat-regel-vs-hadlut'] },
  { id: 'ribit', title: 'למה חוב שלא מטפלים בו גדל', caption: 'אותו חוב, שתי דרכים, חמש שנים. המספרים להמחשה בלבד', alt: 'גרף עמודות: חוב של 10,000 שקל בריבית של אחוז לחודש גדל לכ-18,000 שקל בחמש שנים בלי תשלום, ונסגר תוך כ-4 שנים בתשלום של 300 שקל בחודש.', guides: ['minus', 'ashrai-chacham', 'tzaadim-rishonim', 'masa-umatan-bank'] },
  { id: 'ichud', title: 'איך עובד איחוד תיקים', caption: 'כמה תיקים, תשלום אחד', alt: 'ארבעה תיקים בהוצאה לפועל מתאחדים לתיק אחד, ותשלום חודשי אחד עובר ממנו לנושים. התקופות: עד 20,000 שקל שנתיים, עד 100,000 שקל שלוש שנים, מעל ארבע שנים, ועד שלוש שנות הארכה.', guides: ['ichud-tikim', 'hashvaat-maslulim'] },
  { id: 'ikul', title: 'עיקול משכורת: מה מוגן ומה לא', caption: 'חלק מהשכר מוגן תמיד', alt: 'פס משכורת: החלק המוגן לפי גמלת הבטחת הכנסה והרכב המשפחה, ורק מה שמעליו אפשר לעקל.', guides: ['ikulim', 'chakirat-yecholet', 'ikul-maskoret'] },
  { id: 'taktziv', title: 'לאן הולכת המשכורת', caption: 'ואיך גם שארית קטנה בונה קרן חירום', alt: 'פס הכנסה שמתחלק לדיור, מזון, חשבונות, תחבורה וחובות, והשארית נופלת לצנצנת של קרן חירום.', guides: ['taktziv', 'kerit-bitachon', 'lo-lachzor-lechovot'] },
  { id: 'yamim-30', title: '30 הימים להתנגדות', caption: 'השעון מתחיל ביום שקיבלתם את האזהרה', alt: 'לוח של 30 ימים: היום הראשון הוא יום קבלת האזהרה והיום ה-30 הוא המועד האחרון להתנגדות.', guides: ['hitnagdut'] },
] as const;
export const animsFor = (slug: string) => ANIMS.filter((a) => (a.guides as readonly string[]).includes(slug)).map((a) => a.id);
