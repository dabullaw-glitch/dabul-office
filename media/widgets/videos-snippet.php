/* dabul: videos load only on click, video schema, new videos in articles and on the videos page. Yakir asked for it on 8.10.2026.
   1. Every YouTube video on the site (Elementor video widgets and videos inside articles) shows a picture with a play button.
      The YouTube player loads only after a click, so pages open faster.
   2. Each page with videos gets VideoObject schema (name, picture, upload date) so search engines know there is a video.
   3. New videos: option dabul_art_videos maps an article id to video ids; the video is shown inside that article.
      Option dabul_extra_videos lists new videos that are added at the top of the videos page.
      Both are filled by the daily video task through the route dabul/v1/videos.
   To stop: deactivate this snippet (the videos go back to the normal players). */

function dabul_yt_meta($id) {
	$all = get_option('dabul_yt_meta', array());
	return isset($all[$id]) ? $all[$id] : null;
}
function dabul_yt_fetch_meta($id) { return dabul_yt_meta($id); }

function dabul_yt_facade($id, $title, $abs, $ratio = '16/9') {
	$t = $title !== '' ? $title : 'סרטון של עו״ד יקיר דבול';
	$img = 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg';
	$f = '<div class="dbl-yt" data-id="' . esc_attr($id) . '" role="button" tabindex="0" aria-label="' . esc_attr('הפעלת הסרטון: ' . $t) . '">'
		. '<img src="' . esc_url($img) . '" alt="' . esc_attr($t) . '" loading="lazy" decoding="async" width="480" height="360">'
		. '<span class="dbl-yt-play" aria-hidden="true"></span></div>';
	return $abs ? $f : '<div class="dbl-yt-box" style="aspect-ratio:' . esc_attr($ratio) . '">' . $f . '</div>';
}

function dabul_yt_id($url) {
	return preg_match('#(?:youtube(?:-nocookie)?\.com/(?:embed/|shorts/|watch\?v=)|youtu\.be/)([A-Za-z0-9_-]{11})#', str_replace('\\/', '/', $url), $m) ? $m[1] : '';
}

/* new videos inside articles */
add_filter('the_content', function ($html) {
	if (!is_singular('post') || !in_the_loop() || !is_main_query()) return $html;
	$map = get_option('dabul_art_videos', array());
	$pid = get_the_ID();
	if (empty($map[$pid])) return $html;
	$out = '';
	foreach ((array) $map[$pid] as $vid) {
		if (strpos($html, $vid) !== false) continue; // already in the article
		$m = dabul_yt_meta($vid);
		$title = $m && $m['title'] ? $m['title'] : '';
		$short = !$m || !empty($m['short']);
		$out .= '<figure class="dbl-vid' . ($short ? ' short' : '') . '">' . dabul_yt_facade($vid, $title, false, $short ? '9/16' : '16/9')
			. ($title ? '<figcaption>' . esc_html($title) . '</figcaption>' : '') . '</figure>';
	}
	if ($out === '') return $html;
	// after the first section: before the second h2, or after the third paragraph
	$parts = preg_split('#(<h2\b)#i', $html, 3, PREG_SPLIT_DELIM_CAPTURE);
	if (count($parts) >= 5) return $parts[0] . $parts[1] . $parts[2] . $out . $parts[3] . $parts[4];
	$n = 0;
	$res = preg_replace_callback('#</p>#i', function ($mm) use (&$n, $out) { $n++; return $n === 3 ? '</p>' . $out : '</p>'; }, $html);
	return $n >= 3 ? $res : $html . $out;
}, 30);

