/* dabul: the new "הצלחות" section on the home page (Yakir approved on 10.10.2026).
   Instead of the slider: a photo wall on the computer (one big photo + 4, the last one opens all of them),
   a swipe strip on the phone, and a photo viewer on click. The photo of another brokerage office was left out.
   The old Elementor section (e9818ea) is not deleted in Elementor; this code shows the new one in its place.
   Preview before going live: add ?dblprev=1 to the address. To undo: deactivate this snippet. */
define('DABUL_SUCC_LIVE', 1);

function dabul_succ_on() {
	if (DABUL_SUCC_LIVE) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}
function dabul_succ_html() {
	return <<<'DBLSUCCHTML'
<section class="dsc" id="dbl-succ" dir="rtl" aria-labelledby="dsc-h">
<style>
.dsc{--g:#b8932f;--g2:#8a6d2c;--g3:#e9d7a6;--ink:#1c1b19;--mut:#6c675d;--line:#e6dfcf;--paper:#f7f4ee;background:linear-gradient(180deg,#F8F8FD 0%,#FFFFFF 100%);padding:64px 20px;font-family:"Noto Local","Heebo",Arial,sans-serif;color:var(--ink)}
.dsc *{box-sizing:border-box}
.dsc .in{max-width:1240px;margin:0 auto}
.dsc .hd{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;margin:0 0 24px}
.dsc .k{display:inline-flex;align-items:center;gap:8px;color:var(--g2);font-size:14px;font-weight:800;letter-spacing:.04em;margin:0 0 8px}
.dsc .k::before{content:"";width:26px;height:2px;background:var(--g)}
.dsc h2{font-size:38px;line-height:1.15;margin:0 0 8px;font-weight:800;text-wrap:balance;color:var(--ink)}
.dsc .sub{margin:0;color:var(--mut);font-size:17.5px;line-height:1.6;max-width:66ch;text-wrap:balance}
.dsc .more{display:inline-flex;align-items:center;gap:6px;color:var(--ink);font-weight:800;text-decoration:none;border-bottom:2px solid var(--g);padding-bottom:2px;white-space:nowrap}
.dsc .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:250px 250px;gap:12px}
.dsc .t{position:relative;display:block;border:0;padding:0;margin:0;border-radius:20px;overflow:hidden;cursor:zoom-in;background:#ddd;box-shadow:0 10px 30px -18px rgba(28,27,25,.45)}
.dsc .t img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
.dsc .t:hover img{transform:scale(1.04)}
.dsc .t::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);pointer-events:none}
.dsc .t.big{grid-column:span 2;grid-row:span 2}
.dsc .t.big .cap{position:absolute;inset:auto 0 0 0;padding:60px 22px 18px;background:linear-gradient(to top,rgba(20,19,17,.85),transparent);color:#fff;text-align:right}
.dsc .cap b{display:block;font-size:22px}.dsc .cap span{font-size:15px;color:#e9e3d6}
.dsc .tag{position:absolute;top:14px;right:14px;background:var(--g);color:#1c1b19;font-weight:800;font-size:13px;border-radius:99px;padding:4px 12px}
.dsc .t.last .ov{position:absolute;inset:0;background:rgba(20,19,17,.62);color:#fff;display:grid;place-items:center;align-content:center;gap:2px;font-weight:800}
.dsc .t.last .ov b{font-size:34px;color:var(--g3);line-height:1}.dsc .t.last .ov span{font-size:15px}
.dsc .rail{display:none}
.dsc .lb{position:fixed;inset:0;z-index:99999;background:rgba(12,11,10,.97);display:none;align-items:center;justify-content:center;padding:56px 12px}
.dsc .lb.on{display:flex}
.dsc .lb img{max-width:min(1100px,100%);max-height:100%;border-radius:14px;object-fit:contain}
.dsc .lb button{position:absolute;border:0;background:rgba(255,255,255,.12);color:#fff;width:46px;height:46px;border-radius:50%;font-size:24px;cursor:pointer;display:grid;place-items:center}
.dsc .lb .x{top:14px;left:14px}.dsc .lb .p{right:14px;top:50%;transform:translateY(-50%)}.dsc .lb .n{left:14px;top:50%;transform:translateY(-50%)}
.dsc .lb .c{position:absolute;bottom:16px;left:0;right:0;text-align:center;color:#cfc7b6;font-size:14px}
@media (max-width:900px){
 .dsc{padding:40px 0 34px}
 .dsc .hd{padding:0 18px;margin-bottom:16px}
 .dsc h2{font-size:28px}.dsc .sub{font-size:16px}
 .dsc .grid{display:none}
 .dsc .rail{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 18px 18px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
 .dsc .rail::-webkit-scrollbar{display:none}
 .dsc .rail .t{flex:0 0 82%;height:240px;scroll-snap-align:center}
 .dsc .rail .t:first-child{flex-basis:86%}
 .dsc .bar{display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0}
 .dsc .hd .more{display:none}
 .dsc .bar .ar{display:flex;gap:8px}
 .dsc .bar .ar button{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--line);background:#fff;color:var(--ink);font-size:18px;display:grid;place-items:center}
 .dsc .lb{padding:56px 0}.dsc .lb img{border-radius:0}
}
@media (min-width:901px){.dsc .bar{display:none}}
</style>
<div class="in">
 <div class="hd">
  <div><p class="k">הצלחות</p><h2 id="dsc-h">רגעים מהמשרד, ביום החתימה</h2><p class="sub">קונים, מוכרים ומשפחות שסגרו עסקה במשרד. כל תמונה כאן היא עסקה שנחתמה.</p></div>
  <a class="more" href="https://dabullaw.co.il/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/">לכל ההצלחות ←</a>
 </div>
 <div class="grid">
  <button type="button" class="t big" data-i="0"><img src="https://dabullaw.co.il/wp-content/uploads/2025/12/4.jpg.webp" alt="קונים ומוכרים עם שלט נמכר במשרד יקיר דבול" loading="lazy" decoding="async"><span class="tag">נמכר</span><span class="cap"><b>עוד עסקה נחתמה</b><span>יום חתימה במשרד</span></span></button>
  <button type="button" class="t" data-i="1"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/Media-1-20A63BE0-A957-492B-A856-D9A2B4A8395C-768x576.webp" alt="הרמת כוסית אחרי חתימה על עסקת דירה" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="2"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/Media-4-7E4F3D49-B72A-4698-964E-C1427CE22EF7-768x576.webp" alt="חתימה על עסקת מקרקעין בחדר הישיבות של המשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="3"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/Media-2-648D13FE-A64F-4051-8FAF-1F0B3BFDB894-768x576.webp" alt="צדדים לעסקה בחדר הישיבות" loading="lazy" decoding="async"></button>
  <button type="button" class="t last" data-i="4"><img src="https://dabullaw.co.il/wp-content/uploads/2025/12/552303613_10166058948674838_2022410626647330012_n-768x576.jpg.webp" alt="" loading="lazy" decoding="async"><span class="ov"><b><bdi dir="ltr">+6</bdi></b><span>תמונות נוספות</span></span></button>
 </div>
 <div class="rail" aria-label="תמונות מהמשרד">
  <button type="button" class="t" data-i="0"><img src="https://dabullaw.co.il/wp-content/uploads/2025/12/4.jpg.webp" alt="קונים ומוכרים עם שלט נמכר במשרד יקיר דבול" loading="lazy" decoding="async"><span class="tag">נמכר</span></button>
  <button type="button" class="t" data-i="1"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/Media-1-20A63BE0-A957-492B-A856-D9A2B4A8395C-768x576.webp" alt="הרמת כוסית אחרי חתימה על עסקת דירה" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="2"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/Media-4-7E4F3D49-B72A-4698-964E-C1427CE22EF7-768x576.webp" alt="חתימה על עסקת מקרקעין בחדר הישיבות של המשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="3"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/Media-2-648D13FE-A64F-4051-8FAF-1F0B3BFDB894-768x576.webp" alt="צדדים לעסקה בחדר הישיבות" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="4"><img src="https://dabullaw.co.il/wp-content/uploads/2025/12/552303613_10166058948674838_2022410626647330012_n-768x576.jpg.webp" alt="חתימה על עסקה במשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="5"><img src="https://dabullaw.co.il/wp-content/uploads/2025/12/582970595_693738957140887_6466542977824114968_n-768x485.jpg.webp" alt="עסקה שנחתמה במשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="6"><img src="https://dabullaw.co.il/wp-content/uploads/2026/04/10.webp" alt="צדדים לעסקה במשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="7"><img src="https://dabullaw.co.il/wp-content/uploads/2025/12/574482520_10166278890599838_1653346198526951860_n-768x1024.jpg.webp" alt="יום חתימה במשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="8"><img src="https://dabullaw.co.il/wp-content/uploads/2026/03/496224849_2272487996499866_580159593228069400_n-3-768x576.jpg.webp" alt="עסקה שנחתמה במשרד" loading="lazy" decoding="async"></button>
  <button type="button" class="t" data-i="9"><img src="https://dabullaw.co.il/wp-content/uploads/2026/05/7-1.webp" alt="חגיגה אחרי חתימה" loading="lazy" decoding="async"></button>
 </div>
 <div class="bar"><a class="more" href="https://dabullaw.co.il/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/">לכל ההצלחות ←</a><span class="ar"><button type="button" data-d="-1" aria-label="הקודמת">→</button><button type="button" data-d="1" aria-label="הבאה">←</button></span></div>
</div>
<div class="lb" role="dialog" aria-modal="true" aria-label="תמונה"><button type="button" class="x" aria-label="סגירה">×</button><button type="button" class="p" aria-label="הקודמת">→</button><img alt=""><button type="button" class="n" aria-label="הבאה">←</button><span class="c"></span></div>
<script>
(function(){var r=document.getElementById('dbl-succ');if(!r)return;var rail=r.querySelector('.rail'),imgs=[].map.call(rail.querySelectorAll('img'),function(i){return i.getAttribute('src')}),lb=r.querySelector('.lb'),li=lb.querySelector('img'),lc=lb.querySelector('.c'),cur=0;
function show(i){cur=(i+imgs.length)%imgs.length;li.src=imgs[cur];lc.textContent=(cur+1)+' מתוך '+imgs.length;lb.classList.add('on');}
r.addEventListener('click',function(e){var t=e.target.closest('.t');if(t){show(+t.getAttribute('data-i'));return;}
 if(e.target.closest('.x')||e.target===lb){lb.classList.remove('on');return;}
 if(e.target.closest('.lb .n'))show(cur+1);if(e.target.closest('.lb .p'))show(cur-1);
 var d=e.target.closest('.bar button');if(d){var w=rail.querySelector('.t').getBoundingClientRect().width+10;rail.scrollBy({left:-(+d.getAttribute('data-d'))*w,behavior:'smooth'});}});
document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowLeft')show(cur+1);if(e.key==='ArrowRight')show(cur-1);});
})();
</script>
</section>
DBLSUCCHTML;
}
function dabul_succ_swap($html) {
	if (strpos($html, 'id="dbl-succ"') !== false) return $html;
	$start = strpos($html, '<div class="elementor-element elementor-element-e9818ea ');
	if ($start === false) return $html;
	$depth = 0; $pos = $start; $len = strlen($html);
	while ($pos < $len && preg_match('#<(/?)div\b[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE, $pos)) {
		$depth += $m[1][0] === '/' ? -1 : 1;
		$pos = $m[0][1] + strlen($m[0][0]);
		if ($depth === 0) return substr($html, 0, $start) . dabul_succ_html() . substr($html, $pos);
	}
	return $html;
}
add_action('template_redirect', function () {
	if (!is_front_page() || !dabul_succ_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_succ_swap($html);
	});
}, 8);
