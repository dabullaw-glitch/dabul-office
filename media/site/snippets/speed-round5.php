/* dabul: speed, round 5 (Yakir asked on 20.10.2026: raise the phone PageSpeed score, PageSpeed showed 87).
   Nothing changes in how the site looks.
   1. Scripts that are not needed to show the page start only after the visitor first scrolls, touches, clicks,
      moves the mouse or presses a key: the Google tag (Analytics and Ads), Google reCAPTCHA (the forms wait for it
      by themselves, and a visitor always touches the page before sending a form), the reviews widget loader
      (Trustindex) and the Fixdigital integration script.
   2. Two style files that were added at the bottom of the page and held it back (the post-info widget and the
      WhatsApp popup, template 3815) now load without holding the page back.
   Live since 20.10.2026 (checked: forms get reCAPTCHA after the first touch, Google tag loads). To undo: deactivate. */
define('DABUL_SP5_LIVE', 1);

function dabul_sp5_on() {
	if (DABUL_SP5_LIVE) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

function dabul_sp5_transform($html) {
	if (!is_string($html) || stripos($html, '<html') === false || stripos($html, '</body>') === false) return $html;
	$pats = array('googletagmanager.com/gtag/js', 'google.com/recaptcha/api.js', 'cdn.trustindex.io/loader.js', 'fixdigital-integration/');
	$n = 0;
	$html = preg_replace_callback('#<script\b([^>]*?)\ssrc=(["\'])([^"\']+)\2([^>]*)>\s*</script>#i', function ($m) use ($pats, &$n) {
		foreach ($pats as $p) {
			if (strpos($m[3], $p) !== false) {
				$attrs = preg_replace('#\s(type|async|defer)(=(["\'])[^"\']*\3)?#i', '', $m[1] . ' ' . $m[4]);
				$n++;
				return '<script type="dabul/delay" data-src="' . $m[3] . '"' . rtrim($attrs) . '></script>';
			}
		}
		return $m[0];
	}, $html);
	foreach (array('widget-post-info-css', 'elementor-post-3815-css') as $id) {
		$html = preg_replace('#<link rel=(["\'])stylesheet\1 id=(["\'])' . preg_quote($id, '#') . '\2([^>]*?) media=(["\'])all\4\s*/?>#i', '<link rel="stylesheet" id="' . $id . '"$3 media="print" onload="this.media=\'all\'">', $html);
	}
	if ($n && strpos($html, 'id="dabul-sp5"') === false) {
		$js = '<script id="dabul-sp5">(function(){var done=false,ev=["scroll","touchstart","mousemove","keydown","click","wheel","pointerdown"];'
			. 'function go(){if(done)return;done=true;ev.forEach(function(e){removeEventListener(e,go,{passive:true})});'
			. 'document.querySelectorAll(\'script[type="dabul/delay"]\').forEach(function(o){var s=document.createElement("script");'
			. 'for(var i=0;i<o.attributes.length;i++){var a=o.attributes[i];if(a.name!=="type"&&a.name!=="data-src")s.setAttribute(a.name,a.value);}'
			. 's.src=o.getAttribute("data-src");s.async=false;o.parentNode.replaceChild(s,o);});}'
			. 'ev.forEach(function(e){addEventListener(e,go,{passive:true})});})();</script>';
		$html = preg_replace('#</body>#i', $js . "\n</body>", $html, 1);
	}
	return $html;
}

// WP Rocket saves its cached copy before the page's own output buffers finish, so the change is also applied there
add_filter('rocket_buffer', function ($html) { return dabul_sp5_on() ? dabul_sp5_transform($html) : $html; }, 999);

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	if (!dabul_sp5_on()) return;
	ob_start('dabul_sp5_transform');
}, 1);
