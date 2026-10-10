// Shared helpers for the office sample documents (RTL Hebrew, David font, A4).
const fs = require('fs');
const D = require('/opt/npm-tools/node_modules/docx');
const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Header, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType, PageNumber, VerticalAlign } = D;

const FONT = 'David';
const GOLD = 'A8873F', MUTE = '6C675D', INK = '1C1B19';
const FULL = 9638; // A4 text width in DXA with 1134 margins

function run(t, o = {}) {
  return new TextRun({ text: t, font: { name: FONT, cs: FONT }, rightToLeft: true, size: o.size || 24, sizeComplexScript: o.size || 24,
    bold: !!o.b, boldComplexScript: !!o.b, italics: !!o.i, italicsComplexScript: !!o.i, underline: o.u ? {} : undefined, color: o.color });
}
// rich text: array of strings or [text, opts]
const rich = (parts, base = {}) => parts.map((x) => (typeof x === 'string' ? run(x, base) : run(x[0], Object.assign({}, base, x[1]))));
function P(t, o = {}) {
  const children = Array.isArray(t) ? rich(t, o) : [run(t, o)];
  return new Paragraph({ bidirectional: true, keepNext: !!o.keepNext, pageBreakBefore: !!o.pageBreak,
    alignment: o.center ? AlignmentType.CENTER : (o.justify ? AlignmentType.JUSTIFIED : AlignmentType.RIGHT),
    spacing: { before: o.before || 0, after: o.after ?? 120, line: o.line || 320 },
    indent: o.ind ? { start: o.ind, hanging: o.hang || 0 } : undefined,
    border: o.rule ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 4 } } : undefined, children });
}
const Title = (t) => P(t, { b: true, size: 36, center: true, after: 60 });
const Sub = (t) => P(t, { size: 21, center: true, color: MUTE, after: 220 });
const Sec = (n, t) => P([[n + '.  ', { b: true }], [t, { b: true }]], { size: 25, before: 200, after: 100, keepNext: true, rule: false });
// numbered clause with hanging indent; level 1 = "3.1", level 2 = "3.1.1"
const Cl = (n, t, lvl = 1) => P([[n + '\t', { b: true }], ...(Array.isArray(t) ? t : [t])], { justify: true, ind: 567 * lvl + 284, hang: 567 + 284 * (lvl - 1) });
const Bul = (t, lvl = 1) => P(['•\t', ...(Array.isArray(t) ? t : [t])], { justify: true, ind: 567 * lvl + 284, hang: 284 });
const Gap = (n = 120) => P('', { after: n });
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: 'BFB6A2' };

function cell(content, o = {}) {
  const kids = (Array.isArray(content) ? content : [content]).map((x) => (typeof x === 'string' ? P(x, { size: o.size || 21, b: o.b, center: o.center, after: 40, line: 280 }) : x));
  return new TableCell({ width: { size: o.w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    borders: o.noBorder ? { top: NONE, bottom: NONE, left: NONE, right: NONE } : { top: LINE, bottom: LINE, left: LINE, right: LINE }, children: kids });
}
// table: widths (DXA, summing to FULL), header labels, rows (arrays of strings)
function Tbl(widths, head, rows, o = {}) {
  const tr = [];
  if (head) tr.push(new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, { w: widths[i], b: true, fill: 'F3EAD3', size: 20 })) }));
  rows.forEach((r) => tr.push(new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i], size: o.size || 20 })) })));
  return new Table({ width: { size: FULL, type: WidthType.DXA }, columnWidths: widths, visuallyRightToLeft: true, rows: tr });
}
// shaded note box
function Note(lines) {
  return new Table({ width: { size: FULL, type: WidthType.DXA }, columnWidths: [FULL], visuallyRightToLeft: true,
    rows: [new TableRow({ children: [new TableCell({ width: { size: FULL, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'F7F1E3', color: 'auto' },
      margins: { top: 140, bottom: 120, left: 200, right: 200 }, borders: { top: NONE, bottom: NONE, left: NONE, right: { style: BorderStyle.SINGLE, size: 18, color: GOLD } },
      children: lines.map((x, i) => P(x, { size: 20, b: i === 0, after: 60, line: 290, justify: i > 0 })) })] })] });
}
// signature blocks, side by side
function Sign(labels, o = {}) {
  const w = Math.floor(FULL / labels.length);
  return new Table({ width: { size: FULL, type: WidthType.DXA }, columnWidths: labels.map(() => w), visuallyRightToLeft: true,
    rows: [new TableRow({ cantSplit: true, children: labels.map((l) => cell([P('', { after: o.space || 500 }), P('_________________________', { center: true, after: 30 }),
      ...(Array.isArray(l) ? l : [l]).map((x, i) => P(x, { center: true, b: i === 0, size: i === 0 ? 22 : 19, color: i === 0 ? INK : MUTE, after: 20 }))], { w, noBorder: true })) })] });
}
function make(name, children, o = {}) {
  const footKids = [P([['עמוד '], ['__P__'], [' מתוך '], ['__T__']], { size: 17, center: true, color: MUTE, after: 20 })];
  // page numbers need field runs
  footKids[0] = new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [
    run('עמוד ', { size: 17, color: MUTE }), new TextRun({ children: [PageNumber.CURRENT], font: { name: FONT, cs: FONT }, size: 17, color: MUTE }),
    run(' מתוך ', { size: 17, color: MUTE }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: { name: FONT, cs: FONT }, size: 17, color: MUTE })] });
  if (o.initials) footKids.push(P('חתימות / ראשי תיבות של הצדדים: _____________   _____________', { size: 17, center: true, color: MUTE, after: 20 }));
  footKids.push(P('נוסח לדוגמה מאת יקיר דבול - משרד עורכי דין (dabullaw.co.il, 09-8613413). הנוסח כללי, אינו ייעוץ משפטי ואינו מחליף בדיקה של עורך דין לפי נסיבות העניין.', { size: 15, center: true, color: MUTE, after: 0, line: 240 }));
  const doc = new Document({ creator: 'יקיר דבול - משרד עורכי דין', title: o.title || name, styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 567, footer: 454 } } },
      headers: { default: new Header({ children: [process.env.FINAL ? P('יקיר דבול - משרד עורכי דין · dabullaw.co.il · 09-8613413', { size: 16, center: true, color: '8A6D2C', after: 0 }) : P('טיוטה לאישור עו״ד יקיר דבול. לא לפרסום.', { size: 16, center: true, color: 'B03A1E', after: 0 })] }) },
      footers: { default: new Footer({ children: footKids }) }, children }] });
  return Packer.toBuffer(doc).then((b) => fs.writeFileSync(name, b));
}
module.exports = { run, P, Title, Sub, Sec, Cl, Bul, Gap, Tbl, Note, Sign, make, FULL };
