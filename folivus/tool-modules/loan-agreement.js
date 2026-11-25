// מחולל הסכם הלוואה בין אנשים פרטיים - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// תקרת עלות אשראי למלווה בעיסוק: ריבית בנק ישראל + 15 נקודות האחוז (TheMarker, חוק אשראי הוגן, עודכן 7.11.2026).
// סעיף 9 לחוק ההתיישנות: הודאה בכתב או ביצוע מקצת הזכות מתחילים את תקופת ההתיישנות מחדש.

export const CONFIG = {
  year: 2026,
  boiRate: 3.25, // ריבית בנק ישראל, נכון ל-7.11.2026 (TheMarker)
  boiRateDate: "7.11.2026",
  capPoints: 15, // תוספת מרבית לעלות אשראי בהלוואה שקלית לפי חוק אשראי הוגן
  maxScheduleRows: 120,
};

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
const r2 = (x) => Math.round(x * 100) / 100;

export function schedule(amount, annualRate, count) {
  const P = Number(amount), n = Math.round(Number(count)), r = Number(annualRate) / 100 / 12;
  if (!(P > 0) || !(n >= 1)) return null;
  const payment = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
  let balance = P, totalInterest = 0;
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    let principal = payment - interest;
    if (i === n) principal = balance;
    balance -= principal;
    totalInterest += interest;
    rows.push({ i, payment: r2(principal + interest), principal: r2(principal), interest: r2(interest), balance: r2(Math.max(0, balance)) });
  }
  return { payment: r2(payment), totalInterest: r2(totalInterest), totalPaid: r2(P + totalInterest), rows };
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.lender_name) warnings.push("חסר שם המלווה.");
  if (!inputs.borrower_name) warnings.push("חסר שם הלווה.");
  const amount = Number(inputs.amount);
  if (!(amount > 0)) warnings.push("חסר סכום ההלוואה.");
  if (!parseDate(inputs.transfer_date)) warnings.push("חסר מועד העברת הכסף. רשמו אותו ושמרו אסמכתה על ההעברה.");
  const rate = Number(inputs.annual_rate) > 0 ? Number(inputs.annual_rate) : 0;
  const cap = CONFIG.boiRate + CONFIG.capPoints;
  if (isTrue(inputs.lender_in_business)) {
    warnings.push(`מלווה שנותן הלוואות כעיסוק כפוף לחוק אשראי הוגן: חובות גילוי, חוזה בכתב ותקרת עלות אשראי (ריבית בנק ישראל ועוד ${CONFIG.capPoints} נקודות האחוז, כ-${cap}% נכון ל-${CONFIG.boiRateDate}). הטיוטה הזו אינה מיועדת להלוואה כזו, ומומלץ להתייעץ עם עורך דין.`);
    if (rate > cap) warnings.push(`הריבית שהוזנה (${rate}%) עולה על תקרת עלות האשראי לפי חוק אשראי הוגן (כ-${cap}% נכון ל-${CONFIG.boiRateDate}).`);
  }
  const inst = inputs.repayment_type !== "lump_sum";
  let sch = null;
  if (inst) {
    if (!(Number(inputs.installments) >= 1)) warnings.push("חסר מספר התשלומים החודשיים.");
    if (!parseDate(inputs.first_payment_date)) warnings.push("חסר מועד התשלום הראשון.");
    sch = schedule(amount, rate, inputs.installments);
  } else if (!parseDate(inputs.final_date)) warnings.push("חסר מועד ההחזר.");
  if (inputs.guarantor_name && !inputs.guarantor_id) warnings.push("חסר מספר זהות של הערב.");

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם הלוואה</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.lender_name)}, ת"ז ${blank(inputs.lender_id)}, מכתובת ${blank(inputs.lender_address)} (להלן: "המלווה")</p>`);
  p.push(`<p><strong>לבין:</strong> ${blank(inputs.borrower_name)}, ת"ז ${blank(inputs.borrower_id)}, מכתובת ${blank(inputs.borrower_address)} (להלן: "הלווה")</p>`);
  p.push(sec("ההלוואה", `<p>המלווה מלווה ללווה ${money(amount)}${inputs.purpose ? `, לצורך ${esc(String(inputs.purpose).trim())}` : ""}. הסכום הועבר או יועבר ללווה ביום ${heDate(inputs.transfer_date)} בהעברה בנקאית, והלווה מאשר בחתימתו את קבלתו לאחר ההעברה.</p>`));
  p.push(sec("ריבית והצמדה", `<p>${rate > 0 ? `ההלוואה נושאת ריבית שנתית של ${rate}%, המחושבת על יתרת הקרן.` : "ההלוואה אינה נושאת ריבית."} ${isTrue(inputs.index_linked) ? "קרן ההלוואה צמודה למדד המחירים לצרכן. מדד הבסיס הוא המדד הידוע ביום העברת הכסף." : "ההלוואה אינה צמודה למדד."}</p>`));
  if (inst && sch) {
    const d0 = parseDate(inputs.first_payment_date);
    const rows = sch.rows.slice(0, CONFIG.maxScheduleRows).map((r) => `<tr><td>${r.i}</td><td>${d0 ? fmtDate(addMonths(d0, r.i - 1)) : "________"}</td><td>${money(r.payment)}</td><td>${money(r.principal)}</td><td>${r.interest > 0 ? money(r.interest) : "0 ₪"}</td><td>${r.balance > 0 ? money(r.balance) : "0 ₪"}</td></tr>`).join("");
    p.push(sec("החזר ההלוואה", `<p>הלווה יחזיר את ההלוואה ב-${sch.rows.length} תשלומים חודשיים של ${money(sch.payment)}${isTrue(inputs.index_linked) ? " (בתוספת הפרשי הצמדה)" : ""}, החל מיום ${heDate(inputs.first_payment_date)} ובאותו יום בכל חודש. סך כל ההחזרים: ${money(sch.totalPaid)}, מתוכם ריבית ${sch.totalInterest > 0 ? money(sch.totalInterest) : "0 ₪"}.</p><table><tr><th>מס'</th><th>מועד</th><th>תשלום</th><th>קרן</th><th>ריבית</th><th>יתרה</th></tr>${rows}</table>${sch.rows.length > CONFIG.maxScheduleRows ? "<p>יתרת הלוח בנספח.</p>" : ""}`));
  } else if (inst) {
    p.push(sec("החזר ההלוואה", `<p>הלווה יחזיר את ההלוואה ב-________ תשלומים חודשיים שווים, החל מיום ${heDate(inputs.first_payment_date)}.</p>`));
  } else {
    p.push(sec("החזר ההלוואה", `<p>הלווה יחזיר את מלוא ההלוואה${rate > 0 ? " בצירוף הריבית" : ""}${isTrue(inputs.index_linked) ? " והפרשי ההצמדה" : ""} בתשלום אחד, עד יום ${heDate(inputs.final_date)}.</p>`));
  }
  p.push(sec("פירעון מוקדם", `<p>הלווה רשאי לפרוע את ההלוואה, כולה או חלקה, לפני המועד, בלי עמלה. ריבית תחושב רק עד יום הפירעון בפועל.</p>`));
  p.push(sec("קבלות", `<p>המלווה ימסור ללווה אישור בכתב על כל תשלום, וכן אישור על סילוק מלא של ההלוואה בתום הפירעון. תשלום יבוצע בהעברה בנקאית לחשבון שהמלווה יודיע עליו בכתב.</p>`));
  p.push(sec("פיגור והפרה", `<p>תשלום שלא שולם במועד יישא הפרשי הצמדה וריבית לפי חוק פסיקת ריבית והצמדה, התשכ"א-1961, מהמועד ועד התשלום בפועל.${flag(inputs.acceleration, true) ? " פיגר הלווה בשני תשלומים, רצופים או לא, ולא תיקן את הפיגור בתוך 14 ימים מקבלת התראה בכתב, רשאי המלווה להעמיד את כל יתרת ההלוואה לפירעון מיידי." : ""}</p>`));
  if (inputs.guarantor_name) {
    p.push(sec("ערבות", `<p>${blank(inputs.guarantor_name)}, ת"ז ${blank(inputs.guarantor_id)} (להלן: "הערב"), ערב לקיום התחייבויות הלווה לפי הסכם זה, עד לסכום הקרן בצירוף ריבית והצמדה לפי ההסכם. הערב מאשר שקרא את ההסכם, הבין אותו וקיבל העתק ממנו.</p>`));
  }
  p.push(sec("שונות", `<p>שינוי בהסכם ייעשה בכתב בלבד. ויתור או ארכה שניתנו פעם אחת לא ייחשבו לוויתור כללי.</p>`));
  const parties = [{ role: "המלווה", name: inputs.lender_name }, { role: "הלווה", name: inputs.borrower_name }];
  if (inputs.guarantor_name) parties.push({ role: "הערב", name: inputs.guarantor_name });
  p.push(`<h2>חתימות</h2>`, signTable(parties), DISCLAIMER, `</div>`);
  return { title: "הסכם הלוואה", html: p.join("\n"), warnings };
}
