// Team of One course site. Static (Astro) + Supabase in the browser for login, member area and the admin panel.
// preview (default): GitHub Pages under /dabul-office/teamofone/, hidden from search engines.
// e2e waits for the build of the same commit when a push touches this folder.
// production later: SITE_URL=https://<domain> BASE=/ PREVIEW=0 npm run build
import { defineConfig } from 'astro/config';
const SITE = process.env.SITE_URL || 'https://dabullaw-glitch.github.io';
const BASE = process.env.BASE ?? '/dabul-office/teamofone/';
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  build: { assets: 'assets', format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
