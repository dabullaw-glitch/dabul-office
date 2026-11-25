import{e as r,s as u,B as d,t as c}from"./sb.CFTcUrcC.js";import{r as _,l as k}from"./member.DYUdh3ni.js";import{r as w,a as m,s as $,n as x,c as f,h as y,d as D,i as o}from"./retention.vRohiI73.js";const p=document.getElementById("app"),S=["תשובות לפניות","הצעות מחיר","פוסטים לרשתות","סיכומי פגישות","מיילים ללקוחות","מאמר לאתר","דוח שבועי","מעקב אחרי לקוחות"];let t,h=[];(async()=>await _()&&(k(document.getElementById("anav")),await b()))();async function b(){try{t=await w()}catch(a){p.innerHTML='<div class="card">'+r(m(a))+"</div>";return}if(!t||!t.access){p.innerHTML=$("me")+x();return}const{data:n}=await u.from("too_time_saved").select("id,task,minutes,created_at").order("created_at",{ascending:!1}).limit(100);h=n||[],E()}function z(){const n=new Set((t.weeks||[]).map(String)),a=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Jerusalem"}));a.setDate(a.getDate()-a.getDay());const l=[];for(let s=9;s>=0;s--){const e=new Date(a);e.setDate(a.getDate()-s*7);const i=e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0");l.push([i,n.has(i)])}return`<div class="rt-weeks" role="img" aria-label="${l.filter(s=>s[1]).length} שבועות פעילים מתוך 10 האחרונים">${l.map(([s,e])=>`<span class="${e?"on":""}" title="שבוע שמתחיל ב־${s.split("-").reverse().join(".")}"></span>`).join("")}</div>`}function E(){const n=Object.fromEntries((t.badges||[]).map(e=>[e.code,e.at])),a=t.certs||[],l=a.filter(e=>e.n>=1&&e.n<=10).length===10,s=t.cycle&&t.cycle.day;p.innerHTML=`${$("me")}
        <h1>ההתקדמות שלי</h1>
        <p class="rt-sub">כל מה שעשיתם בצוות במקום אחד: הרצף השבועי, התגים, הזמן שהעובדים שלכם חוסכים, והתעודות.</p>
        <div class="grid4" style="margin-bottom:18px">
          <div class="kp dk"><b>${t.streak||0}</b><span>${t.streak===1?"שבוע פעיל ברצף":"שבועות פעילים ברצף"}</span></div>
          <div class="kp"><b>${y(t.minutes_total)}</b><span>שעות שנחסכו לפי הדיווחים שלכם</span></div>
          <div class="kp"><b>${(t.badges||[]).length}</b><span>תגים מתוך ${f.length}</span></div>
          <div class="kp"><b>${(t.path_done||[]).length}</b><span>משימות במסלול 30 הימים</span></div>
        </div>
        ${s>=20&&s<=25?'<p class="pill l" style="margin:0 0 10px">הסיכום של החודש שלכם מוכן</p>':""}
        <div class="rt-grid">
          <div class="vstack">
            ${D(t,!0)}
            <section class="card" aria-labelledby="hr-h"><h2 id="hr-h">כמה זמן העובדים שלכם חסכו</h2>
              <p class="muted" style="margin:0 0 12px;font-size:15px">אחרי שעובד דיגיטלי עשה משימה בשבילכם, כתבו איזו משימה ובערך כמה דקות זה חסך לעומת איך שעשיתם אותה קודם. הערכה מספיקה. הסכום מצטבר כאן.</p>
              <form class="rt-hrs" id="hf">
                <div class="f"><label for="ht">איזו משימה</label><input id="ht" list="hideas" maxlength="120" required placeholder="לדוגמה: תשובות לפניות"><datalist id="hideas">${S.map(e=>`<option value="${e}">`).join("")}</datalist></div>
                <div class="f"><label for="hm">כמה דקות נחסכו</label><select id="hm"><option value="15">15 דקות</option><option value="30" selected>30 דקות</option><option value="60">שעה</option><option value="90">שעה וחצי</option><option value="120">שעתיים</option><option value="180">3 שעות</option><option value="300">5 שעות</option></select></div>
                <button class="btn btn-k sm" type="submit">הוספה</button>
              </form>
              ${h.length?`<div class="rt-log">${h.map(e=>`<div><span>${r(e.task)} · ${e.minutes>=60?y(e.minutes)+" שעות":e.minutes+" דקות"} <span class="muted">· ${o(e.created_at)}</span></span><button data-del="${e.id}" aria-label="מחיקה: ${r(e.task)}">מחיקה</button></div>`).join("")}</div>`:'<p class="muted" style="margin:12px 0 0">עוד אין דיווחים. הדיווח הראשון שלכם יופיע כאן.</p>'}
            </section>
            <section class="card" aria-labelledby="bd-h"><h2 id="bd-h">התגים שלכם</h2>
              <div class="rt-badges">${f.map(e=>`<div class="rt-bd ${n[e.code]?"on":"off"}"><i aria-hidden="true">${e.i}</i><b>${r(e.t)}</b><span>${n[e.code]?"התקבל ב־"+o(n[e.code],{year:"numeric"}):r(e.d)}</span></div>`).join("")}</div>
            </section>
          </div>
          <aside class="vstack">
            <section class="card" aria-labelledby="st-h"><h2 id="st-h" style="font-size:20px">הרצף השבועי</h2>
              <p class="muted" style="margin:0;font-size:14.5px">שבוע נספר כשעשיתם בו משהו: שיעור, משימה במסלול, פריט שבועי, דיווח על זמן, או פוסט בקהילה. 10 השבועות האחרונים:</p>${z()}</section>
            <section class="card" aria-labelledby="ce-h"><h2 id="ce-h" style="font-size:20px">התעודות שלי</h2>
              ${a.length||l?`<ul class="rt-list">${l?`<li><a href="${d}ezor-ishi/teuda/?c=course"><b>🏆 הקורס המלא</b></a></li>`:""}${a.map(e=>`<li><a href="${d}ezor-ishi/teuda/?m=${e.module_id}">${r(e.title)}</a> <span class="muted" style="font-size:13px">· ${o(e.done_at,{year:"numeric"})}</span></li>`).join("")}</ul>`:'<p class="muted" style="margin:0">כשתסיימו את כל השיעורים בפרק או בקורס, התעודה תופיע כאן.</p>'}</section>
            ${t.next_event?`<section class="card dk" aria-labelledby="ev-h"><h2 id="ev-h" style="color:var(--lime);font-size:20px">המפגש החי הבא</h2><p style="margin:0 0 10px"><b>${r(t.next_event.title)}</b><br><span class="rt-mut">${new Date(t.next_event.starts_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem",weekday:"long",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}</span></p><a class="btn btn-l sm" href="${d}ezor-ishi/laiv/">לפרטים ולהוספה ליומן</a></section>`:""}
            ${t.sub_ends||t.pause?`<section class="card" aria-labelledby="sb-h"><h2 id="sb-h" style="font-size:20px">המנוי שלי</h2><p style="margin:0 0 10px">${t.pause?"בהפסקה עד "+o(t.pause.resume_at,{year:"numeric"}):t.sub_renew?"מתחדש ב־"+o(t.sub_ends,{year:"numeric"}):"פעיל עד "+o(t.sub_ends,{year:"numeric"})+", בלי חידוש"}</p><a class="btn btn-w sm" href="${d}ezor-ishi/bitul/">ניהול המנוי וביטול</a></section>`:""}
          </aside>
        </div>`,document.getElementById("hf").onsubmit=async e=>{e.preventDefault();const i=document.getElementById("ht").value.trim();if(i.length<2)return c("כתבו איזו משימה העובד עשה.",!0);const v=e.target.querySelector("button");v.disabled=!0;const{error:g}=await u.rpc("too_time_add",{p_task:i,p_minutes:Number(document.getElementById("hm").value)});if(v.disabled=!1,g)return c(m(g),!0);c("נוסף. כל הכבוד לצוות שלכם."),b()},p.querySelectorAll("[data-del]").forEach(e=>e.onclick=async()=>{if(e.dataset.sure!=="1"){e.dataset.sure="1",e.textContent="לחצו שוב";return}const{error:i}=await u.from("too_time_saved").delete().eq("id",Number(e.dataset.del));if(i)return c(m(i),!0);b()})}
