/* dabul: video watch pages (Yakir 15.10.2026, "דף נפרד לכל סרטון ... כן תעשה את זה").
   Google puts a video in its video results only from a page where the video is the main thing (a "watch page").
   Our videos sit inside articles, so Search Console listed them as "not on a watch page". Each video now gets its own page
   under /סרטונים/<slug>/: the player at the top, a short summary, the main points, a link to the full article,
   the full spoken text, and VideoObject schema. The articles keep their videos as they are.
   1. POST dabul/v1/watch {items:[{id,title,slug,summary,points[],transcript,article,dur,group}], dry} creates or updates
      the pages (child pages of the videos page 5225, Elementor full width template). GET lists them. Admins only.
      Data: option dabul_watch {video id: {...,page}}. Pages are regular pages, so Yoast lists them in the sitemap.
   2. The player is put in at the very end of the page output (after the "load on click" snippet 20), as a real
      YouTube player, so Google sees the video. Only on these pages; all other pages keep the click to load picture.
   3. Under each video in articles and on the videos page: a small link "לדף הסרטון" to its watch page.
   4. One VideoObject per video per page: a hand written VideoObject block inside an article is dropped when
      snippet 20 already describes the same video (its description and duration are kept in snippet 20's block).
   Undo: deactivate this snippet (the pages stay, without a player and without schema), or unpublish the pages. */

function dabul_watch_all() { return (array) get_option('dabul_watch', array()); }
function dabul_watch_by_page($pid) {
	foreach (dabul_watch_all() as $vid => $w) if ((int) ($w['page'] ?? 0) === (int) $pid) return array($vid, $w);
	return array('', null);
}
function dabul_watch_dur($s) { $s = (int) round((float) $s); return sprintf('%d:%02d', intdiv($s, 60), $s % 60); }
function dabul_watch_iso($s) { $s = (int) round((float) $s); return 'PT' . ($s >= 60 ? intdiv($s, 60) . 'M' : '') . ($s % 60) . 'S'; }

function dabul_watch_html($vid, $w) {
	$e = function ($t) { return esc_html($t); };
	$m = function_exists('dabul_yt_meta') ? dabul_yt_meta($vid) : null;
	$short = $m ? !empty($m['short']) : true;
	$date = $m && !empty($m['date']) ? date_i18n('j.n.Y', strtotime($m['date'])) : '';
	$art = !empty($w['article']) ? get_post((int) $w['article']) : null;
	$sum = '';
	foreach (preg_split("/\n\s*\n/", trim((string) $w['summary'])) as $p) if (trim($p) !== '') $sum .= '<p>' . $e(trim($p)) . '</p>';
	$pts = '';
	foreach ((array) ($w['points'] ?? array()) as $p) if (trim($p) !== '') $pts .= '<li>' . $e(trim($p)) . '</li>';
	$tr = '';
	foreach (preg_split("/\n+/", trim((string) ($w['transcript'] ?? ''))) as $p) if (trim($p) !== '') $tr .= '<p>' . $e(trim($p)) . '</p>';
	$h = '<div class="dblw" dir="rtl">'
		. '<nav class="dblw-crumbs" aria-label="מיקום בדף"><a href="' . esc_url(home_url('/')) . '">דף הבית</a> / <a href="' . esc_url(get_permalink(5225)) . '">סרטונים</a></nav>'
		. '<h1>' . $e($w['title']) . '</h1>'
		. '<div class="dblw-meta">עו״ד יקיר דבול' . (!empty($w['dur']) ? ' · ' . dabul_watch_dur($w['dur']) . ' דקות' : '') . ($date ? ' · ' . $date : '') . '</div>'
		. '<div class="dblw-player' . ($short ? ' tall' : '') . '" data-v="' . esc_attr($vid) . '"></div>'
		. '<div class="dblw-sec"><h2>על מה הסרטון</h2>' . $sum . '</div>'
		. ($pts ? '<div class="dblw-sec"><h2>הנקודות החשובות</h2><ul class="dblw-pts">' . $pts . '</ul></div>' : '')
		. ($art ? '<div class="dblw-art"><span>המדריך המלא באתר:</span> <a href="' . esc_url(get_permalink($art)) . '">' . $e(html_entity_decode(get_the_title($art), ENT_QUOTES)) . '</a></div>' : '')
		. ($tr ? '<details class="dblw-tr"><summary>התמלול המלא של הסרטון</summary><div>' . $tr . '</div></details>' : '')
		. '<div class="dblw-cta"><div><b>יש לכם שאלה על הנכס שלכם?</b><span>שיחה עם המשרד, ונגיד לכם מה כדאי לבדוק.</span></div>'
		. '<div class="dblw-btns"><a href="tel:+97298613413">09-8613413</a><a href="https://wa.me/972505580189">וואטסאפ</a></div></div>'
		. '<p class="dblw-note">המידע בסרטון ובדף כללי ואינו ייעוץ משפטי. כל מקרה נבדק לגופו.</p>'
		. '</div>';
	return $h;
}

