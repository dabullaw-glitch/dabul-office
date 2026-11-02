// Folivus: a static lawyers directory. Two modes:
// preview (default): served from GitHub Pages under /dabul-office/folivus/, hidden from search engines (PREVIEW=1).
// production: SITE_URL=https://folivus.com BASE=/ PREVIEW=0 npm run build
import { defineConfig } from 'astro/config';

const SITE = process.env.SITE_URL || 'https://dabullaw-glitch.github.io';
const BASE = process.env.BASE ?? '/dabul-office/folivus/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  // one shared stylesheet (cached) instead of inlining it into thousands of area+city pages
  build: { assets: 'assets', inlineStylesheets: 'never', format: 'directory' },
  compressHTML: true,
  markdown: { smartypants: false },
  devToolbar: { enabled: false },
  // keep the page script in one cached file instead of inlining it into every page
  vite: { build: { assetsInlineLimit: 0 } },
});
