/* dabul: new "הכירו את יקיר דבול" section on the home page + new "מידע משפטי" page (Yakir approved, 8.10.2026).
   1. Home page: the old about block (Elementor container c7b857d) is swapped for the new design. The texts are the
      site's own texts. The photo sits in the middle of the arch; the two badges sit under the photo, not on it.
   2. מידע משפטי (the blog page): a new layout. Search, topic buttons, main guides, article cards, page numbers, help strip.
      Topic buttons and the search show the matching articles on the same page (those result pages are not indexed).
   To undo everything: deactivate this snippet (the old section and the old page come back as they were). */

function dabul_ah_icon($k) {
	$i = array(
		'team'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c2.4.2 4.2 1.8 4.8 4.8"/></svg>',
		'route' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/></svg>',
		'scale' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M7 21h10M4 7h16"/><path d="M4 7l-2.5 6a3 3 0 0 0 5 0L4 7zM20 7l-2.5 6a3 3 0 0 0 5 0L20 7z"/></svg>',
		'wa'    => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
	);
	return $i[$k];
}
function dabul_ah_wa() { return function_exists('dabul_wa_link') ? dabul_wa_link() : 'https://wa.me/972505580189'; }
function dabul_ah_reviews() {
	$g = function_exists('dabul_greviews') ? dabul_greviews() : array('rating' => '4.9', 'count' => 73);
	return array(esc_html($g['rating']), (int) $g['count']);
}

