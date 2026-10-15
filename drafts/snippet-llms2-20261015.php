// dabul: "when to contact the office" in llms.txt (approved by Yakir 15.10.2026). Undo: deactivate.
// Yoast SEO builds llms.txt once a week (cron wpseo_llms_txt_population) and uses the homepage description as the
// short summary at the top of the file. Only while that file is being built, this adds a few sentences on when
// to contact the office. The homepage description that Google and visitors see does not change.
add_filter('wpseo_metadesc', function ($d) {
	if (!doing_action('wpseo_llms_txt_population')) return $d;
	return trim((string) $d) . ' מתי לפנות למשרד: קנייה או מכירה של דירה, בית או מגרש (בדיקות לפני חתימה, חוזה מכר ורישום בטאבו); קנייה מקבלן וחוק המכר; מיסוי מקרקעין (מס שבח, מס רכישה והשגה על שומה); התחדשות עירונית, תמ"א 38 ופינוי בינוי; רישום בתים משותפים, תשריט ותקנון וועד בית; ירושות, צוואות, הסכמי שיתוף וייפוי כוח מתמשך; הוצאה לפועל וחדלות פירעון. המשרד ברחוב רזיאל 1 בנתניה ומלווה לקוחות בנתניה, בשרון ובכל הארץ. טלפון 09-8613413, וואטסאפ 050-5580189.';
}, 99);
// build the file once now instead of waiting a week
add_action('init', function () {
	if (get_option('dabul_llms_rebuilt_20261015')) return;
	update_option('dabul_llms_rebuilt_20261015', 1, false);
	wp_schedule_single_event(time() + 30, 'wpseo_llms_txt_population');
}, 30);
