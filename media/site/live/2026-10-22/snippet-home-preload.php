/* dabul: home page loading order, small fixes (Yakir approved on 22.10.2026). Nothing visible changes.
   On the home page only, at the very end of building the page:
   1. removes the preload of a file that does not exist (".../uploads/__dbl_old__", left by an older fix),
   2. removes repeated preload lines (the same picture asked for twice),
   3. on the phone, the city picture behind the top part keeps the first priority; the round portrait is still
      loaded at once, but no longer competes with it for the first place.
   To undo: deactivate this snippet. */
add_action('template_redirect', function () {
	if (is_admin() || !is_front_page() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$head_end = stripos($html, '</head>');
		if ($head_end === false) return $html;
		$head = substr($html, 0, $head_end);
		// 1. the preload of the missing file
		$head = preg_replace('#<link rel="preload" as="image" href="[^"]*__dbl_old__"[^>]*>\s*#', '', $head);
		// 3. the portrait preload stays, without the "high" priority
		$head = preg_replace_callback('#<link rel="preload" as="image" href="[^"]*yakir-dabul-portrait-300x300\.webp"[^>]*>#', function ($m) {
			return str_replace(' fetchpriority="high"', '', $m[0]);
		}, $head);
		// 2. repeated image preloads: keep the first of each picture and screen size
		$seen = array();
		$head = preg_replace_callback('#<link rel="preload" as="image" href="([^"]+)" media="([^"]*)"[^>]*>\s*#', function ($m) use (&$seen) {
			$k = $m[1] . '|' . $m[2];
			if (isset($seen[$k])) return '';
			$seen[$k] = 1;
			return $m[0];
		}, $head);
		return $head . substr($html, $head_end);
	});
}, 0);