/* ---------- 1. about section ---------- */
function dabul_about_html() {
	list($rt, $rc) = dabul_ah_reviews();
	$net   = home_url('/%D7%A2%D7%95%D7%A8%D7%9A-%D7%93%D7%99%D7%9F-%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F-%D7%91%D7%A0%D7%AA%D7%A0%D7%99%D7%94/');
	$about = home_url('/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/');
	$img   = content_url('/uploads/2026/04/%D7%99%D7%A7%D7%99%D7%A8-%D7%93%D7%91%D7%95%D7%9C-%D7%A2%D7%95%D7%A8%D7%9A-%D7%93%D7%99%D7%9F.webp');
	$css = '.dbl-about{--g:#c9a961;--g2:#e4d19c;--ink:#14213d;--tx:#3a4252;--bg:#f7f6f2;background:linear-gradient(180deg,#fff 0,var(--bg) 100%);padding:72px 24px 64px;direction:rtl;font-family:inherit}'
		. '.dbl-about *{box-sizing:border-box}'
		. '.dbl-about .w{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}'
		. '.dbl-about .kick{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:.3px;color:#8b6f47;background:#fff;border:1px solid #eadfc8;border-radius:999px;padding:6px 14px}'
		. '.dbl-about h2{font-size:42px;line-height:1.15;margin:16px 0 6px;color:var(--ink);font-weight:800}'
		. '.dbl-about h2 span{display:block;font-size:24px;font-weight:500;color:#8b6f47;margin-top:6px}'
		. '.dbl-about .bar{width:64px;height:4px;border-radius:2px;background:var(--g);margin:18px 0 22px}'
		. '.dbl-about p{font-size:17px;line-height:1.85;color:var(--tx);margin:0 0 14px}'
		. '.dbl-about p a{color:#8b6f47;font-weight:700}'
		. '.dbl-about h3{font-size:19px;color:var(--ink);margin:22px 0 8px;font-weight:800}'
		. '.dbl-about .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0 8px}'
		. '.dbl-about .card{background:#fff;border:1px solid #ece6da;border-radius:16px;padding:20px 20px 16px;box-shadow:0 6px 20px rgba(20,33,61,.05)}'
		. '.dbl-about .card .ic{width:44px;height:44px;border-radius:12px;background:#f6efe0;color:#8b6f47;display:flex;align-items:center;justify-content:center;margin-bottom:12px}'
		. '.dbl-about .card .ic svg{width:24px;height:24px}'
		. '.dbl-about .card h4{font-size:17px;margin:0 0 6px;color:var(--ink);font-weight:800}'
		. '.dbl-about .card p{font-size:15px;line-height:1.7;margin:0}'
		. '.dbl-about blockquote{margin:18px 0 0;padding:14px 18px;border:0;border-inline-start:4px solid var(--g);background:#fff;border-radius:0 12px 12px 0;font-size:15.5px;line-height:1.8;color:var(--tx);font-style:normal}'
		. '.dbl-about .cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}'
		. '.dbl-about .btn{display:inline-flex;align-items:center;gap:8px;height:50px;padding:0 24px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none}'
		. '.dbl-about .btn.gold{background:var(--ink);color:var(--g2)}'
		. '.dbl-about .btn.wa{background:#fff;color:#128c4b;border:1.5px solid #25d366}'
		. '.dbl-about .btn.wa svg{width:20px;height:20px}'
		. '.dbl-about .ph{display:flex;flex-direction:column;align-items:center;gap:18px}'
		. '.dbl-about .disc{position:relative;width:100%;max-width:420px;aspect-ratio:4/5;border-radius:210px 210px 28px 28px;background:radial-gradient(120% 90% at 50% 10%,#1d2b52 0,#0b1530 70%);overflow:hidden;box-shadow:0 30px 60px rgba(11,21,48,.25)}'
		. '.dbl-about .disc:after{content:"";position:absolute;inset:12px;border-radius:198px 198px 20px 20px;border:1.5px solid rgba(228,209,156,.45);pointer-events:none}'
		. '.dbl-about .disc img{position:absolute;bottom:0;left:50%;transform:translateX(-61%);height:94%;width:auto;max-width:none;object-fit:contain}'
		. '.dbl-about .badges{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;width:100%;max-width:420px}'
		. '.dbl-about .badge{flex:1 1 0;min-width:0;background:#fff;border:1px solid #ece6da;border-radius:16px;box-shadow:0 10px 24px rgba(20,33,61,.08);padding:12px 14px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;line-height:1.35;color:var(--ink);text-align:right}'
		. '.dbl-about .badge b{font-size:24px;color:#8b6f47;font-weight:800;white-space:nowrap}'
		. '.dbl-about .badge .st{color:#f4b400;letter-spacing:1px;display:block;font-size:13px}'
		. '.dbl-about .facts{max-width:1200px;margin:44px auto 0;display:grid;grid-template-columns:repeat(3,1fr);background:var(--ink);border-radius:18px;overflow:hidden}'
		. '.dbl-about .fact{padding:20px 22px;color:#e9e4d8;font-size:15px;line-height:1.5;display:flex;gap:12px;align-items:center}'
		. '.dbl-about .fact+.fact{border-inline-start:1px solid rgba(228,209,156,.18)}'
		. '.dbl-about .fact strong{display:block;color:var(--g2);font-size:22px;font-weight:800}'
		. '.dbl-about .fact .ic{flex:0 0 40px;height:40px;border-radius:50%;border:1px solid rgba(228,209,156,.4);color:var(--g2);display:flex;align-items:center;justify-content:center}'
		. '.dbl-about .fact .ic svg{width:20px;height:20px}'
		. '@media (max-width:900px){.dbl-about{padding:44px 16px 40px}.dbl-about .w{grid-template-columns:1fr;gap:28px}.dbl-about .ph{order:-1}.dbl-about .disc{max-width:300px}.dbl-about .badges{max-width:340px;gap:10px}'
		. '.dbl-about .badge{padding:10px 10px;font-size:12.5px;gap:8px}.dbl-about .badge b{font-size:20px}'
		. '.dbl-about .kick .opt{display:none}'
		. '.dbl-about h2{font-size:30px}.dbl-about h2 span{font-size:19px}.dbl-about p{font-size:16px}.dbl-about .cards{grid-template-columns:1fr}.dbl-about .facts{grid-template-columns:1fr;margin-top:28px}'
		. '.dbl-about .fact+.fact{border-inline-start:0;border-top:1px solid rgba(228,209,156,.18)}.dbl-about .btn{flex:1;justify-content:center}}';
	return '<style id="dbl-about-css">' . $css . '</style>'
		. '<section class="dbl-about" id="about-yakir" aria-labelledby="dbl-about-h"><div class="w"><div class="tx">'
		. '<span class="kick">עו״ד יקיר דבול<span class="opt"> · דיני מקרקעין · נתניה</span></span>'
		. '<h2 id="dbl-about-h">הכירו את יקיר דבול<span>עורך דין מקרקעין</span></h2><div class="bar"></div>'
		. '<p>יקיר דבול, <a href="' . esc_url($net) . '">עורך דין מקרקעין בנתניה</a>, מספק ליווי אישי ומקצועי במגוון תחומים משפטיים: עסקאות מקרקעין ונדל״ן מורכבות, ייצוג חייבים בחדלות פירעון ושיקום כלכלי, ופרויקטים של התחדשות עירונית ופינוי בינוי. מדי שנה אני מלווה מעל 100 עסקאות מקרקעין ומאות לקוחות, עם דגש על שירות מותאם אישית, פתרונות חכמים ושמירה על האינטרסים של לקוחותיי.</p>'
		. '<h3>היתרון שלנו</h3><p>אני משלב ניסיון משפטי עשיר עם הבנה עסקית מעמיקה, ומציע ללקוחות פתרונות מותאמים אישית, הן ברמת העסקה והן ברמת הפרויקט כולו. מעבר לייעוץ המשפטי, אני מנתח את הצד העסקי של המצב, מעריך את הסיכונים ומציע את הפתרון המתאים מבחינה משפטית וכלכלית.</p>'
		. '<div class="cards"><div class="card"><div class="ic">' . dabul_ah_icon('team') . '</div><h4>עבודה משותפת עם אנשי מקצוע</h4><p>אני עובד בשיתוף פעולה הדוק עם שמאי מקרקעין, מהנדסי בניין, אדריכלים, יועצי משכנתאות ועוד, כדי להעניק ללקוחות שירות מקיף ומקצועי.</p></div>'
		. '<div class="card"><div class="ic">' . dabul_ah_icon('route') . '</div><h4>ליווי מלא מהתחלה ועד הסוף</h4><p>אני מלווה את לקוחותיי לאורך כל הדרך, עם הקפדה על כל פרט וניתוח משפטי וכלכלי מקיף.</p></div></div>'
		. '<blockquote>המשרד מובל על ידי עו״ד יקיר דבול, שמסירותו וניסיונו מאפשרים לו להציע פתרונות מקצועיים, יצירתיים ובטוחים. החזון: עתיד כלכלי יציב וביטחון בנכסים, הן ב״ארבעה קירות״ והן בתוכניות השקעה ומימוש נכסים מורכבים.</blockquote>'
		. '<div class="cta"><a class="btn gold" href="' . esc_url($about) . '">קראו עליי עוד ←</a><a class="btn wa" href="' . esc_url(dabul_ah_wa()) . '" target="_blank" rel="noopener">' . dabul_ah_icon('wa') . ' שיחה בוואטסאפ</a></div></div>'
		. '<div class="ph"><div class="disc"><img src="' . esc_url($img) . '" width="494" height="800" alt="עו״ד יקיר דבול" class="skip-lazy" data-no-lazy="1" decoding="async"></div>'
		. '<div class="badges"><div class="badge"><b>100+</b><span>עסקאות מקרקעין<br>בכל שנה</span></div>'
		. '<div class="badge"><b>' . $rt . '</b><span><span class="st" aria-hidden="true">★★★★★</span>' . $rc . ' ביקורות בגוגל</span></div></div></div></div>'
		. '<div class="facts"><div class="fact"><span class="ic">' . dabul_ah_icon('scale') . '</span><span><strong>מעל 100</strong>עסקאות מקרקעין מדי שנה</span></div>'
		. '<div class="fact"><span class="ic">' . dabul_ah_icon('team') . '</span><span><strong>לשכת עורכי הדין</strong>חבר ועדות הקניין, המקרקעין וההתחדשות העירונית</span></div>'
		. '<div class="fact"><span class="ic">' . dabul_ah_icon('route') . '</span><span><strong>24/7</strong>זמינות למקרי חירום</span></div></div></section>';
}

