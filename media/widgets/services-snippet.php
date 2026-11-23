/* dabul: new "שירותי המשרד" cards on the home page (Yakir approved sketch 2 on 8.11.2026).
   Replaces the Elementor icon grid (5e80f31) with 5 cards; the Elementor data is not changed.
   Circles version: Yakir approved it and asked to put it live on 23.11.2026. The old cards stay in dabul_svc_html() for undo.
   Preview: ?dblprev=1. To undo: deactivate this snippet. */
define('DABUL_SVC_LIVE', 1);
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
function dabul_svc_circles_html() {
	return <<<'DBLCIRHTML'
<div class="dcir" id="dbl-svc" dir="rtl"><style>
.dcir{--navy:#0B1330;--gold:#D4B25B;--gold2:#E7CD96;--gold3:#8A6A2B;--ink:#141414;--text:#5F5F66;font-family:"Noto Local","Noto Sans Hebrew",Arial,sans-serif;width:100%;max-width:1180px;margin:0 auto}
.dcir *{box-sizing:border-box}
.dcir .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));column-gap:16px;row-gap:40px;margin-top:60px;align-items:start}
.dcir a.cb{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;min-width:0;text-decoration:none!important;color:inherit}
.dcir .ring{position:relative;width:164px;height:164px;display:flex;align-items:center;justify-content:center}
.dcir .dash{position:absolute;inset:0;width:100%;height:100%;transition:transform 1.4s ease}
.dcir .disc{width:138px;height:138px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#F7F4EE;color:var(--navy);border:1px solid #EADFC6;transition:background .35s ease,color .35s ease,box-shadow .35s ease,border-color .35s ease}
.dcir .disc svg{width:66px;height:66px}
.dcir .disc.main{background:var(--navy);color:var(--gold2);border-color:var(--navy);box-shadow:0 14px 30px rgba(11,19,48,.22)}
.dcir .tag{position:absolute;top:-10px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:700;color:var(--navy);background:var(--gold2);border-radius:999px;padding:3px 10px;line-height:1.5}
.dcir .t{font-family:inherit;font-size:21px;line-height:1.3;font-weight:700;color:var(--ink);text-wrap:balance;transition:color .3s ease;margin:0}
.dcir .d{font-size:15px;line-height:1.55;color:var(--text);text-wrap:balance;margin:0}
.dcir .bar{display:block;width:34px;height:3px;border-radius:2px;background:#E4DCC9;transition:width .3s ease,background .3s ease}
.dcir a.cb:hover .disc{background:var(--navy);color:var(--gold2);border-color:var(--navy);box-shadow:0 16px 34px rgba(11,19,48,.26)}
.dcir a.cb:hover .dash{transform:rotate(120deg)}
.dcir a.cb:hover .bar{width:60px;background:#C6A03C}
.dcir a.cb:hover .t{color:var(--gold3)}
.dcir a.cb:focus-visible{outline:2px solid var(--gold3);outline-offset:6px;border-radius:12px}
@media (max-width:1024px){.dcir .grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:760px){.dcir .grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;margin-top:34px}.dcir .ring{width:128px;height:128px}.dcir .disc{width:108px;height:108px}.dcir .disc svg{width:52px;height:52px}.dcir .t{font-size:18px}.dcir .d{font-size:14px}.dcir a.cb{gap:12px}.dcir .tag{font-size:11px}}
@media (prefers-reduced-motion:reduce){.dcir .dash,.dcir .disc,.dcir .bar{transition:none}}
</style>
<div class="grid">
<a class="cb" href="https://dabullaw.co.il/real-estate-lawyer/"><span class="ring"><svg class="dash" aria-hidden="true" viewBox="0 0 164 164"><circle cx="82" cy="82" r="80.5" fill="none" stroke="#D4B25B" stroke-width="1.3" stroke-dasharray="1.5 7" stroke-linecap="round"/></svg><span class="disc"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30 32 11l24 19"></path><path d="M14 25v27h34V25"></path><path d="M27 52V39h9v13"></path><rect x="18" y="31" width="6" height="6"></rect><rect x="38" y="31" width="6" height="6"></rect><path d="M41 15v-4h5v8"></path><path d="M6 52h44"></path><circle cx="56" cy="42" r="3.5"></circle><path d="M56 45.5v9M56 51h2.5M56 54.5h2"></path></svg></span></span><h3 class="t">מקרקעין ונדל״ן</h3><p class="d">קנייה ומכירה, מהבדיקה ועד הטאבו</p><span class="bar" aria-hidden="true"></span></a>
<a class="cb" href="https://dabullaw.co.il/התחדשות-עירונית/"><span class="ring"><svg class="dash" aria-hidden="true" viewBox="0 0 164 164"><circle cx="82" cy="82" r="80.5" fill="none" stroke="#D4B25B" stroke-width="1.3" stroke-dasharray="1.5 7" stroke-linecap="round"/></svg><span class="disc"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="34" width="15" height="20"></rect><path d="M12 39h2M17 39h2M12 45h2M17 45h2"></path><rect x="30" y="16" width="16" height="38"></rect><path d="M34 22h2M40 22h2M34 28h2M40 28h2M34 34h2M40 34h2M34 40h2M40 40h2M34 46h2M40 46h2"></path><path d="M53 54V10M45 10h15M53 15l7-5M59 10v8"></path><path d="M59 18v3"></path><path d="M26.5 31v-8M24 25.5l2.5-2.5 2.5 2.5"></path><path d="M5 54h56"></path></svg></span></span><h3 class="t">התחדשות עירונית</h3><p class="d">פינוי בינוי ותמ״א 38</p><span class="bar" aria-hidden="true"></span></a>
<a class="cb" href="https://dabullaw.co.il/מיסוי-מקרקעין-המדריך-המלא/"><span class="ring"><svg class="dash" aria-hidden="true" viewBox="0 0 164 164"><circle cx="82" cy="82" r="80.5" fill="none" stroke="#D4B25B" stroke-width="1.3" stroke-dasharray="1.5 7" stroke-linecap="round"/></svg><span class="disc"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8h22l10 10v38H12z"></path><path d="M34 8v10h10"></path><path d="M20 44l14-16"></path><circle cx="21.5" cy="30.5" r="3"></circle><circle cx="32.5" cy="41.5" r="3"></circle><path d="M18 50h20"></path><ellipse cx="51" cy="50" rx="7" ry="2.5"></ellipse><path d="M44 50v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"></path><path d="M44 54v3.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V54"></path></svg></span></span><h3 class="t">מיסוי מקרקעין</h3><p class="d">מס שבח, מס רכישה והיטל השבחה</p><span class="bar" aria-hidden="true"></span></a>
<a class="cb" href="https://dabullaw.co.il/צוואות-וירושות/"><span class="ring"><svg class="dash" aria-hidden="true" viewBox="0 0 164 164"><circle cx="82" cy="82" r="80.5" fill="none" stroke="#D4B25B" stroke-width="1.3" stroke-dasharray="1.5 7" stroke-linecap="round"/></svg><span class="disc"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h26l8 8v22"></path><path d="M14 8v48h20"></path><path d="M40 8v8h8"></path><path d="M20 20h18M20 26h20M20 32h14"></path><circle cx="45" cy="46" r="7"></circle><circle cx="45" cy="46" r="3"></circle><path d="M41 52l-2 8 6-3 6 3-2-8"></path><path d="M19 47l8-8 3 3-8 8h-3z"></path></svg></span></span><h3 class="t">צוואות וירושות</h3><p class="d">צוואה, צו ירושה וצו קיום צוואה</p><span class="bar" aria-hidden="true"></span></a>
<a class="cb" href="https://dabullaw.co.il/ייפוי-כח-מתמשך/"><span class="ring"><svg class="dash" aria-hidden="true" viewBox="0 0 164 164"><circle cx="82" cy="82" r="80.5" fill="none" stroke="#D4B25B" stroke-width="1.3" stroke-dasharray="1.5 7" stroke-linecap="round"/></svg><span class="disc"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 7 12 14v14c0 12 8.5 21.5 20 27 11.5-5.5 20-15 20-27V14z"></path><circle cx="32" cy="26" r="5"></circle><path d="M23 41c1.8-5 5-7.5 9-7.5s7.2 2.5 9 7.5"></path><path d="M32 12v-2M20 17l-1.5-1.5M44 17l1.5-1.5"></path></svg></span></span><h3 class="t">ייפוי כוח מתמשך</h3><p class="d">רכוש ובריאות, מסדרים מראש</p><span class="bar" aria-hidden="true"></span></a>
<a class="cb" href="https://dabullaw.co.il/הוצאה-לפועל-וחדלות-פירעון/"><span class="ring"><svg class="dash" aria-hidden="true" viewBox="0 0 164 164"><circle cx="82" cy="82" r="80.5" fill="none" stroke="#D4B25B" stroke-width="1.3" stroke-dasharray="1.5 7" stroke-linecap="round"/></svg><span class="disc"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="10" r="2.2"></circle><path d="M32 12.2V52"></path><path d="M22 55h20"></path><path d="M26 52h12"></path><path d="M13 18h38"></path><path d="M13 18 6 34M13 18l7 16"></path><path d="M6 34a7 4 0 0 0 14 0z"></path><path d="M51 18l-7 16M51 18l7 16"></path><path d="M44 34a7 4 0 0 0 14 0z"></path></svg></span></span><h3 class="t">הוצאה לפועל וחדלות פירעון</h3><p class="d">איחוד תיקים וחדלות פירעון</p><span class="bar" aria-hidden="true"></span></a>
</div>
</div>
DBLCIRHTML;
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
	$html = substr($html, 0, $g[0]) . dabul_svc_circles_html() . substr($html, $g[1]);
	return str_replace('כל אתגר משפטי הוא פרק משמעותי בחייכם, ואני כאן כדי שתעברו אותו בביטחון ובהצלחה.', 'כל אתגר משפטי הוא פרק משמעותי בחייכם, ואני כאן כדי ללוות אתכם בו.', $html);
}
add_action('template_redirect', function () {
	if (!is_front_page() || !dabul_svc_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_svc_swap($html);
	});
}, 8);

// one time: clear the cached home page so visitors get the circles (23.11.2026)
add_action('init', function () {
	if (get_option('dabul_svc_purged') === '20261123c') return;
	update_option('dabul_svc_purged', '20261123c', false);
	if (function_exists('rocket_clean_home')) rocket_clean_home();
	if (function_exists('rocket_clean_post')) rocket_clean_post(1112);
}, 99);
