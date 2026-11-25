// מחולל הסכם פשרה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק החוזים (חלק כללי), התשל"ג-1973, סעיפים 23 (צורת חוזה) ו-39 (תום לב). אומת 25.11.2026.

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

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.party_a_name) warnings.push("חסר שם צד א'.");
  if (!inputs.party_b_name) warnings.push("חסר שם צד ב'.");
  if (!inputs.dispute) warnings.push("לא תוארה המחלוקת. בלי תיאור ברור לא ברור על מה חל הוויתור.");
  const amount = Number(inputs.amount) || 0;
  const payer = ["a_to_b", "b_to_a", "none"].includes(inputs.payer) ? inputs.payer : "b_to_a";
  if (payer !== "none" && amount > 0 && !parseDate(inputs.payment_date) && !inputs.installments_note) warnings.push("נקבע סכום פשרה בלי מועד תשלום.");
  if (payer !== "none" && !(amount > 0)) warnings.push("נבחר תשלום כספי, אבל לא הוזן סכום.");
  if (inputs.case_number && !isTrue(inputs.court_approval)) warnings.push("יש הליך תלוי ועומד. שקלו לבקש מבית המשפט לתת להסכם תוקף של פסק דין, כדי שאפשר יהיה לאכוף אותו בהוצאה לפועל.");
  if (isTrue(inputs.court_approval) && !inputs.case_number) warnings.push("כדי לבקש תוקף של פסק דין צריך הליך בבית משפט. הזינו מספר הליך או בטלו את הסימון.");
  const A = blank(inputs.party_a_name), B = blank(inputs.party_b_name);
  const from = payer === "a_to_b" ? A : B, to = payer === "a_to_b" ? B : A;

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם פשרה</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${A}, ת"ז/ח.פ. ${blank(inputs.party_a_id)} (להלן: "צד א'")</p><p><strong>לבין:</strong> ${B}, ת"ז/ח.פ. ${blank(inputs.party_b_id)} (להלן: "צד ב'")</p>`);
  p.push(`<p><strong>הואיל</strong> ובין הצדדים התגלעה מחלוקת בעניין: ${blank(inputs.dispute)} (להלן: "המחלוקת");</p>`);
  if (inputs.case_number) p.push(`<p><strong>והואיל</strong> והמחלוקת נדונה בהליך ${blank(inputs.case_number)} בבית המשפט ${blank(inputs.court_name, "________")} (להלן: "ההליך");</p>`);
  p.push(`<p><strong>והואיל</strong> והצדדים מעוניינים לסיים את המחלוקת בפשרה, בלי שמי מהם מודה בטענות הצד האחר;</p><p>לפיכך הוסכם בין הצדדים כך:</p>`);
  p.push(sec("המבוא", `<p>המבוא להסכם הוא חלק בלתי נפרד ממנו.</p>`));
  if (payer !== "none") {
    p.push(sec("תשלום", `<p>${from} ישלם ל${to} סך של ${money(amount)}, כסילוק מלא וסופי של המחלוקת${inputs.installments_note ? `, כך: ${esc(String(inputs.installments_note).trim())}` : `, עד יום ${heDate(inputs.payment_date)}`}. התשלום יבוצע בהעברה בנקאית לחשבון שיודיע עליו הצד המקבל בכתב.</p><p>לא שולם סכום במועדו, ולא תוקן הפיגור בתוך 7 ימים מהתראה בכתב, יעמוד כל הסכום שטרם שולם לפירעון מיידי, בתוספת הפרשי הצמדה וריבית כחוק מיום הפיגור.</p>`));
  }
  const other = lines(inputs.other_terms);
  if (other.length) p.push(sec("התחייבויות נוספות", ul(other)));
  if (flag(inputs.mutual_waiver, true)) p.push(sec("ויתור הדדי", `<p>עם ביצוע ההתחייבויות לפי הסכם זה, אין ולא יהיו לצדדים טענות או תביעות זה כלפי זה בקשר למחלוקת. הוויתור אינו חל על התחייבויות לפי הסכם זה ועל עניינים שאינם קשורים למחלוקת.</p>`));
  if (flag(inputs.no_admission, true)) p.push(sec("אין הודאה", `<p>הסכם זה נעשה לשם סיום המחלוקת בלבד, ואין בו הודאה של צד כלשהו בטענה כלשהי של הצד האחר.</p>`));
  if (isTrue(inputs.confidential)) p.push(sec("סודיות", `<p>הצדדים ישמרו בסוד את תנאי הסכם זה, ולא יגלו אותם לאחר, למעט ליועציהם, לרשויות לפי דין, או לבית המשפט לצורך אכיפת ההסכם.</p>`));
  if (inputs.case_number) p.push(sec("סיום ההליך", `<p>${isTrue(inputs.court_approval) ? `הצדדים יגישו לבית המשפט בקשה משותפת לתת להסכם זה תוקף של פסק דין, בתוך 7 ימים מהחתימה.` : `בתוך 7 ימים מהחתימה יגישו הצדדים בקשה משותפת לסיום ההליך ${blank(inputs.case_number)}.`}</p>`));
  p.push(sec("הוצאות", `<p>${inputs.costs === "payer" ? "הצד המשלם יישא גם בהוצאות המשפט ובשכר הטרחה של הצד האחר, בסכום שיוסכם." : "כל צד יישא בהוצאותיו ובשכר טרחת עורכי דינו."}</p>`));
  p.push(sec("שונות", `<p>הסכם זה ממצה את המוסכם בין הצדדים בעניין המחלוקת. שינוי בו ייעשה בכתב ובחתימת שני הצדדים. הצדדים מצהירים שקראו את ההסכם, הבינו אותו והייתה להם הזדמנות להתייעץ עם עורך דין לפני החתימה.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "צד א'", name: inputs.party_a_name }, { role: "צד ב'", name: inputs.party_b_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם פשרה", html: p.join("\n"), warnings };
}
