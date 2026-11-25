// Firm area logic. Every change goes through fol-api with the signed-in session; the server checks ownership and rules.
import { api, session, setSession, esc, ils, heDate, $, $$, say, errText, mdLite, LANGS, DAYS } from './api';
import { autoLink } from './api';

const root = $('#portal');
const top = $('[data-top]', root);
const KIND: Record<string, string> = { listing: 'מיקום בראש רשימה', court: 'עמוד בית משפט', tool: 'חסות על כלי', article: 'מאמר ממומן', provider: 'מודעת נותן שירות' };
const STATUS: Record<string, string> = { active: 'פעיל', expired: 'הסתיים', cancelled: 'בוטל', paid: 'שולם', pending: 'ממתין לתשלום', review: 'בבדיקה', failed: 'נכשל', published: 'פורסם', held: 'ממתין לבדיקה', brief: 'בכתיבה', awaiting_firm: 'מחכה לאישור שלכם', changes: 'בתיקון', approved: 'אושר' };

async function approveFlow(raw: string) {
  const box = $('[data-approve]', root); box.classList.remove('cm-hidden');
  const r = await api('sponsored_view', { approve: raw });
  if (r.status !== 200) { box.innerHTML = `<p>${esc(errText(r))}</p>`; return; }
  box.innerHTML = `<p class="cm-sponsor-box">טיוטת תוכן ממומן של ${esc(r.firm)}. אחרי האישור היא תתפרסם עם התווית "תוכן ממומן".</p><h2>${esc(r.title)}</h2><div class="prose">${mdLite(r.body_md || '')}</div>
    <div class="field mt2"><label for="ap-note">הערות לתיקון (אם צריך)</label><textarea id="ap-note" maxlength="1500"></textarea></div>
    <div class="flex"><button type="button" class="btn btn-pine btn-sm" data-ap="approve">מאשר/ת לפרסום</button><button type="button" class="btn btn-line btn-sm" data-ap="changes">מבקש/ת שינויים</button></div><div class="msg" data-apmsg></div>`;
  $$('[data-ap]', box).forEach((b) => b.addEventListener('click', async () => {
    const d = await api('sponsored_decide', { approve: raw, decision: b.dataset.ap, note: ($('#ap-note') as HTMLTextAreaElement).value });
    if (d.status !== 200) return say($('[data-apmsg]', box), errText(d), 'bad');
    box.innerHTML = d.state === 'published' ? `<p>תודה. התוכן פורסם. <a href="${esc(d.url)}">לצפייה</a></p>` : '<p>תודה. הבקשה לשינויים נשלחה לצוות התוכן.</p>';
    history.replaceState(null, '', location.pathname);
  }));
}

function showLogin() {
  $('[data-login]', root).classList.remove('cm-hidden'); $('[data-app]', root).classList.add('cm-hidden');
  ($('[data-claim-link]', root) as HTMLAnchorElement).href = root.dataset.claim!; ($('[data-order-link]', root) as HTMLAnchorElement).href = root.dataset.order!;
}
$('[data-send]', root).addEventListener('click', async () => {
  const r = await api('login', { email: ($('#l-mail') as HTMLInputElement).value });
  say($('[data-lmsg]', root), r.status === 200 ? 'אם המייל רשום אצלנו, נשלח אליו קישור כניסה וקוד. כדאי לבדוק גם בתיקיית הספאם.' : errText(r), r.status === 200 ? 'ok' : 'bad');
});
$('[data-code]', root).addEventListener('click', async () => {
  const r = await api('login_verify', { email: ($('#l-mail') as HTMLInputElement).value, code: ($('#l-code') as HTMLInputElement).value });
  if (r.status !== 200) return say($('[data-lmsg]', root), errText(r), 'bad');
  setSession(r.session); start();
});
$('[data-logout]', root).addEventListener('click', () => { setSession(null); location.reload(); });