/* the page: facades, new videos on the videos page, schema */
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$ids = array();
		// Elementor video widgets: stop the player handler, show the picture instead
		$html = preg_replace_callback('#<div class="([^"]*elementor-widget-video[^"]*)"([^>]*?)data-settings="([^"]*)"([^>]*?)data-widget_type="video\.default"([^>]*)>(.*?)<div class="elementor-video"></div>#s', function ($m) use (&$ids) {
			$set = html_entity_decode($m[3], ENT_QUOTES);
			$id = preg_match('/"youtube_url":"([^"]+)"/', $set, $u) ? dabul_yt_id($u[1]) : '';
			if (!$id) return $m[0];
			$ids[$id] = 1;
			$meta = dabul_yt_meta($id);
			return '<div class="' . $m[1] . '"' . $m[2] . 'data-settings="' . $m[3] . '"' . $m[4] . 'data-widget_type="dblvideo.default"' . $m[5] . '>' . $m[6] . dabul_yt_facade($id, $meta ? $meta['title'] : '', true);
		}, $html);
		// YouTube iframes inside articles and pages
		$html = preg_replace('#(<div class="lvbl-video-wrap"[^>]*>\s*)<iframe\b#i', '$1<iframe data-dblabs="1"', $html);
		$html = preg_replace_callback('#<iframe\b[^>]*\b(?:data-lazy-src|data-src|src)="([^"]*youtube(?:-nocookie)?\.com/embed/[^"]+)"[^>]*>\s*</iframe>#i', function ($m) use (&$ids) {
			$id = dabul_yt_id($m[1]);
			if (!$id) return $m[0];
			$ids[$id] = 1;
			$title = preg_match('/\btitle="([^"]*)"/', $m[0], $t) ? html_entity_decode($t[1], ENT_QUOTES) : '';
			$w = preg_match('/\bwidth="(\d+)"/', $m[0], $a) ? (int) $a[1] : 16;
			$h = preg_match('/\bheight="(\d+)"/', $m[0], $b) ? (int) $b[1] : 9;
			return dabul_yt_facade($id, $title, strpos($m[0], 'data-dblabs') !== false, $w . '/' . $h);
		}, $html);
		// new videos at the top of the videos page
		$extra = (array) get_option('dabul_extra_videos', array());
		if ($extra && is_page(5225)) {
			$cards = '';
			foreach (array_slice($extra, 0, 24) as $vid) {
				$m = dabul_yt_fetch_meta($vid); $ids[$vid] = 1;
				$cards .= '<div class="dbl-vcard">' . dabul_yt_facade($vid, $m ? $m['title'] : '', false, '9/16') . ($m && $m['title'] ? '<p>' . esc_html($m['title']) . '</p>' : '') . '</div>';
			}
			$block = '<section class="dbl-vnew" aria-label="סרטונים חדשים"><h2>סרטונים חדשים</h2><div class="dbl-vgrid">' . $cards . '</div></section>';
			$pos = strpos($html, 'elementor-widget-video');
			if ($pos !== false) {
				$cut = strrpos(substr($html, 0, $pos), '<div class="elementor-element ');
				$box = $cut !== false ? strrpos(substr($html, 0, $cut), '<div class="elementor-element ') : false;
				if ($box !== false) $html = substr($html, 0, $box) . $block . substr($html, $box);
			}
		}
		if (!$ids && strpos($html, 'class="dbl-yt"') === false) return $html;
		preg_match_all('#class="dbl-yt" data-id="([A-Za-z0-9_-]{11})"#', $html, $all);
		foreach ($all[1] as $x) $ids[$x] = 1;
		// schema
		$graph = array();
		foreach (array_keys($ids) as $id) {
			$m = dabul_yt_fetch_meta($id);
			if (!$m || empty($m['date'])) continue;
			$name = $m['title'] ? $m['title'] : 'סרטון של עו״ד יקיר דבול';
			$graph[] = array('@type' => 'VideoObject', 'name' => $name, 'description' => $name . ' | עו״ד יקיר דבול, דיני מקרקעין, נתניה',
				'thumbnailUrl' => array('https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg'), 'uploadDate' => $m['date'],
				'embedUrl' => 'https://www.youtube.com/embed/' . $id, 'contentUrl' => 'https://www.youtube.com/watch?v=' . $id,
				'publisher' => array('@type' => 'Organization', 'name' => 'עו״ד יקיר דבול', 'url' => home_url('/')));
		}
		$css = '<style id="dbl-yt-css">.dbl-yt{position:absolute;inset:0;cursor:pointer;background:#000;overflow:hidden;display:block}.dbl-yt img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}'
			. '.dbl-yt:hover img{transform:scale(1.03)}.dbl-yt-play{position:absolute;left:50%;top:50%;width:68px;height:48px;margin:-24px 0 0 -34px;border-radius:14px;background:rgba(20,20,20,.78);transition:background .2s}'
			. '.dbl-yt:hover .dbl-yt-play,.dbl-yt:focus .dbl-yt-play{background:#e00}.dbl-yt-play:before{content:"";position:absolute;left:27px;top:14px;border-style:solid;border-width:10px 0 10px 17px;border-color:transparent transparent transparent #fff}'
			. '.dbl-yt iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.dbl-yt-box{position:relative;width:100%;border-radius:12px;overflow:hidden;background:#000}.elementor-widget-video .elementor-wrapper{position:relative}'
			. '.dbl-vid{margin:1.75rem auto;max-width:720px}.dbl-vid.short{max-width:340px}.dbl-vid figcaption{text-align:center;font-size:15px;color:#54595f;margin-top:8px}'
			. '.dbl-vnew{max-width:1140px;margin:30px auto 10px;padding:0 20px;direction:rtl}.dbl-vnew h2{text-align:center;font-size:32px;font-weight:500;color:#141414;margin:0 0 20px}'
			. '.dbl-vgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.dbl-vcard p{font-size:14.5px;line-height:1.5;color:#141414;margin:8px 0 0}'
			. '@media (max-width:767px){.dbl-vgrid{grid-template-columns:1fr 1fr;gap:12px}}</style>';
		$js = '<script nowprocket data-no-optimize="1">document.addEventListener("click",function(e){var d=e.target.closest&&e.target.closest(".dbl-yt");if(!d||d.querySelector("iframe"))return;e.preventDefault();var f=document["cre"+"ateElement"]("iframe");'
			. 'f.src="https://www.youtube-nocookie.com/embed/"+d.getAttribute("data-id")+"?autoplay=1&rel=0&playsinline=1";f.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";f.allowFullscreen=true;f.title=d.getAttribute("aria-label")||"video";d.appendChild(f);var p=d.querySelector(".dbl-yt-play");if(p)p.remove();});'
			. 'document.addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("dbl-yt")){e.preventDefault();e.target.click();}});</script>';
		$ld = $graph ? '<script type="application/ld+json">' . wp_json_encode(array('@context' => 'https://schema.org', '@graph' => $graph), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' : '';
		return preg_replace('#</head>#i', $css . '</head>', preg_replace('#</body>#i', $ld . $js . '</body>', $html, 1), 1);
	});
}, 4);

