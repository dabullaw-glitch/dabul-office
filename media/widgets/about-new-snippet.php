/* dabul: the new "הכירו את יקיר דבול" section on the home page (Yakir approved version B on 8.10.2026, round 10).
   All the text that was in the old section stays word for word (only the long dashes became commas).
   The photo card (photo + numbers) is exactly as tall as the text next to it, with 4 gold corners around it,
   and the 3 boxes (experts, full guidance, the vision) are in one row below. On the phone the photo comes first.
   The button "צפו בסרטון היכרות" opens the existing intro video in a window on the page.
   The old Elementor section (c7b857d) is not deleted in Elementor; this code only shows the new one in its place.
   Checked on a preview address (?dblprev=1) and Yakir approved it on 8.10.2026, now live. To undo: deactivate this snippet. */
define('DABUL_AB_LIVE', 1);

function dabul_ab_on() {
	if (defined('DABUL_AB_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_ab_html() {
	$photo = 'https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-about.webp';
	$h = <<<'DBLABHTML'
<section class="dbl-ab h1 u2 u3 a11" id="dbl-about" aria-label="הכירו את יקיר דבול"><div class="sec"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="sub">עורך דין מקרקעין</div><div class="dv"></div></div>
<div class="w"><div class="tx"><p class="lead">יקיר דבול, <a href="https://dabullaw.co.il/%D7%A2%D7%95%D7%A8%D7%9A-%D7%93%D7%99%D7%9F-%D7%9E%D7%A7%D7%A8%D7%A7%D7%A2%D7%99%D7%9F-%D7%91%D7%A0%D7%AA%D7%A0%D7%99%D7%94/">עורך דין מקרקעין בנתניה</a>, מספק ליווי אישי ומקצועי במגוון תחומים משפטיים: החל מעסקאות מקרקעין ונדל״ן מורכבות, דרך ייצוג חייבי חדלות פירעון ושיקום כלכלי, ועד פרויקטים של התחדשות עירונית ופינוי בינוי. מדי שנה אני מלווה מעל 100 עסקאות מקרקעין ומאות לקוחות, תוך דגש על שירות מותאם אישית, פתרונות חכמים ומקסום האינטרסים של לקוחותיי.</p><div class="adv"><h3>היתרון שלנו</h3><p>אני משלב ניסיון משפטי עשיר עם הבנה עסקית מעמיקה, ומציע ללקוחות פתרונות מותאמים אישית, הן ברמת העסקה והן ברמת הפרויקט כולו. אני מספק לא רק ייעוץ משפטי מקצועי, אלא גם ניתוח עסקי של הסיטואציה, הערכת סיכונים והצעת הפתרון האופטימלי מבחינה משפטית וכלכלית.</p></div>
<div class="acts"><a class="btn" href="https://dabullaw.co.il/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/">← קראו עליי עוד</a><a class="btn2" href="https://www.youtube.com/watch?v=2ZJ664F6458" data-yt="2ZJ664F6458" target="_blank" rel="noopener"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></i>צפו בסרטון היכרות (דקה)</a></div></div>
<div class="phw"><div class="ph"><img src="__PHOTO__" alt="עו״ד יקיר דבול, עורך דין מקרקעין בנתניה" width="841" height="1264" loading="lazy" decoding="async"><div class="cap"><q>הדרך שלנו, ההצלחה שלכם.</q><small>עו״ד יקיר דבול, עורך דין מקרקעין</small></div></div><div class="stats"><div><b>+100</b><span>עסקאות בכל שנה</span></div><div><b>4.9★</b><span>73 ביקורות בגוגל</span></div><div><b>3</b><span>ועדות בלשכה</span></div></div></div></div>
<div class="rows3"><div class="row"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg></i><div><b>ליווי מקצועי עם מומחים חיצוניים</b><span>אני עובד בשיתוף פעולה הדוק עם שמאי מקרקעין, מהנדסי בניין, אדריכלים, יועצי משכנתאות ועוד, כדי להעניק ללקוחות שירות מקיף, מקצועי וללא פשרות.</span></div></div><div class="row"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg></i><div><b>ליווי מלא מהתחלה ועד הסוף</b><span>אני לא רק מייעץ, אני מלווה את לקוחותיי לאורך כל הדרך, עם הקפדה על כל פרט, ניתוח משפטי וכלכלי מקיף ושאיפה תמידית להצלחתם.</span></div></div><div class="row"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l6-3v16M11 21V3l8 4v14"/><path d="M14 10h2M14 14h2M7 12h2M7 16h2"/></svg></i><div><b>החזון של המשרד</b><span>המשרד מובל על ידי עו״ד יקיר דבול, שמסירותו וניסיונו מאפשרים לו להציע פתרונות מקצועיים, יצירתיים ובטוחים. חזונו הוא להבטיח ללקוחות עתיד כלכלי יציב וביטחון בנכסים, הן ב״ארבעה קירות״ והן בתוכניות השקעה ומימוש נכסים מורכבים.</span></div></div></div></div></section>
DBLABHTML;
	return str_replace('__PHOTO__', esc_url($photo), $h);
}

/* finds the whole old section (counting its inner div tags) and puts the new one in its place */
function dabul_ab_swap($html) {
	$start = strpos($html, '<div class="elementor-element elementor-element-c7b857d ');
	if ($start === false) return $html;
	$depth = 0; $pos = $start; $len = strlen($html);
	while ($pos < $len && preg_match('#<(/?)div\b[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE, $pos)) {
		$depth += $m[1][0] === '/' ? -1 : 1;
		$pos = $m[0][1] + strlen($m[0][0]);
		if ($depth === 0) return substr($html, 0, $start) . dabul_ab_html() . substr($html, $pos);
	}
	return $html;
}

add_action('template_redirect', function () {
	if (!is_front_page() || !dabul_ab_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_ab_swap($html);
	});
}, 6);

add_action('wp_head', function () {
	if (!is_front_page() || !dabul_ab_on()) return;
	echo '<style id="dbl-about-css">' . <<<'DBLABCSS'
.dbl-ab{direction:rtl;font-family:"Noto Local",sans-serif;background:#f8f8fd;padding:84px 30px 90px;color:#141414}.dbl-ab *{box-sizing:border-box;font-family:inherit}
.dbl-ab .hd{text-align:center;margin-bottom:54px}.dbl-ab h2{font-size:46px;font-weight:400;margin:0;line-height:1.15}
.dbl-ab .dv{position:relative;width:200px;height:1px;background:#a8a8a8;margin:24px auto 0}.dbl-ab .dv:after{content:"";position:absolute;left:50%;top:-1px;width:44px;height:3px;margin-left:-22px;background:#d6b25e}
.dbl-ab .w{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 470px;gap:64px;align-items:start}
.dbl-ab p{font-size:18px;line-height:1.85;color:#54595f;margin:0 0 18px}.dbl-ab p a{color:#a88a4c;text-decoration:underline;text-decoration-color:#d6b25e;text-underline-offset:4px}
.dbl-ab h3{font-size:24px;font-weight:700;margin:26px 0 10px;color:#141414}
.dbl-ab .rows{display:grid;gap:14px;margin:28px 0 30px}
.dbl-ab .row{display:flex;gap:16px;align-items:flex-start;background:#fff;border-radius:10px;padding:20px 22px;box-shadow:0 6px 22px rgba(20,20,40,.06)}
.dbl-ab .row i{flex:0 0 46px;height:46px;border-radius:50%;background:#d6b25e;color:#fff;display:flex;align-items:center;justify-content:center}.dbl-ab .row i svg{width:22px;height:22px}
.dbl-ab .row b{display:block;font-size:19px;font-weight:700;margin-bottom:4px}.dbl-ab .row span{font-size:15.5px;line-height:1.7;color:#54595f}
.dbl-ab .btn{display:inline-flex;align-items:center;gap:8px;background:#e7cd96;color:#141414;border-radius:6px;padding:12px 26px;font-size:16px;font-weight:600;text-decoration:none}
.dbl-ab .ph{position:relative;border-radius:14px;overflow:hidden;background:#1b1b1d;aspect-ratio:4/5.2;box-shadow:0 24px 50px rgba(20,20,40,.18)}
.dbl-ab .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.dbl-ab .ph .cap{position:absolute;left:0;right:0;bottom:0;padding:70px 26px 24px;background:linear-gradient(180deg,rgba(20,20,22,0),rgba(20,20,22,.92));color:#fff}
.dbl-ab .ph .cap q{display:block;font-size:26px;font-weight:600;line-height:1.35;quotes:none;color:#e7cd96}.dbl-ab .ph .cap small{display:block;font-size:15px;margin-top:8px;color:#d9d6cf}
.dbl-ab .stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:16px;background:#141414;border-radius:12px;overflow:hidden}
.dbl-ab .stats div{padding:16px 8px;text-align:center;color:#fff}.dbl-ab .stats div+div{border-right:1px solid rgba(255,255,255,.12)}.dbl-ab .stats b{display:block;font-size:26px;font-weight:800;color:#d6b25e;direction:ltr}.dbl-ab .stats span{font-size:13px;color:#cfccc6}
/* H2: right aligned title, like the current section */
.dbl-ab.h2 .hd{text-align:right;max-width:1240px;margin:0 auto 46px}.dbl-ab.h2 .dv{margin:22px 0 0;width:120px;background:#d6b25e;height:2px}.dbl-ab.h2 .dv:after{display:none}
.dbl-ab.h2 .rows{grid-template-columns:repeat(3,1fr)}.dbl-ab.h2 .row{flex-direction:column;background:#141414;color:#fff;box-shadow:none}.dbl-ab.h2 .row b{color:#fff}.dbl-ab.h2 .row i{width:46px}.dbl-ab.h2 .row span{color:#cfccc6}
@media (max-width:767px){.dbl-ab{padding:54px 20px 60px}.dbl-ab h2{font-size:32px}.dbl-ab .hd{margin-bottom:30px}.dbl-ab .w{grid-template-columns:1fr;gap:30px}.dbl-ab .ph{order:-1;aspect-ratio:4/4.6}.dbl-ab .ph .cap q{font-size:21px}
.dbl-ab p{font-size:16.5px}.dbl-ab h3{font-size:21px}.dbl-ab .row{padding:16px}.dbl-ab.h2 .rows{grid-template-columns:1fr}.dbl-ab .btn{width:100%;justify-content:center}.dbl-ab .stats b{font-size:22px}}
.dbl-ab{background:radial-gradient(90% 70% at 85% 10%,#ffffff 0,#f6f6fb 60%,#f1f1f7 100%)!important}
.dbl-ab .w{grid-template-columns:minmax(0,1fr) 480px!important;gap:76px!important;align-items:center!important}
.dbl-ab .lead{font-size:21px!important;line-height:1.7!important;color:#141414!important;font-weight:500}
.dbl-ab .lead a{color:#141414!important;font-weight:700}
.dbl-ab h3{display:flex;align-items:center;gap:12px}.dbl-ab h3:before{content:"";width:28px;height:2px;background:#d6b25e}
.dbl-ab .row{position:relative;border:1px solid #ece7da;box-shadow:0 10px 28px rgba(20,20,40,.06)!important;transition:transform .2s,box-shadow .2s;overflow:hidden}
.dbl-ab .row:before{content:"";position:absolute;right:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#f0d9a0,#c9a14f)}
.dbl-ab .row:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(20,20,40,.1)!important}
.dbl-ab .row i{background:linear-gradient(135deg,#f0d9a0,#c49a4a)!important;color:#141008!important;box-shadow:0 6px 16px rgba(201,161,79,.35)}
.dbl-ab .row b{font-size:19px}
.dbl-ab .phw{position:relative;padding:0 0 0 18px}
.dbl-ab .phw:before{content:"";position:absolute;left:0;top:26px;right:26px;bottom:-18px;border:1.5px solid #d6b25e;border-radius:18px;z-index:0}
.dbl-ab .ph{z-index:1;border-radius:16px!important;aspect-ratio:4/5!important}
.dbl-ab .ph:after{content:"";position:absolute;inset:10px;border:1px solid rgba(231,205,150,.35);border-radius:10px;pointer-events:none}
.dbl-ab .ph .cap{padding:90px 28px 26px!important}
.dbl-ab .ph .cap q{font-size:28px!important}
.dbl-ab.u1 .ph .stats{position:absolute;left:18px;right:18px;top:18px;bottom:auto;margin:0;background:rgba(14,14,16,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(231,205,150,.35)}
.dbl-ab.u1 .ph .cap{padding-top:40px!important}.dbl-ab.u1 .ph img{top:104px!important;height:calc(100% - 104px)!important;object-position:50% 0!important}
.dbl-ab .btn{padding:14px 30px!important;font-size:16.5px!important;box-shadow:0 8px 20px rgba(201,161,79,.3)}
@media (max-width:767px){.dbl-ab{padding:0 0 56px!important}.dbl-ab .sec{display:flex;flex-direction:column}.dbl-ab .w{display:contents!important}
.dbl-ab .phw{order:1;padding:0;margin:0}.dbl-ab .phw:before{display:none}.dbl-ab .hd{order:2;padding:30px 20px 0;margin-bottom:22px!important}.dbl-ab .tx{order:3;padding:0 20px}
.dbl-ab .ph{border-radius:0 0 26px 26px!important;aspect-ratio:auto!important;height:500px}.dbl-ab.u1 .ph img{top:96px!important;height:calc(100% - 96px)!important}.dbl-ab .ph img{object-position:50% 6%!important}.dbl-ab .ph:after{display:none}
.dbl-ab.u1 .ph .stats{top:14px;bottom:auto;left:14px;right:14px}.dbl-ab .ph .cap q{font-size:22px!important}.dbl-ab.u2 .stats{margin:14px 20px 0!important}
.dbl-ab .lead{font-size:18px!important}}
.dbl-ab.u3 .phw{padding:0 0 0 20px}
.dbl-ab.u3 .phw:before{left:0;top:28px;right:28px;bottom:-20px;border-radius:20px}
.dbl-ab.u3 .phw:after{content:"";position:absolute;left:-60px;top:-40px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(214,178,94,.18),rgba(214,178,94,0) 70%);z-index:0;pointer-events:none}
.dbl-ab.u3 .ph{border-radius:16px 16px 0 0!important}
.dbl-ab.u3 .stats{position:relative;z-index:1;margin-top:0!important;border-radius:0 0 16px 16px!important;border-top:2px solid #d6b25e;background:#121214!important}
.dbl-ab.u3 .stats b{font-size:28px!important}
.dbl-ab.u3 .ph .cap q{position:relative;padding-top:34px}.dbl-ab.u3 .ph .cap q:before{content:"\201D";position:absolute;right:-4px;top:-18px;font-size:76px;line-height:1;color:rgba(231,205,150,.55);font-family:Georgia,serif}
.dbl-ab.u3 .row b{font-size:19.5px}.dbl-ab.u3 .row{padding:22px 24px}
.dbl-ab.u3 .acts{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.dbl-ab.u3 .btn2{display:inline-flex;align-items:center;gap:10px;border:1.5px solid #d6b25e;color:#141414;border-radius:6px;padding:12px 22px;font-size:16px;font-weight:600;text-decoration:none;background:#fff}
.dbl-ab.u3 .btn2 i{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f0d9a0,#c49a4a);display:flex;align-items:center;justify-content:center;color:#141008}.dbl-ab.u3 .btn2 i svg{width:13px;height:13px;margin-left:2px}
@media (max-width:767px){.dbl-ab.u3 .phw{padding:0}.dbl-ab.u3 .phw:after{display:none}.dbl-ab.u3 .ph{border-radius:0!important}.dbl-ab.u3 .stats{margin:0!important;border-radius:0 0 26px 26px!important}
.dbl-ab.u3 .acts{flex-direction:column;align-items:stretch}.dbl-ab.u3 .btn2{justify-content:center}}
.dbl-ab.a11 .hd .sub{font-size:20px;color:#a88a4c;margin-top:10px;letter-spacing:.02em}
.dbl-ab.a11 .w{align-items:stretch!important;grid-template-columns:minmax(0,1fr) 460px!important;gap:70px!important}
.dbl-ab.a11 .tx{display:flex;flex-direction:column;justify-content:space-between}.dbl-ab.a11 .tx>*{margin-top:0!important;margin-bottom:0!important}.dbl-ab.a11 .tx .lead{margin-top:-6px!important}.dbl-ab.a11 .adv h3{margin:0 0 10px!important}.dbl-ab.a11 .adv p{margin:0!important}

.dbl-ab.a11 .phw{display:flex;flex-direction:column;padding:0!important}
.dbl-ab.a11 .phw:before,.dbl-ab.a11 .phw:after,.dbl-ab.a11 .ph:after{display:none!important}
.dbl-ab.a11 .ph{flex:1 1 auto;aspect-ratio:auto!important;min-height:500px;border-radius:16px 16px 0 0!important;box-shadow:none!important}
.dbl-ab.a11 .ph img{object-position:50% 12%!important}
.dbl-ab.a11 .stats{margin:0!important}
.dbl-ab.a11 .rows3{max-width:1240px;margin:56px auto 0;display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.dbl-ab.a11 .rows3 .row{flex-direction:column;gap:16px;padding:26px 26px 24px}.dbl-ab.a11 .rows3 .row i{flex:0 0 auto!important;width:50px;height:50px}
.dbl-ab.a11 .rows3 .row b{font-size:20px;margin-bottom:8px}.dbl-ab.a11 .rows3 .row span{font-size:16px;line-height:1.75}
@media (max-width:767px){.dbl-ab.a11 .hd .sub{font-size:17px}.dbl-ab.a11 .tx{order:3}.dbl-ab.a11 .ph{min-height:0;height:470px;border-radius:0!important}.dbl-ab.a11 .stats{border-radius:0 0 26px 26px!important}
.dbl-ab.a11 .rows3{order:4;grid-template-columns:1fr;margin:26px 20px 0;gap:14px}.dbl-ab.a11 .rows3 .row{flex-direction:row;padding:18px}.dbl-ab.a11 .rows3 .row i{width:46px;height:46px}.dbl-ab.a11 .tx{gap:18px}.dbl-ab.a11 .tx .acts{order:9}}.dbl-ab.a11 .phw{position:relative;border-radius:16px;box-shadow:0 26px 54px rgba(20,20,40,.18)}.dbl-ab.a11 .stats{border-radius:0 0 16px 16px!important}
.dbl-ab.a11 .phw:before{display:block!important;content:"";position:absolute;inset:-12px;border:0!important;border-radius:0!important;z-index:2;pointer-events:none;background:
linear-gradient(#d6b25e,#d6b25e) top right/56px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) top right/2px 56px no-repeat,
linear-gradient(#d6b25e,#d6b25e) top left/56px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) top left/2px 56px no-repeat,
linear-gradient(#d6b25e,#d6b25e) bottom right/56px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) bottom right/2px 56px no-repeat,
linear-gradient(#d6b25e,#d6b25e) bottom left/56px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) bottom left/2px 56px no-repeat}@media (max-width:767px){.dbl-ab.a11 .phw{border-radius:0 0 26px 26px!important;box-shadow:none!important;overflow:hidden}.dbl-ab.a11 .phw:before{display:none!important}.dbl-ab.a11 .ph{border-radius:0!important}}.dbl-ytm{position:fixed;inset:0;z-index:99999;background:rgba(6,8,16,.86);display:flex;align-items:center;justify-content:center;padding:20px}.dbl-ytm .in{position:relative;width:min(960px,100%);aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5)}.dbl-ytm iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.dbl-ytm button{position:absolute;top:-46px;left:0;width:38px;height:38px;border-radius:50%;border:1px solid rgba(231,205,150,.6);background:#141414;color:#e7cd96;font-size:22px;line-height:1;cursor:pointer}
DBLABCSS
	. '</style>' . "\n";
}, 40);

add_action('wp_footer', function () {
	if (!is_front_page() || !dabul_ab_on()) return;
	echo <<<'DBLABJS'
<script nowprocket data-no-optimize="1">
(function () {
	document.addEventListener('click', function (e) {
		var a = e.target.closest ? e.target.closest('#dbl-about [data-yt]') : null;
		if (a) {
			e.preventDefault();
			var id = a.getAttribute('data-yt');
			document.body.insertAdjacentHTML('beforeend', '<div class="dbl-ytm" role="dialog" aria-modal="true" aria-label="סרטון היכרות"><div class="in"><button type="button" aria-label="סגירה">×</button><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="סרטון היכרות"></iframe></div></div>');
			return;
		}
		var m = e.target.closest ? e.target.closest('.dbl-ytm') : null;
		if (m && (e.target === m || e.target.tagName === 'BUTTON')) m.remove();
	});
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var m = document.querySelector('.dbl-ytm'); if (m) m.remove(); } });
})();
</script>
DBLABJS;
}, 99);