add_action('rest_api_init', function () {
	register_rest_route('dabul/v1', '/watch', array('methods' => array('GET', 'POST'), 'permission_callback' => function () { return current_user_can('manage_options'); }, 'callback' => function ($req) {
		$all = dabul_watch_all();
		if ($req->get_method() === 'GET') return array('count' => count($all), 'items' => array_map(function ($w) { return array('page' => $w['page'] ?? 0, 'title' => $w['title'] ?? '', 'url' => !empty($w['page']) ? get_permalink((int) $w['page']) : ''); }, $all));
		$b = (array) $req->get_json_params(); $dry = !empty($b['dry']); $out = array();
		foreach ((array) ($b['items'] ?? array()) as $it) {
			$vid = (string) ($it['id'] ?? '');
			if (!preg_match('/^[A-Za-z0-9_-]{11}$/', $vid) || empty($it['title']) || empty($it['summary'])) { $out[] = array('id' => $vid, 'error' => 'id, title and summary are needed'); continue; }
			$w = array_merge(isset($all[$vid]) ? $all[$vid] : array(), array(
				'title' => wp_strip_all_tags((string) $it['title']), 'summary' => (string) $it['summary'], 'points' => array_values(array_map('strval', (array) ($it['points'] ?? array()))),
				'transcript' => (string) ($it['transcript'] ?? ''), 'article' => (int) ($it['article'] ?? 0), 'dur' => (float) ($it['dur'] ?? 0), 'group' => (string) ($it['group'] ?? ''),
				'metaTitle' => (string) ($it['metaTitle'] ?? ''), 'metaDesc' => (string) ($it['metaDesc'] ?? '')));
			$html = dabul_watch_html($vid, $w);
			if ($dry) { $out[] = array('id' => $vid, 'dry' => true, 'bytes' => strlen($html), 'page' => $w['page'] ?? 0); continue; }
			$post = array('post_type' => 'page', 'post_status' => 'publish', 'post_parent' => 5225, 'post_title' => $w['title'], 'post_content' => $html, 'post_excerpt' => wp_trim_words($w['summary'], 40, ''));
			if (!empty($w['page']) && get_post((int) $w['page'])) { $post['ID'] = (int) $w['page']; $pid = wp_update_post(wp_slash($post), true); }
			else { $post['post_name'] = sanitize_title((string) ($it['slug'] ?? $vid)); $pid = wp_insert_post(wp_slash($post), true); }
			if (is_wp_error($pid)) { $out[] = array('id' => $vid, 'error' => $pid->get_error_message()); continue; }
			update_post_meta($pid, '_wp_page_template', 'elementor_header_footer');
			update_post_meta($pid, '_dabul_watch_video', $vid);
			$title = $w['metaTitle'] !== '' ? $w['metaTitle'] : $w['title'] . ' | סרטון | יקיר דבול - משרד עורכי דין';
			$desc = $w['metaDesc'] !== '' ? $w['metaDesc'] : wp_html_excerpt(preg_replace('/\s+/', ' ', $w['summary']), 155, '');
			update_post_meta($pid, '_yoast_wpseo_title', $title);
			update_post_meta($pid, '_yoast_wpseo_metadesc', $desc);
			$poster = function_exists('dabul_yt_poster_id') ? dabul_yt_poster_id($vid) : 0;
			if ($poster) set_post_thumbnail($pid, $poster);
			$w['page'] = (int) $pid; $all[$vid] = $w;
			$out[] = array('id' => $vid, 'page' => (int) $pid, 'url' => get_permalink($pid));
			if (function_exists('rocket_clean_post')) rocket_clean_post($pid);
		}
		if (!$dry) { update_option('dabul_watch', $all, false); if (function_exists('rocket_clean_post')) rocket_clean_post(5225); }
		return array('ok' => true, 'items' => $out);
	}));
});