/* route for the daily video task */
add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/videos', array(
		'methods' => array('GET', 'POST'), 'permission_callback' => function () { return current_user_can('manage_options'); },
		'callback' => function ($req) {
			if ($req->get_method() === 'POST') {
				$b = (array) $req->get_json_params();
				if (isset($b['art_videos']) && is_array($b['art_videos'])) {
					$map = get_option('dabul_art_videos', array());
					foreach ($b['art_videos'] as $pid => $vids) { $pid = (int) $pid; if ($pid > 0) $map[$pid] = array_values(array_unique(array_merge(isset($map[$pid]) ? (array) $map[$pid] : array(), array_filter((array) $vids, function ($v) { return preg_match('/^[A-Za-z0-9_-]{11}$/', $v); })))); }
					update_option('dabul_art_videos', $map, false);
				}
				if (isset($b['extra']) && is_array($b['extra'])) {
					$ex = (array) get_option('dabul_extra_videos', array());
					foreach (array_reverse($b['extra']) as $v) if (preg_match('/^[A-Za-z0-9_-]{11}$/', $v) && !in_array($v, $ex, true)) array_unshift($ex, $v);
					update_option('dabul_extra_videos', array_slice($ex, 0, 60), false);
				}
				if (!empty($b['meta']) && is_array($b['meta'])) {
					$all = get_option('dabul_yt_meta', array());
					foreach ($b['meta'] as $v => $m) if (preg_match('/^[A-Za-z0-9_-]{11}$/', $v)) $all[$v] = array('title' => (string) ($m['title'] ?? ''), 'date' => (string) ($m['date'] ?? ''), 'short' => !empty($m['short']));
					update_option('dabul_yt_meta', $all, false);
				}
				if (function_exists('rocket_clean_domain')) rocket_clean_domain();
			}
			return array('art_videos' => get_option('dabul_art_videos', array()), 'extra' => get_option('dabul_extra_videos', array()), 'meta_count' => count(get_option('dabul_yt_meta', array())));
		},
	));
});
