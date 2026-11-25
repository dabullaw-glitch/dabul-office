# Team of One: launch checklist (prepared 25.11.2026, Yakir: "תטפל בזה")

The site stays in test mode until Yakir approves opening. Everything below is ready behind switches that are OFF.
Yakir's own steps (domain, Cloudflare, Resend, Supabase, Google, Morning) are in Hebrew in
`docs agents/too-launch-prep` (field `forYakir` and `steps`). Never type a password, key or code for him.

## The switches (all OFF today)

| Switch | Where | Today | At launch | Who |
|---|---|---|---|---|
| Domain for the production copy | `sites/teamofone/launch.json` `domain` | `""` | the bought domain | Claude (commit) |
| Search engines allowed | `sites/teamofone/launch.json` `live` | `false` | `true` | Claude, only after Yakir says to open |
| Domain used in emails and payment return links | `too_settings` key `launch` `{domain, live}` | `{"domain":"","live":false}` | same domain as launch.json | Claude (SQL, admin row) |
| Sender address for Team of One emails | `too_settings` key `mail` `{from, reply_to, verify_signup}` | empty / false | `Team of One <hello@DOMAIN>`, reply_to Yakir's choice, `verify_signup:true` | Claude, after the domain is verified in Resend |
| "Forgot password" link on the login page | `too_settings` key `mail_ready` (public) | `false` | `true` | Claude, after a test email arrived |
| Real payments | `too_settings` key `test_mode` | `true` | `false` | Claude, only after Yakir says to open |
| Renewal emails (daily) | pg_cron job `too-renew-mail` | not scheduled | scheduled (SQL below) | Claude at launch |

`launch.domain` (DB) and `launch.json domain` (repo) must always be the same domain.

## What each part does

- **Hosting**: `.github/workflows/teamofone.yml` job `prod` builds `SITE_URL=https://DOMAIN BASE=/` into the branch
  `teamofone-prod` (orphan, force-pushed), which a Cloudflare Pages project serves as is (no build in Cloudflare). It writes
  `_headers` (security headers; `X-Robots-Tag: noindex` before launch and always on `*.pages.dev`) and runs
  `check-build.sh` before publishing. GitHub Pages preview (`/dabul-office/teamofone/`) keeps running and stays noindex.
- **Indexing**: `src/layouts/Base.astro` adds `noindex` on every page unless `PREVIEW=0`; private pages (`knisa`, `kniya`,
  `ezor-ishi/*`, `nihul`, `maamar`) pass `noindex` always. `src/pages/robots.txt.ts` closes everything before launch and
  opens public pages after; `src/pages/sitemap.xml.ts` is empty before launch and lists public pages + every published
  article after. `src/lib/md.js` rewrites links written as `/dabul-office/teamofone/...` to the real base.
- **Email**: edge functions send through Resend (`RESEND_API_KEY` already in app_secrets) from the `mail.from` address.
  The office address (dabullaw) is refused as a sender. The shared Supabase project's own auth email settings are NOT
  changed (they also serve the office system). Templates (simple Hebrew, site look): `fn/too-pay/mail.ts`
  (verify, reset, paidCourse, paidMonthly, renew).
  - `too-signup` (v3): signup as before while `verify_signup` is off; with it on, the account waits for the emailed link.
    `{action:'forgot'}` sends a reset link (same answer for every email, rate limited, office users excluded).
  - Login page: "forgot password" form and "choose a new password" form (`knisa/?reset=1`), shown only when `mail_ready`.
- **Payment**: edge function `too-pay` (Morning hosted payment page, the same API and Grow clearing the office services use).
  Checkout refuses while `test_mode` is on. Callback `?step=paid&o=&k=`: per-order secret key, only its SHA-256 is stored
  (`too_orders.pay_key_hash`); `too_pay_grant` (service role only) opens access once; a lower amount goes to `review`.
  Monthly plan: each payment adds one month. Renewal is by emailed payment link 3 days before the month ends
  (`?step=renew`). Automatic card charging (Morning standing orders, "הוראת קבע") needs Morning's Best plan or higher and
  an API we could not verify; decide with Yakir before launch. The purchase page (`kniya`) shows the real button only when
  `test_mode` is off; `ezor-ishi/?paid=<order>` waits for the access to open.

