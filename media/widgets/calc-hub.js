/*dabul-tools-hub-v4*/(function(){
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
(function(){var H=R.querySelector('[data-calc=hero]'),inp=H.querySelector('#h-price'),t='single';
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
function pane(id,fn){var P=R.querySelector('[data-p='+id+']'),I=function(k){return P.querySelector('[data-i='+k+']');},O=function(k){return P.querySelector('[data-o='+k+']');};
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
// JOURNEY: highlight tools of the chosen stage
var stops=[].slice.call(R.querySelectorAll('.stop'));
stops.forEach(function(s){s.addEventListener('click',function(){var on=s.getAttribute('aria-pressed')!=='true',st=s.getAttribute('data-s');
 stops.forEach(function(x){x.setAttribute('aria-pressed',x===s&&on?'true':'false');});
 R.querySelectorAll('.cat a').forEach(function(a){a.classList.toggle('dim',on&&(' '+a.getAttribute('data-s')+' ').indexOf(' '+st+' ')<0);});
 var first=null;tabs.forEach(function(b){var hit=on&&(' '+b.getAttribute('data-s')+' ').indexOf(' '+st+' ')>-1;b.style.boxShadow=hit?'inset 0 0 0 2px #a8873f':'';if(hit&&!first)first=b;});
 if(first)openTab(first.getAttribute('data-t'));});});
// QUICK CHECKS
var host=R.querySelector('[data-qhost]');
R.querySelectorAll('.chk').forEach(function(c){c.addEventListener('click',function(){var open=c.getAttribute('aria-expanded')==='true';R.querySelectorAll('.chk').forEach(function(x){x.setAttribute('aria-expanded','false');});host.innerHTML='';if(open)return;c.setAttribute('aria-expanded','true');
 host.innerHTML='<div class="dqz" dir="rtl" data-quiz="'+c.getAttribute('data-q')+'"><div class="box"></div></div>';if(window.dqzInit)window.dqzInit();host.scrollIntoView({behavior:'smooth',block:'nearest'});});});
// GLOSSARY flip
R.querySelectorAll('.term').forEach(function(t){var q=t.querySelector('span:not(.q)').textContent;t.addEventListener('click',function(){var o=t.getAttribute('aria-expanded')==='true';t.setAttribute('aria-expanded',o?'false':'true');t.querySelector('span:not(.q)').textContent=o?q:t.getAttribute('data-a');t.querySelector('.q').textContent=o?'להסבר ←':'סגירה';});});
})();
