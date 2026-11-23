/* addon-zzconsult.js (23.11.2026, Yakir approved: "אני מאשר את זה", price "531 שח כולל מע״מ").
   A lead who only wants an answer gets an offer for a paid consultation, instead of being closed as "לא רלוונטי":
   - In the lead window, next to חיוג / וואטסאפ: "הצעת פגישת ייעוץ". It opens WhatsApp with the approved text and the link
     to the Zoom consultation order form on the site (30 minutes, 450 ₪ + VAT = 531 ₪), and moves the lead to the new stage
     "הוצע ייעוץ בתשלום" (stage consult_offered, added to sales.js by the patch sales.js~p20261123a, which also gives the
     one reminder task two days later: "לבדוק אם X קבע ייעוץ בתשלום, ואם לא לפנות שוב").
   - When a paid Zoom consultation order arrives from the same phone (or email), the lead closes by itself: stage "לקוח",
     fee = the amount paid, so the leads report counts it as income. The meeting itself already goes into the calendar
     and gets a Zoom link from the "services" function after the payment.
   To undo: remove this file's row from app_files (and the sales.js~p20261123a patch row). */
(function (O) {
  if (!O || O.ZZCONSULT) return;
  O.ZZCONSULT = '20261123a';
  const STAGE = 'consult_offered';
  const LINK = 'https://dabullaw.co.il/online/zoom-consultation/#order';
  const PRICE = 531;
  const PAID = ['paid', 'working', 'done'];
  const nowIso = () => new Date().toISOString();
  const first = n => String(n || '').trim().split(/[ ,(]/)[0] || '';
  const stageOf = l => (O.stageOf ? O.stageOf(l) : l.stage || 'new');
  const digits = p => { let x = String(p || '').replace(/\D/g, ''); if (x.startsWith('972')) x = '0' + x.slice(3); return x; };
  const samePhone = (a, b) => { const x = digits(a), y = digits(b); return x.length >= 9 && x === y; };
  const sameMail = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const icon = (n, z) => (O.icon ? O.icon(n, z) : '');
  const esc = v => (O.esc ? O.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));

  const text = l => `שלום ${first(l.name)}, תודה על הפנייה. התשובה לשאלה שלך תלויה בפרטים של המקרה, ולכן כדי לתת תשובה מדויקת ואחראית אני מציע פגישת ייעוץ, בזום או במשרד. לקביעת מועד ותשלום: ${LINK} עו״ד יקיר דבול`;
  O.consultOfferText = text;

  // the WhatsApp buttons of a lead in this stage open the same offer again
  const wt = O.leadWaText, wl = O.leadWaLabel;
  if (wt) O.leadWaText = l => (stageOf(l) === STAGE ? text(l) : wt(l));
  if (wl) O.leadWaLabel = l => (stageOf(l) === STAGE ? 'הצעת הייעוץ שוב' : wl(l));

  const st = document.createElement('style');
  st.textContent = '.zc-btn{width:100%;justify-content:center}.zc-hint{margin:-4px 0 2px;font-size:12.5px;color:var(--muted)}';
  document.head.appendChild(st);

  const OPEN = () => O.OPEN_STAGES || [];
  function decorate() {
    document.querySelectorAll('[data-lxlead]').forEach(box => {
      if (box.querySelector('.zc-btn')) return;
      const id = box.getAttribute('data-lxlead'), l = O.get && O.get('leads', id);
      if (!l || !l.phone || !OPEN().includes(stageOf(l))) return;
      const acts = box.querySelector('[data-lx="dial"]'); if (!acts) return;
      const row = acts.closest('.lx-acts'); if (!row) return;
      const wrap = document.createElement('div');
      const was = stageOf(l) === STAGE && l.consultOfferAt ? (O.ilTime ? O.ilTime(Date.parse(l.consultOfferAt)) : '') : '';
      wrap.innerHTML = `<a class="btn zc-btn" target="_blank" rel="noopener" href="${esc(O.waLink ? O.waLink(l.phone, text(l)) : '#')}">${icon('money', 15)} ${was ? 'שליחה חוזרת של הצעת הייעוץ' : 'הצעת פגישת ייעוץ (531 ₪)'}</a>`
        + `<p class="zc-hint">${was ? `ההצעה נשלחה ${esc(was)}. ` : ''}למי שרוצה רק תשובה: נפתח וואטסאפ עם ההצעה וקישור להזמנה ולתשלום באתר. כשישלם, הליד ייסגר לבד.</p>`;
      row.after(wrap);
      wrap.querySelector('a').addEventListener('click', () => { offered(id).catch(e => console.warn('consult', e)); });
    });
  }
  async function offered(id) {
    const cur = O.get('leads', id); if (!cur) return;
    const s = nowIso(), from = stageOf(cur), lab = O.STAGE_LABEL || {};
    const log = (cur.log || []).concat([{ at: s, kind: 'wa', text: `נשלחה הצעה לפגישת ייעוץ בתשלום (${PRICE} ₪ כולל מע״מ)` }]);
    if (from !== STAGE) log.push({ at: s, kind: 'stage', text: `${lab[from] || from} ← ${lab[STAGE] || STAGE}` });
    await O.patch('leads', id, { stage: STAGE, status: 'בטיפול', stageAt: s, consultOfferAt: s, log: log.slice(-80) });
    setTimeout(() => {
      document.querySelectorAll('.ov').forEach(o => { if (o.querySelector(`[data-lxlead="${id}"]`)) o.remove(); });
      if (O.ACT && O.ACT['sl-open']) O.ACT['sl-open'](null, { id });
      if (O.toast) O.toast('הליד עבר ל"הוצע ייעוץ בתשלום". אם לא ישלם, בעוד יומיים תקבל תזכורת לפנות אליו שוב.');
    }, 400);
  }

  // a paid Zoom consultation from the same person closes the lead
  let busy = false;
  async function match() {
    if (busy || !O.all || !O.svcAll || !(O.S && O.S.loaded && O.S.loaded.svc)) return;
    const leads = O.all('leads').filter(l => stageOf(l) === STAGE && !l.test && !l.consultOrder);
    if (!leads.length) return;
    const used = new Set(O.all('leads').map(l => l.consultOrder).filter(Boolean));
    const orders = O.svcAll().filter(o => o.svc === 'zoom' && PAID.includes(o.status) && !o.test && !/^(SIMULATED|TEST)/i.test(String((o.payment && o.payment.ref) || '')) && !used.has(o.id));
    if (!orders.length) return;
    busy = true;
    try {
      for (const l of leads) {
        const since = (Date.parse(l.consultOfferAt || l.stageAt || l.created) || 0) - 864e5;
        const o = orders.find(x => !used.has(x.id) && (Date.parse(x.paidAt || x.created) || 0) >= since && x.c && (samePhone(x.c.phone, l.phone) || sameMail(x.c.email, l.email)));
        if (!o) continue;
        used.add(o.id);
        const s = nowIso(), amt = Math.round(((o.payment && +o.payment.amount) || (o.price && +o.price.total) || PRICE) * 100) / 100;
        const patch = { stage: 'won', status: 'לקוח סגר', stageAt: s, wonAt: o.paidAt || s, fee: amt, consultOrder: o.id,
          log: (l.log || []).concat([{ at: s, kind: 'stage', text: `שילם על ייעוץ בזום (${amt} ₪, הזמנה ${o.id}). הליד נסגר ללקוח אוטומטית.` }]).slice(-80) };
        if (!l.clientId && o.clientId) patch.clientId = o.clientId;
        await O.patch('leads', l.id, patch);
        if (O.toast) O.toast(`${l.name} שילם על הייעוץ. הליד נסגר ללקוח.`);
      }
    } finally { busy = false; }
  }

  let q = 0;
  const mo = new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; try { decorate(); } catch (e) { console.warn('consult', e); } }); });
  const start = () => { mo.observe(document.body, { childList: true, subtree: true }); decorate(); setInterval(() => match().catch(e => console.warn('consult match', e)), 30e3); setTimeout(() => match().catch(() => {}), 8e3); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})(window.O);
