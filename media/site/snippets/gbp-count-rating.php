/* dabul: the Google review count and rating update themselves everywhere on the site (Yakir asked on 25.10.2026).
   The office system reads the Google Business profile every morning and sends the current numbers here (option dabul_gbp_reviews).
   At the very end of every page:
   - any "NN ביקורות" with an older, smaller number (60 and up) shows the current number;
   - the rating (4.0 to 5.0) shows the current rating where it is a rating: "דירוג 4.9", a text like ">4.9<" or ">4.9★<"
     next to stars / "ביקורות" / "דירוג", and rating/count values inside page data (JSON).
   Undo: deactivate this snippet (the pages go back to the numbers written in them). */
function dabul_gbp_vals() {
	$o = get_option('dabul_gbp_reviews', array());
	$n = isset($o['count']) ? (int) $o['count'] : 0;
	$r = isset($o['rating']) && is_numeric($o['rating']) ? number_format(round((float) $o['rating'], 1), 1, '.', '') : '';
	if ($r !== '' && ((float) $r < 4.0 || (float) $r > 5.0)) $r = '';
	return array($n, $r);
}
// ratings the site has shown (written in the pages: 4.9; and every rating Google sent since), so other numbers are never touched
function dabul_gbp_seen() { $o = get_option('dabul_gbp_reviews', array()); return array_values(array_unique(array_merge(array('4.9'), (array) ($o['seen'] ?? array())))); }
function dabul_gbp_fix($html) {
	list($n, $r) = dabul_gbp_vals();
	if (!is_string($html) || $html === '') return $html;
	$orig = $html;
	if ($n >= 60 && strpos($html, 'ביקורות') !== false) {
		$x = preg_replace_callback('/(?<![\d.,])(\d{2,3})(\s+ביקורות)/u', function ($m) use ($n) { $v = (int) $m[1]; return ($v >= 60 && $v < $n) ? $n . $m[2] : $m[0]; }, $html);
		if (is_string($x) && $x !== '') $html = $x;
	}
	if ($n >= 60) {
		$x = preg_replace_callback('/((?:&quot;|")(?:count|reviewCount|ratingCount)(?:&quot;|"):\s*(?:&quot;|")?)(\d{2,3})(?![\d])/', function ($m) use ($n) { $v = (int) $m[2]; return ($v >= 60 && $v < $n) ? $m[1] . $n : $m[0]; }, $html);
		if (is_string($x) && $x !== '') $html = $x;
	}
	if ($r !== '') {
		// "דירוג 4.9"
		$x = preg_replace('/(דירוג\s+)[45]\.\d(?![\d])/u', '${1}' . $r, $html);
		if (is_string($x) && $x !== '') $html = $x;
		// rating values inside page data
		$x = preg_replace('/((?:&quot;|")(?:rating|ratingValue)(?:&quot;|"):\s*(?:&quot;|")?)[45]\.\d+(?![\d])/', '${1}' . $r, $html);
		if (is_string($x) && $x !== '') $html = $x;
		// a text that is only the rating (with or without a star), near stars / reviews / rating words
		$out = ''; $pos = 0;
		if (preg_match_all('/>(\s*)([45]\.\d)(\s*★?\s*)(?=<)/u', $html, $mm, PREG_OFFSET_CAPTURE)) {
			foreach ($mm[2] as $k => $g) {
				$at = $g[1];
				if ($g[0] === $r || !in_array($g[0], dabul_gbp_seen(), true)) continue; // only numbers that were the site's rating
				$ctx = substr($html, max(0, $at - 250), 500);
				if (strpos($ctx, '★') === false && strpos($ctx, 'ביקורות') === false && strpos($ctx, 'דירוג') === false) continue;
				$out .= substr($html, $pos, $at - $pos) . $r; $pos = $at + strlen($g[0]);
			}
		}
		if ($pos > 0) $html = $out . substr($html, $pos);
	}
	return (is_string($html) && $html !== '') ? $html : $orig;
}
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	list($n, $r) = dabul_gbp_vals(); if ($n < 60 && $r === '') return;
	ob_start('dabul_gbp_fix');
}, -999);
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/gbpcount', array('methods' => array('GET', 'POST'), 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		$o = get_option('dabul_gbp_reviews', array());
		if ($req->get_method() === 'POST') {
			$b = (array) $req->get_json_params(); $c = (int) ($b['count'] ?? 0);
			if ($c < 60 || $c > 5000) return new WP_Error('bad', 'count?', array('status' => 400));
			$rt = isset($b['rating']) && is_numeric($b['rating']) ? number_format(round((float) $b['rating'], 1), 1, '.', '') : ($o['rating'] ?? '');
			$old = array((int) ($o['count'] ?? 0), (string) ($o['rating'] ?? ''));
			$seen = array_values(array_unique(array_filter(array_merge((array) ($o['seen'] ?? array()), array($rt)))));
			$o = array('count' => $c, 'rating' => $rt, 'seen' => array_slice($seen, -10), 'at' => gmdate('c'));
			update_option('dabul_gbp_reviews', $o, true);
			$o['changed'] = ($old[0] !== $c || $old[1] !== $rt);
			if ($o['changed'] && function_exists('rocket_clean_domain')) rocket_clean_domain();
		}
		return $o;
	}));
});
