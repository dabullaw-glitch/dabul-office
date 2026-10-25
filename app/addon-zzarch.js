/* addon-zzarch.js (25.10.2026, Yakir asked): fee plans ("שכ״ט ותוכניות תשלום") can move to the archive and come back.
   Example: a client who did not sign the power of attorney and the fee agreement and is not moving forward.
   - "לארכיון" on every plan: asks for a short reason (kept), and offers to archive its file too. The plan stops counting as
     open or late money, its reminders stay off, and nothing is erased.
   - "ארכיון" at the bottom of the list shows archived plans, each with "החזרה" (back to work, the file too). */
(function (O) {
  if (!O || O.ZZARCH || !O.V || !O.V.payments) return;
  O.ZZARCH = '20261025a';
  const esc = v => (O.esc ? O.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (O.icon ? O.icon(n, z) : '');
  const now = () => new Date().toISOString();
  const rawPlan = id => { const d = (O.S.data.plans || {})[id]; return d ? Object.assign({ id }, d) : null; };
  const matterOf = (card, p) => p.matterId || ((card && card.querySelector('[data-v="matters"][data-id]')) || {}).dataset?.id || '';
  const dealOf = (card, p) => p.dealId || ((card && card.querySelector('[data-v="deal"][data-id]')) || {}).dataset?.id || '';

  function archiveSheet(id, card) {
    const p = rawPlan(id); if (!p) return;
    const mid = matterOf(card, p), m = mid && O.get('matters', mid);
    O.modal({
      title: 'העברה לארכיון', wide: true,
      body: `<p style="margin-top:0"><b>${esc(p.name || '')}</b>${p.area ? ' · ' + esc(p.area) : ''}</p>
        <div class="f"><label for="za_n">למה? (נשמר, כדי לדעת בעתיד)</label><input id="za_n" class="in" placeholder="למשל: לא חתם על ייפוי כוח והסכם שכר טרחה, לא מתקדם"></div>
        ${m ? `<label class="chk" style="margin-top:10px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="za_m" checked> גם התיק "${esc(m.title || m.kind || 'תיק')}" לארכיון</label>` : ''}
        <p class="small muted" style="margin-bottom:0">שום דבר לא נמחק. בארכיון רואים הכל, ואפשר להחזיר בלחיצה כשהלקוח חוזר. תזכורות התשלום נשארות כבויות.</p>`,
      foot: `<button class="btn pri" id="za_go">${icon('folder', 15)} העברה לארכיון</button><button class="btn" data-close>ביטול</button>`,
      onMount: (root, close) => {
        root.querySelector('#za_go').onclick = async () => {
          const note = root.querySelector('#za_n').value.trim(), withM = !!(root.querySelector('#za_m') || {}).checked;
          await O.patch('plans', id, { archived: true, archivedAt: now(), archiveNote: note, autoRemindBefore: p.autoRemind ?? null, autoRemind: false });
          if (m && withM) await O.patch('matters', mid, { archived: true, archivedAt: now(), archiveNote: note, archivedWithPlan: id });
          if (p.clientId && O.log) await O.log('client', p.clientId, `הועבר לארכיון: שכ״ט ${p.area || ''}${note ? ` (${note})` : ''}`.replace('  ', ' '), 'system');
          close(); O.toast('הועבר לארכיון. אפשר להחזיר מ"ארכיון" בתחתית הרשימה.'); O.emit && O.emit();
        };
      },
    });
  }
  async function restore(id) {
    const p = rawPlan(id); if (!p) return;
    await O.patch('plans', id, { archived: false, archiveHold: now(), restoredAt: now(), autoRemind: p.autoRemindBefore ?? p.autoRemind ?? false });
    const mid = p.matterId || Object.entries(O.S.data.matters || {}).find(([, v]) => v && v.archivedWithPlan === id)?.[0];
    if (mid) await O.patch('matters', mid, { archived: false, archiveHold: now() });
    if (p.clientId && O.log) await O.log('client', p.clientId, `הוחזר מהארכיון: שכ״ט ${p.area || ''}`, 'system');
    O.toast('הוחזר לעבודה'); O.emit && O.emit();
  }

  const render0 = O.V.payments.render;
  O.V.payments.render = function (el) {
    const r = render0.apply(this, arguments);
    try {
      const host = el || document.querySelector('main');
      const plansTab = !!host.querySelector('[data-a="pay-record"]');
      host.querySelectorAll('[data-a="pay-record"][data-id]').forEach(b => {
        const id = b.dataset.id, p = rawPlan(id); if (!p) return;
        const row = b.parentElement; if (!row || row.querySelector('[data-za]')) return;
        const card = b.closest('.card');
        if (p.archived) {
          row.insertAdjacentHTML('afterbegin', `<span class="pill p-mute">בארכיון${p.archiveNote ? ': ' + esc(p.archiveNote) : ''}</span><button class="btn xs pri" data-za="back">${icon('refresh', 12)} החזרה מהארכיון</button>`);
          row.querySelector('[data-za="back"]').onclick = ev => { ev.stopPropagation(); restore(id); };
        } else {
          row.insertAdjacentHTML('beforeend', `<button class="btn xs ghost" data-za="arch" title="העברה לארכיון">${icon('folder', 12)} לארכיון</button>`);
          row.querySelector('[data-za="arch"]').onclick = ev => { ev.stopPropagation(); archiveSheet(id, card); };
        }
      });
      if (plansTab && !host.querySelector('.za-foot')) {
        const open = !!O._archOpen;
        host.insertAdjacentHTML('beforeend', `<div class="za-foot" style="text-align:center;margin:16px 0"><button class="btn sm ghost" data-za="toggle">${icon('folder', 14)} ${open ? 'הסתרת הארכיון' : 'ארכיון (תוכניות שהועברו לארכיון)'}</button></div>`);
        host.querySelector('[data-za="toggle"]').onclick = async () => { if (open) { O._archOpen = false; O.emit && O.emit(); } else if (O.archiveLoad) await O.archiveLoad(); };
      }
    } catch (e) { console.error('zzarch', e); }
    return r;
  };
})(window.O);
