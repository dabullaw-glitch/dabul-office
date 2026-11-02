# Folivus (folivus.com) and the בלי חובות lawyer portal: spec (2.11.2026)

Owner: Yakir Dabul. Approved decisions (2.11.2026):
- Build new, like nws.co.il (static Astro site in this repo, built by GitHub Actions, served by Cloudflare Pages from a branch).
- Lawyers at launch: basic details from public sources (firms' own websites and public listings), each profile with a visible
  "this is me / update / remove" path. Never bulk-scrape the Israel Bar registry, never copy Google reviews, bios or photos.
- Ratings: BOTH a yearly ranking ("נבחרת Folivus") that lawyers pay to apply to, with a public method and a clear
  "השתתפות בדירוג כרוכה בתשלום" note, AND verified client reviews.
- A second front end on the same engine: the lawyer portal of בלי חובות (blihovot.co.il), only insolvency (חדלות פירעון),
  debt settlements (הסדרי חובות) and enforcement (הוצאה לפועל), by city and region. בלי חובות keeps its neutral brand and never
  links to the law office or to Folivus.

Reference sites (research 2.11.2026): martindale.co.il ("עו"ד עכשיו", ~4,600 firms, 36 areas, area/city/area+city pages, paid
"משרד נבחר" badges, 1,200 / 2,400 / 3,600 NIS a year), lawbuzz.co.il (LB10 yearly rankings per area, reviews, price guides,
rulings), consulto.co.il (free / 29 / 149 NIS a month, claim-your-profile, AI problem matcher).

## Language and rules (every page)
Hebrew, RTL, simple words. No em dash or en dash characters anywhere (use "-" or rewrite). No superlatives of our own
("הכי", "הטוב ביותר", "מוביל" as our claim), never "מומחה" about a lawyer, no promises. Every profile built from public sources
shows: "הפרטים נאספו ממקורות ציבוריים ואינם המלצה. זה המשרד שלך? אפשר לעדכן או להסיר בלחיצה." Paid placement is always labelled
("מקודם" / "מודעה"). Reviews: only verified (phone OTP or the lawyer's invite link), moderated, negative ones shown too.

## Engine (Supabase project mgjmnvpnovkewvqevjmz, table docs(coll,id,data), edge function `dir`)
Collections:
- dir_lawyer: {id (slug), name, firm, title ('עו"ד'), cities:[cityslug], regions:[], areas:[areaslug], phone, whatsapp, email,
  site, address, about (own words, short), licenseYear, languages:[], photo (only if the lawyer uploaded it), source
  ('public'|'self'|'claimed'), sourceUrl, verified (bool, set after claim), plan ('free'|'pro'|'premium'), planUntil,
  featured:{areas:[], cities:[]}, sites:['folivus','blihovot'], status ('live'|'hidden'|'removed'), created, updated}
- dir_review: {lawyerId, stars 1-5, text, name (first name + initial), area, verified:true, phoneHash, status ('pending'|'live'|
  'rejected'), created}
- dir_lead: {lawyerId|null, site, area, city, name, phone, message, created, sentTo}
- dir_rank: {year, area, list:[{lawyerId, place|tier}], method}
- dir_req: claim / update / remove / join requests, approved by Yakir in Telegram (one tap) like the other office flows.
Function `dir` (verify_jwt false, CORS *):
- GET ?a=export&site=folivus|blihovot  -> {at, lawyers:[public fields + score + reviewCount + avg], ranks, areas, cities}
  (blihovot: only lawyers with insolvency / debt-settlement / enforcement areas; firm site links allowed, no office links).
- POST ?a=lead {site, lawyerId?, area, city, name, phone, message, turnstile} -> saves, sends to the lawyer (email or WhatsApp
  if the lawyer has a paid plan or claimed the profile; otherwise to the site's own lead list) and Telegram note to Yakir.
- POST ?a=review / ?a=otp (phone code by SMS/WhatsApp) / ?a=claim / ?a=remove / ?a=join -> dir_req + Telegram one-tap approval.
Score (0 to 100, public method on /shita/): verified reviews average and count (50), years of practice (15), profile
completeness (15), response to leads (10), recognitions such as the Folivus ranking (10). Paid plans never change the score.

## Site map (Hebrew slugs in latin letters, trailing slash)
/                      search (area + city + free text "describe your problem"), featured lawyers (labelled), areas grid,
                       cities by region, latest articles, ranking teaser, join CTA
/orchei-din/<area>/            area page: intro, filters, list (featured first, labelled), FAQ, related articles
/orchei-din/<area>/<city>/     area + city page (only when at least 1 lawyer, else noindex)
/ir/<city>/                    city page: all areas with counts
/ezor/<region>/                region page
/orech-din/<lawyer-id>/        profile: details, areas, cities, score with breakdown, verified reviews, contact form, WhatsApp,
                               "זה המשרד שלך?" claim, removal link, Bar status check link (link out only)
/nivcheret/                    ranking hub; /nivcheret/<year>/<area>/ ranking per area; /shita/ method and score explained
/maamarim/ and /maamarim/<slug>/  guides (auto-written, sources listed), linked to area pages
/lehitztaref/                  for lawyers: packages, claim, join form
/hasara/                       update or removal request
/odot/, /tnaei-shimush/, /mediniyut-pratiyut/, /negishut/, /tzor-kesher/
sitemap.xml, robots.txt, llms.txt, rss.xml; JSON-LD: Organization, WebSite+SearchAction, LegalService/Attorney on profiles,
BreadcrumbList, FAQPage, Article.

## Packages (DRAFT, prices wait for Yakir's approval; payment provider connected only at the end)
- בסיסי (free): profile, 1 area, 1 city, phone.
- מקצועי (149 NIS/month or 1,490/year): photo, bio, 3 areas, 3 cities, WhatsApp, contact form to email, "מקודם" in 1 area page.
- פרימיום (349 NIS/month or 3,490/year): everything + top of 3 area/city pages, home page featured block, 1 sponsored article a year.
- נבחרת Folivus application: 990 NIS per area per year (paid application, independent method, may not be included).

## בלי חובות portal
Same engine, same profile fields, its own design (the site's existing look), paths under /orchei-din/ (the hidden folder
_orchei-din-hidden becomes live), areas: חדלות פירעון, הסדרי חובות, הוצאה לפועל; city and region pages; its own packages page.
