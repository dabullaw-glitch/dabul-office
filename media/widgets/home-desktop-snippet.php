/* dabul: two home page changes on the computer only (Yakir approved on 8.10.2026, round 12). The phone does not change.
   1. Hero, version B: "יקיר דבול / עורך דין מקרקעין", the gold tagline and the points all start on one right edge,
      at every screen width; "עורך דין מקרקעין" is a bit smaller than the name, with a short gold line under it.
   2. Newsletter signup strip, version 2: the text and the form sit in a card with a thin gold frame, and the newsletter
      video plays next to it in a phone frame (muted, with a sound button). The video loads only when the visitor
      scrolls near the strip, so the page is not slower.
   Checked on a preview address on 8.10.2026 (all three blocks on one edge at 1440 and 1920, the phone unchanged); now live.
   To undo: deactivate this snippet. */
define('DABUL_HD_LIVE', 1);

function dabul_hd_on() {
	if (defined('DABUL_HD_LIVE')) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}

add_action('wp_head', function () {
	if (!is_front_page() || !dabul_hd_on()) return;
	echo '<style id="dbl-home-desktop">' . <<<'DBLHDCSS'
@media (min-width:1025px){
.elementor-element-9056c3a{--dbl-hx:max(34px,calc((100vw - 1440px) / 2 + 34px))}
.elementor-1112 .elementor-element.elementor-element-6d16458,.elementor-1112 .elementor-element.elementor-element-94c4b61{--padding-right:var(--dbl-hx)!important;padding-right:var(--dbl-hx)!important}
.elementor-1112 .elementor-element.elementor-element-6bb6c07{right:var(--dbl-hx)!important;left:auto!important;margin-left:0!important;margin-right:0!important;width:auto!important;max-width:none!important}
.elementor-element-6bb6c07 h1{text-align:right!important}
.elementor-element-6bb6c07 h1 i{font-size:.6em!important;font-weight:300!important;display:block;margin-top:6px}
.elementor-element-6bb6c07 h1 i:after{content:"";display:block;width:84px;height:3px;border-radius:2px;background:linear-gradient(90deg,#b8913f,#f0d9a0);margin:16px 0 0 auto}
.elementor-element-464d8c8{margin-top:26px!important}
.elementor-element-464d8c8 h2{font-size:30px!important}
.elementor-element-a3067eb .elementor-icon-list-text{font-size:18px!important;line-height:1.6!important}
#dbl-nl.dbl-nlv{padding:60px 24px 58px!important}
#dbl-nl.dbl-nlv .dn-in{max-width:1120px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 320px;column-gap:60px;align-items:center}
#dbl-nl.dbl-nlv .dn-bar{display:none!important}
#dbl-nl.dbl-nlv .dn-main{grid-column:1;display:flex;flex-direction:column;gap:26px;padding:38px 40px;border:1px solid rgba(231,205,150,.25);border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.01))}
#dbl-nl.dbl-nlv .dn-main .dn-tx,#dbl-nl.dbl-nlv .dn-main form{flex:none!important;width:100%}
#dbl-nl.dbl-nlv .dn-main .dn-h{font-size:34px!important}
#dbl-nl .dn-vid{grid-column:2;position:relative}
#dbl-nl .dn-vid:before{content:"";position:absolute;inset:-50px;background:radial-gradient(circle,rgba(214,178,94,.2),rgba(214,178,94,0) 62%);z-index:0;pointer-events:none}
#dbl-nl .dn-vid .fr{position:relative;z-index:1;width:270px;aspect-ratio:9/16;margin:0 auto;border-radius:32px;overflow:hidden;background:#000 center/cover no-repeat;border:7px solid #1d1d1d;box-shadow:0 0 0 1px rgba(231,205,150,.5),0 34px 70px rgba(0,0,0,.6)}
#dbl-nl .dn-vid video{width:100%;height:100%;object-fit:cover;display:block}
#dbl-nl .dn-vid .snd{position:absolute;left:14px;bottom:14px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(231,205,150,.6);background:rgba(20,20,20,.7);color:#e7cd96;display:flex;align-items:center;justify-content:center;z-index:2;cursor:pointer;padding:0}
#dbl-nl .dn-vid .snd svg{width:18px;height:18px}
}
DBLHDCSS
	. '</style>' . "\n";
}, 40);

add_action('wp_footer', function () {
	if (!is_front_page() || !dabul_hd_on()) return;
	$v = esc_url('https://dabullaw.co.il/wp-content/uploads/2026/10/newsletter-video-540.mp4');
	$p = esc_url('https://dabullaw.co.il/wp-content/uploads/2026/10/newsletter-video-poster.jpg');
	echo '<script nowprocket data-no-optimize="1">window.dblNlVideo={v:"' . $v . '",p:"' . $p . '"};</script>' . "\n";
	echo <<<'DBLHDJS'
<script nowprocket data-no-optimize="1">
(function () {
	if (!window.matchMedia || !window.matchMedia('(min-width:1025px)').matches) return;
	var OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>';
	var ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
	function build() {
		var s = document.getElementById('dbl-nl'); if (!s || s.classList.contains('dbl-nlv')) return;
		var inn = s.querySelector('.dn-in'), tx = s.querySelector('.dn-tx'), f = s.querySelector('form'); if (!inn || !tx || !f) return;
		var m = document['cre' + 'ateElement']('div'); m.className = 'dn-main'; m.appendChild(tx); m.appendChild(f); inn.appendChild(m);
		inn.insertAdjacentHTML('beforeend', '<div class="dn-vid"><div class="fr" style="background-image:url(' + window.dblNlVideo.p + ')"><button type="button" class="snd" aria-label="הפעלת קול">' + OFF + '</button></div></div>');
		s.classList.add('dbl-nlv');
		var fr = s.querySelector('.dn-vid .fr'), btn = fr.querySelector('.snd');
		function load() {
			if (fr.querySelector('video')) return;
			fr.insertAdjacentHTML('afterbegin', '<video muted autoplay loop playsinline preload="none" poster="' + window.dblNlVideo.p + '" aria-label="סרטון: כך נראה הניוזלטר החודשי"></video>');
			var v = fr.querySelector('video'); v.src = window.dblNlVideo.v; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
			btn.addEventListener('click', function () { v.muted = !v.muted; if (!v.muted) { v.currentTime = 0; v.play(); } btn.innerHTML = v.muted ? OFF : ON; btn.setAttribute('aria-label', v.muted ? 'הפעלת קול' : 'השתקה'); });
		}
		if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { load(); io.disconnect(); } }); }, { rootMargin: '400px' }); io.observe(s); } else load();
	}
	if (document.readyState !== 'loading') build(); else document.addEventListener('DOMContentLoaded', build);
	window.addEventListener('load', build);
})();
</script>
DBLHDJS;
}, 100);
