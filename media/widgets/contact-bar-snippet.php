/* dabul: WhatsApp and call buttons (Yakir approved, section 3, 8.10.2026).
   Phone: a floating dark pill at the bottom (Yakir chose option 2 on 8.10.2026; almost black, faint white frame on the WhatsApp half): a gold "התקשרו עכשיו" half (dials the office)
   and a "וואטסאפ" half with a green circle (opens a chat with Yakir, with a
   ready message naming the page). The big green "פנו אלינו" banner and the WhatsApp circle that opened a form are hidden
   on the phone, and so is the floating group circle (74d8bec; the group keeps its button and footer icon); the accessibility button moves up so it does not cover the bar.
   The space kept free under the bar is part of the dark footer, so no white strip shows at the very bottom (Yakir asked, 8.10.2026).
   Computer: the green banner is hidden; the WhatsApp circle opens a direct chat instead of the form.
   Footer / menu WhatsApp icons (they led to the community group) open a direct chat; the group keeps its own icon.
   To undo everything: deactivate this snippet. */

function dabul_wa_link() {
	if (is_front_page()) $msg = 'שלום, הגעתי מהאתר ואשמח לשאול...';
	else {
		$t = is_singular() ? get_the_title() : wp_strip_all_tags(wp_get_document_title());
		$t = trim(preg_replace('/\s*[|\-–]\s*עו.?ד יקיר דבול.*$/u', '', html_entity_decode($t, ENT_QUOTES, 'UTF-8')));
		$msg = 'שלום, הגעתי מהעמוד "' . mb_substr($t, 0, 80) . '" באתר ואשמח לשאול...';
	}
	return 'https://wa.me/972505580189?text=' . rawurlencode($msg);
}

add_action('wp_head', function () {
	if (is_admin()) return;
	echo '<style id="dabul-cbar-css">'
		. '#dbl-cbar{display:none}'
		. '.elementor-element-434b289{display:none!important}'
		. '@media (max-width:767px){'
		. '#dbl-cbar{display:flex;position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9990;gap:0;padding:6px;border-radius:999px;background:#070a14;border:1px solid rgba(231,205,150,.32);box-shadow:0 14px 34px rgba(8,12,28,.45);direction:rtl}'
		. '#dbl-cbar a{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;height:52px;border-radius:999px;font-weight:800;font-size:16.5px;text-decoration:none;font-family:inherit;color:#fff;background:transparent}'
		. '#dbl-cbar .c{background:linear-gradient(135deg,#f0d9a0,#c9a14f);color:#141008}#dbl-cbar .w{box-shadow:inset 0 0 0 1px rgba(255,255,255,.26);margin-right:6px}'
		. '#dbl-cbar .ic{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:7px;box-sizing:border-box}'
		. '#dbl-cbar .c .ic{background:rgba(20,16,8,.12)}#dbl-cbar .w .ic{background:#25d366;color:#fff}#dbl-cbar svg{width:100%;height:100%;display:block}'
		. 'body{padding-bottom:92px}body:has(#dbl-foot){padding-bottom:0!important}#dbl-foot{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}'
		. '.elementor-element-094a351,.elementor-element-74d8bec{display:none!important}'
		. '.onetap-container-toggle,.onetap-container-toggle .onetap-toggle{bottom:100px!important;top:auto!important}'
		. '}'
		. '</style>' . "\n";
}, 21);

add_action('wp_footer', function () {
	if (is_admin()) return;
	$wa = esc_url(dabul_wa_link());
	echo '<div id="dbl-cbar" role="navigation" aria-label="יצירת קשר מהירה">'
		. '<a class="c" href="tel:098613413"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></span>התקשרו עכשיו</a>'
		. '<a class="w" href="' . $wa . '" target="_blank" rel="noopener"><span class="ic"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg></span>וואטסאפ</a>'
		. '</div>' . "\n";
}, 98);

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$wa = esc_url(dabul_wa_link());
		// the WhatsApp circle opened the form popup (3815): now a direct chat
		$html = str_replace('href="#elementor-action%3Aaction%3Dpopup%3Aopen%26settings%3DeyJpZCI6IjM4MTUiLCJ0b2dnbGUiOmZhbHNlfQ%3D%3D"', 'href="' . $wa . '" aria-label="שיחת וואטסאפ עם המשרד"', $html);
		// WhatsApp icons in the footer and the phone menu: a direct chat (the group keeps its own separate icon)
		$html = preg_replace('#(<a class="elementor-icon elementor-social-icon elementor-social-icon-[^ "]* elementor-repeater-item-bf4091e" href=")https://chat\.whatsapp\.com/[^"]*(")#', '${1}' . $wa . '${2}', $html);
		// the separate group icon gets a clear name
		$html = preg_replace('#(<a class="elementor-icon" href="https://chat\.whatsapp\.com/[^"]*")#', '${1} aria-label="הצטרפות לקבוצת הוואטסאפ של המשרד" title="הצטרפות לקבוצת הוואטסאפ"', $html);
		return $html;
	});
}, 1);
