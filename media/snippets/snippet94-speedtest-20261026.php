/* dabul: temporary speed test (26.10.2026). Acts ONLY on addresses with ?dblspd=1 or ?dblspd=2, which nobody visits;
   regular pages are not touched. Used to measure, with Google's PageSpeed test, how much the page size slows the phone.
   dblspd=1: without the accessibility panel's hidden markup and data. dblspd=2: also without below-the-fold style blocks.
   To be deactivated and deleted right after the test. */
add_action('template_redirect', function () {
	if (is_admin() || empty($_GET['dblspd'])) return;
	$lvl = (int) $_GET['dblspd'];
	if ($lvl < 1) return;
	ob_start(function ($html) use ($lvl) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$x = preg_replace('#<nav class="onetap-accessibility.*?</nav>#s', '', $html, 1);
		if (is_string($x)) $html = $x;
		$x = preg_replace('#<script id="accessibility-onetap-js-extra">.*?</script>#s', '', $html, 1);
		if (is_string($x)) $html = $x;
		if ($lvl >= 2) {
			foreach (array('elementor-post-1112-css', 'widget-loop-carousel-css', 'widget-form-css', 'widget-nested-accordion-css', 'widget-social-icons-css', 'widget-icon-box-css', 'widget-divider-css', 'widget-image-box-css', 'dbl-about-css', 'dabul-lf-css', 'dbl-foot-css', 'dbl-yt-css', 'elementor-post-1023-css', 'e-popup-css', 'wpr-lazyload-bg-nostyle') as $id) {
				$x = preg_replace('#<style id="' . preg_quote($id, '#') . '">.*?</style>#s', '', $html, 1);
				if (is_string($x)) $html = $x;
			}
		}
		return $html;
	});
}, 0);
