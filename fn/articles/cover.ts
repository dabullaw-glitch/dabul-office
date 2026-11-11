// Article cover image, made on the server (no browser): SVG in the office look -> PNG.
// 11.11.2026 (Yakir: "תשים לב איפה אתה שם את הנקודותיים בתמונות"): resvg lays every <text> line out left to right, so a
// colon or question mark at the end of a Hebrew line jumped to its right side. Each Hebrew line is now wrapped in
// RLM marks (U+200F), which keeps the punctuation at the line's real end (left). Checked with resvg 2.6.2 + Heebo.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';
export const ICONS: Record<string, string> = {
  house: '<path d="M60 150 L160 70 L260 150" /><path d="M85 135 V250 H235 V135" /><rect x="140" y="185" width="40" height="65" /><rect x="100" y="155" width="30" height="28" /><rect x="190" y="155" width="30" height="28" />',
  building: '<rect x="70" y="80" width="90" height="170" /><rect x="170" y="130" width="80" height="120" /><path d="M90 105h20M130 105h10M90 135h20M130 135h10M90 165h20M130 165h10M90 195h20M130 195h10M190 155h40M190 185h40M190 215h40" /><path d="M250 60 V250 M250 60 H300 M290 60 V95" />',
  document: '<path d="M95 60 H195 L235 100 V250 H95 Z" /><path d="M195 60 V100 H235" /><path d="M120 135 H210 M120 165 H210 M120 195 H180" /><circle cx="215" cy="225" r="22" /><path d="M205 225 l8 8 l14 -16" />',
  scales: '<path d="M160 60 V245 M110 245 H210 M80 100 H240" /><path d="M80 100 L50 170 H110 Z" /><path d="M240 100 L210 170 H270 Z" /><circle cx="160" cy="60" r="10" />',
  key: '<circle cx="110" cy="150" r="45" /><circle cx="110" cy="150" r="15" /><path d="M155 150 H265 M235 150 V180 M260 150 V175" />',
  family: '<circle cx="110" cy="95" r="25" /><circle cx="210" cy="95" r="25" /><circle cx="160" cy="150" r="18" /><path d="M70 240 V160 Q110 130 150 160 V240 M170 240 V160 Q210 130 250 160 V240" />',
};
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
// a Hebrew line, held right to left from both ends (see the note at the top)
const rtl = (s: string) => '‏' + esc(s) + '‏';
let ready: Promise<void> | null = null; let fonts: Uint8Array[] = [];
const CDN: Record<string, string> = {
  wasm: 'https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm',
  '400': 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/400Regular/Heebo_400Regular.ttf',
  '800': 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/800ExtraBold/Heebo_800ExtraBold.ttf',
};
const fromCdn = async (k: string) => { const r = await fetch(CDN[k]); if (!r.ok) throw new Error('cover asset ' + k + ' ' + r.status); return new Uint8Array(await r.arrayBuffer()); };
export async function init(load: (u: string) => Promise<Uint8Array> = fromCdn) {
  if (!ready) ready = (async () => {
    await initWasm(await load('wasm'));
    fonts = [await load('400'), await load('800')];
  })().catch((e) => { ready = null; throw e; });
  return ready;
}
// picks the icon and the small heading above the title from the article's topic
export function pick(text: string): { icon: string; kicker: string } {
  const t = text || '';
  if (/התחדשות|תמ"?א|תמ״א|פינוי|בית משותף|בתים משותפים|נציגות/.test(t)) return { icon: 'building', kicker: 'התחדשות עירונית ובתים משותפים' };
  if (/שכיר|שוכר|משכיר|דייר|סאבלט|airbnb/i.test(t)) return { icon: 'key', kicker: 'שכירות ודיירות' };
  if (/ירוש|צוואה|עיזבון|ייפוי כוח|יורש/.test(t)) return { icon: 'family', kicker: 'ירושה ונכסים' };
  if (/מס |מיסוי|מס שבח|מס רכישה|היטל|פטור/.test(t)) return { icon: 'scales', kicker: 'מיסוי מקרקעין' };
  if (/חוזה|רישום|טאבו|הערת אזהרה|זיכרון דברים|נסח/.test(t)) return { icon: 'document', kicker: 'חוזים ורישום מקרקעין' };
  return { icon: 'house', kicker: 'מקרקעין ונדל״ן' };
}
// wrap by approximate width (Heebo 800 ~0.5em avg for Hebrew)
function wrap(t: string, size: number, max: number): string[] {
  const words = t.split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (n.length * size * 0.5 > max && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur); return lines;
}
// Layout v2 (8.10.2026): everything sits in a safe zone (x 150-1050, y 170-520), because the site's article cards crop
// about 85px from each side and put the category label over the top right corner, and social previews crop too.
export function svg(title: string, kicker: string, icon: string): string {
  const W = 500; let size = title.length > 60 ? 46 : title.length > 40 ? 52 : 58; let lines = wrap(title, size, W);
  while (lines.length > 4 && size > 36) { size -= 4; lines = wrap(title, size, W); }
  const lh = size * 1.2, blockH = 46 + lines.length * lh + 70; let y0 = Math.round(345 - blockH / 2); if (y0 < 190) y0 = 190;
  const tspans = lines.map((l, i) => `<text x="1045" y="${Math.round(y0 + 46 + size * 0.9 + i * lh)}" font-size="${size}" font-weight="800" fill="#3f2f1b">${rtl(l)}</text>`).join('');
  const yLine = Math.round(y0 + 46 + lines.length * lh + 22), yFoot = yLine + 46;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="g" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#5c4528"/><stop offset="1" stop-color="#8b6f47"/></linearGradient>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8f5f0"/><stop offset="1" stop-color="#efe8dd"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="12" fill="#8b6f47"/><rect y="618" width="1200" height="12" fill="#8b6f47"/>
<rect x="160" y="165" width="300" height="300" rx="34" fill="url(#g)"/><rect x="176" y="181" width="268" height="268" rx="24" fill="none" stroke="#f6f2ec" stroke-opacity=".35" stroke-width="2"/>
<g transform="translate(160,170) scale(0.92) translate(1,8)" stroke="#f6f2ec" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ICONS.house}</g>
<g font-family="Heebo" direction="rtl" text-anchor="end">
<text x="1045" y="${y0 + 28}" font-size="26" font-weight="800" fill="#8b6f47">${rtl(kicker)}</text>
${tspans}
<rect x="985" y="${yLine}" width="60" height="4" rx="2" fill="#c9a961"/>
<text x="1045" y="${yFoot}" font-size="24" fill="#5c4528"><tspan font-weight="800">עו״ד יקיר דבול</tspan><tspan font-weight="400">  •  דיני מקרקעין · נתניה</tspan></text>
</g></svg>`;
}
export function render(title: string, kicker: string, icon: string): Uint8Array {
  const r = new Resvg(svg(title, kicker, icon), { font: { fontBuffers: fonts, defaultFontFamily: 'Heebo', loadSystemFonts: false }, fitTo: { mode: 'original' } });
  return r.render().asPng();
}
