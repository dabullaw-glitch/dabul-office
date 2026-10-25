/* dabul: טופס צד נצמד בעמוד "עורך דין מקרקעין בנתניה" (פוסט 3715), במחשב בלבד. יקיר אישר את הסקיצה ב־25.10.2026,
   בלי השורה הקטנה של הדירוג מתחת לטופס, ועם שורת ההסכמה למדיניות הפרטיות כמו בכל טופס באתר.
   משתמש בטופס של סניפט 78 (dabul_lf_*): אותו נוסח הסכמה, אותה בדיקה, אותה שליחה למערכת המשרד ולמייל, ומעבר לעמוד התודה.
   מוצג רק ברוחב 1280 ומעלה; תוכן העמוד זז ימינה כדי שהטופס לא יסתיר אותו. בטלפון ובמחשב קטן אין שינוי.
   ביטול: לכבות את הסניפט. */
add_action('wp_footer', function () {
	if (is_admin() || !is_single(defined('DNT_POST') ? DNT_POST : 3715)) return;
	if (!function_exists('dabul_lf_consent') || !function_exists('dabul_lf_js') || !function_exists('dabul_lf_topics')) return;
	add_action('wp_footer', 'dabul_lf_js', 99);
	echo function_exists('dabul_lf_css') ? dabul_lf_css() : '';
	echo '<style id="dsf-css">#dsf{display:none}'
		. '@media (min-width:1280px){'
		. '.dnt .in.in{margin-left:max(380px, calc((100vw - 1080px)/2))!important;margin-right:max(28px, calc((100vw - 1080px)/2 - 352px))!important;max-width:1080px}'
		. '#dsf{display:block;position:fixed;left:28px;top:118px;width:330px;max-height:calc(100vh - 140px);overflow:auto;z-index:50;background:#fff;border:1px solid #e6e1d6;border-top:4px solid #c5a25a;border-radius:16px;box-shadow:0 14px 40px rgba(20,20,20,.14);padding:18px 18px 14px}'
		. 'body.admin-bar #dsf{top:150px;max-height:calc(100vh - 172px)}'
		. '#dsf h3{margin:0 0 4px;font-size:19px;color:#141414;line-height:1.35;font-weight:700}'
		. '#dsf .sub{margin:0 0 12px;font-size:14px;line-height:1.55;color:#6b665c}'
		. '#dsf .f{margin-bottom:10px;gap:4px}#dsf .f label{font-size:13.5px}'
		. '#dsf .f input,#dsf .f select{min-height:44px;padding:9px 12px;font-size:15px}'
		. '#dsf .dlf-consent{font-size:11.5px;line-height:1.5;margin:2px 0 12px}'
		. '#dsf .go{font-size:17px;min-height:48px;padding:12px}'
		. '#dsf .alt{display:flex;justify-content:space-between;margin-top:10px;font-size:14px}'
		. '#dsf .alt a{color:#8c7646;font-weight:700;text-decoration:none}'
		. '}</style>';
	echo '<aside id="dsf" aria-label="השארת פרטים">'
		. '<form class="dlf" data-form="netanya-side" novalidate aria-label="השארת פרטים">'
		. '<h3>מתכננים עסקה בנתניה?</h3><p class="sub">השאירו פרטים, ועו״ד יקיר דבול יחזור אליכם.</p>'
		. '<div class="f"><label for="dsf-n">שם מלא <i>*</i></label><input id="dsf-n" name="name" autocomplete="name" placeholder="השם שלך" required></div>'
		. '<div class="f"><label for="dsf-p">טלפון <i>*</i></label><input id="dsf-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="050-0000000" required></div>'
		. '<div class="f"><label for="dsf-t">במה מדובר?</label>' . dabul_lf_topics('dsf-t') . '</div>'
		. '<div class="hp" aria-hidden="true"><label for="dsf-w">אתר</label><input id="dsf-w" name="website" tabindex="-1" autocomplete="off"></div>'
		. dabul_lf_consent()
		. '<button class="go" type="submit">שליחה</button><p class="msg" role="alert"></p>'
		. '<div class="alt"><a href="tel:098613413" dir="ltr">09-8613413</a><a href="https://wa.me/972505580189" target="_blank" rel="noopener">וואטסאפ</a></div>'
		. '</form></aside>'
		// hidden while the "צריכים סיוע משפטי" band or the site footer is on screen, so it never covers them
		. '<style>#dsf{transition:opacity .25s}#dsf.off{opacity:0;pointer-events:none}</style>'
		. '<script>(function(){var s=document.getElementById("dsf");if(!s||!window.IntersectionObserver)return;var on=new Set();'
		. 'var io=new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?on.add(e.target):on.delete(e.target)});s.classList.toggle("off",on.size>0)});'
		. 'document.querySelectorAll(".dhb,.elementor-location-footer,footer").forEach(function(x){io.observe(x)});})();</script>';
}, 20);