async function start() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('approve')) return approveFlow(h.get('approve')!);
  if (h.get('login')) {
    const r = await api('login_verify', { token_hash: h.get('login') });
    history.replaceState(null, '', location.pathname);
    if (r.status === 200) setSession(r.session); else say(top, errText(r), 'bad');
  }
  if (!session()) return showLogin();
  const me = await api('me', {}, true);
  if (me.status !== 200) { setSession(null); return showLogin(); }
  $('[data-login]', root).classList.add('cm-hidden'); $('[data-app]', root).classList.remove('cm-hidden');
  $('[data-who]', root).textContent = `מחובר/ת בתור ${me.email}${me.test_mode ? ' (מצב בדיקה)' : ''}`;
  if (me.admin) { const a = $('[data-admin-link]', root) as HTMLAnchorElement; a.href = root.dataset.admin!; a.classList.remove('cm-hidden'); }
  const box = $('[data-firms]', root);
  if (!me.firms.length) { box.innerHTML = `<div class="cm-panel"><p>עוד אין משרד שמקושר למייל הזה. <a href="${esc(root.dataset.claim!)}">לאישור בעלות על פרופיל</a> או <a href="${esc(root.dataset.order!)}">להצטרפות</a>.</p></div>`; return; }
  box.innerHTML = ''; me.firms.forEach((x: any) => box.appendChild(firmPanel(x)));
}

