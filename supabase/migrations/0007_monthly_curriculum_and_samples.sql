-- The two things the monthly portfolio was missing to stand on its own as a
-- Florida record: the materials used, and the work the child produced.
--
-- s. 1002.41(1)(b), F.S. asks for three things in the portfolio — a log of
-- activities, the titles of materials used, and samples of work. The grid and
-- the reading lines covered the first two; the samples had nowhere to go.
--
-- Both hang off the school year, not off a month: a curriculum is used across
-- the year, and a sample keeps its own date. `month` on a sample is optional
-- and only files it under one sheet when the parent wants that.

create table if not exists portfolio.curriculums (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references portfolio.school_years (id) on delete cascade,
  title          text not null default '',
  publisher      text not null default '',
  -- Free text, not a reference: this product's subjects are five rows the
  -- parent names, and a curriculum may cover several of them or none.
  subject        text not null default '',
  usage          text not null default '',
  sort           int  not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists portfolio.work_samples (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references portfolio.school_years (id) on delete cascade,
  title          text not null default '',
  subject        text not null default '',
  -- '2026-01' when the sample belongs to a month, null when it stands alone.
  month          text,
  sample_date    date,
  note           text not null default '',
  storage_path   text,
  file_name      text,
  mime           text,
  size_bytes     bigint,
  sort           int  not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists portfolio_curriculums_year_idx on portfolio.curriculums (school_year_id);
create index if not exists portfolio_work_samples_year_idx on portfolio.work_samples (school_year_id);

alter table portfolio.curriculums  enable row level security;
alter table portfolio.work_samples enable row level security;

do $do$
declare t text;
begin
  foreach t in array array['curriculums', 'work_samples'] loop
    execute format('drop policy if exists %I_owner on portfolio.%I', t, t);
    execute format(
      'create policy %I_owner on portfolio.%I for all to authenticated
         using (portfolio.owns_year(school_year_id))
         with check (portfolio.owns_year(school_year_id))', t, t);
  end loop;
end $do$;

grant select, insert, update, delete on all tables in schema portfolio to authenticated;
grant all on all tables in schema portfolio to service_role;

-- ── storage for the samples ───────────────────────────────────────────────
-- Private, like every other bucket here: a child's schoolwork is served only
-- through short-lived signed URLs. Uploads are re-encoded before they arrive,
-- so only these two content types can ever be written.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-work-samples', 'portfolio-work-samples', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The first path segment is the owner's user id, so one account can never
-- read another's object even with a guessed name.
drop policy if exists "portfolio-work-samples-owner" on storage.objects;
create policy "portfolio-work-samples-owner" on storage.objects for all to authenticated
  using (bucket_id = 'portfolio-work-samples' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio-work-samples' and (storage.foldername(name))[1] = auth.uid()::text);
