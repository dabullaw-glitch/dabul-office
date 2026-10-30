/* dabul: press items in the structured data (Yakir approved 30.10.2026: "קוד נסתר לגוגל ולבינה המלאכותית שאומר שהכתבות
   האלה עוסקות בך ובמשרד"). Nothing visible changes. Everything is read live from category "המשרד בתקשורת" (id 50, the
   card links to the outside article through meta _links_to, see snippet 29), so a new press item is included by itself.
   1. On the press page (/מהתקשורת/, page 988): an ItemList of the same items the page shows (newest 12), each a NewsArticle
      with its headline, the outside URL, the publish date, the outlet as publisher, and "mentions" pointing to the existing
      #yakir-dabul person and #organization business. The page's WebPage node gets mainEntity = that list.
   2. On every page: the person #yakir-dabul (built by snippet 65) gets every press item in "subjectOf", merged with the
      hand written list there (no duplicates by URL). No second Organization or Person block is ever added.
   Items Yakir wrote himself (checked 30.10.2026 on the outlets' pages: ערוץ 7 guide, and the 2021 pieces from פסק דין that
   mako and ynet carried, where he is the writer and did not represent anyone) are linked with "author" and are not added
   to subjectOf. Their post ids are in dabul_press_authored(); a new press item counts as being about him.
   YouTube items in the category are videos, not press, and are left out. The list is cached for 12 hours and cleared when a
   post is saved. Runs after snippet 65 (priority 30 on wpseo_schema_graph).
   Undo: deactivate this snippet. */
