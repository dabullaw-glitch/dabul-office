/* dabul: real address for new articles (2.11.2026, Yakir: "תתקן אתה ישירות ותדאג שזה לא יקרה יותר").
   A scheduled post that goes live kept the temporary address (?p=ID) as its canonical / og:url in Yoast (seen 21.10, 29.10, 2.11).
   1) when a post goes live, and on every uncached view of a post, Yoast's stored address is corrected to the real one and the
      WP Rocket copy of that post is dropped; 2) a last guard on the canonical and og:url tags; 3) REST POST dabul/v1/tmpurl {id}
      (administrators) for the office checker (artlive). Rollback: deactivate this snippet. */
if (!function_exists('dabul_tmpurl_fix')) {
	function dabul_tmpurl_real($id) {
		$p = get_permalink($id);
		return ($p && !preg_match('~[?&]p=\d+~', $p)) ? $p : '';
	}
	function dabul_tmpurl_fix($u) {
		if (!is_string($u) || !preg_match('~[?&]p=\d+~', $u) || !is_singular()) return $u;
		$id = (int) get_queried_object_id();
		if (!$id || get_post_status($id) !== 'publish') return $u;
		$p = dabul_tmpurl_real($id);
		return $p ? $p : $u;
	}
	add_filter('wpseo_canonical', 'dabul_tmpurl_fix', 99);
	add_filter('wpseo_opengraph_url', 'dabul_tmpurl_fix', 99);

	function dabul_tmpurl_indexable($id) {
		$id = (int) $id;
		if (!$id || get_post_status($id) !== 'publish' || !function_exists('YoastSEO')) return false;
		$p = dabul_tmpurl_real($id);
		if (!$p) return false;
		try {
			$repo = YoastSEO()->classes->get('Yoast\WP\SEO\Repositories\Indexable_Repository');
			$ind = $repo ? $repo->find_by_id_and_type($id, 'post', false) : null;
			if ($ind && $ind->permalink !== $p) {
				$ind->permalink = $p;
				$ind->save();
				if (function_exists('rocket_clean_post')) rocket_clean_post($id);
				return true;
			}
		} catch (\Throwable $e) {
			return false;
		}
		return false;
	}
	add_action('transition_post_status', function ($new, $old, $post) {
		if ($new === 'publish' && $old !== 'publish' && $post && $post->post_type === 'post') {
			$id = (int) $post->ID;
			add_action('shutdown', function () use ($id) { dabul_tmpurl_indexable($id); });
		}
	}, 20, 3);
	add_action('template_redirect', function () {
		if (is_singular('post')) dabul_tmpurl_indexable(get_queried_object_id());
	}, 1);
	add_action('rest_api_init', function () {
		register_rest_route('dabul/v1', '/tmpurl', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($r) {
			$b = (array) $r->get_json_params();
			$id = (int) ($b['id'] ?? 0);
			$fixed = $id ? dabul_tmpurl_indexable($id) : false;
			if ($id && function_exists('rocket_clean_post')) rocket_clean_post($id);
			return array('id' => $id, 'fixed' => $fixed, 'permalink' => $id ? get_permalink($id) : '');
		}));
	});
}
