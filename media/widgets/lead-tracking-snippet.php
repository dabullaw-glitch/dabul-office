/* dabul: lead tracking for Google Analytics (Yakir approved, section 4, 8.10.2026).
   Counts, per page: clicks on the phone number (phone_click), clicks on WhatsApp (whatsapp_click), clicks on email
   (email_click) and forms sent (lead_form_submit). No personal details are sent: only the event and the page.
   Nothing on the site looks different. A monthly report goes to Yakir on Telegram (edge function leadstats).
   To stop: deactivate this snippet. */

add_action('wp_footer', function () {
	if (is_admin()) return;
	echo <<<'DABULJS'
<script nowprocket data-no-optimize="1">
(function () {
	var w = window;
	w.dataLayer = w.dataLayer || [];
	if (typeof w.gtag !== 'function') { w.gtag = function () { w.dataLayer.push(arguments); }; }
	function send(name, extra) {
		var p = { page_path: w.location.pathname, transport_type: 'beacon' };
		if (extra) { for (var k in extra) { p[k] = extra[k]; } }
		try { w.gtag('event', name, p); } catch (e) {}
	}
	document.addEventListener('click', function (e) {
		var a = e.target.closest ? e.target.closest('a') : null;
		if (!a) return;
		var h = a.getAttribute('href') || '';
		var t = (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 60);
		if (h.indexOf('tel:') === 0) { send('phone_click', { link_text: t }); return; }
		if (/wa\.me|whatsapp\.com|api\.whatsapp/i.test(h)) { send('whatsapp_click', { link_text: t, whatsapp_kind: /chat\.whatsapp\.com/i.test(h) ? 'group' : 'direct' }); return; }
		if (h.indexOf('mailto:') === 0) { send('email_click', { link_text: t }); }
	}, true);
	document.addEventListener('submit', function (e) {
		var f = e.target;
		if (!f || f.tagName !== 'FORM') return;
		if (/search/i.test(f.getAttribute('role') || f.className || '')) return;
		var box = f.closest ? f.closest('[data-id]') : null;
		send('lead_form_submit', { form_name: f.getAttribute('name') || f.id || (box ? box.getAttribute('data-id') : '') || 'form' });
	}, true);
})();
</script>
DABULJS;
}, 99);
