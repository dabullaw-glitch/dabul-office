/* addon-zzdeal.js (25.10.2026, Yakir asked): a fee agreement straight from the deal file.
   - On every deal: a "הסכם שכ״ט ללקוח" button and the agreement's state next to the fee ("לא נשלח" / "ממתין לחתימה" / "נחתם").
   - A deal without a signed agreement shows "השלב הבא: הסכם שכר טרחה" at the top, so every new file gets one.
   - One click fills the existing agreement screen ("הסכמי שכ״ט") from the file: the clients (name, ID, address, phone, email,
     a second client when there is one), buy / sell / both, the property address, the fee, and the deal itself (so the signed
     agreement is saved in the client's file and linked to the deal). Yakir checks and edits there, then sends it to sign.
     A "חזרה לתיק" button brings him back. Nothing is sent without his click. */
(function (O) {
  if (!O || O.ZZDEAL || !O.V || !O.V.deal) return;
  O.ZZDEAL = '20261025a';
  const esc = v => (O.esc ? O.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (O.icon ? O.icon(n, z) : '');
  const KEY = 'px-feeagr-draft';
  const sideType = s => /ומוכר|גב אל גב|וקונה/.test(s) ? 'both' : /מוכר/.test(s) ? 'sell' : /קונה|רוכש/.test(s) ? 'buy' : 'other';
  const closed = d => (O.isClosed ? O.isClosed(d) : /הושלם|בוטל/.test(d.status || ''));

  // the agreement of a deal and its state
  O.dealAgreements = id => (O.all('feeagr') || []).filter(a => a.dealId === id || (a.form && a.form.dealId === id));
  O.dealAgrState = id => {
    const list = O.dealAgreements(id); if (!list.length) return { s: 'none' };
    const reqs = list.flatMap(a => (a.reqs || []).map(r => O.get('signreqs', r.id)).filter(Boolean));
    if (reqs.length && list.some(a => { const rs = (a.reqs || []).map(r => O.get('signreqs', r.id)).filter(Boolean); return rs.length && rs.every(r => r.status === 'signed'); })) return { s: 'signed', at: (reqs.find(r => r.signedAt) || {}).signedAt };
    if (reqs.some(r => r.status !== 'cancelled')) return { s: 'sent', opened: reqs.some(r => r.openedAt) };
    return { s: 'draft' };
  };

  O.dealAgreement = id => {
    const d = O.get('deals', id); if (!d) return;
    const cl = (d.clientIds || []).map(c => O.get('clients', c)).filter(Boolean);
    const one = x => ({ name: x.name || '', idNo: x.idNo || '', address: x.address || '', phone: x.phone || '', email: x.email || '' });
    const type = sideType(d.side || '');
    const addr = [d.address, d.city].filter(Boolean).join(', ');
    const draft = { clientId: (cl[0] || {}).id || '', dealId: id, type, addr: type === 'both' || type === 'other' ? '' : addr, addrSell: type === 'both' ? addr : '', addrBuy: '',
      other: type === 'other' ? [d.area, addr].filter(Boolean).join(' · ') : '', fee: +d.fee || '', payText: '', cancelExt: false, toMoney: true,
      c1: cl[0] ? one(cl[0]) : { name: '', idNo: '', address: '', phone: '', email: '' }, c2: cl[1] ? { name: cl[1].name || '', idNo: cl[1].idNo || '', phone: cl[1].phone || '' } : null, date: O.today() };
    try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch (e) { /* the screen starts empty */ }
    try { sessionStorage.setItem('zz-agr-deal', JSON.stringify({ id, at: Date.now() })); } catch (e) { /* memory only */ }
    O.go('feeagr');
    setTimeout(() => markScreen(id), 120);
  };
  function markScreen(id) {
    const d = O.get('deals', id); if (!d || O.R.view !== 'feeagr') return;
    const s = document.querySelector('#fa_deal'); if (s) s.value = id;
    const main = document.querySelector('main') || document.body;
    if (!main.querySelector('.zz-agrbar')) {
      const miss = [];
      const c = O.get('clients', (d.clientIds || [])[0]) || {};
      if (!c.idNo) miss.push('ת.ז של הלקוח'); if (!c.address) miss.push('כתובת הלקוח'); if (!(+d.fee > 0)) miss.push('סכום שכר הטרחה');
      const bar = document.createElement('div');
      bar.className = 'card card-b zz-agrbar';
      bar.style.cssText = 'margin-bottom:14px;border-inline-start:4px solid var(--acc,#2f8f83)';
      bar.innerHTML = `<b>${icon('sign', 15)} הסכם שכר טרחה לתיק: ${esc(d.address || 'עסקה')} · ${esc((d.clientIds || []).map(x => (O.get('clients', x) || {}).name).filter(Boolean).join(', '))}</b>
        <p class="small" style="margin:6px 0 0">כל הפרטים מולאו מהתיק. בודקים, מתקנים אם צריך (גם את התנאים), ולוחצים "הפק הסכם שכר טרחה" ואז שולחים ללקוח לחתימה בטלפון. ההסכם החתום נשמר לבד בתיק.${miss.length ? `<br><span style="color:var(--bad)">חסר בתיק: ${esc(miss.join(', '))}. אפשר להשלים כאן בטופס.</span>` : ''}</p>
        <div class="btn-row" style="margin-top:8px"><button class="btn sm" data-a="go" data-v="deal" data-id="${esc(id)}">${icon('arrow', 14)} חזרה לתיק</button></div>`;
      const head = main.querySelector('.page-head, h1');
      const anchor = head ? (head.closest('.page-head') || head.parentElement) : null;
      if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(bar, anchor.nextSibling); else main.prepend(bar);
    }
  }

  // ---------- the deal page ----------
  const V = O.V.deal, render0 = V.render;
  V.render = function (el) {
    const r = render0.apply(this, arguments);
    try { decorate(el); } catch (e) { console.error('zzdeal', e); }
    return r;
  };
  function decorate(el) {
    const id = O.R && O.R.id, d = id && O.get('deals', id); if (!d || !el) return;
    const st = O.dealAgrState(id);
    const pill = st.s === 'signed' ? '<span class="pill p-ok">הסכם שכ״ט נחתם ✓</span>' : st.s === 'sent' ? `<span class="pill p-warn">הסכם שכ״ט: ממתין לחתימה${st.opened ? ' · נפתח' : ''}</span>` : '<span class="pill p-bad">הסכם שכ״ט: לא נשלח</span>';
    const feeT = el.querySelector('[data-a="fee-toggle"]');
    if (feeT && !el.querySelector('.zz-agrpill')) feeT.insertAdjacentHTML('afterend', ` <span class="zz-agrpill">${pill}</span>`);
    const compose = el.querySelector('[data-a="compose"]');
    if (compose && !el.querySelector('[data-zzagr]')) compose.insertAdjacentHTML('beforebegin', `<button class="btn${st.s === 'none' ? ' pri' : ''}" data-zzagr="1">${icon('sign', 15)} ${st.s === 'signed' ? 'הסכם שכ״ט (נחתם)' : 'הסכם שכ״ט ללקוח'}</button>`);
    const b = el.querySelector('[data-zzagr]');
    if (b) b.onclick = () => (st.s === 'signed' || st.s === 'sent') ? O.go('feeagr') : O.dealAgreement(id);
    if (st.s === 'none' && !closed(d) && !el.querySelector('.zz-next')) {
      const tabs = [...el.querySelectorAll('button')].find(x => x.textContent.trim() === 'שלבים ומשימות');
      const host = tabs ? tabs.closest('.card, .tabs, .segs, div') : null;
      const card = `<div class="card card-b zz-next" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-inline-start:4px solid var(--acc,#2f8f83)"><div><b>השלב הבא בתיק: הסכם שכר טרחה</b><div class="small muted">ההסכם יוצא ללקוח לחתימה בטלפון, מלא בפרטים מהתיק. אתה בודק ומאשר לפני השליחה.</div></div><button class="btn pri" data-zznext="1">${icon('sign', 15)} שליחת הסכם שכ״ט ללקוח</button></div>`;
      if (host && host.parentElement) host.insertAdjacentHTML('beforebegin', card); else el.insertAdjacentHTML('afterbegin', card);
      const nb = el.querySelector('[data-zznext]'); if (nb) nb.onclick = () => O.dealAgreement(id);
    }
  }
  // the agreement screen redraws itself when data changes: the bar and the linked deal stay while the agreement is being prepared
  if (O.V.feeagr && !O.V.feeagr.zz) {
    const fr = O.V.feeagr.render;
    O.V.feeagr.zz = 1;
    O.V.feeagr.render = function () {
      const r = fr.apply(this, arguments);
      try { const s0 = JSON.parse(sessionStorage.getItem('zz-agr-deal') || 'null'); if (s0 && Date.now() - s0.at < 3 * 36e5) setTimeout(() => markScreen(s0.id), 60); } catch (e) { /* none */ }
      return r;
    };
  }
  document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('.zz-agrbar [data-a="go"]'); if (b) { try { sessionStorage.removeItem('zz-agr-deal'); } catch (e) { /* none */ } } }, true);
})(window.O);
