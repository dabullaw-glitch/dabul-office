// מחולל מכתב הסכמה של הורה ליציאת ילד לחו"ל (עברית ואנגלית) - פוליבוס. מודול טהור.

export const CONFIG = {};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const enDate = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : "__________");
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

export function generate(inputs = {}) {
  const warnings = [];
  const kids = lines(inputs.children);
  if (!inputs.consenting_parent_name) warnings.push("חסר שם ההורה המסכים.");
  if (!kids.length) warnings.push("חסרים פרטי הילדים (שם, תאריך לידה ומספר דרכון).");
  if (!inputs.destination) warnings.push("חסר יעד הנסיעה.");
  const from = inputs.depart_date, to = inputs.return_date;
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && to < from) warnings.push("תאריך החזרה מוקדם מתאריך היציאה.");
  const english = !(inputs.include_english === false || inputs.include_english === "false");
  const kidsHe = kids.length ? `<ul>${kids.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : "<p>__________</p>";
  const kidsEn = kids.length ? `<ul>${kids.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : "<p>__________</p>";

  const he = `<div dir="rtl" lang="he">
<h1>הסכמת הורה ליציאת קטין מישראל</h1>
<p>אני, ${val(inputs.consenting_parent_name)}, ת"ז ${val(inputs.consenting_parent_id)}${inputs.consenting_parent_passport ? `, דרכון ${val(inputs.consenting_parent_passport)}` : ""}, מ-${val(inputs.consenting_parent_address)}, ההורה של הילדים המפורטים להלן:</p>
${kidsHe}
<p>מצהיר/ה בזה כי אני מסכים/ה שהילדים ייסעו אל ${val(inputs.destination)}, בין התאריכים ${date(from)} ו-${date(to)}, בליווי ${val(inputs.companion_name)}, ${val(inputs.companion_relation)}, ת"ז או דרכון ${val(inputs.companion_id)}.</p>
<p>במהלך הנסיעה אני מסכים/ה שהמלווה יקבל החלטות שוטפות ודחופות לטובת הילדים, לרבות טיפול רפואי דחוף.</p>
<p>ניתן ליצור איתי קשר בכל עת בטלפון ${val(inputs.consenting_parent_phone)} ובדוא"ל ${val(inputs.consenting_parent_email)}.</p>
<p>תאריך: ${date(inputs.sign_date)} &nbsp;&nbsp;&nbsp; חתימה: __________________</p>
</div>`;
  const en = english ? `<div dir="ltr" lang="en">
<h1>Parental Consent for Travel of a Minor</h1>
<p>I, ${val(inputs.consenting_parent_name)}, ID No. ${val(inputs.consenting_parent_id)}${inputs.consenting_parent_passport ? `, Passport No. ${val(inputs.consenting_parent_passport)}` : ""}, residing at ${val(inputs.consenting_parent_address)}, parent of the following child(ren):</p>
${kidsEn}
<p>hereby consent to their travel to ${val(inputs.destination)} from ${enDate(from)} to ${enDate(to)}, accompanied by ${val(inputs.companion_name)} (${val(inputs.companion_relation)}), ID/Passport No. ${val(inputs.companion_id)}.</p>
<p>During the trip I authorize the accompanying person to make day-to-day and urgent decisions for the child(ren), including urgent medical treatment.</p>
<p>I can be reached at any time at ${val(inputs.consenting_parent_phone)} or ${val(inputs.consenting_parent_email)}.</p>
<p>Date: ${enDate(inputs.sign_date)} &nbsp;&nbsp;&nbsp; Signature: __________________</p>
</div>` : "";
  const html = `${he}
${en}
<div dir="rtl" lang="he"><p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי. מדינות וחברות תעופה רבות דורשות שהחתימה תאומת בידי נוטריון, ולעיתים גם אפוסטיל.</em></p></div>`;
  warnings.push("בדקו מראש מול חברת התעופה ומול נציגות מדינת היעד אם נדרש אימות נוטריוני או אפוסטיל.");
  warnings.push("אם יש צו עיכוב יציאה מהארץ לילד, נדרשת הסכמה בדרך שקבע בית המשפט או הסרה של הצו.");
  return { title: "מכתב הסכמה ליציאת קטין לחו\"ל", html, warnings };
}
