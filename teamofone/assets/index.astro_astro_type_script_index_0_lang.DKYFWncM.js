import{s as d,e,a as p,B as t,f,i as E,t as u}from"./sb.D831sfnA.js";import{r as C,a as S,l as I}from"./member.Bwm7i4px.js";const $=document.getElementById("app");(async()=>{if(!await C())return;const y=document.getElementById("anav"),[{data:a,error:g},n,{data:m},{data:x}]=await Promise.all([d.rpc("too_me"),S(),d.from("too_assets").select("*").eq("published",!0).order("sort"),d.from("too_orders").select("*").order("created_at",{ascending:!1})]);if(g){$.innerHTML='<div class="card">'+e(p(g))+"</div>";return}if(a.admin){const s=document.createElement("a");s.href=t+"nihul/",s.textContent="פאנל ניהול",s.style.color="var(--lime)",y.appendChild(s)}I(y);const c=a.profile||{full_name:"מנהל",email:""},r=new Set(a.done||[]),v=n.flat.length,h=n.flat.filter(s=>r.has(s.id)).length,z=v?Math.round(h/v*100):0,b=n.flat.find(s=>!r.has(s.id))||n.flat[0],B=new URLSearchParams(location.search).get("welcome"),k=a.sub_ends?a.sub_renew?"מתחדש ב־"+f(a.sub_ends):"פעיל עד "+f(a.sub_ends):"אין מנוי פעיל",w=s=>`<a href="${t}ezor-ishi/shiur/?id=${s.id}"><span class="ck ${r.has(s.id)?"on":""}">${r.has(s.id)?"✓":""}</span><span>${e(s.title)}</span><span>${!a.access&&!s.free_preview?"🔒":s.free_preview&&!a.access?'<span class="pill l">חינם לצפייה</span>':""}</span></a>`;$.innerHTML=`
        ${B?'<div class="card dk" style="margin-bottom:16px"><b style="color:var(--lime)">ברוכים הבאים לצוות.</b> הגישה שלכם פתוחה. מתחילים מהפרק הראשון.</div>':""}
        <div class="spread" style="margin-bottom:24px">
          <div><h1>שלום, ${e((c.full_name||"").split(" ")[0])}.</h1><div class="row">
            ${a.course?'<span class="pill ok">הקורס המלא</span>':""}${a.sub_ends?'<span class="pill k">מנוי: '+e(k)+"</span>":""}${a.access?"":'<span class="pill no">אין עדיין גישה לקורס</span>'}</div></div>
          ${a.access&&b?`<a class="btn btn-k" href="${t}ezor-ishi/shiur/?id=${b.id}">${h?"ממשיכים מאיפה שעצרתם":"מתחילים לצפות"} <span class="arrow">←</span></a>`:""}
        </div>
        ${a.access?"":`<div class="card dk" style="margin-bottom:22px"><h2 style="color:var(--lime)">פותחים את כל הצוות</h2><p class="mut" style="margin:0 0 16px">בחרו מסלול, וכל הקורס, הסקילים והקבוצה נפתחים מיד. השיעור הראשון פתוח לצפייה גם בלי רכישה.</p><div class="row"><a class="btn btn-l" href="${t}kniya/?plan=course">הקורס המלא</a><a class="btn btn-o" href="${t}kniya/?plan=monthly">מנוי חודשי</a></div></div>`}
        <div class="grid3" style="margin-bottom:22px">
          <div class="kp dk"><b>${z}%</b><span>מהקורס הושלם (${h} מתוך ${v} שיעורים)</span></div>
          <div class="kp"><b>${(m||[]).length}</b><span>סקילים ותבניות להורדה</span></div>
          <div class="kp"><b>${n.updates.length}</b><span>הרצאות חדשות במנוי</span></div>
        </div>
        <div class="memw">
          <div class="vstack">
            <h2 style="font-size:24px;margin:0">תוכנית הקורס</h2>
            <div class="mods2">${n.modules.map(s=>{const l=s.lessons.filter(i=>r.has(i.id)).length;return`
              <details class="m2" ${s.lessons.some(i=>i.id===b?.id)?"open":""}><summary><span class="nn">${String(s.n).padStart(2,"0")}</span><span><b style="font-size:18px">${e(s.title)}</b><div class="muted" style="font-size:14px">${e(s.sub||"")}</div><div class="pbar"><i style="width:${s.lessons.length?l/s.lessons.length*100:0}%"></i></div></span><span class="pill">${l}/${s.lessons.length}</span></summary>
              <ul class="ls">${s.lessons.map(i=>"<li>"+w(i)+"</li>").join("")}</ul></details>`}).join("")}</div>
            <h2 style="font-size:24px;margin:16px 0 0">חדש במנוי</h2>
            ${n.updates.length?'<ul class="ls" style="padding:0">'+n.updates.map(s=>"<li>"+w(s)+"</li>").join("")+"</ul>":'<div class="empty">ההרצאות הקצרות של המנוי יופיעו כאן. הראשונה תעלה עם פתיחת הקורס.</div>'}
          </div>
          <aside class="vstack">
            <div class="card"><h3>הסקילים והתבניות</h3><p class="muted" style="font-size:14px;margin:0 0 12px">המתנה שמגיעה עם הקורס.</p>
              ${(m||[]).length?'<div style="display:grid;gap:8px">'+m.map(s=>`<div class="spread" style="background:var(--paper);border-radius:12px;padding:10px 12px"><span><b style="font-size:15px">${e(s.title)}</b><br><span class="muted" style="font-size:13px">${s.kind==="skill"?"סקיל":"תבנית"}</span></span>${s.path&&a.access?`<button class="btn btn-k sm" data-dl="${e(s.path)}">הורדה</button>`:`<span class="pill">${a.access?"בהכנה":"🔒"}</span>`}</div>`).join("")+"</div>":'<div class="empty">הקבצים יעלו כאן.</div>'}
            </div>
            <div class="card dk"><h3 style="color:var(--lime)">הקהילה והשידורים</h3><p style="margin:0 0 12px;color:#CFCCC4;font-size:14px">שאלות, שיתופים ומפגשים חיים עם יקיר.</p><div style="display:grid;gap:8px"><a class="btn btn-l sm" href="${t}ezor-ishi/kehila/">לקהילה</a><a class="btn btn-o sm" href="${t}ezor-ishi/laiv/">לשידורים החיים</a></div></div>
            <div class="card"><h3>אתגר 5 ימים</h3><p class="muted" style="font-size:14px;margin:0 0 10px">העובד הדיגיטלי הראשון שלכם, 20 דקות ביום.</p><a class="btn btn-w sm" href="${t}ezor-ishi/etgar/">לאתגר</a></div>
            <div class="card"><h3>הקבוצה הסגורה</h3>${a.access?a.wa?`<a class="btn btn-k wide" href="${e(a.wa)}" target="_blank" rel="noopener">כניסה לקבוצת הוואטסאפ</a>`:'<p class="muted" style="margin:0">הקישור לקבוצה יופיע כאן עם הפתיחה.</p>':'<p class="muted" style="margin:0">נפתחת אחרי הצטרפות.</p>'}</div>
            <div class="card"><h3>המנוי שלי</h3><p style="margin:0 0 12px">${e(k)}</p>
              ${a.sub_ends&&a.sub_renew?'<button class="btn btn-r sm" id="cancel">ביטול חידוש המנוי</button>':a.sub_ends?'<span class="muted" style="font-size:14px">החידוש בוטל. המנוי ימשיך עד התאריך.</span>':`<a class="btn btn-w sm" href="${t}kniya/?plan=monthly">להצטרפות למנוי</a>`}
            </div>
            <div class="card"><h3>הפרטים שלי</h3>
              <div class="f"><label for="pn">שם</label><input id="pn" value="${e(c.full_name||"")}"></div>
              <div class="f"><label for="pp">טלפון</label><input id="pp" dir="ltr" value="${e(c.phone||"")}"></div>
              <div class="f"><label>מייל</label><input value="${e(c.email||"")}" disabled dir="ltr"></div>
              ${a.profile?'<button class="btn btn-w sm" id="save">שמירה</button>':""}
            </div>
            <div class="card"><h3>הרכישות שלי</h3>${(x||[]).length?'<div style="display:grid;gap:6px">'+x.map(s=>`<div class="spread" style="font-size:14px"><span>${f(s.created_at)} · ${s.plan_code==="course"?"הקורס המלא":"מנוי חודשי"}</span><span>${E(s.amount_ils)} ${s.status==="test"?'<span class="pill warn">בדיקה</span>':s.status==="refunded"?'<span class="pill no">הוחזר</span>':""}</span></div>`).join("")+"</div>":'<p class="muted" style="margin:0">עדיין אין רכישות.</p>'}</div>
          </aside>
        </div>`,$.querySelectorAll("[data-dl]").forEach(s=>s.onclick=async()=>{const{data:l,error:i}=await d.storage.from("too").createSignedUrl(s.dataset.dl,120,{download:!0});if(i)return u(p(i),!0);location.href=l.signedUrl});const o=document.getElementById("cancel");o&&(o.onclick=async()=>{if(o.dataset.sure!=="1"){o.dataset.sure="1",o.textContent="לחצו שוב לאישור הביטול";return}const{error:s}=await d.rpc("too_cancel_subscription");if(s)return u(p(s),!0);u("החידוש בוטל. המנוי ימשיך עד סוף התקופה."),setTimeout(()=>location.reload(),900)});const _=document.getElementById("save");_&&(_.onclick=async()=>{const{data:s}=await d.auth.getUser(),{error:l}=await d.from("too_profiles").update({full_name:document.getElementById("pn").value.trim(),phone:document.getElementById("pp").value.trim()||null}).eq("id",s.user.id);u(l?p(l):"נשמר.",!!l)})})();
