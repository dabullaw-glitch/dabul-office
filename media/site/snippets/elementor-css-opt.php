/* dabul: read and switch the Elementor "CSS print method" over the REST API (31.10.2026, Yakir approved trying it:
   the CSS moves from inside every page to cached files, so pages get about half as heavy; the look does not change).
   GET  /wp-json/dabul/v1/elcss          -> current values (admins only)
   POST /wp-json/dabul/v1/elcss {"set":"external"|"internal"} -> keeps a backup of the old values in the option
        dabul_elcss_bak (the first backup is never overwritten), saves the new value, regenerates Elementor CSS and clears WP Rocket.
   POST {"restore":1} -> puts back the backup. To undo everything: restore, then deactivate this snippet. */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/elcss', array(
		'methods' => array('GET', 'POST'),
		'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			$keys = array('elementor_css_print_method', 'elementor_experiment-e_optimized_css_loading', 'elementor_experiment-additional_custom_breakpoints');
			$cur = array();
			foreach ($keys as $k) $cur[$k] = get_option($k, null);
			$done = '';
			if ($req->get_method() === 'POST') {
				$p = $req->get_json_params();
				if (!is_array(get_option('dabul_elcss_bak'))) update_option('dabul_elcss_bak', $cur, false);
				if (!empty($p['restore'])) {
					$b = get_option('dabul_elcss_bak');
					if (is_array($b)) foreach ($b as $k => $v) { if ($v === null) delete_option($k); else update_option($k, $v); }
					$done = 'restored';
				} elseif (!empty($p['set']) && in_array($p['set'], array('external', 'internal'), true)) {
					update_option('elementor_css_print_method', $p['set']);
					$done = 'set ' . $p['set'];
				}
				if ($done) {
					if (class_exists('\Elementor\Plugin') && isset(\Elementor\Plugin::$instance->files_manager)) \Elementor\Plugin::$instance->files_manager->clear_cache();
					if (function_exists('rocket_clean_domain')) rocket_clean_domain();
				}
				foreach ($keys as $k) $cur[$k] = get_option($k, null);
			}
			return array('done' => $done, 'now' => $cur, 'backup' => get_option('dabul_elcss_bak', null));
		},
	));
});
