/* dabul: speed, round 4 (Yakir asked on 9.10.2026: phone PageSpeed 95+ without changing the site or its design).
   Nothing changes in how the site looks: the same style rules, the same pictures, the same fonts. Only the way they arrive.
   1. The site's small style files (about 35 of them, from the theme and Elementor) are put inside the page itself,
      in the same order, instead of the phone fetching each one separately before it can show anything.
   2. The bold site font (the big "יקיר דבול" title) is requested at once, like the regular one already is.
   3. WP Rocket's own guess of the top picture is turned off: it kept requesting an old phone photo that is no longer shown
      (the top pictures are requested by round 3 already).
   4. The accessibility panel (OneTap) put its texts for 44 languages into every page (about a quarter of the page).
      It now gets Hebrew, English, French, Russian and Arabic only, so its language list shows these 5.
   Also (outside this snippet, 9.10.2026): the top pictures of the home page were added to WP Rocket's "Excluded images"
   list, so they are not lazy-loaded; the settings before that are kept in the option dabul_rocket_backup_sp4.
   Checked on a preview address on 9.10.2026 (phone and computer, slice by slice: same look, no script errors).
   Yakir approved, now live. To undo: deactivate this snippet. */
// define('DABUL_SP4_LIVE', 1);

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
	$body = substr($html, $end);
	$slim = dabul_sp4_onetap($body);
	return $head . (is_string($slim) && $slim !== '' ? $slim : $body);
}

function dabul_sp4_onetap($body) {
	$keep = array('il', 'en', 'fr', 'ru', 'ar');
	// the language list in the panel shows the same 5 languages
	$b2 = preg_replace_callback('#<li role="listitem" data-language="([a-z-]+)"[^>]*>\s*<button type="button">.*?</li>#s', function ($m) use ($keep) {
		return in_array($m[1], $keep, true) ? $m[0] : '';
	}, $body);
	if (is_string($b2) && $b2 !== '') $body = $b2;
	return preg_replace_callback('#(<script id="accessibility-onetap-js-extra">\s*var onetapAjaxObject = )(\{.*?\});(\s*(?://[^\n]*\s*)?</script>)#s', function ($m) {
		$o = json_decode($m[2], true);
		if (!is_array($o) || empty($o['languages']) || !is_array($o['languages'])) return $m[0];
		$keep = array('il', 'en', 'fr', 'ru', 'ar');
		if (!empty($o['activeLanguage'])) $keep[] = $o['activeLanguage'];
		if (!empty($o['getSettings']['language'])) $keep[] = $o['getSettings']['language'];
		$o['languages'] = array_intersect_key($o['languages'], array_flip($keep));
		if (!empty($o['languageList']) && is_array($o['languageList'])) $o['languageList'] = array_intersect_key($o['languageList'], array_flip($keep));
		if (!$o['languages']) return $m[0];
		$js = wp_json_encode($o, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG);
		return $js ? $m[1] . $js . ';' . $m[3] : $m[0];
	}, $body, 1);
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
