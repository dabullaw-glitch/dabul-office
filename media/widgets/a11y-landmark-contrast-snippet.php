/* dabul: fixes from the PageSpeed check of the home page on the phone (Yakir 23.11.2026 10:34: "תשפר את זה").
   1. Every page gets a main area for screen readers: the page's own content box (the Elementor content of the page,
      article, archive or search) gets role="main", unless the page already has one. Nothing visible changes.
   2. Home page, "שירותי המשרד": the gold "לכל הפרטים" on the light cards is a little darker so it reads well
      (contrast), and the dark main card gets a solid dark colour behind its picture so its light text is read
      against dark. Same look.
   To undo: deactivate this snippet. */

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || (defined('REST_REQUEST') && REST_REQUEST) || is_feed()) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		if (preg_match('~<main[\s>]|role=["\']main["\']~i', $html)) return $html;
		return preg_replace('~<div(\s[^>]*?)data-elementor-type="(wp-page|wp-post|single-post|single-page|single|archive|search-results|error-404|product|product-archive)"~', '<div$1role="main" data-elementor-type="$2"', $html, 1);
	});
}, 3);

add_action('wp_head', function () {
	if (is_admin() || !is_front_page()) return;
	echo '<style id="dbl-a11y-home">.dsvc .card:not(.main) .more{color:#7A5E26!important}.dsvc .card.main{background-color:#0a1226!important}</style>' . "\n";
}, 20);
