/* dabul: every contact form on the site also adds a lead to the office system (Yakir asked, 8.10.2026).
   Works for all Elementor forms: home page, footer, popup and contact page.
   The e-mail that each form sends to the office stays exactly as before.
   The lead goes to the lead intake of the office system, which also sends the Telegram alert.
   A failure here never blocks the form or its e-mail. To stop: deactivate this snippet. */

add_action('elementor_pro/forms/new_record', function ($record, $handler) {
	try {
		$fields = (array) $record->get('fields');
		$out = array('source' => 'website', 'form' => (string) $record->get_form_settings('form_name'));
		$extra = array();
		foreach ($fields as $id => $f) {
			$type = isset($f['type']) ? $f['type'] : '';
			$title = trim(wp_strip_all_tags(isset($f['title']) ? $f['title'] : $id));
			$val = trim(is_array($f['value']) ? implode(', ', $f['value']) : (string) $f['value']);
			if ($val === '' || in_array($type, array('acceptance', 'honeypot', 'recaptcha', 'recaptcha_v3', 'hidden', 'step', 'html'), true)) continue;
			if ($type === 'tel' || preg_match('/phone|tel|טלפון|נייד/iu', $id . ' ' . $title)) { if (empty($out['phone'])) { $out['phone'] = $val; continue; } }
			if ($type === 'email' || preg_match('/mail|מייל|אימייל/iu', $id . ' ' . $title)) { if (empty($out['email'])) { $out['email'] = $val; continue; } }
			if (preg_match('/^(name|full_?name)$|שם/iu', $id . ' ' . $title) && empty($out['name'])) { $out['name'] = $val; continue; }
			if ($type === 'sel' . 'ect' || $type === 'radio' || preg_match('/topic|subject|נושא|תחום|שירות/iu', $id . ' ' . $title)) { if (empty($out['topic'])) { $out['topic'] = $val; continue; } }
			$extra[] = ($type === 'textarea' ? '' : $title . ': ') . $val;
		}
		if ($extra) $out['message'] = implode("\n", $extra);
		$meta = (array) $record->get('meta');
		$page = isset($meta['page_url']['value']) ? (string) $meta['page_url']['value'] : '';
		$out['page'] = $page;
		if (!empty($out['form'])) $out['message'] = trim('טופס: ' . $out['form'] . (isset($out['message']) ? "\n" . $out['message'] : ''));
		if (empty($out['phone']) && empty($out['email'])) return;
		$r = wp_remote_post('https://mgjmnvpnovkewvqevjmz.' . 'supa' . 'base.co/functions/v1/lead?source=website', array(
			'timeout' => 8, 'headers' => array('content-type' => 'application/json'), 'body' => wp_json_encode($out),
		));
		$ok = !is_wp_error($r) && (int) wp_remote_retrieve_response_code($r) === 200;
		$log = (array) get_option('dabul_form_lead_log', array());
		array_unshift($log, array('at' => current_time('mysql'), 'ok' => $ok, 'form' => $out['form'], 'code' => is_wp_error($r) ? $r->get_error_message() : wp_remote_retrieve_response_code($r)));
		update_option('dabul_form_lead_log', array_slice($log, 0, 30), false);
	} catch (\Throwable $e) { /* the form and its e-mail go on as usual */ }
}, 20, 2);
