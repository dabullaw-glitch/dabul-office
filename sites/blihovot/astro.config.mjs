// The site is fully static (fast, cheap to host). Two modes:
// preview (default): served from GitHub Pages under /dabul-office/bli-hovot/, hidden from search engines.
// production: SITE_URL=https://<domain> BASE=/ PREVIEW=0 npm run build
import { defineConfig } from 'astro/config';
import { autolink } from './src/lib/autolink.mjs';

const SITE = process.env.SITE_URL || 'https://dabullaw-glitch.github.io';
const BASE = process.env.BASE ?? '/dabul-office/bli-hovot/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { assets: 'assets', inlineStylesheets: 'always', format: 'directory' },
  compressHTML: true,
  markdown: { remarkPlugins: [autolink], smartypants: false },
  devToolbar: { enabled: false },
});
