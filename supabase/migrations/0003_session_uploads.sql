-- Photographs taken during a session.
--
-- A sample stays a first-class work sample — Florida asks for "samples of
-- work" as its own section of the portfolio, so it cannot live buried inside
-- a log row. This only records which session produced it, so the printed
-- document can show the picture beside the session it came from.
--
-- Deleting the session releases the sample rather than taking it with it.

alter table homeschool.work_samples
  add column if not exists entry_id uuid
    references homeschool.entries (id) on delete set null;

create index if not exists work_samples_entry_idx on homeschool.work_samples (entry_id);

-- Attachments hang off whatever row they were filed against, and go when it
-- goes. The owner is polymorphic, so this is enforced in the repository
-- rather than by a foreign key.
create index if not exists attachments_owner_id_idx on homeschool.attachments (owner_id);

grant select, insert, update, delete on all tables in schema homeschool to authenticated;
grant all on all tables in schema homeschool to service_role;
