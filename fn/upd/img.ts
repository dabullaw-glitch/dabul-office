// The post image of the office updates board (31.10.2026): 1080x1080, office colors (navy #17253F, gold #C6A03C), Heebo,
// the office logo. SVG made here and turned into PNG on the server with resvg (no browser), like the article covers.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
let imgReady: Promise<void> | null = null;
let LOADER: (k: string) => Promise<Uint8Array> = (k) => bytesOf(k);
export const setLoader = (f: (k: string) => Promise<Uint8Array>) => { LOADER = f; };
let FONTS: Uint8Array[] = []; let LOGO = '';
const ASSET: Record<string, string> = {
  wasm: 'https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm',
  '400': 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/400Regular/Heebo_400Regular.ttf',
  '700': 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/700Bold/Heebo_700Bold.ttf',
  '800': 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/800ExtraBold/Heebo_800ExtraBold.ttf',
  logo: 'https://dabullaw-glitch.github.io/dabul-office/media/magazine/template/img/logo-full.png',
};
const bytesOf = async (k: string) => { const r = await fetch(ASSET[k]); if (!r.ok) throw new Error('image asset ' + k + ' ' + r.status); return new Uint8Array(await r.arrayBuffer()); };
const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
async function imgInit() {
  if (!imgReady) imgReady = (async () => {
    await initWasm(await LOADER('wasm'));
    FONTS = [await LOADER('400'), await LOADER('700'), await LOADER('800')];
    LOGO = 'data:image/png;base64,' + b64(await LOADER('logo'));
  })().catch((e) => { imgReady = null; throw e; });
  return imgReady;
}
// wrap by approximate width (Heebo, Hebrew ~0.52em average)
function wrap(t: string, size: number, max: number, k = 0.52): string[] {
  const words = String(t || '').split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (n.length * size * k > max && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur); return lines;
}
export function postSvg(p: { kicker: string; headline: string; sub: string; points: string[]; source: string }) {
  const R = 990, W = 900;
  let hs = 76; let hl = wrap(p.headline, hs, W, 0.55);
  while (hl.length > 3 && hs > 52) { hs -= 6; hl = wrap(p.headline, hs, W, 0.55); }
  const subL = wrap(p.sub, 35, W).slice(0, 3);
  const pts = (p.points || []).slice(0, 3);
  let y = 128;
  const parts: string[] = [];
  parts.push(`<rect x="${R - 70}" y="${y - 40}" width="70" height="6" rx="3" fill="#C6A03C"/>`);
  parts.push(`<text x="${R}" y="${y + 12}" font-size="36" font-weight="700" fill="#C6A03C">${esc(p.kicker)}</text>`);
  y += 40;
  hl.forEach((l) => { y += hs * 1.12; parts.push(`<text x="${R}" y="${Math.round(y)}" font-size="${hs}" font-weight="800" fill="#F5F1E8">${esc(l)}</text>`); });
  y += 34; parts.push(`<rect x="${R - 260}" y="${Math.round(y)}" width="260" height="6" rx="3" fill="#C6A03C"/>`); y += 22;
  subL.forEach((l) => { y += 48; parts.push(`<text x="${R}" y="${Math.round(y)}" font-size="35" font-weight="400" fill="#D9DEE8">${esc(l)}</text>`); });
  y += 30;
  pts.forEach((t) => {
    const lines = wrap(t, 32, W - 140).slice(0, 2); const h = 30 + lines.length * 42;
    if (y + h > 892) return;
    parts.push(`<rect x="90" y="${Math.round(y)}" width="${R - 90}" height="${h}" rx="18" fill="#FFFFFF" fill-opacity="0.06" stroke="#C6A03C" stroke-opacity="0.45" stroke-width="2"/>`);
    parts.push(`<circle cx="${R - 44}" cy="${Math.round(y + h / 2)}" r="22" fill="none" stroke="#C6A03C" stroke-width="3"/><path d="M${R - 54} ${Math.round(y + h / 2)} l7 8 l14 -16" fill="none" stroke="#C6A03C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
    lines.forEach((l, i) => parts.push(`<text x="${R - 86}" y="${Math.round(y + 15 + 32 + i * 42)}" font-size="32" font-weight="700" fill="#F5F1E8">${esc(l)}</text>`));
    y += h + 12;
  });
  const sky = [[0, 60, 120], [70, 110, 80], [200, 40, 150], [260, 70, 100], [380, 90, 170], [500, 50, 110], [570, 80, 140], [690, 60, 90], [790, 90, 160], [920, 70, 100], [1000, 80, 60]]
    .map(([x, w, h]) => `<rect x="${x}" y="${930 - h}" width="${w}" height="${h}" fill="#FFFFFF" fill-opacity="0.035"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1080" viewBox="0 0 1080 1080">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#22355A"/><stop offset="0.55" stop-color="#17253F"/><stop offset="1" stop-color="#0F1A2E"/></linearGradient></defs>
<rect width="1080" height="1080" fill="url(#bg)"/>${sky}
<g font-family="Heebo" direction="rtl" text-anchor="end">${parts.join('\n')}
<text x="${R}" y="914" font-size="24" font-weight="400" fill="#AEB7C7">${esc(p.source)}</text></g>
<rect y="932" width="1080" height="148" fill="#0B1424"/><rect y="932" width="1080" height="4" fill="#C6A03C"/>
<image x="60" y="963" width="363" height="86" xlink:href="${LOGO}" href="${LOGO}" preserveAspectRatio="xMinYMid meet"/>
<g font-family="Heebo" direction="ltr" text-anchor="end"><text x="${R}" y="1020" font-size="34" font-weight="700" fill="#F5F1E8">09-8613413  ·  dabullaw.co.il</text></g>
</svg>`;
}
export async function renderPost(p: { kicker: string; headline: string; sub: string; points: string[]; source: string }) {
  await imgInit();
  return new Resvg(postSvg(p), { font: { fontBuffers: FONTS, defaultFontFamily: 'Heebo', loadSystemFonts: false }, fitTo: { mode: 'original' } }).render().asPng();
}

