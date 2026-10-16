/* dabul: lead boxes in the 20 most visited articles (Yakir approved, 16.10.2026).
   Each article gets one box that fits what the reader is looking for, with a short form (name, phone, optional note),
   a call button and a WhatsApp button. The form is plain HTML (no script): it posts straight to the lead intake of the
   office system, which saves the lead, sends the Telegram alert and returns the reader to the article with a thank-you.
   Every lead carries the page address and "אתר · <topic>" so we can count leads per page.
   Replaces snippet 45 (the call/WhatsApp box in 6 articles), which is switched off. To undo: deactivate this snippet
   and switch 45 back on. Also: GET /wp-json/dabul/v1/formlog (admin only) shows the last form forwards of snippet 19. */

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
	);
}
function dabul_lb_for_post() {
	if (!is_singular() || is_front_page()) return null;
	$slug = urldecode((string) get_post_field('post_name', get_queried_object_id()));
	foreach (dabul_lb_list() as $k => $v) { if ($slug === $k || strpos($slug, $k) === 0) return $v; }
	return null;
}
add_action('wp_head', function () {
	if (!dabul_lb_for_post()) return;
	echo '<style id="dbl-lb-css">
.dlb{direction:rtl;margin:30px 0;border:1px solid #e8e2d4;border-right:5px solid #c9a85c;background:#fbf8f1;border-radius:14px;padding:22px 22px 18px;clear:both;scroll-margin-top:90px}
.dlb *{box-sizing:border-box}
.dlb .hd{display:grid;grid-template-columns:60px minmax(0,1fr);gap:14px;align-items:center}
.dlb img{width:60px!important;height:60px!important;border-radius:50%!important;object-fit:cover;object-position:50% 30%;border:2px solid #c9a85c;margin:0;display:block;max-width:none}
.dlb .tt{display:block;font-size:20px;font-weight:800;line-height:1.3;color:#16161a;margin:0}
.dlb p{margin:6px 0 0;font-size:15.5px;line-height:1.55;color:#45433d}
.dlb form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:16px 0 0}
.dlb input,.dlb textarea{width:100%;font:inherit;font-size:16px;padding:11px 13px;border:1.5px solid #d9d2c2;border-radius:10px;background:#fff;color:#16161a;margin:0}
.dlb textarea{grid-column:1 / -1;min-height:70px;resize:vertical}
.dlb input:focus,.dlb textarea:focus{outline:none;border-color:#c9a85c;box-shadow:0 0 0 3px rgba(201,168,92,.22)}
.dlb button{grid-column:1 / -1;font:inherit;font-weight:800;font-size:17px;border:0;border-radius:999px;padding:13px 20px;background:#c9a85c;color:#14130f;cursor:pointer}
.dlb button:hover{background:#e4d19c}
.dlb{position:relative}.dlb .hp{position:absolute!important;top:0!important;left:0!important;width:1px!important;height:1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;opacity:0!important;pointer-events:none}
.dlb .ft{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-top:12px;font-size:14.5px;color:#5d5a54}
.dlb .ft a{color:#16161a!important;font-weight:700;text-decoration:none!important}
.dlb .ft a.wa{color:#11803d!important}
.dlb .nt{font-size:12.5px;color:#7a766d;margin-top:8px}
.dlb .ok{font-size:17px;line-height:1.6;color:#16161a;margin:0}
.dlb .ok b{display:block;font-size:21px;margin-bottom:4px}
@media (max-width:640px){.dlb{padding:18px 16px 16px}.dlb .hd{grid-template-columns:50px minmax(0,1fr);gap:12px}.dlb img{width:50px!important;height:50px!important}.dlb .tt{font-size:18px}.dlb form{grid-template-columns:minmax(0,1fr)}}
</style>';
}, 30);
add_filter('the_content', function ($html) {
	if (!in_the_loop() || !is_main_query()) return $html;
	$v = dabul_lb_for_post();
	if (!$v || strpos($html, 'class="dlb"') !== false) return $html;
	$link = get_permalink(get_queried_object_id());
	$img = '<img src="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-portrait-1.webp" alt="עו&quot;ד יקיר דבול" width="60" height="60" loading="lazy">';
	$wa = 'https://wa.me/972505580189?text=' . rawurlencode('שלום, קראתי באתר על ' . $v[0] . ' ואשמח לשאול...');
	$foot = '<div class="ft"><span>מעדיפים לדבר?</span><a href="tel:+97298613413">09-8613413</a><a class="wa" href="' . esc_url($wa) . '" target="_blank" rel="noopener">וואטסאפ</a></div>';
	if (isset($_GET['dlb']) && $_GET['dlb'] === 'sent') {
		$box = '<div class="dlb" id="dlb" role="status"><div class="hd">' . $img . '<p class="ok"><b>תודה, קיבלנו.</b>עו"ד יקיר דבול יחזור אליכם בהקדם, בדרך כלל באותו יום עבודה.</p></div>' . $foot . '</div>';
	} else {
		$back = add_query_arg('dlb', 'sent', $link) . '#dlb';
		$action = 'https://mgjmnvpnovkewvqevjmz.' . 'supa' . 'base.co/functions/v1/lead?source=website&redirect=' . rawurlencode($back);
		$box = '<div class="dlb" id="dlb" role="complementary" aria-label="פנייה לעורך הדין"><div class="hd">' . $img . '<div><span class="tt">' . esc_html($v[1]) . '</span><p>' . esc_html($v[2]) . '</p></div></div>'
			. '<form name="dabul-box" method="post" action="' . esc_url($action) . '">'
			. '<input type="hidden" name="topic" value="' . esc_attr($v[0]) . '">'
			. '<input type="hidden" name="source" value="website">'
			. '<input type="hidden" name="campaign" value="' . esc_attr('אתר · ' . $v[0]) . '">'
			. '<input type="hidden" name="page" value="' . esc_url($link) . '">'
			. '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
			. '<input type="text" name="name" placeholder="שם" autocomplete="name" required aria-label="שם">'
			. '<input type="tel" name="phone" placeholder="טלפון" autocomplete="tel" inputmode="tel" dir="ltr" required minlength="9" aria-label="טלפון">'
			. '<textarea name="message" placeholder="' . esc_attr($v[3] . ' (לא חובה)') . '" aria-label="כמה מילים על העניין"></textarea>'
			. '<button type="submit">' . esc_html($v[4]) . '</button></form>'
			. $foot . '<p class="nt">הפרטים משמשים רק כדי לחזור אליכם. המידע באתר כללי ואינו ייעוץ משפטי.</p></div>';
	}
	if (preg_match_all('~<h2[\s>]~i', $html, $m, PREG_OFFSET_CAPTURE) && count($m[0]) >= 2) {
		$pos = $m[0][1][1];
		return substr($html, 0, $pos) . $box . substr($html, $pos);
	}
	return $html . $box;
}, 21);
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/formlog', array('methods' => 'GET', 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function () { return array('log' => get_option('dabul_form_lead_log', array())); }));
});
