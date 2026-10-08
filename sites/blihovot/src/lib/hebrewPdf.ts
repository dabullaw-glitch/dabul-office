// Builds a Hebrew PDF in the browser: every page is drawn on a canvas (so right-to-left Hebrew renders correctly)
// and placed in jsPDF as an image. Used by the request helpers and anything else that needs a printable summary.
import { jsPDF } from 'jspdf';

export type Block =
  | { h: string }
  | { h2: string }
  | { p: string; muted?: boolean }
  | { kv: [string, string][] }
  | { list: string[]; check?: boolean }
  | { table: { head: string[]; rows: string[][] } }
  | { box: string }
  | { gap: number };

const W = 1240, H = 1754, M = 96, R = W - M, LINE = 1.45;
const INK = '#14233a', TEAL = '#0d6b63', MUTED = '#5a6475', LINEC = '#e4dacb', SAND = '#f6f1e8';

function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/); let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out;
}

export async function hebrewPdf(title: string, blocks: Block[], footer: string, fileName: string) {
  await Promise.all(['700 34px Heebo', '400 26px Heebo', '700 26px Heebo'].map((f) => document.fonts.load(f).catch(() => null)));
  const pages: string[] = [];
  let c: HTMLCanvasElement, g: CanvasRenderingContext2D, y = 0, n = 0;
  const newPage = () => {
    if (c) finish();
    c = document.createElement('canvas'); c.width = W; c.height = H; g = c.getContext('2d')!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.direction = 'rtl'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    n++; y = 110;
    g.fillStyle = TEAL; g.fillRect(0, 0, W, 14);
    g.font = '700 22px Heebo, Arial'; g.fillStyle = MUTED; g.fillText(title, R, 60);
    g.textAlign = 'left'; g.fillText(`עמוד ${n}`, M, 60); g.textAlign = 'right';
  };
  const finish = () => {
    g.font = '400 19px Heebo, Arial'; g.fillStyle = MUTED; g.textAlign = 'right';
    wrap(g, footer, W - 2 * M).forEach((l, i) => g.fillText(l, R, H - 70 + i * 26));
    pages.push(c.toDataURL('image/jpeg', 0.88));
  };
  const need = (h: number) => { if (y + h > H - 120) newPage(); };
  const text = (s: string, font: string, color: string, max = W - 2 * M, x = R) => {
    g.font = font; g.fillStyle = color; const size = parseInt(font.match(/(\d+)px/)![1]);
    for (const l of wrap(g, s, max)) { need(size * LINE); g.fillText(l, x, y + size); y += size * LINE; }
  };
  newPage();
  for (const b of blocks) {
    if ('gap' in b) { y += b.gap; continue; }
    if ('h' in b) { need(90); y += 10; text(b.h, '700 40px Heebo, Arial', INK); y += 8; continue; }
    if ('h2' in b) { need(80); y += 18; text(b.h2, '700 30px Heebo, Arial', TEAL); g.fillStyle = LINEC; g.fillRect(M, y + 4, W - 2 * M, 3); y += 18; continue; }
    if ('p' in b) { text(b.p, '400 25px Heebo, Arial', b.muted ? MUTED : INK); y += 8; continue; }
    if ('box' in b) {
      g.font = '400 25px Heebo, Arial'; const lines = wrap(g, b.box, W - 2 * M - 48); const h = lines.length * 25 * LINE + 36;
      need(h); g.fillStyle = SAND; g.fillRect(M, y, W - 2 * M, h); g.fillStyle = INK; let yy = y + 18;
      for (const l of lines) { g.fillText(l, R - 24, yy + 25); yy += 25 * LINE; } y += h + 14; continue;
    }
    if ('kv' in b) {
      for (const [k, v] of b.kv) {
        g.font = '400 25px Heebo, Arial'; const vl = wrap(g, v || '-', (W - 2 * M) * 0.55); const h = Math.max(1, vl.length) * 25 * LINE + 10;
        need(h); g.font = '700 25px Heebo, Arial'; g.fillStyle = INK; g.fillText(k, R, y + 25);
        g.font = '400 25px Heebo, Arial'; vl.forEach((l, i) => g.fillText(l, R - (W - 2 * M) * 0.42, y + 25 + i * 25 * LINE));
        y += h; g.fillStyle = LINEC; g.fillRect(M, y - 4, W - 2 * M, 1);
      }
      y += 10; continue;
    }
    if ('list' in b) {
      b.list.forEach((item, i) => {
        g.font = '400 25px Heebo, Arial'; const lines = wrap(g, item, W - 2 * M - 50); need(lines.length * 25 * LINE + 6);
        g.fillStyle = TEAL;
        if (b.check) { g.strokeStyle = TEAL; g.lineWidth = 2.5; g.strokeRect(R - 26, y + 6, 22, 22); } else { g.font = '700 25px Heebo, Arial'; g.fillText(`${i + 1}.`, R, y + 25); }
        g.font = '400 25px Heebo, Arial'; g.fillStyle = INK; lines.forEach((l, j) => g.fillText(l, R - 46, y + 25 + j * 25 * LINE)); y += lines.length * 25 * LINE + 6;
      });
      y += 8; continue;
    }
    if ('table' in b) {
      const cols = b.table.head.length, cw = (W - 2 * M) / cols;
      const row = (cells: string[], bold: boolean, bg?: string) => {
        g.font = `${bold ? 700 : 400} 23px Heebo, Arial`; const wrapped = cells.map((s) => wrap(g, s, cw - 20)); const h = Math.max(...wrapped.map((w) => w.length)) * 23 * LINE + 16;
        need(h); if (bg) { g.fillStyle = bg; g.fillRect(M, y, W - 2 * M, h); }
        g.fillStyle = INK; wrapped.forEach((ls, i) => ls.forEach((l, j) => g.fillText(l, R - i * cw - 10, y + 8 + 23 + j * 23 * LINE)));
        y += h; g.fillStyle = LINEC; g.fillRect(M, y - 1, W - 2 * M, 1);
      };
      row(b.table.head, true, SAND); b.table.rows.forEach((r) => row(r, false)); y += 14; continue;
    }
  }
  finish();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  pages.forEach((p, i) => { if (i) pdf.addPage(); pdf.addImage(p, 'JPEG', 0, 0, 210, 297); });
  pdf.save(fileName);
}

/** Plain-text version of the same blocks, for copying into a form or an email. */
export function blocksToText(blocks: Block[]): string {
  return blocks.map((b) => {
    if ('h' in b) return `\n${b.h}\n`;
    if ('h2' in b) return `\n${b.h2}`;
    if ('p' in b) return b.p;
    if ('box' in b) return b.box;
    if ('kv' in b) return b.kv.map(([k, v]) => `${k}: ${v || '-'}`).join('\n');
    if ('list' in b) return b.list.map((x, i) => (b.check ? '[ ] ' : `${i + 1}. `) + x).join('\n');
    if ('table' in b) return [b.table.head.join(' | '), ...b.table.rows.map((r) => r.join(' | '))].join('\n');
    return '';
  }).join('\n').trim();
}