/* schema + style on a watch page */
add_action('wp_head', function () {
	if (!is_page()) return;
	list($vid, $w) = dabul_watch_by_page(get_queried_object_id());
	if (!$vid) return;
	$m = function_exists('dabul_yt_meta') ? dabul_yt_meta($vid) : null;
	$poster = function_exists('dabul_yt_poster_id') ? dabul_yt_poster_id($vid) : 0;
	$thumbs = array_values(array_filter(array($poster ? wp_get_attachment_image_url($poster, 'full') : '', 'https://i.ytimg.com/vi/' . $vid . '/maxresdefault.jpg', 'https://i.ytimg.com/vi/' . $vid . '/hqdefault.jpg')));
	$url = get_permalink();
	$v = array('@context' => 'https://schema.org', '@type' => 'VideoObject', '@id' => $url . '#video', 'name' => $w['title'],
		'description' => wp_html_excerpt(preg_replace('/\s+/', ' ', wp_strip_all_tags($w['summary'])), 480, ''), 'thumbnailUrl' => $thumbs,
		'uploadDate' => $m && !empty($m['date']) ? date('c', strtotime($m['date'])) : get_the_date('c'),
		'embedUrl' => 'https://www.youtube.com/embed/' . $vid, 'contentUrl' => 'https://www.youtube.com/watch?v=' . $vid, 'inLanguage' => 'he',
		'mainEntityOfPage' => $url, 'publisher' => array('@type' => 'Organization', 'name' => 'יקיר דבול - משרד עורכי דין', 'url' => home_url('/')));
	if (!empty($w['dur'])) $v['duration'] = dabul_watch_iso($w['dur']);
	if (!empty($w['transcript'])) $v['transcript'] = preg_replace('/\s+/', ' ', trim($w['transcript']));
	echo '<script type="application/ld+json">' . wp_json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
	echo '<style id="dblw-css">.dblw{direction:rtl;text-align:right;max-width:860px;margin:0 auto;padding:28px 20px 44px;font-family:"Noto Local","Noto Sans Hebrew",Heebo,Arial,sans-serif;color:#54595F;font-size:17px;line-height:1.8;display:flex;flex-direction:column;gap:20px}'
		. '.dblw *{box-sizing:border-box}.dblw p{margin:0}.dblw h1{font-size:32px;line-height:1.3;color:#141414;margin:0;font-weight:700;text-wrap:balance}.dblw h2{font-size:22px;color:#141414;margin:0 0 8px;font-weight:700}'
		. '.dblw-crumbs{font-size:14px}.dblw-crumbs a{color:#A88A4C;text-decoration:none}.dblw-meta{font-size:14px;color:#7a7f87;margin-top:-10px}'
		. '.dblw-player{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(20,20,20,.14)}.dblw-player.tall{aspect-ratio:9/16;max-width:380px;margin:0 auto}.dblw-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}'
		. '.dblw-sec{display:flex;flex-direction:column;gap:10px}.dblw-pts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.dblw-pts li{position:relative;padding-right:28px}'
		. '.dblw-pts li:before{content:"";position:absolute;right:0;top:.5em;width:16px;height:16px;border-radius:50%;background:#C5A25A}'
		. '.dblw-art{background:#FBF6EA;border-right:4px solid #C5A25A;border-radius:8px;padding:14px 18px;font-size:17px}.dblw-art a{color:#9A7A3A;font-weight:700;text-decoration:underline;text-underline-offset:4px}'
		. '.dblw-tr{border:1px solid #E7E7F1;border-radius:10px;padding:12px 18px;background:#fff}.dblw-tr summary{cursor:pointer;font-weight:700;color:#141414}.dblw-tr summary::marker{color:#C5A25A}.dblw-tr div{display:flex;flex-direction:column;gap:6px;margin-top:10px;font-size:16px}'
		. '.dblw-cta{background:#141414;color:#E9E9EE;border-radius:12px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.dblw-cta b{display:block;color:#fff;font-size:19px}.dblw-cta span{font-size:15px}'
		. '.dblw-btns{display:flex;gap:10px;flex-wrap:wrap}.dblw-btns a{background:#C5A25A;color:#141414;font-weight:700;border-radius:999px;padding:10px 20px;text-decoration:none;white-space:nowrap}.dblw-btns a+a{background:#fff}'
		. '.dblw-note{font-size:13px;color:#8a8f97}.dblw-more{display:flex;flex-direction:column;gap:12px}.dblw-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}'
		. '.dblw-grid a{display:flex;flex-direction:column;gap:8px;text-decoration:none;color:#141414;font-weight:600;font-size:15px;line-height:1.4}.dblw-grid img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:10px;background:#eee}'
		. '@media(max-width:767px){.dblw{padding:18px 16px 32px;font-size:16px}.dblw h1{font-size:25px}.dblw-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}</style>' . "\n";
}, 20);

