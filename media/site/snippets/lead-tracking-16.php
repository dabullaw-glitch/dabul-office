/* dabul: lead tracking for Google Analytics (Yakir approved, section 4, 8.10.2026).
   Counts, per page: clicks on the phone number (phone_click), clicks on WhatsApp (whatsapp_click), clicks on email
   (email_click) and forms sent (lead_form_submit). No personal details are sent: only the event and the page.
   Nothing on the site looks different. A monthly report goes to Yakir on Telegram (edge function leadstats).
   20.10.2026 (Yakir approved, leads plan item 1): each phone / WhatsApp / email click is also logged in the office
   system (edge function siteclick, docs coll siteclicks) with the page, the page the visit started on and where the
   visitor came from (Google, Facebook, direct...). It creates no lead and sends no alert.
   To stop: deactivate this snippet. */

add_action('wp_footer', function () {
	if (is_admin()) return;
	echo <<<'DABULJS'
<script nowprocket data-no-optimize="1">
(function () {
	var w = window;
	w.dataLayer = w.dataLayer || [];
	if (typeof w.gtag !== 'function') { w.gtag = function () { w.dataLayer.push(arguments); }; }
	var SS = null;
	try { SS = w.sessionStorage; } catch (e) {}
	try {
		if (SS && !SS.getItem('dblLand')) {
			var qs = new URLSearchParams(w.location.search);
			SS.setItem('dblLand', w.location.pathname);
			SS.setItem('dblRef', document.referrer || '');
			SS.setItem('dblUtm', qs.get('utm_source') || (qs.get('fbclid') ? 'facebook' : (qs.get('gclid') ? 'google-ads' : '')));
		}
	} catch (e) {}
	function get(k) { try { return SS ? (SS.getItem(k) || '') : ''; } catch (e) { return ''; } }
	function log(kind, t) {
		try {
			var body = JSON.stringify({ kind: kind, page: w.location.pathname, landing: get('dblLand'), ref: get('dblRef'), utm: get('dblUtm'), text: t });
			if (navigator.sendBeacon) { navigator.sendBeacon('https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/siteclick', new Blob([body], { type: 'text/plain' })); }
		} catch (e) {}
	}
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
		if (h.indexOf('tel:') === 0) { send('phone_click', { link_text: t }); log('phone', t); return; }
		if (/wa\.me|whatsapp\.com|api\.whatsapp/i.test(h)) { var grp = /chat\.whatsapp\.com/i.test(h); send('whatsapp_click', { link_text: t, whatsapp_kind: grp ? 'group' : 'direct' }); if (!grp) { log('whatsapp', t); } return; }
		if (h.indexOf('mailto:') === 0) { send('email_click', { link_text: t }); log('email', t); }
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
