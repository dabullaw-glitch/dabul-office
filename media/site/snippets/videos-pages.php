/* dabul: the videos page (5225) in pages of 15 videos (Yakir asked on 25.10.2026: "שכל 15 סרטונים זה עובר לעמוד הבא").
   All the videos stay in the page itself (so Google still sees every one); the browser shows 15 at a time with
   page buttons under the grid ("הקודם 1 2 3 הבא"). Preview before approval: ?pg=preview. Live after Yakir approves:
   option dabul_videos_paged = 1. Undo: deactivate this snippet. */
add_action('wp_footer', function () {
	if (!is_page(5225)) return;
	$preview = isset($_GET['pg']) && $_GET['pg'] === 'preview';
	if (!$preview && !get_option('dabul_videos_paged')) return;
	echo '<style id="dvp-css">.dvp-off{display:none!important}'
		. '.dvp-nav{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:36px auto 10px;padding:0 16px;direction:rtl;font-family:"Noto Local","Noto Sans Hebrew",Heebo,Arial,sans-serif}'
		. '.dvp-nav button{min-width:44px;height:44px;padding:0 14px;border-radius:999px;border:1.5px solid #e2dccd;background:#fff;color:#141414;font:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s}'
		. '.dvp-nav button:hover:not(:disabled){border-color:#C5A25A}'
		. '.dvp-nav button[aria-current="page"]{background:#C5A25A;border-color:#C5A25A;color:#141414}'
		. '.dvp-nav button:disabled{opacity:.35;cursor:default}'
		. '.dvp-nav .dvp-info{width:100%;text-align:center;font-size:14px;color:#6b665c;margin-top:6px}'
		. '@media (max-width:480px){.dvp-nav{gap:6px;padding:0 8px}.dvp-nav button{min-width:40px;height:40px;padding:0 11px;font-size:15px}}</style>';
	echo '<script>(function(){var g=document.querySelector(".elementor-element-76f9f98 .elementor-loop-container");if(!g)return;'
		. 'var it=[].slice.call(g.children).filter(function(x){return x.classList&&(x.classList.contains("e-loop-item")||x.classList.contains("dbl-vcard"))});'
		// about 15 a page; a page ends only after a full row of short videos (3 in a row), so no row is left half empty
		. 'var per=15,pg=[],p=1,c=0,sh=0;it.forEach(function(x){var w=x.classList.contains("dbl-wide")||!!x.querySelector(".elementor-widget-video:not(.dbl-short)");if(c>=per&&sh%3===0){p++;c=0;sh=0}pg.push(p);c++;if(!w)sh++});var n=p;if(n<2)return;'
		. 'var nav=document.createElement("nav");nav.className="dvp-nav";nav.setAttribute("aria-label","עמודי סרטונים");g.parentNode.insertBefore(nav,g.nextSibling);'
		. 'var cur=1;function show(p,scroll){cur=Math.max(1,Math.min(n,p));it.forEach(function(x,i){x.classList.toggle("dvp-off",pg[i]!==cur)});draw();'
		. 'if(scroll){var y=g.getBoundingClientRect().top+window.scrollY-130;window.scrollTo({top:y,behavior:"smooth"})}'
		. 'try{history.replaceState(null,"",cur>1?"#עמוד-"+cur:location.pathname+location.search)}catch(e){}}'
		. 'function b(t,p,dis,on){var e=document.createElement("button");e.type="button";e.textContent=t;if(dis)e.disabled=true;if(on)e.setAttribute("aria-current","page");e.addEventListener("click",function(){show(p,true)});return e}'
		. 'function draw(){nav.innerHTML="";nav.appendChild(b("הקודם",cur-1,cur===1));for(var i=1;i<=n;i++)nav.appendChild(b(String(i),i,false,i===cur));nav.appendChild(b("הבא",cur+1,cur===n));'
		. 'var s=document.createElement("div");s.className="dvp-info";s.textContent="עמוד "+cur+" מתוך "+n+" · "+it.length+" סרטונים";nav.appendChild(s)}'
		. 'var m=decodeURIComponent(location.hash).match(/עמוד-(\\d+)/);show(m?+m[1]:1,false)})();</script>';
}, 30);
