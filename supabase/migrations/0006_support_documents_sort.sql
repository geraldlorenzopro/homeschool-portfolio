-- `support_documents` was the one table without a sort column.
--
-- The repository writes `sort` on every insert, for every collection, so
-- PostgREST rejected the whole row with PGRST204 and "Attach document" failed
-- against the real database while passing every test — the demo backend is
-- localStorage and has no schema to disagree with. The production table held
-- zero rows: no IEP, no therapy plan, nothing anyone had tried to attach.
--
-- scripts/check-schema.mjs now asserts that every table the repository writes
-- to has this column, so the next one cannot go missing quietly.

alter table homeschool.support_documents
  add column if not exists sort int not null default 0;

-- Existing rows keep their upload order rather than all tying at zero.
with ordered as (
  select id, row_number() over (partition by student_id order by document_date, title) as n
  from homeschool.support_documents
)
update homeschool.support_documents d
set sort = ordered.n
from ordered
where ordered.id = d.id and d.sort = 0;

grant select, insert, update, delete on all tables in schema homeschool to authenticated;
grant all on all tables in schema homeschool to service_role;
