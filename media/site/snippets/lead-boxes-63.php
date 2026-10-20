/* dabul: lead boxes (v2, Yakir approved the designs 16.10.2026).
   1) The dark box ("כרטיס כהה") only in the articles listed in dabul_lb_list(), before the article's
      second heading: topic chip, title, Google rating, name, phone, a short optional note, the site's privacy consent,
      a call button and a WhatsApp button (entries marked 'nowa' get the call button only).
   2) The short box ("קצרה לאמצע המאמר") in the middle of every article (post): the heading closest to the middle of the
      text, never the first one, never the FAQ / sources / glossary, and never right where the dark box is.
   3) 20.10.2026 (Yakir approved, item ז): in the 20 most visited articles (dabul_lbq_list()) the short middle box is
      replaced, in the same spot, by a targeted form in two questions: question 1 is a choice that fits the article
      (saved on the lead as "מצב: ..."), question 2 is name and phone. Same look as the short box, phone only, no
      WhatsApp. Campaign "אתר · טופס ממוקד". The two articles of that list that had no dark box got one, without
      WhatsApp. Every other article keeps the short box as it was.
   All forms are plain HTML (no script) and post straight to the office system's lead intake, which saves the lead,
   sends the Telegram alert and returns the reader to the article with a thank-you (?dlb=sent / ?dlbm=sent / ?dlbe=sent).
   Leads carry the page address; campaign "אתר · <topic>" for the dark box and "אתר · אמצע מאמר" for the short one.
   Replaces snippet 45 (the old call/WhatsApp box in 6 articles), which is switched off. To undo: deactivate this
   snippet and switch 45 back on. Also: GET /wp-json/dabul/v1/formlog (admin only) shows the last form forwards. */

