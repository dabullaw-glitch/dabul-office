/* dabul: speed (26.10.2026, Yakir asked for phone PageSpeed 95+).
   About ten style files are already loaded "on the side" (they never held the first screen back): the footer, the
   carousels, the videos, the accessibility panel and a few animations. But the phone still started downloading
   them at the very first moment, together with the top picture, and Google's phone test counts that against the
   top of the page.
   Now they start right after the page has finished loading (or at the visitor's first touch, if that comes earlier).
   Each one stays in its place in the page, so the order of the style rules is exactly the same. Checked: the first
   screen on the phone looks the same with and without them.
   To undo: deactivate this snippet. */
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$n = 0;
		$out = preg_replace_callback('#<link\b[^>]*>#i', function ($m) use (&$n) {
			$t = $m[0];
			if (!preg_match('#\bmedia=([\'"])print\1#i', $t) || stripos($t, 'onload=') === false || !preg_match('#\brel=([\'"])stylesheet\1#i', $t)) return $t;
			if (stripos($t, 'onetap-fonts-readable') !== false) return $t;
			$t2 = preg_replace('#\s+onload=(["\'])this\.media=([\'"])all\2;?\1#i', '', $t);
			if (!is_string($t2) || $t2 === $t) return $t;
			$t2 = preg_replace('#\brel=([\'"])stylesheet\1#i', 'rel="dbl-late"', $t2, 1);
			$t2 = preg_replace('#\bmedia=([\'"])print\1#i', "media='all'", $t2, 1);
			$n++;
			return $t2;
		}, $html);
		if (!is_string($out) || $n === 0) return $html;
		$js = '<script nowprocket data-no-optimize="1" data-no-defer="1">(function(){var d=0;function go(){if(d)return;d=1;var l=document.querySelectorAll(\'link[rel="dbl-late"]\');for(var i=0;i<l.length;i++)l[i].rel="stylesheet";}function soon(){setTimeout(go,0)}if(document.readyState==="complete")soon();else addEventListener("load",soon);["pointerdown","keydown","touchstart"].forEach(function(e){addEventListener(e,go,{capture:true,passive:true,once:true})})})();</script>';
		$pos = strripos($out, '</body>');
		if ($pos === false) return $html;
		return substr($out, 0, $pos) . $js . substr($out, $pos);
	});
}, 3);
