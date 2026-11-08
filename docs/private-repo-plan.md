# Moving the office code to a private repository (Yakir approved 8.11.2026)

Goal: the code of the office system is no longer public. The current public repo
(dabullaw-glitch/dabul-office) keeps serving only public files (media/, podcast, site
assets) so nothing that already points to it breaks.

Findings (8.11.2026)
- About 1,360 database rows point at public URLs of this repo (GitHub Pages media and
  raw/jsDelivr code). Closing the repo would break them at once.
- Edge function stubs (reels, magazine, ...) import code from pinned commits of this repo.
- app/config.js holds only the Supabase anon (public) key. No secret keys were found in
  the working tree scan.
- The session cannot create repositories, so Yakir creates the empty private repo.

Phases
1. Yakir creates the empty private repo `dabullaw-glitch/dabul-office-code` (no README).
2. Copy the code there: app/, fn/, tools/, sql/, academy/, docs/, the sources of sites/
   (no build output, no media). Keep the same paths so scheduled tasks need only the
   clone line changed.
3. Point the scheduled tasks at the private repo (clone + TASK.md paths), one at a time,
   checking each run.
4. Edge functions: deploy the full code instead of stubs that import from the public repo.
5. Remove the code folders from the public repo (media stays). Old commits stay visible in
   its history; if that matters, the public repo is recreated with media only, after
   every URL was checked.
