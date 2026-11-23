/* dabul: the home hero on the computer, new version (Yakir approved the sketch on 23.11.2026 10:10: "אני מאשר את השינויים, אפשר לעלות את זה").
   Name, "עורך דין מקרקעין" in gold, one line, a gold button and a phone button, three numbers (5.0 and the stars,
   +100 deals a year, 5 Bar committees), the committees line and a link to the Netanya page. The portrait is a little
   bigger and fades at the bottom, with the LB10 seal on it. The form becomes one wide light box across the bottom of
   the hero, over the bottom of the portrait. On the home page the WhatsApp button and the Google reviews badge stay
   above the form.
   Only from 1025px wide (tablets and phones keep what they have; phones use snippet 122). The old parts of the text
   column stay in the page and are hidden; the old h1 stays for search engines, hidden from the eye.
   To undo: deactivate this snippet. */

add_action('wp_head', function () {
	if (is_admin() || !is_front_page()) return;
	echo <<<'CSS'
<style id="dbl-dsk2-css">
#dbl-dsk2,.dbl-dsk2-medal{display:none}
@media (min-width:1025px){
.elementor-element-6d16458>.elementor-element-464d8c8,.elementor-element-6d16458>.elementor-element-a3067eb,.elementor-element-6d16458>.elementor-element-d1b0c7a,.elementor-element-6d16458>.elementor-element-0b5de49{display:none!important}
.elementor-element-6d16458>.elementor-element-6bb6c07{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
#dbl-dsk2{direction:rtl;color:#fff;font-family:"Noto Local",Arial,sans-serif;display:flex;flex-direction:column;align-items:flex-start;max-width:640px;margin-inline-start:auto;width:100%}
#dbl-dsk2 .n{margin:0;font-size:84px;line-height:1;font-weight:800;color:#fff;letter-spacing:-1px}
#dbl-dsk2 .t{margin:6px 0 0;font-size:50px;line-height:1.1;font-weight:800;background:linear-gradient(180deg,#F0DCA6,#C5A25A);-webkit-background-clip:text;background-clip:text;color:transparent}
#dbl-dsk2 p.l{margin:22px 0 0;font-size:20px;line-height:1.65;color:rgba(255,255,255,.88);max-width:600px}
#dbl-dsk2 .b{display:flex;gap:14px;margin-top:28px;flex-wrap:wrap;align-items:center}
#dbl-dsk2 .b a{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:58px;padding:0 26px;border-radius:10px;font-size:19px;font-weight:800;text-decoration:none}
#dbl-dsk2 .b .g{background:linear-gradient(180deg,#E7CD96,#C5A25A);color:#141414!important;box-shadow:0 10px 28px rgba(197,162,90,.35)}
#dbl-dsk2 .b .o{border:1.5px solid rgba(231,205,150,.75);color:#fff!important;background:rgba(20,20,20,.35);direction:ltr}
#dbl-dsk2 .hr{width:100%;height:1px;background:linear-gradient(90deg,rgba(197,162,90,0),rgba(197,162,90,.6));margin:34px 0 22px}
#dbl-dsk2 .s{display:flex;width:100%}
#dbl-dsk2 .s>div{padding:0 26px;border-inline-start:1px solid rgba(255,255,255,.18);display:flex;flex-direction:column;gap:4px}
#dbl-dsk2 .s>div:first-child{padding-inline-start:0;border:0}
#dbl-dsk2 .s b{font-size:38px;line-height:1;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;direction:ltr;justify-content:flex-end}
#dbl-dsk2 .s>div:first-child b{direction:rtl;justify-content:flex-start}
#dbl-dsk2 .s b i{font-style:normal;color:#F4B400;font-size:22px;letter-spacing:1px}
#dbl-dsk2 .s span{font-size:15px;color:rgba(255,255,255,.72)}
#dbl-dsk2 .f{margin-top:16px;font-size:14.5px;line-height:1.6;color:rgba(255,255,255,.66);max-width:600px}
#dbl-dsk2 .loc{margin-top:4px;font-size:14.5px;line-height:1.6;color:rgba(255,255,255,.66)}
#dbl-dsk2 .loc a{color:#E7CD96!important;font-weight:700;text-decoration:underline;text-underline-offset:4px}
img.wp-image-4838{transform:scale(1.06);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(180deg,#000 72%,transparent 90%);mask-image:linear-gradient(180deg,#000 72%,transparent 90%)}
.dbl-dsk2-medal{display:flex;position:absolute;z-index:9!important;left:calc(50% + 89px);bottom:271px;width:156px;height:156px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a2a,#0d0d0d 70%);border:5px solid #C5A25A;box-shadow:0 0 0 3px #E7CD96 inset,0 18px 40px rgba(0,0,0,.55);flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;font-family:"Noto Local",Arial,sans-serif;direction:rtl;line-height:1.15;box-sizing:border-box}
.dbl-dsk2-medal .a{font-size:11.5px;color:#E7CD96;font-weight:700}
.dbl-dsk2-medal .a2{font-size:13px;color:#E7CD96;font-weight:800}
.dbl-dsk2-medal .bb{font-size:30px;font-weight:900;line-height:1;margin:3px 0 2px;direction:ltr}
.dbl-dsk2-medal .c{font-size:12.5px;font-weight:800}
.dbl-dsk2-medal .d{font-size:10px;color:#E7CD96;margin-top:2px}
.dbl-dsk2-medal:after{content:"";position:absolute;bottom:-34px;left:50%;transform:translateX(-50%);width:44px;height:40px;background:linear-gradient(90deg,#A88A4C 0 45%,transparent 45% 55%,#A88A4C 55%);clip-path:polygon(0 0,100% 0,100% 100%,75% 80%,50% 100%,25% 80%,0 100%);z-index:-1}
.elementor-1112 .elementor-element.elementor-element-6d16458{padding-top:60px!important}
.elementor-element-3b0ce31{position:static!important;padding-bottom:330px!important}
.elementor-element-94c4b61{position:absolute!important;z-index:8!important;left:50%;bottom:34px;transform:translateX(-50%);width:min(1400px,calc(100% - 48px))!important;max-width:none!important;margin:0!important;border-radius:22px!important;background:linear-gradient(#F8F8FD 67%,#fff 100%)!important;border:1.5px solid rgba(197,162,90,.75)!important;box-shadow:0 24px 60px rgba(0,0,0,.35)!important;padding:30px 48px 22px!important}
.elementor-element-94c4b61>*{width:100%;max-width:none!important}
.elementor-element-844bd60,.elementor-element-094a351{z-index:30!important}
}
</style>
CSS;
	echo "\n";
}, 4);

// outer buffer (priority 4), so it also sees the page after the phone snippets
add_action('template_redirect', function () {
	if (is_admin() || !is_front_page()) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$netanya = 'https://dabullaw.co.il/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/';
		$contact = 'https://dabullaw.co.il/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/';
		$block = '<div id="dbl-dsk2"><div class="n">יקיר דבול</div><div class="t">עורך דין מקרקעין</div>'
			. '<p class="l">מלווה קונים, מוכרים ובעלי דירות בעסקאות נדל״ן ובפרויקטים של פינוי בינוי ותמ״א 38, מהבדיקה הראשונה ועד רישום הזכויות בטאבו.</p>'
			. '<div class="b"><a class="g" href="' . $contact . '">לתיאום שיחת ייעוץ <span aria-hidden="true">←</span></a>'
			. '<a class="o" href="tel:098613413"><svg width="18" height="18" viewBox="0 0 24 24" fill="#E7CD96" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg> 09-8613413</a></div>'
			. '<div class="hr"></div>'
			. '<div class="s"><div><b>5.0 <i aria-hidden="true">★★★★★</i></b><span>137 ביקורות בגוגל</span></div><div><b>+100</b><span>עסקאות מקרקעין בשנה</span></div><div><b>5</b><span>ועדות בלשכת עורכי הדין</span></div></div>'
			. '<div class="f">חבר בוועדות קניין ומקרקעין והתחדשות עירונית בלשכת עורכי הדין.</div>'
			. '<div class="loc"><a href="' . $netanya . '">עורך דין מקרקעין בנתניה</a> <span style="color:#E7CD96" aria-hidden="true">←</span></div></div>';
		$p = strpos($html, '<div class="elementor-element elementor-element-6bb6c07 ');
		if ($p !== false) $html = substr($html, 0, $p) . $block . substr($html, $p);
		$medal = '<div class="dbl-dsk2-medal" aria-label="דירוג משרדים מובילים LB10 2026 מקרקעין, לובאז"><div class="a">דירוג משרדים</div><div class="a2">מובילים</div><div class="bb">LB10</div><div class="c">2026 · מקרקעין</div><div class="d">לובאז</div></div>';
		$q = strpos($html, '<div class="elementor-element elementor-element-2c91460 ');
		if ($q !== false) $html = substr($html, 0, $q) . $medal . substr($html, $q);
		return $html;
	});
}, 4);

// once: WP Rocket's saved copy of the home page is renewed
add_action('init', function () {
	if (get_option('dbl_dsk2_purged3') === '1' || !function_exists('rocket_clean_home')) return;
	update_option('dbl_dsk2_purged3', '1', false);
	rocket_clean_home();
	if (function_exists('rocket_clean_post')) rocket_clean_post((int) get_option('page_on_front'));
}, 99);
