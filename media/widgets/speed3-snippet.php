/* dabul: speed and accessibility, round 3 (for Yakir's request on 8.10.2026: all PageSpeed scores green, without
   changing how the site looks). PREVIEW ONLY until Yakir approves: add ?dblprev=1 to a page address to see it.
   1. The page no longer jumps while it loads (the computer score fell because of this):
      - the logo gets its real size up front (it had no size and loaded late, so the header grew under the visitor),
      - the page's side overflow is cut with "clip" instead of "hidden", so the page body does not become its own
        scrolling box (that made the whole page register as moving).
   2. The big picture at the top is requested at once (phone: the city at night, computer: the hero background),
      instead of only after all the style files.
   3. Home page: style files for parts far below the first screen (carousels, accordion, footer) load after the page shows.
   4. Accessibility (screen readers and contrast): the "skip to content" link has a target, the menu items that open
      a submenu are marked as buttons, the cookie window is marked as a dialog with a name, and three colors are made
      a little darker so the text is readable for everyone: the green phone button, the gold "למידע נוסף" links,
      and the WhatsApp button at the bottom of the phone screen.
   To undo: deactivate this snippet. */

function dabul_sp3_on() {
	if (defined('DABUL_SP3_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_sp3_html($html) {
	// 1. logo: real size, no lazy loading (it is at the very top of every page)
	$html = preg_replace('#<img src="(https://dabullaw\.co\.il/wp-content/uploads/2025/11/unnamed-3-1\.jpg\.webp)" alt="([^"]*)" loading="lazy"\s*/?>#', '<img src="$1" alt="$2" width="300" height="77" decoding="async">', $html);
	// 4. skip link target
	if (strpos($html, 'id="content"') === false) {
		$html = preg_replace('#<div data-elementor-type="(wp-page|wp-post|single-post|single-page|archive|search-results|error-404)"#', '<div id="content" data-elementor-type="$1"', $html, 1);
	}
	// 4. menu items without a link that open a submenu: buttons
	$html = str_replace(array('<a class="elementor-item">', '<a class="elementor-item" tabindex="-1">'), array('<a class="elementor-item" role="button" tabindex="0">', '<a class="elementor-item" role="button" tabindex="-1">'), $html);
	if (is_front_page()) {
		// 3. below-the-fold style files: load after the first paint
		foreach (array('widget-image-carousel-rtl', 'e-swiper', 'swiper', 'widget-loop-common-rtl', 'widget-loop-carousel-rtl', 'widget-nested-accordion-rtl', 'widget-divider-rtl', 'widget-icon-box-rtl', 'widget-menu-anchor-rtl', 'widget-social-icons-rtl') as $id) {
			$html = preg_replace_callback('#<link rel=\'stylesheet\' id=\'' . preg_quote($id, '#') . '-css\' href=\'([^\']+)\' media=\'all\' />#', function ($m) {
				return '<link rel=\'stylesheet\' href=\'' . $m[1] . '\' media=\'print\' onload="this.media=\'all\'" /><noscript><link rel=\'stylesheet\' href=\'' . $m[1] . '\' media=\'all\' /></noscript>';
			}, $html, 1);
		}
		$html = preg_replace_callback('#<link rel=\'stylesheet\' id=\'elementor-post-622-css\' href=\'([^\']+)\' media=\'all\' />#', function ($m) {
			return '<link rel=\'stylesheet\' href=\'' . $m[1] . '\' media=\'print\' onload="this.media=\'all\'" /><noscript><link rel=\'stylesheet\' href=\'' . $m[1] . '\' media=\'all\' /></noscript>';
		}, $html, 1);
	}
	return $html;
}

add_action('template_redirect', function () {
	if (!dabul_sp3_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_sp3_html($html);
	});
}, 9);

add_action('wp_head', function () {
	if (is_admin() || !dabul_sp3_on()) return;
	if (is_front_page()) {
		// 2. the first big picture, requested at once
		echo '<link rel="preload" as="image" href="https://dabullaw.co.il/wp-content/uploads/2026/10/netanya-city-night-mobile-bright.webp" media="(max-width:767px)" fetchpriority="high">' . "\n";
		echo '<link rel="preload" as="image" href="https://dabullaw.co.il/wp-content/uploads/2026/05/bgmain.webp" media="(min-width:768px)" fetchpriority="high">' . "\n";
	}
	echo '<style id="dbl-sp3">'
		. '@supports (overflow:clip){html,body{overflow-x:clip!important}}'
		. '.elementor-element-ca99b79 img,.elementor-element-e4012a0 img{aspect-ratio:300/77}'
		. '.elementor-element-d8c5ab4 .elementor-button{background-color:#088a0b!important}'
		. '.elementor-element-ff08b22 .elementor-heading-title,.elementor-element-ff08b22 .elementor-heading-title a{color:#8c6f33!important}'
		. '#dbl-foot .wa a{background-color:#11823f!important}'
		. '</style>' . "\n";
}, 2);

add_action('wp_footer', function () {
	if (is_admin() || !dabul_sp3_on()) return;
	echo <<<'DBLSP3JS'
<script nowprocket data-no-optimize="1">
(function () {
	// the cookie window: mark it as a named dialog for screen readers
	function fix() {
		document.querySelectorAll('.elementor-popup-modal[role="document"]').forEach(function (p) {
			p.setAttribute('role', 'dialog');
			if (!p.getAttribute('aria-label')) p.setAttribute('aria-label', 'הודעה על שימוש בעוגיות');
		});
	}
	new MutationObserver(fix).observe(document.body, { childList: true });
	fix();
})();
</script>
DBLSP3JS;
}, 1);
