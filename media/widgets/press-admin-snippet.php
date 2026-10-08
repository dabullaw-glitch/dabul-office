/* dabul: admin route to add an item to "המשרד בתקשורת" (category press, id 50) the same way as the existing ones:
   an empty post whose card links to the outside article (plugin Page Links To: _links_to, opens in a new tab),
   with a screenshot of the article as the featured image and the outlet logo in the ACF field "תמונת_רשת_תקשורת".
   POST /wp-json/dabul/v1/press {title, url, date, featured, logo}  (admins only). Added 8.10.2026. */

add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/press', array(
		'methods' => 'POST',
		'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			$b = (array) $req->get_json_params();
			$title = sanitize_text_field($b['title'] ?? '');
			$url = esc_url_raw($b['url'] ?? '');
			if (!$title || !$url) return new WP_Error('bad', 'title and url are needed', array('status' => 400));
			foreach (get_posts(array('post_type' => 'post', 'category' => 50, 'numberposts' => 100, 'post_status' => 'any', 'fields' => 'ids')) as $pid) {
				if (get_post_meta($pid, '_links_to', true) === $url) return array('id' => $pid, 'exists' => true);
			}
			$id = wp_insert_post(array(
				'post_type' => 'post', 'post_status' => 'publish', 'post_title' => $title, 'post_content' => '',
				'post_category' => array(50), 'post_date' => sanitize_text_field($b['date'] ?? '') ?: current_time('mysql'),
			), true);
			if (is_wp_error($id)) return $id;
			update_post_meta($id, '_links_to', $url);
			update_post_meta($id, '_links_to_target', '_blank');
			if (!empty($b['featured'])) set_post_thumbnail($id, (int) $b['featured']);
			if (!empty($b['logo'])) {
				if (function_exists('update_field')) update_field('field_692ecd16038b5', (int) $b['logo'], $id);
				else { update_post_meta($id, 'תמונת_רשת_תקשורת', (int) $b['logo']); update_post_meta($id, '_תמונת_רשת_תקשורת', 'field_692ecd16038b5'); }
			}
			if (function_exists('rocket_clean_domain')) rocket_clean_domain();
			return array('id' => $id, 'link' => get_permalink($id));
		},
	));
});
