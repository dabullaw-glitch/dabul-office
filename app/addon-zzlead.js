/* addon-zzlead.js (25.10.2026, Yakir approved the sketch and asked for these, loads after addon-zleads.js):
   Lead window:
   - "שם מלא" row, and "יש וואטסאפ" / "אין וואטסאפ" next to the phone (lead.wa / lead.noWhatsapp, checked by the server).
   - "מה הליד כתב": the exact text the lead sent in the form (lead.formText, lead.formFields) and every WhatsApp message the
     lead wrote back (lead.waIn, filled by the "wawatch" function). Separate from Yakir's own notes.
   - "מה קורה עם ההודעות": one clear box (no WhatsApp / sent and arrived / will go out by itself at ... and why / failed),
     and every scheduled message with its state in words.
   - The notes get a "שמירה" button (they also keep saving by themselves).
   - Moving a lead to "לא רלוונטי" asks for the reason AND a short explanation (required), so the leads can be studied later.
     A lost lead without an explanation shows "הוספת הסבר".
   "בקשות לקוח" (drafts): a delete button on each draft. Delete moves the draft to status "deleted" (hidden everywhere, kept in the
   database, nothing is erased). */
(function (O) {
  if (!O || O.ZZLEAD) return;
  O.ZZLEAD = '20261031a';
  const esc = v => (O.esc ? O.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (O.icon ? O.icon(n, z) : '');
  const toMs = x => { if (!x) return NaN; const s = String(x); return /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? Date.parse(s) : (O.localToMs ? O.localToMs(s) : Date.parse(s)); };
  const when = ms => (ms > 0 ? (O.ilTime ? O.ilTime(ms) : new Date(ms).toLocaleString('he-IL')) : '');
  const nowIso = () => new Date().toISOString();
  const LABEL = k => ((O.SALES_TPL || {})[k] || [k])[0];

  const st = document.createElement('style');
  st.textContent = `.zz-said{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--panel);min-width:0;max-width:100%;overflow:hidden}
.zz-said,.zz-said *{overflow-wrap:anywhere;word-break:break-word}.zz-q a{color:inherit;text-decoration:underline}
.zz-said h4{margin:0 0 6px;font-size:14.5px;display:flex;gap:6px;align-items:center}
.zz-q{white-space:pre-wrap;font-size:15px;line-height:1.6;margin:0;padding:8px 10px;border-radius:10px;background:var(--panel2)}
.zz-q+.zz-q{margin-top:6px}.zz-q small{display:block;color:var(--muted);font-size:12px;margin-bottom:2px}
.zz-ff{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:12.5px;color:var(--muted)}
.zz-st{border-radius:12px;padding:10px 12px;margin:6px 0 10px;font-size:13.5px;line-height:1.55;border:1px solid}
.zz-st b{display:block;font-size:14.5px;margin-bottom:2px}
.zz-bad{background:rgba(214,64,52,.10);border-color:rgba(214,64,52,.35)}.zz-ok{background:rgba(30,140,80,.10);border-color:rgba(30,140,80,.35)}
.zz-info{background:rgba(47,95,176,.10);border-color:rgba(47,95,176,.32)}.zz-warn{background:rgba(201,140,20,.12);border-color:rgba(201,140,20,.38)}
.zz-msg{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}
.zz-msg:last-child{border-bottom:0}.zz-msg .pill{font-size:12px;white-space:normal;text-align:center}
.zz-save{display:flex;justify-content:flex-start;margin-top:6px}
.zz-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}.zz-chip{border:1px solid var(--line);border-radius:20px;padding:6px 12px;background:var(--panel);cursor:pointer;font:inherit;color:inherit}
.zz-chip.on{background:var(--acc,#2f8f83);color:#fff;border-color:transparent}
.zz-del{margin-inline-start:8px}`;
  document.head.appendChild(st);

  // the reasons a lead is closed as not relevant (the report counts them)
  const MORE = ['רק רצה מידע כללי', 'ספאם או פרטים לא אמיתיים'];
  const base = (O.LOST_REASONS || ['לא ענה', 'לא רלוונטי לתחום', 'בחר משרד אחר', 'מחיר', 'לא מוכן להתחיל', 'אחר']).filter(r => r !== 'אחר');
  O.LOST_REASONS = base.concat(MORE.filter(r => !base.includes(r)), ['אחר']);

  // ---------- working hours of the automatic lead messages (the server sends at :07 every hour inside them) ----------
  const ilParts = ms => { const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)); const o = {}; f.forEach(p => { o[p.type] = p.value; }); return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), h: +o.hour % 24 }; };
  const inHours = ms => { const p = ilParts(ms); return (p.dow <= 4 && p.h >= 8 && p.h < 21) || (p.dow === 5 && p.h >= 8 && p.h < 14); };
  const nextOut = ms => { const w = O.nextWindow ? O.nextWindow(ms) : ms; return w + 7 * 60e3; };

  // ---------- message states in plain words ----------
  function msgState(n, d, plan, g, now) {
    const e = O.get('outbox', d.key);
    if (e) {
      if (e.status === 'sent') {
        const at = Date.parse(e.at) || 0;
        if (e.deliv === 'noAccount') return { cls: 'p-bad', t: 'לא הגיעה: אין וואטסאפ', bad: 1, at };
        if (e.deliv === 'failed' || e.deliv === 'notInGroup') return { cls: 'p-bad', t: 'לא הגיעה: השליחה נכשלה', bad: 1, at };
        if (e.deliv === 'read') return { cls: 'p-ok', t: `נשלחה ${when(at)} · נקראה`, ok: 1, at };
        if (e.deliv === 'delivered') return { cls: 'p-ok', t: `נשלחה ${when(at)} · הגיעה אליו`, ok: 1, at };
        if (/telegram/.test(e.via || '')) return { cls: 'p-ok', t: `סומנה כנשלחה ${when(at)}`, ok: 1, at };
        return { cls: 'p-ok', t: `נשלחה ${when(at)}`, ok: 1, at };
      }
      if (e.status === 'dismissed') return e.via === 'no-whatsapp' ? { cls: 'p-bad', t: 'לא נשלחה: אין וואטסאפ', bad: 1 } : { cls: 'p-mute', t: 'בוטלה' };
      return { cls: 'p-warn', t: 'מחכה לאישור שלך בטלגרם', wait: 1 };
    }
    if (n.noWhatsapp) return { cls: 'p-bad', t: 'לא תישלח: אין וואטסאפ', bad: 1 };
    if (d.at <= now) {
      if (plan.slice(g + 1).some(y => y.at <= now)) return { cls: 'p-mute', t: 'דולגה (יצאה הודעה מאוחרת יותר)' };
      return inHours(now) ? { cls: 'p-info', t: 'תצא לבד בשעה הקרובה', due: 1, at: nextOut(now) } : { cls: 'p-info', t: `תצא לבד ${when(nextOut(now))}`, due: 1, at: nextOut(now), off: 1 };
    }
    return { cls: 'p-info', t: `תצא לבד ${when(d.at)}`, at: d.at, later: 1 };
  }
  function statusBox(n, rows) {
    if (n.noWhatsapp || n.wa === false) return `<div class="zz-st zz-bad"><b>⚠️ למספר הזה אין וואטסאפ</b>בדקנו מול וואטסאפ${n.waCheckedAt ? ' ב־' + esc(when(Date.parse(n.waCheckedAt))) : ''}. הודעות לא נשלחות אליו. צריך להתקשר.</div>`;
    const bad = rows.find(r => r.s.bad);
    if (bad) return `<div class="zz-st zz-bad"><b>⚠️ ${esc(bad.label)} לא הגיעה אליו</b>${esc(bad.s.t)}. צריך להתקשר.</div>`;
    const sent = rows.filter(r => r.s.ok).sort((a, b) => (b.s.at || 0) - (a.s.at || 0))[0];
    const next = rows.find(r => r.s.due) || rows.find(r => r.s.later);
    const wait = rows.find(r => r.s.wait);
    let h = '';
    if (sent) h += `<div class="zz-st zz-ok"><b>✅ ${esc(sent.label)}: ${esc(sent.s.t)}</b>${n.repliedAt ? 'הליד השיב, הודעות המעקב נעצרו.' : 'הודעות נשלחות לבד בשעות הפעילות, רק למספר שיש לו וואטסאפ.'}</div>`;
    if (wait) h += `<div class="zz-st zz-warn"><b>🟡 ${esc(wait.label)} מחכה לאישור שלך</b>ההודעה נשלחה אליך לטלגרם עם כפתור שליחה.</div>`;
    if (next) h += `<div class="zz-st zz-info"><b>🕗 ${esc(next.label)} ${esc(next.s.t)}</b>${next.s.off ? 'עכשיו מחוץ לשעות הפעילות (א׳ עד ה׳ 08:00 עד 21:00, ו׳ עד 14:00). המערכת לא שולחת בלילה ובשבת.' : next.s.due ? 'המערכת שולחת הודעות ללידים פעם בשעה.' : 'ההודעה תצא רק אם הליד עוד לא השיב ולא עבר שלב.'}</div>`;
    return h;
  }

  // ---------- the "לא רלוונטי" sheet: reason + explanation ----------
  function lostSheet(id, onlyEdit) {
    const l = O.get('leads', id); if (!l) return;
    const reasons = O.LOST_REASONS;
    O.modal({
      title: onlyEdit ? 'למה הליד לא רלוונטי' : 'העברה ל"לא רלוונטי"', wide: true,
      body: `<div class="lx-m"><label class="small"><b>הסיבה</b></label><div class="zz-chips" id="zz_rs">${reasons.map(r => `<button type="button" class="zz-chip${r === l.lostReason ? ' on' : ''}" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <div class="lx-f"><label for="zz_ln"><b>מה בדיוק קרה?</b> (חובה, כמה מילים)</label><textarea id="zz_ln" rows="3" placeholder="למשל: רצה לקנות גג בבניין, הסברתי בקצרה. לא מתאים לנו כרגע.">${esc(l.lostNote || '')}</textarea></div>
        <p class="lx-hint">זה נשמר על הליד ונכנס לדוח הלידים, כדי שנוכל ללמוד אילו לידים לא מתאימים ומאיפה הם מגיעים.</p><p class="lx-err" id="zz_e" hidden></p></div>`,
      foot: `<button class="btn pri" id="zz_go">${icon('check', 15)} שמירה</button><button class="btn" data-close>ביטול</button>`,
      onMount: (root, close) => {
        let pick = l.lostReason || '';
        root.querySelectorAll('.zz-chip').forEach(b => { b.onclick = () => { pick = b.dataset.r; root.querySelectorAll('.zz-chip').forEach(x => x.classList.toggle('on', x === b)); }; });
        root.querySelector('#zz_go').onclick = async () => {
          const note = root.querySelector('#zz_ln').value.trim(), er = root.querySelector('#zz_e');
          if (!pick) { er.hidden = false; er.textContent = 'בוחרים סיבה'; return; }
          if (note.length < 3) { er.hidden = false; er.textContent = 'כותבים בכמה מילים מה קרה'; return; }
          const f = { lostReason: pick, lostNote: note, lostAt: (O.get('leads', id) || l).lostAt || nowIso() };
          if (onlyEdit) await O.patch('leads', id, f); else await O.setStage(id, 'lost', f);
          await O.leadLog(id, 'stage', `לא רלוונטי · ${pick}: ${note}`);
          close(); O.toast(onlyEdit ? 'ההסבר נשמר' : 'הליד נסגר. ההודעות המתוזמנות בוטלו.'); O.ACT['sl-open'](null, { id });
        };
      },
    });
  }

  // ---------- the lead window ----------
  function enhance(id) {
    const n = O.get('leads', id); if (!n) return;
    const box = [...document.querySelectorAll(`[data-lxlead="${CSS.escape(id)}"]`)].pop(); if (!box || box.dataset.zz) return;
    box.dataset.zz = '1';
    const ov = box.closest('.ov');
    const noWa = !!(n.noWhatsapp || n.wa === false);
    // 1. full name + WhatsApp badge
    const kv = box.querySelector('.lx-kv');
    if (kv) {
      kv.insertAdjacentHTML('afterbegin', `<div class="kv-row"><span>שם מלא</span><b>${esc(n.name || '-')}</b></div>`);
      const ph = [...kv.querySelectorAll('.kv-row')].find(r => (r.querySelector('span') || {}).textContent === 'טלפון');
      if (ph && n.phone) ph.querySelector('b').insertAdjacentHTML('beforeend', noWa ? ' <span class="pill p-bad" style="font-size:11.5px">אין וואטסאפ</span>' : n.wa === true ? ' <span class="pill p-ok" style="font-size:11.5px">יש וואטסאפ</span>' : '');
      const why = [...kv.querySelectorAll('.kv-row')].find(r => (r.querySelector('span') || {}).textContent === 'סיבה');
      const isLost = (O.stageOf ? O.stageOf(n) : n.stage) === 'lost';
      const noteRow = n.lostNote ? `<div class="kv-row"><span>הסבר</span><b>${esc(n.lostNote)} <button class="btn xs ghost" data-zz="lostedit" aria-label="עריכת ההסבר">${icon('edit', 12)}</button></b></div>`
        : isLost ? `<div class="kv-row"><span>הסבר</span><button class="btn xs" data-zz="lostedit">${icon('edit', 12)} הוספת הסבר</button></div>` : '';
      if (noteRow) { if (why) why.insertAdjacentHTML('afterend', noteRow); else kv.insertAdjacentHTML('beforeend', noteRow); }
    }
    if (noWa) {
      const wa = box.querySelector('[data-lx="wa"]'); if (wa) wa.remove();
      const hint = [...box.querySelectorAll('.lx-hint')].find(p => /בוואטסאפ ייפתח/.test(p.textContent)); if (hint) hint.textContent = 'למספר הזה אין וואטסאפ. אפשר רק להתקשר.';
    }
    // 2. what the lead wrote
    const said = [];
    const ft = String(n.formText || '').trim();
    // 31.10.2026: a long address (a Gmail link pasted in the form) broke the window on the phone; addresses show as a short link
    const linkify = t => String(t).split(/(https?:\/\/\S+)/g).map((x, i) => i % 2 === 0 ? esc(x)
      : /mail\.google\.com/i.test(x) ? `<a href="${esc(x)}" target="_blank" rel="noopener">קישור לתיבת הג׳ימייל של הליד</a> <small style="display:inline;color:var(--muted)">(נפתח רק אצלו, כדאי לבקש שישלח את הקובץ)</small>`
      : `<a href="${esc(x)}" target="_blank" rel="noopener">קישור (${esc((x.match(/^https?:\/\/([^/?#]+)/) || [])[1] || 'אתר')})</a>`).join('');
    if (ft) said.push(`<p class="zz-q"><small>בטופס באתר${n.created ? ' · ' + esc(when(toMs(n.created))) : ''}</small>${linkify(ft)}</p>`);
    (n.waIn || []).slice(-10).forEach(m => said.push(`<p class="zz-q"><small>בוואטסאפ · ${esc(when(Date.parse(m.at)))}</small>${esc(m.text)}</p>`));
    // technical fields the website form sends along (form ids, view ids, JSON blobs, consent) are not shown
    const ff = (n.formFields || []).filter(([k, v]) => v && !/name|שם|phone|tel|טלפון|נייד|mail|מייל|message|notes|הודעה|הערות|msg|pirut|פירוט|תוכן|source|redirect|form_type|viewid|query_string|crm|uco|fixdigital|origin|referrer|getparams|privacy|consent|hidden|nonce|token|utm_|gclid|fbclid|page|url/i.test(k)
      && !/^\s*[\[{]/.test(String(v)) && String(v).length < 200 && String(v) !== ft).slice(0, 8);
    if (said.length || ff.length) {
      const left = box.querySelector('.lx-notes');
      const html = `<div class="zz-said"><h4>${icon('chat', 15)} מה הליד כתב</h4>${said.join('') || '<p class="small muted" style="margin:0">לא כתב הודעה.</p>'}${ff.length ? `<div class="zz-ff">${ff.map(([k, v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join('')}</div>` : ''}</div>`;
      if (left) left.insertAdjacentHTML('beforebegin', html);
    }
    // 3. notes: a save button (the notes also keep saving by themselves)
    const ta = box.querySelector('#lx_notes'), ns = box.querySelector('#lx_ns');
    if (ta) {
      ta.insertAdjacentHTML('afterend', `<div class="zz-save"><button type="button" class="btn sm pri" data-zz="savenotes">${icon('check', 14)} שמירת ההערות</button></div>`);
      box.querySelector('[data-zz="savenotes"]').onclick = () => { ta.dispatchEvent(new Event('blur')); setTimeout(() => { if (ns && !/נשמר|שומר/.test(ns.textContent)) ns.textContent = 'נשמר ✓'; O.toast('ההערות נשמרו'); }, 500); };
    }
    // 4. the messages: one clear status box + each message with its state
    const plan = O.salesManaged && O.salesManaged(n) && O.salesPlan ? O.salesPlan(n) : [], now = Date.now();
    const rows = plan.map((d, g) => ({ d, label: LABEL(d.tpl), s: msgState(n, d, plan, g, now) }));
    const mbox = [...box.querySelectorAll('.lx-box')].find(b => (b.querySelector('h4') || {}).textContent === 'הודעות מתוזמנות');
    const sbox = statusBox(n, rows);
    if (mbox) {
      mbox.innerHTML = `<h4>מה קורה עם ההודעות</h4>${sbox}<div class="list">${rows.map(r => `<div class="zz-msg"><b class="small">${esc(r.label)}</b><span style="display:flex;gap:6px;align-items:center"><span class="pill ${r.s.cls}">${esc(r.s.t)}</span>${!O.get('outbox', r.d.key) && r.d.at > now && !noWa ? `<button class="btn xs ghost" data-zzcancel="${esc(r.d.key)}" aria-label="ביטול ההודעה">${icon('x', 12)}</button>` : ''}</span></div>`).join('')}</div>`;
      mbox.querySelectorAll('[data-zzcancel]').forEach(b => {
        b.onclick = async () => {
          await O.save('outbox', b.dataset.zzcancel.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_'), { status: 'dismissed', at: nowIso(), key: b.dataset.zzcancel, name: n.name });
          O.toast('ההודעה בוטלה'); reopen();
        };
      });
    } else if (sbox && noWa) {
      const right = box.querySelector('.lx-kv'); if (right) right.insertAdjacentHTML('afterend', `<div class="lx-box"><h4>מה קורה עם ההודעות</h4>${sbox}</div>`);
    }
    // 5. "לא רלוונטי" asks for reason + explanation
    const stBtn = box.querySelector('[data-lx="stage"]'), sel = box.querySelector('#lx_st');
    if (stBtn && sel) {
      const orig = stBtn.onclick;
      stBtn.onclick = ev => { if (sel.value === 'lost' && (O.stageOf ? O.stageOf(n) : n.stage) !== 'lost') { closeIt(); lostSheet(id, false); } else if (orig) orig.call(stBtn, ev); };
    }
    const le = box.querySelector('[data-zz="lostedit"]'); if (le) le.onclick = () => { closeIt(); lostSheet(id, true); };
    function closeIt() { const c = ov && ov.querySelector('.modal-h [data-close]'); if (c) c.click(); else if (ov) ov.remove(); }
    function reopen() { closeIt(); O.ACT['sl-open'](null, { id }); }
  }
  const wrap = name => { const orig = O.ACT[name]; if (!orig) return; O.act(name, (el, ds, ev) => { orig(el, ds, ev); setTimeout(() => { try { enhance(ds.id); } catch (e) { console.error('zzlead', e); } }, 0); }); };
  wrap('sl-open'); wrap('lead-open');

  // ---------- "בקשות לקוח": delete (moves the draft to "deleted", hidden; nothing is erased) ----------
  const V = O.V && O.V.drafts;
  if (V && !V.zz) {
    V.zz = 1;
    const render = V.render;
    const delDraft = async (id, after) => {
      const d = O.get('drafts', id); if (!d) return;
      if (!(await O.confirm(`למחוק את "${d.title || 'הטיוטה'}"?\nהיא תיעלם מהרשימה.`, 'מחיקה', true))) return;
      await O.patch('drafts', id, { status: 'deleted', deletedAt: nowIso(), statusBefore: d.status || 'draft' });
      O.toast('הטיוטה נמחקה'); if (after) after();
    };
    V.render = function (el) {
      const all = O.S.data.drafts || {}, vis = {};
      Object.keys(all).forEach(k => { if ((all[k] || {}).status !== 'deleted') vis[k] = all[k]; });
      const id = O.R && O.R.id, open = id && all[id];
      O.S.data.drafts = open ? all : vis;
      try { render.call(this, el); } finally { O.S.data.drafts = all; }
      if (open) {
        const acts = el.querySelector('.ent-acts');
        if (acts && !acts.querySelector('[data-zzdel]')) {
          acts.insertAdjacentHTML('beforeend', `<button class="btn ghost danger zz-del" data-zzdel="1">${icon('trash', 15)} מחיקה</button>`);
          acts.querySelector('[data-zzdel]').onclick = () => delDraft(id, () => O.go('drafts'));
        }
      } else {
        el.querySelectorAll('.card.click[data-v="drafts"][data-id]').forEach(c => {
          const h = c.querySelector('.card-h'); if (!h || h.querySelector('[data-zzdel]')) return;
          h.insertAdjacentHTML('beforeend', `<button class="btn xs ghost danger zz-del" data-zzdel="${esc(c.dataset.id)}" aria-label="מחיקת הטיוטה" title="מחיקה">${icon('trash', 14)}</button>`);
          h.querySelector('[data-zzdel]').addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); delDraft(c.dataset.id); }, true);
        });
      }
    };
  }
})(window.O);
