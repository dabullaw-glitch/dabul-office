/* dabul: the new "למה לבחור בי" section on the home page (Yakir approved on 10.10.2026, after 3 rounds of mockups).
   It takes the old section's place: the old Elementor section (0f7132a) is hidden from the page (not deleted in
   Elementor), and the new one is shown right after "הכירו את יקיר דבול", before "תעודות והסמכות".
   No images, no scripts, no fonts: only inline style and small inline icons (about 10KB).
   Preview before going live: add ?dblprev=1 to the address. To undo: deactivate this snippet. */
define('DABUL_WHY_LIVE', 1);

function dabul_why_on() {
	if (DABUL_WHY_LIVE) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}
function dabul_why_html() {
	return <<<'DBLWHYHTML'
<div class="dwhy-wrap"><section class="dwhy" id="dbl-why" dir="rtl" aria-labelledby="dwhy-h">
<style>
.dwhy-wrap{padding:56px 20px;background:#fff}
@media (max-width:900px){.dwhy-wrap{padding:32px 12px}}
.dwhy{--g:#b8932f;--g2:#d9c08a;--g3:#f0e2bd;--ink:#141311;--ink2:#1f1d1a;--line:#34302a;--txt:#efe9dc;--mut:#b9b09e;background:radial-gradient(1200px 500px at 85% -10%,rgba(184,147,47,.18),transparent 60%),var(--ink);color:var(--txt);border-radius:28px;padding:56px 44px 44px;margin:0 auto;max-width:1240px;font-family:"Noto Local","Heebo",Arial,sans-serif;position:relative;overflow:hidden}
.dwhy *{box-sizing:border-box}
.dwhy .k{display:inline-flex;align-items:center;gap:8px;color:var(--g2);font-size:14px;font-weight:800;letter-spacing:.04em;margin:0 0 10px}
.dwhy .k::before{content:"";width:26px;height:2px;background:var(--g)}
.dwhy h2{color:#fff;font-size:40px;line-height:1.15;margin:0 0 12px;font-weight:800;text-wrap:balance}
.dwhy .sub{color:var(--mut);font-size:18px;line-height:1.6;max-width:70ch;margin:0 0 34px;text-wrap:balance}
.dwhy .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.dwhy .c{background:var(--ink2);border:1px solid var(--line);border-radius:20px;padding:22px 20px 20px;display:flex;flex-direction:column;gap:10px;position:relative;transition:border-color .2s,transform .2s}
.dwhy .c:hover{border-color:var(--g);transform:translateY(-2px)}
.dwhy .c .n{position:absolute;top:18px;left:20px;font-size:13px;font-weight:800;color:#5c5546}
.dwhy .ic{width:60px;height:60px;display:block;position:relative;margin-bottom:2px}
.dwhy .ic::before{content:"";position:absolute;inset:6px 10px 2px 2px;border-radius:50%;background:radial-gradient(closest-side,rgba(184,147,47,.22),transparent)}
.dwhy .ic svg{width:60px;height:60px;position:relative;overflow:visible}
.dwhy .ic .ln{fill:none;stroke:var(--g2);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.dwhy .ic .sf,.dwhy .ic .ln.sf{fill:rgba(217,192,138,.13)}
.dwhy .ic .ac{fill:var(--g)}
.dwhy .ic .dk{fill:var(--ink2)}
.dwhy .ic .hl{fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.dwhy .c b{font-size:19px;color:#fff;line-height:1.3}
.dwhy .c .s{display:none;font-style:normal}
.dwhy .c p{margin:0;color:var(--mut);font-size:15.5px;line-height:1.65}
.dwhy .c.big{background:linear-gradient(160deg,#2a2519,var(--ink2) 60%);border-color:#5a4a22}
.dwhy .c.big .num{font-size:44px;font-weight:800;color:var(--g2);line-height:1;letter-spacing:-.01em}
.dwhy .cta{margin-top:24px;display:flex;flex-wrap:wrap;gap:14px 20px;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:22px}
.dwhy .cta p{margin:0;font-size:18px;color:#fff;font-weight:700}
.dwhy .cta p span{display:block;font-size:15px;color:var(--mut);font-weight:400}
.dwhy .btns{display:flex;gap:10px;flex-wrap:wrap}
.dwhy .btn{display:inline-flex;align-items:center;gap:0;text-decoration:none;border-radius:99px;padding:13px 24px;font-weight:800;font-size:16px;white-space:nowrap}
.dwhy .btn.p{background:linear-gradient(135deg,var(--g3),var(--g));color:#1c1b19}
.dwhy .btn.s{border:1.5px solid var(--g);color:var(--g3)}
@media (max-width:900px){.dwhy{padding:30px 18px 22px;border-radius:22px}.dwhy h2{font-size:28px;margin-bottom:8px}.dwhy .sub{font-size:16px;margin-bottom:16px}
.dwhy .grid{grid-template-columns:minmax(0,1fr);gap:0}
.dwhy .c{display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:14px;row-gap:2px;align-items:center;background:none;border:0;border-top:1px solid var(--line);border-radius:0;padding:13px 0}
.dwhy .c:hover{transform:none}
.dwhy .c .n,.dwhy .c p{display:none}
.dwhy .ic{grid-row:span 2;width:44px;height:44px;margin:0}.dwhy .ic svg{width:44px;height:44px}
.dwhy .c b{font-size:16.5px}.dwhy .c .s{display:block;color:var(--mut);font-size:14.5px;line-height:1.5}
.dwhy .c.big{order:-1;grid-template-columns:auto minmax(0,1fr);background:linear-gradient(160deg,#2a2519,var(--ink2) 70%);border:1px solid #5a4a22;border-radius:16px;padding:12px 16px;margin-bottom:6px}
.dwhy .c.big .num{grid-row:span 2;font-size:34px}.dwhy .c.big b{font-size:15.5px}
.dwhy .cta{margin-top:6px;padding-top:16px;gap:12px}.dwhy .cta p{font-size:16.5px}.dwhy .cta p span{font-size:14px}
.dwhy .btns{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px}.dwhy .btn{justify-content:center;padding:12px 10px;font-size:15.5px}.dwhy .btn .ph{display:none}}
@media (min-width:901px) and (max-width:1100px){.dwhy .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
<p class="k">למה לבחור בי</p>
<h2 id="dwhy-h">מה מקבלים כשעובדים איתי</h2>
<p class="sub">עובדים ישירות מול עורך הדין, מהשיחה הראשונה ועד הרישום בטאבו.</p>
<div class="grid">
 <div class="c"><span class="n">01</span><span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="sf ln" d="M17 7h14l3.5 13L24 37 13.5 20z"/><path class="ln" d="M15.5 13.5h17"/><circle class="ac" cx="24" cy="24" r="2.6"/><path class="ln" d="M24 26.6V37"/><path class="ln" d="M6 43c3-3.2 5.6-3.2 7.6-.4 1.6 2.2 3.6 2.2 5.6-.2 2-2.4 4-2.4 5.8-.2 1.8 2.2 3.8 2.4 6 .2 1.6-1.6 3.4-1.8 5.4-.4"/></svg></span><b>עורך הדין עצמו מטפל בתיק</b><i class="s">את התיק מנהל עו״ד דבול בעצמו.</i><p>לא מעבירים אתכם בין מתמחים ומזכירות. את התיק מנהל עו״ד יקיר דבול, ואיתו אתם מדברים בכל שלב.</p></div>
 <div class="c big"><span class="n">02</span><span class="num"><bdi dir="ltr">+100</bdi></span><b>עסקאות מקרקעין בכל שנה</b><i class="s">בנתניה ובשרון.</i><p>בנתניה ובשרון. היכרות יומיומית עם לשכות הטאבו, הוועדות המקומיות, רשות המסים והבנקים.</p></div>
 <div class="c"><span class="n">03</span><span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="sf ln" d="M10 5h19l9 9v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path class="ln" d="M29 5v7a2 2 0 0 0 2 2h7"/><path class="ln" d="M14 18h11M14 23.5h17M14 29h8"/><path class="ac" d="M27 39.5l-2.2 7 3.4-1.6 2.3 2.6.9-6.4zM35 39.5l2.2 7-3.4-1.6-2.3 2.6-.9-6.4z"/><circle class="ac" cx="31" cy="36" r="7"/><path class="hl" d="M27.8 36.2l2.2 2.2 4.2-4.6"/></svg></span><b>מחיר ברור מראש</b><i class="s">שכר טרחה בהסכם כתוב מראש.</i><p>שכר הטרחה נקבע בהסכם כתוב לפני שמתחילים, כולל מה בדיוק נכלל בו. בלי הפתעות באמצע הדרך.</p></div>
 <div class="c"><span class="n">04</span><span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><rect class="sf ln" x="11" y="4" width="22" height="39" rx="4.5"/><path class="ln" d="M19.5 8.5h5"/><path class="ln" d="M16.5 15h11a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H22l-3.4 3v-3h-2.1a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2z"/><circle class="ac" cx="18.6" cy="20.3" r="1.2"/><circle class="ac" cx="22" cy="20.3" r="1.2"/><circle class="ac" cx="25.4" cy="20.3" r="1.2"/><circle class="dk" cx="35" cy="35" r="9"/><circle class="ln" cx="35" cy="35" r="8"/><path class="ln" d="M35 30.5V35l3 2"/></svg></span><b>זמינות אמיתית</b><i class="s">חוזרים בדרך כלל באותו יום עבודה.</i><p>טלפון, וואטסאפ ומייל. חוזרים אליכם בדרך כלל באותו יום עבודה, ומעדכנים אתכם בכל שלב בעסקה.</p></div>
 <div class="c"><span class="n">05</span><span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="ln" d="M4 21.5L21 7l17 14.5"/><path class="sf ln" d="M8 18.5V40h18"/><path class="ln" d="M34 18v4"/><rect class="ln" x="13" y="25" width="7" height="7" rx="1"/><path class="ln" d="M16.5 25v7M13 28.5h7"/><circle class="dk" cx="32" cy="31" r="9.5"/><circle class="sf ln" cx="32" cy="31" r="8.5"/><path class="ln" d="M28.5 34.5l7-7"/><circle class="ac" cx="29" cy="28" r="1.5"/><circle class="ac" cx="35" cy="34" r="1.5"/><path class="ln" d="M38.3 37.3L45 44" style="stroke-width:3.2"/></svg></span><b>רואים את כל התמונה</b><i class="s">מס, משכנתא, תכנון ורישום.</i><p>לא רק החוזה: גם המס, המשכנתא, התכנון והרישום. כשצריך, עובדים עם שמאי, מהנדס או יועץ משכנתאות.</p></div>
 <div class="c"><span class="n">06</span><span class="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path class="sf ln" d="M5 16L24 5.5 43 16z"/><circle class="ac" cx="24" cy="11.6" r="2"/><path class="ln" d="M7 19.5h34"/><path class="ln" d="M11.5 23v12M19 23v12M29 23v12M36.5 23v12"/><path class="ln" d="M7 38.5h34M4.5 43h39"/></svg></span><b>חלק מהקהילה המקצועית</b><i class="s">חבר ב־4 ועדות בלשכת עורכי הדין.</i><p>חבר ב־4 ועדות בלשכת עורכי הדין, ומתמנה על ידי בית המשפט בתיקי רישום בתים משותפים.</p></div>
</div>
<div class="cta"><p>רוצים לשמוע מה אני חושב על המקרה שלכם?<span>שיחה ראשונה קצרה, ונגיד לכם מה צריך לבדוק.</span></p><div class="btns"><a class="btn p" href="tel:098613413">להתקשר<span class="ph">: 09-8613413</span></a><a class="btn s" href="https://dabullaw.co.il/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/">השארת פרטים</a></div></div>
</section></div>
DBLWHYHTML;
}
/* start..end of a whole Elementor element (counting its inner div tags) */
function dabul_why_span($html, $id) {
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
function dabul_why_swap($html) {
	if (strpos($html, 'id="dbl-why"') !== false) return $html;
	$cert = strpos($html, '<div class="elementor-element elementor-element-abb2800 ');
	$old = dabul_why_span($html, '0f7132a');
	if ($cert === false || !$old) return $html;
	// put the new section before the certificates, then take the old one out (it is earlier on the page)
	$html = substr($html, 0, $cert) . dabul_why_html() . substr($html, $cert);
	if ($old[1] <= $cert) $html = substr($html, 0, $old[0]) . substr($html, $old[1]);
	return $html;
}
add_action('template_redirect', function () {
	if (!is_front_page() || !dabul_why_on() || is_admin() || wp_doing_ajax() || is_feed() || (defined('REST_REQUEST') && REST_REQUEST)) return;
	ob_start(function ($html) {
		if (!is_string($html) || stripos($html, '<html') === false) return $html;
		return dabul_why_swap($html);
	});
}, 7);
