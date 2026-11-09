/* dabul: questions and answers marked for Google and AI engines (Yakir approved 9.11.2026: "תראה אם בשאר העמודים באתר
   גם יש את זה ואם לא אז תוסיף").
   Pages that show questions and answers (Elementor accordion or toggle, or a question in a <details> box) get a hidden
   FAQPage block with exactly the same questions and answers that the page shows. Nothing visible changes.
   A page that already has an FAQPage block (articles with ACF questions, snippet 5, or a block written in the content)
   is left as it is, so no page gets two.
   Live since 9.11.2026. Checked on all 417 pages and articles of the site map: 8 got the block (home page 11 questions,
   5 pages, 2 articles); 339 already had one; the rest show no questions. Test copy: ?dbltest=faq... To undo: deactivate this snippet. */
if (!defined('DBL_FAQ_LIVE')) define('DBL_FAQ_LIVE', 1);
// once, when it went live: WP Rocket's saved copies of the 8 pages that got the block are renewed (nothing else)
add_action('init', function () {
	if (get_option('dbl_faq_purged') === '1' || !function_exists('rocket_clean_post')) return;
	update_option('dbl_faq_purged', '1', false);
	if (function_exists('rocket_clean_home')) rocket_clean_home();
	foreach (array(
		'https://dabullaw.co.il/%d7%a6%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%95%d7%99%d7%a8%d7%95%d7%a9%d7%95%d7%aa/',
		'https://dabullaw.co.il/comprehensive-guide-selling-apartment-israel-legal-tax-stages/',
		'https://dabullaw.co.il/%d7%9b%d7%aa%d7%91-%d7%a2%d7%a8%d7%91%d7%95%d7%aa-%d7%9c%d7%a9%d7%9b%d7%99%d7%a8%d7%95%d7%aa/',
		'https://dabullaw.co.il/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%94%d7%9e%d7%a9%d7%a8%d7%93/',
		'https://dabullaw.co.il/%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%95%d7%97%d7%93%d7%9c%d7%95%d7%aa-%d7%a4%d7%99%d7%a8%d7%a2%d7%95%d7%9f/',
		'https://dabullaw.co.il/%d7%97%d7%91%d7%a8%d7%95%d7%aa-%d7%a9%d7%95%d7%aa%d7%a4%d7%95%d7%99%d7%95%d7%aa-%d7%95%d7%9e%d7%99%d7%99%d7%a1%d7%93%d7%99%d7%9d/',
		'https://dabullaw.co.il/%d7%90%d7%97%d7%a8%d7%99-%d7%9b%d7%9e%d7%94-%d7%96%d7%9e%d7%9f-%d7%90%d7%a4%d7%a9%d7%a8-%d7%9c%d7%9e%d7%9b%d7%95%d7%a8-%d7%93%d7%99%d7%a8%d7%94/') as $u) { $id = url_to_postid(rawurldecode($u)); if ($id) rocket_clean_post($id); }
}, 99);
if (!function_exists('dbl_faq_text')) {
	function dbl_faq_text($node) {
		$t = html_entity_decode($node->textContent, ENT_QUOTES | ENT_HTML5, 'UTF-8');
		return trim(preg_replace('/\s+/u', ' ', $t));
	}
	function dbl_faq_build($html) {
		if (stripos($html, 'FAQPage') !== false) return $html;
		if (strpos($html, 'e-n-accordion-item') === false && strpos($html, 'elementor-tab-title') === false && stripos($html, '<summary') === false) return $html;
		$prev = libxml_use_internal_errors(true);
		$doc = new DOMDocument();
		$ok = $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
		libxml_clear_errors(); libxml_use_internal_errors($prev);
		if (!$ok) return $html;
		$x = new DOMXPath($doc);
		$items = array(); $seen = array();
		$add = function ($q, $a, $needMark) use (&$items, &$seen) {
			if ($q === '' || $a === '' || mb_strlen($a) < 20 || mb_strlen($q) > 250) return;
			if ($needMark && mb_substr($q, -1) !== '?') return;
			$k = mb_strtolower($q); if (isset($seen[$k])) return; $seen[$k] = 1;
			if (mb_strlen($a) > 1500) { $cut = mb_substr($a, 0, 1500); $p = max(mb_strrpos($cut, '. '), mb_strrpos($cut, '? ')); $a = $p > 300 ? mb_substr($cut, 0, $p + 1) : $cut; }
			$items[] = array('@type' => 'Question', 'name' => $q, 'acceptedAnswer' => array('@type' => 'Answer', 'text' => $a));
		};
		$skip = "ancestor::header or ancestor::footer or ancestor::nav or ancestor::*[contains(@class,'elementor-location-header') or contains(@class,'elementor-location-footer')]";
		// Elementor nested accordion
		foreach ($x->query("//details[contains(concat(' ',normalize-space(@class),' '),' e-n-accordion-item ')][not($skip)]") as $d) {
			$s = $x->query('./summary', $d)->item(0); if (!$s) continue;
			$q = dbl_faq_text($s); $all = dbl_faq_text($d);
			$a = trim(mb_substr($all, mb_strlen($q)));
			if (mb_strpos($all, $q) !== 0) { $a = ''; foreach ($d->childNodes as $c) if ($c !== $s) $a .= ' ' . dbl_faq_text($c); $a = trim(preg_replace('/\s+/u', ' ', $a)); }
			$add($q, $a, false);
		}
		// Elementor classic accordion and toggle
		foreach ($x->query("//*[contains(@class,'elementor-accordion-item') or contains(@class,'elementor-toggle-item')][not($skip)]") as $it) {
			$t = $x->query(".//*[contains(@class,'elementor-tab-title')]", $it)->item(0);
			$c = $x->query(".//*[contains(@class,'elementor-tab-content')]", $it)->item(0);
			if ($t && $c) $add(dbl_faq_text($t), dbl_faq_text($c), false);
		}
		// any other <details> box whose title is a question
		foreach ($x->query("//details[not(contains(@class,'e-n-accordion-item'))][summary][not($skip)]") as $d) {
			$s = $x->query('./summary', $d)->item(0);
			$a = ''; foreach ($d->childNodes as $c) if ($c !== $s) $a .= ' ' . dbl_faq_text($c);
			$add(dbl_faq_text($s), trim(preg_replace('/\s+/u', ' ', $a)), true);
		}
		if (count($items) < 2) return $html;
		$items = array_slice($items, 0, 40);
		$schema = array('@context' => 'https://schema.org', '@type' => 'FAQPage', 'inLanguage' => 'he-IL', 'mainEntity' => $items);
		$block = "\n<script type=\"application/ld+json\" class=\"dabul-faq-schema\">" . wp_json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "</script>\n";
		$pos = stripos($html, '</head>');
		if ($pos === false) $pos = strripos($html, '</body>');
		return $pos === false ? $html : substr($html, 0, $pos) . $block . substr($html, $pos);
	}
}
add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST) || isset($_GET['elementor-preview'])) return;
	if (!(is_singular() || is_front_page())) return;
	$test = isset($_GET['dbltest']) && strpos((string) $_GET['dbltest'], 'faq') === 0;
	if (!defined('DBL_FAQ_LIVE') && !$test) return;
	ob_start(function ($html) {
		if (!is_string($html) || strlen($html) < 500 || stripos($html, '<html') === false) return $html;
		try { return dbl_faq_build($html); } catch (\Throwable $e) { return $html; }
	});
}, 9999);
