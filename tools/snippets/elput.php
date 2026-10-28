/* dabul: Elementor raw get/put helper (admin only), 28.10.2026.
   Added for the "מכירת דירה" page (3916): Yakir approved (28.10.2026) putting it in the same page design as
   "התחדשות עירונית" (35) with its own text, FAQ and sidebar card, without changing the text.
   GET  /wp-json/dabul/v1/elraw?post=ID          the page's _elementor_data (JSON string) and its Elementor meta
   POST /wp-json/dabul/v1/elput {post, data, from, dry, live}
        writes data (Elementor JSON string) as the page's _elementor_data and copies the Elementor page meta
        (template type, page settings, version, page template) from the page "from".
   Safety: target must be a draft unless live=1; the old values are kept in _dabul_textbak (same as elclone);
   dry=1 only checks the JSON. Undo: POST /elput-undo {post} puts back the newest _dabul_textbak written by elput. */
add_action('rest_api_init', function () {
	$perm = function () { return current_user_can('manage_options'); };
	$keys = array('_elementor_data', '_elementor_edit_mode', '_elementor_template_type', '_elementor_page_settings', '_elementor_version', '_wp_page_template');
	register_rest_route('dabul/v1', '/elraw', array('methods' => 'GET', 'permission_callback' => $perm, 'callback' => function ($req) use ($keys) {
		global $wpdb;
		$pid = (int) $req->get_param('post');
		if (!get_post($pid)) return new WP_Error('args', 'post not found', array('status' => 404));
		$out = array('post' => $pid);
		foreach ($keys as $k) $out[$k] = $k === '_elementor_data' ? (string) $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid)) : get_post_meta($pid, $k, true);
		return $out;
	}));
	register_rest_route('dabul/v1', '/elput', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) use ($keys) {
		global $wpdb;
		$to = (int) $req->get_param('post'); $from = (int) $req->get_param('from'); $dry = (bool) $req->get_param('dry'); $live = (bool) $req->get_param('live');
		$raw = (string) $req->get_param('data');
		$tp = get_post($to); $fp = get_post($from);
		if (!$tp || !$fp) return new WP_Error('args', 'post not found', array('status' => 404));
		if ($tp->post_status !== 'draft' && !$live) return new WP_Error('live', 'target is not a draft', array('status' => 409));
		$d = json_decode($raw, true);
		if (!is_array($d) || !$d) return new WP_Error('data', 'data is not Elementor JSON', array('status' => 400));
		if ($dry) return array('ok' => true, 'dry' => true, 'top' => count($d), 'bytes' => strlen($raw));
		$old = array();
		foreach ($keys as $k) $old[$k] = get_post_meta($to, $k, true);
		$wpdb->insert($wpdb->postmeta, array('post_id' => $to, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode(array('at' => current_time('mysql'), 'note' => 'elput from ' . $from, 'old' => $old), JSON_UNESCAPED_UNICODE)));
		update_post_meta($to, '_elementor_data', wp_slash(wp_json_encode($d)));
		update_post_meta($to, '_elementor_edit_mode', 'builder');
		update_post_meta($to, '_elementor_template_type', get_post_meta($from, '_elementor_template_type', true) ?: 'wp-page');
		$ps = get_post_meta($from, '_elementor_page_settings', true); if ($ps) update_post_meta($to, '_elementor_page_settings', $ps);
		$ver = get_post_meta($from, '_elementor_version', true); if ($ver) update_post_meta($to, '_elementor_version', $ver);
		update_post_meta($to, '_wp_page_template', get_post_meta($from, '_wp_page_template', true) ?: 'elementor_header_footer');
		clean_post_cache($to); wp_cache_delete($to, 'post_meta'); delete_post_meta($to, '_elementor_css'); delete_post_meta($to, '_elementor_element_cache');
		if (class_exists('\\Elementor\\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		if (function_exists('rocket_clean_post')) rocket_clean_post($to);
		return array('ok' => true, 'post' => $to);
	}));
	register_rest_route('dabul/v1', '/elput-undo', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) use ($keys) {
		global $wpdb;
		$pid = (int) $req->get_param('post');
		$rows = $wpdb->get_results($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_dabul_textbak' ORDER BY meta_id DESC", $pid), ARRAY_A);
		foreach ($rows as $r) {
			$b = json_decode($r['meta_value'], true);
			if (!is_array($b) || strpos((string) ($b['note'] ?? ''), 'elput') !== 0) continue;
			foreach ($keys as $k) { $v = $b['old'][$k] ?? ''; if ($v === '' || $v === null) delete_post_meta($pid, $k); else update_post_meta($pid, $k, $k === '_elementor_data' ? wp_slash($v) : $v); }
			clean_post_cache($pid); wp_cache_delete($pid, 'post_meta'); delete_post_meta($pid, '_elementor_css'); delete_post_meta($pid, '_elementor_element_cache');
			if (class_exists('\\Elementor\\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
			if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
			return array('ok' => true, 'restored' => $r['meta_id']);
		}
		return new WP_Error('none', 'no elput backup', array('status' => 404));
	}));
});
