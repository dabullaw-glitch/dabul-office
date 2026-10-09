/* dabul: steady pages (Yakir approved on 9.10.2026 fixing the jumps found while a page loads).
   Measured on the article pages (example: real-estate-lawyer-agamim-netanya): parts of the page jumped while loading.
   1. The small author photo next to "עו״ד יקיר דבול" at the top of every article had no size, so the browser first kept a
      big empty space for it and then closed it, and the whole article jumped up. It now has its size (150x150, shown small as before).
   2. The style files of the side contact box and one more template were requested only at the end of the page, so on the
      computer the side box was first drawn unstyled (a big photo, the form without its checkbox) and then rearranged.
      They now arrive together with the other style files at the top (the same rules, nothing in the look changes).
   Checked on a preview address on 9.10.2026 (phone and computer: the same look). Now live. To undo: deactivate this snippet. */
define('DABUL_STEADY_LIVE', 1);

function dabul_steady_on() {
	if (defined('DABUL_STEADY_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_steady_fix($html) {
	$end = strpos($html, '</head>');
	if ($end === false) return $html;
	$head = substr($html, 0, $end); $body = substr($html, $end);
	// 2. Elementor template style files that are printed inside the page body move up into the head
	$moved = array();
	$b2 = preg_replace_callback("#<link (?:data-minify=\"1\" )?rel='stylesheet' id='(elementor-post-\\d+-css)' href='https://dabullaw\\.co\\.il/wp-content/[^']+\\.css(?:\\?[^']*)?' media='all' />\\s*#", function ($m) use (&$moved, $head) {
		if (strpos($head, "id='" . $m[1] . "'") !== false || strpos($head, 'id="' . $m[1] . '"') !== false) return $m[0];
		$moved[] = trim($m[0]);
		return '';
	}, $body);
	if (is_string($b2) && $moved) { $body = $b2; $head .= implode("\n", $moved) . "\n"; }
	// 1. the author photo gets its size
	$b3 = preg_replace_callback('#<img (?![^>]*\swidth=)([^>]*Yakir-Dabul-Avatar[^>]*)>#', function ($m) {
		return '<img width="150" height="150" ' . $m[1] . '>';
	}, $body);
	if (is_string($b3)) $body = $b3;
	return $head . $body;
}

add_action('template_redirect', function () {
	if (!dabul_steady_on() || is_admin() || wp_doing_ajax() || is_feed() || is_user_logged_in() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_steady_fix($html);
	});
}, 1);
