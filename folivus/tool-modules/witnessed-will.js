// מחולל טיוטת צוואה בעדים - מודול טהור. לפי חוק הירושה, התשכ"ה-1965, סעיפים 20, 26, 35. נכון ל-2026.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const blank = (s, w = "____________") => (s && String(s).trim() ? esc(String(s).trim()) : w);
const lines = (s) => String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

function heDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${d}.${m}.${y}`;
}

export function generate(inputs = {}) {
  const warnings = [];
  const name = (inputs.testator_name || "").trim();
  const benef = lines(inputs.beneficiaries);
  const date = heDate(inputs.will_date);
  const w1 = (inputs.witness1_name || "").trim();
  const w2 = (inputs.witness2_name || "").trim();

  if (!name) warnings.push("לא הוזן שם המצווה.");
  if (!benef.length) warnings.push("לא הוזנו יורשים. צוואה בלי הוראות חלוקה אינה משיגה את מטרתה.");
  if (!date) warnings.push("לא הוזן תאריך תקין. לפי החוק צוואה בעדים צריכה להיות מצוינת בתאריך.");
  if (!w1 || !w2) warnings.push("צוואה בעדים דורשת שני עדים. יש להשלים את שמות שני העדים.");
  if (w1 && w2 && w1 === w2) warnings.push("שני העדים צריכים להיות שני אנשים שונים.");
  const benefText = [benef.join(" "), inputs.specific_bequests || "", inputs.alternate_beneficiaries || ""].join(" ");
  for (const w of [w1, w2]) {
    if (w && benefText.includes(w)) warnings.push(`שם העד "${w}" מופיע גם ברשימת הזוכים. הוראה בצוואה שמזכה עד, או את בן זוגו, בטלה. יש לבחור עד אחר.`);
  }
  if (inputs.executor_name && [w1, w2].includes(String(inputs.executor_name).trim())) warnings.push("מומלץ שמנהל העיזבון לא ישמש גם כעד.");

  const revoke = inputs.revoke_previous === undefined ? true : inputs.revoke_previous === true || inputs.revoke_previous === "true";
  const bequests = lines(inputs.specific_bequests);
  const alternates = lines(inputs.alternate_beneficiaries);

  let n = 0;
  const sec = (body) => `<p><strong>${++n}.</strong> ${body}</p>`;
  const parts = [];
  parts.push(`<div dir="rtl" lang="he">`);
  if (warnings.length) {
    parts.push(`<div class="warnings"><h3>יש להשלים או לתקן לפני חתימה</h3><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`);
  }
  parts.push(`<h1>צוואה</h1>`);
  parts.push(`<p>אני החתום/ה מטה, <strong>${blank(name)}</strong>, מספר זהות ${blank(inputs.testator_id)}, מרחוב ${blank(inputs.testator_address)}, עושה בזה את צוואתי, בהיותי בדעה צלולה, מרצוני החופשי ובלי שהופעלו עליי לחץ או השפעה מצד כלשהו.</p>`);
  if (revoke) parts.push(sec("אני מבטל/ת בזה כל צוואה או הוראה בדבר רכושי לאחר מותי שעשיתי לפני צוואה זו."));
  parts.push(sec("אני מורה ליורשיי לשלם מתוך עיזבוני, לפני כל חלוקה, את החובות שיהיו עליי ביום מותי ואת הוצאות הקבורה וניהול העיזבון."));
  if (bequests.length) {
    parts.push(sec(`אני מצווה את הנכסים הבאים לזוכים הבאים:</p><ul>${bequests.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p>`));
  }
  parts.push(sec(`את ${bequests.length ? "יתרת" : "כל"} רכושי, מכל מין וסוג, מקרקעין, כספים, זכויות ומיטלטלין, הנמצאים בישראל ובכל מקום אחר, אני מצווה כך:</p><ul>${(benef.length ? benef : ["____________"]).map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p>`));
  if (alternates.length) {
    parts.push(sec(`אם מי מהזוכים ילך לעולמו לפניי או לא יוכל לרשת, חלקו יעבור כך:</p><ul>${alternates.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p>`));
  }
  if (inputs.executor_name && String(inputs.executor_name).trim()) {
    parts.push(sec(`אני ממנה את ${esc(String(inputs.executor_name).trim())} למנהל/ת עיזבוני, לביצוע הוראות צוואה זו.`));
  }
  parts.push(sec("נוסח צוואה זו נקרא על ידי והוא משקף את רצוני."));
  parts.push(`<p>ולראיה באתי על החתום ב${blank(inputs.city, "________")}, ביום ${date || "____________"}, בפני שני העדים החתומים מטה, לאחר שהצהרתי בפניהם שזו צוואתי.</p>`);
  parts.push(`<p>חתימת המצווה: ______________________</p>`);
  parts.push(`<h2>אישור העדים</h2>`);
  parts.push(`<p>אנו החתומים מטה מאשרים כי המצווה, ${blank(name)}, שזיהינו אותו/ה, הצהיר/ה בפנינו ביום ${date || "____________"} שזו צוואתו/ה וחתם/ה עליה בפנינו, ואנו חותמים באותו מעמד כעדים. אנו מצהירים כי איננו זוכים לפי צוואה זו, איננו בני זוג של זוכה, ולא לקחנו חלק בעריכתה.</p>`);
  parts.push(`<table><tr><th>עד/ה ראשון/ה</th><th>עד/ה שני/ה</th></tr>`);
  parts.push(`<tr><td>שם: ${blank(w1)}</td><td>שם: ${blank(w2)}</td></tr>`);
  parts.push(`<tr><td>ת.ז.: ${blank(inputs.witness1_id)}</td><td>ת.ז.: ${blank(inputs.witness2_id)}</td></tr>`);
  parts.push(`<tr><td>כתובת: ${blank(inputs.witness1_address)}</td><td>כתובת: ${blank(inputs.witness2_address)}</td></tr>`);
  parts.push(`<tr><td>חתימה: __________</td><td>חתימה: __________</td></tr></table>`);
  parts.push(`<h2>דרישות החוק לצוואה בעדים (לקריאה לפני החתימה)</h2><ul>`);
  parts.push(`<li>הצוואה בכתב ומצוינת בתאריך.</li>`);
  parts.push(`<li>המצווה חותם בפני שני עדים, אחרי שהצהיר בפניהם שזו צוואתו.</li>`);
  parts.push(`<li>שני העדים מאשרים באותו מעמד, בחתימת ידם על הצוואה, שהמצווה הצהיר וחתם.</li>`);
  parts.push(`<li>הוראה שמזכה עד, את מי שערך את הצוואה או לקח חלק בעריכתה, או את בן הזוג של אחד מהם, בטלה.</li>`);
  parts.push(`<li>צוואה של קטין או של מי שהוכרז פסול דין, או צוואה שנעשתה כשהמצווה לא הבין את טיבה של צוואה, בטלה.</li>`);
  parts.push(`<li>מומלץ לחתום בשולי כל עמוד, לחתום על עותק מקורי אחד בלבד, ולשמור אותו במקום ידוע או להפקידו אצל הרשם לענייני ירושה.</li>`);
  parts.push(`</ul>`);
  parts.push(`<p class="disclaimer"><strong>חשוב:</strong> זוהי טיוטה כללית שנוצרה אוטומטית ואינה ייעוץ משפטי. צוואה שנוסחה או נחתמה שלא כדין עלולה להיות מותקפת ואף להתבטל. כשיש נכסים רבים, נדל"ן, עסק, ילדים קטינים, ילדים מקשרים שונים, חשש להתנגדות או מצב רפואי מורכב, מומלץ מאוד להיוועץ בעורך דין לפני החתימה.</p>`);
  parts.push(`</div>`);

  return {
    title: name ? `צוואה בעדים של ${name}` : "צוואה בעדים",
    html: parts.join("\n"),
    warnings,
  };
}
