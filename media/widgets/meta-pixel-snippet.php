<?php
// dabul: Meta pixel (11.10.2026, for the online services campaign on Facebook and Instagram, approved by Yakir).
// Pixel "dabullaw.co.il" (2010050569657680) in the ad account "שיווק ממוקד dabullaw". Events:
//   PageView on every page; ViewContent on the online services pages; InitiateCheckout when the visitor presses the
//   payment button in the order form; Purchase on /online/thanks/ after a successful payment (event id = order number).
// Loads after the page (async) and is excluded from WP Rocket's delay, so visits from ads are counted. Undo: deactivate.
if (!function_exists('dabul_meta_pixel')) {
  function dabul_meta_pixel() {
    if (is_admin() || (defined('REST_REQUEST') && REST_REQUEST)) return;
    $id = '2010050569657680';
    $slug = '';
    if (is_page()) { $p = get_post(); if ($p) { $slug = $p->post_name; if ($p->post_parent) { $par = get_post($p->post_parent); if (!$par || $par->post_name !== 'online') $slug = ''; } elseif ($slug !== 'online') { $slug = ''; } } }
    ?>
<script nowprocket data-no-optimize="1" data-no-minify="1">
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','<?php echo esc_js($id); ?>');fbq('track','PageView');
(function(){var slug=<?php echo wp_json_encode($slug); ?>;if(!slug)return;
 var q=new URLSearchParams(location.search);
 if(slug==='thanks'){var id=(q.get('id')||'').replace(/[^A-Za-z0-9-]/g,'').slice(0,20);if(id&&q.get('failed')!=='1'){try{if(!sessionStorage.getItem('dbl_px_'+id)){sessionStorage.setItem('dbl_px_'+id,'1');fbq('track','Purchase',{currency:'ILS',content_type:'product',content_ids:[id]},{eventID:'order-'+id});}}catch(e){fbq('track','Purchase',{currency:'ILS'},{eventID:'order-'+id});}}return;}
 fbq('track','ViewContent',{content_name:slug,content_category:'online-legal-services'});
 var sent=false;document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.svc-app button, .svc-app a');if(!b||sent)return;var t=(b.textContent||'');if(t.indexOf('תשלום')>-1||t.indexOf('לתשלום')>-1){sent=true;fbq('track','InitiateCheckout',{content_name:slug,currency:'ILS'});}},true);
})();
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=<?php echo esc_attr($id); ?>&ev=PageView&noscript=1"></noscript>
<?php
  }
  add_action('wp_head', 'dabul_meta_pixel', 5);
  add_filter('rocket_delay_js_exclusions', function ($e) { $e[] = 'fbevents.js'; $e[] = 'fbq('; return $e; });
}
