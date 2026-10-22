/* dabul: read and change a few WP Rocket settings over the REST API (22.10.2026, Yakir asked to turn on "remove unused CSS").
   GET  /wp-json/dabul/v1/rocketopt  -> the current value of the CSS / JS options and the RUCSS status (admins only)
   POST /wp-json/dabul/v1/rocketopt {"set":{"remove_unused_css":1,...}} -> saves them through update_option, exactly like the
   settings screen does, after keeping a copy of the full settings in the option dabul_rocket_bak (the copy from before the
   first change is never overwritten). To undo: POST {"restore":1}. */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/rocketopt', array(
		'methods' => array('GET', 'POST'),
		'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			$keys = array('remove_unused_css', 'remove_unused_css_safelist', 'async_css', 'minify_css', 'minify_js', 'defer_all_js', 'delay_js', 'lazyload', 'lazyload_css_bg_img', 'cache_mobile', 'do_caching_mobile_files');
			$o = get_option('wp_rocket_settings', array());
			if ($req->get_method() === 'POST') {
				$p = $req->get_json_params();
				if (!empty($p['restore'])) {
					$b = get_option('dabul_rocket_bak');
					if (!is_array($b)) return new WP_Error('nobak', 'no backup', array('status' => 400));
					update_option('wp_rocket_settings', $b);
				} elseif (!empty($p['set']) && is_array($p['set'])) {
					if (!is_array(get_option('dabul_rocket_bak'))) update_option('dabul_rocket_bak', $o, false);
					foreach ($p['set'] as $k => $v) if (in_array($k, $keys, true)) $o[$k] = $v;
					update_option('wp_rocket_settings', $o);
				}
				$o = get_option('wp_rocket_settings', array());
			}
			$out = array();
			foreach ($keys as $k) $out[$k] = isset($o[$k]) ? $o[$k] : null;
			global $wpdb;
			$t = $wpdb->prefix . 'wpr_rucss_used_css';
			$rucss = null;
			if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $t)) === $t) {
				$rucss = $wpdb->get_results("SELECT status, COUNT(*) n FROM $t GROUP BY status", ARRAY_A);
			}
			$lic = get_transient('wp_rocket_customer_data');
			return array('settings' => $out, 'rucss' => $rucss, 'backup' => is_array(get_option('dabul_rocket_bak')), 'version' => defined('WP_ROCKET_VERSION') ? WP_ROCKET_VERSION : null,
				'license_ok' => is_object($lic) && isset($lic->licence_expiration) ? ($lic->licence_expiration > time()) : null);
		},
	));
});
