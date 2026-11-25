import{s as h,B as n,e as o,i as x}from"./sb.C1aYJU_f.js";import{r as k,l as w,a as z,m as B,o as _,c}from"./member.DVvw0PSY.js";const u=document.getElementById("app"),$=new URLSearchParams(location.search),S=Number($.get("id"));(async()=>{if(!await k())return;w(document.getElementById("anav"));const[{data:e},b,g,{data:r}]=await Promise.all([h.rpc("too_me"),z(),B(),h.from("too_settings").select("value").eq("key","test_mode").maybeSingle()]),s=b.modules.find(a=>a.id===S);if(!s||!e){u.innerHTML='<div class="card">הקורס לא נמצא. <a href="'+n+'ezor-ishi/">חזרה לאזור האישי</a></div>';return}const p=String(s.title||"").replace(/^קורס:\s*/,"");document.title=p+" | Team of One";const i=g[s.id],y=!r||r.value!==!1,l=_(e,s.id),f=!e.access&&l,d=!y&&!!i&&Number(i.price_ils)>0&&s.published&&!l,t=new Set(e.done||[]),m=s.lessons.filter(a=>t.has(a.id)).length,v=s.lessons.find(a=>c(e,a)&&!t.has(a.id))||s.lessons.find(a=>c(e,a));u.innerHTML=`
        <div class="crumbs"><a href="${n}ezor-ishi/">האזור האישי</a> / ${i?"קורס":"פרק "+s.n}</div>
        ${$.get("welcome")&&l?'<div class="card dk" style="margin-bottom:16px"><b style="color:var(--lime)">הקורס פתוח לכם.</b> הגישה לקורס הזה היא לכל החיים. מתחילים מהשיעור הראשון.</div>':""}
        <div class="spread" style="margin-bottom:18px">
          <div><div class="row">${i?'<span class="pill k">קורס</span>':'<span class="pill">פרק '+s.n+"</span>"}${f?'<span class="pill ok">הקורס שלכם, לכל החיים</span>':e.access?'<span class="pill ok">כלול בגישה שלכם</span>':""}${s.published?"":'<span class="pill warn">עוד לא פורסם (רק המנהל רואה)</span>'}</div>
            <h1 style="margin:10px 0 4px">${o(p)}</h1>${s.sub?'<p class="muted" style="margin:0">'+o(s.sub)+"</p>":""}</div>
          ${l&&v?`<a class="btn btn-k" href="${n}ezor-ishi/shiur/?id=${v.id}">${m?"ממשיכים":"מתחילים"} <span class="arrow">←</span></a>`:""}
        </div>
        ${s.outcome?'<div class="card" style="margin-bottom:16px"><b>מה יוצאים איתו:</b> '+o(s.outcome)+"</div>":""}
        <div class="card" style="margin-bottom:16px">
          <div class="spread"><h2 style="font-size:22px;margin:0">השיעורים</h2><span class="pill">${m}/${s.lessons.length}</span></div>
          ${s.lessons.length?'<ul class="ls" style="padding:0;margin-top:10px">'+s.lessons.map(a=>`<li><a href="${n}ezor-ishi/shiur/?id=${a.id}"><span class="ck ${t.has(a.id)?"on":""}">${t.has(a.id)?"✓":""}</span><span>${o(a.title)}</span><span>${c(e,a)?a.free_preview&&!l?'<span class="pill l">חינם לצפייה</span>':"":"🔒"}</span></a></li>`).join("")+"</ul>":'<div class="empty">השיעורים יעלו כאן בקרוב.</div>'}
        </div>
        ${d?`<div class="card dk">
            <span class="pill l">קורס בודד</span>
            <h2 style="color:var(--lime);margin:10px 0 4px">קורס בודד: גישה לכל החיים לקורס הזה</h2>
            <div style="font-family:var(--disp);font-size:64px;line-height:.9;margin:8px 0">${x(i.price_ils)}</div>
            <p class="mut" style="margin:0 0 16px">תשלום אחד. כל השיעורים, הסרטונים והקבצים של הקורס הזה.</p>
            <div class="row"><a class="btn btn-l" href="${n}kniya/?plan=${encodeURIComponent(i.code)}">לקנייה של הקורס הזה <span class="arrow">←</span></a><a class="btn btn-o" href="${n}kniya/?plan=course">או כל הצוות: הקורס המלא</a></div>
          </div>`:""}
        ${!l&&!d?`<div class="card dk"><h2 style="color:var(--lime)">פותחים את כל הצוות</h2><p class="mut" style="margin:0 0 16px">${i?"הקורס הזה כלול בקורס המלא ובמנוי החודשי.":"הפרק הזה נפתח עם הקורס המלא או עם המנוי החודשי."}</p><div class="row"><a class="btn btn-l" href="${n}kniya/?plan=course">הקורס המלא</a><a class="btn btn-o" href="${n}kniya/?plan=monthly">מנוי חודשי</a></div></div>`:""}`})();