// cut one Elementor element (from its opening <div> to the matching </div>) out of the page
function dabul_ah_cut_element($html, $id, $with) {
	$start = strpos($html, '<div class="elementor-element elementor-element-' . $id . ' ');
	if ($start === false) return $html;
	if (!preg_match_all('#<div\b|</div>#', $html, $m, PREG_OFFSET_CAPTURE, $start)) return $html;
	$depth = 0;
	foreach ($m[0] as $t) {
		$depth += ($t[0] === '</div>') ? -1 : 1;
		if ($depth === 0) {
			$end = $t[1] + 6;
			return substr($html, 0, $start) . $with . substr($html, $end);
		}
	}
	return $html;
}

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || !is_front_page()) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_ah_cut_element($html, 'c7b857d', dabul_about_html());
	});
}, 3);

/* ---------- 2. legal info hub (the posts page) ---------- */
function dabul_hub_topics() {
	return array(
		'buy'      => array('קונים דירה', array('s' => 'רכישת דירה')),
		'sell'     => array('מוכרים דירה', array('s' => 'מכירת דירה')),
		'renewal'  => array('התחדשות עירונית', array('cat' => 12)),
		'tax'      => array('מיסוי מקרקעין', array('s' => 'מיסוי')),
		'rent'     => array('שכירות', array('s' => 'שכירות')),
		'inherit'  => array('ירושה ונכסים', array('cat' => 11)),
		'condo'    => array('בתים משותפים', array('s' => 'בית משותף')),
		'foreign'  => array('תושבי חוץ', array('s' => 'תושבי חוץ')),
	);
}
function dabul_hub_filter() {
	$t = isset($_GET['t']) ? sanitize_key(wp_unslash($_GET['t'])) : '';
	$q = isset($_GET['q']) ? trim(sanitize_text_field(wp_unslash($_GET['q']))) : '';
	$topics = dabul_hub_topics();
	if ($t && isset($topics[$t])) return array('t', $t, $topics[$t][0], $topics[$t][1]);
	if ($q !== '') return array('q', $q, $q, array('s' => mb_substr($q, 0, 80)));
	return null;
}

