# Lawyers directory and legal information portal (working name: Folivus / פוליבוס)

Static Astro site, Hebrew, RTL. Phase 1 = architecture, design system and a working preview with SAMPLE firms only.
The brand name is temporary: it lives only in `src/config/brand.ts` (+ the domain in `launch.json`). Content files written
with the working name are rewritten to the configured name at build time (`src/lib/data.ts`).

Preview (noindex, robots closed): https://dabullaw-glitch.github.io/dabul-office/folivus/

## Layout
```
launch.json              domain + live flag for the production build (empty = no production build)
content/                 build input, filled by scripts/sync-content.mjs from the writers' folder
  AREAS.json             the 40 practice areas (slug, he_slug, name, group)
  areas/<slug>.md        area guides (frontmatter: title, description, faq, sources, updated, reviewed_by)
  articles/<slug>.md     articles (he_slug, title, description, area_slugs, author, published, updated, sources, faq)
  courts/<slug>.md       court pages (he_slug, name, type, city, address, phone, hours, lat, lng, sources, updated)
  tools/<slug>.json+.js  tool spec + pure ES module: compute(inputs) -> {outputs, steps, errors} | generate(inputs) -> {title, html|text, warnings}
src/config/brand.ts      brand, preview flag, Supabase public key, FORMS_LIVE flag
src/config/routes.ts     every URL (Hebrew slugs); rename a section here
src/lib/data.ts          loaders (content/, sample firms, optional Supabase fol_firms when FOL_DB=1)
src/lib/schema.ts        JSON-LD builders (Organization, WebSite+SearchAction, BreadcrumbList, LegalService, FAQPage,
                         Article with author, HowTo, WebApplication, Courthouse, ItemList, CollectionPage)
src/lib/md.ts            markdown + [[area:slug]] / [[tool:slug]] / [[article:slug]] / [[court:slug]] link placeholders
src/pages/[...path].astro  router -> src/views/*.astro (one view per page type)
src/pages/               home, 404, sitemap.xml (index) + sitemaps/<type>.xml, robots.txt, rss.xml, llms.txt,
                         search-index.json, tool-modules/<slug>.js
src/data/                sample firms (fictional, marked), plans (placeholder prices), authors, cities, area intros
scripts/check.mjs        post-build guard: no em/en dash, no "הכי"/"הטוב ביותר"/"מומחה", no office/owner mention,
                         no hardcoded domain, no "recommended" wording for paid slots
scripts/sync-content.mjs copies + validates writers' content (YAML/JSON parse, forbidden words, pure tool modules)
hold/                    the 2.11.2026 list of real offices from public sources: NOT used by the build until the
                         legal/data review approves collecting real data
../../sql/folivus_v2.sql the fol_* data model (RLS on every table, column-level read grants, one write function
                         fol_submit with validation + rate limit). NOT APPLIED YET (waits for approval).
```

## URLs (Hebrew slugs)
`/` home · `/תחומים/` · `/<area he_slug>/` (e.g. `/עורך-דין-מקרקעין/`) · `/<area>/<city>/` (only when the combination has
firms) · `/ערים/` · `/עורכי-דין/<city>/` · `/משרד/<slug>/` · `/חיפוש/` · `/מאמרים/` + `/מאמרים/<he_slug>/` ·
`/כותבים/<slug>/` · `/כלים/` + `/כלים/<he_slug>/` · `/בתי-משפט/` + `/בתי-משפט/<he_slug>/` · `/הצטרפות-משרדים/` ·
`/ניהול-פרופיל/` · `/בקשת-הסרה/` · `/מדיניות-עריכה/` · `/שיטת-הדירוג/` · `/תנאי-שימוש/` · `/מדיניות-פרטיות/` ·
`/הצהרת-נגישות/` · `/צור-קשר/` · `/אודות/`. Canonical, sitemaps and JSON-LD use percent-encoded absolute URLs.

## Rules built into the code (from the owner and the legal research, 25.11.2026)
- Directory, not a referral service: no lead routing to firms, no per-lead fees; visitors contact firms directly.
  The only form that stores inquiries is the site's own contact form (fol_leads).
- Paid placement is always labelled "משרד מקודם" / "מודעה" / "תוכן ממומן". Rankings are not purchasable.
- No Google Places data (Maps terms): only an optional `place_id` and a plain "לביקורות בגוגל" link. Ratings come only
  from our own verified reviews.
- Firm data limited to business details (name, office address, office phone, website, areas). Extended fields only if
  the firm submits them.
- Emails after join/claim forms are transactional only. No outreach in this build.
- Articles with a future `published` date are scheduled: shown (badged) only in the preview, live on that day's build.

## Build
```
npm ci
npm run sync        # copy writers' content from /home/claude/folivus-content (validates each file)
npm run build       # astro build + scripts/check.mjs
```
Env: `SITE_URL` (origin), `BASE` (path), `PREVIEW` (1 = noindex everywhere), `FOL_DB=1` (read fol_firms from Supabase),
`FOL_FORMS=1` (forms post to fol_submit; keep 0 until the migration is applied).

## Deploy
`.github/workflows/folivus.yml`: every push to `sites/folivus/**` and nightly -> preview to `folivus/` (GitHub Pages).
Production only when `launch.json` has a domain: built with that domain and pushed to the `folivus-site` branch
(Cloudflare Pages serves it as is). `live: false` keeps it noindex.

## Rename checklist
1. `src/config/brand.ts` (name, nameLatin, tagline). 2. `launch.json` domain. 3. Regenerate `public/og/default.png`
(1200x630, brand name) and `public/icon-512.png` if the mark changes. Nothing else spells the name.
