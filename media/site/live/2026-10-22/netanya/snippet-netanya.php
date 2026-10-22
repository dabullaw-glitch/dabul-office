/* dabul: עמוד "עורך דין מקרקעין בנתניה" החדש (פוסט 3715), אושר על ידי יקיר ב־22.10.2026.
   [dnt_form]: טופס הפנייה בראש העמוד. משתמש בפונקציות של טופס "צריכים סיוע משפטי" (סניפט 78): אותו נוסח הסכמה,
   אותה שליחה למערכת המשרד ולמייל, ומעבר לעמוד התודה.
   [dnt_checklist_form]: טופס קצר לקובץ "10 בדיקות לפני שקונים דירה בנתניה". הפרטים נכנסים למערכת המשרד כמו כל פנייה,
   ואחרי השליחה מופיע כפתור להורדת הקובץ (בלי מעבר לעמוד אחר).
   פירורי הלחם של יוסט בעמוד הזה בלי "מידע משפטי", ונתוני העמוד לגוגל מקבלים "speakable" ומי בדק את התוכן.
   POST /wp-json/dabul/v1/netanya (מנהל בלבד): apply (תוכן מקישור, תבנית רוחב מלא, כותרת ותיאור, החרגה מתבנית 3945),
   pdf (העלאת הקובץ מקישור), status, restore.
   ביטול: action=restore מחזיר את התבנית ואת ההחרגה, ואת התוכן משחזרים מהגיבוי sitebak post3715-before-netanya-v2-20261022. */

if (!defined('DNT_POST')) define('DNT_POST', 3715);

function dnt_form_css() {
	static $done = false;
	if ($done) return '';
	$done = true;
	return '<style id="dnt-form-css">'
		. '.dnt-f{background:#fff;color:#3d3b37;border-radius:16px;padding:20px 18px;box-shadow:0 18px 40px rgba(0,0,0,.25);text-align:right;scroll-margin-top:110px}'
		. '.dnt-f h2{margin:0;font-size:21px;line-height:1.3;color:#141414;font-weight:700}'
		. '.dnt-f .s{margin:4px 0 12px;font-size:14.5px;color:#6b665c;line-height:1.5}'
		. '.dnt-f .f{margin-bottom:9px}'
		. '.dnt-f label.l{display:block;font-size:13.5px;font-weight:700;color:#2b2a27;margin-bottom:3px}'
		. '.dnt-f label.l i{color:#b3261e;font-style:normal}'
		. '.dnt-f input,.dnt-f select{width:100%;border:1px solid #d9d2c3;border-radius:10px;padding:11px 12px;font:inherit;font-size:16px;background:#faf7f0;color:#141414;min-height:46px}'
		. '.dnt-f input:focus,.dnt-f select:focus{outline:2px solid #c5a25a;outline-offset:1px;background:#fff}'
		. '.dnt-f .row{display:grid;gap:9px}'
		. '@media(min-width:480px){.dnt-f .row{grid-template-columns:1fr 1fr}}'
		. '.dnt-f .dlf-consent{display:flex;gap:8px;align-items:flex-start;font-size:11.5px;line-height:1.5;color:#6b665c;margin:6px 0 12px}'
		. '.dnt-f .dlf-consent input{width:17px;height:17px;min-height:0;flex:none;margin-top:2px;padding:0}'
		. '.dnt-f .dlf-consent span{max-height:5.4em;overflow:auto}'
		. '.dnt-f .dlf-consent a{color:#8c7646}'
		. '.dnt-f .go{display:block;width:100%;border:0;border-radius:10px;padding:13px;background:#c5a25a;color:#141414;font:inherit;font-weight:700;font-size:17px;cursor:pointer}'
		. '.dnt-f .go:hover{background:#d4b46e}.dnt-f .go:disabled{opacity:.6}'
		. '.dnt-f .msg{margin:8px 0 0;color:#b3261e;font-size:14px;min-height:1px}'
		. '.dnt-f .alt{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;font-size:14.5px;margin-top:10px;color:#6b665c}'
		. '.dnt-f .alt a{color:#141414;font-weight:700;text-decoration:none}'
		. '.dnt-f .hp{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}'
		. '.dnt-lmf{display:grid;gap:9px}'
		. '.dnt-lmf input{width:100%;border:1px solid #d9d2c3;border-radius:10px;padding:11px 12px;font:inherit;font-size:16px;background:#fff;color:#141414;min-height:46px}'
		. '.dnt-lmf .dlf-consent{display:flex;gap:8px;align-items:flex-start;font-size:11.5px;line-height:1.5;color:#bdb6a6}'
		. '.dnt-lmf .dlf-consent input{width:17px;height:17px;min-height:0;flex:none;margin-top:2px;padding:0}'
		. '.dnt-lmf .dlf-consent span{max-height:5.4em;overflow:auto}'
		. '.dnt-lmf .dlf-consent a{color:#e7cd96}'
		. '.dnt-lmf .go{border:0;border-radius:10px;padding:13px;background:#c5a25a;color:#141414;font:inherit;font-weight:700;font-size:17px;cursor:pointer}'
		. '.dnt-lmf .go:disabled{opacity:.6}'
		. '.dnt-lmf .msg{margin:0;color:#ffb4ab;font-size:14px}'
		. '.dnt-lmf .screen-reader-text{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}'
		. '.dnt-lmf .hp{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}'
		. '.dnt-ok{background:#fff;color:#141414;border-radius:12px;padding:16px;text-align:center}'
		. '.dnt-ok b{display:block;font-size:17px;margin-bottom:8px}'
		. '.dnt-ok a{display:inline-block;background:#c5a25a;color:#141414;font-weight:700;border-radius:10px;padding:11px 20px;text-decoration:none}'
		. '</style>';
}