add_action('pre_get_posts', function ($q) {
	if (is_admin() || !$q->is_main_query() || !$q->is_home()) return;
	$q->set('posts_per_page', 12);
	$f = dabul_hub_filter();
	if ($f) foreach ($f[3] as $k => $v) $q->set($k, $v);
});

add_filter('wp_robots', function ($r) {
	if (is_home() && dabul_hub_filter()) { $r['noindex'] = true; $r['follow'] = true; }
	return $r;
});

function dabul_hub_css() {
	return 'main.dbl-hub-main{max-width:none!important;width:100%!important;padding:0!important;margin:0!important}.dbl-hub{--g:#c9a961;--g2:#e4d19c;--ink:#14213d;--tx:#4a5263;direction:rtl;font-family:inherit;background:#f7f6f2}'
		. '.dbl-hub *{box-sizing:border-box}'
		. '.dbl-hub .hero{background:radial-gradient(120% 140% at 85% 0,#1d2b52 0,#0b1530 60%);color:#fff;padding:56px 24px 48px}'
		. '.dbl-hub .in{max-width:1200px;margin:0 auto}'
		. '.dbl-hub .crumb{font-size:13px;color:#b9c0d4;margin-bottom:10px}.dbl-hub .crumb a{color:var(--g2);text-decoration:none}'
		. '.dbl-hub h1{font-size:44px;line-height:1.15;margin:0 0 10px;font-weight:800;color:#fff}.dbl-hub h1 small{font-size:20px;font-weight:500;color:#b9c0d4}'
		. '.dbl-hub .sub{font-size:18px;line-height:1.7;color:#d6dbe8;max-width:680px;margin:0 0 24px}'
		. '.dbl-hub .search{display:flex;max-width:620px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25);margin:0}'
		. '.dbl-hub .search input{flex:1;min-width:0;border:0;padding:16px 18px;font-size:16px;font-family:inherit;outline:0;direction:rtl;background:#fff;color:#1c2333;border-radius:0}'
		. '.dbl-hub .search button{border:0;background:var(--g);color:var(--ink);font-weight:800;padding:0 26px;font-size:16px;font-family:inherit;cursor:pointer;border-radius:0}'
		. '.dbl-hub .chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}'
		. '.dbl-hub .chip{border:1px solid rgba(228,209,156,.45);color:#f1ead7;border-radius:999px;padding:8px 16px;font-size:14.5px;text-decoration:none;white-space:nowrap}'
		. '.dbl-hub .chip.on{background:var(--g2);color:var(--ink);border-color:var(--g2);font-weight:800}'
		. '.dbl-hub .sec{max-width:1200px;margin:0 auto;padding:40px 24px 8px}'
		. '.dbl-hub h2{font-size:26px;color:var(--ink);margin:0 0 18px;font-weight:800;display:flex;align-items:center;gap:12px}.dbl-hub h2:after{content:"";flex:1;height:1px;background:#e3dccd}'
		. '.dbl-hub .guides{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}'
		. '.dbl-hub .guide{background:#fff;border:1px solid #ece6da;border-radius:16px;padding:20px;border-top:4px solid var(--g);text-decoration:none;display:block}'
		. '.dbl-hub .guide b{display:block;font-size:17px;color:var(--ink);margin-bottom:6px}.dbl-hub .guide span{font-size:14.5px;color:var(--tx);line-height:1.6}'
		. '.dbl-hub .guide i{display:block;font-style:normal;color:#8b6f47;font-weight:700;font-size:14px;margin-top:12px}'
		. '.dbl-hub .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}'
		. '.dbl-hub .post{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ece6da;display:flex;flex-direction:column;box-shadow:0 6px 18px rgba(20,33,61,.05);position:relative}'
		. '.dbl-hub .post .im{aspect-ratio:1200/630;background:#efe9dd;overflow:hidden}.dbl-hub .post .im img{width:100%;height:100%;object-fit:cover;display:block}'
		. '.dbl-hub .post .bd{padding:16px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}'
		. '.dbl-hub .post .cat{font-size:12.5px;font-weight:800;color:#8b6f47;letter-spacing:.2px}'
		. '.dbl-hub .post h3{font-size:18px;line-height:1.45;margin:0;color:var(--ink);font-weight:800;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
		. '.dbl-hub .post h3 a{color:inherit;text-decoration:none}.dbl-hub .post h3 a:after{content:"";position:absolute;inset:0}'
		. '.dbl-hub .post p{font-size:14.5px;line-height:1.65;color:var(--tx);margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'
		. '.dbl-hub .post .ft{margin-top:auto;padding-top:10px;border-top:1px solid #f0ebe1;display:flex;justify-content:space-between;font-size:13px;color:#8a90a0}.dbl-hub .post .ft b{color:#8b6f47}'
		. '.dbl-hub .none{background:#fff;border:1px solid #ece6da;border-radius:16px;padding:24px;font-size:16px;color:var(--tx)}.dbl-hub .none a{color:#8b6f47;font-weight:700}'
		. '.dbl-hub .pager{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:30px 0 10px}'
		. '.dbl-hub .pager .page-numbers{min-width:42px;height:42px;border-radius:10px;border:1px solid #e3dccd;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--ink);padding:0 12px;text-decoration:none}'
		. '.dbl-hub .pager .current{background:var(--ink);color:var(--g2);border-color:var(--ink)}.dbl-hub .pager .dots{border:0;background:none}'
		. '.dbl-hub .help{max-width:1152px;margin:30px auto 48px;background:#fff;border:1px solid #ece6da;border-radius:18px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}'
		. '.dbl-hub .help b{font-size:19px;color:var(--ink)}.dbl-hub .help span{display:block;font-size:15px;color:var(--tx);margin-top:4px}'
		. '.dbl-hub .help .bt{display:flex;gap:10px}.dbl-hub .help a{height:46px;padding:0 20px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;font-weight:800;text-decoration:none}'
		. '.dbl-hub .help .ph{background:var(--ink);color:var(--g2)}.dbl-hub .help .wa{border:1.5px solid #25d366;color:#128c4b}.dbl-hub .help .wa svg{width:18px;height:18px}'
		. '@media (max-width:1024px){.dbl-hub .guides{grid-template-columns:1fr 1fr}.dbl-hub .grid{grid-template-columns:1fr 1fr}}'
		. '@media (max-width:767px){.dbl-hub .hero{padding:30px 16px 28px}.dbl-hub h1{font-size:30px}.dbl-hub h1 small{font-size:16px}.dbl-hub .sub{font-size:15.5px;margin-bottom:18px}'
		. '.dbl-hub .search input{padding:14px;font-size:15px}.dbl-hub .search button{padding:0 18px}'
		. '.dbl-hub .chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;margin-inline:-16px;padding-inline:16px;scrollbar-width:none}.dbl-hub .chips::-webkit-scrollbar{display:none}'
		. '.dbl-hub .sec{padding:28px 16px 4px}.dbl-hub h2{font-size:22px}.dbl-hub .guides{gap:10px}.dbl-hub .guide{padding:14px}.dbl-hub .guide b{font-size:15.5px}.dbl-hub .guide span{font-size:13.5px}'
		. '.dbl-hub .grid{grid-template-columns:1fr;gap:16px}.dbl-hub .help{margin:20px 16px 36px;padding:18px}.dbl-hub .help .bt{width:100%}.dbl-hub .help a{flex:1;justify-content:center}}';
}

