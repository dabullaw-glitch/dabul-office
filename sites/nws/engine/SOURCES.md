# HNS news engine - source registry summary

Verified 23 Oct 2026. Full details are in `sources.json` (72 entries).

**How this was tested:** every URL was opened with a fetcher running outside Israel. The build sandbox blocks direct `curl`, so most entries have no exact HTTP status code. Entries marked "permission timeout" in `sources.json` could not be requested in this session. They are **unverified** and should be checked once from a browser before going live.

## 1. Works now from outside Israel (Supabase edge functions OK)

| Source | URL | Poll |
|---|---|---|
| Home Front Command official Telegram (verified badge) | https://t.me/s/PikudHaOref_all | 15-30 s |
| IMS warnings RSS (sea, heat, fire, wind) | https://ims.gov.il/sites/default/files/ims_data/rss/alert/rssAlert_general_country_he.xml | 5 min |
| IMS Netanya forecast JSON (hourly, includes `wave_height`) | https://ims.gov.il/he/forecast_data/7 | 60 min |
| IMS sea forecast XML (Central Coast = 210, ISO-8859-8) | https://ims.gov.il/sites/default/files/ims_data/xml_files/isr_sea.xml | 3 h |
| MDA official Telegram | https://t.me/s/mdaisrael | 1-2 min |
| Israel Police Telegram | https://t.me/s/israelpoliceforce | 5 min |
| Netanya duty pharmacy (static HTML) | https://www.netanya.muni.il/pharmacy | twice a day |
| ynet news / ynet flashes RSS | https://www.ynet.co.il/Integration/StoryRss2.xml, StoryRss1854.xml | 2-5 min |
| Walla Israel RSS | https://www.walla.co.il/rss/feed/news/israel | 5 min |
| Maariv RSS | https://www.maariv.co.il/Rss/RssChadashot | 5 min |
| Israel Hayom RSS | https://www.israelhayom.co.il/rss.xml | 5 min |
| Globes (capital markets) RSS | https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585 | 15 min |
| NetanyaNet local news (HTML list, RSS disabled) | https://www.netanyanet.co.il/חדשות-נתניה/חדשות-מקומיות | 10 min |
| Maccabi Netanya official site | https://fcmn.co.il/ | 30 min |
| Culture Hall ticketing listing (server-rendered) | https://netanya.smarticket.co.il/ | 6 h |
| Kfar Yona news (sequential ids) | https://kfar-yona.muni.il/news/ | 60 min |
| Even Yehuda / Pardesiya / Emek Hefer / Kadima-Tzoran sites | see `sources.json` | 1-2 h |

Media feeds carry only titles and teasers. Publish headline + link at most, never the article body.

**Loads, but don't rely on it:**
- KSN feed: no posts since Aug 2025.
- mynet Netanya: newest posts are from Dec 2025.
- mako feed: stale, and it shows sports items.
- Netanya municipality site: SharePoint, and the news, protocol and committee lists are rendered by JavaScript (`{{...}}` placeholders). These need a headless browser.

## 2. Needs an Israeli server, or failed from abroad

- **Home Front Command JSON** (`oref.org.il/WarningMessages/alert/alerts.json` and the history endpoints). Israel-only: we got a 4xx, and this is documented by the pikud-haoref-api library. It is the fastest alert source, so run it from an Israeli VPS polling every 3 s and push the result to Supabase.
- **Failed from abroad with 4xx:** Kan (rss, traffic reports), Netivei Israel (iroads.co.il), Calcalist, Sport5, ONE, Tel Mond council, sharonline.co.il. Retest these from an Israeli server.
- **JavaScript single-page apps** that need a headless browser (and preferably an Israeli IP): IEC outage search, nadlan.gov.il, bus.gov.il.
- **robots.txt refuses our fetcher:** Haaretz, mavat.iplan.gov.il, police.gov.il, netanya-culture.co.il. Do not scrape these.

## 3. Needs registration or a key

