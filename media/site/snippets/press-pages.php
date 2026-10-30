/* dabul: the press page (/מהתקשורת/, page 988) shows ALL press items, 12 per page with page buttons like the videos page.
   Yakir 30.10.2026: "תעשה מעבר בין עמודים שהכל יופיע" (the loop showed only the 12 newest; 3 older articles were hidden).
   1. The loop grid on page 988 (widget 294c967, category press 50) returns every press item, newest first. Items that link
      to YouTube (videos, not articles) stay out, as before.
   2. In the browser: 12 cards a page, buttons under the grid ("הקודם 1 2 הבא"), "עמוד X מתוך N · M כתבות", #עמוד-N in the
      address, the same look as the videos page (snippet videos-pages). All cards stay in the page for search engines.
   3. dabul_press_page_all() tells snippet 103 (press schema) to list every item the page now shows.
   Undo: deactivate this snippet (the page goes back to the 12 newest). */
if (!function_exists('dabul_press_page_all')) { function dabul_press_page_all() { return true; } }

function dabul_press_youtube_ids() {
	$c = get_transient('dabul_press_yt_ids_v1');
	if (is_array($c)) return $c;
	$out = array();
	foreach (get_posts(array('post_type' => 'post', 'post_status' => 'publish', 'category' => 50, 'numberposts' => 200, 'fields' => 'ids', 'suppress_filters' => true)) as $pid) {
		$url = html_entity_decode(trim((string) get_post_meta($pid, '_links_to', true)), ENT_QUOTES, 'UTF-8');
		$host = strtolower((string) parse_url($url, PHP_URL_HOST));
		if ($host && preg_match('/(^|\.)(youtube\.com|youtu\.be)$/', $host)) $out[] = (int) $pid;
	}
	set_transient('dabul_press_yt_ids_v1', $out, 12 * HOUR_IN_SECONDS);
	return $out;
}
add_action('save_post', function ($pid) { if (!wp_is_post_revision($pid)) delete_transient('dabul_press_yt_ids_v1'); });

add_filter('elementor/query/query_args', function ($args, $widget) {
	if (!is_object($widget) || !method_exists($widget, 'get_id') || $widget->get_id() !== '294c967') return $args;
	$args['posts_per_page'] = 100;
	$args['orderby'] = 'date';
	$args['order'] = 'DESC';
	$yt = dabul_press_youtube_ids();
	if ($yt) $args['post__not_in'] = array_values(array_unique(array_merge(isset($args['post__not_in']) ? (array) $args['post__not_in'] : array(), $yt)));
	return $args;
}, 20, 2);

add_action('wp_footer', function () {
	if (!is_page(988)) return;
	echo '<style id="dpp-css">.dvp-off{display:none!important}'
		. '.dvp-nav{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:36px auto 10px;padding:0 16px;direction:rtl;font-family:"Noto Local","Noto Sans Hebrew",Heebo,Arial,sans-serif}'
		. '.dvp-nav button{min-width:44px;height:44px;padding:0 14px;border-radius:999px;border:1.5px solid #e2dccd;background:#fff;color:#141414;font:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s}'
		. '.dvp-nav button:hover:not(:disabled){border-color:#C5A25A}'
		. '.dvp-nav button[aria-current="page"]{background:#C5A25A;border-color:#C5A25A;color:#141414}'
		. '.dvp-nav button:disabled{opacity:.35;cursor:default}'
		. '.dvp-nav .dvp-info{width:100%;text-align:center;font-size:14px;color:#6b665c;margin-top:6px}'
		. '@media (max-width:480px){.dvp-nav{gap:6px;padding:0 8px}.dvp-nav button{min-width:40px;height:40px;padding:0 11px;font-size:15px}}</style>';
	echo '<script>(function(){var g=document.querySelector(".elementor-element-294c967 .elementor-loop-container");if(!g)return;'
		. 'var it=[].slice.call(g.children).filter(function(x){return x.classList&&x.classList.contains("e-loop-item")});'
		. 'var per=12,n=Math.ceil(it.length/per);if(n<2)return;'
		. 'var nav=document.createElement("nav");nav.className="dvp-nav";nav.setAttribute("aria-label","עמודי כתבות");g.parentNode.insertBefore(nav,g.nextSibling);'
		. 'var cur=1;function show(p,scroll){cur=Math.max(1,Math.min(n,p));it.forEach(function(x,i){x.classList.toggle("dvp-off",Math.floor(i/per)+1!==cur)});draw();'
		. 'if(scroll){var y=g.getBoundingClientRect().top+window.scrollY-130;window.scrollTo({top:y,behavior:"smooth"})}'
		. 'try{history.replaceState(null,"",cur>1?"#עמוד-"+cur:location.pathname+location.search)}catch(e){}}'
		. 'function b(t,p,dis,on){var e=document.createElement("button");e.type="button";e.textContent=t;if(dis)e.disabled=true;if(on)e.setAttribute("aria-current","page");e.addEventListener("click",function(){show(p,true)});return e}'
		. 'function draw(){nav.innerHTML="";nav.appendChild(b("הקודם",cur-1,cur===1));for(var i=1;i<=n;i++)nav.appendChild(b(String(i),i,false,i===cur));nav.appendChild(b("הבא",cur+1,cur===n));'
		. 'var s=document.createElement("div");s.className="dvp-info";s.textContent="עמוד "+cur+" מתוך "+n+" · "+it.length+" כתבות";nav.appendChild(s)}'
		. 'var m=decodeURIComponent(location.hash).match(/עמוד-(\\d+)/);show(m?+m[1]:1,false)})();</script>';
}, 30);
