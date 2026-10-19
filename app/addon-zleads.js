/* addon-zleads.js (19.10.2026, approved by Yakir: docs settings/sales.leadFlowPlan, phase A + B).
   The lead workflow, end to end:
   A1. "סגירה ללקוח": one sheet (file type, fee, payment method, short title). One tap opens the client card, the right file
       (deal or matter, with leadId), the fee plan (installment reminders only when the box is ticked: plan.autoRemind,
       the rule in engine.js~p20261019c; reminders are off by default since 19.10), copies the lead notes and a
       history summary into the file, and marks the lead "לקוח" (which stops the lead follow-ups). No message is sent to the client.
       A lead that is already closed shows links instead of opening a second file.
   A2. A fixed notes block at the top of the lead window (saved on the lead, edits logged briefly).
   A3. After "דיברנו": "מה הוא צריך" + "מה הצעד הבא" (with quick chips), optional jump to the matching stage.
   A4. "לחזור אליו ב...": lead.callbackAt. The server ('daily' function) sends Yakir a Telegram reminder with a dial button.
   A5. One lead system: "ליד חדש" (quick action, palette, old form) creates leads in the new pipeline (stage "new").
   A6. The WhatsApp buttons open a text that matches the lead's stage.
   B7. "הצעת מחיר" and "הסכם שכר טרחה" from inside the lead (prefilled, leadId stored). Sending moves the lead to
       "הצעה נשלחה"; an accepted quote or a signed agreement offers (never runs by itself) "סגירה ללקוח".
   B8. Lead meetings and callbacks in the office calendar (rule in engine.js~p20261019b); a click opens the lead.
   B9. Leads list: filters by source and area, a "הצעד הבא ומתי" column, sort by waiting time (default for open leads).
   B10. Report: real revenue from the files of leads that became clients, and cost per client per source (Facebook, Google...). */
