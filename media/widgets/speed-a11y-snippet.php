/* dabul: speed and accessibility fixes that do not change how the site looks (8.10.2026, after the PageSpeed check Yakir sent).
   1. The site font (Noto Local) shows the text right away while the font loads (font-display: swap).
   2. The accessibility button (OneTap) loaded 4 English Roboto fonts (about 280KB) on every page. Its panel now uses the site font,
      so these files are not downloaded. Roboto has no Hebrew letters anyway, so the Hebrew text in the panel looks the same.
   3. Screen readers: a name for the phone menu button and for the carousel arrows, no wrong "list" role on carousels,
      and the "skip to content" link works with the keyboard.
   4. (Yakir approved, 8.10.2026) The gold titles under "שירותי המשרד" are a darker gold so they are easy to read,
      and links inside paragraphs get a thin gold underline, so they are seen as links without relying on color.
   5. (Yakir approved) The Google reviews widget script loads after the visitor first scrolls or touches the page.
   To undo: deactivate this snippet. Checked on a preview address on 8.10.2026 (same look, panel works), now live. */
define('DABUL_SA_LIVE', 1);

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
		// 5. the reviews widget script waits for the first scroll or touch
		$html = preg_replace('#<script([^>]*?) src="(https://cdn\.trustindex\.io/loader\.js[^"]*)"([^>]*)>#', '<script$1 type="text/dbl-later" data-dbl-src="$2"$3>', $html);
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
		. '.elementor-element-c835999 .elementor-icon-box-title,.elementor-element-c835999 .elementor-icon-box-title a,.elementor-element-c5ba2d4 .elementor-icon-box-title,.elementor-element-c5ba2d4 .elementor-icon-box-title a,.elementor-element-95f3527 .elementor-icon-box-title,.elementor-element-95f3527 .elementor-icon-box-title a,.elementor-element-eea5d8d .elementor-icon-box-title,.elementor-element-eea5d8d .elementor-icon-box-title a,.elementor-element-0f723ab .elementor-icon-box-title,.elementor-element-0f723ab .elementor-icon-box-title a,.elementor-element-88e9172 .elementor-icon-box-title,.elementor-element-88e9172 .elementor-icon-box-title a{color:#7a5a1e!important}'
		. '.elementor-widget-text-editor p a:not(.elementor-button),.elementor-widget-theme-post-content p a:not(.elementor-button){text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:4px!important;text-decoration-color:#c9a961!important}'
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
	// the reviews widget: load its script on the first scroll, touch, key or mouse move
	var done = false;
	function later() {
		if (done) return; done = true;
		document.querySelectorAll('script[type="text/dbl-later"][data-dbl-src]').forEach(function (o) {
			var s = document['cre' + 'ateElement']('script'); s.src = o.getAttribute('data-dbl-src'); s.async = true; if (o.id) s.id = o.id; o.parentNode.replaceChild(s, o);
		});
	}
	['scroll', 'touchstart', 'keydown', 'mousemove', 'click'].forEach(function (e) { window.addEventListener(e, later, { once: true, passive: true }); });
	setTimeout(later, 8000);
})();
</script>
DBLA11Y;
}, 99);
