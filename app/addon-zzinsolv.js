/* addon-zzinsolv.js (25.10.2026, Yakir asked: "שיהיה לי אפשרות להוסיף סכומים גם בלי מסמכים" in the insolvency report).
   The "הוספת קבלה או מסמך" window gets a second button, "שמירת סכום בלי קובץ": the amount is ADDED to that line and month
   of the two-month report (income or expense), and kept in a list of amounts entered by hand (irep[period].manual).
   The line still shows "חסר" until a receipt is attached, because the trustee asks for one. The file button works as before. */
(function (O) {
  if (!O || O.ZZINSOLV || !O.ACT || !O.ACT['ie-upload'] || !O.iePeriods) return;
  O.ZZINSOLV = '20261105a';
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

  /* 5.11.2026, Yakir asked: "שיהיה לי אפשרות מהמערכת שלי לסגור את הדוח ושיעבור לו לחודשיים קדימה".
     - The matter page says which two months are open now ("דוח פתוח: אוקטובר ונובמבר 2026").
     - "סגירת הדוח ומעבר לחודשיים הבאים": the open report gets status 'submitted' (closedBy 'office'), and the next
       two months open at once, even if they are still ahead (iePeriods, patch insolv.js~p20261105a, and the ireport function).
       The closed report keeps all its files, and its PDF can still be made from it.
     - "שינוי החודשים": move the open report to another start month (firstPeriod) only when no report that already has
       receipts, amounts or a status would lose its months. Otherwise nothing changes and the reason is shown.
       The same check guards the firstPeriod / orderDate fields in "עריכה". */
  const ym = s => String(s || '').slice(0, 7), okM = s => /^\d{4}-\d{2}$/.test(s || '');
  const AM = O.ieAddM, mN = k => O.ieMonthName(k), esc = O.esc;
  const nowM = () => ym(O.today());
  const mdiff = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  const two = p => { const [a, b] = p.months || [p.key, AM(p.key, 1)]; return a.slice(0, 4) === b.slice(0, 4) ? `${mN(a)} ו${mN(b)} ${a.slice(0, 4)}` : `${mN(a)} ${a.slice(0, 4)} ו${mN(b)} ${b.slice(0, 4)}`; };
  const nextOf = p => ({ key: AM(p.key, 2), months: [AM(p.key, 2), AM(p.key, 3)] });
  const hasData = r => !!r && !!((r.files || []).length || Object.keys(r.inc || {}).length || Object.keys(r.exp || {}).length || (r.incX || []).length || (r.expX || []).length || (r.manual || []).length || r.status || r.sig);
  const what = r => { const n = (r.files || []).length; return n ? `${n} קבלות ומסמכים` : r.status === 'submitted' ? 'דוח שנסגר' : 'סכומים'; };
  const inSeq = (first, k) => okM(first) && okM(k) && k >= first && mdiff(first, k) % 2 === 0;
  // reports with data whose months would no longer exist if the first month were "first"
  const wouldLose = (m, first) => Object.keys(m.irep || {}).filter(k => hasData(m.irep[k]) && !inSeq(first, k)).sort();
  const loseMsg = (m, lost) => `אי אפשר לשנות: בדוח של ${two({ key: lost[0] })} כבר יש ${what(m.irep[lost[0]])}${lost.length > 1 ? ` (ועוד ${lost.length - 1} דוחות)` : ''}. אחרי השינוי הם לא יהיו שייכים לשום דוח. כדי שלא יאבד כלום, לא שינינו כלום.`;
  O.ieStartCheck = (m, vals) => {
    const nf = vals.firstPeriod || ym(vals.orderDate), of = m.firstPeriod || ym(m.orderDate);
    if (nf === of) return true;
    const lost = wouldLose(m, nf);
    if (lost.length) throw new Error(loseMsg(m, lost));
    return true;
  };
  O.ieOpenMeta = (m, a) => {
    if (!a || m.closed || m.stage === 'pre') return '';
    return `<span><b>דוח פתוח: ${esc(two(a))}</b></span><button class="btn xs ghost" data-a="ie-start" data-id="${esc(m.id)}" title="שינוי החודשים של הדוח הפתוח">שינוי החודשים</button>`;
  };
  O.ieCloseBar = (m, l, a) => {
    if (!l || m.closed) return '';
    const r = O.ieRep(m, l.key);
    if (a && l.key === a.key && r.status !== 'submitted') {
      const n = nextOf(l);
      return `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)"><p class="small" style="margin:0 0 8px">כשהלקוח סיים את ${esc(two(l))}, סוגרים כאן. הלקוח עובר מיד לצלם קבלות של ${esc(two(n))}. הקבלות שכבר צולמו נשארות בדוח הזה, ואפשר להפיק ממנו PDF.</p><button class="btn" data-a="ie-close" data-id="${esc(m.id)}" data-k="${esc(l.key)}">${O.icon ? O.icon('check', 15) : ''} סגירת הדוח ומעבר לחודשיים הבאים</button></div>`;
    }
    if (r.status === 'submitted' && r.closedBy === 'office')
      return `<p class="small muted" style="margin:10px 0 0">הדוח נסגר במשרד${r.closedAt ? ` ב-${esc(O.fmtDate(r.closedAt.slice(0, 10)))}` : ''}. <button class="btn xs ghost" data-a="ie-unclose" data-id="${esc(m.id)}" data-k="${esc(l.key)}">ביטול הסגירה</button></p>`;
    return '';
  };
  O.act('ie-close', async (el, ds) => {
    const m = O.get('matters', ds.id); if (!m) return;
    const p = O.iePeriods(m).find(x => x.key === ds.k); if (!p) return;
    const r = O.ieRep(m, p.key); if (r.status === 'submitted') return O.toast('הדוח הזה כבר סגור');
    const n = nextOf(p), nf = (r.files || []).length;
    const msg = `לסגור את הדוח של ${two(p)}?\n\n${nf ? `${nf} הקבלות והמסמכים נשארים בדוח הזה. ` : ''}אפשר להפיק ממנו PDF גם אחרי הסגירה.\nהלקוח יעבור מיד לצלם קבלות של ${two(n)}.`
      + (p.end >= nowM() ? `\n\nשים לב: ${mN(p.end)} עוד לא נגמר.` : '')
      + (r.status !== 'filled' && r.status !== 'ready' ? '\nהלקוח עוד לא סגר וחתם על הדוח הזה בקישור.' : '');
    if (!await O.confirm(msg, 'כן, לסגור ולעבור לחודשיים הבאים')) return;
    const cur = O.get('matters', m.id) || m;
    const rep = Object.assign({}, O.ieRep(cur, p.key), { status: 'submitted', submittedAt: O.today(), closedAt: new Date().toISOString(), closedBy: 'office', statusBefore: r.status || '' });
    await O.patch('matters', m.id, { irep: Object.assign({}, cur.irep || {}, { [p.key]: rep }) });
    await O.log('matter', m.id, `הדוח של ${two(p)} נסגר במשרד. נפתח הדוח של ${two(n)}`, 'system');
    if (O.setUi) O.setUi('insolv', 'k:' + m.id, n.key);
    O.toast(`הדוח נסגר. דוח פתוח: ${two(n)}`);
  });
  O.act('ie-unclose', async (el, ds) => {
    const m = O.get('matters', ds.id); if (!m) return;
    const p = O.iePeriods(m).find(x => x.key === ds.k); if (!p) return;
    const r = O.ieRep(m, p.key); if (r.status !== 'submitted' || r.closedBy !== 'office') return;
    const n = nextOf(p), nr = O.ieRep(m, n.key);
    // the next two months exist only because this report is closed: do not hide receipts the client already sent there
    if (n.key > nowM() && hasData(nr)) return O.toast(`אי אפשר לבטל: לדוח של ${two(n)} כבר יש ${what(nr)}`, 'bad');
    if (!await O.confirm(`לבטל את הסגירה של ${two(p)}?\nהדוח הזה יחזור להיות הדוח הפתוח, והלקוח יצלם שוב קבלות אליו.`, 'ביטול הסגירה')) return;
    const cur = O.get('matters', m.id) || m;
    const rep = Object.assign({}, O.ieRep(cur, p.key), { status: r.statusBefore || '', reopenedAt: new Date().toISOString() });
    await O.patch('matters', m.id, { irep: Object.assign({}, cur.irep || {}, { [p.key]: rep }) });
    await O.log('matter', m.id, `בוטלה הסגירה של הדוח ${two(p)}`, 'system');
    if (O.setUi) O.setUi('insolv', 'k:' + m.id, p.key);
    O.toast('הסגירה בוטלה');
  });
  // the plan for "שינוי החודשים": throws an Error with the reason when it is not safe
  O.ieStartPlan = (m, X) => {
    if (!okM(X)) throw new Error('בוחרים חודש');
    const irep = m.irep || {}, of = m.firstPeriod || ym(m.orderDate);
    const before = Object.keys(irep).filter(k => hasData(irep[k]) && k < X).sort();
    let nf = X; if (before.length) while (nf > before[0]) nf = AM(nf, -2);
    const lost = wouldLose(m, nf);
    if (lost.length) throw new Error(loseMsg(m, lost));
    const act = O.ieActive(Object.assign({}, m, { firstPeriod: nf }));
    if (!act || act.key !== X) {
      if (X > nowM()) throw new Error(`${O.ieMonth(X)} עוד לא הגיע. כדי לעבור לחודשיים הבאים, לוחצים בדוח הפתוח על "סגירת הדוח ומעבר לחודשיים הבאים".`);
      throw new Error(`אחרי השינוי הדוח הפתוח יהיה ${two(act)}, כי הדוח הזה עוד לא נסגר. קודם סוגרים אותו.`);
    }
    return { nf, of, act };
  };
  O.act('ie-start', (el, ds) => {
    const m = O.get('matters', ds.id); if (!m) return;
    const a = O.ieActive(m);
    O.formModal({ title: 'שינוי החודשים של הדוח הפתוח', submit: 'המשך',
      fields: [['start', 'החודש הראשון של הדוח הפתוח', 'month', { req: true, help: `כל דוח הוא חודשיים. עכשיו פתוח: ${a ? two(a) : 'אין'}. קבלות שכבר צולמו לא זזות ולא נמחקות.` }]],
      values: { start: a ? a.key : '' },
      onSubmit: async v => {
        const cur = O.get('matters', m.id) || m, X = ym(v.start);
        const plan = O.ieStartPlan(cur, X);
        if (plan.nf === plan.of) { O.toast(`זה כבר הדוח הפתוח: ${two(plan.act)}`); return true; }
        const ar = a ? O.ieRep(cur, a.key) : {}, nf = (ar.files || []).length;
        const msg = `לשנות את הדוח הפתוח ל${two(plan.act)}?`
          + (a && a.key !== plan.act.key && nf ? `\n\nשים לב: בדוח שפתוח עכשיו (${two(a)}) יש ${nf} קבלות. הן לא נמחקות ונשארות בדוח של ${two(a)}.` : '')
          + `\nהחודש הראשון בתיק יהיה ${O.ieMonth(plan.nf)} (היה ${okM(plan.of) ? O.ieMonth(plan.of) : 'ריק'}).`;
        if (!await O.confirm(msg, 'כן, לשנות')) return false;
        await O.patch('matters', m.id, { firstPeriod: plan.nf });
        await O.log('matter', m.id, `החודש הראשון של הדוחות שונה מ${okM(plan.of) ? O.ieMonth(plan.of) : 'ריק'} ל${O.ieMonth(plan.nf)}. דוח פתוח: ${two(plan.act)}`, 'system');
        if (O.setUi) O.setUi('insolv', 'k:' + m.id, plan.act.key);
        O.toast(`דוח פתוח: ${two(plan.act)}`);
        return true;
      } });
  });
})(window.O);
