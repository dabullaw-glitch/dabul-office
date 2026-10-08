/* dabul: the new home hero on the phone (Yakir chose option 4 on 8.10.2026: a round studio portrait with a gold ring,
   the name next to it, and the four points in a glass card; with more space between the parts).
   Only on phones (up to 767px). The computer hero does not change. The old phone hero stays in the page, hidden on phones.
   Until checked it shows only on a preview address (?dblprev=1). To undo: deactivate this snippet. */

function dabul_hph_on() {
	if (defined('DABUL_HPH_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}
function dabul_hph_imgs() {
	return array(
		'city' => 'https://dabullaw.co.il/wp-content/uploads/2026/10/netanya-city-night-mobile.webp',
		'face' => get_option('dabul_hph_face', ''),
	);
}

add_action('wp_head', function () {
	if (is_admin() || !is_front_page() || !dabul_hph_on()) return;
	$im = dabul_hph_imgs();
	if ($im['face']) echo '<link rel="preload" as="image" href="' . esc_url($im['face']) . '" media="(max-width:767px)" fetchpriority="high">' . "\n";
	echo '<link rel="preload" as="image" href="' . esc_url($im['city']) . '" media="(max-width:767px)">' . "\n";
	echo '<style id="dbl-hph-css">.dbl-ph{display:none}'
		. '@media (max-width:767px){.elementor-element-9056c3a{display:none!important}'
		. '.dbl-ph{display:block;position:relative;direction:rtl;font-family:"Noto Local",sans-serif;color:#fff;overflow:hidden;background:#0a1226 url(' . esc_url($im['city']) . ') center bottom/cover no-repeat;isolation:isolate;padding:28px 20px 58px}'
		. '.dbl-ph *{box-sizing:border-box;font-family:inherit}'
		. '.dbl-ph:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,13,30,.9) 0%,rgba(8,13,30,.72) 42%,rgba(8,13,30,.42) 100%)}'
		. '.dbl-ph .top{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:16px;align-items:center}'
		. '.dbl-ph .nm{margin:0;line-height:1}.dbl-ph .nm b{display:block;font-size:41px;font-weight:800;letter-spacing:-.5px}.dbl-ph .nm span{display:block;font-size:23px;font-weight:300;margin-top:8px;white-space:nowrap;color:#f1efe9}'
		. '.dbl-ph .ln{width:46px;height:2px;background:linear-gradient(90deg,#f0d9a0,#b8913f);margin:15px 0 12px}'
		. '.dbl-ph .tg{color:#e7cd96;font-size:15.5px;font-weight:700;white-space:nowrap;letter-spacing:.2px}'
		. '.dbl-ph .pic{position:relative;height:150px;width:150px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #e7cd96,0 0 0 8px rgba(231,205,150,.12),0 18px 36px rgba(0,0,0,.5);background:#1b1b1d}'
		. '.dbl-ph .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}'
		. '.dbl-ph ul{list-style:none;margin:40px 0 0;padding:18px 16px;display:flex;flex-direction:column;gap:14px;border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(231,205,150,.28);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 14px 30px rgba(0,0,0,.25)}'
		. '.dbl-ph li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.55;color:#f3f1ec;margin:0}'
		. '.dbl-ph li i{flex:0 0 26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f0d9a0,#c9a14f);color:#141008;display:flex;align-items:center;justify-content:center;margin-top:1px}.dbl-ph li i svg{width:15px;height:15px}'
		. '}</style>' . "\n";
}, 3);

add_action('template_redirect', function () {
	if (is_admin() || !is_front_page() || !dabul_hph_on()) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$im = dabul_hph_imgs();
		// the old phone picture is not needed any more on the phone
		$html = str_replace('wp-content/uploads/2026/03/yakir-mob-2.webp" media="(max-width:767px)"', 'wp-content/uploads/__dbl_old__" media="(max-width:1px)"', $html);
		$chk = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
		$pts = array('אני יקיר דבול, עורך דין המתמחה בנדל״ן, התחדשות עירונית וחדלות פירעון.', 'מעל 100 עסקאות מקרקעין מדי שנה. ניסיון מוכח שמעניק לכם שקט.', 'חבר ועדות הקניין, המקרקעין וההתחדשות העירונית בלשכת עורכי הדין.', 'אני והצוות שלי זמינים עבורכם 24/7 למקרי חירום.');
		$li = ''; foreach ($pts as $t) $li .= '<li><i>' . $chk . '</i><span>' . esc_html($t) . '</span></li>';
		$block = '<div class="dbl-ph"><div class="top"><div><p class="nm"><b>יקיר דבול</b><span>עורך דין מקרקעין</span></p><div class="ln"></div><div class="tg">מקצועיות. ניסיון. תוצאות</div></div>'
			. ($im['face'] ? '<div class="pic"><img src="' . esc_url($im['face']) . '" width="480" height="480" alt="עו״ד יקיר דבול" fetchpriority="high" class="skip-lazy" data-no-lazy="1"></div>' : '')
			. '</div><ul>' . $li . '</ul></div>';
		$pos = strpos($html, '<div class="elementor-element elementor-element-9056c3a ');
		if ($pos === false) return $html;
		return substr($html, 0, $pos) . $block . substr($html, $pos);
	});
}, 6);

add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/hph', array(
		'methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			$b = (array) $req->get_json_params();
			if (!empty($b['face'])) update_option('dabul_hph_face', esc_url_raw($b['face']), false);
			if (function_exists('rocket_clean_domain')) rocket_clean_domain();
			return array('face' => get_option('dabul_hph_face', ''));
		},
	));
});
