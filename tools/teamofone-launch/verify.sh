#!/usr/bin/env bash
# Proves the launch switches work, without launching anything. Builds the site three ways and checks each one:
#   1. preview (today, GitHub Pages)          -> everything hidden from search engines
#   2. domain set, live:false                 -> same site for the domain, still hidden
#   3. domain set, live:true                  -> public pages open, sitemap filled, private pages still hidden
# Run from the repo root: bash tools/teamofone-launch/verify.sh   (needs node 22 and sites/teamofone/node_modules)
# The server side (payments, emails) is checked by the self test, see LAUNCH.md section "Checks".
set -u
cd "$(dirname "$0")/../../sites/teamofone" || exit 1
DOM=example-launch.co.il; rc=0
run() { local name="$1"; shift; rm -rf "/tmp/too-$name"; env "$@" npx astro build --outDir "/tmp/too-$name" > "/tmp/too-$name.log" 2>&1 || { echo "FAIL build $name"; rc=1; return; }; }
run preview PREVIEW=1
run hidden SITE_URL=https://$DOM BASE=/ PREVIEW=1
run live SITE_URL=https://$DOM BASE=/ PREVIEW=0
C=../../tools/teamofone-launch/check-build.sh
echo "== 1. preview";            bash $C /tmp/too-preview 1 || rc=1
echo "== 2. domain, not live";   bash $C /tmp/too-hidden 1 $DOM || rc=1
echo "== 3. domain, live";       bash $C /tmp/too-live 0 $DOM || rc=1
echo "== a wrong build must fail the live check"; if bash $C /tmp/too-preview 0 $DOM > /dev/null; then echo "FAIL the checker passed a hidden build as live"; rc=1; else echo "OK   checker refuses a hidden build as live"; fi
[ $rc = 0 ] && echo "ALL OK" || echo "SOMETHING FAILED"
exit $rc
