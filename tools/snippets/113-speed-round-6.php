/* dabul: speed round 6, less work for the phone while the home page loads (9.11.2026, follow-up to "phone PageSpeed 95+").
   Nothing visible changes.
   A. Sections far below the first screen (from the about section "אודות" down to the footer) are not drawn until the visitor first
      touches, scrolls, moves the mouse or presses a key. Anything that comes near the screen is drawn at once as before
      (content-visibility:auto), and at the first touch every section is drawn normally, so menu jumps, scrolling and the
      page height are exactly as before. A page opened with #anchor in its address is drawn normally from the start.
   B. WP Rocket's late-background helper checked the whole page again after every small change while the page was still
      arriving (about 6 times, 15ms each). It now checks once when the page has arrived, and after that at most every 50ms.
   Test copies: ?dbltest=cva... (A only), cvb... (B only), cvx... (both). To undo: deactivate this snippet.
   Live since 9.11.2026: part A only (checked on test copies: phone Lighthouse 97-98 instead of 94-95, total blocking time
   about 10-45ms instead of about 200ms; the page looks the same on phone and computer, same height, same anchor jumps).
   Part B did not add a clear gain on top of A, so it stays on test copies only. Backups: Supabase docs psi/sp6-2026-11-09-*. */
if (!defined('DBL_SP6_LIVE_A')) define('DBL_SP6_LIVE_A', 1);
// once: WP Rocket's saved copy of the home page is renewed so the change shows (only the home page, nothing else)
add_action('init', function () {
	if (get_option('dbl_sp6_purged') === '1' || !function_exists('rocket_clean_home')) return;
	update_option('dbl_sp6_purged', '1', false);
	rocket_clean_home();
}, 99);
if (!function_exists('dbl_sp6')) {
	function dbl_sp6($part) {
		if (defined('DBL_SP6_LIVE_' . $part)) return true;
		$q = isset($_GET['dbltest']) ? (string) $_GET['dbltest'] : '';
		if (strpos($q, 'cvx') === 0) return true;
		return strpos($q, 'cv' . strtolower($part)) === 0;
	}
}
add_action('wp_head', function () {
	if (is_admin() || !is_front_page() || !dbl_sp6('A')) return;
	// section => its height before the first touch, measured 9.11.2026 (phone 412px, computer 1350px)
	$secs = apply_filters('dbl_sp6_sections', array(
		'#content>#dbl-about' => array(2119, 1293),
		'#content>.elementor-element-abb2800' => array(746, 893),
		'#content>.elementor-element-1302fe0' => array(213, 355),
		'#content>#dbl-succ' => array(518, 815),
		'#content>.elementor-element-050e911' => array(1713, 1080),
		'#content>.elementor-element-6c4ed0d' => array(685, 665),
		'#content>.elementor-element-b80ce4f' => array(648, 733),
		'#content>.elementor-element-42fa63c' => array(1046, 2747),
		'#content>.elementor-element-32f6098' => array(1216, 1342),
		'footer.elementor-location-footer>.elementor-element-d331701' => array(998, 601),
		'footer.elementor-location-footer>#dbl-foot' => array(2599, 1182),
	));
	$ph = ''; $pc = '';
	foreach ($secs as $s => $hh) {
		$ph .= 'html:not(.dbl-cv-off) ' . $s . '{content-visibility:auto;contain-intrinsic-size:auto ' . (int) $hh[0] . 'px}';
		$pc .= 'html:not(.dbl-cv-off) ' . $s . '{content-visibility:auto;contain-intrinsic-size:auto ' . (int) $hh[1] . 'px}';
	}
	echo '<style id="dbl-cv">@media (max-width:767px){' . $ph . '}@media (min-width:768px){' . $pc . '}</style>' . "\n";
	// the first touch only asks for the full drawing after the screen has answered it (so a tap stays quick); a click, a jump
	// to #anchor, keyboard focus or printing get the full page at once
	echo '<script nowprocket data-no-optimize="1" data-no-defer="1" data-no-minify="1" id="dbl-cv-js">(function(){var d=document.documentElement,k=0;function off(){if(k)return;k=1;d.classList.add("dbl-cv-off")}'
		. 'function soon(){if(!k)requestAnimationFrame(function(){setTimeout(off,0)})}if(location.hash){off();return}'
		. '["pointerdown","mousedown","mousemove","keydown","touchstart","wheel","scroll"].forEach(function(e){addEventListener(e,soon,{capture:true,passive:true,once:true})});'
		. '["click","hashchange","beforeprint","focusin"].forEach(function(e){addEventListener(e,off,{capture:true,passive:true,once:true})})})();</script>' . "\n";
}, 2);
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST) || !dbl_sp6('B')) return;
	ob_start(function ($html) {
		if (!is_string($html) || strpos($html, 'rocket_lazyload_css-js-after') === false) return $html;
		$old = '(document.querySelector("body"),c)';
		$new = '(document.querySelector("body"),function(m){if(!m||!m.length)return;if(document.readyState==="loading"){if(!window.dblLzW){window.dblLzW=1;document.addEventListener("DOMContentLoaded",function(){c([1])})}return}if(window.dblLzT)return;window.dblLzT=setTimeout(function(){window.dblLzT=0;c([1])},50)})';
		if (substr_count($html, $old) !== 1) return $html;
		return str_replace($old, $new, $html);
	});
}, 2);
