/* dabul: "מתי תצטרכו עורך דין מקרקעין?" on the home page, right above "שאלות ותשובות" (Yakir approved round 4 on 20.10.2026).
   Page output only, nothing changed in Elementor. To undo: deactivate this snippet. */
add_filter('elementor/frontend/the_content', function ($content) {
	if (is_admin() || !is_front_page()) return $content;
	if (strpos($content, 'id="dbl-when"') !== false) return $content;
	$p = strpos($content, 'elementor-element-32f6098 ');
	if ($p === false) $p = strpos($content, 'elementor-element-32f6098"');
	if ($p === false) return $content;
	$s = strrpos(substr($content, 0, $p), '<div');
	if ($s === false) return $content;
	$h = <<<'DBLWHENHTML'
<style>.dwn4-wrap{padding:72px 20px 64px;background:#fff}
.dwn4{--g:#b8932f;--g2:#d9c08a;--g3:#f0e2bd;--ink:#141311;--txt:#4a4740;--line:#eee6d3;max-width:1140px;margin:0 auto;font-family:"Noto Local","Heebo",Arial,sans-serif;color:var(--txt);direction:rtl;text-align:right}
.dwn4 *{box-sizing:border-box}
.dwn4 .hd{text-align:center;max-width:860px;margin:0 auto 34px}
.dwn4 .k{display:inline-flex;align-items:center;gap:10px;color:var(--g);font-size:14px;font-weight:800;letter-spacing:.04em;margin:0 0 10px}
.dwn4 .k::before,.dwn4 .k::after{content:"";width:26px;height:2px;background:var(--g)}
.dwn4 h2{margin:0;font-size:38px;line-height:1.25;font-weight:800;color:var(--ink);text-wrap:balance}
.dwn4 .hd p{margin:16px 0 0;font-size:18px;line-height:1.85}
.dwn4 ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:44px;counter-reset:w}
.dwn4 li{counter-increment:w;display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:14px;padding:18px 0;border-top:1px solid var(--line);font-size:16.5px;line-height:1.75}
.dwn4 li:nth-child(-n+2){border-top:0}
.dwn4 li::before{content:"0" counter(w);grid-row:span 2;width:40px;height:40px;border-radius:50%;border:1.5px solid var(--g2);color:var(--g);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;margin-top:2px}
.dwn4 li a{justify-self:start;color:var(--ink)!important;font-size:18px;font-weight:800;text-decoration:none;border-bottom:2px solid var(--g3);transition:border-color .2s}
.dwn4 li a:hover{border-bottom-color:var(--g)}
.dwn4 li a.in{font-size:inherit;font-weight:800}
.dwn4 li span{display:block}
.dwn4 .fee{margin-top:30px;background:#faf7f0;border:1px solid var(--line);border-radius:22px;padding:30px 34px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px 34px;align-items:center}
.dwn4 .fee h2{font-size:28px;text-align:right}
.dwn4 .fee p{margin:0;font-size:17px;line-height:1.85;grid-column:1}
.dwn4 .fee .b{grid-column:2;grid-row:1/span 2;display:flex;flex-direction:column;gap:10px}
.dwn4 .fee .b a{display:inline-flex;justify-content:center;align-items:center;border-radius:99px;padding:12px 22px;font-weight:800;font-size:15.5px;text-decoration:none;white-space:nowrap}
.dwn4 .fee .b .p{background:linear-gradient(135deg,var(--g3),var(--g));color:#1c1b19!important}
.dwn4 .fee .b .s{border:1.5px solid var(--g);color:#7c5f1c!important;background:#fff}
@media (max-width:900px){.dwn4-wrap{padding:46px 16px 40px}.dwn4 h2{font-size:27px}.dwn4 .hd p{font-size:16.5px}
.dwn4 ol{grid-template-columns:minmax(0,1fr)}.dwn4 li:nth-child(2){border-top:1px solid var(--line)}
.dwn4 li{grid-template-columns:34px minmax(0,1fr);font-size:15.5px;padding:14px 0}.dwn4 li::before{width:34px;height:34px;font-size:13px}.dwn4 li a{font-size:16.5px}
.dwn4 .fee{grid-template-columns:minmax(0,1fr);padding:22px 20px}.dwn4 .fee h2{font-size:22px}.dwn4 .fee p{font-size:15.5px}.dwn4 .fee .b{grid-column:1;grid-row:auto;flex-direction:row;flex-wrap:wrap}.dwn4 .fee .b a{flex:1}}
</style>
<div class="dwn4-wrap"><section class="dwn4" id="dbl-when" aria-labelledby="dwn4-h">
<div class="hd"><p class="k">עורך דין מקרקעין בנתניה</p><h2 id="dwn4-h">מתי תצטרכו עורך דין מקרקעין?</h2>
<p>קנייה או מכירה של דירה היא בדרך כלל ההחלטה הכלכלית הגדולה בחיים, ויש בה הרבה שלבים משפטיים: בדיקת הנכס, משא ומתן, חוזה, מיסים ורישום בטאבו. אלה המצבים העיקריים שבהם כדאי שיהיה לצידכם עורך דין מקרקעין:</p></div>
<ol><li><a href="https://dabullaw.co.il/%D7%9E%D7%93%D7%A8%D7%99%D7%9A-%D7%9E%D7%A7%D7%99%D7%A3-%D7%9C%D7%A8%D7%9B%D7%99%D7%A9%D7%AA-%D7%93%D7%99%D7%A8%D7%94-%D7%99%D7%93-%D7%A9%D7%A0%D7%99%D7%94/">קניית דירה יד שנייה</a><span>בדיקת הנכס בטאבו ובעירייה, עיקולים והערות אזהרה, חוזה מסודר ושמירה על הכסף עד שהדירה רשומה על שמכם.</span></li><li><a href="https://dabullaw.co.il/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%9e%d7%a7%d7%91%d7%9c%d7%9f-2026/">רכישת דירה מקבלן</a><span>בדיקת החוזה והמפרט, ערבויות לפי חוק המכר וליווי עד קבלת המפתח.</span></li><li><a href="https://dabullaw.co.il/comprehensive-guide-selling-apartment-israel-legal-tax-stages/">מכירת דירה</a><span>חוזה המכר, סילוק המשכנתא, דיווח לרשות המסים והעברת הזכויות לקונה.</span></li><li><a href="https://dabullaw.co.il/%d7%9e%d7%99%d7%a1%d7%95%d7%99-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%9e%d7%9c%d7%90/">מיסוי מקרקעין</a><span>מס שבח ומס רכישה, ובדיקה אילו פטורים והקלות מגיעים לכם.</span></li><li><a href="https://dabullaw.co.il/%d7%94%d7%aa%d7%97%d7%93%d7%a9%d7%95%d7%aa-%d7%a2%d7%99%d7%a8%d7%95%d7%a0%d7%99%d7%aa/">פינוי בינוי ותמ״א 38</a><span>ייצוג הדיירים מול היזם, בדיקת ההסכם והבטוחות וליווי לאורך כל הפרויקט.</span></li><li><a href="https://dabullaw.co.il/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%91%d7%9b%d7%99%d7%a0%d7%95%d7%a1-%d7%a0%d7%9b%d7%a1%d7%99%d7%9d-%d7%a4%d7%99%d7%a8%d7%95%d7%a7-%d7%a9%d7%99%d7%aa%d7%95%d7%a3/">פירוק שיתוף במקרקעין</a><span>כשהשותפים בנכס לא מסכימים איך להמשיך, בהסכמה או בהליך בבית המשפט.</span></li><li><a href="https://dabullaw.co.il/%d7%9e%d7%9b%d7%99%d7%a8%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%a9%d7%94%d7%aa%d7%a7%d7%91%d7%9c%d7%94-%d7%91%d7%99%d7%a8%d7%95%d7%a9%d7%94/">מכירת דירה שהתקבלה בירושה</a><span>צו ירושה, הסכמה בין היורשים, מיסוי ומכירה מסודרת.</span></li><li><a href="https://dabullaw.co.il/land-registry-title-registration/">רישום בטאבו ובית משותף</a><span>רישום הזכויות על שמכם, תיקון טעויות ברישום ורישום בית משותף.</span></li></ol>
<div class="fee"><h2>כמה עולה עורך דין מקרקעין?</h2>
<p>שכר הטרחה של עורך דין מקרקעין לא קבוע. הוא תלוי בסוג העסקה, בהיקף שלה ובמורכבות. קניית דירה יד שנייה, רכישה מקבלן או ייצוג דיירים בפרויקט התחדשות דורשים היקפי עבודה שונים. כדאי לסכם את שכר הטרחה מראש ובכתב, ולבדוק מה בדיוק כלול בו: בדיקות מקדימות, משא ומתן, ניסוח החוזה, דיווח לרשות המסים ורישום הזכויות.</p>
<div class="b"><a class="p" href="https://dabullaw.co.il/calculators/">מחשבוני מס רכישה ומס שבח</a><a class="s" href="https://dabullaw.co.il/checklist/">צ׳קליסט לפני שקונים דירה</a></div></div>
</section></div>
DBLWHENHTML;
	return substr($content, 0, $s) . $h . substr($content, $s);
}, 22);
