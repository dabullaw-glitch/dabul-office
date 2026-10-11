<?php
// dabul: videos inside articles, fixes (11.10.2026, Yakir: "להעלות את זה כמו שצריך למאמר, ואם יש סרטון אחר, לא לעלות עוד סרטון לאותו מאמר").
// 1. A vertical video (Shorts) inside an article fills its tall frame (the theme forced the picture to its natural height,
//    so the picture sat at the top and the rest of the frame was black).
// 2. Route POST dabul/v1/videos-remove {remove:{<post id>:[<video id>,...]}} takes a video out of an article
//    (the list in option dabul_art_videos; a backup of the whole list is kept once in dabul_bak_artvideos). Admins only.
// Undo: deactivate this snippet.
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/videos-remove', array('methods' => 'POST', 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($r) {
		$b = (array) $r->get_json_params();
		$map = get_option('dabul_art_videos', array());
		if (!get_option('dabul_bak_artvideos')) update_option('dabul_bak_artvideos', $map, false);
		$out = array();
		foreach ((array) (isset($b['remove']) ? $b['remove'] : array()) as $pid => $vids) {
			$pid = (int) $pid;
			if ($pid <= 0 || empty($map[$pid])) continue;
			$map[$pid] = array_values(array_diff((array) $map[$pid], (array) $vids));
			if (!$map[$pid]) unset($map[$pid]);
			$out[$pid] = isset($map[$pid]) ? $map[$pid] : array();
			if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
		}
		update_option('dabul_art_videos', $map, false);
		return array('ok' => true, 'changed' => $out);
	}));
});
add_action('wp_head', function () {
	if (is_admin() || !is_singular()) return;
	echo '<style id="dbl-vid-fix">.dbl-vid .dbl-yt-box{height:auto!important}.dbl-vid.short{max-width:340px!important;width:100%!important;margin:1.75rem auto!important}.dbl-vid.short .dbl-yt-box{aspect-ratio:9/16!important}'
		. '.dbl-vid .dbl-yt img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;margin:0!important}</style>' . "\n";
}, 99);
