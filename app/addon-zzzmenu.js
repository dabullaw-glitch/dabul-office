/* addon-zzzmenu.js (17.11.2026, Yakir): the order of the side menu. Loaded last (addons load in name order), after every
   other addon added its screens, and arranges them:
   כספים: שכ״ט וגבייה, מע״מ ומקדמות, צמיחה, דוחות, הוצאות וקבלות, הכנסות, הצעות מחיר.
   שיווק (a new category right under כספים): קורסים, לוח עדכונים, סרטונים, ברכות חג, מכירות אונליין, הזמנות אונליין, יומן תוכן, שיווק.
   A screen is moved only if it exists; anything not named here stays where it was. The array is changed in place, because the
   shell keeps a reference to it. */
(function (s) {
  if (!s || s.MENU17) return; s.MENU17 = '20261117a';
  const MONEY = ['payments', 'fin', 'growth', 'reports', 'finexp', 'fininc', 'quotes'];
  const MKT = ['academy', 'upd', 'video', 'greet', 'svcstats', 'svc', 'cal', 'mkt'];
  function arrange() {
    const A = s.AREAS; if (!Array.isArray(A)) return false;
    const all = {}; // view key -> [key, label] from wherever it is now
    A.forEach(a => (a[3] || []).forEach(v => { if (!all[v[0]]) all[v[0]] = v; }));
    const take = keys => keys.filter(k => all[k]).map(k => all[k]);
    const moved = new Set(MONEY.concat(MKT));
    A.forEach(a => { if (!Array.isArray(a[3])) return; const keep = a[3].filter(v => !moved.has(v[0])); a[3].length = 0; keep.forEach(v => a[3].push(v)); });
    const money = A.find(a => a[0] === 'money');
    if (money) take(MONEY).forEach(v => money[3].push(v));
    let mkt = A.find(a => a[0] === 'marketing');
    if (!mkt) { mkt = ['marketing', 'שיווק', 'send', []]; const i = A.indexOf(money); A.splice(i >= 0 ? i + 1 : A.length, 0, mkt); }
    mkt[3].length = 0; take(MKT).forEach(v => mkt[3].push(v));
    // an area left empty (all its screens moved) is hidden
    for (let i = A.length - 1; i >= 0; i--) if (Array.isArray(A[i][3]) && !A[i][3].length && A[i][0] !== 'marketing') A.splice(i, 1);
    return true;
  }
  try { arrange(); } catch { /* menu stays as is */ }
  // a screen that an addon adds a little later is placed too
  let n = 0; const iv = setInterval(() => { n++; try { const before = JSON.stringify(s.AREAS); arrange(); if (JSON.stringify(s.AREAS) !== before && s.render) s.render(); } catch { /* ignore */ } if (n > 6) clearInterval(iv); }, 1500);
})(window.O);
