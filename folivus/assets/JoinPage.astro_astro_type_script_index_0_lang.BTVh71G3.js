const t=document.getElementById("cmp-p");t?.addEventListener("change",()=>document.querySelectorAll("[data-cmp-p]").forEach(e=>e.hidden=e.dataset.cmpP!==t.value));
