
/* ---------- the three boxes (Yakir approved the sketch 11.11.2026) ---------- */

// switched to true when the boxes go live for everyone; until then only with ?dcta=1 (for checking)
if (!defined('DABUL_CX_LIVE')) define('DABUL_CX_LIVE', false);

function dabul_cx_test() { return isset($_GET['dcta']) && $_GET['dcta'] === '1'; }

// articles only: posts, not the home page, not the Netanya page (3715), not press items, not short or non-Hebrew posts
function dabul_cx_on() {
	static $on = null;
	if ($on !== null) return $on;
	if (is_admin() || !is_singular('post') || is_front_page()) return false;
	$on = false;
	if (!DABUL_CX_LIVE && !dabul_cx_test()) return false;
	$id = get_queried_object_id();
	if (!$id || $id == 3715) return false;
	if (has_category(array(50, 'press'), $id)) return false;
	$t = html_entity_decode(wp_strip_all_tags(get_the_title($id)), ENT_QUOTES, 'UTF-8');
	if (!preg_match('/\p{Hebrew}/u', $t)) return false;
	$plain = wp_strip_all_tags((string) get_post_field('post_content', $id));
	$n = function_exists('mb_strlen') ? mb_strlen($plain, 'UTF-8') : strlen($plain) / 2;
	if ($n < 1200) return false;
	$on = true;
	return true;
}
function dabul_cx_match($list) {
	$slug = urldecode((string) get_post_field('post_name', get_queried_object_id()));
	foreach ($list as $k => $v) { if ($slug === $k || strpos($slug, $k) === 0) return $v; }
	return null;
}
function dabul_cx_topic($id) {
	$t = trim(preg_split('~[:|?]~u', html_entity_decode(wp_strip_all_tags(get_the_title($id)), ENT_QUOTES, 'UTF-8'))[0]);
	if (function_exists('mb_substr')) $t = mb_substr($t, 0, 60, 'UTF-8');
	return $t;
}
// the reader comes back to the same article with a thank you (and, while checking, with ?dcta=1)
function dabul_cx_back($link, $key) {
	$b = $link;
	if (!DABUL_CX_LIVE && dabul_cx_test()) $b = add_query_arg('dcta', '1', $b);
	return add_query_arg($key, 'sent', $b) . '#' . $key;
}
function dabul_cx_sent($key) { return isset($_GET[$key]) && $_GET[$key] === 'sent'; }
// the site's consent text, word for word as in the other forms of the site (snippet 78)
function dabul_cx_consent($id) {
	return '<label class="cs" for="' . $id . '"><input type="checkbox" id="' . $id . '" name="privacy" value="yes" required><span>קראתי ומסכימ/ה ל<a href="https://dabullaw.co.il/privacy-policy/" target="_blank" rel="noopener">מדיניות הפרטיות</a>. אני מאשר/ת כי ידוע לי ומוסכם עלי כי הפרטים שמסרתי ייאספו, יוחזקו ויעובדו במאגר מידע בהתאם להוראות חוק הגנת הפרטיות, התשמ"א&ndash;1981 (כולל תיקון 13), ולמטרות המפורטות במדיניות הפרטיות של האתר. ידוע לי כי מסירת המידע נעשית מרצוני החופשי, וכי עומדות לי הזכויות המוקנות לי לפי החוק.</span></label>';
}
function dabul_cx_hidden($topic, $campaign, $link) {
	return '<input type="hidden" name="topic" value="' . esc_attr($topic) . '">'
		. '<input type="hidden" name="source" value="website">'
		. '<input type="hidden" name="campaign" value="' . esc_attr($campaign) . '">'
		. '<input type="hidden" name="page" value="' . esc_url($link) . '">'
		. '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';
}
function dabul_cx_action($back) {
	return esc_url('https://mgjmnvpnovkewvqevjmz.' . 'supa' . 'base.co/functions/v1/lead?source=website&redirect=' . rawurlencode($back));
}
function dabul_cx_thanks($cls, $key) {
	return '<div class="' . $cls . '" id="' . $key . '" role="status"><p class="t">תודה, קיבלנו את הפרטים.</p><p class="s">נחזור אליכם בהקדם.</p></div>';
}

