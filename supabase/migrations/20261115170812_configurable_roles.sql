-- Admin-defined staff roles. Student join-code identities remain separate from staff accounts.
create table public.staff_roles (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (length(btrim(name)) between 1 and 80),
  permissions text[] not null default '{}',
  check (permissions <@ array['curriculum.read','curriculum.write','classes.manage','results.read','roles.manage','api_keys.manage']::text[])
);
insert into public.staff_roles values
 ('admin','CIC administrator',array['curriculum.read','curriculum.write','classes.manage','results.read','roles.manage','api_keys.manage']),
 ('instructor','Teacher',array['curriculum.read','classes.manage','results.read']),
 ('reviewer','Reviewer (view only)',array['curriculum.read']);
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_fkey foreign key(role) references public.staff_roles(id);

create function public.has_permission(permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'admin' or permission = any(r.permissions) or (permission='curriculum.read' and 'curriculum.write'=any(r.permissions))
    from public.profiles p join public.staff_roles r on r.id=p.role where p.id=auth.uid()),false)
$$;
revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;
alter table public.staff_roles enable row level security;
create policy "Staff read role definitions" on public.staff_roles for select to authenticated using (true);
-- Role writes go through manage_staff_access, including admin-role and reassignment safeguards.
grant select on public.staff_roles to authenticated;
revoke insert, update, delete on public.staff_roles from authenticated;

create function public.protect_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(826412);
  if old.role='admin' and (tg_op='DELETE' or new.role<>'admin') and
    not exists(select 1 from public.profiles where role='admin' and id<>old.id) then
    raise exception 'Keep at least one CIC administrator before removing this access.';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger keep_last_admin before update of role or delete on public.profiles
  for each row execute function public.protect_last_admin();

create function public.manage_staff_access(operation text, details jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare role_id text := details->>'id';
begin
  perform pg_catalog.pg_advisory_xact_lock(826412);
  if not public.has_permission('roles.manage') then raise exception 'You do not have permission to manage staff access.'; end if;
  if operation='assign' then
    update public.profiles set role=details->>'role' where id=role_id::uuid;
    if not found then raise exception 'That staff account could not be found.'; end if;
  elsif operation='save' then
    if role_id='admin' then raise exception 'The administrator role must keep full access.'; end if;
    insert into public.staff_roles(id,name,permissions)
      values(role_id,btrim(details->>'name'),array(select jsonb_array_elements_text(details->'permissions')))
      on conflict(id) do update set name=excluded.name, permissions=excluded.permissions;
  elsif operation='delete' then
    if role_id='admin' then raise exception 'Keep the administrator role so someone can manage the system.'; end if;
    if details->>'replacement' = role_id then raise exception 'Choose a different replacement role.'; end if;
    if exists(select 1 from public.profiles where role=role_id) then
      if details->>'replacement' is null then raise exception 'Choose a replacement role for staff using this role.'; end if;
      update public.profiles set role=details->>'replacement' where role=role_id;
    end if;
    delete from public.staff_roles where id=role_id;
    if not found then raise exception 'That role could not be found.'; end if;
  else raise exception 'Choose a staff access action.';
  end if;
end $$;
revoke all on function public.manage_staff_access(text,jsonb) from public,anon;
grant execute on function public.manage_staff_access(text,jsonb) to authenticated;

-- Future staff default to a read-only role; only trusted auth app_metadata can request another.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare assigned_role text;
begin
  assigned_role := new.raw_app_meta_data->>'role';
  if assigned_role is null then
    select id into assigned_role from public.staff_roles where permissions=array['curriculum.read']::text[]
      order by (id='reviewer') desc,id limit 1;
  end if;
  if assigned_role is null then raise exception 'Ask CIC staff to assign a role before creating this account.'; end if;
  insert into public.profiles(id,role,display_name) values(new.id,assigned_role,
    coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)));
  return new;
end $$;
drop policy "Admins change roles" on public.profiles;
create policy "Access managers read staff" on public.profiles for select to authenticated using(public.has_permission('roles.manage'));
create policy "Access managers change roles" on public.profiles for update to authenticated
  using(public.has_permission('roles.manage')) with check(public.has_permission('roles.manage'));

