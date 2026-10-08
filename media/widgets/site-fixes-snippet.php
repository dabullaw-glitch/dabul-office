/* dabul: approved front-end fixes (Yakir, 8.10.2026). Front-end only, nothing stored in the database except a small cache.
   1. Home: hides the two hero buttons "נדל״ן" and "התחדשות עירונית" (container 0b5de49).                       [item 15]
   2. Articles on phone/tablet: the table of contents starts closed (no empty spinner box), so the first paragraph
      shows on the first screen. Opening it works as before.                                                     [items 6, 18]
   3. The Google rating image (fixed text "62", "ג גוגל") becomes a live badge with the current rating and count,
      read from the reviews widget on the testimonials page and refreshed twice a day.                            [item 16]
   4. Testimonials page: every reviewer photo gets alt text (generic, no names).                                [item 23]
   5. The English and French pages declare their real language and left-to-right direction.                     [item 10]
   To undo everything: deactivate this snippet. */

add_filter('language_attributes', function ($out) {
	if (is_admin()) return $out;
	if (is_page(7006)) return 'lang="en-US" dir="ltr"';
	if (is_page(6999)) return 'lang="fr-FR" dir="ltr"';
	return $out;
}, 20);

add_action('wp_head', function () {
	if (is_admin()) return;
	echo '<style id="dabul-fixes">'
		. 'body.home .elementor-element-0b5de49{display:none!important}'
		. '@media (max-width:1024px){'
		. '.elementor-widget-table-of-contents.elementor-toc--minimized-on-tablet:not(.elementor-toc--collapsed) .elementor-toc__body{display:none}'
		. '.elementor-widget-table-of-contents.elementor-toc--minimized-on-tablet:not(.elementor-toc--collapsed):has(.elementor-toc__body:not([style*="block"])) .elementor-toc__toggle-button--collapse{display:none!important}'
		. '.elementor-widget-table-of-contents.elementor-toc--minimized-on-tablet:not(.elementor-toc--collapsed):has(.elementor-toc__body:not([style*="block"])) .elementor-toc__toggle-button--expand{display:block!important}'
		. '}'
		. '.dabul-gbadge{display:inline-flex;align-items:center;gap:10px;direction:rtl;background:#fff;border:1px solid #e6e1d6;border-radius:12px;padding:8px 12px;box-shadow:0 4px 14px rgba(0,0,0,.08);font-family:inherit;line-height:1.25;color:#1c1b19;max-width:100%}'
		. '.dabul-gbadge svg{flex:0 0 28px;width:28px;height:28px}'
		. '.dabul-gbadge b{display:block;font-size:14px;font-weight:700}'
		. '.dabul-gbadge .r{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700}'
		. '.dabul-gbadge .s{color:#f4b400;letter-spacing:1px;font-size:15px}'
		. '.dabul-gbadge small{display:block;font-size:12.5px;color:#5f5a50}'
		. '</style>' . "\n";
}, 20);

// live rating from the reviews widget on the testimonials page (cached 12 hours, last good value kept)
function dabul_greviews() {
	$c = get_transient('dabul_greviews');
	if (is_array($c)) return $c;
	$last = get_option('dabul_greviews_last', array('rating' => '4.9', 'count' => 73));
	set_transient('dabul_greviews', $last, 12 * HOUR_IN_SECONDS); // no second fetch while this one runs
	$r = wp_remote_get(home_url('/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/'), array('timeout' => 8, 'user-agent' => 'Mozilla/5.0 (dabul-badge)'));
	if (!is_wp_error($r)) {
		$h = wp_remote_retrieve_body($r);
		if (preg_match('/rpi-stars"[^>]*--rating:([0-9.]+)/', $h, $m1) && preg_match('/rpi-based">[^<0-9]*([0-9]+)/u', $h, $m2) && (int) $m2[1] > 0) {
			$last = array('rating' => number_format((float) $m1[1], 1), 'count' => (int) $m2[1]);
			update_option('dabul_greviews_last', $last, false);
			set_transient('dabul_greviews', $last, 12 * HOUR_IN_SECONDS);
		}
	}
	return $last;
}
function dabul_gbadge_html() {
	$g = dabul_greviews();
	$label = 'דירוג ' . $g['rating'] . ' בגוגל, מבוסס על ' . (int) $g['count'] . ' ביקורות';
	$logo = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.5h12.1c-.2 2-1.6 5-4.6 7l-.1.3 6.6 5.1.5.1c4.2-3.9 6.6-9.6 6.6-15.9z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.8-3.9-12.5-9.2l-.3.1-6.9 5.3-.1.3C7.8 41.1 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.5 28.2c-.5-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-.3l-7-5.4-.2.1C2.8 17.2 2 20.5 2 24s.8 6.8 2.3 9.8l7.2-5.6z"/><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 30 2 24 2 15.3 2 7.8 6.9 4.3 14.2l7.2 5.6c1.7-5.3 6.7-9.2 12.5-9.2z"/></svg>';
	return '<span class="dabul-gbadge" role="img" aria-label="' . esc_attr($label) . '">' . $logo
		. '<span><b>דירוג בגוגל</b><span class="r"><span>' . esc_html($g['rating']) . '</span><span class="s" aria-hidden="true">★★★★★</span></span>'
		. '<small>מבוסס על ' . (int) $g['count'] . ' ביקורות</small></span></span>';
}

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		// 3. the old rating image (with or without its <picture> wrapper)
		if (strpos($html, '5dfcbf54-c7b0-45c2-9693-e87c66ea269e') !== false) {
			$badge = dabul_gbadge_html();
			$html = preg_replace('#<picture\b[^>]*>(?:(?!</picture>).)*?5dfcbf54-c7b0-45c2-9693-e87c66ea269e(?:(?!</picture>).)*?</picture>#s', $badge, $html);
			$html = preg_replace('#<img\b[^>]*5dfcbf54-c7b0-45c2-9693-e87c66ea269e[^>]*>#', $badge, $html);
			$html = preg_replace('#<noscript>\s*' . preg_quote('<span class="dabul-gbadge"', '#') . '.*?</noscript>#s', '', $html);
		}
		// 4. reviewer photos on the testimonials page: a generic alt text
		if (strpos($html, 'rpi-card') !== false) {
			$parts = explode('<div class="rpi-card"', $html);
			for ($i = 1; $i < count($parts); $i++) {
				$alt = 'תמונת פרופיל של כותב/ת הביקורת';
				$parts[$i] = preg_replace_callback('#<img\b(?![^>]*\balt="[^"]+")[^>]*>#', function ($im) use ($alt) {
					$tag = preg_replace('#\salt=""#', '', $im[0]);
					return preg_replace('#^<img\b#', '<img alt="' . esc_attr($alt) . '"', $tag);
				}, $parts[$i]);
			}
			$html = implode('<div class="rpi-card"', $parts);
		}
		return $html;
	});
}, 0);
