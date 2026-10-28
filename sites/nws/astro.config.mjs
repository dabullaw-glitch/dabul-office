import { defineConfig } from 'astro/config';
// NWS חדשות נתניה והשרון. Static site; production host serves nws.co.il.
export default defineConfig({
  site: 'https://nws.co.il',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
});
