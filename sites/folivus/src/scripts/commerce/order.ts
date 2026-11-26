// Checkout page logic. The server (fol-api) recomputes prices, limits and availability; this page only collects choices.
import { api, rest, rpc, testMode, salesWhatsapp, session, esc, ils, heDate, $, $$, say, errText } from './api';

type Plan = { id: string; name: string; kind: string; unit: string; unit_price: number | null; limits: any; period_months: number; sort: number };
const root = $('#order');
const COPY: Record<string, { title: string; text: string }> = {
  local: { title: 'חבילה מקומית', text: 'משרד מקודם בראש עמוד של תחום אחד בעיר אחת. כולל פרופיל מורחב ונתונים חודשיים.' },
  regional: { title: 'חבילה אזורית', text: 'עד 3 צירופים של תחום ועיר, בראש כל עמוד. כולל פרופיל מורחב ונתונים חודשיים.' },
  national: { title: 'חבילה ארצית', text: 'תחום אחד בעמוד הארצי של התחום ובבלוק המשרדים בעמוד הבית. כולל פרופיל מורחב.' },
  'card-upgrade': { title: 'שדרוג כרטיס', text: 'פרופיל מורחב: תיאור, לוגו, תמונות, סרטון ווואטסאפ, בלי מיקום בראש הרשימה. בעמוד המשרד לא מוצגים משרדים אחרים.' },
  'court-page': { title: 'חסות על עמוד בית משפט', text: 'המשרד מוצג בעמוד של בית משפט אחד, עד 3 משרדים בעמוד, עם התווית "מודעה".' },
  'service-provider': { title: 'נותני שירות בעמודי בתי משפט', text: 'לשמאים, חוקרים, מתורגמנים ונותני שירות לעורכי דין. עד 4 בעמוד, עם התווית "מודעה".' },
  'tool-sponsor': { title: 'חסות על כלי', text: 'משרד אחד לכל מחשבון או מחולל מסמכים, עם התווית "מודעה".' },
  'sponsored-article': { title: 'מאמר ממומן', text: 'מאמר מקצועי בשם המשרד. אתם מאשרים את הטיוטה לפני הפרסום, והוא מסומן "תוכן ממומן".' },
};
const CATS = ['שמאי מקרקעין', 'שמאי רכב', 'חוקר פרטי', 'מתורגמן', 'מגשר', 'רואה חשבון', 'מודד', 'מסירת כתבי בי-דין', 'הקלטה ותמלול', 'גרפולוג', 'אחר'];
const kindOf = (p: Plan) => (p.limits && p.limits.card ? 'card' : p.kind);

let plans: Plan[] = [], T: any = { areas: [], cities: [], courts: [], tools: [] }, test = true, plan: Plan | null = null, renew = '', myFirms: any[] = [], quote: any = null;
const opt = (list: any[], ph = 'בחרו') => `<option value="">${ph}</option>` + list.map((x) => `<option value="${esc(x.slug)}">${esc(x.name)}</option>`).join('');

