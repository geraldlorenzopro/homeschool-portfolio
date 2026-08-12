-- Reshapes the portfolio around the way an IEP is written.
--
-- The old model was a diary: an activity had a subject, a date and hours. The
-- new one is goal-based: an *area* holds *goals*, and each *entry* records one
-- working session against a goal — the method used and how the child responded.
-- Dates and hours survive as optional fields, switched on or off per portfolio.
--
-- Safe to run after 0001. It only touches the `homeschool` schema.

-- ── areas (the old `subjects`, renamed and opened up) ─────────────────────

alter table homeschool.subjects rename to areas;
alter table homeschool.areas add column if not exists is_custom boolean not null default false;

-- The ten areas an IEP usually covers. Existing portfolios keep Language Arts
-- and Mathematics; these fill in the rest, and the user can add their own.
create or replace function homeschool.seed_student_areas()
returns trigger
language plpgsql
security definer
set search_path = homeschool, pg_temp
as $fn$
begin
  insert into homeschool.areas (student_id, key, label, sort) values
    (new.id, 'ela',            'Language Arts',            1),
    (new.id, 'math',           'Mathematics',              2),
    (new.id, 'speech',         'Speech & Language',        3),
    (new.id, 'fine_motor',     'Fine Motor',               4),
    (new.id, 'gross_motor',    'Gross Motor',              5),
    (new.id, 'social',         'Social-Emotional',         6),
    (new.id, 'behavior',       'Behavior',                 7),
    (new.id, 'daily_living',   'Daily Living / Self-Help', 8),
    (new.id, 'attention',      'Attention & Study Skills', 9),
    (new.id, 'sensory',        'Sensory & Regulation',     10)
  on conflict (student_id, key) do nothing;
  return new;
end;
$fn$;

drop trigger if exists students_seed_subjects on homeschool.students;
drop trigger if exists students_seed_areas on homeschool.students;
create trigger students_seed_areas
  after insert on homeschool.students
  for each row execute function homeschool.seed_student_areas();

drop function if exists homeschool.seed_student_subjects();

-- The trigger only fires for new students, so students created under 0001
-- would keep just Language Arts and Mathematics. Those two stay exactly as
-- they are — they are the portfolio's spine — and the eight IEP domains are
-- added alongside them.
insert into homeschool.areas (student_id, key, label, sort)
select s.id, d.key, d.label, d.sort
from homeschool.students s
cross join (values
  ('ela', 'Language Arts', 1), ('math', 'Mathematics', 2),
  ('speech', 'Speech & Language', 3), ('fine_motor', 'Fine Motor', 4),
  ('gross_motor', 'Gross Motor', 5), ('social', 'Social-Emotional', 6),
  ('behavior', 'Behavior', 7), ('daily_living', 'Daily Living / Self-Help', 8),
  ('attention', 'Attention & Study Skills', 9), ('sensory', 'Sensory & Regulation', 10)
) as d(key, label, sort)
on conflict (student_id, key) do nothing;

-- ── goals ─────────────────────────────────────────────────────────────────

