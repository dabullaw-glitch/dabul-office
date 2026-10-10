/* dabul: three short quizzes ("בדיקה קצרה") inside articles. Yakir approved on 10.10.2026.
   evict  -> post 3121 (תביעה לפינוי מושכר)
   split  -> posts 3611, 3629, 6643 (פירוק שיתוף)
   renew  -> page 35 (התחדשות עירונית)
   Each quiz is placed before a chosen heading of the article (or at the end if that heading is gone).
   The style and script are the files media/widgets/quizzes.css and quizzes.js of the office repository,
   served from GitHub Pages and loaded with wp_enqueue only on pages that show a quiz.
   The short form at the end sends name, phone and the answers to the office system (edge function "lead"):
   a new lead in the office and a Telegram alert. Also usable anywhere with the shortcode [dabul_quiz id="evict"].
   Option dabul_quiz_map can override the placement: {post_id: [quiz, heading text]}.
   To stop: deactivate this snippet. */
define('DABUL_QUIZ_BASE', 'https://dabullaw-glitch.github.io/dabul-office/media/widgets/');
define('DABUL_QUIZ_VER', '20261010b');
function dabul_quiz_enqueue() {
	wp_enqueue_style('dabul-quiz', DABUL_QUIZ_BASE . 'quizzes.css', array(), DABUL_QUIZ_VER);
	wp_enqueue_script('dabul-quiz', DABUL_QUIZ_BASE . 'quizzes.js', array(), DABUL_QUIZ_VER, true);
}
function dabul_quiz_box($id) {
	$id = preg_replace('/[^a-z]/', '', (string) $id);
	if (!in_array($id, array('evict', 'split', 'renew'), true)) return '';
	dabul_quiz_enqueue();
	return '<div class="dqz" dir="rtl" data-quiz="' . esc_attr($id) . '"><div class="box"><p class="k">בדיקה קצרה</p><p>השאלון נטען. אפשר גם להתקשר: 09-8613413</p></div></div>';
}
add_shortcode('dabul_quiz', function ($atts) { $a = shortcode_atts(array('id' => ''), $atts); return dabul_quiz_box($a['id']); });
function dabul_quiz_map() {
	$def = array(
		3121 => array('evict', 'כל יום שעובר'),
		3611 => array('split', '3 טיפים מעשיים'),
		3629 => array('split', '3 טיפים מעשיים'),
		6643 => array('split', 'מה הצעד הבא'),
		35 => array('renew', 'שאלות ותשובות'),
	);
	$o = get_option('dabul_quiz_map', null);
	return is_array($o) && $o ? $o : $def;
}
// load the files in the page head on the quiz pages, so they are ready before the reader reaches the quiz
add_action('wp_enqueue_scripts', function () {
	if (is_singular() && array_key_exists((int) get_queried_object_id(), dabul_quiz_map())) dabul_quiz_enqueue();
});
// WP Rocket: run the quiz script right away instead of waiting for the first click
add_filter('rocket_delay_js_exclusions', function ($list) { $list[] = 'quizzes.js'; return $list; });
add_filter('the_content', function ($html) {
	static $used = array();
	if (is_admin() || !is_singular() || !in_the_loop() || !is_main_query()) return $html;
	$pid = get_the_ID();
	$map = dabul_quiz_map();
	if (empty($map[$pid]) || !empty($used[$pid]) || strpos($html, 'data-quiz=') !== false) return $html;
	$used[$pid] = true;
	list($quiz, $anchor) = array_pad((array) $map[$pid], 2, '');
	$box = '<div class="dqz-wrap" style="margin:32px 0">' . dabul_quiz_box($quiz) . '</div>';
	if ($anchor && preg_match_all('#<h2\b[^>]*>(.*?)</h2>#is', $html, $m, PREG_OFFSET_CAPTURE)) {
		foreach ($m[0] as $i => $h) {
			if (mb_strpos(wp_strip_all_tags($m[1][$i][0]), $anchor) !== false) return substr($html, 0, $h[1]) . $box . substr($html, $h[1]);
		}
	}
	return $html . $box;
}, 31);
