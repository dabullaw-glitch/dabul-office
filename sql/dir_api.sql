-- Directory engine for Folivus and the lawyer portal of בלי חובות (2.11.2026).
-- The project has reached its limit of edge functions, so the engine is one database function, called by the static sites
-- through the public REST endpoint: POST /rest/v1/rpc/dir_api {"a": "<action>", "p": {...}} with the publishable key.
-- Data in docs: dir_lawyer, dir_review, dir_lead, dir_rank, dir_req. New rows by INSERT, changes only by docs_merge.
-- Actions: export {site} | lead | otp (no SMS sender yet: {skip:true}) | review | join | claim | remove | decide {id,t,act}.
-- Spec: sites/folivus/SPEC.md.

create or replace function public.dir_s(x text, n int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(x, ''), '[[:cntrl:]]', ' ', 'g')), n) $$;
create or replace function public.dir_ml(x text, n int) returns text language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(x, ''), E'[\\x01-\\x09\\x0b-\\x1f\\x7f]', ' ', 'g')), n) $$;
create or replace function public.dir_list(j jsonb) returns jsonb language sql immutable as $$
  select coalesce((select jsonb_agg(public.dir_s(x, 60)) from (
    select x from jsonb_array_elements_text(case jsonb_typeof(j) when 'array' then j when 'string' then jsonb_build_array(j) else '[]'::jsonb end) x
    where btrim(x) <> '' limit 10) t), '[]'::jsonb) $$;

create or replace function public.dir_tg(txt text, buttons jsonb default null) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare tok text := (select v from app_secrets where k = 'TELEGRAM_BOT_TOKEN'); chat text := (select v from app_secrets where k = 'TELEGRAM_CHAT_ID');
begin
  if tok is null or chat is null then return; end if;
  perform net.http_post(url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
    body := jsonb_strip_nulls(jsonb_build_object('chat_id', chat, 'text', left(txt, 4000), 'disable_web_page_preview', true,
      'reply_markup', case when buttons is null then null else jsonb_build_object('inline_keyboard', buttons) end)),
    headers := '{"content-type":"application/json"}'::jsonb);
end $$;

