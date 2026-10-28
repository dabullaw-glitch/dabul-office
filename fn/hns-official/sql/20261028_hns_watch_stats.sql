-- 28.10.2026: per-source item statistics for hns-watch ("a source has had no items for much longer than usual").
-- n14 = items (not backfill) fetched in the last 14 days, last_item = newest fetched_at.
create or replace function public.hns_watch_sources()
returns table (id text, name_he text, kind text, role text, enabled boolean, poll_min int, last_run timestamptz, last_ok timestamptz,
               last_error text, fails int, notes text, n14 bigint, last_item timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.name_he, s.kind, s.role, s.enabled, s.poll_min, s.last_run, s.last_ok, s.last_error, s.fails, s.notes,
         coalesce(i.n14, 0), i.last_item
  from public.hns_sources s
  left join (select source_id, count(*) filter (where fetched_at > now() - interval '14 days' and not backfill) n14, max(fetched_at) last_item
             from public.hns_items where fetched_at > now() - interval '30 days' group by source_id) i on i.source_id = s.id;
$$;
revoke all on function public.hns_watch_sources() from public, anon, authenticated;
grant execute on function public.hns_watch_sources() to service_role;
