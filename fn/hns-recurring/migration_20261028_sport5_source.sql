-- hns-recurring (28.10.2026): the league data source of the Maccabi Netanya formats, the same page the site uses
-- (sites/nws/scripts/sport.mjs). kind 'auto' and enabled=false: hns-collect never polls it; it is only a named source
-- (role 'source', trust 'media') that match previews and reports carry, so hns-publish sees a real source.
insert into public.hns_sources (id, name_he, kind, url, role, trust, local_only, enabled, notes)
values ('sport5', 'ערוץ הספורט - טבלת ליגת העל', 'auto', 'https://www.sport5.co.il/liga.aspx?FolderID=44', 'source', 'media', false, false,
        'hns-recurring: league table, fixtures and scores for the Maccabi Netanya preview and report. Not collected.')
on conflict (id) do nothing;
