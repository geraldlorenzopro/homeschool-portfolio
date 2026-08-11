-- Homeschool Portfolio (Florida) — schema, row-level security and storage.
--
-- Everything lives in its own `homeschool` schema and in two prefixed storage
-- buckets, so this file is safe to run on a Supabase project that already
-- hosts another app: it creates nothing in `public`, touches no existing
-- table, and grants nothing away from any other role. Moving to a dedicated
-- project later is the same file, unchanged — or a dump of this one schema.
--
-- After running it, add `homeschool` to Project Settings → API → Exposed
-- schemas, or PostgREST will not serve these tables.

create schema if not exists homeschool;

-- Only signed-in users ever reach this schema. `anon` is deliberately granted
-- nothing: the sign-in page needs no table here.
grant usage on schema homeschool to authenticated, service_role;

-- ── tables ────────────────────────────────────────────────────────────────

create table if not exists homeschool.students (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null default '',
  dob             date,
  grade           text not null default '',
  school_year     text not null default '',
  parent_name     text not null default '',
  county          text not null default '',
  evaluator       text not null default '',
  evaluation_date date,
  statement       text not null default '',
  created_at      timestamptz not null default now()
);

create table if not exists homeschool.subjects (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references homeschool.students (id) on delete cascade,
  key        text not null,
  label      text not null,
  sort       int  not null default 0,
  unique (student_id, key)
);

create table if not exists homeschool.activities (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references homeschool.students (id) on delete cascade,
  subject_id uuid not null references homeschool.subjects (id) on delete cascade,
  date       date,
  title      text not null default '',
  notes      text not null default '',
  hours      numeric(5, 2),
  created_at timestamptz not null default now()
);

create table if not exists homeschool.curriculums (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references homeschool.students (id) on delete cascade,
  title      text not null default '',
  publisher  text not null default '',
  -- 'ela' | 'math' | 'other'   ('other' renders as "Multiple subjects")
  subject    text not null default 'ela',
  usage      text not null default '',
  sort       int  not null default 0
);

create table if not exists homeschool.books (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references homeschool.students (id) on delete cascade,
  title       text not null default '',
  author      text not null default '',
  finished_on date,
  how_read    text not null default ''
);

create table if not exists homeschool.work_samples (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references homeschool.students (id) on delete cascade,
  title        text not null default '',
  subject      text not null default 'ela',
  date         date,
  storage_path text,
  mime         text
);

create table if not exists homeschool.support_documents (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references homeschool.students (id) on delete cascade,
  title         text not null default '',
  -- 'IEP' | '504 Plan' | 'Therapy / service plan' | 'Prior evaluation'
  -- | 'Medical letter' | 'Other'
  kind          text not null default 'IEP',
  document_date date,
  note          text not null default '',
  storage_path  text,
  file_name     text,
  mime          text,
  size_bytes    bigint
);

create index if not exists activities_student_idx   on homeschool.activities (student_id, date);
create index if not exists activities_subject_idx   on homeschool.activities (subject_id);
create index if not exists curriculums_student_idx  on homeschool.curriculums (student_id, sort);
create index if not exists books_student_idx        on homeschool.books (student_id, finished_on);
create index if not exists work_samples_student_idx on homeschool.work_samples (student_id, date);
create index if not exists support_docs_student_idx on homeschool.support_documents (student_id, document_date);
create index if not exists subjects_student_idx     on homeschool.subjects (student_id, sort);
create index if not exists students_user_idx        on homeschool.students (user_id, created_at);

-- ── seed the two fixed subjects for every new student ─────────────────────
-- Language Arts and Mathematics always exist; the table stays open so a user
-- can add more later.

create or replace function homeschool.seed_student_subjects()
returns trigger
language plpgsql
security definer
set search_path = homeschool, pg_temp
as $$
begin
  insert into homeschool.subjects (student_id, key, label, sort)
  values (new.id, 'ela', 'Language Arts', 1),
         (new.id, 'math', 'Mathematics', 2)
  on conflict (student_id, key) do nothing;
  return new;
end;
$$;

drop trigger if exists students_seed_subjects on homeschool.students;
create trigger students_seed_subjects
  after insert on homeschool.students
  for each row execute function homeschool.seed_student_subjects();

-- ── row-level security ────────────────────────────────────────────────────

alter table homeschool.students          enable row level security;
alter table homeschool.subjects          enable row level security;
alter table homeschool.activities        enable row level security;
alter table homeschool.curriculums       enable row level security;
alter table homeschool.books             enable row level security;
alter table homeschool.work_samples      enable row level security;
alter table homeschool.support_documents enable row level security;

drop policy if exists students_owner on homeschool.students;
create policy students_owner on homeschool.students
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One helper predicate, applied to every child table.
create or replace function homeschool.owns_student(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = homeschool, pg_temp
as $$
  select exists (
    select 1 from homeschool.students s
    where s.id = sid and s.user_id = auth.uid()
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'subjects', 'activities', 'curriculums', 'books',
    'work_samples', 'support_documents'
  ] loop
    execute format('drop policy if exists %I_owner on homeschool.%I', t, t);
    execute format(
      'create policy %I_owner on homeschool.%I for all to authenticated
         using (homeschool.owns_student(student_id))
         with check (homeschool.owns_student(student_id))', t, t);
  end loop;
end $$;

-- PostgREST checks table privileges before RLS, so `authenticated` needs the
-- grants; the policies above are what actually decide which rows it sees.
grant select, insert, update, delete on all tables in schema homeschool to authenticated;
grant all on all tables in schema homeschool to service_role;
alter default privileges in schema homeschool
  grant select, insert, update, delete on tables to authenticated;

revoke all on function homeschool.owns_student(uuid) from public;
revoke all on function homeschool.seed_student_subjects() from public;
grant execute on function homeschool.owns_student(uuid) to authenticated;

-- ── storage ───────────────────────────────────────────────────────────────
-- Both buckets are PRIVATE and prefixed, so they cannot collide with buckets
-- another app in this project already owns. Support documents hold IEPs and
-- medical letters — they are served only through short-lived signed URLs and
-- must never be public.
--
-- Object paths are {user_id}/{student_id}/{uuid}-{filename}, so the first path
-- segment is the ownership check.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('homeschool-work-samples', 'homeschool-work-samples', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('homeschool-support-documents', 'homeschool-support-documents', false, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['homeschool-work-samples', 'homeschool-support-documents'] loop
    execute format('drop policy if exists %I on storage.objects', b || '-owner');
    execute format(
      'create policy %I on storage.objects for all to authenticated
         using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
         with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      b || '-owner', b, b);
  end loop;
end $$;
