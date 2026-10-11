<?php
// Dabul: "לקוחות ממליצים" on the home page (11.10.2026, for Yakir's approval).
// Replaces the Trustindex widget on the home page only, with the office carousel (Google + LawReviews ratings).
// The reviews come from the office "reviews" function (refreshed every morning), cached here for 6 hours, and are
// printed into the page (data-json) so the section shows at once without waiting for the browser.
// Undo: deactivate this snippet; the Trustindex widget comes back as it was.
if (!function_exists('dabul_reviews_html')) {
  function dabul_reviews_data() {
    $c = get_transient('dabul_reviews_v1');
    if ($c !== false) return $c;
    $r = wp_remote_get('https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/reviews', array('timeout' => 8));
    $j = is_wp_error($r) ? null : json_decode(wp_remote_retrieve_body($r), true);
    if (!$j || empty($j['google'])) { $old = get_option('dabul_reviews_last'); return $old ? $old : null; }
    set_transient('dabul_reviews_v1', $j, 6 * HOUR_IN_SECONDS);
    update_option('dabul_reviews_last', $j, false);
    return $j;
  }
  function dabul_reviews_html() {
    $d = dabul_reviews_data();
    $v = '20261011b';
    $base = 'https://dabullaw-glitch.github.io/dabul-office/media/widgets/';
    wp_enqueue_style('dabul-reviews', $base . 'home-reviews.css', array(), $v);
    wp_enqueue_script('dabul-reviews', $base . 'home-reviews.js', array(), $v, true);
    $json = $d ? wp_json_encode($d, JSON_UNESCAPED_UNICODE) : '';
    // noscript: the first reviews as plain text, for search engines and old browsers
    $ns = '';
    if ($d && !empty($d['google']['reviews'])) {
      foreach (array_slice($d['google']['reviews'], 0, 6) as $rv) {
        $ns .= '<blockquote><p>' . esc_html($rv['text']) . '</p><cite>' . esc_html($rv['name']) . ', ביקורת בגוגל</cite></blockquote>';
      }
    }
    return '<div class="dbr" data-src="https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/reviews"' . ($json ? ' data-json="' . esc_attr($json) . '"' : '') . '></div>'
      . ($ns ? '<noscript>' . $ns . '</noscript>' : '');
  }
  add_shortcode('dabul_reviews', 'dabul_reviews_html');
  add_filter('do_shortcode_tag', function ($out, $tag) {
    if (is_front_page() && stripos($tag, 'trustindex') === 0) return dabul_reviews_html();
    return $out;
  }, 10, 2);
}
