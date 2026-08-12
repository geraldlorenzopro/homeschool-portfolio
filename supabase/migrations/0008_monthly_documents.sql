-- Everything else the folder has to carry: the Letter of Intent, the annual
-- evaluation, an immunization record, a certificate. They are not samples of
-- work and they are not curriculum, and until now the monthly portfolio had
-- nowhere to put them — so they lived outside it, which is exactly what a
-- portfolio kept "available for inspection" cannot afford.
--
-- `kind` is text rather than an enum: the list in the app will grow, and a
-- migration to add "Standardized test result" to a type is a poor trade.

create table if not exists portfolio.documents (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references portfolio.school_years (id) on delete cascade,
  title          text not null default '',
  kind           text not null default 'Other',
  document_date  date,
  note           text not null default '',
  storage_path   text,
  file_name      text,
  mime           text,
  size_bytes     bigint,
  sort           int  not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists portfolio_documents_year_idx on portfolio.documents (school_year_id);

alter table portfolio.documents enable row level security;

drop policy if exists documents_owner on portfolio.documents;
create policy documents_owner on portfolio.documents
  for all to authenticated
  using (portfolio.owns_year(school_year_id))
  with check (portfolio.owns_year(school_year_id));

grant select, insert, update, delete on all tables in schema portfolio to authenticated;
grant all on all tables in schema portfolio to service_role;

-- ── storage ───────────────────────────────────────────────────────────────
-- A separate bucket from the work samples, as in the evaluation portfolio: a
-- medical letter and a drawing of a cat do not belong in one place, and if a
-- link is ever shared by mistake it should not reach both.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-documents', 'portfolio-documents', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio-documents-owner" on storage.objects;
create policy "portfolio-documents-owner" on storage.objects for all to authenticated
  using (bucket_id = 'portfolio-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio-documents' and (storage.foldername(name))[1] = auth.uid()::text);
