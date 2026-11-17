// dabul press-exclude (17.11.2026): press posts (category "press", id 50) appear only where a query asks for them
// (the press page, the press carousel). Every other front-end post list (the "מידע משפטי" carousel, archives,
// related posts, feeds) leaves them out.
add_action('pre_get_posts', function ($q) {
	if (is_admin() && !wp_doing_ajax()) return;
	if (defined('REST_REQUEST') && REST_REQUEST) return;
	$pt = $q->get('post_type');
	if ($pt && $pt !== 'post' && $pt !== 'any' && !(is_array($pt) && in_array('post', $pt, true))) return;
	if ($q->is_singular() || $q->get('p') || $q->get('post__in')) return;
	$t = get_term(50, 'category');
	if (!$t || is_wp_error($t)) return;
	$ids = array(50, (int) $t->term_taxonomy_id);
	$asks = function ($v) use ($ids, $t) {
		foreach ((array) $v as $x) {
			foreach (preg_split('/[,+ ]+/', (string) $x) as $y) {
				if ($y === '') continue;
				if (in_array((int) $y, $ids, true) || $y === $t->slug) return true;
			}
		}
		return false;
	};
	if ($asks($q->get('cat')) || $asks($q->get('category_name')) || $asks($q->get('category__in')) || $asks($q->get('category__and'))) return;
	$walk = function ($tq) use (&$walk, $asks) {
		if (!is_array($tq)) return false;
		foreach ($tq as $k => $c) {
			if (!is_array($c)) continue;
			if (isset($c['terms']) && (!isset($c['taxonomy']) || $c['taxonomy'] === 'category') && $asks($c['terms'])) return true;
			if (!isset($c['terms']) && $walk($c)) return true;
		}
		return false;
	};
	if ($walk($q->get('tax_query'))) return;
	if ($q->is_main_query() && $q->is_category()) {
		$o = get_queried_object();
		if ($o && isset($o->term_id) && (int) $o->term_id === 50) return;
	}
	$not = (array) $q->get('category__not_in');
	$not[] = 50;
	$q->set('category__not_in', array_values(array_unique(array_map('intval', $not))));
}, 20);
// one-time full page-cache purge so every cached page drops the press post (cssheal rebuilds the CSS copies after it)
add_action('init', function () {
	if (get_option('dabul_pressx_purged') === '20261117b') return;
	update_option('dabul_pressx_purged', '20261117b');
	if (function_exists('rocket_clean_domain')) rocket_clean_domain();
}, 99);
