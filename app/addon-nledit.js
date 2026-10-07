/* addon-nledit.js: editing the monthly newsletter in the office system (כספים > שיווק > ניוזלטר > עריכה).
   Every part of the issue can be changed before it goes out: subject, opening, the article of the month,
   updates, rulings, the question, the tip, further reading and the closing line. Saved straight to nl/<id>.content;
   the server checks the bar rules again before sending. */
(function (s) {
  if (!s || s.NLED) return; s.NLED = '20261007a';
  const n = s.esc;
  const st = document.createElement('style');
  st.textContent = `.nle label{display:block;font-weight:600;margin:14px 0 4px}.nle input,.nle textarea{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel,#fff);color:inherit;line-height:1.6}
.nle textarea{resize:vertical}.nle .hint{font-size:12px;color:var(--muted);font-weight:400;margin-inline-start:6px}
.nle fieldset{border:1px solid var(--line2,var(--line));border-radius:10px;padding:4px 12px 12px;margin:14px 0 0}.nle legend{font-weight:700;padding:0 6px;color:var(--accent)}
.nle .rm{display:flex;gap:6px;align-items:center;font-weight:400;font-size:13px;color:var(--muted);margin-top:8px}.nle .rm input{width:auto}
.nle h3{margin:22px 0 0;font-size:16px;border-top:1px solid var(--line2,var(--line));padding-top:14px}`;
  document.head.appendChild(st);
  const PFX = /^פרסומת:\s*/;
  const BANNED = /הטוב(?:ים|ה|ות)? ביותר|הכי טוב|מקסימלי|מומחה|מומחים|חינם|ללא עלות|ללא תשלום|הנחה של|הנחות|מבצע מיוחד|מבצעים|אחוזי הצלחה|מבטיח|מובטח|מוביל(?:ים|ה)? בתחום|מספר 1|שכר טרחה|שכ[״"]ט|ייעוץ ראשוני/;
  const rows = v => Math.min(26, Math.max(3, Math.ceil(String(v || '').length / 70) + String(v || '').split('\n').length));
  const inp = (k, label, v, hint) => `<label>${n(label)}${hint ? `<span class="hint">${n(hint)}</span>` : ''}</label><input data-k="${k}" value="${n(v || '')}">`;
  const area = (k, label, v, hint) => `<label>${n(label)}${hint ? `<span class="hint">${n(hint)}</span>` : ''}</label><textarea data-k="${k}" rows="${rows(v)}">${n(v || '')}</textarea>`;
  const rm = k => `<label class="rm"><input type="checkbox" data-k="${k}"> להסיר את הפריט הזה מהגיליון</label>`;

  function form(o) {
    const c = o.content || {}, f = c.feature || {};
    return `<div class="nle">
      <p class="small muted" style="margin:0">כאן משנים כל חלק בגיליון לפני שהוא יוצא. אחרי השמירה אפשר ללחוץ "תצוגה" ולראות אותו בדיוק כמו שהמנויים יקבלו. פרטי המשרד ליצירת קשר נוספים בסוף אוטומטית.</p>
      ${inp('subject', 'נושא המייל', String(o.subject || c.subject || '').replace(PFX, ''), 'המילה "פרסומת:" נוספת לבד בהתחלה')}
      ${inp('preheader', 'שורת התצוגה המקדימה', c.preheader, 'מה שרואים בתיבת הדואר ליד הנושא')}
      ${area('intro', 'פתיחה', c.intro)}
      <h3>הנושא של החודש</h3>
      ${inp('f.title', 'כותרת', f.title)}
      ${area('f.paras', 'הטקסט', (f.paras || []).join('\n\n'), 'שורה ריקה בין פסקה לפסקה')}
      ${area('f.points', 'מה בודקים בפועל', (f.points || []).join('\n'), 'כל שורה היא נקודה')}
      ${(c.news || []).length ? `<h3>מה השתנה החודש</h3>${c.news.map((x, i) => `<fieldset><legend>עדכון ${i + 1}</legend>${inp(`news.${i}.title`, 'כותרת', x.title)}${area(`news.${i}.text`, 'הסבר', x.text)}${inp(`news.${i}.url`, 'קישור למקור', x.url)}${rm(`news.${i}.rm`)}</fieldset>`).join('')}` : ''}
      ${(c.rulings || []).length ? `<h3>פסיקה חדשה</h3>${c.rulings.map((r, i) => `<fieldset><legend>פסק דין ${i + 1}</legend>${inp(`rul.${i}.title`, 'כותרת', r.title)}${inp(`rul.${i}.court`, 'בית המשפט', r.court)}${inp(`rul.${i}.date`, 'תאריך', r.date)}${area(`rul.${i}.what`, 'מה קרה', r.what)}${area(`rul.${i}.why`, 'מה זה אומר לכם', r.why)}${inp(`rul.${i}.url`, 'קישור לפסק הדין', r.url)}${rm(`rul.${i}.rm`)}</fieldset>`).join('')}` : ''}
      <h3>שאלה מהשטח</h3>
      ${inp('qa.q', 'השאלה', (c.qa || {}).q)}
      ${area('qa.a', 'התשובה', (c.qa || {}).a)}
      <h3>טיפ החודש</h3>
      ${area('tip', 'הטיפ', c.tip)}
      ${(c.articles || []).length ? `<h3>להרחבה באתר</h3>${c.articles.map((a, i) => `<fieldset><legend>מאמר ${i + 1}</legend>${inp(`art.${i}.title`, 'כותרת', a.title)}${inp(`art.${i}.blurb`, 'משפט קצר', a.blurb)}${inp(`art.${i}.url`, 'קישור', a.url)}${rm(`art.${i}.rm`)}</fieldset>`).join('')}` : ''}
      <h3>סיום</h3>
      ${inp('signoff', 'משפט הסיום', c.signoff, 'בלי הזמנה להשיב למייל')}
    </div>`;
  }

  function collect(box, o) {
    const v = k => { const e = box.querySelector(`[data-k="${k}"]`); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : undefined; };
    const c = JSON.parse(JSON.stringify(o.content || {}));
    const subj = String(v('subject') || '').replace(PFX, '');
    c.subject = subj; c.preheader = v('preheader'); c.intro = v('intro'); c.tip = v('tip'); c.signoff = v('signoff');
    c.feature = Object.assign({}, c.feature || {}, {
      title: v('f.title'),
      paras: String(v('f.paras') || '').split(/\n\s*\n/).map(x => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean),
      points: String(v('f.points') || '').split('\n').map(x => x.replace(/^[-•✓\s]+/, '').trim()).filter(Boolean)
    });
    c.news = (c.news || []).map((x, i) => v(`news.${i}.rm`) ? null : { title: v(`news.${i}.title`), text: v(`news.${i}.text`), url: v(`news.${i}.url`) }).filter(x => x && x.title);
    c.rulings = (c.rulings || []).map((r, i) => v(`rul.${i}.rm`) ? null : { title: v(`rul.${i}.title`), court: v(`rul.${i}.court`), date: v(`rul.${i}.date`), what: v(`rul.${i}.what`), why: v(`rul.${i}.why`), url: v(`rul.${i}.url`) }).filter(x => x && x.title);
    c.articles = (c.articles || []).map((a, i) => v(`art.${i}.rm`) ? null : { title: v(`art.${i}.title`), blurb: v(`art.${i}.blurb`), url: v(`art.${i}.url`) }).filter(x => x && x.title);
    c.qa = { q: v('qa.q'), a: v('qa.a') };
    return { c, subject: 'פרסומת: ' + subj };
  }

  s.act('mk-nledit', b => {
    const id = b.dataset.id, o = s.get('nl', id);
    if (!o) return;
    if (!['draft', 'held'].includes(o.status)) { s.toast('אפשר לערוך רק גיליון שעוד לא אושר לשליחה'); return; }
    s.modal({ title: 'עריכת הניוזלטר', wide: true, body: form(o),
      foot: `<button class="btn" data-close>ביטול</button><button class="btn" data-a="mk-nlsave" data-id="${n(id)}" data-then="view">שמירה ותצוגה</button><button class="btn pri" data-a="mk-nlsave" data-id="${n(id)}">שמירה</button>` });
  });
  s.act('mk-nlsave', async b => {
    const id = b.dataset.id, o = s.get('nl', id), ov = b.closest('.ov');
    if (!o || !ov) return;
    const { c, subject } = collect(ov, o);
    if (!c.subject) { s.toast('חסר נושא למייל'); return; }
    if (!(c.feature.paras || []).length) { s.toast('הנושא של החודש ריק. צריך לפחות פסקה אחת'); return; }
    // the same bar-rules check the server runs on every issue: an edit must not bring in a forbidden phrase
    const hit = (JSON.stringify(c) + ' ' + subject).match(BANNED);
    if (hit) { s.toast(`לפי כללי הלשכה אי אפשר לכתוב "${hit[0]}" בניוזלטר. צריך לנסח אחרת ולשמור שוב`); return; }
    const patch = { content: c, subject, editedAt: new Date().toISOString(), editedIn: 'office' };
    if (o.status === 'held') { patch.status = 'draft'; patch.flags = []; }
    b.disabled = true;
    try {
      await s.patch('nl', id, patch);
      s.toast('נשמר. השינויים ייכנסו לגיליון שיישלח');
      const x = ov.querySelector('[data-close]'); if (x) x.click();
      if (b.dataset.then === 'view') { const vb = document.createElement('button'); vb.dataset.a = 'mk-nl'; vb.dataset.op = 'view'; vb.dataset.id = id; vb.hidden = true; document.body.appendChild(vb); vb.click(); vb.remove(); }
    } catch { s.toast('השמירה לא הצליחה, נסה שוב'); b.disabled = false; }
  });
})(window.O);
