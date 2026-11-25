# Growth review data - Dabul Law Office - pulled 2026-11-05

Source: Supabase project mgjmnvpnovkewvqevjmz, read-only SELECTs. Table `docs(coll,id,data)` unless noted.
Periods: Sep 2026, Oct 2026, Nov 1-5 2026. Money in ILS as stored (deal fees look VAT-inclusive in some rows, field `noTax` exists; not normalized).
Important coverage gaps: `leads` starts 2026-10-16, `siteclicks` starts 2026-10-20, `pub` starts 2026-10-01, `artjob` starts 2026-10-08. So Sep has no lead/social/article data in the system (not zero activity, just not tracked).

---

## 1. Leads

### 1a. CRM leads (`leads`) by month and class
SQL: `select id, data->>'created', data->>'test', data->>'source', data->>'via', data->>'campaign', data->>'area', data->>'topic', data->>'stage', data->>'lostReason', left(data->>'notes',80) from docs where coll='leads'`

| Month | Rows | Test (`test=true`) | Spam not flagged (English text via WhatsApp form, foreign phone) | Real |
|---|---|---|---|---|
| Sep | 0 | - | - | - (not tracked) |
| Oct (16-31) | 16 | 3 | 6 | 7 |
| Nov 1-5 | 2 | 0 | 0 | 2 (one is a lawyer acquaintance asking advice) |

### 1b. Real leads by source/channel
| Channel | Sep | Oct | Nov 1-5 |
|---|---|---|---|
| Website form (`source=website`, `via=website-form`) | n/t | 7 | 2 |
| Facebook / Meta (lead or `utm_source=facebook`) | n/t | 0 (1 test row only) | 0 |
| Google Ads | n/t | 0 | 0 |
| Directory (folivus / dir_lawyer) | n/t | 0 | 0 |
| Referral | n/t | 0 | 0 |
| Other | n/t | 0 | 0 |

Website-form leads by campaign label (Oct+Nov real): "אתר · אמצע מאמר" 3, "אתר · טופס ממוקד" 3, "אתר · ארנונה לנכס ריק" 1, "אתר · בדיקת נסח טאבו" 1, no label 1 (home page).

