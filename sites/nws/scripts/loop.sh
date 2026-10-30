#!/usr/bin/env bash
# The build loop of nws.co.il (28.10.2026, Yakir: new stories must reach the site within minutes, 24/7, automatically).
# GitHub's own schedule is not reliable, so one workflow run stays up for about LOOP_MIN minutes: every ~45 seconds it fetches the
# engine feed (published stories, flashes, events calendar) and the directory listings, and when anything changed it builds the
# site and publishes it to the nws-site branch (Cloudflare Pages serves that branch). At the end the workflow starts the next run.
# After each publish, scripts/indexnow.mjs tells the IndexNow search engines which pages are new or changed (the list is the
# difference between this build's sitemap and the manifest .indexnow.tsv kept on the nws-site branch).
# Runs from sites/nws. Needs GH_TOKEN (the workflow token) and GITHUB_REPOSITORY.
set -u
LOOP_MIN="${LOOP_MIN:-55}"
END=$((SECONDS + LOOP_MIN * 60))
SRC=$(git rev-parse HEAD:sites/nws | cut -c1-16)
LAST=""
BUILDS=0
FAILS=0

savelog() {
  local d; d=$(mktemp -d)
  { echo "failed at $(date -u +%FT%TZ), run ${GITHUB_RUN_ID:-?}"; echo; tail -200 /tmp/nws-build.log 2>/dev/null; echo; echo "check:"; check 2>&1; } > "$d/build.log"
  ( cd "$d" && git init -q && git checkout -qb nws-buildlog \
    && git config user.name "site-bot" && git config user.email "site-bot@users.noreply.github.com" \
    && git add -A && git commit -qm "build log $(date -u +%FT%TZ)" \
    && git push -qf "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" nws-buildlog ) || true
  rm -rf "$d"
}

key() {
  node -e "
    const fs=require('fs');const r=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
    const j=r('src/data/feed.json',{});const b=r('src/data/biz.json',{});
    process.stdout.write(JSON.stringify([j.stories||[],b.listings||[],j.event||null,(j.flashes||[]).map(f=>f.id+':'+f.text),(j.calendar||[]).map(c=>c.id+c.start),j.pin||null]))" | sha256sum | cut -c1-16
}

check() {
  ( cd dist || exit 1
    test -f index.html || { echo "no index.html"; exit 1; }
    grep -q 'Allow: /' robots.txt || { echo "robots.txt has no Allow"; exit 1; }
    if grep -q 'Disallow: /$' robots.txt; then echo "robots.txt blocks the site"; exit 1; fi
    if grep -q 'name="robots" content="noindex' index.html; then echo "home page is noindex"; exit 1; fi
    grep -q 'https://nws.co.il/' sitemap.xml || { echo "sitemap without nws.co.il"; exit 1; }
    grep -q 'news-sitemap.xml' robots.txt || { echo "robots.txt without news sitemap"; exit 1; }
    test -f functions/_middleware.js && node -e "JSON.parse(require('fs').readFileSync('_routes.json','utf8'))" || { echo "middleware or routes missing"; exit 1; }
    if grep -rl --include='*.html' --include='*.xml' 'pages\.dev' . | grep -q .; then echo "a page links to the temporary pages.dev host"; exit 1; fi
  )
}

# 30.10.2026: the publish borrows the objects of this checkout (git alternates), which holds the current nws-site commit (TIP, fetched
# before each build), and marks that commit as a shallow boundary, so git leaves out every file the site already has and the push
# sends only what changed (the site with the photo library is about 100 MB). The new commit still has no parent, as before.
# If that push fails for any reason, it packs everything and pushes in full, as before.
TIP=""
publish() {
  local k="$1" d alt
  echo "$k" > dist/.build-key
  alt="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/objects"
  d=$(mktemp -d); cp -r dist/. "$d"/
  ( cd "$d" && git init -q && git checkout -qb nws-site \
    && { if [ -n "$TIP" ] && [ -d "$alt" ]; then echo "$alt" > .git/objects/info/alternates && echo "$TIP" > .git/shallow; fi; true; } \
    && git config user.name "site-bot" && git config user.email "site-bot@users.noreply.github.com" \
    && git add -A && git commit -qm "nws.co.il $(date -u +%FT%TZ)" \
    && { git push -qf "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" nws-site \
      || { git repack -aq && rm -f .git/objects/info/alternates .git/shallow \
        && git push -qf "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" nws-site; }; } )
  local rc=$?; rm -rf "$d"; return $rc
}

# 30.10.2026: the photo library (branch nws-photolib, made by .github/workflows/photolib.yml): its photos go to public/img/lib and its
# index to src/data/photolib.json, and a new library version means a new build (LIBSHA is part of the build key)
LIBSHA=""
synclib() {
  local s t
  s=$(git ls-remote origin refs/heads/nws-photolib 2>/dev/null | cut -c1-12)
  if [ -z "$s" ] || [ "$s" = "$LIBSHA" ]; then return 0; fi
  t=$(mktemp -d)
  if git fetch -q --depth=1 origin nws-photolib 2>/dev/null && git archive FETCH_HEAD img index.json | tar -x -C "$t" && [ -s "$t/index.json" ]; then
    rm -rf public/img/lib && mkdir -p public/img && mv "$t/img" public/img/lib && mv "$t/index.json" src/data/photolib.json
    LIBSHA=$s; echo "$(date -u +%T) photo library $s: $(ls public/img/lib | wc -l) files"
  fi
  rm -rf "$t"
}

while :; do
  node scripts/feed.mjs >/dev/null 2>&1 || echo "feed fetch failed, keeping the last one"
  node scripts/biz.mjs >/dev/null 2>&1 || true
  synclib
  K="$(key)-$SRC-$LIBSHA-$(TZ=Asia/Jerusalem date +%F)"
  if [ "$K" != "$LAST" ]; then
    OLD=$(git fetch -q --depth=1 origin nws-site 2>/dev/null && git show FETCH_HEAD:.build-key 2>/dev/null || true)
    TIP=$(git rev-parse -q --verify 'FETCH_HEAD^{commit}' 2>/dev/null || true)
    git show FETCH_HEAD:.indexnow.tsv > /tmp/nws-indexnow-old.tsv 2>/dev/null || rm -f /tmp/nws-indexnow-old.tsv
    if [ "$K" != "$OLD" ]; then
      T0=$SECONDS
      if npm run -s build:site >/tmp/nws-build.log 2>&1 && check && node scripts/indexnow.mjs plan /tmp/nws-indexnow-old.tsv && publish "$K"; then
        BUILDS=$((BUILDS + 1)); echo "$(date -u +%T) published ($((SECONDS - T0)) s): $K"
        node scripts/indexnow.mjs send || true
      else
        # 29.10.2026: a failed build no longer ends the run (an exit here stopped the whole chain for 4 hours). The log goes to the
        # branch nws-buildlog so it can be read from outside, and the next round tries again; LAST stays as it was.
        echo "$(date -u +%T) build or publish failed"; tail -30 /tmp/nws-build.log
        FAILS=$((FAILS + 1)); savelog
        [ "$SECONDS" -ge "$END" ] && break
        sleep 90; continue
      fi
    fi
    LAST="$K"
  fi
  [ "$SECONDS" -ge "$END" ] && break
  sleep 45
done
echo "loop done: $BUILDS builds, $FAILS failed"
