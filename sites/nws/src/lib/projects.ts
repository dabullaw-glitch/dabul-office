// Urban renewal compounds (31.10.2026): written by the edge function hns-projects into docs nwslive 'projects' from the open
// dataset of the Ministry of Housing, passed to the build through hns-feed as live.projects. Only official data, no developers.
import { SERVICES } from './content';

export interface ProjHist { field: string; label: string; from: string; to: string; date: string }
export interface Project {
  id: string; town: string; townSlug: string; slug: string; name: string; exist: number | null; add: number | null; total: number | null;
  permits: number | null; declared: string; validYear: number | null; track: string; inExec: boolean; status: string; plan: string;
  planUrl: string; mapUrl: string; intro: string[]; firstSeen: string; history: ProjHist[];
}
const L: any = SERVICES.projects || {};
const clean = (s: unknown) => String(s ?? '').replace(/\s*[—–]\s*/g, ' - ').trim();
export const PROJECTS: Project[] = (L.items || []).filter((p: any) => p && p.id && p.slug && p.name).map((p: any) => ({
  ...p, name: clean(p.name), intro: (p.intro || []).map(clean).filter(Boolean), history: p.history || [],
}));
export const PROJ_TOWNS: { he: string; slug: string; n: number; exist: number; total: number; add: number }[] = L.towns || [];
export const STATUS_TXT: Record<string, string> = L.statusTxt || {};
export const TRACK_TXT: Record<string, string> = L.trackTxt || {};
export const PROJ_UPDATED: string = L.updated || '';
export const PROJ_SOURCE: string = L.sourceUrl || 'https://data.gov.il/dataset/urban_renewal';
export const projUrl = (p: Project) => `/projects/${p.slug}/`;
export const fmtN = (n: number | null | undefined) => (n == null ? '' : Number(n).toLocaleString('en-US'));
// the order of the stages, from the earliest to construction
export const STAGES = ['תכנון ראשוני', 'תכנון סטטוטורי', 'תכנית מאושרת לפני מימוש', 'תכנית מאושרת - אחרי רישוי', 'תכנית מאושרת במימוש'];
export const STAGE_SHORT: Record<string, string> = {
  'תכנון ראשוני': 'תכנון ראשוני', 'תכנון סטטוטורי': 'בהליך אישור', 'תכנית מאושרת לפני מימוש': 'תוכנית מאושרת',
  'תכנית מאושרת - אחרי רישוי': 'יש היתרי בנייה', 'תכנית מאושרת במימוש': 'בבנייה',
};
export const stageIdx = (s: string) => Math.max(0, STAGES.indexOf(s));
export const trackLabel = (t: string) => (t === 'מיסוי' ? 'מסלול מיסוי' : t === 'רשויות' ? 'מסלול רשויות' : t === 'טרם הוכרז' ? 'טרם הוכרז' : '');
