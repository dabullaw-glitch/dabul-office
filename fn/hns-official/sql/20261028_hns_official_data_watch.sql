-- 28.10.2026: tables and sources for hns-official (official sources hns-collect cannot parse), hns-data (data stories)
-- and hns-watch (monitoring). Insert-only state: a row records that a run or an alert happened.

-- hns-data: one row per data story already produced (kind + key, e.g. 'nadlan' + dataset version); prevents doubles
create table if not exists public.hns_data_runs (
  id bigserial primary key,
  kind text not null,
  key text not null,
  story_id bigint,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  unique (kind, key)
);
alter table public.hns_data_runs enable row level security;

-- hns-watch: one row per alert sent (or suppressed); the 6 hour quiet period per issue is read from here
create table if not exists public.hns_watch_alerts (
  id bigserial primary key,
  issue text not null,
  text text not null,
  sent boolean not null default false,
  at timestamptz not null default now()
);
create index if not exists hns_watch_alerts_issue_at on public.hns_watch_alerts (issue, at desc);
alter table public.hns_watch_alerts enable row level security;

-- hns-watch: recent failed HTTP calls made by pg_cron through pg_net (status >= 500 or timeout), for "a function errors repeatedly"
create or replace function public.hns_watch_http(since timestamptz)
returns table (id bigint, status_code int, timed_out boolean, error_msg text, content text, created timestamptz)
language plpgsql security definer set search_path = public, net as $$
declare r record;
begin
  for r in select x.id, x.status_code, x.timed_out, x.error_msg, x.created from net._http_response x
           where x.created >= since and (x.status_code >= 500 or x.timed_out or x.error_msg is not null) order by x.id desc limit 200 loop
    id := r.id; status_code := r.status_code; timed_out := r.timed_out; error_msg := r.error_msg; created := r.created;
    begin
      select left(x.content, 300) into content from net._http_response x where x.id = r.id;
    exception when others then content := null; -- a body that is not valid text is skipped
    end;
    return next;
  end loop;
end $$;
revoke all on function public.hns_watch_http(timestamptz) from public, anon, authenticated;
grant execute on function public.hns_watch_http(timestamptz) to service_role;

-- new source kind 'html': an official web page that hns-official parses (the parser is chosen by the source id)
alter table public.hns_sources drop constraint if exists hns_sources_kind_check;
alter table public.hns_sources add constraint hns_sources_kind_check
  check (kind = any (array['telegram','rss','netanyanet','json','facebook','youtube','smarticket','auto','html']));

-- sources polled by hns-official. enabled=false on purpose: hns-collect polls every enabled row and does not know these kinds;
-- hns-official polls the kind 'html' and keeps last_run/last_ok/fails on these rows.
insert into public.hns_sources (id, name_he, kind, url, role, trust, local_only, extra_terms, poll_min, enabled, notes) values
 ('mei_netanya_water', 'מי נתניה - הודעות על הפסקות מים', 'html', 'https://www.mei-netanya.co.il/template/default.aspx?CatId=2&PageId=107', 'source', 'official', true, '{}', 20, false, 'polled by hns-official (kind html, parser mei_water); enabled=false keeps hns-collect away'),
 ('hof_hasharon', 'מועצה אזורית חוף השרון - חדשות', 'html', 'https://www.hof-hasharon.co.il/news/', 'source', 'official', true, '{חוף השרון}', 30, false, 'polled by hns-official (kind html, parser cms_news); enabled=false keeps hns-collect away')
on conflict (id) do nothing;

-- data stories: source ids used in hns_stories.sources (ROLE lookups in hns-publish); kind 'auto' and disabled, never polled
insert into public.hns_sources (id, name_he, kind, url, role, trust, local_only, poll_min, enabled, notes) values
 ('nadlan_gov', 'אתר הנדל״ן הממשלתי (רשות המסים)', 'auto', 'https://www.nadlan.gov.il/', 'source', 'official', true, 10080, false, 'data stories by hns-data'),
 ('mot_data', 'משרד התחבורה - מאגר תאונות הדרכים', 'auto', 'https://data.gov.il/dataset/accidents_municipal', 'source', 'official', true, 10080, false, 'data stories by hns-data')
on conflict (id) do nothing;
