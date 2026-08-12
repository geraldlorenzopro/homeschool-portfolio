-- Curriculum rows were left behind by 0002.
--
-- Everything else moved from the old `subject` string to a real reference to
-- an area, but `curriculums` kept its text column. The app writes `area_id`,
-- Postgres rejected the insert, and "Add curriculum" silently did nothing.
--
-- scripts/check-schema.mjs now fails the build on exactly this, so a column
-- the app writes can no longer go missing without anyone noticing.

alter table homeschool.curriculums
  add column if not exists area_id uuid references homeschool.areas (id) on delete set null;

-- Carry the old text over to the matching area before the column goes.
do $carry$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'homeschool'
      and table_name = 'curriculums' and column_name = 'subject'
  ) then
    update homeschool.curriculums c
    set area_id = a.id
    from homeschool.areas a
    where a.student_id = c.student_id
      and c.area_id is null
      -- 'other' meant "multiple subjects", which is now simply no area.
      and c.subject <> 'other'
      and a.key = c.subject;

    alter table homeschool.curriculums drop column subject;
  end if;
end $carry$;

create index if not exists curriculums_area_idx on homeschool.curriculums (area_id);

grant select, insert, update, delete on all tables in schema homeschool to authenticated;
grant all on all tables in schema homeschool to service_role;
