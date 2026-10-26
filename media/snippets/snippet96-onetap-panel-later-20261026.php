/* dabul: speed (26.10.2026, Yakir asked for phone PageSpeed 95+).
   The accessibility panel (OneTap) sent its whole hidden window (about 370 elements, 70KB) and its settings data
   (about 17KB) inside every page, about an eighth of the home page, although the panel's own script only runs after
   the visitor's first touch (WP Rocket holds it until then).
   Now the hidden window and its data are kept in a small separate file, which WP Rocket loads at that same first
   touch, right before the panel's script. The accessibility button shows as before, and the panel opens and works
   the same way. The file's name changes whenever its content changes, so a visitor never gets an old copy.
   Files are kept in wp-content/uploads/dbl-cache/ (the 8 newest are kept).
   To undo: deactivate this snippet. */
function dabul_otp_file($js) {
	$up = wp_upload_dir();
	if (!empty($up['error'])) return '';
	$dir = trailingslashit($up['basedir']) . 'dbl-cache';
	$name = 'onetap-' . substr(md5($js), 0, 16) . '.js';
	$path = $dir . '/' . $name;
	if (!is_file($path)) {
		if (!is_dir($dir) && !wp_mkdir_p($dir)) return '';
		$tmp = $path . '.' . wp_rand(1000, 9999) . '.tmp';
		if (@file_put_contents($tmp, $js) === false || !@rename($tmp, $path)) { @unlink($tmp); return ''; }
		$old = glob($dir . '/onetap-*.js');
		if (is_array($old) && count($old) > 8) {
			usort($old, function ($a, $b) { return filemtime($b) - filemtime($a); });
			foreach (array_slice($old, 8) as $f) @unlink($f);
		}
	}
	return trailingslashit($up['baseurl']) . 'dbl-cache/' . $name;
}

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	if (!defined('DABUL_OTP_LIVE') && empty($_GET['dblot'])) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		if (strpos($html, '<nav class="onetap-accessibility') === false) return $html;
		// the 5-languages trim of speed round 4 is done here first, so the separate file keeps the same 5 languages
		if (function_exists('dabul_sp4_onetap')) { $x = dabul_sp4_onetap($html); if (is_string($x) && $x !== '') $html = $x; }
		$n0 = strpos($html, '<nav class="onetap-accessibility');
		if ($n0 === false) return $html;
		$n1 = strpos($html, '</nav>', $n0);
		if ($n1 === false) return $html;
		$nav = substr($html, $n0, $n1 + 6 - $n0);
		if (substr_count($nav, '<nav') !== 1) return $html;
		if (!preg_match('#<script id="accessibility-onetap-js-extra">(.*?)</script>#s', $html, $ex, PREG_OFFSET_CAPTURE)) return $html;
		if (strpos($html, 'id="accessibility-onetap-js"') === false) return $html;
		$data = trim($ex[1][0]);
		$js = "(function(){var h=" . wp_json_encode($nav, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";var t=document.querySelector('.onetap-container-toggle');if(t&&t.parentNode){t.insertAdjacentHTML('afterend',h)}else{document.body.insertAdjacentHTML('beforeend',h)}})();\n" . $data . "\n";
		$url = dabul_otp_file($js);
		if ($url === '') return $html;
		// a plain deferred script: WP Rocket holds it until the first touch like the panel's own script, and keeps the order
		$tag = '<script src="' . esc_url($url) . '" id="dbl-onetap-panel-js" defer></script>';
		// the data script is replaced by the loader (same place, right before the panel's own script), then the window is taken out
		$html = substr($html, 0, $ex[0][1]) . $tag . substr($html, $ex[0][1] + strlen($ex[0][0]));
		$n0 = strpos($html, '<nav class="onetap-accessibility');
		if ($n0 === false) return $html;
		$n1 = strpos($html, '</nav>', $n0);
		return substr($html, 0, $n0) . substr($html, $n1 + 6);
	});
}, 4);
