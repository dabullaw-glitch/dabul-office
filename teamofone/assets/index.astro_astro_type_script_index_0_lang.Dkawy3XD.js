import{s,B as e,e as c,i as y,t as g,a as u}from"./sb.D831sfnA.js";const i=new URLSearchParams(location.search).get("plan")||"course",p=document.getElementById("box");(async()=>{const{data:d}=await s.auth.getSession();if(!d.session){location.replace(e+"knisa/?plan="+encodeURIComponent(i));return}const[{data:a},{data:l},{data:o}]=await Promise.all([s.from("too_plans").select("*").eq("code",i).maybeSingle(),s.from("too_settings").select("value").eq("key","test_mode").maybeSingle(),s.rpc("too_me")]);if(!a){p.innerHTML='<div class="card">המסלול לא נמצא. <a href="'+e+'#price">חזרה למסלולים</a></div>';return}const r=l&&l.value===!0,m=(a.perks||[]).map(n=>'<li style="display:flex;gap:10px"><span class="pill ok">✓</span>'+c(n)+"</li>").join("");p.innerHTML=`
        <div class="card">
          <div class="spread"><h2>${c(a.name)}</h2><span class="pill k">${a.kind==="monthly"?"מנוי חודשי":"תשלום אחד"}</span></div>
          <div style="font-family:var(--disp);font-size:90px;line-height:.85;margin:10px 0">${y(a.price_ils)}${a.kind==="monthly"?'<small style="font-family:var(--body);font-size:18px;color:var(--mutD)"> לחודש</small>':""}</div>
          <ul style="list-style:none;padding:0;margin:14px 0 0;display:grid;gap:10px">${m}</ul>
        </div>
        <div class="card ${r?"":"dk"}">
          ${r?`<div class="row" style="margin-bottom:10px"><span class="pill warn">מצב בדיקה</span><b>לא יבוצע חיוב.</b></div>
            <p class="muted" style="margin:0 0 16px">האתר עדיין בבדיקה, והתשלום האמיתי עוד לא מחובר. הלחיצה פותחת גישה כאילו שילמתם, כדי לבדוק שהכל עובד.</p>
            <button class="btn btn-k wide" id="go">השלמת רכישת בדיקה <span class="arrow">←</span></button>`:'<h3>התשלום באתר ייפתח בקרוב</h3><p class="mut" style="margin:0">נעדכן אתכם במייל ברגע שאפשר להצטרף.</p>'}
          <p class="muted" style="font-size:14px;margin:14px 0 0">${a.kind==="monthly"?"מבטלים בכל חודש, בלחיצה באזור האישי.":"14 ימים להחזר כספי מלא, אם עוד לא התחלתם לצפות."} <a href="${e}tnaim/" target="_blank">תנאי השימוש</a></p>
        </div>
        ${o&&o.access?'<div class="card"><b>כבר יש לכם גישה פעילה.</b> <a href="'+e+'ezor-ishi/">לאזור האישי</a></div>':""}`;const t=document.getElementById("go");t&&(t.onclick=async()=>{t.disabled=!0;const{error:n}=await s.rpc("too_checkout_test",{p_plan:i});if(n){g(u(n),!0),t.disabled=!1;return}location.replace(e+"ezor-ishi/?welcome=1")})})();