create or replace function public.dir_api(a text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  site text := case when p->>'site' in ('folivus', 'blihovot') then p->>'site' else 'folivus' end;
  sitehe text;
  ph text := regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g');
  nm text := public.dir_s(p->>'name', 80);
  hash text; lid text; law jsonb; rid text; qid text; tk text; msg text; q jsonb; d jsonb; base text; ttl text;
  lines text[]; n int; st int; rv jsonb; dat jsonb; newid text; rname text;
  now_t text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  sfx text := to_char(now(), 'YYMMDDHH24MISS') || substr(md5(random()::text), 1, 5);
begin
  sitehe := case site when 'blihovot' then 'בלי חובות' else 'פוליבוס' end;

  if a = 'export' then
    with L as (
      select data l from docs where coll = 'dir_lawyer' and data->>'status' = 'live'
        and (jsonb_typeof(data->'sites') is distinct from 'array' or jsonb_array_length(data->'sites') = 0 or data->'sites' ? site)
        and (site <> 'blihovot' or data->'areas' ?| array['insolvency', 'enforcement'])),
    R as (
      select data->>'lawyerId' rl, jsonb_agg(jsonb_build_object('stars', data->'stars', 'text', data->'text', 'name', data->'name',
               'area', data->'area', 'created', data->'created') order by data->>'created' desc) revs,
             count(*) c, round(avg((data->>'stars')::numeric), 1) av
      from docs where coll = 'dir_review' and data->>'status' = 'live' group by 1)
    select jsonb_build_object('at', now_t, 'site', site,
      'lawyers', coalesce(jsonb_agg(jsonb_strip_nulls(
          (L.l - 'claim' - 'phoneHash' - 'fromReq' - 'requestedPlan' - 'removedBy' - 'removedAt')
          || jsonb_build_object('reviews', coalesce(R.revs, '[]'::jsonb), 'reviewCount', coalesce(R.c, 0), 'avg', coalesce(R.av, 0))
          || case when site = 'blihovot' then jsonb_build_object('areas', (select coalesce(jsonb_agg(x), '[]'::jsonb)
                  from jsonb_array_elements_text(L.l->'areas') x where x in ('insolvency', 'enforcement'))) else '{}'::jsonb end)), '[]'::jsonb),
      'ranks', (select coalesce(jsonb_agg(data), '[]'::jsonb) from docs where coll = 'dir_rank'))
    into rv from L left join R on R.rl = L.l->>'id';
    return rv;
  end if;

  if a = 'otp' then return jsonb_build_object('ok', true, 'skip', true); end if;

  if a = 'decide' then
    qid := regexp_replace(coalesce(p->>'id', ''), '[^a-z0-9-]', '', 'g');
    tk := regexp_replace(coalesce(p->>'t', ''), '[^a-f0-9]', '', 'g');
    select data into q from docs where coll = 'dir_req' and id = qid;
    if q is null or tk = '' or q->>'token' is distinct from tk then return jsonb_build_object('ok', false, 'msg', 'הקישור לא תקין או שפג תוקפו.'); end if;
    if q->>'status' <> 'new' then
      return jsonb_build_object('ok', true, 'msg', 'הבקשה כבר טופלה (' || case when q->>'status' = 'approved' then 'אושרה' else 'נדחתה' end || ').');
    end if;
    d := coalesce(q->'data', '{}'::jsonb); lid := q->>'lawyerId'; msg := 'נדחה. לא שינינו כלום באתר.';
    if p->>'act' = 'ok' then
      if q->>'kind' = 'review' and d->>'reviewId' is not null then
        perform docs_merge('dir_review', d->>'reviewId', jsonb_build_object('status', 'live', 'verified', true, 'verifiedBy', 'phone-call', 'approvedAt', now_t));
        msg := 'חוות הדעת אושרה ותופיע בבנייה הבאה של האתר.';
      elsif q->>'kind' = 'claim' and lid is not null then
        perform docs_merge('dir_lawyer', lid, jsonb_build_object('verified', true, 'source', 'claimed', 'updated', now_t,
          'claim', jsonb_build_object('name', d->'name', 'phone', d->'phone', 'email', d->'email', 'at', now_t)));
        msg := 'הפרופיל סומן כמאומת ושויך למשרד.';
      elsif q->>'kind' = 'remove' and lid is not null and d->>'sub' = 'update' then
        msg := 'סומן כמאושר. את השינויים עצמם צריך להכניס לפרופיל לפי מה שכתבו בהערות.';
      elsif q->>'kind' = 'remove' and lid is not null then
        perform docs_merge('dir_lawyer', lid, jsonb_build_object('status', 'removed', 'removedAt', now_t, 'removedBy', 'request ' || qid));
        msg := 'הפרופיל הוסר ויירד מהאתר בבנייה הבאה.';
      elsif q->>'kind' = 'join' then
        newid := 'law-' || substr(qid, 4);
        insert into docs (coll, id, data) values ('dir_lawyer', newid, jsonb_strip_nulls(jsonb_build_object(
          'id', newid, 'name', d->'name', 'firm', nullif(d->>'firm', ''), 'title', 'עו"ד', 'cities', coalesce(d->'cities', '[]'::jsonb),
          'areas', coalesce(d->'areas', '[]'::jsonb), 'phone', d->'phone', 'email', nullif(d->>'email', ''), 'site', nullif(d->>'siteUrl', ''),
          'licenseYear', d->'licenseYear', 'languages', '[]'::jsonb, 'source', 'self', 'verified', true, 'plan', 'free',
          'requestedPlan', nullif(d->>'plan', ''), 'featured', '{"areas":[],"cities":[]}'::jsonb,
          'sites', case when q->>'site' = 'blihovot' then '["blihovot","folivus"]'::jsonb else '["folivus"]'::jsonb end,
          'status', 'live', 'created', now_t, 'updated', now_t, 'fromReq', qid))) on conflict do nothing;
        msg := 'עורך הדין נוסף לאתר (חבילה בסיסית). יופיע בבנייה הבאה של האתר.';
      end if;
    elsif q->>'kind' = 'review' and d->>'reviewId' is not null then
      perform docs_merge('dir_review', d->>'reviewId', jsonb_build_object('status', 'rejected', 'rejectedAt', now_t));
    end if;
    perform docs_merge('dir_req', qid, jsonb_build_object('status', case when p->>'act' = 'ok' then 'approved' else 'rejected' end, 'decidedAt', now_t));
    return jsonb_build_object('ok', true, 'msg', msg);
  end if;

  if a not in ('lead', 'review', 'join', 'claim', 'remove') then return jsonb_build_object('ok', false, 'error', 'a?'); end if;
  if coalesce(p->>'website', '') <> '' then return jsonb_build_object('ok', true); end if;          -- bot trap field
  if nm = '' or length(ph) < 9 then return jsonb_build_object('ok', false, 'error', 'missing'); end if;
  hash := left(encode(digest(ph || '|' || coalesce((select v from app_secrets where k = 'CRON_SECRET'), ''), 'sha256'), 'hex'), 32);
  -- limits: 4 an hour from one phone, 40 in 10 minutes in all (so the forms can not flood the Telegram)
  select count(*) into n from docs where coll in ('dir_lead', 'dir_req') and data->>'phoneHash' = hash and (data->>'created')::timestamptz > now() - interval '1 hour';
  if n >= 4 then return jsonb_build_object('ok', true); end if;
  select count(*) into n from docs where coll in ('dir_lead', 'dir_req') and (data->>'created')::timestamptz > now() - interval '10 minutes';
  if n >= 40 then return jsonb_build_object('ok', true); end if;
  lid := regexp_replace(coalesce(p->>'lawyerId', ''), '[^a-z0-9-]', '', 'g');
  if lid <> '' then select data into law from docs where coll = 'dir_lawyer' and id = lid; end if;
  if law is null then lid := null; end if;

  if a = 'lead' then
    rid := 'dl-' || sfx;
    insert into docs (coll, id, data) values ('dir_lead', rid, jsonb_build_object('id', rid, 'site', site, 'lawyerId', lid,
      'area', dir_s(p->>'area', 60), 'city', dir_s(p->>'city', 60), 'name', nm, 'phone', dir_s(p->>'phone', 30), 'phoneHash', hash,
      'message', dir_ml(p->>'message', 2000), 'page', dir_s(p->>'page', 200), 'created', now_t, 'sentTo', 'site-list', 'status', 'new'));
    perform dir_tg('📥 פנייה חדשה ב' || sitehe || E'\n' || nm || ' · ' || dir_s(p->>'phone', 30)
      || coalesce(E'\nתחום: ' || nullif(dir_s(p->>'area', 60), ''), '') || coalesce(E'\nעיר: ' || nullif(dir_s(p->>'city', 60), ''), '')
      || coalesce(E'\nלעורך הדין: ' || (law->>'name') || case when coalesce(law->>'plan', 'free') <> 'free' then ' (מנוי)' else ' (פרופיל לא בתשלום, הפנייה נשמרה ברשימת האתר)' end, '')
      || coalesce(E'\n\n' || nullif(left(dir_ml(p->>'message', 2000), 600), ''), ''));
    return jsonb_build_object('ok', true, 'id', rid);
  end if;

  qid := 'dq-' || sfx; tk := encode(gen_random_bytes(16), 'hex');
  dat := jsonb_build_object('name', nm, 'phone', dir_s(p->>'phone', 30), 'email', dir_s(p->>'email', 120), 'firm', dir_s(p->>'firm', 120),
    'siteUrl', dir_s(p->>'siteUrl', 200), 'areas', dir_list(coalesce(p->'areas', p->'area')), 'cities', dir_list(coalesce(p->'cities', p->'city')),
    'licenseYear', case when coalesce(p->>'licenseYear', '') ~ '^\d{4}$' then (p->>'licenseYear')::int end, 'plan', dir_s(p->>'plan', 20),
    'message', dir_ml(p->>'message', 1500), 'sub', dir_s(p->>'kind', 20), 'page', dir_s(p->>'page', 200));
  if a = 'review' then
    st := case when coalesce(p->>'stars', p->>'star', '') ~ '^[1-5]$' then coalesce(p->>'stars', p->>'star')::int end;
    if lid is null or st is null then return jsonb_build_object('ok', false, 'error', 'missing'); end if;
    rid := 'dr-' || sfx;
    rname := split_part(nm, ' ', 1) || case when split_part(nm, ' ', 2) <> '' then ' ' || left(split_part(nm, ' ', 2), 1) || '.' else '' end;
    insert into docs (coll, id, data) values ('dir_review', rid, jsonb_build_object('id', rid, 'lawyerId', lid, 'stars', st,
      'text', dir_ml(p->>'text', 1500), 'name', rname, 'area', dir_s(p->>'area', 60), 'verified', false, 'phoneHash', hash,
      'status', 'pending', 'created', now_t, 'site', site));
    dat := dat || jsonb_build_object('reviewId', rid, 'stars', st, 'text', dir_ml(p->>'text', 1500));
  end if;
  insert into docs (coll, id, data) values ('dir_req', qid, jsonb_build_object('id', qid, 'kind', a, 'site', site, 'lawyerId', lid,
    'data', dat, 'phoneHash', hash, 'token', tk, 'status', 'new', 'created', now_t));
  base := coalesce((select data->>'approveBase' from docs where coll = 'settings' and id = 'folivus'), 'https://dabullaw-glitch.github.io/dabul-office/folivus/ishur/');
  ttl := case a when 'join' then 'בקשת הצטרפות' when 'claim' then 'בקשה לקבל פרופיל' when 'review' then 'חוות דעת חדשה'
         else case when dat->>'sub' = 'update' then 'בקשת עדכון פרטים' else 'בקשת הסרה' end end;
  lines := array['🗂 ' || ttl || ' ב' || sitehe, nm || ' · ' || (dat->>'phone') || coalesce(' · ' || nullif(dat->>'email', ''), '')];
  if law is not null then lines := lines || ('פרופיל: ' || (law->>'name')); end if;
  if a = 'review' then lines := lines || (repeat('★', st) || ' ' || left(dat->>'text', 500)) || 'כדאי להתקשר ולוודא שזה לקוח אמיתי לפני האישור.'::text; end if;
  if a = 'join' then lines := lines || ('תחומים: ' || coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(dat->'areas') x), '-')
      || ' · ערים: ' || coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(dat->'cities') x), '-')
      || coalesce(' · חבילה: ' || nullif(dat->>'plan', ''), '')); end if;
  if a = 'claim' then lines := lines || 'לפני האישור: לוודא בטלפון של המשרד שמי שפנה הוא עורך הדין.'::text; end if;
  if coalesce(dat->>'message', '') <> '' then lines := lines || left(dat->>'message', 500); end if;
  perform dir_tg(array_to_string(lines, E'\n'), jsonb_build_array(jsonb_build_array(
    jsonb_build_object('text', '✅ לאשר', 'url', base || '#id=' || qid || '&t=' || tk || '&act=ok'),
    jsonb_build_object('text', '✗ לדחות', 'url', base || '#id=' || qid || '&t=' || tk || '&act=no'))));
  return jsonb_build_object('ok', true, 'id', qid);
end $$;

revoke all on function public.dir_tg(text, jsonb) from public, anon, authenticated;
revoke all on function public.dir_api(text, jsonb) from public;
grant execute on function public.dir_api(text, jsonb) to anon, authenticated;
