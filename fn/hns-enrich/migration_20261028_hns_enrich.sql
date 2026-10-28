-- hns-enrich and hns-recurring (28.10.2026, approved by Yakir 17:45): story enrichment fields, the curated "מה עושים" service
-- boxes, and the state of the recurring formats. Only adds columns and tables.
alter table public.hns_stories
  add column if not exists context_ids bigint[],          -- our earlier published stories on the same event, place or topic (1 to 3)
  add column if not exists service_box jsonb,             -- {key,title,lines[],link:{text,url},source} from hns_service_boxes
  add column if not exists enriched_at timestamptz,       -- when hns-enrich last looked at the story
  add column if not exists format text,                   -- recurring format: match_preview | match_report | week_roundup | weekend_guide | council_summary | planning_summary
  add column if not exists format_key text,               -- one story per occurrence, e.g. match:2026-10-31:9749, week:2026-10-30
  add column if not exists format_data jsonb;             -- structured data of the format (match, links, events)
create unique index if not exists hns_stories_format_key_live on public.hns_stories (format_key)
  where format_key is not null and state <> 'rejected';

create table if not exists public.hns_service_boxes (
  key text primary key,
  title text not null,
  lines text[] not null,
  link_text text not null,
  link_url text not null,
  source_name text not null,
  sections text[] not null default '{}',     -- empty = any section
  keywords text[] not null,                  -- substrings looked for in the title, subtitle and first paragraphs
  exclude text[] not null default '{}',      -- a story with one of these is not matched
  priority int not null default 0,           -- the highest matching box wins
  active boolean not null default true,
  checked_at timestamptz, check_status int,  -- last link check (hns-enrich action checklinks)
  note text,
  updated_at timestamptz not null default now()
);
alter table public.hns_service_boxes enable row level security;

create table if not exists public.hns_recurring (
  key text primary key,                      -- e.g. match:2026-10-31:9749, week:2026-10-30, weekend:2026-10-29, fixture
  format text not null,
  story_id bigint,
  stage text,                                -- e.g. preview, preview_final, report, done, held
  data jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hns_recurring enable row level security;

create table if not exists public.hns_recurring_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  format text, key text, story_id bigint,
  ai_calls int not null default 0,
  model text, usage jsonb, result jsonb
);
alter table public.hns_recurring_log enable row level security;
