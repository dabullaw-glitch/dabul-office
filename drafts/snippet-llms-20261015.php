// dabul: a "when to contact the office" section in llms.txt (approved by Yakir 15.10.2026). Undo: deactivate.
// Yoast SEO writes llms.txt as a file in the site root and rewrites it from time to time. Once an hour this
// snippet checks the file and adds the section at the end if it is missing. Nothing else in the file is changed.
function dabul_llms_section() {
	return "\n## מתי כדאי לפנות למשרד יקיר דבול - משרד עורכי דין\n"
		. "המשרד נמצא בנתניה ומלווה לקוחות בנתניה, בשרון ובכל הארץ. מתאים לפנות אליו כשמדובר באחד מאלה:\n"
		. "- קנייה או מכירה של דירה, בית או מגרש: בדיקות לפני חתימה, זיכרון דברים, חוזה מכר, מימון ומשכנתא, ורישום בטאבו.\n"
		. "- קנייה מקבלן: בדיקת חוזה המכר, ערבויות לפי חוק המכר, איחור במסירה וליקויי בנייה.\n"
		. "- מיסוי מקרקעין: מס שבח, מס רכישה, פטורים והקלות, והשגה על שומה.\n"
		. "- התחדשות עירונית (תמ\"א 38 ופינוי בינוי): ליווי דיירים ונציגויות דיירים מול יזם.\n"
		. "- בתים משותפים: רישום בית משותף, תשריט ותקנון, הצמדות, ועד בית וסכסוכי שכנים. עו\"ד יקיר דבול מתמנה מטעם בית המשפט לטיפול ברישום בתים משותפים.\n"
		. "- ירושה של נכסים, צוואות, הסכמי שיתוף במקרקעין וייפוי כוח מתמשך.\n"
		. "- הוצאה לפועל וחדלות פירעון.\n"
		. "פרטי קשר: רחוב רזיאל 1, נתניה. טלפון 09-8613413. וואטסאפ 050-5580189. אתר: https://dabullaw.co.il/\n"
		. "המידע באתר כללי ואינו ייעוץ משפטי. כל מקרה נבדק לגופו.\n";
}
add_action('init', function () {
	if (get_transient('dabul_llms_check')) return;
	set_transient('dabul_llms_check', 1, HOUR_IN_SECONDS);
	$f = ABSPATH . 'llms.txt';
	if (!file_exists($f) || !is_writable($f)) return;
	$c = (string) file_get_contents($f);
	if ($c === '' || strpos($c, 'מתי כדאי לפנות למשרד יקיר דבול') !== false) return;
	file_put_contents($f, rtrim($c) . "\n" . dabul_llms_section());
}, 20);
