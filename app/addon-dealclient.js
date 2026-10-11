/* addon-dealclient.js (11.10.2026, Yakir): in "פתיחת עסקה חדשה", a new client is added right inside the deal form,
   without closing it. Also a search box over the long client list, and the chosen clients shown as tags.
   The "לקוח חדש" button at the bottom of the form opens the same box (before, it closed the deal form). */
(function (s) {
  if (!s || s.DEALCLIENT) return; s.DEALCLIENT = '20261011a';
  const n = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const norm = v => (s.norm ? s.norm(v) : String(v || '').toLowerCase().trim());
  const phoneN = v => (s.normPhone ? s.normPhone(v) : String(v || '').replace(/\D/g, ''));

  const st = document.createElement('style');
  st.textContent = `.dc-box{display:grid;gap:8px;margin:0 0 8px}
.dc-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.dc-tools input{flex:1;min-width:180px}
.dc-chips{display:flex;flex-wrap:wrap;gap:6px;min-height:0}
.dc-chip{display:inline-flex;align-items:center;gap:6px;background:var(--panel2);border:1px solid var(--line);border-radius:999px;padding:3px 6px 3px 10px;font-size:13.5px}
.dc-chip button{border:0;background:none;cursor:pointer;color:var(--muted);font-size:15px;line-height:1;padding:0 2px}
.dc-new{border:1px solid var(--accent, #0b7f6b);border-radius:12px;padding:12px;background:var(--panel);display:grid;gap:8px}
.dc-new .g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media(max-width:760px){.dc-new .g{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.dc-new label{font-size:13px;color:var(--muted);display:grid;gap:3px}
.dc-new .warn{font-size:13.5px;color:var(--bad)}`;
  document.head.appendChild(st);

  function enhance() {
    const ovs = document.querySelectorAll('.ov'); const ov = ovs[ovs.length - 1]; if (!ov) return;
    const sel = ov.querySelector('select[name="clientIds"]'); if (!sel || sel.dataset.dc) return;
    sel.dataset.dc = '1';
    const box = document.createElement('div'); box.className = 'dc-box';
    box.innerHTML = `<div class="dc-tools"><input type="search" class="in" data-dc-q placeholder="חיפוש לקוח לפי שם או טלפון" autocomplete="off">
      <button type="button" class="btn sm" data-dc-open>+ לקוח חדש</button></div>
      <div class="dc-new" data-dc-new hidden><b>לקוח חדש לעסקה</b>
        <div class="g"><label>שם מלא *<input class="in" data-dc-f="name" autocomplete="off"></label><label>טלפון<input class="in" data-dc-f="phone" inputmode="tel" dir="ltr" autocomplete="off"></label>
        <label>מייל<input class="in" data-dc-f="email" inputmode="email" dir="ltr" autocomplete="off"></label><label>ת״ז<input class="in" data-dc-f="idNo" inputmode="numeric" dir="ltr" autocomplete="off"></label></div>
        <div class="warn" data-dc-warn hidden></div>
        <div class="dc-tools"><button type="button" class="btn pri sm" data-dc-add>הוספה ובחירה לעסקה</button><button type="button" class="btn sm" data-dc-cancel>ביטול</button></div></div>
      <div class="dc-chips" data-dc-chips></div>`;
    sel.parentElement.insertBefore(box, sel);
    const q = box.querySelector('[data-dc-q]'), panel = box.querySelector('[data-dc-new]'), warn = box.querySelector('[data-dc-warn]'), chips = box.querySelector('[data-dc-chips]');
    const f = k => box.querySelector(`[data-dc-f="${k}"]`);
    const drawChips = () => {
      const on = [...sel.selectedOptions];
      chips.innerHTML = on.length ? on.map(o => `<span class="dc-chip">${n(o.textContent.split(' · ')[0])}<button type="button" data-dc-x="${n(o.value)}" aria-label="הסרה">×</button></span>`).join('') : '<span class="small muted">עוד לא נבחר לקוח. בוחרים מהרשימה או מוסיפים לקוח חדש.</span>';
    };
    const filter = () => { const t = norm(q.value), d = phoneN(q.value); [...sel.options].forEach(o => { const txt = norm(o.textContent); o.hidden = !!t && !o.selected && !txt.includes(t) && !(d && d.length >= 3 && phoneN(o.textContent).includes(d)); }); };
    // a plain click picks or unpicks a client (no need to hold Ctrl)
    sel.addEventListener('mousedown', e => { const o = e.target.closest && e.target.closest('option'); if (!o) return; e.preventDefault(); o.selected = !o.selected; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    sel.addEventListener('change', drawChips);
    q.addEventListener('input', filter);
    chips.addEventListener('click', e => { const b = e.target.closest('[data-dc-x]'); if (!b) return; const o = [...sel.options].find(x => x.value === b.dataset.dcX); if (o) { o.selected = false; drawChips(); filter(); } });
    const open = () => { panel.hidden = false; warn.hidden = true; if (q.value && !/\d{3}/.test(q.value) && !f('name').value) f('name').value = q.value.trim(); setTimeout(() => f('name').focus(), 30); };
    box.querySelector('[data-dc-open]').onclick = open;
    box.querySelector('[data-dc-cancel]').onclick = () => { panel.hidden = true; };
    box.querySelector('[data-dc-add]').onclick = async (ev) => {
      const v = { name: f('name').value.trim(), phone: f('phone').value.trim(), email: f('email').value.trim(), idNo: f('idNo').value.trim() };
      if (!v.name) { warn.hidden = false; warn.textContent = 'חסר שם הלקוח'; f('name').focus(); return; }
      const dup = (s.all ? s.all('clients') : []).find(o => (phoneN(v.phone) && phoneN(o.phone) === phoneN(v.phone)) || (v.idNo && o.idNo === v.idNo));
      const pick = id => { let o = [...sel.options].find(x => x.value === id); if (!o) { const c = s.get('clients', id) || v; o = new Option(c.name + (c.phone ? ' · ' + c.phone : ''), id); sel.insertBefore(o, sel.firstChild); } o.hidden = false; o.selected = true; drawChips(); };
      if (dup && !ev.target.dataset.force) {
        warn.hidden = false; warn.innerHTML = `כבר יש כרטיס עם אותו טלפון או ת״ז: <b>${n(dup.name)}</b>. <button type="button" class="btn xs" data-dc-use="${n(dup.id)}">לבחור אותו</button> <button type="button" class="btn xs" data-dc-force>ליצור כרטיס חדש בכל זאת</button>`;
        warn.querySelector('[data-dc-use]').onclick = () => { pick(dup.id); panel.hidden = true; s.toast && s.toast('הלקוח הקיים נבחר לעסקה'); };
        warn.querySelector('[data-dc-force]').onclick = () => { const b = box.querySelector('[data-dc-add]'); b.dataset.force = '1'; b.click(); };
        return;
      }
      const btn = box.querySelector('[data-dc-add]'); btn.disabled = true;
      try {
        const id = s.uid ? s.uid('c') : 'c-' + Date.now().toString(36);
        await s.save('clients', id, Object.assign(v, { tags: [], created: s.today ? s.today() : new Date().toISOString().slice(0, 10) }));
        pick(id); panel.hidden = true; ['name', 'phone', 'email', 'idNo'].forEach(k => { f(k).value = ''; }); q.value = ''; filter();
        s.toast && s.toast('הלקוח נוסף ונבחר לעסקה');
      } catch (e) { warn.hidden = false; warn.textContent = 'השמירה נכשלה, נסה שוב'; }
      btn.disabled = false; delete btn.dataset.force;
    };
    // the footer button now opens the same box
    ov.querySelectorAll('[data-a="new-client-inline"]').forEach(b => { b.removeAttribute('data-a'); b.type = 'button'; b.onclick = e => { e.preventDefault(); open(); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    const help = sel.parentElement.querySelector('small'); if (help) help.textContent = 'לחיצה על שם בוחרת או מבטלת. אפשר לבחור כמה לקוחות.';
    drawChips();
  }

  // hook the deal form once the main views are loaded
  let tries = 0;
  (function hook() {
    const A = s.ACT || {};
    if (typeof A['new-deal'] === 'function' && !A['new-deal'].__dc) {
      const orig = A['new-deal'];
      const f = function () { const r = orig.apply(this, arguments); setTimeout(enhance, 0); setTimeout(enhance, 120); return r; }; f.__dc = true;
      s.act('new-deal', f);
      return;
    }
    if (++tries < 80) setTimeout(hook, 250);
  })();
})(window.O);
