/* dabul: steady pages (Yakir approved on 9.10.2026 fixing the jumps found while a page loads).
   Measured on the article pages (example: real-estate-lawyer-agamim-netanya): parts of the page jumped while loading.
   1. The small author photo next to "עו״ד יקיר דבול" at the top of every article had no size, so the browser first kept a
      big empty space for it and then closed it, and the whole article jumped up. It now has its size (150x150, shown small as before).
   2. The style files of the side contact box and one more template were requested only at the end of the page, so on the
      computer the side box was first drawn unstyled (a big photo, the form without its checkbox) and then rearranged.
      They now arrive together with the other style files at the top (the same rules, nothing in the look changes).
   3. (preview first) On the computer, the side column of every article (contents list, reviews badge, contact box) followed the
      page with Elementor's "sticky" script, which lifts it out of the page and puts it back while scrolling; Google counts that
      as the page jumping. The same following-along is now done by the browser itself (CSS sticky, 110px from the top, only on
      the computer, only inside its own part of the page), which looks the same and does not jump.
   Checked on a preview address on 9.10.2026 (phone and computer: the same look). Now live. To undo: deactivate this snippet. */
define('DABUL_STEADY_LIVE', 1);
// part 2 is off since 9.10.2026: measured on the computer it made the side box jump more, not less (0.21 instead of 0.095)
define('DABUL_STEADY_MOVE_CSS', false);
// part 3 live since 9.10.2026 (measure: cls-probe on articles, computer)
define('DABUL_STEADY_STICKY_LIVE', 1);

function dabul_steady_on() {
	if (defined('DABUL_STEADY_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_steady_sticky_on() {
	if (defined('DABUL_STEADY_STICKY_LIVE')) return true;
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
	if (DABUL_STEADY_MOVE_CSS && is_string($b2) && $moved) { $body = $b2; $head .= implode("\n", $moved) . "\n"; }
	// 3. the article side column follows the page by CSS instead of Elementor's sticky script (computer only)
	if (dabul_steady_sticky_on() && strpos($body, 'data-id="ee1430e"') !== false) {
		$b4 = preg_replace('#(data-id="ee1430e" data-element_type="container" data-e-type="container" data-settings=")\{&quot;sticky&quot;:&quot;top&quot;[^"]*(")#', '$1{}$2', $body, 1, $cnt);
		if (is_string($b4) && $cnt) {
			$body = $b4;
			$head .= '<style id="dabul-steady-sticky">@media (min-width:1025px){.elementor-element.elementor-element-ee1430e{position:sticky;top:110px;align-self:flex-start;z-index:2}}</style>' . "\n";
		}
	}
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
