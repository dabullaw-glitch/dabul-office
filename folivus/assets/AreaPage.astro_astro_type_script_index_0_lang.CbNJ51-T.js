document.querySelectorAll("form[data-refine]").forEach(e=>e.addEventListener("submit",a=>{a.preventDefault();const t=e.elements.namedItem("city").value;location.href=e.dataset.base+(t?t+"/":"")}));