function dnt_consent() {
	if (function_exists('dabul_lf_consent')) return dabul_lf_consent();
	return '<label class="dlf-consent"><input type="checkbox" name="consent" value="1" required><span>קראתי ומסכימ/ה ל<a href="https://dabullaw.co.il/privacy-policy/" target="_blank" rel="noopener">מדיניות הפרטיות</a>.</span></label>';
}

function dnt_form_sc() {
	if (function_exists('dabul_lf_js')) add_action('wp_footer', 'dabul_lf_js', 99);
	$topics = function_exists('dabul_lf_topics') ? dabul_lf_topics('dnt-t') : '<select id="dnt-t" name="topic"><option value="">בחרו נושא</option></select>';
	$wa = 'https://wa.me/972505580189?text=' . rawurlencode('שלום, הגעתי מהעמוד "עורך דין מקרקעין בנתניה" באתר ואשמח לשאול...');
	return dnt_form_css()
		. '<form class="dnt-f dlf" id="dnt-form" data-form="netanya-page" novalidate aria-label="השארת פרטים">'
		. '<h2>ספרו לנו על העסקה</h2><p class="s">משאירים שם וטלפון, ונחזור אליכם בהקדם.</p>'
		. '<div class="row"><div class="f"><label class="l" for="dnt-n">שם מלא <i>*</i></label><input id="dnt-n" name="name" autocomplete="name" required></div>'
		. '<div class="f"><label class="l" for="dnt-p">טלפון <i>*</i></label><input id="dnt-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div></div>'
		. '<div class="f"><label class="l" for="dnt-t">במה מדובר?</label>' . $topics . '</div>'
		. '<div class="hp" aria-hidden="true"><label for="dnt-w">אתר</label><input id="dnt-w" name="website" tabindex="-1" autocomplete="off"></div>'
		. dnt_consent()
		. '<button class="go" type="submit">כן, תחזרו אליי</button><p class="msg" role="alert"></p>'
		. '<div class="alt"><span>או בטלפון <a href="tel:098613413" dir="ltr">09-8613413</a></span><span><a href="' . esc_url($wa) . '" target="_blank" rel="noopener">וואטסאפ 050-5580189</a></span></div>'
		. '</form>';
}

