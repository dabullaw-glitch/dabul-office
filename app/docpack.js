(function(t){const{esc:p,icon:m,money:L,fmtDate:w,today:D}=t,f=()=>t.settings(),y=(e,n=10)=>e==null||e===""?"_".repeat(n):String(e);t.dealParties=e=>{const n=t.dealClients(e).map(d=>({name:d.name,idNo:d.idNo||"",address:d.address||""})),s=e.parties||{},i=t.isBuyer(e)&&e.side!=="שני צדדים";let l=(s.sellers||[]).filter(d=>d&&d.name),r=(s.buyers||[]).filter(d=>d&&d.name);return e.side==="שני צדדים"?{sellers:l,buyers:r}:(i?r=r.length?r:n:l=l.length?l:n,{sellers:l,buyers:r})};const S=e=>`${e.name}, ת"ז ${y(e.idNo)}${e.address?`, מען: ${e.address}`:""}`,v=e=>e.length?e.map((n,s)=>`${s+1}. ${S(n)}`).join(`
`):`1. ${"_".repeat(24)}, ת"ז ${"_".repeat(10)}`,g=e=>e.length?e.map(n=>n.name).join(", "):"_".repeat(20),I=e=>`גוש ${y(e.gush,6)} חלקה ${y(e.chelka,4)}${e.sub?` תת חלקה ${e.sub}`:" תת חלקה ____"}`,P=e=>e.city||(String(e.address||"").split(",").pop()||"").trim()||f().city,C=e=>t.isBuyer(e)?f().lawyer:e.oppLawyer||"_".repeat(20),j=e=>!t.isBuyer(e)||e.side==="שני צדדים"?f().lawyer:e.oppLawyer||"_".repeat(20),T=e=>`
אימות חתימה
אני הח"מ, ${f().lawyer}, מאשר/ת כי ביום ____________ הופיע/ו בפניי ${e}, שזוהו על ידי לפי תעודות הזהות שלהם, וחתמו בפניי על מסמך זה לאחר שהסברתי להם את משמעותו ואת תוצאותיו המשפטיות.

____________________
${f().lawyer}, עו"ד`,u=t.DOC_TEMPLATES;delete u.bank,u.warning={t:"בקשה לרישום הערת אזהרה",need:"deal",body:e=>{const{sellers:n,buyers:s}=t.dealParties(e);return`**בקשה לרישום הערת אזהרה**
(לפי סעיף 126 לחוק המקרקעין, התשכ"ט-1969)

לכבוד
לשכת רישום המקרקעין ${P(e)}

**פרטי המקרקעין**
${I(e)}
כתובת: ${y(e.address,30)}
${e.propertyDesc?`תיאור: ${e.propertyDesc}
`:""}החלק בזכויות: ${e.share||"בשלמות"}

**בעל/י הזכויות הרשום/ים (המתחייב/ים)**
${v(n)}

**הזכאי/ם שלטובתו/ם תירשם ההערה**
${v(s)}

**מהות ההתחייבות**
התחייבות להעביר לזכאי/ם את הזכויות במקרקעין הנ"ל, בהתאם להסכם המכר מיום ${e.signDate?w(e.signDate):"__________"}, ולהימנע מכל עסקה בניגוד להתחייבות זו.

אני/אנו הח"מ, בעל/י הזכויות במקרקעין, מבקש/ים לרשום הערת אזהרה בדבר ההתחייבות האמורה לטובת הזכאי/ם.

חתימת בעל/י הזכויות: ____________________          תאריך: __________
${T(g(n))}`}},u.deed={t:"שטר מכר",need:"deal",body:e=>{const{sellers:n,buyers:s}=t.dealParties(e);return`**שטר מכר**
(מקרקעין)

**המקרקעין**
${I(e)}
כתובת: ${y(e.address,30)}
${e.propertyDesc?`תיאור: ${e.propertyDesc}
`:""}החלק הנמכר: ${e.share||"בשלמות"}

**המוכר/ים**
${v(n)}

**הקונה/ים**
${v(s)}
${s.length>1?`חלוקת הזכויות בין הקונים: בחלקים שווים
`:""}
**התמורה**: ${e.price?L(e.price):"____________ ₪"}

המוכר/ים מוכר/ים בזה לקונה/ים את החלק במקרקעין המפורט לעיל, והקונה/ים מסכים/ים לקנותו, והצדדים מבקשים לרשום את המכר בפנקסי המקרקעין.

חתימת המוכר/ים: ____________________
חתימת הקונה/ים: ____________________
${T(`${g(n)} (המוכר/ים) ו-${g(s)} (הקונה/ים)`)}`}},u.poa_seller={t:"ייפוי כוח בלתי חוזר מטעם המוכר",need:"deal",body:e=>{const{sellers:n,buyers:s}=t.dealParties(e);return`**ייפוי כוח בלתי חוזר**

אני/אנו הח"מ (להלן: "המוכר/ים"):
${v(n)}

ממנה/ים בזה את עו"ד ${C(e)} (להלן: "מיופה הכוח"), להיות בא/ת כוחי/נו ולפעול בשמי/נו ובמקומי/נו בכל הנוגע למקרקעין הידועים כ${I(e)}, ברחוב ${y(e.address,20)} (להלן: "הנכס"), ולשם כך:

1. לחתום על שטר מכר, בקשה לרישום הערת אזהרה, בקשה למחיקת הערות, וכל שטר, בקשה, תצהיר או מסמך אחר הדרושים להעברת הזכויות בנכס על שם ${g(s)} (להלן: "הקונה/ים") ולרישומן.
2. להופיע ולייצגני/נו בפני לשכת רישום המקרקעין, רשות מקרקעי ישראל, חברה משכנת, רשות המסים, הרשות המקומית וכל רשות אחרת, בכל הנוגע לעסקה.
3. לקבל, למסור ולחתום על כל אישור ומסמך הנדרשים לשם ביצוע האמור לעיל.

הואיל וזכויות הקונה/ים תלויות בייפוי כוח זה, הוא בלתי חוזר ואינו ניתן לביטול, והוא יחייב גם את יורשיי/נו ואת הבאים מכוחי/נו, בהתאם לסעיף 14(ב) לחוק השליחות, התשכ"ה-1965.

ולראיה באתי/נו על החתום: ____________________          תאריך: __________
${T(g(n))}`}},u.poa_delete={t:"ייפוי כוח למחיקת הערת אזהרה מטעם הקונה",need:"deal",body:e=>{const{sellers:n,buyers:s}=t.dealParties(e);return`**ייפוי כוח בלתי חוזר למחיקת הערת אזהרה**

אני/אנו הח"מ (להלן: "הקונה/ים"):
${v(s)}

ממנה/ים בזה את עו"ד ${j(e)} להיות בא/ת כוחי/נו, ולחתום בשמי/נו ובמקומי/נו על בקשה למחיקת הערת האזהרה שנרשמה או שתירשם לטובתי/נו על המקרקעין הידועים כ${I(e)}, ברחוב ${y(e.address,20)}, ולהגיש אותה ללשכת רישום המקרקעין או לכל רשות אחרת.

ייפוי כוח זה יופעל אך ורק אם הסכם המכר מיום ${e.signDate?w(e.signDate):"__________"} בין ${g(n)} (המוכר/ים) לבין הח"מ יבוטל כדין, ובכפוף להוראות ההסכם בעניין זה. ייפוי הכוח יוחזק בנאמנות בידי עו"ד ${j(e)} עד לרישום הזכויות על שם הקונה/ים או עד לביטול ההסכם, לפי המוקדם.

הואיל וזכויות המוכר/ים תלויות בייפוי כוח זה, הוא בלתי חוזר ואינו ניתן לביטול.

ולראיה באתי/נו על החתום: ____________________          תאריך: __________
${T(g(s))}`}},u.arnona={t:"הודעה על חילופי מחזיקים (ארנונה)",need:"deal",body:e=>{const{sellers:n,buyers:s}=t.dealParties(e);return`לכבוד
עיריית ${P(e)} - מחלקת ארנונה
${w(D())}

**הודעה על חילופי מחזיקים בנכס**

כתובת הנכס: ${y(e.address,30)}
${I(e)}
מועד מסירת החזקה: ${e.handDate?w(e.handDate):"__________"}

המחזיק/ים היוצא/ים (המוכר/ים): ${n.length?n.map(S).join("; "):"_".repeat(30)}
המחזיק/ים הנכנס/ים (הקונה/ים): ${s.length?s.map(S).join("; "):"_".repeat(30)}

קריאת מונה מים ביום המסירה: __________  מספר מונה: __________

הננו מודיעים כי החל ממועד מסירת החזקה, המחזיק/ים הנכנס/ים הוא/הם המחזיק/ים בנכס לעניין חיובי הארנונה והמים.

חתימת המוכר/ים: ____________        חתימת הקונה/ים: ____________
${f().office}`}},u.handover={t:"פרוטוקול מסירת חזקה",need:"deal",body:e=>{const{sellers:n,buyers:s}=t.dealParties(e);return`**פרוטוקול מסירת חזקה**

נערך ונחתם ביום ${e.handDate?w(e.handDate):"__________"} בנכס ברחוב ${y(e.address,30)}
${I(e)}

המוסר/ים (המוכר/ים): ${g(n)}
המקבל/ים (הקונה/ים): ${g(s)}

1. הקונה/ים ביקר/ו בנכס ומצא/ו אותו במצב המתאים להוראות הסכם המכר, למעט: ______________________________
2. קריאות מונים ביום המסירה:
   חשמל: __________ (מונה מס' __________)
   מים: __________ (מונה מס' __________)
   גז: __________
3. נמסרו לקונה/ים: ____ מפתחות דירה, ____ מפתחות תיבת דואר, ____ שלטים, מפתח מחסן / חניה: ____
4. הצדדים מאשרים כי החל ממועד זה החזקה בנכס עברה לקונה/ים, וכל החיובים השוטפים בגינו יחולו עליו/הם.

חתימת המוכר/ים: ____________        חתימת הקונה/ים: ____________
${f().office}`}},t.packageFor=e=>{const s=t.isBuyer(e)&&e.side!=="שני צדדים"?["warning","deed","poa_seller","poa_delete","arnona","handover","fee"]:["deed","poa_seller","poa_delete","municipality","arnona","handover","fee"];return e.side==="שני צדדים"&&s.unshift("warning"),[...new Set(s)].filter(i=>u[i])};const M=e=>{const{sellers:n,buyers:s}=t.dealParties(e),i=[];return(!e.gush||!e.chelka)&&i.push("גוש וחלקה"),n.length||i.push("פרטי המוכרים"),s.length||i.push("פרטי הקונים"),[...n,...s].some(l=>!l.idNo)&&i.push('מספרי ת"ז'),e.signDate||i.push("תאריך החוזה"),i},N=e=>String(e).replace(/[\\/:*?"<>|]/g,"").trim();t.makePackage=async(e,n,{download:s=!0}={})=>{const i=t.get("deals",e);if(!i)return 0;const l=t.dealClients(i),r=f();let d=0;const a=s&&window.JSZip?new JSZip:null,_=t.templateData?t.templateData(i):null;for(const c of n){const o=c.startsWith("my:")?Object.assign({key:c.slice(3)},(t.myTemplates()||{})[c.slice(3)]||{}):t.myTplFor?t.myTplFor(c):null;if(o&&o.url){const h=await t.fillWordTemplate(await t.fileBytes(o),_),k=`${o.label} - ${N(i.address)}.docx`,x=t.S.assets?await t.S.assets.upload(new File([h],k,{type:h.type})).catch(()=>null):null;await t.save("documents",`f-pack-${i.id}-${c.replace(/[^\w-]/g,"_")}`,{dealId:i.id,clientId:(i.clientIds||[])[0]||"",title:o.label,type:"generated",fileName:k,assetId:x&&x.id,url:x&&x.url,created:D(),pack:!0,fromTemplate:!0}),a?a.file(`${String(++d).padStart(2,"0")} ${N(o.label)}.docx`,h):d++;continue}const $=u[c];if(!$)continue;const b=$.body(i,l,r);await t.save("documents",`f-pack-${i.id}-${c}`,{dealId:i.id,clientId:(i.clientIds||[])[0]||"",title:$.t,type:"generated",content:b,created:D(),pack:!0}),a?a.file(`${String(++d).padStart(2,"0")} ${N($.t)}.docx`,await t.buildDocx($.t,b)):d++}return await t.log("deal",i.id,`הופקה חבילת מסמכים לעסקה (${d} מסמכים)`,"system"),a&&await t.download(`מסמכי עסקה - ${N(i.address)}.zip`,await a.generateAsync({type:"blob"})),d};const F=()=>{const e=t.myTemplates?t.myTemplates():{};return Object.keys(e).filter(n=>!(t.MY_TPL||[]).some(s=>s[0]===n&&s[2])).map(n=>["my:"+n,e[n].label])},B=t.packageFor;if(t.packageFor=e=>B(e).concat(F().map(n=>n[0])),t.act("doc-pack",(e,n)=>{const s=t.get("deals",n.id);if(!s)return;const i=t.packageFor(s),l=M(s),{sellers:r,buyers:d}=t.dealParties(s);t.modal({title:"הפקת כל מסמכי העסקה",wide:!0,body:`<p class="muted" style="margin-top:0">${p(s.address)} · ${p(s.side)}. כל מסמך מתמלא בפרטי הנכס ושני הצדדים, נשמר בתיק העסקה ויורד כקובץ Word לעריכה וחתימה.</p>
    ${l.length?`<div class="alert warn" style="margin-bottom:12px">${m("alert")}<div><b>חסר בעסקה: ${p(l.join(", "))}</b><br><span class="small">המסמכים יופקו עם קווים ריקים במקומות האלה. אפשר להשלים קודם ב"פרטי הצדדים" או ב"עריכה".</span></div></div>`:""}
    <div class="grid g2" style="margin-bottom:12px"><div class="card card-b small"><b>מוכרים</b><div class="muted">${r.map(a=>p(S(a))).join("<br>")||"לא הוזנו"}</div></div><div class="card card-b small"><b>קונים</b><div class="muted">${d.map(a=>p(S(a))).join("<br>")||"לא הוזנו"}</div></div></div>
    <div class="list card" style="box-shadow:none">${Object.keys(u).filter(a=>u[a].need==="deal"&&a!=="update").map(a=>[a,t.myTplFor&&t.myTplFor(a)?t.myTplFor(a).label:u[a].t,!!(t.myTplFor&&t.myTplFor(a))]).concat(F().map(a=>[a[0],a[1],!0])).map(([a,_,c])=>`<label class="li" style="cursor:pointer"><input type="checkbox" data-k="${a}"${i.includes(a)?" checked":""}><span class="grow"><b>${p(_)}</b><small>${c?"התבנית שלך (Word)":"נוסח מובנה של המערכת"}</small></span></label>`).join("")}</div>
    <p class="small muted" style="margin-bottom:0">המסמכים הם טיוטות מלאות לבדיקתך לפני חתימה. טפסים רשמיים של לשכת רישום המקרקעין יש למלא בנוסח הרשמי העדכני.</p>`,foot:`<button class="btn pri" id="pkgo">${m("download",15)} הפקה והורדה</button><button class="btn" id="pkpar">${m("users",14)} פרטי הצדדים</button><button class="btn" data-close>סגירה</button>`,onMount:(a,_)=>{a.querySelector("#pkpar").onclick=()=>{_(),t.ACT["parties-edit"](null,{id:s.id})},a.querySelector("#pkgo").onclick=async c=>{const o=c.currentTarget,$=t.packageFor(s),b=[...a.querySelectorAll("[data-k]:checked")].map(k=>k.dataset.k).sort((k,x)=>($.indexOf(k)+1||99)-($.indexOf(x)+1||99));if(!b.length)return;o.disabled=!0,o.innerHTML='<span class="spin"></span> מפיק...';const h=await t.makePackage(s.id,b);_(),t.toast(`הופקו ${h} מסמכים ונשמרו בתיק העסקה`)}}})}),t.act("parties-edit",(e,n)=>{const s=t.get("deals",n.id);if(!s)return;const{sellers:i,buyers:l}=t.dealParties(s),r=a=>a.map(_=>[_.name,_.idNo,_.address].filter(Boolean).join(", ")).join(`
`),d=a=>String(a||"").split(`
`).map(_=>_.split(",").map(c=>c.trim())).filter(_=>_[0]).map(([_,c="",...o])=>({name:_,idNo:c.replace(/[^\d]/g,""),address:o.join(", ")}));t.formModal({title:"פרטי הצדדים לעסקה",wide:!0,fields:[["sellers",'מוכרים: שורה לכל אדם (שם, ת"ז, כתובת)',"textarea",{full:!0,rows:3}],["buyers",'קונים: שורה לכל אדם (שם, ת"ז, כתובת)',"textarea",{full:!0,rows:3}],["city","עיר (ללשכת הרישום והעירייה)","text"],["share","החלק הנמכר","text",{ph:"בשלמות"}],["area","שטח במ״ר","text"],["propertyDesc","תיאור הנכס","text",{full:!0,ph:"דירת 4 חדרים בקומה 3, חניה ומחסן"}]],values:{sellers:r(i),buyers:r(l),city:s.city||"",share:s.share||"",area:s.area||"",propertyDesc:s.propertyDesc||""},onSubmit:async a=>{const _=(c,o)=>c.map($=>{const b=o.find(h=>h.name===$.name)||{};return Object.assign({first:b.first||"",last:b.last||"",share:b.share||""},$)});await t.patch("deals",s.id,{parties:{sellers:_(d(a.sellers),i),buyers:_(d(a.buyers),l)},city:a.city,share:a.share,area:a.area,propertyDesc:a.propertyDesc}),t.toast("פרטי הצדדים נשמרו")}})}),t.V.deal){const e=t.V.deal.render;t.V.deal.render=function(n){e.call(this,n);const s=t.get("deals",t.R.id);if(!s)return;const i=n.querySelector('[data-a="doc-for-deal"]');if(i){const l=document.createElement("button");l.className="btn sm pri",l.dataset.a="doc-pack",l.dataset.id=s.id,l.innerHTML=`${m("doc",14)} כל מסמכי העסקה`,i.parentElement.insertBefore(l,i);const r=document.createElement("button");r.className="btn sm",r.dataset.a="parties-edit",r.dataset.id=s.id,r.innerHTML=`${m("users",14)} פרטי הצדדים`,i.parentElement.insertBefore(r,i)}}}if(t.ACT["ex-create"]){const e=t.ACT["ex-create"];t.act("ex-create",async(n,s,i)=>{const l=t._ex&&t._ex.result,r=!(t._ex&&t._ex.target);if(await e(n,s,i),!l||t.R.view!=="deal")return;const d=t.R.id,a=c=>(c||[]).filter(o=>o&&(o.name||o.firstName)).map(o=>({name:o.name||`${o.firstName||""} ${o.lastName||""}`.trim(),first:o.firstName||"",last:o.lastName||"",idNo:String(o.idNo||"").replace(/[^\d]/g,""),address:o.address||"",share:o.share||""}));if(await t.patch("deals",d,{parties:{sellers:a(l.sellers),buyers:a(l.buyers)},city:l.city||"",share:l.share||"",propertyDesc:l.propertyDesc||"",area:l.area||"",sellerLawyer:l.sellerLawyer||"",buyerLawyer:l.buyerLawyer||""}),!r)return;const _=await t.makePackage(d,t.packageFor(t.get("deals",d)),{download:!1});t.toast(`העסקה נפתחה והוכנו ${_} מסמכים. לחץ "כל מסמכי העסקה" להורדה.`)})}t.V.incoming={title:"מסמכים נכנסים",render(e){const n=t.all("documents").filter(a=>a.type==="incoming").sort((a,_)=>(_.at||_.created||"").localeCompare(a.at||a.created||"")),s=n.filter(a=>a.inbox),i=n.filter(a=>!a.inbox).slice(0,60),l=t.all("clients").sort((a,_)=>a.name.localeCompare(_.name,"he")),r=t.get("settings","server")||{},d=a=>{const _=a.clientId&&t.get("clients",a.clientId),c=a.dealId&&t.get("deals",a.dealId);return`<div class="li"><span class="ic ${a.inbox?"i-warn":"i-ok"}">${m(a.inbox?"alert":"doc",15)}</span><div class="grow"><b>${p(a.title||a.fileName)}</b><small>${p(a.source==="telegram"?"הועבר בטלגרם":"וואטסאפ")}${a.senderName?" · "+p(a.senderName):""}${a.from?" · "+p(t.fmtPhone(a.from)):""} · ${w(a.created)}${_?` · <a data-a="go" data-v="client" data-id="${_.id}" href="#client">${p(_.name)}</a>`:""}${c?` · <a data-a="go" data-v="deal" data-id="${c.id}" href="#deal">${p(c.address)}</a>`:""}${a.inbox&&a.reason?" · "+p(a.reason):""}</small></div>
      ${a.url?`<a class="btn xs" href="${p(a.url)}" target="_blank" rel="noopener">${m("eye",12)} פתיחה</a>`:""}<button class="btn xs${a.inbox?" pri":" ghost"}" data-a="inc-assign" data-id="${a.id}">${a.inbox?"שיוך":m("edit",12)}</button></div>`};e.innerHTML=t.pageHead("מסמכים נכנסים","מסמכים שאתה מעביר לבוט בטלגרם או מעלה כאן. המערכת קוראת כל מסמך ומשייכת אותו לבד ללקוח ולעסקה.",`<button class="btn pri" data-a="inc-upload">${m("upload",16)} העלאת מסמכים לשיוך</button>`)+`<div class="grid g-main"><div class="grid" style="align-content:start">
    ${s.length?`<div class="card"><div class="card-h"><h2 style="color:var(--warn)">${m("alert",16)} מחכים לשיוך (${s.length})</h2></div><div class="list">${s.map(d).join("")}</div></div>`:""}
    <div class="card"><div class="card-h"><h2>שויכו לתיקים</h2><span class="sub">${i.length}</span></div><div class="list">${i.map(d).join("")||t.empty("עדיין לא התקבלו מסמכים","ברגע שלקוח ישלח מסמך בוואטסאפ, או שתעביר מסמך לבוט, הוא יופיע כאן וגם בכרטיס הלקוח.")}</div></div>
  </div><div class="grid" style="align-content:start"><div class="card"><div class="card-h"><h2>איך מעבירים מסמך</h2></div><div class="card-b small" style="display:grid;gap:10px">
    <div><b>מהטלפון</b><div class="muted">בוואטסאפ לוחצים לחיצה ארוכה על המסמך, ואז שיתוף (לא "העבר"), ובוחרים את בוט המשרד בטלגרם. אפשר להוסיף שם לקוח או כתובת כדי לעזור בזיהוי.</div></div><div><b>מהמחשב</b><div class="muted">לוחצים "העלאת מסמכים לשיוך" ובוחרים כמה קבצים שרוצים. כל מסמך נקרא ומשויך לבד.</div></div>
<div class="kv-row"><span>בוט טלגרם</span><b style="color:${r.telegramIn?"var(--ok)":"var(--muted)"}">${r.telegramIn?"מחובר":"לא מחובר"}</b></div>
    ${r.twilioInboundUrl?`<div><b>כתובת ל-Twilio</b><div class="btn-row"><input class="in" readonly dir="ltr" value="${p(r.twilioInboundUrl)}" data-nokeep="1" style="flex:1;min-width:160px"><button class="btn xs" data-a="copy-text" data-t="${p(r.twilioInboundUrl)}">${m("copy",12)}</button></div></div>`:""}
  </div></div></div></div>`}};const E=e=>new Promise(n=>{const s=document.createElement("input");s.type="file",s.multiple=!0,s.accept=e||"",s.onchange=()=>n([...s.files]),s.click()}),A=e=>new Promise(n=>e.toBlob(n,"image/jpeg",.85));t.identifyDoc=async(e,n="")=>{if(!t.S.sample)return null;let s="",i=[];if(/^image\//.test(e.type))i=[e];else if(/pdf$/i.test(e.type)||/\.pdf$/i.test(e.name)){const a=await t.pdfDoc(e);if(s=await t.pdfText(a),s.replace(/\s/g,"").length<200){const _=await t.S.sample.limits().catch(()=>null);if(_&&_.images)for(let c=1;c<=Math.min(a.numPages,3);c++){const{canvas:o}=await t.pdfPageCanvas(a,c,1200);i.push(await A(o))}}}else/\.docx$/i.test(e.name)&&(s=await t.docxText(e));const l=a=>!t.isClosed(a),r=JSON.stringify({clients:t.all("clients").map(a=>({id:a.id,name:a.name,idNo:a.idNo||"",phone:a.phone||""})),deals:t.all("deals").filter(l).map(a=>({id:a.id,address:a.address,gush:a.gush||"",chelka:a.chelka||"",clientIds:a.clientIds||[]}))}).slice(0,6e4),d=`אתה מזכיר במשרד עורכי דין לנדל"ן. התקבל מסמך. זהה לאיזה לקוח ולאיזו עסקה הוא שייך, ומה סוג המסמך.
${n?"הערה שצורפה: "+n+`
`:""}שם הקובץ: ${e.name}
${s?`תוכן המסמך:
`+s.slice(0,2e4)+`
`:i.length?`המסמך מצורף כתמונה.
`:""}
לקוחות ועסקאות פעילות במשרד (JSON):
${r}
החזר JSON בלבד: {"clientId":"מזהה לקוח מהרשימה או ריק","dealId":"מזהה עסקה מהרשימה או ריק","docType":"אחד מ: תעודת זהות, נסח טאבו, אישור העברה בנקאית, אישור זכויות, אישור עירייה, אישור מיסים, חוזה, מסמך בנק / משכנתא, ייפוי כוח, צילום נכס, אחר","title":"כותרת קצרה בעברית","confidence":מספר בין 0 ל-1,"reason":"לפי מה זיהית, משפט קצר"}
התאם לפי מספר ת"ז, שם, כתובת נכס, גוש/חלקה או טלפון. אם אין התאמה ברורה, השאר clientId ריק ו-confidence נמוך. אל תנחש.`;return t.S.sample.json(d,i.length?{images:i}:{})},t.act("inc-upload",async()=>{const e=await E(".pdf,.docx,image/*");if(!e.length)return;if(!t.S.assets){t.toast("שמירת קבצים לא זמינה בתצוגה הזו","bad");return}t.toast(`קורא ${e.length} מסמכים...`);let n=0,s=0;for(const i of e){let l=null;try{l=await t.identifyDoc(i)}catch{}const r=await t.S.assets.upload(i).catch(()=>null);if(!r)continue;const d=+(l&&l.confidence)||0;let a=l&&l.clientId&&d>=.8&&t.get("clients",l.clientId)?l.clientId:"",_=a&&l.dealId&&t.get("deals",l.dealId)&&(t.get("deals",l.dealId).clientIds||[]).includes(a)?l.dealId:"";if(a&&!_){const c=t.clientDeals(a).filter(o=>!t.isClosed(o));c.length===1&&(_=c[0].id)}await t.save("documents",t.uid("f"),{title:l&&l.title||i.name.replace(/\.[^.]+$/,""),type:"incoming",docType:l&&l.docType||"",fileName:i.name,assetId:r.id,url:r.url,clientId:a,dealId:_,source:"upload",created:D(),at:new Date().toISOString(),inbox:!a,confidence:d,reason:l&&l.reason||"",suggest:!a&&l&&l.clientId?l.clientId:""}),a?(n++,await t.log(_?"deal":"client",_||a,`שויך מסמך: ${l&&l.title||i.name}`,"system")):s++}t.toast(`${n} מסמכים שויכו לתיקים${s?`, ${s} מחכים לשיוך שלך`:""}`)}),t.act("copy-text",(e,n)=>t.copy(n.t)),t.act("inc-assign",(e,n)=>{const s=t.get("documents",n.id);if(!s)return;const i=[["clientId","לקוח","client"],["dealId","עסקה","deal"],["title","שם המסמך","text",{full:!0}]];t.formModal({title:"שיוך מסמך",fields:i,values:{clientId:s.clientId||s.suggest||"",dealId:s.dealId||"",title:s.title||""},submit:"שיוך",onSubmit:async l=>{let r=l.dealId;if(!r&&l.clientId){const d=t.clientDeals(l.clientId).filter(a=>!t.isClosed(a));d.length===1&&(r=d[0].id)}if(!l.clientId&&r){const d=t.get("deals",r);l.clientId=(d.clientIds||[])[0]||""}await t.patch("documents",s.id,{clientId:l.clientId,dealId:r,title:l.title||s.title,inbox:!l.clientId}),l.clientId&&await t.log(r?"deal":"client",r||l.clientId,`שויך מסמך: ${l.title||s.title}`,"system"),t.toast("המסמך שויך")}})})})(window.O);
