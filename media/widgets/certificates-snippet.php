/* dabul: certificates carousel on the home page, like the reference site (Yakir approved, 8.10.2026, without the zoom button).
   4 large certificates instead of 5 small ones (1 on the phone), full quality pictures, no gold frame, soft shadow,
   round arrows, no dots. The button under the carousel stays. To undo: deactivate this snippet. */

add_action('template_redirect', function () {
	if (is_admin() || !is_front_page()) return;
	ob_start(function ($html) {
		if (!is_string($html) || strpos($html, 'elementor-element-f595e2b') === false) return $html;
		return preg_replace_callback('#(<div class="elementor-element elementor-element-f595e2b .*?data-settings=")([^"]*)(".*?</figure></a></div>\s*</div>)#s', function ($m) {
			$set = str_replace('&quot;slides_to_show&quot;:&quot;5&quot;', '&quot;slides_to_show&quot;:&quot;4&quot;,&quot;slides_to_show_tablet&quot;:&quot;2&quot;,&quot;slides_to_show_mobile&quot;:&quot;1&quot;', $m[2]);
			$body = preg_replace('#(/wp-content/uploads/[^"\s]+)-212x300(\.(?:webp|jpe?g|png))#', '$1$2', $m[3]);
			return $m[1] . $set . $body;
		}, $html, 1);
	});
}, 6);

add_action('wp_head', function () {
	if (!is_front_page()) return;
	echo '<style id="dbl-cert-css">'
		. '.elementor-element-f595e2b .swiper-pagination{display:none!important}'
		. '.elementor-element-f595e2b .elementor-swiper-button{width:64px!important;height:64px!important;border-radius:50%!important;border:1px solid #cfcfcf!important;background:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important}'
		. '.elementor-element-f595e2b .elementor-swiper-button svg{width:22px!important;height:22px!important;fill:#141414!important}'
		. '@media (max-width:767px){.elementor-element-f595e2b .elementor-swiper-button{width:46px!important;height:46px!important}}'
		. '</style>';
}, 40);

add_action('wp_footer', function () {
	if (!is_front_page()) return;
	echo <<<'DBLCERT'
<script nowprocket data-no-optimize="1">
(function () {
	function fix() {
		document.querySelectorAll('.elementor-element-f595e2b').forEach(function (root) {
			var H = window.innerWidth < 768 ? 400 : 470;
			root.querySelectorAll('.swiper-slide, .swiper-slide-inner, .swiper-slide a, figure, img').forEach(function (e) {
				['height', 'min-height', 'max-height'].forEach(function (k) { e.style.setProperty(k, H + 'px', 'important'); });
			});
			root.querySelectorAll('.swiper-slide a').forEach(function (a) { a.style.setProperty('display', 'block', 'important'); a.style.setProperty('width', '100%', 'important'); });
			root.querySelectorAll('img').forEach(function (i) {
				var s = i.style;
				s.setProperty('width', '100%', 'important'); s.setProperty('object-fit', 'cover', 'important'); s.setProperty('border', '0', 'important');
				s.setProperty('padding', '0', 'important'); s.setProperty('border-radius', '6px', 'important'); s.setProperty('background', '#fff', 'important');
				s.setProperty('box-shadow', '0 14px 34px rgba(20,20,20,.10)', 'important');
			});
			root.querySelectorAll('.elementor-image-carousel-wrapper, .swiper-wrapper').forEach(function (e) { e.style.setProperty('height', 'auto', 'important'); e.style.setProperty('max-height', 'none', 'important'); e.style.setProperty('padding-bottom', '24px', 'important'); });
			var sw = root.querySelector('.swiper'); if (sw && sw.swiper) { try { sw.swiper.update(); } catch (x) {} }
		});
	}
	window.addEventListener('load', function () { fix(); setTimeout(fix, 800); setTimeout(fix, 2500); });
	window.addEventListener('resize', function () { clearTimeout(window.__dblc); window.__dblc = setTimeout(fix, 200); });
})();
</script>
DBLCERT;
}, 99);