## Checks (run any time, all in test mode)

1. Build switches: `bash tools/teamofone-launch/verify.sh` (builds preview / domain-hidden / domain-live and checks each;
   also proves the checker refuses a hidden build as live). Last run 25.11.2026: ALL OK.
2. Payment server path (only works while test_mode is on; creates and removes a throwaway student; no Morning call):
   ```sql
   select net.http_post(url:='https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/too-pay?step=selftest',
     headers:=jsonb_build_object('content-type','application/json','x-cron-secret',(select v from app_secrets where k='CRON_SECRET')),
     body:='{}'::jsonb, timeout_milliseconds:=60000);
   -- then: select status_code, content from net._http_response where id = <returned id>;
   ```
   Last run 25.11.2026: 8 of 8 steps passed (checkout refused in test mode, no sign-in refused, wrong key refused,
   right key opens access, repeat changes nothing, lower amount to review, test student removed).
3. Readiness (true/false only): same call with `?step=status`.

## Before launch (domain bought, site still hidden)

1. Yakir: steps 1 to 4 in the Hebrew doc (domain, Cloudflare, Pages project on branch `teamofone-prod`, custom domain).
2. Claude: set `launch.json` `domain` (commit, push; the `prod` job publishes a hidden copy) and
   `update too_settings set value = jsonb_build_object('domain','DOMAIN','live',false) where key='launch'`.
   (If the Pages project is not named `teamofone`, add `"pages":"<name>"` to that value for CORS.)
3. Yakir: Resend domain + Supabase redirect URL + Google check (Hebrew steps 5 to 8).
4. Claude: `update too_settings set value = jsonb_build_object('from','Team of One <hello@DOMAIN>','reply_to','<his choice>','verify_signup',true) where key='mail'`;
   test forgot-password to Yakir's own address; then `update too_settings set value='true' where key='mail_ready'`.
5. Yakir: Morning questions (Hebrew step 9). Yakir: read the terms, privacy and accessibility pages.
6. Run checks 1 to 3 again on the domain (open the site, sign up, reset password, test purchase in test mode).

## Launch day (only after Yakir says to open)

1. `launch.json` `live: true` (commit, push) and `too_settings.launch.live = true`.
2. `update too_settings set value='false' where key='test_mode'` (the purchase page switches to the real button).
3. Schedule renewals:
   ```sql
   select cron.schedule('too-renew-mail', '13 7 * * *', $c$ select net.http_post(url:='https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/too-pay?step=renew', body:='{}'::jsonb, headers:=jsonb_build_object('content-type','application/json','x-cron-secret',(select v from public.app_secrets where k='CRON_SECRET')), timeout_milliseconds:=120000) $c$);
   ```
4. Yakir: Google Search Console for the domain, submit `https://DOMAIN/sitemap.xml` (Hebrew step 10).
5. `tools/teamofone-content/TASK.md`: change the article link in the Telegram line to the domain.
6. Optional, Yakir's decision: one real small purchase by Yakir himself, then a refund in Morning.

## Security notes (review 25.11.2026)

- `too_pay_grant` and `too_sub_extend` are not executable by anon or signed-in users; only the service role.
- The callback trusts nothing from the browser: price is computed on the server; the key is per order, compared in
  constant time against its hash; non-pending orders are never granted twice.
- `?step=renew|status|selftest` require `CRON_SECRET` (constant-time compare); `selftest` refuses outside test mode.
- CORS for the new functions: preview origin, the launch domain (+www), `teamofone.pages.dev` (+ previews), localhost.
  (The old signup function allowed any `*.pages.dev`.)
- Login page: `?next=` now only accepts addresses inside the site (it accepted any address before, including script links).
- No secret is in the repo; the functions read Resend, Morning, Telegram and cron keys from app_secrets at run time.
- The project is shared with the office system. Office tables are gated by `is_office_user()` (email in office_users).
  Rule: always create an office person's sign-in account BEFORE adding their email to office_users, otherwise a stranger
  could register that email first. Recommended: Supabase "Confirm email" ON (Hebrew step 7).
