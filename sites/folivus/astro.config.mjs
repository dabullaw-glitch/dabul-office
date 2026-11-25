// Lawyers directory (working name in src/config/brand.ts). Static Astro site.
// preview (default): GitHub Pages under /dabul-office/folivus/, hidden from search engines (PREVIEW=1).
// production later: SITE_URL=https://<domain> BASE=/ PREVIEW=0 npm run build (the domain comes from launch.json in CI).
import { defineConfig } from 'astro/config';

const SITE = process.env.SITE_URL || 'https://dabullaw-glitch.github.io';
const BASE = process.env.BASE ?? '/dabul-office/folivus/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { assets: 'assets', inlineStylesheets: 'never', format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
