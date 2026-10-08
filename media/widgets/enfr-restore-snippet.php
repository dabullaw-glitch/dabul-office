/* dabul: restore the English and French landing pages (9.10.2026). REST, administrators only.
   The design markup of the two pages was stripped on 8.10.2026. The backups made before that change are kept in the
   options dabul_bak_pc_<id> (page content) and dabul_bak_el_<id> (Elementor data). This reads them and puts the
   original page back into the page's single HTML widget, written straight to the Elementor data so nothing is filtered.
   Deactivate this snippet when the work is done. */

function dabul_lp_inner($raw) {
	$s = strpos($raw, '<!-- DABUL-LP START -->'); $e = strpos($raw, '<!-- DABUL-LP END -->');
	if ($s === false || $e === false) return '';
	return substr($raw, $s, $e - $s + strlen('<!-- DABUL-LP END -->'));
}
function dabul_lp_html_from_el($json) {
	$data = json_decode((string) $json, true); $out = '';
	$walk = function ($els) use (&$walk, &$out) { foreach ((array) $els as $el) { if ($out) return; if (($el['widgetType'] ?? '') === 'html' && strpos((string) ($el['settings']['html'] ?? ''), 'DABUL-LP START') !== false) $out = (string) $el['settings']['html']; if (!empty($el['elements'])) $walk($el['elements']); } };
	$walk($data);
	return $out;
}

add_action('rest_api_init', function () {
	$admin = function () { return current_user_can('manage_options'); };

	// read the backups: GET ?id=7006 -> lengths, markers, and the raw texts (for checking before any change)
	register_rest_route('dabul/v1', '/enfr-bak', array('methods' => 'GET', 'permission_callback' => $admin, 'callback' => function ($r) {
		$id = (int) $r->get_param('id');
		$pc = (string) get_option('dabul_bak_pc_' . $id, ''); $el = (string) get_option('dabul_bak_el_' . $id, '');
		$elHtml = dabul_lp_html_from_el($el);
		$now = dabul_lp_html_from_el(get_post_meta($id, '_elementor_data', true));
		$info = function ($h) { return array('len' => strlen($h), 'dblLp' => substr_count($h, 'dbl-lp'), 'divs' => substr_count($h, '<div'), 'br' => substr_count($h, '<br'), 'svg' => substr_count($h, '<svg')); };
		return array('id' => $id, 'unfiltered_html' => current_user_can('unfiltered_html'),
			'pc' => $info($pc), 'pcInner' => $info(dabul_lp_inner($pc)), 'el' => $info($elHtml), 'now' => $info($now),
			'elSettings' => json_decode($el, true)[0]['settings'] ?? null,
			'raw' => $r->get_param('raw') ? array('pcInner' => dabul_lp_inner($pc), 'el' => $elHtml) : null);
	}));

	// put the page back: POST {id, from: 'el'|'pc'|'html', html?, lang, dry}
	register_rest_route('dabul/v1', '/enfr-restore', array('methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ($r) {
		$b = $r->get_json_params(); $id = (int) ($b['id'] ?? 0); $dry = !empty($b['dry']);
		if (!in_array($id, array(7006, 6999), true)) return new WP_Error('id', 'only 7006 / 6999');
		$lang = $id === 7006 ? 'en' : 'fr';
		$from = (string) ($b['from'] ?? 'html');
		if ($from === 'el') $html = dabul_lp_html_from_el(get_option('dabul_bak_el_' . $id, ''));
		elseif ($from === 'pc') $html = '<div lang="' . $lang . '" dir="ltr">' . dabul_lp_inner((string) get_option('dabul_bak_pc_' . $id, '')) . '</div>';
		else $html = (string) ($b['html'] ?? '');
		if (strpos($html, 'DABUL-LP START') === false || strpos($html, 'dbl-lp') === false) return new WP_Error('html', 'no landing page markup in the source');
		$cur = get_post_meta($id, '_elementor_data', true);
		$data = json_decode((string) $cur, true); $hit = 0;
		$walk = function (&$els) use (&$walk, $html, &$hit) { foreach ($els as &$el) { if (($el['widgetType'] ?? '') === 'html' && strpos((string) ($el['settings']['html'] ?? ''), 'DABUL-LP START') !== false) { $el['settings']['html'] = $html; $hit++; } if (!empty($el['elements'])) $walk($el['elements']); } };
		$walk($data);
		// the page is one full-width block with no padding, like the original
		if (!empty($b['fullWidth']) && isset($data[0]) && ($data[0]['elType'] ?? '') === 'container') {
			$data[0]['settings'] = array('content_width' => 'full', 'padding' => array('unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true), 'padding_mobile' => array('unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true));
		}
		$out = array('id' => $id, 'from' => $from, 'widgets' => $hit, 'len' => strlen($html), 'dblLp' => substr_count($html, 'dbl-lp'), 'divs' => substr_count($html, '<div'));
		if ($dry || !$hit) return $out + array('dry' => true);
		update_option('dabul_bak_el2_' . $id . '_' . time(), $cur, false);
		update_post_meta($id, '_elementor_data', wp_slash(wp_json_encode($data)));
		delete_post_meta($id, '_elementor_css'); delete_post_meta($id, '_elementor_element_cache'); delete_post_meta($id, '_elementor_page_assets');
		if (class_exists('\Elementor\Plugin')) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
		clean_post_cache($id);
		if (function_exists('rocket_clean_post')) rocket_clean_post($id);
		$check = dabul_lp_html_from_el(get_post_meta($id, '_elementor_data', true));
		return $out + array('dry' => false, 'saved' => array('len' => strlen($check), 'dblLp' => substr_count($check, 'dbl-lp'), 'divs' => substr_count($check, '<div')));
	}));
});
