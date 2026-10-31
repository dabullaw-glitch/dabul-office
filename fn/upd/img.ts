// The post images of the office updates board (31.10.2026, second design after Yakir's notes: "משעמם, לא יצירתי").
// Built to stop the scroll: a real full-bleed photo (free-license Unsplash photos, never photos from news sites), a dark gradient
// for contrast, a giant key fact or question, a short hook, the office logo small. Four templates, picked by the content and
// rotated so the feed does not repeat itself:
//   number   giant number or fact in gold over the photo ("40 מ״ר"), the hook under it
//   question a bold question hook over a darkened photo, last line in gold
//   split    editorial: photo on top, deep navy panel with a serif headline, a gold badge with the key fact on the seam
//   list     "3 דברים שחשוב לדעת": frosted glass card over a blurred photo, gold numbers
// Sizes: 1080x1350 (feed, portrait) and 1080x1080. Fonts: Karantina (display), Heebo, Frank Ruhl Libre (as in the approved
// magazine). SVG made here, PNG on the server with resvg (no browser), like the article covers.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';

export type Tpl = 'number' | 'question' | 'split' | 'list';
export interface Card { tpl: Tpl; kicker: string; hero?: string; heroLabel?: string; hook: string; sub?: string; items?: string[]; photo: string }
// the photo library (Unsplash license), by subject; the model picks the subject, the code picks a photo in it
export const PHOTOS: Record<string, string[]> = {
  court: ['1575505586569-646b2ca898fc', '1589829545856-d10d557cf95f', '1589994965851-a8f479c573a9', '1505664194779-8beaceb93744'],
  tax: ['1579621970563-ebec7560ff3e', '1450101499163-c8848c66ca85', '1611974789855-9c2a0a7236a3'],
  money: ['1611974789855-9c2a0a7236a3', '1590283603385-17ffb3a7f29f', '1579621970563-ebec7560ff3e', '1560518883-ce09059eeffa'],
  urban: ['1644221150186-5d785a471f44', '1758399750112-366c3c804eb7', '1568151769529-814ded117534', '1545324418-cc1a3fa10c00', '1515263487990-61b07816b324', '1541888946425-d81bb19240f5'],
  towers: ['1486406146926-c627a92ad1ab', '1554469384-e58fac16e23a', '1582407947304-fd86f028f716', '1479839672679-a46483c0e7c8'],
  coast: ['1598087495082-15d7dd26cf53', '1547483036-24bc77c79804'],
  contract: ['1450101499163-c8848c66ca85', '1560518883-ce09059eeffa', '1521791136064-7986c2920216'],
  home: ['1560518883-ce09059eeffa', '1497366216548-37526070297c', '1502672260266-1c1ef2d93688', '1600585154340-be6161a56a0c', '1523217582562-09d0def993a6'],
};
export const photoUrl = (id: string, h = 1350) => `https://images.unsplash.com/photo-${id}?w=1080&h=${h}&fit=crop&crop=entropy&q=80&fm=jpg`;