function dnt_checklist_sc() {
	add_action('wp_footer', 'dnt_checklist_js', 99);
	return dnt_form_css()
		. '<form class="dnt-lmf" data-form="netanya-checklist" novalidate aria-label="הורדת קובץ 10 הבדיקות">'
		. '<label class="screen-reader-text" for="dnt-cn">שם</label><input id="dnt-cn" name="name" autocomplete="name" placeholder="שם" required>'
		. '<label class="screen-reader-text" for="dnt-cp">טלפון</label><input id="dnt-cp" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="טלפון" required>'
		. '<div class="hp" aria-hidden="true"><label for="dnt-cw">אתר</label><input id="dnt-cw" name="website" tabindex="-1" autocomplete="off"></div>'
		. dnt_consent()
		. '<button class="go" type="submit">להורדת הרשימה</button><p class="msg" role="alert"></p>'
		. '</form>';
}

function dnt_checklist_js() {
	static $done = false;
	if ($done) return;
	$done = true;
	$pdf = esc_url(get_option('dnt_checklist_pdf', ''));
	$ajax = esc_url(admin_url('admin-ajax.php'));
	?>
<script nowprocket data-no-optimize="1" data-no-minify="1" data-no-defer="1">(function(){var A='https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/lead',P='<?php echo $pdf; ?>',M='<?php echo $ajax; ?>';
document.querySelectorAll('form.dnt-lmf').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var m=f.querySelector('.msg'),b=f.querySelector('.go'),g=function(n){var x=f.elements[n];return x&&x.value!=null?String(x.value).trim():''};
if(g('website')){return}
var tel=g('phone').replace(/[^0-9+]/g,'');
if(g('name').length<2){m.textContent='כתבו שם, בבקשה.';f.elements.name.focus();return}
if(tel.replace(/[^0-9]/g,'').length<9){m.textContent='כתבו מספר טלפון תקין, בבקשה.';f.elements.phone.focus();return}
if(!f.elements.consent.checked){m.textContent='כדי להוריד, סמנו את ההסכמה למדיניות הפרטיות.';return}
m.textContent='';b.disabled=true;var bt=b.textContent;b.textContent='שולחים...';
var page=location.href.split('#')[0].split('?')[0].slice(0,300);
var body={name:g('name'),phone:tel,email:'',topic:'קניית דירה',preferred_time:'',notes:'הוריד/ה את הקובץ "10 בדיקות לפני שקונים דירה בנתניה"',source:'website',form:'netanya-checklist',page:page};
var mail=new FormData();mail.append('action','dabul_lf_mail');mail.append('name',g('name'));mail.append('email','');mail.append('message',body.notes);mail.append('phone',tel);mail.append('topic','קובץ 10 בדיקות');mail.append('when','');mail.append('form','netanya-checklist');mail.append('page',page);
try{if(!(navigator.sendBeacon&&navigator.sendBeacon(M,mail)))fetch(M,{method:'POST',body:mail,keepalive:true})}catch(x){}
var show=function(){var d=document.createElement('div');d.className='dnt-ok';d.setAttribute('role','status');d.innerHTML='<b>תודה! הקובץ מוכן.</b><a href="'+P+'" target="_blank" rel="noopener" download>להורדת הקובץ (PDF)</a>';f.parentNode.replaceChild(d,f);try{if(window.dataLayer)dataLayer.push({event:'checklist_download',form:'netanya-checklist'})}catch(x){}};
var ctl=window.AbortController?new AbortController():null;var tm=setTimeout(function(){if(ctl)ctl.abort()},12000);
fetch(A,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined}).then(function(r){return r.json()}).then(function(){clearTimeout(tm);show()}).catch(function(){clearTimeout(tm);show()})})});
})();</script>
	<?php
}

