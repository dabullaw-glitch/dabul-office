import{s as y,B as e,e as t,i as x}from"./sb.CFTcUrcC.js";import{r as k,l as w,a as z,b as B,m as S,f as _,d as r,i as L}from"./member.Do-sFmg_.js";const u=document.getElementById("app"),$=new URLSearchParams(location.search),M=Number($.get("id"));(async()=>{if(!await k())return;w(document.getElementById("anav"));const[{data:i},b,d,{data:p}]=await Promise.all([z(),B(),S(),y.from("too_settings").select("value").eq("key","test_mode").maybeSingle()]),s=b.modules.find(a=>a.id===M);if(!s||!i){u.innerHTML='<div class="card">הקורס לא נמצא. <a href="'+e+'ezor-ishi/">חזרה לאזור האישי</a></div>';return}const c=String(s.title||"").replace(/^קורס:\s*/,"");document.title=c+" | Team of One";const n=d[s.id],f=!p||p.value!==!1,l=_(i,s.id),g=!i.access&&l,m=!f&&!!n&&Number(n.price_ils)>0&&s.published&&!l,o=new Set(i.done||[]),h=s.lessons.filter(a=>o.has(a.id)).length,v=s.lessons.find(a=>r(i,a)&&!o.has(a.id))||s.lessons.find(a=>r(i,a));u.innerHTML=`
        <div class="crumbs"><a href="${e}ezor-ishi/">האזור האישי</a> / ${L(s,d)?t(c):`<a href="${e}ezor-ishi/#c-full">הקורס המלא</a> / פרק ${s.n}`}</div>
        ${$.get("welcome")&&l?'<div class="card dk" style="margin-bottom:16px"><b style="color:var(--lime)">הקורס פתוח לכם.</b> הגישה לקורס הזה היא לכל החיים. מתחילים מהשיעור הראשון.</div>':""}
        <div class="spread" style="margin-bottom:18px">
          <div><div class="row">${n?'<span class="pill k">קורס</span>':'<span class="pill">פרק '+s.n+"</span>"}${g?'<span class="pill ok">הקורס שלכם, לכל החיים</span>':i.access?'<span class="pill ok">כלול בגישה שלכם</span>':""}${s.published?"":'<span class="pill warn">עוד לא פורסם (רק המנהל רואה)</span>'}</div>
            <h1 style="margin:10px 0 4px">${t(c)}</h1>${s.sub?'<p class="muted" style="margin:0">'+t(s.sub)+"</p>":""}</div>
          ${l&&v?`<a class="btn btn-k" href="${e}ezor-ishi/shiur/?id=${v.id}">${h?"ממשיכים":"מתחילים"} <span class="arrow">←</span></a>`:""}
        </div>
        ${s.outcome?'<div class="card" style="margin-bottom:16px"><b>מה יוצאים איתו:</b> '+t(s.outcome)+"</div>":""}
        <div class="card" style="margin-bottom:16px">
          <div class="spread"><h2 style="font-size:22px;margin:0">השיעורים</h2><span class="pill">${h}/${s.lessons.length}</span></div>
          ${s.lessons.length?'<ul class="ls" style="padding:0;margin-top:10px">'+s.lessons.map(a=>`<li><a href="${e}ezor-ishi/shiur/?id=${a.id}"><span class="ck ${o.has(a.id)?"on":""}">${o.has(a.id)?"✓":""}</span><span>${t(a.title)}</span><span>${r(i,a)?a.free_preview&&!l?'<span class="pill l">חינם לצפייה</span>':"":"🔒"}</span></a></li>`).join("")+"</ul>":'<div class="empty">השיעורים יעלו כאן בקרוב.</div>'}
        </div>
        ${m?`<div class="card dk">
            <span class="pill l">קורס בודד</span>
            <h2 style="color:var(--lime);margin:10px 0 4px">קורס בודד: גישה לכל החיים לקורס הזה</h2>
            <div style="font-family:var(--disp);font-size:64px;line-height:.9;margin:8px 0">${x(n.price_ils)}</div>
            <p class="mut" style="margin:0 0 16px">תשלום אחד. כל השיעורים, הסרטונים והקבצים של הקורס הזה.</p>
            <div class="row"><a class="btn btn-l" href="${e}kniya/?plan=${encodeURIComponent(n.code)}">לקנייה של הקורס הזה <span class="arrow">←</span></a><a class="btn btn-o" href="${e}kniya/?plan=course">או כל הצוות: הקורס המלא</a></div>
          </div>`:""}
        ${!l&&!m?`<div class="card dk"><h2 style="color:var(--lime)">פותחים את כל הצוות</h2><p class="mut" style="margin:0 0 16px">${n?"הקורס הזה כלול בקורס המלא ובמנוי החודשי.":"הפרק הזה נפתח עם הקורס המלא או עם המנוי החודשי."}</p><div class="row"><a class="btn btn-l" href="${e}kniya/?plan=course">הקורס המלא</a><a class="btn btn-o" href="${e}kniya/?plan=monthly">מנוי חודשי</a></div></div>`:""}`})();
