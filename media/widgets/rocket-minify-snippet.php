/* dabul: WP Rocket keeps its own minified copy of external scripts (calc-core.js, svc-app.js). After the file changes
   on GitHub Pages, this route clears those copies and the page cache. Administrators only. Added 10.10.2026. */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/rocket-minify', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function () {
		$done = array();
		if (function_exists('rocket_clean_minify')) { rocket_clean_minify('js'); $done[] = 'minify_js'; }
		if (function_exists('rocket_clean_domain')) { rocket_clean_domain(); $done[] = 'domain'; }
		return array('done' => $done);
	}));
});
