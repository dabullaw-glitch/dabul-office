/* dabul: speed and accessibility fixes that do not change how the site looks (8.10.2026, after the PageSpeed check Yakir sent).
   1. The site font (Noto Local) shows the text right away while the font loads (font-display: swap).
   2. The accessibility button (OneTap) loaded 4 English Roboto fonts (about 280KB) on every page. Its panel now uses the site font,
      so these files are not downloaded. Roboto has no Hebrew letters anyway, so the Hebrew text in the panel looks the same.
   3. Screen readers: a name for the phone menu button and for the carousel arrows, no wrong "list" role on carousels,
      and the "skip to content" link works with the keyboard.
   To undo: deactivate this snippet. Until checked it works only on a preview address (?dblprev=1). */

function dabul_sa_on() {
	if (defined('DABUL_SA_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

add_action('template_redirect', function () {
	if (!dabul_sa_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		// 1. show text at once with the site font
		$html = preg_replace("#(font-family:\s*'Noto Local';[^}]*?font-display:\s*)auto#", '${1}swap', $html);
		// 3a. the phone menu button (an icon link) gets a name
		$html = preg_replace('#<a class="elementor-icon" href="\#elementor-action%3Aaction%3Doff_canvas(?![^>]*aria-label)#', '<a class="elementor-icon" aria-label="פתיחת התפריט" href="#elementor-action%3Aaction%3Doff_canvas', $html);
		// 3b. carousels are not lists (their items are slides)
		$html = preg_replace('#(<div class="swiper elementor-loop-container[^"]*")\s+role="list"#', '$1', $html);
		return $html;
	});
}, 7);

add_action('wp_head', function () {
	if (is_admin() || !dabul_sa_on()) return;
	echo '<style id="dbl-speed-a11y">'
		. '[class*="onetap"],[class*="onetap"] *{font-family:"Noto Local",Arial,sans-serif!important}'
		. 'a.skip-link.screen-reader-text{display:block!important;visibility:visible!important}'
		. '</style>' . "\n";
}, 50);

add_action('wp_footer', function () {
	if (is_admin() || !dabul_sa_on()) return;
	echo <<<'DBLA11Y'
<script nowprocket data-no-optimize="1">
(function () {
	function names() {
		document.querySelectorAll('.elementor-swiper-button-prev:not([aria-label])').forEach(function (b) { b.setAttribute('aria-label', 'הקודם'); });
		document.querySelectorAll('.elementor-swiper-button-next:not([aria-label])').forEach(function (b) { b.setAttribute('aria-label', 'הבא'); });
	}
	if (document.readyState !== 'loading') names(); else document.addEventListener('DOMContentLoaded', names);
	window.addEventListener('load', function () { names(); setTimeout(names, 1500); });
})();
</script>
DBLA11Y;
}, 99);
