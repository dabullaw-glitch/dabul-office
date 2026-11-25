-- backup_table_keys (25.11.2026, backup fix approved by Yakir 25.11 21:01).
-- Read-only helper for fn/backup: the primary key columns of every public table, so the daily backup can read each
-- table page by page in a stable order (order by the primary key). Only the service role may call it.
create or replace function public.backup_table_keys()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(c.relname, k.cols), '{}'::jsonb)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join lateral (
    select jsonb_agg(a.attname order by array_position(i.indkey::int[], a.attnum::int)) cols
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = c.oid and i.indisprimary
  ) k on k.cols is not null
  where c.relkind in ('r', 'p');
$$;
revoke all on function public.backup_table_keys() from public, anon, authenticated;
grant execute on function public.backup_table_keys() to service_role;
