/* dabul: the "צריכים סיוע משפטי?" band at the bottom of every page and the new contact page (Yakir approved both on 22.10.2026).
   [dabul_help_band]: placed in the footer template (622), inside the top container d331701, which keeps its background
   (the columns photo with the dark overlay) and its rule that hides it on the contact and thank-you pages.
   [dabul_contact]: placed on the contact page (26), between the top image and the Google map.
   22.10.2026 (Yakir asked): no photo line above the form; on the phone the top image is zoomed in like on the computer
   (the face does not show) and the "אני כאן לרשותכם" part is centered.
   Both forms send the lead straight to the office system (the "lead" function, which alerts on Telegram), send the same
   email the old Elementor forms sent (to dabullaw@gmail.com), and then move to the thank-you page, like before.
   The privacy consent text is exactly the text of the old forms.
   To undo: restore the backups in docs coll sitebak (footer622-before-helpband-20261022, page26-before-contact-20261022)
   and the footer snippet 24 backup (snippet24-before-helpband-20261022), then deactivate this snippet. */

function dabul_lf_consent() {
	return '<label class="dlf-consent"><input type="checkbox" name="consent" value="1" required><span>קראתי ומסכימ/ה ל<a href="https://dabullaw.co.il/privacy-policy/" target="_blank" rel="noopener">מדיניות הפרטיות</a>. אני מאשר/ת כי ידוע לי ומוסכם עלי כי הפרטים שמסרתי ייאספו, יוחזקו ויעובדו במאגר מידע בהתאם להוראות חוק הגנת הפרטיות, התשמ"א–1981 (כולל תיקון 13), ולמטרות המפורטות במדיניות הפרטיות של האתר. ידוע לי כי מסירת המידע נעשית מרצוני החופשי, וכי עומדות לי הזכויות המוקנות לי לפי החוק.</span></label>';
}

function dabul_lf_topics($id) {
	$o = '<select id="' . $id . '" name="topic"><option value="" selected>בחרו נושא</option>';
	foreach (array('קניית דירה', 'מכירת דירה', 'דירה מקבלן', 'התחדשות עירונית', 'מיסוי מקרקעין', 'צוואות וירושות', 'נושא אחר') as $t) $o .= '<option>' . $t . '</option>';
	return $o . '</select>';
}

function dabul_lf_icon($k) {
	$i = array(
		'tel' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
		'wa' => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
		'cal' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
		'mail' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
	);
	return $i[$k];
}

