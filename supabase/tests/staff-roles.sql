begin;
insert into auth.users(id,email,raw_app_meta_data) values
 ('f0000000-0000-0000-0000-000000000001','admin@test.invalid','{"role":"admin"}'),
 ('f0000000-0000-0000-0000-000000000002','mentor@test.invalid','{"role":"reviewer"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
select public.manage_staff_access('save','{"id":"mentor","name":"Mentor","permissions":["curriculum.read"]}');
select public.manage_staff_access('assign','{"id":"f0000000-0000-0000-0000-000000000002","role":"mentor"}');
do $$ begin
 begin
  perform public.manage_staff_access('assign','{"id":"f0000000-0000-0000-0000-000000000001","role":"mentor"}');
  raise exception 'TEST: Removed last admin';
 exception when raise_exception then
  if sqlerrm not like 'Keep at least one CIC administrator%' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000002',true);
do $$ begin
 assert public.has_permission('curriculum.read'), 'Mentor cannot read';
 assert not public.has_permission('curriculum.write'), 'Mentor can unexpectedly edit';
 assert not exists(select 1 from public.modules where status='draft'), 'Read-only role sees drafts';
 begin
  perform public.edit_curriculum('create','{"entity":"modules","patch":{"title":"Forbidden"}}');
  raise exception 'TEST: Read-only mentor edited';
 exception when raise_exception then
  if sqlerrm <> 'Only CIC admins can edit curriculum.' then raise; end if;
 end;
 begin
  perform public.manage_staff_access('save','{"id":"mentor","name":"Elevated","permissions":["roles.manage"]}');
  raise exception 'TEST: Mentor escalated role';
 exception when raise_exception then
  if sqlerrm <> 'You do not have permission to manage staff access.' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
select public.manage_staff_access('save','{"id":"mentor","name":"Mentor editor","permissions":["curriculum.read","curriculum.write"]}');
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000002',true);
do $$ declare result jsonb; begin
 assert public.has_permission('curriculum.write'), 'Permission edit did not take effect';
 result:=public.edit_curriculum('create','{"entity":"modules","patch":{"title":"Mentor authored"}}');
 assert result->>'title'='Mentor authored', 'Mentor edit failed';
 assert not public.has_permission('classes.manage'), 'Curriculum editor received student access';
 assert not exists(select 1 from public.students), 'Curriculum editor saw student data';
end $$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
select public.manage_staff_access('save','{"id":"mentor","name":"Mentor viewer","permissions":["curriculum.read"]}');
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000002',true);
do $$ begin assert not public.has_permission('curriculum.write'), 'Revoked permission still active'; end $$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
select public.manage_staff_access('delete','{"id":"mentor","replacement":"reviewer"}');
do $$ begin
 assert not exists(select 1 from public.staff_roles where id='mentor'), 'Role not deleted';
 assert (select role='reviewer' from public.profiles where id='f0000000-0000-0000-0000-000000000002'), 'Member not reassigned';
end $$;
rollback;
