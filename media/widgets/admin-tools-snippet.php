/* dabul: admin tools for approved site changes (8.10.2026). REST, administrators only. Every change keeps a backup
   in an option named dabul_bak_<what>_<id>. Deactivate this snippet when the work is done. */

function dabul_q($s) { // literal text -> tolerant regex (quotes, spaces, dashes as stored by Elementor)
	$p = preg_quote($s, '~');
	$p = str_replace('"', '(?:"|״|&quot;|&#34;|\\\\")', $p);
	$p = str_replace(' ', '(?:\s|&nbsp;|\x{00A0})+', $p);
	return '~' . $p . '~u';
}
function dabul_walk(&$v, $pairs, &$hits) {
	if (is_array($v)) { foreach ($v as &$x) dabul_walk($x, $pairs, $hits); return; }
	if (!is_string($v) || $v === '') return;
	foreach ($pairs as $i => $pr) { $c = 0; $v = preg_replace(dabul_q($pr[0]), $pr[1], $v, -1, $c); if ($c) $hits[$i] = ($hits[$i] ?? 0) + $c; }
}
function dabul_apply_pairs($id, $pairs, $dry) {
	$out = array('id' => $id, 'title' => get_the_title($id), 'mode' => '', 'hits' => array());
	$hits = array();
	$doc = class_exists('\Elementor\Plugin') ? \Elementor\Plugin::$instance->documents->get($id) : null;
	if ($doc && $doc->is_built_with_elementor()) {
		$out['mode'] = 'elementor';
		$data = $doc->get_elements_data();
		dabul_walk($data, $pairs, $hits);
		if ($hits && !$dry) {
			if (!get_option('dabul_bak_el_' . $id)) update_option('dabul_bak_el_' . $id, get_post_meta($id, '_elementor_data', true), false);
			$doc->save(array('elements' => $data));
		}
	} else {
		$out['mode'] = 'content';
		$p = get_post($id); $c = $p ? $p->post_content : '';
		dabul_walk($c, $pairs, $hits);
		if ($hits && !$dry) {
			if (!get_option('dabul_bak_pc_' . $id)) update_option('dabul_bak_pc_' . $id, $p->post_content, false);
			wp_update_post(array('ID' => $id, 'post_content' => $c));
		}
	}
	$out['hits'] = $hits;
	return $out;
}