const STEP_NAMES = ['מוצר', 'מקומות', 'פרטים', 'סיכום ותשלום'];
let cur = 1;
function go(n: number) {
  cur = n;
  $$('[data-step]', root).forEach((s) => s.classList.toggle('cm-hidden', Number(s.dataset.step) !== n));
  $$('[data-steps] li').forEach((li) => { const k = Number(li.dataset.s); li.dataset.on = String(k <= n); if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  const lbl = $('[data-step-label]'); if (lbl) lbl.textContent = `שלב ${n} מתוך 4 · ${STEP_NAMES[n - 1]}`;
  const nb = $('[data-sbar-next]'); if (nb) nb.textContent = n === 4 ? ($('[data-pay]', root) as HTMLButtonElement).textContent || 'לתשלום' : n === 3 ? 'לסיכום' : 'המשך';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// live summary (aside on desktop, folded box and bottom bar on phones). Numbers only from the server quote.
function summary(q: any) {
  const c = plan ? (COPY[plan.id] || { title: plan.name }) : null;
  const html = !plan ? '<div><span class="cap">בחרו מוצר כדי לראות מחיר.</span></div>'
    : !q ? `<div><span class="stack"><span style="font-weight:600">${esc(c!.title)}</span><span class="cap">${esc(priceText(plan))}</span></span></div><div><span class="cap">הסכום הסופי יחושב אחרי בחירת המקומות.</span></div>`
    : `<div><span class="stack"><span style="font-weight:600">${esc(c!.title)}</span><span class="cap">${q.months ? q.months + ' חודשים' : 'שנה מיום התשלום'}</span></span><b>${ils(q.net)}</b></div><div><span>סכום לפני מע״מ</span><b>${ils(q.net)}</b></div><div><span>מע״מ</span><b>${ils(q.vat)}</b></div><div class="tot"><span>סך הכול</span><b data-qtotal>${ils(q.total)}</b></div>${Number(q.max_installments) > 1 ? `<div style="border-top:0;padding-top:0"><span class="cap">אפשר לשלם עד ${q.max_installments} תשלומים</span></div>` : ''}`;
  $$('[data-sum]').forEach((el) => (el.innerHTML = html));
  $$('[data-total]').forEach((el) => (el.textContent = q ? ils(q.total) : plan ? 'לפי הבחירה' : 'אין עדיין'));
  const sc = $('[data-scope]'); if (sc) sc.textContent = plan ? (COPY[plan.id]?.text || '') : '';
}
let qt: number | undefined;
function requote() {
  clearTimeout(qt);
  qt = window.setTimeout(async () => {
    if (!plan || renew) return;
    const k = kindOf(plan); if (k !== 'card' && k !== 'article' && step2()) { quote = null; summary(null); return; }
    const q = await api('quote', body(), true);
    quote = q.status === 200 ? q : null; summary(quote);
  }, 250);
}

async function load() {
  const [p, t, tm, wa] = await Promise.all([
    rest('fol_plans?select=id,name,kind,unit,unit_price,limits,period_months,sort&active=eq.true&order=sort'),
    fetch(root.dataset.targets!).then((r) => r.json()).catch(() => null), testMode(), salesWhatsapp(),
  ]);
  plans = (p || []).filter((x: Plan) => x.kind !== 'free'); if (t) T = t; test = tm;
  $('[data-test]', root).classList.toggle('cm-hidden', !test);
  ($('[data-terms-link]', root) as HTMLAnchorElement).href = root.dataset.terms!;
  ($('[data-method-link]', root) as HTMLAnchorElement).href = root.dataset.method!;
  ($('[data-pay]', root) as HTMLButtonElement).textContent = test ? 'רכישת בדיקה (בלי חיוב)' : 'למעבר לתשלום מאובטח';
  if (wa) $('[data-wa]', root).innerHTML = `שאלה לפני שקונים? <a href="https://wa.me/${wa}" target="_blank" rel="noopener">כתבו לנו בוואטסאפ</a>.`;
  ($('#f-city') as HTMLSelectElement).innerHTML = opt(T.cities, 'בחרו עיר');
  ($('#f-areas') as HTMLSelectElement).innerHTML = T.areas.map((a: any) => `<option value="${esc(a.slug)}">${esc(a.name)}</option>`).join('');
  ($('#a-cat') as HTMLSelectElement).innerHTML = '<option value="">בחרו</option>' + CATS.map((c) => `<option>${c}</option>`).join('');
  if (session()) { const me = await api('me', {}, true); if (me.status === 200) myFirms = me.firms.map((x: any) => x.firm); }
  renderProducts();
  const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1));
  if (q.get('paid')) return poll(q.get('paid')!);
  if (q.get('failed')) say($('[data-top]', root), 'התשלום לא הושלם. אפשר לנסות שוב.', 'bad');
  if (h.get('renew')) return startRenew(h.get('renew')!);
  if (q.get('plan')) { const pp = plans.find((x) => x.id === q.get('plan')); if (pp) pick(pp, q.get('target') || ''); }
}

function priceText(p: Plan) {
  if (!(Number(p.unit_price) > 0)) return 'המחיר ייקבע בקרוב';
  return `${ils(p.unit_price)} ${p.unit === 'month' ? 'לחודש' : p.unit === 'item' ? 'למאמר' : 'לשנה'} + מע"מ`;
}
function renderProducts() {
  const box = $('[data-products]', root);
  const card = (p: Plan) => {
    const c = COPY[p.id] || { title: p.name, text: '' };
    const off = !(Number(p.unit_price) > 0);
    const unit = p.unit === 'month' ? 'לחודש' : p.unit === 'item' ? 'למאמר' : 'לשנה';
    return `<button type="button" class="cm-product" role="radio" aria-checked="false" data-plan="${esc(p.id)}" ${off ? 'disabled' : ''}><span class="rdot" aria-hidden="true"></span><strong>${esc(c.title)}</strong><span class="cm-d">${esc(c.text)}</span><span class="cm-price">${off ? '<small>המחיר ייקבע בקרוב</small>' : `<span>${esc(ils(p.unit_price))}</span><small>${unit}, לפני מע״מ</small>`}</span></button>`;
  };
  const pk = plans.filter((p) => p.kind === 'listing' || kindOf(p) === 'card'), ad = plans.filter((p) => !pk.includes(p));
  box.innerHTML = plans.length ? `<p class="cm-group">חבילות</p>${pk.map(card).join('')}${ad.length ? `<p class="cm-group">תוספות ומודעות</p>${ad.map(card).join('')}` : ''}` : '<p class="muted">המוצרים לא זמינים כרגע.</p>';
  $$('[data-plan]', box).forEach((b) => b.addEventListener('click', () => select(plans.find((x) => x.id === b.dataset.plan)!)));
}

async function pick(p: Plan, target = '') { await select(p, target); go(2); }
async function select(p: Plan, target = '') {
  plan = p; renew = ''; quote = null;
  $$('[data-plan]', root).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.plan === p.id)));
  summary(null);
  const k = kindOf(p); const slots = $('[data-slots]', root);
  $('[data-step2-title]', root).textContent = k === 'listing' ? 'באיזה תחום ועיר להופיע' : k === 'article' ? 'על מה המאמר' : k === 'card' ? 'שדרוג כרטיס' : 'באיזה עמוד להופיע';
  if (k === 'listing') {
    const max = Number(p.limits?.slots) || 1, nat = p.limits?.scope === 'nationwide';
    slots.innerHTML = `<p class="small muted">${nat ? 'בוחרים תחום אחד. המשרד יוצג בראש העמוד הארצי של התחום ובבלוק המשרדים בעמוד הבית.' : max > 1 ? `אפשר לבחור עד ${max} צירופים של תחום ועיר.` : 'בוחרים תחום אחד ועיר אחת.'}</p><div data-rows></div>${max > 1 ? '<button type="button" class="btn btn-s" data-add style="align-self:flex-start">הוספת צירוף</button>' : ''}`;
    const rows = $('[data-rows]', slots);
    const addRow = () => {
      if ($$('.cm-row', rows).length >= max) return;
      const d = document.createElement('fieldset'); d.className = 'cm-row'; const n = $$('.cm-row', rows).length + 1; const id = 'sl' + n + '-' + Date.now();
      d.innerHTML = `<legend class="sr">צירוף ${n}</legend><div class="field"><label for="${id}a">תחום</label><select id="${id}a" data-area>${opt(T.areas, 'בחרו תחום')}</select></div>${nat ? '' : `<div class="field"><label for="${id}c">עיר</label><select id="${id}c" data-city>${opt(T.cities, 'בחרו עיר')}</select></div>`}${max > 1 ? `<button type="button" class="btn btn-s" data-del aria-label="הסרת צירוף ${n}">הסרה</button>` : ''}`;
      rows.appendChild(d); d.querySelector('[data-del]')?.addEventListener('click', () => { if ($$('.cm-row', rows).length > 1) { d.remove(); requote(); } });
      d.querySelectorAll('select').forEach((el) => el.addEventListener('change', requote));
    };
    addRow(); slots.querySelector('[data-add]')?.addEventListener('click', addRow);
  } else if (k === 'court' || k === 'provider' || k === 'tool') {
    const list = k === 'tool' ? T.tools : T.courts; const cap = k === 'court' ? 3 : k === 'provider' ? 4 : 1;
    const inv = (await rpc('fol_inventory', { p_kind: k })) || {};
    slots.innerHTML = `<div class="field"><label for="o-target">${k === 'tool' ? 'הכלי' : 'בית המשפט'}</label><select id="o-target" data-target><option value="">בחרו</option>${list.map((x: any) => { const used = Number(inv[x.slug] || 0), free = cap - used; return `<option value="${esc(x.slug)}" ${free <= 0 ? 'disabled' : ''}>${esc(x.name)} (${free <= 0 ? 'תפוס' : `פנוי: ${free} מתוך ${cap}`})</option>`; }).join('')}</select></div>`
      + (k === 'provider' ? `<div class="field"><label for="o-months">לכמה חודשים</label><select id="o-months" data-months>${(p.limits?.months || [1, 3, 6, 12]).map((m: number) => `<option value="${m}">${m === 1 ? 'חודש אחד' : m + ' חודשים'} (${ils(Number(p.unit_price) * m)} + מע"מ)</option>`).join('')}</select></div>` : '')
      + `<p class="cm-avail">המקומות מתעדכנים בזמן אמת. מקום נשמר רק אחרי התשלום.</p>`;
    if (target) (slots.querySelector('[data-target]') as HTMLSelectElement).value = target;
  } else if (k === 'article') {
    slots.innerHTML = `<div class="field"><label for="o-topic">נושא המאמר</label><input id="o-topic" data-topic maxlength="120" /></div><div class="field"><label for="o-barea">תחום</label><select id="o-barea" data-barea>${opt(T.areas, 'בחרו תחום')}</select></div><div class="field"><label for="o-points">נקודות שחשוב לכם שיופיעו (לא חובה)</label><textarea id="o-points" data-points maxlength="1500"></textarea></div><div class="field"><label for="o-aud">למי המאמר מיועד (לא חובה)</label><input id="o-aud" data-aud maxlength="200" /></div><p class="small muted">צוות התוכן כותב טיוטה, אתם מקבלים קישור לאישור, ורק אחרי האישור המאמר עולה עם התווית "תוכן ממומן".</p>`;
  } else {
    slots.innerHTML = `<p>השדרוג פותח את הפרופיל המורחב של המשרד לשנה. אחרי התשלום נכנסים לאזור המשרדים ומעדכנים תיאור, לוגו, תמונות וסרטון. בכרטיס המורחב לא מוצגים משרדים אחרים. הפרופיל עובר בדיקה אוטומטית לפני הפרסום.</p>`;
  }
  slots.querySelectorAll('select,input,textarea').forEach((el) => el.addEventListener('change', requote));
  requote();
}

function step2(): string {
  const k = kindOf(plan!);
  if (k === 'listing') {
    const rows = $$('.cm-row', root).map((r) => ({ area: (r.querySelector('[data-area]') as HTMLSelectElement).value, city: (r.querySelector('[data-city]') as HTMLSelectElement | null)?.value || null }));
    if (rows.some((r) => !r.area || (plan!.limits?.scope !== 'nationwide' && !r.city))) return 'נא לבחור תחום ועיר בכל שורה.';
  } else if (['court', 'provider', 'tool'].includes(k)) { if (!($('[data-target]', root) as HTMLSelectElement).value) return 'נא לבחור עמוד.'; }
  else if (k === 'article') { if (($('[data-topic]', root) as HTMLInputElement).value.trim().length < 5) return 'נא לכתוב את נושא המאמר.'; if (!($('[data-barea]', root) as HTMLSelectElement).value) return 'נא לבחור תחום.'; }
  return '';
}
function prepareStep3() {
  const k = kindOf(plan!);
  $('[data-ad]', root).classList.toggle('cm-hidden', k !== 'provider');
  const choice = $('[data-firm-choice]', root), fresh = $('[data-firm-new]', root);
  if (k === 'provider') { choice.innerHTML = ''; fresh.classList.add('cm-hidden'); return; }
  if (myFirms.length) {
    choice.innerHTML = `<div class="field"><label for="f-mine">עבור איזה משרד</label><select id="f-mine">${myFirms.map((f) => `<option value="${esc(f.slug)}">${esc(f.name)}</option>`).join('')}<option value="">משרד חדש שעוד לא באתר</option></select></div>`;
    const sync = () => fresh.classList.toggle('cm-hidden', !!($('#f-mine') as HTMLSelectElement).value);
    $('#f-mine').addEventListener('change', sync); sync();
  } else {
    choice.innerHTML = `<p class="small muted">המשרד כבר מופיע באתר? <a href="${esc(root.dataset.claim!)}">מאשרים בעלות</a> ואז קונים מאזור המשרדים. אחרת ממלאים כאן את פרטי המשרד.</p>`;
    fresh.classList.toggle('cm-hidden', k === 'card');
    if (k === 'card') choice.innerHTML = `<p>שדרוג כרטיס הוא למשרד שכבר מופיע באתר. <a href="${esc(root.dataset.portal!)}">היכנסו לאזור המשרדים</a> או <a href="${esc(root.dataset.claim!)}">אשרו בעלות על הפרופיל</a>, וחזרו לכאן.</p>`;
  }
}
const val = (id: string) => (($('#' + id) as HTMLInputElement | null)?.value || '').trim();
function body(): any {
  const k = kindOf(plan!); const b: any = { plan: plan!.id, contact: { name: val('c-name'), email: val('c-mail'), phone: val('c-phone') } };
  if (renew) return { renew, contact: b.contact, installments: Number(val('o-inst')) || 1, auto_renew: ($('#o-auto') as HTMLInputElement).checked, auto_renew_consent: ($('#o-auto-ok') as HTMLInputElement).checked };
  if (k === 'listing') b.slots = $$('.cm-row', root).map((r) => ({ area: (r.querySelector('[data-area]') as HTMLSelectElement).value, city: (r.querySelector('[data-city]') as HTMLSelectElement | null)?.value || null }));
  if (['court', 'provider', 'tool'].includes(k)) b.target = ($('[data-target]', root) as HTMLSelectElement).value;
  if (k === 'provider') { b.months = Number(($('[data-months]', root) as HTMLSelectElement).value); b.advertiser = { name: val('a-name'), category: val('a-cat'), phone: val('a-phone'), website: val('a-web'), text: val('a-text') }; }
  if (k === 'article') b.brief = { topic: ($('[data-topic]', root) as HTMLInputElement).value, area: ($('[data-barea]', root) as HTMLSelectElement).value, points: ($('[data-points]', root) as HTMLTextAreaElement).value, audience: ($('[data-aud]', root) as HTMLInputElement).value };
  const mine = ($('#f-mine') as HTMLSelectElement | null)?.value;
  if (k !== 'provider') { if (mine) b.firm_slug = mine; else b.firm = { name: val('f-name'), city: val('f-city'), address: val('f-addr'), website: val('f-web'), phone: val('f-phone') || val('c-phone'), areas: [...($('#f-areas') as HTMLSelectElement).selectedOptions].map((o) => o.value).slice(0, 10) }; }
  b.installments = Number(val('o-inst')) || 1;
  b.auto_renew = ($('#o-auto') as HTMLInputElement).checked; b.auto_renew_consent = ($('#o-auto-ok') as HTMLInputElement).checked;
  return b;
}
async function toSummary() {
  const m = $('[data-msg3]', root);
  say(m, 'בודקים מחיר וזמינות...', 'info');
  const q = await api('quote', body(), true);
  if (q.status !== 200) return say(m, errText(q), 'bad');
  quote = q; m.className = 'msg';
  const k = kindOf(plan!), c = COPY[plan!.id] || { title: plan!.name };
  summary(q);
  $('[data-summary]', root).innerHTML = `<table class="cm-sum"><caption class="sr">סיכום ההזמנה</caption><tr><td>מוצר</td><td>${esc(c.title)}</td></tr>${q.months ? `<tr><td>תקופה</td><td>${q.months} חודשים</td></tr>` : `<tr><td>תקופה</td><td>שנה מיום התשלום</td></tr>`}<tr><td>לפני מע״מ</td><td>${ils(q.net)}</td></tr><tr><td>מע״מ</td><td>${ils(q.vat)}</td></tr><tr class="total"><td>סך הכול</td><td>${ils(q.total)}</td></tr></table>`;
  const inst = $('#o-inst') as HTMLSelectElement; const max = Math.max(1, Number(q.max_installments) || 1);
  inst.innerHTML = Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i === 0 ? 'תשלום אחד' : `${i + 1} תשלומים (${ils(q.total / (i + 1))} לחודש)`}</option>`).join('');
  $('[data-auto]', root).classList.toggle('cm-hidden', !['court', 'tool', 'provider', 'card'].includes(k));
  go(4);
}
async function pay() {
  const m = $('[data-msg4]', root); const btn = $('[data-pay]', root) as HTMLButtonElement;
  if (!($('#o-terms') as HTMLInputElement).checked) return say(m, 'צריך לאשר את תנאי השימוש.', 'bad');
  if (($('#o-auto') as HTMLInputElement).checked && !($('#o-auto-ok') as HTMLInputElement).checked) return say(m, 'לחידוש אוטומטי צריך לסמן גם את תיבת האישור. אפשר גם להוריד את הסימון ולחדש בקישור.', 'bad');
  btn.disabled = true; say(m, test ? 'מבצעים רכישת בדיקה...' : 'פותחים דף תשלום...', 'info');
  const r = await api(test ? 'checkout_test' : 'checkout', body(), true);
  btn.disabled = false;
  if (r.status !== 200) return say(m, errText(r), 'bad');
  if (r.url) { location.href = r.url; return; }
  done(r.result?.ends_at, true);
}
function done(endsAt: string | null, isTest: boolean) {
  $$('[data-step]', root).forEach((s) => s.classList.add('cm-hidden')); $$('[data-steps] li').forEach((li) => (li.dataset.on = 'true'));
  const sb = $('[data-sbar]'); if (sb) sb.hidden = true;
  const d = $('[data-done]', root); d.classList.remove('cm-hidden');
  d.innerHTML = `<h2 class="h3" style="font:var(--serif-w) var(--fs-24)/1.3 var(--serif)">ההזמנה הופעלה</h2><p>${isTest ? 'זו הייתה רכישת בדיקה, בלי חיוב. ' : 'התשלום התקבל. '}הכול הופעל אוטומטית${endsAt ? ` עד ${esc(heDate(endsAt))}` : ''}. שלחנו מייל עם הפרטים${isTest ? ' (במצב בדיקה המייל נשמר בתיבת היוצא של מנהל האתר)' : ' והקבלה'}.</p><p><a class="btn btn-p btn-lg" href="${esc(root.dataset.portal!)}">לאזור המשרדים</a></p>`;
}
async function poll(order: string) {
  $$('[data-step]', root).forEach((s) => s.classList.add('cm-hidden'));
  const top = $('[data-top]', root); say(top, 'מחכים לאישור התשלום...', 'info');
  for (let i = 0; i < 30; i++) {
    const o = await api('order_status', { order });
    if (o.status === 200 && o.state === 'paid') { top.className = 'msg'; return done(o.ends_at, !!o.test); }
    if (o.status === 200 && o.state === 'review') return say(top, 'התשלום התקבל ועובר בדיקה קצרה אצלנו. נעדכן אתכם במייל.', 'info');
    await new Promise((res) => setTimeout(res, 3000));
  }
  say(top, 'התשלום עוד לא אושר. אם חויבתם, הכול יופעל אוטומטית תוך כמה דקות ותקבלו מייל.', 'info');
}
async function startRenew(raw: string) {
  const r = await api('renew_info', { renew: raw });
  if (r.status !== 200) return say($('[data-top]', root), errText(r), 'bad');
  renew = raw; plan = plans.find((x) => x.id === r.plan) || ({ id: r.plan, name: r.name, kind: '', unit: 'year', unit_price: null, limits: {}, period_months: 12, sort: 0 } as Plan);
  say($('[data-top]', root), `חידוש: ${r.name}, ${r.item}${r.firm ? `, ${r.firm}` : ''}. התקופה הנוכחית ${r.status === 'expired' ? 'הסתיימה' : 'מסתיימת'} ב ${heDate(r.ends_at)}.`, 'info');
  if (r.contact) { ($('#c-name') as HTMLInputElement).value = r.contact.name || ''; ($('#c-mail') as HTMLInputElement).value = r.contact.email || ''; ($('#c-phone') as HTMLInputElement).value = r.contact.phone || ''; }
  $('[data-step="1"]', root).classList.add('cm-hidden');
  $('[data-firm-choice]', root).innerHTML = ''; $('[data-firm-new]', root).classList.add('cm-hidden'); $('[data-ad]', root).classList.add('cm-hidden');
  go(3);
}

root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-next="2"]')) { if (!plan) return say($('[data-msg1]', root), 'נא לבחור מוצר.', 'bad'); go(2); return; }
  if (t.matches('[data-back]')) { const cur = Number(t.closest('[data-step]')!.getAttribute('data-step')); go(renew && cur <= 3 ? 3 : Math.max(1, cur - 1)); }
  if (t.matches('[data-next="3"]')) { const err = step2(); if (err) return say($('[data-msg2]', root), err, 'bad'); prepareStep3(); go(3); }
  if (t.matches('[data-next="4"]')) toSummary();
  if (t.matches('[data-pay]')) pay();
});
$('[data-sbar-next]')?.addEventListener('click', () => {
  const b = $(cur === 1 ? '[data-next="2"]' : cur === 2 ? '[data-next="3"]' : cur === 3 ? '[data-next="4"]' : '[data-pay]', root) as HTMLButtonElement;
  b?.click();
});
load();
