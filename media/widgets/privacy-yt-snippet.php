/* dabul: add section 13 (YouTube API Services) to the privacy policy page (id 3). Yakir approved the text 9.10.2026.
   REST, administrators only. Appends the section to the page's text widget in the Elementor data (once, marker dbl-yt-api),
   keeps a backup in the option dabul_bak_el3_<time>. Deactivate this snippet when the work is done. */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/privacy-yt', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($r) {
		$b = $r->get_json_params(); $dry = !empty($b['dry']); $html = (string) ($b['html'] ?? '');
		if (strpos($html, 'dbl-yt-api') === false) return new WP_Error('html', 'missing marker');
		$id = 3; $cur = get_post_meta($id, '_elementor_data', true); $data = json_decode((string) $cur, true);
		if (!is_array($data)) return new WP_Error('el', 'no elementor data');
		if (strpos((string) $cur, 'dbl-yt-api') !== false) return array('already' => true);
		$hit = 0;
		$walk = function (&$els) use (&$walk, $html, &$hit) { foreach ($els as &$el) {
			if (!$hit && ($el['widgetType'] ?? '') === 'text-editor' && strpos((string) ($el['settings']['editor'] ?? ''), 'dabullaw@gmail.com') !== false) { $el['settings']['editor'] .= "\n" . $html; $hit++; }
			if (!empty($el['elements'])) $walk($el['elements']); } };
		$walk($data);
		if ($dry || !$hit) return array('dry' => true, 'hit' => $hit);
		update_option('dabul_bak_el3_' . time(), $cur, false);
		update_post_meta($id, '_elementor_data', wp_slash(wp_json_encode($data)));
		delete_post_meta($id, '_elementor_css'); delete_post_meta($id, '_elementor_element_cache'); delete_post_meta($id, '_elementor_page_assets');
		if (class_exists('\Elementor\Plugin')) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
		clean_post_cache($id);
		if (function_exists('rocket_clean_post')) rocket_clean_post($id);
		return array('dry' => false, 'hit' => $hit, 'saved' => strpos((string) get_post_meta($id, '_elementor_data', true), 'dbl-yt-api') !== false);
	}));
});
