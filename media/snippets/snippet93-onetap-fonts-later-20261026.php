/* dabul: speed (26.10.2026, Yakir asked for phone PageSpeed 95+).
   The accessibility panel (OneTap) loads a style file of "readable fonts" (Roboto and others). Google's phone test
   then downloads three Roboto font files (about 200KB) while the top of the home page is still loading,
   which held back the top picture by about two seconds. Nothing on the page uses these fonts until a visitor
   opens the accessibility panel and picks "readable font".
   Now that style file is added only after the visitor's first touch, click or key press, so the panel
   works the same way, and the first screen loads without those fonts.
   To undo: deactivate this snippet. */
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false || strpos($html, 'onetap-fonts-readable') === false) return $html;
		$found = '';
		$out = preg_replace_callback('#<link\b(?=[^>]*onetap-fonts-readable)[^>]*\bmedia=([\'"])print\1[^>]*>#i', function ($m) use (&$found) {
			if (!preg_match('#\bhref=([\'"])([^\'"]+)\1#i', $m[0], $h)) return $m[0];
			$found = html_entity_decode($h[2]);
			return '';
		}, $html, 1);
		if (!is_string($out) || $found === '') return $html;
		$js = '<script nowprocket data-no-optimize="1" data-no-defer="1">(function(){var u=' . wp_json_encode($found) . ',d=0;function go(){if(d)return;d=1;var l=document.createElement("link");l.rel="stylesheet";l.href=u;document.head.appendChild(l);["pointerdown","keydown","touchstart"].forEach(function(e){removeEventListener(e,go,true)})}["pointerdown","keydown","touchstart"].forEach(function(e){addEventListener(e,go,{capture:true,passive:true})})})();</script>';
		$pos = strripos($out, '</body>');
		if ($pos === false) return $html;
		return substr($out, 0, $pos) . $js . substr($out, $pos);
	});
}, 2);
