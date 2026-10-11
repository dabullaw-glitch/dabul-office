/* dabul: call / WhatsApp box inside the 6 strongest real estate articles (Yakir approved the mockup, 11.10.2026).
   One box per article, placed right before the article's second heading (after the first section), with a text that
   fits the article's subject, Yakir's photo, a call button and a WhatsApp button (the message names the article).
   Clicks are counted by the lead tracking snippet (phone_click / whatsapp_click), nothing else is sent anywhere.
   To add an article: add its slug and texts to dabul_acta_list(). To undo: deactivate this snippet. */

function dabul_acta_list() {
	return array(
		'איך-משלמים-מס-רכישה' => array('מס רכישה', 'קניתם דירה? את הדיווח והחישוב אפשר להשאיר לנו', 'עו"ד יקיר דבול מגיש את הדיווח לרשות המסים, בודק אם מגיעה לכם הקלה במס ומוודא שהשובר משולם בזמן.'),
		'חברה-משכנת-העברת-זכויות-ורישום-ראשון' => array('חברה משכנת', 'דירה שרשומה בחברה משכנת? נבדוק מה צריך לרישום', 'עו"ד יקיר דבול מלווה העברת זכויות בחברה משכנת ורישום ראשון בטאבו: אישורים, מסמכים ותיאום מול החברה.'),
		'הקניית-בעלות-במנהל-רמי' => array('הקניית בעלות ברמ"י', 'צריכים להקנות בעלות ברמ"י? נעשה את זה איתכם', 'עו"ד יקיר דבול בודק אם הנכס זכאי להקניה, מכין את הבקשה ומלווה אותה מול רשות מקרקעי ישראל.'),
		'איך-מוצאים-את-הגוש-והחלקה-של-הנכס-המדרי' => array('גוש וחלקה', 'מצאתם את הגוש והחלקה? השלב הבא הוא נסח טאבו', 'עו"ד יקיר דבול בודק את הנסח, את הרישום ואת ההערות, ומסביר בשפה פשוטה מה הן אומרות על הנכס.'),
		'זכויות-בנייה-והצמדת-גגות-בבניינים-משו' => array('גגות וזכויות בנייה', 'שאלה על גג, הצמדה או זכויות בנייה בבניין?', 'עו"ד יקיר דבול בודק את צו הבית המשותף, את התקנון ואת ההצמדות, ומסביר מה מותר ומה צריך הסכמה של השכנים.'),
		'completion-certificate-vs-form-4-legal-guide' => array('תעודת גמר וטופס 4', 'אין לבניין תעודת גמר או טופס 4? כדאי לבדוק לפני שחותמים', 'עו"ד יקיר דבול בודק את תיק הבניין בעירייה ומסביר מה המשמעות לעסקה, למשכנתא ולרישום.'),
	);
}
function dabul_acta_for_post() {
	if (!is_singular('post')) return null;
	$slug = urldecode((string) get_post_field('post_name', get_queried_object_id()));
	$list = dabul_acta_list();
	foreach ($list as $k => $v) { if ($slug === $k || strpos($slug, $k) === 0) return $v; }
	return null;
}
add_action('wp_head', function () {
	if (!dabul_acta_for_post()) return;
	echo '<style id="dbl-acta-css">
.dacta{direction:rtl;margin:28px 0;border:1px solid #e8e2d4;border-right:5px solid #c9a85c;background:#fbf8f1;border-radius:12px;padding:20px 22px;display:grid;grid-template-columns:64px minmax(0,1fr);gap:16px;align-items:center;clear:both}
.dacta *{box-sizing:border-box}
.dacta img{width:64px!important;height:64px!important;border-radius:50%!important;object-fit:cover;object-position:50% 30%;border:2px solid #c9a85c;margin:0;display:block;max-width:none}
.dacta .tt{display:block;font-size:20px;font-weight:800;line-height:1.3;color:#16161a;margin:0}
.dacta p{margin:4px 0 12px;font-size:15.5px;line-height:1.55;color:#45433d}
.dacta .bb{display:flex;flex-wrap:wrap;gap:10px}
.dacta a.cb{display:inline-flex;align-items:center;gap:8px;text-decoration:none!important;font-weight:700;font-size:16px;border-radius:999px;padding:10px 20px;line-height:1.2}
.dacta a.cl{background:#16161a;color:#fff!important}
.dacta a.wa{background:#25d366;color:#08301a!important}
.dacta svg{width:18px;height:18px;flex:none}
@media (max-width:640px){.dacta{grid-template-columns:52px minmax(0,1fr);padding:18px 16px;gap:12px}.dacta img{width:52px!important;height:52px!important}.dacta .tt{font-size:18px}.dacta p,.dacta .bb{grid-column:1 / -1}.dacta a.cb{flex:1 1 100%;justify-content:center;padding:13px}}
</style>';
}, 30);
add_filter('the_content', function ($html) {
	if (!in_the_loop() || !is_main_query()) return $html;
	$v = dabul_acta_for_post();
	if (!$v || strpos($html, 'class="dacta"') !== false) return $html;
	$wa = 'https://wa.me/972505580189?text=' . rawurlencode('שלום, קראתי באתר את המאמר על ' . $v[0] . ' ואשמח לשאול...');
	$tel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
	$wai = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>';
	$box = '<div class="dacta" role="complementary" aria-label="יצירת קשר עם עורך הדין"><img src="https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-portrait-1.webp" alt="עו&quot;ד יקיר דבול" width="64" height="64" loading="lazy"><div><span class="tt">' . esc_html($v[1]) . '</span><p>' . esc_html($v[2]) . '</p><div class="bb"><a class="cb cl" href="tel:+97298613413">' . $tel . 'להתקשר 09-8613413</a><a class="cb wa" href="' . esc_url($wa) . '" target="_blank" rel="noopener">' . $wai . 'לשאול בוואטסאפ</a></div></div></div>';
	// before the second heading (after the first section); when there is no second heading, at the end
	if (preg_match_all('~<h2[\s>]~i', $html, $m, PREG_OFFSET_CAPTURE) && count($m[0]) >= 2) {
		$pos = $m[0][1][1];
		return substr($html, 0, $pos) . $box . substr($html, $pos);
	}
	return $html . $box;
}, 20);
