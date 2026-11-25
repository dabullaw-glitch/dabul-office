#!/usr/bin/env bash
# Checks a built Team of One site before it is published (used by the "prod" job in .github/workflows/teamofone.yml and by
# verify.sh). Usage: check-build.sh <dist> <PREVIEW 0|1> [domain]
#   PREVIEW=1 (before launch): every page has noindex, robots.txt closes everything, sitemap.xml lists nothing.
#   PREVIEW=0 (launch): public pages are indexable, personal/login/purchase/admin pages keep noindex, robots.txt points to the
#   sitemap, the sitemap lists the public pages on the domain.
#   With a domain: canonical links use it and no page links to the preview folder /dabul-office/.
set -u
D="$1"; P="$2"; DOM="${3:-}"; fail=0
ok() { echo "OK   $1"; }; bad() { echo "FAIL $1"; fail=1; }
PRIVATE="knisa kniya ezor-ishi nihul maamar"
PUBLIC_PAGES="index.html kursim/index.html maamarim/index.html kelim/index.html etgar/index.html tnaim/index.html"
[ -f "$D/index.html" ] || { echo "FAIL no build in $D"; exit 1; }
for p in $PRIVATE; do
  for f in $(find "$D/$p" -name index.html 2>/dev/null); do grep -q 'name="robots" content="noindex' "$f" || bad "private page without noindex: $f"; done
done
ok "private pages have noindex"
if [ "$P" != "0" ]; then
  n=$(find "$D" -name '*.html' | wc -l); m=$(grep -l 'name="robots" content="noindex' $(find "$D" -name '*.html') | wc -l)
  [ "$n" = "$m" ] && ok "all $n pages have noindex (before launch)" || bad "only $m of $n pages have noindex"
  grep -qx 'Disallow: /' "$D/robots.txt" && ok "robots.txt closes the site" || bad "robots.txt does not close the site"
  ! grep -q '<url>' "$D/sitemap.xml" && ok "sitemap.xml is empty" || bad "sitemap.xml lists pages before launch"
else
  for f in $PUBLIC_PAGES; do grep -q 'name="robots" content="noindex' "$D/$f" && bad "public page has noindex: $f"; done
  ok "public pages are indexable"
  grep -q '^Sitemap: ' "$D/robots.txt" && ok "robots.txt points to the sitemap" || bad "robots.txt has no sitemap line"
  ! grep -qx 'Disallow: /' "$D/robots.txt" && ok "robots.txt does not close the whole site" || bad "robots.txt still closes the site"
  c=$(grep -c '<url>' "$D/sitemap.xml"); [ "$c" -ge 10 ] && ok "sitemap.xml lists $c pages" || bad "sitemap.xml lists only $c pages"
  grep -q 'knisa\|ezor-ishi\|nihul\|kniya' "$D/sitemap.xml" && bad "sitemap lists a private page" || ok "sitemap has no private pages"
fi
if [ -n "$DOM" ]; then
  grep -q "<link rel=\"canonical\" href=\"https://$DOM/\"" "$D/index.html" && ok "canonical uses https://$DOM/" || bad "canonical does not use the domain"
  h=$(grep -l 'href="/dabul-office/\|https://dabullaw-glitch.github.io/dabul-office/teamofone' $(find "$D" -name '*.html' -o -name '*.xml' -o -name '*.txt') 2>/dev/null | head -5)
  [ -z "$h" ] && ok "no links to the preview folder" || bad "preview folder links in: $h"
  if [ "$P" = "0" ]; then grep -q "<loc>https://$DOM/</loc>" "$D/sitemap.xml" && ok "sitemap uses the domain" || bad "sitemap does not use the domain"; fi
fi
exit $fail
