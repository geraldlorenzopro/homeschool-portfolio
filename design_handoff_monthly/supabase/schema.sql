-- Portafolio de educación en casa (Florida) — esquema Supabase
-- Aplicar como primera migración. Requiere las extensiones por defecto de Supabase.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────── perfiles

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────── estudiantes

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  letter_of_intent_date date,          -- su mes y día = vencimiento anual de la evaluación
  parent_name text,
  address_line text,
  city text,
  state text not null default 'FL',
  zip text,
  county text not null default 'Broward',
  special_notes text,                  -- necesidades que puedan afectar el aprendizaje
  photo_path text,                     -- storage: portfolio-photos
  created_at timestamptz not null default now()
);

create index on public.students (owner_id);

-- ─────────────────────────────────────────────── años escolares

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  label text not null,                 -- '2025-2026'
  starts_on date not null,             -- 2025-08-01
  ends_on date not null,               -- 2026-07-31
  cover_note text,                     -- el espacio que personaliza la niña
  created_at timestamptz not null default now(),
  unique (student_id, label)
);

create index on public.school_years (student_id);

-- ─────────────────────────────────────────────── materias

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  name text not null,                  -- 'Language Arts', 'Mathematics', 'Music'
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (school_year_id, name)
);

create index on public.subjects (school_year_id);

-- ─────────────────────────────────────────────── log de actividades (el corazón)

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  covered_on date not null,            -- un día marcado en la cuadrícula
  note text,
  source text not null default 'manual',   -- 'manual' | 'time4learning'
  created_at timestamptz not null default now(),
  unique (subject_id, covered_on)
);

create index on public.activity_log (school_year_id, covered_on);

-- ─────────────────────────────────────────────── títulos de materiales

create table public.reading_materials (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  month date not null,                 -- primer día del mes: 2026-01-01
  title text not null,
  kind text,                           -- 'book' | 'workbook' | 'app' | 'website' | 'audiobook' | ...
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create index on public.reading_materials (school_year_id, month);

-- ─────────────────────────────────────────────── notas del mes

create table public.monthly_notes (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  month date not null,
  field_trips text,                    -- excursiones, eventos, actividades
  accomplishments text,                -- logros del mes
  hours_note text,                     -- el campo 'Hours or notes' de la hoja de log
  updated_at timestamptz not null default now(),
  unique (school_year_id, month)
);

-- ─────────────────────────────────────────────── muestras de trabajo

create table public.work_samples (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  month date not null,
  title text,
  description text,
  file_path text not null,             -- storage: work-samples
  mime_type text,
  created_at timestamptz not null default now()
);

create index on public.work_samples (school_year_id, month);

-- ─────────────────────────────────────────────── formularios legales

create type public.legal_form_kind as enum ('notice_of_intent', 'transfer_request', 'notice_of_termination');

create table public.legal_forms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  kind public.legal_form_kind not null,
  effective_date date,
  county text,
  new_county text,                     -- solo transfer_request
  former_address text,                 -- solo transfer_request
  new_address text,                    -- solo transfer_request
  data jsonb not null default '{}'::jsonb,
  signed_on date,
  sent_on date,
  district_confirmed_on date,
  document_path text,                  -- storage: documents (el PDF enviado)
  created_at timestamptz not null default now()
);

create index on public.legal_forms (student_id, kind);

-- ─────────────────────────────────────────────── evaluación anual

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_year_id uuid references public.school_years(id) on delete set null,
  due_on date not null,                -- aniversario del letter_of_intent_date
  method text,                         -- 'portfolio_review' | 'standardized_test' | 'psychologist'
  evaluator_name text,
  completed_on date,
  sent_to_district_on date,
  document_path text,                  -- storage: documents
  created_at timestamptz not null default now()
);

create index on public.evaluations (student_id, due_on);

-- ─────────────────────────────────────────────── importaciones de curriculum

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  provider text not null default 'time4learning',
  file_path text,
  raw jsonb not null default '{}'::jsonb,
  rows_created int not null default 0,
  imported_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════ RLS

alter table public.profiles          enable row level security;
alter table public.students          enable row level security;
alter table public.school_years      enable row level security;
alter table public.subjects          enable row level security;
alter table public.activity_log      enable row level security;
alter table public.reading_materials enable row level security;
alter table public.monthly_notes     enable row level security;
alter table public.work_samples      enable row level security;
alter table public.legal_forms       enable row level security;
alter table public.evaluations       enable row level security;
alter table public.imports           enable row level security;

create policy "profiles: self" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "students: owner" on public.students
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- helper: ¿el año escolar pertenece al usuario?
create or replace function public.owns_school_year(sy uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_years y
    join public.students s on s.id = y.student_id
    where y.id = sy and s.owner_id = auth.uid()
  );
$$;

create or replace function public.owns_student(st uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students s where s.id = st and s.owner_id = auth.uid());
$$;

create policy "school_years: owner" on public.school_years
  for all using (public.owns_student(student_id)) with check (public.owns_student(student_id));

create policy "subjects: owner" on public.subjects
  for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));

create policy "activity_log: owner" on public.activity_log
  for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));

create policy "reading_materials: owner" on public.reading_materials
  for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));

create policy "monthly_notes: owner" on public.monthly_notes
  for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));

create policy "work_samples: owner" on public.work_samples
  for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));

create policy "imports: owner" on public.imports
  for all using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));

create policy "legal_forms: owner" on public.legal_forms
  for all using (public.owns_student(student_id)) with check (public.owns_student(student_id));

create policy "evaluations: owner" on public.evaluations
  for all using (public.owns_student(student_id)) with check (public.owns_student(student_id));

-- ═══════════════════════════════════════════════ storage

insert into storage.buckets (id, name, public) values
  ('portfolio-photos', 'portfolio-photos', false),
  ('work-samples', 'work-samples', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- Los archivos se guardan bajo <auth.uid()>/... y solo su dueño los lee o escribe.
create policy "own files: read" on storage.objects for select
  using (bucket_id in ('portfolio-photos','work-samples','documents')
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own files: write" on storage.objects for insert
  with check (bucket_id in ('portfolio-photos','work-samples','documents')
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own files: update" on storage.objects for update
  using (bucket_id in ('portfolio-photos','work-samples','documents')
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own files: delete" on storage.objects for delete
  using (bucket_id in ('portfolio-photos','work-samples','documents')
         and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════ perfil automático

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
