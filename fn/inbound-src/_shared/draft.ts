// Turning a client's service request into a ready draft (used by the Telegram bot).
// The same instructions are used inside the office app, so drafts look the same wherever they start.

// deno-lint-ignore no-explicit-any
export const DRAFT_PROMPT = (parts: string, clients: string, st: any) => `אתה עורך דין ישראלי מנוסה שעובד במשרד ${st.office || 'עו״ד יקיר דבול'} בנתניה (מקרקעין, חדלות פירעון והסדרי חובות, צוואות וירושות, ייפוי כוח מתמשך, הסכמים).
לקוח ביקש שירות. אלה ההודעות שהועברו (מהלקוח, ולפעמים הערות של עורך הדין):
---
${parts}
---
לקוחות קיימים במשרד (JSON):
${clients}

המשימה: להכין טיוטה מוכנה לעבודה, כך שעורך הדין רק יעבור, יתקן וישלח.
החזר בדיוק בפורמט הבא, עם שלוש הכותרות:
===META===
{"clientId":"מזהה מהרשימה רק אם ברור שזה הלקוח, אחרת ריק","clientName":"שם הלקוח","phone":"טלפון אם מופיע","service":"סוג השירות בקצרה","docType":"מכתב / הסכם / כתב טענות / בקשה / ייפוי כוח / צוואה / חוות דעת / אחר","title":"כותרת קצרה לטיוטה","summary":"2 עד 3 משפטים: מה הלקוח מבקש","missing":["פרט שחסר להשלמת המסמך"],"next":["צעד הבא מומלץ למשרד"]}
===DRAFT===
המסמך המלא בעברית משפטית תקינה וברורה, מוכן לעריכה. כותרות בשורה נפרדת. במקום כל פרט חסר כתוב [להשלים: מה חסר].
===REPLY===
הודעת וואטסאפ קצרה ללקוח בשם המשרד: מאשרים שקיבלנו את הבקשה, מה השלב הבא, ומה צריך ממנו.

כללים מחייבים: עברית בלבד. בלי מקפים ארוכים. בלי סופרלטיבים ובלי הבטחות לתוצאה. אל תמציא עובדות, סכומים, תאריכים, מספרי תיקים או סעיפי חוק שאינך בטוח בהם; סמן אותם [להשלים]. חתימה: ${st.lawyer || 'יקיר דבול, עו״ד'}.`;

// deno-lint-ignore no-explicit-any
export function parseDraft(out: string): { meta: any; draft: string; reply: string } {
  const pick = (a: string, b: string) => { const i = out.indexOf(a); if (i < 0) return ''; const s = out.slice(i + a.length); const j = b ? s.indexOf(b) : -1; return (j >= 0 ? s.slice(0, j) : s).trim(); };
  // deno-lint-ignore no-explicit-any
  let meta: any = {};
  try { meta = JSON.parse((pick('===META===', '===DRAFT===').match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch { meta = {}; }
  const clean = (s: string) => s.replace(/\s*—\s*/g, ', ').replace(/–/g, '-').trim();
  let draft = clean(pick('===DRAFT===', '===REPLY==='));
  const reply = clean(pick('===REPLY===', ''));
  if (!draft) draft = clean(out);
  if (!Array.isArray(meta.missing)) meta.missing = [];
  if (!Array.isArray(meta.next)) meta.next = [];
  return { meta, draft, reply };
}

const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// a simple right-to-left Word document: headings bold and centred, the rest justified
export async function docxBytes(title: string, text: string) {
  const JSZip = (await import('npm:jszip@3.10.1')).default;
  const run = (t: string, b = false, size = 24) => `<w:r><w:rPr><w:rFonts w:ascii="David" w:hAnsi="David" w:cs="David"/>${b ? '<w:b/><w:bCs/>' : ''}<w:rtl/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  const para = (t: string, o: { b?: boolean; center?: boolean; size?: number } = {}) => `<w:p><w:pPr><w:bidi/><w:jc w:val="${o.center ? 'center' : 'both'}"/><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr>${t ? run(t, o.b, o.size) : ''}</w:p>`;
  const lines = String(text || '').split(/\r?\n/);
  const body = lines.map(l => {
    const s = l.trim();
    if (/^#{1,3}\s/.test(s)) return para(s.replace(/^#+\s*/, '').replace(/\*\*/g, ''), { b: true, center: true, size: 26 });
    if (/^\*\*.+\*\*$/.test(s)) return para(s.replace(/\*\*/g, ''), { b: true });
    return para(s.replace(/\*\*/g, ''));
  }).join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`;
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  z.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${x(title || '')}</dc:title><dc:creator>משרד עו״ד יקיר דבול</dc:creator></cp:coreProperties>`);
  z.file('word/document.xml', doc);
  return await z.generateAsync({ type: 'uint8array' });
}
