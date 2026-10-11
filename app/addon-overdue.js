/* addon-overdue.js (11.10.2026, Yakir; v b: the card really redraws, call and WhatsApp reminder per client): in כספים > שכ"ט וגבייה, tapping the "תשלומים באיחור" card shows only the
   clients who are late, oldest debt first, so he knows whom to collect from. Tapping again (or any tab) goes back.
   Works with the patch views-work.js~p20261011a, which makes the card clickable and swaps the tab content. */
(function (s) {
  if (!s) return;
  const n = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const money = v => (s.money ? s.money(v) : '₪' + Math.round(+v || 0).toLocaleString('he-IL'));
  const bump = () => { try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.render) s.render(); }; // bump only clears the memo, render draws
  s.ovdOn = false;
  s.ovdHtml = function () {
    const st = s.feeStats ? s.feeStats() : { instOverdue: [] };
    const L = st.instOverdue || [];
    const total = L.reduce((a, x) => a + (+x.amount || 0), 0);
    const by = new Map();
    L.forEach(x => { const p = x.plan || {}; const k = p.id || p.name || '?'; if (!by.has(k)) by.set(k, { plan: p, items: [] }); by.get(k).items.push(x); });
    const groups = [...by.values()].map(g => { g.items.sort((a, b) => String(a.due || '').localeCompare(String(b.due || ''))); g.sum = g.items.reduce((a, x) => a + (+x.amount || 0), 0); g.oldest = g.items[0] && g.items[0].due; return g; })
      .sort((a, b) => String(a.oldest || '').localeCompare(String(b.oldest || '')));
    const days = d => { try { return Math.abs(s.diffDays(d)); } catch { return 0; } };
    const head = `<div class="card" id="ovd-top" style="margin-bottom:12px;border-color:var(--bad);scroll-margin-top:12px"><div class="card-h"><h2>תשלומים באיחור: ${L.length} · ${money(total)}</h2><button class="btn sm" data-a="ovd-open">חזרה לכל התשלומים</button></div>
      <div class="card-b"><p class="muted small" style="margin:0">רק מי שמאחר, מהחוב הוותיק ביותר. אחרי שהכסף מתקבל מסמנים את התשלום כשולם בכרטיס של הלקוח.</p></div></div>`;
    if (!groups.length) return head + (s.empty ? s.empty('אין תשלומים באיחור', 'כל הלקוחות משלמים בזמן.') : '');
    return head + groups.map(g => {
      const p = g.plan, cl = p.clientId && s.get ? s.get('clients', p.clientId) : null;
      const name = (cl && cl.name) || p.name || 'לקוח';
      const ph = (cl && cl.phone) || p.phone || '';
      const first = String(name).split(' ')[0];
      const msg = `שלום ${first}, תזכורת ידידותית ממשרד עו"ד יקיר דבול: ${g.items.length === 1 ? 'תשלום' : 'תשלומים'} בסך ${money(g.sum).replace('₪', '')} ₪ ${g.items.length === 1 ? 'שמועדו ' + (s.fmtDate ? s.fmtDate(g.items[0].due) : g.items[0].due) + ' עדיין פתוח' : 'עדיין פתוחים'}. נשמח להסדיר. אם כבר שילמתם, תודה ותתעלמו מההודעה.`;
      const wa = ph && s.waLink ? s.waLink(ph, msg) : '';
      const lines = g.items.map(x => `<li>${s.fmtDate ? n(s.fmtDate(x.due)) : n(x.due)} · ${money(x.amount)} · <b style="color:var(--bad)">${days(x.due)} ימים באיחור</b></li>`).join('');
      const card = s.planCard ? s.planCard(p) : '';
      return `<div class="card" style="margin-bottom:10px"><div class="card-h"><div><b>${n(name)}</b><div class="small muted">חוב באיחור: <b style="color:var(--bad)">${money(g.sum)}</b> (${g.items.length} ${g.items.length === 1 ? 'תשלום' : 'תשלומים'})</div></div><div class="btn-row" style="gap:6px;flex-wrap:wrap">${ph ? `<a class="btn xs" href="tel:${n(ph)}">${s.icon ? s.icon('phone', 13) : ''} ${n(s.fmtPhone ? s.fmtPhone(ph) : ph)}</a>` : ''}${wa ? `<a class="btn xs" href="${n(wa)}" target="_blank" rel="noopener">${s.icon ? s.icon('wa', 13) : ''} תזכורת בוואטסאפ</a>` : ''}${cl ? `<a class="btn xs" data-a="go" data-v="client" data-id="${n(cl.id)}" href="#client">לכרטיס הלקוח</a>` : ''}</div></div>
        <div class="card-b"><ul style="margin:0 0 8px;padding-inline-start:18px">${lines}</ul>${card ? `<details><summary class="small" style="cursor:pointer">כל התוכנית וסימון תשלום</summary>${card}</details>` : ''}</div></div>`;
    }).join('');
  };
  const go = () => { s.ovdOn = !s.ovdOn; bump(); if (s.ovdOn) setTimeout(() => { const t = document.getElementById('ovd-top') || document.querySelector('.tabs'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); };
  if (s.act) s.act('ovd-open', go);
  else document.addEventListener('click', e => { if (e.target.closest('[data-a="ovd-open"]')) { e.preventDefault(); go(); } });
  // any tab of the page turns the overdue view off
  document.addEventListener('click', e => { if (s.ovdOn && e.target.closest('[data-seg="tab"]')) s.ovdOn = false; }, true);
})(window.O);
