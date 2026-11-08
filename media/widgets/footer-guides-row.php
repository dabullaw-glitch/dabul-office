
/* dabul 8.11.2026: footer row with "המדריכים המובילים" (fixed list, Yakir approved) and "פוסטים אחרונים" (6 newest posts, updates by itself) */
if (!function_exists('dabul_ft_guides_row')) {
function dabul_ft_guides_row() {
	$ic = array(
		'home' => '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
		'sell' => '<path d="M4 20V9l8-5 8 5v11zM9 20v-5h6v5"/>',
		'new'  => '<path d="M4 21V8h7v13M13 21V3h7v18M3 21h18"/>',
		'tax'  => '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h5"/>',
		'ren'  => '<path d="M3 21h18M5 21V11h5v10M14 21V5h5v16"/>',
		'tabu' => '<path d="M5 4h14v16H5zM9 9h6M9 13h6"/>',
	);
	$guides = array(
		array(3540, 'home', 'קניית דירה יד שנייה: הליווי המשפטי מההצעה ועד הרישום'),
		array(3916, 'sell', 'מכירת דירה: השלבים, המס והחוזה'),
		array(3364, 'new',  'קנייה מקבלן: המדריך המשפטי לדירה על הנייר'),
		array(2721, 'tax',  'מיסוי מקרקעין: מס רכישה, מס שבח ותכנון מס'),
		array(35,   'ren',  'התחדשות עירונית: פינוי בינוי ותמ״א 38'),
		array(6816, 'tabu', 'טאבו ורישום זכויות במקרקעין'),
	);
	$o = '<div class="r25"><style>'
		. '#dbl-foot .r25{max-width:1340px;margin:0 auto;border-top:1px solid rgba(231,205,150,.18);padding:34px 0 34px}'
		. '#dbl-foot .r25i{max-width:1060px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:80px}'
		. '#dbl-foot .r25 .h25{color:#e7cd96;font-size:17px;font-weight:600;line-height:1.3;margin:0 0 12px;padding-bottom:12px;position:relative}'
		. '#dbl-foot .r25 .h25:after{content:"";position:absolute;right:0;bottom:0;width:28px;height:2px;background:#c9a961}'
		. '#dbl-foot .r25 a.rw{display:flex;align-items:center;gap:10px;padding:4px 0;text-decoration:none;min-width:0}'
		. '#dbl-foot .r25 a.rw svg{width:16px;height:16px;flex:0 0 16px}'
		. '#dbl-foot .r25 a.rw i{width:5px;height:5px;border-radius:50%;background:#c9a961;flex:0 0 5px;margin:0 5px 0 6px}'
		. '#dbl-foot .r25 a.rw span{font-size:15px;line-height:1.5;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}'
		. '#dbl-foot .r25 a.rw:hover span{color:#e7cd96}'
		. '#dbl-foot .r25 a.all{display:inline-block;margin-top:10px;color:#e7cd96;font-weight:600;font-size:14.5px;text-decoration:none}'
		. '@media (max-width:900px){#dbl-foot .r25i{grid-template-columns:minmax(0,1fr);gap:28px}#dbl-foot .r25{padding:28px 0}}'
		. '</style><div class="r25i">';
	$o .= '<div><p class="h25">המדריכים המובילים</p><div class="u25"></div>';
	foreach ($guides as $g) {
		$url = get_permalink($g[0]);
		if (!$url) continue;
		$o .= '<a class="rw" href="' . esc_url($url) . '"><svg viewBox="0 0 24 24" fill="none" stroke="#C5A25A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $ic[$g[1]] . '</svg><span>' . esc_html($g[2]) . '</span></a>';
	}
	$o .= '<a class="all" href="' . 'https://dabullaw.co.il/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/' . '">לכל המדריכים ←</a></div>';
	$posts = get_posts(array('numberposts' => 6, 'post_type' => 'post', 'post_status' => 'publish', 'orderby' => 'date', 'order' => 'DESC', 'suppress_filters' => true, 'no_found_rows' => true));
	$o .= '<div><p class="h25">פוסטים אחרונים</p><div class="u25"></div>';
	foreach ($posts as $p) {
		$o .= '<a class="rw" href="' . esc_url(get_permalink($p)) . '"><i></i><span>' . esc_html(wp_strip_all_tags(get_the_title($p))) . '</span></a>';
	}
	$o .= '<a class="all" href="' . 'https://dabullaw.co.il/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/' . '">לכל המאמרים ←</a></div>';
	return $o . '</div></div>';
}
}