/* שלוש תמונות מהצלחות המשרד (לקוחות ביום החתימה), מתוך הגלריה שכבר באתר */
function dnt_photos_sc() {
	$ids = array(4424, 4430, 4442);
	$alts = array('לקוחות חותמים על עסקת מקרקעין במשרד עו״ד יקיר דבול בנתניה', 'חתימה על עסקת דירה בחדר הישיבות של המשרד ברחוב רזיאל 1, נתניה', 'לקוחות ועו״ד יקיר דבול אחרי סגירת עסקת נדל״ן בנתניה');
	$o = '<div class="ph3"><h3>מהמשרד: לקוחות ביום החתימה</h3><div class="g">';
	foreach ($ids as $i => $id) {
		$img = wp_get_attachment_image($id, 'medium_large', false, array('alt' => $alts[$i], 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '(max-width:767px) 33vw, 360px'));
		if ($img) $o .= '<figure>' . $img . '</figure>';
	}
	return $o . '</div><p>תמונות מעסקאות שהמשרד ליווה. <a href="https://dabullaw.co.il/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/">עוד המלצות והצלחות</a></p></div>';
}

add_action('init', function () {
	add_shortcode('dnt_form', 'dnt_form_sc');
	add_shortcode('dnt_photos', 'dnt_photos_sc');
	add_shortcode('dnt_checklist_form', 'dnt_checklist_sc');
});

/* פירורי לחם של יוסט: בלי הקטגוריה "מידע משפטי" בעמוד הזה */
add_filter('wpseo_breadcrumb_links', function ($links) {
	if (!is_single(DNT_POST) || !is_array($links) || count($links) < 3) return $links;
	return array(reset($links), end($links));
}, 20);

/* נתוני העמוד לגוגל: מה להקריא, מי בדק, ועל איזה שירות העמוד */
add_filter('wpseo_schema_webpage', function ($data) {
	if (!is_single(DNT_POST)) return $data;
	$url = get_permalink(DNT_POST);
	$data['speakable'] = array('@type' => 'SpeakableSpecification', 'cssSelector' => array('.dnt h1', '.dnt-lead', '.dnt .sum'));
	$data['reviewedBy'] = array('@id' => 'https://dabullaw.co.il/#yakir-dabul');
	$data['about'] = array('@id' => $url . '#service');
	$data['mainEntity'] = array('@id' => $url . '#service');
	$data['lastReviewed'] = get_the_modified_date('Y-m-d', DNT_POST);
	return $data;
}, 20);

