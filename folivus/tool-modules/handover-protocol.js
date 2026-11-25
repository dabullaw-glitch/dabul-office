// מחולל פרוטוקול מסירת דירה - פוליבוס
// מפיק טיוטת פרוטוקול ב-HTML פשוט מימין לשמאל. ללא תלות חיצונית.

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const lines = (t) => String(t ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.buyer_names) warnings.push("חסר שם הקונה.");
  if (!inputs.address) warnings.push("חסרה כתובת הדירה.");
  if (!inputs.handover_date) warnings.push("חסר תאריך המסירה.");

  const defects = lines(inputs.defects);
  const defectRows = defects.length
    ? defects
        .map((l, i) => {
          const k = l.indexOf(":");
          const where = k > 0 ? l.slice(0, k) : "";
          const what = k > 0 ? l.slice(k + 1) : l;
          return `<tr><td>${i + 1}</td><td>${val(where)}</td><td>${esc(what.trim())}</td><td>&nbsp;</td></tr>`;
        })
        .join("")
    : `<tr><td>1</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>2</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>3</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;

  const inspector = inputs.inspector_present === true
    ? `<p>במסירה נכח מטעם הקונה בודק מקצועי: ${val(inputs.inspector_name)}.</p>`
    : "";

  const html = `<div dir="rtl" lang="he">
<h1>פרוטוקול מסירת דירה</h1>
<p><strong>תאריך המסירה:</strong> ${date(inputs.handover_date)}</p>
<h2>1. פרטי הצדדים והדירה</h2>
<table>
<tr><th>הקונה</th><td>${val(inputs.buyer_names)}</td></tr>
<tr><th>המוכר (החברה היזמית)</th><td>${val(inputs.seller_name)}</td></tr>
<tr><th>נציג המוכר במסירה</th><td>${val(inputs.seller_rep)}</td></tr>
<tr><th>הפרויקט</th><td>${val(inputs.project_name)}</td></tr>
<tr><th>כתובת</th><td>${val(inputs.address)}</td></tr>
<tr><th>מספר דירה וקומה</th><td>דירה ${val(inputs.apartment_number)}, קומה ${val(inputs.floor)}</td></tr>
<tr><th>חניה ומחסן</th><td>חניה: ${val(inputs.parking)}. מחסן: ${val(inputs.storage)}</td></tr>
</table>
${inspector}
<h2>2. קריאת מונים במועד המסירה</h2>
<table>
<tr><th>מונה</th><th>קריאה</th></tr>
<tr><td>מים</td><td>${val(inputs.water_meter)}</td></tr>
<tr><td>חשמל</td><td>${val(inputs.electricity_meter)}</td></tr>
<tr><td>גז</td><td>${val(inputs.gas_meter)}</td></tr>
</table>
<h2>3. מפתחות, שלטים ומסמכים שנמסרו</h2>
<ul>
<li>מספר מפתחות לדירה: ${val(inputs.keys_count)}</li>
<li>פריטים נוספים שנמסרו: ${val(inputs.items_delivered)}</li>
</ul>
<h2>4. ליקויים ואי התאמות שנמצאו במסירה</h2>
<table>
<tr><th>מס'</th><th>מיקום</th><th>תיאור הליקוי</th><th>מועד תיקון שסוכם</th></tr>
${defectRows}
</table>
<p>המוכר מתחייב לתקן את הליקויים שברשימה, בתיאום מראש עם הקונה.</p>
<h2>5. הערות נוספות</h2>
<p>${lines(inputs.notes).map(esc).join("<br>") || "__________"}</p>
<h2>6. שמירת זכויות</h2>
<p>חתימת הקונה על פרוטוקול זה מאשרת את קבלת החזקה בדירה בלבד. אין בה הסכמה לכך שהדירה תואמת את החוזה, את המפרט או את התוכניות, ואין בה ויתור על כל טענה או זכות של הקונה, לרבות בקשר לאי התאמה שלא נרשמה בפרוטוקול או שלא ניתן היה לגלותה בבדיקה סבירה במועד המסירה.</p>
<h2>7. חתימות</h2>
<table>
<tr><th>הקונה</th><th>נציג המוכר</th></tr>
<tr><td>שם: ${val(inputs.buyer_names)}<br>חתימה: __________</td><td>שם: ${val(inputs.seller_rep)}<br>חתימה: __________</td></tr>
</table>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה בדיקה של עורך דין או של בודק מוסמך.</em></p>
</div>`;
  return { title: "פרוטוקול מסירת דירה", html, warnings };
}
