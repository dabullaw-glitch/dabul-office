/* dabul: schema guard (permanent, front end only). Added 9.10.2026 after Google Search Console reported
   "unparsable structured data". Inside <script type="application/ld+json"> blocks in a post's content, a plain double quote
   inside Hebrew text (עו"ד, נדל"ן, a "quoted phrase") ends the JSON string early and Google can't read the block.
   When a page is shown, each such block is checked: if it doesn't parse, the quote between two Hebrew letters becomes
   the Hebrew gershayim (״), and any other quote inside a string is escaped. The block is replaced only when the result
   parses; otherwise it is left exactly as it was. Nothing in the database changes. */
if (!function_exists('dabul_sg_repair')) {
	function dabul_sg_repair($s) {
		$out = ''; $in = false; $len = strlen($s);
		for ($i = 0; $i < $len; $i++) {
			$ch = $s[$i];
			if ($in && $ch === '\\') { $out .= $ch . ($i + 1 < $len ? $s[$i + 1] : ''); $i++; continue; }
			if ($ch === '"') {
				if (!$in) { $in = true; $out .= $ch; continue; }
				$j = $i + 1; while ($j < $len && strpos(" \t\r\n", $s[$j]) !== false) $j++;
				if ($j >= $len || strpos(',:}]', $s[$j]) !== false) { $in = false; $out .= $ch; }
				else $out .= '\\"';
				continue;
			}
			$out .= $ch;
		}
		return $out;
	}
}
add_filter('the_content', function ($c) {
	if (is_admin() || !is_string($c) || stripos($c, 'ld+json') === false) return $c;
	$r = preg_replace_callback('#(<script[^>]*ld\+json[^>]*>)(.*?)(</script>)#is', function ($m) {
		$js = $m[2];
		if (json_decode(trim($js)) !== null) return $m[0];
		$a = preg_replace('/(?<=\p{Hebrew})"(?=\p{Hebrew})/u', '״', $js);
		if (is_string($a) && json_decode(trim($a)) !== null) return $m[1] . $a . $m[3];
		$b = dabul_sg_repair(is_string($a) ? $a : $js);
		if (json_decode(trim($b)) !== null) return $m[1] . $b . $m[3];
		return $m[0];
	}, $c);
	return is_string($r) ? $r : $c;
}, 99);
