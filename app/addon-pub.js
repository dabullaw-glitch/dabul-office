/* addon-pub.js: "לוח פרסום" in שיווק. The shared publishing calendar (docs coll "pub"):
   what goes out, when, on which channel, and who publishes it (Grok Bot or the office system).
   Grok Bot reads the same calendar from the public page (settings/pub.key). Here you can see it, and cancel or restore an item. */
(function (s) {
  if (!s || s.PUB) return; s.PUB = '20261008b';
  const n = s.esc;
  const bump = () => (s.bump ? s.bump() : s.render());
  ['pub', 'settings'].forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); return; }
    db.collection('pub').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data.pub = r; s.S.loaded.pub = true; bump(); }, () => { s.S.loaded.pub = true; });
  })(0);
  const st = document.createElement('style');
  st.textContent = `.pb-day{margin:18px 0 6px;font-weight:700;font-size:15px;color:var(--muted)}
.pb-it{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:var(--card,#fff);border:1px solid var(--line2);margin-bottom:8px;border-right:4px solid #999}
.pb-it.grok{border-right-color:#1d6fd6}.pb-it.system{border-right-color:#a8873f}.pb-it.skipped{opacity:.5}
.pb-it .grow{min-width:0;flex:1}.pb-t{font-variant-numeric:tabular-nums;font-weight:700;min-width:44px}
.pb-own{display:inline-block;font-size:12px;border-radius:999px;padding:0 8px;color:#fff;background:#666;margin-left:6px}.grok .pb-own{background:#1d6fd6}.system .pb-own{background:#a8873f}
.pb-ch{font-size:12px;color:var(--muted)}.pb-note{font-size:13px;color:#7a6630}.pb-txt{white-space:pre-wrap;font-size:13px;color:var(--muted);max-height:4.6em;overflow:hidden;margin-top:4px}
.pb-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--muted)}`;
  document.head.appendChild(st);
  const CH = { facebook: 'פייסבוק', youtube: 'יוטיוב', linkedin: 'לינקדאין', x: 'X', gbp: 'גוגל עסקי', instagram: 'אינסטגרם', tiktok: 'טיקטוק', whatsapp: 'קבוצת וואטסאפ', newsletter: 'ניוזלטר', internal: 'פנימי' };
  const OWN = { grok: 'גרוק בוט', system: 'המערכת', buffer: 'המערכת (Buffer)', office: 'המערכת', yakir: 'יקיר' };
  const ST = { planned: 'מתוכנן', published: 'פורסם ✓', skipped: 'בוטל', waiting: 'מחכה לחיבור', missed: 'לא פורסם ⚠️', unverified: 'עבר (אין דרך לבדוק)' };
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const MEDIA = 'https://dabullaw-glitch.github.io/dabul-office/media/';
  const day = at => { const d = new Date(at.slice(0, 10) + 'T12:00:00Z'); return `יום ${DAYS[d.getUTCDay()]} ${at.slice(8, 10)}/${at.slice(5, 7)}`; };
  function pubView() {
    const cfg = (s.S.data.settings || {}).pub || {};
    const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
    const showPast = s.ui('mkt', 'pubpast', '') === '1';
    const rows = Object.entries(s.S.data.pub || {}).map(([id, d]) => ({ id, ...d }))
      .filter(r => r.at && (showPast || r.at.slice(0, 10) >= today)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    let last = '';
    const list = rows.map(r => {
      const d = r.at.slice(0, 10); const h = d !== last ? `<div class="pb-day">${day(r.at)}</div>` : ''; last = d;
      const media = (r.media || []).map(m => String(m).replace('{MEDIA}', cfg.media || MEDIA));
      return `${h}<div class="pb-it ${n(r.owner)} ${r.status === 'skipped' ? 'skipped' : ''}"><div class="pb-t">${n(r.at.slice(11, 16))}</div><div class="grow">
        <div><span class="pb-own">${n(OWN[r.owner] || r.owner)}</span><b>${n(r.title || '')}</b></div>
        <div class="pb-ch">${(r.channels || []).map(c => n(CH[c] || c)).join(' · ')} · ${n(ST[r.status] || r.status || '')}</div>
        ${r.note ? `<div class="pb-note">${n(r.note)}</div>` : ''}
        ${r.text ? `<div class="pb-txt">${n(String(r.text).slice(0, 400))}</div>` : ''}
        ${media.length ? `<div class="small">${media.map(m => `<a href="${n(m)}" target="_blank" rel="noopener">${n(m.split('/').pop())}</a>`).join(' · ')}</div>` : ''}
      </div><div>${r.status === 'skipped'
        ? `<button class="btn sm ghost" data-a="pb-set" data-op="planned" data-id="${n(r.id)}">להחזיר</button>`
        : r.status === 'planned' ? `<button class="btn sm ghost" data-a="pb-set" data-op="skipped" data-id="${n(r.id)}">לבטל</button>` : ''}</div></div>`;
    }).join('');
    const link = cfg.key ? `https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/pubcal?k=${encodeURIComponent(cfg.key)}` : '';
    const ig = cfg.ig || {};
    const conn = (cfg.buffer && cfg.buffer.ok ? bufCard(cfg.buffer) : '') + (cfg.socapi && cfg.socapi.ok ? sapiCard(cfg.socapi) : '') + igCard(ig);
    return conn + `<div class="card card-b"><p class="muted" style="margin-top:0">לוח אחד לכל מה שמתפרסם: מה, מתי, באיזה ערוץ. מאז 11.10.2026 <b>המערכת</b> מפרסמת הכל בעצמה: פייסבוק, לינקדאין ו-X דרך Buffer, יוטיוב דרך SocialAPI, אינסטגרם ישירות, והפוסט לגוגל עסקי נשלח אליך לטלגרם. פריט שמבטלים כאן לא יוצא.</p>
      <div class="pb-legend"><span><span class="pb-own" style="background:#1d6fd6">גרוק בוט</span></span><span><span class="pb-own" style="background:#a8873f">המערכת</span></span>${link ? `<a href="${n(link)}" target="_blank" rel="noopener">הלוח כפי שגרוק רואה אותו</a>` : ''}
      <a href="#" data-a="pb-past">${showPast ? 'להסתיר פריטים שעברו' : 'להציג גם פריטים שעברו'}</a></div>
      ${list || s.empty('הלוח ריק', 'פריטים חדשים נכנסים לכאן כל שבוע.')}</div>`;
  }
  // Instagram connection: "התחבר עם פייסבוק" (edge function fbauth), with the manual code field kept as a fallback
  let FBS = null, fbBusy = false;
  async function fbCall(action, extra) {
    const { data, error } = await window.SB.functions.invoke('fbauth', { body: Object.assign({ action }, extra || {}) });
    if (error) { let m = ''; try { m = (await error.context.json()).error; } catch { /* no body */ } throw new Error(m || 'הפעולה נכשלה'); }
    return data;
  }
  function fbStatus() { if (FBS || fbBusy || !window.SB) return; fbBusy = true; Promise.race([fbCall('status'), new Promise((_, rej) => setTimeout(() => rej(new Error('אין תשובה מהשרת, נסה לרענן את הדף')), 15000))]).then(d => { FBS = d; }).catch(e => { FBS = { error: e.message }; }).finally(() => { fbBusy = false; bump(); }); }
  function igCard(ig) {
    const head = `<b>חיבור אינסטגרם</b> ${ig.ok ? '<span class="pill p-ok">מחובר</span>' : '<span class="pill p-warn">לא מחובר</span>'}`;
    const manual = `<details style="margin-top:10px"><summary class="small muted" style="cursor:pointer">יש לך כבר קוד גישה? הדבקה ידנית</summary><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="pb_ig" type="password" dir="ltr" placeholder="EAA... / IGAA..." style="flex:1;min-width:200px"><button class="btn sm" data-a="pb-ig">שמירה</button></div></details>`;
    if (ig.ok) return `<div class="card card-b" style="margin-bottom:12px">${head}<p class="muted small" style="margin:6px 0">המערכת מפרסמת באינסטגרם לפי הלוח${ig.username ? ` (<span dir="ltr">@${n(ig.username)}</span>${ig.pageName ? `, דרך העמוד "${n(ig.pageName)}"` : ''})` : ''}.</p><button class="btn sm ghost" data-a="pb-fb-go">חיבור מחדש עם פייסבוק</button></div>`;
    if (!window.SB) return `<div class="card card-b" style="margin-bottom:12px">${head}<p class="muted small">החיבור זמין רק במערכת המחוברת.</p></div>`;
    fbStatus();
    const st = FBS;
    let body;
    if (!st) body = '<p class="muted small"><span class="spin"></span> בודק...</p>';
    else if (st.error) body = `<p class="muted small">לא הצלחתי לבדוק את מצב החיבור: ${n(st.error)}</p>`;
    else if (!st.hasApp) {
      const ok = '<span class="pill p-ok" style="margin-right:6px">נשמר</span>';
      body = `<p class="muted small" style="margin:6px 0"><b>שלב חד פעמי:</b> פרטי אפליקציית הפייסבוק של המשרד. מוצאים אותם ב-developers.facebook.com > האפליקציה > App settings > Basic. אפשר לשמור כל שדה בנפרד. הסוד נשמר בשרת ולא מוצג שוב.</p>
      <div style="display:grid;gap:8px;max-width:520px">
        <label class="small">App ID ${st.appId ? ok : ''}<input id="pb_fb_id" dir="ltr" inputmode="numeric" placeholder="מספר" value="${n(st.appId || '')}"></label>
        <label class="small">Configuration ID (אם יש Facebook Login for Business) ${st.configId ? ok : ''}<input id="pb_fb_conf" dir="ltr" inputmode="numeric" placeholder="מספר" value="${n(st.configId || '')}"></label>
        <label class="small">App Secret ${st.hasSecret ? ok : '(לוחצים Show באפליקציה, מעתיקים ומדביקים כאן)'}<input id="pb_fb_sec" type="password" dir="ltr" placeholder="${st.hasSecret ? 'נשמר. להחלפה מדביקים חדש' : '32 תווים'}"></label>
        <div><button class="btn sm" data-a="pb-fb-save">שמירה</button></div></div>
      <p class="small muted" style="margin:8px 0 0">בהגדרות ההתחברות של האפליקציה (Valid OAuth Redirect URIs) צריכה להופיע הכתובת: <code dir="ltr" style="user-select:all">${n(st.redirect || '')}</code></p>`;
    }
    else body = `<p class="muted small" style="margin:6px 0">לוחצים, פייסבוק שואל אם לאשר, בוחרים את עמוד המשרד ואת חשבון האינסטגרם ומאשרים. המערכת שומרת את החיבור לבד.</p>
      <button class="btn" data-a="pb-fb-go" style="background:#1877f2;color:#fff;border-color:#1877f2">התחבר עם פייסבוק</button>`;
    return `<div class="card card-b" style="margin-bottom:12px">${head}${ig.check === 'failed' && ig.error ? `<p class="small" style="color:#b4442f;margin:6px 0">הניסיון האחרון נכשל: ${n(ig.error)}</p>` : ''}${body}${manual}</div>`;
  }
  // Buffer (11.10.2026): the office publishes to Facebook, LinkedIn, X and the other channels connected in Buffer.
  // The API key is saved on the server only (set_secret BUFFER_API_KEY) and never shown again.
  function bufCard(b) {
    const head = `<b>חיבור Buffer</b> ${b.ok ? '<span class="pill p-ok">מחובר</span>' : b.saved ? '<span class="pill p-warn">נשמר, בבדיקה</span>' : '<span class="pill p-warn">לא מחובר</span>'}`;
    const chans = (b.channels || []).map(c => n(c.name || c.service || '')).filter(Boolean).join(' · ');
    const info = b.ok ? `<p class="muted small" style="margin:6px 0">המערכת מפרסמת דרך Buffer${chans ? `: ${chans}` : ''}.</p>` : `<p class="muted small" style="margin:6px 0">נכנסים ל-publish.buffer.com > Settings > API, יוצרים מפתח (Create API key), מעתיקים ומדביקים כאן. המפתח נשמר בשרת בלבד ולא מוצג שוב.</p>`;
    if (!window.SB) return `<div class="card card-b" style="margin-bottom:12px">${head}${info}</div>`;
    return `<div class="card card-b" style="margin-bottom:12px">${head}${info}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="pb_buf" type="password" dir="ltr" autocomplete="off" placeholder="${b.saved ? 'נשמר. להחלפה מדביקים מפתח חדש' : 'Buffer API key'}" style="flex:1;min-width:200px"><button class="btn sm" data-a="pb-buf">שמירה</button></div></div>`;
  }
  // shown at the top of שיווק > יומן תוכן until Buffer is connected (addon-cal puts the old list in a closed box)
  // SocialAPI (11.10.2026): YouTube uploads (10 a month on the current plan). Same pattern as Buffer.
  function sapiCard(b) {
    const head = `<b>חיבור SocialAPI (יוטיוב)</b> ${b.ok ? '<span class="pill p-ok">מחובר</span>' : '<span class="pill p-warn">לא מחובר</span>'}`;
    const acc = (b.accounts || []).map(a => n(`${a.platform}: ${a.name}`)).join(' · ');
    const info = b.ok ? `<p class="muted small" style="margin:6px 0">המערכת מעלה ליוטיוב דרך SocialAPI${acc ? `: ${acc}` : ''}. עד ${n(b.monthlyCap || 10)} העלאות בחודש.</p>` : `<p class="muted small" style="margin:6px 0">נכנסים ל-app.social-api.ai > API Keys, יוצרים מפתח (מתחיל ב-sapi_key_), מעתיקים ומדביקים כאן. המפתח נשמר בשרת בלבד ולא מוצג שוב.</p>`;
    if (!window.SB) return `<div class="card card-b" style="margin-bottom:12px">${head}${info}</div>`;
    return `<div class="card card-b" style="margin-bottom:12px">${head}${info}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input id="pb_sapi" type="password" dir="ltr" autocomplete="off" placeholder="${b.saved ? 'נשמר. להחלפה מדביקים מפתח חדש' : 'sapi_key_...'}" style="flex:1;min-width:200px"><button class="btn sm" data-a="pb-sapi">שמירה</button></div></div>`;
  }
  s.bufTop = () => { const c = (((s.S.data.settings || {}).pub) || {}); const b = c.buffer || {}, a = c.socapi || {}; return (b.ok ? '' : bufCard(b)) + (a.ok ? '' : sapiCard(a)); };
  s.pubView = pubView;
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a="pb-set"],[data-a="pb-past"],[data-a="pb-ig"],[data-a="pb-buf"],[data-a="pb-sapi"],[data-a="pb-fb-save"],[data-a="pb-fb-go"]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.a === 'pb-sapi') {
      const t = (((document.getElementById('pb_sapi') || {}).value) || '').trim();
      if (t.length < 20 || /\s/.test(t)) { s.toast('המפתח לא נראה תקין. מעתיקים את כל המפתח, בלי רווחים', 'bad'); return; }
      b.disabled = true;
      try {
        const { data, error } = await window.SB.functions.invoke('bufauth', { body: { action: 'save-sapi', key: t } });
        if (error) { let m = ''; try { m = (await error.context.json()).error; } catch { /* no body */ } throw new Error(m || 'השמירה נכשלה'); }
        const el = document.getElementById('pb_sapi'); if (el) el.value = '';
        const cfg = ((s.S.data.settings || {}).pub) || null; if (cfg) cfg.socapi = { ok: true, saved: new Date().toISOString(), accounts: (data && data.accounts) || [], monthlyCap: 10 };
        s.toast('SocialAPI מחובר. הפרטים נשלחו גם לטלגרם.'); bump(); }
      catch (err) { s.toast(err.message || 'השמירה נכשלה, נסה שוב', 'bad'); }
      b.disabled = false; return;
    }
    if (b.dataset.a === 'pb-buf') {
      const t = (((document.getElementById('pb_buf') || {}).value) || '').trim();
      if (t.length < 20 || /\s/.test(t)) { s.toast('המפתח לא נראה תקין. מעתיקים את כל המפתח, בלי רווחים', 'bad'); return; }
      b.disabled = true;
      try {
        const { data, error } = await window.SB.functions.invoke('bufauth', { body: { action: 'save', key: t } });
        if (error) { let m = ''; try { m = (await error.context.json()).error; } catch { /* no body */ } throw new Error(m || 'השמירה נכשלה'); }
        const el = document.getElementById('pb_buf'); if (el) el.value = '';
        const cfg = ((s.S.data.settings || {}).pub) || null; if (cfg) cfg.buffer = { ok: true, saved: new Date().toISOString(), channels: (data && data.channels) || [] };
        s.toast(`מחובר. נמצאו ${((data && data.channels) || []).length} ערוצים. הפרטים נשלחו גם לטלגרם.`); bump(); }
      catch (err) { s.toast(err.message || 'השמירה נכשלה, נסה שוב', 'bad'); }
      b.disabled = false; return;
    }
    if (b.dataset.a === 'pb-fb-save') {
      const v = id => ((document.getElementById(id) || {}).value || '').trim();
      b.disabled = true;
      try { await fbCall('save-app', { appId: v('pb_fb_id'), appSecret: v('pb_fb_sec'), configId: v('pb_fb_conf') }); FBS = null; s.toast('נשמר'); bump(); }
      catch (err) { s.toast(err.message || 'השמירה נכשלה', 'bad'); }
      b.disabled = false; return;
    }
    if (b.dataset.a === 'pb-fb-go') {
      b.disabled = true;
      try { const d = await fbCall('start'); if (!d || !d.url) throw new Error('לא התקבל קישור'); location.href = d.url; }
      catch (err) { s.toast(err.message || 'לא הצלחתי לפתוח את פייסבוק', 'bad'); b.disabled = false; }
      return;
    }
    if (b.dataset.a === 'pb-ig') {
      const v = (document.getElementById('pb_ig') || {}).value || ''; const t = v.trim();
      if (t.length < 40 || /\s/.test(t)) { s.toast('הקוד לא נראה תקין. מעתיקים את כל הקוד, בלי רווחים', 'bad'); return; }
      try { const { error } = await window.SB.rpc('set_secret', { p_key: 'IG_TOKEN', p_value: t }); if (error) throw error;
        await s.patch('settings', 'pub', { ig: { saved: new Date().toISOString(), ok: false, check: 'pending' } }); s.toast('נשמר. המערכת תבדוק את החיבור ותעדכן בטלגרם.'); }
      catch { s.toast('השמירה נכשלה, נסה שוב', 'bad'); }
      return;
    }
    if (b.dataset.a === 'pb-past') { s.setUi ? s.setUi('mkt', 'pubpast', s.ui('mkt', 'pubpast', '') === '1' ? '' : '1') : null; bump(); return; }
    try { await s.patch('pub', b.dataset.id, { status: b.dataset.op, changedAt: new Date().toISOString(), changedBy: 'office' }); s.toast(b.dataset.op === 'skipped' ? 'בוטל. הפריט לא יתפרסם.' : 'הוחזר ללוח'); }
    catch { s.toast('לא נשמר, נסה שוב'); }
  });
})(window.O);
