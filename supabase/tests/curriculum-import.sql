begin;
insert into auth.users(id,email,raw_app_meta_data) values
 ('f0000000-0000-0000-0000-000000000001','admin@test.invalid','{"role":"admin"}'),
 ('f0000000-0000-0000-0000-000000000002','mentor@test.invalid','{"role":"reviewer"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
select public.manage_staff_access('save','{"id":"mentor","name":"Mentor","permissions":["curriculum.read","curriculum.write"]}');
select public.manage_staff_access('assign','{"id":"f0000000-0000-0000-0000-000000000002","role":"mentor"}');
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000002',true);
do $$
declare saved jsonb; m uuid; l uuid; test_id uuid; before_count int; quiz jsonb;
begin
 select count(*) into before_count from public.modules;
 begin
  perform public.import_curriculum('{"title":"Bad import","source":"pptx","steps":[{"type":"invalid","content":{}}],"pre":[],"post":[]}');
  raise exception 'TEST: invalid import succeeded';
 exception when check_violation then null; end;
 assert (select count(*)=before_count from public.modules), 'Failed import left a partial module';
 saved:=public.import_curriculum('{
  "module_title":"Mentor unit","title":"Loops from slides","source":"pptx",
  "steps":[{"type":"slide","title":"Loops","content":{"heading":"Loops","body":"Repeat instructions"},"ai_suggested":false}],
  "pre":[{"concept_tag":"loops","prompt":"Before?","options":["A","B"],"answer":0}],
  "post":[{"concept_tag":"loops","prompt":"After?","options":["A","B"],"answer":1}]
 }');
 m:=(saved->>'moduleId')::uuid; l:=(saved->>'lessonId')::uuid;
 assert (select count(*)=2 from public.assessments where module_id=m and not reviewed), 'Imports must require quiz review';
 perform public.edit_curriculum('update',jsonb_build_object('entity','lessons','id',l,'patch','{"status":"published"}'::jsonb));
 begin
  perform public.edit_curriculum('update',jsonb_build_object('entity','modules','id',m,'patch','{"status":"published"}'::jsonb));
  raise exception 'TEST: unreviewed quizzes published';
 exception when raise_exception then
  if sqlerrm not like 'Create, review and save both%' then raise; end if;
 end;
 foreach quiz in array array['"pre"'::jsonb,'"post"'::jsonb] loop
  perform public.edit_curriculum('assessment',jsonb_build_object('entity','modules','parent_id',m,'kind',quiz,
    'questions','[{"concept_tag":"loops","prompt":"Reviewed question","options":["A","B"],"answer":0}]'::jsonb));
 end loop;
 perform public.edit_curriculum('update',jsonb_build_object('entity','modules','id',m,'patch','{"status":"published"}'::jsonb));
 assert (select status='published' from public.modules where id=m),'Mentor could not publish reviewed curriculum';
 select id into test_id from public.assessments where module_id=m and kind='pre';
 -- A second import into this unit must retain the authored assessment/question IDs.
 perform public.import_curriculum(jsonb_build_object('module_id',m,'title','More loops','source','youtube','steps','[]'::jsonb,'pre','[]'::jsonb,'post','[]'::jsonb));
 assert (select id=test_id from public.assessments where module_id=m and kind='pre'),'Import overwrote existing test';
 perform public.delete_curriculum_module(m);
 assert not exists(select 1 from public.modules where id=m),'Unused curriculum could not be deleted';
end $$;
-- This editor cannot see student records, but must still be unable to erase their assessment history.
do $$ begin
 begin
  perform public.edit_curriculum('assessment','{"entity":"modules","parent_id":"10000000-0000-0000-0000-000000000002","kind":"pre","questions":[]}');
  raise exception 'TEST: Editor erased hidden student responses';
 exception when raise_exception then
  if sqlerrm not like 'Students have already answered%' then raise; end if;
 end;
 begin
  delete from public.modules where id='10000000-0000-0000-0000-000000000002';
  raise exception 'TEST: Editor deleted assigned curriculum';
 exception when raise_exception then
  if sqlerrm not like 'This unit is assigned or has student work%' then raise; end if;
 end;
end $$;
rollback;
