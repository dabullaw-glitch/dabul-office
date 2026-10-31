/*dabul-calc-core-v1: hub + calculator pages*/(function(){
var R=document.querySelector('.dt3'); if(!R) return;
var nf=new Intl.NumberFormat('he-IL',{maximumFractionDigits:0}), pf=new Intl.NumberFormat('he-IL',{maximumFractionDigits:2});
var ILS=function(n){return nf.format(Math.round(n))+' ₪';};
var num=function(el){return +String(el.value).replace(/[^\d.]/g,'')||0;};
function money(el){el.addEventListener('input',function(){var d=String(el.value).replace(/[^\d]/g,'').slice(0,9);el.value=d?nf.format(+d):'';});}
R.querySelectorAll('.money input').forEach(money);
// purchase tax 2026 (frozen until 15.1.2028)
var B={single:[[0,1978745,0],[1978745,2347040,.035],[2347040,6055070,.05],[6055070,20183565,.08],[20183565,1/0,.1]],extra:[[0,6055070,.08],[6055070,1/0,.1]]};
var COL=['#d8cfbd','#e4d19c','#c9a961','#a8873f','#6e5524'];
function tax(p,t){var s=0,rows=[];B[t].forEach(function(b,i){if(p>b[0]){var part=Math.min(p,b[1])-b[0],v=part*b[2];s+=v;rows.push({i:i,from:b[0],to:Math.min(p,b[1]),part:part,rate:b[2],v:v});}});return {sum:Math.round(s),rows:rows};}
// HERO
(function(){var H=R.querySelector('[data-calc=hero]');if(!H)return;var inp=H.querySelector('#h-price'),t='single';
 function go(){var p=num(inp),x=tax(p,t);H.querySelector('[data-o=tax]').textContent=ILS(x.sum);H.querySelector('[data-o=rate]').textContent='שיעור אפקטיבי: '+(p?pf.format(x.sum/p*100):0)+'% מהמחיר';
  var bar=H.querySelector('[data-o=bar]'),leg=H.querySelector('[data-o=leg]');bar.innerHTML='';leg.innerHTML='';
  x.rows.forEach(function(r){var i=document.createElement('i');i.style.width=(p?r.part/p*100:0)+'%';i.style.background=COL[t==='single'?r.i:r.i+2];bar.appendChild(i);
   var s=document.createElement('span'),e=document.createElement('em');e.style.background=COL[t==='single'?r.i:r.i+2];s.appendChild(e);s.appendChild(document.createTextNode(pf.format(r.rate*100)+'% על '+nf.format(r.part)+' ₪'));leg.appendChild(s);});}
 inp.addEventListener('input',go);H.querySelector('.seg').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;H.querySelectorAll('.seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});t=b.getAttribute('data-v');go();});go();})();
// WORKBENCH tabs
var tabs=[].slice.call(R.querySelectorAll('.tabs button'));
function openTab(id){tabs.forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-t')===id?'true':'false');});R.querySelectorAll('.pane').forEach(function(p){p.hidden=p.getAttribute('data-p')!==id;});}
tabs.forEach(function(b){b.addEventListener('click',function(){openTab(b.getAttribute('data-t'));});});
/* deep link: /calculators/#calc-tax opens that calculator */
function fromHash(){var m=/^#calc-([a-z]+)$/.exec(location.hash||'');if(!m)return;var ok=tabs.some(function(b){return b.getAttribute('data-t')===m[1];});if(!ok)return;openTab(m[1]);var wb=document.getElementById('wb');if(wb)wb.scrollIntoView({block:'start'});}
fromHash();window.addEventListener('hashchange',fromHash);
R.querySelectorAll('[data-open]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();openTab(a.getAttribute('data-open'));R.querySelector('#wb').scrollIntoView({behavior:'smooth'});});});
function pane(id,fn){var P=R.querySelector('[data-p='+id+']');if(!P)return;var I=function(k){return P.querySelector('[data-i='+k+']');},O=function(k){return P.querySelector('[data-o='+k+']');};
 var run=function(){fn(I,O,P);};P.querySelectorAll('input,select').forEach(function(x){x.addEventListener('input',run);x.addEventListener('change',run);});run();}
pane('tax',function(I,O){var p=num(I('price')),x=tax(p,I('type').value),box=O('rows');box.innerHTML='';
 x.rows.forEach(function(r){var d=document.createElement('div');d.className='r';var s=document.createElement('span');s.textContent=pf.format(r.rate*100)+'% על '+nf.format(r.from)+' עד '+nf.format(r.to);var b=document.createElement('b');b.textContent=ILS(r.v);d.appendChild(s);d.appendChild(b);box.appendChild(d);});
 O('sum').textContent=ILS(x.sum);});
pane('eq',function(I,O){var p=num(I('price')),k=I('kind').value,ltv={first:.75,replace:.7,inv:.5}[k],loan=p*ltv,t=tax(p,k==='inv'?'extra':'single').sum,ex=num(I('extra'));
 O('loan').textContent=ILS(loan);O('eqp').textContent=ILS(p-loan);O('tax').textContent=ILS(t);O('ex').textContent=ILS(ex);O('tot').textContent=ILS(p-loan+t+ex);});
pane('pmt',function(I,O){var L=num(I('loan')),y=+I('years').value,r=(parseFloat(String(I('rate').value).replace(',','.'))||0)/1200,n=y*12,m=r?L*r/(1-Math.pow(1+r,-n)):L/n,inc=num(I('inc'));
 O('yrs').textContent=y;O('m').textContent=ILS(m);O('all').textContent=ILS(m*n);O('int').textContent=ILS(m*n-L);
 var w=O('ptiw');if(inc>0){w.hidden=false;var q=m/inc*100;O('pti').textContent=pf.format(q)+'%';O('g').style.width=Math.min(100,q*2)+'%';O('ptin').textContent=q<=33?'החזר עד שליש מההכנסה נחשב בדרך כלל נוח.':q<=40?'בין שליש ל־40%: הבנק יבדוק בקפידה.':'מעל 40%: גבוה. בנק ישראל מגביל החזר של עד 50% מההכנסה.';}else w.hidden=true;});
pane('dates',function(I,O){var v=I('d').value;if(!v){var t=new Date();v=t.toISOString().slice(0,10);I('d').value=v;}var d0=new Date(v+'T12:00:00'),f=function(n){var d=new Date(d0);d.setDate(d.getDate()+n);return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric',year:'numeric'});};
 var buy=I('side').value==='buy',L=buy?[['מיד','רישום הערת אזהרה לטובתכם בטאבו, לפני העברת רוב הכסף'],[f(30),'הגשת הצהרה לרשות המסים (בדרך כלל עורך הדין מגיש)'],[f(60),'תשלום מס רכישה לפי השובר'],['לפי החוזה','מסירת החזקה ופרוטוקול מסירה'],['אחרי האישורים','רישום הדירה על שמכם וקבלת נסח מעודכן']]:[[f(30),'הגשת הצהרה לרשות המסים על המכירה'],['לפי השומה','תשלום מס שבח, או קבלת אישור על פטור'],['לפני המסירה','אישור עירייה: תשלום ארנונה, מים והיטל השבחה אם חל'],['לפי החוזה','סילוק המשכנתא ומסירת החזקה'],['אחרי האישורים','חתימה על שטר מכר ורישום הדירה על שם הקונים']];
 var box=O('tl');box.innerHTML='';L.forEach(function(x){var d=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');b.textContent=x[0];s.textContent=x[1];d.appendChild(b);d.appendChild(s);box.appendChild(d);});});
pane('yield',function(I,O){var p=num(I('price')),r=num(I('rent'))*12,c=num(I('cost')),t=tax(p,'extra').sum;O('yr').textContent=ILS(r);O('g').textContent=(p?pf.format(r/p*100):0)+'%';O('tax').textContent=ILS(t);O('n').textContent=(p?pf.format((r-c)/(p+t)*100):0)+'%';});
pane('rent',function(I,O){var r=num(I('rent')),m=+I('months').value,a=r*3,b=r*m/3;O('mo').textContent=m;O('a').textContent=ILS(a);O('b').textContent=ILS(b);O('max').textContent=ILS(Math.min(a,b));});
pane('levy',function(I,O){var b=num(I('before')),a=num(I('after')),sh=+I('share').value,ex=I('ex').value,up=Math.max(0,a-b),mine=up*sh/100,lv=ex==='none'?mine*0.5:0;O('sh').textContent=sh;O('up').textContent=ILS(up);O('mine').textContent=ILS(mine);O('levy').textContent=ILS(lv);O('save').textContent=ILS(lv*0.25);O('note').textContent=ex==='enl'?'בהרחבת דירת מגורים עד 140 מ״ר יש פטור בתנאים שבחוק, ולכן ההיטל מוצג כאפס. אם מוכרים זמן קצר אחרי ההרחבה, או אם התנאים לא מתקיימים, ייתכן חיוב מלא או חלקי ('+ILS(mine*0.5)+' בלי פטור).':ex==='t38'?'בתמ״א 38 יש פטור מהיטל השבחה על הזכויות לפי התוכנית, בתנאים שבחוק, ולכן ההיטל מוצג כאפס. בלי הפטור ההיטל היה '+ILS(mine*0.5)+'.':'זו הערכה. הסכום הסופי נקבע בשומה של הוועדה המקומית, ובדרך כלל הוא צמוד למדד עד התשלום. אפשר לחלוק על השומה.';});
pane('ry',function(I,O){var p=num(I('price')),r=num(I('rent')),mon=num(I('mon')),yr=num(I('yr')),v=+I('vac').value,tr=I('track').value,rate=+I('rate').value,CAP=5654,inc=r*(12-v),cost=mon*12+yr,t=0;O('vm').textContent=v;
 if(tr==='ex'){var part=r<=CAP?0:(r>=2*CAP?r:2*r-2*CAP);t=part*(12-v)*rate;}else if(tr==='ten'){t=inc*0.1;}else{t=Math.max(0,inc-cost)*rate;}
 var pt=tax(p,'extra').sum,net=inc-cost-t;O('inc').textContent=ILS(inc);O('g').textContent=(p?pf.format(r*12/p*100):0)+'%';O('cost').textContent=ILS(cost);O('tx').textContent=ILS(t);O('n').textContent=(p?pf.format(net/(p+pt)*100):0)+'%';O('m').textContent=ILS(net/12);
 O('note').textContent='התשואה נטו מחושבת על מחיר הדירה בתוספת מס רכישה של דירה נוספת ('+ILS(pt)+'), לפני מימון ובלי עליית ערך. תקרת הפטור ('+nf.format(CAP)+' ₪ בחודש, 2026) חלה על כל ההכנסה משכירות למגורים יחד.';});
pane('sell',function(I,O){var p=num(I('price')),l=num(I('loan')),b=p*(parseFloat(String(I('brk').value).replace(',','.'))||0)/100*1.18,t=num(I('tax')),o=num(I('other'));
 O('loan').textContent=ILS(l);O('brk').textContent=ILS(b);O('tax').textContent=ILS(t);O('other').textContent=ILS(o);O('net').textContent=ILS(p-l-b-t-o);});
pane('shevach',function(I,O){var own=I('own').value,held=I('held').value,prev=I('prev').value,high=I('high').value,r;
 if(own==='more')r=['שימו לב','כנראה לא בפטור של דירה יחידה','כשיש עוד דירה, הפטור הרגיל על דירה יחידה בדרך כלל לא חל. ייתכנו מסלולים אחרים, למשל חישוב ליניארי מוטב לדירה שנקנתה לפני 2014, או מכירת דירה כדי לקנות דירה חלופית.'];
 else if(held==='lt')r=['עוד לא','עוד לא עברו 18 חודשים','בדרך כלל צריך שהדירה תהיה בבעלותכם לפחות 18 חודשים. אם המכירה יכולה לחכות, כדאי לבדוק את המועד המדויק.'];
 else if(prev==='yes')r=['צריך בדיקה','הפטור ניתן פעם ב־18 חודשים','מי שמכר דירה אחרת בפטור ב־18 החודשים האחרונים בדרך כלל לא יקבל שוב את אותו פטור עכשיו. כדאי לבדוק את התאריכים.'];
 else if(high!=='no')r=['כנראה כן, עם תקרה','כנראה זכאים לפטור, אבל יש תקרה','לפטור המלא יש תקרת שווי שמתעדכנת כל שנה. על החלק שמעל התקרה משלמים מס. כדאי לבדוק את הסכום המדויק.'];
 else r=['כנראה כן','כנראה זכאים לפטור ממס שבח','לפי התשובות, נראה שהמכירה עומדת בתנאים העיקריים לפטור על דירה יחידה.'+(own==='small'?' חלק קטן בדירה נוספת או דירה בירושה לא תמיד מונעים את הפטור, אבל צריך לבדוק את הפרטים.':'')];
 O('tag').textContent=r[0];O('t').textContent=r[1];O('d').textContent=r[2];});
pane('lease',function(I,O){var v=I('end').value;if(!v){var t=new Date();t.setMonth(t.getMonth()+6);v=t.toISOString().slice(0,10);I('end').value=v;}var e=new Date(v+'T12:00:00'),f=function(n){var d=new Date(e);d.setDate(d.getDate()+n);return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric',year:'numeric'});};
 var L=[['עד '+f(-90),'משכיר שלא רוצה להאריך, או שרוצה לשנות תנאים לתקופה נוספת, מודיע לשוכר'],['עד '+f(-60),'שוכר שרוצה להאריך לפי אפשרות שבחוזה מודיע למשכיר'],[f(0),'סיום השכירות: פינוי, קריאת מונים ופרוטוקול החזרה'],['עד '+f(60),'המשכיר מחזיר את הבטוחה, אלא אם יש חוב של השוכר']];
 var box=O('tl');box.innerHTML='';L.forEach(function(x){var d=document.createElement('div'),b=document.createElement('b'),s2=document.createElement('span');b.textContent=x[0];s2.textContent=x[1];d.appendChild(b);d.appendChild(s2);box.appendChild(d);});});
pane('index',function(I,O){var a=num(I('amt')),b=parseFloat(String(I('b').value).replace(',','.'))||0,n=parseFloat(String(I('n').value).replace(',','.'))||0,q=b?n/b-1:0;
 O('p').textContent=(q>=0?'+':'')+pf.format(q*100)+'%';O('d').textContent=ILS(a*q);O('v').textContent=ILS(a*(1+q));});

var D=function(v){return new Date(v+'T12:00:00');},addM=function(d,m){var x=new Date(d);x.setMonth(x.getMonth()+m);return x;},addY=function(d,y){var x=new Date(d);x.setFullYear(x.getFullYear()+y);return x;},fd=function(d){return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric',year:'numeric'});},iso=function(d){return d.toISOString().slice(0,10);};
pane('late',function(I,O){var now=new Date();now.setHours(12,0,0,0);if(!I('due').value){I('due').value=iso(addM(now,-7));}if(!I('got').value){I('got').value=iso(now);}
 var due=D(I('due').value),got=D(I('got').value),rent=num(I('rent')),box=O('rows');box.innerHTML='';
 var days=Math.max(0,Math.round((got-due)/864e5));O('dl').textContent=days?(days+' ימים, בערך '+pf.format(days/30.44)+' חודשים'):'אין איחור';
 if(I('when').value==='old'){O('sum').textContent='צריך בדיקה';var d0=document.createElement('div');d0.className='r';d0.innerHTML='<span>בחוזה שנחתם לפני 7.7.2022 חלים כללים אחרים. כדאי לבדוק את החוזה שלכם.</span>';box.appendChild(d0);return;}
 var daily=rent*12/365,T=[[addM(due,1),addM(due,4),1,'מהחודש השני עד הרביעי: פי 1'],[addM(due,4),addM(due,10),1.25,'מהחודש החמישי עד העשירי: פי 1.25'],[addM(due,10),null,1.5,'מהחודש ה־11 ואילך: פי 1.5']],tot=0;
 var r0=document.createElement('div');r0.className='r';var s0=document.createElement('span');s0.textContent='החודש הראשון: בלי פיצוי';var b0=document.createElement('b');b0.textContent=ILS(0);r0.appendChild(s0);r0.appendChild(b0);if(days>0)box.appendChild(r0);
 T.forEach(function(t){var a=t[0],e=t[1]&&t[1]<got?t[1]:got;var n=Math.max(0,Math.round((e-a)/864e5));if(!n)return;var v=n*daily*t[2];tot+=v;var r=document.createElement('div');r.className='r';var s=document.createElement('span');s.textContent=t[3]+' ('+n+' ימים)';var b=document.createElement('b');b.textContent=ILS(v);r.appendChild(s);r.appendChild(b);box.appendChild(r);});
 O('sum').textContent=ILS(tot);});
// court fees 2026 (תקנות בתי המשפט (אגרות), התשס"ז-2007, התוספת; amounts as updated 1.1.2026)
pane('court',function(I,O,P){var c=I('court').value,t=I('type').value,a=num(I('amt')),F={s:{min:893,non:774,oth:2012,app:1654,bra:588,ded:839},d:{non:1363,oth:3762,app:3539,bra:588,ded:1429}},f=F[c],T=28580660,tot=0,two=t==='money',lbl={s:'בית משפט השלום',d:'בית המשפט המחוזי'}[c];
 var tenOpt=I('type').querySelector('option[value=ten]');if(tenOpt){tenOpt.disabled=c!=='s';if(c!=='s'&&t==='ten'){I('type').value='money';t='money';two=true;}}
 I('amt').closest('.fld').hidden=!two;
 if(two){tot=c==='s'?Math.max(a*.025,f.min):Math.min(a,T)*.025+Math.max(0,a-T)*.01;}
 else tot=t==='ten'?285:f[t];
 tot=Math.round(tot);var h1=two?Math.round(tot/2):tot,h2=two?tot-h1:0;
 O('tot').textContent=ILS(tot);O('h1').textContent=ILS(h1);O('h2').textContent=two?ILS(h2):'אין';
 O('ref').textContent=two?ILS(Math.max(0,h1-f.ded)):'לא רלוונטי';
 var n='';if(two){n=c==='s'&&a*.025<f.min?'הסכום נמוך, ולכן חלה האגרה המזערית בבית משפט השלום: '+ILS(f.min)+'. ':'';n+='החישוב לפי 2.5% מסכום התביעה'+(c==='d'&&a>T?', ו-1% על החלק שמעל '+ILS(T):'')+', ב'+lbl+'.';}
 else n={non:'אגרה קבועה לתביעה לסעד שאינו כספי (למשל צו הצהרתי, צו עשה, צו מניעה, אכיפה או פירוק שותפות), ב'+lbl+'.',oth:'אגרה קבועה לתביעה אחרת, שאינה תביעה כספית ואינה מהסוגים של הסעד שאינו כספי, ב'+lbl+'.',ten:'אגרה קבועה לתביעה בבית הדין לשכירות.',app:c==='s'?'ערעור על פסק דין של בית משפט השלום (מוגש לבית המשפט המחוזי).':'ערעור על פסק דין של בית המשפט המחוזי (מוגש לבית המשפט העליון).',bra:c==='s'?'בקשת רשות ערעור על החלטת ביניים של בית משפט השלום.':'בקשת רשות ערעור על החלטת ביניים של בית המשפט המחוזי.'}[t];
 O('note').textContent=n;});
pane('defects',function(I,O){var now=new Date();now.setHours(12,0,0,0);if(!I('got').value){I('got').value=iso(addY(now,-2));}var g=D(I('got').value),box=O('rows');box.innerHTML='';
 [['ליקוי רגיל אחר',1],['אינסטלציה, כולל חימום ומרזבים',2],['רטיבות בקירות ובמקלט',3],['מכונות, מנועים ודודים',3],['שקיעת ריצוף בקומת הקרקע ובשבילים',3],['סדקים עוברים בקירות ובתקרות',5],['התקלפות ניכרת של חיפוי חיצוני',7]].forEach(function(x){
  var be=addY(g,x[1]),ae=addY(be,3),d=document.createElement('div'),t=document.createElement('b'),st=document.createElement('i'),s=document.createElement('span');t.textContent=x[0];
  if(now<be){st.className='b';st.textContent='בתוך תקופת הבדק';}else if(now<ae){st.className='a';st.textContent='בתוך תקופת האחריות';}else{st.className='x';st.textContent='התקופות הסתיימו';}
  s.textContent='בדק '+x[1]+(x[1]===1?' שנה':' שנים')+': עד '+fd(be)+' · אחריות: עד '+fd(ae);d.appendChild(t);d.appendChild(st);d.appendChild(s);box.appendChild(d);});});
// capital gains tax (מס שבח), individual, residential apartment bought from 1.1.1994. Real gain split by days:
// regular (sec. 48א(ב1)): up to 7.11.2001 marginal (max 47%), to 1.1.2012 20%, after 25%; linear-beneficial (sec. 48א(ב2)): up to 1.1.2014 exempt, after 25%.
pane('cgt',function(I,O){var bp=num(I('bp')),sp=num(I('sp')),ex=num(I('ex')),dec=function(k){return parseFloat(String(I(k).value).replace(',','.'))||0;},bi=dec('bi'),si=dec('si'),lin=I('lin').value==='yes',box=O('rows');box.innerHTML='';
 var nom=sp-bp-ex,inf=bi&&si?Math.max(0,(bp+ex)*(si/bi-1)):0,real=Math.max(0,nom-inf);O('nom').textContent=ILS(nom);O('inf').textContent=ILS(inf);O('real').textContent=ILS(real);
 var bv=I('bd').value,sv=I('sd').value;
 if(!bv||!sv||D(sv)<=D(bv)){O('tax').textContent='חסר תאריך';O('note').textContent='מקלידים תאריך קנייה ותאריך מכירה מאוחר ממנו.';return;}
 if(!bi||!si){O('tax').textContent='חסר מדד';O('note').textContent='מקלידים את המדד הידוע ביום הקנייה ואת המדד הידוע ביום המכירה, באותו בסיס.';return;}
 var bd=D(bv),sd=D(sv),T0=D('2001-11-07'),T1=D('2012-01-01'),T2=D('2014-01-01'),lo=D('1900-01-01'),hi=D('2200-01-01');
 if(bd<D('1994-01-01')){O('tax').textContent='צריך בדיקה';O('note').textContent='דירה שנקנתה לפני 1994 מחושבת לפי כללים נוספים, ולכן המחשבון לא מתאים לה.';return;}
 var dd=function(a,b){return Math.max(0,Math.round((b-a)/864e5));},all=dd(bd,sd),seg=function(a,b){var s=a>bd?a:bd,e=b<sd?b:sd;return e>s?dd(s,e):0;};
 var calc=function(L){var P=L?[['החלק שעד 1.1.2014',seg(lo,T2),0],['החלק מ־1.1.2014',seg(T2,hi),.25]]:[['החלק שעד 7.11.2001',seg(lo,T0),.47],['החלק שמ־7.11.2001 עד 1.1.2012',seg(T0,T1),.2],['החלק מ־1.1.2012',seg(T1,hi),.25]],t=0,rows=[];
  P.forEach(function(p){if(!p[1])return;var part=real*p[1]/all,v=part*p[2];t+=v;rows.push([p[0]+' ('+pf.format(p[1]/all*100)+'% מהתקופה): '+(p[2]?(p[2]===.47?'עד 47%':pf.format(p[2]*100)+'%')+' על '+nf.format(Math.round(part))+' ₪':'פטור על '+nf.format(Math.round(part))+' ₪'),v]);});return {t:t,rows:rows};};
 var x=calc(lin);x.rows.forEach(function(r){var d=document.createElement('div');d.className='r';var s=document.createElement('span');s.textContent=r[0];var b=document.createElement('b');b.textContent=ILS(r[1]);d.appendChild(s);d.appendChild(b);box.appendChild(d);});
 O('tax').textContent=ILS(x.t);var n=[];
 if(real<=0)n.push('לפי הנתונים אין שבח ריאלי, ולכן אין מס שבח. עדיין צריך לדווח על המכירה לרשות המסים.');
 else{if(lin&&bd>=T2)n.push('דירה שנקנתה מ־1.1.2014 לא נהנית מחישוב ליניארי מוטב, ולכן כל השבח הריאלי מחושב לפי 25%.');
  if(!lin&&bd<T2){var y=calc(true).t;if(y<x.t)n.push('אם הדירה עומדת בתנאים לחישוב ליניארי מוטב, המס המשוער יורד ל־'+ILS(y)+'.');}
  if(!lin&&bd<T0)n.push('בחלק שעד 7.11.2001 המס הוא לפי מדרגות מס הכנסה, עד 47%. המחשבון לוקח 47%, ולכן המס בפועל יכול להיות נמוך יותר.');
  if(!lin&&bd>=T0&&bd<D('2004-01-01'))n.push('מי שקנה בין 7.11.2001 לסוף 2003 עשוי להיות זכאי להנחה נוספת במס, שהמחשבון לא מחשב.');}
 n.push('זו הערכה כללית בלבד ואינה ייעוץ משפטי.');O('note').textContent=n.join(' ');});
// JOURNEY: highlight tools of the chosen stage
var stops=[].slice.call(R.querySelectorAll('.stop'));
stops.forEach(function(s){s.addEventListener('click',function(){var on=s.getAttribute('aria-pressed')!=='true',st=s.getAttribute('data-s');
 stops.forEach(function(x){x.setAttribute('aria-pressed',x===s&&on?'true':'false');});
 R.querySelectorAll('.cat a,.ccard').forEach(function(a){a.classList.toggle('dim',on&&(' '+a.getAttribute('data-s')+' ').indexOf(' '+st+' ')<0);});
 var first=null;tabs.forEach(function(b){var hit=on&&(' '+b.getAttribute('data-s')+' ').indexOf(' '+st+' ')>-1;b.style.boxShadow=hit?'inset 0 0 0 2px #a8873f':'';if(hit&&!first)first=b;});
 if(first)openTab(first.getAttribute('data-t'));});});
// QUICK CHECKS
var host=R.querySelector('[data-qhost]')||document.createElement('div');
R.querySelectorAll('.chk').forEach(function(c){c.addEventListener('click',function(){var open=c.getAttribute('aria-expanded')==='true';R.querySelectorAll('.chk').forEach(function(x){x.setAttribute('aria-expanded','false');});host.innerHTML='';if(open)return;c.setAttribute('aria-expanded','true');
 host.innerHTML='<div class="dqz" dir="rtl" data-quiz="'+c.getAttribute('data-q')+'"><div class="box"></div></div>';if(window.dqzInit)window.dqzInit();host.scrollIntoView({behavior:'smooth',block:'nearest'});});});
// GLOSSARY flip
R.querySelectorAll('.term').forEach(function(t){var q=t.querySelector('span:not(.q)').textContent;t.addEventListener('click',function(){var o=t.getAttribute('aria-expanded')==='true';t.setAttribute('aria-expanded',o?'false':'true');t.querySelector('span:not(.q)').textContent=o?q:t.getAttribute('data-a');t.querySelector('.q').textContent=o?'להסבר ←':'סגירה';});});
})();