// box 1: after "עיקרי הדברים", before "נעים להכיר"
function dabul_cx_box1($topic, $link) {
	if (dabul_cx_sent('dcx1')) return dabul_cx_thanks('dcx1', 'dcx1');
	return '<div class="dcx1" id="dcx1" role="complementary" aria-label="השארת פרטים"><p class="t">זקוקים לייעוץ?</p><p class="s">השאירו פרטים ונחזור אליכם בהקדם</p>'
		. '<form name="dabul-cta1" method="post" action="' . dabul_cx_action(dabul_cx_back($link, 'dcx1')) . '">' . dabul_cx_hidden($topic, 'אתר · תיבה עליונה', $link)
		. '<input type="text" name="name" placeholder="שמכם" autocomplete="name" required aria-label="שמכם">'
		. '<input type="tel" name="phone" placeholder="טלפון" autocomplete="tel" inputmode="tel" required minlength="9" aria-label="טלפון">'
		. '<button type="submit">צרו עמי קשר ←</button>'
		. dabul_cx_consent('dcx1-ok') . '</form></div>';
}

// box 2: the office card with the photo, in the middle of the article
function dabul_cx_box2() {
	$c = '';
	foreach (array('קנייה ומכירה', 'דירה מקבלן', 'התחדשות עירונית', 'מיסוי מקרקעין', 'צוואות וירושות', 'רישום בטאבו') as $x) $c .= '<span>' . $x . '</span>';
	$tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
	return '<div class="dcx2" role="complementary" aria-label="יקיר דבול - משרד עורכי דין"><div class="tx"><p class="o">יקיר דבול - משרד עורכי דין</p>'
		. '<p class="h">ליווי משפטי אישי<br><span>בעסקאות מקרקעין ונדל״ן!</span></p>'
		. '<div class="ch">' . $c . '</div>'
		. '<a class="call" href="tel:+97298613413">' . $tel . 'חייגו 09-8613413</a></div>'
		. '<div class="ph"><img src="https://dabullaw.co.il/wp-content/uploads/2026/10/lb10-yakir-dabul.webp" alt="עו״ד יקיר דבול" width="596" height="1188" loading="lazy" decoding="async"></div></div>';
}

// box 3: after the questions and answers
function dabul_cx_box3($topic, $title, $line, $label, $opts, $prefix, $campaign, $link) {
	if (dabul_cx_sent('dcx3')) return dabul_cx_thanks('dcx3', 'dcx3');
	$o = '<option value="">בחרו</option>';
	foreach ($opts as $x) $o .= '<option value="' . esc_attr($prefix . $x) . '">' . esc_html($x) . '</option>';
	return '<div class="dcx3" id="dcx3" role="complementary" aria-label="השארת פרטים"><p class="t">' . esc_html($title) . '</p><p class="s">' . esc_html($line) . '</p>'
		. '<form name="dabul-cta3" method="post" action="' . dabul_cx_action(dabul_cx_back($link, 'dcx3')) . '">' . dabul_cx_hidden($topic, $campaign, $link)
		. '<label class="f"><span>שם מלא</span><input type="text" name="name" placeholder="השם שלכם" autocomplete="name" required></label>'
		. '<label class="f"><span>טלפון</span><input type="tel" name="phone" placeholder="050-0000000" autocomplete="tel" inputmode="tel" required minlength="9"></label>'
		. '<label class="f"><span>' . esc_html($label) . '</span><select name="message">' . $o . '</select></label>'
		. dabul_cx_consent('dcx3-ok') . '<button type="submit">חזרו אליי</button></form></div>';
}
// item ז: in the 20 most visited articles the targeted question replaces "במה מדובר?"; in about 36 articles the tailored wording is the title
function dabul_cx_box3_for_post() {
	$id = get_queried_object_id();
	$link = get_permalink($id);
	$q = dabul_cx_match(dabul_cxq_list());
	if ($q) return dabul_cx_box3($q[0], $q[1], $q[2], $q[3], $q[4], 'מצב: ', 'אתר · טופס ממוקד', $link);
	$topics = array('קניית דירה', 'מכירת דירה', 'דירה מקבלן', 'התחדשות עירונית', 'מיסוי מקרקעין', 'צוואות וירושות', 'נושא אחר');
	$line = 'השאירו שם וטלפון, ונחזור אליכם בהקדם.';
	$v = dabul_cx_match(dabul_cx_list());
	if ($v) return dabul_cx_box3($v[0], $v[1], $line, 'במה מדובר?', $topics, 'במה מדובר: ', 'אתר · ' . $v[0], $link);
	return dabul_cx_box3(dabul_cx_topic($id), 'יש לכם שאלה על המקרה שלכם?', $line, 'במה מדובר?', $topics, 'במה מדובר: ', 'אתר · אחרי שאלות ותשובות', $link);
}

