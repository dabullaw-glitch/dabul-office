/* addon-zzinsolv.js (25.10.2026, Yakir asked: "שיהיה לי אפשרות להוסיף סכומים גם בלי מסמכים" in the insolvency report).
   The "הוספת קבלה או מסמך" window gets a second button, "שמירת סכום בלי קובץ": the amount is ADDED to that line and month
   of the two-month report (income or expense), and kept in a list of amounts entered by hand (irep[period].manual).
   The line still shows "חסר" until a receipt is attached, because the trustee asks for one. The file button works as before. */
(function (O) {
  if (!O || O.ZZINSOLV || !O.ACT || !O.ACT['ie-upload'] || !O.iePeriods) return;
  O.ZZINSOLV = '20261025a';
  const orig = O.ACT['ie-upload'];
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  async function saveAmount(id, key, v) {
    const m = O.get('matters', id); if (!m) return false;
    const p = O.iePeriods(m).find(x => x.key === key); if (!p) return false;
    const amount = r2(String(v.amount || '').replace(/[^\d.\-]/g, ''));
    if (!amount) { O.toast('כותבים סכום', 'bad'); return false; }
    if (v.cat === 'other') { O.toast('"מסמך אחר" הוא רק קובץ. בוחרים שורה של הכנסה או הוצאה', 'bad'); return false; }
    const mi = Math.max(0, p.months.indexOf(v.month));
    const rep = Object.assign({}, O.ieRep(m, key));
    const label = (v.label || '').trim();
    if (v.cat === 'extra') {
      const side = v.side === 'inc' ? 'incX' : 'expX', list = (rep[side] || []).map(x => Object.assign({}, x, { v: (x.v || [0, 0]).slice() }));
      const name = label || (side === 'incX' ? 'הכנסה נוספת' : 'הוצאה נוספת');
      let row = list.find(x => x.label === name); if (!row) { row = { label: name, v: [0, 0] }; list.push(row); }
      row.v[mi] = r2((+row.v[mi] || 0) + amount);
      rep[side] = list;
    } else {
      const isInc = (O.IE_INC || []).some(x => x[0] === v.cat);
      const side = isInc ? 'inc' : 'exp', obj = Object.assign({}, rep[side] || {});
      // an empty cell is filled on screen from the receipts' amounts, so start from that sum, not from zero
      const fromFiles = ((O.ieReceiptSums ? O.ieReceiptSums(rep, p) : {})[v.cat] || [0, 0])[mi] || 0;
      const arr = (obj[v.cat] || ['', '']).slice(); const cur = (arr[mi] === '' || arr[mi] == null) ? fromFiles : (+arr[mi] || 0);
      arr[mi] = r2(cur + amount); obj[v.cat] = arr;
      rep[side] = obj;
    }
    rep.manual = (rep.manual || []).concat([{ cat: v.cat, month: v.month, amount, label, side: v.cat === 'extra' ? (v.side || 'exp') : undefined, at: new Date().toISOString(), by: 'office' }]);
    await O.patch('matters', id, { irep: Object.assign({}, m.irep || {}, { [key]: rep }) });
    const line = v.cat === 'extra' ? (label || 'הכנסה / הוצאה נוספת') : ((O.IE_LINES || []).find(x => x[0] === v.cat) || [0, v.cat])[1];
    O.toast(`נוסף ₪${amount.toLocaleString('he-IL')} ל${line} (${O.ieMonth ? O.ieMonth(v.month) : v.month})`);
    return true;
  }
  O.act('ie-upload', (el, ds) => {
    const m = O.get('matters', ds.id), p = m && O.iePeriods(m).find(x => x.key === ds.k);
    if (!p) return orig(el, ds);
    orig(el, ds); // the same window as before, with the file button
    setTimeout(() => {
      const ov = [...document.querySelectorAll('.ov')].pop(); if (!ov || ov.querySelector('[data-zzamt]')) return;
      const form = ov.querySelector('#mf .fg'); const foot = ov.querySelector('.modal-f'); if (!form || !foot) return;
      form.insertAdjacentHTML('beforeend', `<div class="f" data-zzx hidden><label for="f_zzside">הכנסה או הוצאה</label><select id="f_zzside" name="zzside"><option value="exp">הוצאה</option><option value="inc">הכנסה</option></select></div>
        <div class="f" data-zzx hidden><label for="f_zzlabel">תיאור</label><input id="f_zzlabel" name="zzlabel" placeholder="למשל: שכר טרחת עורך דין"></div>`);
      const cat = ov.querySelector('[name="cat"]');
      const sync = () => ov.querySelectorAll('[data-zzx]').forEach(x => { x.hidden = cat.value !== 'extra'; });
      if (cat) { cat.addEventListener('change', sync); sync(); }
      foot.insertAdjacentHTML('afterbegin', '<button class="btn" data-zzamt="1" type="button">שמירת סכום בלי קובץ</button>');
      ov.querySelector('[data-zzamt]').onclick = async () => {
        const v = { cat: cat ? cat.value : '', month: (ov.querySelector('[name="month"]') || {}).value, amount: (ov.querySelector('[name="amount"]') || {}).value,
          side: (ov.querySelector('[name="zzside"]') || {}).value, label: (ov.querySelector('[name="zzlabel"]') || {}).value };
        if (await saveAmount(ds.id, ds.k, v)) { const c = ov.querySelector('.modal-h [data-close]'); if (c) c.click(); else ov.remove(); }
      };
    }, 30);
  });
})(window.O);
