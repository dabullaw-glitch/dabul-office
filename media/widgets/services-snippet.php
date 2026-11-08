/* dabul: new "שירותי המשרד" cards on the home page (Yakir approved sketch 2 on 8.11.2026).
   Replaces the Elementor icon grid (5e80f31) with 5 cards; the Elementor data is not changed.
   Preview: ?dblprev=1. To undo: deactivate this snippet. */
define('DABUL_SVC_LIVE', 0);
function dabul_svc_on() {
	if (DABUL_SVC_LIVE) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}
function dabul_svc_html() {
	return <<<'DBLSVCHTML'
<div class="dsvc" id="dbl-svc" dir="rtl"><style>
.dsvc{--navy:#040920;--navy3:#16224a;--gold:#C5A25A;--gold2:#E7CD96;--gold3:#A88A4C;--ink:#141414;--text:#54595F;--soft:#F8F8FD;--soft2:#E7E7F1;font-family:"Noto Local","Noto Sans Hebrew",Arial,sans-serif;width:100%;max-width:1200px;margin:0 auto}
.dsvc *{box-sizing:border-box}.dsvc h3,.dsvc p,.dsvc ul,.dsvc li{margin:0;padding-top:0;padding-bottom:0}.dsvc h3{font-family:inherit;line-height:1.3}
.dsvc a{text-decoration:none;color:inherit}
.dsvc .card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(4,9,32,.08)}
/* icons */
.dsvc .ico{width:76px;height:76px;border-radius:20px;background:linear-gradient(150deg,var(--navy3),var(--navy) 75%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(231,205,150,.28),0 10px 22px rgba(4,9,32,.18);flex:0 0 auto}
.dsvc .ico svg{width:46px;height:46px}
.dsvc .ico .l{fill:none;stroke:var(--gold2);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.dsvc .ico .f{fill:rgba(231,205,150,.16)}
.dsvc .ico .a{fill:var(--gold)}
/* services */
.dsvc .grid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:26px;margin-top:56px}
.dsvc .card{background:var(--soft);border:1px solid var(--soft2);border-radius:22px;padding:30px 30px 26px;display:flex;flex-direction:column;gap:14px;transition:.2s}
.dsvc .card h3{font-size:24px;font-weight:700;color:var(--ink)}
.dsvc .card p{font-size:17px;line-height:1.7;color:var(--text)}
.dsvc .more{margin-top:auto;font-weight:700;color:var(--gold3);font-size:16.5px;display:flex;align-items:center;gap:8px}
.dsvc .more:after{content:"";width:26px;height:1.5px;background:var(--gold3)}
.dsvc .card.main{grid-row:span 2;background:linear-gradient(200deg,rgba(4,9,32,.55),var(--navy) 70%),linear-gradient(0deg,#0b1430,#1b2a55);color:#fff;border:0;position:relative;overflow:hidden;padding:36px 34px 30px}
.dsvc .card.main:before{content:"";position:absolute;left:-40px;bottom:-30px;width:520px;height:220px;opacity:.06;background:
.dsvc  linear-gradient(#e7cd96,#e7cd96) 0 120px/40px 100px no-repeat,linear-gradient(#e7cd96,#e7cd96) 50px 60px/56px 160px no-repeat,linear-gradient(#e7cd96,#e7cd96) 116px 100px/38px 120px no-repeat,linear-gradient(#e7cd96,#e7cd96) 164px 20px/62px 200px no-repeat,linear-gradient(#e7cd96,#e7cd96) 236px 90px/44px 130px no-repeat,linear-gradient(#e7cd96,#e7cd96) 290px 50px/58px 170px no-repeat,linear-gradient(#e7cd96,#e7cd96) 358px 130px/40px 90px no-repeat}
.dsvc .card.main h3{color:#fff;font-size:30px}
.dsvc .card.main .k{color:var(--gold2);font-weight:700;font-size:15px;letter-spacing:.02em}
.dsvc .card.main p{color:#d9dbe6}
.dsvc .card.main ul{list-style:none;display:flex;flex-direction:column;gap:12px;margin:4px 0 8px;position:relative}
.dsvc .card.main li{font-size:17px;color:#eef0f6;padding-right:28px;position:relative}
.dsvc .card.main li:before{content:"";position:absolute;right:0;top:6px;width:16px;height:16px;border-radius:50%;border:1.5px solid var(--gold2);background:radial-gradient(circle,var(--gold) 0 3px,transparent 4px)}
.dsvc .card.main .more{color:var(--gold2);position:relative}.card.main .more:after{background:var(--gold2)}
.dsvc .card.main .ico{background:rgba(231,205,150,.08);box-shadow:inset 0 0 0 1px rgba(231,205,150,.4)}
.dsvc .note{margin-top:26px;text-align:center;color:#8a8d93;font-size:14.5px}

@media (max-width:760px){.dsvc .grid{grid-template-columns:1fr;gap:16px;margin-top:30px}.dsvc .card.main{grid-row:auto}.dsvc .card{padding:24px 22px}}
@media (min-width:761px) and (max-width:1024px){.dsvc .grid{grid-template-columns:1fr 1fr}.dsvc .card.main{grid-column:span 2;grid-row:auto}}
</style>
<div class="grid">
 <a class="card main" href="https://dabullaw.co.il/real-estate-lawyer/">
  <div class="ico"><svg viewBox="0 0 48 48"><path class="f" d="M8 22 24 9l16 13v19H8z"/><path class="l" d="M5 24 24 8l19 16"/><path class="l" d="M9 21v20h30V21"/><path class="l" d="M19 41V30h10v11"/><path class="l" d="M14 26h4v4h-4zM30 26h4v4h-4z"/><circle class="a" cx="26.6" cy="35.5" r="1.1"/></svg></div>
  <span class="k">התחום המרכזי של המשרד</span>
  <h3>מקרקעין ונדל״ן</h3>
  <p>ליווי מלא בקנייה ובמכירה של דירות, מהבדיקות לפני ההצעה ועד הרישום בטאבו.</p>
  <ul><li>בדיקות מקדימות לפני שמציעים מחיר</li><li>חוזה מכר, יד שנייה או מקבלן</li><li>מס שבח, מס רכישה והיטל השבחה</li><li>רישום הזכויות בטאבו</li></ul>
  <span class="more">לכל הפרטים</span>
 </a>
 <a class="card" href="https://dabullaw.co.il/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/"><div class="ico"><svg viewBox="0 0 48 48"><path class="f" d="M8 22h12v19H8zM24 14h14v27H24z"/><path class="l" d="M8 41V22h12v19M24 41V14h14v27M4 41h40"/><path class="l" d="M12 27h4M12 32h4M28 19h6M28 24h6M28 29h6M28 34h6"/><path class="l" d="M11 22V8h18M29 8l-6 6M15 8v4"/><circle class="a" cx="29" cy="8" r="1.4"/></svg></div>
  <h3>התחדשות עירונית</h3><p>ליווי בעלי דירות בפינוי בינוי ובתמ״א 38, מהחתימה ועד המפתח לדירה החדשה.</p><span class="more">לכל הפרטים</span></a>
 <a class="card" href="https://dabullaw.co.il/%d7%a6%d7%95%d7%95%d7%90%d7%95%d7%aa-%d7%95%d7%99%d7%a8%d7%95%d7%a9%d7%95%d7%aa/"><div class="ico"><svg viewBox="0 0 48 48"><path class="f" d="M12 6h18l7 7v29H12z"/><path class="l" d="M12 42V6h18l7 7v29z"/><path class="l" d="M30 6v7h7M17 18h14M17 23h14M17 28h8"/><circle class="l" cx="31" cy="33" r="5"/><path class="l" d="m28.5 37.5-1.5 6 4-2 4 2-1.5-6"/><circle class="a" cx="31" cy="33" r="1.6"/></svg></div>
  <h3>צוואות וירושות</h3><p>עריכת צוואה, צו ירושה וצו קיום צוואה, וחלוקה של נכסים בין יורשים.</p><span class="more">לכל הפרטים</span></a>
 <a class="card" href="https://dabullaw.co.il/%d7%99%d7%99%d7%a4%d7%95%d7%99-%d7%9b%d7%97-%d7%9e%d7%aa%d7%9e%d7%a9%d7%9a/"><div class="ico"><svg viewBox="0 0 48 48"><path class="f" d="M24 5l15 6v11c0 10-6.5 17-15 21-8.5-4-15-11-15-21V11z"/><path class="l" d="M24 5l15 6v11c0 10-6.5 17-15 21-8.5-4-15-11-15-21V11z"/><circle class="l" cx="24" cy="19" r="4.5"/><path class="l" d="M16 33c1.5-5 4.5-7.5 8-7.5s6.5 2.5 8 7.5"/><circle class="a" cx="24" cy="19" r="1.4"/></svg></div>
  <h3>ייפוי כוח מתמשך</h3><p>בוחרים מראש מי יחליט בשבילכם בענייני רכוש ובריאות, אם יום אחד זה יידרש.</p><span class="more">לכל הפרטים</span></a>
 <a class="card" href="https://dabullaw.co.il/%d7%94%d7%95%d7%a6%d7%90%d7%94-%d7%9c%d7%a4%d7%95%d7%a2%d7%9c-%d7%95%d7%97%d7%93%d7%9c%d7%95%d7%aa-%d7%a4%d7%99%d7%a8%d7%a2%d7%95%d7%9f/"><div class="ico"><svg viewBox="0 0 48 48"><path class="l" d="M24 6v34M14 42h20M10 12h28"/><circle class="a" cx="24" cy="9" r="2"/><path class="f" d="M5 26l5-12 5 12a5 5 0 0 1-10 0zM33 26l5-12 5 12a5 5 0 0 1-10 0z"/><path class="l" d="M5 26l5-12 5 12a5 5 0 0 1-10 0zM33 26l5-12 5 12a5 5 0 0 1-10 0zM5 26h10M33 26h10"/></svg></div>
  <h3>הוצאה לפועל וחדלות פירעון</h3><p>ליווי בהליכים מול רשות האכיפה והגבייה ובהליכי חדלות פירעון, צעד אחר צעד.</p><span class="more">לכל הפרטים</span></a>
</div>
</div>
DBLSVCHTML;
}
function dabul_svc_span($html, $id) {
	$start = strpos($html, '<div class="elementor-element elementor-element-' . $id . ' ');
	if ($start === false) return null;
	$depth = 0; $pos = $start; $len = strlen($html);
	while ($pos < $len && preg_match('#<(/?)div\b[^>]*>#i', $html, $m, PREG_OFFSET_CAPTURE, $pos)) {
		$depth += $m[1][0] === '/' ? -1 : 1;
		$pos = $m[0][1] + strlen($m[0][0]);
		if ($depth === 0) return array($start, $pos);
	}
	return null;
}
function dabul_svc_swap($html) {
	if (strpos($html, 'id="dbl-svc"') !== false) return $html;
	$g = dabul_svc_span($html, '5e80f31');
	if (!$g) return $html;
	$html = substr($html, 0, $g[0]) . dabul_svc_html() . substr($html, $g[1]);
	return str_replace('כל אתגר משפטי הוא פרק משמעותי בחייכם, ואני כאן כדי שתעברו אותו בביטחון ובהצלחה.', 'כל אתגר משפטי הוא פרק משמעותי בחייכם, ואני כאן כדי ללוות אתכם בו.', $html);
}
add_action('template_redirect', function () {
	if (!is_front_page() || !dabul_svc_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_svc_swap($html);
	});
}, 8);
