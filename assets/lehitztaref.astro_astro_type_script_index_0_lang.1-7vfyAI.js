document.querySelectorAll("[data-plan]").forEach(e=>e.addEventListener("click",()=>{const t=document.getElementById("plan-sel");t&&(t.value=e.dataset.plan)}));
