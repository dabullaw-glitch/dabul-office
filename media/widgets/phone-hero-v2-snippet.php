/* dabul: the home hero on the phone, new version (Yakir approved the sketch on 23.11.2026: "במובייל בסדר גמור ... אפשר להעלות את זה").
   Name, "עורך דין מקרקעין" in gold, one line, the portrait that fades into the page with a thin gold line and the LB10
   seal, a gold button and a phone button, three numbers (Google reviews, deals a year, Bar committees), the committees
   line and a link to the Netanya page. On the home page on phones the bottom bar (התקשרו עכשיו / תיאום ייעוץ) is replaced
   by one round phone button at the bottom right. The form button on the home page says "תחזרו אלי בהקדם!".
   Only the home page; the computer hero does not change (its new design is still waiting for Yakir's approval).
   The old phone hero (snippet 25) stays in the page and is hidden. To undo: deactivate this snippet. */

add_action('wp_head', function () {
	if (is_admin() || !is_front_page()) return;
	echo '<link rel="preload" as="image" href="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-lawyer.webp" media="(max-width:767px)" fetchpriority="high">' . "\n";
	echo <<<'CSS'
<style id="dbl-ph2-css">
#dbl-ph2{display:none}#dbl-pfab{display:none}
@media (max-width:767px){
.dbl-ph>.top,.dbl-ph>ul,.dbl-ph>.dbl-loc{display:none!important}
#dbl-cbar{display:none!important}
#dbl-ph2{direction:rtl;font-family:"Noto Local",Arial,sans-serif;color:#fff;display:flex;flex-direction:column;align-items:stretch;padding:6px 2px 4px}
#dbl-ph2 *{box-sizing:border-box}
#dbl-ph2 .n{margin:0;font-size:50px;line-height:1.02;font-weight:800;color:#fff;letter-spacing:-.5px}
#dbl-ph2 .t{margin-top:4px;font-size:32px;line-height:1.1;font-weight:800;background:linear-gradient(180deg,#F0DCA6,#C5A25A);-webkit-background-clip:text;background-clip:text;color:transparent}
#dbl-ph2 p.l{margin:14px 0 0;font-size:16.5px;line-height:1.7;color:rgba(255,255,255,.88)}
#dbl-ph2 .ph{position:relative;margin:10px -22px 0;height:338px;overflow:hidden}
#dbl-ph2 .ph:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 55% at 50% 42%,rgba(197,162,90,.16),rgba(197,162,90,0) 70%);z-index:0}
#dbl-ph2 .ph img{position:absolute;left:50%;top:0;transform:translateX(-50%);width:284px;height:auto;max-width:none;z-index:1;-webkit-mask-image:linear-gradient(180deg,#000 195px,rgba(0,0,0,.55) 272px,transparent 336px),linear-gradient(90deg,transparent 0,#000 20%,#000 80%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(180deg,#000 195px,rgba(0,0,0,.55) 272px,transparent 336px),linear-gradient(90deg,transparent 0,#000 20%,#000 80%,transparent 100%);mask-composite:intersect}
#dbl-ph2 .ph:after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.5px;z-index:2;background:linear-gradient(90deg,rgba(197,162,90,0),rgba(231,205,150,.75) 50%,rgba(197,162,90,0))}
#dbl-ph2 .md{position:absolute;right:30px;bottom:34px;width:74px;height:74px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a2a,#0d0d0d 70%);border:3px solid #C5A25A;box-shadow:0 0 0 2px #E7CD96 inset,0 10px 24px rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.1;z-index:3;color:#fff}
#dbl-ph2 .md .a{font-size:6.5px;color:#E7CD96;font-weight:700}#dbl-ph2 .md .a2{font-size:7.5px;color:#E7CD96;font-weight:800}#dbl-ph2 .md .bb{font-size:15px;font-weight:900;margin:1px 0}#dbl-ph2 .md .c{font-size:6.5px;font-weight:800}
#dbl-ph2 .md:after{content:"";position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);width:22px;height:18px;background:linear-gradient(90deg,#A88A4C 0 45%,transparent 45% 55%,#A88A4C 55%);clip-path:polygon(0 0,100% 0,100% 100%,75% 80%,50% 100%,25% 80%,0 100%);z-index:-1}
#dbl-ph2 .btn{display:flex;align-items:center;justify-content:center;gap:10px;height:58px;border-radius:10px;font-size:19px;font-weight:800;text-decoration:none;margin-top:18px}
#dbl-ph2 .g{background:linear-gradient(180deg,#E7CD96,#C5A25A);color:#141414!important;box-shadow:0 10px 26px rgba(197,162,90,.3)}
#dbl-ph2 .o{border:1.5px solid rgba(231,205,150,.7);color:#fff!important;margin-top:12px;direction:ltr}
#dbl-ph2 .hr{height:1px;background:rgba(255,255,255,.16);margin:24px 0 18px}
#dbl-ph2 .s{display:grid;grid-template-columns:1fr 1fr 1fr}
#dbl-ph2 .s>div{display:flex;flex-direction:column;gap:6px;padding:0 10px;border-inline-start:1px solid rgba(255,255,255,.16)}
#dbl-ph2 .s>div:first-child{border:0;padding-inline-start:0}
#dbl-ph2 .s b{font-size:28px;line-height:1;font-weight:800;direction:ltr;text-align:right}
#dbl-ph2 .s em{font-style:normal;color:#F4B400;font-size:11px;letter-spacing:1px}
#dbl-ph2 .s span{font-size:12.5px;line-height:1.35;color:rgba(255,255,255,.72)}
#dbl-ph2 .f{margin-top:16px;font-size:13.2px;line-height:1.6;color:rgba(255,255,255,.66)}
#dbl-ph2 .loc{margin-top:4px;font-size:13.2px;line-height:1.6;color:rgba(255,255,255,.66)}
#dbl-ph2 .loc a{color:#E7CD96!important;font-weight:700;text-decoration:underline;text-underline-offset:4px;white-space:nowrap}
#dbl-pfab{display:flex;position:fixed;right:18px;bottom:22px;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#22325a,#0f1a33 72%);border:2px solid #C5A25A;box-shadow:0 0 0 6px rgba(197,162,90,.18),0 10px 26px rgba(0,0,0,.5);align-items:center;justify-content:center;z-index:99990}
#dbl-pfab svg{display:block}
}
</style>
CSS;
	echo "\n";
}, 4);