/* "more videos" under a watch page */
add_filter('the_content', function ($html) {
	if (!is_page() || !in_the_loop() || !is_main_query()) return $html;
	list($vid, $w) = dabul_watch_by_page(get_the_ID());
	if (!$vid) return $html;
	$all = dabul_watch_all(); unset($all[$vid]);
	$same = array_filter($all, function ($x) use ($w) { return !empty($w['group']) && ($x['group'] ?? '') === $w['group']; });
	$rest = array_diff_key($all, $same);
	$keys = array_keys($rest); usort($keys, function ($a, $b) use ($vid) { return crc32($vid . $a) <=> crc32($vid . $b); });
	$pick = array_slice(array_merge(array_keys($same), $keys), 0, 4);
	if (!$pick) return $html;
	$cards = '';
	foreach ($pick as $k) {
		$x = $all[$k]; if (empty($x['page'])) continue;
		$p = function_exists('dabul_yt_poster_id') ? dabul_yt_poster_id($k) : 0;
		$img = $p ? wp_get_attachment_image_url($p, 'medium_large') : 'https://i.ytimg.com/vi/' . $k . '/hqdefault.jpg';
		$cards .= '<a href="' . esc_url(get_permalink((int) $x['page'])) . '"><img src="' . esc_url($img) . '" alt="' . esc_attr($x['title']) . '" loading="lazy" decoding="async" width="360" height="640"><span>' . esc_html($x['title']) . '</span></a>';
	}
	$more = '<div class="dblw dblw-more" dir="rtl"><h2>סרטונים נוספים</h2><div class="dblw-grid">' . $cards . '</div><p><a href="' . esc_url(get_permalink(5225)) . '" style="color:#9A7A3A;font-weight:700">לכל הסרטונים</a></p></div>';
	return $html . $more;
}, 40);

