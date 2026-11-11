
/* dabul: מדד תשומות הבנייה העדכני בראש המאמר, מתעדכן לבד (Yakir approved 11.11.2026, site audit).
   The article /מדד-תשומות-הבניה/ (post 3333) appears in Google about 3,000 times a month (position about 8): people look for the
   current number. A small box at the top of the article shows the latest residential construction inputs index of the Central
   Bureau of Statistics (series 200010), its month, the change from the previous month and over 12 months, with a link to the
   official source. The data is read from the bureau's public index API on the server, kept for 12 hours, and the last good
   value is kept in an option, so the box never breaks when the API is slow. No value is ever invented: without data, no box.
   Admin check: GET /wp-json/dabul/v1/tsumot (shows what was read). To undo: deactivate this snippet. */

if (!defined('DABUL_TSM_LIVE')) define('DABUL_TSM_LIVE', false);
if (!defined('DABUL_TSM_POST')) define('DABUL_TSM_POST', 3333);

function dabul_tsm_fetch_raw() {
	$r = wp_remote_get('https://api.cbs.gov.il/index/data/price?id=200010&format=json&download=false&last=14&lang=he',
		array('timeout' => 12, 'headers' => array('Accept' => 'application/json'), 'user-agent' => 'Mozilla/5.0 (compatible; dabullaw.co.il)'));
	if (is_wp_error($r)) return array('error' => $r->get_error_message());
	return array('code' => wp_remote_retrieve_response_code($r), 'body' => wp_remote_retrieve_body($r));
}

// reads the API answer into rows {y, m, v, pm, py, base}, newest first; tolerant to small format differences
function dabul_tsm_parse($body) {
	$j = json_decode((string) $body, true);
	if (!is_array($j)) return array();
	$list = array();
	if (isset($j['month'][0]['date']) && is_array($j['month'][0]['date'])) $list = $j['month'][0]['date'];
	elseif (isset($j['month']) && is_array($j['month'])) $list = $j['month'];
	elseif (isset($j['date']) && is_array($j['date'])) $list = $j['date'];
	$rows = array();
	foreach ($list as $d) {
		if (!is_array($d)) continue;
		$y = isset($d['year']) ? (int) $d['year'] : 0; $m = isset($d['month']) ? (int) $d['month'] : 0;
		$v = null; $base = '';
		if (isset($d['currBase']['value'])) { $v = (float) $d['currBase']['value']; $base = isset($d['currBase']['baseDesc']) ? (string) $d['currBase']['baseDesc'] : ''; }
		elseif (isset($d['value'])) $v = (float) $d['value'];
		if (!$y || !$m || $v === null || $v <= 0) continue;
		$rows[] = array('y' => $y, 'm' => $m, 'v' => $v, 'pm' => isset($d['percent']) ? (float) $d['percent'] : null,
			'py' => isset($d['percentYear']) ? (float) $d['percentYear'] : null, 'base' => $base);
	}
	usort($rows, function ($a, $b) { return ($b['y'] * 100 + $b['m']) - ($a['y'] * 100 + $a['m']); });
	return $rows;
}

function dabul_tsm_data() {
	$c = get_transient('dabul_tsm_v1');
	if (is_array($c) && !empty($c['rows'])) return $c;
	$raw = dabul_tsm_fetch_raw();
	$rows = isset($raw['body']) && (int) $raw['code'] === 200 ? dabul_tsm_parse($raw['body']) : array();
	if ($rows) {
		$c = array('rows' => array_slice($rows, 0, 14), 'at' => time());
		set_transient('dabul_tsm_v1', $c, 12 * HOUR_IN_SECONDS);
		update_option('dabul_tsm_last', $c, false);
		return $c;
	}
	set_transient('dabul_tsm_v1', array('rows' => array(), 'at' => time()), HOUR_IN_SECONDS); // try again in an hour
	$last = get_option('dabul_tsm_last');
	return is_array($last) ? $last : array('rows' => array());
}

