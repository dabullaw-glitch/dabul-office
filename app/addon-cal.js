/* addon-cal.js: "יומן תוכן" in the office system, added 9.10.2026 after Yakir approved the mockup.
   One calendar for everything that goes out and every development deadline:
   - publishing items (docs "pub", shared with Grok Bot and the system),
   - scripts waiting to be filmed (docs "prompt", by their target date),
   - development milestones (docs "roadmap": course, videos, channels, site, launch, finances).
   Views: month, week, list, and "פיתוחים ומועדים" (projects with progress + what waits for Yakir).
   It replaces the old list in שיווק > לוח פרסום; the old list and the Instagram connection stay
   available at the bottom, so nothing that worked before is lost. */
(function (s) {
  if (!s || s.CAL) return; s.CAL = '20261009b';
  const n = s.esc;
  // s.bump only clears the app's memo cache; s.render actually redraws the screen
  const bump = () => { try { if (s.bump) s.bump(); } catch { /* cache only */ } if (s.render) s.render(); };
  ['pub', 'prompt', 'roadmap', 'settings'].forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  function sub(c) {
    s.S.db.collection(c).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[c] = r; s.S.loaded[c] = true; bump(); }, () => { s.S.loaded[c] = true; });
  }
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); return; }
    sub('roadmap');
    if (!s.PUB) sub('pub');      // addon-pub already listens to "pub"
    if (!s.VIDEO) sub('prompt'); // addon-video already listens to "prompt"
  })(0);

  const st = document.createElement('style');
  st.textContent = `.cl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px}
.cl-stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:9px 12px}.cl-stat b{display:block;font-size:21px;font-variant-numeric:tabular-nums;color:var(--ink)}.cl-stat span{font-size:12.5px;color:var(--muted)}.cl-stat.w{background:var(--warn-soft);border-color:transparent}
.cl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}
.cl-segs{display:inline-flex;flex-wrap:wrap;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:3px}
.cl-segs button{border:0;background:none;font:inherit;font-size:14px;padding:5px 13px;border-radius:999px;cursor:pointer;color:var(--ink2)}.cl-segs button.on{background:var(--accent);color:var(--accent-ink);font-weight:700}
.cl-nav{display:flex;gap:6px;align-items:center;font-weight:700}.cl-nav button{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;min-width:32px;height:32px;cursor:pointer;font:inherit}
.cl-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.cl-chip{border:1px solid var(--line);background:var(--panel);color:var(--ink2);border-radius:999px;padding:3px 11px;font:inherit;font-size:13px;cursor:pointer;display:inline-flex;gap:6px;align-items:center}.cl-chip.on{border-color:var(--accent);background:var(--accent-soft);font-weight:700;color:var(--ink)}
.cl-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.cl-lay{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:12px;align-items:start}@media(max-width:1180px){.cl-lay{grid-template-columns:minmax(0,1fr)}}
.cl-m{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--line)}
.cl-m .hd{background:var(--panel);text-align:center;font-size:12px;color:var(--muted);padding:6px 0;font-weight:700}
.cl-c{background:var(--panel);min-height:98px;padding:4px;display:flex;flex-direction:column;gap:3px;min-width:0}.cl-c.out{background:var(--panel2);opacity:.6}.cl-c.today{background:var(--warn-soft)}
.cl-c .dn{font-size:12px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}.cl-c.today .dn{color:var(--warn)}
.cl-ev{display:flex;gap:4px;align-items:center;font-size:12px;line-height:1.3;padding:2px 5px;border-radius:6px;background:var(--panel2);cursor:pointer;min-width:0;border:0;border-inline-start:3px solid var(--c,#999);color:var(--ink2);font-family:inherit;text-align:start}
.cl-ev .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.cl-ev.skip{opacity:.45;text-decoration:line-through}
.cl-ev.film{background:transparent;border:1px dashed var(--c);border-inline-start:3px solid var(--c)}.cl-ev.ms{background:transparent;border:1px solid var(--c);border-inline-start:3px solid var(--c)}.cl-ev.ms.done{opacity:.6}
.cl-ev.sel,.cl-it.sel{outline:2px solid var(--accent)}
.cl-more{font-size:11.5px;color:var(--muted);padding-inline-start:4px}
@media(max-width:640px){.cl-c{min-height:60px}.cl-ev .t{display:none}.cl-ev{justify-content:center;padding:2px 3px}}
.cl-wk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}@media(max-width:1180px){.cl-wk{grid-template-columns:minmax(0,1fr)}}
.cl-wd{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px;min-width:0}
@media(min-width:1181px){.cl-wd{padding:6px}.cl-wd .cl-it{flex-direction:column;gap:2px;padding:6px;font-size:12.5px}.cl-wd .cl-it .ti{font-size:12.5px}.cl-wd .cl-it .tx,.cl-wd .cl-it .cl-p{display:none!important}.cl-wd .cl-it .ch i{font-size:0;gap:0}}.cl-wd.today{background:var(--warn-soft)}.cl-wd h4{margin:0 0 6px;font-size:13.5px}
.cl-it{display:flex;gap:8px;padding:8px;border-radius:10px;border:1px solid var(--line2);border-inline-start:4px solid var(--c,#999);margin-bottom:6px;cursor:pointer;background:var(--panel);width:100%;font:inherit;text-align:start;color:var(--ink)}
.cl-it.skip{opacity:.5}.cl-it.film{border-style:dashed;border-inline-start-style:solid}
.cl-it .tm{font-weight:700;font-variant-numeric:tabular-nums;min-width:40px;font-size:13px}.cl-it .g{min-width:0;flex:1}.cl-it .ti{font-weight:700;font-size:13.5px}
.cl-it .ch{font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:2px;align-items:center}.cl-it .ch i{font-style:normal;display:inline-flex;gap:4px;align-items:center}
.cl-it .tx{font-size:12.5px;color:var(--muted);white-space:pre-wrap;max-height:3.9em;overflow:hidden;margin-top:4px}
.cl-day{margin:14px 0 6px;font-weight:800;font-size:14px;color:var(--muted)}
.cl-p{display:inline-block;font-size:11.5px;border-radius:999px;padding:0 8px;line-height:19px;font-weight:700;background:var(--line2);color:var(--muted)}
.cl-p.o-grok{background:var(--info-soft);color:var(--info)}.cl-p.o-system{background:var(--accent-soft);color:var(--accent)}.cl-p.o-yakir{background:var(--warn-soft);color:var(--warn)}.cl-p.o-claude{background:var(--teal-soft);color:var(--teal)}
.cl-p.s-done,.cl-p.s-published{background:var(--ok-soft);color:var(--ok)}.cl-p.s-prop{background:var(--info-soft);color:var(--info)}.cl-p.s-wait,.cl-p.s-notext,.cl-p.s-missed{background:var(--warn-soft);color:var(--warn)}
.cl-det{position:sticky;top:12px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
.cl-det h3{margin:6px 0 8px;font-size:17px;text-wrap:balance}
.cl-det dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:13.5px;margin:0 0 10px}.cl-det dt{color:var(--muted)}.cl-det dd{margin:0}
.cl-det .full{white-space:pre-wrap;font-size:14px;background:var(--panel2);border-radius:10px;padding:10px;max-height:320px;overflow:auto}
.cl-det img{width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--line)}
.cl-det .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cl-note{font-size:13px;background:var(--warn-soft);color:var(--warn);border-radius:10px;padding:8px 10px;margin-top:8px}
.cl-empty{color:var(--muted);text-align:center;padding:26px 10px;font-size:14px}
.cl-leg{font-size:12.5px;color:var(--muted);margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 14px}
.cl-projs{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:10px}
.cl-proj{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;border-top:4px solid var(--c)}.cl-proj h4{margin:0 0 4px;font-size:15.5px}
.cl-prog{height:7px;border-radius:99px;background:var(--line2);overflow:hidden;margin:4px 0 10px}.cl-prog i{display:block;height:100%;background:var(--c)}
.cl-msr{display:flex;gap:8px;align-items:flex-start;padding:7px 4px;border:0;border-top:1px solid var(--line2);cursor:pointer;font:inherit;font-size:13.5px;background:none;width:100%;text-align:start;color:var(--ink)}
.cl-msr .dt{min-width:44px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted);font-size:12.5px;padding-top:1px}
.cl-msr.done .tt{text-decoration:line-through;color:var(--muted)}.cl-msr.sel{background:var(--accent-soft);border-radius:8px}
.cl-wait{background:var(--warn-soft);border-radius:14px;padding:12px 14px;margin-bottom:12px}.cl-wait h4{margin:0 0 6px;color:var(--warn);font-size:15px}
.cl-wait button{display:block;border:0;background:none;font:inherit;font-size:14px;color:var(--ink);cursor:pointer;text-align:start;padding:3px 0}
.cl-it .ml{display:block;font-size:12.5px;color:var(--ink2);margin-top:3px;line-height:1.5}
.cl-key{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:var(--muted);background:var(--panel2);border:1px solid var(--line2);border-radius:10px;padding:8px 10px;margin-bottom:10px;align-items:center}.cl-key span{display:inline-flex;gap:5px;align-items:center}
.cl-c .dn{border:0;background:none;padding:0 2px;cursor:pointer;text-align:start;font:inherit;font-size:12px;font-weight:700;color:var(--muted)}.cl-c.pick{outline:2px solid var(--accent);outline-offset:-2px}
.cl-dlist{margin-top:10px}
.cl-old{margin-top:18px}.cl-old>summary{cursor:pointer;color:var(--muted);font-size:13.5px;padding:6px 0}`;
  document.head.appendChild(st);

  const CH = { instagram: ['אינסטגרם', '#c13584'], tiktok: ['טיקטוק', '#25262b'], youtube: ['יוטיוב', '#e62117'], facebook: ['פייסבוק', '#1877f2'], linkedin: ['לינקדאין', '#0a66c2'], x: ['X', '#666'], gbp: ['גוגל עסקי', '#1e8e3e'], whatsapp: ['וואטסאפ', '#25a85a'], newsletter: ['ניוזלטר', '#a86a06'], internal: ['פנימי', '#999'], film: ['לצילום', '#8b6f47'], dev: ['פיתוחים ומועדים', '#6b4fa0'] };
  const PROJ = { course: ['קורס "קונים דירה ראשונה"', '#6b4fa0'], clients: ['להביא לקוחות', '#c13b2e'], video: ['סרטונים ותוכן', '#c13584'], chan: ['ערוצי פרסום (מעבר מגרוק)', '#0a66c2'], site: ['אתר וקידום בגוגל', '#1e8e3e'], launch: ['השקה ושיווק', '#b7791f'], money: ['כספים', '#62797a'] };
  const OWN = { grok: 'גרוק בוט', system: 'המערכת', yakir: 'יקיר', claude: 'Claude' };
  const PST = { planned: 'מתוכנן', published: 'פורסם ✓', skipped: 'בוטל', waiting: 'מחכה לחיבור', missed: 'לא פורסם', unverified: 'עבר, אין דרך לבדוק' };
  const MST = { done: 'בוצע ✓', open: 'מתוכנן', prop: 'מועד מוצע, מחכה לאישורך', wait: 'מחכה לך', ext: 'תלוי בגורם חיצוני', hold: 'בהמתנה' };
  const KIND = { 'own-video': 'סרטון שאלה ליוטיוב', weekly: 'פוסט מקצועי שבועי', group: 'הודעה לקבוצה', community: 'טיוטה לקהילה', video: 'סרטון', image: 'פוסט עם תמונה', article: 'מאמר מהאתר', film: 'תסריט לצילום', ms: 'פיתוח' };
  const TYPE = { story: 'סיפור מהשטח', dont: 'אל תעשו', value: 'הסבר עם ערך', myth: 'מיתוס מול עובדה', curious: 'מעניין', qa: 'שאלה מהקהל' };
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const MON = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const MEDIA = 'https://dabullaw-glitch.github.io/dabul-office/media/';
  const PROMPTER = ((window.OFFICE_CONFIG || {}).appUrl || 'https://dabullaw-glitch.github.io/dabul-office/') + 'prompter.html';

  const todayIL = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); } };
  const dU = ds => new Date(ds + 'T12:00:00Z');
  const iso = d => d.toISOString().slice(0, 10);
  const addD = (d, k) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + k); return x; };
  const dm = ds => { const d = dU(ds); return d.getUTCDate() + '/' + (d.getUTCMonth() + 1); };
  const dayName = ds => 'יום ' + DAYS[dU(ds).getUTCDay()] + ' ' + dm(ds);

  // UI state (kept for the session)
  const U = { view: (window.innerWidth < 700 ? 'list' : 'month'), day: null, cur: null, filt: new Set(), sel: null, pubOld: null };

  function items() {
    const cfg = (s.S.data.settings || {}).pub || {};
    const media = m => String(m).replace('{MEDIA}', cfg.media || MEDIA);
    const P = Object.entries(s.S.data.pub || {}).filter(([, d]) => d && d.at).map(([id, d]) => ({
      id: 'pub:' + id, rid: id, src: 'pub', at: String(d.at).slice(0, 16), kind: d.kind || '', own: d.owner || '', ch: (d.channels || []).filter(Boolean), st: d.status || 'planned',
      ti: d.title || '', tx: d.text || '', note: d.note || '', link: d.link || d.url || '', m: (d.media || []).map(media)
    }));
    const F = Object.entries(s.S.data.prompt || {}).filter(([, d]) => d && !d.arch && d.plan).map(([id, d]) => ({
      id: 'prompt:' + id, rid: id, src: 'prompt', at: String(d.plan).slice(0, 10) + 'T09:00', kind: 'film', own: 'yakir', ch: ['film'], st: d.status || 'ready',
      ti: d.title || '', tx: d.text || '', type: d.type || '', m: []
    }));
    return P.concat(F, ms().filter(x => x.at));
  }
  function ms() {
    return Object.entries(s.S.data.roadmap || {}).filter(([, d]) => d && !d.arch).map(([id, d]) => ({
      id: 'rm:' + id, rid: id, src: 'roadmap', at: d.date ? String(d.date).slice(0, 10) + 'T08:00' : '', kind: 'ms', own: d.own || '', ch: ['dev'], st: d.st || 'open',
      ti: d.title || '', tx: d.note || '', proj: d.proj || 'launch', order: d.order || 0, doneAt: d.doneAt || ''
    }));
  }
  const col = i => i.kind === 'ms' ? (PROJ[i.proj] || ['', '#6b4fa0'])[1] : (CH[i.ch[0]] || ['', '#999'])[1];
  const noText = i => i.src === 'pub' && !i.tx && i.st === 'planned';
  const done = i => i.kind === 'ms' ? i.st === 'done' : i.kind === 'film' ? (i.st === 'filmed' || i.st === 'done') : i.st === 'published';
  const icon = i => i.kind === 'film' ? (done(i) ? '✓' : '🎥') : i.kind === 'ms' ? (done(i) ? '✓' : '🏁') : `<span class="cl-dot" style="background:${col(i)}"></span>`;
  const vis = () => items().filter(i => !U.filt.size || i.ch.some(c => U.filt.has(c))).sort((a, b) => a.at.localeCompare(b.at));

  function statsHtml(all, T) {
    const end = iso(addD(dU(T), 7));
    const nxt = all.filter(i => i.src === 'pub' && i.at.slice(0, 10) >= T && i.at.slice(0, 10) < end && i.st !== 'skipped');
    const chs = new Set(); nxt.forEach(i => i.ch.forEach(c => chs.add(c)));
    const film = all.filter(i => i.kind === 'film' && !done(i)).length;
    const nt = all.filter(i => noText(i) && i.at.slice(0, 10) >= T).length;
    const M = ms(); const wt = M.filter(m => m.st === 'wait').length, pr = M.filter(m => m.st === 'prop').length;
    return `<div class="cl-stats"><div class="cl-stat"><b>${nxt.length}</b><span>פרסומים ב-7 הימים הקרובים</span></div>
      <div class="cl-stat"><b>${chs.size}</b><span>ערוצים פעילים השבוע</span></div>
      <div class="cl-stat"><b>${film}</b><span>תסריטים מחכים לצילום</span></div>
      <div class="cl-stat${nt ? ' w' : ''}"><b>${nt}</b><span>פרסומים שהטקסט שלהם עוד לא כתוב</span></div>
      <div class="cl-stat${wt ? ' w' : ''}"><b>${wt}</b><span>דברים שמחכים לך</span></div>
      <div class="cl-stat"><b>${pr}</b><span>מועדים מוצעים לאישורך</span></div></div>`;
  }
  function chipsHtml(all) {
    const used = new Set(); all.forEach(i => i.ch.forEach(c => used.add(c)));
    return `<div class="cl-chips"><button class="cl-chip ${U.filt.size ? '' : 'on'}" data-a="cl-f" data-c="">הכל</button>` +
      Object.keys(CH).filter(c => used.has(c)).map(c => `<button class="cl-chip ${U.filt.has(c) ? 'on' : ''}" data-a="cl-f" data-c="${c}"><span class="cl-dot" style="background:${CH[c][1]}"></span>${CH[c][0]}</button>`).join('') + '</div>';
  }
  const evHtml = i => `<button class="cl-ev ${i.st === 'skipped' ? 'skip' : ''} ${i.kind === 'film' ? 'film' : ''} ${i.kind === 'ms' ? 'ms ' + n(i.st) : ''} ${U.sel === i.id ? 'sel' : ''}" data-a="cl-sel" data-id="${n(i.id)}" style="--c:${col(i)}" title="${n(i.ti)}">${icon(i)}<span class="t">${i.src === 'pub' ? n(i.at.slice(11, 16)) + ' ' : ''}${n(i.ti)}</span></button>`;
  function metaLines(i) {
    if (i.kind === 'ms') return [`פרויקט: ${n((PROJ[i.proj] || [i.proj])[0])}`, `אחראי: ${n(OWN[i.own] || i.own)} · מצב: ${MST[i.st] || n(i.st)}`];
    if (i.kind === 'film') return ['סרטון שאתה מצלם (תסריט מוכן בטלפרומטר)', `תאריך יעד לצילום · מצב: ${done(i) ? 'צולם ✓' : 'מחכה לצילום'}`];
    const where = i.ch.map(c => n((CH[c] || [c])[0])).join(', ');
    return [`לאן: ${where || 'לא צוין'}`, `מי מפרסם: ${n(OWN[i.own] || i.own || 'לא צוין')} · מצב: ${n(PST[i.st] || i.st)}`];
  }
  function itHtml(i) {
    const ml = metaLines(i);
    const flags = (noText(i) ? '<span class="cl-p s-notext">הטקסט עוד לא נכתב</span>' : '') + (i.st === 'published' ? '<span class="cl-p s-published">פורסם ✓</span>' : '') + (i.st === 'skipped' ? '<span class="cl-p">בוטל</span>' : '');
    return `<button class="cl-it ${i.st === 'skipped' ? 'skip' : ''} ${i.kind === 'film' ? 'film' : ''} ${U.sel === i.id ? 'sel' : ''}" data-a="cl-sel" data-id="${n(i.id)}" style="--c:${col(i)}">
      <span class="tm">${i.src === 'pub' ? n(i.at.slice(11, 16)) : icon(i)}</span><span class="g"><span class="ti" style="display:block">${n(i.ti)}</span>
      <span class="ml">${ml.map(x => `<span style="display:block">${x}</span>`).join('')}</span>${flags ? `<span class="ch">${flags}</span>` : ''}
      ${i.tx && i.kind !== 'ms' ? `<span class="tx" style="display:block">${n(i.tx)}</span>` : ''}</span></button>`;
  }
  const LEGEND = `<div class="cl-key"><b>מה כל סימן אומר:</b> <span><span class="cl-dot" style="background:#1877f2"></span> נקודה צבעונית = פרסום ברשת (הצבע לפי הרשת)</span><span>🎥 = סרטון שאתה צריך לצלם</span><span>🏁 = משימה עם מועד (פיתוחים)</span><span>✓ = בוצע</span><span>לחיצה על פריט מראה את כל הפרטים</span></div>`;
  function monthHtml(all, T) {
    const y = U.cur.getUTCFullYear(), mo = U.cur.getUTCMonth();
    const first = new Date(Date.UTC(y, mo, 1, 12)), start = addD(first, -first.getUTCDay());
    let h = DAYS.map(d => `<div class="hd">${d}</div>`).join('');
    for (let k = 0; k < 42; k++) {
      const d = addD(start, k), ds = iso(d); if (k >= 35 && d.getUTCMonth() !== mo) break;
      const its = all.filter(i => i.at.slice(0, 10) === ds);
      h += `<div class="cl-c ${d.getUTCMonth() !== mo ? 'out' : ''} ${ds === T ? 'today' : ''} ${U.day === ds ? 'pick' : ''}"><button class="dn" data-a="cl-day" data-d="${ds}" aria-label="הצגת ${dm(ds)}">${d.getUTCDate()}</button>${its.slice(0, 4).map(evHtml).join('')}${its.length > 4 ? `<button class="cl-more" style="border:0;background:none;cursor:pointer;text-align:start" data-a="cl-week" data-d="${ds}">ועוד ${its.length - 4}</button>` : ''}</div>`;
    }
    const dd = U.day && U.day.slice(0, 7) === iso(first).slice(0, 7) ? U.day : null;
    const dl = dd ? `<div class="cl-dlist"><div class="cl-day">${dayName(dd)}</div>${all.filter(i => i.at.slice(0, 10) === dd).map(itHtml).join('') || '<div class="cl-more">אין כלום ביום הזה</div>'}</div>` : `<div class="cl-more" style="margin-top:8px">לוחצים על מספר של יום כדי לראות מתחת ללוח מה יש בו, במילים.</div>`;
    return { range: MON[mo] + ' ' + y, html: `<div class="cl-m">${h}</div>${dl}` };
  }
  function weekHtml(all, T) {
    const st0 = addD(U.cur, -U.cur.getUTCDay()), e = addD(st0, 6);
    let h = '';
    for (let k = 0; k < 7; k++) {
      const ds = iso(addD(st0, k)); const its = all.filter(i => i.at.slice(0, 10) === ds);
      h += `<div class="cl-wd ${ds === T ? 'today' : ''}"><h4>${DAYS[k]} ${dm(ds)}</h4>${its.map(itHtml).join('') || '<div class="cl-more">אין פרסומים</div>'}</div>`;
    }
    return { range: `${dm(iso(st0))} עד ${dm(iso(e))}`, html: `<div class="cl-wk">${h}</div>` };
  }
  function listHtml(all, T) {
    let last = '';
    const h = all.filter(i => i.at.slice(0, 10) >= T).map(i => { const d = i.at.slice(0, 10); const hd = d !== last ? `<div class="cl-day">${dayName(d)}</div>` : ''; last = d; return hd + itHtml(i); }).join('');
    return { range: 'מהיום והלאה', html: h || '<div class="cl-empty">אין פריטים</div>' };
  }
  function devHtml() {
    const M = ms();
    const waits = M.filter(m => m.st === 'wait');
    const wb = waits.length ? `<div class="cl-wait"><h4>מחכה לך (${waits.length})</h4>${waits.map(m => `<button data-a="cl-sel" data-id="${n(m.id)}">• ${n(m.ti)} <span style="color:var(--muted);font-size:12.5px">· ${n((PROJ[m.proj] || [m.proj])[0])}</span></button>`).join('')}</div>` : '';
    const keys = Object.keys(PROJ).concat([...new Set(M.map(m => m.proj))].filter(k => !PROJ[k]));
    const cards = keys.map(k => {
      const L = M.filter(m => m.proj === k).sort((a, b) => (a.at || '9999').localeCompare(b.at || '9999') || a.order - b.order); if (!L.length) return '';
      const dn = L.filter(m => m.st === 'done').length; const pct = Math.round(100 * dn / L.length);
      const nx = L.find(m => m.st !== 'done' && m.at); const c = (PROJ[k] || ['', '#6b4fa0'])[1];
      return `<div class="cl-proj" style="--c:${c}"><h4>${n((PROJ[k] || [k])[0])}</h4><div style="font-size:12.5px;color:var(--muted)">${dn} מתוך ${L.length} בוצעו${nx ? ` · הבא: ${dm(nx.at.slice(0, 10))}` : ''}</div><div class="cl-prog"><i style="width:${pct}%"></i></div>
        ${L.map(m => `<button class="cl-msr ${m.st === 'done' ? 'done' : ''} ${U.sel === m.id ? 'sel' : ''}" data-a="cl-sel" data-id="${n(m.id)}"><span class="dt">${m.at ? dm(m.at.slice(0, 10)) : 'טרם'}</span><span style="flex:1;min-width:0"><span class="tt" style="display:block">${n(m.ti)}</span>${m.st !== 'done' ? `<span class="cl-p s-${n(m.st)}">${MST[m.st] || n(m.st)}</span> <span class="cl-p o-${n(m.own)}">${n(OWN[m.own] || m.own)}</span>` : ''}</span></button>`).join('')}</div>`;
    }).join('');
    return { range: 'כל הפרויקטים', html: wb + (cards ? `<div class="cl-projs">${cards}</div>` : '<div class="cl-empty">עוד אין פיתוחים ביומן.</div>') };
  }
  function find(id) { return items().find(x => x.id === id) || ms().find(x => x.id === id) || null; }
  function detHtml() {
    const i = U.sel && find(U.sel);
    if (!i) return '<div class="cl-empty">לוחצים על פריט ביומן כדי לראות בדיוק מה יוצא, מתי ולאן.</div>';
    const close = `<button class="btn sm ghost" data-a="cl-close" style="float:left">סגירה</button>`;
    if (i.kind === 'ms') {
      const acts = i.st === 'prop' ? `<button class="btn sm pri" data-a="cl-rm" data-op="ok" data-id="${n(i.rid)}">לאשר את המועד</button><button class="btn sm" data-a="cl-rm" data-op="date" data-id="${n(i.rid)}">מועד אחר</button>`
        : i.st === 'wait' ? `<button class="btn sm pri" data-a="cl-rm" data-op="done" data-id="${n(i.rid)}">טיפלתי בזה</button><button class="btn sm" data-a="cl-rm" data-op="date" data-id="${n(i.rid)}">לקבוע תאריך</button>`
          : i.st === 'done' ? '' : `<button class="btn sm" data-a="cl-rm" data-op="date" data-id="${n(i.rid)}">להזיז תאריך</button>${i.own === 'yakir' ? `<button class="btn sm" data-a="cl-rm" data-op="done" data-id="${n(i.rid)}">בוצע</button>` : ''}`;
      return `${close}<span class="cl-p s-${n(i.st)}">${MST[i.st] || n(i.st)}</span><h3>${n(i.ti)}</h3>
        <dl><dt>פרויקט</dt><dd>${n((PROJ[i.proj] || [i.proj])[0])}</dd><dt>מועד</dt><dd>${i.at ? dayName(i.at.slice(0, 10)) + '/' + i.at.slice(0, 4) : 'עוד אין תאריך'}</dd><dt>אחראי</dt><dd>${n(OWN[i.own] || i.own)}</dd>${i.doneAt ? `<dt>בוצע</dt><dd>${n(s.fmtDate(String(i.doneAt).slice(0, 10)))}</dd>` : ''}</dl>
        ${i.tx ? `<div class="full">${n(i.tx)}</div>` : ''}<div class="acts">${acts}</div>`;
    }
    const imgs = i.m.filter(m => /\.(jpe?g|png|webp)$/i.test(m)), vids = i.m.filter(m => /\.mp4$/i.test(m));
    const ds = i.at.slice(0, 10);
    let acts = '';
    if (i.kind === 'film') acts = `<a class="btn sm pri" href="${PROMPTER}#p=${encodeURIComponent(i.rid)}" target="_blank" rel="noopener">פתיחה בטלפרומטר</a>`;
    else if (i.st === 'skipped') acts = `<button class="btn sm" data-a="cl-pub" data-op="restore" data-id="${n(i.rid)}">להחזיר ללוח</button>`;
    else if (i.st === 'planned') acts = `<button class="btn sm" data-a="cl-pub" data-op="text" data-id="${n(i.rid)}">עריכת טקסט</button><button class="btn sm" data-a="cl-pub" data-op="time" data-id="${n(i.rid)}">להזיז מועד</button><button class="btn sm ghost" data-a="cl-pub" data-op="skip" data-id="${n(i.rid)}">לבטל</button>`;
    return `${close}<span class="cl-p o-${n(i.own)}">${i.kind === 'film' ? 'לצילום על ידי יקיר' : 'מפרסם: ' + n(OWN[i.own] || i.own)}</span><h3>${n(i.ti)}</h3>
      <dl><dt>מתי</dt><dd>${dayName(ds)}${i.kind === 'film' ? ' (יעד לצילום)' : ', ' + n(i.at.slice(11, 16))}</dd>
      <dt>לאן</dt><dd>${i.ch.map(c => n((CH[c] || [c])[0])).join(', ')}</dd>
      <dt>סוג</dt><dd>${n(KIND[i.kind] || i.kind)}${i.type ? ' · ' + n(TYPE[i.type] || i.type) : ''}</dd>
      <dt>מצב</dt><dd>${i.kind === 'film' ? (done(i) ? 'צולם ✓' : 'מאושר לצילום') : n(PST[i.st] || i.st)}</dd></dl>
      ${i.note ? `<div style="font-size:13px;color:var(--muted);margin-bottom:8px">${n(i.note)}</div>` : ''}
      ${i.tx ? `<div class="full">${n(i.tx)}</div>` : (i.src === 'pub' ? `<div class="cl-note">${i.own === 'grok' ? 'הטקסט עוד לא כתוב: גרוק בוט כותב אותו רק ביום הפרסום. אחרי שהערוץ עובר ל-Claude, הטקסט ייכתב כמה ימים מראש ויופיע כאן.' : 'הטקסט עוד לא כתוב. הוא ייכתב לפני מועד הפרסום ויופיע כאן.'}</div>` : '')}
      ${imgs.map(m => `<img src="${n(m)}" alt="" loading="lazy">`).join('')}
      ${vids.length ? `<div class="cl-leg">${vids.map(v => `<a href="${n(v)}" target="_blank" rel="noopener">🎬 צפייה בסרטון</a>`).join(' · ')}</div>` : ''}
      ${i.link ? `<div class="cl-leg"><a href="${n(i.link)}" target="_blank" rel="noopener">לצפייה בפרסום עצמו</a></div>` : ''}
      <div class="acts">${acts}</div>`;
  }

  function calHtml() {
    const T = todayIL();
    if (!U.cur) U.cur = dU(T);
    const all = vis();
    const v = U.view === 'week' ? weekHtml(all, T) : U.view === 'list' ? listHtml(all, T) : U.view === 'dev' ? devHtml() : monthHtml(all, T);
    const isDev = U.view === 'dev';
    const segs = [['month', 'חודש'], ['week', 'שבוע'], ['list', 'רשימה'], ['dev', 'פיתוחים ומועדים']].map(([k, t]) => `<button class="${U.view === k ? 'on' : ''}" data-a="cl-v" data-v="${k}">${t}</button>`).join('');
    const nav = isDev || U.view === 'list' ? `<div class="cl-nav"><span>${n(v.range)}</span></div>` : `<div class="cl-nav"><button data-a="cl-nav" data-d="-1" aria-label="הקודם">›</button><span>${n(v.range)}</span><button data-a="cl-nav" data-d="1" aria-label="הבא">‹</button><button data-a="cl-nav" data-d="0" style="padding:0 10px;font-size:13px">היום</button></div>`;
    return `${statsHtml(items(), T)}<div class="cl-bar"><div class="cl-segs">${segs}</div>${nav}</div>${isDev ? '' : LEGEND + chipsHtml(items())}
      <div class="cl-lay"><div style="min-width:0">${v.html}</div><aside class="cl-det" id="cl-det">${detHtml()}</aside></div>`;
  }
  s.calView = calHtml;

  // The marketing tab "לוח פרסום" becomes the calendar; the old list + Instagram connection stay below it.
  (function wrap(k) {
    if (typeof s.pubView !== 'function') { if (k < 120) setTimeout(() => wrap(k + 1), 250); return; }
    if (s.pubView.__cal) return;
    U.pubOld = s.pubView;
    const f = () => { let old = ''; try { old = U.pubOld(); } catch { old = ''; } return calHtml() + `<details class="cl-old"><summary>חיבור אינסטגרם והלוח הישן (רשימה)</summary>${old}</details>`; };
    f.__cal = true; s.pubView = f;
  })(0);

  s.V.cal = { title: 'יומן תוכן', render(el) { el.innerHTML = `<div>${s.pageHead('יומן תוכן', 'כל מה שעולה ומתי, לאן, מי מפרסם ומה בדיוק יוצא. וגם המועדים של כל הפיתוחים.', '')}${calHtml()}</div>`; } };
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'cal')) a[3].push(['cal', 'יומן תוכן']); } catch { /* menu stays as is */ }

  // actions
  const reSel = () => { bump(); if (window.innerWidth < 1180) setTimeout(() => { const d = document.getElementById('cl-det'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); };
  s.act('cl-v', (b, d) => { U.view = d.v; bump(); });
  s.act('cl-f', (b, d) => { const c = d.c; if (!c) U.filt.clear(); else if (U.filt.has(c)) U.filt.delete(c); else U.filt.add(c); bump(); });
  s.act('cl-sel', (b, d) => { U.sel = d.id; const it = find(d.id); if (it && it.at) U.day = it.at.slice(0, 10); reSel(); });
  s.act('cl-day', (b, d) => { U.day = d.d; bump(); setTimeout(() => { const x = document.querySelector('.cl-dlist'); if (x && window.innerWidth < 1180) x.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); });
  s.act('cl-close', () => { U.sel = null; bump(); });
  s.act('cl-week', (b, d) => { U.view = 'week'; U.cur = dU(d.d); bump(); });
  s.act('cl-nav', (b, d) => {
    const k = +d.d; if (!k) U.cur = dU(todayIL());
    else if (U.view === 'month') U.cur = new Date(Date.UTC(U.cur.getUTCFullYear(), U.cur.getUTCMonth() + k, 1, 12));
    else U.cur = addD(U.cur, 7 * k);
    bump();
  });
  const stamp = () => ({ changedAt: new Date().toISOString(), changedBy: 'office' });
  s.act('cl-pub', async (b, d) => {
    const id = d.id, cur = (s.S.data.pub || {})[id]; if (!cur) return;
    try {
      if (d.op === 'skip') { if (!(await s.confirm('לבטל את הפרסום הזה? הוא לא ייצא.', 'לבטל'))) return; await s.patch('pub', id, Object.assign({ status: 'skipped' }, stamp())); s.toast('בוטל. הפריט לא יתפרסם.'); }
      else if (d.op === 'restore') { await s.patch('pub', id, Object.assign({ status: 'planned' }, stamp())); s.toast('הוחזר ללוח'); }
      else if (d.op === 'text') s.formModal({ title: 'עריכת הטקסט שיתפרסם', wide: true, fields: [['text', 'הטקסט', 'textarea', { rows: 12, full: true }]], values: { text: cur.text || '' }, onSubmit: async v => { await s.patch('pub', id, Object.assign({ text: v.text }, stamp())); s.toast('הטקסט נשמר'); } });
      else if (d.op === 'time') s.formModal({ title: 'להזיז את מועד הפרסום', fields: [['date', 'תאריך', 'date', { req: true }], ['time', 'שעה', 'time', { req: true }]], values: { date: String(cur.at).slice(0, 10), time: String(cur.at).slice(11, 16) }, onSubmit: async v => { await s.patch('pub', id, Object.assign({ at: v.date + 'T' + v.time }, stamp())); s.toast('המועד עודכן'); } });
    } catch { s.toast('לא נשמר, נסה שוב', 'bad'); }
  });
  s.act('cl-rm', async (b, d) => {
    const id = d.id, cur = (s.S.data.roadmap || {})[id]; if (!cur) return;
    try {
      if (d.op === 'ok') { await s.patch('roadmap', id, Object.assign({ st: 'open', approvedAt: new Date().toISOString() }, stamp())); s.toast('המועד אושר'); }
      else if (d.op === 'done') { await s.patch('roadmap', id, Object.assign({ st: 'done', doneAt: new Date().toISOString() }, stamp())); s.toast('סומן כבוצע'); }
      else if (d.op === 'date') s.formModal({ title: 'מועד', fields: [['date', 'תאריך', 'date', { req: true }]], values: { date: cur.date || '' }, onSubmit: async v => { await s.patch('roadmap', id, Object.assign({ date: v.date, st: cur.st === 'done' ? 'done' : 'open' }, stamp())); s.toast('המועד נשמר'); } });
    } catch { s.toast('לא נשמר, נסה שוב', 'bad'); }
  });
})(window.O);
