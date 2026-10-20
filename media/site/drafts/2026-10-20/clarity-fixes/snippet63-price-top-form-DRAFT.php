/* DRAFT v2 change to snippet 63 (lead-boxes), NOT ACTIVE.
   Yakir's note on v1 (form right after the opening paragraph): too high, it asks for details before giving anything.
   v2: on the price list page only, the targeted form ("איזה שירות אתם צריכים?") moves from the middle of the article
   (after "האם כדאי לבחור עורך דין מקרקעין לפי המחיר", about 8,000px down on a phone) to the end of the first full
   section "חלק א': ליטיגציה, תביעות ובתי משפט", right before the heading "חלק ב': שכר טרחת עורך דין מקרקעין"
   (about 5,100px down on a phone, 4,100px on a computer, roughly 30% into the article). The reader has already
   received a full section of real prices. Between the dark box (after the first heading) and this form there is the
   whole "חלק א'" section. Same form, same look, same fields, phone only, no WhatsApp. It moves, it is not added twice.
   Implementation: in the the_content filter, before the middle-placement block, add: */
		$slug = urldecode((string) get_post_field('post_name', $id));
		if ($qv && strpos($slug, 'המחירון-המשפטי-המלא-לשנת-2026') === 0
			&& preg_match('~<h2[^>]*>\s*חלק ב[\'׳]~u', $html, $hm, PREG_OFFSET_CAPTURE)) {
			$ins[$hm[0][1]] = dabul_lb_box_q($qv, $link);
			$qv = null; $mid = false; // no second targeted / short box further down on this page
		}
/* If the heading "חלק ב'" is ever renamed, the condition fails and the page simply keeps today's placement (middle). */
