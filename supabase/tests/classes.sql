-- Disposable migrated + seeded database only. No live student data; always rolls back.
begin;
insert into auth.users(id, email, raw_app_meta_data) values
 ('f0000000-0000-0000-0000-000000000001', 'admin@test.invalid', '{"role":"admin"}'),
 ('f0000000-0000-0000-0000-000000000002', 'teacher@test.invalid', '{"role":"instructor"}'),
 ('f0000000-0000-0000-0000-000000000003', 'other-teacher@test.invalid', '{"role":"instructor"}'),
 ('f0000000-0000-0000-0000-000000000004', 'reviewer@test.invalid', '{"role":"reviewer"}');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', true);
do $$
declare c uuid; roster jsonb; module_ids jsonb; sessions jsonb; today date := (now() at time zone 'America/Phoenix')::date;
begin
  insert into public.classes(id,name,school,instructor_id,class_code)
    values ('f1000000-0000-0000-0000-000000000001','Test Period 3','Test School',auth.uid(),'TEST-P3') returning id into c;
  select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name','Test Student ' || n,
    'join_code_hash', encode(sha256(convert_to(c::text || ':' || n, 'UTF8')), 'hex')))
    into roster from generate_series(1,12) n;
  perform public.configure_class(c,'students',roster);
  assert (select count(*)=12 from public.students where class_id=c), 'Roster import lost students';
  select jsonb_agg(id order by position) into module_ids from public.modules where status='published';
  perform public.configure_class(c,'modules',module_ids);
  assert (select array_agg(position order by position)=array[1,2,3] from public.class_modules where class_id=c), 'Assigned modules out of order';
  select jsonb_agg(jsonb_build_object('lesson_id',id,'session_date',today+n::int)) into sessions
    from (select id, row_number() over(order by module_id,position) as n from public.lessons where status='published' limit 6) t;
  perform public.configure_class(c,'schedule',sessions);
  assert (select count(*)=6 from public.class_sessions where class_id=c), 'Schedule lost sessions';
  insert into public.class_sessions(class_id,session_date,lesson_id) values(c,today-1,'20000000-0000-0000-0000-000000000001');
  begin
    perform public.configure_class(c,'schedule','[{"lesson_id":"20000000-0000-0000-0000-000000000001","session_date":"2000-01-01"}]');
    raise exception 'TEST: past date accepted';
  exception when raise_exception then
    if sqlerrm not like 'Choose upcoming dates%' then raise; end if;
  end;
  assert (select count(*)=7 from public.class_sessions where class_id=c), 'Failed save destroyed schedule';
  perform public.configure_class(c,'schedule','[]');
  assert (select count(*)=1 from public.class_sessions where class_id=c), 'Past sessions deleted';
  begin
    perform public.configure_class(c,'modules','["10000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000001"]');
    raise exception 'TEST: duplicate modules accepted';
  exception when raise_exception then
    if sqlerrm <> 'Assign each published module only once.' then raise; end if;
  end;
  assert (select count(*)=3 from public.class_modules where class_id=c), 'Failed save destroyed assignments';
end $$;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000003', true);
do $$ begin
  assert not exists(select 1 from public.classes where class_code='TEST-P3'), 'Other instructor saw class';
  assert not exists(select 1 from public.students where class_id='f1000000-0000-0000-0000-000000000001'), 'Other instructor saw roster';
  assert not exists(select 1 from public.class_modules where class_id='f1000000-0000-0000-0000-000000000001'), 'Other instructor saw assignments';
  begin
    perform public.configure_class('f1000000-0000-0000-0000-000000000001','modules','[]');
    raise exception 'TEST: Other instructor changed class';
  exception when raise_exception then
    if sqlerrm <> 'You do not have permission to change this class.' then raise; end if;
  end;
  begin
    insert into public.class_modules(class_id,module_id,position) values
      ('f1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',4);
    raise exception 'TEST: Other instructor bypassed assignment RLS';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000004', true);
do $$ begin
  assert not exists(select 1 from public.classes), 'Reviewer saw classes';
  begin
    insert into public.classes(name,school,instructor_id,class_code) values('No','No',auth.uid(),'NO-1');
    raise exception 'TEST: Reviewer created class';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
do $$ begin
  assert exists(select 1 from public.classes where class_code='TEST-P3'), 'Admin cannot see class';
  assert (select join_code_hash = encode(sha256(convert_to('c0000000-0000-0000-0000-000000000003:7KQ2MX','UTF8')),'hex')
    from public.students where class_id='c0000000-0000-0000-0000-000000000003' and display_name='Jaylen Washington'), 'Seed hash mismatch';
end $$;
rollback;
