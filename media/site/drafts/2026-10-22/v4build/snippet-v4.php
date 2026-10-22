/* dabul: article sidebar form, author box and article cards (Yakir approved sketch v4, 22.10.2026).
   [dabul_side_form]   the contact form in the article sidebar (computer only, the sidebar is hidden on the phone). Sends to the office
                       lead function, like the landing pages; the lead lands in the office system and on Telegram.
   [dabul_author_box]  the author box at the end of every article.
   [dabul_card_meta]   inside the article card (loop item 812): category + reading time.
   [dabul_card_excerpt] inside the article card: two or three lines from the article's Google description.
   Undo: deactivate this snippet and restore template 3945 (docs sitebak/single-post-3945-before-v4-20261022)
   and loop item 812 (docs sitebak/loop-812-before-v4-20261022). */
if (!function_exists('dabul_v4_side_form')) {
	function dabul_v4_icon($k) {
		$i = array(
			'fb' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9H17l.5-4h-4V8.8c0-.5.3-.8.5-.8z"/></svg>',
			'ig' => '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
			'yt' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 8.2c-.2-1.6-1-2.7-2.6-2.9C17 5 12 5 12 5s-5 0-7.4.3C3 5.5 2.2 6.6 2 8.2 1.8 9.6 1.8 12 1.8 12s0 2.4.2 3.8c.2 1.6 1 2.7 2.6 2.9C7 19 12 19 12 19s5 0 7.4-.3c1.6-.2 2.4-1.3 2.6-2.9.2-1.4.2-3.8.2-3.8s0-2.4-.2-3.8zM10 15V9l5.2 3L10 15z"/></svg>',
			'tt' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3.1c-1.4.1-2.7-.3-3.9-1v6.2c0 3.6-2.6 6-5.9 5.9-3.1-.1-5.4-2.6-5.2-5.7.2-3.2 3.2-5.5 6.5-4.8v3.2c-1.5-.5-3.2.3-3.3 1.9-.1 1.4 1 2.4 2.2 2.4 1.4 0 2.3-1 2.3-2.6V3h3.4z"/></svg>',
			'star' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>',
			'vid' => '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5 21.5 7v10l-6-3.5z"/></g></svg>',
			'arrow' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M11 6l-6 6 6 6"/></svg>',
		);
		return isset($i[$k]) ? $i[$k] : '';
	}

	/* ---------- the sidebar form ---------- */
	function dabul_v4_side_form() {
		$avatar = 'https://dabullaw.co.il/wp-content/uploads/2025/11/Yakir-Dabul-Avatar-150x150.png';
		$topics = array('קנייה או מכירת דירה', 'דירה מקבלן', 'מיסוי מקרקעין', 'ירושה וצוואה', 'רישום בטאבו', 'התחדשות עירונית', 'אחר');
		$o = '<div class="dsf" dir="rtl"><div class="dsf-hd"><p class="dsf-t">רוצים לדעת מה האפשרויות שלכם?</p>'
			. '<p class="dsf-s">ספרו לנו בקצרה, ועו״ד יקיר דבול יחזור אליכם. בדרך כלל באותו יום עבודה.</p></div>'
			. '<div class="dsf-me"><img src="' . esc_url($avatar) . '" width="44" height="44" alt="עו״ד יקיר דבול" loading="lazy" decoding="async"><span><b>עו״ד יקיר דבול</b> · מייסד המשרד</span></div>'
			. '<form class="dsf-f" novalidate>'
			. '<div class="dsf-r2"><label><span>שם מלא<i>*</i></span><input name="name" type="text" autocomplete="name" required></label>'
			. '<label><span>טלפון<i>*</i></span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="rtl" required></label></div>'
			. '<label><span>דוא״ל <small>(לא חובה)</small></span><input name="email" type="email" autocomplete="email" dir="ltr"></label>'
			. '<label><span>במה מדובר?</span><select name="topic"><option value="">בחרו נושא</option>';
		foreach ($topics as $t) $o .= '<option>' . esc_html($t) . '</option>';
		$o .= '</select></label>'
			. '<label><span>כמה מילים על המקרה <small>(לא חובה)</small></span><textarea name="message" rows="3" placeholder="לדוגמה: אנחנו לפני חתימה על דירה יד שנייה"></textarea></label>'
			. '<input type="text" name="website" tabindex="-1" autocomplete="off" class="dsf-hp" aria-hidden="true">'
			. '<label class="dsf-c"><input type="checkbox" name="consent" value="1" required><span>קראתי ומסכימ/ה ל<a href="https://dabullaw.co.il/privacy-policy/" target="_blank" rel="noopener">מדיניות הפרטיות</a>. אני מאשר/ת כי ידוע לי ומוסכם עלי כי הפרטים שמסרתי ייאספו, יוחזקו ויעובדו במאגר מידע בהתאם להוראות חוק הגנת הפרטיות, התשמ"א-1981 (כולל תיקון 13), ולמטרות המפורטות במדיניות הפרטיות של האתר. ידוע לי כי מסירת המידע נעשית מרצוני החופשי, וכי עומדות לי הזכויות המוקנות לי לפי החוק.</span></label>'
			. '<p class="dsf-m" role="alert"></p>'
			. '<button type="submit">שלחו ונחזור אליכם' . dabul_v4_icon('arrow') . '</button>'
			. '</form>'
			// Google rating as on the home page reviews (snippet 47: 4.9, 74 reviews, 20.10.2026)
			. '<div class="dsf-tr"><div>' . dabul_v4_icon('star') . '<span><b>★★★★★</b> 4.9<br>74 ביקורות בגוגל</span></div><div>' . dabul_v4_icon('vid') . '<span>פגישה במשרד,<br>בבית או בזום</span></div></div>'
			. '</div>';
		return $o;
	}
	add_shortcode('dabul_side_form', 'dabul_v4_side_form');

	/* ---------- the author box ---------- */
	function dabul_v4_author_box() {
		$img = 'https://dabullaw.co.il/wp-content/uploads/2025/11/Yakir-Dabul-Avatar.png';
		$soc = array(
			array('https://www.facebook.com/dabullaw', 'פייסבוק', 'fb'),
			array('https://www.instagram.com/dabullaw', 'אינסטגרם', 'ig'),
			array('https://www.youtube.com/channel/UCVooMwdZfVT_xo21a-Xpdbg', 'יוטיוב', 'yt'),
			array('https://www.tiktok.com/@yakir.dabul', 'טיקטוק', 'tt'),
		);
		$o = '<div class="dab" dir="rtl"><div class="dab-in">'
			. '<div class="dab-h"><img src="' . esc_url($img) . '" width="92" height="92" alt="עו״ד יקיר דבול" loading="lazy" decoding="async"><div><span class="dab-k">כתב את המאמר</span><a class="dab-n" href="' . esc_url(home_url('/אודות-המשרד/')) . '">עו״ד יקיר דבול</a></div></div>'
			. '<div class="dab-sep" aria-hidden="true"><i></i></div>'
			. '<p class="dab-p">עו״ד יקיר דבול מלווה קונים, מוכרים, יזמים ובעלי דירות בעסקאות מקרקעין, במיסוי מקרקעין ובהתחדשות עירונית (תמ״א 38 ופינוי בינוי). המשרד משלב ידע משפטי עם היכרות מעשית עם שוק הנדל״ן, ומקפיד על שקיפות וליווי אישי לאורך כל העסקה.</p>'
			. '<ul class="dab-l"><li>מלווה מעל 100 עסקאות מקרקעין בשנה ברחבי השרון</li><li>בעל תפקיד מוסמך מטעם בית המשפט לרישום בתים משותפים</li><li>חבר ב-5 ועדות בלשכת עורכי הדין</li><li>מתראיין בתקשורת: חדשות 13, ישראל היום, וואלה נדל״ן ועוד</li></ul>'
			. '<div class="dab-row"><div class="dab-b"><a class="dab-b1" href="' . esc_url(home_url('/אודות-המשרד/')) . '">אודות המשרד</a><a class="dab-b2" href="' . esc_url(home_url('/המלצות/')) . '">המלצות לקוחות</a></div>'
			. '<div class="dab-soc"><small>עקבו אחרינו</small>';
		foreach ($soc as $s) $o .= '<a href="' . esc_url($s[0]) . '" target="_blank" rel="noopener" aria-label="' . esc_attr($s[1]) . '">' . dabul_v4_icon($s[2]) . '</a>';
		return $o . '</div></div></div></div>';
	}
	add_shortcode('dabul_author_box', 'dabul_v4_author_box');

	/* ---------- article cards (loop item 812) ---------- */
	function dabul_v4_card_cat($id) {
		$cats = get_the_category($id);
		if (!$cats) return '';
		$pid = (int) get_post_meta($id, '_yoast_wpseo_primary_category', true);
		$generic = array('מידע משפטי', 'כללי', 'Uncategorized');
		$pick = null;
		foreach ($cats as $c) if ($pid && (int) $c->term_id === $pid && !in_array($c->name, $generic, true)) $pick = $c;
		if (!$pick) foreach ($cats as $c) if (!in_array($c->name, $generic, true)) { $pick = $c; break; }
		if (!$pick) $pick = $cats[0];
		return html_entity_decode($pick->name, ENT_QUOTES, 'UTF-8');
	}
	function dabul_v4_read_min($id) {
		$t = wp_strip_all_tags(strip_shortcodes((string) get_post_field('post_content', $id)));
		$w = count(preg_split('/\s+/u', trim($t), -1, PREG_SPLIT_NO_EMPTY));
		return max(1, (int) round($w / 200));
	}
	add_shortcode('dabul_card_meta', function () {
		$id = get_the_ID();
		if (!$id) return '';
		$cat = dabul_v4_card_cat($id);
		$o = '<div class="dcm">';
		if ($cat !== '') $o .= '<span class="dcm-c">' . esc_html($cat) . '</span>';
		if (get_post_type($id) === 'post') $o .= '<span class="dcm-t">' . dabul_v4_read_min($id) . ' דק׳ קריאה</span>';
		return $o . '</div>';
	});
	add_shortcode('dabul_card_excerpt', function () {
		$id = get_the_ID();
		if (!$id) return '';
		$d = trim((string) get_post_meta($id, '_yoast_wpseo_metadesc', true));
		if ($d === '' || strpos($d, '%%') !== false) $d = trim((string) get_post_field('post_excerpt', $id));
		if ($d === '') $d = wp_trim_words(wp_strip_all_tags(strip_shortcodes((string) get_post_field('post_content', $id))), 24, '...');
		$d = html_entity_decode(wp_strip_all_tags($d), ENT_QUOTES, 'UTF-8');
		return '<p class="dce">' . esc_html($d) . '</p>';
	});

	/* ---------- styles and the form script ---------- */
	add_action('wp_head', function () {
		if (is_admin()) return;
		$css = ''
		// form
		. '.dsf{border-radius:18px;overflow:hidden;background:#fbf8f1;box-shadow:0 16px 36px rgba(17,19,24,.14);border:1px solid #e8dfcb;font-family:inherit;color:#16161a;text-align:right}'
		. '.dsf-hd{position:relative;background:#111318;color:#fff;padding:22px 20px 46px;overflow:hidden}'
		. '.dsf-hd:before{content:"";position:absolute;inset:0;opacity:.18;background-image:linear-gradient(#c9a14f 1px,transparent 1px),linear-gradient(90deg,#c9a14f 1px,transparent 1px);background-size:26px 26px;-webkit-mask-image:linear-gradient(200deg,#000 0%,transparent 70%);mask-image:linear-gradient(200deg,#000 0%,transparent 70%)}'
		. '.dsf-t{position:relative;margin:0 0 6px;font-size:24px;line-height:1.25;font-weight:800;color:#fff}'
		. '.dsf-s{position:relative;margin:0;font-size:14.5px;line-height:1.55;color:#c6c8cf}'
		. '.dsf-me{display:flex;align-items:center;gap:10px;margin:-28px 18px 0;position:relative;background:#fff;border:1px solid #ece3cf;border-radius:14px;padding:9px 12px;box-shadow:0 8px 18px rgba(17,19,24,.08);font-size:13.5px;color:#7a715f}'
		. '.dsf-me img{width:44px;height:44px;border-radius:50%;border:2px solid #c9a14f;object-fit:cover;flex:0 0 44px}.dsf-me b{font-size:15.5px;color:#16161a}'
		. '.dsf-f{padding:16px 18px 4px;margin:0}'
		. '.dsf-r2{display:grid;grid-template-columns:1fr 1fr;gap:9px}'
		. '.dsf-f label{display:block;margin:0 0 10px}'
		. '.dsf-f label>span{display:block;font-size:13.5px;font-weight:700;color:#3b372f;margin-bottom:4px}.dsf-f label>span i{color:#b8912f;font-style:normal}.dsf-f label>span small{font-weight:400;color:#8b8475;font-size:inherit}'
		. '.dsf-f input[type=text],.dsf-f input[type=tel],.dsf-f input[type=email],.dsf-f select,.dsf-f textarea{width:100%;box-sizing:border-box;min-height:44px;border-radius:10px;background:#fff;border:1.5px solid #e2d8c3;padding:9px 12px;font:inherit;font-size:15px;color:#16161a;margin:0;box-shadow:none}'
		. '.dsf-f textarea{min-height:66px;resize:vertical}.dsf-f select{appearance:auto;color:#5f594d}'
		. '.dsf-f input:focus,.dsf-f select:focus,.dsf-f textarea:focus{outline:none;border-color:#c9a14f;box-shadow:0 0 0 3px rgba(201,161,79,.18)}'
		. '.dsf-hp{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;opacity:0!important}.dsf{position:relative}'
		. '.dsf-f label.dsf-c{display:flex;gap:9px;align-items:flex-start;font-size:11.8px;line-height:1.6;color:#5f594d;background:#f3eee2;border-radius:10px;padding:10px 11px;margin:2px 0 10px;cursor:pointer}'
		. '.dsf-f label.dsf-c>span{display:block;font-size:11.8px;font-weight:400;color:#5f594d;margin:0}'
		. '.dsf-c input{flex:0 0 18px;width:18px;height:18px;margin:2px 0 0;accent-color:#b8912f}.dsf-c a{color:#8c7646;text-decoration:underline;font-weight:700}'
		. '.dsf-m{margin:0 0 8px;font-size:13.5px;color:#b5483b;min-height:0}.dsf-m:empty{display:none}'
		. '.dsf-f button{width:100%;border:0;border-radius:12px;background:linear-gradient(135deg,#f0d9a0,#c9a14f);color:#141008;font:inherit;font-weight:800;font-size:18px;min-height:54px;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 10px 22px rgba(140,118,70,.32);cursor:pointer;padding:0 16px}'
		. '.dsf-f button:hover{filter:brightness(1.04)}.dsf-f button[disabled]{opacity:.7;cursor:default}.dsf-f button svg{width:20px;height:20px}'
		. '.dsf-tr{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 18px 18px}'
		. '.dsf-tr div{display:flex;align-items:center;gap:7px;font-size:12.5px;color:#5f594d;line-height:1.3}.dsf-tr svg{flex:0 0 18px;width:18px;height:18px;color:#b8912f}.dsf-tr b{color:#e0a41f;font-weight:400}'
		. '.dsf-ok{padding:22px 18px 8px;font-size:15.5px;line-height:1.6;color:#3b372f}.dsf-ok b{display:block;font-size:20px;color:#16161a;margin-bottom:4px}'
		. '@media (min-width:1025px){.elementor-3945 .elementor-element.elementor-element-9e1a1df{position:sticky;top:110px;z-index:2}}'
		// author box
		. '.dab{position:relative;background:#fff;border-radius:16px;border:1px solid #ece3cf;box-shadow:0 0 18px rgba(0,0,0,.05);overflow:hidden;text-align:right;color:#16161a}'
		. '.dab:before{content:"";display:block;height:6px;background:linear-gradient(90deg,#c9a14f,#f0d9a0,#c9a14f)}'
		. '.dab-in{padding:22px 24px 20px}'
		. '.dab-h{display:flex;gap:16px;align-items:center}'
		. '.dab-h img{width:92px;height:92px;border-radius:50%;border:3px solid #e3cf9c;object-fit:cover;flex:0 0 92px}'
		. '.dab-k{display:block;font-size:13px;font-weight:700;color:#8c7646;letter-spacing:.04em}'
		. '.dab-n{display:block;font-size:25px;font-weight:800;line-height:1.25;color:#16161a!important;text-decoration:none!important}'
		. '.dab-sep{position:relative;height:14px;margin:16px 0 4px}'
		. '.dab-sep:before{content:"";position:absolute;top:50%;right:0;left:0;height:1px;background:linear-gradient(90deg,rgba(201,161,79,0),#c9a14f 50%,rgba(201,161,79,0))}'
		. '.dab-sep i{position:absolute;top:50%;left:50%;width:9px;height:9px;margin:-5px 0 0 -5px;background:#c9a14f;transform:rotate(45deg);box-shadow:0 0 0 4px #fff}'
		. '.dab-p{margin:12px 0 16px;font-size:16.5px;line-height:1.75;color:#24211d;font-weight:500}'
		. '.dab-l{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:9px}'
		. '.dab-l li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;font-weight:400;line-height:1.5;color:#5c574e;margin:0;padding:0}'
		. '.dab-l li:before{content:"";flex:0 0 9px;height:9px;border-radius:50%;background:#c9a14f;margin-top:8px}'
		. '.dab-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid #efe9dc;padding-top:16px}'
		. '.dab-b{display:flex;gap:8px;flex-wrap:wrap}'
		. '.dab-b a{border-radius:10px;padding:10px 16px;font-weight:700;font-size:15px;text-decoration:none!important;color:#16161a!important;transition:background .2s}'
		. '.dab-b1{background:#e3cf9c}.dab-b1:hover{background:#d9c088}.dab-b2{border:1.5px solid #e3cf9c;padding:8.5px 15px!important}.dab-b2:hover{background:#faf5e8}'
		. '.dab-soc{display:flex;gap:8px;align-items:center}.dab-soc small{font-size:13px;color:#8b8475;margin-left:4px}'
		. '.dab-soc a{width:40px;height:40px;border-radius:50%;background:#16161a;color:#e3cf9c!important;display:flex;align-items:center;justify-content:center;transition:transform .2s}.dab-soc a:hover{transform:translateY(-2px)}'
		. '.dab-soc svg{width:19px;height:19px}'
		. '@media (max-width:767px){.dab-in{padding:18px 16px 16px}.dab-h img{width:74px;height:74px;flex-basis:74px}.dab-n{font-size:22px}.dab-p{font-size:16px}'
		. '.dab-row{flex-direction:column;align-items:stretch}.dab-b{display:grid;grid-template-columns:1fr 1fr}.dab-b a{text-align:center}.dab-soc{justify-content:center}.dab-soc small{display:none}}'
		// article cards
		. '.dcm{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;font-size:13.5px;color:#6b665c;line-height:1.4}'
		. '.dcm-c{background:#f7efd9;border:1px solid #e6d3a3;color:#7a6331;font-weight:700;border-radius:999px;padding:2px 11px}'
		. '.dce{margin:0;font-size:15px;line-height:1.6;color:#5c5850;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}';
		echo '<style id="dabul-v4">' . $css . '</style>' . "\n";
	}, 41);

	add_action('wp_footer', function () {
		if (is_admin() || !is_singular('post')) return;
		?>
<script nowprocket data-no-optimize="1">(function(){var A='https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/lead';
function ev(n,p){try{if(window.fbq){window.fbq('track',n,p)}}catch(x){}try{if(window.gtag){window.gtag('event','generate_lead',p)}}catch(x){}}
document.querySelectorAll('.dsf-f').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var m=f.querySelector('.dsf-m'),b=f.querySelector('button'),g=function(n){var x=f.elements[n];return x?String(x.value||'').trim():''};
if(g('website')){return}
var tel=g('phone').replace(/[^0-9+]/g,'');
if(g('name').length<2){m.textContent='כתבו שם, בבקשה.';return}
if(tel.replace(/[^0-9]/g,'').length<9){m.textContent='כתבו מספר טלפון תקין, בבקשה.';return}
if(!f.elements.consent.checked){m.textContent='כדי לשלוח, סמנו את ההסכמה למדיניות הפרטיות.';return}
m.textContent='';b.disabled=true;var bt=b.innerHTML;b.textContent='שולחים...';
var body={name:g('name'),phone:tel,email:g('email'),topic:g('topic')||'',notes:g('message'),source:'website',form:'article-sidebar',page:location.href.split('#')[0].split('?')[0].slice(0,300)};
var bad=function(){b.disabled=false;b.innerHTML=bt;m.textContent='משהו השתבש. אפשר להתקשר: 09-8613413'};
fetch(A,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){if(!j||!j.ok){bad();return}
var d=document.createElement('div');d.className='dsf-ok';var t=document.createElement('b');t.textContent='תודה, קיבלנו את הפנייה.';d.appendChild(t);d.appendChild(document.createTextNode('עו״ד יקיר דבול יחזור אליכם בהקדם. דחוף? 09-8613413'));
f.parentNode.replaceChild(d,f);ev('Lead',{content_name:'article-sidebar'})}).catch(bad)})})})();</script>
		<?php
	}, 99);
}
