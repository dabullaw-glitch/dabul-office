/* dabul: speed, round 4 (Yakir asked on 9.10.2026: phone PageSpeed 95+ without changing the site or its design).
   Nothing changes in how the site looks: the same style rules, the same pictures, the same fonts. Only the way they arrive.
   1. The site's small style files (about 35 of them, from the theme and Elementor) are put inside the page itself,
      in the same order, instead of the phone fetching each one separately before it can show anything.
   2. The bold site font (the big "יקיר דבול" title) is requested at once, like the regular one already is.
   3. WP Rocket's own guess of the top picture is turned off: it kept requesting an old phone photo that is no longer shown
      (the top pictures are requested by round 3 already).
   PREVIEW ONLY until checked: add ?dblprev=1 to a page address. To undo: deactivate this snippet. */

function dabul_sp4_on() {
	if (defined('DABUL_SP4_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_sp4_abs($dir, $rel) {
	$u = parse_url($dir . $rel);
	if (empty($u['host']) || empty($u['path'])) return $rel;
	$segs = array();
	foreach (explode('/', $u['path']) as $s) { if ($s === '..') { if (count($segs) > 1) array_pop($segs); } elseif ($s !== '.') $segs[] = $s; }
	return $u['scheme'] . '://' . $u['host'] . implode('/', $segs) . (isset($u['query']) ? '?' . $u['query'] : '') . (isset($u['fragment']) ? '#' . $u['fragment'] : '');
}

function dabul_sp4_inline($html) {
	$end = strpos($html, '</head>');
	if ($end === false) return $html;
	$head = substr($html, 0, $end); $total = 0;
	$head = preg_replace_callback("#<link rel='stylesheet' id='([a-z0-9_-]+-css)' href='(https://dabullaw\.co\.il/(wp-content/[^'?]+\.css))(?:\?[^']*)?' media='all' />#", function ($m) use (&$total) {
		$path = ABSPATH . $m[3];
		if (!is_readable($path)) return $m[0];
		$css = implode('', (array) @file($path));
		if ($css === '' || strlen($css) > 100000 || $total + strlen($css) > 350000 || stripos($css, '@import') !== false) return $m[0];
		$dir = substr($m[2], 0, strrpos($m[2], '/') + 1);
		$css = preg_replace_callback('#url\(\s*([\'"]?)(?!data:|https?:|//|\#)([^\'")]+)\1\s*\)#i', function ($u) use ($dir) {
			return 'url(' . $u[1] . dabul_sp4_abs($dir, trim($u[2])) . $u[1] . ')';
		}, $css);
		$css = str_ireplace('</style', '<\/style', $css);
		$total += strlen($css);
		return '<style id="' . $m[1] . '">' . $css . '</style>';
	}, $head);
	return $head . substr($html, $end);
}

add_action('template_redirect', function () {
	if (!dabul_sp4_on() || is_admin() || wp_doing_ajax() || is_feed() || is_user_logged_in() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_sp4_inline($html);
	});
}, 1);

add_action('wp_head', function () {
	if (is_admin() || !dabul_sp4_on()) return;
	echo '<link rel="preload" as="font" type="font/woff2" crossorigin href="https://dabullaw.co.il/wp-content/uploads/2026/03/NotoSansHebrew-Bold.woff2">' . "\n";
}, 1);

add_filter('rocket_above_the_fold_optimization', function ($on) { return dabul_sp4_on() ? false : $on; }, 99);
