/* dabul: "כפי שפורסם ב" logo strip on the page "עורך דין מקרקעין בנתניה" (post 3715), right under the hero.
   Yakir 30.10.2026 approved the strip from the sketch, with one change: it lines up with the parts above and below
   (same content width as the hero text and "מה לקוחות כתבו", one cream area with the reviews), not a full-width white band.
   The 6 logos are the files the /מהתקשורת/ page already uses. Added after the page content is built (the_content, late),
   before the first <section class="cream">, so the page content itself is not edited.
   Undo: deactivate this snippet. */
add_filter('the_content', function ($html) {
	if (!is_singular() || (int) get_queried_object_id() !== 3715 || strpos($html, 'dnt-press') !== false) return $html;
	$at = strpos($html, '<section class="cream"');
	if ($at === false) return $html;
	$u = '/wp-content/uploads/';
	$logos = array(
		array('רשת 13', $u . '2026/06/רשת-13.jpg.webp', 140, 59),
		array('ישראל היום', $u . '2026/01/הורדה.png.webp', 360, 140),
		array('מעריב', $u . '2026/02/maariv.webp', 202, 93),
		array('וואלה', $u . '2025/12/walla.jpg.webp', 370, 217),
		array('ביזפורטל', $u . '2026/10/logo-bizportal.jpg.webp', 280, 118),
		array('ערוץ 7', $u . '2026/01/images.png', 345, 146),
	);
	$tiles = '';
	foreach ($logos as $l) {
		$tiles .= '<span class="t"><img src="' . esc_url(home_url($l[1])) . '" alt="' . esc_attr($l[0]) . '" width="' . (int) $l[2] . '" height="' . (int) $l[3] . '" loading="lazy" decoding="async"></span>';
	}
	$css = '<style id="dnt-press-css">'
		. '.dnt section.dnt-press{padding-block:26px 0}'
		. '.dnt .dnt-press .in{display:flex;align-items:center;gap:22px;padding-bottom:24px;border-bottom:1px solid var(--line)}'
		. '.dnt .dnt-press .lb{margin:0;font-size:15px;font-weight:700;color:var(--muted);line-height:1.3;white-space:nowrap;flex:none}'
		. '.dnt .dnt-press .lg{display:flex;align-items:center;justify-content:space-between;gap:14px;flex:1 1 auto;min-width:0}'
		. '.dnt .dnt-press .t{display:flex;align-items:center;justify-content:center;height:44px;padding:5px 10px;background:#fff;border:1px solid var(--line);border-radius:8px;box-sizing:border-box}'
		. '.dnt .dnt-press .t img{display:block;height:32px;width:auto;max-width:96px;object-fit:contain;filter:grayscale(1);opacity:.72}'
		. '.dnt .dnt-press .al{flex:none;font-size:15px;font-weight:700;color:var(--ink);text-decoration:underline;text-decoration-color:var(--gold);text-underline-offset:4px;white-space:nowrap}'
		. '.dnt .dnt-press + section.cream{padding-top:34px}'
		. '@media(max-width:767px){.dnt section.dnt-press{padding-block:22px 0}'
		. '.dnt .dnt-press .in{flex-direction:column;align-items:stretch;gap:14px;padding-bottom:20px}'
		. '.dnt .dnt-press .lb{text-align:right}'
		. '.dnt .dnt-press .lg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'
		. '.dnt .dnt-press .t img{max-width:100%;height:28px}'
		. '.dnt .dnt-press .al{align-self:center;min-height:44px;display:flex;align-items:center}'
		. '.dnt .dnt-press + section.cream{padding-top:28px}}'
		. '</style>';
	$strip = $css . '<section class="cream dnt-press" aria-label="כפי שפורסם ב"><div class="in">'
		. '<p class="lb">כפי שפורסם ב</p><div class="lg">' . $tiles . '</div>'
		. '<a class="al" href="' . esc_url(home_url('/מהתקשורת/')) . '">לכל הכתבות</a></div></section>';
	return substr($html, 0, $at) . $strip . substr($html, $at);
}, 99);
