/* dabul: Elementor small edits helper (admin only), 23.10.2026.
   Added for the LB10 2026 certificate (Yakir 23.10.2026): "in the certificates page just add the certificate like all the
   other certificates; in the about page write a few words and add the certificate image, nothing grand".
   POST /wp-json/dabul/v1/elpatch {post, op, dry}
     op=galleryadd {widget, image:{id,url}}             adds one image at the end of a gallery widget (skipped if already there)
     op=listadd    {widget, text, url, match}            adds one line at the end of an icon list, with the last line's icon
                                                         (skipped if a line already holds the "match" text)
     op=insert     {after, template, id, settings}      copies the widget "template", sets the given settings, gives it the
                                                         id "id" and puts it right after the element "after" (skipped if "id" exists)
   Every change keeps the old page data in the hidden field _dabul_textbak of the page, like the other helpers. */
if (!function_exists('dabul_elpatch_find')) {
	function dabul_elpatch_find($els, $id) {
		foreach ((array) $els as $e) { if (isset($e['id']) && $e['id'] === $id) return $e; if (!empty($e['elements'])) { $r = dabul_elpatch_find($e['elements'], $id); if ($r) return $r; } }
		return null;
	}
}
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/elpatch', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		global $wpdb;
		$pid = (int) $req->get_param('post'); $op = (string) $req->get_param('op'); $dry = (bool) $req->get_param('dry');
		$row = $wpdb->get_row($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key = '_elementor_data' LIMIT 1", $pid), ARRAY_A);
		if (!$row) return new WP_Error('args', 'no elementor data', array('status' => 404));
		$d = json_decode($row['meta_value'], true);
		if (!is_array($d)) return new WP_Error('data', 'bad elementor data', array('status' => 500));
		$state = 0; // 1 changed, -1 already there
		if ($op === 'galleryadd') {
			$wid = (string) $req->get_param('widget'); $img = (array) $req->get_param('image');
			if (empty($img['id']) || empty($img['url'])) return new WP_Error('args', 'image needs id and url', array('status' => 400));
			$walk = function (&$els) use (&$walk, $wid, $img, &$state) {
				foreach ($els as &$e) {
					if (isset($e['id'], $e['widgetType']) && $e['id'] === $wid && $e['widgetType'] === 'gallery') {
						$g = isset($e['settings']['gallery']) ? (array) $e['settings']['gallery'] : array();
						foreach ($g as $x) if ((int) $x['id'] === (int) $img['id']) { $state = -1; return; }
						$g[] = array('id' => (int) $img['id'], 'url' => esc_url_raw($img['url']));
						$e['settings']['gallery'] = $g; $state = 1; return;
					}
					if (!empty($e['elements'])) $walk($e['elements']);
				}
			};
			$walk($d);
		} elseif ($op === 'listadd') {
			$wid = (string) $req->get_param('widget'); $text = wp_kses_post((string) $req->get_param('text')); $url = esc_url_raw((string) $req->get_param('url')); $match = (string) $req->get_param('match');
			$walk = function (&$els) use (&$walk, $wid, $text, $url, $match, &$state) {
				foreach ($els as &$e) {
					if (isset($e['id'], $e['widgetType']) && $e['id'] === $wid && $e['widgetType'] === 'icon-list') {
						$l = (array) $e['settings']['icon_list'];
						foreach ($l as $x) if ($match !== '' && isset($x['text']) && strpos(wp_strip_all_tags($x['text']), $match) !== false) { $state = -1; return; }
						if (!$l) return;
						$n = $l[count($l) - 1];
						$n['text'] = $text; $n['_id'] = substr(md5(uniqid('', true) . wp_rand()), 0, 7);
						$n['link'] = $url ? array('url' => $url, 'is_external' => '', 'nofollow' => '', 'custom_attributes' => '') : array('url' => '', 'is_external' => '', 'nofollow' => '', 'custom_attributes' => '');
						$l[] = $n; $e['settings']['icon_list'] = $l; $state = 1; return;
					}
					if (!empty($e['elements'])) $walk($e['elements']);
				}
			};
			$walk($d);
		} elseif ($op === 'insert') {
			$after = (string) $req->get_param('after'); $tplId = (string) $req->get_param('template'); $newId = preg_replace('/[^a-z0-9]/', '', (string) $req->get_param('id'));
			$set = (array) $req->get_param('settings');
			if (!$newId) return new WP_Error('args', 'id is required', array('status' => 400));
			if (dabul_elpatch_find($d, $newId)) $state = -1;
			else {
				$tpl = dabul_elpatch_find($d, $tplId);
				if (!$tpl || empty($tpl['widgetType'])) return new WP_Error('tpl', 'template widget not found', array('status' => 404));
				$c = json_decode(wp_json_encode($tpl), true);
				$c['id'] = $newId; $c['elements'] = array(); unset($c['settings']['__dynamic__']);
				foreach ($set as $k => $v) $c['settings'][$k] = ($k === 'editor' && is_string($v)) ? wp_kses_post($v) : $v;
				$placed = 0;
				$ins = function (&$els) use (&$ins, $after, $c, &$placed) {
					foreach ($els as $i => $e) if (isset($e['id']) && $e['id'] === $after) { array_splice($els, $i + 1, 0, array($c)); $placed++; return; }
					foreach ($els as &$e) if (!empty($e['elements'])) $ins($e['elements']);
				};
				$ins($d);
				if ($placed === 1) $state = 1;
			}
		} else return new WP_Error('op', 'unknown op', array('status' => 400));
		if ($state === -1) return array('ok' => true, 'skipped' => 'already there');
		if ($state !== 1) return new WP_Error('notfound', 'element not found', array('status' => 404));
		if ($dry) return array('ok' => true, 'dry' => true, 'op' => $op);
		$wpdb->insert($wpdb->postmeta, array('post_id' => $pid, 'meta_key' => '_dabul_textbak', 'meta_value' => wp_json_encode(array('at' => current_time('mysql'), 'note' => 'elpatch ' . $op, 'meta' => array($row['meta_id'] => array('key' => '_elementor_data', 'old' => $row['meta_value']))), JSON_UNESCAPED_UNICODE)));
		$wpdb->update($wpdb->postmeta, array('meta_value' => wp_json_encode($d)), array('meta_id' => $row['meta_id']));
		clean_post_cache($pid); wp_cache_delete($pid, 'post_meta'); delete_post_meta($pid, '_elementor_css'); delete_post_meta($pid, '_elementor_element_cache');
		if (class_exists('\\Elementor\\Plugin')) \Elementor\Plugin::$instance->files_manager->clear_cache();
		if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
		return array('ok' => true, 'op' => $op);
	}));
});
