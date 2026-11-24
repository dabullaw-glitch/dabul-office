import{s as d,e,a as p,B as l,f as u,i as S,t as m}from"./sb.D831sfnA.js";import{r as C,a as I,l as j}from"./member.tXSzDzpo.js";const y=document.getElementById("app");(async()=>{if(!await C())return;const g=document.getElementById("anav"),[{data:a,error:x},i,{data:v},{data:k}]=await Promise.all([d.rpc("too_me"),I(),d.from("too_assets").select("*").eq("published",!0).order("sort"),d.from("too_orders").select("*").order("created_at",{ascending:!1})]);if(x){y.innerHTML='<div class="card">'+e(p(x))+"</div>";return}if(a.admin){const s=document.createElement("a");s.href=l+"nihul/",s.textContent="פאנל ניהול",s.style.color="var(--lime)",g.appendChild(s)}j(g);const c=a.profile||{full_name:"מנהל",email:""},r=new Set(a.done||[]),b=i.flat.length,h=i.flat.filter(s=>r.has(s.id)).length,E=b?Math.round(h/b*100):0,f=i.flat.find(s=>!r.has(s.id))||i.flat[0],B=new URLSearchParams(location.search).get("welcome"),w=a.sub_ends?a.sub_renew?"מתחדש ב־"+u(a.sub_ends):"פעיל עד "+u(a.sub_ends):"אין מנוי פעיל",_=s=>`<a href="${l}ezor-ishi/shiur/?id=${s.id}"><span class="ck ${r.has(s.id)?"on":""}">${r.has(s.id)?"✓":""}</span><span>${e(s.title)}</span><span>${!a.access&&!s.free_preview?"🔒":s.free_preview&&!a.access?'<span class="pill l">חינם לצפייה</span>':""}</span></a>`;y.innerHTML=`
        ${B?'<div class="card dk" style="margin-bottom:16px"><b style="color:var(--lime)">ברוכים הבאים לצוות.</b> הגישה שלכם פתוחה. מתחילים מהפרק הראשון.</div>':""}
        <div class="spread" style="margin-bottom:24px">
          <div><h1>שלום, ${e((c.full_name||"").split(" ")[0])}.</h1><div class="row">
            ${a.course?'<span class="pill ok">הקורס המלא</span>':""}${a.sub_ends?'<span class="pill k">מנוי: '+e(w)+"</span>":""}${a.access?"":'<span class="pill no">אין עדיין גישה לקורס</span>'}</div></div>
          ${a.access&&f?`<a class="btn btn-k" href="${l}ezor-ishi/shiur/?id=${f.id}">${h?"ממשיכים מאיפה שעצרתם":"מתחילים לצפות"} <span class="arrow">←</span></a>`:""}
        </div>
        ${a.access?"":`<div class="card dk" style="margin-bottom:22px"><h2 style="color:var(--lime)">פותחים את כל הצוות</h2><p class="mut" style="margin:0 0 16px">בחרו מסלול, וכל הקורס, הסקילים והקבוצה נפתחים מיד. השיעור הראשון פתוח לצפייה גם בלי רכישה.</p><div class="row"><a class="btn btn-l" href="${l}kniya/?plan=course">הקורס המלא</a><a class="btn btn-o" href="${l}kniya/?plan=monthly">מנוי חודשי</a></div></div>`}
        <div class="grid3" style="margin-bottom:22px">
          <div class="kp dk"><b>${E}%</b><span>מהקורס הושלם (${h} מתוך ${b} שיעורים)</span></div>
          <div class="kp"><b>${(v||[]).length}</b><span>סקילים ותבניות להורדה</span></div>
          <div class="kp"><b>${i.updates.length}</b><span>פריטים בספריית החברים</span></div>
        </div>
        <div class="memw">
          <div class="vstack">
            <h2 style="font-size:24px;margin:0">תוכנית הקורס</h2>
            <div class="mods2">${i.modules.map(s=>{const t=s.lessons.filter(n=>r.has(n.id)).length;return`
              <details class="m2" ${s.lessons.some(n=>n.id===f?.id)?"open":""}><summary><span class="nn">${String(s.n).padStart(2,"0")}</span><span><b style="font-size:18px">${e(s.title)}</b><div class="muted" style="font-size:14px">${e(s.sub||"")}</div><div class="pbar"><i style="width:${s.lessons.length?t/s.lessons.length*100:0}%"></i></div></span><span class="pill">${t}/${s.lessons.length}</span></summary>
              <ul class="ls">${s.lessons.map(n=>"<li>"+_(n)+"</li>").join("")}</ul></details>`}).join("")}</div>
            <h2 style="font-size:24px;margin:16px 0 0">ספריית החברים</h2>
            <p class="muted" style="margin:0">מדריכים, קורסים קצרים, רעיונות, כלים חדשים וסקירות. מתעדכן כל שבוע.</p>
            <div class="row" id="libf" style="gap:6px">${["הכל","מדריך","קורס קצר","רעיון","כלי חדש","סקירה","חדשות"].map((s,t)=>`<button class="btn ${t?"btn-w":"btn-k"} sm" data-t="${s}">${s}</button>`).join("")}</div>
            ${i.updates.length?'<ul class="ls" id="lib" style="padding:0">'+i.updates.map(s=>`<li data-topic="${e(s.topic||"")}">`+_(s).replace("<span>"+e(s.title)+"</span>",`<span>${s.topic?'<span class="pill" style="margin-inline-end:6px">'+e(s.topic)+"</span>":""}${e(s.title)}<br><span class="muted" style="font-size:13px">${u(s.published_at)}${s.summary?" · "+e(s.summary):""}</span></span>`)+"</li>").join("")+"</ul>":'<div class="empty">התוכן הראשון של ספריית החברים יעלה כאן בקרוב.</div>'}
          </div>
          <aside class="vstack">
            <div class="card"><h3>הסקילים והתבניות</h3><p class="muted" style="font-size:14px;margin:0 0 12px">המתנה שמגיעה עם הקורס.</p>
              ${(v||[]).length?'<div style="display:grid;gap:8px">'+v.map(s=>`<div class="spread" style="background:var(--paper);border-radius:12px;padding:10px 12px"><span><b style="font-size:15px">${e(s.title)}</b><br><span class="muted" style="font-size:13px">${s.kind==="skill"?"סקיל":"תבנית"}</span></span>${s.path&&a.access?`<button class="btn btn-k sm" data-dl="${e(s.path)}">הורדה</button>`:`<span class="pill">${a.access?"בהכנה":"🔒"}</span>`}</div>`).join("")+"</div>":'<div class="empty">הקבצים יעלו כאן.</div>'}
            </div>
            <div class="card dk"><h3 style="color:var(--lime)">הקהילה והשידורים</h3><p style="margin:0 0 12px;color:#CFCCC4;font-size:14px">שאלות, שיתופים ומפגשים חיים עם יקיר.</p><div style="display:grid;gap:8px"><a class="btn btn-l sm" href="${l}ezor-ishi/kehila/">לקהילה</a><a class="btn btn-o sm" href="${l}ezor-ishi/laiv/">לשידורים החיים</a></div></div>
            <div class="card"><h3>אתגר 5 ימים</h3><p class="muted" style="font-size:14px;margin:0 0 10px">העובד הדיגיטלי הראשון שלכם, 20 דקות ביום.</p><a class="btn btn-w sm" href="${l}ezor-ishi/etgar/">לאתגר</a></div>
            <div class="card"><h3>הקבוצה הסגורה</h3>${a.access?a.wa?`<a class="btn btn-k wide" href="${e(a.wa)}" target="_blank" rel="noopener">כניסה לקבוצת הוואטסאפ</a>`:'<p class="muted" style="margin:0">הקישור לקבוצה יופיע כאן עם הפתיחה.</p>':'<p class="muted" style="margin:0">נפתחת אחרי הצטרפות.</p>'}</div>
            <div class="card"><h3>המנוי שלי</h3><p style="margin:0 0 12px">${e(w)}</p>
              ${a.sub_ends&&a.sub_renew?'<button class="btn btn-r sm" id="cancel">ביטול חידוש המנוי</button>':a.sub_ends?'<span class="muted" style="font-size:14px">החידוש בוטל. המנוי ימשיך עד התאריך.</span>':`<a class="btn btn-w sm" href="${l}kniya/?plan=monthly">להצטרפות למנוי</a>`}
            </div>
            <div class="card"><h3>הפרטים שלי</h3>
              <div class="f"><label for="pn">שם</label><input id="pn" value="${e(c.full_name||"")}"></div>
              <div class="f"><label for="pp">טלפון</label><input id="pp" dir="ltr" value="${e(c.phone||"")}"></div>
              <div class="f"><label>מייל</label><input value="${e(c.email||"")}" disabled dir="ltr"></div>
              ${a.profile?'<button class="btn btn-w sm" id="save">שמירה</button>':""}
            </div>
            <div class="card"><h3>הרכישות שלי</h3>${(k||[]).length?'<div style="display:grid;gap:6px">'+k.map(s=>`<div class="spread" style="font-size:14px"><span>${u(s.created_at)} · ${s.plan_code==="course"?"הקורס המלא":"מנוי חודשי"}</span><span>${S(s.amount_ils)} ${s.status==="test"?'<span class="pill warn">בדיקה</span>':s.status==="refunded"?'<span class="pill no">הוחזר</span>':""}</span></div>`).join("")+"</div>":'<p class="muted" style="margin:0">עדיין אין רכישות.</p>'}</div>
          </aside>
        </div>`;const $=document.getElementById("libf");$&&($.onclick=s=>{const t=s.target.closest("[data-t]");t&&($.querySelectorAll("button").forEach(n=>n.className="btn sm "+(n===t?"btn-k":"btn-w")),document.querySelectorAll("#lib li").forEach(n=>n.hidden=t.dataset.t!=="הכל"&&n.dataset.topic!==t.dataset.t))}),y.querySelectorAll("[data-dl]").forEach(s=>s.onclick=async()=>{const{data:t,error:n}=await d.storage.from("too").createSignedUrl(s.dataset.dl,120,{download:!0});if(n)return m(p(n),!0);location.href=t.signedUrl});const o=document.getElementById("cancel");o&&(o.onclick=async()=>{if(o.dataset.sure!=="1"){o.dataset.sure="1",o.textContent="לחצו שוב לאישור הביטול";return}const{error:s}=await d.rpc("too_cancel_subscription");if(s)return m(p(s),!0);m("החידוש בוטל. המנוי ימשיך עד סוף התקופה."),setTimeout(()=>location.reload(),900)});const z=document.getElementById("save");z&&(z.onclick=async()=>{const{data:s}=await d.auth.getUser(),{error:t}=await d.from("too_profiles").update({full_name:document.getElementById("pn").value.trim(),phone:document.getElementById("pp").value.trim()||null}).eq("id",s.user.id);m(t?p(t):"נשמר.",!!t)})})();
