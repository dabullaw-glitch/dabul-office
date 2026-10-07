/* addon-pub.js: "לוח פרסום" in שיווק. The shared publishing calendar (docs coll "pub"):
   what goes out, when, on which channel, and who publishes it (Grok Bot or the office system).
   Grok Bot reads the same calendar from the public page (settings/pub.key). Here you can see it, and cancel or restore an item. */
(function (s) {
  if (!s || s.PUB) return; s.PUB = '20261007a';
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
  const OWN = { grok: 'גרוק בוט', system: 'המערכת', yakir: 'יקיר' };
  const ST = { planned: 'מתוכנן', published: 'פורסם', skipped: 'בוטל', waiting: 'מחכה לחיבור' };
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
    return `<div class="card card-b"><p class="muted" style="margin-top:0">לוח אחד לכל מה שמתפרסם: מה, מתי, באיזה ערוץ ומי מפרסם. <b>גרוק בוט</b> מפרסם בפייסבוק, ביוטיוב, בלינקדאין, ב-X ובגוגל עסקי, ו<b>המערכת</b> מפרסמת באינסטגרם, בטיקטוק ובקבוצת הוואטסאפ. גרוק קורא את הלוח הזה כל יום, כך ששניהם מסונכרנים. פריט שמבטלים כאן לא יוצא.</p>
      <div class="pb-legend"><span><span class="pb-own" style="background:#1d6fd6">גרוק בוט</span></span><span><span class="pb-own" style="background:#a8873f">המערכת</span></span>${link ? `<a href="${n(link)}" target="_blank" rel="noopener">הלוח כפי שגרוק רואה אותו</a>` : ''}
      <a href="#" data-a="pb-past">${showPast ? 'להסתיר פריטים שעברו' : 'להציג גם פריטים שעברו'}</a></div>
      ${list || s.empty('הלוח ריק', 'פריטים חדשים נכנסים לכאן כל שבוע.')}</div>`;
  }
  s.pubView = pubView;
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a="pb-set"],[data-a="pb-past"]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.a === 'pb-past') { s.setUi ? s.setUi('mkt', 'pubpast', s.ui('mkt', 'pubpast', '') === '1' ? '' : '1') : null; bump(); return; }
    try { await s.patch('pub', b.dataset.id, { status: b.dataset.op, changedAt: new Date().toISOString(), changedBy: 'office' }); s.toast(b.dataset.op === 'skipped' ? 'בוטל. הפריט לא יתפרסם.' : 'הוחזר ללוח'); }
    catch { s.toast('לא נשמר, נסה שוב'); }
  });
})(window.O);
