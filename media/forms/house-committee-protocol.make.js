const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak, Footer } = require('docx');
const F = 'Arial';
const r = (t, o = {}) => new TextRun({ text: t, font: F, rightToLeft: true, size: o.size || 22, bold: o.bold, color: o.color });
const p = (runs, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align || AlignmentType.RIGHT, spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 300 }, children: Array.isArray(runs) ? runs : [r(runs, o)], border: o.border });
const h = (t) => p([r(t, { bold: true, size: 26, color: '5C4528' })], { before: 240, after: 120 });
const line = (label, n = 1) => p([r(label + ' ', { bold: true }), r('_'.repeat(Math.max(18, 62 - label.length * 1.15 | 0)))], { after: 160 });
const W = 9638; // A4 text width with 2cm margins (approx, DXA)
const cell = (t, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: o.head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F2E9D8' } : undefined, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [p([r(t, { bold: !!o.head, size: 20 })], { after: 0 })] });
const table = (cols, rows) => { const widths = cols.map((c) => c[1]); return new Table({ visuallyRightToLeft: true, columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows: [new TableRow({ tableHeader: true, children: cols.map((c) => cell(c[0], c[1], { head: true })) }), ...rows.map((row) => new TableRow({ children: row.map((t, i) => cell(t, widths[i])) }))] }); };
const blank = (n, k) => Array.from({ length: n }, (_, i) => Array.from({ length: k }, (_, j) => (j === 0 ? String(i + 1) : '')));
const children = [
  p([r('פרוטוקול אסיפה כללית של בעלי הדירות', { bold: true, size: 34, color: '5C4528' })], { align: AlignmentType.CENTER, after: 60 }),
  p([r('בחירת ועד בית (נציגות הבית המשותף)', { bold: true, size: 28, color: '8B6F47' })], { align: AlignmentType.CENTER, after: 240 }),
  h('פרטי הבניין והאסיפה'),
  line('כתובת הבניין:'), line('גוש / חלקה:'), line('מספר הדירות בבניין:'),
  line('מועד האסיפה (תאריך ושעה):'), line('מקום האסיפה:'),
  line('מועד חלופי שנקבע בהזמנה (אם אין מניין):'),
  p([r('אופן מסירת ההזמנה: ', { bold: true }), r('☐ נתלתה במקום בולט בבניין בתאריך ________   ☐ נמסרה לכל בעל דירה בתאריך ________')]),
  p([r('סדר היום שפורסם בהזמנה: ', { bold: true }), r('בחירת ועד בית' + ' ' + '_'.repeat(30))]),
  h('1. פתיחה ובדיקת מניין'),
  p([r('נכחו ________ בעלי דירות (כולל באי כוח עם ייפוי כוח חתום), מתוך ________ דירות בבניין. רשימת הנוכחים וייפויי הכוח מצורפים לפרוטוקול (נספח א׳).')]),
  p([r('☐ היה מניין במועד שנקבע   ☐ לא היה מניין, והאסיפה התקיימה במועד החלופי שנקבע מראש בהזמנה')]),
  h('2. בחירת יושב ראש ומזכיר לאסיפה'),
  line('יושב ראש האסיפה:'), line('מזכיר האסיפה:'),
  h('3. מספר חברי הוועד'),
  p([r('הוחלט שבוועד יכהנו ______ חברים (בין חבר אחד לחמישה).')]),
  h('4. המועמדים וההצבעה'),
  p([r('אופן ההצבעה: ☐ הרמת ידיים   ☐ הצבעה חשאית (לבקשת רבע מהנוכחים לפחות)')]),
  table([['#', 700], ['שם המועמד', 3100], ['דירה', 1300], ['בעד', 1500], ['נגד', 1500], ['נמנעים', 1538]], blank(5, 6)),
  h('5. ההחלטות'),
  p([r('נבחרו לוועד הבית: ')]), line('1.'), line('2.'), line('3.'),
  line('נבחר לגזבר:'),
  line('מורשי החתימה בחשבון הבנק של הוועד:'),
  p([r('תקופת הכהונה: עד האסיפה הכללית הרגילה הבאה, אלא אם תקנון הבית המשותף קובע אחרת.')]),
  line('החלטות נוספות:'), line(''),
  h('6. חתימות'),
  p([r('הפרוטוקול נרשם בספר ההחלטות של הבית המשותף.')]),
  p([r('יושב ראש האסיפה: ', { bold: true }), r('שם ______________   חתימה ______________')], { before: 200 }),
  p([r('מזכיר האסיפה: ', { bold: true }), r('שם ______________   חתימה ______________')], { before: 200 }),
  p([new PageBreak()]),
  h('נספח א׳: רשימת הנוכחים'),
  table([['דירה', 1100], ['שם בעל הדירה', 2700], ['נכח בעצמו / בא כוח (שם)', 3138], ['חתימה', 2700]], blank(14, 4).map((row) => ['', '', '', ''])),
  h('נספח ב׳: ייפוי כוח להצבעה באסיפה'),
  p([r('אני, ______________________, ת"ז ______________, בעל/ת הדירה מס׳ ______ בבניין ברחוב ____________________, מייפה בזה את כוחו/ה של ______________________, ת"ז ______________, להשתתף ולהצביע בשמי באסיפה הכללית של בעלי הדירות שתתקיים בתאריך ______________, ובכל אסיפה נדחית שלה.')]),
  p([r('תאריך: ______________   חתימה: ______________')], { before: 200 }),
  p([r('הערה: נוסח כללי לנוחות בעלי הדירות. הוא אינו ייעוץ משפטי, ותקנון מוסכם של הבניין עשוי לקבוע כללים אחרים לזימון, למניין ולהצבעה. לפני האסיפה כדאי לבדוק את התקנון החל על הבניין.', { size: 18, color: '6B7280' })], { before: 300 }),
];
const doc = new Document({
  styles: { default: { document: { run: { font: F, size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [p([r('יקיר דבול - משרד עורכי דין  |  רזיאל 1, נתניה  |  09-8613413  |  dabullaw.co.il', { size: 16, color: '8B6F47' })], { align: AlignmentType.CENTER, after: 0 })] }) },
    children }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync('house-committee-protocol.docx', b); console.log('ok', b.length); });
