/* dabul: video sitemap + video upkeep (Yakir approved 30.10.2026, "תטפל בזה").
   1. /video-sitemap.xml lists every video watch page (snippet 59, option dabul_watch) with the video details Google
      reads for video results: page, picture, title, description, player, length and upload date. It is linked from
      Yoast's sitemap index (sitemap_index.xml) and from robots.txt.
   2. POST dabul/v1/watch-dur {dur:{video id: seconds}} sets only the length of watch pages (the other route,
      dabul/v1/watch, rewrites the whole page). The old values are kept in option dabul_bak_watch_dur_20261030.
   3. An article that is the "full guide" of a watch page but does not show that video gets one small line at its end
      that links to the watch page (articles that show the video already get the link under the video, snippet 59).
   Undo: deactivate this snippet. The sitemap, the robots line and the article lines disappear; the lengths stay
   (restore them from dabul_bak_watch_dur_20261030 if needed). */

function dabul_vsm_items() {
	$all = function_exists('dabul_watch_all') ? dabul_watch_all() : (array) get_option('dabul_watch', array());
	$out = array();
	foreach ($all as $vid => $w) {
		if (empty($w['page']) || get_post_status((int) $w['page']) !== 'publish') continue;
		$out[$vid] = $w;
	}
	return $out;
}

function dabul_vsm_xml() {
	$x = function ($t) { return htmlspecialchars((string) $t, ENT_XML1 | ENT_QUOTES, 'UTF-8'); };
	$rows = '';
	foreach (dabul_vsm_items() as $vid => $w) {
		$pid = (int) $w['page'];
		$m = function_exists('dabul_yt_meta') ? dabul_yt_meta($vid) : null;
		$poster = function_exists('dabul_yt_poster_id') ? dabul_yt_poster_id($vid) : 0;
		$thumb = $poster ? wp_get_attachment_image_url($poster, 'full') : '';
		if (!$thumb) $thumb = 'https://i.ytimg.com/vi/' . $vid . '/hqdefault.jpg';
		$desc = wp_html_excerpt(preg_replace('/\s+/', ' ', wp_strip_all_tags((string) ($w['summary'] ?? ''))), 2000, '');
		if ($desc === '') $desc = (string) $w['title'];
		$date = $m && !empty($m['date']) ? date('c', strtotime($m['date'])) : get_the_date('c', $pid);
		$dur = (int) round((float) ($w['dur'] ?? 0));
		$rows .= '<url><loc>' . $x(get_permalink($pid)) . '</loc><lastmod>' . $x(get_post_modified_time('c', true, $pid)) . '</lastmod><video:video>'
			. '<video:thumbnail_loc>' . $x($thumb) . '</video:thumbnail_loc>'
			. '<video:title>' . $x(wp_html_excerpt((string) $w['title'], 100, '')) . '</video:title>'
			. '<video:description>' . $x($desc) . '</video:description>'
			. '<video:player_loc>' . $x('https://www.youtube.com/embed/' . $vid) . '</video:player_loc>'
			. ($dur > 0 ? '<video:duration>' . min($dur, 28800) . '</video:duration>' : '')
			. '<video:publication_date>' . $x($date) . '</video:publication_date>'
			. '<video:family_friendly>yes</video:family_friendly>'
			. '<video:uploader info="' . $x(home_url('/')) . '">' . $x('יקיר דבול - משרד עורכי דין') . '</video:uploader>'
			. '</video:video></url>' . "\n";
	}
	return '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
		. '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">' . "\n"
		. $rows . '</urlset>' . "\n";
}

add_action('init', function () {
	$path = isset($_SERVER['REQUEST_URI']) ? strtok((string) $_SERVER['REQUEST_URI'], '?') : '';
	if ($path !== '/video-sitemap.xml') return;
	if (!headers_sent()) {
		status_header(200);
		header('Content-Type: application/xml; charset=UTF-8');
		header('X-Robots-Tag: noindex, follow', true);
		header('Cache-Control: public, max-age=3600');
	}
	echo dabul_vsm_xml();
	exit;
}, 5);

// Yoast's sitemap index lists the video sitemap
add_filter('wpseo_sitemap_index', function ($xml) {
	$last = 0;
	foreach (dabul_vsm_items() as $w) { $t = (int) get_post_modified_time('U', true, (int) $w['page']); if ($t > $last) $last = $t; }
	return $xml . '<sitemap><loc>' . esc_url(home_url('/video-sitemap.xml')) . '</loc>' . ($last ? '<lastmod>' . gmdate('c', $last) . '</lastmod>' : '') . '</sitemap>' . "\n";
});

// robots.txt names it too
add_filter('robots_txt', function ($out, $public) {
	if (!$public || strpos($out, 'video-sitemap.xml') !== false) return $out;
	return rtrim($out) . "\nSitemap: " . home_url('/video-sitemap.xml') . "\n";
}, 99, 2);

// only the length of watch pages
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/watch-dur', array('methods' => array('GET', 'POST'), 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		$all = (array) get_option('dabul_watch', array());
		if ($req->get_method() === 'GET') return array('dur' => array_map(function ($w) { return (float) ($w['dur'] ?? 0); }, $all));
		$b = (array) $req->get_json_params(); $set = array();
		if (!get_option('dabul_bak_watch_dur_20261030')) update_option('dabul_bak_watch_dur_20261030', array_map(function ($w) { return (float) ($w['dur'] ?? 0); }, $all), false);
		foreach ((array) ($b['dur'] ?? array()) as $vid => $s) {
			if (!isset($all[$vid]) || !is_numeric($s) || (float) $s <= 0) continue;
			$all[$vid]['dur'] = (float) $s; $set[$vid] = (float) $s;
			if (!empty($all[$vid]['page']) && function_exists('dabul_watch_html')) {
				// the page's line "עו״ד יקיר דבול · 52 שניות" shows the length too, so the stored page text is rebuilt
				wp_update_post(wp_slash(array('ID' => (int) $all[$vid]['page'], 'post_content' => dabul_watch_html($vid, $all[$vid]))));
				if (function_exists('rocket_clean_post')) rocket_clean_post((int) $all[$vid]['page']);
			}
		}
		if ($set) update_option('dabul_watch', $all, false);
		return array('ok' => true, 'set' => $set);
	}));
});

// a small link at the end of a guide whose video is not shown in it
add_filter('the_content', function ($html) {
	if (!is_singular('post') || !in_the_loop() || !is_main_query()) return $html;
	$pid = get_the_ID(); $add = '';
	foreach (dabul_vsm_items() as $vid => $w) {
		if ((int) ($w['article'] ?? 0) !== $pid) continue;
		if (strpos($html, $vid) !== false) continue;
		$map = (array) get_option('dabul_art_videos', array());
		if (!empty($map[$pid]) && in_array($vid, (array) $map[$pid], true)) continue;
		$add .= '<p class="dbl-wlink" style="text-align:center;margin:8px 0 18px;font-size:15px;direction:rtl"><a href="' . esc_url(get_permalink((int) $w['page'])) . '" style="color:#9A7A3A;font-weight:700;text-decoration:underline;text-underline-offset:4px">סרטון קצר על הנושא: ' . esc_html($w['title']) . '</a></p>';
	}
	return $add ? $html . $add : $html;
}, 45);
