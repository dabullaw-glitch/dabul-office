/* addon-zznoans.js (23.11.2026, Yakir: "צריך להוסיף מצב שבו התקשרתי ולא ענו, שאדע כמה ניסיונות עשיתי לאותו ליד").
   - The "העברה לשלב" list in the lead window gets "התקשרתי ולא ענה (N ניסיונות עד עכשיו)". Choosing it and "עדכון" records
     one more call attempt without an answer, exactly like the "לא ענה" button (same follow-up messages, tasks, and the
     rule that after 3 tries the lead waits for Yakir's decision). The lead's stage itself does not change.
   - Every lead in the leads list shows how many tries had no answer, e.g. "2 ניסיונות ללא מענה".
   To undo: remove this file's row from app_files. */
(function (O) {
  if (!O || O.ZZNOANS) return;
  O.ZZNOANS = '20261123a';
  const VAL = '__noans';
  const missOf = id => { const l = O.get && O.get('leads', id); return l ? (l.calls || []).filter(c => c && !c.ok).length : 0; };
  const label = n => `התקשרתי ולא ענה${n ? ` (${n} ${n === 1 ? 'ניסיון' : 'ניסיונות'} עד עכשיו)` : ''}`;
  const leadIdNear = el => {
    const w = el.closest('.ov, .modal, [role="dialog"]') || document;
    const m = w.querySelector('[data-lxlead]');
    if (m) return m.getAttribute('data-lxlead');
    return '';
  };
  const st = document.createElement('style');
  st.textContent = '.nz-pill{display:inline-block;margin-top:4px;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fdecea;color:#b3261e;white-space:nowrap}';
  document.head.appendChild(st);

  function decorate() {
    // the stage lists in the lead window (#lx_st) and in the older lead sheet (#slst)
    document.querySelectorAll('#lx_st, #slst').forEach(sel => {
      const id = leadIdNear(sel), n = id ? missOf(id) : 0;
      let opt = sel.querySelector(`option[value="${VAL}"]`);
      if (!opt) {
        opt = document.createElement('option'); opt.value = VAL;
        const first = sel.querySelector('option[value="new"]');
        if (first && first.nextSibling) sel.insertBefore(opt, first.nextSibling); else sel.appendChild(opt);
      }
      const t = label(n); if (opt.textContent !== t) opt.textContent = t;
    });
    // the leads list: how many tries had no answer
    document.querySelectorAll('.lx-row[data-id]').forEach(row => {
      const n = missOf(row.getAttribute('data-id')), cell = row.querySelector('.st'); if (!cell) return;
      let p = cell.querySelector('.nz-pill');
      if (!n) { if (p) p.remove(); return; }
      if (!p) { p = document.createElement('div'); p.className = 'nz-pill'; cell.appendChild(p); }
      const t = `${n} ${n === 1 ? 'ניסיון' : 'ניסיונות'} ללא מענה`; if (p.textContent !== t) p.textContent = t;
    });
  }
  let q = 0;
  const mo = new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; try { decorate(); } catch (e) { console.warn('noans', e); } }); });
  const start = () => { mo.observe(document.body, { childList: true, subtree: true }); decorate(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // "עדכון" with "התקשרתי ולא ענה" chosen: one more attempt without an answer (the same as the "לא ענה" button)
  document.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-lx="stage"], [data-sl="stage"]'); if (!b) return;
    const box = b.closest('.ov, .modal, [role="dialog"]') || document;
    const sel = box.querySelector('#lx_st, #slst'); if (!sel || sel.value !== VAL) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const btn = box.querySelector('[data-lx="call-no"], [data-sl="call-no"]');
    if (btn) { btn.click(); return; }
    const id = leadIdNear(sel);
    if (!id || !O.logCall) { O.toast && O.toast('הליד סגור, אי אפשר לרשום ניסיון שיחה', 'bad'); return; }
    await O.logCall(id, false);
    const n = missOf(id);
    O.toast && O.toast(`נרשם. ${n} ${n === 1 ? 'ניסיון' : 'ניסיונות'} ללא מענה לליד הזה.`);
  }, true);
})(window.O);
