/* dabul: speed, round 2 (Yakir approved items 1-3 on 8.10.2026). Nothing changes in how the site looks.
   1. Style files that are not needed for the first screen (the accessibility panel, a plugin's admin file,
      animations, maps, video and price-list widgets) load after the page shows, instead of holding it back.
   2. On the phone, the old hero picture and the computer hero photo (both hidden there since the new phone hero)
      are no longer downloaded.
   3. Home page: the article pictures in the carousel load as the light webp copies that already exist in the
      media library (they loaded the heavy jpeg files), in a size that fits the card; the video cards load the
      smaller copy of their poster instead of the full size.
   Shown only on a preview address (?dblprev=1) until checked. To undo: deactivate this snippet. */

function dabul_sp2_on() {
	if (defined('DABUL_SP2_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_sp2_late_css($html) {
	$ids = array('deafe-main-css', 'accessibility-onetap-css', 'accessibility-onetap-fonts-readable-css', 'e-animation-fadeInRight-css', 'e-animation-slideInUp-css', 'widget-google_maps-css', 'widget-video-css', 'widget-price-list-css');
	foreach ($ids as $id) {
		$html = preg_replace_callback('#<link rel=\'stylesheet\' id=\'' . preg_quote($id, '#') . '\' href=\'([^\']+)\' media=\'all\' />#', function ($m) {
			return '<link rel=\'stylesheet\' href=\'' . $m[1] . '\' media=\'print\' onload="this.media=\'all\'" /><noscript><link rel=\'stylesheet\' href=\'' . $m[1] . '\' media=\'all\' /></noscript>';
		}, $html, 1);
	}
	return $html;
}

/* inside each <picture> that already lists webp copies, the <img> fallback uses the same webp copies */
function dabul_sp2_pictures($html) {
	return preg_replace_callback('#<picture\b[^>]*>.*?</picture>#s', function ($m) {
		$p = $m[0];
		if (!preg_match('#<source type="image/webp" srcset="([^"]+)"#', $p, $s)) return $p;
		$map = array();
		foreach (explode(',', $s[1]) as $part) {
			$u = trim(preg_replace('#\s+\d+w$#', '', trim($part)));
			if (substr($u, -5) === '.webp') $map[substr($u, 0, -5)] = $u;
		}
		if (!$map) return $p;
		$p = preg_replace_callback('#<img\b[^>]*>#', function ($i) use ($map) {
			return preg_replace_callback('#(https://dabullaw\.co\.il/wp-content/uploads/[^"\s,]+?\.(?:jpe?g|png))(?=[\s"])#i', function ($u) use ($map) {
				return isset($map[$u[1]]) ? $map[$u[1]] : $u[1];
			}, $i[0]);
		}, $p);
		// the article cards in the home carousel are about 400px wide, not 800px
		if (is_front_page()) $p = str_replace('sizes="(max-width: 800px) 100vw, 800px"', 'sizes="(max-width: 767px) 92vw, 420px"', $p);
		return $p;
	}, $html);
}

/* video cards: their posters are 1080px wide but the cards are small */
function dabul_sp2_posters($html) {
	return preg_replace_callback('#<img\b[^>]*\bsrcset="[^"]*video-[a-z0-9_-]+-576x1024\.webp[^"]*"[^>]*>#i', function ($m) {
		$i = preg_replace('#\ssizes="[^"]*"#', '', $m[0]);
		return str_replace('<img ', '<img sizes="(max-width: 767px) 46vw, 280px" ', $i);
	}, $html);
}

add_action('template_redirect', function () {
	if (!dabul_sp2_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$html = dabul_sp2_late_css($html);
		$html = dabul_sp2_pictures($html);
		if (is_front_page()) {
			$html = dabul_sp2_posters($html);
			// the computer hero photo is hidden on phones (they have their own hero); phones get an empty 1px picture instead
			$html = preg_replace('#(<div class="elementor-element elementor-element-2c91460 [^>]*>.*?)(<img\b[^>]*>)#s', '$1<picture><source media="(max-width:767px)" srcset="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">$2</picture>', $html, 1);
		}
		return $html;
	});
}, 8);

add_action('wp_head', function () {
	if (is_admin() || !is_front_page() || !dabul_sp2_on()) return;
	// the old phone hero is hidden on phones; its background picture is not needed there
	echo '<style id="dbl-sp2">@media (max-width:767px){html body .elementor-element.elementor-element-9056c3a,html body .elementor-element.elementor-element-9056c3a:before,html body .elementor-element.elementor-element-9056c3a>.elementor-background-overlay{background-image:none!important}}</style>' . "\n";
}, 3);
