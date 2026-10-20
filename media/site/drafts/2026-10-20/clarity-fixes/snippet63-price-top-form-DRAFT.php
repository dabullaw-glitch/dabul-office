/* DRAFT change to snippet 63 (lead-boxes), NOT ACTIVE: on the price list page only, the targeted form
   ("איזה שירות אתם צריכים?") moves from the middle of the article (about 8,000px down on a phone) to right after the
   opening paragraph (about 580px down). Same form, same look, same fields, no WhatsApp. It is not added twice:
   it leaves the middle. The dark box after the first heading stays as it is.
   Implementation: in the the_content filter, before the middle-placement block, add: */
		$slug = urldecode((string) get_post_field('post_name', $id));
		if ($qv && strpos($slug, 'המחירון-המשפטי-המלא-לשנת-2026') === 0) {
			$p = stripos($html, '</p>');
			if ($p !== false) { $ins[$p + 4] = dabul_lb_box_q($qv, $link); $qv = null; $mid = false; }
		}
/* ($qv = null and $mid = false stop the middle box for this page only, so the reader sees one targeted form.) */
