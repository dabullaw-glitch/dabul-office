/* dabul: three short quizzes ("בדיקה קצרה") inside articles. Yakir approved on 10.10.2026.
   evict  -> post 3121 (תביעה לפינוי מושכר)
   split  -> posts 3611, 3629, 6643 (פירוק שיתוף)
   renew  -> page 35 (התחדשות עירונית)
   Each quiz is placed before a chosen heading of the article (or at the end if that heading is gone).
   The short form at the end sends name, phone and the answers to the office system (edge function "lead"):
   a new lead in the office and a Telegram alert. Also usable anywhere with the shortcode [dabul_quiz id="evict"].
   Option dabul_quiz_map can override the placement: {post_id: [quiz, heading text]}.
   To stop: deactivate this snippet. */
function dabul_quiz_assets() {
	static $done = false;
	if ($done) return '';
	$done = true;
	return <<<'DQZASSETS'
<style>
.dqz{--gold:#a8873f;--gold2:#8a6d2c;--ink:#1c1b19;--mut:#6c675d;--line:#e4ded0;--paper:#fbfaf6;--soft:#f3ead3;--ok:#1f8f4e;--warn:#9a6a1a;--bad:#a8402a;
  color:var(--ink);font-size:17px;line-height:1.7;max-width:760px;margin:0 auto;font-family:inherit}
.dqz *{box-sizing:border-box}
.dqz .box{background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 18px 40px -30px rgba(60,45,10,.5)}
.dqz .k{font-size:13px;letter-spacing:.05em;color:var(--gold);font-weight:700;margin:0}
.dqz h2,.dqz h3{margin:0;font-weight:800;text-wrap:balance}
.dqz h2{font-size:26px;line-height:1.25;margin:2px 0 6px}
.dqz .intro{color:var(--mut);margin:0 0 16px}
.dqz .bar{height:6px;border-radius:99px;background:#eee8da;overflow:hidden;margin:0 0 16px}
.dqz .bar i{display:block;height:100%;background:var(--gold);width:0;transition:width .25s}
.dqz .q{font-size:19px;font-weight:800;margin:0 0 12px}
.dqz .ops{display:grid;gap:8px}
.dqz .ops button{font:inherit;text-align:right;border:1.5px solid var(--line);background:var(--paper);border-radius:14px;padding:12px 14px;cursor:pointer;color:var(--ink);transition:border-color .15s,background .15s}
.dqz .ops button:hover{border-color:var(--gold);background:#fff}
.dqz .nav{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:14px;color:var(--mut)}
.dqz .nav button{font:inherit;background:none;border:0;color:var(--gold2);font-weight:700;cursor:pointer;padding:0}
.dqz .res h3{font-size:22px;margin:4px 0 8px}
.dqz .tag{display:inline-block;font-size:13px;font-weight:800;border-radius:99px;padding:2px 12px;margin-bottom:6px}
.dqz .tag.g{background:#e3f2e9;color:var(--ok)}.dqz .tag.y{background:#f6ebcf;color:var(--warn)}.dqz .tag.r{background:#f7e0d9;color:var(--bad)}
.dqz .res ul{margin:8px 0 0;padding-inline-start:20px}
.dqz .res li{margin:4px 0}
.dqz .steps{display:grid;gap:8px;margin:14px 0}
.dqz .steps>div{display:grid;grid-template-columns:30px 1fr;gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.dqz .steps i{font-style:normal;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--gold);color:#fff;font-weight:800}
.dqz .steps b{display:block}
.dqz .steps span{font-size:15px;color:var(--mut)}
.dqz .warn{background:#fbf1ee;border:1px solid #efd3ca;border-radius:12px;padding:10px 12px;font-size:15px;margin:12px 0}
.dqz .lead{margin-top:16px;border-top:1px dashed var(--line);padding-top:14px}
.dqz .lead p{margin:0 0 8px;font-weight:700}
.dqz .lead .r{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}
@media(max-width:560px){.dqz .lead .r{grid-template-columns:1fr}}
.dqz input{font:inherit;font-size:16px;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--paper);width:100%;color:var(--ink)}
.dqz .go{font:inherit;font-weight:800;border:0;border-radius:12px;padding:10px 18px;background:var(--ink);color:#fff;cursor:pointer;white-space:nowrap}
.dqz .small{font-size:13px;color:var(--mut);margin-top:10px}
.dqz [hidden]{display:none!important}
</style>
<script nowprocket data-no-optimize="1">/*dabul-quizzes*/(function(){if(window.__dqz)return;window.__dqz=1;
var Q={
 evict:{k:'בדיקה קצרה לבעלי דירות',h:'השוכר לא משלם או לא עוזב? מה הדרך ומה להכין',intro:'6 שאלות, דקה אחת. בסוף תקבלו את המסלול המתאים ורשימה של מה להכין.',
  qs:[
   ['מה הבעיה העיקרית?',[['השוכר לא משלם שכר דירה','pay'],['החוזה נגמר והוא לא עוזב','end'],['הפרה אחרת של החוזה (נזקים, השכרת משנה)','breach'],['גר בדירה בלי חוזה בתוקף','nocontract']]],
   ['כמה זמן זה נמשך?',[['פחות מחודש','t1'],['חודש עד שלושה','t2'],['יותר משלושה חודשים','t3']]],
   ['נשלח מכתב התראה?',[['כן, מעורך דין','l_law'],['כן, ממני','l_me'],['עדיין לא','l_no']]],
   ['איזו בטוחה יש בידכם?',[['ערבות בנקאית או ערבים או שטר חוב','sec_strong'],['צ׳ק ביטחון או פיקדון קטן','sec_weak'],['אין בטוחה','sec_none']]],
   ['השוכר טוען לליקויים בדירה?',[['כן','claims'],['לא','noclaims']]],
   ['יש חוזה שכירות חתום?',[['כן','contract'],['לא, או שאני לא מוצא אותו','nocontract2']]]],
  result:function(a){var urgent=a.t3||a.pay&&a.t2,steps=[];
   if(!a.l_law) steps.push(['מכתב התראה מעורך דין','דרישה מסודרת לתשלום או לפינוי, עם מועד. לפעמים זה מספיק.']);
   steps.push(['תביעה לפינוי מושכר','הליך מקוצר בבית משפט השלום, שנועד להחזיר את הדירה. אפשר לצרף אליו גם את החוב.']);
   steps.push(['פסק דין ופינוי דרך ההוצאה לפועל','אם השוכר לא עוזב אחרי פסק הדין, מגישים את פסק הדין לביצוע בלשכת ההוצאה לפועל.']);
   if(a.sec_strong) steps.splice(1,0,['מימוש הבטוחה','ערבות, ערבים או שטר חוב יכולים לכסות חלק מהחוב כבר בתחילת הדרך.']);
   var prep=['חוזה השכירות וכל הנספחים','רשימת תשלומים: מה שולם ומה לא','התכתבויות עם השוכר (וואטסאפ, מיילים)','הבטוחות: ערבות, שטר חוב, צ׳קים'];
   if(a.claims) prep.push('תמונות של מצב הדירה, וקבלות על תיקונים שעשיתם');
   return {tag:urgent?['r','כדאי לפעול עכשיו']:['y','כדאי להתחיל בהקדם'],title:urgent?'ככל שמחכים, החוב גדל. המסלול שמתאים לכם:':'המסלול שמתאים לכם:',steps:steps,prep:prep,
    warn:'חשוב: אסור לנתק חשמל ומים, להחליף מנעול או להוציא חפצים בעצמכם. זה עלול להפוך אתכם לנתבעים.',
    lead:'רוצים שנבדוק את התיק ונשלח מכתב התראה?'};}},
 split:{k:'בדיקה קצרה לשותפים בנכס',h:'שותפים בדירה ולא מסכימים? מה האפשרויות',intro:'6 שאלות. בסוף תקבלו את הדרכים האפשריות ומה להכין לפגישה.',
  qs:[
   ['איך נוצרה השותפות?',[['ירושה','inh'],['קנינו יחד (חברים, משפחה)','buy'],['בני זוג לשעבר','ex']]],
   ['כמה שותפים יש?',[['2','p2'],['3 עד 5','p5'],['יותר מ־5','pm']]],
   ['מה אתם רוצים?',[['למכור את הנכס ולחלק את הכסף','sell'],['לקנות את החלק של השותפים','buyout'],['שהשותף יקנה את החלק שלי','sellmine']]],
   ['יש הסכמה על המחיר?',[['כן, רק לא מסכימים על הדרך','price_ok'],['לא','price_no'],['אין עדיין הערכת שמאי','price_none']]],
   ['מישהו גר בנכס או משתמש בו?',[['כן, אחד השותפים','lives'],['מושכר','rented'],['ריק','empty']]],
   ['יש על הנכס משכנתא, עיקול או הערה?',[['לא','clean'],['כן','burden'],['לא בטוח','unsure']]]],
  result:function(a){var steps=[];
   steps.push(['ניסיון להסכמה','הסכם בין השותפים: מי קונה ממי ובאיזה מחיר, או מכירה משותפת. זו הדרך המהירה והזולה.']);
   if(a.price_none||a.price_no) steps.splice(0,0,['שמאי מקרקעין','הערכת שווי מוסכמת מקצרת ויכוחים ומשמשת בסיס למשא ומתן.']);
   steps.push(['תביעה לפירוק שיתוף','אם אין הסכמה, כל שותף יכול לבקש מבית המשפט לפרק את השיתוף. בדירה אחת זה בדרך כלל נגמר במכירה.']);
   steps.push(['מכירה מסודרת','לפעמים בית המשפט ממנה כונס נכסים שמוכר את הנכס, והכסף מתחלק לפי החלקים.']);
   var prep=['נסח טאבו עדכני','צו ירושה או צו קיום צוואה, אם השותפות מירושה','מסמכים על תשלומים ששילמתם לבד (משכנתא, ארנונה, שיפוצים)','התכתבויות בין השותפים'];
   if(a.ex) prep.push('הסכם הגירושין או פסק הדין, אם יש');
   var t=a.ex?['y','כדאי לבדוק את ההיבט המשפחתי']:(a.lives?['y','יש שותף שגר בנכס: זה משפיע על הדרך']:['g','יש כמה דרכים, וברוב המקרים מגיעים להסכמה']);
   return {tag:t,title:'הדרכים האפשריות:',steps:steps,prep:prep,warn:a.burden||a.unsure?'משכנתא, עיקול או הערה על הנכס משפיעים על המכירה ועל החלוקה. כדאי להוציא נסח לפני כל צעד.':'',lead:'רוצים שנבדוק את המקרה שלכם?'};}},
 renew:{k:'בדיקה קצרה לבעלי דירות',h:'האם הבניין שלכם מתאים להתחדשות עירונית?',intro:'6 שאלות על הבניין. בסוף תקבלו הערכה כללית ומה לבדוק בעירייה.',
  qs:[
   ['מתי נבנה הבניין?',[['לפני 1980','y1'],['1980 עד 1990','y2'],['אחרי 1990','y3'],['לא יודע','y0']]],
   ['כמה קומות?',[['עד 4','f4'],['5 עד 8','f8'],['יותר מ־8','f9']]],
   ['כמה דירות בבניין?',[['עד 12','u12'],['13 עד 30','u30'],['יותר מ־30','u31']]],
   ['יש עוד בניינים דומים צמודים אליכם?',[['כן, כמה בניינים באותו סגנון','cluster'],['לא, הבניין עומד לבד','single']]],
   ['מה המצב עם הדיירים?',[['כבר פנה אלינו יזם','dev'],['יש נציגות או קבוצה שמתארגנת','rep'],['עוד לא דיברו על זה','none']]],
   ['יש קומת עמודים או חניה תת־קרקעית?',[['קומת עמודים פתוחה','pil'],['חניון תת־קרקעי','park'],['אין','nopark']]]],
  result:function(a){var old=a.y1||a.y2, big=a.cluster||a.u31, steps=[], t;
   if(old&&big){t=['g','לבניין יש מאפיינים שמתאימים לרוב לפינוי בינוי'];}
   else if(old){t=['g','לבניין יש מאפיינים שמתאימים לרוב לחיזוק ותוספת'];}
   else if(a.y3){t=['y','בניין חדש יחסית: התחדשות פחות נפוצה, אבל תלויה בתוכניות באזור'];}
   else {t=['y','צריך לבדוק את שנת הבנייה בתיק הבניין'];}
   steps.push(['בדיקה בעירייה ובמינהל התכנון','האם יש תוכנית להתחדשות עירונית באזור, מתחם מוכרז או מדיניות של העירייה לרחוב שלכם.']);
   steps.push(['התארגנות דיירים','נציגות שמייצגת את כולם. כדי להתקדם צריך הסכמה של רוב מיוחס מבעלי הדירות, והשיעור תלוי בסוג הפרויקט.']);
   steps.push(['עורך דין לבעלי הדירות','לפני שחותמים מול יזם. בדרך כלל היזם משלם את שכר הטרחה של עורך הדין של הדיירים.']);
   var prep=['נסח טאבו וצו בית משותף','תיק בניין מהעירייה (שנת בנייה, היתרים)','רשימת בעלי הדירות ודרכי קשר','כל הצעה או מסמך שקיבלתם מיזם'];
   return {tag:t,title:'מה כדאי לעשות עכשיו:',steps:steps,prep:prep,warn:a.dev?'יזם כבר פנה? לא חותמים על כלום, גם לא על "הסכמה עקרונית", לפני שעורך דין מטעם הדיירים עובר על זה.':'',lead:'רוצים שנבדוק את הבניין שלכם?'};}}
};
function dqzInit(){document.querySelectorAll('.dqz[data-quiz]').forEach(function(R){if(R.getAttribute('data-ready'))return;R.setAttribute('data-ready','1');
 var id=R.getAttribute('data-quiz'), D=Q[id]; if(!D) return; var B=R.querySelector('.box'), ans={}, picks=[], i=0;
 var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
 function draw(){
  if(i<D.qs.length){var q=D.qs[i];
   B.innerHTML='<p class="k">'+esc(D.k)+'</p><h2>'+esc(D.h)+'</h2>'+(i===0?'<p class="intro">'+esc(D.intro)+'</p>':'')+'<div class="bar"><i style="width:'+Math.round(i/D.qs.length*100)+'%"></i></div><p class="q">'+esc(q[0])+'</p><div class="ops">'+q[1].map(function(o,j){return '<button type="button" data-j="'+j+'">'+esc(o[0])+'</button>';}).join('')+'</div><div class="nav"><span>שאלה '+(i+1)+' מתוך '+D.qs.length+'</span>'+(i?'<button type="button" data-back>חזרה</button>':'<span></span>')+'</div>';
   return;}
  var r=D.result(ans); try{if(window.gtag)window.gtag('event','quiz_complete',{quiz_id:id,page_path:location.pathname});}catch(x){}
  B.innerHTML='<div class="res"><p class="k">'+esc(D.k)+'</p><span class="tag '+r.tag[0]+'">'+esc(r.tag[1])+'</span><h3>'+esc(r.title)+'</h3><div class="steps">'+r.steps.map(function(s,n){return '<div><i>'+(n+1)+'</i><div><b>'+esc(s[0])+'</b><span>'+esc(s[1])+'</span></div></div>';}).join('')+'</div>'+(r.warn?'<div class="warn">'+esc(r.warn)+'</div>':'')+'<b>מה להכין:</b><ul>'+r.prep.map(function(p){return '<li>'+esc(p)+'</li>';}).join('')+'</ul>'+
   '<div class="lead" data-lead><p>'+esc(r.lead)+'</p><div class="r"><input type="text" placeholder="שם" autocomplete="name" aria-label="שם"><input type="tel" placeholder="טלפון" autocomplete="tel" dir="ltr" aria-label="טלפון"><button type="button" class="go">שליחה</button></div><p class="small" data-msg>נחזור אליכם ביום העבודה הקרוב. התשובות שסימנתם יגיעו אלינו יחד עם הפרטים, ומשמשות רק לחזרה אליכם.</p></div>'+
   '<p class="small">ההערכה כללית בלבד, לפי התשובות שסימנתם, ואינה ייעוץ משפטי. כל מקרה נבדק לגופו. <button type="button" data-again style="font:inherit;background:none;border:0;color:#8a6d2c;font-weight:700;cursor:pointer;padding:0">לבדוק שוב</button></p></div>';}
 B.addEventListener('click',function(e){var b=e.target.closest('button'); if(!b) return;
  if(b.hasAttribute('data-j')){var o=D.qs[i][1][+b.getAttribute('data-j')]; ans[o[1]]=true; picks[i]=o; i++; draw(); return;}
  if(b.hasAttribute('data-back')){i--; var p=picks[i]; if(p) delete ans[p[1]]; draw(); return;}
  if(b.hasAttribute('data-again')){ans={};picks=[];i=0;draw();return;}
  if(b.classList.contains('go')){var L=B.querySelector('[data-lead]'), ins=L.querySelectorAll('input'), m=L.querySelector('[data-msg]'), name=ins[0].value.trim(), tel=ins[1].value.replace(/\D/g,'');
   if(name.length<2||tel.length<9){m.textContent='כתבו שם וטלפון, ונחזור אליכם.';return;}
   b.disabled=true; var T={evict:'שוכר שלא משלם או לא עוזב (שאלון באתר)',split:'פירוק שיתוף (שאלון באתר)',renew:'התחדשות עירונית (שאלון באתר)'}, rr=D.result(ans);var body={name:name,phone:tel,topic:T[id]||id,source:'website',form:'quiz-'+id,page:location.href.split('#')[0],notes:'שאלון באתר: '+D.h+'\n'+D.qs.map(function(q,n){return q[0]+' '+(picks[n]?picks[n][0]:'');}).join('\n')+'\nתוצאה שהוצגה: '+rr.tag[1]};var done=function(){L.innerHTML='<p>תודה, קיבלנו. נחזור אליכם ביום העבודה הקרוב.</p>';try{if(window.gtag)window.gtag('event','lead_form_submit',{form_name:'quiz-'+id,page_path:location.pathname});}catch(x){}};var fail=function(){b.disabled=false;m.textContent='משהו השתבש. אפשר להתקשר: 09-8613413';};fetch(window.DQZ_API||'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(x){return x.json();}).then(function(j){if(j&&j.ok)done();else fail();}).catch(fail);}});
 draw();
});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dqzInit);else dqzInit();
})();</script>
DQZASSETS;
}
function dabul_quiz_box($id) {
	$id = preg_replace('/[^a-z]/', '', (string) $id);
	if (!in_array($id, array('evict', 'split', 'renew'), true)) return '';
	return dabul_quiz_assets() . '<div class="dqz" dir="rtl" data-quiz="' . esc_attr($id) . '"><div class="box"><p class="k">בדיקה קצרה</p><p>השאלון נטען. אפשר גם להתקשר: 09-8613413</p></div></div>';
}
add_shortcode('dabul_quiz', function ($atts) { $a = shortcode_atts(array('id' => ''), $atts); return dabul_quiz_box($a['id']); });
function dabul_quiz_map() {
	$def = array(
		3121 => array('evict', 'כל יום שעובר'),
		3611 => array('split', '3 טיפים מעשיים'),
		3629 => array('split', '3 טיפים מעשיים'),
		6643 => array('split', 'מה הצעד הבא'),
		35 => array('renew', 'שאלות ותשובות'),
	);
	$o = get_option('dabul_quiz_map', null);
	return is_array($o) && $o ? $o : $def;
}
add_filter('the_content', function ($html) {
	static $used = array();
	if (is_admin() || !is_singular() || !in_the_loop() || !is_main_query()) return $html;
	$pid = get_the_ID();
	$map = dabul_quiz_map();
	if (empty($map[$pid]) || !empty($used[$pid]) || strpos($html, 'data-quiz=') !== false) return $html;
	$used[$pid] = true;
	list($quiz, $anchor) = array_pad((array) $map[$pid], 2, '');
	$box = '<div class="dqz-wrap" style="margin:32px 0">' . dabul_quiz_box($quiz) . '</div>';
	if ($anchor && preg_match_all('#<h2\b[^>]*>(.*?)</h2>#is', $html, $m, PREG_OFFSET_CAPTURE)) {
		foreach ($m[0] as $i => $h) {
			if (mb_strpos(wp_strip_all_tags($m[1][$i][0]), $anchor) !== false) return substr($html, 0, $h[1]) . $box . substr($html, $h[1]);
		}
	}
	return $html . $box;
}, 31);
