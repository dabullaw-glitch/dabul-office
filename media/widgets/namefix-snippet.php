/* dabul: office name fix (temporary helper, admin only).
   Yakir, 9.10.2026: wherever the site says "דבול ושות׳" it should say the office's real name, "יקיר דבול - משרד עורכי דין",
   or the form that fits the sentence ("עו״ד יקיר דבול").
   GET  /wp-json/dabul/v1/namefix            -> what would change (nothing is changed)
   POST /wp-json/dabul/v1/namefix {ids:[..]} -> changes those pages/posts; the original text of every changed field is kept
                                               first in the hidden field _dabul_namebak of the same post
   POST /wp-json/dabul/v1/namefix-undo {ids} -> puts the original text back
   Deactivate when done. */

function dabul_nf_rules() {
	$A = "(?:'|׳|’|&#8217;|&#039;|&#39;|&apos;)";
	$Q = '(?:"|״|&quot;|&#8221;|&#8243;)';
	$D = '(?:-|–|—|&#8211;|&#8212;)';
	return array(
		array('~דבול ושות' . $A . '\s*' . $D . '\s*משרד עורכי דין~u', 'יקיר דבול - משרד עורכי דין'),
		array('~דבול ושות' . $A . '\s+משרד עורכי דין~u', 'יקיר דבול - משרד עורכי דין'),
		array('~משרד (?:עורכי דין|עו' . $Q . 'ד) (?:יקיר )?דבול ושות' . $A . '~u', 'משרד עו״ד יקיר דבול'),
		array('~משרד דבול ושות' . $A . '~u', 'משרד עו״ד יקיר דבול'),
		array('~עו' . $Q . 'ד יקיר דבול ושות' . $A . '~u', 'עו״ד יקיר דבול'),
		array('~יקיר דבול ושות' . $A . '~u', 'יקיר דבול'),
		array('~(?<![א-ת])([בלמהוכש]?)דבול ושות' . $A . '~u', '$1עו״ד יקיר דבול'),
		array('~Dabul\s*(?:&amp;|&|and)\s*(?:Co\.?|Partners)~i', 'Yakir Dabul Law Office'),
	);
}

function dabul_nf_str($s, &$n) {
	if (!is_string($s) || $s === '') return $s;
	if (strpos($s, 'דבול ושות') === false && stripos($s, 'Dabul') === false) return $s;
	foreach (dabul_nf_rules() as $r) { $c = 0; $o = preg_replace($r[0], $r[1], $s, -1, $c); if (is_string($o)) { $s = $o; $n += $c; } }
	return $s;
}

function dabul_nf_walk($v, &$n) {
	if (is_string($v)) return dabul_nf_str($v, $n);
	if (is_array($v)) { foreach ($v as $k => $x) $v[$k] = dabul_nf_walk($x, $n); return $v; }
	if (is_object($v)) { foreach (get_object_vars($v) as $k => $x) $v->$k = dabul_nf_walk($x, $n); return $v; }
	return $v;
}

// the new raw database value of one post meta row, or null when nothing changes
function dabul_nf_meta_new($key, $raw, &$n) {
	if ($key === '_elementor_data') {
		$d = json_decode($raw, true);
		if (!is_array($d)) return null;
		$c = 0; $d2 = dabul_nf_walk($d, $c);
		if (!$c) return null;
		$n += $c; return wp_json_encode($d2);
	}
	if (is_serialized($raw)) {
		$v = @unserialize($raw, array('allowed_classes' => false));
		if ($v === false && $raw !== 'b:0;') return null;
		$c = 0; $v2 = dabul_nf_walk($v, $c);
		if (!$c) return null;
		$n += $c; return serialize($v2);
	}
	$c = 0; $s = dabul_nf_str($raw, $c);
	if (!$c) return null;
	$n += $c; return $s;
}

function dabul_nf_scan($only = null) {
	global $wpdb;
	$lit = '%' . $wpdb->esc_like('דבול ושות') . '%';
	$esc = 'דבול ושות';
	$ids = $wpdb->get_col($wpdb->prepare("SELECT ID FROM {$wpdb->posts} WHERE post_type <> 'revision' AND post_status <> 'trash' AND (post_content LIKE %s OR post_title LIKE %s OR post_excerpt LIKE %s OR post_content LIKE %s)", $lit, $lit, $lit, '%Dabul & Co%'));
	$ids2 = $wpdb->get_col($wpdb->prepare("SELECT DISTINCT m.post_id FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE p.post_type <> 'revision' AND p.post_status <> 'trash' AND m.meta_key <> '_dabul_namebak' AND (m.meta_value LIKE %s OR LOCATE(%s, m.meta_value) > 0)", $lit, $esc));
	$all = array_values(array_unique(array_map('intval', array_merge($ids, $ids2))));
	if ($only) $all = array_values(array_intersect($all, array_map('intval', $only)));
	$out = array();
	foreach ($all as $id) {
		$p = $wpdb->get_row($wpdb->prepare("SELECT ID, post_type, post_status, post_title, post_content, post_excerpt FROM {$wpdb->posts} WHERE ID = %d", $id), ARRAY_A);
		if (!$p) continue;
		$item = array('id' => $id, 'type' => $p['post_type'], 'status' => $p['post_status'], 'title' => $p['post_title'], 'n' => 0, 'fields' => array(), 'meta' => array(), 'samples' => array());
		foreach (array('post_title', 'post_content', 'post_excerpt') as $f) {
			$c = 0; $new = dabul_nf_str($p[$f], $c);
			if ($c) { $item['fields'][$f] = $new; $item['n'] += $c; }
		}
		$rows = $wpdb->get_results($wpdb->prepare("SELECT meta_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key <> '_dabul_namebak' AND (meta_value LIKE %s OR LOCATE(%s, meta_value) > 0)", $id, $lit, $esc), ARRAY_A);
		foreach ($rows as $r) {
			$c = 0; $new = dabul_nf_meta_new($r['meta_key'], $r['meta_value'], $c);
			if ($new !== null && $c) { $item['meta'][$r['meta_id']] = array('key' => $r['meta_key'], 'new' => $new); $item['n'] += $c; }
		}
		// a few before/after examples from the visible text, so the wording can be checked
		$src = $p['post_title'] . ' ' . $p['post_content'] . ' ' . $p['post_excerpt'];
		foreach ($rows as $r) $src .= ' ' . ($r['meta_key'] === '_elementor_data' ? implode(' ', dabul_nf_strings(json_decode($r['meta_value'], true))) : $r['meta_value']);
		if (preg_match_all('#.{0,35}(?:דבול ושות|Dabul\s*&).{0,30}#u', $src, $mm)) {
			foreach (array_slice(array_unique($mm[0]), 0, 40) as $s) { $c = 0; $item['samples'][] = array(trim(wp_strip_all_tags($s)), trim(wp_strip_all_tags(dabul_nf_str($s, $c)))); }
		}
		$out[] = $item;
	}
	return $out;
}

