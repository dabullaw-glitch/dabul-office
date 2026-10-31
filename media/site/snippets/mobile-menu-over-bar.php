/* dabul: on the phone, while the menu is open it covers the bottom contact bar (Yakir, 31.10.2026:
   "ברגע שפותחים את התפריט, שהתפריט יעלה על החלק התחתון של התקשרו עכשיו ולתיאום ייעוץ").
   The menu sits inside the sticky header, so it cannot rise above the bar by z-index alone. Instead the bar hides while
   the menu is open and comes back when it closes. Phone only (the bar exists only under 768px).
   To undo: deactivate this snippet. */
add_action('wp_head', function () {
	if (is_admin()) return;
	echo '<style id="dabul-menu-over-bar">@media (max-width:767px){'
		. 'body:has(.e-off-canvas[aria-hidden="false"]) #dbl-cbar,body.dbl-menu-open #dbl-cbar{display:none!important}'
		. '}</style>';
}, 99);
add_action('wp_footer', function () {
	if (is_admin()) return;
	// fallback for older phones without :has(): follow the menu's aria-hidden and set a class on body
	echo '<script nowprocket id="dabul-menu-over-bar-js">(function(){var o=document.querySelectorAll(".e-off-canvas");if(!o.length||!window.MutationObserver)return;'
		. 'function s(){var open=false;o.forEach(function(e){if(e.getAttribute("aria-hidden")==="false")open=true;});document.body.classList.toggle("dbl-menu-open",open);}'
		. 'var m=new MutationObserver(s);o.forEach(function(e){m.observe(e,{attributes:true,attributeFilter:["aria-hidden"]});});s();})();</script>';
}, 99);
