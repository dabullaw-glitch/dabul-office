// Serves each tool's pure ES module (content/tools/<slug>.js) as a static file for the tool page to import.
import fs from 'node:fs';
import path from 'node:path';
import { tools } from '../../lib/data';
export function getStaticPaths() {
  return tools().filter((t) => t.module).map((t) => ({ params: { slug: t.slug } }));
}
export function GET({ params }: { params: { slug: string } }) {
  const src = fs.readFileSync(path.resolve('content/tools', params.slug + '.js'), 'utf8');
  return new Response(src, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
}
