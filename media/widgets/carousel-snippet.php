/* dabul: carousel pictures (Yakir asked on 9.10.2026 why the pictures in the "הצלחות" carousel on the home page take long to appear).
   The cause: WP Rocket gives every picture an empty placeholder and fills it in only when it is on screen. The carousel makes
   copies of the first and last slides so it can go round endlessly, and those copies were made from the empty placeholders,
   so some slides stayed blank for seconds (until the carousel moved on).
   The fix: in the two picture carousels of the site (הצלחות and the certificates), the pictures keep their real address and
   are left to the browser's own late loading, so the copies are complete too. The same pictures, the same look.
   To undo: deactivate this snippet. */
// define('DABUL_CAR_LIVE', 1);

function dabul_car_on() {
	if (defined('DABUL_CAR_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_car_fix_seg($seg) {
	$seg = str_replace(array(' data-lazy-srcset=', ' data-lazy-sizes='), array(' srcset=', ' sizes='), $seg);
	$out = preg_replace_callback('#<img\b[^>]*>#', function ($m) {
		$t = $m[0];
		if (preg_match('#\sdata-lazy-src="([^"]+)"#', $t, $s)) {
			$t = preg_replace('#\ssrc="data:[^"]*"#', '', $t, 1);
			$t = str_replace($s[0], ' src="' . $s[1] . '"', $t);
		}
		if (stripos($t, ' loading=') === false) $t = preg_replace('#^<img\b#', '<img loading="lazy"', $t, 1);
		return $t;
	}, $seg);
	return is_string($out) ? $out : $seg;
}

function dabul_car_fix($html) {
	$key = 'data-widget_type="image-carousel.default"'; $pos = 0; $n = 0;
	while ($n < 6 && ($i = strpos($html, $key, $pos)) !== false) {
		$j = strpos($html, 'data-widget_type=', $i + strlen($key));
		if ($j === false) $j = strlen($html);
		$seg = substr($html, $i, $j - $i);
		$new = dabul_car_fix_seg($seg);
		$html = substr_replace($html, $new, $i, $j - $i);
		$pos = $i + strlen($new); $n++;
	}
	return $html;
}

add_action('template_redirect', function () {
	if (!dabul_car_on() || is_admin() || wp_doing_ajax() || is_feed() || is_user_logged_in() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || strpos($html, 'image-carousel.default') === false) return $html;
		return dabul_car_fix($html);
	});
}, 1);