if (!function_exists('dabul_press_outlet')) {
	function dabul_press_outlet($url, $pid) {
		$host = strtolower((string) parse_url($url, PHP_URL_HOST));
		$host = preg_replace('/^www\./', '', $host);
		$map = array(
			'emess.co.il' => 'אמס', 'bizportal.co.il' => 'ביזפורטל', '13tv.co.il' => 'רשת 13', 'bhol.co.il' => 'בחדרי חרדים',
			'maariv.co.il' => 'מעריב', 'rotter.net' => 'רוטר', 'israelhayom.co.il' => 'ישראל היום', 'news08.net' => 'חדשות 08',
			'inn.co.il' => 'ערוץ 7', 'netanya.mynet.co.il' => 'mynet נתניה', 'nadlan.walla.co.il' => 'וואלה נדל״ן', 'walla.co.il' => 'וואלה',
			'psakdin.co.il' => 'פסק דין', 'mako.co.il' => 'mako', 'ynet.co.il' => 'ynet', 'calcalist.co.il' => 'כלכליסט',
			'globes.co.il' => 'גלובס', 'themarker.com' => 'TheMarker', 'n12.co.il' => 'N12', 'kan.org.il' => 'כאן',
		);
		if (isset($map[$host])) return $map[$host];
		// otherwise the alt text of the outlet logo (ACF field "תמונת_רשת_תקשורת"), then the bare host name
		$logo = get_post_meta($pid, 'תמונת_רשת_תקשורת', true);
		if (is_array($logo)) $logo = isset($logo['ID']) ? $logo['ID'] : (isset($logo['id']) ? $logo['id'] : 0);
		$alt = $logo ? trim((string) get_post_meta((int) $logo, '_wp_attachment_image_alt', true)) : '';
		return $alt !== '' ? $alt : $host;
	}
}
if (!function_exists('dabul_press_items')) {
	function dabul_press_items() {
		$c = get_transient('dabul_press_items_v1');
		if (is_array($c)) return $c;
		$out = array();
		$ids = get_posts(array('post_type' => 'post', 'post_status' => 'publish', 'category' => 50, 'numberposts' => 60, 'orderby' => 'date', 'order' => 'DESC', 'fields' => 'ids', 'suppress_filters' => true));
		foreach ($ids as $pid) {
			$url = trim((string) get_post_meta($pid, '_links_to', true));
			$url = preg_replace('/#$/', '', html_entity_decode($url, ENT_QUOTES, 'UTF-8'));
			if (!preg_match('#^https?://#i', $url)) continue;
			$host = strtolower((string) parse_url($url, PHP_URL_HOST));
			if (preg_match('/(^|\.)(youtube\.com|youtu\.be)$/', $host)) continue;
			$title = html_entity_decode(wp_strip_all_tags(get_the_title($pid)), ENT_QUOTES, 'UTF-8');
			$title = trim(preg_replace('/\s*\|\s*עו״ד יקיר דבול\s*$/u', '', $title));
			$out[] = array('pid' => (int) $pid, 'headline' => $title, 'url' => $url, 'date' => get_post_time('c', false, $pid), 'outlet' => dabul_press_outlet($url, $pid));
		}
		set_transient('dabul_press_items_v1', $out, 12 * HOUR_IN_SECONDS);
		return $out;
	}
}
if (!function_exists('dabul_press_authored')) {
	function dabul_press_authored($pid) { return in_array((int) $pid, array(3027, 1506, 1490, 1487, 1474), true); }
}
if (!function_exists('dabul_press_node')) {
	function dabul_press_node($it, $mentions) {
		$n = array('@type' => 'NewsArticle', 'headline' => $it['headline'], 'url' => $it['url'], 'datePublished' => $it['date'],
			'publisher' => array('@type' => 'Organization', 'name' => $it['outlet']));
		if (dabul_press_authored($it['pid'])) $n['author'] = array('@id' => 'https://dabullaw.co.il/#yakir-dabul');
		else $n['mentions'] = $mentions;
		return $n;
	}
}
if (!function_exists('dabul_press_key')) {
	function dabul_press_key($u) { return rtrim(strtolower(preg_replace('#^https?://(www\.)?#i', '', rawurldecode((string) $u))), '/#'); }
}
add_action('save_post', function ($pid) { if (wp_is_post_revision($pid)) return; delete_transient('dabul_press_items_v1'); });
add_filter('wpseo_schema_graph', function ($graph) {
	if (!is_array($graph)) return $graph;
	$items = dabul_press_items();
	if (!$items) return $graph;
	$pid = 'https://dabullaw.co.il/#yakir-dabul';
	$org = 'https://dabullaw.co.il/#organization';
	$mentions = array(array('@id' => $pid), array('@id' => $org));
	// 2. the person: every press item in subjectOf, merged with the hand written list
	foreach ($graph as $i => $node) {
		if (!is_array($node) || ($node['@id'] ?? '') !== $pid) continue;
		$have = array(); $sub = isset($node['subjectOf']) && is_array($node['subjectOf']) ? $node['subjectOf'] : array();
		if (isset($sub['@type'])) $sub = array($sub);
		foreach ($sub as $s) if (is_array($s) && !empty($s['url'])) $have[dabul_press_key($s['url'])] = 1;
		foreach ($items as $it) {
			$k = dabul_press_key($it['url']);
			if (isset($have[$k]) || dabul_press_authored($it['pid'])) continue;
			$have[$k] = 1;
			$sub[] = array('@type' => 'NewsArticle', 'headline' => $it['headline'], 'url' => $it['url'], 'datePublished' => $it['date'], 'publisher' => array('@type' => 'Organization', 'name' => $it['outlet']));
		}
		$graph[$i]['subjectOf'] = array_values($sub);
	}
	// 1. the press page: the list the page shows
	if (is_page(988)) {
		$page = get_permalink(988);
		$lid = $page . '#press-list';
		$els = array(); $n = 0;
		foreach (array_slice($items, 0, (function_exists('dabul_press_page_all') && dabul_press_page_all()) ? 100 : 12) as $it) { $n++; $els[] = array('@type' => 'ListItem', 'position' => $n, 'item' => dabul_press_node($it, $mentions)); }
		$graph[] = array('@type' => 'ItemList', '@id' => $lid, 'name' => 'המשרד בתקשורת: כתבות על עו״ד יקיר דבול והמשרד', 'numberOfItems' => $n, 'itemListOrder' => 'https://schema.org/ItemListOrderDescending', 'itemListElement' => $els);
		foreach ($graph as $i => $node) {
			if (!is_array($node)) continue;
			$t = isset($node['@type']) ? (array) $node['@type'] : array();
			if (in_array('WebPage', $t, true) || in_array('CollectionPage', $t, true)) { $graph[$i]['mainEntity'] = array('@id' => $lid); break; }
		}
	}
	return $graph;
}, 30);
