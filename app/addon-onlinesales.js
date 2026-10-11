/* addon-onlinesales.js (11.10.2026, Yakir): "מכירות אונליין" under כספים. Where every online sale comes from and what to push.
   Reads the online orders (docs coll "svc", loaded by addon-svc.js). Each order since 11.10.2026 records its source
   (src.ch / src.chName: Google Ads, Google organic, Facebook, WhatsApp...; src.from: the page on the site that led to the
   form). Shows, for the chosen period: orders, paid orders, revenue, conversion, by service and by channel, the pages that
   bring buyers, and plain recommendations (which service to advertise, which channel works, where people drop out).
   Test orders are left out. Needs addon-svc.js (s.svcAll). */
(function (s) {
  if (!s || s.ONLINESALES) return; s.ONLINESALES = '20261011b';
  const n = v => (s.esc ? s.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const st = document.createElement('style');
  st.textContent = `.os-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 16px}
.os-k div{background:var(--card,#fff);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.os-k b{display:block;font-size:24px;line-height:1.15}.os-k small{color:var(--muted);font-size:12.5px}
.os-t{width:100%;border-collapse:collapse;font-size:14px}.os-t th,.os-t td{padding:8px 6px;border-bottom:1px solid var(--line2);text-align:right}
.os-t th{color:var(--muted);font-weight:600;font-size:12.5px}.os-t td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.os-bar{height:6px;border-radius:3px;background:var(--line2);overflow:hidden;min-width:60px}.os-bar i{display:block;height:100%;background:var(--accent,#0b7f6b)}
.os-rec li{margin:0 0 8px}.os-per{display:flex;gap:6px;flex-wrap:wrap}
.os-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}`;
  document.head.appendChild(st);

  // a sale counts only with a real payment: status paid/working/done (test orders and simulated payments are left out above)
  const PAID = ['paid', 'working', 'done'];
  const money = v => Math.round(v || 0).toLocaleString('he-IL') + ' ₪';
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
  const CH = { gads: 'גוגל ממומן', fbads: 'פייסבוק/אינסטגרם ממומן', seo: 'גוגל אורגני', bing: 'בינג', social: 'רשתות חברתיות', ai: 'צ׳אטבוטים (AI)', email: 'מייל / ניוזלטר', wa: 'וואטסאפ', ref: 'אתרים מפנים', site: 'מתוך האתר', direct: 'ישיר / לא ידוע', none: 'לא נמדד (לפני 11.10)' };
  const PER = [['30', '30 יום'], ['90', '90 יום'], ['365', 'שנה'], ['all', 'הכל']];
  const path = u => { try { const x = new URL(u); return decodeURIComponent(x.pathname); } catch { return String(u || ''); } };

  function rows(per) {
    const L = (s.svcAll ? s.svcAll() : []).filter(o => !o.test && !String(o.status || '').startsWith('cancel') && !/^SIMULATED/i.test(String((o.payment && o.payment.ref) || '')));
    if (per === 'all') return L;
    const from = Date.now() - (+per) * 864e5;
    return L.filter(o => Date.parse(o.created || 0) >= from);
  }
  function group(L, key) {
    const m = {};
    L.forEach(o => {
      const k = key(o); const g = m[k] = m[k] || { k, all: 0, started: 0, paid: 0, rev: 0 };
      g.all++; if (o.status !== 'draft') g.started++;
      if (PAID.includes(o.status)) { g.paid++; g.rev += (o.payment && +o.payment.amount) || (o.price && +o.price.total) || 0; }
    });
    return Object.values(m).sort((a, b) => b.rev - a.rev || b.paid - a.paid || b.all - a.all);
  }
  function table(G, label, total) {
    if (!G.length) return '<p class="small muted">אין עדיין נתונים בתקופה הזו.</p>';
    const max = Math.max(...G.map(g => g.rev), 1);
    return `<table class="os-t"><thead><tr><th>${n(label)}</th><th>הזמנות</th><th>שולמו</th><th>המרה</th><th>הכנסה</th><th></th></tr></thead><tbody>${G.map(g => `<tr><td>${n(g.name || g.k)}</td><td class="num">${g.all}</td><td class="num">${g.paid}</td><td class="num">${pct(g.paid, g.all)}</td><td class="num">${money(g.rev)}</td><td style="width:22%"><div class="os-bar"><i style="width:${Math.round(g.rev / max * 100)}%"></i></div></td></tr>`).join('')}</tbody></table>`;
  }
  function recs(L, bySvc, byCh) {
    const out = [];
    const paid = L.filter(o => PAID.includes(o.status));
    if (L.length < 5) out.push('עוד אין מספיק הזמנות כדי להסיק מסקנות. ההמלצות יתחדדו אחרי כ-10 הזמנות.');
    const topS = bySvc.find(g => g.rev > 0); if (topS) out.push(`השירות שמכניס הכי הרבה: <b>${n(topS.name)}</b> (${money(topS.rev)}). כדאי לקדם אותו ראשון בפרסום ובפוסטים.`);
    const conv = bySvc.filter(g => g.all >= 3).sort((a, b) => b.paid / b.all - a.paid / a.all)[0];
    if (conv && conv !== topS) out.push(`ההמרה הגבוהה ביותר: <b>${n(conv.name)}</b> (${pct(conv.paid, conv.all)} מההזמנות משלמות). שווה לנסות להביא אליו יותר תנועה.`);
    const drop = bySvc.filter(g => g.all >= 3 && g.paid / g.all < 0.3).sort((a, b) => b.all - a.all)[0];
    if (drop) out.push(`ב<b>${n(drop.name)}</b> הרבה מתחילים ומעט משלמים (${drop.paid} מתוך ${drop.all}). כדאי לבדוק את הטופס ואת המחיר, ולהתקשר למי שלא השלים.`);
    const topC = byCh.filter(g => g.k !== 'none').find(g => g.paid > 0); if (topC) out.push(`הערוץ שמביא הכי הרבה קונים: <b>${n(topC.name)}</b>.`);
    const ads = byCh.find(g => g.k === 'gads'); if (ads && ads.all >= 3 && !ads.paid) out.push('גוגל ממומן מביא הזמנות אבל אף אחת לא שולמה. כדאי לבדוק את מילות החיפוש ואת דף הנחיתה לפני שמגדילים תקציב.');
    const drafts = L.filter(o => o.status === 'draft').length; if (drafts >= 2) out.push(`${drafts} טפסים נפתחו ולא נשלחו עד הסוף. אם יש בהם טלפון, אפשר לחזור אליהם (בהזמנות אונליין).`);
    if (!paid.length && L.length >= 5) out.push('אין עדיין תשלומים. כדאי לוודא שקישור התשלום של מורנינג עובד (הזמנת ניסיון של 1 ₪).');
    return out.length ? `<ul class="os-rec">${out.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p class="small muted">אין המלצות כרגע.</p>';
  }

  s.V.svcstats = { title: 'מכירות אונליין', render(el) {
    const per = s.ui('svcstats', 'per', '90');
    const L = rows(per), paid = L.filter(o => PAID.includes(o.status));
    const rev = paid.reduce((a, o) => a + ((o.payment && +o.payment.amount) || (o.price && +o.price.total) || 0), 0);
    const bySvc = group(L, o => o.svc || '?').map(g => Object.assign(g, { name: (L.find(o => o.svc === g.k) || {}).title || g.k }));
    const byCh = group(L, o => (o.src && o.src.ch) || 'none').map(g => Object.assign(g, { name: CH[g.k] || g.k }));
    const byPage = group(L.filter(o => o.src && o.src.from), o => path(o.src.from)).slice(0, 8).map(g => Object.assign(g, { name: g.k }));
    const loaded = s.S && s.S.loaded && s.S.loaded.svc;
    el.innerHTML = `<div>${s.pageHead('מכירות אונליין', 'מאיפה מגיעה כל מכירה באתר, מה נמכר, ועל מה כדאי לשים דגש.', '')}
      <div class="os-per" style="margin:0 0 14px">${PER.map(([k, t]) => `<button class="btn sm${k === per ? '' : ' ghost'}" data-a="os-per" data-k="${k}">${t}</button>`).join('')}</div>
      ${!loaded ? '<p class="small muted">טוען...</p>' : ''}
      <div class="os-k"><div><b>${L.length}</b><small>הזמנות (כולל טפסים שלא הושלמו)</small></div><div><b>${paid.length}</b><small>שולמו</small></div>
        <div><b>${pct(paid.length, L.length)}</b><small>המרה מהזמנה לתשלום</small></div><div><b>${money(rev)}</b><small>הכנסה (כולל מע״מ)</small></div>
        <div><b>${money(rev / 1.18)}</b><small>הכנסה לפני מע״מ</small></div><div><b>${paid.length ? money(rev / paid.length) : '-'}</b><small>ממוצע להזמנה</small></div></div>
      <div class="card" style="margin:0 0 14px"><div class="card-h"><h2>על מה לשים דגש</h2></div><div class="card-b">${recs(L, bySvc, byCh)}</div></div>
      <div class="os-g">
        <div class="card"><div class="card-h"><h2>לפי שירות</h2></div><div class="card-b">${table(bySvc, 'שירות')}</div></div>
        <div class="card"><div class="card-h"><h2>לפי ערוץ (מאיפה הגיעו)</h2></div><div class="card-b">${table(byCh, 'ערוץ')}</div></div>
      </div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h2>העמודים באתר שהביאו להזמנה</h2></div><div class="card-b">${table(byPage, 'עמוד')}</div></div>
      <p class="small muted" style="margin-top:12px">המקור נשמר בכל הזמנה מ-11.10.2026 (קישורי פרסום, גוגל, פייסבוק, וואטסאפ, ומהמאמר שממנו הגיעו). הזמנות ניסיון ובוטלו לא נספרות.</p></div>`;
  } };
  s.act('os-per', (b, d) => { s.UI.svcstats = s.UI.svcstats || {}; s.UI.svcstats.per = d.k; s.render(); });
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'svcstats')) a[3].push(['svcstats', 'מכירות אונליין']); } catch { /* menu stays */ }
})(window.O);
