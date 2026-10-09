/* dabul: office name fix (temporary helper, admin only).
   Yakir, 9.10.2026: wherever the site says "דבול ושות׳" it should say the office's real name, "יקיר דבול - משרד עורכי דין",
   or the form that fits the sentence ("עו״ד יקיר דבול").
   GET  /wp-json/dabul/v1/namefix            -> what would change (nothing is changed)
   POST /wp-json/dabul/v1/namefix {ids:[..]} -> changes those pages/posts; the original text of every changed field is kept
                                               first in the hidden field _dabul_namebak of the same post
   POST /wp-json/dabul/v1/namefix-undo {ids} -> puts the original text back
   Deactivate when done. */

function dabul_nf_rules() {
	if (!empty($GLOBALS['dabul_nf_custom'])) { $c = $GLOBALS['dabul_nf_custom']; return array(array('~' . preg_quote($c[0], '~') . '~u', $c[1])); }
	$A = "(?:'|׳|’|&#8217;|&#039;|&#39;|&apos;)";
	$Q = '(?:"|״|&quot;|&#8221;|&#8243;)';
	$D = '(?:\||-|–|—|&#8211;|&#8212;)';
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
	$needle = !empty($GLOBALS['dabul_nf_custom']) ? $GLOBALS['dabul_nf_custom'][0] : null;
	if ($needle !== null) { if (strpos($s, $needle) === false) return $s; }
	elseif (strpos($s, 'דבול ושות') === false && stripos($s, 'Dabul') === false) return $s;
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
	$word = !empty($GLOBALS['dabul_nf_custom']) ? $GLOBALS['dabul_nf_custom'][0] : 'דבול ושות';
	$lit = '%' . $wpdb->esc_like($word) . '%';
	$esc = trim(wp_json_encode($word), '"'); // the same words as they look inside saved Elementor data (ד...)
	$ids = $wpdb->get_col($wpdb->prepare("SELECT ID FROM {$wpdb->posts} WHERE post_type <> 'revision' AND post_status <> 'trash' AND (post_content LIKE %s OR post_title LIKE %s OR post_excerpt LIKE %s OR post_content LIKE %s)", $lit, $lit, $lit, '%Dabul & Co%'));
	$ids2 = $wpdb->get_col($wpdb->prepare("SELECT DISTINCT m.post_id FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE p.post_type <> 'revision' AND p.post_status <> 'trash' AND m.meta_key NOT IN ('_dabul_namebak','_dabul_textbak') AND (m.meta_value LIKE %s OR LOCATE(%s, m.meta_value) > 0)", $lit, $esc));
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
		$rows = $wpdb->get_results($wpdb->prepare("SELECT meta_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key NOT IN ('_dabul_namebak','_dabul_textbak') AND (meta_value LIKE %s OR LOCATE(%s, meta_value) > 0)", $id, $lit, $esc), ARRAY_A);
		foreach ($rows as $r) {
			$c = 0; $new = dabul_nf_meta_new($r['meta_key'], $r['meta_value'], $c);
			if ($new !== null && $c) { $item['meta'][$r['meta_id']] = array('key' => $r['meta_key'], 'new' => $new); $item['n'] += $c; }
		}
		// a few before/after examples from the visible text, so the wording can be checked
		$src = $p['post_title'] . ' ' . $p['post_content'] . ' ' . $p['post_excerpt'];
		foreach ($rows as $r) $src .= ' ' . ($r['meta_key'] === '_elementor_data' ? implode(' ', dabul_nf_strings(json_decode($r['meta_value'], true))) : $r['meta_value']);
		$pat = !empty($GLOBALS['dabul_nf_custom']) ? preg_quote($GLOBALS['dabul_nf_custom'][0], '#') : '(?:דבול ושות|Dabul\s*&)';
		if (preg_match_all('#.{0,35}' . $pat . '.{0,30}#u', $src, $mm)) {
			foreach (array_slice(array_unique($mm[0]), 0, 40) as $s) { $c = 0; $item['samples'][] = array(trim(wp_strip_all_tags($s)), trim(wp_strip_all_tags(dabul_nf_str($s, $c)))); }
		}
		$out[] = $item;
	}
	return $out;
}

