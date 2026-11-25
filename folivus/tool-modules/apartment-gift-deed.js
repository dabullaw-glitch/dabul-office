// מחולל טיוטת הסכם מתנה בדירה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// סעיף 5 לחוק המתנה, התשכ"ח-1968 (דרך גלובס). תקופות צינון של 3 ו-4 שנים לפי כל זכות (סעיפים 49 ו-62 לחוק מיסוי מקרקעין). אומת 25.11.2026.

export const CONFIG = {
  coolingYearsLived: 3, // כל זכות: 3 שנים מתחילת המגורים בדירה כבעלים
  coolingYearsNotLived: 4, // 4 שנים אם המקבל לא גר בדירה
  minorCountFromAge: 18,
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

const REL = { child: "ילדו של הנותן", grandchild: "נכדו של הנותן", spouse: "בן זוגו של הנותן", sibling: "אחיו של הנותן", other: "" };

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.giver_names) warnings.push("חסר שם הנותן.");
  if (!inputs.recipient_name) warnings.push("חסר שם המקבל.");
  if (!inputs.property_address) warnings.push("חסרה כתובת הדירה.");
  if (!inputs.gush || !inputs.helka) warnings.push("חסרים גוש וחלקה. העתיקו אותם מנסח הטאבו או מאישור הזכויות.");
  const rel = REL[inputs.relationship] !== undefined ? inputs.relationship : "child";
  if (rel === "other") warnings.push("המקבל אינו קרוב משפחה מהסוגים שבחוק. ייתכן שלא יחולו הפטור ממס שבח וההנחה במס רכישה. מומלץ להתייעץ לפני החתימה.");
  if (rel === "sibling") warnings.push("במתנה לאח או לאחות, הפטור ממס שבח חל רק בתנאים מסוימים (למשל דירה שהתקבלה בירושה או במתנה מההורים). בדקו לפני החתימה.");
  if (isTrue(inputs.recipient_minor)) warnings.push(`המקבל קטין. נדרש אישור ההורים כאפוטרופוסים, ובמקרים מסוימים אישור בית משפט. תקופת הצינון למכירה בפטור תימנה רק מגיל ${CONFIG.minorCountFromAge}.`);
  if (!flag(inputs.waive_withdrawal, true)) warnings.push("הנותן לא ויתר על זכותו לחזור בו. כל עוד המקבל לא שינה את מצבו בהסתמך על המתנה, הנותן רשאי לחזור בו.");

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם מתנה במקרקעין</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.giver_names)}, ת"ז ${blank(inputs.giver_ids)} (להלן: "הנותן")</p><p><strong>לבין:</strong> ${blank(inputs.recipient_name)}, ת"ז ${blank(inputs.recipient_id)}${isTrue(inputs.recipient_minor) ? ", קטין, באמצעות הוריו ואפוטרופסיו הטבעיים" : ""} (להלן: "המקבל")</p>`);
  p.push(`<p><strong>הואיל</strong> והנותן הוא הבעלים של הזכויות בדירה המתוארת להלן${REL[rel] ? `, והמקבל הוא ${REL[rel]}` : ""}; <strong>והואיל</strong> והנותן מעוניין להעביר למקבל את הזכויות במתנה, ללא תמורה;</p><p>לפיכך הוסכם כך:</p>`);
  p.push(sec("הנכס", `<p>הדירה ברחוב ${blank(inputs.property_address)}, הידועה כגוש ${blank(inputs.gush)} חלקה ${blank(inputs.helka)} תת חלקה ${blank(inputs.tat_helka)} (להלן: "הדירה"). הנותן נותן למקבל במתנה את ${blank(inputs.share, "כל הזכויות בדירה")}.</p>`));
  p.push(sec("ללא תמורה", `<p>המתנה ניתנת ללא תמורה כלשהי, מתוך אהבה וקרבה, והמקבל מקבל אותה.</p>`));
  p.push(sec("הצהרות הנותן", `<p>הנותן מצהיר שהזכויות בדירה רשומות על שמו, ושאין עליהן משכנתה, עיקול, הערה או זכות של צד שלישי, למעט: ____________. הנותן מצהיר שהוא עושה את ההסכם מרצונו החופשי, בדעה צלולה ובלי לחץ.</p>`));
  if (flag(inputs.waive_withdrawal, true)) p.push(sec("ויתור על זכות החזרה", `<p>הנותן מוותר בזה, בכתב, על זכותו לחזור בו מהתחייבותו לתת את המתנה, כאמור בסעיף 5 לחוק המתנה, התשכ"ח-1968.</p>`));
  if (isTrue(inputs.residence_right)) p.push(sec("זכות מגורים", `<p>לנותן שמורה הזכות להמשיך להתגורר בדירה כל ימי חייו, בלי תשלום. המקבל לא ימכור את הדירה, לא ישכיר אותה ולא ישעבד אותה באופן שפוגע בזכות זו, והצדדים רשאים לרשום הערה בדבר הזכות.</p>`));
  p.push(sec("דיווח, מסים ורישום", `<p>הצדדים ידווחו על העסקה לרשות המסים במועד הקבוע בחוק, ויבקשו את הפטורים וההנחות שהם זכאים להם. אגרות הרישום והוצאות ההעברה ישולמו בידי ________. לאחר קבלת האישורים הנדרשים יחתמו הצדדים על כל מסמך הדרוש לרישום הזכויות על שם המקבל.</p>`));
  p.push(sec("שונות", `<p>הצדדים מצהירים שהוסבר להם שמתנה לקרוב פטורה ממס שבח בתנאים שבחוק, ושהמקבל עשוי להיות כפוף לתקופת צינון לפני מכירה בפטור: ${CONFIG.coolingYearsLived} שנים מתחילת מגוריו בדירה כבעלים, או ${CONFIG.coolingYearsNotLived} שנים אם לא גר בה.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "הנותן", name: inputs.giver_names }, { role: "המקבל", name: inputs.recipient_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם מתנה במקרקעין", html: p.join("\n"), warnings };
}