function dabul_tsm_box() {
	$d = dabul_tsm_data();
	if (empty($d['rows'])) return '';
	$r = $d['rows'][0];
	$months = array(1 => 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר');
	$pm = $r['pm'];
	if ($pm === null && isset($d['rows'][1])) $pm = round(($r['v'] / $d['rows'][1]['v'] - 1) * 100, 1);
	$py = $r['py'];
	if ($py === null) { foreach ($d['rows'] as $x) { if ($x['y'] === $r['y'] - 1 && $x['m'] === $r['m']) { $py = round(($r['v'] / $x['v'] - 1) * 100, 1); break; } } }
	$fmt = function ($p) { if ($p === null) return ''; $s = number_format(abs($p), 1); return ($p > 0 ? 'עלייה של ' : ($p < 0 ? 'ירידה של ' : 'ללא שינוי ')) . ($p == 0 ? '' : $s . '%'); };
	$line = array();
	if ($pm !== null) $line[] = 'לעומת החודש הקודם: ' . $fmt($pm);
	if ($py !== null) $line[] = 'ב-12 החודשים האחרונים: ' . $fmt($py);
	return '<div class="dtsm" role="note" aria-label="מדד תשומות הבנייה העדכני"><p class="k">מדד תשומות הבנייה למגורים, הנתון העדכני</p>'
		. '<p class="v"><b>' . esc_html(number_format($r['v'], 1)) . '</b> נקודות <span>(' . esc_html($months[$r['m']] . ' ' . $r['y']) . ')</span></p>'
		. ($line ? '<p class="c">' . esc_html(implode(' · ', $line)) . '</p>' : '')
		. '<p class="s">' . ($r['base'] ? 'בסיס: ' . esc_html($r['base']) . '. ' : '') . 'מקור: <a href="https://www.cbs.gov.il/he/Pages/default.aspx" target="_blank" rel="noopener">הלשכה המרכזית לסטטיסטיקה</a>. הנתון מתעדכן כאן אוטומטית כשהמדד החדש מתפרסם, בדרך כלל באמצע כל חודש.</p></div>';
}

function dabul_tsm_on() {
	return is_singular('post') && get_queried_object_id() == DABUL_TSM_POST && (DABUL_TSM_LIVE || (isset($_GET['dtsm']) && $_GET['dtsm'] === '1'));
}

add_filter('the_content', function ($html) {
	if (!in_the_loop() || !is_main_query() || !dabul_tsm_on() || strpos($html, 'class="dtsm"') !== false) return $html;
	$box = dabul_tsm_box();
	if ($box === '') return $html;
	// right after the opening paragraph of the article
	if (preg_match('~</p>~i', $html, $m, PREG_OFFSET_CAPTURE)) { $o = $m[0][1] + 4; return substr($html, 0, $o) . $box . substr($html, $o); }
	return $box . $html;
}, 22);

add_action('wp_head', function () {
	if (!dabul_tsm_on()) return;
	echo '<style id="dabul-tsm-css">.dtsm{direction:rtl;text-align:right;margin:20px 0;padding:16px 18px;border:1px solid #e7dccb;border-right:5px solid #8b6f47;border-radius:14px;background:#faf6f0;color:#3f2f1b}'
		. '.dtsm p{margin:0!important}.dtsm .k{font-size:14px!important;font-weight:700;color:#8b6f47!important}.dtsm .v{font-size:26px!important;line-height:1.3!important;margin-top:4px!important}'
		. '.dtsm .v b{font-weight:800}.dtsm .v span{font-size:16px;color:#5c4528}.dtsm .c{font-size:15.5px!important;margin-top:6px!important;color:#3f2f1b}'
		. '.dtsm .s{font-size:12.5px!important;margin-top:8px!important;color:#6b5a44;line-height:1.5!important}.dtsm .s a{color:#8b6f47!important;text-decoration:underline!important}</style>';
}, 30);

add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/tsumot', array('methods' => 'GET', 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			if ($req->get_param('fresh')) delete_transient('dabul_tsm_v1');
			$raw = dabul_tsm_fetch_raw();
			return array('raw' => array('code' => isset($raw['code']) ? $raw['code'] : null, 'error' => isset($raw['error']) ? $raw['error'] : null, 'head' => isset($raw['body']) ? substr($raw['body'], 0, 1500) : ''),
				'parsed' => isset($raw['body']) ? array_slice(dabul_tsm_parse($raw['body']), 0, 3) : array(), 'data' => dabul_tsm_data());
		}));
});
