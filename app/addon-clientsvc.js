/* addon-clientsvc.js (11.10.2026, Yakir): what a client bought on the website shows inside the client's card.
   The "services" function links every online order to a client card (existing by phone or email, or a new one).
   Here, at the top of the card: each order with its status, and when opened, everything in one place: what the
   client filled in, the files, the price, status changes and an email to the client. For "בדיקת דירה לפני קנייה"
   the answer is written and sent from the same place (addon-check). Needs addon-svc.js and addon-check.js. */
(function (s) {
  if (!s || s.CLIENTSVC) return; s.CLIENTSVC = '20261011a';
  const n = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const st = document.createElement('style');
  st.textContent = `.csv-card{margin:0 0 14px;border-color:var(--accent,#0b7f6b)}
.csv-row{display:flex;gap:10px;align-items:center;padding:10px 2px;border-bottom:1px solid var(--line2)}.csv-row:last-child{border-bottom:0}
.csv-row .g{flex:1;min-width:0}.csv-row small{color:var(--muted)}
.csv-open{border-top:1px solid var(--line);margin-top:6px;padding-top:12px}
.csv-open h3{font-size:16px;margin:14px 0 8px}`;
  document.head.appendChild(st);

  function block(clientId) {
    if (!s.svcAll) return '';
    const L = s.svcAll().filter(o => o.clientId === clientId && o.status !== 'draft');
    if (!L.length) return '';
    const ui = s.UI.clientSvc = s.UI.clientSvc || {};
    const rows = L.map(o => {
      const on = ui.open === o.id;
      const body = on ? `<div class="csv-open">${s.svcInline(o.id)}${o.svc === 'precheck' && s.chkInline ? `<h3>התשובה ללקוח: בדיקת הדירה</h3>${s.chkInline(o.id) || '<p class="small muted">הבדיקה תיפתח לכתיבה אחרי התשלום.</p>'}` : ''}</div>` : '';
      return `<div><div class="csv-row"><div class="g"><b>${n(o.title || o.svc)}</b> ${s.svcPill ? s.svcPill(o.status) : ''}${o.test ? ' <small>(בדיקה)</small>' : ''}<br><small>${n(o.id)} · ${n(s.svcWhen ? s.svcWhen(o.created) : '')} · ${n(s.svcMoney ? s.svcMoney(o.price && o.price.total) : '')}</small></div>
        <button class="btn sm${on ? ' ghost' : ''}" data-a="csv-toggle" data-id="${n(o.id)}">${on ? 'סגירה' : 'פתיחה וטיפול'}</button></div>${body}</div>`;
    }).join('');
    const open = L.filter(o => ['review', 'awaiting', 'paid', 'working'].includes(o.status)).length;
    return `<div class="card csv-card"><div class="card-h"><h2>שירותים שהוזמנו באתר (${L.length})</h2>${open ? `<span class="pill p-warn">${open} פתוחים</span>` : ''}</div><div class="card-b">${rows}</div></div>`;
  }

  s.act('csv-toggle', (b, d) => { const ui = s.UI.clientSvc = s.UI.clientSvc || {}; ui.open = ui.open === d.id ? '' : d.id; s.render(); });

  let tries = 0;
  (function hook() {
    const V = s.V && s.V.client;
    if (V && typeof V.render === 'function' && !V.render.__csv) {
      const orig = V.render;
      const f = function (el) {
        orig.call(this, el);
        try {
          const id = s.R && s.R.id; if (!id) return;
          const html = block(id); if (!html) return;
          const box = document.createElement('div'); box.innerHTML = html;
          const head = el.querySelector('.page-head');
          if (head && head.parentElement) head.insertAdjacentElement('afterend', box.firstElementChild); else el.insertBefore(box.firstElementChild, el.firstChild);
        } catch (e) { console.error(e); }
      };
      f.__csv = true; V.render = f; return;
    }
    if (++tries < 80) setTimeout(hook, 250);
  })();
})(window.O);
