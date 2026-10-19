/* addon-msgfix.js (19.10.2026, approved by Yakir):
   1. Desktop sidebar: a "לידים" item right under "לקוחות" (with the count of new leads). Mobile (980px and narrower) is untouched.
   2. Fee plans: a toggle on every plan card, and a checkbox in the plan forms, "בלי תזכורות תשלום (שילם בצ׳קים / הוראת קבע)".
      When it is on, the automatic reminder 3 days before each installment is not sent for that plan (rule in engine.js~p20261019a).
   The deal screen toggle "לא לשלוח בקשת ביקורת" lives in remind.js~p20261019a. */
(function (s) {
  if (!s || s.MSGFIX) return; s.MSGFIX = '20261019a';
  const esc = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (s.icon ? s.icon(n, z) : '');
  const desktop = () => { try { return !!(window.matchMedia && window.matchMedia('(min-width: 981px)').matches); } catch (e) { return false; } };
  const NOREM = 'בלי תזכורות תשלום (שילם בצ׳קים / הוראת קבע)';

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

  // ---------- 2. fee plans: no payment reminders ----------
  if (typeof s.planCard === 'function') {
    const card0 = s.planCard;
    s.planCard = function (l) {
      let h = card0.apply(this, arguments);
      try {
        if (!l || !l.id || typeof h !== 'string') return h;
        const on = !!l.noRemind;
        const btn = `<button class="pill plain ${on ? 'p-warn' : 'p-mute'}" style="cursor:pointer" data-a="plan-norem" data-id="${esc(l.id)}" title="${on ? 'לחיצה תחזיר את התזכורת האוטומטית 3 ימים לפני כל תשלום' : 'לחיצה תפסיק את התזכורות האוטומטיות לתוכנית הזו (למשל שילם בצ׳קים או בהוראת קבע)'}">${icon(on ? 'x' : 'bell', 12)} ${on ? 'בלי תזכורות תשלום' : 'תזכורת 3 ימים לפני תשלום'}</button>`;
        const at = h.indexOf('<button class="btn xs" data-a="plan-edit"');
        if (at > 0) h = h.slice(0, at) + btn + h.slice(at);
      } catch (e) { console.error('msgfix plan', e); }
      return h;
    };
  }
  s.act && s.act('plan-norem', async (el, d) => {
    const p = s.get('plans', d.id); if (!p) return;
    const on = !p.noRemind;
    await s.patch('plans', p.id, { noRemind: on });
    s.toast(on ? 'לא יישלחו תזכורות תשלום לתוכנית הזו' : 'תזכורת תשלום תישלח 3 ימים לפני כל תשלום');
  });
  // the same choice inside "עריכת תוכנית" and "תוכנית תשלומים חדשה"
  if (typeof s.formModal === 'function') {
    const fm0 = s.formModal;
    s.formModal = function (o) {
      try {
        if (o && Array.isArray(o.fields) && (o.title === 'עריכת תוכנית' || o.title === 'תוכנית תשלומים חדשה') && !o.fields.some(f => f && f[0] === 'noRemind')) {
          o = Object.assign({}, o, { fields: o.fields.concat([['noRemind', NOREM, 'check', { full: true }]]) });
        }
      } catch (e) { console.error('msgfix form', e); }
      return fm0.call(this, o);
    };
  }
})(window.O);
