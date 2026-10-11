/* addon-keys.js (11.10.2026, Yakir): secure boxes for the Postoria API key (TikTok and the other networks) and the Morning (Green Invoice) API key, for the online services
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
  // Postoria (11.10.2026, Yakir): one API for TikTok and the other networks. The key (Settings > Public API in
  // app.postoria.io) goes to the server only (set_secret POSTORIA_API_KEY); the office checks it and reports in Telegram.
  function postoriaCard() {
    const p = ((((s.S && s.S.data && s.S.data.settings) || {}).pub) || {}).postoria || {};
    if (p.ok) return '';
    const st = p.saved ? '<span class="pill p-warn">נשמר, בבדיקה</span>' : '<span class="pill p-warn">לא מחובר</span>';
    const info = `<p class="muted small" style="margin:6px 0">ב-app.postoria.io: בתפריט Settings, בחלק Public API, לוחצים ליצירת מפתח (מתחיל ב-pst_). מעתיקים את כל המפתח ומדביקים כאן. המפתח נשמר בשרת בלבד ולא יוצג שוב.</p>`;
    if (!window.SB) return `<div class="card card-b" style="margin-bottom:12px"><b>חיבור Postoria (טיקטוק ושאר הרשתות)</b> ${st}${info}</div>`;
    return `<div class="card card-b" style="margin-bottom:12px"><b>חיבור Postoria (טיקטוק ושאר הרשתות)</b> ${st}${info}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="pk_pst" type="password" dir="ltr" autocomplete="off" placeholder="${p.saved ? 'נשמר. להחלפה מדביקים מפתח חדש' : 'pst_live_...'}" style="flex:1;min-width:220px"><button class="btn sm" data-a="pk-postoria">שמירה</button></div></div>`;
  }
  s.postoriaCard = postoriaCard;

  // wrap the connection boxes of the content calendar once addon-pub has defined them
  let tries = 0;
  const wrap = () => {
    if (typeof s.bufTop === 'function' && !s.bufTop.__keys) {
      const orig = s.bufTop; const f = function () { return postoriaCard() + morningCard() + orig.apply(this, arguments); }; f.__keys = true; s.bufTop = f; return;
    }
    if (++tries < 60) setTimeout(wrap, 250);
  };
  wrap();
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('[data-a="pk-postoria"]'); if (!b) return;
    e.preventDefault();
    const t = (((document.getElementById('pk_pst') || {}).value) || '').trim();
    if (t.length < 20 || /\s/.test(t) || !/^pst_/.test(t)) { s.toast('המפתח לא נראה תקין. מעתיקים את כל המפתח (מתחיל ב-pst_), בלי רווחים', 'bad'); return; }
    b.disabled = true;
    try {
      const { error } = await window.SB.rpc('set_secret', { p_key: 'POSTORIA_API_KEY', p_value: t }); if (error) throw error;
      const el = document.getElementById('pk_pst'); if (el) el.value = '';
      await s.patch('settings', 'pub', { postoria: { saved: new Date().toISOString(), ok: false } });
      s.toast('נשמר. המערכת תבדוק את החיבור ותעדכן.'); bump();
    } catch { s.toast('השמירה נכשלה, נסה שוב', 'bad'); }
    b.disabled = false;
  });
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
