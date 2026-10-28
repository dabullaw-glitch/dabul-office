# hns-recurring and hns-enrich (nws.co.il)

Approved by Yakir on 28.10.2026 at 17:45. Both functions are deployed with `verify_jwt=false` and check `x-cron-secret`.

## Schedules (pg_cron, `migration_20261028_cron.sql`)
| job | schedule (UTC) | what |
|---|---|---|
| hns-enrich | `2-59/10 * * * *` | context_ids + service_box on stories published or changed in the last 48h |
| hns-recurring-match | `4-59/15 * * * *` | Maccabi Netanya preview (30h..2h before), last update (4h..1h before), report (1h50..36h after) |
| hns-recurring-week | `1 7,8 * * 5` | "השבוע בנתניה", runs only at Friday 10:00 Israel time |
| hns-recurring-weekend | `1 9,10 * * 4` | "מה עושים בסוף השבוע", runs only at Thursday 12:00 Israel time |
| hns-recurring-council | `25 * * * *` | council / planning committee summaries |

## Council and planning committee summaries: the source that is missing
Today the only municipal council items are the YouTube notices of the Netanya municipality channel (`netanya_yt`,
"ישיבת מועצה / צפו בשידור החי"). They hold no agenda, no decisions and no protocol, so the format records them as
`no_content` in `hns_recurring` and writes nothing. A summary needs one of these as an official source in `hns_sources`
(trust `official`, role `source`, `local_only` true), collected by hns-collect:
1. The Netanya council protocols and agendas page on netanya.muni.il (PDF links, "פרוטוקולים / סדר יום ישיבות מועצה").
   netanya.muni.il answers 403 to servers (Cloudflare), so it needs a collector that can read it (or the PDFs' direct links).
2. The local planning committee decisions ("הוועדה המקומית לתכנון ובנייה נתניה"): the committee's agenda and decision
   PDFs, or the Planning Administration's public data (iplan / "מידע תכנוני") for Netanya plans.
3. Kadima Zoran council (`kadima_zoran`, already collected) posts council protocols only rarely; its items are already watched.
An item from such a source with at least 400 characters of text becomes a story (format `council_summary`, section `city`,
or `planning_summary`, section `realestate`), dated by the item and sourced to it.
