/* dabul: "כפי שפורסם ב" logo strip on the page "עורך דין מקרקעין בנתניה" (post 3715), right under the hero.
   Yakir 30.10.2026 approved the strip from the sketch (same content width as the hero text, one cream area with the reviews).
   17.11.2026 (Yakir: "יש לנו כתבות מהרבה אתרים"): every outlet from the press category now, one tile per outlet, each tile a
   link to its article (new tab). Read from dabul_press_items() (press schema snippet) + the outlet logo of each press post
   (ACF "תמונת_רשת_תקשורת"), so a new press item appears here by itself. Desktop: tiles wrap in up to two rows;
   phone: one row that scrolls sideways. The schema needs nothing new: the same items are already in the person's subjectOf.
   Added after the page content is built (the_content, late), before the first <section class="cream">.
   Undo: deactivate this snippet. */
add_filter('the_content', function ($html) {
	if (!is_singular() || (int) get_queried_object_id() !== 3715 || strpos($html, 'dnt-press') !== false) return $html;
	$at = strpos($html, '<section class="cream"');
	if ($at === false) return $html;
	$u = '/wp-content/uploads/';
	$fallback = array(
		'רשת 13' => array($u . '2026/06/רשת-13.jpg.webp', 140, 59), 'ישראל היום' => array($u . '2026/01/הורדה.png.webp', 360, 140),
		'מעריב' => array($u . '2026/02/maariv.webp', 202, 93), 'וואלה נדל״ן' => array($u . '2025/12/walla.jpg.webp', 370, 217),
		'ביזפורטל' => array($u . '2026/10/logo-bizportal.jpg.webp', 280, 118), 'ערוץ 7' => array($u . '2026/01/images.png', 345, 146),
	);
	$first = array('רשת 13', 'ישראל היום', 'מעריב', 'וואלה נדל״ן', 'וואלה', 'ביזפורטל', 'ערוץ 7');
	$items = function_exists('dabul_press_items') ? dabul_press_items() : array();
	$by = array();
	foreach ($items as $it) {
		if (in_array((int) $it['pid'], array(1474, 1487, 1490, 1506), true)) continue; // the 2021 pieces on debts and insolvency (ynet, mako, פסק דין): not on a real estate page
		$name = trim((string) $it['outlet']);
		if ($name === '' || isset($by[$name])) continue; // items come newest first: keep the newest article of each outlet
		$src = ''; $w = 0; $h = 0;
		$logo = get_post_meta($it['pid'], 'תמונת_רשת_תקשורת', true);
		if (is_array($logo)) $logo = isset($logo['ID']) ? $logo['ID'] : (isset($logo['id']) ? $logo['id'] : 0);
		if ($logo) { $im = wp_get_attachment_image_src((int) $logo, 'medium'); if ($im) { $src = $im[0]; $w = (int) $im[1]; $h = (int) $im[2]; } }
		if (!$src && isset($fallback[$name])) { $src = home_url($fallback[$name][0]); $w = $fallback[$name][1]; $h = $fallback[$name][2]; }
		if (!$src) continue;
		$by[$name] = array('name' => $name, 'url' => $it['url'], 'title' => $it['headline'], 'src' => $src, 'w' => $w ?: 200, 'h' => $h ?: 80);
	}
	if (!$by) return $html;
	$rank = function ($n) use ($first) { $i = array_search($n, $first, true); return $i === false ? 99 : $i; };
	$list = array_values($by);
	$pos = array_flip(array_keys($by));
	usort($list, function ($a, $b) use ($rank, $pos) { $d = $rank($a['name']) - $rank($b['name']); return $d ?: $pos[$a['name']] - $pos[$b['name']]; });
	$tiles = '';
	foreach ($list as $l) {
		$tiles .= '<a class="t" href="' . esc_url($l['url']) . '" target="_blank" rel="noopener" title="' . esc_attr($l['name'] . ': ' . $l['title']) . '">'
			. '<img src="' . esc_url($l['src']) . '" alt="' . esc_attr($l['name']) . '" width="' . (int) $l['w'] . '" height="' . (int) $l['h'] . '" loading="lazy" decoding="async"></a>';
	}
	$css = '<style id="dnt-press-css">'
		. '.dnt section.dnt-press{padding-block:26px 0}'
		. '.dnt .dnt-press .in{display:flex;align-items:center;gap:22px;padding-bottom:24px;background:linear-gradient(var(--line),var(--line)) center bottom/calc(100% - 36px) 1px no-repeat}'
		. '.dnt .dnt-press .lb{margin:0;font-size:15px;font-weight:700;color:var(--muted);line-height:1.3;white-space:nowrap;flex:none}'
		. '.dnt .dnt-press .lg{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:10px;flex:1 1 auto;min-width:0}'
		. '.dnt .dnt-press .t{display:flex;align-items:center;justify-content:center;height:44px;width:112px;padding:5px 10px;background:#fff;border:1px solid var(--line);border-radius:8px;box-sizing:border-box;transition:border-color .2s}'
		. '.dnt .dnt-press .t img{display:block;height:30px;width:auto;max-width:100%;object-fit:contain;filter:grayscale(1);opacity:.72;transition:filter .2s,opacity .2s}'
		. '.dnt .dnt-press .t:hover,.dnt .dnt-press .t:focus-visible{border-color:var(--gold)}'
		. '.dnt .dnt-press .t:hover img,.dnt .dnt-press .t:focus-visible img{filter:none;opacity:1}'
		. '.dnt .dnt-press .al{flex:none;font-size:15px;font-weight:700;color:var(--ink);text-decoration:underline;text-decoration-color:var(--gold);text-underline-offset:4px;white-space:nowrap}'
		. '.dnt .dnt-press + section.cream{padding-top:34px}'
		. '@media(max-width:767px){.dnt section.dnt-press{padding-block:22px 0}'
		. '.dnt .dnt-press .in{flex-direction:column;align-items:stretch;gap:12px;padding-bottom:18px}'
		. '.dnt .dnt-press .lb{text-align:right}'
		. '.dnt .dnt-press .lg{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px}'
		. '.dnt .dnt-press .lg::-webkit-scrollbar{display:none}'
		. '.dnt .dnt-press .t{flex:none;width:96px;scroll-snap-align:start}'
		. '.dnt .dnt-press .t img{height:26px}'
		. '.dnt .dnt-press .al{align-self:center;min-height:44px;display:flex;align-items:center}'
		. '.dnt .dnt-press + section.cream{padding-top:28px}}'
		. '</style>';
	$strip = $css . '<section class="cream dnt-press" aria-label="כפי שפורסם ב"><div class="in">'
		. '<p class="lb">כפי שפורסם ב</p><div class="lg">' . $tiles . '</div>'
		. '<a class="al" href="' . esc_url(get_category_link(50)) . '">לכל הכתבות</a></div></section>';
	return substr($html, 0, $at) . $strip . substr($html, $at);
}, 99);
// one-time: clear the cached copy of the page so the new strip shows
add_action('init', function () {
	if (get_option('dabul_npress_purged') === '20261117b') return;
	update_option('dabul_npress_purged', '20261117b');
	if (function_exists('rocket_clean_post')) rocket_clean_post(3715);
}, 99);
