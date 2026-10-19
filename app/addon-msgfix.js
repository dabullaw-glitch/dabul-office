/* addon-msgfix.js (19.10.2026, approved by Yakir):
   1. Desktop sidebar: a "לידים" item right under "לקוחות" (with the count of new leads). Mobile (980px and narrower) is untouched.
   2. Fee plans (changed the same day by Yakir): the automatic reminder 3 days before each installment is OFF by default.
      It is switched on per plan (button on the plan card, checkbox in the plan forms: plan.autoRemind) or per client
      (switch in the client card, "כספים" tab: client.autoPayRemind). Rule in engine.js~p20261019c.
   The deal screen toggle "לא לשלוח בקשת ביקורת" lives in remind.js~p20261019a. */
(function (s) {
  if (!s || s.MSGFIX) return; s.MSGFIX = '20261019a';
  const esc = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (s.icon ? s.icon(n, z) : '');
  const desktop = () => { try { return !!(window.matchMedia && window.matchMedia('(min-width: 981px)').matches); } catch (e) { return false; } };

  // ---------- 1. sidebar item "לידים" (desktop only) ----------
  function sideLeads() {
    if (!desktop()) return;
    const side = document.querySelector('aside.side .nav .nav-g:not(.nav-sys)');
    if (!side || side.querySelector('a[data-v="leads"]')) return;
    const people = side.querySelector('a[data-v="clients"]');
    if (!people) return;
    const view = (s.R && s.R.view) || '';
    const onLeads = view === 'leads' || view === 'lead';
    let count = 0;
    try { count = s.all('leads').filter(l => l.status === 'חדש').length; } catch (e) { count = 0; }
    // the "לקוחות" badge counted the new leads; now they have their own item
    if (count) { const b = people.querySelector('.badge'); if (b && !b.classList.contains('b-bad')) b.remove(); }
    if (onLeads) people.classList.remove('on');
    const a = document.createElement('a');
    a.setAttribute('data-a', 'go'); a.setAttribute('data-v', 'leads'); a.setAttribute('href', '#leads');
    a.className = (onLeads ? 'on ' : '') + 'hide-m';
    if (onLeads) a.setAttribute('aria-current', 'page');
    a.innerHTML = `${icon('lead', 19)}<span>לידים</span>${count ? `<span class="badge">${count > 99 ? '99+' : count}</span>` : ''}`;
    people.insertAdjacentElement('afterend', a);
  }
  if (typeof s.render === 'function') {
    const render0 = s.render;
    s.render = function () {
      const r = render0.apply(this, arguments);
      try { sideLeads(); } catch (e) { console.error('msgfix side', e); }
      return r;
    };
  }
  window.addEventListener('resize', () => {
    const has = document.querySelector('aside.side a[data-v="leads"]');
    if (desktop() && !has) { try { sideLeads(); } catch (e) { /* next render */ } }
  });

  // ---------- 2. fee plans: automatic payment reminders are OFF unless switched on ----------
  // Yakir 19.10.2026: off for everyone by default. The reminder 3 days before an installment goes out only when he
  // switches it on for that plan (plan.autoRemind) or for the client (client.autoPayRemind). Rule: engine.js~p20261019c.
  const planOn = l => { if (!l) return false; if (l.noRemind) return false; if (l.autoRemind) return true; const c = l.clientId && s.get('clients', l.clientId); return !!(c && c.autoPayRemind); };
  if (typeof s.planCard === 'function') {
    const card0 = s.planCard;
    s.planCard = function (l) {
      let h = card0.apply(this, arguments);
      try {
        if (!l || !l.id || typeof h !== 'string') return h;
        const on = planOn(l);
        const byClient = on && !l.autoRemind;
        const btn = `<button class="pill plain ${on ? 'p-ok' : 'p-mute'}" style="cursor:pointer" data-a="plan-autorem" data-id="${esc(l.id)}" title="${on ? (byClient ? 'דלוק לכל התוכניות של הלקוח (בכרטיס הלקוח)' : 'לחיצה תכבה את התזכורת האוטומטית לתוכנית הזו') : 'לחיצה תדליק תזכורת אוטומטית ללקוח 3 ימים לפני כל תשלום'}">${icon(on ? 'bell' : 'x', 12)} ${on ? 'תזכורת אוטומטית דלוקה' : 'תזכורת אוטומטית כבויה'}</button>`;
        const at = h.indexOf('<button class="btn xs" data-a="plan-edit"');
        if (at > 0) h = h.slice(0, at) + btn + h.slice(at);
      } catch (e) { console.error('msgfix plan', e); }
      return h;
    };
  }
  s.act && s.act('plan-autorem', async (el, d) => {
    const p = s.get('plans', d.id); if (!p) return;
    const c = p.clientId && s.get('clients', p.clientId);
    if (!p.autoRemind && c && c.autoPayRemind && !p.noRemind) { s.toast('התזכורת דלוקה לכל התוכניות של הלקוח. אפשר לכבות אותה בכרטיס הלקוח, בלשונית כספים.'); return; }
    const on = !p.autoRemind;
    await s.patch('plans', p.id, { autoRemind: on, noRemind: false });
    s.toast(on ? 'תזכורת תישלח ללקוח 3 ימים לפני כל תשלום בתוכנית הזו' : 'התזכורת האוטומטית כבויה לתוכנית הזו');
  });
  // the same choice inside "עריכת תוכנית" and "תוכנית תשלומים חדשה"
  const AUTOREM = 'שליחת תזכורת אוטומטית ללקוח 3 ימים לפני כל תשלום';
  if (typeof s.formModal === 'function') {
    const fm0 = s.formModal;
    s.formModal = function (o) {
      try {
        if (o && Array.isArray(o.fields) && (o.title === 'עריכת תוכנית' || o.title === 'תוכנית תשלומים חדשה') && !o.fields.some(f => f && f[0] === 'autoRemind')) {
          o = Object.assign({}, o, { fields: o.fields.filter(f => !(f && f[0] === 'noRemind')).concat([['autoRemind', AUTOREM, 'check', { full: true }]]) });
        }
      } catch (e) { console.error('msgfix form', e); }
      return fm0.call(this, o);
    };
  }
  // client card, "כספים" tab: one switch for all the client's plans
  if (s.V && s.V.client && typeof s.V.client.render === 'function') {
    const cr0 = s.V.client.render;
    s.V.client.render = function (p) {
      cr0.call(this, p);
      try {
        if (s.ui('client', 'tab') !== 'money') return;
        const c = s.R && s.get('clients', s.R.id); if (!c || !p) return;
        if (p.querySelector('[data-a="client-autorem"]')) return;
        const on = !!c.autoPayRemind;
        const bar = document.createElement('div');
        bar.className = 'card'; bar.style.marginBottom = '12px';
        bar.innerHTML = `<div class="card-b" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="grow" style="min-width:200px"><b>תזכורות תשלום אוטומטיות ללקוח</b><div class="muted small">${on ? 'דלוק: הלקוח יקבל הודעה 3 ימים לפני כל תשלום, בכל התוכניות שלו.' : 'כבוי: לא יוצאות תזכורות אוטומטיות. אפשר להדליק כאן לכל התוכניות, או רק לתוכנית אחת בכרטיס שלה.'}</div></div><button class="btn ${on ? '' : 'primary'}" data-a="client-autorem" data-id="${esc(c.id)}">${icon('bell', 14)} ${on ? 'כיבוי' : 'הדלקה'}</button></div>`;
        const first = p.querySelector('.card');
        if (first && first.parentNode) first.parentNode.insertBefore(bar, first); else p.prepend(bar);
      } catch (e) { console.error('msgfix client', e); }
    };
  }
  s.act && s.act('client-autorem', async (el, d) => {
    const c = s.get('clients', d.id); if (!c) return;
    const on = !c.autoPayRemind;
    await s.patch('clients', c.id, { autoPayRemind: on });
    s.toast(on ? 'תזכורות תשלום אוטומטיות הודלקו ללקוח' : 'תזכורות תשלום אוטומטיות כובו ללקוח');
  });
})(window.O);
