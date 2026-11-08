/* dabul: WP Rocket handles Facebook and WhatsApp visits like everyone else (8.11.2026).
   Why: WP Rocket skips its optimization for the user agents facebookexternalhit and WhatsApp. Facebook's crawler opens the
   home page about once an hour, gets the raw page (render-blocking jQuery, no delayed scripts, about 955KB) and Cloudflare
   keeps that copy for everyone for about two hours. That is why the phone score kept jumping between 57 and 86.
   Now these two crawlers get the same optimized page as visitors. Nothing visible on the site changes. */
add_filter('rocket_cache_reject_ua', function ($ua) {
	return array_values(array_filter((array) $ua, function ($u) { return !in_array($u, array('facebookexternalhit', 'WhatsApp'), true); }));
}, 99);
add_action('init', function () {
	if (get_option('dbl_rocket_ua_v') === '1' || !function_exists('rocket_generate_config_file')) return;
	rocket_generate_config_file();
	update_option('dbl_rocket_ua_v', '1', false);
}, 99);
