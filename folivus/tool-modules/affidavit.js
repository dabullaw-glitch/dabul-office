// מחולל תבנית תצהיר - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// לפי סעיף 15 לפקודת הראיות [נוסח חדש], התשל"א-1971.

export const CONFIG = {};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

export function generate(inputs = {}) {
  const warnings = [];
  const facts = lines(inputs.statements);
  if (!inputs.declarant_name) warnings.push("חסר שם המצהיר.");
  if (!inputs.declarant_id) warnings.push("חסר מספר תעודת זהות של המצהיר.");
  if (!facts.length) warnings.push("כתבו את העובדות, שורה לכל עובדה. תצהיר מכיל עובדות שבידיעתכם, לא טענות משפטיות.");
  const court = inputs.case_number || inputs.court_name;
  const female = inputs.gender === "female";
  const v = (m, f) => (female ? f : m);

  const caption = court ? `<p>${val(inputs.court_name)}<br>${inputs.case_number ? `תיק מס' ${esc(inputs.case_number)}` : ""}</p>
<p>${val(inputs.party_a)} &nbsp; נגד &nbsp; ${val(inputs.party_b)}</p>` : "";

  const html = `<div dir="rtl" lang="he">
${caption}
<h1>תצהיר</h1>
<p>אני ${v("החתום", "החתומה")} מטה, ${val(inputs.declarant_name)}, ת"ז ${val(inputs.declarant_id)}, מ${val(inputs.declarant_address)}, לאחר ${v("שהוזהרתי", "שהוזהרתי")} כי ${v("עליי", "עליי")} להצהיר את האמת וכי ${v("אהיה צפוי", "אהיה צפויה")} לעונשים הקבועים בחוק אם לא אעשה כן, ${v("מצהיר", "מצהירה")} בזה בכתב כדלקמן:</p>
${inputs.purpose ? `<p>${v("אני נותן", "אני נותנת")} תצהיר זה ${esc(inputs.purpose)}.</p>` : ""}
<ol>${facts.length ? facts.map((f) => `<li>${esc(f)}</li>`).join("") : "<li>__________</li>"}</ol>
<p>זה שמי, זו חתימתי ותוכן תצהירי אמת.</p>
<p>__________________<br>${val(inputs.declarant_name)}</p>
<h2>אישור</h2>
<p>אני ${v("הח\"מ", "הח\"מ")}, עו"ד __________, מ.ר. __________, מאשר/ת בזה כי ביום ${date(inputs.sign_date)} הופיע/ה בפניי ב${val(inputs.sign_place)} ${val(inputs.declarant_name)}, ${v("שזיהה עצמו", "שזיהתה עצמה")} באמצעות ת"ז ${val(inputs.declarant_id)}${inputs.known_personally ? " / המוכר/ת לי אישית" : ""}, ולאחר ${v("שהזהרתיו", "שהזהרתיה")} כי ${v("עליו", "עליה")} להצהיר את האמת וכי ${v("יהיה צפוי", "תהיה צפויה")} לעונשים הקבועים בחוק אם לא ${v("יעשה", "תעשה")} כן, ${v("אישר", "אישרה")} את נכונות הצהרתו/ה וחתם/ה עליה בפניי.</p>
<p>__________________<br>חתימה וחותמת עורך הדין</p>
<p><em>תבנית כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי. תצהיר נחתם בפני עורך דין או גורם מוסמך אחר, שמזהיר את המצהיר ומאשר זאת על גבי התצהיר.</em></p>
</div>`;
  warnings.push("אל תחתמו לפני הפגישה עם עורך הדין: החתימה נעשית בפניו, אחרי האזהרה.");
  warnings.push("תצהיר כוזב הוא עבירה פלילית. כתבו רק עובדות שאתם יודעים, ובמקום שהידיעה היא מפי אחרים, ציינו זאת.");
  return { title: "תצהיר", html, warnings };
}
