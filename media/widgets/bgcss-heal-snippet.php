/* dabul 16.11.2026: heal pages whose cached HTML points at CSS files that were deleted. Elementor "clear cache" deletes every
   Elementor CSS file, while pages cached by WP Rocket and Cloudflare still link to them (and to WP Rocket's lazy-background copies),
   so a page shows with no design (the links and forms page did). dabul_cssheal(): for every published Elementor page/post/template,
   rebuild its CSS file if missing and copy it to WP Rocket's background-css folder if missing. Runs by itself 30 seconds after every
   Elementor cache clear, and on demand: POST /wp-json/dabul/v1/cssheal {dry}. */
function dabul_cssheal($dry = false) {
	if (!class_exists('\Elementor\Plugin')) return array('ok' => false);
	$up = wp_upload_dir(); $src = trailingslashit($up['basedir']) . 'elementor/css/';
	$host = parse_url(home_url(), PHP_URL_HOST);
	$bg = WP_CONTENT_DIR . '/cache/background-css/1/' . $host . '/wp-content/uploads/elementor/css/';
	$ids = get_posts(array('post_type' => array_values(array_unique(array_merge(get_post_types(array('public' => true)), array('elementor_library')))), 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_elementor_edit_mode', 'meta_value' => 'builder'));
	$built = array(); $copied = array();
	foreach ($ids as $id) {
		$f = $src . 'post-' . $id . '.css';
		if (!file_exists($f)) { if (!$dry) { $css = \Elementor\Core\Files\CSS\Post::create($id); $css->update(); } if ($dry || file_exists($f)) $built[] = $id; }
		if (file_exists($f) && !file_exists($bg . 'post-' . $id . '.css')) { if (!$dry) { wp_mkdir_p($bg); @copy($f, $bg . 'post-' . $id . '.css'); } $copied[] = $id; }
	}
	return array('ok' => true, 'pages' => count($ids), 'built' => $built, 'copied' => $copied, 'dry' => $dry);
}
add_action('dabul_cssheal_ev', function () { dabul_cssheal(false); });
add_action('elementor/core/files/clear_cache', function () { if (!wp_next_scheduled('dabul_cssheal_ev')) wp_schedule_single_event(time() + 30, 'dabul_cssheal_ev'); });
// 17.11.2026: WP Rocket's full clean also deletes its background-css copies that Cloudflare-cached pages still link to
add_action('after_rocket_clean_domain', function () { if (!wp_next_scheduled('dabul_cssheal_ev')) wp_schedule_single_event(time() + 30, 'dabul_cssheal_ev'); });
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/cssheal', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		return dabul_cssheal((bool) $req->get_param('dry'));
	}));
});
