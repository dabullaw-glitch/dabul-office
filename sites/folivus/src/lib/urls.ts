// Every indexable URL (used by sitemap.xml). Pages with no lawyers are noindex and left out.
import { getCollection } from 'astro:content';
import { AREAS, CITIES, loadData, counts, key } from './data';
import { REGIONS } from '../data/site';
export async function indexable() {
  const { lawyers, ranks, at } = await loadData();
  const c = await counts();
  const arts = (await getCollection('maamarim')).filter((a) => !a.data.draft);
  const today = new Date().toISOString().slice(0, 10);
  const d = (s?: string | Date) => (s ? new Date(s).toISOString().slice(0, 10) : today);
  const rows: [string, string][] = [
    ['', today], ['orchei-din/', today], ['ir/', today], ['nivcheret/', today], ['shita/', today], ['maamarim/', today],
    ['lehitztaref/', today], ['hasara/', today], ['odot/', today], ['tzor-kesher/', today], ['tnaei-shimush/', today], ['mediniyut-pratiyut/', today], ['negishut/', today],
    ...AREAS.filter((a) => c.area[a.slug]).map((a) => [`orchei-din/${a.slug}/`, d(at)] as [string, string]),
    ...AREAS.flatMap((a) => CITIES.filter((x) => c.areaCity[key(a.slug, x.slug)]).map((x) => [`orchei-din/${a.slug}/${x.slug}/`, d(at)] as [string, string])),
    ...CITIES.filter((x) => c.city[x.slug]).map((x) => [`ir/${x.slug}/`, d(at)] as [string, string]),
    ...REGIONS.filter((r) => c.region[r.slug]).map((r) => [`ezor/${r.slug}/`, d(at)] as [string, string]),
    ...lawyers.map((l) => [`orech-din/${l.id}/`, d(l.updated)] as [string, string]),
    ...ranks.map((r) => [`nivcheret/${r.year}/${r.area}/`, today] as [string, string]),
    ...arts.map((a) => [`maamarim/${a.id}/`, d(a.data.updated)] as [string, string]),
  ];
  return rows;
}
