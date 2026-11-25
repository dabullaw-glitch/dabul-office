// מחולל הסכם עם משפיען (שיתוף פעולה ממומן) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חובת גילוי קשר מסחרי לפי סעיף 2 לחוק הגנת הצרכן ועמדת הרשות להגנת הצרכן (מקורות משניים, ראו JSON). נבדק 25.11.2026.

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
  if (!inputs.brand_name) warnings.push("חסר שם המותג.");
  if (!inputs.influencer_name) warnings.push("חסר שם המשפיען.");
  const plats = lines(inputs.platforms), dels = lines(inputs.deliverables);
  if (!dels.length) warnings.push("לא פורטו התוצרים.");
  const disclosure = inputs.disclosure === undefined ? "פרסומת. שיתוף פעולה בתשלום עם" : String(inputs.disclosure).trim();
  if (!disclosure) warnings.push("לא נקבע נוסח סימון. כשיש קשר מסחרי, חובה לגלות בבירור שמדובר בפרסומת.");
  const fee = Number(inputs.fee) > 0 ? Number(inputs.fee) : 0;
  if (!fee && inputs.products) warnings.push("ניתנים מוצרים או הטבות בלי תמורה כספית. גם במקרה כזה חלה חובת גילוי.");
  if (!fee && !inputs.products) warnings.push("לא הוזנה תמורה. פרטו תשלום, מוצרים או הטבות.");
  const usage = Math.max(0, Math.round(Number(inputs.usage_months)) || 0);
  const excl = Math.max(0, Math.round(Number(inputs.exclusivity_days)) || 0);
  const BR = blank(inputs.brand_name);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם שיתוף פעולה שיווקי</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${BR}, ${blank(inputs.brand_id)} (להלן: "המותג")</p><p><strong>לבין:</strong> ${blank(inputs.influencer_name)}, ${blank(inputs.influencer_id)} (להלן: "היוצר")</p>`);
  p.push(sec("התוצרים", `<p>היוצר יפרסם בחשבונות הבאים:</p>${plats.length ? ul(plats) : "<p>____________</p>"}<p>את התוצרים הבאים, במועדים שלצידם:</p>${dels.length ? ul(dels) : "<p>____________</p>"}`));
  p.push(sec("התמורה", `<p>${fee ? `המותג ישלם ליוצר ${money(fee)} בתוספת מע"מ כדין, בתוך 30 ימים מפרסום כל התוצרים ומקבלת חשבונית.` : "לא משולמת תמורה כספית."}${inputs.products ? ` בנוסף יקבל היוצר: ${esc(String(inputs.products).trim())}.` : ""}</p>`));
  p.push(sec("סימון תוכן שיווקי", `<p>כל תוצר יסומן באופן ברור, בעברית ובמקום בולט שנראה מיד עם הצפייה, בנוסח: "${esc(disclosure || "פרסומת")} ${BR}", או בנוסח ברור דומה, וכן בכלי הסימון של הרשת אם קיים. הסימון לא יוסתר בין תגיות ולא יופיע רק בסוף הטקסט.</p>`));
  p.push(sec("אמינות", `<p>היוצר יביע את דעתו הכנה ולא יטען טענות עובדתיות על המוצר שאינן נכונות או שלא קיבל מהמותג. המותג ימסור ליוצר מידע נכון ומלא על המוצר, ואחראי לנכונותו.</p>`));
  if (flag(inputs.approval, true)) p.push(sec("אישור תוכן", `<p>היוצר יעביר כל תוצר לאישור המותג לפחות 48 שעות לפני הפרסום. המותג רשאי לבקש תיקונים סבירים, אך לא לדרוש הסרת הסימון או שינוי דעתו של היוצר.</p>`));
  p.push(sec("זכויות בתוכן", `<p>הזכויות בתוצרים שייכות ליוצר. ${usage ? `המותג רשאי לשתף את התוצרים ולהשתמש בהם בערוצים הדיגיטליים שלו במשך ${usage} חודשים מהפרסום, עם קרדיט ליוצר. שימוש בפרסום ממומן או בערוצים אחרים טעון הסכמה נפרדת בכתב.` : "המותג רשאי לשתף את התוצרים בחשבונותיו עם קרדיט ליוצר, ולא להשתמש בהם בדרך אחרת בלי הסכמה בכתב."}</p>`));
  if (excl) p.push(sec("בלעדיות", `<p>במשך ${excl} ימים מפרסום התוצר האחרון, היוצר לא יפרסם תוכן ממומן של מתחרה ישיר של המותג באותה קטגוריית מוצרים.</p>`));
  p.push(sec("מעמד היוצר", `<p>היוצר פועל כעצמאי, ואין בין הצדדים יחסי עובד ומעסיק. היוצר אחראי לדיווח ולתשלום המסים החלים עליו.</p>`));
  p.push(sec("סיום", `<p>צד רשאי לבטל את ההסכם אם הצד האחר הפר אותו הפרה יסודית ולא תיקן אותה בתוך 7 ימים מהתראה. בוטל ההסכם, תשולם תמורה יחסית לתוצרים שפורסמו.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המותג", name: inputs.brand_name }, { role: "היוצר", name: inputs.influencer_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם שיתוף פעולה שיווקי", html: p.join("\n"), warnings };
}
