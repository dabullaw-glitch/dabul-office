// מחולל הסכם פריסת חוב (הסדר תשלומים) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// סעיף 9 לחוק ההתיישנות, התשי"ח-1958: הודאה בכתב או ביצוע מקצת הזכות מתחילים את תקופת ההתיישנות מחדש. אומת 25.11.2026.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const blank = (s, w = "____________") => (s !== undefined && s !== null && String(s).trim() ? esc(String(s).trim()) : w);
const lines = (s) => String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const isTrue = (v) => v === true || v === "true";
const flag = (v, d = false) => (v === undefined || v === null || v === "" ? d : isTrue(v));
const numOr = (v, d) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));
function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const fmtDate = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
const heDate = (s) => (parseDate(s) ? fmtDate(parseDate(s)) : "____________");
const money = (x) => (Number(x) > 0 ? Number(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪" : "____________ ₪");
const ul = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const warnBox = (w) => (w.length ? `<div class="warnings"><h3>לבדיקה לפני חתימה או משלוח</h3><ul>${w.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "");
const signTable = (parties) => `<table><tr>${parties.map((p) => `<th>${p.role}</th>`).join("")}</tr><tr>${parties.map((p) => `<td>${blank(p.name)}<br>חתימה: __________</td>`).join("")}</tr></table>`;
const DISCLAIMER = `<p class="disclaimer"><strong>טיוטה כללית, מומלץ להתייעץ עם עורך דין.</strong> המסמך הופק אוטומטית בכלי של פוליבוס לפי הפרטים שהוזנו, ואינו ייעוץ משפטי. כל מקרה שונה, ולכן כדאי שעורך דין יבדוק את הנוסח לפני חתימה או משלוח.</p>`;

function addMonths(d, k) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1));
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), last));
  return r;
}

export function plan(debt, discountPct, down, count) {
  const D = Number(debt), k = Math.round(Number(count));
  if (!(D > 0) || !(k >= 1)) return null;
  const disc = Math.min(100, Math.max(0, Number(discountPct) || 0));
  const settled = Math.round(D * (1 - disc / 100) * 100) / 100;
  const dp = Math.min(settled, Math.max(0, Number(down) || 0));
  const rest = Math.round((settled - dp) * 100) / 100;
  const base = Math.floor((rest / k) * 100) / 100;
  const amounts = Array.from({ length: k }, () => base);
  amounts[k - 1] = Math.round((rest - base * (k - 1)) * 100) / 100;
  return { settled, down: dp, rest, amounts };
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.creditor_name) warnings.push("חסר שם הנושה.");
  if (!inputs.debtor_name) warnings.push("חסר שם החייב.");
  if (!inputs.debt_source) warnings.push("לא פורט מקור החוב.");
  const pl = plan(inputs.debt_amount, inputs.discount_percent, inputs.down_payment, inputs.installments);
  if (!pl) warnings.push("חסרים סכום החוב או מספר התשלומים.");
  const d0 = parseDate(inputs.first_date);
  if (!d0) warnings.push("חסר מועד התשלום הראשון.");
  if (Number(inputs.down_payment) > 0 && pl && Number(inputs.down_payment) > pl.settled) warnings.push("התשלום הראשון גבוה מסכום ההסדר.");
  if (isTrue(inputs.existing_case) && !inputs.case_number) warnings.push("סומן שקיים תיק, אבל לא הוזן מספרו.");
  const grace = inputs.grace_days === undefined || inputs.grace_days === "" ? 14 : Math.max(0, Math.round(Number(inputs.grace_days)) || 0);
  const disc = Number(inputs.discount_percent) > 0;

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם להסדר תשלומים של חוב</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.creditor_name)}, ת"ז/ח.פ. ${blank(inputs.creditor_id)} (להלן: "הנושה")</p><p><strong>לבין:</strong> ${blank(inputs.debtor_name)}, ת"ז/ח.פ. ${blank(inputs.debtor_id)} (להלן: "החייב")</p>`);
  p.push(sec("החוב", `<p>החייב מאשר שהוא חייב לנושה ${money(inputs.debt_amount)} בגין ${blank(inputs.debt_source)} (להלן: "החוב").${isTrue(inputs.existing_case) ? ` בגין החוב מתנהל הליך מספר ${blank(inputs.case_number)}.` : ""}</p>`));
  if (pl) {
    const rows = pl.amounts.map((a, i) => `<tr><td>${i + 1}</td><td>${d0 ? fmtDate(addMonths(d0, i)) : "________"}</td><td>${money(a)}</td></tr>`).join("");
    p.push(sec("הסדר התשלומים", `<p>${disc ? `בכפוף לתשלום מלא ובמועד של כל התשלומים, הנושה יסתפק בסך ${money(pl.settled)} (הנחה של ${Number(inputs.discount_percent)}%). ` : ""}${pl.down > 0 ? `החייב ישלם ${money(pl.down)} במעמד החתימה, ואת היתרה, ${money(pl.rest)}, ` : `החייב ישלם ${money(pl.rest)} `}ב-${pl.amounts.length} תשלומים חודשיים, לפי הלוח הבא, בהעברה בנקאית לחשבון שהנושה יודיע עליו בכתב:</p><table><tr><th>מס'</th><th>מועד</th><th>סכום</th></tr>${rows}</table>`));
  }
  p.push(sec("פיגור", `<p>לא שולם תשלום במועדו, ישלח הנושה לחייב התראה בכתב. לא תוקן הפיגור בתוך ${grace} ימים מקבלת ההתראה, ${disc ? "תתבטל ההנחה, ו" : ""}כל יתרת החוב${disc ? " המקורי" : ""}, בניכוי מה ששולם, תעמוד לפירעון מיידי בתוספת הפרשי הצמדה וריבית כחוק, והנושה יהיה רשאי לפעול לגבייתה.</p>`));
  if (isTrue(inputs.existing_case)) p.push(sec("ההליך הקיים", `<p>הצדדים יגישו הסכם זה להליך ${blank(inputs.case_number)} ויבקשו לעכב את ההליכים כל עוד התשלומים משולמים במועדם. עם סיום התשלומים יבקש הנושה לסגור את ההליך.</p>`));
  p.push(sec("הצהרת החייב", `<p>החייב מצהיר שקרא את ההסכם והבין אותו, ושידוע לו שחתימתו מהווה הודאה בחוב, ושהודאה בכתב ותשלום על חשבון החוב מתחילים את תקופת ההתיישנות מחדש לפי סעיף 9 לחוק ההתיישנות, התשי"ח-1958.</p>`));
  p.push(sec("סילוק", `<p>עם השלמת כל התשלומים, הנושה ימסור לחייב אישור בכתב על סילוק מלא של החוב, ולא יהיו לו טענות נוספות בגינו.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "הנושה", name: inputs.creditor_name }, { role: "החייב", name: inputs.debtor_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם להסדר תשלומים של חוב", html: p.join("\n"), warnings };
}
