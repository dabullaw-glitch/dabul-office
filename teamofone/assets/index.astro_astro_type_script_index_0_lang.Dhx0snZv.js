import{e,s as o,B as $,t as y}from"./sb.CFTcUrcC.js";import{r as k,l as z}from"./member.DYUdh3ni.js";import{r as S,a as f,s as _,n as B,K as m,i as h}from"./retention.vRohiI73.js";import{m as g}from"./md.raPn-TSp.js";const c=document.getElementById("app");let l,x=[];(async()=>{if(!await k())return;z(document.getElementById("anav"));try{l=await S()}catch(t){c.innerHTML='<div class="card">'+e(f(t))+"</div>";return}if(!l||!l.access){c.innerHTML=_("week")+B();return}const i=new Date(Date.now()-7*864e5).toISOString(),[{data:r},{data:a},{data:n}]=await Promise.all([o.from("too_drops").select("id,publish_at,kind,title,teaser,body_md,challenge,minutes,thread_id").order("publish_at",{ascending:!1}).limit(60),o.from("too_posts").select("id,author_name,title,body,created_at").eq("kind","win").eq("hidden",!1).gte("created_at",i).order("created_at",{ascending:!1}).limit(5),o.from("too_spotlight").select("name,body,week_start").order("week_start",{ascending:!1}).order("id",{ascending:!1}).limit(1)]);x=r||[],w(a||[],(n||[])[0])})();function w(i,r){const[a,...n]=x,t=new Set(l.drops_done||[]),b=l.next_drops||[];c.innerHTML=`${_("week")}
        <h1>השבוע בצוות</h1>
        <p class="rt-sub">כל יום ראשון עולה כאן פריט חדש: סקיל או תבנית מוכנים, מדריך קצר, עדכון על כלים, או אתגר לשבוע. משתמשים בו על משימה אמיתית, ומסמנים "השתמשתי".</p>
        <div class="rt-grid">
          <div class="vstack">
            ${a?`<article class="card rt-drop" aria-labelledby="dr-h">
              <div class="row"><span class="pill k">${e(m[a.kind]||"")}</span><span class="pill">פורסם ${h(a.publish_at,{year:"numeric"})}</span>${a.minutes?`<span class="pill">${a.minutes} דקות</span>`:""}</div>
              <h2 id="dr-h" style="font-size:clamp(24px,3vw,32px);margin:12px 0 6px">${e(a.title)}</h2>
              <p class="muted" style="margin:0 0 6px;font-size:17px">${e(a.teaser)}</p>
              <div class="prose">${g(a.body_md)}</div>
              ${a.challenge?`<div class="rt-chal"><b>האתגר של השבוע</b>${e(a.challenge)}${a.thread_id?`<div style="margin-top:10px"><a class="btn btn-k sm" href="${$}ezor-ishi/kehila/">לשרשור האתגר בקהילה</a></div>`:""}</div>`:""}
              <div class="row" style="margin-top:16px">${v(a,t)}</div>
            </article>`:'<div class="empty">הפריט הראשון יעלה כאן ביום ראשון הקרוב.</div>'}
            ${n.length?`<section class="card rt-arch" aria-labelledby="ar-h"><h2 id="ar-h">פריטים קודמים</h2>${n.map(s=>`<details><summary>${e(s.title)} <span class="muted" style="font-weight:400;font-size:14px">· ${e(m[s.kind]||"")} · ${h(s.publish_at)}${t.has(s.id)?" · ✓ השתמשתם":""}</span></summary>
              <div class="prose rt-drop" style="margin-top:10px">${g(s.body_md)}</div>${s.challenge?`<div class="rt-chal"><b>האתגר של אותו שבוע</b>${e(s.challenge)}</div>`:""}<div class="row" style="margin-top:10px">${v(s,t)}</div></details>`).join("")}</section>`:""}
          </div>
          <aside class="vstack">
            <section class="card dk" aria-labelledby="nx-h"><h2 id="nx-h" style="color:var(--lime);font-size:20px">בחודש הבא</h2>
              ${b.length?`<ul class="rt-list">${b.map(s=>`<li><span class="pill l">${e(m[s.kind]||"")}</span> <b>${e(s.title)}</b><br><span class="rt-mut" style="font-size:14px">${e(s.teaser)}</span><br><span class="rt-mut" style="font-size:13px">עולה ב־${h(s.at)}</span></li>`).join("")}</ul>`:'<p class="rt-mut" style="margin:0">הפריטים של החודש הבא בהכנה. כל יום ראשון עולה פריט חדש.</p>'}</section>
            ${r?`<section class="card" aria-labelledby="sp-h"><h2 id="sp-h" style="font-size:20px">⭐ בזרקור השבוע: ${e(r.name)}</h2><p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">${e(r.body)}</p></section>`:""}
            <section class="card" aria-labelledby="wn-h"><h2 id="wn-h" style="font-size:20px">ההצלחות של השבוע</h2>
              ${i.length?`<div class="vstack" style="gap:8px;margin-top:8px">${i.map(s=>`<div class="rt-win"><b>${e(s.author_name||"")}</b>: ${e(s.title?s.title+". ":"")}${e(String(s.body).slice(0,180))}${String(s.body).length>180?"...":""}</div>`).join("")}</div>`:'<p class="muted" style="margin:0">עוד אין השבוע. בניתם משהו? שתפו בקהילה כפוסט "הצלחה", גם אם זה קטן.</p>'}
              <a class="btn btn-w sm" style="margin-top:12px" href="${$}ezor-ishi/kehila/">לשתף בקהילה</a></section>
          </aside>
        </div>`,c.querySelectorAll("[data-used]").forEach(s=>s.onclick=async()=>{const d=Number(s.dataset.used),p=!t.has(d);s.disabled=!0;const{error:u}=await o.rpc("too_drop_mark",{p_drop:d,p_done:p});if(u)return s.disabled=!1,y(f(u),!0);p?t.add(d):t.delete(d),l.drops_done=[...t],p&&y("מעולה. נספר לרצף השבועי שלכם."),w(i,r)})}function v(i,r){const a=r.has(i.id);return`<button class="btn ${a?"btn-w":"btn-k"} sm" data-used="${i.id}" aria-pressed="${a}">${a?"✓ השתמשתי (לביטול)":"השתמשתי בזה"}</button>`}