const FONT_URL: Record<string, string> = {
  wasm: 'https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm',
  heebo500: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/500Medium/Heebo_500Medium.ttf',
  heebo800: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/800ExtraBold/Heebo_800ExtraBold.ttf',
  heebo900: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/heebo@0.4.2/900Black/Heebo_900Black.ttf',
  karantina: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/karantina@0.4.1/700Bold/Karantina_700Bold.ttf',
  frank: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/frank-ruhl-libre@0.4.1/900Black/FrankRuhlLibre_900Black.ttf',
  logo: 'https://dabullaw-glitch.github.io/dabul-office/media/magazine/template/img/logo-full.png',
};
let LOADER: (k: string) => Promise<Uint8Array> = async (k) => { const r = await fetch(FONT_URL[k] || k); if (!r.ok) throw new Error('image asset ' + k + ' ' + r.status); return new Uint8Array(await r.arrayBuffer()); };
export const setLoader = (f: (k: string) => Promise<Uint8Array>) => { LOADER = f; };
let ready: Promise<void> | null = null; let FONTS: Uint8Array[] = []; let LOGO = '';
const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
async function init() {
  if (!ready) ready = (async () => {
    await initWasm(await LOADER('wasm'));
    FONTS = await Promise.all(['heebo500', 'heebo800', 'heebo900', 'karantina', 'frank'].map(k => LOADER(k)));
    LOGO = 'data:image/png;base64,' + b64(await LOADER('logo'));
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

// every line starts with a right-to-left mark, so a line that opens with a number still reads right to left
const x0 = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const esc = (s: unknown) => '‏' + x0(s);
// wrap by approximate glyph width (k = average advance in em for the font)
function wrap(t: string, size: number, max: number, k: number): string[] {
  const words = String(t || '').split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (n.length * size * k > max && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur); return lines;
}
// the biggest size (from the list) at which the text fits in maxLines
// the same number of lines, but as even as possible (no single word left alone on the last line)
function balance(t: string, size: number, max: number, k: number) {
  const n = wrap(t, size, max, k).length; if (n < 2) return wrap(t, size, max, k);
  let lo = max * 0.4, hi = max;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(t, size, mid, k).length > n) lo = mid; else hi = mid; }
  return wrap(t, size, hi, k);
}
function fit(t: string, sizes: number[], max: number, k: number, maxLines: number) {
  for (const s of sizes) { const l = wrap(t, s, max, k); if (l.length <= maxLines) return { size: s, lines: balance(t, s, max, k) }; }
  const s = sizes[sizes.length - 1]; return { size: s, lines: wrap(t, s, max, k).slice(0, maxLines) };
}
const width = (t: string, size: number, k: number) => String(t || '').length * size * k;
const KAR = 0.36, HEE = 0.56, FRK = 0.5;
const GOLD = '#C6A03C', GOLD2 = '#E6CB82', INK = '#0C1524', CREAM = '#FBF8F1';

const defs = (H: number) => `<defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E3A6"/><stop offset="0.55" stop-color="${GOLD2}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
<linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080F" stop-opacity="0.15"/><stop offset="0.35" stop-color="#05080F" stop-opacity="0.25"/><stop offset="0.62" stop-color="#05080F" stop-opacity="0.82"/><stop offset="1" stop-color="#05080F" stop-opacity="0.97"/></linearGradient>
<linearGradient id="fadeT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080F" stop-opacity="0.55"/><stop offset="0.25" stop-color="#05080F" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
<filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.55"/></filter>
<filter id="blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="28"/></filter>
<clipPath id="all"><rect width="1080" height="${H}"/></clipPath>
</defs>`;
const photo = (src: string, H: number, extra = '') => `<image x="0" y="0" width="1080" height="${H}" preserveAspectRatio="xMidYMid slice" href="${src}" xlink:href="${src}"${extra}/>`;
// the office line at the bottom: logo small on the left, phone on the right, a thin gold rule above
const brand = (H: number, light = true) => `<rect x="70" y="${H - 132}" width="940" height="2" fill="${GOLD}" fill-opacity="0.75"/>
<image x="70" y="${H - 112}" width="290" height="68" preserveAspectRatio="xMinYMid meet" href="${LOGO}" xlink:href="${LOGO}"/>
<g font-family="Heebo" text-anchor="end" direction="ltr"><text x="1010" y="${H - 66}" font-size="30" font-weight="800" fill="${light ? CREAM : INK}" letter-spacing="1">09-8613413</text></g>`;
const kickerPill = (t: string, x: number, y: number, dark = false) => {
  const w = Math.max(160, width(t, 30, 0.56) + 56);
  return `<rect x="${x - w}" y="${y}" width="${w}" height="56" rx="28" fill="${dark ? INK : GOLD}"/><text x="${x - 28}" y="${y + 39}" font-family="Heebo" font-size="30" font-weight="800" fill="${dark ? GOLD2 : INK}" direction="rtl" text-anchor="end">${esc(t)}</text>`;
};
const svgOpen = (H: number) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${H}" viewBox="0 0 1080 ${H}">${defs(H)}`;
const R = 1010, MAXW = 940;

function tplNumber(c: Card, H: number, src: string) {
  const hero = c.hero || '';
  const hs = Math.min(H > 1100 ? 330 : 280, Math.floor(MAXW / Math.max(1, hero.length * KAR)));
  const hook = fit(c.hook, [66, 60, 54, 48], MAXW, HEE, 2);
  let y = H - 170; const parts: string[] = [];
  // from the bottom up: hook lines, label, hero number
  const hookTop = y - hook.lines.length * hook.size * 1.12;
  hook.lines.forEach((l, i) => parts.push(`<text x="${R}" y="${Math.round(hookTop + (i + 1) * hook.size * 1.12 - 14)}" font-family="Heebo" font-size="${hook.size}" font-weight="900" fill="${CREAM}">${esc(l)}</text>`));
  y = hookTop - 34;
  parts.push(`<rect x="${R - 120}" y="${y}" width="120" height="7" rx="3.5" fill="${GOLD}"/>`);
  y -= 26;
  if (c.heroLabel) { parts.push(`<text x="${R}" y="${y}" font-family="Heebo" font-size="44" font-weight="800" fill="${GOLD2}">${esc(c.heroLabel)}</text>`); y -= 52; }
  parts.push(`<text x="${R + 6}" y="${y}" font-family="Karantina" font-size="${hs}" font-weight="700" fill="url(#gold)" filter="url(#sh)">${esc(hero)}</text>`);
  return `${svgOpen(H)}<g clip-path="url(#all)">${photo(src, H)}<rect width="1080" height="${H}" fill="url(#fadeB)"/><rect width="1080" height="${H}" fill="url(#fadeT)"/><rect width="1080" height="${H}" fill="url(#vig)"/></g>
<g direction="rtl" text-anchor="end">${kickerPill(c.kicker, R, 70)}${parts.join('')}</g>${brand(H)}</svg>`;
}

function tplQuestion(c: Card, H: number, src: string) {
  const q = fit(c.hook, H > 1100 ? [190, 170, 150, 132, 116] : [170, 150, 132, 116, 104], MAXW, KAR, 4);
  const lh = q.size * 0.98;
  const sub = c.sub ? fit(c.sub, [40, 36, 32], MAXW, HEE, 2) : { size: 0, lines: [] as string[] };
  const blockH = q.lines.length * lh + (sub.lines.length ? 40 + sub.lines.length * sub.size * 1.3 : 0);
  let y = Math.max(230, Math.round((H - 150) / 2 - blockH / 2 + 40));
  const parts: string[] = [];
  q.lines.forEach((l, i) => { y += lh; parts.push(`<text x="${R}" y="${Math.round(y - lh * 0.18)}" font-family="Karantina" font-size="${q.size}" font-weight="700" fill="${i === q.lines.length - 1 ? 'url(#gold)' : CREAM}" filter="url(#sh)">${esc(l)}</text>`); });
  if (sub.lines.length) { y += 34; parts.push(`<rect x="${R - 90}" y="${y - 12}" width="90" height="6" rx="3" fill="${GOLD}"/>`); y += 14; sub.lines.forEach((l) => { y += sub.size * 1.3; parts.push(`<text x="${R}" y="${Math.round(y)}" font-family="Heebo" font-size="${sub.size}" font-weight="500" fill="#E9E4D6">${esc(l)}</text>`); }); }
  return `${svgOpen(H)}<g clip-path="url(#all)">${photo(src, H)}<rect width="1080" height="${H}" fill="#05080F" fill-opacity="0.66"/><rect width="1080" height="${H}" fill="url(#vig)"/></g>
<rect x="0" y="0" width="14" height="${H}" fill="${GOLD}"/>
<g direction="rtl" text-anchor="end">${kickerPill(c.kicker, R, 70)}${parts.join('')}</g>${brand(H)}</svg>`;
}

function tplSplit(c: Card, H: number, src: string) {
  const ph = Math.round(H * (H > 1100 ? 0.52 : 0.47));
  const head = fit(c.hook, H > 1100 ? [96, 88, 80, 72, 64] : [84, 76, 68, 60], MAXW, FRK, 3);
  const sub = c.sub ? fit(c.sub, [36, 33, 30], MAXW, HEE, 2) : { size: 0, lines: [] as string[] };
  const parts: string[] = [];
  let y = ph + (H > 1100 ? 150 : 112);
  parts.push(`<text x="${R}" y="${y}" font-family="Heebo" font-size="32" font-weight="800" fill="${GOLD}" letter-spacing="1">${esc(c.kicker)}</text>`);
  y += 18;
  head.lines.forEach((l) => { y += head.size * 1.08; parts.push(`<text x="${R}" y="${Math.round(y)}" font-family="Frank Ruhl Libre" font-size="${head.size}" font-weight="900" fill="${CREAM}">${esc(l)}</text>`); });
  y += 20;
  sub.lines.forEach((l) => { y += sub.size * 1.35; parts.push(`<text x="${R}" y="${Math.round(y)}" font-family="Heebo" font-size="${sub.size}" font-weight="500" fill="#C9D1DE">${esc(l)}</text>`); });
  // the gold badge with the key fact, on the seam at the left
  let badge = '';
  if (c.hero) {
    const bs = Math.min(150, Math.floor(260 / Math.max(1, c.hero.length * KAR)));
    badge = `<g filter="url(#sh)"><circle cx="200" cy="${ph}" r="145" fill="url(#gold)"/></g><circle cx="200" cy="${ph}" r="128" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="2"/>
<g direction="rtl" text-anchor="middle"><text x="200" y="${ph + (c.heroLabel ? 22 : 40)}" font-family="Karantina" font-size="${bs}" font-weight="700" fill="${INK}">${esc(c.hero)}</text>${c.heroLabel ? `<text x="200" y="${ph + 70}" font-family="Heebo" font-size="24" font-weight="800" fill="${INK}">${esc(fit(c.heroLabel, [24], 220, HEE, 1).lines[0])}</text>` : ''}</g>`;
  }
  return `${svgOpen(H)}<rect width="1080" height="${H}" fill="${INK}"/>
<g clip-path="url(#all)"><svg x="0" y="0" width="1080" height="${ph}" viewBox="0 0 1080 ${ph}" preserveAspectRatio="xMidYMid slice"><image x="0" y="0" width="1080" height="${ph}" preserveAspectRatio="xMidYMid slice" href="${src}" xlink:href="${src}"/></svg>
<rect y="${ph - 160}" width="1080" height="160" fill="url(#fadeB)" opacity="0.6"/></g>
<polygon points="0,${ph} 1080,${ph - 46} 1080,${ph - 34} 0,${ph + 12}" fill="${GOLD}"/><polygon points="0,${ph + 12} 1080,${ph - 34} 1080,${H} 0,${H}" fill="${INK}"/>
<g direction="rtl" text-anchor="end">${kickerPill('עדכון', R, 60, true)}${parts.join('')}</g>${badge}${brand(H)}</svg>`;
}

function tplList(c: Card, H: number, src: string) {
  const items = (c.items || []).slice(0, 3);
  const top = 150, cardX = 60, cardW = 960, cardH = H - top - 190;
  const parts: string[] = [];
  let y = top + 92;
  parts.push(`<text x="${R - 30}" y="${y}" font-family="Heebo" font-size="30" font-weight="800" fill="${GOLD2}">${esc(c.kicker)}</text>`);
  const t = fit(c.hook, [64, 58, 52, 46], cardW - 120, HEE, 2);
  t.lines.forEach((l) => { y += t.size * 1.12; parts.push(`<text x="${R - 30}" y="${Math.round(y)}" font-family="Heebo" font-size="${t.size}" font-weight="900" fill="${CREAM}">${esc(l)}</text>`); });
  y += 30;
  const rowH = (top + cardH - 40 - y) / Math.max(1, items.length);
  items.forEach((it, i) => {
    const ry = y + i * rowH;
    parts.push(`<rect x="${cardX + 40}" y="${Math.round(ry)}" width="${cardW - 80}" height="1.5" fill="#FFFFFF" fill-opacity="0.22"/>`);
    parts.push(`<text x="${R - 30}" y="${Math.round(ry + rowH * 0.5 + 62)}" font-family="Karantina" font-size="150" font-weight="700" fill="url(#gold)">${i + 1}</text>`);
    const l = fit(it, [44, 40, 36, 32], cardW - 230, HEE, 2);
    const ty = ry + rowH / 2 - (l.lines.length - 1) * l.size * 0.62 + l.size * 0.35;
    l.lines.forEach((ln, j) => parts.push(`<text x="${R - 140}" y="${Math.round(ty + j * l.size * 1.22)}" font-family="Heebo" font-size="${l.size}" font-weight="800" fill="${CREAM}">${esc(ln)}</text>`));
  });
  return `${svgOpen(H)}<clipPath id="card"><rect x="${cardX}" y="${top}" width="${cardW}" height="${cardH}" rx="40"/></clipPath>
<g clip-path="url(#all)">${photo(src, H)}<rect width="1080" height="${H}" fill="#05080F" fill-opacity="0.35"/><rect y="${H - 260}" width="1080" height="260" fill="url(#fadeB)"/><rect y="${H - 150}" width="1080" height="150" fill="#05080F" fill-opacity="0.6"/></g>
<g clip-path="url(#card)">${photo(src, H, ' filter="url(#blur)"')}<rect x="${cardX}" y="${top}" width="${cardW}" height="${cardH}" fill="#0A1222" fill-opacity="0.62"/></g>
<rect x="${cardX}" y="${top}" width="${cardW}" height="${cardH}" rx="40" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="2"/>
<rect x="${R - 150}" y="${top - 28}" width="150" height="56" rx="28" fill="${GOLD}"/><text x="${R - 75}" y="${top + 11}" font-family="Heebo" font-size="30" font-weight="900" fill="${INK}" text-anchor="middle" direction="rtl">${esc('מה חשוב')}</text>
<g direction="rtl" text-anchor="end">${parts.join('')}</g>${brand(H)}</svg>`;
}

export function cardSvg(c: Card, H: 1350 | 1080, src: string) {
  if (c.tpl === 'question') return tplQuestion(c, H, src);
  if (c.tpl === 'split') return tplSplit(c, H, src);
  if (c.tpl === 'list' && (c.items || []).length >= 2) return tplList(c, H, src);
  if (c.tpl === 'number' && c.hero) return tplNumber(c, H, src);
  return c.hero ? tplNumber(c, H, src) : tplQuestion(c, H, src);
}
// photo bytes -> data URI (the photo is fetched once per image)
export async function renderCard(c: Card, H: 1350 | 1080, photoBytes: Uint8Array) {
  await init();
  const src = 'data:image/jpeg;base64,' + b64(photoBytes);
  return new Resvg(cardSvg(c, H, src), { font: { fontBuffers: FONTS, defaultFontFamily: 'Heebo', loadSystemFonts: false }, fitTo: { mode: 'original' } }).render().asPng();
}
