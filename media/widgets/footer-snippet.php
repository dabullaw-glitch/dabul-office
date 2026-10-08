/* dabul: the new footer (Yakir approved the version from 8.10.2026).
   The top part of the old footer (the "need legal help? contact us now" form) stays as it is.
   Everything under it is replaced by one clean footer: logo and social networks, link columns (the office, buying,
   selling, real estate tax and urban renewal), contact details and opening hours, the map and the Martindale seal,
   the WhatsApp group box, and one bottom line (rights, English / Français, privacy, accessibility, site map).
   The links are written here; to change a link, edit the lists below.
   Checked on a preview address on 8.10.2026 (all 31 links answer), now live. On the phone the contact part is centered (Yakir asked). To undo: deactivate this snippet. */
define('DABUL_FT_LIVE', 1);

function dabul_ft_on() {
	if (defined('DABUL_FT_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_ft_icon($k) {
	$i = array(
		'fb' => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
		'ig' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
		'yt' => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 8.2c-.2-1.6-1-2.6-2.6-2.8C17 5 12 5 12 5s-5 0-7.4.4C3 5.6 2.2 6.6 2 8.2 1.8 9.4 1.8 12 1.8 12s0 2.6.2 3.8c.2 1.6 1 2.6 2.6 2.8C7 19 12 19 12 19s5 0 7.4-.4c1.6-.2 2.4-1.2 2.6-2.8.2-1.2.2-3.8.2-3.8s0-2.6-.2-3.8zM10 15V9l5.2 3L10 15z"/></svg>',
		'wa' => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
		'pin' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
		'tel' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
		'mail' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
	);
	return $i[$k];
}

function dabul_ft_html() {
	$cols = array(
			array('המשרד', array(array('אודות המשרד', 'https://dabullaw.co.il/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/'), array('תעודות והסמכות עו״ד יקיר דבול', 'https://dabullaw.co.il/%d7%aa%d7%a2%d7%95%d7%93%d7%95%d7%aa-%d7%95%d7%94%d7%a1%d7%9e%d7%9b%d7%95%d7%aa-%d7%a2%d7%95%d7%b4%d7%93-%d7%99%d7%a7%d7%99%d7%a8-%d7%93%d7%91%d7%95%d7%9c/'), array('המלצות', 'https://dabullaw.co.il/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/'), array('המשרד בתקשורת', 'https://dabullaw.co.il/category/press/'), array('סיפורי מקרה', 'https://dabullaw.co.il/category/%d7%a1%d7%99%d7%a4%d7%95%d7%a8%d7%99-%d7%9e%d7%a7%d7%a8%d7%94/'), array('מידע משפטי', 'https://dabullaw.co.il/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/'), array('טפסים', 'https://dabullaw.co.il/%d7%a7%d7%99%d7%a9%d7%95%d7%a8%d7%99%d7%9d-%d7%95%d7%98%d7%a4%d7%a1%d7%99%d7%9d/'))),
			array('קונים דירה', array(array('רכישה דירה יד שנייה', 'https://dabullaw.co.il/%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9E%D7%A7%D7%99%D7%A3-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%99%D7%93-%D7%A9%D7%A0%D7%99%D7%94/'), array('בדיקות מקדימות לפני קנייה', 'https://dabullaw.co.il/%D7%91%D7%93%D7%99%D7%A7%D7%95%D7%AA-%D7%9E%D7%A7%D7%93%D7%9E%D7%99%D7%95%D7%AA-%D7%9C%D7%A4%D7%A0%D7%99-%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-2/'), array('זכרון דברים בעסקת מקרקעין', 'https://dabullaw.co.il/%D7%96%D7%99%D7%9B%D7%A8%D7%95%D7%9F-%D7%93%D7%91%D7%A8%D7%99%D7%9D-%D7%94%D7%9E%D7%A4%D7%99%D7%AA-%D7%94%D7%9B%D7%99-%D7%99%D7%A7%D7%A8%D7%94-%D7%A9%D7%AA%D7%97%D7%AA%D7%9E%D7%95-%D7%A2%D7%9C%D7%99/'), array('עריכת הסכם מכר', 'https://dabullaw.co.il/%D7%A2%D7%A8%D7%99%D7%9B%D7%AA-%D7%94%D7%A1%D7%9B%D7%9D-%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F/'), array('רכישת דירה מכונס נכסים', 'https://dabullaw.co.il/%D7%A7%D7%A0%D7%99%D7%99%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%9E%D7%9B%D7%95%D7%A0%D7%A1-%D7%A0%D7%9B%D7%A1%D7%99%D7%9D-%D7%94%D7%96%D7%93%D7%9E%D7%A0%D7%95%D7%AA-%D7%A4%D7%96-%D7%90%D7%95-%D7%94%D7%A8/'), array('רכישת דירה תושב חוץ', 'https://dabullaw.co.il/%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9C%D7%AA%D7%95%D7%A9%D7%91%D7%99-%D7%97%D7%95%D7%A5-%D7%90%D7%99%D7%9A-%D7%9C%D7%A7%D7%A0%D7%95%D7%AA-%D7%95%D7%9C%D7%9E%D7%9B%D7%95%D7%A8-%D7%A0%D7%93/'), array('איחור במסירת דירה מקבלן', 'https://dabullaw.co.il/%d7%90%d7%99%d7%97%d7%95%d7%a8-%d7%91%d7%9e%d7%a1%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%9e%d7%a7%d7%91%d7%9c%d7%9f/'), array('קניית דירה מוכנה מקבלן', 'https://dabullaw.co.il/%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%9C%D7%90-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%9E%D7%A7%D7%91%D7%9C%D7%9F-2026/'), array('קניית דירה על הנייר', 'https://dabullaw.co.il/%D7%A7%D7%A0%D7%99%D7%94-%D7%9E%D7%A7%D7%91%D7%9C%D7%9F/'))),
			array('מוכרים דירה', array(array('היטל השבחה במכירת דירה', 'https://dabullaw.co.il/%D7%A9%D7%90%D7%9C%D7%95%D7%AA-%D7%A0%D7%A4%D7%95%D7%A6%D7%95%D7%AA-%D7%94%D7%99%D7%98%D7%9C-%D7%94%D7%A9%D7%91%D7%97%D7%94/'), array('העברת דירה במתנה ללא תמורה (בין קרובי משפחה)', 'https://dabullaw.co.il/%D7%94%D7%A2%D7%91%D7%A8%D7%94-%D7%9C%D7%9C%D7%90-%D7%AA%D7%9E%D7%95%D7%A8%D7%94-%D7%A2%D7%A1%D7%A7%D7%AA-%D7%9E%D7%AA%D7%A0%D7%94-%D7%91%D7%9E%D7%A9%D7%A4%D7%97%D7%94-%D7%94%D7%9E%D7%93%D7%A8/'), array('הפרת חוזה מכר דירה על ידי הקונה', 'https://dabullaw.co.il/%D7%94%D7%A4%D7%A8%D7%AA-%D7%97%D7%95%D7%96%D7%94-%D7%9E%D7%9B%D7%A8-%D7%93%D7%99%D7%A8%D7%94/'), array('מכירת דירה של תושב חוץ בישראל', 'https://dabullaw.co.il/%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9C%D7%AA%D7%95%D7%A9%D7%91%D7%99-%D7%97%D7%95%D7%A5-%D7%90%D7%99%D7%9A-%D7%9C%D7%A7%D7%A0%D7%95%D7%AA-%D7%95%D7%9C%D7%9E%D7%9B%D7%95%D7%A8-%D7%A0%D7%93/'))),
			array('מיסוי מקרקעין', array(array('הקטנת מס שבח', 'https://dabullaw.co.il/%D7%93%D7%A8%D7%9B%D7%99%D7%9D-%D7%97%D7%95%D7%A7%D7%99%D7%95%D7%AA-%D7%9C%D7%94%D7%A4%D7%97%D7%AA%D7%AA-%D7%9E%D7%A1-%D7%A9%D7%91%D7%97-%D7%95%D7%9E%D7%99%D7%A1%D7%95%D7%99/'), array('חישוב מס רכישה', 'https://dabullaw.co.il/%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%9C%D7%90-%D7%95%D7%9E%D7%97%D7%A9%D7%91%D7%95%D7%9F-%D7%9C%D7%94%D7%95%D7%A6%D7%90%D7%95%D7%AA-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99/'), array('חישוב מס שבח', 'https://dabullaw.co.il/%D7%AA%D7%9B%D7%A0%D7%95%D7%9F-%D7%9E%D7%A1-%D7%95%D7%9C%D7%99%D7%95%D7%95%D7%99-%D7%91%D7%9E%D7%99%D7%A1%D7%95%D7%99-%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F-%D7%A9%D7%91%D7%97-%D7%A8%D7%9B%D7%99/'), array('מיסוי דירת ירושה', 'https://dabullaw.co.il/%D7%90%D7%AA%D7%9D-%D7%A9%D7%95%D7%90%D7%9C%D7%99%D7%9D-%D7%A2%D7%95%D7%93-%D7%99%D7%A7%D7%99%D7%A8-%D7%93%D7%91%D7%95%D7%9C-%D7%A2%D7%95%D7%A0%D7%94-%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-2/')))
		);
		$renew = array('התחדשות עירונית', array(array('סרבני פינוי בינוי', 'https://dabullaw.co.il/%D7%94%D7%93%D7%99%D7%99%D7%A8-%D7%94%D7%A1%D7%A8%D7%91%D7%9F-%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%94%D7%9E%D7%A9%D7%A4%D7%98%D7%99-%D7%94%D7%9E%D7%9C%D7%90-%D7%9C%D7%94%D7%AA%D7%9E%D7%95%D7%93/'), array('עורך דין פינוי בינוי', 'https://dabullaw.co.il/%D7%94%D7%AA%D7%97%D7%93%D7%A9%D7%95%D7%AA-%D7%A2%D7%99%D7%A8%D7%95%D7%A0%D7%99%D7%AA/')));
	$e = function ($s) { return esc_html($s); };
	$ul = function ($items) use ($e) { $o = '<ul>'; foreach ($items as $it) $o .= '<li><a href="' . esc_url($it[1]) . '">' . $e($it[0]) . '</a></li>'; return $o . '</ul>'; };
	$o = '<div id="dbl-foot" dir="rtl">';
	// row 1: logo and social networks
	$o .= '<div class="r1"><a class="lg" href="' . esc_url(home_url('/')) . '"><img src="https://dabullaw.co.il/wp-content/uploads/2025/11/logo-footer.webp" width="701" height="180" alt="יקיר דבול משרד עורכי דין" loading="lazy" decoding="async"></a>'
		. '<div class="soc"><small>עקבו אחרינו</small>'
		. '<a href="https://www.facebook.com/dabullaw" target="_blank" rel="noopener" aria-label="פייסבוק">' . dabul_ft_icon('fb') . '</a>'
		. '<a href="https://www.instagram.com/dabullaw" target="_blank" rel="noopener" aria-label="אינסטגרם">' . dabul_ft_icon('ig') . '</a>'
		. '<a href="https://www.youtube.com/channel/UCVooMwdZfVT_xo21a-Xpdbg" target="_blank" rel="noopener" aria-label="יוטיוב">' . dabul_ft_icon('yt') . '</a></div></div>';
	// row 2: link columns, contact, map
	$o .= '<div class="r2">';
	foreach ($cols as $i => $c) {
		$o .= '<div class="col"><p class="h">' . $e($c[0]) . '</p>' . $ul($c[1]);
		if ($i === 3) $o .= '<p class="h gap">' . $e($renew[0]) . '</p>' . $ul($renew[1]);
		$o .= '</div>';
	}
	$o .= '<div class="col ct"><p class="h">יצירת קשר</p><ul>'
		. '<li><a href="https://waze.com/ul?ll=32.3274395%2C34.8614253&amp;navigate=yes&amp;zoom=17" target="_blank" rel="noopener"><i>' . dabul_ft_icon('pin') . '</i>רזיאל 1, נתניה (קומת כניסה) 4247001</a></li>'
		. '<li><a href="tel:098613413"><i>' . dabul_ft_icon('tel') . '</i>09-861-3413</a></li>'
		. '<li><a href="mailto:dabullaw@gmail.com"><i>' . dabul_ft_icon('mail') . '</i>dabullaw@gmail.com</a></li>'
		. '<li><a href="https://www.facebook.com/dabullaw" target="_blank" rel="noopener"><i>' . dabul_ft_icon('fb') . '</i>התחברו בפייסבוק</a></li></ul>'
		. '<p class="h gap">שעות פעילות</p><div class="hrs"><div><span>יום א\'-ה\'</span><i></i><span>9:00-18:00</span></div><div><span>יום ו\' ושבת</span><i></i><span>סגור</span></div></div></div>';
	$o .= '<div class="col mp"><iframe class="map" loading="lazy" title="עורך דין מקרקעין יקיר דבול נתניה" src="https://maps.google.com/maps?q=%D7%A2%D7%95%D7%A8%D7%9A%20%D7%93%D7%99%D7%9F%20%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F%20%D7%99%D7%A7%D7%99%D7%A8%20%D7%93%D7%91%D7%95%D7%9C%20%D7%A0%D7%AA%D7%A0%D7%99%D7%94&amp;t=m&amp;z=14&amp;output=embed&amp;iwloc=near"></iframe>'
		. '<img class="mart" src="https://dabullaw.co.il/wp-content/uploads/2025/11/martindale-%D7%97%D7%95%D7%AA%D7%9D-%D7%90%D7%9E%D7%99%D7%A0%D7%95%D7%AA-%D7%9E%D7%A8%D7%98%D7%99%D7%A0%D7%93%D7%99%D7%99%D7%9C-2-300x139-1.png.webp" width="300" height="139" alt="חותם אמינות מרטינדייל" loading="lazy" decoding="async"></div>';
	$o .= '</div>';
	// row 3: the WhatsApp group
	$o .= '<div class="r3"><div class="wa"><span><b>יש לכם שאלות?</b> הצטרפו לקבוצת הוואטסאפ שלנו</span><a href="https://chat.whatsapp.com/ClLGh1qsjnpBnjIdKKu2lA" target="_blank" rel="noopener">' . dabul_ft_icon('wa') . 'להצטרפות</a></div></div>';
	// row 4: rights, languages, legal pages
	$o .= '<div class="r4"><span>כל הזכויות שמורות ליקיר דבול משרד עורכי דין ©</span>'
		. '<span class="ln"><a href="https://dabullaw.co.il/real-estate-lawyer-netanya-english/" hreflang="en" lang="en">English</a><a href="https://dabullaw.co.il/avocat-immobilier-netanya-francais/" hreflang="fr" lang="fr">Français</a></span>'
		. '<span class="lgl"><a href="https://dabullaw.co.il/privacy-policy/">מדיניות פרטיות</a><a href="' . esc_url('https://dabullaw.co.il/הצהרת-נגישות/') . '">הצהרת נגישות</a><a href="' . esc_url('https://dabullaw.co.il/מפת-אתר/') . '">מפת אתר</a></span>'
		. '<span class="rc">אתר זה מוגן על ידי reCAPTCHA ומדיניות הפרטיות ותנאי השירות של גוגל חלים עליו.</span></div>';
	return $o . '</div>';
}

add_action('template_redirect', function () {
	if (!dabul_ft_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$s = strpos($html, '<footer data-elementor-type="footer"');
		if ($s === false) return $html;
		$open = strpos($html, '>', $s) + 1;
		$end = strpos($html, '</footer>', $open);
		if ($end === false) return $html;
		$inner = substr($html, $open, $end - $open);
		if (!preg_match_all('#<div class="elementor-element elementor-element-[0-9a-f]+ [^"]*\be-parent\b#', $inner, $m, PREG_OFFSET_CAPTURE) || count($m[0]) < 2) return $html;
		$starts = array_map(function ($x) { return $x[1]; }, $m[0]);
		$kept = substr($inner, 0, $starts[0]); $placed = false;
		foreach ($starts as $i => $p) {
			$seg = substr($inner, $p, (isset($starts[$i + 1]) ? $starts[$i + 1] : strlen($inner)) - $p);
			if (strpos($seg, 'elementor-element-0647149') !== false) { $kept .= $seg; continue; }
			if (!$placed) { $kept .= dabul_ft_html(); $placed = true; }
		}
		if (!$placed) return $html;
		return substr($html, 0, $open) . $kept . "\n" . substr($html, $end);
	});
}, 8);

add_action('wp_head', function () {
	if (is_admin() || !dabul_ft_on()) return;
	echo '<style id="dbl-foot-css">'
		. '#dbl-foot{background:radial-gradient(120% 80% at 50% 0,#1c1c1c 0,#121212 60%);padding:46px 30px 0;direction:rtl;font-family:"Noto Local",sans-serif;color:#cfccc6}'
		. '#dbl-foot *{box-sizing:border-box}#dbl-foot a{text-decoration:none!important;color:inherit}#dbl-foot ul{list-style:none;margin:0;padding:0}'
		. '#dbl-foot .r1,#dbl-foot .r2,#dbl-foot .r4{max-width:1340px;margin:0 auto}'
		. '#dbl-foot .r1{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:28px;border-bottom:1px solid rgba(231,205,150,.18)}'
		. '#dbl-foot .lg img{height:74px;width:auto;display:block}'
		. '#dbl-foot .soc{display:flex;align-items:center;gap:10px}#dbl-foot .soc small{color:#9d9a93;font-size:14px;margin-left:6px}'
		. '#dbl-foot .soc a{width:44px;height:44px;border-radius:50%;border:1px solid rgba(231,205,150,.45);display:flex;align-items:center;justify-content:center;color:#e7cd96;transition:.2s}#dbl-foot .soc a:hover{background:#e7cd96;color:#141414}#dbl-foot .soc svg{width:20px;height:20px}'
		. '#dbl-foot .r2{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.3fr) 300px;gap:34px;padding:38px 0 34px}'
		. '#dbl-foot .h{color:#e7cd96;font-size:17px;font-weight:600;line-height:1.3;margin:0 0 12px;padding-bottom:12px;position:relative}#dbl-foot .h:after{content:"";position:absolute;right:0;bottom:0;width:28px;height:2px;background:#c9a961}#dbl-foot .h.gap{margin-top:24px}'
		. '#dbl-foot .col li{padding:4px 0;font-size:15px;line-height:1.5}#dbl-foot .col li a:hover{color:#e7cd96}'
		. '#dbl-foot .ct li a{display:flex;align-items:flex-start;gap:10px}#dbl-foot .ct i{flex:0 0 18px;height:18px;color:#e7cd96;margin-top:2px}#dbl-foot .ct i svg{width:18px;height:18px}'
		. '#dbl-foot .hrs div{display:flex;align-items:center;gap:8px;font-size:15px;padding:4px 0}#dbl-foot .hrs i{flex:1;border-bottom:2px dotted rgba(207,204,198,.35);margin-top:6px}'
		. '#dbl-foot .mp{display:flex;flex-direction:column;gap:18px}#dbl-foot .map{width:100%;height:220px;border-radius:14px;border:1px solid rgba(231,205,150,.25);display:block}#dbl-foot .mart{width:230px;height:auto;display:block}'
		. '#dbl-foot .r3{display:flex;justify-content:center;padding:0 0 30px}'
		. '#dbl-foot .wa{display:inline-flex;align-items:center;gap:22px;flex-wrap:wrap;justify-content:center;padding:16px 28px;border-radius:16px;background:linear-gradient(90deg,#1d1d1d,#202020);border:1px solid rgba(231,205,150,.22);color:#fff;font-size:19px}'
		. '#dbl-foot .wa b{color:#e7cd96}#dbl-foot .wa a{display:inline-flex;align-items:center;gap:8px;background:#25d366;color:#fff!important;border-radius:8px;padding:10px 20px;font-size:16px;font-weight:600}#dbl-foot .wa a svg{width:18px;height:18px}'
		. '#dbl-foot .r4{border-top:1px solid rgba(231,205,150,.18);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 0 18px;font-size:14px}'
		. '#dbl-foot .r4 .ln,#dbl-foot .r4 .lgl{display:flex;gap:14px;flex-wrap:wrap}#dbl-foot .r4 .lgl a+a:before{content:"|";margin-left:14px;color:rgba(207,204,198,.4)}#dbl-foot .r4 a:hover{color:#e7cd96}'
		. '#dbl-foot .r4 .rc{flex-basis:100%;text-align:center;opacity:.6;font-size:13px}'
		. '@media (max-width:1100px){#dbl-foot .r2{grid-template-columns:repeat(3,minmax(0,1fr))}}'
		. '@media (max-width:767px){#dbl-foot{padding:34px 20px 0}#dbl-foot .r1{flex-direction:column;gap:18px}#dbl-foot .soc{flex-wrap:wrap;justify-content:center}#dbl-foot .soc small{flex-basis:100%;text-align:center;margin:0}'
		. '#dbl-foot .r2{grid-template-columns:1fr 1fr;gap:28px 18px}#dbl-foot .ct,#dbl-foot .mp{grid-column:1/-1}#dbl-foot .map{display:none}#dbl-foot .mp{align-items:center}'
		. '#dbl-foot .wa{font-size:17px;text-align:center}#dbl-foot .r4{flex-direction:column;text-align:center}'
		. '#dbl-foot .ct{text-align:center}#dbl-foot .ct .h:after{right:50%;margin-right:-14px}#dbl-foot .ct ul{display:flex;flex-direction:column;align-items:center}#dbl-foot .ct .hrs{width:100%;max-width:300px;margin:0 auto}}'
		. '</style>' . "\n";
}, 45);