function dabul_lb_list() {
	$q = 'הצעת שכר טרחה';
	return array(
		'המחירון-המשפטי-המלא-לשנת-2026' => array($q, 'רוצים לדעת כמה זה יעלה בעסקה שלכם?', 'ספרו בקצרה על העסקה, ועו"ד יקיר דבול יחזור אליכם עם הצעת שכר טרחה כתובה, בדרך כלל עוד באותו יום עבודה.', 'למשל: קנייה של דירת 4 חדרים יד שנייה בנתניה', 'קבלו הצעת שכר טרחה'),
		'מחיר-עורך-דין-מקרקעין' => array($q, 'רוצים לדעת כמה זה יעלה בעסקה שלכם?', 'ספרו בקצרה על העסקה, ועו"ד יקיר דבול יחזור אליכם עם הצעת שכר טרחה כתובה, בדרך כלל עוד באותו יום עבודה.', 'למשל: מכירת דירה עם משכנתא בכפר סבא', 'קבלו הצעת שכר טרחה'),
		'איך-משלמים-מס-רכישה' => array('מס רכישה', 'כמה מס רכישה תשלמו בפועל?', 'שלחו את הפרטים, ונבדוק איתכם את החישוב, אם מגיעה לכם הקלה ומה צריך לדווח לרשות המסים ועד מתי.', 'מחיר הדירה, והאם זו הדירה היחידה שלכם', 'שלחו לבדיקה'),
		'איך-מוצאים-את-הגוש-והחלקה-של-הנכס-המדרי' => array('בדיקת נסח טאבו', 'מצאתם את הגוש והחלקה? עכשיו בודקים מה רשום על הנכס', 'עו"ד יקיר דבול עובר איתכם על נסח הטאבו: משכנתאות, עיקולים, הערות אזהרה והצמדות, ומסביר בשפה פשוטה מה זה אומר על העסקה.', 'כתובת הנכס, או גוש וחלקה', 'בקשו בדיקה'),
		'פטור-ארנונה-לנכס-ריק' => array('ארנונה לנכס ריק', 'קיבלתם חיוב ארנונה על נכס ריק?', 'נבדוק אם יש בסיס לבקשת פטור או להשגה על החיוב, ומה המועדים שחשוב לא לפספס.', 'איזה נכס, ומאיזה תאריך הוא ריק', 'שאלו את עורך הדין'),
		'כתב-ערבות-לשכירות' => array('חוזה שכירות', 'משכירים או שוכרים? בודקים את החוזה לפני שחותמים', 'עו"ד יקיר דבול מנסח ובודק חוזי שכירות וערבויות: אילו בטוחות לבקש, מי אחראי לתיקונים ואיך יוצאים מהחוזה.', 'משכירים או שוכרים, ואיזה נכס', 'שלחו לבדיקה'),
		'חברה-משכנת-העברת-זכויות-ורישום-ראשון' => array('חברה משכנת', 'דירה שרשומה בחברה משכנת? נבדוק מה צריך לרישום', 'עו"ד יקיר דבול מלווה העברת זכויות בחברה משכנת ורישום ראשון בטאבו: אישורים, מסמכים ותיאום מול החברה.', 'שם החברה המשכנת והעיר', 'בקשו בדיקה'),
		'קניית-חניה-בנפרד' => array('קניית חניה', 'קונים חניה בנפרד מהדירה?', 'נבדוק שהחניה רשומה כמו שצריך, שאפשר להצמיד אותה לדירה, ושהחוזה מגן עליכם.', 'הכתובת, והאם החניה רשומה בטאבו', 'בקשו בדיקה'),
		'הקניית-בעלות-במנהל-רמי' => array('הקניית בעלות ברמ"י', 'צריכים להקנות בעלות ברמ"י? נעשה את זה איתכם', 'עו"ד יקיר דבול בודק אם הנכס זכאי להקניה, מכין את הבקשה ומלווה אותה מול רשות מקרקעי ישראל.', 'כתובת הנכס', 'בקשו בדיקה'),
		'זכויות-בנייה-והצמדת-גגות-בבניינים-משו' => array('גגות וזכויות בנייה', 'שאלה על גג, הצמדה או זכויות בנייה בבניין?', 'עו"ד יקיר דבול בודק את צו הבית המשותף, את התקנון ואת ההצמדות, ומסביר מה מותר ומה צריך הסכמה של השכנים.', 'מה רוצים לבנות או להצמיד', 'שאלו את עורך הדין'),
		'completion-certificate-vs-form-4-legal-guide' => array('תעודת גמר וטופס 4', 'אין לבניין תעודת גמר או טופס 4?', 'כדאי לבדוק לפני שחותמים. עו"ד יקיר דבול בודק את תיק הבניין בעירייה ומסביר מה המשמעות לעסקה, למשכנתא ולרישום.', 'כתובת הבניין', 'בקשו בדיקה'),
		'how-long-does-pinui-binui-take-timeline' => array('התחדשות עירונית', 'הבניין שלכם בפינוי בינוי?', 'עו"ד יקיר דבול מייצג דיירים: בודק את הסכם היזם, את הבטוחות ואת לוחות הזמנים, לפני שחותמים.', 'העיר, ובאיזה שלב הפרויקט', 'שאלו את עורך הדין'),
		'noise-odor-smoke-nuisance-neighbor-guide' => array('מטרד משכנים', 'מטרד מהשכנים שלא נגמר?', 'נבדוק אילו צעדים אפשר לנקוט במקרה שלכם, ממכתב התראה ועד פנייה לבית המשפט.', 'מה המטרד, וממתי', 'שאלו את עורך הדין'),
		'ground-floor-building-yard-use-rights' => array('רכוש משותף', 'מחלוקת על החצר או על הרכוש המשותף?', 'עו"ד יקיר דבול בודק את צו הבית המשותף ואת ההצמדות, ומסביר מה הזכויות שלכם ומה אפשר לעשות.', 'מה המחלוקת', 'שאלו את עורך הדין'),
		'what-is-tzr-plan-for-registration-guide' => array('רישום בית משותף', 'הבניין לא רשום כבית משותף?', 'עו"ד יקיר דבול מלווה רישום בתים משותפים, כולל תשריט לרישום, ומתמנה על ידי בית המשפט בתיקי רישום.', 'כתובת הבניין', 'בקשו בדיקה'),
		'senior-citizens-rights-urban-renewal-guide' => array('התחדשות עירונית', 'דיירים מבוגרים בפרויקט התחדשות עירונית?', 'נבדוק שההסכם כולל את ההגנות שהחוק מאפשר לבני הגיל השלישי, לפני שחותמים.', 'העיר, ובאיזה שלב הפרויקט', 'שאלו את עורך הדין'),
		'ביטול-עסקת-מקרקעין' => array('ביטול עסקה', 'רוצים לבטל עסקה, או שהצד השני מבקש לבטל?', 'נבדוק את החוזה ואת מה שקרה, ונסביר מה האפשרויות ומה הסיכונים לפני כל צעד.', 'מה נחתם, ומה קרה מאז', 'שאלו את עורך הדין'),
		'מע״מ-בעסקת-מקרקעין' => array('מע"מ בעסקה', 'יש מע"מ בעסקה שלכם?', 'נבדוק אם העסקה חייבת במע"מ, מי משלם אותו ואיך זה צריך להופיע בחוזה.', 'סוג הנכס, ומי המוכר', 'שאלו את עורך הדין'),
		'חכירה-מהוונת-מה-זה-אומר-ומה-ההבדל-בינה' => array('חכירה ברמ"י', 'הנכס בחכירה ברמ"י?', 'נבדוק אם החכירה מהוונת, מה זה אומר על המכירה ועל המשכנתא, ומה צריך להסדיר לפני העסקה.', 'כתובת הנכס', 'בקשו בדיקה'),
		'neighbor-refuses-house-committee-dues-guide' => array('ועד בית', 'דייר לא משלם ועד בית?', 'עו"ד יקיר דבול מלווה נציגויות של בתים משותפים: מכתבי דרישה ותביעות גבייה.', 'כמה דירות בבניין, וממתי החוב', 'שאלו את עורך הדין'),
		// 20.10.2026 (item ז): two of the 20 most visited articles had no dark box. Call button only, no WhatsApp.
		'הארכת-תקופה-למכירת-דירה-המדריך-המלא-על' => array('מכירת דירה שנייה', 'קניתם דירה חדשה ועוד לא מכרתם את הישנה?', 'נבדוק איזה מועד חל עליכם, אם אפשר לבקש הארכה, ומה המשמעות למס הרכישה אם מאחרים.', 'מתי קניתם, ומתי מתוכננת המכירה', 'בדקו את המועד שלי', 'nowa'),
		'cancel-caveat-note-warning-removal-guide' => array('הערת אזהרה', 'הערת אזהרה שנשארה בטאבו ועוצרת לכם עסקה?', 'נבדוק מי רשם אותה ועל מה, ואיזו דרך מתאימה למחוק אותה: בהסכמה או בבית המשפט.', 'מה כתוב בהערה, ומי רשם אותה', 'בקשו בדיקה', 'nowa'),
	);
}
/* The targeted form (item ז): topic, title, line under it, question 1, its answers, button. */
function dabul_lbq_list() {
	return array(
		'המחירון-המשפטי-המלא-לשנת-2026' => array('הצעת שכר טרחה', 'איזה שירות אתם צריכים?', 'בחרו נושא והשאירו טלפון. עו"ד יקיר דבול יחזור אליכם עם הצעת שכר טרחה כתובה.', 'מה הנושא?', array('קנייה או מכירה של דירה', 'צוואה, ירושה או ייפוי כוח מתמשך', 'מחלוקת או תביעה בנדל"ן', 'משהו אחר'), 'קבלו הצעה כתובה'),
		'איך-מוצאים-את-הגוש-והחלקה-של-הנכס-המדרי' => array('בדיקת נסח טאבו', 'מצאתם את הגוש והחלקה. בשביל מה אתם צריכים אותם?', 'נבדוק מה רשום על הנכס ומה זה אומר לגביכם, לפני שמתקדמים.', 'בשביל מה?', array('לפני קניית דירה', 'לפני מכירה', 'רישום או תיקון בטאבו', 'סיבה אחרת'), 'בדקו לי את הנכס'),
		'איך-משלמים-מס-רכישה' => array('מס רכישה', 'רוצים לוודא שאתם משלמים את הסכום הנכון?', 'שתי שאלות קצרות, ועו"ד יקיר דבול יחזור אליכם לבדוק את החישוב.', 'באיזה מצב אתם?', array('דירה יחידה', 'דירה נוספת או להשקעה', 'משפרי דיור, מוכרים דירה קיימת', 'תושב חוץ או עולה חדש'), 'בדקו את החישוב שלי'),
		'פטור-ארנונה-לנכס-ריק' => array('ארנונה לנכס ריק', 'הנכס ריק ואתם עדיין משלמים ארנונה?', 'נבדוק אם יש בסיס לבקשת פטור או להשגה, ומה המועדים במקרה שלכם.', 'איזה נכס?', array('דירת מגורים', 'נכס מסחרי', 'נכס בשיפוץ או לא ראוי לשימוש', 'העירייה דחתה בקשה'), 'בדקו את המקרה שלי'),
		'חברה-משכנת-העברת-זכויות-ורישום-ראשון' => array('חברה משכנת', 'קונים או מוכרים דירה שרשומה בחברה משכנת?', 'נבדוק אילו אישורים חסרים ומה צריך כדי שהדירה תירשם על שמכם.', 'מה המצב?', array('קונים', 'מוכרים', 'רוצים לרשום בטאבו', 'החברה מעכבת אישור'), 'בדקו מה צריך אצלי'),
		'כתב-ערבות-לשכירות' => array('חוזה שכירות', 'חוזה שכירות או ערבות לפני חתימה?', 'נעבור על החוזה ועל הבטוחות, ונסמן מה כדאי לשנות לפני שחותמים.', 'מי אתם בעסקה?', array('משכיר/ה', 'שוכר/ת', 'ערב/ה', 'יש מחלוקת עם הצד השני'), 'שלחו לבדיקה'),
		'הקניית-בעלות-במנהל-רמי' => array('הקניית בעלות ברמ"י', 'הנכס רשום בחכירה ברמ"י?', 'נבדוק אם הוא זכאי להקניית בעלות ומה צריך כדי להתקדם.', 'מה המצב?', array('רוצים להקנות בעלות', 'מוכרים דירה בחכירה', 'קיבלנו דרישת תשלום מרמ"י', 'לא בטוחים מה המצב'), 'בדקו את הזכאות'),
		'זכויות-בנייה-והצמדת-גגות-בבניינים-משו' => array('גגות וזכויות בנייה', 'רוצים לבנות, להצמיד או לעצור בנייה בבניין?', 'נבדוק מה רשום בצו הבית המשותף ובתקנון, ומה דורש הסכמה של השכנים.', 'מה המקרה?', array('רוצים להצמיד גג או חצר', 'שכן בונה בלי הסכמה', 'תוספת בנייה בבניין', 'בדיקה לפני קנייה'), 'שאלו את עורך הדין'),
		'how-long-does-pinui-binui-take-timeline' => array('התחדשות עירונית', 'באיזה שלב הפרויקט שלכם?', 'נבדוק את ההסכם, הבטוחות ולוחות הזמנים, לפני כל חתימה.', 'השלב', array('יזם פנה לדיירים', 'הוצג הסכם לחתימה', 'כבר חתמנו', 'יש עיכובים בפרויקט'), 'בדקו את ההסכם שלנו'),
		'completion-certificate-vs-form-4-legal-guide' => array('תעודת גמר וטופס 4', 'קונים דירה בבניין בלי תעודת גמר או טופס 4?', 'נבדוק את תיק הבניין ומה זה אומר על העסקה, על המשכנתא ועל הרישום.', 'מה המצב?', array('לפני חתימה', 'כבר חתמנו', 'הבנק עוצר משכנתא', 'מוכרים דירה כזו'), 'בדקו את הבניין'),
		'קניית-חניה-בנפרד' => array('קניית חניה', 'קונים או מוכרים חניה?', 'נבדוק שהחניה רשומה כמו שצריך ושהחוזה מגן עליכם.', 'איזו חניה?', array('חניה צמודה בטאבו', 'חניה בלי רישום', 'חניה מהקבלן', 'מחלוקת על חניה'), 'בקשו בדיקה'),
		'חכירה-מהוונת-מה-זה-אומר-ומה-ההבדל-בינה' => array('חכירה ברמ"י', 'לא בטוחים אם החכירה מהוונת?', 'נבדוק מה רשום ברמ"י ומה צריך להסדיר לפני העסקה.', 'מה מתוכנן?', array('קונים', 'מוכרים', 'לוקחים משכנתא', 'מעבירים לבן משפחה'), 'בדקו את הנכס'),
		'ground-floor-building-yard-use-rights' => array('רכוש משותף', 'מחלוקת על חצר או על רכוש משותף?', 'נבדוק את צו הבית המשותף ואת ההצמדות, ונסביר מה הזכויות שלכם.', 'מי אתם?', array('בעלי דירת הגן', 'שכן תפס שטח משותף', 'רוצים לבנות בחצר', 'קונים דירת גן'), 'שאלו את עורך הדין'),
		'senior-citizens-rights-urban-renewal-guide' => array('התחדשות עירונית', 'יש בבניין דיירים מבוגרים שמתבקשים לחתום?', 'נבדוק שההסכם כולל את ההגנות שהחוק מאפשר, לפני החתימה.', 'מי פונה?', array('הוריי בבניין שמתחדש', 'אני הדייר/ת', 'קיבלנו הצעה מהיזם', 'כבר חתמנו'), 'בדקו את ההסכם'),
		'הארכת-תקופה-למכירת-דירה-המדריך-המלא-על' => array('מכירת דירה שנייה', 'קניתם דירה חדשה ועוד לא מכרתם את הישנה?', 'נבדוק איזה מועד חל עליכם, אם אפשר לבקש הארכה ומה קורה אם מאחרים.', 'מה המצב?', array('קניתי ועוד לא מכרתי', 'המועד עומד לעבור', 'המועד כבר עבר', 'קיבלתי דרישה מרשות המסים'), 'בדקו את המועד שלי'),
		'cancel-caveat-note-warning-removal-guide' => array('הערת אזהרה', 'הערת אזהרה שנשארה בטאבו ועוצרת לכם עסקה?', 'נבדוק מי רשם אותה ועל מה, ואיזו דרך מתאימה למחוק אותה.', 'איזו הערה?', array('של קונה שהעסקה איתו בוטלה', 'ישנה, של בנק או חברה', 'לטובת קבלן', 'לא יודעים מה היא'), 'בדקו איך מוחקים'),
		'neighbor-refuses-house-committee-dues-guide' => array('ועד בית', 'חוב של דייר לוועד הבית?', 'נבדוק מה אפשר לעשות במקרה שלכם, ממכתב דרישה ועד תביעה.', 'מי אתם?', array('הנציגות של הבניין', 'הדייר שנדרש לשלם', 'מחלוקת על תיקון', 'אין נציגות רשמית'), 'שאלו את עורך הדין'),
		'what-is-tzr-plan-for-registration-guide' => array('רישום בית משותף', 'הדירה לא רשומה בטאבו כי הבניין לא נרשם?', 'נבדוק מה חסר כדי לרשום את הבניין ואת הדירה, ומי צריך לעשות את זה.', 'מה המצב?', array('קונים דירה כזו', 'מוכרים', 'דיירים שרוצים לרשום את הבניין', 'הקבלן לא רשם'), 'בדקו מה חסר'),
		'noise-odor-smoke-nuisance-neighbor-guide' => array('מטרד משכנים', 'מה סוג המטרד?', 'נבדוק אילו צעדים אפשר לנקוט במקרה שלכם, ממכתב התראה ועד בית משפט.', 'המטרד', array('רעש', 'עשן או ריח', 'רטיבות או נזילה מהשכן', 'משהו אחר'), 'שאלו מה אפשר לעשות'),
		'ביטול-עסקת-מקרקעין' => array('ביטול עסקה', 'באיזה צד של העסקה אתם?', 'נבדוק את החוזה ואת מה שקרה, ונסביר מה האפשרויות לפני כל צעד.', 'הצד שלכם', array('הקונה', 'המוכר/ת', 'עוד לא נחתם חוזה', 'יש מחלוקת על כסף שהועבר'), 'בדקו את האפשרויות'),
	);
}
function dabul_lb_match($list) {
	if (!is_singular() || is_front_page()) return null;
	$slug = urldecode((string) get_post_field('post_name', get_queried_object_id()));
	foreach ($list as $k => $v) { if ($slug === $k || strpos($slug, $k) === 0) return $v; }
	return null;
}
function dabul_lb_for_post() { return dabul_lb_match(dabul_lb_list()); }
function dabul_lbq_for_post() { return dabul_lb_match(dabul_lbq_list()); }
function dabul_lbm_on() { return is_singular('post') && !is_front_page(); }
function dabul_lb_consent($id) {
	return '<label class="cs" for="' . $id . '"><input type="checkbox" id="' . $id . '" name="privacy" value="yes" required><span>קראתי ומסכימ/ה ל<a href="https://dabullaw.co.il/privacy-policy/" target="_blank" rel="noopener">מדיניות הפרטיות</a></span></label>'
		. '<p class="lg">אני מאשר/ת כי ידוע לי ומוסכם עלי כי הפרטים שמסרתי ייאספו, יוחזקו ויעובדו במאגר מידע בהתאם להוראות חוק הגנת הפרטיות, התשמ"א-1981 (כולל תיקון 13), ולמטרות המפורטות במדיניות הפרטיות של האתר. ידוע לי כי מסירת המידע נעשית מרצוני החופשי, וכי עומדות לי הזכויות המוקנות לי לפי החוק.</p>';
}
function dabul_lb_hidden($topic, $campaign, $link) {
	return '<input type="hidden" name="topic" value="' . esc_attr($topic) . '">'
		. '<input type="hidden" name="source" value="website">'
		. '<input type="hidden" name="campaign" value="' . esc_attr($campaign) . '">'
		. '<input type="hidden" name="page" value="' . esc_url($link) . '">'
		. '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';
}
function dabul_lb_action($back) {
	return esc_url('https://mgjmnvpnovkewvqevjmz.' . 'supa' . 'base.co/functions/v1/lead?source=website&redirect=' . rawurlencode($back));
}
add_action('wp_head', function () {
	if (!dabul_lb_for_post() && !dabul_lbm_on() && !dabul_lbq_for_post()) return;
	echo '<style id="dbl-lb-css">
.dlb,.dlbm{direction:rtl;clear:both;scroll-margin-top:90px;position:relative;text-align:right}
.dlb *,.dlbm *{box-sizing:border-box}
.dlb svg,.dlbm svg{display:block}
.dlb .hp,.dlbm .hp{position:absolute!important;top:0!important;left:0!important;width:1px!important;height:1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;opacity:0!important;pointer-events:none}
.dlb .cs,.dlbm .cs{grid-column:1/-1;display:flex!important;gap:8px;align-items:flex-start;font-size:13px!important;line-height:1.45!important;margin:2px 0 0!important;cursor:pointer;font-weight:400}
.dlb .cs input,.dlbm .cs input{width:18px!important;height:18px!important;min-height:0!important;flex:none;margin:1px 0 0!important;padding:0!important;accent-color:#c9a85c}
.dlb .cs a,.dlbm .cs a{font-weight:700;text-decoration:underline!important}
.dlb .lg,.dlbm .lg{grid-column:1/-1;font-size:11.5px!important;line-height:1.5!important;margin:0!important}
.dlb{margin:28px 0;background:#16161a;color:#f3efe6;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(22,22,26,.18);padding:20px 18px 16px}
.dlb:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,#c9a85c,#e9d39b,#c9a85c)}
.dlb .hd{display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;align-items:center}
.dlb .hd img{width:72px!important;height:72px!important;max-width:none;border-radius:50%!important;border:2px solid #c9a85c;object-fit:cover;margin:0!important;display:block}
.dlb .kk{display:inline-block;font-size:12.5px;font-weight:700;color:#e2c983;background:rgba(201,168,92,.12);border:1px solid rgba(201,168,92,.35);padding:2px 9px;border-radius:99px;line-height:1.5}
.dlb .tt{display:block;font-size:20px;font-weight:800;line-height:1.28;color:#fff!important;margin:6px 0 0}
.dlb .rt{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:12px;font-size:13.5px;color:#cfc8b8;line-height:1.5}
.dlb .rt .g{width:20px;height:20px;background:#fff;border-radius:50%;display:grid;place-items:center}
.dlb .rt .g svg{width:13px;height:13px}
.dlb .rt b{color:#fff}
.dlb .rt .st{color:#f5c542;letter-spacing:1px;font-size:12px}
.dlb .rt i{font-style:normal;display:inline-flex;gap:5px;align-items:center}
.dlb .rt i svg{width:15px;height:15px;color:#c9a85c}
.dlb form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px;margin:14px 0 0!important}
.dlb input[type=text],.dlb input[type=tel]{width:100%!important;font:inherit;font-size:16px!important;padding:12px 13px!important;border:1.5px solid #3a3730!important;border-radius:11px!important;background:#232227!important;color:#fff!important;margin:0!important;height:auto!important;box-shadow:none!important}
.dlb input::placeholder{color:#9c978b!important;opacity:1}
.dlb input:focus{outline:none;border-color:#c9a85c!important}
.dlb .full{grid-column:1/-1}
.dlb input[type=text],.dlb input[type=tel],.dlbm input[type=text],.dlbm input[type=tel]{direction:rtl;text-align:right!important}
.dlb .cs{color:#d6d0c2}.dlb .cs a{color:#e2c983!important}
.dlb .lg{color:#8f8a7e}
.dlb button{grid-column:1/-1;display:flex!important;justify-content:center;align-items:center;gap:8px;font:inherit;font-weight:800!important;font-size:18px!important;border:0!important;border-radius:12px!important;padding:13px 20px!important;background:linear-gradient(180deg,#e2c983,#c9a85c)!important;color:#16130c!important;box-shadow:0 6px 16px rgba(201,168,92,.28);cursor:pointer;margin:2px 0 0!important;width:100%;line-height:1.3}
.dlb button svg{width:20px;height:20px}
.dlb .or{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}
.dlb .or.one{grid-template-columns:1fr}
.dlb .or a{display:flex;justify-content:center;align-items:center;gap:7px;font-weight:700;font-size:15.5px;text-decoration:none!important;border-radius:12px;padding:10px;border:1.5px solid #3a3730;color:#fff!important}
.dlb .or a svg{width:18px;height:18px}
.dlb .or a.wa{border-color:#1f7a45;background:#14361f;color:#bff0cf!important}
.dlb .ok{font-size:16px;line-height:1.6;color:#f3efe6;margin:0}
.dlb .ok b{display:block;font-size:20px;color:#fff;margin-bottom:4px}
.dlbm{margin:26px 0;border-radius:16px;background:linear-gradient(135deg,#fbf6ea,#f4ecd9);border:1px solid #eadfc4;padding:16px}
.dlbm .hd{display:flex;gap:12px;align-items:center}
.dlbm .hd img{width:56px!important;height:56px!important;max-width:none;border-radius:50%!important;border:2px solid #c9a85c;object-fit:cover;flex:none;margin:0!important;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.dlbm .tt{display:block;font-size:17.5px;font-weight:800;color:#16161a;line-height:1.3}
.dlbm .sb{display:block;font-size:14px;font-weight:400;color:#5f5a4f;margin-top:2px;line-height:1.45}
.dlbm form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin:12px 0 0!important}
.dlbm input[type=text],.dlbm input[type=tel]{width:100%!important;font:inherit;font-size:16px!important;padding:11px 12px!important;border:1.5px solid #ddd2b8!important;border-radius:10px!important;background:#fff!important;color:#16161a!important;margin:0!important;height:auto!important;box-shadow:none!important}
.dlbm input:focus{outline:none;border-color:#c9a85c!important}
.dlbm .cs{color:#4a463e}.dlbm .cs a{color:#16161a!important}
.dlbm .lg{color:#7d786d}
.dlbm button{grid-column:1/-1;font:inherit;font-weight:800!important;font-size:16.5px!important;border:0!important;border-radius:10px!important;padding:12px!important;background:#16161a!important;color:#fff!important;cursor:pointer;margin:2px 0 0!important;width:100%;line-height:1.3}
.dlbm .or{display:flex;gap:16px;margin-top:9px;font-size:14px;flex-wrap:wrap}
.dlbm .or a{font-weight:700;color:#16161a!important;text-decoration:none!important}
.dlbm .or a.wa{color:#11803d!important}
.dlbm .ok{font-size:15.5px;line-height:1.6;color:#16161a;margin:0}
.dlbm .ok b{display:block;font-size:18px}
.dlbe fieldset{grid-column:1/-1;border:0!important;margin:0!important;padding:0!important;min-width:0}
.dlbe legend,.dlbe .q2{display:block;grid-column:1/-1;font-size:14.5px!important;font-weight:700;color:#16161a;margin:0 0 7px!important;padding:0!important;line-height:1.4;float:none;width:auto}
.dlbe .q2{margin:4px 0 -1px!important}
.dlbe .op{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
.dlbe .op label{position:relative;display:block!important;cursor:pointer;margin:0!important;padding:0!important;font-weight:400}
.dlbe .op input{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;margin:0!important;top:50%;right:12px}
.dlbe .op span{display:flex;align-items:center;min-height:46px;height:100%;padding:9px 12px;border:1.5px solid #ddd2b8;border-radius:10px;font-size:15px;line-height:1.35;color:#16161a;background:#fff}
.dlbe .op label:hover span{border-color:#c9a85c}
.dlbe .op input:checked+span{border-color:#16161a;background:#16161a;color:#fff;font-weight:700}
.dlbe .op input:focus-visible+span{outline:2px solid #c9a85c;outline-offset:2px}
@media (max-width:640px){.dlb{padding:20px 16px 16px}}
@media (max-width:480px){.dlbe .op{grid-template-columns:1fr}}
</style>';
}, 30);
function dabul_lb_box_a($v, $link) {
	$img = '<img src="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-headshot-circle.webp" alt="עו&quot;ד יקיר דבול" width="72" height="72" loading="lazy">';
	$g = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
	$chk = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
	$arr = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
	$tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
	$wai = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.1-1.2l-.4-.3z"/></svg>';
	if (!empty($v[5]) && $v[5] === 'nowa') {
		$or = '<div class="or one"><a href="tel:+97298613413">' . $tel . '09-8613413</a></div>';
	} else {
		$wa = 'https://wa.me/972505580189?text=' . rawurlencode('שלום, קראתי באתר על ' . $v[0] . ' ואשמח לשאול...');
		$or = '<div class="or"><a href="tel:+97298613413">' . $tel . '09-8613413</a><a class="wa" href="' . esc_url($wa) . '" target="_blank" rel="noopener">' . $wai . 'וואטסאפ</a></div>';
	}
	if (isset($_GET['dlb']) && $_GET['dlb'] === 'sent') {
		return '<div class="dlb" id="dlb" role="status"><div class="hd">' . $img . '<p class="ok"><b>תודה, קיבלנו.</b>עו"ד יקיר דבול יחזור אליכם בהקדם, בדרך כלל באותו יום עבודה.</p></div>' . $or . '</div>';
	}
	$back = add_query_arg('dlb', 'sent', $link) . '#dlb';
	return '<div class="dlb" id="dlb" role="complementary" aria-label="פנייה לעורך הדין"><div class="hd">' . $img . '<div><span class="kk">' . esc_html($v[0]) . '</span><span class="tt">' . esc_html($v[1]) . '</span></div></div>'
		. '<div class="rt"><span class="g">' . $g . '</span><span class="st">★★★★★</span><span><b>4.9</b> · 74 ביקורות</span><i>' . $chk . 'עו"ד יקיר דבול חוזר אליכם בעצמו</i></div>'
		. '<form name="dabul-box" method="post" action="' . dabul_lb_action($back) . '">' . dabul_lb_hidden($v[0], 'אתר · ' . $v[0], $link)
		. '<input type="text" name="name" placeholder="שם" autocomplete="name" required aria-label="שם">'
		. '<input type="tel" name="phone" placeholder="טלפון" autocomplete="tel" inputmode="tel" required minlength="9" aria-label="טלפון">'
		. '<input class="full" type="text" name="message" placeholder="' . esc_attr($v[3]) . '" aria-label="כמה מילים על העניין">'
		. dabul_lb_consent('dlb-ok') . '<button type="submit">' . esc_html($v[4]) . $arr . '</button></form>' . $or
		. '</div>';
}
function dabul_lb_box_m($topic, $link) {
	$img = '<img src="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-headshot-circle.webp" alt="עו&quot;ד יקיר דבול" width="56" height="56" loading="lazy">';
	$wa = 'https://wa.me/972505580189?text=' . rawurlencode('שלום, קראתי באתר על ' . $topic . ' ואשמח לשאול...');
	$or = '<div class="or"><a href="tel:+97298613413">09-8613413</a><a class="wa" href="' . esc_url($wa) . '" target="_blank" rel="noopener">וואטסאפ</a></div>';
	if (isset($_GET['dlbm']) && $_GET['dlbm'] === 'sent') {
		return '<div class="dlbm" id="dlbm" role="status"><div class="hd">' . $img . '<p class="ok"><b>תודה, קיבלנו.</b>עו"ד יקיר דבול יחזור אליכם בהקדם.</p></div>' . $or . '</div>';
	}
	$back = add_query_arg('dlbm', 'sent', $link) . '#dlbm';
	return '<div class="dlbm" id="dlbm" role="complementary" aria-label="פנייה לעורך הדין"><div class="hd">' . $img . '<div><span class="tt">יש לכם שאלה על המקרה שלכם?</span><span class="sb">השאירו שם וטלפון, ועו"ד יקיר דבול יחזור אליכם.</span></div></div>'
		. '<form name="dabul-mid" method="post" action="' . dabul_lb_action($back) . '">' . dabul_lb_hidden($topic, 'אתר · אמצע מאמר', $link)
		. '<input type="text" name="name" placeholder="שם" autocomplete="name" required aria-label="שם">'
		. '<input type="tel" name="phone" placeholder="טלפון" autocomplete="tel" inputmode="tel" required minlength="9" aria-label="טלפון">'
		. dabul_lb_consent('dlbm-ok') . '<button type="submit">חזרו אליי</button></form>' . $or . '</div>';
}
/* The targeted form (item ז): same card as the short box, question 1 as answer buttons, then name and phone.
   Phone only, no WhatsApp (Yakir: forms and calls close more than WhatsApp questions). */
function dabul_lb_box_q($q, $link) {
	$img = '<img src="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-headshot-circle.webp" alt="עו&quot;ד יקיר דבול" width="56" height="56" loading="lazy">';
	$or = '<div class="or"><a href="tel:+97298613413">או התקשרו: 09-8613413</a></div>';
	if (isset($_GET['dlbe']) && $_GET['dlbe'] === 'sent') {
		return '<div class="dlbm dlbe" id="dlbe" role="status"><div class="hd">' . $img . '<p class="ok"><b>תודה, קיבלנו.</b>עו"ד יקיר דבול יחזור אליכם בהקדם, בדרך כלל באותו יום עבודה.</p></div>' . $or . '</div>';
	}
	$back = add_query_arg('dlbe', 'sent', $link) . '#dlbe';
	$ops = '';
	foreach ($q[4] as $i => $o) {
		$ops .= '<label><input type="radio" name="message" value="' . esc_attr('מצב: ' . $o) . '"' . ($i === 0 ? ' required' : '') . '><span>' . esc_html($o) . '</span></label>';
	}
	return '<div class="dlbm dlbe" id="dlbe" role="complementary" aria-label="בדיקה קצרה מול עורך הדין"><div class="hd">' . $img . '<div><span class="tt">' . esc_html($q[1]) . '</span><span class="sb">' . esc_html($q[2]) . '</span></div></div>'
		. '<form name="dabul-focus" method="post" action="' . dabul_lb_action($back) . '">' . dabul_lb_hidden($q[0], 'אתר · טופס ממוקד', $link)
		. '<fieldset><legend>1. ' . esc_html($q[3]) . '</legend><div class="op">' . $ops . '</div></fieldset>'
		. '<span class="q2">2. לאן לחזור אליכם?</span>'
		. '<input type="text" name="name" placeholder="שם" autocomplete="name" required aria-label="שם">'
		. '<input type="tel" name="phone" placeholder="טלפון" autocomplete="tel" inputmode="tel" required minlength="9" aria-label="טלפון">'
		. dabul_lb_consent('dlbe-ok') . '<button type="submit">' . esc_html($q[5]) . '</button></form>' . $or . '</div>';
}
add_filter('the_content', function ($html) {
	if (!in_the_loop() || !is_main_query()) return $html;
	if (strpos($html, 'class="dlb"') !== false || strpos($html, 'class="dlbm') !== false) return $html;
	$v = dabul_lb_for_post();
	$mid = dabul_lbm_on();
	$qv = dabul_lbq_for_post();
	if (!$v && !$mid && !$qv) return $html;
	$id = get_queried_object_id();
	$link = get_permalink($id);
	// section headings: h2, or h2 + h3 when the article has fewer than 3 h2 (older articles use h3 for sections)
	preg_match_all('~<h2[\s>]~i', $html, $m, PREG_OFFSET_CAPTURE);
	if (count($m[0]) < 3) preg_match_all('~<h[23][\s>]~i', $html, $m, PREG_OFFSET_CAPTURE);
	$pos = array();
	foreach ($m[0] as $x) $pos[] = $x[1];
	$ins = array(); // offset => html
	$aIdx = -1;
	if ($v) {
		if (count($pos) >= 2) { $aIdx = 1; $ins[$pos[1]] = dabul_lb_box_a($v, $link); }
		else { $ins[strlen($html)] = dabul_lb_box_a($v, $link); }
	}
	if (($mid || $qv) && count($pos) >= 3) {
		$len = strlen($html); $best = -1; $bd = PHP_INT_MAX;
		foreach ($pos as $i => $p) {
			if ($i === 0 || $i === $aIdx) continue;
			$e = stripos($html, '</h', $p + 3);
			$tag = substr($html, $p, ($e === false ? 300 : $e - $p));
			if (preg_match('~id="(faq|sources|glossary)"|שאלות ותשובות|שאלות נפוצות|מקורות|מילון~u', $tag)) continue;
			if ($p < $len * 0.25 || $p > $len * 0.8) continue;
			$d = abs($p - $len / 2);
			if ($d < $bd) { $bd = $d; $best = $i; }
		}
		if ($best >= 0) {
			if ($qv) {
				// item ז: the targeted form takes the short box's place in the 20 most visited articles
				$ins[$pos[$best]] = dabul_lb_box_q($qv, $link);
			} else {
				$topic = $v ? $v[0] : trim(preg_split('~[:|?]~u', html_entity_decode(wp_strip_all_tags(get_the_title($id)), ENT_QUOTES, 'UTF-8'))[0]);
				if (function_exists('mb_substr')) $topic = mb_substr($topic, 0, 60);
				$ins[$pos[$best]] = dabul_lb_box_m($topic, $link);
			}
		}
	}
	krsort($ins);
	foreach ($ins as $off => $box) $html = substr($html, 0, $off) . $box . substr($html, $off);
	return $html;
}, 21);
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/formlog', array('methods' => 'GET', 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function () { return array('log' => get_option('dabul_form_lead_log', array())); }));
});

/* 18.10.2026 (Yakir approved): one send per click. The intake takes a few seconds before it returns the reader to the
   thank-you, so people pressed again and the same lead arrived 2 to 3 times. After the first submit the button is
   locked and says it is sending; a second submit is ignored. Coming back with the browser's back button unlocks it.
   20.10.2026: the targeted form (dabul-focus) is guarded the same way. */
add_action('wp_footer', function () {
	if (!dabul_lb_for_post() && !dabul_lbm_on() && !dabul_lbq_for_post()) return;
	echo '<script id="dbl-lb-once">(function(){var Q="form[name=dabul-box],form[name=dabul-mid],form[name=dabul-focus]";'
		. 'document.querySelectorAll(Q).forEach(function(f){f.addEventListener("submit",function(e){'
		. 'if(f.getAttribute("data-sent")){e.preventDefault();return}f.setAttribute("data-sent","1");'
		. 'var b=f.querySelector("button[type=submit]");if(b){b.setAttribute("data-h",b.innerHTML);b.disabled=true;b.style.opacity=".75";b.style.cursor="wait";b.textContent="שולח, רגע...";}});});'
		. 'window.addEventListener("pageshow",function(e){if(!e.persisted)return;document.querySelectorAll(Q).forEach(function(f){f.removeAttribute("data-sent");'
		. 'var b=f.querySelector("button[type=submit]");if(b){if(b.getAttribute("data-h"))b.innerHTML=b.getAttribute("data-h");b.disabled=false;b.style.opacity="";b.style.cursor="";}});});})();</script>';
}, 30);
