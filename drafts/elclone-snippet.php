/* dabul: Elementor clone helper (admin only), 15.10.2026.
   Copies the Elementor layout of one page to another page, so a new page gets the same real sidebar
   (consultation form template, featured image banner, related posts) and the Google reviews section.
   replace = {element id: html}: the children of that element become one HTML widget with this html.
   terms = {posts widget id: [category ids]}: which category the related posts list shows.
   Safety: the target must be a draft unless live=1. The old target data is kept in _dabul_textbak. dry=1 only reports.
   First use: the new "עורך דין נדל״ן" draft built on the "התחדשות עירונית" layout (Yakir 15.10.2026). */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/elclone', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		global $wpdb;
		$from = (int) $req->get_param('from'); $to = (int) $req->get_param('to'); $dry = (bool) $req->get_param('dry'); $live = (bool) $req->get_param('live');
		$replace = (array) $req->get_param('replace'); $terms = (array) $req->get_param('terms');
		$tp = get_post($to); $fp = get_post($from);
		if (!$tp || !$fp) return new WP_Error('args', 'post not found', array('status' => 404));
		if ($tp->post_status !== 'draft' && !$live) return new WP_Error('live', 'target is not a draft', array('status' => 409));
		$src = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $from));
		$d = json_decode((string) $src, true);
		if (!is_array($d)) return new WP_Error('src', 'source has no elementor data', array('status' => 400));
		$hits = array();
		$walk = function (&$els) use (&$walk, $replace, $terms, &$hits) {
			foreach ($els as &$e) {
				$id = isset($e['id']) ? $e['id'] : '';
				if ($id !== '' && isset($replace[$id])) {
					$e['elements'] = array(array('id' => substr(md5(uniqid('', true) . wp_rand()), 0, 7), 'elType' => 'widget', 'widgetType' => 'html', 'settings' => array('html' => (string) $replace[$id]), 'elements' => array()));
					$hits[] = 'replace ' . $id; continue;
				}
				if ($id !== '' && isset($terms[$id]) && isset($e['widgetType']) && $e['widgetType'] === 'posts') {
					$e['settings']['posts_include'] = array('terms'); $e['settings']['posts_include_term_ids'] = array_values(array_map('strval', (array) $terms[$id]));
					$hits[] = 'terms ' . $id;
				}
				if (!empty($e['elements'])) $walk($e['elements']);
			}
		};
		$walk($d);
		if (count($hits) !== count($replace) + count($terms)) return new WP_Error('notfound', 'not all elements found', array('status' => 404, 'hits' => $hits));
		if ($dry) return array('ok' => true, 'dry' => true, 'hits' => $hits, 'bytes' => strlen(wp_json_encode($d)));
		$old = array();
		foreach (array('_elementor_data', '_elementor_edit_mode', '_elementor_template_type', '_elementor_page_settings', '_elementor_version', '_wp_page_template') as $k) $old[$k] = get_post_meta($to, $k, true);
		$wpdb->insert($wpdb->postmeta, array('post_id' => $to, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode(array('at' => current_time('mysql'), 'note' => 'elclone from ' . $from, 'old' => $old), JSON_UNESCAPED_UNICODE)));
		update_post_meta($to, '_elementor_data', wp_slash(wp_json_encode($d)));
		update_post_meta($to, '_elementor_edit_mode', 'builder');
		update_post_meta($to, '_elementor_template_type', get_post_meta($from, '_elementor_template_type', true) ?: 'wp-page');
		$ps = get_post_meta($from, '_elementor_page_settings', true); if ($ps) update_post_meta($to, '_elementor_page_settings', $ps);
		$ver = get_post_meta($from, '_elementor_version', true); if ($ver) update_post_meta($to, '_elementor_version', $ver);
		update_post_meta($to, '_wp_page_template', get_post_meta($from, '_wp_page_template', true) ?: 'elementor_header_footer');
		clean_post_cache($to); wp_cache_delete($to, 'post_meta'); delete_post_meta($to, '_elementor_css'); delete_post_meta($to, '_elementor_element_cache');
		if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		if (function_exists('rocket_clean_post')) rocket_clean_post($to);
		return array('ok' => true, 'hits' => $hits, 'to' => $to);
	}));
	/* Admin only check: the Elementor HTML of a page as visitors would get it (works for drafts too). */
	register_rest_route('dabul/v1', '/elrender', array('methods' => 'GET', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		$pid = (int) $req->get_param('post');
		if (!class_exists('\Elementor\Plugin') || !get_post($pid)) return new WP_Error('args', 'missing', array('status' => 400));
		$GLOBALS['post'] = get_post($pid); setup_postdata($GLOBALS['post']);
		$html = \Elementor\Plugin::$instance->frontend->get_builder_content_for_display($pid, true);
		wp_reset_postdata();
		return array('ok' => true, 'html' => $html);
	}));
});