function firmPanel(x: any): HTMLElement {
  const f = x.firm; const el = document.createElement('section'); el.className = 'cm-panel';
  const tabs: [string, string][] = [['over', 'סקירה'], ['profile', 'פרופיל'], ['places', 'מיקומים וחידושים'], ['reviews', 'חוות דעת'], ['more', 'הזמנות ותוכן ממומן']];
  el.innerHTML = `<h2>${esc(f.name)}</h2><div class="cm-tabs" role="tablist">${tabs.map(([k, t], i) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${i === 0}">${t}</button>`).join('')}</div>${tabs.map(([k], i) => `<div data-pane="${k}" class="${i ? 'cm-hidden' : ''}"></div>`).join('')}<div class="msg" data-fmsg role="status"></div>`;
  $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { $$('[data-tab]', el).forEach((t) => t.setAttribute('aria-selected', String(t === b))); $$('[data-pane]', el).forEach((p) => p.classList.toggle('cm-hidden', p.dataset.pane !== b.dataset.tab)); }));
  const msg = $('[data-fmsg]', el);
  const firmUrl = root.dataset.firmBase!.replace('__slug__', encodeURIComponent(f.slug));
  // overview
  $('[data-pane="over"]', el).innerHTML = `<div class="cm-kv"><div>חבילה<b>${f.plan === 'free' ? 'חינמית' : esc(f.plan)}</b>${f.plan_until ? `בתוקף עד ${esc(heDate(f.plan_until))}` : ''}</div><div>צפיות ב 30 יום<b>${x.stats30.views}</b></div><div>לחיצות על הטלפון<b>${x.stats30.phone}</b></div><div>לחיצות על האתר<b>${x.stats30.website}</b></div><div>לחיצות על וואטסאפ<b>${x.stats30.whatsapp}</b></div><div>ציון חוות דעת<b>${f.review_avg ?? 'אין עדיין'}</b>${f.review_count} חוות דעת</div></div>
    <p class="small mt2">סטטוס בפרופיל: ${f.status === 'published' ? 'מוצג באתר' : 'מוסתר'}. <a href="${esc(firmUrl)}" target="_blank">לעמוד המשרד</a>. הנתונים נספרים בלי לשמור פרטים על המבקרים.</p>
    <a class="btn btn-brass btn-sm" href="${esc(root.dataset.order!)}">קנייה של חבילה או תוספת</a>`;
  // profile
  const d = (x.draft && x.draft.data) || f.extended || {};
  const pane = $('[data-pane="profile"]', el);
  if (!f.extended_enabled) pane.innerHTML = `<p>פרופיל מורחב פתוח למשרדים שאישרו בעלות או קנו חבילה או שדרוג כרטיס. <a href="${esc(root.dataset.order!)}?plan=card-upgrade">לשדרוג כרטיס</a></p>`;
  else {
    pane.innerHTML = `${x.draft && x.draft.status === 'rejected' ? `<div class="cm-test">הגרסה האחרונה לא פורסמה: ${(x.draft.issues || []).map(esc).join(' ')}</div>` : ''}
      <div class="field"><label>שורה קצרה על המשרד (עד 90 תווים)</label><input data-p="tagline" maxlength="90" value="${esc(d.tagline || '')}" /></div>
      <div class="field"><label>תיאור המשרד (40 עד 1500 תווים, בלי קישורים)</label><textarea data-p="description" maxlength="1500" rows="6">${esc(d.description || '')}</textarea></div>
      <div class="row2"><div class="field"><label>לוגו (PNG, JPG או WEBP, עד 500KB)</label><input type="file" accept="image/png,image/jpeg,image/webp" data-up="logo" /><input type="hidden" data-p="logo" value="${esc(d.logo || '')}" /></div>
      <div class="field"><label>תמונות (עד 6, עד 1.5MB כל אחת)</label><input type="file" accept="image/png,image/jpeg,image/webp" data-up="photo" multiple /></div></div>
      <div class="cm-photos" data-photos>${(d.photos || []).map((p: string) => `<img src="${esc(p)}" alt="" data-ph="${esc(p)}" title="לחיצה מסירה את התמונה" />`).join('')}</div>
      <div class="row2"><div class="field"><label>קישור לסרטון (יוטיוב או וימאו)</label><input data-p="video" dir="ltr" value="${esc(d.video || '')}" /></div>
      <div class="field"><label>וואטסאפ (מספר נייד)</label><input data-p="whatsapp" dir="ltr" value="${esc(d.whatsapp || '')}" /></div></div>
      <div class="field"><label>שנת הקמה</label><input data-p="founded" inputmode="numeric" maxlength="4" value="${esc(d.founded || '')}" /></div>
      <fieldset class="field" style="border:0;padding:0"><legend>שפות שירות</legend><div class="flex" style="flex-wrap:wrap">${LANGS.map((l) => `<label class="check"><input type="checkbox" data-lang value="${l}" ${(d.languages || []).includes(l) ? 'checked' : ''} /><span>${l}</span></label>`).join('')}</div></fieldset>
      <fieldset class="field" style="border:0;padding:0"><legend>שעות פעילות (למשל 09:00-18:00, ריק = סגור)</legend><div class="cm-kv">${DAYS.map(([k, n]) => `<label>${n}<input data-h="${k}" dir="ltr" value="${esc((d.hours || {})[k] || '')}" /></label>`).join('')}</div></fieldset>
      <div class="flex mt2"><button type="button" class="btn btn-line btn-sm" data-save>שמירת טיוטה</button><button type="button" class="btn btn-line btn-sm" data-prev>תצוגה מקדימה</button><button type="button" class="btn btn-pine btn-sm" data-submit>בדיקה ופרסום</button></div>
      <div class="cm-preview mt2 cm-hidden" data-preview></div>
      <p class="xs muted mt1">לפני פרסום יש בדיקה אוטומטית: בלי לשון הפלגה, בלי הבטחת תוצאות ובלי קישורים בתוך התיאור. משרד בחבילה בתשלום מסומן "משרד מקודם".</p>`;
    let photos: string[] = [...(d.photos || [])];
    const collect = () => ({
      tagline: ($('[data-p="tagline"]', pane) as HTMLInputElement).value, description: ($('[data-p="description"]', pane) as HTMLTextAreaElement).value,
      logo: ($('[data-p="logo"]', pane) as HTMLInputElement).value, photos, video: ($('[data-p="video"]', pane) as HTMLInputElement).value,
      whatsapp: ($('[data-p="whatsapp"]', pane) as HTMLInputElement).value, founded: ($('[data-p="founded"]', pane) as HTMLInputElement).value,
      languages: $$('[data-lang]', pane).filter((c) => (c as HTMLInputElement).checked).map((c) => (c as HTMLInputElement).value),
      hours: Object.fromEntries($$('[data-h]', pane).map((i) => [i.dataset.h, (i as HTMLInputElement).value.trim()]).filter(([, v]) => v)),
    });
    const drawPhotos = () => { $('[data-photos]', pane).innerHTML = photos.map((p) => `<img src="${esc(p)}" alt="" data-ph="${esc(p)}" title="לחיצה מסירה את התמונה" />`).join(''); };
    $('[data-photos]', pane).addEventListener('click', (e) => { const p = (e.target as HTMLElement).dataset.ph; if (p) { photos = photos.filter((x) => x !== p); drawPhotos(); } });
    $$('[data-up]', pane).forEach((inp) => inp.addEventListener('change', async () => {
      for (const file of [...((inp as HTMLInputElement).files || [])]) {
        if (inp.dataset.up === 'photo' && photos.length >= 6) { say(msg, 'אפשר עד 6 תמונות.', 'bad'); break; }
        const data = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(file); });
        say(msg, 'מעלים...', 'info');
        const r = await api('upload', { firm: f.id, kind: inp.dataset.up, data }, true);
        if (r.status !== 200) { say(msg, errText(r), 'bad'); continue; }
        if (inp.dataset.up === 'logo') ($('[data-p="logo"]', pane) as HTMLInputElement).value = r.url; else { photos.push(r.url); drawPhotos(); }
        say(msg, 'הקובץ הועלה. לא לשכוח לשמור או לפרסם.', 'ok');
      }
    }));
    $('[data-prev]', pane).addEventListener('click', () => {
      const p = collect(); const box = $('[data-preview]', pane); box.classList.remove('cm-hidden');
      box.innerHTML = `${f.plan !== 'free' ? '<span class="plbl">משרד מקודם</span>' : ''}${p.logo ? `<img class="logo" src="${esc(p.logo)}" alt="" />` : ''}<h3>${esc(f.name)}</h3>${p.tagline ? `<p><strong>${esc(p.tagline)}</strong></p>` : ''}<p>${esc(p.description).replace(/\n/g, '<br>')}</p>${p.languages.length ? `<p class="small">שפות: ${p.languages.map(esc).join(', ')}</p>` : ''}<div class="cm-photos">${p.photos.map((x) => `<img src="${esc(x)}" alt="" />`).join('')}</div>`;
    });
    $('[data-save]', pane).addEventListener('click', async () => {
      const r = await api('profile_save', { firm: f.id, data: collect() }, true);
      if (r.status !== 200) return say(msg, errText(r), 'bad');
      say(msg, r.issues.length ? 'הטיוטה נשמרה. לפני פרסום צריך לתקן: ' + r.issues.join(' ') : 'הטיוטה נשמרה ועוברת את הבדיקות.', r.issues.length ? 'bad' : 'ok');
    });
    $('[data-submit]', pane).addEventListener('click', async () => {
      const r = await api('profile_submit', { firm: f.id, data: collect() }, true);
      if (r.status !== 200) return say(msg, errText(r), 'bad');
      say(msg, r.published ? 'הפרופיל עבר את הבדיקות ופורסם. הוא יופיע באתר בעדכון הקרוב.' : 'הפרופיל לא פורסם: ' + r.issues.join(' '), r.published ? 'ok' : 'bad');
    });
  }
  // placements
  $('[data-pane="places"]', el).innerHTML = x.placements.length ? `<div class="cm-table"><table><thead><tr><th>מה</th><th>איפה</th><th>עד</th><th>מצב</th><th>חידוש</th></tr></thead><tbody>${x.placements.map((p: any) => `<tr><td>${esc(KIND[p.kind] || p.kind)}</td><td>${esc(p.item)}</td><td>${esc(heDate(p.ends_at))}</td><td>${esc(STATUS[p.status] || p.status)}</td><td>${p.renew ? `<a href="${esc(p.renew)}">לחידוש</a>` : ''}${p.auto_renew ? ` <button type="button" class="btn btn-line btn-sm" data-noauto="${esc(p.id)}">ביטול חידוש אוטומטי</button>` : ''}</td></tr>`).join('')}</tbody></table></div><p class="xs muted mt1">חבילות מתחדשות בקישור שנשלח במייל 30, 7 ויום אחד לפני הסוף. החידוש ממשיך מתאריך הסיום, כך שלא מפסידים ימים.</p>` : `<p>אין עדיין מיקומים בתשלום. <a href="${esc(root.dataset.order!)}">לבחירת חבילה</a></p>`;
  $$('[data-noauto]', el).forEach((b) => b.addEventListener('click', async () => {
    const r = await api('auto_renew_cancel', { placement: b.dataset.noauto }, true);
    if (r.status === 200) { b.remove(); say(msg, 'החידוש האוטומטי בוטל.', 'ok'); } else say(msg, errText(r), 'bad');
  }));
  // reviews
  const rv = $('[data-pane="reviews"]', el);
  rv.innerHTML = `<p><button type="button" class="btn btn-line btn-sm" data-invite>יצירת קישור הזמנה לחוות דעת</button></p><p class="small muted">שולחים את הקישור ללקוח. הוא מאמת את עצמו בקוד במייל, והחוות דעת מסומנת "הוזמן על ידי המשרד".</p><div data-invite-out></div>
    ${x.reviews.map((r: any) => `<div class="cm-slot"><strong>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} ${esc(r.title || '')}</strong><p class="small">${esc(r.body)}</p><p class="xs muted">${esc(r.author_display)} · ${esc(STATUS[r.status] || r.status)}</p>${r.status === 'published' ? (r.firm_reply ? `<p class="small"><strong>תגובת המשרד:</strong> ${esc(r.firm_reply)}</p>` : `<div class="field"><textarea data-reply-text="${esc(r.id)}" maxlength="1000" placeholder="תגובה עניינית בלי פרטים מזהים"></textarea></div><button type="button" class="btn btn-line btn-sm" data-reply="${esc(r.id)}">פרסום תגובה</button>`) : ''}</div>`).join('') || '<p>אין עדיין חוות דעת.</p>'}`;
  $('[data-invite]', rv).addEventListener('click', async () => {
    const r = await api('invite_create', { firm: f.id }, true);
    $('[data-invite-out]', rv).innerHTML = r.status === 200 ? `<div class="field"><label>הקישור (תקף 60 יום, לשימוש אחד)</label><input readonly dir="ltr" value="${esc(r.link)}" onclick="this.select()" /></div>` : `<p>${esc(errText(r))}</p>`;
  });
  $$('[data-reply]', rv).forEach((b) => b.addEventListener('click', async () => {
    const text = ($(`[data-reply-text="${b.dataset.reply}"]`, rv) as HTMLTextAreaElement).value;
    const r = await api('reply', { review: b.dataset.reply, text }, true);
    if (r.status === 200) say(msg, 'התגובה פורסמה.', 'ok'); else say(msg, (r.issues || [errText(r)]).join(' '), 'bad');
  }));
  // orders and sponsored
  $('[data-pane="more"]', el).innerHTML = `<h3>הזמנות</h3>${x.orders.length ? `<div class="cm-table"><table><thead><tr><th>תאריך</th><th>מוצר</th><th>סכום</th><th>מצב</th></tr></thead><tbody>${x.orders.map((o: any) => `<tr><td>${esc(heDate(o.created_at))}</td><td>${esc(o.plan_id)}</td><td>${esc(ils(o.total_ils))}</td><td>${esc(STATUS[o.status] || o.status)}${o.is_test ? ' (בדיקה)' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p>אין הזמנות.</p>'}
    <h3 class="mt2">תוכן ממומן</h3>${(x.sponsored || []).length ? x.sponsored.map((s: any) => `<p>${esc(s.title || s.brief?.topic || 'מאמר')} · ${esc(STATUS[s.status] || s.status)}</p>`).join('') : '<p>אין.</p>'}`;
  return el;
}
start();

autoLink(document.querySelector('#portal'));