/* last step of the page output: the player, the links under videos, one VideoObject per video */
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		$all = dabul_watch_all();
		// the player on a watch page (a real YouTube player, so Google sees the video)
		if (strpos($html, 'class="dblw-player') !== false) {
			$html = preg_replace_callback('#<div class="dblw-player([^"]*)" data-v="([A-Za-z0-9_-]{11})"></div>#', function ($m) use ($all) {
				$t = isset($all[$m[2]]['title']) ? $all[$m[2]]['title'] : 'סרטון';
				return '<div class="dblw-player' . $m[1] . '"><iframe class="skip-lazy" data-no-lazy="1" src="https://www.youtube.com/embed/' . $m[2] . '?rel=0&amp;playsinline=1" title="' . esc_attr($t) . '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>';
			}, $html);
			return $html;
		}
		if (strpos($html, 'class="dbl-yt"') === false) return $html;
		// a link to the watch page under each video (articles and the videos page; not the home page)
		if ($all && !is_front_page()) {
			$css = false;
			foreach ($all as $vid => $w) {
				if (empty($w['page']) || strpos($html, 'data-id="' . $vid . '"') === false) continue;
				$link = '<p class="dbl-wlink"><a href="' . esc_url(get_permalink((int) $w['page'])) . '">לדף הסרטון: סיכום, הנקודות החשובות והתמלול</a></p>';
				$q = preg_quote($vid, '#'); $n = 0;
				// a video inside an article (figure), a video box, or an Elementor video widget (picture, wrapper, widget)
				$html = preg_replace('#(<figure class="dbl-vid[^"]*">(?:(?!</figure>).)*data-id="' . $q . '".*?</figure>)#s', '$1' . $link, $html, -1, $n);
				if (!$n) $html = preg_replace('#(<div class="dbl-yt-box"[^>]*><div class="dbl-yt" data-id="' . $q . '"[^>]*>.*?</div></div>)#s', '$1' . $link, $html, -1, $n);
				if (!$n) $html = preg_replace('#(<div class="dbl-yt" data-id="' . $q . '"[^>]*>.*?</div>\s*</div>\s*</div>)#s', '$1' . $link, $html, -1, $n);
				if ($n) $css = true;
			}
			if ($css) $html = preg_replace('#</head>#i', '<style id="dbl-wlink-css">.dbl-wlink{text-align:center;margin:8px 0 18px!important;font-size:15px;direction:rtl}.dbl-wlink a{color:#9A7A3A;font-weight:700;text-decoration:underline;text-underline-offset:4px}</style></head>', $html, 1);
		}
		// one VideoObject per video: drop a hand written block when snippet 20's block has the same video
		if (preg_match('#<script type="application/ld\+json">(\{"@context":"https://schema\.org","@graph":\[\{"@type":"VideoObject".*?)</script>#s', $html, $g)) {
			$graph = json_decode($g[1], true);
			if (is_array($graph) && !empty($graph['@graph'])) {
				$byId = array();
				foreach ($graph['@graph'] as $i => $v) if (preg_match('#embed/([A-Za-z0-9_-]{11})#', $v['embedUrl'] ?? '', $mm)) $byId[$mm[1]] = $i;
				$changed = false;
				$html = preg_replace_callback('#<script type="application/ld\+json">((?:(?!</script>).)*?"VideoObject"(?:(?!</script>).)*?)</script>#s', function ($m) use (&$graph, $byId, &$changed, $g) {
					if (strpos($m[0], '"@graph"') !== false && $m[1] === $g[1]) return $m[0];
					$j = json_decode(trim($m[1]), true);
					if (!is_array($j) || ($j['@type'] ?? '') !== 'VideoObject') return $m[0];
					if (!preg_match('#(?:embed/|watch\?v=|vi/)([A-Za-z0-9_-]{11})#', ($j['embedUrl'] ?? '') . ' ' . ($j['contentUrl'] ?? '') . ' ' . json_encode($j['thumbnailUrl'] ?? ''), $mm) || !isset($byId[$mm[1]])) return $m[0];
					$i = $byId[$mm[1]];
					if (!empty($j['duration']) && empty($graph['@graph'][$i]['duration'])) $graph['@graph'][$i]['duration'] = $j['duration'];
					if (!empty($j['description']) && mb_strlen($j['description']) > mb_strlen($graph['@graph'][$i]['description'] ?? '')) $graph['@graph'][$i]['description'] = $j['description'];
					$changed = true;
					return '';
				}, $html);
				if ($changed) $html = str_replace($g[1], wp_json_encode($graph, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $html);
			}
		}
		return $html;
	});
}, 3);