function dabul_lf_css() {
	static $done = false;
	if ($done) return '';
	$done = true;
	return <<<'CSS'
<style id="dabul-lf-css">
.dhb,.dct{--ink:#141414;--ink2:#2b2a27;--text:#3d3b37;--muted:#6b665c;--line:#e6e1d6;--cream:#faf7f0;--gold:#c5a25a;--gold2:#e7cd96;--goldd:#8c7646;font-family:"Noto Local","Noto Sans Hebrew",Arial,sans-serif;direction:rtl;text-align:right}
.dhb *,.dct *{box-sizing:border-box}
.dlf .f{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;min-width:0}
.dlf .f label,.dlf .f .lb{font-weight:700;font-size:15px;color:var(--ink2)}
.dlf .f label i{color:#b4232a;font-style:normal}
.dlf .f input,.dlf .f select,.dlf .f textarea{font:inherit;font-size:16px;border:1.5px solid #d9d3c6;border-radius:12px;padding:12px 14px;background:#fff;color:var(--ink);min-height:50px;width:100%;margin:0;box-shadow:none}
.dlf .f textarea{min-height:92px;resize:vertical}
.dlf .f input:focus,.dlf .f select:focus,.dlf .f textarea:focus{outline:3px solid rgba(197,162,90,.45);border-color:var(--gold)}
.dlf .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.dlf-consent{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.6;color:var(--muted);margin:6px 0 16px;font-weight:400;cursor:pointer}
.dlf-consent input{width:20px;height:20px;min-height:0;margin:2px 0 0;accent-color:#c5a25a;flex:none}
.dlf-consent a{color:var(--goldd);font-weight:700;text-decoration:underline}
.dlf .go{display:block;width:100%;border:0;border-radius:14px;padding:16px;font:inherit;font-weight:700;font-size:19px;color:#141414;background:linear-gradient(90deg,#d6b46a,#e7cd96 50%,#d6b46a);cursor:pointer;min-height:56px;box-shadow:0 10px 24px -10px rgba(197,162,90,.9)}
.dlf .go:hover{filter:brightness(1.04)}
.dlf .go:focus-visible{outline:3px solid #141414;outline-offset:2px}
.dlf .go[disabled]{opacity:.7;cursor:wait}
.dlf .msg{min-height:0;margin:10px 0 0;color:#b4232a;font-weight:700;font-size:15px}
.dlf .msg:empty{display:none}
.dlf{position:relative}.dlf .hp{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;margin:-1px;padding:0;border:0}
/* the band */
.dhb{color:#fff}
.dhb-in{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:32px;align-items:center}
.dhb .bh{border-right:3px solid var(--gold);padding-right:22px}
.dhb h2{margin:0;font-size:clamp(30px,4vw,44px);font-weight:700;line-height:1.2;color:#fff;text-wrap:balance}
.dhb .sub{color:#d9d3c6;font-size:18px;line-height:1.6;margin:12px 0 20px;padding-right:25px}
.dhb .acts{display:flex;gap:12px;flex-wrap:wrap;padding-right:25px}
.dhb .acts a{display:inline-flex;align-items:center;gap:10px;border-radius:14px;padding:14px 22px;font-weight:700;font-size:19px;text-decoration:none;min-height:56px;background:linear-gradient(90deg,#d6b46a,#e7cd96 50%,#d6b46a);color:#141414!important}
.dhb .acts svg{width:22px;height:22px}
.dhb .pts{display:flex;gap:18px;flex-wrap:wrap;margin-top:22px;color:#cfc8b8;font-size:15px;padding-right:25px}
.dhb .pts span{display:flex;gap:8px;align-items:center}
.dhb .pts i{width:8px;height:8px;border-radius:50%;background:var(--gold);display:inline-block}
.dhb .mini{background:#fff;color:var(--text);border-radius:20px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.dhb .mini h3{margin:0 0 14px;color:var(--ink);font-size:22px;font-weight:700}
/* the contact page */
.dct{position:relative;z-index:2;margin-top:-92px;padding-bottom:56px;color:var(--text)}
.dct-wrap{max-width:1180px;margin:0 auto;padding-inline:20px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:24px;align-items:start}
.dct .card{background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(20,20,20,.14);border:1px solid var(--line)}
.dct .form{padding:30px 30px 26px}
.dct .who{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.dct .who .av{width:58px;height:58px;border-radius:50%;padding:2px;background:linear-gradient(145deg,#f1ddb0,#c5a25a);flex:none}
.dct .who .av img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:2px solid #fff}
.dct .who b{display:block;color:var(--ink);font-size:16px}
.dct .form h2{margin:0 0 6px;font-size:28px;font-weight:700;color:var(--ink);line-height:1.3;text-wrap:balance}
.dct .form .sub{margin:0 0 20px;color:var(--muted);font-size:16px}
.dct .chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.dct .chips label{position:relative;font-weight:700;font-size:15px;border:1.5px solid #d9d3c6;border-radius:12px;padding:10px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:58px;text-align:center;line-height:1.2;color:var(--ink2);background:#fff}
.dct .chips label small{font-weight:400;font-size:12.5px;color:var(--muted)}
.dct .chips input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
.dct .chips label:focus-within{outline:3px solid rgba(197,162,90,.45)}
.dct .chips label.on{border-color:var(--gold);background:#fbf4e3;color:var(--ink)}
.dct .alt{display:flex;justify-content:center;gap:8px;margin-top:12px;font-size:15px;color:var(--muted);flex-wrap:wrap}
.dct .alt a{color:var(--ink);font-weight:700;direction:ltr;text-decoration:none}
.dct .side{display:flex;flex-direction:column;gap:14px;min-width:0}
.dct .qc{padding:8px}
.dct .qc a{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;text-decoration:none;color:inherit}
.dct .qc a:hover{background:#faf7f0}
.dct .qc a+a{border-top:1px solid var(--line)}
.dct .qc .ic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex:none;background:#141414;color:var(--gold2)}
.dct .qc .ic.wa{background:#e8f8ee;color:#128c4a}
.dct .qc .ic svg{width:22px;height:22px}
.dct .qc b{display:block;color:var(--ink);font-size:16.5px}
.dct .qc small{color:var(--muted);font-size:14.5px}
.dct .qc .arr{margin-inline-start:auto;color:var(--gold);font-weight:700;font-size:20px}
.dct .place{display:grid;grid-template-columns:120px 1fr;gap:14px;padding:14px}
.dct .place .court{width:120px;height:150px;object-fit:cover;border-radius:12px;display:block}
.dct .place b{color:var(--ink);font-size:17px}
.dct .place p{margin:4px 0;font-size:15px;line-height:1.55}
.dct .place .acc{display:inline-flex;gap:6px;align-items:center;background:#eef6ff;color:#1d4f86;border-radius:8px;padding:4px 10px;font-size:13px;font-weight:700;margin-top:6px}
.dct .place .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.dct .place .btns a{border:1.5px solid var(--gold);color:var(--ink);border-radius:999px;padding:7px 14px;font-weight:700;font-size:14px;text-decoration:none}
.dct .hours{padding:14px 18px;display:flex;justify-content:space-between;gap:10px;font-size:15px;flex-wrap:wrap}
.dct .hours b{color:var(--ink)}
.dct .revs{padding:18px 18px 14px;background:linear-gradient(160deg,#fff,#fbf6ea);position:relative;overflow:hidden}
.dct .revs:before{content:"״";position:absolute;left:14px;top:-18px;font-size:120px;line-height:1;color:rgba(197,162,90,.18);font-weight:700}
.dct .rv-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.dct .rv-hd b{color:var(--ink);font-size:17px}
.dct .st5{color:#f5b82e;letter-spacing:2px;font-size:16px}
.dct .rv-track{position:relative;min-height:128px}
.dct .rv{position:absolute;inset:0;margin:0;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s;visibility:hidden}
.dct .rv.on{opacity:1;transform:none;position:relative;visibility:visible}
.dct .rv blockquote{margin:0;padding:0;border:0;font-size:16.5px;line-height:1.65;color:var(--ink2);font-style:normal}
.dct .rv figcaption{display:flex;gap:10px;align-items:center;margin-top:10px;font-size:14.5px}
.dct .src{border-radius:999px;padding:2px 10px;font-size:13px;font-weight:700}
.dct .src.g{background:#eef3fe;color:#1a56c4}.dct .src.l{background:#e8f6fd;color:#0b6e99}.dct .src.f{background:#eef1fb;color:#2c4a99}
.dct .rv-ft{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
.dct .rv-ft a{color:var(--goldd);font-weight:700;font-size:15px;text-decoration:none}
.dct .dots{display:flex;gap:6px}
.dct .dots button{width:10px;height:10px;min-height:0;border-radius:50%;border:0;background:#d9d3c6;padding:0;cursor:pointer}
.dct .dots button.on{background:var(--gold);width:22px;border-radius:6px}
.dct .about{max-width:1180px;margin:44px auto 0;padding-inline:20px}
.dct .ab-in{background:var(--cream);border:1px solid var(--line);border-radius:20px;padding:clamp(22px,4vw,40px)}
.dct .about h2{margin:0;font-size:clamp(26px,3.4vw,38px);font-weight:700;color:var(--ink);line-height:1.3;text-wrap:balance}
.dct .ab-bar{width:120px;height:2px;background:linear-gradient(270deg,var(--gold) 0 40px,#cfc6b3 40px);margin:14px 0 18px}
.dct .about p{font-size:17.5px;line-height:1.8;margin:0 0 10px}
.dct .steps{max-width:1180px;margin:44px auto 0;padding-inline:20px}
.dct .steps h3{text-align:center;margin:0 0 20px;font-size:28px;color:var(--ink);font-weight:700}
.dct .st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.dct .st>div{background:var(--cream);border:1px solid var(--line);border-radius:16px;padding:20px}
.dct .st em{font-style:normal;display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#141414;color:var(--gold2);font-weight:700;margin-bottom:10px}
.dct .st b{display:block;color:var(--ink);font-size:18px;margin-bottom:4px}
.dct .st p{margin:0;font-size:15.5px;line-height:1.6}
.dct-hero-sub{margin:0 auto;max-width:640px;color:#d9d3c6;font-size:clamp(16px,2vw,19px);line-height:1.6;text-align:center;text-wrap:balance;font-family:"Noto Local","Noto Sans Hebrew",Arial,sans-serif}
.dct-hero-bar{width:64px;height:3px;background:#c5a25a;margin:18px auto 0;border-radius:2px}
.elementor-26 .elementor-element-4546e43{text-align:right}
@media (max-width:860px){
 .dhb-in{grid-template-columns:1fr}
 .dlf .row{grid-template-columns:1fr;gap:0}
 .dct{margin-top:-72px}
 .dct-wrap{grid-template-columns:1fr}
 .dct .chips{grid-template-columns:repeat(2,minmax(0,1fr))}
 .dct .form{padding:22px 18px}
 .dct .st{grid-template-columns:1fr}
 .dct .place{grid-template-columns:96px 1fr}.dct .place .court{width:96px;height:124px}
 .dhb .mini{padding:20px 16px}
}
@media (max-width:767px){
 .elementor-26 .elementor-element-83941a1{background-image:url(https://dabullaw.co.il/wp-content/uploads/2025/12/2149375672.jpg)!important;background-size:auto 260%!important;background-position:58% 55%!important}
 .dct .ab-in{text-align:center}
 .dct .ab-bar{margin:14px auto 18px}
}
@media (prefers-reduced-motion:reduce){.dct .rv{transition:none}}
</style>
CSS;
}

// the script both forms share; printed once in the footer of pages that show one of them
function dabul_lf_js() {
	static $done = false;
	if ($done) return;
	$done = true;
	$thanks = esc_url(get_permalink(1913));
	$ajax = esc_url(admin_url('admin-ajax.php'));
	?>
<script nowprocket data-no-optimize="1" data-no-minify="1" data-no-defer="1">(function(){var A='https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/lead',T='<?php echo $thanks; ?>',M='<?php echo $ajax; ?>';
document.querySelectorAll('.dct .chips').forEach(function(c){c.addEventListener('change',function(){c.querySelectorAll('label').forEach(function(l){l.classList.toggle('on',l.querySelector('input').checked)})})});
document.querySelectorAll('form.dlf').forEach(function(f){f.addEventListener('submit',function(e){e.preventDefault();
var m=f.querySelector('.msg'),b=f.querySelector('.go'),g=function(n){var x=f.elements[n];return x&&x.value!=null?String(x.value).trim():''};
if(g('website')){return}
var tel=g('phone').replace(/[^0-9+]/g,'');
if(g('name').length<2){m.textContent='כתבו שם, בבקשה.';f.elements.name.focus();return}
if(tel.replace(/[^0-9]/g,'').length<9){m.textContent='כתבו מספר טלפון תקין, בבקשה.';f.elements.phone.focus();return}
if(!f.elements.consent.checked){m.textContent='כדי לשלוח, סמנו את ההסכמה למדיניות הפרטיות.';return}
m.textContent='';b.disabled=true;var bt=b.textContent;b.textContent='שולחים...';
var w=f.querySelector('input[name="when"]:checked'),topic=g('topic')==='נושא אחר'?'':g('topic');
var body={name:g('name'),phone:tel,email:g('email'),topic:topic,preferred_time:w?w.value:'',notes:g('message'),source:'website',form:f.getAttribute('data-form'),page:location.href.split('#')[0].split('?')[0].slice(0,300)};
var mail=new FormData();mail.append('action','dabul_lf_mail');['name','email','message'].forEach(function(k){mail.append(k,g(k))});mail.append('phone',tel);mail.append('topic',g('topic'));mail.append('when',body.preferred_time);mail.append('form',body.form);mail.append('page',body.page);
var queued=false;try{queued=navigator.sendBeacon?navigator.sendBeacon(M,mail):false}catch(x){}
if(!queued){try{fetch(M,{method:'POST',body:mail,keepalive:true});queued=true}catch(x){}}
var done=function(){location.href=T},bad=function(){if(queued){done();return}b.disabled=false;b.textContent=bt;m.textContent='משהו השתבש. אפשר להתקשר: 09-8613413'};
var ctl=window.AbortController?new AbortController():null;var tm=setTimeout(function(){if(ctl)ctl.abort()},12000);
fetch(A,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined}).then(function(r){return r.json()}).then(function(j){clearTimeout(tm);if(j&&j.ok)done();else bad()}).catch(function(){clearTimeout(tm);bad()})})});
var rv=[].slice.call(document.querySelectorAll('.dct .rv')),dt=[].slice.call(document.querySelectorAll('.dct .dots button')),i=0,tmr=null;
if(rv.length>1){var go=function(n){rv[i].classList.remove('on');dt[i].classList.remove('on');dt[i].removeAttribute('aria-current');i=n;rv[i].classList.add('on');dt[i].classList.add('on');dt[i].setAttribute('aria-current','true')};
dt.forEach(function(b,n){b.addEventListener('click',function(){go(n);if(tmr){clearInterval(tmr);tmr=null}})});
if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))tmr=setInterval(function(){go((i+1)%rv.length)},6000)}
})();</script>
	<?php
}

function dabul_help_band() {
	add_action('wp_footer', 'dabul_lf_js', 99);
	$o = dabul_lf_css();
	$o .= '<section class="dhb" aria-labelledby="dhb-t"><div class="dhb-in"><div>'
		. '<div class="bh"><h2 id="dhb-t">צריכים סיוע משפטי?<br>צרו קשר עכשיו</h2></div>'
		. '<p class="sub">לשיחת ייעוץ חייגו, או השאירו פרטים ונחזור אליכם בהקדם.</p>'
		. '<div class="acts"><a href="tel:098613413">' . dabul_lf_icon('tel') . '<span dir="ltr">09-8613413</span></a></div>'
		. '<div class="pts"><span><i></i>רזיאל 1, נתניה, מול בית המשפט</span><span><i></i>פגישה במשרד, בבית או בזום</span></div>'
		. '</div>'
		. '<form class="mini dlf" data-form="footer-band" novalidate aria-label="השארת פרטים">'
		. '<h3>השאירו פרטים ונחזור אליכם</h3>'
		. '<div class="row"><div class="f"><label for="dhb-n">שם מלא <i>*</i></label><input id="dhb-n" name="name" autocomplete="name" required></div>'
		. '<div class="f"><label for="dhb-p">טלפון <i>*</i></label><input id="dhb-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div></div>'
		. '<div class="f"><label for="dhb-t2">במה מדובר?</label>' . dabul_lf_topics('dhb-t2') . '</div>'
		. '<div class="hp" aria-hidden="true"><label for="dhb-w">אתר</label><input id="dhb-w" name="website" tabindex="-1" autocomplete="off"></div>'
		. dabul_lf_consent()
		. '<button class="go" type="submit">כן, תחזרו אליי</button><p class="msg" role="alert"></p>'
		. '</form></div></section>';
	return $o;
}

function dabul_contact_page() {
	add_action('wp_footer', 'dabul_lf_js', 99);
	$up = 'https://dabullaw.co.il/wp-content/uploads/';
	$o = dabul_lf_css();
	$o .= '<div class="dct"><div class="dct-wrap">'
		. '<form class="card form dlf" data-form="contact-page" novalidate aria-label="טופס פנייה">'
		. '<h2>רוצים לדעת מה האפשרויות שלכם?</h2><p class="sub">השאירו פרטים ונחזור אליכם בהקדם.</p>'
		. '<div class="row"><div class="f"><label for="dct-n">שם מלא <i>*</i></label><input id="dct-n" name="name" autocomplete="name" placeholder="איך קוראים לכם?" required></div>'
		. '<div class="f"><label for="dct-p">טלפון <i>*</i></label><input id="dct-p" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="050-0000000" required></div></div>'
		. '<div class="row"><div class="f"><label for="dct-t">במה מדובר?</label>' . dabul_lf_topics('dct-t') . '</div>'
		. '<div class="f"><label for="dct-e">מייל (לא חובה)</label><input id="dct-e" name="email" type="email" autocomplete="email" placeholder="name@mail.com"></div></div>'
		. '<div class="f" role="radiogroup" aria-labelledby="dct-wl"><span class="lb" id="dct-wl">מתי נוח לכם שנחזור?</span><div class="chips">'
		. '<label class="on"><input type="radio" name="when" value="מתי שנוח, בהקדם" checked>מתי שנוח<small>בהקדם</small></label>'
		. '<label><input type="radio" name="when" value="בבוקר 9:00-12:00">בבוקר<small>9:00-12:00</small></label>'
		. '<label><input type="radio" name="when" value="בצהריים 12:00-15:00">בצהריים<small>12:00-15:00</small></label>'
		. '<label><input type="radio" name="when" value="אחר הצהריים 15:00-18:00">אחר הצהריים<small>15:00-18:00</small></label>'
		. '</div></div>'
		. '<div class="f"><label for="dct-m">ספרו בכמה מילים (לא חובה)</label><textarea id="dct-m" name="message" placeholder="למשל: מצאנו דירה בנתניה ורוצים לבדוק אותה לפני שחותמים"></textarea></div>'
		. '<div class="hp" aria-hidden="true"><label for="dct-w">אתר</label><input id="dct-w" name="website" tabindex="-1" autocomplete="off"></div>'
		. dabul_lf_consent()
		. '<button class="go" type="submit">כן, תחזרו אליי</button><p class="msg" role="alert"></p>'
		. '<div class="alt">מעדיפים לדבר עכשיו? <a href="tel:098613413">09-8613413</a></div>'
		. '</form>'
		. '<div class="side">'
		. '<div class="card qc">'
		. '<a href="tel:098613413"><span class="ic">' . dabul_lf_icon('tel') . '</span><span><b>חייגו למשרד</b><small dir="ltr">09-8613413</small></span><span class="arr" aria-hidden="true">‹</span></a>'
		. '<a href="https://wa.me/972505580189" target="_blank" rel="noopener"><span class="ic wa">' . dabul_lf_icon('wa') . '</span><span><b>כתבו לנו בוואטסאפ</b><small>תשובה בכתב, בלי לחכות על הקו</small></span><span class="arr" aria-hidden="true">‹</span></a>'
		. '<a href="https://dabullaw.co.il/online/zoom-consultation/"><span class="ic">' . dabul_lf_icon('cal') . '</span><span><b>תיאום ייעוץ בזום</b><small>בוחרים מועד שנוח לכם</small></span><span class="arr" aria-hidden="true">‹</span></a>'
		. '<a href="mailto:dabullaw@gmail.com"><span class="ic">' . dabul_lf_icon('mail') . '</span><span><b>שלחו מייל</b><small>dabullaw@gmail.com</small></span><span class="arr" aria-hidden="true">‹</span></a>'
		. '</div>'
		. '<div class="card place"><img class="court" src="' . $up . '2026/10/netanya-court-opposite-office-225x300.jpg" alt="בניין בית המשפט בנתניה, שנמצא מול המשרד" width="120" height="150" loading="lazy">'
		. '<div><b>המשרד ברזיאל 1, נתניה</b><p>קומת הכניסה, ממש מול בית המשפט בנתניה (בתמונה).</p><span class="acc">♿ כניסה נגישה, בלי מדרגות</span>'
		. '<div class="btns"><a href="https://waze.com/ul?q=' . rawurlencode('רזיאל 1 נתניה') . '&navigate=yes" target="_blank" rel="noopener">ניווט בוויז</a><a href="https://www.google.com/maps/search/?api=1&query=' . rawurlencode('עורך דין מקרקעין יקיר דבול נתניה') . '" target="_blank" rel="noopener">גוגל מפות</a></div></div></div>'
		. '<div class="card hours"><b>שעות פעילות</b><span>ראשון עד חמישי, 9:00-18:00</span></div>'
		. '<div class="card revs" aria-label="המלצות לקוחות"><div class="rv-hd"><b>מה הלקוחות אומרים</b><span class="st5" role="img" aria-label="5 כוכבים">★★★★★</span></div>'
		. '<div class="rv-track">'
		. '<figure class="rv on"><blockquote>״יקיר פישט לנו את הכל, תרגם את המושגים המשפטיים המסובכים לשפה יומיומית וליווה אותנו צעד אחר צעד עד לחתימה.״</blockquote><figcaption><b>עידו ב.</b><span class="src g">ביקורת בגוגל</span></figcaption></figure>'
		. '<figure class="rv"><blockquote>״משרד עורכי דין שמתקתק עניינים ונותן יחס של משפחה.״</blockquote><figcaption><b>דוד ל.</b><span class="src l">לוירוויוז</span></figcaption></figure>'
		. '<figure class="rv"><blockquote>״יקיר תקתק את כל הבירוקרטיה, חסך לנו המון זמן ונתן לנו ביטחון מלא בתהליך.״</blockquote><figcaption><b>מיטל ש.</b><span class="src f">פייסבוק</span></figcaption></figure>'
		. '</div><div class="rv-ft"><div class="dots"><button type="button" aria-label="המלצה 1" class="on" aria-current="true"></button><button type="button" aria-label="המלצה 2"></button><button type="button" aria-label="המלצה 3"></button></div>'
		. '<a href="https://dabullaw.co.il/%d7%94%d7%9e%d7%9c%d7%a6%d7%95%d7%aa/">לכל ההמלצות ‹</a></div></div>'
		. '</div></div>'
		. '<section class="about"><div class="ab-in"><h2>אני כאן לרשותכם&nbsp;- לכל שאלה ופנייה</h2><div class="ab-bar"></div>'
		. '<p>אני מספק מענה משפטי מקיף, תחת קורת גג אחת, לחברות ויזמים כמו גם ללקוחות פרטיים, בתחומי ההתמחות המרכזיים של המשרד:</p>'
		. '<p>מקרקעין ונדל"ן, התחדשות עירונית, הוצאה לפועל, חברות ושותפויות,</p>'
		. '<p>ליטיגציה אזרחית-מסחרית וצוואות וירושות.</p>'
		. '<p>אני מאמין שמחובתי להעניק שירות אישי, מקצועי, יסודי ומהיר בכל תחומי העיסוק. משרדי ילווה אתכם לאורך כל הדרך - החל משלב המשא ומתן, דרך ההתנהלות השוטפת מול הרשויות, ועד להשלמת המשימה לשביעות רצונכם המלאה.</p>'
		. '<p>כל זאת, בליווי צמוד ובשימוש בכלים פרקטיים שיסייעו לכם להתמודד עם האתגרים המשפטיים העומדים בפניכם.</p>'
		. '<p>אני רואה בהצלחתכם את הצלחתיי. פנו אליי היום וקבלו את השקט הנפשי הנדרש בידיעה שיש לכם עורך דין מקצועי שיעמוד לצדכם לאורך כל הדרך.</p>'
		. '</div></section>'
		. '<section class="steps" aria-labelledby="dct-st"><h3 id="dct-st">מה קורה אחרי שפונים?</h3><div class="st">'
		. '<div><em>1</em><b>משאירים פרטים</b><p>בטופס, בטלפון או בוואטסאפ. דקה אחת.</p></div>'
		. '<div><em>2</em><b>שיחה קצרה</b><p>מבינים מה המצב שלכם ומה חשוב לבדוק.</p></div>'
		. '<div><em>3</em><b>יודעים מה הצעד הבא</b><p>מקבלים תמונה ברורה, ואתם מחליטים אם להמשיך.</p></div>'
		. '</div></section></div>';
	return $o;
}

add_action('init', function () {
	add_shortcode('dabul_help_band', 'dabul_help_band');
	add_shortcode('dabul_contact', 'dabul_contact_page');
});

// the same email the old Elementor forms sent to the office
function dabul_lf_mail() {
	$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
	$k = 'dabul_lf_' . md5($ip);
	$n = (int) get_transient($k);
	if ($n >= 6) wp_die('', '', array('response' => 429));
	set_transient($k, $n + 1, HOUR_IN_SECONDS);
	$f = function ($x, $len = 300) { return isset($_POST[$x]) ? mb_substr(sanitize_text_field(wp_unslash($_POST[$x])), 0, $len) : ''; };
	$name = $f('name', 80); $phone = preg_replace('/[^0-9+]/', '', $f('phone', 30));
	if (mb_strlen($name) < 2 || strlen(preg_replace('/\D/', '', $phone)) < 9) wp_die('', '', array('response' => 400));
	$msg = isset($_POST['message']) ? mb_substr(sanitize_textarea_field(wp_unslash($_POST['message'])), 0, 2000) : '';
	$src = $f('form', 40) === 'contact-page' ? 'עמוד צרו קשר' : 'הטופס "צריכים סיוע משפטי?" בתחתית העמוד';
	$lines = array('שם מלא: ' . $name, 'טלפון: ' . $phone);
	if ($f('email')) $lines[] = 'אימייל: ' . $f('email');
	if ($f('topic')) $lines[] = 'נושא: ' . $f('topic');
	if ($f('when')) $lines[] = 'מתי נוח לחזור: ' . $f('when');
	if ($msg !== '') $lines[] = 'הודעה: ' . $msg;
	$lines[] = '';
	$lines[] = 'נשלח מ: ' . $src;
	if ($f('page')) $lines[] = 'עמוד: ' . esc_url_raw($f('page', 300));
	$h = array('From: יקיר דבול - משרד עורכי דין <email@dabullaw.co.il>', 'Content-Type: text/plain; charset=UTF-8');
	wp_mail('dabullaw@gmail.com', 'הודעה חדשה מאת "יקיר דבול - משרד עורכי דין"', implode("\n", $lines), $h);
	wp_die('ok');
}
add_action('wp_ajax_dabul_lf_mail', 'dabul_lf_mail');
add_action('wp_ajax_nopriv_dabul_lf_mail', 'dabul_lf_mail');