### 1c. Real leads by area
| Area | Oct | Nov 1-5 |
|---|---|---|
| Real estate (חברה משכנת, תמ"א 38, גגות, רכוש משותף, הערת אזהרה, ארנונה, נסח טאבו, הפקעה, general מקרקעין) | 7 | 2 |
| Insolvency / debt | 0 | 0 |
| Other | 0 | 0 |

Outcome of the 9 real leads: won 1 (ארנונה לנכס ריק, fee 1,180, became matter m-mvnu98jbwqij), contacted 1, lost 7 (price 2, no answer 2, not relevant 1, only wanted general info 1, other 1).

### 1d. Click-to-contact events (`siteclicks`)
SQL: `select to_char((data->>'at')::timestamptz,'YYYY-MM'), data->>'kind', data->>'src', data->>'device', count(*) from docs where coll='siteclicks' group by 1,2,3,4`

| Month | Total | Phone | WhatsApp | Email | by src |
|---|---|---|---|---|---|
| Sep | n/t | | | | |
| Oct (20-31) | 17 | 13 | 4 | 0 | google 11, direct 3, facebook 2 (/lp-debt/), internal 1 (incl. 1 click on `/__test__/`) |
| Nov 1-5 | 9 | 9 | 0 | 0 | google 9 (all mobile) |

### 1e. Other lead-related sources
- `leads_spam` (blocked, reason `no-turnstile`, all "טופס וואטספ"): Oct 25-31 = 12, Nov 1-4 = 7. SQL: `select date, form, reason, count(*) from docs where coll='leads_spam' group by ...`
- `fbleads` (Facebook groups scanner): 9 real posts captured Oct 25-26 (done 3, no 4, new 2; 1 of type "seek"); 598 groups joined; last successful run 2026-10-26.
- GA4 (`ga/leads-2026-10`, Oct 1-31): phone_click 39, whatsapp_click 19, lead_form_submit 15, email_click 1. Office tracker in the same doc: 13 leads, 16 clicks, 1 won.
- `clients` created: Sep 20 (all source "עסקת מקרקעין"), Oct 11 (none 4, ידני 3, חתימה מרחוק 1, אתר: שירותים אונליין 1, ליד: אתר 1, קליטת חוזה 1), Nov 1-5: 2 (no source).

Odd: 6 English spam leads from 22-24.10 sit in `leads` as stage=lost, not `test`/spam - they inflate October counts (16 rows, only 7 real). GA counts 39 phone + 19 WhatsApp clicks in Oct vs 13 + 4 in `siteclicks` (siteclicks only from 20.10, but gap is still large). 25 GA key events on /lp-debt/ in 28d vs 0 real debt leads in CRM.

---

## 2. Deals and money

### 2a. Real-estate deals (`deals`, 38 rows total, first created 2026-03-19)
SQL: `with d as (select (data->>'fee')::numeric fee, (data->>'feePaid')::boolean paid, nullif(data->>'signDate','')::date sign, nullif(data->>'created','')::date created, data->>'status' st, data->>'source' src, price ...) select ... group by month`

| | Sep | Oct | Nov 1-5 |
|---|---|---|---|
| New deals opened (`created`) | 4 | 2 | 2 |
| Fee of new deals | 30,045 | 19,000 | 11,210 |
| Avg fee of new deals | 7,511 | 9,500 | 5,605 |
| Status of new deals now | 4 signed-awaiting-registration | 1 cancelled (11,800), 1 draft sent (7,200) | 1 draft sent (4,720), 1 in review (6,490) |
| Deals signed (`signDate` in month) | 4 (30,045) | 0 | 0 |
| Fee paid on new deals | 30,045 (100%) | 0 | 0 |
| Avg fee as % of price | 0.451% | 0.455% | 0.371% |

All-time (38 deals): total fee 281,380, avg 7,405; avg fee/price 0.426% (avg price 1,645,842). Cancelled 5 (39,163). Live deals 33: fee 242,217, collected 223,807, open unpaid 18,410 (3 deals, all opened Oct-Nov). Status: הושלם ונרשם 13, נחתם-ממתין לרישום 17, נשלחה טיוטה 2, בבדיקה 1, בוטלה 5. One completed deal has fee 0 (d-781e2787). Signed per month all-time: Apr 1, May 3, Jun 6, Jul 2, Aug 2, Sep 4, Oct 0, Nov 0 (only 18 of 38 deals have signDate).

Lead source on deals: 2 of 38 have `source` (both "broker", Oct). `realtor` field filled on 32 of 38 (Sep 4/4, Oct 2/2, Nov 1/2). No deal has a leadId link to `leads`.

### 2b. Other matters and fee plans (`matters`, `plans`)
- Matters created: Oct 7 (company 1, family 2, other 3, insolvency 1), Sep 0, Nov 0. Fees on Oct matters: 4,130 + 3,540 + 4,720 + 1,770 + 1,180 = 15,340 (+ a 20,000 plan created 2.10, archived, 5,000 paid).
- Plan installments (SQL: `jsonb_array_elements(data->'installments')` grouped by due month):

| Due month | Installments | Due | Paid | Overdue unpaid |
|---|---|---|---|---|
| Sep | 4 | 6,680 | 5,000 | 1,680 |
| Oct | 8 | 18,480 | 15,030 | 3,450 |
| Nov | 5 | 10,220 | 5,540 | 0 (not yet due) |

Non-archived plans total: 99,950 scheduled, 70,630 paid, 3,360 overdue. Future installments (from 5.11): 23, 49,500 (8,540 already prepaid).

---

## 3. Site / SEO

### 3a. GSC totals (`gsc/series`, daily c/i/p; last day 2026-11-03)
SQL: `with s as (select key::date d, (value->>'c')::int c, (value->>'i')::int i, (value->>'p')::numeric p from docs, jsonb_each(data->'days') where coll='gsc' and id='series') select ...`

| Window | Clicks | Impressions | Avg pos (impr-weighted) | CTR |
|---|---|---|---|---|
| Last 28d (Oct 7 - Nov 3) | 1,992 | 211,267 | 12.00 | 0.94% |
| Prev 28d (Sep 9 - Oct 6) | 1,364 | 142,114 | 11.86 | 0.96% |
| Change | +46% | +49% | +0.14 (worse) | |

Monthly: Jun 2,883 / 247,432; Jul 2,894 / 239,402; Aug 2,570 / 220,143; **Sep 1,659 / 167,336**; Oct 1,958 / 211,260; Nov 1-3 336 / 31,446. Sep was -43% clicks vs Jul; Oct still -32% vs Jul.

`gsc/pages-28d` (Oct 6 - Nov 3, 466 pages): clicks 2,068, impr 228,088, weighted pos 13.41 (prev 11.34); prev window clicks 1,360, impr 147,505.

### 3b. Top 10 pages by clicks (gsc/pages-28d)
| Page | Clicks | Impr | Pos | Prev pos | Prev clicks |
|---|---|---|---|---|---|
| /המחירון-המשפטי-המלא-לשנת-2026-כמה-עולה-עור/ | 158 | 11,514 | 9.18 | 8.32 | 151 |
| /איך-מוצאים-את-הגוש-והחלקה-של-הנכס-המדרי/ | 143 | 24,220 | 7.53 | 9.14 | 32 |
| /פטור-ארנונה-לנכס-ריק/ | 81 | 5,383 | 5.82 | 6.58 | 56 |
| /איך-משלמים-מס-רכישה/ | 77 | 12,778 | 6.78 | 6.43 | 63 |
| /how-long-does-pinui-binui-take-timeline/ | 39 | 2,434 | 5.51 | 5.33 | 17 |
| /כתב-ערבות-לשכירות/ | 37 | 694 | 8.23 | 7.95 | 37 |
| /זכויות-בנייה-והצמדת-גגות-בבניינים-משו/ | 35 | 2,256 | 6.77 | 7.81 | 20 |
| /חברה-משכנת-העברת-זכויות-ורישום-ראשון/ | 33 | 2,271 | 13.08 | 5.78 | 39 |
| /completion-certificate-vs-form-4-legal-guide/ | 32 | 2,403 | 6.48 | 7.27 | 18 |
| /הקניית-בעלות-במנהל-רמי/ | 32 | 2,294 | 6.52 | 6.49 | 28 |

Top page (legal price list) top query in sample: "כמה עולה עורך דין גירושין" (118 impr, pos 61.8).

### 3c. GA4 sessions by channel (`ga/series`)
| Channel | Sep | Oct | Nov 1-4 |
|---|---|---|---|
| Organic Search | 1,707 | 2,259 | 435 |
| Direct | 147 | 418 | 40 |
| Referral | 63 | 67 | 3 |
| Organic Social | 12 | 66 | 10 |
| AI Assistant | 7 | 39 | 8 |
| Paid Social | 0 | 121 (7 days, 17 key events) | 0 |
| Paid Search | 0 | 25 (4 days, 1 key event) | 0 |
Key events were 0 in Aug-Sep (tracking not set up before Oct).

### 3d. Articles
SQL: `select data->>'mode', data->>'status', to_char(publishAt,'YYYY-MM'), count(*), count(*) filter (where liveOk='true') from docs where coll='artjob' group by 1,2,3`

| | Sep | Oct | Nov 1-5 |
|---|---|---|---|
| New articles published (artjob scheduled, publishAt passed) | 0 in system | 10 | 2 |
| Existing pages upgraded (artjob mode=upgrade) | 0 | 10 | 1 |
| pagework done | 0 | 10 | 1 (+1 working) |

Queues: artq queued 38, taken 12, duplicate 14 (all created Oct-Nov). upq queued 70, drafted 13, skipped 1. Stated rhythm (seoplan/linkrules): 3 new articles/week. Live check `liveOk=false` on 2 published articles (aj-heskem-mamon-20261028, aj-heter-bniya-20261103); 6 Oct articles have no liveOk value.

---

## 4. Social publishing (`pub`)
SQL: `select case when at<'2026-11-01' then 'Oct' else 'Nov1-5' end, data->>'status', count(*) ... where at between '2026-10-01' and '2026-11-06'`; channel via `jsonb_array_elements_text(data->'channels')`.

| Status | Sep | Oct | Nov 1-5 |
|---|---|---|---|
| published | 0 rows (calendar starts Oct) | 39 | 6 |
| skipped | | 10 | 3 |
| planned (date passed, never ran) | | 3 | 2 (+2 later today) |
| waiting | | 3 | 1 |
| missed | | 0 | 1 |
| cancelled | | 0 | 1 (+7 future rows cancelled) |
| duplicate | | 0 | 1 |
| failed | | 0 | 0 |

Published by channel (row counts): Oct - facebook 16, youtube 16, instagram 14, tiktok 12, linkedin 6, x 3, gbp 2. Nov 1-5 - youtube 2, gbp 1, instagram 1, facebook 1, tiktok 1, x 1.
Published by kind: Oct - video 23, image 6, own-video 5, weekly 3, article 1, carousel 1. Nov 1-5 - video 3, image 1, own-video 1, weekly 1.

Main non-publish reasons:
- Instagram image posts skipped by rule (8.10: IG reels only) - 5 rows.
- TikTok AI videos skipped by rule (20.10: no AI videos on TikTok/IG) - 2 rows.
- Schedule changes (FB 2x/week, LinkedIn 1x/week, IG reel moved to Thursday) - 4 rows.
- WhatsApp group posts stuck in `waiting` "until Green API upgrade" - 4 rows (11.10, 18.10, 25.10, 1.11).
- Internal "community" draft rows left `planned` after date - 4 rows.
- 4.11 video (steps): `the reel file is missing in storage` on youtube, facebook, instagram (cancelled + missed).
- 7 YouTube rows cancelled per Yakir 3.11 ("no YouTube videos Claude edited alone").
- 1 GBP post marked duplicate (LB10 post, already uploaded).

Instagram (`igstats` weekly): followers 17 (11.10) -> 18 -> 18 -> 22 (1.11); media 19 -> 33; likes on listed reels 0 / 6 / 11 / 15 per week. Insights call fails every week: "error #10 (no permission)".

Future calendar: 113 planned rows from 5.11 to 25.3.2027 (101 video). 36 of the 101 point to 16 reels with id prefix `rl-cl-` (prefix meaning not verified); 15 of those 36 are YouTube.

---

## 5. Video pipeline
SQL: `select data->>'status', count(*) from docs where coll in ('vidreq','prompt','reel') group by ...`

| vidreq (all created Nov 1-4) | n |
|---|---|
| approved | 8 |
| rejected | 5 |
| raw-wait | 2 |
| final-wait | 1 |
| script-wait | 1 |
| test-done | 1 |

| prompt (scripts, Oct 9 - Nov 5) | n |
|---|---|
| filmed | 25 |
| skipped | 12 |
| replaced | 6 |
| ready | 3 |
| done | 1 |
| draft | 1 |
| test-done | 1 |

| reel | n |
|---|---|
| handed | 51 (created 7-15.10) |
| approved | 8 (1-2.11) |
| rejected | 3 |
| awaiting | 1 |

Reels/videos published (pub rows status=published, kind video/own-video): Sep 0 (not tracked), Oct 28, Nov 1-5 4. Reels with `igAt` set: Oct 7, Nov 1.

---

## 6. Google Business Profile
SQL: `select id, data from docs where coll='gbpstats'`; reviews from `settings/gbp.api` and `agents gbp-*`.

| Month | Views (impressions) | Calls | Website clicks | Directions |
|---|---|---|---|---|
| Sep | 502 (mobile search 361, desktop search 77, desktop maps 45, mobile maps 19) | 5 | 2 | 33 |
| Oct | 424 (307 / 70 / 24 / 23) | 1 | 3 | 46 |
| Nov | not pulled yet (monthly) | | | |

Reviews: 120 on Google, rating 5 (settings/gbp, synced 2026-11-05 06:23). `gbprev` rows 122 (1 gone), avg 4.97, 121 replied, 1 low (3 stars, Jul). Agent logs: newReviews 6 (27.10), 5 (3.11). Note: `gbprev.created` shows 14 on 25.10, 11 on 26.10, 16 on 1.11, 5 on 2.11 - looks like import/workflow dates, not review dates, so not usable as reviews/month.

---

## 7. Paid ads (`agents/ads-2026-11-05`, plus ads-2026-10-20..11-03 and `adcampaign`)

Meta (campaign "debt-10-2026", account 384785107903614, paused by Yakir 22.10, unchanged since):
| Ad | Impr | Clicks | Spend | Leads |
|---|---|---|---|---|
| 6-outin | 3,229 | 25 | 78.08 | 0 |
| 7-premium | 2,560 | 24 | 57.10 | 0 |
| 8-yearend | 2,672 | 25 | 50.26 | 0 |
| Total | 8,461 | 74 | 185.44 | 0 |
Campaign lifetime (campaignA): impr 8,794, clicks 77, spend 189.03. Real campaign leads since 19.10: 0. Cost per lead: n/a (0 leads); cost per click ~2.45. Last 7d spend 0. Online-services Meta campaigns (meta-online-2026-10b/c) built, ad set paused pending advertiser ID verification.

Google Ads: insolvency campaign 24367968711 ENABLED 19.10 21:18 (daily budget 60, Maximize Clicks cap 45, lp /lp-debt/); real-estate campaign 24373532866 paused 19.10. Only spend data: ads-2026-10-20 - account 7d spend 68.62, 10 clicks, 217 impr (insolvency 40.94, CTR 12.28%, 0 conversions; real estate 27.68). From 23.10 every log says "leads data only, Adspirer paused until 19.11", adspirerCalls 0 - no Google spend/status recorded since 20.10. Google leads: 0. Rule in adcampaign: "<3 real leads by ~18.11 -> recommend stop or change".

---

## 8. Systems load

### 8a. Cron
SQL: `select count(*), count(*) filter (where active) from cron.job` -> 78 jobs, 70 active.
Runs per day (`cron.job_run_details`, last 3 days; 2.11 and 5.11 are partial days): 2.11 5,783 / 3.11 8,472 / 4.11 8,472 / 5.11 2,687 (to ~09:30). 0 failed. Total runtime ~4.6 min/day (most jobs fire async http calls).
Share of runs on 4.11 by family: hns (news portal) 3,845 = 45.4%, office 2,920 = 34.5%, nws (news portal) 1,248 = 14.7%, bufpub/cache/socialpub 144 each, nl 24, morningprobe 2, backup 1. News portal (hns+nws, 29 jobs) = 60% of runs.

Top 10 by runs/day:
| Job | Schedule | Runs/day | Avg sec |
|---|---|---|---|
| office-quote-gen | * * * * * | 1,440 | 0.02 |
| hns-collect | * * * * * | 1,440 | 0.03 |
| nws-push | */2 * * * * | 720 | 0.04 |
| hns-publish | */3 * * * * | 480 | 0.03 |
| office-callbacks | */5 * * * * | 288 | 0.04 |
| nws-uptime | 2-59/5 * * * * | 288 | 0.03 |
| hns-write | 3-59/5 * * * * | 288 | 0.03 |
| hns-national | 1-59/5 * * * * | 288 | 0.03 |
| hns-official | 1-59/5 * * * * | 288 | 0.03 |
| hns-social | 3-59/5 * * * * | 288 | 0.03 |

`cron.job_run_details`: 121,195 rows since 2026-10-02 (no purge), 94 MB of a 159 MB database (docs table 20 MB). `net._http_response` last 24h: 1,842 responses - 200: 1,818, 401: 12, 404: 12. Inactive: 5 newsdigest-* jobs, 3 office jobs.

### 8b. Storage
SQL: `select bucket_id, count(*), sum((metadata->>'size')::bigint)/1048576 mb from storage.objects group by 1`
| Bucket | Files | MB |
|---|---|---|
| files | 1,259 | 1,045.3 |
| nws-img | 166 | 108.1 |
| pv | 484 | 43.4 |
| backups | 9 | 42.2 |
| nws-columns | 1 | 0.0 |
| hns-tips | 1 | 0.0 |
| Total | 1,920 | ~1,239 |

Top folders in `files` (prefix = first 1-2 path parts):
| Prefix | Files | MB | Newest |
|---|---|---|---|
| reels | 35 | 955.4 | 2026-11-03 |
| docarchive/sitebak | 453 | 28.3 | 2026-10-22 |
| previews | 40 | 23.7 | 2026-10-27 |
| insolv/m-insolv-1 | 101 | 18.8 | 2026-11-04 |
| docarchive/tmpwork | 540 | 8.4 | 2026-10-22 |
| clients/c-mvj52a7179ep | 2 | 3.9 | 2026-10-22 |
| clients/c-kniaz | 2 | 2.6 | 2026-10-25 |
| insolv/m-kniaz-insolv | 17 | 1.2 | 2026-10-25 |
| sign/2026-10-02 | 3 | 0.7 | 2026-10-02 |
| signed/2026-10-05 | 1 | 0.5 | 2026-10-05 |
| signed/2026-10-01 | 1 | 0.5 | 2026-10-01 |
| sign/2026-10-05 | 1 | 0.4 | 2026-10-05 |
| 2026-10-01 | 1 | 0.4 | 2026-10-01 |
| magnets | 1 | 0.2 | 2026-10-07 |
| docarchive/tmp | 51 | 0.1 | 2026-10-22 |

Largest `docs` collections by row count: nwsimglab 1,217, tmpwork 540, sitebak 511, nwsimgvet 249, nwsrealimg 229 (tmpwork/sitebak also copied to storage docarchive/ on 22.10, rows still in docs).

### 8c. Agent logs with errors, last 7 days (`agents`, ids >= 2026-10-29)
| Agent | Runs w/ error | Error |
|---|---|---|
| fbscan | 11 (29.10 - 31.10, every run) | "Claude in Chrome tools not available in this cloud run" - ok=false, 0 posts; no fbscan run logged after 31.10 |
| mail2deal | 3 (29.10, 1.11, 2.11) | gmail-needs-reconnect / gmail-not-connected |
| ads | 6 runs, no errors, but Google side blind ("Adspirer paused until 19.11") | |
| heygen | 9 runs (1-3.11), errors [] | |
| ops | 3 runs ok; "79 outreach drafts, none failed" | |
Also: pub 4.11 "reel file is missing in storage" (3 channels); igstats "error #10 (no permission)" every week; settings/connections shows meta=false, site=false.

---

## Things that look broken or wasteful (facts only)
1. Lead tracking only exists from 16.10 (forms) and 20.10 (clicks); Sep cannot be compared. GA reports 39 phone + 19 WhatsApp clicks in Oct vs 13 + 4 in `siteclicks`.
2. 6 English spam leads (22-24.10) are stored in `leads` as normal lost leads, not test/spam; Oct shows 16 rows but only 7 real leads.
3. Paid ads produced 0 real leads: Meta 185-189 spend, 74-77 clicks, 0 leads; Google 68.62 in first days, 0 leads. The Google insolvency campaign was ENABLED (60/day) on 19.10 and there is no Google spend/status data in any log after 20.10; GA shows Paid Search sessions on only 4 days in Oct and none in Nov.
4. The ads agent still runs (6 runs in 7 days) while all Meta ads are paused and Google data is switched off - each log repeats the same frozen numbers.
5. 0 deals signed in Oct and Nov 1-5 (4 in Sep). Oct-Nov new deals: 4, one cancelled, none paid. Only 2 of 38 deals record a source; no deal links to a lead.
6. Average deal fee is 0.43% of price (stated range 0.5%-1.5%); one completed deal has fee 0.
7. GSC clicks dropped from ~2,890/month (Jun-Jul) to 1,659 in Sep; Oct recovered to 1,958. Avg position for the 28d page set slipped 11.34 -> 13.41. One top-10 page (חברה משכנת העברת זכויות) fell from pos 5.78 to 13.08.
8. Top organic page is the legal price list; its top query sampled is divorce-lawyer cost (not a practice area), pos 61.8.
9. All 9 real leads were real estate; 0 insolvency leads despite the /lp-debt/ page getting 25 GA key events and both paid campaigns targeting debt.
10. Facebook group scanner failed on every run 29-31.10 (no Chrome in cloud run) and has not logged since 31.10; 2 captured group posts still `new` since 26.10.
11. mail2deal fails on Gmail not connected (29.10, 1.11, 2.11).
12. 79 outreach drafts, 0 sent; `office-outreach-send` runs every 20 min 07-14 Sun-Thu (~22 runs/day).
13. WhatsApp group posts stuck in `waiting` since 11.10 (Green API upgrade not done); internal "community" rows left `planned` after their dates.
14. 4.11 scheduled video failed on 3 channels: reel file missing in storage. 101 future video rows are planned to 25.3.2027; 36 use `rl-cl-*` reels, 15 of them on YouTube, while 7 YouTube rows were cancelled on 3.11 for being Claude-edited.
15. 2 published articles have `liveOk=false` (29.10, 4.11).
16. Instagram insights fail weekly (error #10, Meta connection = false); followers 22.
17. Storage ~1.24 GB in total; `files/reels` alone is 955 MB in 35 files.
18. `cron.job_run_details` holds 121k rows / 94 MB (59% of the 159 MB database), never purged; 8,472 cron runs/day, 60% of them for the Netanya news portal (hns/nws), 1,440/day for `office-quote-gen` (every minute).
19. 12 x 401 and 12 x 404 responses in the last 24h of `net._http_response` (endpoint not recorded in that table).
20. `gbprev.created` dates cluster on 25-26.10 and 1-2.11 (41 rows) while the Google total stays 120; this field cannot be used for reviews per month.
21. Sep shows 20 new clients all with source "עסקת מקרקעין" vs 4 deals opened in Sep.
