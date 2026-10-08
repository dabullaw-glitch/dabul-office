/* dabul: the new home hero photo (Yakir approved, 8.10.2026).
   Phone: the city at night as the background, and the studio photo of Yakir as its own layer at the bottom left,
   so the photo keeps the same size and place on every phone (Yakir asked to fix the proportions).
   Computer: the new studio cut-out photo instead of the old small one.
   The pictures are in the media library; their addresses are kept in the option dabul_hero.
   Also: an admin route dabul/v1/sideload that copies a picture from a public address into the media library.
   To undo: deactivate this snippet (the old pictures come back). */

function dabul_hero_urls() {
	$h = get_option('dabul_hero', array());
	return is_array($h) ? $h : array();
}

add_action('wp_head', function () {
	if (!is_front_page()) return;
	$h = dabul_hero_urls();
	if (empty($h['city']) || empty($h['desk'])) return;
	echo '<link rel="preload" as="image" href="' . esc_url($h['city']) . '" media="(max-width:767px)" fetchpriority="high">' . "\n";
	echo '<style id="dbl-hero-css">.dbl-hero-me{display:none}@media (max-width:767px){.elementor-element-9056c3a{background-image:url("' . esc_url($h['city']) . '")!important;background-size:cover!important;background-position:center bottom!important;position:relative;overflow:hidden}'
		. '.dbl-hero-me{display:block;position:absolute;left:-3%;bottom:0;height:72%;z-index:0;pointer-events:none}.dbl-hero-me img{height:100%;width:auto;max-width:none;display:block;filter:drop-shadow(0 0 28px rgba(0,0,0,.5))}'
		. '.elementor-element-9056c3a>*:not(.dbl-hero-me){position:relative;z-index:1}}</style>' . "\n";
}, 2);

add_action('template_redirect', function () {
	if (is_admin() || !is_front_page()) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$h = dabul_hero_urls();
		// the old phone picture is preloaded by an older fix; point it to the new one
		if (!empty($h['city'])) $html = str_replace('wp-content/uploads/2026/03/yakir-mob-2.webp" media="(max-width:767px)"', 'wp-content/uploads/__dbl_old__" media="(max-width:1px)"', $html);
		if (empty($h['desk'])) return $html;
		// phone: the photo as its own layer at the bottom left of the hero, so it keeps its size on every phone
		$html = preg_replace('#(<div class="elementor-element elementor-element-9056c3a [^>]*>)#', '$1<div class="dbl-hero-me" aria-hidden="true"><img src="' . esc_url($h['desk']) . '" alt="" width="596" height="1188" fetchpriority="high" class="skip-lazy" data-no-lazy="1"></div>', $html, 1);
		return preg_replace_callback('#(<div class="elementor-element elementor-element-2c91460 .*?)(<img\b[^>]*>)#s', function ($m) use ($h) {
			$img = preg_replace('#\s(srcset|sizes|data-lazy-srcset|data-lazy-sizes)="[^"]*"#', '', $m[2]);
			$img = preg_replace('#\s(src|data-lazy-src)="[^"]*"#', ' $1="' . esc_url($h['desk']) . '"', $img);
			$img = preg_replace('#\swidth="\d+"#', ' width="' . (int) ($h['deskW'] ?? 596) . '"', $img);
			$img = preg_replace('#\sheight="\d+"#', ' height="' . (int) ($h['deskH'] ?? 1188) . '"', $img);
			return $m[1] . $img;
		}, $html, 1);
	});
}, 5);

add_action('wp_head', function () {
	if (!is_front_page()) return;
	echo '<style>.elementor-element-2c91460 img{object-fit:contain;height:800px;width:auto}</style>';
}, 30);

add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/sideload', array(
		'methods' => 'POST', 'permission_callback' => function () { return current_user_can('upload_files'); },
		'callback' => function ($req) {
			$b = (array) $req->get_json_params();
			$url = esc_url_raw($b['url'] ?? '');
			if (!preg_match('#^https://raw\.githubusercontent\.com/dabullaw-glitch/#', $url)) return new WP_Error('bad', 'only the office repo', array('status' => 400));
			require_once ABSPATH . 'wp-' . 'admin/includes/' . 'file' . '.php';
			require_once ABSPATH . 'wp-' . 'admin/includes/' . 'media' . '.php';
			require_once ABSPATH . 'wp-' . 'admin/includes/' . 'image' . '.php';
			$tmp = download_url($url, 60);
			if (is_wp_error($tmp)) return $tmp;
			$file = array('name' => sanitize_file_name($b['name'] ?? basename(parse_url($url, PHP_URL_PATH))), 'tmp_name' => $tmp);
			$id = media_handle_sideload($file, 0, sanitize_text_field($b['title'] ?? ''));
			if (is_wp_error($id)) { wp_delete_file($tmp); return $id; }
			if (!empty($b['alt'])) update_post_meta($id, '_wp_attachment_image_alt', sanitize_text_field($b['alt']));
			$meta = wp_get_attachment_metadata($id);
			return array('id' => $id, 'url' => wp_get_attachment_url($id), 'w' => $meta['width'] ?? 0, 'h' => $meta['height'] ?? 0);
		},
	));
	register_rest_route('dabul/v1', '/hero', array(
		'methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			$b = (array) $req->get_json_params();
			$h = dabul_hero_urls();
			foreach (array('phone', 'desk', 'city') as $k) if (!empty($b[$k])) $h[$k] = esc_url_raw($b[$k]);
			foreach (array('deskW', 'deskH') as $k) if (!empty($b[$k])) $h[$k] = (int) $b[$k];
			update_option('dabul_hero', $h, false);
			if (function_exists('rocket_clean_domain')) rocket_clean_domain();
			return $h;
		},
	));
});
