-- CIC Launchpad core schema.
-- Content model: module -> lesson -> activity (CIC's brief).
-- Staff (admin, instructor, reviewer) sign in with Supabase Auth and are limited by
-- Row Level Security below. Students never get Supabase accounts: they join with a
-- class code + personal code through our server, which uses the secret key and checks
-- student_id itself. So no policy here grants anything to anonymous users.
-- Student data is limited to name, school and class (they are minors).

-- ---------- Staff profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'reviewer' check (role in ('admin', 'instructor', 'reviewer')),
  display_name text,
  created_at timestamptz not null default now()
);

-- New staff accounts start as read-only reviewers unless an admin invited them with
-- a role in app_metadata (which users can't edit themselves).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce(new.raw_app_meta_data ->> 'role', 'reviewer'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Curriculum ----------
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  position int not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  position int not null,
  source text not null default 'manual' check (source in ('manual', 'pptx', 'pdf', 'youtube')),
  source_url text,
  recap jsonb, -- 2-minute catch-up recap: key points, approved by staff
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position int not null,
  type text not null check (type in (
    'slide', 'video', 'quiz_mcq', 'predict_output', 'fix_bug', 'fill_blank',
    'parsons', 'code_exercise', 'worksheet', 'exit_question')),
  title text,
  content jsonb not null default '{}', -- prompt, options, answer, starter_code, tests, timestamps...
  concept_tag text, -- e.g. 'loops'; powers mastery and learning gain per topic
  is_core boolean not null default true, -- catch-up mode skips non-core ("extra") steps
  teaching_guide jsonb, -- { about, mistakes[], example, ask[] } for "Help me teach this"
  hints jsonb, -- staff-written hints, shown one at a time
  ai_suggested boolean not null default false, -- drafted by AI; a human must review before publish
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  kind text not null check (kind in ('pre', 'post')),
  unique (module_id, kind)
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  position int not null,
  concept_tag text not null,
  content jsonb not null -- { prompt, options[], answer }
);

-- ---------- Classes and students ----------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- e.g. "Period 3"
  school text not null,
  instructor_id uuid references public.profiles (id) on delete set null,
  class_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  session_date date not null,
  lesson_id uuid references public.lessons (id) on delete set null
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  display_name text not null,
  school text,
  -- sha256(class_id || ':' || code). The plain code is only shown once, on the printed card.
  join_code_hash text not null,
  start_module_id uuid references public.modules (id) on delete set null, -- late joiners
  created_at timestamptz not null default now(),
  unique (class_id, join_code_hash)
);

create table public.attendance (
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null check (status in ('present', 'absent')),
  primary key (session_id, student_id)
);

create table public.unlock_overrides (
  student_id uuid not null references public.students (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, module_id)
);

create table public.lesson_status (
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  -- 'exempt' is recorded separately and never counts as completed
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'exempt')),
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

-- One row per student interaction. Powers the course map, live classroom,
-- needs-help flags, catch-up, mastery and learning gain.
create table public.activity_events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  event_type text not null check (event_type in (
    'view', 'attempt', 'run', 'check', 'hint', 'submit', 'complete', 'skip',
    'catchup_assigned', 'catchup_passed')),
  correct boolean,
  tests_passed int,
  tests_total int,
  duration_ms int,
  concept_tag text,
  payload jsonb, -- e.g. the student's code on 'check', so a teacher can see it
  created_at timestamptz not null default now()
);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (student_id, question_id)
);

-- Keys for CIC's dashboard to call the read API. Only a hash is stored.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- ---------- Indexes ----------
create index on public.lessons (module_id, position);
create index on public.activities (lesson_id, position);
create index on public.assessment_questions (assessment_id, position);
create index on public.classes (instructor_id);
create index on public.class_sessions (class_id, session_date);
create index on public.students (class_id);
create index on public.lesson_status (lesson_id);
create index on public.activity_events (class_id, created_at desc);
create index on public.activity_events (student_id, created_at desc);
create index on public.activity_events (activity_id);
create index on public.assessment_responses (question_id);