(function (O) {
  if (!O || O.LEADFLOW || !O.V || !O.V.leads) return;
  O.LEADFLOW = '20261019c';
  const esc = v => (O.esc ? O.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (O.icon ? O.icon(n, z) : '');
  const money = v => (O.money ? O.money(v) : '₪' + Math.round(+v || 0));
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; };
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const nowIso = () => new Date().toISOString();
  const today = () => (O.today ? O.today() : nowIso().slice(0, 10));
  const first = n => String(n || '').trim().split(/[ ,(]/)[0] || '';
  const toMs = x => { if (!x) return NaN; const s = String(x); return /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? Date.parse(s) : (O.localToMs ? O.localToMs(s) : Date.parse(s)); };
  const ilDay = ms => (O.ilDay ? O.ilDay(ms) : new Date(ms).toISOString().slice(0, 10));
  const hhmm = ms => { const t = O.ilTime ? O.ilTime(ms) : ''; return t.split(' בשעה ')[1] || ''; };
  const ddmm = ms => { const d = ilDay(ms); return `${d.slice(8, 10)}/${d.slice(5, 7)}`; };
  const fmtWhen = ms => {
    if (!(ms > 0)) return '';
    const d = ilDay(ms), t = hhmm(ms), td = ilDay(Date.now()), tm = ilDay(Date.now() + 864e5), yd = ilDay(Date.now() - 864e5);
    return `${d === td ? 'היום' : d === tm ? 'מחר' : d === yd ? 'אתמול' : ddmm(ms)}${t ? ' ' + t : ''}`;
  };
  const ago = ms => {
    const m = Math.max(0, Date.now() - ms) / 60e3;
    if (m < 60) return `${Math.max(1, Math.round(m))} דק׳`;
    const h = m / 60; if (h < 24) return `${Math.round(h)} שע׳`;
    const d = Math.round(h / 24); return d === 1 ? 'יום' : `${d} ימים`;
  };
  const stageOf = l => (O.stageOf ? O.stageOf(l) : l.stage || 'new');
  const OPEN = () => O.OPEN_STAGES || ['new', 'contacted', 'meeting_set', 'no_show', 'meeting_done', 'proposal_sent'];
  const isOpen = l => OPEN().includes(stageOf(l));
  const STAGE_LABEL = s => (O.STAGE_LABEL || {})[s] || s;
  const normPhone = p => (O.normPhone ? O.normPhone(p) : String(p || '').replace(/\D/g, ''));
  const samePhone = (a, b) => { const x = normPhone(a), y = normPhone(b); if (x && y) return x === y; const dx = String(a || '').replace(/\D/g, ''), dy = String(b || '').replace(/\D/g, ''); return dx.length > 6 && dx === dy; };
  const closeTop = () => { const ovs = document.querySelectorAll('.ov'); const ov = ovs[ovs.length - 1]; if (ov) { const x = ov.querySelector('[data-close]'); if (x) x.click(); else ov.remove(); } };

  /* ---------- sources (Hebrew labels for every key the lead function writes) ---------- */
  const SOURCES = [['facebook', 'פייסבוק'], ['google', 'גוגל ממומן'], ['website', 'אתר'], ['gmb', 'פרופיל גוגל'], ['referral', 'המלצה'], ['broker', 'מתווך'], ['partner', 'שותף מקצועי'], ['returning', 'לקוח חוזר'], ['social', 'רשתות'], ['community', 'קהילה'], ['whatsapp', 'וואטסאפ'], ['direct', 'פנייה ישירה'], ['manual', 'ידני'], ['other', 'אחר']];
  if (!O.SALES_SOURCES || O.SALES_SOURCES.length < SOURCES.length) O.SALES_SOURCES = SOURCES;
  const SRC_MAP = Object.fromEntries(SOURCES);
  O.srcLabel = s => SRC_MAP[s] || (Array.isArray(O.SALES_SOURCES) ? (O.SALES_SOURCES.find(x => x[0] === s) || [])[1] : '') || s || '';
  const PAID_SOURCES = [['facebook', 'פייסבוק'], ['google', 'גוגל']];

  /* ---------- areas: what the lead is about ---------- */
  const AREA_RULES = [
    [/התחדשות|תמ.?א|פינוי|בינוי/, 'התחדשות עירונית'],
    [/מיסוי|מס שבח|מס רכישה/, 'מיסוי מקרקעין'],
    [/חדלות|פשיטת|חובות|הסדר חוב|הסדר נושים|הוצאה לפועל|הוצל.?פ|עיקול/, 'חדלות פירעון'],
    [/ירוש|צוואה|עיזבון|עזבון/, 'ירושות וצוואות'],
    [/ייפוי|יפוי/, 'ייפוי כוח מתמשך'],
    [/פתיחת חברה|חברה בע|רשם החברות|הקמת חברה/, 'פתיחת חברה'],
    [/תביעה|בית משפט|ליטיגציה|כתב הגנה|דיון/, 'ליטיגציה'],
    [/דירה|דירות|נכס|מקרקעין|נדל|קני|רכיש|מכיר|מוכר|חברה משכנת|משכנתא|טאבו|קבלן|בית משותף/, 'מקרקעין'],
  ];
  O.leadArea = text => (AREA_RULES.find(([re]) => re.test(String(text || ''))) || [null, ''])[1];
  const RE_TEXT = /מקרקעין|נדל|דירה|דירות|נכס|מיסוי|מס רכישה|מס שבח|התחדשות|תמ.?א|פינוי|חברה משכנת|משכנתא|טאבו|קבלן|בית משותף/;
  O.isReLead = l => RE_TEXT.test(`${l.area || ''} ${l.topic || ''}`);

  /* ---------- file types for "סגירה ללקוח" ---------- */
  const TYPES = [['re', 'נדל״ן'], ['renewal', 'התחדשות עירונית'], ['court', 'בית משפט'], ['debt', 'חדלות פירעון או הסדר חוב'], ['will', 'צוואה וירושה'], ['poa', 'ייפוי כוח'], ['company', 'חברה'], ['other', 'אחר']];
  const SIDES = [['buy', 'קנייה', 'קונה'], ['sell', 'מכירה', 'מוכר'], ['both', 'שני הצדדים', 'שני צדדים']];
  const DEBTS = [['insolvency', 'חדלות פירעון'], ['settlement', 'הסדר חוב']];
  const METHODS = [['העברה בנקאית', 'העברה'], ['אשראי', 'אשראי'], ['צ׳קים', 'צ׳קים'], ['הוראת קבע', 'הוראת קבע'], ['מזומן', 'מזומן']];
  O.LEAD_FILE_TYPES = TYPES;
  O.leadGuessType = l => {
    const s = `${l.area || ''} ${l.topic || ''} ${l.needs || ''} ${l.campaign || ''}`;
    let type = 'other', sub = 'buy', debt = 'insolvency';
    if (/התחדשות|תמ.?א|פינוי|בינוי/.test(s)) type = 'renewal';
    else if (/הסדר חוב|הסדר נושים|הסדר חובות/.test(s)) { type = 'debt'; debt = 'settlement'; }
    else if (/חדלות|פשיטת|חובות|הוצאה לפועל|עיקול/.test(s)) type = 'debt';
    else if (/ירוש|צוואה|עיזבון|עזבון/.test(s)) type = 'will';
    else if (/ייפוי|יפוי/.test(s)) type = 'poa';
    else if (/פתיחת חברה|חברה בע|הקמת חברה|רשם החברות/.test(s)) type = 'company';
    else if (/תביעה|בית משפט|ליטיגציה|כתב הגנה/.test(s)) type = 'court';
    else if (RE_TEXT.test(s)) type = 're';
    if (/מכיר|מוכר|למכור/.test(s) && /קני|רוכש|לקנות/.test(s)) sub = 'both';
    else if (/מכיר|מוכר|למכור/.test(s)) sub = 'sell';
    return { type, sub, debt };
  };

  /* ---------- texts ---------- */
  const tplOn = k => (O.salesTplOn ? O.salesTplOn(k) : true);
  const WELCOME_FR = 'Bonjour {name}, ici Maître Yakir Dabul. J\'ai bien reçu votre demande. Quand êtes-vous disponible pour un court échange, par téléphone ou par WhatsApp ?';
  const WELCOME_EN = 'Hello {name}, this is Adv. Yakir Dabul. I received your request. When would suit you for a short call, by phone or WhatsApp?';
  if (O.SALES_TPL && !O.SALES_TPL.meeting_confirm) O.SALES_TPL.meeting_confirm = ['אישור פגישה (לשליחה ידנית מהליד)', 'שלום {name}, מאשר את השיחה שלנו ב-{meeting_time}. אם צריך לשנות, אפשר להשיב כאן. עו"ד יקיר דבול'];
  const render = (k, l) => (O.renderSales ? O.renderSales(k, l) : '');
  // the WhatsApp text that fits where the lead is now (same templates as the automatic follow-ups)
  O.leadWaText = l => {
    const st = stageOf(l), name = first(l.name);
    const missed = (l.calls || []).filter(c => !c.ok).length;
    if (st === 'new') {
      if (l.lang === 'fr') return WELCOME_FR.replace('{name}', name);
      if (l.lang === 'en') return WELCOME_EN.replace('{name}', name);
      if (missed && !l.repliedAt) return render('call_missed_' + Math.min(3, missed), l);
      return render('welcome', l);
    }
    if (st === 'contacted') return render('contacted_followup_1', l);
    if (st === 'meeting_set') {
      const m = toMs(l.meetingAt);
      if (m > 0) {
        if (ilDay(m) === ilDay(Date.now() + 864e5)) return render('meeting_reminder_day', l);
        if (m - Date.now() < 3 * 36e5 && m > Date.now() - 36e5) return render('meeting_reminder_hour', l);
        return render('meeting_confirm', l);
      }
      return render('contacted_followup_1', l);
    }
    if (st === 'no_show') return render('no_show', l);
    if (st === 'meeting_done') return render('meeting_thanks', l);
    if (st === 'proposal_sent') return render('proposal_reminder', l);
    return `שלום ${name}, `;
  };
  O.leadWaLabel = l => ({ new: 'הודעת פתיחה', contacted: 'מעקב לקביעת שיחה', meeting_set: 'אישור או תזכורת לפגישה', no_show: 'קביעת מועד חדש', meeting_done: 'מעקב אחרי השיחה', proposal_sent: 'מעקב על ההצעה' })[stageOf(l)] || 'הודעה';
  const waHref = l => (O.waLink ? O.waLink(l.phone, O.leadWaText(l)) : '');

  /* ---------- what happened with the lead, in short ---------- */
  O.leadHistory = l => {
    const calls = l.calls || [], ok = calls.filter(c => c.ok).length, no = calls.length - ok;
    const out = [];
    out.push(`מקור: ${O.srcLabel(l.source)}${l.campaign ? ' · ' + l.campaign : ''}${l.created ? ' · נכנס ' + ddmm(toMs(l.created)) : ''}`);
    if (l.topic || l.area) out.push(`נושא: ${l.topic || l.area}`);
    if (l.debtRange) out.push(`היקף חוב: ${l.debtRange}`);
    if (l.needs) out.push(`מה הוא צריך: ${l.needs}`);
    if (calls.length) out.push(`שיחות: ${calls.length} (${ok} עם מענה${no ? `, ${no} בלי מענה` : ''})`);
    if (l.repliedAt) out.push(`השיב בוואטסאפ: ${ddmm(toMs(l.repliedAt))}`);
    if (l.meetingAt) out.push(`פגישה: ${O.ilTime ? O.ilTime(toMs(l.meetingAt)) : l.meetingAt}`);
    const key = (l.log || []).filter(e => e && e.text && !/^עדכון הערות/.test(e.text)).slice(-10);
    if (key.length) { out.push('מהלך הטיפול:'); key.forEach(e => out.push(`• ${e.at ? ddmm(Date.parse(e.at)) + ' ' : ''}${e.text}`)); }
    return out.join('\n');
  };
  const fileNotes = l => [`נפתח מליד: ${l.name}${l.phone ? ' · ' + (O.fmtPhone ? O.fmtPhone(l.phone) : l.phone) : ''}`, l.notes ? `הערות מהליד:\n${l.notes}` : '', `סיכום הליד:\n${O.leadHistory(l)}`].filter(Boolean).join('\n\n');

  /* ---------- links between a lead, its quote / agreement and its file ---------- */
  const quotesOf = l => (O.all('quotes') || []).filter(q => q.leadId === l.id);
  const agrsOf = l => (O.all('feeagr') || []).filter(a => a.leadId === l.id);
  const agrSigned = a => { const rs = (a.reqs || []).map(r => O.get('signreqs', r.id)).filter(Boolean); return rs.length && rs.every(r => r.status === 'signed'); };
  const quoteFee = q => { const b = q.calc || {}, vat = b.vat != null ? +b.vat : 0.18; return Math.round((+b.once || 0) * (1 + vat)); };
  const fileOf = l => { const f = l.fileRef; return f && f.coll && f.id && O.get(f.coll, f.id) ? f : null; };
  const fileTitle = f => { const d = O.get(f.coll, f.id) || {}; return f.coll === 'deals' ? (d.address || 'עסקה') : (d.title || 'תיק'); };
  const goFile = f => {
    if (!f) return;
    if (f.coll === 'deals') return O.go('deal', f.id);
    const m = O.get('matters', f.id) || {};
    O.go(m.kind === 'insolvency' ? 'insolv' : m.kind === 'settlement' ? 'settle' : m.kind === 'company' ? 'company' : 'matters', f.id);
  };
  // something already agreed: an accepted / signed quote, or a signed fee agreement (offered, never run by itself)
  O.leadOffer = l => {
    if (!l || stageOf(l) === 'won' || stageOf(l) === 'lost') return null;
    const q = quotesOf(l).find(x => x.status === 'won' && x.matterId);
    if (q) return { kind: 'quote-opened', q, fee: quoteFee(q), text: `הצעת המחיר ${q.number || ''} נחתמה ונפתח ממנה תיק. אפשר לסמן את הליד כלקוח ולקשר לתיק.` };
    const qa = quotesOf(l).find(x => x.status === 'accepted');
    if (qa) return { kind: 'quote', q: qa, fee: quoteFee(qa), text: `הלקוח אישר את הצעת המחיר ${qa.number || ''}. אפשר לסגור ללקוח.` };
    const a = agrsOf(l).find(agrSigned);
    if (a) return { kind: 'agr', a, fee: +a.fee || 0, text: 'הסכם שכר הטרחה נחתם. אפשר לסגור ללקוח.' };
    return null;
  };

  /* ---------- A1: close the lead into a client + file + fee plan ---------- */
  const busyClose = new Set();
  const newPlan = async (o) => {
    if (typeof O.newFeePlan === 'function') return O.newFeePlan(o);
    // same shape as newFeePlan in addon-plus.js
    const c = O.get('clients', o.clientId) || {}, id = O.uid('p'), count = Math.max(1, Math.min(120, Math.round(+o.count || 1))), total = r2(o.total);
    const per = r2(total / count), inst = []; let due = o.start || today();
    for (let n = 1; n <= count; n++) { inst.push({ n, amount: n === count ? r2(total - per * (count - 1)) : per, due, status: 'pending', paidAmount: 0, paidAt: null }); const d = new Date(due + 'T12:00:00'); d.setMonth(d.getMonth() + 1); due = d.toISOString().slice(0, 10); }
    await O.save('plans', id, Object.assign({ kind: 'fee', clientId: o.clientId, name: c.name || '', phone: c.phone || '', area: 'שכ״ט', service: o.service, desc: o.desc || '', total, monthly: inst[0].amount, start: o.start || today(), method: o.method || '', installments: inst, created: today(), receipts: [] }, o.link || {}));
    return id;
  };
  const findClient = l => O.all('clients').find(c => (l.phone && samePhone(c.phone, l.phone)) || (l.email && c.email && String(c.email).toLowerCase() === String(l.email).toLowerCase()));
  // f: { type, sub, debt, title, fee, pay: 'once'|'inst'|'none', count, start, method, autoRemind }
  O.leadCloseToClient = async (leadId, f) => {
    const l = O.get('leads', leadId);
    if (!l) throw new Error('הליד לא נמצא');
    const done = fileOf(l);
    if (done) return { dup: true, clientId: l.clientId, fileRef: done, planId: l.planId || '' };
    if (busyClose.has(leadId)) return { busy: true };
    busyClose.add(leadId);
    try {
      const day = today(), fee = r2(num(f.fee)), pay = f.pay || (fee > 0 ? 'once' : 'none');
      const method = f.method || '', autoRemind = !!f.autoRemind;
      const offer = O.leadOffer(l);
      // 1. the client: by phone (or email), otherwise a new card
      let c = findClient(l), clientId;
      if (c) {
        clientId = c.id;
        const fill = {}; ['phone', 'email'].forEach(k => { if (l[k] && !c[k]) fill[k] = l[k]; });
        if (!c.leadId) fill.leadId = l.id;
        if (l.notes && !String(c.notes || '').includes(String(l.notes).slice(0, 40))) fill.notes = [c.notes, l.notes].filter(Boolean).join('\n');
        if (Object.keys(fill).length) await O.patch('clients', clientId, fill);
      } else {
        clientId = O.uid('c');
        await O.save('clients', clientId, { name: l.name, phone: l.phone || '', idNo: '', email: l.email || '', address: '', notes: l.notes || '', source: `ליד: ${O.srcLabel(l.source) || 'ידני'}`, tags: [], created: day, leadId: l.id });
      }
      if (O.log) await O.log('client', clientId, `נסגר מליד (${O.srcLabel(l.source) || 'ידני'})`, 'system');
      // 2. already opened from the quote ("אישור ופתיחת תיק" there): link, do not open a second file
      if (offer && offer.kind === 'quote-opened') {
        const q = offer.q, fileRef = { coll: 'matters', id: q.matterId };
        await O.patch('matters', q.matterId, { leadId: l.id });
        if (q.planId && O.get('plans', q.planId)) await O.patch('plans', q.planId, Object.assign({ leadId: l.id }, autoRemind ? { autoRemind: true } : {}));
        await O.setStage(l.id, 'won', { wonAt: nowIso(), fee: fee || quoteFee(q), clientId: q.clientId || clientId, fileRef, planId: q.planId || '', convertedAt: day, closeType: 'quote' });
        await O.leadLog(l.id, 'won', `נסגר ללקוח וקושר לתיק שנפתח מהצעת המחיר ${q.number || ''}`);
        return { clientId: q.clientId || clientId, fileRef, planId: q.planId || '', linked: true };
      }
      // 3. the file
      const notes = fileNotes(l), t = f.type || 'other', title = String(f.title || '').trim();
      let fileRef, feeOnDeal = false;
      const agr = agrsOf(l).find(a => a.planId && O.get('plans', a.planId)) || null;
      if (t === 're') {
        const side = (SIDES.find(s => s[0] === f.sub) || SIDES[0])[2];
        const agrDeal = agrsOf(l).map(a => a.dealId && O.get('deals', a.dealId)).find(Boolean);
        if (agrDeal) {
          fileRef = { coll: 'deals', id: agrDeal.id };
          const fill = { leadId: l.id }; if (!num(agrDeal.fee) && fee > 0 && pay === 'once') { fill.fee = fee; feeOnDeal = true; }
          if (!agrDeal.notes) fill.notes = notes;
          await O.patch('deals', agrDeal.id, fill);
        } else {
          const id = O.uid('d');
          feeOnDeal = pay === 'once' && fee > 0 && !agr;
          await O.save('deals', id, { clientIds: [clientId], address: title || `${l.topic && !/^(מקרקעין|נדל)/.test(l.topic) ? l.topic : 'עסקת נדל״ן'} - ${l.name}`, side, status: (O.DEAL_STATUSES || ['בבדיקה'])[0], price: null, fee: feeOnDeal ? fee : null, feePaid: false, feeMethod: method, regType: 'טאבו', milestones: {}, payments: [], created: day, area: 'מקרקעין', statusLog: [{ s: (O.DEAL_STATUSES || ['בבדיקה'])[0], at: day }], notes, leadId: l.id });
          fileRef = { coll: 'deals', id };
          if (O.log) await O.log('deal', id, 'נפתחה עסקה מליד', 'system');
        }
      } else {
        const id = O.uid('m'), base = { clientId, created: day, notes, leadId: l.id };
        let data;
        if (t === 'debt' && f.debt === 'settlement') data = Object.assign(base, { kind: 'settlement', debtor: l.name, phone: l.phone || '', title: `הסדר נושים ${l.name}`, status: '', creditors: [] });
        else if (t === 'debt') data = Object.assign(base, { kind: 'insolvency', stage: 'pre', debtor: l.name, title: `חדל״פ ${l.name}`, phone: l.phone || '', address: '', orderDate: '', caseNo: '', firstPeriod: '', trusteePay: '', persons: '' });
        else if (t === 'company') {
          const [fn, ...rest] = String(l.name || '').split(' ');
          data = Object.assign(base, { kind: 'company', title: title || 'פתיחת חברה', holders: [{ first: fn || '', last: rest.join(' '), idType: 'id', idNo: '', passCountry: '', country: 'ישראל', city: '', street: '', house: '', apt: '', zip: '', phone: l.phone || '', email: l.email || '', shares: '', director: true, hold: 'רגילה' }], shares: 100, par: 1, purpose: '1', officeSame: true, date: day });
        } else if (t === 'renewal') data = Object.assign(base, { kind: 'other', area: 'התחדשות עירונית', title: `התחדשות עירונית${title ? ' - ' + title : ''} - ${l.name}`, status: '' });
        else {
          const kind = { court: 'court', will: 'will', poa: 'poa', other: 'other' }[t] || 'other';
          const label = { court: 'תיק בית משפט', will: 'צוואה וירושה', poa: 'ייפוי כוח מתמשך', other: l.topic || 'תיק' }[kind];
          data = Object.assign(base, { kind, title: `${title || label} - ${l.name}`, status: '' }, kind === 'court' ? { caseNo: '', court: '', opposing: '', nextHearing: null } : {});
        }
        if (fee > 0) data.fee = fee;
        await O.save('matters', id, data);
        fileRef = { coll: 'matters', id };
      }
      // 4. the fee plan (the agreement may already have one: link it instead of a second plan)
      let planId = '';
      const link = Object.assign({ leadId: l.id }, fileRef.coll === 'deals' ? { dealId: fileRef.id } : { matterId: fileRef.id }, autoRemind ? { autoRemind: true } : {});
      if (agr) {
        planId = agr.planId;
        await O.patch('plans', planId, Object.assign({ clientId }, link, method ? { method } : {}));
      } else if (fee > 0 && !feeOnDeal && pay !== 'none') {
        const count = pay === 'inst' ? Math.max(2, Math.round(num(f.count) || 2)) : 1;
        const service = t === 're' ? `${(SIDES.find(s => s[0] === f.sub) || SIDES[0])[1]} נדל״ן${title ? ' - ' + title : ''}` : t === 'debt' ? (f.debt === 'settlement' ? 'הסדר נושים' : 'חדלות פירעון') : (TYPES.find(x => x[0] === t) || [, 'שכ״ט'])[1] + (title ? ' - ' + title : '');
        planId = await newPlan({ clientId, service, desc: `שכר טרחה שסוכם בסגירת הליד${count > 1 ? ` (${count} תשלומים חודשיים)` : ''}.`, total: fee, count, start: f.start || day, method, paidNow: 0, link });
        if (autoRemind && O.get('plans', planId) && !O.get('plans', planId).autoRemind) await O.patch('plans', planId, { autoRemind: true });
      }
      if (planId && fileRef.coll === 'matters') await O.patch('matters', fileRef.id, { planId });
      if (planId && fileRef.coll === 'deals') await O.patch('deals', fileRef.id, { feePlanId: planId });
      // 5. a quote that was accepted but not opened yet: mark it as won and link it, so its own button cannot open a second file
      if (offer && offer.kind === 'quote') await O.patch('quotes', offer.q.id, { status: 'won', wonAt: nowIso(), clientId, matterId: fileRef.coll === 'matters' ? fileRef.id : '', dealId: fileRef.coll === 'deals' ? fileRef.id : '', planId });
      // 6. the lead: "לקוח" (this also stops every lead follow-up message)
      await O.setStage(l.id, 'won', { wonAt: nowIso(), fee: fee || null, clientId, fileRef, planId, convertedAt: day, closeType: t, payMethod: method });
      await O.leadLog(l.id, 'won', `נסגר ללקוח: נפתח ${fileRef.coll === 'deals' ? 'תיק עסקה' : 'תיק'}${fee > 0 ? ` · שכ״ט ${money(fee)}${pay === 'inst' ? ' בתשלומים' : ''}` : ''}${method ? ' · ' + method : ''}`);
      return { clientId, fileRef, planId };
    } finally { busyClose.delete(leadId); }
  };

  /* ---------- small pieces of UI ---------- */
  const css = document.createElement('style');
  css.textContent = `
.lx-m{display:grid;gap:12px}
.lx-m .btn{min-height:40px}
.lx-notes{background:var(--warn-soft);border-radius:12px;padding:10px 12px}
.lx-notes label{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;font-size:14px;margin-bottom:6px}
.lx-notes textarea{width:100%;min-height:74px;border:1px solid var(--line);border-radius:10px;padding:9px 10px;font:15px/1.55 var(--body);background:var(--panel);color:var(--ink);resize:vertical}
.lx-saved{font-size:12px;font-weight:600;color:var(--muted)}
.lx-acts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.lx-acts .btn{justify-content:center;width:100%}
.lx-close{width:100%;justify-content:center;font-size:16px;font-weight:800;min-height:48px!important}
.lx-row3{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}.lx-row3 .btn{justify-content:center;width:100%;padding-inline:6px}
.lx-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--panel)}
.lx-box h4{margin:0 0 8px;font-size:14px}
.lx-next{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
.lx-next b{display:block}
.lx-banner{border-radius:12px;padding:10px 12px;background:var(--ok-soft);display:grid;gap:8px}
.lx-banner.warn{background:var(--info-soft)}
.lx-chips{display:flex;flex-wrap:wrap;gap:8px}
.lx-chip{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;padding:8px 14px;font:inherit;font-size:14.5px;cursor:pointer;min-height:40px}
.lx-chip[aria-pressed=true]{border-color:var(--accent);background:var(--accent-soft);font-weight:800}
.lx-types{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.lx-types .lx-chip{border-radius:12px;text-align:center;width:100%}
@media(min-width:720px){.lx-types{grid-template-columns:repeat(4,minmax(0,1fr))}}
.lx-f{display:grid;gap:5px}.lx-f>label{font-weight:700;font-size:14px}
.lx-f input,.lx-f textarea,.lx-f select{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 11px;font:16px var(--body);background:var(--panel2);color:var(--ink);min-height:44px}
.lx-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.lx-hint{font-size:13px;color:var(--muted);margin:0}
.lx-err{color:var(--bad);font-size:14px;margin:0}
.lx-kv{display:grid;gap:0}
.lx-tl{display:grid;gap:6px;margin:0;padding:0;list-style:none}.lx-tl li{font-size:13.5px;display:flex;gap:8px}.lx-tl small{color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
@media(min-width:900px){.lx-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}}
.lx-list{display:grid}
.lx-rowh,.lx-row{display:grid;grid-template-columns:minmax(0,2fr) 116px minmax(0,1.6fr) 84px 46px;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line2)}
.lx-rowh{font-size:12.5px;color:var(--muted);font-weight:700;padding-block:8px}
.lx-row{cursor:pointer}.lx-row:hover{background:var(--panel2)}
.lx-row .who{display:flex;gap:10px;align-items:center;min-width:0}.lx-row .who>div{min-width:0}
.lx-row .who b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lx-row .who small,.lx-row .nx small{display:block;color:var(--muted);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lx-row .nx{min-width:0;font-size:13.5px}.lx-row .nx b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.lx-row .wt{font-size:13px;font-variant-numeric:tabular-nums}.lx-row .wt.late{color:var(--bad);font-weight:700}
.lx-row .ac .btn{width:40px;height:40px;padding:0;justify-content:center}
.lx-filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.lx-filters select{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:14px;background:var(--panel);color:var(--ink);min-height:40px;max-width:100%}
@media(max-width:700px){
  .lx-rowh{display:none}
  .lx-row{grid-template-columns:auto minmax(0,1fr) 44px;grid-template-areas:"who who ac" "st wt wt" "nx nx nx";gap:6px 10px;padding:12px}
  .lx-row .wt{white-space:nowrap}
  .lx-row .who{grid-area:who}.lx-row .st{grid-area:st}.lx-row .nx{grid-area:nx;background:var(--panel2);border-radius:8px;padding:6px 8px}.lx-row .wt{grid-area:wt;text-align:left}.lx-row .ac{grid-area:ac}
  .lx-filters select{flex:1 1 140px}
}
@media(max-width:980px){table.lx-t td{display:flex!important;justify-content:space-between;align-items:center;gap:10px;padding:3px 0!important}table.lx-t td:before{content:attr(data-th);color:var(--muted);font-size:12.5px;font-weight:600}table.lx-t td:first-child{font-size:15.5px;padding-bottom:6px!important}table.lx-t td:first-child:before{content:none}}
.lx-cbnote{position:fixed;inset-inline:12px;bottom:12px;z-index:90;background:var(--panel);border:2px solid var(--accent);border-radius:14px;box-shadow:var(--shadow-lg);padding:12px;display:grid;gap:8px;max-width:520px;margin-inline:auto}
`;
  document.head.appendChild(css);

  const chips = (name, list, cur) => `<div class="lx-chips" role="group" data-chips="${name}">${list.map(([v, l]) => `<button type="button" class="lx-chip" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join('')}</div>`;
  const wireChips = (root, name, onPick) => {
    const box = root.querySelector(`[data-chips="${name}"]`); if (!box) return;
    box.querySelectorAll('.lx-chip').forEach(b => { b.onclick = () => { box.querySelectorAll('.lx-chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick && onPick(b.dataset.v); }; });
  };
  const chipVal = (root, name) => { const b = root.querySelector(`[data-chips="${name}"] .lx-chip[aria-pressed="true"]`); return b ? b.dataset.v : ''; };
  const localInput = ms => { if (!(ms > 0)) return ''; const d = ilDay(ms), t = hhmm(ms); return t ? `${d}T${t}` : ''; };

  /* ---------- A1: the "סגירה ללקוח" sheet ---------- */
  function doneModal(id, res) {
    const l = O.get('leads', id) || {};
    const f = res.fileRef;
    O.modal({
      title: res.dup ? 'הליד כבר נסגר ללקוח' : 'נסגר ללקוח',
      wide: true,
      body: `<div class="lx-m"><div class="alert ok">${icon('check', 18)}<div><b>${esc(l.name || '')}</b> ${res.dup ? 'כבר נסגר ללקוח, ולא נפתח תיק נוסף.' : res.linked ? 'סומן כלקוח וקושר לתיק שנפתח מהצעת המחיר.' : 'סומן כלקוח. נפתחו כרטיס לקוח, תיק ותוכנית תשלומים.'}${res.dup ? '' : ' לא נשלחה הודעה ללקוח. הודעות המעקב של הליד נעצרו.'}</div></div>
        ${f ? `<p class="lx-hint">התיק: <b>${esc(fileTitle(f))}</b></p>` : ''}
        <div class="lx-acts"><button class="btn pri" data-lx="client">${icon('users', 16)} לכרטיס הלקוח</button>${f ? `<button class="btn" data-lx="file">${icon(f.coll === 'deals' ? 'deal' : 'doc', 16)} לתיק</button>` : ''}</div></div>`,
      foot: '<button class="btn" data-close>סגירה</button>',
      onMount: (root, close) => {
        const c = root.querySelector('[data-lx="client"]'); if (c) c.onclick = () => { close(); O.go('client', res.clientId || l.clientId); };
        const fb = root.querySelector('[data-lx="file"]'); if (fb) fb.onclick = () => { close(); goFile(f); };
      },
    });
  }
  O.leadCloseSheet = function (id, preset) {
    const l = O.get('leads', id); if (!l) return;
    const f0 = fileOf(l);
    if (f0) return doneModal(id, { dup: true, clientId: l.clientId, fileRef: f0 });
    const g = O.leadGuessType(l), offer = O.leadOffer(l), p = preset || {};
    const fee0 = p.fee || (offer && offer.fee) || l.fee || '';
    const agrPlan = agrsOf(l).map(a => a.planId && O.get('plans', a.planId)).find(Boolean);
    if (offer && offer.kind === 'quote-opened') {
      return O.modal({
        title: `סגירה ללקוח: ${l.name}`, wide: true,
        body: `<div class="lx-m"><div class="lx-banner">${esc(offer.text)}</div><p class="lx-hint">לא ייפתח תיק נוסף. הליד יסומן כלקוח ויקושר לתיק ולתוכנית התשלומים שנפתחו מההצעה. לא נשלחת הודעה ללקוח.</p><p class="lx-err" id="lx_e" hidden></p></div>`,
        foot: `<button class="btn pri lx-close" id="lx_go">${icon('check', 16)} סימון כלקוח וקישור לתיק</button><button class="btn" data-close>ביטול</button>`,
        onMount: (root, close) => {
          root.querySelector('#lx_go').onclick = async e => {
            const b = e.currentTarget; if (b.disabled) return; b.disabled = true;
            try { const res = await O.leadCloseToClient(id, { fee: fee0 }); close(); doneModal(id, res); }
            catch (x) { const er = root.querySelector('#lx_e'); er.hidden = false; er.textContent = x.message || 'הפעולה נכשלה'; b.disabled = false; }
          };
        },
      });
    }
    const st = { type: p.type || g.type, sub: p.sub || g.sub, debt: p.debt || g.debt, pay: 'once', method: p.method || '' };
    O.modal({
      title: `סגירה ללקוח: ${l.name}`, wide: true,
      body: `<div class="lx-m">
        ${offer ? `<div class="lx-banner">${esc(offer.text)}</div>` : ''}
        <div class="lx-f"><label>סוג התיק</label>${chips('type', TYPES, st.type)}</div>
        <div class="lx-f" data-when="re"><label>בעסקה אנחנו מייצגים</label>${chips('sub', SIDES.map(s => [s[0], s[1]]), st.sub)}</div>
        <div class="lx-f" data-when="debt"><label>איזה הליך</label>${chips('debt', DEBTS, st.debt)}</div>
        <div class="lx-f"><label for="lx_t" id="lx_tl">כותרת קצרה (לא חובה)</label><input id="lx_t" value="${esc(p.title || '')}" placeholder=""></div>
        <div class="lx-f"><label for="lx_fee">שכר טרחה שסוכם (₪, כולל מע״מ)</label><input id="lx_fee" type="number" inputmode="decimal" step="any" min="0" value="${esc(fee0)}" placeholder="למשל 8500"></div>
        ${agrPlan ? `<p class="lx-hint">${icon('check', 13)} שכר הטרחה כבר נרשם בכספים מהסכם שכר הטרחה (${money(agrPlan.total)}). התוכנית הקיימת תקושר לתיק, בלי תוכנית כפולה.</p>` : ''}
        <div class="lx-f" data-pay><label>איך משלם</label>${chips('pay', [['once', 'תשלום אחד'], ['inst', 'בתשלומים'], ['none', 'עוד לא נקבע']], st.pay)}</div>
        <div class="lx-2" data-when-pay="inst"><div class="lx-f"><label for="lx_cnt">מספר תשלומים</label><input id="lx_cnt" type="number" inputmode="numeric" min="2" max="60" value="${esc(p.count || 3)}"></div><div class="lx-f"><label for="lx_st">תשלום ראשון</label><input id="lx_st" type="date" value="${esc(p.start || today())}"></div></div>
        <p class="lx-hint" data-when-pay="inst">כל תשלום נוסף חודש אחרי הקודם.</p>
        <div class="lx-f" data-when-pay="once"><label for="lx_d1">מועד התשלום</label><input id="lx_d1" type="date" value="${esc(p.start || today())}"></div>
        <div class="lx-f" data-pay><label>אמצעי תשלום</label>${chips('method', METHODS, st.method)}</div>
        <p class="lx-hint" id="lx_dealfee" hidden>בעסקת נדל״ן בתשלום אחד, שכר הטרחה נרשם בעסקה עצמה (כמו בכל עסקה), ומשם עוקבים אחרי התשלום.</p>
        <label class="chk" data-pay data-remind><input type="checkbox" id="lx_rem"> שליחת תזכורת אוטומטית ללקוח 3 ימים לפני כל תשלום</label>
        <p class="lx-hint">בלחיצה אחת: כרטיס לקוח (או חיבור לכרטיס קיים לפי הטלפון), תיק מהסוג שנבחר, תוכנית תשלומים, והעתקת ההערות וההיסטוריה של הליד לתיק. לא נשלחת הודעה ללקוח.</p>
        <p class="lx-err" id="lx_e" hidden></p></div>`,
      foot: `<button class="btn pri lx-close" id="lx_go">${icon('check', 16)} סגירה ופתיחת תיק</button><button class="btn" data-close>ביטול</button>`,
      onMount: (root, close) => {
        const $ = s => root.querySelector(s);
        const PH = { re: 'כתובת הנכס, למשל: הרצל 10, נתניה', renewal: 'שם הפרויקט או הכתובת', court: 'למשל: תביעה נגד קבלן', debt: '', will: 'למשל: צוואה הדדית', poa: '', company: 'שם החברה, אם ידוע', other: 'במה מדובר' };
        const sync = () => {
          st.type = chipVal(root, 'type') || st.type; st.pay = chipVal(root, 'pay') || st.pay; st.method = chipVal(root, 'method');
          root.querySelectorAll('[data-when]').forEach(e => { e.hidden = e.dataset.when !== st.type; });
          root.querySelectorAll('[data-when-pay]').forEach(e => { e.hidden = e.dataset.whenPay !== st.pay; });
          root.querySelectorAll('[data-pay]').forEach(e => { e.hidden = !!agrPlan; });
          $('#lx_tl').textContent = st.type === 're' ? 'כתובת הנכס (לא חובה)' : 'כותרת קצרה לתיק (לא חובה)';
          $('#lx_t').placeholder = PH[st.type] || '';
          $('#lx_t').closest('.lx-f').hidden = st.type === 'debt' || st.type === 'poa';
          // a real estate fee in one payment lives on the deal itself (as in the rest of the app), so there is no plan to remind about
          root.querySelector('[data-remind]').hidden = !!agrPlan || st.pay === 'none' || (st.type === 're' && st.pay === 'once');
          $('#lx_dealfee').hidden = !(st.type === 're' && st.pay === 'once') || !!agrPlan;
        };
        ['type', 'sub', 'debt', 'pay', 'method'].forEach(n => wireChips(root, n, sync));
        sync();
        $('#lx_go').onclick = async e => {
          const b = e.currentTarget, er = $('#lx_e');
          if (b.disabled) return;
          const fee = num($('#lx_fee').value);
          const pay = agrPlan ? 'once' : st.pay;
          if (pay !== 'none' && !(fee > 0) && !agrPlan) { er.hidden = false; er.textContent = 'חסר סכום שכר הטרחה. אם עוד לא סוכם, בוחרים "עוד לא נקבע".'; return; }
          if (pay === 'inst' && !(num($('#lx_cnt').value) >= 2)) { er.hidden = false; er.textContent = 'בתשלומים צריך לפחות 2 תשלומים'; return; }
          er.hidden = true; b.disabled = true; const old = b.innerHTML; b.innerHTML = '<span class="spin sm"></span> פותח...';
          try {
            const res = await O.leadCloseToClient(id, { type: st.type, sub: chipVal(root, 'sub') || 'buy', debt: chipVal(root, 'debt') || 'insolvency', title: $('#lx_t').value, fee: pay === 'none' ? 0 : fee, pay, count: $('#lx_cnt').value, start: pay === 'inst' ? $('#lx_st').value : $('#lx_d1').value, method: st.method, autoRemind: $('#lx_rem').checked });
            if (res.busy) { b.disabled = false; b.innerHTML = old; return; }
            close(); doneModal(id, res);
          } catch (x) { console.error(x); er.hidden = false; er.textContent = (x && x.message) || 'הפעולה נכשלה. אפשר לנסות שוב.'; b.disabled = false; b.innerHTML = old; }
        };
      },
    });
  };
  O.act('lx-close', (el, ds) => { document.querySelectorAll('.ov').forEach(o => { if (o.querySelector('[data-lxlead]')) o.remove(); }); O.leadCloseSheet(ds.id); });
  // the old "המרה ללקוח" goes through the same sheet
  O.convertLead = async id => { closeTop(); O.leadCloseSheet(id); };

  /* ---------- A3: after "דיברנו" ---------- */
  const NEXT = [['לקבוע פגישה', 'לקבוע פגישה'], ['לשלוח הצעה', 'לשלוח הצעה'], ['לחזור אליו', 'לחזור אליו'], ['לא רלוונטי', 'לא רלוונטי']];
  const NEXT_STAGE = { 'לקבוע פגישה': 'meeting_set', 'לשלוח הצעה': 'meeting_done', 'לא רלוונטי': 'lost' };
  function talkSheet(id) {
    const l = O.get('leads', id); if (!l) return;
    O.modal({
      title: `אחרי השיחה עם ${first(l.name)}`, wide: true,
      body: `<div class="lx-m">
        <div class="lx-f"><label for="lx_need">מה הוא צריך</label><textarea id="lx_need" rows="3" placeholder="למשל: קונה דירה ראשונה בנתניה, חתימה בעוד חודש">${esc(l.needs || '')}</textarea></div>
        <div class="lx-f"><label>מה הצעד הבא</label>${chips('next', NEXT, '')}<input id="lx_nx" value="${esc(l.nextStep || '')}" placeholder="או לכתוב במילים שלך"></div>
        <div class="lx-f" data-need-when><label for="lx_nxat">מתי</label><input id="lx_nxat" type="datetime-local" value="${esc(localInput(toMs(l.nextStepAt)))}"></div>
        <label class="chk" data-jump hidden><input type="checkbox" id="lx_jump" checked> <span id="lx_jumpt"></span></label>
        <p class="lx-err" id="lx_e" hidden></p></div>`,
      foot: `<button class="btn pri" id="lx_go">${icon('check', 15)} שמירה</button><button class="btn" data-close>דילוג</button>`,
      onMount: (root, close) => {
        const $ = s => root.querySelector(s);
        wireChips(root, 'next', v => {
          $('#lx_nx').value = v;
          const to = NEXT_STAGE[v], cur = stageOf(O.get('leads', id) || l);
          const jump = root.querySelector('[data-jump]');
          jump.hidden = !to || to === cur;
          $('#lx_jumpt').textContent = to ? `גם להעביר לשלב "${STAGE_LABEL(to)}"${to === 'meeting_set' ? ' (בוחרים מועד)' : to === 'lost' ? ' (בוחרים סיבה)' : ''}` : '';
          if (v === 'לחזור אליו' && !$('#lx_nxat').value) $('#lx_nxat').focus();
        });
        $('#lx_go').onclick = async () => {
          const needs = $('#lx_need').value.trim(), nextStep = $('#lx_nx').value.trim(), atS = $('#lx_nxat').value;
          const at = atS ? toMs(atS) : NaN;
          const cur = O.get('leads', id) || l;
          const patch = { needs, nextStep, nextStepAt: at > 0 ? new Date(at).toISOString() : null };
          if (nextStep === 'לחזור אליו' && at > 0) Object.assign(patch, { callbackAt: new Date(at).toISOString(), callbackNotified: null });
          const line = [needs && `צריך: ${needs}`, nextStep && `הצעד הבא: ${nextStep}${at > 0 ? ' (' + fmtWhen(at) + ')' : ''}`].filter(Boolean).join(' · ');
          patch.log = (cur.log || []).concat(line ? [{ at: nowIso(), kind: 'talk', text: `סיכום שיחה: ${line}` }] : []).slice(-80);
          await O.patch('leads', id, patch);
          close();
          const to = NEXT_STAGE[nextStep], jump = $('#lx_jump');
          if (to && jump && jump.checked && !root.querySelector('[data-jump]').hidden) return stageSheet(id, to);
          O.toast('נשמר'); openLead(id);
        };
      },
    });
  }

  /* ---------- A4: "לחזור אליו ב..." ---------- */
  const callbackChoices = () => {
    const now = Date.now(), d0 = ilDay(now), out = [['h1', 'בעוד שעה', now + 36e5]];
    const at17 = toMs(`${d0}T17:00`); if (at17 - now > 20 * 60e3) out.push(['t17', 'היום 17:00', at17]);
    let k = 1, d1 = ilDay(now + 864e5);
    while (new Date(d1 + 'T12:00:00Z').getUTCDay() === 6 && k < 3) { k++; d1 = ilDay(now + k * 864e5); }
    out.push(['m9', `${k === 1 ? 'מחר' : 'יום ' + ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date(d1 + 'T12:00:00Z').getUTCDay()]} 09:00`, toMs(`${d1}T09:00`)]);
    return out;
  };
  O.leadSetCallback = async (id, ms, note) => {
    const l = O.get('leads', id); if (!l) return;
    if (ms > 0) {
      await O.patch('leads', id, { callbackAt: new Date(ms).toISOString(), callbackNotified: null, callbackNote: note || '', log: (l.log || []).concat([{ at: nowIso(), kind: 'callback', text: `לחזור אליו ${fmtWhen(ms)}${note ? ': ' + note : ''}` }]).slice(-80) });
    } else {
      await O.patch('leads', id, { callbackAt: null, callbackNote: '', log: (l.log || []).concat([{ at: nowIso(), kind: 'callback', text: 'החזרה המתוכננת בוטלה' }]).slice(-80) });
    }
  };
  function callbackSheet(id) {
    const l = O.get('leads', id); if (!l) return;
    const ch = callbackChoices();
    O.modal({
      title: `לחזור ל${first(l.name)} ב...`, wide: true,
      body: `<div class="lx-m">${chips('when', ch.map(c => [c[0], c[1]]).concat([['custom', 'מועד אחר']]), '')}
        <div class="lx-f" id="lx_cw" hidden><label for="lx_cat">מועד</label><input id="lx_cat" type="datetime-local" value="${esc(localInput(toMs(l.callbackAt)))}"></div>
        <div class="lx-f"><label for="lx_cn">תזכורת לעצמך (לא חובה)</label><input id="lx_cn" value="${esc(l.callbackNote || '')}" placeholder="למשל: לשאול על המשכנתא"></div>
        <p class="lx-hint">${icon('bell', 13)} בזמן הזה תגיע אליך הודעה בטלגרם עם השם, הנושא, ההערה האחרונה וכפתור חיוג (בתוך כמה דקות מהשעה שבחרת, גם בערב ובשבת).</p>
        <p class="lx-err" id="lx_e" hidden></p></div>`,
      foot: `<button class="btn pri" id="lx_go">${icon('bell', 15)} שמירה</button>${l.callbackAt ? '<button class="btn ghost" id="lx_rm">ביטול החזרה</button>' : ''}<button class="btn" data-close>סגירה</button>`,
      onMount: (root, close) => {
        const $ = s => root.querySelector(s);
        wireChips(root, 'when', v => { $('#lx_cw').hidden = v !== 'custom'; if (v === 'custom') $('#lx_cat').focus(); });
        $('#lx_go').onclick = async () => {
          const v = chipVal(root, 'when'), er = $('#lx_e');
          const ms = v === 'custom' || !v ? toMs($('#lx_cat').value) : (ch.find(c => c[0] === v) || [])[2];
          if (!(ms > 0)) { er.hidden = false; er.textContent = 'בוחרים מתי לחזור אליו'; $('#lx_cw').hidden = false; return; }
          await O.leadSetCallback(id, ms, $('#lx_cn').value.trim());
          close(); O.toast(`נשמר: לחזור אליו ${fmtWhen(ms)}`); openLead(id);
        };
        const rm = $('#lx_rm'); if (rm) rm.onclick = async () => { await O.leadSetCallback(id, 0); close(); O.toast('החזרה בוטלה'); openLead(id); };
      },
    });
  }

  /* ---------- stage change (with the extra field each stage needs) ---------- */
  function stageSheet(id, to) {
    const l = O.get('leads', id); if (!l) return;
    if (to === 'won') return O.leadCloseSheet(id);
    const extra = to === 'meeting_set' ? `<div class="lx-f"><label for="lx_mt">מועד השיחה או הפגישה</label><input id="lx_mt" type="datetime-local" value="${esc(String(l.meetingAt || '').slice(0, 16))}"></div>`
      : to === 'lost' ? `<div class="lx-f"><label for="lx_lr">סיבה</label><select id="lx_lr">${(O.LOST_REASONS || ['אחר']).map(r => `<option${r === l.lostReason ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></div>` : '';
    O.modal({
      title: `העברה לשלב: ${STAGE_LABEL(to)}`, wide: true,
      body: `<div class="lx-m">${extra || `<p class="lx-hint">${esc(l.name)} יעבור לשלב "${esc(STAGE_LABEL(to))}". ההודעות והמשימות יתעדכנו לפי השלב.</p>`}<p class="lx-err" id="lx_e" hidden></p></div>`,
      foot: `<button class="btn pri" id="lx_go">${icon('check', 15)} עדכון</button><button class="btn" data-close>ביטול</button>`,
      onMount: (root, close) => {
        root.querySelector('#lx_go').onclick = async () => {
          const f = {}, er = root.querySelector('#lx_e');
          if (to === 'meeting_set') { const v = (root.querySelector('#lx_mt') || {}).value; if (!v) { er.hidden = false; er.textContent = 'בוחרים מועד'; return; } f.meetingAt = v; }
          if (to === 'lost') f.lostReason = (root.querySelector('#lx_lr') || {}).value;
          await O.setStage(id, to, f);
          close(); O.toast(to === 'meeting_set' ? 'נקבע. תזכורות ללקוח יום ושעה לפני.' : to === 'lost' ? 'הליד נסגר. ההודעות המתוזמנות בוטלו.' : 'השלב עודכן'); openLead(id);
        };
      },
    });
  }

  /* ---------- the next step of a lead, and how long it waits for us ---------- */
  O.leadNext = l => {
    const st = stageOf(l), now = Date.now(), c = [];
    if (st === 'meeting_set' && l.meetingAt) c.push({ at: toMs(l.meetingAt), text: 'פגישה', kind: 'meeting' });
    if (l.callbackAt) c.push({ at: toMs(l.callbackAt), text: 'לחזור אליו' + (l.callbackNote ? `: ${l.callbackNote}` : ''), kind: 'callback' });
    if (l.nextStepAt) c.push({ at: toMs(l.nextStepAt), text: l.nextStep || 'הצעד הבא', kind: 'step' });
    const ok = c.filter(x => x.at > 0);
    const up = ok.filter(x => x.at >= now - 36e5).sort((a, b) => a.at - b.at)[0];
    if (up) return Object.assign(up, { late: up.at < now });
    const past = ok.sort((a, b) => b.at - a.at)[0];
    if (past && isOpen(l)) return Object.assign(past, { late: true });
    if (l.nextStep && isOpen(l)) return { text: l.nextStep, at: 0, kind: 'step' };
    const t = O.salesManaged && O.salesManaged(l) && O.salesTask ? O.salesTask(l) : null;
    if (t) return { text: t.title.split(':')[0], at: t.due ? toMs(t.due + 'T09:00') : 0, kind: 'task', day: t.due };
    return null;
  };
  O.leadWaitingSince = l => {
    const touch = [...(l.calls || []).map(c => Date.parse(c.at)), ...(l.log || []).filter(e => e && ['call', 'talk', 'wa', 'message'].includes(e.kind)).map(e => Date.parse(e.at))].filter(x => x > 0);
    const last = touch.length ? Math.max(...touch) : 0, rep = Date.parse(l.repliedAt || '') || 0;
    if (rep > last) return rep;
    return last || toMs(l.created) || Date.now();
  };

  /* ---------- A2 + the lead window ---------- */
  const openLead = id => { const ovs = document.querySelectorAll('.ov'); ovs.forEach(o => { if (o.querySelector('[data-lxlead]')) o.remove(); }); O.ACT['sl-open'](null, { id }); };
  function leadModal(id) {
    const n = O.get('leads', id); if (!n) return;
    const a = stageOf(n), open = isOpen(n), file = fileOf(n), offer = O.leadOffer(n);
    const plan = O.salesManaged && O.salesManaged(n) && O.salesPlan ? O.salesPlan(n) : [];
    const calls = n.calls || [], miss = calls.filter(c => !c.ok).length, now = Date.now();
    const nx = O.leadNext(n), cb = toMs(n.callbackAt);
    const hist = (n.log || []).slice().reverse().slice(0, 30);
    const kv = (k, v) => v ? `<div class="kv-row"><span>${k}</span><b>${v}</b></div>` : '';
    const pillCls = { new: 'p-warn', contacted: 'p-info', meeting_set: 'p-teal', no_show: 'p-bad', meeting_done: 'p-teal', proposal_sent: 'p-acc', won: 'p-ok', lost: 'p-mute' }[a] || '';
    let script = '';
    try { if (O.leadScript) { const sc = O.leadScript(n), op = (sc.sections.find(s => s.h === 'פתיחה') || { items: [] }).items[0] || ''; if (op && open) script = `<div class="ss-peek"><b>${icon('chat', 14)} איך לפתוח את השיחה</b>${esc(op)}<div class="btn-row" style="margin-top:8px"><button class="btn xs pri" data-a="ss-open" data-id="${esc(id)}">${icon('doc', 12)} התסריט המלא</button></div></div>`; } } catch (e) { script = ''; }
    const msgs = plan.length ? `<div class="lx-box"><h4>הודעות מתוזמנות</h4><div class="list">${plan.map((d, g) => { const e = O.get('outbox', d.key), skip = plan.slice(g + 1).some(y => y.at <= now), s = e ? (e.status === 'sent' ? 'נשלחה' : e.status === 'dismissed' ? 'בוטלה' : 'הוצעה לשליחה') : d.at <= now ? (skip ? 'דולגה (יצאה הודעה מאוחרת יותר)' : 'מחכה לשליחה') : (O.ilTime ? O.ilTime(d.at) : ''); return `<div class="li" style="padding:8px 0"><span class="ic ${e && e.status === 'sent' ? 'i-ok' : d.at <= now ? 'i-warn' : 'i-info'}">${icon('send', 13)}</span><div class="grow"><b class="small">${esc(((O.SALES_TPL || {})[d.tpl] || [d.tpl])[0])}</b><small>${esc(s)}</small></div>${!e && d.at > now ? `<button class="btn xs ghost" data-slcancel="${esc(d.key)}" aria-label="ביטול ההודעה">${icon('x', 12)}</button>` : ''}</div>`; }).join('')}</div></div>` : '';
    O.modal({
      title: n.name || 'ליד',
      wide: true,
      body: `<div class="lx-m" data-lxlead="${esc(id)}">
        ${file ? `<div class="lx-banner"><b>${icon('check', 15)} נסגר ללקוח${n.wonAt ? ' ב-' + esc(O.fmtDate ? O.fmtDate(String(n.wonAt).slice(0, 10)) : '') : ''}</b><div class="lx-acts"><button class="btn sm" data-lx="client">${icon('users', 14)} לכרטיס הלקוח</button><button class="btn sm" data-lx="file">${icon(file.coll === 'deals' ? 'deal' : 'doc', 14)} לתיק</button></div></div>`
          : offer ? `<div class="lx-banner"><b>${esc(offer.text)}</b><button class="btn pri lx-close" data-a="lx-close" data-id="${esc(id)}">${icon('check', 16)} סגירה ללקוח</button></div>` : ''}
        <div class="lx-grid"><div class="lx-m">
          <div class="lx-notes"><label for="lx_notes"><span>${icon('edit', 14)} הערות על הליד</span><span class="lx-saved" id="lx_ns"></span></label><textarea id="lx_notes" data-nokeep="1" placeholder="מה חשוב לזכור על הליד הזה">${esc(n.notes || '')}</textarea></div>
          <div class="lx-acts">${n.phone ? `<a class="btn" href="tel:${esc(n.phone)}" data-lx="dial">${icon('phone', 16)} חיוג</a><a class="btn wa" target="_blank" rel="noopener" href="${esc(waHref(n))}" data-lx="wa" title="${esc(O.leadWaLabel(n))}">${icon('wa', 16)} וואטסאפ</a>` : '<span class="small muted">אין טלפון</span>'}</div>
          ${n.phone ? `<p class="lx-hint" style="margin-top:-6px">בוואטסאפ ייפתח נוסח שמתאים לשלב: ${esc(O.leadWaLabel(n))}.</p>` : ''}
          ${!file && a !== 'lost' ? `<button class="btn pri lx-close" data-a="lx-close" data-id="${esc(id)}">${icon('check', 16)} סגירה ללקוח</button>` : ''}
          ${open || nx ? `<div class="lx-box"><div class="lx-next"><div><small class="muted">הצעד הבא</small><b>${nx ? esc(nx.text) : 'לא נקבע'}${nx && nx.at > 0 ? ` <span class="pill ${nx.late ? 'p-bad' : 'p-info'}" style="font-size:11.5px">${esc(nx.day && nx.kind === 'task' ? O.rel(nx.day) : fmtWhen(nx.at))}</span>` : ''}</b>${n.needs ? `<small class="muted">צריך: ${esc(n.needs)}</small>` : ''}</div>${cb > 0 ? `<button class="btn xs ghost" data-lx="cbx" aria-label="ביטול החזרה">${icon('x', 12)}</button>` : ''}</div></div>` : ''}
          ${open ? `<div class="lx-box"><h4>שיחות${calls.length ? ` <small class="muted">(${miss} בלי מענה מתוך 3)</small>` : ''}</h4><div class="lx-acts"><button class="btn ok" data-lx="call-ok">${icon('check', 15)} דיברנו</button><button class="btn" data-lx="call-no">${icon('x', 15)} לא ענה</button>${a === 'new' && !n.repliedAt ? `<button class="btn ghost" data-lx="reply" style="grid-column:1/-1">השיב בוואטסאפ</button>` : ''}</div></div>` : ''}
          ${a !== 'lost' ? `<div class="lx-row3"><button class="btn" data-lx="cb">${icon('bell', 15)} לחזור אליו</button><button class="btn" data-lx="quote">${icon('money', 15)} הצעת מחיר</button><button class="btn" data-lx="agr">${icon('sign', 15)} הסכם שכ״ט</button></div>` : ''}
          ${script}
        </div><div class="lx-m">
          <div class="lx-box lx-kv">${kv('טלפון', `<span class="num">${esc(O.fmtPhone ? O.fmtPhone(n.phone) : n.phone || '-')}</span>`)}${kv('דוא״ל', esc(n.email))}${kv('נושא', esc(n.topic || n.area || '-'))}${n.area && n.topic && n.area !== n.topic ? kv('תחום', esc(n.area)) : ''}${kv('היקף חוב', esc(n.debtRange))}${kv('זמן נוח', esc(n.preferredTime))}
            ${kv('מקור', esc(O.srcLabel(n.source) + (n.campaign ? ' · ' + n.campaign : '') + (n.adName ? ' · ' + n.adName : '')))}${kv('נכנס', esc(O.fmtDate ? O.fmtDate(String(n.created || '').slice(0, 10)) : ''))}
            <div class="kv-row"><span>שלב</span><span class="pill ${pillCls}">${esc(STAGE_LABEL(a))}</span></div>${n.meetingAt && a === 'meeting_set' ? kv('פגישה', esc(O.ilTime ? O.ilTime(toMs(n.meetingAt)) : n.meetingAt)) : ''}${kv('סיבה', esc(n.lostReason))}${n.fee ? kv('שכ״ט', money(n.fee)) : ''}${n.page ? kv('עמוד', `<a href="${esc(n.page)}" target="_blank" rel="noopener">פתיחה</a>`) : ''}</div>
          <div class="lx-f"><label for="lx_st">העברה לשלב</label><div class="btn-row" style="flex-wrap:nowrap"><select id="lx_st" style="flex:1">${(O.STAGES || []).map(([v, t]) => `<option value="${v}"${v === a ? ' selected' : ''}>${esc(v === 'won' ? t + ' (סגירה ללקוח)' : t)}</option>`).join('')}</select><button class="btn pri" data-lx="stage">עדכון</button></div></div>
          ${msgs}
          ${hist.length ? `<div class="lx-box"><h4>היסטוריה</h4><ul class="lx-tl">${hist.map(d => `<li><small>${esc(d.at ? fmtWhen(Date.parse(d.at)) : '')}</small><span>${esc(d.text)}</span></li>`).join('')}</ul></div>` : ''}
        </div></div></div>`,
      foot: `<button class="btn" data-lx="edit">${icon('edit', 14)} עריכת פרטים</button><button class="btn ghost danger" data-lx="del" aria-label="מחיקת הליד">${icon('trash', 14)}</button><button class="btn" data-close>סגירה</button>`,
      onMount: (root, close) => {
        const on = (k, f) => root.querySelectorAll(`[data-lx="${k}"]`).forEach(b => { b.onclick = ev => f(b, ev); });
        // notes: saved by themselves (a pause in typing, leaving the field, or closing the window)
        const ta = root.querySelector('#lx_notes'), ns = root.querySelector('#lx_ns');
        let saved = n.notes || '', tm = 0, logged = false;
        const saveNotes = async () => {
          clearTimeout(tm);
          const v = ta.value; if (v === saved) return;
          const cur = O.get('leads', id) || n, patch = { notes: v };
          if (!logged) { patch.log = (cur.log || []).concat([{ at: nowIso(), kind: 'note', text: `עדכון הערות: ${v.replace(/\s+/g, ' ').slice(0, 60)}${v.length > 60 ? '...' : ''}` }]).slice(-80); logged = true; }
          saved = v; ns.textContent = 'שומר...';
          try { await O.patch('leads', id, patch); ns.textContent = 'נשמר ✓'; } catch (e) { saved = ''; ns.textContent = 'לא נשמר'; }
        };
        ta.addEventListener('input', () => { ns.textContent = ''; clearTimeout(tm); tm = setTimeout(saveNotes, 1200); });
        ta.addEventListener('blur', saveNotes);
        const ov = root.closest ? root.closest('.ov') || root : root;
        const mo = new MutationObserver(() => { if (!document.body.contains(ov)) { mo.disconnect(); saveNotes(); } });
        mo.observe(document.body, { childList: true });
        const reopen = () => { close(); openLead(id); };
        on('client', () => { close(); O.go('client', n.clientId); });
        on('file', () => { close(); goFile(fileOf(O.get('leads', id) || n)); });
        on('wa', () => { const cur = O.get('leads', id) || n; O.patch('leads', id, { log: (cur.log || []).concat([{ at: nowIso(), kind: 'wa', text: `נפתחה הודעת וואטסאפ: ${O.leadWaLabel(cur)}` }]).slice(-80) }).catch(() => {}); });
        on('call-ok', async () => {
          await saveNotes(); await O.logCall(id, true);
          const cur = O.get('leads', id); if (cur && cur.callbackAt && toMs(cur.callbackAt) <= Date.now() + 2 * 36e5) await O.patch('leads', id, { callbackAt: null });
          close(); talkSheet(id);
        });
        on('call-no', async () => {
          await saveNotes(); await O.logCall(id, false);
          const u = ((O.get('leads', id) || {}).calls || []).filter(f => !f.ok).length;
          O.toast(u >= 3 ? '3 ניסיונות. הוכנה הודעה אחרונה, ובעוד יומיים תתבקש להחליט.' : `נרשם. הוכנה הודעת וואטסאפ, וניסיון ${u + 1} מחר.`);
          reopen();
        });
        on('reply', async () => { await O.leadReplied(id); O.toast('נרשם שהליד השיב. הודעות המעקב נעצרו.'); reopen(); });
        on('cb', () => { close(); callbackSheet(id); });
        on('cbx', async () => { await O.leadSetCallback(id, 0); O.toast('החזרה בוטלה'); reopen(); });
        on('quote', () => { close(); O.leadQuote(id); });
        on('agr', () => { close(); O.leadAgreement(id); });
        on('stage', () => {
          const to = root.querySelector('#lx_st').value;
          if (to === a && to !== 'meeting_set') { O.toast('זה כבר השלב הנוכחי'); return; }
          close(); stageSheet(id, to);
        });
        on('edit', () => { close(); editLead(O.get('leads', id) || n); });
        on('del', async () => { if (await O.confirm('למחוק את הליד?', 'מחיקה', true)) { await O.remove('leads', id); close(); } });
        root.querySelectorAll('[data-slcancel]').forEach(b => {
          b.onclick = async () => {
            await O.save('outbox', b.dataset.slcancel.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_'), { status: 'dismissed', at: nowIso(), key: b.dataset.slcancel, name: n.name });
            O.toast('ההודעה בוטלה'); reopen();
          };
        });
      },
    });
  }
  O.act('sl-open', (el, ds) => leadModal(ds.id));
  O.act('lead-open', (el, ds) => leadModal(ds.id));

  /* ---------- A5: one lead system ---------- */
  const AREA_OPTIONS = () => { const a = (O.AREAS || []).filter(x => typeof x === 'string'); const base = a.length ? a : ['מקרקעין', 'התחדשות עירונית', 'מיסוי מקרקעין', 'חדלות פירעון', 'הסדר חובות', 'ירושות וצוואות', 'ייפוי כוח מתמשך', 'ליטיגציה', 'אחר']; return base.includes('פתיחת חברה') ? base : base.slice(0, -1).concat(['פתיחת חברה', base[base.length - 1]]); };
  const leadFields = () => [
    ['name', 'שם מלא', 'text', { req: true }],
    ['phone', 'טלפון', 'tel', { req: true }],
    ['email', 'דוא״ל', 'email'],
    ['area', 'תחום', 'select', { options: [['', 'לפי הנושא']].concat(AREA_OPTIONS().map(x => [x, x])) }],
    ['topic', 'נושא הפנייה', 'text', { ph: 'למשל: קניית דירה ראשונה, הסדר חובות' }],
    ['source', 'מקור', 'select', { options: SOURCES }],
    ['campaign', 'קמפיין (לא חובה)'],
    ['preferredTime', 'זמן נוח לשיחה'],
    ['debtRange', 'היקף חוב (בחובות בלבד)', 'select', { options: ['', ...(O.DEBT_RANGES || [])] }],
    ['notes', 'הערות', 'textarea'],
  ];
  O.leadCreate = async (o, started) => {
    const phone = normPhone(o.phone) || o.phone || '';
    const s = nowIso(), stage = started === 'contacted' ? 'contacted' : 'new';
    const area = o.area || O.leadArea(`${o.topic || ''} ${o.notes || ''} ${o.campaign || ''}`) || 'אחר';
    const id = O.uid('l');
    const lead = Object.assign({}, o, { phone, topic: o.topic || area, area, source: o.source || 'manual', stage, status: stage === 'new' ? 'חדש' : 'בטיפול', stageAt: s, created: s, via: 'office-manual', lang: o.lang || 'he', log: [{ at: s, kind: 'created', text: `ליד נוסף ידנית (${O.srcLabel(o.source || 'manual')})` }] });
    ['debtRange', 'campaign', 'email', 'preferredTime', 'notes'].forEach(k => { if (lead[k] == null) lead[k] = ''; });
    await O.save('leads', id, lead);
    return id;
  };
  function newLeadForm(values) {
    const ai = O.S && O.S.sample;
    O.formModal({
      title: 'ליד חדש',
      fields: leadFields().concat([['started', 'מצב', 'select', { options: [['new', 'ליד חדש (עוד לא דיברנו)'], ['contacted', 'כבר דיברתי איתו']] }]]),
      values: Object.assign({ source: 'manual', started: 'new' }, values || {}),
      submit: 'הוספה',
      extraFoot: ai ? `<button class="btn" type="button" data-lx="ai">${icon('ai', 14)} מילוי מהודעה</button>` : '',
      onSubmit: async o => {
        const phone = normPhone(o.phone) || o.phone;
        const dup = O.all('leads').find(l => samePhone(l.phone, phone) && isOpen(l));
        if (dup && !(await O.confirm(`כבר יש ליד פתוח עם הטלפון הזה (${dup.name}). להוסיף בכל זאת?`, 'הוספה'))) return false;
        const started = o.started; delete o.started;
        const id = await O.leadCreate(o, started);
        O.toast(started === 'contacted' ? 'הליד נוסף. משימה לקבוע שיחת ייעוץ נפתחה.' : 'הליד נוסף. הודעת פתיחה מוכנה, ומשימת שיחה נפתחה.');
        if (O.R.view !== 'leads') O.go('leads', id);
      },
    });
    setTimeout(() => { const b = document.querySelector('.ov [data-lx="ai"]'); if (b) b.onclick = () => { closeTop(); O.parseLeadAI(); }; }, 30);
  }
  O.act('new-lead', () => newLeadForm());
  O.act('sl-new', () => newLeadForm());
  O.parseLeadAI = () => O.modal({
    title: 'מילוי ליד מהודעה',
    body: '<div class="f"><label for="lx_lt">מדביקים הודעת וואטסאפ, מייל או טופס מהאתר</label><textarea id="lx_lt" rows="7"></textarea></div><p class="small muted">העוזר יחלץ שם, טלפון, נושא ופירוט. אחר כך בודקים ושומרים.</p>',
    foot: `<button class="btn pri" id="lx_go">${icon('ai', 15)} חילוץ</button><button class="btn" data-close>ביטול</button>`,
    onMount: (root, close) => {
      root.querySelector('#lx_go').onclick = async () => {
        const b = root.querySelector('#lx_go'); b.disabled = true; b.innerHTML = '<span class="spin"></span> מנתח...';
        try {
          const r = await O.S.sample.json(`חלץ מהטקסט פרטי ליד למשרד עורכי דין. החזר JSON בלבד: {"name":"","phone":"","email":"","topic":"נושא קצר בעברית","notes":"תקציר הבקשה בעברית"}. טקסט:\n${root.querySelector('#lx_lt').value}`, { modelTier: 'quick' });
          close(); newLeadForm(Object.assign({ source: 'whatsapp' }, r || {}));
        } catch (e) { b.disabled = false; b.textContent = 'נסה שוב'; O.toast('החילוץ נכשל', 'bad'); }
      };
    },
  });
  function editLead(l) {
    O.formModal({
      title: 'עריכת ליד', fields: leadFields(), values: l, submit: 'שמירה',
      onSubmit: async c => { c.phone = normPhone(c.phone) || c.phone; if (!c.area) c.area = O.leadArea(`${c.topic} ${c.notes}`) || l.area || ''; await O.patch('leads', l.id, c); O.toast('נשמר'); setTimeout(() => openLead(l.id), 50); },
    });
  }

  /* ---------- B7: quote and fee agreement from inside the lead ---------- */
  let qxLead = null;
  O.leadQuote = id => {
    const l = O.get('leads', id); if (!l || !O.ACT['qx-new']) { O.toast('מסך הצעות המחיר לא זמין', 'bad'); return; }
    O.ACT['qx-new']({ dataset: { client: l.clientId || '' } });
    setTimeout(() => {
      const ov = [...document.querySelectorAll('.ov')].pop(); if (!ov) return;
      const set = (s, v) => { const e = ov.querySelector(s); if (e && v && !e.value) e.value = v; };
      const g = O.leadGuessType(l), tl = (TYPES.find(t => t[0] === g.type) || [])[1] || '';
      set('#qn_t', [l.topic || l.area || tl, l.needs].filter(Boolean).join('. '));
      set('#qn_n', [l.notes ? 'מהליד: ' + String(l.notes).slice(0, 300) : '', l.fee ? `שכ״ט שדובר: ${l.fee}` : ''].filter(Boolean).join('\n'));
      set('#qn_nm', l.name); set('#qn_ph', l.phone); set('#qn_em', l.email);
      const go = ov.querySelector('#qn_go'); if (go) go.dataset.lead = id;
      qxLead = { id, at: Date.now() };
    }, 40);
  };
  const AGR_KEY = 'px-feeagr-draft';
  let agrLead = null;
  O.leadAgreement = id => {
    const l = O.get('leads', id); if (!l) return;
    const g = O.leadGuessType(l), type = g.type === 're' ? g.sub : 'other';
    const draft = { clientId: l.clientId || '', dealId: '', type, addr: '', addrSell: '', addrBuy: '', other: type === 'other' ? [l.topic || l.area, l.needs].filter(Boolean).join('. ') : '', fee: +l.fee || '', payText: '', cancelExt: false, toMoney: true, c1: { name: l.name || '', idNo: '', address: '', phone: l.phone || '', email: l.email || '' }, c2: null, date: today() };
    try { localStorage.setItem(AGR_KEY, JSON.stringify(draft)); } catch (e) { /* the form starts empty */ }
    agrLead = { id, phone: l.phone, at: Date.now() };
    try { sessionStorage.setItem('lx-agr-lead', JSON.stringify(agrLead)); } catch (e) { /* memory only */ }
    O.go('feeagr');
    setTimeout(() => O.toast('פרטי הליד מולאו. משלימים ת.ז, כתובת וסכום, ושולחים לחתימה.'), 300);
  };
  try { const s0 = JSON.parse(sessionStorage.getItem('lx-agr-lead') || 'null'); if (s0 && Date.now() - s0.at < 6 * 36e5) agrLead = s0; } catch (e) { /* none */ }
  // new quotes / agreements started from a lead carry its leadId
  if (typeof O.save === 'function' && !O.save.__lx) {
    const save0 = O.save;
    const tagged = function (coll, id, data) {
      try {
        if (data && typeof data === 'object' && !data.leadId) {
          if (coll === 'quotes' && qxLead && Date.now() - qxLead.at < 30 * 60e3 && data.status === 'draft' && document.querySelector(`#qn_go[data-lead="${qxLead.id}"]`)) { data = Object.assign({}, data, { leadId: qxLead.id }); qxLead = null; }
          else if ((coll === 'feeagr' || coll === 'signreqs') && agrLead && Date.now() - agrLead.at < 6 * 36e5) {
            const ph = coll === 'feeagr' ? ((data.form || {}).c1 || {}).phone : data.phone;
            if (ph && samePhone(ph, agrLead.phone)) data = Object.assign({}, data, { leadId: agrLead.id });
          }
        }
      } catch (e) { console.warn('leadflow tag', e); }
      return save0.call(this, coll, id, data);
    };
    tagged.__lx = true;
    O.save = tagged;
  }
  // the quote's own "אישור ופתיחת תיק" never opens a second file for a lead that is already closed
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-qx="open"],[data-qx="signed"]');
    if (!b || O.R.view !== 'quotes' || !O.R.id) return;
    const q = O.get('quotes', O.R.id); if (!q || !q.leadId) return;
    const l = O.get('leads', q.leadId), f = l && fileOf(l);
    if (!f) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    await O.patch('quotes', q.id, { status: 'won', wonAt: nowIso(), clientId: l.clientId || q.clientId || '', matterId: f.coll === 'matters' ? f.id : '', dealId: f.coll === 'deals' ? f.id : '', planId: l.planId || '' });
    if (f.coll === 'matters') await O.patch('matters', f.id, { quoteId: q.id, quoteNumber: q.number || '' });
    O.toast('הליד כבר נסגר ללקוח. ההצעה קושרה לתיק הקיים, בלי לפתוח תיק נוסף.');
  }, true);

  /* ---------- B7: sending moves the lead to "הצעה נשלחה"; agreed offers are shown ---------- */
  const EARLY = ['new', 'contacted', 'meeting_set', 'no_show', 'meeting_done'];
  let watchBusy = false, watchTm = 0;
  const offered = new Set();
  async function watch() {
    if (watchBusy || !O.S || !O.S.canEdit || !(O.S.loaded || {}).leads) return;
    watchBusy = true;
    try {
      for (const l of O.all('leads')) {
        if (!EARLY.includes(stageOf(l))) continue;
        const q = quotesOf(l).find(x => ['sent', 'accepted', 'won'].includes(x.status));
        const ag = !q && agrsOf(l)[0];
        const ref = q ? 'q:' + q.id : ag ? 'fa:' + ag.id : '';
        if (!ref || l.proposalRef === ref) continue;
        await O.setStage(l.id, 'proposal_sent', { proposalRef: ref });
        await O.leadLog(l.id, 'stage', q ? `נשלחה הצעת מחיר ${q.number || ''}` : 'נשלח הסכם שכר טרחה לחתימה');
      }
      for (const l of O.all('leads')) {
        const o = O.leadOffer(l); if (!o) continue;
        const k = l.id + (o.q ? o.q.id + o.q.status : o.a ? o.a.id : '');
        let seen = false; try { seen = localStorage.getItem('lx-offer-' + k) === '1'; localStorage.setItem('lx-offer-' + k, '1'); } catch (e) { /* session only */ }
        if (offered.has(k) || seen) continue; offered.add(k);
        if (O.R.view === 'leads' || O.R.view === 'quotes' || O.R.view === 'feeagr') O.toast(`${l.name}: ${o.kind === 'agr' ? 'ההסכם נחתם' : 'ההצעה אושרה'}. אפשר לסגור ללקוח מתוך הליד.`);
      }
    } catch (e) { console.warn('leadflow watch', e); }
    watchBusy = false;
  }
  if (O.onChange) O.onChange(() => { clearTimeout(watchTm); watchTm = setTimeout(watch, 1500); });

  /* ---------- B9: the leads list ---------- */
  const tabs = cur => `<div class="segs" role="tablist" style="margin-bottom:14px">${[['pipe', 'צינור לידים'], ['report', 'דוח ביצועים'], ['tpl', 'הודעות אוטומטיות'], ['connect', 'חיבור לפייסבוק']].map(([s, l]) => `<button type="button" data-a="sl-tab" data-t="${s}" class="${cur === s ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const head = () => O.pageHead('לידים ומכירות', 'כל ליד מפייסבוק, מגוגל, מהאתר או ידני נכנס לכאן. המערכת מכינה הודעות מעקב, מזכירה לך לחזור, ומודדת כמה עולה כל לקוח.', `<button class="btn pri" data-a="sl-new">${icon('plus', 16)} ליד חדש</button>`);
  const SORTS = [['wait', 'מחכה הכי הרבה זמן'], ['next', 'הצעד הבא הקרוב'], ['new', 'חדשים קודם']];
  function pipeView() {
    const f = O.ui('leads', 'f', 'open'), q = O.ui('leads', 'q', ''), src = O.ui('leads', 'src', ''), ar = O.ui('leads', 'area', '');
    const all = O.all('leads'), openF = f === 'open';
    const sort = O.ui('leads', 'sort', '') || (openF || EARLY.includes(f) || f === 'proposal_sent' ? 'wait' : 'new');
    let list = all.filter(e => f === 'all' ? true : f === 'open' ? isOpen(e) : stageOf(e) === f);
    if (src) list = list.filter(e => (e.source || '') === src);
    if (ar) list = list.filter(e => (e.area || e.topic || '') === ar);
    if (q) { const nq = O.norm ? O.norm(q) : q; list = list.filter(e => (O.norm ? O.norm : (x => x))(`${e.name} ${e.phone} ${e.topic || ''} ${e.area || ''} ${e.notes || ''} ${e.needs || ''} ${e.campaign || ''}`).includes(nq)); }
    const nxOf = new Map(list.map(e => [e.id, O.leadNext(e)]));
    if (sort === 'wait') list.sort((a, b) => O.leadWaitingSince(a) - O.leadWaitingSince(b));
    else if (sort === 'next') list.sort((a, b) => ((nxOf.get(a.id) || {}).at || 9e15) - ((nxOf.get(b.id) || {}).at || 9e15));
    else list.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    const month = today().slice(0, 7), mo = x => String(x || '').slice(0, 7);
    const waiting = all.filter(e => stageOf(e) === 'new' && !(e.calls || []).length).length;
    const thisMonth = all.filter(e => mo(e.created) === month);
    const wonM = all.filter(e => stageOf(e) === 'won' && mo(e.wonAt || e.stageAt) === month);
    const meetings = all.filter(e => stageOf(e) === 'meeting_set' && toMs(e.meetingAt) >= Date.now() - 36e5 && toMs(e.meetingAt) <= Date.now() + 7 * 864e5).length;
    const callbacksToday = all.filter(e => isOpen(e) && e.callbackAt && ilDay(toMs(e.callbackAt)) <= ilDay(Date.now())).length;
    const cnt = s => all.filter(e => stageOf(e) === s).length;
    const srcs = [...new Set(all.map(e => e.source || ''))].filter(Boolean);
    const areas = [...new Set(all.map(e => e.area || e.topic || ''))].filter(Boolean).sort();
    const offers = all.map(l => [l, O.leadOffer(l)]).filter(x => x[1]);
    const row = e => {
      const st = stageOf(e), nx = nxOf.get(e.id), w = O.leadWaitingSince(e), late = isOpen(e) && Date.now() - w > (st === 'new' ? 36e5 : 3 * 864e5);
      const pc = { new: 'p-warn', contacted: 'p-info', meeting_set: 'p-teal', no_show: 'p-bad', meeting_done: 'p-teal', proposal_sent: 'p-acc', won: 'p-ok', lost: 'p-mute' }[st] || '';
      const nxWhen = nx ? (nx.kind === 'task' && nx.day ? (O.rel ? O.rel(nx.day) : nx.day) : nx.at > 0 ? fmtWhen(nx.at) : '') : '';
      return `<div class="lx-row" data-a="sl-open" data-id="${esc(e.id)}" role="button" tabindex="0">
        <div class="who">${O.avatar ? O.avatar(e.name) : ''}<div><b>${esc(e.name)}${e.repliedAt && st === 'new' ? ' <span class="pill p-ok" style="font-size:11px">השיב</span>' : ''}</b><small><span class="num">${esc(O.fmtPhone ? O.fmtPhone(e.phone) : e.phone || '')}</span>${e.topic || e.area ? ' · ' + esc(e.topic || e.area) : ''} · ${esc(O.srcLabel(e.source))}</small></div></div>
        <div class="st"><span class="pill ${pc}">${esc(STAGE_LABEL(st))}</span></div>
        <div class="nx">${nx ? `<b>${esc(nx.text)}</b><small${nx.late ? ' style="color:var(--bad);font-weight:700"' : ''}>${esc(nxWhen || ' ')}${nx.late && nx.kind !== 'task' ? ' · עבר המועד' : ''}</small>` : '<small>אין צעד פתוח</small>'}</div>
        <div class="wt${late ? ' late' : ''}">${isOpen(e) ? `${st === 'new' && !(e.calls || []).length ? 'מחכה ' : 'קשר אחרון '}${ago(w)}` : ''}</div>
        <div class="ac">${e.phone && st !== 'lost' ? `<a class="btn xs wa" href="${esc(waHref(e))}" target="_blank" rel="noopener" data-stop="1" data-lxwa="${esc(e.id)}" aria-label="וואטסאפ: ${esc(O.leadWaLabel(e))}" title="${esc(O.leadWaLabel(e))}">${icon('wa', 15)}</a>` : ''}</div></div>`;
    };
    return `<div class="grid g4" style="margin-bottom:16px"><div class="card kpi"><small>ממתינים לשיחה ראשונה</small><b class="num"${waiting ? ' style="color:var(--bad)"' : ''}>${waiting}</b></div><div class="card kpi"><small>לחזור אליהם היום</small><b class="num">${callbacksToday}</b></div><div class="card kpi"><small>פגישות ב-7 ימים</small><b class="num">${meetings}</b></div><div class="card kpi"><small>לקוחות החודש</small><b class="num">${wonM.length}</b><span class="small muted">${thisMonth.length} לידים החודש</span></div></div>
      ${offers.length ? `<div class="lx-banner" style="margin-bottom:12px">${offers.map(([l, o]) => `<div class="lx-next"><span>${esc(l.name)}: ${esc(o.kind === 'agr' ? 'ההסכם נחתם' : 'ההצעה אושרה')}</span><button class="btn sm pri" data-a="lx-close" data-id="${esc(l.id)}">${icon('check', 14)} סגירה ללקוח</button></div>`).join('')}</div>` : ''}
      <div class="toolbar">${O.searchBox('slq', 'חיפוש לפי שם, טלפון, נושא', q)}${O.segs('f', [['open', 'פתוחים', all.filter(isOpen).length], ...(O.STAGES || []).map(([e, i]) => [e, i, cnt(e)]).filter(e => e[2] || e[0] === 'new'), ['all', 'הכל', all.length]], f)}</div>
      <div class="lx-filters"><select data-lxf="src" aria-label="סינון לפי מקור"><option value="">כל המקורות</option>${srcs.map(s => `<option value="${esc(s)}"${s === src ? ' selected' : ''}>${esc(O.srcLabel(s))}</option>`).join('')}</select>
        <select data-lxf="area" aria-label="סינון לפי תחום"><option value="">כל התחומים</option>${areas.map(s => `<option value="${esc(s)}"${s === ar ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>
        <select data-lxf="sort" aria-label="מיון">${SORTS.map(([k, t]) => `<option value="${k}"${k === sort ? ' selected' : ''}>מיון: ${t}</option>`).join('')}</select></div>
      <div class="card"><div class="lx-list"><div class="lx-rowh"><span>ליד</span><span>שלב</span><span>הצעד הבא ומתי</span><span>זמן המתנה</span><span></span></div>${list.slice(0, 300).map(row).join('') || (O.empty ? O.empty('אין לידים כאן', 'לידים מפייסבוק, מגוגל ומהאתר נכנסים לבד. אפשר גם להוסיף ידנית.') : '')}</div></div>`;
  }
  document.addEventListener('change', ev => {
    const s = ev.target.closest && ev.target.closest('[data-lxf]'); if (!s) return;
    O.setUi('leads', s.dataset.lxf, s.value);
  });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const r = ev.target.closest && ev.target.closest('.lx-row[data-a="sl-open"]'); if (!r || ev.target !== r) return;
    ev.preventDefault(); leadModal(r.dataset.id);
  });
  // the WhatsApp button in the list: one log line, so "זמן המתנה" knows we reached out
  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('[data-lxwa]'); if (!a) return;
    const l = O.get('leads', a.dataset.lxwa); if (!l) return;
    O.patch('leads', l.id, { log: (l.log || []).concat([{ at: nowIso(), kind: 'wa', text: `נפתחה הודעת וואטסאפ: ${O.leadWaLabel(l)}` }]).slice(-80) }).catch(() => {});
  });

  /* ---------- B10: the report ---------- */
  const spendOf = (months, m, s) => { const x = months[m] || {}; return s === 'facebook' ? +x.spend || 0 : +x[s] || 0; };
  // what a lead that became a client actually brought: its fee plans and deal fees (linked by leadId)
  O.leadRevenue = l => {
    const plans = O.all('plans').filter(p => p.leadId === l.id || (l.planId && p.id === l.planId));
    quotesOf(l).forEach(q => { if (q.planId && !plans.some(p => p.id === q.planId)) { const p = O.get('plans', q.planId); if (p) plans.push(p); } });
    const deals = O.all('deals').filter(d => d.leadId === l.id && !(O.CANCELLED || []).includes(d.status));
    const paidOf = i => i.status === 'paid' ? +i.amount || 0 : +i.paidAmount || 0;
    let total = 0, paid = 0;
    plans.forEach(p => { total += +p.total || (p.installments || []).reduce((s, i) => s + (+i.amount || 0), 0); paid += (p.installments || []).reduce((s, i) => s + paidOf(i), 0); });
    deals.forEach(d => { if (num(d.fee) && !plans.some(p => p.dealId === d.id)) { total += num(d.fee); if (d.feePaid) paid += num(d.fee); } });
    const real = plans.length + deals.length > 0;
    if (!real && stageOf(l) === 'won' && +l.fee > 0) total = +l.fee;
    return { total: r2(total), paid: r2(paid), real };
  };
  function reportView() {
    const all = O.all('leads'), months = (O.get('settings', 'adspend') || {}).months || {};
    const mo = x => String(x || '').slice(0, 7);
    let ms = [...new Set(all.map(e => mo(e.created)).filter(Boolean).concat(Object.keys(months)))].sort().reverse().slice(0, 12);
    if (!ms.includes(today().slice(0, 7))) ms.unshift(today().slice(0, 7));
    const reached = e => !['new', 'lost'].includes(stageOf(e)) || e.repliedAt || (e.calls || []).some(c => c.ok);
    const met = e => ['meeting_set', 'no_show', 'meeting_done', 'proposal_sent', 'won'].includes(stageOf(e));
    const prop = e => ['proposal_sent', 'won'].includes(stageOf(e));
    const won = e => stageOf(e) === 'won';
    const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
    const rows = ms.map(m => {
      const L = all.filter(e => mo(e.created) === m), W = L.filter(won), rev = W.reduce((s, e) => s + O.leadRevenue(e).total, 0);
      const fb = spendOf(months, m, 'facebook'), gg = spendOf(months, m, 'google'), sp = fb + gg;
      const paidL = L.filter(e => e.source === 'facebook' || e.source === 'google'), paidW = W.filter(e => e.source === 'facebook' || e.source === 'google');
      return `<tr><td class="nowrap"><b>${m.slice(5)}/${m.slice(2, 4)}</b></td><td class="num">${L.length}</td><td class="num">${L.filter(reached).length} <small class="muted">${pct(L.filter(reached).length, L.length)}</small></td><td class="num">${L.filter(met).length}</td><td class="num">${L.filter(prop).length}</td><td class="num"><b>${W.length}</b> <small class="muted">${pct(W.length, L.length)}</small></td><td class="num">${money(rev)}</td>
        <td><input class="in num" style="width:92px" data-lxad="${m}" data-src="facebook" value="${fb || ''}" placeholder="₪" aria-label="הוצאה בפייסבוק ${m}" data-nokeep="1" inputmode="decimal"></td><td><input class="in num" style="width:92px" data-lxad="${m}" data-src="google" value="${gg || ''}" placeholder="₪" aria-label="הוצאה בגוגל ${m}" data-nokeep="1" inputmode="decimal"></td>
        <td class="num">${sp && paidL.length ? money(Math.round(sp / paidL.length)) : '-'}</td><td class="num">${sp && paidW.length ? money(Math.round(sp / paidW.length)) : '-'}</td></tr>`;
    }).join('');
    // by source, all time (spend summed over the months typed in)
    const bySrc = {};
    all.forEach(e => { const s = e.source || 'other', b = bySrc[s] = bySrc[s] || { n: 0, reached: 0, won: 0, total: 0, paid: 0, est: false }; b.n++; if (reached(e)) b.reached++; if (won(e)) { b.won++; const r = O.leadRevenue(e); b.total += r.total; b.paid += r.paid; if (!r.real) b.est = true; } });
    PAID_SOURCES.forEach(([s]) => { bySrc[s] = bySrc[s] || { n: 0, reached: 0, won: 0, total: 0, paid: 0 }; });
    const spendAll = s => Object.keys(months).reduce((a, m) => a + spendOf(months, m, s), 0);
    const srcRows = Object.entries(bySrc).sort((a, b) => b[1].n - a[1].n).map(([s, b]) => {
      const sp = PAID_SOURCES.some(p => p[0] === s) ? spendAll(s) : 0;
      return `<tr><td><b>${esc(O.srcLabel(s))}</b></td><td class="num">${b.n}</td><td class="num">${b.won} <small class="muted">${pct(b.won, b.n)}</small></td><td class="num">${money(b.total)}${b.est ? ' <small class="muted">*</small>' : ''}</td><td class="num">${money(b.paid)}</td><td class="num">${sp ? money(sp) : '-'}</td><td class="num">${sp && b.n ? money(Math.round(sp / b.n)) : '-'}</td><td class="num">${sp && b.won ? money(Math.round(sp / b.won)) : '-'}</td><td class="num">${sp ? (b.total / sp).toFixed(1) + 'x' : '-'}</td></tr>`;
    }).join('');
    const lostR = (O.LOST_REASONS || []).map(r => [r, all.filter(e => stageOf(e) === 'lost' && e.lostReason === r).length]).filter(x => x[1]);
    const camp = {}; all.filter(e => e.campaign).forEach(e => { const c = camp[e.campaign] = camp[e.campaign] || { n: 0, w: 0 }; c.n++; if (won(e)) c.w++; });
    return `<div class="card"><div class="card-h"><h2>${icon('chart', 16)} לפי מקור: כמה עולה לקוח</h2><span class="sub">ההכנסה לפי שכר הטרחה בתיקים שנפתחו מהלידים</span></div><div class="tw"><table class="t lx-t"><thead><tr><th>מקור</th><th>לידים</th><th>לקוחות</th><th>שכ״ט בתיקים</th><th>שולם</th><th>הוצאה על פרסום</th><th>עלות לליד</th><th>עלות ללקוח</th><th>החזר</th></tr></thead><tbody>${srcRows}</tbody></table></div><p class="lx-hint" style="padding:0 16px 12px">* לקוח שנסגר לפני השינוי, בלי תיק מקושר: לפי הסכום שנרשם בליד.</p></div>
      <div class="card" style="margin-top:16px"><div class="card-h"><h2>${icon('chart', 16)} משפך לפי חודש</h2><span class="sub">ההוצאה על פרסום (פייסבוק וגוגל) נשמרת לבד כשמקלידים</span></div><div class="tw"><table class="t lx-t"><thead><tr><th>חודש</th><th>לידים</th><th>נוצר קשר</th><th>פגישות</th><th>הצעות</th><th>לקוחות</th><th>שכ״ט בתיקים</th><th>פייסבוק ₪</th><th>גוגל ₪</th><th>עלות לליד ממומן</th><th>עלות ללקוח ממומן</th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-h"><h2>קמפיינים</h2></div><div class="list">${Object.entries(camp).sort((a, b) => b[1].n - a[1].n).map(([c, x]) => `<div class="li"><div class="grow"><b>${esc(c)}</b><small>${x.n} לידים · ${x.w} לקוחות</small></div></div>`).join('') || (O.empty ? O.empty('אין עדיין', 'שם הקמפיין מגיע לבד עם כל ליד ממומן.') : '')}</div></div>
      <div class="card"><div class="card-h"><h2>למה לידים לא נסגרו</h2></div><div class="list">${lostR.map(([r, n]) => `<div class="li"><div class="grow"><b>${esc(r)}</b></div><span class="pill p-mute">${n}</span></div>`).join('') || (O.empty ? O.empty('אין עדיין', '') : '')}</div></div></div>`;
  }
  document.addEventListener('change', async ev => {
    const c = ev.target.closest && ev.target.closest('[data-lxad]'); if (!c) return;
    const cur = O.get('settings', 'adspend') || {}, m = c.dataset.lxad, s = c.dataset.src;
    const month = Object.assign({}, (cur.months || {})[m] || {});
    if (s === 'facebook') month.spend = num(c.value); else month[s] = num(c.value);
    await O.save('settings', 'adspend', Object.assign({}, cur, { months: Object.assign({}, cur.months || {}, { [m]: month }) }));
    O.toast('ההוצאה נשמרה');
  });

  /* ---------- the leads screen ---------- */
  const baseRender = O.V.leads.render;
  O.V.leads.render = function (root) {
    const tab = O.ui('leads', 'tab', 'pipe');
    if (tab !== 'pipe' && tab !== 'report') return baseRender.call(this, root);
    root.innerHTML = head() + tabs(tab) + (tab === 'report' ? reportView() : pipeView());
    if (O.bindSearch) O.bindSearch(root, 'slq', 'leads', 'q');
    // phones show tables as stacked cards: every cell gets its column name
    root.querySelectorAll('table.lx-t').forEach(t => { const th = [...t.querySelectorAll('thead th')].map(x => x.textContent.trim()); t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => td.setAttribute('data-th', th[i] || ''))); });
    if (O.R.id && O.get('leads', O.R.id) && O._slOpened !== O.R.id) { O._slOpened = O.R.id; setTimeout(() => leadModal(O.R.id), 30); }
  };

  /* ---------- B8: a lead meeting or callback in the calendar opens the lead ---------- */
  const evOpen0 = O.ACT['ev-open'];
  O.act('ev-open', (el, ds, e) => {
    if (ds && ds.type === 'lead') {
      const t = (el && (el.getAttribute('title') || (el.querySelector('.grow b') || el.querySelector('b') || el).textContent) || '').trim();
      const from = O.addDays(today(), -120), to = O.addDays(today(), 400);
      const ev = (O.events ? O.events(from, to) : []).find(x => x.type === 'lead' && x.leadId && x.title === t);
      if (ev) return O.go('leads', ev.leadId);
    }
    return evOpen0 ? evOpen0(el, ds, e) : undefined;
  });

  /* ---------- a link straight to a lead (from Telegram): ...#lead=<id> ---------- */
  try {
    const m = String(location.hash || '').match(/^#lead=([A-Za-z0-9_\-]+)/);
    if (m) { O.R.view = 'leads'; O.R.id = m[1]; O.UI.leads = Object.assign({}, O.UI.leads || {}, { tab: 'pipe' }); history.replaceState(null, '', '#leads'); }
  } catch (e) { /* normal start */ }

  /* ---------- a callback that is due while the app is open ---------- */
  const shownCb = new Set();
  setInterval(() => {
    try {
      if (document.querySelector('.lx-cbnote')) return;
      const now = Date.now();
      const l = O.all('leads').find(x => isOpen(x) && x.callbackAt && toMs(x.callbackAt) <= now && now - toMs(x.callbackAt) < 15 * 60e3 && !shownCb.has(x.id + x.callbackAt));
      if (!l) return;
      shownCb.add(l.id + l.callbackAt);
      const d = document.createElement('div'); d.className = 'lx-cbnote'; d.setAttribute('role', 'alert');
      d.innerHTML = `<b>${icon('bell', 16)} הגיע הזמן לחזור ל${esc(l.name)}</b><span class="small muted">${esc(l.topic || l.area || '')}${l.callbackNote ? ' · ' + esc(l.callbackNote) : ''}</span><div class="lx-acts">${l.phone ? `<a class="btn pri" href="tel:${esc(l.phone)}">${icon('phone', 15)} חיוג</a>` : ''}<button class="btn" data-x="open">פתיחת הליד</button><button class="btn ghost" data-x="close" style="grid-column:1/-1">סגירה</button></div>`;
      document.body.appendChild(d);
      d.querySelector('[data-x="open"]').onclick = () => { d.remove(); O.go('leads', l.id); };
      d.querySelector('[data-x="close"]').onclick = () => d.remove();
    } catch (e) { /* next minute */ }
  }, 30e3);
})(window.O);