function dabul_nf_strings($v) {
	$o = array();
	if (is_string($v)) { if (strpos($v, 'דבול ושות') !== false) $o[] = $v; }
	elseif (is_array($v)) foreach ($v as $x) $o = array_merge($o, dabul_nf_strings($x));
	return $o;
}

add_action('rest_api_init', function () {
	$perm = function () { return current_user_can('manage_options'); };
	register_rest_route('dabul/v1', '/namefix', array(
		array('methods' => 'GET', 'permission_callback' => $perm, 'callback' => function () {
			$r = array();
			foreach (dabul_nf_scan() as $it) $r[] = array('id' => $it['id'], 'type' => $it['type'], 'status' => $it['status'], 'title' => $it['title'], 'n' => $it['n'], 'fields' => array_keys($it['fields']), 'meta' => array_values(array_map(function ($m) { return $m['key']; }, $it['meta'])), 'samples' => $it['samples']);
			return array('count' => count($r), 'items' => $r);
		}),
		array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
			global $wpdb;
			$ids = (array) $req->get_param('ids');
			if (!$ids) return new WP_Error('ids', 'ids required', array('status' => 400));
			$done = array();
			foreach (dabul_nf_scan($ids) as $it) {
				if (!$it['n']) continue;
				$bak = array('at' => current_time('mysql'), 'fields' => array(), 'meta' => array());
				$p = $wpdb->get_row($wpdb->prepare("SELECT post_title, post_content, post_excerpt FROM {$wpdb->posts} WHERE ID = %d", $it['id']), ARRAY_A);
				foreach ($it['fields'] as $f => $v) $bak['fields'][$f] = $p[$f];
				foreach ($it['meta'] as $mid => $m) $bak['meta'][$mid] = array('key' => $m['key'], 'old' => $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_id = %d", $mid)));
				$ok = $wpdb->insert($wpdb->postmeta, array('post_id' => $it['id'], 'meta_key' => '_dabul_namebak', 'meta_value' => wp_json_encode($bak, JSON_UNESCAPED_UNICODE)));
				if (!$ok) { $done[] = array('id' => $it['id'], 'error' => 'backup failed, not changed'); continue; }
				if ($it['fields']) $wpdb->update($wpdb->posts, $it['fields'], array('ID' => $it['id']));
				foreach ($it['meta'] as $mid => $m) $wpdb->update($wpdb->postmeta, array('meta_value' => $m['new']), array('meta_id' => $mid));
				clean_post_cache($it['id']); wp_cache_delete($it['id'], 'post_meta');
				if ($it['type'] !== 'attachment' && class_exists('\Elementor\Plugin')) { delete_post_meta($it['id'], '_elementor_css'); delete_post_meta($it['id'], '_elementor_element_cache'); }
				if (function_exists('rocket_clean_post')) rocket_clean_post($it['id']);
				$done[] = array('id' => $it['id'], 'n' => $it['n']);
			}
			if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
			return array('done' => $done);
		}),
	));
	register_rest_route('dabul/v1', '/namefix-undo', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$out = array();
		foreach ((array) $req->get_param('ids') as $id) {
			$id = (int) $id;
			$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_dabul_namebak' ORDER BY meta_id ASC LIMIT 1", $id), ARRAY_A);
			if (!$row) { $out[] = array('id' => $id, 'error' => 'no backup'); continue; }
			$b = json_decode($row['meta_value'], true);
			if (!empty($b['fields'])) $wpdb->update($wpdb->posts, $b['fields'], array('ID' => $id));
			foreach ((array) $b['meta'] as $mid => $m) $wpdb->update($wpdb->postmeta, array('meta_value' => $m['old']), array('meta_id' => (int) $mid));
			clean_post_cache($id); wp_cache_delete($id, 'post_meta'); delete_post_meta($id, '_elementor_css'); delete_post_meta($id, '_elementor_element_cache');
			if (function_exists('rocket_clean_post')) rocket_clean_post($id);
			$out[] = array('id' => $id, 'restored' => true);
		}
		if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		return array('done' => $out);
	}));
});
