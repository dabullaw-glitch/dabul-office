// End of a scan run: print every stored post as one JSON array for get_page_text, then clear the store.
let acc = {}; try { acc = JSON.parse(localStorage.getItem('__dblscan') || '{}') || {}; } catch (e) { acc = {}; }
try { localStorage.removeItem('__dblscan'); } catch (e) { }
const arr = Object.values(acc);
document.body.innerHTML = '<article><pre id="fbout"></pre></article>';
document.getElementById('fbout').textContent = JSON.stringify(arr);
`posts ${arr.length}`;