// outer buffer (priority 5, before snippet 25 starts its own at 6), so it runs after the old phone hero is in the page
add_action('template_redirect', function () {
	if (is_admin() || !is_front_page()) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$netanya = 'https://dabullaw.co.il/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/';
		$contact = 'https://dabullaw.co.il/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/';
		$block = '<div id="dbl-ph2"><div class="n">יקיר דבול</div><div class="t">עורך דין מקרקעין</div>'
			. '<p class="l">מלווה קונים, מוכרים ובעלי דירות בעסקאות נדל״ן ובפרויקטים של פינוי בינוי ותמ״א 38, מהבדיקה הראשונה ועד רישום הזכויות בטאבו.</p>'
			. '<div class="ph"><img src="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-lawyer.webp" width="596" height="1188" alt="עו״ד יקיר דבול, עורך דין מקרקעין" fetchpriority="high" class="skip-lazy" data-no-lazy="1">'
			. '<div class="md" aria-label="דירוג משרדים מובילים LB10 2026 מקרקעין"><div class="a">דירוג משרדים</div><div class="a2">מובילים</div><div class="bb">LB10</div><div class="c">2026 · מקרקעין</div></div></div>'
			. '<a class="btn g" href="' . $contact . '">לתיאום שיחת ייעוץ <span aria-hidden="true">←</span></a>'
			. '<a class="btn o" href="tel:098613413"><svg width="18" height="18" viewBox="0 0 24 24" fill="#E7CD96" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg> 09-8613413</a>'
			. '<div class="hr"></div>'
			. '<div class="s"><div><b>5.0</b><em aria-hidden="true">★★★★★</em><span>137 ביקורות בגוגל</span></div><div><b>+100</b><span>עסקאות מקרקעין בשנה</span></div><div><b>5</b><span>ועדות בלשכת עורכי הדין</span></div></div>'
			. '<div class="f">חבר בוועדות קניין ומקרקעין והתחדשות עירונית בלשכת עורכי הדין.</div>'
			. '<div class="loc"><a href="' . $netanya . '">עורך דין מקרקעין בנתניה</a> <span style="color:#E7CD96" aria-hidden="true">←</span></div></div>';
		$p = strpos($html, '<div class="dbl-ph">');
		if ($p !== false) {
			$p += strlen('<div class="dbl-ph">');
			$html = substr($html, 0, $p) . $block . substr($html, $p);
			// the old round portrait of the old phone hero is not loaded any more
			$html = preg_replace('~<link rel="preload" as="image" href="[^"]*yakir-dabul-portrait-300x300\.webp" media="\(max-width:767px\)" fetchpriority="high">\s*~', '', $html, 1);
		}
		// one round phone button at the bottom right (phones only, by the CSS above)
		$fab = '<a id="dbl-pfab" href="tel:098613413" aria-label="התקשרו למשרד 09-8613413"><svg width="28" height="28" viewBox="2.65 1.35 19 19" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3.5 5.5a2 2 0 0 1 2-2z"/><path d="M14.5 3.2a6.5 6.5 0 0 1 6.3 6.3"/><path d="M14.3 6.4a3.4 3.4 0 0 1 3.3 3.3"/></svg></a>';
		$b = strripos($html, '</body>');
		if ($b !== false) $html = substr($html, 0, $b) . $fab . substr($html, $b);
		// the form button on the home page (Yakir 23.11.2026)
		$html = str_replace('כן, תחזרו אלי', 'תחזרו אלי בהקדם!', $html);
		return $html;
	});
}, 5);

// once: WP Rocket's saved copy of the home page is renewed so the new phone hero shows
add_action('init', function () {
	if (get_option('dbl_ph2_purged') === '1' || !function_exists('rocket_clean_home')) return;
	update_option('dbl_ph2_purged', '1', false);
	rocket_clean_home();
	if (function_exists('rocket_clean_post')) rocket_clean_post((int) get_option('page_on_front'));
}, 99);