| Source | Cost | How |
|---|---|---|
| IMS observation API (api.ims.gov.il, Envista) | free | Accept the terms at https://ims.gov.il/he/ObservationDataAPI and request a token. Community docs say by email to ims@ims.gov.il, which is unverified. |
| MOT SIRI real-time buses | free | Register with the Ministry of Transport (https://www.gov.il/he/Departments/General/real_time_information_siri). Not needed for news. |
| nadlan.gov.il / GovMap deals | unknown | Requests use a signed, domain-bound payload plus an `apiToken`. Request an official token and do not bypass the signing. |
| Facebook / Instagram (municipality, club) | app review | Meta Graph API with Page Public Content Access. Not practical; follow these manually. |
| X (police, club) | paid | X API. Not recommended. |
| Tzofar API / Telegram (api.tzevaadom.co.il) | needs permission | It works from abroad, but their terms (s.10-11) forbid automated use, redistribution and commercial use without written authorization. Only use it if they give written permission. |

## 4. Press lists to request (manual, by the editor)

- **Netanya municipality spokesperson:** use the contact form at https://www.netanya.muni.il/CityHall/Units/Pages/Spokespersons.aspx, or call 106. Most local municipal stories come from this list.
- **Israel Police, Sharon area / Central District spokesperson:** ask to join the press list. A recognized media outlet is usually required. The WhatsApp channel https://whatsapp.com/channel/0029VaECQkU05MUnP6BPsO2G is official but can't be read by a machine.
- **Fire and Rescue Central District spokesperson:** we found no official Telegram channel. Ask to join their media WhatsApp group or press list.
- **MDA spokesperson:** optional, since the Telegram channel already covers it.
- **Laniado Hospital:** via https://www.laniado.org.il/en/contact/ (phone 09-860-4666).
- **Mei Netanya (water) and IEC:** ask for outage notices for Netanya and the Sharon.
- **Councils:** Even Yehuda, Kadima-Tzoran, Emek Hefer, Kfar Yona, Tel Mond and Pardesiya. Each has resident WhatsApp groups; ask their spokespeople for email press releases.
- **Netanya planning committee:** https://nat.bartech-net.co.il/SearchMeetings. It is a public site that lists agendas and protocols, so no request is needed, but check it once in a browser.

## 5. How local sites get news (from public information)

- **NetanyaNet** (operated by לשם בר תקשורת בע"מ) has a reader tip form called "המייל הכתום": "יש לך סיפור? סקופ? צילמת אירוע?". Readers can send files, email info@netanyanet.co.il, or call 050-2847774. The site names no staff reporters.
- **KSN** stories mostly carry the byline Orly Bar.
- **mynet** uses bylined reporters and a "red mail" tip line.
- Typical stories match municipal press releases (education results, the culture hall), police and MDA releases (a new police post, a cardiac arrest rescue, an arson), and reader tips or photos.
- Most local outlets appear to rely on municipal and emergency-service press lists, WhatsApp groups and reader tips rather than original reporting.

## 6. Recommended polling plan

**Tier 0 - Israeli VPS (small, always on):**
- Oref `alerts.json` every 3 s.
- Push new alerts to Supabase through an HTTPS webhook.
- The same box can run a headless browser for Israel-only and JavaScript sites (Kan, iroads, IEC, Tel Mond, Netanya muni lists), every 15-30 min.

**Tier 1 - Supabase cron, every 1 min:**
- `t.me/s/PikudHaOref_all` (backup alerts that work abroad).
- `t.me/s/mdaisrael`.
- ynet flashes.

**Tier 2 - every 5 min:**
- IMS warnings RSS.
- Police Telegram.
- ynet, Walla, Maariv and Israel Hayom RSS. Use a keyword filter: נתניה, השרון, אבן יהודה, קדימה, צורן, עמק חפר, כפר יונה, תל מונד, פרדסיה, plus Netanya neighborhoods.
- Unofficial fire Telegram, as tips only.

**Tier 3 - every 10-30 min:**
- NetanyaNet HTML list and news08 (headline monitoring only).
- fcmn.co.il.
- Mei Netanya, once verified.

**Tier 4 - hourly:**
- IMS Netanya forecast JSON.
- Sharon council news pages.
- Netanya YouTube RSS.

**Tier 5 - daily or a few times a day:**
- Duty pharmacy at 00:30 and 08:00.
- IMS sea XML.
- Smarticket events.
- Planning committee (Bartech) and the iplan ArcGIS layer.
- Council protocols.
- GTFS diff (on the VPS, because edge functions cannot use FTP).

**General rules:**
- Store a hash and GUID per item.
- Use conditional GETs (ETag / If-Modified-Since).
- Back off after errors.
- Attribute the source on every item.
- Never auto-publish items from community or unofficial sources without editor approval.
