import{e as s,B as l}from"./sb.CFTcUrcC.js";import{r as d,l as f}from"./member.DYUdh3ni.js";import{r as u,a as h}from"./retention.vRohiI73.js";const i=document.getElementById("app"),p=new URLSearchParams(location.search),m=p.get("c")==="course",v=Number(p.get("m"));(async()=>{if(!await d())return;f(document.getElementById("anav"));let n;try{n=await u()}catch(e){i.innerHTML='<div class="card">'+s(h(e))+"</div>";return}const o=n&&n.certs||[];let t="",r=null;if(m){const e=o.filter(a=>a.n>=1&&a.n<=10);e.length===10&&(t="הקורס המלא של Team of One",r=e.map(a=>a.done_at).sort().pop())}else{const e=o.find(a=>a.module_id===v);e&&(t=String(e.title).replace(/^קורס:\s*/,""),r=e.done_at,e.n<=10&&(t="פרק "+e.n+": "+t))}if(!t){i.innerHTML=`<div class="card"><h1 style="font-size:48px">התעודה עוד לא מוכנה</h1><p>התעודה נפתחת כשמסיימים את כל השיעורים ${m?"בעשרת הפרקים של הקורס":"בפרק או בקורס הזה"}. כל שיעור שמסמנים כ"סיימתי" נספר.</p><a class="btn btn-k sm" href="${l}ezor-ishi/hitkadmut/">להתקדמות שלי</a></div>`;return}const c=(n.name||"").trim();document.title="תעודת סיום: "+t+" | Team of One",i.innerHTML=`
        ${c?"":`<div class="card rt-noprint" style="margin-bottom:14px" role="status">כדי שהשם שלכם יופיע על התעודה, עדכנו אותו ב<a href="${l}ezor-ishi/">אזור האישי</a> בכרטיס "הפרטים שלי".</div>`}
        <p class="muted rt-noprint" style="margin:0 0 14px">אפשר להדפיס את העמוד או לשמור אותו כקובץ PDF דרך ההדפסה של הדפדפן.</p>
        <section class="rt-cert" aria-label="תעודת סיום">
          <span class="rt-ck en">Team of One</span>
          <h1>תעודת סיום</h1>
          <p class="rt-to">התעודה מוענקת ל</p>
          <p class="rt-name">${s(c||"חבר הצוות")}</p>
          <p class="rt-to">על השלמת כל השיעורים ב</p>
          <p class="rt-for">${s(t)}</p>
          <div class="rt-foot"><div>תאריך<br><b>${new Date(r).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem",day:"numeric",month:"long",year:"numeric"})}</b></div><div>מטעם<br><b>צוות Team of One</b></div></div>
        </section>`})();