add_action('rest_api_init', function () {
	$admin = function () { return current_user_can('manage_options'); };

	// approved wording changes: body {items:[{id, pairs:[[find, replace], ...]}], dry}
	register_rest_route('dabul/v1', '/copyfix', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ($r) {
		$b = $r->get_json_params(); $dry = !empty($b['dry']); $res = array();
		foreach ((array) ($b['items'] ?? array()) as $it) {
			$id = (int) ($it['id'] === 'front' ? get_option('page_on_front') : $it['id']);
			if ($id) $res[] = dabul_apply_pairs($id, (array) $it['pairs'], $dry);
		}
		if (!$dry && function_exists('rocket_clean_domain')) rocket_clean_domain();
		return array('dry' => $dry, 'res' => $res);
	}));

	// English / French landing pages: drop the nested html document, keep the design, set Yoast title/description
	register_rest_route('dabul/v1', '/enfr', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ($r) {
		$b = $r->get_json_params(); $dry = !empty($b['dry']); $res = array();
		$fix = array(7006 => array('en', 'Dozens of property transactions every year', 'More than 100 property transactions every year'),
		             6999 => array('fr', 'Des dizaines de transactions immobilières chaque année', 'Plus de 100 transactions immobilières chaque année'));
		foreach ($fix as $id => $f) {
			$p = get_post($id); $raw = $p ? $p->post_content : '';
			$o = array('id' => $id, 'len' => strlen($raw));
			if (strpos($raw, '<!-- DABUL-LP START -->') === false) { $o['skip'] = 'no marker'; $res[] = $o; continue; }
			preg_match('#<title>(.*?)</title>#s', $raw, $t);
			preg_match('#<meta\s+name="description"\s+content="([^"]*)"#', $raw, $d);
			if (!$d) preg_match('#<meta\s+content="([^"]*)"\s+name="description"#', $raw, $d);
			$s = strpos($raw, '<!-- DABUL-LP START -->'); $e = strpos($raw, '<!-- DABUL-LP END -->');
			$inner = substr($raw, $s, $e - $s + strlen('<!-- DABUL-LP END -->'));
			$n = 0; $inner = str_replace($f[1], $f[2], $inner, $n);
			$new = "<!-- wp:html -->\n<div lang=\"" . $f[0] . "\" dir=\"ltr\">" . $inner . "</div>\n<!-- /wp:html -->";
			$o += array('title' => $t ? html_entity_decode($t[1]) : '', 'desc' => $d ? html_entity_decode($d[1]) : '', 'factFixed' => $n, 'newLen' => strlen($new));
			if (!$dry) {
				if (!get_option('dabul_bak_pc_' . $id)) update_option('dabul_bak_pc_' . $id, $raw, false);
				wp_update_post(array('ID' => $id, 'post_content' => $new));
				if (!empty($o['title']) && !get_post_meta($id, '_yoast_wpseo_title', true)) update_post_meta($id, '_yoast_wpseo_title', $o['title']);
				if (!empty($o['desc']) && !get_post_meta($id, '_yoast_wpseo_metadesc', true)) update_post_meta($id, '_yoast_wpseo_metadesc', $o['desc']);
			}
			$res[] = $o;
		}
		if (!$dry && function_exists('rocket_clean_domain')) rocket_clean_domain();
		return array('dry' => $dry, 'res' => $res);
	}));

	// same pages are built with Elementor (one HTML widget): put the cleaned post_content into that widget; body {dry}
	register_rest_route('dabul/v1', '/enfr-el', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ($r) {
		$b = $r->get_json_params(); $dry = !empty($b['dry']); $res = array();
		foreach (array(7006, 6999) as $id) {
			$p = get_post($id); $pc = $p ? $p->post_content : '';
			$o = array('id' => $id);
			if (strpos($pc, '<!-- wp:html -->') !== 0) { $o['skip'] = 'post_content not cleaned'; $res[] = $o; continue; }
			$clean = trim(str_replace(array('<!-- wp:html -->', '<!-- /wp:html -->'), '', $pc));
			$doc = \Elementor\Plugin::$instance->documents->get($id); if (!$doc) { $o['skip'] = 'no doc'; $res[] = $o; continue; }
			$data = $doc->get_elements_data(); $hit = 0;
			$walk = function (&$els) use (&$walk, $clean, &$hit) {
				foreach ($els as &$el) {
					if (($el['widgetType'] ?? '') === 'html' && strpos((string) ($el['settings']['html'] ?? ''), 'DABUL-LP START') !== false) { $el['settings']['html'] = $clean; $hit++; }
					if (!empty($el['elements'])) $walk($el['elements']);
				}
			};
			$walk($data);
			$o['widgets'] = $hit; $o['newLen'] = strlen($clean);
			if ($hit && !$dry) {
				if (!get_option('dabul_bak_el_' . $id)) update_option('dabul_bak_el_' . $id, get_post_meta($id, '_elementor_data', true), false);
				$doc->save(array('elements' => $data));
			}
			$res[] = $o;
		}
		if (!$dry && function_exists('rocket_clean_domain')) rocket_clean_domain();
		return array('dry' => $dry, 'res' => $res);
	}));

	// build a new nav menu (the old one stays untouched): body {name, dry, items:[{title, id?|cat?|url?, children:[...]}]}
	register_rest_route('dabul/v1', '/buildmenu', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ($r) {
		$b = $r->get_json_params(); $dry = !empty($b['dry']); $name = sanitize_text_field($b['name'] ?? ''); $out = array(); $pos = 0;
		if (!$name) return new WP_Error('name', 'name required');
		$check = function ($it) { if (!empty($it['id'])) { $p = get_post((int) $it['id']); return $p && $p->post_status === 'publish' ? get_permalink($p) : false; } if (!empty($it['cat'])) { $l = get_term_link((int) $it['cat'], 'category'); return is_wp_error($l) ? false : $l; } return $it['url'] ?? ''; };
		foreach ((array) $b['items'] as $top) { $out[] = array('t' => $top['title'], 'ok' => $check($top)); foreach ((array) ($top['children'] ?? array()) as $c) $out[] = array('t' => '  ' . $c['title'], 'ok' => $check($c)); }
		if ($dry) return array('dry' => true, 'items' => $out);
		if (wp_get_nav_menu_object($name)) return new WP_Error('exists', 'menu exists');
		$mid = wp_create_nav_menu($name); if (is_wp_error($mid)) return $mid;
		$add = function ($it, $parent) use ($mid, &$pos) {
			$pos++;
			$a = array('menu-item-title' => $it['title'], 'menu-item-status' => 'publish', 'menu-item-parent-id' => $parent, 'menu-item-position' => $pos);
			if (!empty($it['id'])) { $p = get_post((int) $it['id']); $a += array('menu-item-type' => 'post_type', 'menu-item-object' => $p->post_type, 'menu-item-object-id' => $p->ID); }
			elseif (!empty($it['cat'])) $a += array('menu-item-type' => 'taxonomy', 'menu-item-object' => 'category', 'menu-item-object-id' => (int) $it['cat']);
			else $a += array('menu-item-type' => 'custom', 'menu-item-url' => $it['url'] ?? '');
			return wp_update_nav_menu_item($mid, 0, $a);
		};
		foreach ((array) $b['items'] as $top) { $tid = $add($top, 0); foreach ((array) ($top['children'] ?? array()) as $c) $add($c, $tid); }
		$m = wp_get_nav_menu_object($mid);
		return array('dry' => false, 'menu' => $mid, 'slug' => $m->slug, 'count' => $pos, 'items' => $out);
	}));

	// point every Elementor nav-menu widget that shows menu <from> to menu <to> (header templates); body {from, to, dry}
	register_rest_route('dabul/v1', '/navswap', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ($r) {
		$b = $r->get_json_params(); $dry = !empty($b['dry']); $from = (string) $b['from']; $to = (string) $b['to']; $res = array();
		$ids = get_posts(array('post_type' => 'elementor_library', 'posts_per_page' => -1, 'fields' => 'ids', 'post_status' => 'publish'));
		foreach ($ids as $id) {
			$doc = \Elementor\Plugin::$instance->documents->get($id); if (!$doc) continue;
			$data = $doc->get_elements_data(); $hit = array();
			$walk = function (&$els) use (&$walk, $from, $to, &$hit) {
				foreach ($els as &$el) {
					if (($el['widgetType'] ?? '') === 'nav-menu' && (($el['settings']['menu'] ?? '') === $from)) { $el['settings']['menu'] = $to; $hit[] = $el['id']; }
					if (!empty($el['elements'])) $walk($el['elements']);
				}
			};
			$walk($data);
			if ($hit) {
				if (!$dry) { if (!get_option('dabul_bak_el_' . $id)) update_option('dabul_bak_el_' . $id, get_post_meta($id, '_elementor_data', true), false); $doc->save(array('elements' => $data)); }
				$res[] = array('template' => $id, 'title' => get_the_title($id), 'widgets' => $hit);
			}
		}
		if (!$dry && function_exists('rocket_clean_domain')) rocket_clean_domain();
		return array('dry' => $dry, 'res' => $res);
	}));

	// list nav-menu widgets and the menu each one shows
	register_rest_route('dabul/v1', '/navlist', array('methods' => 'GET', 'permission_callback' => $admin, 'callback' => function () {
		$res = array();
		foreach (get_posts(array('post_type' => 'elementor_library', 'posts_per_page' => -1, 'fields' => 'ids', 'post_status' => 'publish')) as $id) {
			$doc = \Elementor\Plugin::$instance->documents->get($id); if (!$doc) continue;
			$data = $doc->get_elements_data();
			$walk = function ($els) use (&$walk, &$res, $id) { foreach ($els as $el) { if (($el['widgetType'] ?? '') === 'nav-menu') $res[] = array('template' => $id, 'title' => get_the_title($id), 'widget' => $el['id'], 'menu' => $el['settings']['menu'] ?? ''); if (!empty($el['elements'])) $walk($el['elements']); } };
			$walk($data);
		}
		return $res;
	}));

	// undo WP Rocket test: restore the settings saved before "remove unused CSS"
	register_rest_route('dabul/v1', '/rocket-restore', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function () {
		$bak = get_option('dabul_rocket_backup_20261008'); if (!is_array($bak)) return array('ok' => false, 'why' => 'no backup');
		update_option('wp_rocket_settings', $bak); if (function_exists('rocket_clean_domain')) rocket_clean_domain();
		return array('ok' => true, 'remove_unused_css' => $bak['remove_unused_css'] ?? null);
	}));
});
