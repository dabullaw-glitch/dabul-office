// dabul: online legal services pages (approved by Yakir 11.10.2026).
// 1. Search titles and descriptions (Yoast) for /online/ and its service pages.
// 2. The thank-you page (/online/thanks/) is hidden from Google.
// 3. On every page of the site: remembers where the visitor came from (Google, ads, Facebook, an article...), in this
//    browser only (localStorage "dabul_src_v1"), so each online order records its source for the "מכירות אונליין" report.
// 4. The checklist page (/checklist/) gets a box that leads to the apartment check service.
// The pages themselves are ordinary WordPress pages (content = the page HTML from github dabul-office media/online-pub).
// Undo: deactivate this snippet (the pages stay, without these extras).
if (!function_exists('dabul_online_slug')) {
	function dabul_online_map() {
		return array(
		'online' => array('שירותים משפטיים אונליין במחיר קבוע | יקיר דבול - משרד עורכי דין', 'בדיקת דירה, ייעוץ בזום, הקמת חברה, רישום בטאבו, צו ירושה, ייפוי כוח מתמשך ובקשות בהוצאה לפועל. מזמינים באתר, רואים מחיר מראש, ועורך הדין מטפל.'),
		'apartment-check' => array('בדיקת דירה לפני קנייה אונליין | יקיר דבול - משרד עורכי דין', 'בודקים את המסמכים הרשמיים של הדירה לפני שמציעים מחיר: טאבו, בית משותף, היתרים, תכנון ומס רכישה. החל מ־990 ₪ + מע״מ.'),
		'zoom-consultation' => array('ייעוץ משפטי בזום אונליין | יקיר דבול - משרד עורכי דין', 'פגישת ייעוץ מקוונת עם עו״ד יקיר דבול. בוחרים מועד, משלמים, ומקבלים קישור לזום. החל מ־450 ₪ + מע״מ.'),
		'company-registration' => array('הקמת חברה אונליין | יקיר דבול - משרד עורכי דין', 'חברת יחיד או חברה עם שותפים: תקנון, מסמכי ההתאגדות והגשה מקוונת לרשם החברות. החל מ־1,500 ₪ + מע״מ.'),
		'companies-registrar-changes' => array('שינויים ברשם החברות אונליין | יקיר דבול - משרד עורכי דין', 'העברת מניות, דירקטורים, כתובת, שם החברה ודוח שנתי. מחיר קבוע לכל פעולה. החל מ־350 ₪ + מע״מ.'),
		'tabu-registration' => array('רישומים בטאבו אונליין | יקיר דבול - משרד עורכי דין', 'רישום או מחיקה של הערת אזהרה, ורישום משכנתא. הכנה, אימות חתימות והגשה מקוונת. החל מ־750 ₪ + מע״מ.'),
		'inheritance-order' => array('צו ירושה או צו קיום צוואה אונליין | יקיר דבול - משרד עורכי דין', 'בקשה לרשם לענייני ירושה, מההכנה ועד מתן הצו. אפשר גם רישום הדירה בטאבו על שם היורשים. החל מ־1,500 ₪ + מע״מ.'),
		'enduring-power-of-attorney' => array('ייפוי כוח מתמשך אונליין | יקיר דבול - משרד עורכי דין', 'קובעים מראש מי יחליט בשבילכם אם לא תוכלו. טופס דיגיטלי, פגישה אחת לחתימה, והפקדה אצל האפוטרופוס הכללי. החל מ־2,600 ₪ + מע״מ.'),
		'consolidation-of-files' => array('בקשה לאיחוד תיקים אונליין | יקיר דבול - משרד עורכי דין', 'כל תיקי ההוצאה לפועל בתיק אחד, עם תשלום חודשי אחד. הכנת הבקשה והשאלון, והגשה מקוונת. החל מ־1,200 ₪ + מע״מ.'),
		'payment-order' => array('בקשה לצו חיוב בתשלומים אונליין | יקיר דבול - משרד עורכי דין', 'בקשה לשלם את החוב בתשלומים חודשיים לפי היכולת. הכנת הבקשה והשאלון, והגשה מקוונת. החל מ־900 ₪ + מע״מ.'),
		'thanks' => array('תודה על ההזמנה | יקיר דבול - משרד עורכי דין', '')
		);
	}
	function dabul_online_slug() {
		if (!is_page()) return '';
		$p = get_queried_object();
		if (!$p || empty($p->post_name)) return '';
		if ($p->post_name === 'online' && !$p->post_parent) return 'online';
		$par = $p->post_parent ? get_post($p->post_parent) : null;
		return ($par && $par->post_name === 'online') ? $p->post_name : '';
	}
	$dabul_t = function ($t) { $s = dabul_online_slug(); $m = dabul_online_map(); return ($s && isset($m[$s]) && $m[$s][0] !== '') ? $m[$s][0] : $t; };
	$dabul_d = function ($d) { $s = dabul_online_slug(); $m = dabul_online_map(); return ($s && isset($m[$s]) && $m[$s][1] !== '') ? $m[$s][1] : $d; };
	add_filter('wpseo_title', $dabul_t, 20);
	add_filter('wpseo_opengraph_title', $dabul_t, 20);
	add_filter('wpseo_metadesc', $dabul_d, 20);
	add_filter('wpseo_opengraph_desc', $dabul_d, 20);
	add_filter('wpseo_robots', function ($r) { return dabul_online_slug() === 'thanks' ? 'noindex, follow' : $r; }, 20);
	add_filter('wpseo_exclude_from_sitemap_by_post_ids', function ($ids) {
		$p = get_page_by_path('online/thanks');
		if ($p) $ids[] = $p->ID;
		return $ids;
	});
	add_action('wp_head', function () {
		if (is_admin()) return;
		echo '<script nowprocket data-no-optimize="1" data-no-minify="1">' . '(function(){var K=\'dabul_src_v1\',o={};try{o=JSON.parse(localStorage.getItem(K)||\'{}\')||{}}catch(e){o={}}var q=new URLSearchParams(location.search),r=document.referrer||\'\',x=r&&r.indexOf(location.host)<0,u=[\'utm_source\',\'utm_medium\',\'utm_campaign\',\'gclid\',\'fbclid\'].some(function(k){return q.get(k)});if(u||x||!o.first){var v={ref:x?r.slice(0,200):\'\',landing:location.href.split(\'#\')[0].slice(0,300),at:new Date().toISOString()};[\'utm_source\',\'utm_medium\',\'utm_campaign\',\'utm_term\',\'utm_content\',\'gclid\',\'fbclid\'].forEach(function(k){if(q.get(k))v[k]=q.get(k).slice(0,120)});var d=o.first&&o.first.at&&(Date.now()-Date.parse(o.first.at))<7776e6;if(!d)o.first=v;if(u||x)o.last=v}if(r&&!x)o.from=r.split(\'#\')[0].slice(0,300);try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}})();' . '</script>' . "\n";
	}, 3);
	// on the service pages, the page's own order bar (price + "להזמנה") replaces the site's call/WhatsApp bar while it shows,
	// so the two bars never sit on top of each other on the phone
	add_action('wp_head', function () {
		if (is_admin() || dabul_online_slug() === '') return;
		echo '<style id="dbl-onl-bars">#dbl-cbar{transition:transform .25s,opacity .25s}body:has(.dz .mbar.on) #dbl-cbar{transform:translateY(160%);opacity:0;pointer-events:none}.dz .mbar{z-index:9991}</style>' . "\n";
	}, 40);
	add_filter('the_content', function ($c) {
		if (is_admin() || !is_page('checklist') || !in_the_loop() || !is_main_query()) return $c;
		$p = get_page_by_path('online');
		if (!$p || $p->post_status !== 'publish') return $c;
		return $c . '<div class="dbl-onl" dir="rtl"><style>.dbl-onl{max-width:860px;margin:0 auto 56px;padding:0 16px;font-family:inherit}.dbl-onl .in{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:22px 24px;border-radius:20px;background:linear-gradient(120deg,#1b1e26,#111318);border:1px solid rgba(201,168,92,.45);box-shadow:0 26px 50px -34px rgba(17,19,24,.8);color:#fff}.dbl-onl .ic{flex:none;width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(145deg,#f1ddb0,#c9a85c);color:#16161a}.dbl-onl .ic svg{width:27px;height:27px}.dbl-onl .tx{flex:1 1 280px;min-width:0}.dbl-onl .tx b{display:block;font-size:20px;line-height:1.3;margin:0 0 4px;color:#fff}.dbl-onl .tx span{display:block;font-size:15.5px;line-height:1.6;color:#d6d1c6}.dbl-onl .go{display:inline-flex;align-items:center;gap:10px;white-space:nowrap;padding:12px 22px;border-radius:999px;font-weight:700;font-size:16px;color:#16161a!important;text-decoration:none!important;background:linear-gradient(180deg,#f1ddb0,#c9a85c);box-shadow:0 14px 26px -16px rgba(201,168,92,1);transition:transform .2s}.dbl-onl .go:hover{transform:translateY(-2px)}.dbl-onl .all{display:block;text-align:center;margin-top:12px;font-size:15px;color:#8c7646!important;text-decoration:underline!important}@media (max-width:600px){.dbl-onl .in{flex-direction:column;text-align:center}.dbl-onl .go{width:100%;justify-content:center}}</style><div class="in"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/><path d="M8.6 11.2l1.6 1.6 3.2-3.4"/></svg></span><div class="tx"><b>רוצים שעורך דין יבדוק את הדירה בשבילכם?</b><span>בדיקת דירה לפני קנייה: נסח טאבו, בית משותף, היתרים, תכנון ומס רכישה. תשובה ברורה למייל תוך 2 ימי עבודה. 990 ₪ + מע״מ.</span></div><a class="go" href="https://dabullaw.co.il/online/apartment-check/">לפרטים ולהזמנה</a></div><a class="all" href="https://dabullaw.co.il/online/">לכל השירותים המשפטיים אונליין</a></div>';
	}, 30);
	// one-time cache purge when the pages went live, so the menu item and the footer button show on every page
	add_action('init', function () {
		if (get_option('dabul_online_purged') === '20261011a') return;
		update_option('dabul_online_purged', '20261011a', false);
		if (function_exists('rocket_clean_domain')) rocket_clean_domain();
	});
}