function dabul_hub_card($id, $eager) {
	$link = get_permalink($id);
	$cat = 'מקרקעין ונדל״ן';
	foreach ((array) get_the_category($id) as $c) { if ((int) $c->term_id !== 1) { $cat = $c->name; break; } }
	$img = get_the_post_thumbnail($id, 'medium_large', array('alt' => '', 'loading' => $eager ? 'eager' : 'lazy', 'decoding' => 'async', 'sizes' => '(max-width:767px) 100vw, 380px'));
	$ex = has_excerpt($id) ? get_the_excerpt($id) : wp_trim_words(wp_strip_all_tags(strip_shortcodes(get_post_field('post_content', $id))), 26, '…');
	$ex = trim(preg_replace('/\s+/u', ' ', wp_strip_all_tags($ex)));
	return '<article class="post"><div class="im">' . $img . '</div><div class="bd"><span class="cat">' . esc_html($cat) . '</span>'
		. '<h3><a href="' . esc_url($link) . '">' . esc_html(get_the_title($id)) . '</a></h3><p>' . esc_html(mb_substr($ex, 0, 170)) . '</p>'
		. '<div class="ft"><span>' . esc_html(get_the_date('j בF Y', $id)) . '</span><b aria-hidden="true">לקריאה ←</b></div></div></article>';
}