add_action('wp_head', function () {
	if (!dabul_cx_on()) return;
	echo '<style id="dabul-cx-css">
.dcx1,.dcx2,.dcx3{direction:rtl;text-align:right;clear:both;box-sizing:border-box;scroll-margin-top:90px;position:relative;font-family:inherit}
.dcx1 *,.dcx2 *,.dcx3 *{box-sizing:border-box}
.dcx1 p,.dcx2 p,.dcx3 p{margin:0!important;padding:0!important}
.dcx1 .hp,.dcx3 .hp{position:absolute!important;top:0!important;left:0!important;width:1px!important;height:1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;opacity:0!important;pointer-events:none}
.dcx1 .cs,.dcx3 .cs{grid-column:1/-1;display:flex!important;gap:8px;align-items:flex-start;font-size:12px!important;line-height:1.5!important;margin:2px 0 0!important;font-weight:400;cursor:pointer}
.dcx1 .cs input,.dcx3 .cs input{width:18px!important;height:18px!important;min-height:0!important;flex:none;margin:1px 0 0!important;padding:0!important}
.dcx1 .cs a,.dcx3 .cs a{font-weight:700;text-decoration:underline!important}
.dcx1 input[type=text],.dcx1 input[type=tel],.dcx3 input[type=text],.dcx3 input[type=tel],.dcx3 select{width:100%!important;font:inherit;font-size:16px!important;margin:0!important;box-shadow:none!important;direction:rtl;text-align:right!important;max-width:none!important}
.dcx1 button,.dcx3 button{font:inherit;cursor:pointer;margin:0!important;line-height:1.2!important;text-transform:none!important;letter-spacing:0!important}
.dcx1{margin:26px 0;background:#1f1b16;border-top:5px solid #c9a36a;border-radius:22px;padding:20px 18px;color:#f5efe6}
.dcx1 .t{font-size:22px!important;font-weight:800!important;color:#fff!important;text-align:center;line-height:1.3!important}
.dcx1 .s{font-size:16px!important;font-weight:700!important;color:#f5efe6!important;text-align:center;line-height:1.5!important;margin-top:4px!important}
.dcx1 form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:14px 0 0!important}
.dcx1 input[type=text],.dcx1 input[type=tel]{height:50px!important;border:0!important;border-radius:10px!important;padding:0 14px!important;background:#efeae2!important;color:#1f1b16!important}
.dcx1 input::placeholder{color:#6b6257!important;opacity:1}
.dcx1 input:focus{outline:2px solid #c9a36a;outline-offset:1px}
.dcx1 button{grid-column:1/-1;height:50px;border:0!important;border-radius:12px!important;background:#c9a36a!important;color:#1f1b16!important;font-size:18px!important;font-weight:800!important;padding:0 16px!important;width:100%}
.dcx1 .cs{color:#d6cdbf}.dcx1 .cs a{color:#e2c983!important}.dcx1 .cs input{accent-color:#c9a36a}
.dcx2{margin:30px 0;background:#1f1b16;border-radius:24px;overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:22px 16px 0;text-align:center;color:#f5efe6}
.dcx2 .tx{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
.dcx2 .o{font-size:17px!important;font-weight:800!important;color:#f5efe6!important;line-height:1.4!important;text-align:center}
.dcx2 .h{font-size:21px!important;line-height:1.35!important;font-weight:500!important;color:#fff!important;text-align:center}
.dcx2 .h span{white-space:nowrap}
.dcx2 .ch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}
.dcx2 .ch span{display:flex;align-items:center;justify-content:center;min-height:38px;border:1px solid #6b5a3e;border-radius:999px;font-size:14px;font-weight:700;color:#f5efe6;line-height:1.2;padding:2px 8px;text-align:center}
.dcx2 a.call{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;border-radius:12px;background:#c9a36a;color:#1f1b16!important;font-size:19px;font-weight:800;text-decoration:none!important;line-height:1}
.dcx2 a.call svg{width:22px;height:22px;flex:none}
.dcx2 .ph{width:200px;height:220px;overflow:hidden;margin-top:14px;position:relative;flex:none}
.dcx2 .ph img{width:200px!important;max-width:none!important;height:auto!important;display:block;margin:0!important;border-radius:0!important;box-shadow:none!important}
.dcx3{margin:30px 0;background:#faf6f0;border:1px solid #e7dccb;border-top:6px solid #8b6f47;border-radius:18px;padding:22px 18px;color:#3f2f1b}
.dcx3 .t{font-size:21px!important;line-height:1.35!important;font-weight:800!important;color:#3f2f1b!important}
.dcx3 .s{font-size:16px!important;line-height:1.6!important;color:#5c4528!important;margin-top:6px!important}
.dcx3 form{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin:16px 0 0!important}
.dcx3 label.f{display:flex!important;flex-direction:column;gap:4px;font-size:14px!important;font-weight:500!important;color:#3f2f1b;margin:0!important;line-height:1.4!important;min-width:0}
.dcx3 input[type=text],.dcx3 input[type=tel],.dcx3 select{height:48px!important;border:1px solid #d9cbb5!important;border-radius:10px!important;padding:0 12px!important;background:#fff!important;color:#374151!important}
.dcx3 input:focus,.dcx3 select:focus{outline:2px solid #8b6f47;outline-offset:1px}
.dcx3 .cs{color:#6b5a44}.dcx3 .cs a{color:#8b6f47!important}.dcx3 .cs input{accent-color:#8b6f47}
.dcx3 button{height:52px;border:0!important;border-radius:12px!important;background:#8b6f47!important;color:#fff!important;font-size:18px!important;font-weight:700!important;padding:0 16px!important;width:100%}
.dcx1[role=status] .t,.dcx3[role=status] .t{font-size:20px!important}
@media (min-width:768px){
.dcx1{padding:22px 28px}.dcx1 .t{font-size:24px!important}.dcx1 .s{font-size:17px!important}
.dcx1 form{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.dcx1 button{grid-column:auto}
.dcx2{flex-direction:row;align-items:stretch;padding:0;min-height:320px;border-radius:26px}
.dcx2 .tx{flex:1 1 0;min-width:0;padding:30px 28px;justify-content:center;gap:16px}
.dcx2 .o{font-size:18px!important;color:#d8c39f!important}.dcx2 .h{font-size:28px!important;line-height:1.3!important}
.dcx2 .ch{grid-template-columns:repeat(3,minmax(0,1fr))}
.dcx2 a.call{width:300px;max-width:100%}
.dcx2 .ph{flex:0 0 230px;width:auto;height:auto;margin:0}
.dcx2 .ph img{position:absolute;top:16px;left:50%;transform:translateX(-50%);width:220px!important}
.dcx3{padding:26px 28px}.dcx3 .t{font-size:23px!important}
.dcx3 form{grid-template-columns:repeat(3,minmax(0,1fr))}
.dcx3 button{grid-column:1/-1;justify-self:start;width:260px}
}
</style>';
}, 30);

// where the boxes go: inside the article text
add_filter('the_content', function ($html) {
	if (!in_the_loop() || !is_main_query() || !dabul_cx_on()) return $html;
	if (strpos($html, 'class="dcx') !== false) return $html;
	$id = get_queried_object_id();
	$link = get_permalink($id);
	$v = dabul_cx_match(dabul_cx_list());
	$topic = $v ? $v[0] : dabul_cx_topic($id);
	$len = strlen($html);

	// section headings: h2, or h2 + h3 when the article has fewer than 3 h2 (older articles use h3 for sections)
	preg_match_all('~<h2[\s>]~i', $html, $m, PREG_OFFSET_CAPTURE);
	if (count($m[0]) < 3) preg_match_all('~<h[23][\s>]~i', $html, $m, PREG_OFFSET_CAPTURE);
	$sec = array(); // the article's own sections, before the questions / sources / glossary
	$faq = -1; $faqLvl = 2;
	foreach ($m[0] as $x) {
		$p = $x[1];
		$e = stripos($html, '</h', $p + 3);
		$tag = substr($html, $p, ($e === false ? 300 : $e - $p));
		if (strpos($tag, 'עיקרי הדברים') !== false || strpos($tag, 'lvbl-h2-lead') !== false) continue;
		if (preg_match('~id="faq"|שאלות ותשובות|שאלות נפוצות~u', $tag)) { if ($faq < 0) { $faq = $p; $faqLvl = (int) substr($tag, 2, 1); } break; }
		if (preg_match('~id="(sources|glossary)"|מקורות|מילון~u', $tag)) break;
		$sec[] = $p;
	}
	$n = count($sec);
	$ins = array();

	// box 1: before the "נעים להכיר" paragraph; else right after the list of "עיקרי הדברים"; else before the second section
	$b1 = -1;
	$ik = strpos($html, 'עיקרי הדברים');
	$nk = strpos($html, 'נעים להכיר');
	if ($nk !== false && ($ik === false || $nk > $ik) && preg_match_all('~<p[\s>]~i', substr($html, 0, $nk), $pm, PREG_OFFSET_CAPTURE)) {
		$pp = end($pm[0])[1];
		if ($ik === false || $pp > $ik) $b1 = $pp;
	}
	if ($b1 < 0 && $ik !== false) {
		$ul = strpos($html, '</ul>', $ik); $ol = strpos($html, '</ol>', $ik);
		$end = $ul === false ? $ol : ($ol === false ? $ul : min($ul, $ol));
		if ($end !== false && $end - $ik < 8000 && ($n === 0 || $end < $sec[$n - 1])) $b1 = $end + 5;
	}
	if ($b1 < 0 && $n >= 2) $b1 = $sec[1];
	elseif ($b1 < 0 && $n === 1) $b1 = $sec[0];
	if ($b1 >= 0) $ins[$b1] = dabul_cx_box1($topic, $link);

	// box 2: after 2 to 3 sections, one heading before the infographic, never next to box 1 and never last
	if ($n >= 4) {
		$after = array();
		foreach ($sec as $i => $p) { if ($i >= 2 && $i <= $n - 2 && $p > $b1 + 10) $after[] = $i; }
		if ($after) {
			$pick = $after[0];
			$ig = -1;
			foreach (array('class="lvbl-infographic', 'class="lvbl-figure', '<figure', '<img') as $mk) {
				$q = strpos($html, $mk, max(0, $sec[1]));
				if ($q !== false && ($ig < 0 || $q < $ig)) $ig = $q;
			}
			if ($ig >= 0) {
				$k = -1;
				foreach ($sec as $i => $p) { if ($p < $ig) $k = $i; }
				if (in_array($k, array(2, 3), true) && in_array($k, $after, true)) $pick = $k;
			}
			$ins[$sec[$pick]] = dabul_cx_box2();
		}
	}

	// box 3: right after the questions and answers inside the article; without them, after the page's own questions (see below)
	if ($faq >= 0) {
		$b3 = $len;
		if (preg_match('~<h[1-' . max(1, min(6, $faqLvl)) . '][\s>]~i', $html, $hm, PREG_OFFSET_CAPTURE, $faq + 4)) $b3 = $hm[0][1];
		if (isset($ins[$b3])) $ins[$b3] .= dabul_cx_box3_for_post(); else $ins[$b3] = dabul_cx_box3_for_post();
		$GLOBALS['dabul_cx3_done'] = 1;
	}

	krsort($ins);
	foreach ($ins as $off => $box) $html = substr($html, 0, $off) . $box . substr($html, $off);
	return $html;
}, 21);

// box 3 for articles without questions inside the text: right before the legal notice, which comes after the page's own questions
add_filter('do_shortcode_tag', function ($out, $tag) {
	if ($tag !== 'dabul_disclaimer' || !empty($GLOBALS['dabul_cx3_done']) || !dabul_cx_on()) return $out;
	$GLOBALS['dabul_cx3_done'] = 1;
	return dabul_cx_box3_for_post() . $out;
}, 10, 2);

// kept from snippet 63: GET /wp-json/dabul/v1/formlog (admin only)
add_action('rest_api_init', function () {
	if (function_exists('dabul_lb_list')) return; // snippet 63 still on: it registers the route itself
	register_rest_route('dabul/v1', '/formlog', array('methods' => 'GET', 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function () { return array('log' => get_option('dabul_form_lead_log', array())); }));
});

// one send per click: after the first press the button is locked and says it is sending (as in the old boxes)
add_action('wp_footer', function () {
	if (!dabul_cx_on()) return;
	echo '<script id="dabul-cx-once">(function(){var Q="form[name=dabul-cta1],form[name=dabul-cta3]";'
		. 'document.querySelectorAll(Q).forEach(function(f){f.addEventListener("submit",function(e){'
		. 'if(f.getAttribute("data-sent")){e.preventDefault();return}f.setAttribute("data-sent","1");'
		. 'var b=f.querySelector("button[type=submit]");if(b){b.setAttribute("data-h",b.innerHTML);b.disabled=true;b.style.opacity=".75";b.style.cursor="wait";b.textContent="שולח, רגע...";}});});'
		. 'window.addEventListener("pageshow",function(e){if(!e.persisted)return;document.querySelectorAll(Q).forEach(function(f){f.removeAttribute("data-sent");'
		. 'var b=f.querySelector("button[type=submit]");if(b){if(b.getAttribute("data-h"))b.innerHTML=b.getAttribute("data-h");b.disabled=false;b.style.opacity="";b.style.cursor="";}});});})();</script>';
}, 30);
