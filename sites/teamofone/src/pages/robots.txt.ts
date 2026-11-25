// robots.txt. Before launch (every build except the production build with launch.json live:true) it closes the whole
// site to search engines. After launch it opens the public pages, keeps the personal, login, purchase and admin pages
// closed, and points to the sitemap. (On the preview address GitHub Pages serves the site under a folder, where search
// engines do not read robots.txt at all; there the noindex meta tag on every page does the job.)
import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const live = process.env.PREVIEW === '0';
  const base = import.meta.env.BASE_URL;
  const body = live
    ? ['User-agent: *', 'Allow: /', ...['knisa/', 'kniya/', 'ezor-ishi/', 'nihul/', 'maamar/'].map((p) => `Disallow: ${base}${p}`), '', `Sitemap: ${new URL(base + 'sitemap.xml', site).href}`, ''].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