/* פעולות ניהול לעמוד */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/netanya', array(
		'methods' => 'POST',
		'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function (WP_REST_Request $r) {
			$a = $r->get_param('action');
			$tpl = 3945;
			$st = function () use ($tpl) {
				return array(
					'template' => get_post_meta(DNT_POST, '_wp_page_template', true),
					'title' => get_post_meta(DNT_POST, '_yoast_wpseo_title', true),
					'desc' => get_post_meta(DNT_POST, '_yoast_wpseo_metadesc', true),
					'conditions' => get_post_meta($tpl, '_elementor_conditions', true),
					'pdf' => get_option('dnt_checklist_pdf', ''),
					'len' => strlen(get_post_field('post_content', DNT_POST)),
					'md5' => md5(get_post_field('post_content', DNT_POST)),
				);
			};
			$regen = function () {
				if (class_exists('\ElementorPro\Modules\ThemeBuilder\Module')) {
					$cm = \ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager();
					if (method_exists($cm, 'get_cache')) { $c = $cm->get_cache(); if (method_exists($c, 'regenerate')) { $c->regenerate(); return 'regenerated'; } }
					if (method_exists($cm, 'clear_cache')) { $cm->clear_cache(); return 'cleared'; }
				}
				return 'none';
			};
			if ($a === 'status') return $st();
			if ($a === 'apply') {
				$before = $st();
				if (!get_option('dnt_before')) update_option('dnt_before', $before, false);
				$res = wp_remote_get($r->get_param('url'), array('timeout' => 30));
				if (is_wp_error($res)) return new WP_Error('fetch', $res->get_error_message(), array('status' => 500));
				$body = wp_remote_retrieve_body($res);
				if (md5($body) !== $r->get_param('md5')) return new WP_Error('md5', 'md5 mismatch ' . md5($body), array('status' => 400));
				$u = wp_update_post(array('ID' => DNT_POST, 'post_content' => wp_slash($body)), true);
				if (is_wp_error($u)) return $u;
				update_post_meta(DNT_POST, '_wp_page_template', 'elementor_header_footer');
				if ($r->get_param('title')) update_post_meta(DNT_POST, '_yoast_wpseo_title', sanitize_text_field($r->get_param('title')));
				if ($r->get_param('desc')) update_post_meta(DNT_POST, '_yoast_wpseo_metadesc', sanitize_text_field($r->get_param('desc')));
				$c = get_post_meta($tpl, '_elementor_conditions', true);
				if (!is_array($c)) $c = array();
				$ex = 'exclude/singular/post/' . DNT_POST;
				if (!in_array($ex, $c, true)) { $c[] = $ex; update_post_meta($tpl, '_elementor_conditions', $c); }
				$g = $regen();
				clean_post_cache(DNT_POST);
				return array('before' => $before, 'after' => $st(), 'regen' => $g, 'cache' => get_option('elementor_pro_theme_builder_conditions'));
			}
			if ($a === 'pdf') {
				require_once ABSPATH . 'wp-admin/includes/file.php';
				require_once ABSPATH . 'wp-admin/includes/media.php';
				require_once ABSPATH . 'wp-admin/includes/image.php';
				$tmp = download_url($r->get_param('url'), 60);
				if (is_wp_error($tmp)) return $tmp;
				if (md5_file($tmp) !== $r->get_param('md5')) { @unlink($tmp); return new WP_Error('md5', 'md5 mismatch', array('status' => 400)); }
				$id = media_handle_sideload(array('name' => sanitize_file_name($r->get_param('name')), 'tmp_name' => $tmp), 0, $r->get_param('title'));
				if (is_wp_error($id)) { @unlink($tmp); return $id; }
				$url = wp_get_attachment_url($id);
				update_option('dnt_checklist_pdf', $url, false);
				return array('id' => $id, 'url' => $url);
			}
			if ($a === 'thumbs') {
				$out = array();
				foreach ((array) $r->get_param('ids') as $id) {
					$f = get_attached_file((int) $id);
					if (!$f || !file_exists($f)) { $out[$id] = null; continue; }
					$ed = wp_get_image_editor($f);
					if (is_wp_error($ed)) { $out[$id] = null; continue; }
					$sz = $ed->get_size();
					$mx = min(1600, max(100, (int) ($r->get_param('max') ?: 360))); $ed->resize($mx, $mx, false);
					$tmp = wp_tempnam('dnt') . '.jpg';
					$sv = $ed->save($tmp, 'image/jpeg');
					if (is_wp_error($sv)) { $out[$id] = null; continue; }
					$out[$id] = array('w' => $sz['width'], 'h' => $sz['height'], 'b64' => base64_encode(file_get_contents($sv['path'])));
					@unlink($sv['path']); @unlink($tmp);
				}
				return $out;
			}
			if ($a === 'restore') {
				$b = get_option('dnt_before');
				if (is_array($b)) {
					if ($b['template'] === '') delete_post_meta(DNT_POST, '_wp_page_template'); else update_post_meta(DNT_POST, '_wp_page_template', $b['template']);
					update_post_meta(DNT_POST, '_yoast_wpseo_title', $b['title']);
					update_post_meta(DNT_POST, '_yoast_wpseo_metadesc', $b['desc']);
					update_post_meta($tpl, '_elementor_conditions', $b['conditions']);
					$regen();
				}
				return $st();
			}
			return new WP_Error('action', 'unknown action', array('status' => 400));
		},
	));
});
