const e=new URLSearchParams(location.search).get("firm"),o=document.getElementById("c-firm");e&&o&&[...o.options].some(t=>t.value===e)&&(o.value=e);
