-- Row Level Security: least privilege per role.
--   admin      : everything
--   instructor : published curriculum (read) + only their own classes and those students' data
--   reviewer   : published curriculum (read) only
--   anonymous  : nothing. Students go through our server, which uses the secret key.

-- ---------- Role helpers (security definer so policies don't recurse into profiles) ----------
create function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false)
$$;

create function public.teaches_class(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes
    where id = target_class and instructor_id = (select auth.uid())
  )
$$;

create function public.teaches_student(target_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = target_student and c.instructor_id = (select auth.uid())
  )
$$;

create function public.lesson_is_published(target_lesson uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    join public.modules m on m.id = l.module_id
    where l.id = target_lesson and l.status = 'published' and m.status = 'published'
  )
$$;

revoke execute on function public.my_role, public.is_admin, public.teaches_class,
  public.teaches_student, public.lesson_is_published from anon, public;
grant execute on function public.my_role, public.is_admin, public.teaches_class,
  public.teaches_student, public.lesson_is_published to authenticated;

-- ---------- Turn RLS on everywhere ----------
alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.activities enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.classes enable row level security;
alter table public.class_sessions enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.unlock_overrides enable row level security;
alter table public.lesson_status enable row level security;
alter table public.activity_events enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.api_keys enable row level security;

-- ---------- Profiles ----------
create policy "Staff read own profile; admins read all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "Admins change roles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Staff update own name" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = public.my_role()); -- can't promote yourself

-- ---------- Curriculum: everyone on staff reads published; only admins write ----------
create policy "Staff read published modules" on public.modules
  for select to authenticated using (status = 'published' or public.is_admin());
create policy "Admins write modules" on public.modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Staff read published lessons" on public.lessons
  for select to authenticated using (public.lesson_is_published(id) or public.is_admin());
create policy "Admins write lessons" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Staff read published activities" on public.activities
  for select to authenticated using (public.lesson_is_published(lesson_id) or public.is_admin());
create policy "Admins write activities" on public.activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pre/post tests: instructors and admins only (reviewers don't need the answer keys)
create policy "Instructors and admins read tests" on public.assessments
  for select to authenticated using (public.my_role() in ('admin', 'instructor'));
create policy "Admins write tests" on public.assessments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Instructors and admins read test questions" on public.assessment_questions
  for select to authenticated using (public.my_role() in ('admin', 'instructor'));
create policy "Admins write test questions" on public.assessment_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Classes: instructors manage their own; admins see all ----------
create policy "Instructors read own classes" on public.classes
  for select to authenticated using (instructor_id = (select auth.uid()) or public.is_admin());
create policy "Instructors create own classes" on public.classes
  for insert to authenticated
  with check ((instructor_id = (select auth.uid()) and public.my_role() = 'instructor') or public.is_admin());
create policy "Instructors update own classes" on public.classes
  for update to authenticated
  using (instructor_id = (select auth.uid()) or public.is_admin())
  with check (instructor_id = (select auth.uid()) or public.is_admin());
create policy "Instructors delete own classes" on public.classes
  for delete to authenticated using (instructor_id = (select auth.uid()) or public.is_admin());

create policy "Instructors manage own sessions" on public.class_sessions
  for all to authenticated
  using (public.teaches_class(class_id) or public.is_admin())
  with check (public.teaches_class(class_id) or public.is_admin());

create policy "Instructors manage own roster" on public.students
  for all to authenticated
  using (public.teaches_class(class_id) or public.is_admin())
  with check (public.teaches_class(class_id) or public.is_admin());

create policy "Instructors manage own attendance" on public.attendance
  for all to authenticated
  using (public.teaches_student(student_id) or public.is_admin())
  with check (public.teaches_student(student_id) or public.is_admin());

create policy "Instructors manage own unlocks" on public.unlock_overrides
  for all to authenticated
  using (public.teaches_student(student_id) or public.is_admin())
  with check (public.teaches_student(student_id) or public.is_admin());

-- Instructors can mark a lesson exempt or reset it; progress itself is written by our server.
create policy "Instructors manage own lesson status" on public.lesson_status
  for all to authenticated
  using (public.teaches_student(student_id) or public.is_admin())
  with check (public.teaches_student(student_id) or public.is_admin());

-- The activity log is append-only from the app side. Instructors read their students' events
-- and can log teacher actions (e.g. catchup_assigned); nobody edits or deletes history.
create policy "Instructors read own class events" on public.activity_events
  for select to authenticated using (public.teaches_class(class_id) or public.is_admin());
create policy "Instructors log teacher actions" on public.activity_events
  for insert to authenticated
  with check (
    event_type in ('catchup_assigned', 'skip')
    and public.teaches_class(class_id)
    and public.teaches_student(student_id)
  );

create policy "Instructors read own test results" on public.assessment_responses
  for select to authenticated using (public.teaches_student(student_id) or public.is_admin());

-- ---------- API keys: admins only ----------
create policy "Admins manage API keys" on public.api_keys
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
