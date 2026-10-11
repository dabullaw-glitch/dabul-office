/* addon-keys.js (11.10.2026, Yakir): secure box for the Morning (Green Invoice) API key, for the online services
   payment links. Shown at the top of שיווק > יומן תוכן next to the other connection boxes, only until Morning is
   connected. The ID and secret go to the server (function bufauth, action save-morning), are tested against Morning
   and are never shown again. */
(function (s) {
  if (!s) return;
  const n = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const bump = () => (s.bump ? s.bump() : s.render());
  const pay = () => (((s.S && s.S.data && s.S.data.settings) || {}).pay) || {};
  function morningCard() {
    const m = pay().morning || {};
    if (m.ok) return '';
    const info = `<p class="muted small" style="margin:6px 0">במורנינג: הגדרות > הגדרות מתקדמות > כלים למפתחים > מפתחות API > יצירת מפתח. מעתיקים את המזהה (ID) ואת הסוד (Secret) ומדביקים כאן. הם נשמרים בשרת בלבד ולא מוצגים שוב.</p>`;
    if (!window.SB) return `<div class="card card-b" style="margin-bottom:12px"><b>חיבור מורנינג (תשלומים)</b> <span class="pill p-warn">לא מחובר</span>${info}</div>`;
    return `<div class="card card-b" style="margin-bottom:12px"><b>חיבור מורנינג (תשלומים)</b> <span class="pill p-warn">לא מחובר</span>${info}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="pk_mid" type="password" dir="ltr" autocomplete="off" placeholder="API key ID" style="flex:1;min-width:180px"><input id="pk_msec" type="password" dir="ltr" autocomplete="off" placeholder="API key Secret" style="flex:1;min-width:180px"><button class="btn sm" data-a="pk-morning">שמירה ובדיקה</button></div></div>`;
  }
  s.morningCard = morningCard;
  // wrap the connection boxes of the content calendar once addon-pub has defined them
  let tries = 0;
  const wrap = () => {
    if (typeof s.bufTop === 'function' && !s.bufTop.__keys) {
      const orig = s.bufTop; const f = function () { return morningCard() + orig.apply(this, arguments); }; f.__keys = true; s.bufTop = f; return;
    }
    if (++tries < 60) setTimeout(wrap, 250);
  };
  wrap();
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('[data-a="pk-morning"]'); if (!b) return;
    e.preventDefault();
    const id = (((document.getElementById('pk_mid') || {}).value) || '').trim(), secret = (((document.getElementById('pk_msec') || {}).value) || '').trim();
    if (id.length < 8 || secret.length < 8 || /\s/.test(id + secret)) { s.toast('מדביקים את המזהה ואת הסוד המלאים, בלי רווחים', 'bad'); return; }
    b.disabled = true; b.textContent = 'בודק מול מורנינג...';
    try {
      const { data, error } = await window.SB.functions.invoke('bufauth', { body: { action: 'save-morning', id, secret } });
      if (error) { let m = ''; try { m = (await error.context.json()).error; } catch { /* no body */ } throw new Error(m || 'השמירה נכשלה'); }
      ['pk_mid', 'pk_msec'].forEach(x => { const el = document.getElementById(x); if (el) el.value = ''; });
      const st = s.S.data.settings || (s.S.data.settings = {}); st.pay = Object.assign({}, st.pay || {}, { morning: { ok: true, saved: new Date().toISOString(), business: (data && data.business) || '' } });
      s.toast('מורנינג מחובר' + (data && data.business ? ` (${n(data.business)})` : '') + '. נשלח אישור גם לטלגרם.'); bump();
    } catch (err) { s.toast(err.message || 'השמירה נכשלה, נסה שוב', 'bad'); b.disabled = false; b.textContent = 'שמירה ובדיקה'; }
  });
})(window.O);