-- Curriculum permissions are enforced in Postgres as well as in pages/actions.
drop policy "Staff read published modules" on public.modules;
drop policy "Admins write modules" on public.modules;
create policy "Readers see published modules" on public.modules for select to authenticated using(status='published' and public.has_permission('curriculum.read'));
create policy "Editors manage modules" on public.modules for all to authenticated using(public.has_permission('curriculum.write')) with check(public.has_permission('curriculum.write'));
drop policy "Staff read published lessons" on public.lessons;
drop policy "Admins write lessons" on public.lessons;
create policy "Readers see published lessons" on public.lessons for select to authenticated using(public.lesson_is_published(id) and public.has_permission('curriculum.read'));
create policy "Editors manage lessons" on public.lessons for all to authenticated using(public.has_permission('curriculum.write')) with check(public.has_permission('curriculum.write'));
drop policy "Staff read published activities" on public.activities;
drop policy "Admins write activities" on public.activities;
create policy "Readers see published activities" on public.activities for select to authenticated using(public.lesson_is_published(lesson_id) and public.has_permission('curriculum.read'));
create policy "Editors manage activities" on public.activities for all to authenticated using(public.has_permission('curriculum.write')) with check(public.has_permission('curriculum.write'));
drop policy "Instructors and admins read tests" on public.assessments;
drop policy "Admins write tests" on public.assessments;
create policy "Teachers read tests" on public.assessments for select to authenticated using(public.has_permission('results.read') or public.has_permission('classes.manage'));
create policy "Editors manage tests" on public.assessments for all to authenticated using(public.has_permission('curriculum.write')) with check(public.has_permission('curriculum.write'));
drop policy "Instructors and admins read test questions" on public.assessment_questions;
drop policy "Admins write test questions" on public.assessment_questions;
create policy "Teachers read test questions" on public.assessment_questions for select to authenticated using(public.has_permission('results.read') or public.has_permission('classes.manage'));
create policy "Editors manage test questions" on public.assessment_questions for all to authenticated using(public.has_permission('curriculum.write')) with check(public.has_permission('curriculum.write'));
-- Update the existing invoker RPC without duplicating its transactional authoring implementation.
do $$ declare definition text; begin
  select pg_get_functiondef('public.edit_curriculum(text,jsonb)'::regprocedure) into definition;
  if position('if not public.is_admin()' in definition)=0 then raise exception 'Unexpected curriculum function: review this migration.'; end if;
  execute replace(definition,'if not public.is_admin()', 'if not public.has_permission(''curriculum.write'')');
end $$;
create or replace function public.teaches_class(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select public.has_permission('classes.manage') and exists(select 1 from public.classes where id=target_class and instructor_id=auth.uid())
$$;
create or replace function public.teaches_student(target_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.students where id=target_student and public.teaches_class(class_id))
$$;
drop policy "Instructors create own classes" on public.classes;
create policy "Class managers create classes" on public.classes for insert to authenticated
 with check((instructor_id=auth.uid() and public.has_permission('classes.manage')) or public.is_admin());
drop policy "Instructors read own classes" on public.classes;
drop policy "Instructors update own classes" on public.classes;
drop policy "Instructors delete own classes" on public.classes;
create policy "Class managers read classes" on public.classes for select to authenticated using(public.teaches_class(id) or public.is_admin() or (instructor_id=auth.uid() and public.has_permission('results.read')));
create policy "Class managers update classes" on public.classes for update to authenticated using(public.teaches_class(id) or public.is_admin()) with check((instructor_id=auth.uid() and public.has_permission('classes.manage')) or public.is_admin());
create policy "Class managers delete classes" on public.classes for delete to authenticated using(public.teaches_class(id) or public.is_admin());
create function public.can_read_class_results(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select public.is_admin() or (public.has_permission('results.read') and exists(select 1 from public.classes where id=target_class and instructor_id=auth.uid()))
$$;
revoke all on function public.can_read_class_results(uuid) from public,anon;
grant execute on function public.can_read_class_results(uuid) to authenticated;
create policy "Results readers see own roster" on public.students for select to authenticated using(public.can_read_class_results(class_id));
create policy "Results readers see own responses" on public.assessment_responses for select to authenticated using(exists(select 1 from public.students s where s.id=student_id and public.can_read_class_results(s.class_id)));
create policy "Results readers see own events" on public.activity_events for select to authenticated using(public.can_read_class_results(class_id));
drop policy "Admins manage API keys" on public.api_keys;
create policy "Key managers manage keys" on public.api_keys for all to authenticated using(public.has_permission('api_keys.manage')) with check(public.has_permission('api_keys.manage'));
