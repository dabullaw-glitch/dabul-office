
// 15.10.2026: the testimonials page (62) gets its own reviews wall (approved by Yakir 15.10.2026): a featured review and a grid of full Google reviews,
// rendered as plain HTML (readable by Google and AI tools without scripts), with LegalService + Review JSON-LD. No filters, no "worked with us" box.
// Background stays the page's own color. "עוד ביקורות" works without JavaScript (checkbox), so WP Rocket's delayed scripts cannot break it.
if (!function_exists('dabul_reviews_wall_html')) {
  function dabul_reviews_wall_html() {
    $json = <<<'DABULWALL'
{"rating": 4.9, "count": 73, "feat": {"c": "#2f6b55", "i": "I", "n": "Ido Ben haim", "t": "בתור זוג צעיר שקונה נכס בפעם הראשונה, תהליך של רכישת דירה נראה לנו כמו הר שאי אפשר לטפס עליו. יקיר פישט לנו את הכל, תרגם את המושגים המשפטיים המסובכים לשפה יומיומית וליווה אותנו צעד אחר צעד עד לחתימה. חוויה משפטית מרגיעה, בטוחה ומושלמת.", "d": "2026-06-17"}, "cards": [{"c": "#1f3b6e", "i": "G", "n": "Glemm Dabomb", "t": "מה שאהבתי במיוחד בעבודה מול עו״ד יקיר דבול זה השקיפות והזמינות. בניגוד למשרדים אחרים שבהם אתה רודף אחרי עורך הדין, יקיר מעדכן אותך בכל התפתחות בוואטסאפ או בטלפון, ונותן הרגשה שיש בעל בית שמטפל בנכס שלך. יסודי, מהיר ומקצועי מאוד.", "d": "2026-06-19"}, {"c": "#7a5c1e", "i": "א", "n": "אורי מואטי", "t": "אם אתם מחפשים עורך דין מקרקעין בנתניה שלא מתפשר על שום פסיק בחוזה, יקיר הוא הכתובת. הוא עבר על הסכם המכר שלנו בפינצטה, תיקן סעיפים לרעתנו והסביר לנו הכל בסבלנות בלתי רגילה. עורך דין שבאמת אכפת לו מהלקוחות שלו וזמין לכל שאלה.", "d": "2026-06-17"}, {"c": "#2f6b55", "i": "I", "n": "ivri saunders", "t": "פנינו אל יקיר דבול - משרד עורכי דין כדי שייצגו אותנו במכירת הנכס שלנו. קיבלנו יחס אישי מהשנייה הראשונה, ללא סינונים וללא מתמחים באמצע. יקיר תקתק את ענייני מיסוי המקרקעין, ניהל את התהליך בשקיפות ונתן לנו ביטחון מוחלט שהעסקה בידיים טובות.", "d": "2026-06-16"}, {"c": "#3d5a80", "i": "א", "n": "אורי דהן", "t": "חיפשנו עורך דין מקרקעין בנתניה שידריך אותנו בקניית דירה בשכונה חדשה. הגענו לעו״ד יקיר דבול וזו הייתה חוויה פשוט מצוינת. הוא ירד לפרטים הכי קטנים, בדק את הכל מול העירייה והטאבו, וחסך לנו המון כאב ראש. שירות אישי, זמינות מלאה ושקט נפשי מהרגע הראשון.", "d": "2026-06-16"}, {"c": "#8a4b2a", "i": "נ", "n": "נועם שחר", "t": "בתור משקיע שקונה נכסים באזור, אני עובד רק עם עורך דין מקרקעין בנתניה שמבין את השוק המקומי לעומק. יקיר מספק לי מעטפת משפטית הרמטית, עולה על מוקשים בחוזים עוד לפני שהם מתפוצצים, ומגן על האינטרסים שלי בנחישות.", "d": "2026-06-15"}, {"c": "#6b2f4f", "i": "V", "n": "Viki", "t": "כמעט וחתמנו על חוזה עם קבלן שהיה מלא בסעיפים דרקוניים, אבל עו״ד יקיר דבול עצר אותנו בזמן. הוא נכנס לעובי הקורה, שינה סעיפים מהותיים מול עורכי הדין של החברה היזמית, ורק כשהכל היה מושלם לטובתנו, חתמנו. הוא הציל אותנו מהמון עוגמת נפש עתידית.", "d": "2026-06-12"}, {"c": "#5b3d7a", "i": "O", "n": "orly amitay", "t": "ברצוני להביע הערכתי והוקרתי לעורך הדין יקיר דבול. מתוך נסיון רב של התנהלות מול עורכי דין בנסיבות שונות, עו״ד דבול הוכיח בהתנהלותו שירות ומקצועיות ברמה אחרת. עבודתו מצטיינת באדיבות, יושרה ונכונות לסייע.", "d": "2026-03-18"}, {"c": "#4a4e69", "i": "I", "n": "ilay elimelech", "t": "למי שרוכש דירה, אל תוותרו על ייצוג משלכם! שכרנו את שירותיו של יקיר כעורך דין מקרקעין והוא עבר על החוזה בפינצטה, שינה סעיפים בעייתיים ודאג לאינטרסים שלנו מהרגע הראשון ועד קבלת המפתח.", "d": "2026-02-25"}, {"c": "#2b6777", "i": "ר", "n": "רומיאו נמירובסקי", "t": "בן אדם באמת יוצא מן הכלל, הוציא אותי מהבור הגדול ביותר שהייתי בו בחיי, ממליץ בחום לכל מי ששוקל לבקש שירות מהאיש הקסום והצלול הזה.", "d": "2026-02-25"}]}
DABULWALL;
    $d = json_decode($json, true);
    if (!$d) return '';
    wp_enqueue_style('dabul-frank', 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700&display=swap', array(), null);
    $months = array('', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר');
    $mdate = function ($ymd) use ($months) { $p = explode('-', $ymd); return $months[intval($p[1])] . ' ' . $p[0]; };
    $star = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7z"/></svg>';
    $stars = '<span class="dbw-st" role="img" aria-label="5 כוכבים מתוך 5">' . str_repeat($star, 5) . '</span>';
    $g = '<svg class="dbw-g" viewBox="0 0 48 48" role="img" aria-label="Google"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
    $css = '.dbw{--dbw-ink:#141a2b;--dbw-gold:#c9a14f;--dbw-gold2:#e7cd96;--dbw-line:#e8e2d4;--dbw-muted:#6b6f7a;--dbw-navy:#101a33;direction:rtl;text-align:right;color:var(--dbw-ink);width:100%;max-width:1240px;margin:0 auto;padding:0 0 4px}'
      . '.dbw *{box-sizing:border-box}'
      . '.dbw-sep{display:flex;align-items:center;margin:8px 0 34px}.dbw-sep:before,.dbw-sep:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--dbw-gold) 30%,var(--dbw-gold) 70%,transparent)}'
      . '.dbw-badge{display:flex;align-items:center;gap:18px;background:#fff;border:1px solid var(--dbw-line);border-radius:20px;padding:14px 22px 14px 18px;box-shadow:0 14px 34px rgba(16,26,51,.08);text-decoration:none!important;color:var(--dbw-ink)!important;transition:box-shadow .2s,transform .2s}'
      . '.dbw-badge:hover{box-shadow:0 18px 40px rgba(16,26,51,.14);transform:translateY(-1px)}'
      . '.dbw-badge .dbw-gl{width:46px;height:46px;flex:0 0 46px}.dbw-badge b{display:block;font-size:20px;font-weight:800;line-height:1.3}.dbw-badge .dbw-row{display:flex;align-items:center;gap:8px;margin-top:2px}'
      . '.dbw-badge .dbw-num{font-weight:700;font-size:22px;line-height:1}.dbw-badge small{color:var(--dbw-muted);font-size:14px;white-space:nowrap}'
      . '.dbw-badge .dbw-go{width:42px;height:42px;flex:0 0 42px;border-radius:50%;background:#efe3c3;display:flex;align-items:center;justify-content:center;color:#5a4410;font-size:20px;margin-right:6px}'
      . '.dbw-st{display:inline-flex;gap:3px;vertical-align:middle}.dbw-st svg{width:17px;height:17px;fill:#f5b81b}.dbw-badge .dbw-st svg{width:20px;height:20px}'
      . '.dbw-fc{background:#fff;border-radius:24px;box-shadow:0 24px 60px rgba(16,26,51,.10);border:1px solid var(--dbw-line);padding:46px 54px 38px;position:relative;margin:0 0 28px}'
      . '.dbw-fc:before{content:"\201D";font-family:"Frank Ruhl Libre",serif;font-size:150px;color:var(--dbw-gold2);position:absolute;top:-4px;right:34px;line-height:1;opacity:.6}'
      . '.dbw-fc blockquote{margin:28px 0 22px;padding:0;border:0;font-family:"Frank Ruhl Libre",serif;font-weight:700;font-size:26px;line-height:1.55;color:#1b2440;font-style:normal;background:none}'
      . '.dbw-fc blockquote p{margin:0;font:inherit;color:inherit}'
      . '.dbw-who{display:flex;align-items:center;gap:14px}.dbw-who b{display:block;font-size:17px}.dbw-who small{color:var(--dbw-muted);font-size:14px}'
      . '.dbw-av{flex:0 0 46px;width:46px;height:46px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px;line-height:1}'
      . '.dbw-g{width:22px;height:22px;flex:0 0 22px}'
      . '.dbw-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:stretch}'
      . '.dbw-rc{background:#fff;border:1px solid var(--dbw-line);border-radius:20px;padding:22px 24px 16px;margin:0;box-shadow:0 8px 24px rgba(16,26,51,.05);display:flex;flex-direction:column}'
      . '.dbw-rc header{display:flex;align-items:center;gap:12px;margin:0;padding:0;background:none}.dbw-rc header div{flex:1;min-width:0}.dbw-rc header b{display:block;font-size:16px}.dbw-rc header small{color:var(--dbw-muted);font-size:13px}'
      . '.dbw-rc .dbw-st{margin:14px 0 10px;display:flex}.dbw-rc p{margin:0 0 16px;line-height:1.75;font-size:15.5px;color:#2b3042}'
      . '.dbw-rc footer{margin-top:auto;padding-top:14px;border-top:1px solid #f0ebe0;color:#9a9fab;font-size:13px}'
      . '.dbw-tg{position:absolute;opacity:0;pointer-events:none}'
      . '.dbw-more{text-align:center;margin:26px 0 0}.dbw-more label{display:inline-flex;align-items:center;justify-content:center;height:50px;padding:0 30px;border-radius:999px;font-weight:800;font-size:16px;background:#fff;color:var(--dbw-navy);border:1px solid #d9cba6;cursor:pointer}'
      . '.dbw-more label:hover{border-color:var(--dbw-navy)}'
      . '.dbw-x6{display:none}.dbw-tg:checked~.dbw-grid .dbw-rc{display:flex}.dbw-tg:checked~.dbw-more{display:none}'
      . '.dbw-tg:focus-visible~.dbw-more label{outline:2px solid var(--dbw-navy);outline-offset:3px}'
      . '.dbw-lrh{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:56px 0 16px}'
      . '.dbw-lrh h2{margin:0;font-size:22px;font-weight:800;color:var(--dbw-ink)}.dbw-lrh p{margin:4px 0 0;color:var(--dbw-muted);font-size:15px}.dbw-lrh a{color:#9a7a2c!important;font-weight:700;text-decoration:none;font-size:15px}'
      . '.elementor-62 .elementor-element-01ae797,.elementor-62 .elementor-element-759ad48{display:none!important}'
      . '.elementor-62 .elementor-element-d229856{background:#fff;border:1px solid #e8e2d4;border-radius:20px;box-shadow:0 8px 24px rgba(16,26,51,.05);padding:18px 18px 8px!important;overflow:hidden}'
      . '.elementor-62 .elementor-element-d229856>.elementor-widget-container>div[dir],.elementor-62 .elementor-element-d229856>div[dir],.elementor-62 .elementor-element-d229856 br{display:none}'
      . '.elementor-62 .elementor-element-d229856 iframe{display:block;width:100%!important;max-width:940px;height:250px!important;margin:0 auto;border:0}'
      . '@media (max-width:1024px){.dbw-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.elementor-62 .elementor-element-d229856 iframe{height:270px!important}}'
      . '@media (max-width:767px){.dbw-sep{margin:4px 0 24px}.dbw-badge{padding:12px 16px;gap:12px}.dbw-badge b{font-size:17px}.dbw-badge .dbw-st svg{width:16px;height:16px}.dbw-badge .dbw-num{font-size:19px}.dbw-badge .dbw-gl{width:38px;height:38px;flex-basis:38px}.dbw-badge .dbw-go{width:36px;height:36px;flex-basis:36px}'
      . '.dbw-fc{padding:34px 22px 26px;border-radius:20px}.dbw-fc:before{font-size:110px;right:16px}.dbw-fc blockquote{font-size:20px}.dbw-grid{grid-template-columns:1fr;gap:16px}.dbw-x4{display:none}'
      . '.elementor-62 .elementor-element-d229856{padding:14px 10px 6px!important}.elementor-62 .elementor-element-d229856 iframe{height:310px!important}}';
    $out = '<style id="dabul-wall-css">' . $css . '</style><section class="dbw" aria-label="ביקורות לקוחות מגוגל">';
    $gurl = 'https://search.google.com/local/reviews?placeid=ChIJFyPNpLBBHRURR161JAMeBb0';
    $out .= '<div class="dbw-sep"><a class="dbw-badge" href="' . esc_url($gurl) . '" target="_blank" rel="noopener" aria-label="כל הביקורות בגוגל">' . str_replace('class="dbw-g"', 'class="dbw-gl"', $g)
      . '<div><b>ביקורות גוגל</b><div class="dbw-row">' . $stars . '<span class="dbw-num">' . esc_html(number_format($d['rating'], 1)) . '</span><small>· ' . intval($d['count']) . ' ביקורות</small></div></div><span class="dbw-go" aria-hidden="true">&larr;</span></a></div>';
    $f = $d['feat'];
    $out .= '<figure class="dbw-fc" style="margin:0 0 26px"><blockquote cite="' . esc_url('https://search.google.com/local/reviews?placeid=ChIJFyPNpLBBHRURR161JAMeBb0') . '"><p>' . esc_html($f['t']) . '</p></blockquote>'
      . '<figcaption class="dbw-who"><span class="dbw-av" style="background:' . esc_attr($f['c']) . '" aria-hidden="true">' . esc_html($f['i']) . '</span><div><b>' . esc_html($f['n']) . '</b><small>ביקורת בגוגל · ' . esc_html($mdate($f['d'])) . '</small></div></figcaption></figure>';
    $out .= '<input type="checkbox" id="dbw-tg" class="dbw-tg" aria-label="הצגת עוד ביקורות"><div class="dbw-grid">';
    foreach ($d['cards'] as $i => $c) {
      $cls = 'dbw-rc' . ($i >= 4 ? ' dbw-x4' : '') . ($i >= 6 ? ' dbw-x6' : '');
      $out .= '<article class="' . $cls . '"><header><span class="dbw-av" style="background:' . esc_attr($c['c']) . '" aria-hidden="true">' . esc_html($c['i']) . '</span><div><b>' . esc_html($c['n']) . '</b><small>' . esc_html($mdate($c['d'])) . '</small></div>' . $g . '</header>' . $stars . '<p>' . esc_html($c['t']) . '</p><footer>ביקורת בגוגל</footer></article>';
    }
    $out .= '</div><div class="dbw-more"><label for="dbw-tg">עוד ביקורות</label></div>'
      . '<div class="dbw-lrh"><div><h2>חוות דעת ב-LawReviews</h2><p>5.0 מתוך 5, על סמך 52 חוות דעת</p></div><a href="https://www.lawreviews.co.il/provider/dabul-yakir" target="_blank" rel="noopener">לכל חוות הדעת באתר LawReviews &larr;</a></div></section>';
    // structured data: the same reviews that are visible above
    $all = array_merge(array($f), $d['cards']);
    $reviews = array();
    foreach ($all as $c) {
      $reviews[] = array('@type' => 'Review', 'author' => array('@type' => 'Person', 'name' => $c['n']), 'datePublished' => $c['d'], 'reviewBody' => $c['t'],
        'reviewRating' => array('@type' => 'Rating', 'ratingValue' => 5, 'bestRating' => 5, 'worstRating' => 1), 'publisher' => array('@type' => 'Organization', 'name' => 'Google'));
    }
    $ld = array('@context' => 'https://schema.org', '@type' => 'LegalService', '@id' => 'https://dabullaw.co.il/#legalservice', 'name' => 'יקיר דבול - משרד עורכי דין',
      'url' => 'https://dabullaw.co.il/', 'telephone' => '09-8613413', 'image' => 'https://dabullaw.co.il/wp-content/uploads/2025/11/unnamed-3-1.jpg.webp',
      'address' => array('@type' => 'PostalAddress', 'streetAddress' => 'רזיאל 1 (קומת כניסה)', 'addressLocality' => 'נתניה', 'postalCode' => '4247001', 'addressCountry' => 'IL'),
      'hasMap' => 'https://www.google.com/maps?cid=13620325646901534279',
      'aggregateRating' => array('@type' => 'AggregateRating', 'ratingValue' => $d['rating'], 'bestRating' => 5, 'worstRating' => 1, 'reviewCount' => intval($d['count'])),
      'review' => $reviews);
    $out .= '<script type="application/ld+json">' . wp_json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
    return $out;
  }
}
// 15.10.2026 (approved by Yakir): the LawReviews widget on the testimonials page gets a fixed height and no scrollbars
add_filter('elementor/widget/render_content', function ($content, $widget) {
  if (!is_page(62) || !method_exists($widget, 'get_id') || $widget->get_id() !== 'd229856') return $content;
  return str_replace('<iframe ', '<iframe scrolling="no" title="חוות דעת על עורך דין יקיר דבול ב-LawReviews" loading="lazy" ', $content);
}, 10, 2);
