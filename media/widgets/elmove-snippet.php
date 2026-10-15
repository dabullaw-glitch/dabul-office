/* dabul: Elementor move helper (admin only), 15.10.2026.
   Moves child elements of one Elementor container to the end of that container, in the given order.
   First use: the "קישורים וטפסים" page, insolvency and enforcement forms after the real estate forms (Yakir 15.10.2026).
   Uses dabul_els_save from the sections helper, which keeps the old data in _dabul_textbak. dry=1 only reports. */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/elmove', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		global $wpdb;
		if (!function_exists('dabul_els_save')) return new WP_Error('helper', 'sections helper is not active', array('status' => 500));
		$pid = (int) $req->get_param('post'); $parent = (string) $req->get_param('parent'); $ids = array_values(array_map('strval', (array) $req->get_param('ids'))); $dry = (bool) $req->get_param('dry');
		$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid), ARRAY_A);
		if (!$row || !$parent || !$ids) return new WP_Error('args', 'missing', array('status' => 400));
		$d = json_decode($row['meta_value'], true); $done = false; $before = array(); $after = array();
		$walk = function (&$els) use (&$walk, $parent, $ids, &$done, &$before, &$after) {
			foreach ($els as &$e) {
				if ($done) return;
				if (isset($e['id']) && $e['id'] === $parent && !empty($e['elements'])) {
					$keep = array(); $move = array();
					foreach ($e['elements'] as $c) { $before[] = $c['id']; if (in_array($c['id'], $ids, true)) $move[$c['id']] = $c; else $keep[] = $c; }
					if (count($move) !== count($ids)) return;
					foreach ($ids as $i) $keep[] = $move[$i];
					$e['elements'] = $keep; foreach ($keep as $c) $after[] = $c['id']; $done = true; return;
				}
				if (!empty($e['elements'])) $walk($e['elements']);
			}
		};
		$walk($d);
		if (!$done) return new WP_Error('notfound', 'parent or ids not found', array('status' => 404));
		if (!$dry) dabul_els_save($pid, $row, $d, 'elmove ' . $parent . ' ' . implode(',', $ids));
		return array('ok' => true, 'dry' => $dry, 'before' => $before, 'after' => $after);
	}));
});
