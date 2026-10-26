/* dabul: top bar above the site header, computer only.
   20.10.2026: first version (dark bar). 26.10.2026: Yakir approved the new combined black bar.
   Right: address and phone. Center: Google rating chip (count and rating come from the daily Google sync, option dabul_gbp_reviews).
   Left: gold circle icons (Facebook, Instagram, TikTok, YouTube) and the WhatsApp group button.
   Hidden on tablets and phones (up to 1024px), and not shown on the English/French pages or the campaign landing pages.
   Backup of the previous version: Supabase docs sitebak/snippet-67-code-20261026. To undo: deactivate this snippet. */
add_action('wp_body_open', function () {
	if (is_admin()) return;
	if (is_page(array(6999, 7006, 7513, 7514, 7518))) return;
	$n = 98; $r = '5.0';
	if (function_exists('dabul_gbp_vals')) { list($gn, $gr) = dabul_gbp_vals(); if ($gn >= 60) $n = $gn; if ($gr !== '') $r = $gr; }
	$css = <<<'DBLTBCSS'
.dtb{position:relative;z-index:5;background:#0E0E0D;font-family:"Noto Local","Heebo",Arial,sans-serif;font-size:14px;line-height:1;overflow:hidden}
.dtb:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(197,162,90,.035) 0 1px,transparent 1px 9px);pointer-events:none}
.dtb:after{content:"";position:absolute;left:50%;top:50%;width:560px;height:150px;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgba(197,162,90,.15),rgba(197,162,90,0));pointer-events:none}
.dtb .ln{position:absolute;left:0;right:0;bottom:0;height:2px;z-index:2;background:linear-gradient(90deg,rgba(197,162,90,0) 0%,rgba(197,162,90,.55) 22%,#E7CD96 50%,rgba(197,162,90,.55) 78%,rgba(197,162,90,0) 100%);overflow:hidden}
.dtb .ln i{position:absolute;top:0;bottom:0;left:-160px;width:140px;background:linear-gradient(90deg,transparent,#FFF6DE,transparent);animation:dtbRun 6s ease-in-out infinite}
@keyframes dtbRun{0%{left:-160px}55%,100%{left:calc(100% + 20px)}}
.dtb .in{position:relative;z-index:1;max-width:1320px;margin:0 auto;padding:0 24px;height:48px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:20px}
.dtb .rt,.dtb .lt{display:flex;align-items:center;min-width:0}
.dtb .lt{justify-content:flex-end;gap:7px}
.dtb a,.dtb a:hover,.dtb a:focus{text-decoration:none!important;box-shadow:none}
.dtb a.it{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;color:#EDE8DC!important;transition:color .2s}
.dtb a.it:hover{color:#E7CD96!important}
.dtb a.it svg{width:15px;height:15px;color:#C5A25A;flex:none}
.dtb a.ph{font-weight:700;font-size:15.5px;color:#FFFFFF!important;letter-spacing:.3px;font-variant-numeric:tabular-nums}
.dtb .sep{display:block;width:1px;height:22px;margin:0 16px;background:linear-gradient(180deg,transparent,#5A4D33,transparent)}
.dtb a.chip{display:inline-flex;align-items:center;gap:11px;height:34px;padding:0 17px 0 19px;border-radius:999px;background:linear-gradient(180deg,#1E1D1A,#151513);border:1px solid #3A3528;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 0 0 4px rgba(197,162,90,.06);white-space:nowrap;transition:border-color .25s,box-shadow .25s}
.dtb a.chip:hover{border-color:#C5A25A;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 0 5px rgba(197,162,90,.12)}
.dtb .gg{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;border-radius:50%;background:#FFFFFF;flex:none}
.dtb .gg svg{width:13px;height:13px}
.dtb .sc{font-weight:700;font-size:16px;color:#E7CD96}
.dtb .st{font-size:16px;letter-spacing:2px;background:linear-gradient(100deg,#E9B63C 0%,#F2C14E 40%,#FFF3C4 50%,#F2C14E 60%,#E9B63C 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:dtbShine 4.5s ease-in-out infinite}
@keyframes dtbShine{0%,40%{background-position:100% 0}80%,100%{background-position:0 0}}
.dtb .cn{font-size:13.5px;color:#D9D4C7}
.dtb a.ci{display:inline-flex;align-items:center;justify-content:center;width:31px;height:31px;border-radius:50%;border:1.5px solid #B8975A;box-sizing:border-box;color:#E7CD96!important;transition:background .2s,color .2s,transform .2s}
.dtb a.ci:hover{background:#C5A25A;color:#141414!important;transform:translateY(-1px)}
.dtb a.ci svg{width:14px;height:14px}
.dtb a.wa{display:inline-flex;align-items:center;gap:8px;height:33px;padding:0 15px;margin-right:7px;border-radius:999px;border:1px solid #2E7D4F;background:#11241A;color:#CDEBD2!important;font-weight:700;font-size:13.5px;white-space:nowrap;transition:background .2s,border-color .2s}
.dtb a.wa:hover{background:#17402A;border-color:#4CC26A}
.dtb a.wa svg{width:15px;height:15px;color:#4CC26A}
.dtb .dot{position:relative;display:block;width:7px;height:7px;border-radius:50%;background:#4CC26A;flex:none}
.dtb .dot:after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid #4CC26A;opacity:0;animation:dtbPing 2.4s ease-out infinite}
@keyframes dtbPing{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.6);opacity:0}}
@media (prefers-reduced-motion:reduce){.dtb .ln i,.dtb .st,.dtb .dot:after{animation:none}}
@media (max-width:1180px){.dtb .sep{margin:0 10px}.dtb a.wa{padding:0 11px}}
@media (max-width:1024px){.dtb{display:none!important}}
@media print{.dtb{display:none!important}}
DBLTBCSS;
	echo '<style id="dabul-topbar-css">' . $css . '</style>';
	$h = <<<'DBLTOPBAR'
<div class="dtb" role="region" aria-label="פרטי המשרד ורשתות חברתיות"><span class="ln" aria-hidden="true"><i></i></span><div class="in">
<div class="rt"><a class="it" href="https://www.google.com/maps?cid=13620325646901534279" target="_blank" rel="noopener"><svg viewBox="0 0 384 512" aria-hidden="true"><path fill="currentColor" d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>רזיאל 1, נתניה</a><span class="sep" aria-hidden="true"></span><a class="it ph" href="tel:098613413"><svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>09-8613413</a></div>
<a class="chip" href="https://www.google.com/maps?cid=13620325646901534279" target="_blank" rel="noopener" aria-label="דירוג %RATING% מתוך 5, %COUNT% ביקורות בגוגל"><span class="gg" aria-hidden="true"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z"/><path fill="#FBBC05" d="M10.5 28.8c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.7 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.7l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg></span><span class="sc" aria-hidden="true">%RATING%</span><span class="st" aria-hidden="true">★★★★★</span><span class="cn" aria-hidden="true">%COUNT% ביקורות בגוגל</span></a>
<div class="lt"><a class="ci" href="https://www.facebook.com/dabullaw" target="_blank" rel="noopener" aria-label="פייסבוק של עו״ד יקיר דבול"><svg viewBox="0 0 320 512" aria-hidden="true"><path fill="currentColor" d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z"/></svg></a><a class="ci" href="https://www.instagram.com/dabullaw" target="_blank" rel="noopener" aria-label="אינסטגרם של עו״ד יקיר דבול"><svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg></a><a class="ci" href="https://www.tiktok.com/@yakir.dabul" target="_blank" rel="noopener" aria-label="טיקטוק של עו״ד יקיר דבול"><svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg></a><a class="ci" href="https://www.youtube.com/channel/UCVooMwdZfVT_xo21a-Xpdbg" target="_blank" rel="noopener" aria-label="יוטיוב של עו״ד יקיר דבול"><svg viewBox="0 0 576 512" aria-hidden="true"><path fill="currentColor" d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"/></svg></a><a class="wa" href="https://chat.whatsapp.com/ClLGh1qsjnpBnjIdKKu2lA" target="_blank" rel="noopener" aria-label="הצטרפות לקבוצת הווטסאפ של המשרד"><span class="dot" aria-hidden="true"></span>הצטרפו לקבוצת הווטסאפ<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></a></div>
</div></div>
DBLTOPBAR;
	echo str_replace(array('%RATING%', '%COUNT%'), array(esc_html($r), (int) $n), $h);
}, 20);
