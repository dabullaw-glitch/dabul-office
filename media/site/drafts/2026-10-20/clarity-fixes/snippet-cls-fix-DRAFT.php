/* dabul: steady page while loading (DRAFT 20.10.2026, NOT ACTIVE, waiting for Yakir's approval).
   Why: Clarity shows "needs improvement" for layout shift (CLS 0.16). In an offline test of the live pages, three things
   jump while a page loads on a computer, because their style file arrives after the page is already drawn:
     1. the side box "לשיחת ייעוץ / השאירו פרטים" in articles (its file post-920.css is linked at the very end of the page):
        it first shows the photo full size and then shrinks;
     2. the author / date line under the article title (its small file loads "later" on purpose): it moves 13px;
     3. on the home page, the floating WhatsApp circle and Google badge (desktop): they jump into place.
   What this does: prints the same style rules at the top of the page, so the page is drawn correctly the first time.
   Nothing looks different: these are the exact rules the page already uses, just earlier. When the original files arrive
   they still apply (they come later, so they win), so any later edit in Elementor keeps working.
   Lab result (offline copy of the live pages, desktop width): home 0.030 -> 0.000, price list 0.030 -> 0.001,
   arnona 0.030 -> 0.001. Phone: already ~0.003 in the lab, no change.
   To undo: deactivate this snippet. */
add_action('wp_head', function () {
	if (is_admin()) return;
	$css = '';
	if (is_front_page()) {
		// 3) home page floating buttons (copied from post-622.css, only the rules of 844bd60 and 094a351)
		$css .= 'body:not(.rtl) .elementor-622 .elementor-element.elementor-element-844bd60{left:15px;}body.rtl .elementor-622 .elementor-element.elementor-element-844bd60{right:15px;}.elementor-622 .elementor-element.elementor-element-844bd60{bottom:21px;}.elementor-622 .elementor-element.elementor-element-844bd60 img{width:187px;}body:not(.rtl) .elementor-622 .elementor-element.elementor-element-094a351{right:13px;}body.rtl .elementor-622 .elementor-element.elementor-element-094a351{left:13px;}.elementor-622 .elementor-element.elementor-element-094a351{bottom:78px;z-index:6;}.elementor-622 .elementor-element.elementor-element-094a351 .elementor-icon-wrapper{text-align:center;}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-stacked .elementor-icon{background-color:#30D64E;color:var( --e-global-color-7f4985a );}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-framed .elementor-icon, .elementor-622 .elementor-element.elementor-element-094a351.elementor-view-default .elementor-icon{color:#30D64E;border-color:#30D64E;}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-framed .elementor-icon, .elementor-622 .elementor-element.elementor-element-094a351.elementor-view-default .elementor-icon svg{fill:#30D64E;}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-framed .elementor-icon{background-color:var( --e-global-color-7f4985a );}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-stacked .elementor-icon svg{fill:var( --e-global-color-7f4985a );}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-stacked .elementor-icon:hover{background-color:#09BA27;color:var( --e-global-color-7f4985a );}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-framed .elementor-icon:hover, .elementor-622 .elementor-element.elementor-element-094a351.elementor-view-default .elementor-icon:hover{color:#09BA27;border-color:#09BA27;}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-framed .elementor-icon:hover, .elementor-622 .elementor-element.elementor-element-094a351.elementor-view-default .elementor-icon:hover svg{fill:#09BA27;}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-framed .elementor-icon:hover{background-color:var( --e-global-color-7f4985a );}.elementor-622 .elementor-element.elementor-element-094a351.elementor-view-stacked .elementor-icon:hover svg{fill:var( --e-global-color-7f4985a );}.elementor-622 .elementor-element.elementor-element-094a351 .elementor-icon{padding:10px;}@media(max-width:1024px){.elementor-622 .elementor-element.elementor-element-094a351 .elementor-icon{font-size:38px;}.elementor-622 .elementor-element.elementor-element-094a351 .elementor-icon svg{height:38px;}}@media(max-width:767px){body:not(.rtl) .elementor-622 .elementor-element.elementor-element-094a351{right:15px;}body.rtl .elementor-622 .elementor-element.elementor-element-094a351{left:15px;}.elementor-622 .elementor-element.elementor-element-094a351{bottom:70px;}.elementor-622 .elementor-element.elementor-element-094a351 .elementor-icon{font-size:32px;}.elementor-622 .elementor-element.elementor-element-094a351 .elementor-icon svg{height:32px;}}';
	}
	if (is_singular('post')) {
		$up = wp_upload_dir();
		$files = array(
			$up['basedir'] . '/elementor/css/post-920.css',                                  // 1) side box
			WP_PLUGIN_DIR . '/elementor-pro/assets/css/widget-post-info-rtl.min.css',       // 2) author / date line
		);
		foreach ($files as $f) { if (is_readable($f)) $css .= file_get_contents($f); }
	}
	if ($css !== '') echo '<style id="dbl-cls-fix">' . $css . '</style>' . "\n";
}, 99);
