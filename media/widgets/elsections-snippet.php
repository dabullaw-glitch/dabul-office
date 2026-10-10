/* dabul: Elementor sections helper (admin only). Added 10.10.2026 for the "קישורים וטפסים" page.
   POST /wp-json/dabul/v1/eladdsection {post, head, grid, after, sections:[{title, items:[{title,url,desc,icon}]}], dry}
        copies the heading block (head) and the grid block (grid) once per section, puts the section title in the heading,
        fills the grid with copies of the grid's first box (one per item), and inserts the new blocks right after the
        element "after" (a sibling inside the same parent). icon: "file" (pdf icon) or "link" (link icon).
   POST /wp-json/dabul/v1/elsetdesc {post, items:{widgetId: "text"}, dry}  sets the small text under icon boxes.
   Before every change the full old page data is kept in the hidden field _dabul_textbak of the same page
   (the existing /enfr-restore style undo can put it back). */
if (!function_exists('dabul_els_save')) {
	function dabul_els_save($pid, $row, $d, $note) {
		global $wpdb;
		$wpdb->insert($wpdb->postmeta, array('post_id' => $pid, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode(array('at' => current_time('mysql'), 'note' => $note, 'meta' => array($row['meta_id'] => array('key' => '_elementor_data', 'old' => $row['meta_value']))), JSON_UNESCAPED_UNICODE)));
		$wpdb->update($wpdb->postmeta, array('meta_value' => wp_json_encode($d)), array('meta_id' => $row['meta_id']));
		clean_post_cache($pid); wp_cache_delete($pid, 'post_meta'); delete_post_meta($pid, '_elementor_css'); delete_post_meta($pid, '_elementor_element_cache');
		if (class_exists('\Elementor\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
	}
	function dabul_els_find($els, $id) {
		foreach ((array) $els as $e) { if (isset($e['id']) && $e['id'] === $id) return $e; if (!empty($e['elements'])) { $r = dabul_els_find($e['elements'], $id); if ($r) return $r; } }
		return null;
	}
	function dabul_els_depth($e) {
		// go down while a block holds exactly one non-widget block; stop at the block that holds the boxes
		$n = 0;
		while (!empty($e['elements']) && count($e['elements']) === 1 && empty($e['elements'][0]['widgetType']) && !empty($e['elements'][0]['elements'])) { $e = $e['elements'][0]; $n++; }
		return $n;
	}
	function dabul_els_at($e, $n) { while ($n-- > 0) $e = $e['elements'][0]; return $e; }
	function dabul_els_put($e, $n, $kids) { if ($n === 0) { $e['elements'] = $kids; return $e; } $e['elements'][0] = dabul_els_put($e['elements'][0], $n - 1, $kids); return $e; }
	function dabul_els_newids(&$e) {
		$e['id'] = substr(md5(uniqid('', true) . wp_rand()), 0, 7);
		if (!empty($e['elements'])) foreach ($e['elements'] as &$c) dabul_els_newids($c);
	}
}
add_action('rest_api_init', function () {
	$perm = function () { return current_user_can('manage_options'); };
	$icons = array(
		'file' => array('value' => array('url' => 'https://dabullaw.co.il/wp-content/uploads/2025/12/pdf.svg', 'id' => 1716), 'library' => 'svg'),
		'link' => array('value' => array('url' => 'https://dabullaw.co.il/wp-content/uploads/2025/12/link-1.svg', 'id' => 1731), 'library' => 'svg'),
		'doc' => array('value' => array('url' => 'https://dabullaw.co.il/wp-content/uploads/2025/12/text.svg', 'id' => 1718), 'library' => 'svg'),
	);
	register_rest_route('dabul/v1', '/eladdsection', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) use ($icons) {
		global $wpdb;
		$pid = (int) $req->get_param('post'); $headId = (string) $req->get_param('head'); $gridId = (string) $req->get_param('grid'); $after = (string) $req->get_param('after');
		$sections = (array) $req->get_param('sections');
		$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid), ARRAY_A);
		if (!$row || !$sections) return new WP_Error('args', 'missing', array('status' => 400));
		$d = json_decode($row['meta_value'], true);
		$head = dabul_els_find($d, $headId); $grid = dabul_els_find($d, $gridId);
		if (!$head || !$grid) return new WP_Error('tpl', 'head or grid not found', array('status' => 404));
		// the grid block may wrap the real grid a level or two down: find the container whose children are the boxes
		$grid = json_decode(wp_json_encode($grid), true); $head = json_decode(wp_json_encode($head), true);
		$depth = dabul_els_depth($grid);
		$boxTpl = dabul_els_at($grid, $depth)['elements'][0];
		$new = array(); $count = 0;
		foreach ($sections as $sec) {
			$h = $head; dabul_els_newids($h);
			$setTitle = function (&$e) use (&$setTitle, $sec) { if (isset($e['widgetType']) && $e['widgetType'] === 'heading') $e['settings']['title'] = sanitize_text_field($sec['title']); if (!empty($e['elements'])) foreach ($e['elements'] as &$c) $setTitle($c); };
			$setTitle($h);
			$boxes = array();
			foreach ((array) $sec['items'] as $it) {
				$b = $boxTpl;
				$fill = function (&$e) use (&$fill, $it, $icons) {
					if (isset($e['widgetType']) && $e['widgetType'] === 'icon-box') {
						$e['settings']['title_text'] = sanitize_text_field($it['title']);
						$e['settings']['description_text'] = isset($it['desc']) ? sanitize_text_field($it['desc']) : '';
						$e['settings']['link'] = array('url' => esc_url_raw($it['url']), 'is_external' => (strpos($it['url'], 'dabullaw.co.il') === false ? 'on' : ''), 'nofollow' => '', 'custom_attributes' => '');
						$ic = isset($it['icon']) && isset($icons[$it['icon']]) ? $it['icon'] : 'link';
						$e['settings']['selected_icon'] = $icons[$ic];
						unset($e['settings']['__dynamic__']);
					}
					if (!empty($e['elements'])) foreach ($e['elements'] as &$c) $fill($c);
				};
				$fill($b); dabul_els_newids($b);
				$boxes[] = $b; $count++;
			}
			$g = dabul_els_put($grid, $depth, $boxes); dabul_els_newids($g);
			$new[] = $h; $new[] = $g;
		}
		$placed = 0;
		$ins = function (&$els) use (&$ins, $after, $new, &$placed) {
			foreach ($els as $i => $e) if (isset($e['id']) && $e['id'] === $after) { array_splice($els, $i + 1, 0, $new); $placed++; return; }
			foreach ($els as &$e) if (!empty($e['elements'])) $ins($e['elements']);
		};
		$ins($d);
		if ($placed !== 1) return new WP_Error('after', 'after found ' . $placed . ' times', array('status' => 409));
		if ($req->get_param('dry')) return array('dry' => true, 'sections' => count($sections), 'boxes' => $count);
		dabul_els_save($pid, $row, $d, 'eladdsection ' . count($sections) . ' sections, ' . $count . ' boxes');
		return array('ok' => true, 'sections' => count($sections), 'boxes' => $count);
	}));
	register_rest_route('dabul/v1', '/elsetdesc', array('methods' => 'POST', 'permission_callback' => $perm, 'callback' => function ($req) {
		global $wpdb;
		$pid = (int) $req->get_param('post'); $items = (array) $req->get_param('items');
		$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid), ARRAY_A);
		if (!$row || !$items) return new WP_Error('args', 'missing', array('status' => 400));
		$d = json_decode($row['meta_value'], true); $hit = array();
		$walk = function (&$els) use (&$walk, $items, &$hit) { foreach ($els as &$e) { if (isset($e['id'], $items[$e['id']]) && isset($e['widgetType']) && $e['widgetType'] === 'icon-box') { $e['settings']['description_text'] = sanitize_text_field($items[$e['id']]); $hit[] = $e['id']; } if (!empty($e['elements'])) $walk($e['elements']); } };
		$walk($d);
		$missing = array_values(array_diff(array_keys($items), $hit));
		if ($req->get_param('dry')) return array('dry' => true, 'set' => count($hit), 'missing' => $missing);
		if (!$hit) return new WP_Error('none', 'nothing matched', array('status' => 404));
		dabul_els_save($pid, $row, $d, 'elsetdesc ' . count($hit));
		return array('ok' => true, 'set' => count($hit), 'missing' => $missing);
	}));
});
