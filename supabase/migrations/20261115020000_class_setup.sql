create table public.class_modules (
  class_id uuid not null references public.classes(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  position int not null check (position > 0),
  assigned_at timestamptz not null default now(),
  primary key (class_id, module_id),
  unique (class_id, position) deferrable initially deferred
);
alter table public.class_modules enable row level security;
create policy "Instructors manage assigned modules for own classes" on public.class_modules
  for all to authenticated
  using (public.teaches_class(class_id) or public.is_admin())
  with check (public.teaches_class(class_id) or public.is_admin());

-- All multirow changes are one transaction. Lock the class to serialize saves.
create function public.configure_class(target_class uuid, operation text, items jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  class_school text;
  ids uuid[];
  inserted jsonb;
  today date := (now() at time zone 'America/Phoenix')::date;
begin
  if not (public.teaches_class(target_class) or public.is_admin()) then
    raise exception 'You do not have permission to change this class.';
  end if;
  select school into class_school from public.classes where id = target_class for update;
  if not found then raise exception 'That class could not be found.'; end if;
  if jsonb_typeof(items) is distinct from 'array' then raise exception 'Provide a list of items.'; end if;
  if operation = 'students' then
    if jsonb_array_length(items) = 0 or jsonb_array_length(items) +
      (select count(*) from public.students where class_id = target_class) > 200 then
      raise exception 'A class can have at most 200 students. Add at least one student.';
    end if;
    if exists (select 1 from jsonb_array_elements(items) x where
      nullif(btrim(x->>'name'), '') is null or length(x->>'name') > 200 or length(x->>'school') > 200
      or coalesce(x->>'join_code_hash', '') !~ '^[a-f0-9]{64}$') then
      raise exception 'Check each student name, school and personal code.';
    end if;
    with added as (
      insert into public.students(id, class_id, display_name, school, join_code_hash)
      select (x->>'id')::uuid, target_class, btrim(x->>'name'), coalesce(nullif(x->>'school',''), class_school), x->>'join_code_hash'
      from jsonb_array_elements(items) x
      returning id, display_name
    ) select jsonb_agg(to_jsonb(added)) into inserted from added;
    return inserted;
  elsif operation = 'modules' then
    select coalesce(array_agg(value::uuid), '{}'::uuid[]) into ids from jsonb_array_elements_text(items);
    if cardinality(ids) <> (select count(distinct id) from unnest(ids) id)
      or cardinality(ids) <> (select count(*) from public.modules where id = any(ids) and status = 'published') then
      raise exception 'Assign each published module only once.';
    end if;
    if exists (select 1 from public.class_sessions s join public.lessons l on l.id = s.lesson_id
      where s.class_id = target_class and s.session_date >= today and not (l.module_id = any(ids))) then
      raise exception 'Remove upcoming sessions for a module before unassigning it.';
    end if;
    delete from public.class_modules where class_id = target_class;
    insert into public.class_modules(class_id, module_id, position)
      select target_class, value::uuid, ordinality from jsonb_array_elements_text(items) with ordinality;
    return 'null'::jsonb;
  elsif operation = 'schedule' then
    if exists (select 1 from jsonb_array_elements(items) x where
      x->>'session_date' is null or (x->>'session_date')::date < today or not exists (
        select 1 from public.lessons l join public.class_modules cm on cm.module_id = l.module_id
        join public.modules m on m.id = l.module_id
        where l.id = (x->>'lesson_id')::uuid and cm.class_id = target_class and l.status = 'published' and m.status = 'published')) then
      raise exception 'Choose upcoming dates and published lessons from assigned modules.';
    end if;
    if jsonb_array_length(items) <> (select count(distinct (x->>'session_date', x->>'lesson_id')) from jsonb_array_elements(items) x) then
      raise exception 'Include each lesson only once per date.';
    end if;
    delete from public.class_sessions where class_id = target_class and session_date >= today;
    insert into public.class_sessions(class_id, session_date, lesson_id)
      select target_class, (x->>'session_date')::date, (x->>'lesson_id')::uuid from jsonb_array_elements(items) x;
    return 'null'::jsonb;
  end if;
  raise exception 'That class setup action is not available.';
end $$;
revoke all on function public.configure_class(uuid, text, jsonb) from public, anon;
grant execute on function public.configure_class(uuid, text, jsonb) to authenticated;
