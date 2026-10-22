/* dabul: article layout (Yakir approved 22.10.2026, items 1, 2, 4 and 6 of his list).
   1. [dabul_post_dates]: "פורסם: ..." and, when the article was updated on a later day, "עודכן: ..." (shown under the article,
      instead of the old categories + date line).
   2. The author name on articles leads to the about page (author archive pages are empty and hidden from Google).
   4. Breadcrumbs separator "»" (the breadcrumbs move above the title card, small, in the template).
   6. The old one-line notice inside older articles ("אין באמור משום ייעוץ משפטי...") is not shown any more, and
      [dabul_disclaimer] adds the new notice at the end of every article, under a thin line.
   Undo: deactivate this snippet (and restore template 3945 from docs sitebak/single-post-3945-before-article-layout-20261022). */
if (!function_exists('dabul_al_dates')) {
	function dabul_al_date($t) { return wp_date('j בF Y', $t); }
	function dabul_al_dates() {
		$p = get_post();
		if (!$p || $p->post_type !== 'post') return '';
		$pub = (int) get_post_time('U', true, $p);
		$mod = (int) get_post_modified_time('U', true, $p);
		$out = '<div class="dabul-dates"><span>פורסם: <time datetime="' . esc_attr(get_the_date('c', $p)) . '">' . esc_html(dabul_al_date($pub)) . '</time></span>';
		if ($mod > $pub && wp_date('Ymd', $mod) !== wp_date('Ymd', $pub)) {
			$out .= '<span class="dabul-dates-sep" aria-hidden="true">|</span><span>עודכן: <time datetime="' . esc_attr(get_the_modified_date('c', $p)) . '">' . esc_html(dabul_al_date($mod)) . '</time></span>';
		}
		return $out . '</div>';
	}
	add_shortcode('dabul_post_dates', 'dabul_al_dates');

	add_shortcode('dabul_disclaimer', function () {
		$contact = home_url('/צרו-קשר/');
		return '<div class="dabul-disclaimer"><hr>'
			. '<p>אנו משקיעים מאמצים רבים כדי לספק לכם תוכן איכותי ומדויק. עם זאת, חשוב להדגיש שהמידע המובא כאן אינו ייעוץ משפטי ואין להסתמך עליו ככזה. העולם המשפטי דינמי ומשתנה, ולכן כל שימוש במידע הוא על אחריותכם האישית בלבד.</p>'
			. '<p>המידע בעמוד ובאתר זה נועד להוות מידע ראשוני ובסיסי בלבד, והוא לא מהווה ו/או יהווה ייעוץ והכוונה משפטי או תחליף לייעוץ משפטי פרטני הניתן על ידי המשרד. אין באמור בעמוד זה כדי להוות הכוונה ו/או המלצה ו/או הדרכה לנקיטת הליכים משפטיים שונים ו/או להימנעות מהם. <a href="' . esc_url($contact) . '">אנו ממליצים להיוועץ עם עו״ד בטרם נקיטת כל פעולה</a>. למען הסר כל ספק, האחריות לכל תוצאה בשל הסתמכות על האמור לעיל תחול על המשתמש בלבד.</p>'
			. '</div>';
	});

	// 2. author name -> about page (instead of the empty author archive)
	add_filter('author_link', function ($link) { return home_url('/אודות-המשרד/'); }, 20);

	// 4. breadcrumbs separator
	add_filter('wpseo_breadcrumb_separator', function ($s) { return '»'; }, 20);

	// 6. the old one-line notice inside older articles
	add_filter('the_content', function ($c) {
		if (!is_singular('post') || strpos($c, 'אין באמור משום ייעוץ משפטי') === false) return $c;
		$n = preg_replace('#<p[^>]*>\s*אין באמור משום ייעוץ משפטי.*?</p>\s*#us', '', $c);
		return is_string($n) ? $n : $c;
	}, 30);

	add_action('wp_head', function () {
		if (!is_singular('post')) return;
		echo '<style id="dabul-article-layout">'
			. '.dabul-dates{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:15px;color:#6b6b6b;margin:18px 0 0}'
			. '.dabul-dates time{color:#3a3a3a;font-weight:500}.dabul-dates-sep{color:#c9a961}'
			. '.dabul-disclaimer{margin:28px 0 0;font-size:13.5px;line-height:1.7;color:#6b6b6b}'
			. '.dabul-disclaimer hr{border:0;border-top:1px solid #d9d2c2;margin:0 0 14px}'
			. '.dabul-disclaimer p{margin:0 0 10px}.dabul-disclaimer a{color:#8c7646;text-decoration:underline}'
			. '</style>' . "\n";
	}, 40);
}
