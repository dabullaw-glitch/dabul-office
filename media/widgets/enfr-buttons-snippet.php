/* Live as Code Snippet 32 (9.10.2026).
   The English (7006) and French (6999) landing pages have their own WhatsApp / Call buttons in their language.
   The site-wide Hebrew call bar (snippet "WhatsApp and call buttons") is hidden on these two pages only, with the space it keeps.
   The page block runs edge to edge (no white frame around the design). */
add_action('wp_head', function () {
	if (is_admin() || !is_page(array(7006, 6999))) return;
	echo '<style id="dabul-enfr-nobar">#dbl-cbar{display:none!important}'
		. 'body.page-id-7006 .elementor>.e-con,body.page-id-6999 .elementor>.e-con{padding:0!important;max-width:100%!important;--padding-top:0px;--padding-bottom:0px;--padding-left:0px;--padding-right:0px}'
		. 'body.page-id-7006 .elementor>.e-con>.e-con-inner,body.page-id-6999 .elementor>.e-con>.e-con-inner{max-width:100%!important;padding:0!important;width:100%}'
		. '@media (max-width:767px){body{padding-bottom:0!important}.onetap-container-toggle,.onetap-container-toggle .onetap-toggle{bottom:90px!important}}</style>' . "\n";
}, 30);
