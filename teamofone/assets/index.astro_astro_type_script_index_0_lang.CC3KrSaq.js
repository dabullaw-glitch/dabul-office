import{s as i,e,a as p,B as d,f,i as E,t as u}from"./sb.D831sfnA.js";import{r as S,l as I,a as L}from"./member.-VD0NR7o.js";const $=document.getElementById("app");(async()=>{if(!await S())return;const y=document.getElementById("anav"),[{data:a,error:g},t,{data:m},{data:x}]=await Promise.all([i.rpc("too_me"),I(),i.from("too_assets").select("*").eq("published",!0).order("sort"),i.from("too_orders").select("*").order("created_at",{ascending:!1})]);if(g){$.innerHTML='<div class="card">'+e(p(g))+"</div>";return}if(a.admin){const s=document.createElement("a");s.href=d+"nihul/",s.textContent="פאנל ניהול",s.style.color="var(--lime)",y.appendChild(s)}L(y);const c=a.profile||{full_name:"מנהל",email:""},r=new Set(a.done||[]),v=t.flat.length,h=t.flat.filter(s=>r.has(s.id)).length,z=v?Math.round(h/v*100):0,b=t.flat.find(s=>!r.has(s.id))||t.flat[0],B=new URLSearchParams(location.search).get("welcome"),w=a.sub_ends?a.sub_renew?"מתחדש ב־"+f(a.sub_ends):"פעיל עד "+f(a.sub_ends):"אין מנוי פעיל",k=s=>`<a href="${d}ezor-ishi/shiur/?id=${s.id}"><span class="ck ${r.has(s.id)?"on":""}">${r.has(s.id)?"✓":""}</span><span>${e(s.title)}</span><span>${!a.access&&!s.free_preview?"🔒":s.free_preview&&!a.access?'<span class="pill l">חינם לצפייה</span>':""}</span></a>`;$.innerHTML=`
        ${B?'<div class="card dk" style="margin-bottom:16px"><b style="color:var(--lime)">ברוכים הבאים לצוות.</b> הגישה שלכם פתוחה. מתחילים מהפרק הראשון.</div>':""}
        <div class="spread" style="margin-bottom:24px">
          <div><h1>שלום, ${e((c.full_name||"").split(" ")[0])}.</h1><div class="row">
            ${a.course?'<span class="pill ok">הקורס המלא</span>':""}${a.sub_ends?'<span class="pill k">מנוי: '+e(w)+"</span>":""}${a.access?"":'<span class="pill no">אין עדיין גישה לקורס</span>'}</div></div>
          ${a.access&&b?`<a class="btn btn-k" href="${d}ezor-ishi/shiur/?id=${b.id}">${h?"ממשיכים מאיפה שעצרתם":"מתחילים לצפות"} <span class="arrow">←</span></a>`:""}
        </div>
        ${a.access?"":`<div class="card dk" style="margin-bottom:22px"><h2 style="color:var(--lime)">פותחים את כל הצוות</h2><p class="mut" style="margin:0 0 16px">בחרו מסלול, וכל הקורס, הסקילים והקבוצה נפתחים מיד. השיעור הראשון פתוח לצפייה גם בלי רכישה.</p><div class="row"><a class="btn btn-l" href="${d}kniya/?plan=course">הקורס המלא</a><a class="btn btn-o" href="${d}kniya/?plan=monthly">מנוי חודשי</a></div></div>`}
        <div class="grid3" style="margin-bottom:22px">
          <div class="kp dk"><b>${z}%</b><span>מהקורס הושלם (${h} מתוך ${v} שיעורים)</span></div>
          <div class="kp"><b>${(m||[]).length}</b><span>סקילים ותבניות להורדה</span></div>
          <div class="kp"><b>${t.updates.length}</b><span>הרצאות חדשות במנוי</span></div>
        </div>
        <div class="lessonw" style="grid-template-columns:minmax(0,1fr) 340px">
          <div class="stack">
            <h2 style="font-size:24px;margin:0">תוכנית הקורס</h2>
            <div class="mods2">${t.modules.map(s=>{const n=s.lessons.filter(l=>r.has(l.id)).length;return`
              <details class="m2" ${s.lessons.some(l=>l.id===b?.id)?"open":""}><summary><span class="nn">${String(s.n).padStart(2,"0")}</span><span><b style="font-size:18px">${e(s.title)}</b><div class="muted" style="font-size:14px">${e(s.sub||"")}</div><div class="bar"><i style="width:${s.lessons.length?n/s.lessons.length*100:0}%"></i></div></span><span class="pill">${n}/${s.lessons.length}</span></summary>
              <ul class="ls">${s.lessons.map(l=>"<li>"+k(l)+"</li>").join("")}</ul></details>`}).join("")}</div>
            <h2 style="font-size:24px;margin:16px 0 0">חדש במנוי</h2>
            ${t.updates.length?'<ul class="ls" style="padding:0">'+t.updates.map(s=>"<li>"+k(s)+"</li>").join("")+"</ul>":'<div class="empty">ההרצאות הקצרות של המנוי יופיעו כאן. הראשונה תעלה עם פתיחת הקורס.</div>'}
          </div>
          <aside class="stack" style="position:static;max-height:none">
            <div class="card"><h3>הסקילים והתבניות</h3><p class="muted" style="font-size:14px;margin:0 0 12px">המתנה שמגיעה עם הקורס.</p>
              ${(m||[]).length?'<div style="display:grid;gap:8px">'+m.map(s=>`<div class="spread" style="background:var(--paper);border-radius:12px;padding:10px 12px"><span><b style="font-size:15px">${e(s.title)}</b><br><span class="muted" style="font-size:13px">${s.kind==="skill"?"סקיל":"תבנית"}</span></span>${s.path&&a.access?`<button class="btn btn-k sm" data-dl="${e(s.path)}">הורדה</button>`:`<span class="pill">${a.access?"בהכנה":"🔒"}</span>`}</div>`).join("")+"</div>":'<div class="empty">הקבצים יעלו כאן.</div>'}
            </div>
            <div class="card"><h3>הקבוצה הסגורה</h3>${a.access?a.wa?`<a class="btn btn-k wide" href="${e(a.wa)}" target="_blank" rel="noopener">כניסה לקבוצת הוואטסאפ</a>`:'<p class="muted" style="margin:0">הקישור לקבוצה יופיע כאן עם הפתיחה.</p>':'<p class="muted" style="margin:0">נפתחת אחרי הצטרפות.</p>'}</div>
            <div class="card"><h3>המנוי שלי</h3><p style="margin:0 0 12px">${e(w)}</p>
              ${a.sub_ends&&a.sub_renew?'<button class="btn btn-r sm" id="cancel">ביטול חידוש המנוי</button>':a.sub_ends?'<span class="muted" style="font-size:14px">החידוש בוטל. המנוי ימשיך עד התאריך.</span>':`<a class="btn btn-w sm" href="${d}kniya/?plan=monthly">להצטרפות למנוי</a>`}
            </div>
            <div class="card"><h3>הפרטים שלי</h3>
              <div class="f"><label for="pn">שם</label><input id="pn" value="${e(c.full_name||"")}"></div>
              <div class="f"><label for="pp">טלפון</label><input id="pp" dir="ltr" value="${e(c.phone||"")}"></div>
              <div class="f"><label>מייל</label><input value="${e(c.email||"")}" disabled dir="ltr"></div>
              ${a.profile?'<button class="btn btn-w sm" id="save">שמירה</button>':""}
            </div>
            <div class="card"><h3>הרכישות שלי</h3>${(x||[]).length?'<div style="display:grid;gap:6px">'+x.map(s=>`<div class="spread" style="font-size:14px"><span>${f(s.created_at)} · ${s.plan_code==="course"?"הקורס המלא":"מנוי חודשי"}</span><span>${E(s.amount_ils)} ${s.status==="test"?'<span class="pill warn">בדיקה</span>':s.status==="refunded"?'<span class="pill no">הוחזר</span>':""}</span></div>`).join("")+"</div>":'<p class="muted" style="margin:0">עדיין אין רכישות.</p>'}</div>
          </aside>
        </div>`,$.querySelectorAll("[data-dl]").forEach(s=>s.onclick=async()=>{const{data:n,error:l}=await i.storage.from("too").createSignedUrl(s.dataset.dl,120,{download:!0});if(l)return u(p(l),!0);location.href=n.signedUrl});const o=document.getElementById("cancel");o&&(o.onclick=async()=>{if(o.dataset.sure!=="1"){o.dataset.sure="1",o.textContent="לחצו שוב לאישור הביטול";return}const{error:s}=await i.rpc("too_cancel_subscription");if(s)return u(p(s),!0);u("החידוש בוטל. המנוי ימשיך עד סוף התקופה."),setTimeout(()=>location.reload(),900)});const _=document.getElementById("save");_&&(_.onclick=async()=>{const{data:s}=await i.auth.getUser(),{error:n}=await i.from("too_profiles").update({full_name:document.getElementById("pn").value.trim(),phone:document.getElementById("pp").value.trim()||null}).eq("id",s.user.id);u(n?p(n):"נשמר.",!!n)})})();
