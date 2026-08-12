-- The monthly Florida portfolio — the second product behind the same link.
--
-- It is a different document from the IEP-style evaluation portfolio: a
-- twelve-month grid of days on which each subject was covered, plus the
-- statutory checklist and the legal forms. Same child, same account, separate
-- records — so it lives in its own schema and cannot collide with
-- `homeschool`, which already owns the names students, subjects and
-- work_samples.
--
-- The student itself is NOT duplicated. Sofía is one child; both portfolios
-- point at the same row in homeschool.students, and reuse the ownership
-- predicate that already guards it.

create schema if not exists portfolio;
grant usage on schema portfolio to authenticated, service_role;

-- ── a school year for one child ───────────────────────────────────────────

create table if not exists portfolio.school_years (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references homeschool.students (id) on delete cascade,
  label      text not null default '2025–2026',
  -- The cover and the record page
  parent_name           text not null default '',
  from_date             date,
  to_date               date,
  letter_of_intent_date date,
  address    text not null default '',
  city       text not null default '',
  zip        text not null default '',
  county     text not null default 'Broward',
  -- "This book belongs to me — my drawings and words"
  belongs_to_me text not null default '',
  -- Anything a reader of the record should know, e.g. special needs
  notes      text not null default '',
  cover_photo_path text,
  -- The statutory checklist, keyed by item: {"log": true, "titles": false, …}
  checklist  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (student_id, label)
);

-- ── subjects: the rows of the grid ────────────────────────────────────────
-- Language Arts, Mathematics and Music are given; the last two are the free
-- rows the prototype leaves for the parent to name.

create table if not exists portfolio.subjects (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references portfolio.school_years (id) on delete cascade,
  label          text not null default '',
  sort           int not null default 0
);

create or replace function portfolio.seed_year_subjects()
returns trigger
language plpgsql
security definer
set search_path = portfolio, pg_temp
as $fn$
begin
  insert into portfolio.subjects (school_year_id, label, sort) values
    (new.id, 'Language Arts', 1),
    (new.id, 'Mathematics',   2),
    (new.id, 'Music',         3),
    (new.id, '',              4),
    (new.id, '',              5);
  return new;
end;
$fn$;

drop trigger if exists school_years_seed_subjects on portfolio.school_years;
create trigger school_years_seed_subjects
  after insert on portfolio.school_years
  for each row execute function portfolio.seed_year_subjects();

-- ── the log itself ────────────────────────────────────────────────────────
-- One row per (subject, day covered). A checkbox in the grid is a row here.
-- Storing the day rather than a month/column index keeps it honest: the data
-- says "Language Arts on 14 January 2026", not "column 14 of some grid".

create table if not exists portfolio.activity_log (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references portfolio.subjects (id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  unique (subject_id, day)
);

-- ── the rest of each month's page ─────────────────────────────────────────

create table if not exists portfolio.monthly_notes (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references portfolio.school_years (id) on delete cascade,
  -- First day of the month it belongs to, so ordering is a date sort.
  month          date not null,
  hours_notes    text not null default '',
  reading_materials text not null default '',
  field_trips    text not null default '',
  accomplishments text not null default '',
  unique (school_year_id, month)
);

-- ── the three legal forms ─────────────────────────────────────────────────

create table if not exists portfolio.legal_forms (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references portfolio.school_years (id) on delete cascade,
  -- 'intent' | 'transfer' | 'termination'
  kind           text not null,
  effective_on   date,
  data           jsonb not null default '{}'::jsonb,
  unique (school_year_id, kind)
);

create index if not exists years_student_idx    on portfolio.school_years (student_id);
create index if not exists subjects_year_idx    on portfolio.subjects (school_year_id, sort);
create index if not exists log_subject_day_idx  on portfolio.activity_log (subject_id, day);
create index if not exists notes_year_month_idx on portfolio.monthly_notes (school_year_id, month);

-- ── row-level security ────────────────────────────────────────────────────
-- Every table reaches the owner through the school year's student, using the
-- predicate homeschool already defines. One child, one owner, one rule.

alter table portfolio.school_years   enable row level security;
alter table portfolio.subjects       enable row level security;
alter table portfolio.activity_log   enable row level security;
alter table portfolio.monthly_notes  enable row level security;
alter table portfolio.legal_forms    enable row level security;

create or replace function portfolio.owns_year(year_id uuid)
returns boolean
language sql
stable
security definer
set search_path = portfolio, homeschool, pg_temp
as $$
  select exists (
    select 1
    from portfolio.school_years y
    join homeschool.students s on s.id = y.student_id
    where y.id = year_id and s.user_id = auth.uid()
  );
$$;

revoke all on function portfolio.owns_year(uuid) from public;
grant execute on function portfolio.owns_year(uuid) to authenticated;

drop policy if exists school_years_owner on portfolio.school_years;
create policy school_years_owner on portfolio.school_years
  for all to authenticated
  using (homeschool.owns_student(student_id))
  with check (homeschool.owns_student(student_id));

do $do$
declare t text;
begin
  foreach t in array array['subjects', 'monthly_notes', 'legal_forms'] loop
    execute format('drop policy if exists %I_owner on portfolio.%I', t, t);
    execute format(
      'create policy %I_owner on portfolio.%I for all to authenticated
         using (portfolio.owns_year(school_year_id))
         with check (portfolio.owns_year(school_year_id))', t, t);
  end loop;
end $do$;

-- activity_log hangs off a subject, so it goes one join further out.
drop policy if exists activity_log_owner on portfolio.activity_log;
create policy activity_log_owner on portfolio.activity_log
  for all to authenticated
  using (exists (
    select 1 from portfolio.subjects s
    where s.id = subject_id and portfolio.owns_year(s.school_year_id)
  ))
  with check (exists (
    select 1 from portfolio.subjects s
    where s.id = subject_id and portfolio.owns_year(s.school_year_id)
  ));

grant select, insert, update, delete on all tables in schema portfolio to authenticated;
grant all on all tables in schema portfolio to service_role;
alter default privileges in schema portfolio
  grant select, insert, update, delete on tables to authenticated;

-- ── storage for the cover photograph ──────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-photos', 'portfolio-photos', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio-photos-owner" on storage.objects;
create policy "portfolio-photos-owner" on storage.objects for all to authenticated
  using (bucket_id = 'portfolio-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio-photos' and (storage.foldername(name))[1] = auth.uid()::text);