function dabul_nf_strings($v) {
	$o = array();
	$w = !empty($GLOBALS['dabul_nf_custom']) ? $GLOBALS['dabul_nf_custom'][0] : 'דבול ושות';
	if (is_string($v)) { if (strpos($v, $w) !== false) $o[] = $v; }
	elseif (is_array($v)) foreach ($v as $x) $o = array_merge($o, dabul_nf_strings($x));
	return $o;
}

// walks a JSON text; a quote inside a string counts as the end of the string only when the next
// non-space character is , : } ] (or the end). Any other quote inside a string is escaped (\").
function dabul_json_repair($s) {
	$out = ''; $in = false; $len = strlen($s);
	for ($i = 0; $i < $len; $i++) {
		$ch = $s[$i];
		if ($in && $ch === '\\') { $out .= $ch . ($i + 1 < $len ? $s[$i + 1] : ''); $i++; continue; }
		if ($ch === '"') {
			if (!$in) { $in = true; $out .= $ch; continue; }
			$j = $i + 1; while ($j < $len && strpos(" \t\r\n", $s[$j]) !== false) $j++;
			if ($j >= $len || strpos(',:}]', $s[$j]) !== false) { $in = false; $out .= $ch; }
			else $out .= '\\"';
			continue;
		}
		$out .= $ch;
	}
	return $out;
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
	// one-off exact text fix with the same backup: POST {find, replace, ids?, dry?}
	register_rest_route('dabul/v1', '/textfix', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$f = (string) $req->get_param('find'); $r = (string) $req->get_param('replace');
		if (mb_strlen($f) < 8) return new WP_Error('find', 'find too short', array('status' => 400));
		$GLOBALS['dabul_nf_custom'] = array($f, $r);
		$items = dabul_nf_scan($req->get_param('ids') ? (array) $req->get_param('ids') : null);
		if ($req->get_param('dry')) return array('items' => array_map(function ($it) { return array('id' => $it['id'], 'type' => $it['type'], 'title' => $it['title'], 'n' => $it['n'], 'fields' => array_keys($it['fields']), 'meta' => array_values(array_map(function ($m) { return $m['key']; }, $it['meta'])), 'samples' => $it['samples']); }, $items));
		$done = array();
		foreach ($items as $it) {
			if (!$it['n']) continue;
			$bak = array('at' => current_time('mysql'), 'find' => $f, 'fields' => array(), 'meta' => array());
			$p = $wpdb->get_row($wpdb->prepare("SELECT post_title, post_content, post_excerpt FROM {$wpdb->posts} WHERE ID = %d", $it['id']), ARRAY_A);
			foreach ($it['fields'] as $k => $v) $bak['fields'][$k] = $p[$k];
			foreach ($it['meta'] as $mid => $m) $bak['meta'][$mid] = array('key' => $m['key'], 'old' => $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_id = %d", $mid)));
			if (!$wpdb->insert($wpdb->postmeta, array('post_id' => $it['id'], 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode($bak, JSON_UNESCAPED_UNICODE)))) { $done[] = array('id' => $it['id'], 'error' => 'backup failed'); continue; }
			if ($it['fields']) $wpdb->update($wpdb->posts, $it['fields'], array('ID' => $it['id']));
			foreach ($it['meta'] as $mid => $m) $wpdb->update($wpdb->postmeta, array('meta_value' => $m['new']), array('meta_id' => $mid));
			clean_post_cache($it['id']); wp_cache_delete($it['id'], 'post_meta'); delete_post_meta($it['id'], '_elementor_css'); delete_post_meta($it['id'], '_elementor_element_cache');
			if (function_exists('rocket_clean_post')) rocket_clean_post($it['id']);
			$done[] = array('id' => $it['id'], 'n' => $it['n']);
		}
		if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		return array('done' => $done);
	}));
	// set the link of one Elementor element (a button): POST {post, el, url}; the old data is kept in _dabul_textbak
	register_rest_route('dabul/v1', '/elsetlink', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$pid = (int) $req->get_param('post'); $el = (string) $req->get_param('el'); $url = esc_url_raw((string) $req->get_param('url'));
		if (!$pid || !$el || !$url) return new WP_Error('args', 'post, el, url required', array('status' => 400));
		$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid), ARRAY_A);
		if (!$row) return new WP_Error('nodata', 'no elementor data', array('status' => 404));
		$d = json_decode($row['meta_value'], true); $found = 0;
		$walk = function (&$items) use (&$walk, $el, $url, &$found) {
			foreach ($items as &$it) {
				if (isset($it['id']) && $it['id'] === $el) {
					if (!isset($it['settings']) || !is_array($it['settings'])) $it['settings'] = array();
					$it['settings']['link'] = array('url' => $url, 'is_external' => '', 'nofollow' => '', 'custom_attributes' => '');
					if (isset($it['settings']['__dynamic__']['link'])) unset($it['settings']['__dynamic__']['link']);
					$found++;
				}
				if (!empty($it['elements'])) $walk($it['elements']);
			}
		};
		if (!is_array($d)) return new WP_Error('bad', 'bad data', array('status' => 500));
		$walk($d);
		if ($found !== 1) return new WP_Error('el', 'element found ' . $found . ' times', array('status' => 409));
		$wpdb->insert($wpdb->postmeta, array('post_id' => $pid, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode(array('at' => current_time('mysql'), 'el' => $el, 'meta' => array($row['meta_id'] => array('key' => '_elementor_data', 'old' => $row['meta_value']))), JSON_UNESCAPED_UNICODE)));
		$wpdb->update($wpdb->postmeta, array('meta_value' => wp_json_encode($d)), array('meta_id' => $row['meta_id']));
		clean_post_cache($pid); wp_cache_delete($pid, 'post_meta'); delete_post_meta($pid, '_elementor_css'); delete_post_meta($pid, '_elementor_element_cache');
		if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
		return array('ok' => true, 'post' => $pid, 'el' => $el, 'url' => $url);
	}));
	register_rest_route('dabul/v1', '/elget', array('methods' => 'GET', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$pid = (int) $req->get_param('post'); $el = (string) $req->get_param('el');
		$raw = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid));
		$d = json_decode((string) $raw, true); $hit = array();
		$walk = function ($items) use (&$walk, $el, &$hit) { foreach ((array) $items as $it) { if (isset($it['id']) && $it['id'] === $el) $hit[] = $it; if (!empty($it['elements'])) $walk($it['elements']); } };
		$walk($d);
		$tpl = get_post_meta($pid, '_elementor_template_type', true);
		return array('found' => $hit, 'template_type' => $tpl, 'edit_mode' => get_post_meta($pid, '_elementor_edit_mode', true));
	}));
	// compact outline of an Elementor page: id, type, widget, and the visible texts/links of each element
	register_rest_route('dabul/v1', '/eltree', array('methods' => 'GET', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$pid = (int) $req->get_param('post');
		$raw = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid));
		$d = json_decode((string) $raw, true); $out = array();
		$walk = function ($items, $depth) use (&$walk, &$out) {
			foreach ((array) $items as $it) {
				$st = isset($it['settings']) ? $it['settings'] : array(); $txt = array();
				foreach (array('title', 'text', 'editor', 'html', 'title_text', 'description_text') as $k) if (!empty($st[$k]) && is_string($st[$k])) $txt[] = $k . ': ' . mb_substr(wp_strip_all_tags($st[$k]), 0, 160);
				foreach (array('icon_list', 'tabs', 'slides') as $k) if (!empty($st[$k]) && is_array($st[$k])) foreach ($st[$k] as $li) $txt[] = $k . '> ' . mb_substr(wp_strip_all_tags(isset($li['text']) ? $li['text'] : (isset($li['tab_title']) ? $li['tab_title'] : '')), 0, 80) . (isset($li['link']['url']) ? ' => ' . $li['link']['url'] : '');
				if (!empty($st['link']['url'])) $txt[] = 'link: ' . $st['link']['url'];
				$out[] = str_repeat('  ', $depth) . $it['id'] . ' ' . $it['elType'] . (isset($it['widgetType']) ? ':' . $it['widgetType'] : '') . ($txt ? ' | ' . implode(' | ', $txt) : '');
				if (!empty($it['elements'])) $walk($it['elements'], $depth + 1);
			}
		};
		$walk($d, 0);
		return array('lines' => $out);
	}));
	// add boxes to an Elementor page by copying an existing box: POST {post, template, parent, items:[{title,url}], dry}
	register_rest_route('dabul/v1', '/eladdboxes', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$pid = (int) $req->get_param('post'); $tplId = (string) $req->get_param('template'); $parentId = (string) $req->get_param('parent');
		$items = (array) $req->get_param('items');
		$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid), ARRAY_A);
		if (!$row || !$items) return new WP_Error('args', 'missing', array('status' => 400));
		$d = json_decode($row['meta_value'], true);
		$tpl = null;
		$find = function ($els) use (&$find, $tplId, &$tpl) { foreach ((array) $els as $e) { if (isset($e['id']) && $e['id'] === $tplId) $tpl = $e; if (!empty($e['elements'])) $find($e['elements']); } };
		$find($d);
		if (!$tpl) return new WP_Error('tpl', 'template not found', array('status' => 404));
		$newid = function () { return substr(md5(uniqid('', true) . wp_rand()), 0, 7); };
		$made = array();
		foreach ($items as $it) {
			$c = $tpl;
			$fix = function (&$e) use (&$fix, $newid, $it) {
				$e['id'] = $newid();
				if (isset($e['widgetType']) && $e['widgetType'] === 'icon-box') {
					$e['settings']['title_text'] = sanitize_text_field($it['title']);
					$e['settings']['link'] = array('url' => esc_url_raw($it['url']), 'is_external' => (strpos($it['url'], 'dabullaw.co.il') === false ? 'on' : ''), 'nofollow' => '', 'custom_attributes' => '');
					if (isset($e['settings']['__dynamic__']['link'])) unset($e['settings']['__dynamic__']['link']);
					if (isset($e['settings']['__dynamic__']['title_text'])) unset($e['settings']['__dynamic__']['title_text']);
				}
				if (!empty($e['elements'])) foreach ($e['elements'] as &$ch) $fix($ch);
			};
			$fix($c);
			$made[] = $c;
		}
		$added = 0;
		$ins = function (&$els) use (&$ins, $parentId, $made, &$added) { foreach ($els as &$e) { if (isset($e['id']) && $e['id'] === $parentId) { foreach ($made as $m) $e['elements'][] = $m; $added++; } if (!empty($e['elements'])) $ins($e['elements']); } };
		$ins($d);
		if ($added !== 1) return new WP_Error('parent', 'parent found ' . $added . ' times', array('status' => 409));
		if ($req->get_param('dry')) return array('dry' => true, 'boxes' => array_map(function ($m) { return $m['id']; }, $made));
		$wpdb->insert($wpdb->postmeta, array('post_id' => $pid, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode(array('at' => current_time('mysql'), 'added' => count($made), 'meta' => array($row['meta_id'] => array('key' => '_elementor_data', 'old' => $row['meta_value']))), JSON_UNESCAPED_UNICODE)));
		$wpdb->update($wpdb->postmeta, array('meta_value' => wp_json_encode($d)), array('meta_id' => $row['meta_id']));
		clean_post_cache($pid); wp_cache_delete($pid, 'post_meta'); delete_post_meta($pid, '_elementor_css'); delete_post_meta($pid, '_elementor_element_cache');
		if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
		return array('ok' => true, 'added' => count($made));
	}));
	// add a file to the media library from an address: POST {url, filename, title}
	register_rest_route('dabul/v1', '/sideload', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		require_once ABSPATH . 'wp-admin/includes/file.php'; require_once ABSPATH . 'wp-admin/includes/media.php'; require_once ABSPATH . 'wp-admin/includes/image.php';
		$url = esc_url_raw((string) $req->get_param('url')); $fn = sanitize_file_name((string) $req->get_param('filename'));
		if (strpos($url, 'https://raw.githubusercontent.com/dabullaw-glitch/') !== 0 || !$fn) return new WP_Error('args', 'bad url or name', array('status' => 400));
		$tmp = download_url($url, 60);
		if (is_wp_error($tmp)) return $tmp;
		$id = media_handle_sideload(array('name' => $fn, 'tmp_name' => $tmp), 0, (string) $req->get_param('title'));
		if (is_wp_error($id)) { @unlink($tmp); return $id; }
		return array('id' => $id, 'url' => wp_get_attachment_url($id));
	}));
	// WPCode keeps a cached copy of its snippets: rebuild it after their text changed
	register_rest_route('dabul/v1', '/wpcode-recache', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function () {
		$done = array();
		if (function_exists('wpcode') && isset(wpcode()->cache) && method_exists(wpcode()->cache, 'cache_all_loaded_snippets')) { wpcode()->cache->cache_all_loaded_snippets(); $done[] = 'cache_all_loaded_snippets'; }
		if (function_exists('rocket_clean_domain')) { rocket_clean_domain(); $done[] = 'rocket_clean_domain'; }
		return array('done' => $done, 'wpcode' => function_exists('wpcode'));
	}));
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
	// Yoast title + description of pages Yakir approved (9.10.2026: search titles round 1).
	// body {items:[{path,title,desc}], dry, undo}. The old values are kept first in _dabul_seobak of the same post.
	register_rest_route('dabul/v1', '/seometa', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		$dry = (bool) $req->get_param('dry'); $undo = (bool) $req->get_param('undo'); $out = array();
		foreach ((array) $req->get_param('items') as $it) {
			$path = isset($it['path']) ? (string) $it['path'] : '';
			$id = url_to_postid(home_url($path));
			$o = array('path' => $path, 'id' => $id);
			if (!$id) { $o['error'] = 'not found'; $out[] = $o; continue; }
			$o['old'] = array('title' => (string) get_post_meta($id, '_yoast_wpseo_title', true), 'desc' => (string) get_post_meta($id, '_yoast_wpseo_metadesc', true));
			$bak = get_post_meta($id, '_dabul_seobak', true);
			if ($undo) {
				if (!$bak) { $o['error'] = 'no backup'; $out[] = $o; continue; }
				$b = json_decode($bak, true);
				if (!$dry) { update_post_meta($id, '_yoast_wpseo_title', wp_slash($b['title'])); update_post_meta($id, '_yoast_wpseo_metadesc', wp_slash($b['desc'])); }
				$o['restored'] = $b;
			} else {
				$t = isset($it['title']) ? trim((string) $it['title']) : ''; $d = isset($it['desc']) ? trim((string) $it['desc']) : '';
				if ($t === '' || $d === '') { $o['error'] = 'empty'; $out[] = $o; continue; }
				if (!$dry) {
					if (!$bak) add_post_meta($id, '_dabul_seobak', wp_slash(wp_json_encode($o['old'], JSON_UNESCAPED_UNICODE)), true);
					update_post_meta($id, '_yoast_wpseo_title', wp_slash($t)); update_post_meta($id, '_yoast_wpseo_metadesc', wp_slash($d));
				}
				$o['new'] = array('title' => $t, 'desc' => $d);
			}
			if (!$dry) { clean_post_cache($id); if (function_exists('rocket_clean_post')) rocket_clean_post($id); }
			$out[] = $o;
		}
		return array('dry' => $dry, 'undo' => $undo, 'res' => $out);
	}));
	// Google Search Console, 9.10.2026: "unparsable structured data". Inside <script type="application/ld+json"> blocks
	// some Hebrew abbreviations were written with a plain double quote (עו"ד, נדל"ן, חו"ל), which ends the JSON string early.
	// This turns a plain " between two Hebrew letters into the Hebrew gershayim (״), only inside those script blocks.
	// POST {dry, ids?}. The old values are kept first in _dabul_textbak of the same post.
	register_rest_route('dabul/v1', '/schemafix', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$dry = (bool) $req->get_param('dry'); $only = $req->get_param('ids') ? array_map('intval', (array) $req->get_param('ids')) : null;
		$fixs = function ($s, &$n, &$bad, &$good) {
			if (!is_string($s) || stripos($s, 'ld+json') === false) return $s;
			return preg_replace_callback('#(<script[^>]*ld\+json[^>]*>)(.*?)(</script>)#is', function ($m) use (&$n, &$bad, &$good) {
				$c = 0; $in = preg_replace('/(?<=\p{Hebrew})"(?=\p{Hebrew})/u', '״', $m[2], -1, $c);
				if (!is_string($in)) return $m[0];
				// still broken (a phrase "in quotes" inside a text): escape every quote that does not close a JSON string
				if (json_decode(trim($in)) === null) { $r = dabul_json_repair($in); if (json_decode(trim($r)) !== null && $r !== $in) { $in = $r; $c++; } }
				if (!$c) return $m[0];
				$n += $c;
				if (json_decode(trim($in)) === null) $bad++; else $good++;
				return $m[1] . $in . $m[3];
			}, $s);
		};
		$walk = function ($v, &$n, &$bad, &$good) use (&$walk, $fixs) {
			if (is_string($v)) return $fixs($v, $n, $bad, $good);
			if (is_array($v)) { foreach ($v as $k => $x) $v[$k] = $walk($x, $n, $bad, $good); }
			return $v;
		};
		$ids = $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type <> 'revision' AND post_status IN ('publish','future','draft','private') AND post_content LIKE '%ld+json%'");
		$ids2 = $wpdb->get_col("SELECT DISTINCT m.post_id FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE p.post_type <> 'revision' AND p.post_status IN ('publish','future','draft','private') AND m.meta_key NOT IN ('_dabul_namebak','_dabul_textbak','_dabul_seobak') AND m.meta_value LIKE '%ld+json%'");
		$all = array_values(array_unique(array_map('intval', array_merge($ids, $ids2))));
		if ($only) $all = array_values(array_intersect($all, $only));
		$out = array();
		foreach ($all as $id) {
			$p = $wpdb->get_row($wpdb->prepare("SELECT post_content FROM {$wpdb->posts} WHERE ID = %d", $id), ARRAY_A);
			$n = 0; $bad = 0; $good = 0; $fields = array(); $meta = array();
			$new = $fixs($p['post_content'], $n, $bad, $good); if ($new !== $p['post_content']) $fields['post_content'] = $new;
			$rows = $wpdb->get_results($wpdb->prepare("SELECT meta_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key NOT IN ('_dabul_namebak','_dabul_textbak','_dabul_seobak') AND meta_value LIKE %s", $id, '%ld+json%'), ARRAY_A);
			foreach ($rows as $r) {
				$raw = $r['meta_value'];
				if ($r['meta_key'] === '_elementor_data') { $d = json_decode($raw, true); if (!is_array($d)) continue; $c0 = $n; $d2 = $walk($d, $n, $bad, $good); if ($n > $c0) $meta[$r['meta_id']] = array('key' => $r['meta_key'], 'old' => $raw, 'new' => wp_json_encode($d2)); }
				elseif (is_serialized($raw)) { $v = @unserialize($raw, array('allowed_classes' => false)); if ($v === false) continue; $c0 = $n; $v2 = $walk($v, $n, $bad, $good); if ($n > $c0) $meta[$r['meta_id']] = array('key' => $r['meta_key'], 'old' => $raw, 'new' => serialize($v2)); }
				else { $c0 = $n; $s2 = $fixs($raw, $n, $bad, $good); if ($n > $c0) $meta[$r['meta_id']] = array('key' => $r['meta_key'], 'old' => $raw, 'new' => $s2); }
			}
			if (!$n) continue;
			$o = array('id' => $id, 'url' => get_permalink($id), 'fixes' => $n, 'blocks_valid_after' => $good, 'blocks_still_invalid' => $bad, 'fields' => array_keys($fields), 'meta' => array_values(array_map(function ($m) { return $m['key']; }, $meta)));
			if (!$dry) {
				$bak = array('at' => current_time('mysql'), 'find' => 'schemafix', 'fields' => array('post_content' => $p['post_content']), 'meta' => array());
				foreach ($meta as $mid => $m) $bak['meta'][$mid] = array('key' => $m['key'], 'old' => $m['old']);
				if (!$fields) unset($bak['fields']['post_content']);
				if (!$wpdb->insert($wpdb->postmeta, array('post_id' => $id, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode($bak, JSON_UNESCAPED_UNICODE)))) { $o['error'] = 'backup failed'; $out[] = $o; continue; }
				if ($fields) $wpdb->update($wpdb->posts, $fields, array('ID' => $id));
				foreach ($meta as $mid => $m) $wpdb->update($wpdb->postmeta, array('meta_value' => $m['new']), array('meta_id' => $mid));
				clean_post_cache($id); wp_cache_delete($id, 'post_meta'); delete_post_meta($id, '_elementor_css'); delete_post_meta($id, '_elementor_element_cache');
				if (function_exists('rocket_clean_post')) rocket_clean_post($id);
				$o['done'] = true;
			}
			$out[] = $o;
		}
		if (!$dry && class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		return array('dry' => $dry, 'count' => count($out), 'items' => $out);
	}));
});