function dabul_hub_html() {
	global $wp_query;
	$base  = get_permalink((int) get_option('page_for_posts'));
	$paged = max(1, (int) get_query_var('paged'));
	$f     = dabul_hub_filter();
	$out   = '<style id="dbl-hub-css">' . dabul_hub_css() . '</style><div class="dbl-hub">';
	// hero
	$out .= '<div class="hero"><div class="in"><div class="crumb"><a href="' . esc_url(home_url('/')) . '">דף הבית</a> / ' . ($f ? '<a href="' . esc_url($base) . '">מידע משפטי</a> / ' . esc_html($f[2]) : 'מידע משפטי') . '</div>';
	$out .= '<h1>מידע משפטי' . ($paged > 1 ? ' <small>עמוד ' . $paged . '</small>' : '') . '</h1>';
	if ($paged === 1 && !$f) $out .= '<p class="sub">מדריכים, הסברים וכלים בנושאי מקרקעין ונדל״ן, בשפה פשוטה. נכתבים ומתעדכנים במשרד עו״ד יקיר דבול.</p>';
	$qv = ($f && $f[0] === 'q') ? $f[1] : '';
	$out .= '<form class="search" role="search" method="get" action="' . esc_url($base) . '"><label class="screen-reader-text" for="dbl-hub-q">חיפוש במידע המשפטי</label>'
		. '<input id="dbl-hub-q" type="search" name="q" value="' . esc_attr($qv) . '" placeholder="חיפוש: מס שבח, הערת אזהרה, פינוי בינוי..."><button type="submit">חיפוש</button></form>';
	$out .= '<nav class="chips" aria-label="נושאים">';
	foreach (dabul_hub_topics() as $k => $t) {
		$on = ($f && $f[0] === 't' && $f[1] === $k);
		$out .= '<a class="chip' . ($on ? ' on' : '') . '" href="' . esc_url($on ? $base : add_query_arg('t', $k, $base)) . '"' . ($on ? ' aria-current="true"' : '') . '>' . esc_html($t[0]) . '</a>';
	}
	$out .= '</nav></div></div>';
	// main guides (first page only)
	if ($paged === 1 && !$f) {
		$guides = array(
			array('רכישת דירה יד שנייה', 'המדריך המלא, משלב הבדיקות ועד הרישום', home_url('/%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9E%D7%A7%D7%99%D7%A3-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%99%D7%93-%D7%A9%D7%A0%D7%99%D7%94/')),
			array('מכירת דירה', 'השלבים המשפטיים ותכנון המס', get_permalink(3916)),
			array('מיסוי מקרקעין', 'מס רכישה, מס שבח והיטל השבחה', get_permalink(2721)),
			array('פינוי בינוי ותמ״א 38', 'מה חשוב לדיירים לפני שחותמים', get_permalink(35)),
		);
		$out .= '<section class="sec"><h2>מדריכים מרכזיים</h2><div class="guides">';
		foreach ($guides as $g) if ($g[2]) $out .= '<a class="guide" href="' . esc_url($g[2]) . '"><b>' . esc_html($g[0]) . '</b><span>' . esc_html($g[1]) . '</span><i aria-hidden="true">למדריך ←</i></a>';
		$out .= '</div></section>';
	}
	// articles
	$title = $f ? ($f[0] === 't' ? 'מאמרים בנושא ' . $f[2] : 'תוצאות חיפוש: ' . $f[2]) : ($paged > 1 ? 'מאמרים' : 'מאמרים אחרונים');
	$out .= '<section class="sec"><h2>' . esc_html($title) . '</h2>';
	if (have_posts()) {
		$out .= '<div class="grid">';
		$i = 0;
		while (have_posts()) { the_post(); $out .= dabul_hub_card(get_the_ID(), $i < 3 && $paged === 1); $i++; }
		$out .= '</div>';
		wp_reset_postdata();
		$links = paginate_links(array('total' => (int) $wp_query->max_num_pages, 'current' => $paged, 'mid_size' => 1, 'prev_text' => '→<span class="screen-reader-text"> הקודם</span>', 'next_text' => '←<span class="screen-reader-text"> הבא</span>'));
		if ($links) $out .= '<nav class="pager" aria-label="עמודים">' . $links . '</nav>';
	} else {
		$out .= '<div class="none">לא מצאנו מאמרים שמתאימים לחיפוש. אפשר לנסות מילה אחרת, או <a href="' . esc_url($base) . '">לחזור לכל המאמרים</a>.</div>';
	}
	$out .= '</section>';
	$out .= '<div class="help"><div><b>יש לכם שאלה על עסקה מסוימת?</b><span>מדברים איתנו ישירות, בלי טפסים.</span></div><div class="bt"><a class="ph" href="tel:098613413">09-8613413</a><a class="wa" href="' . esc_url(dabul_ah_wa()) . '" target="_blank" rel="noopener">' . dabul_ah_icon('wa') . ' וואטסאפ</a></div></div>';
	return $out . '</div>';
}

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || !is_home() || is_front_page()) return;
	get_header();
	echo '<main id="content" class="site-main dbl-hub-main">' . dabul_hub_html() . '</main>';
	get_footer();
	exit;
}, 50);