create table if not exists homeschool.goals (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references homeschool.students (id) on delete cascade,
  area_id    uuid not null references homeschool.areas (id) on delete cascade,
  text       text not null default '',
  -- 'not_started' | 'in_progress' | 'met' | 'not_met'
  status     text not null default 'not_started',
  -- 'iep' marks a goal transcribed from the official IEP, so the evaluator can
  -- tell it apart from one the parent wrote.
  source     text not null default 'parent',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── entries (the old `activities`, reshaped) ──────────────────────────────

create table if not exists homeschool.entries (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references homeschool.students (id) on delete cascade,
  area_id       uuid not null references homeschool.areas (id) on delete cascade,
  -- Nullable: work in an area does not always map to a written goal.
  goal_id       uuid references homeschool.goals (id) on delete set null,
  title         text not null default '',
  method        text not null default '',
  outcome       text not null default '',
  -- 'full_support' | 'partial_support' | 'independent'
  outcome_level text,
  date          date,
  hours         numeric(5, 2),
  sort          int  not null default 0,
  created_at    timestamptz not null default now()
);

-- Carry over anything already logged, so nothing written is lost.
insert into homeschool.entries (student_id, area_id, title, method, date, hours, created_at)
select a.student_id, a.subject_id, a.title, a.notes, a.date, a.hours, a.created_at
from homeschool.activities a
where exists (select 1 from homeschool.areas ar where ar.id = a.subject_id);

drop table if exists homeschool.activities;

-- ── evaluations ───────────────────────────────────────────────────────────

create table if not exists homeschool.evaluations (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references homeschool.students (id) on delete cascade,
  title           text not null default '',
  -- Psychoeducational, Speech & Language, Occupational Therapy, …
  kind            text not null default 'Psychoeducational',
  evaluation_date date,
  performed_by    text not null default '',
  summary         text not null default '',
  storage_path    text,
  file_name       text,
  mime            text,
  size_bytes      bigint,
  sort            int not null default 0
);

-- ── attachments ───────────────────────────────────────────────────────────
-- One file store for every section, so "upload a document here" works the same
-- way on a goal, a curriculum row, a book or an entry.

create table if not exists homeschool.attachments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references homeschool.students (id) on delete cascade,
  -- 'goal' | 'entry' | 'curriculum' | 'book' | 'area' | 'profile'
  owner_type   text not null,
  owner_id     uuid,
  title        text not null default '',
  storage_path text,
  file_name    text,
  mime         text,
  size_bytes   bigint,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);

-- ── work samples now hang off an area, and optionally a goal ──────────────

alter table homeschool.work_samples
  add column if not exists area_id uuid references homeschool.areas (id) on delete set null,
  add column if not exists goal_id uuid references homeschool.goals (id) on delete set null,
  add column if not exists sort int not null default 0;

update homeschool.work_samples w
set area_id = a.id
from homeschool.areas a
where a.student_id = w.student_id
  and w.area_id is null
  and a.key = w.subject;

alter table homeschool.work_samples drop column if exists subject;

-- Books gain a sort so they can be reordered by hand like everything else.
alter table homeschool.books add column if not exists sort int not null default 0;

-- ── child profile and per-portfolio display settings ──────────────────────

alter table homeschool.students
  add column if not exists diagnosis            text not null default '',
  add column if not exists diagnosis_date       date,
  add column if not exists diagnosed_by         text not null default '',
  add column if not exists no_formal_diagnosis  boolean not null default false,
  add column if not exists strengths            text not null default '',
  add column if not exists needs                text not null default '',
  add column if not exists learns_best          text not null default '',
  -- The printed PDF leaves the parent's control, and this section carries a
  -- minor's medical information, so including it is a deliberate choice.
  add column if not exists include_profile      boolean not null default false,
  add column if not exists show_dates           boolean not null default true,
  add column if not exists show_hours           boolean not null default false,
  add column if not exists show_activity_log    boolean not null default false;

-- ── indexes ───────────────────────────────────────────────────────────────

create index if not exists goals_student_idx       on homeschool.goals (student_id, sort);
create index if not exists goals_area_idx          on homeschool.goals (area_id, sort);
create index if not exists entries_student_idx     on homeschool.entries (student_id, sort);
create index if not exists entries_area_idx        on homeschool.entries (area_id);
create index if not exists entries_goal_idx        on homeschool.entries (goal_id);
create index if not exists evaluations_student_idx on homeschool.evaluations (student_id, sort);
create index if not exists attachments_owner_idx   on homeschool.attachments (owner_type, owner_id);
create index if not exists attachments_student_idx on homeschool.attachments (student_id);

-- ── row-level security for the new tables ─────────────────────────────────

alter table homeschool.goals       enable row level security;
alter table homeschool.entries     enable row level security;
alter table homeschool.evaluations enable row level security;
alter table homeschool.attachments enable row level security;

do $do$
declare t text;
begin
  foreach t in array array['goals', 'entries', 'evaluations', 'attachments'] loop
    execute format('drop policy if exists %I_owner on homeschool.%I', t, t);
    execute format(
      'create policy %I_owner on homeschool.%I for all to authenticated
         using (homeschool.owns_student(student_id))
         with check (homeschool.owns_student(student_id))', t, t);
  end loop;
end $do$;

grant select, insert, update, delete on all tables in schema homeschool to authenticated;
grant all on all tables in schema homeschool to service_role;
