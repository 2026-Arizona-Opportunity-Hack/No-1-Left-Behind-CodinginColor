-- Run against a disposable database with the migrations + seed applied. Rolls back.
begin;
insert into auth.users(id, email, raw_app_meta_data) values
 ('f0000000-0000-0000-0000-000000000001', 'admin@test.invalid', '{"role":"admin"}'),
 ('f0000000-0000-0000-0000-000000000002', 'teacher@test.invalid', '{"role":"instructor"}'),
 ('f0000000-0000-0000-0000-000000000003', 'reviewer@test.invalid', '{"role":"reviewer"}');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
do $$
declare m uuid; l uuid; a uuid; result jsonb; n int;
begin
  result := public.edit_curriculum('create', '{"entity":"modules","patch":{"title":"Test unit"}}');
  m := (result->>'id')::uuid;
  begin
    perform public.edit_curriculum('update', jsonb_build_object('entity','modules','id',m,'patch','{"status":"published"}'::jsonb));
    raise exception 'TEST: empty module published';
  exception when raise_exception then
    if sqlerrm not like 'Publish at least one%' then raise; end if;
  end;
  result := public.edit_curriculum('create', jsonb_build_object('entity','lessons','parent_id',m,'patch','{"title":"Template"}'::jsonb,
    'activities','[{"type":"slide","content":{"heading":"Hi","body":""}},{"type":"quiz_mcq","content":{"prompt":"?","options":["A","B"],"answer":0}},{"type":"worksheet","content":{"fields":[]}},{"type":"exit_question","content":{"prompt":"?","options":["A","B"],"answer":0}}]'::jsonb));
  l := (result->>'id')::uuid;
  select count(*) into n from public.activities where lesson_id = l;
  assert n = 4, 'Template must create four ordered steps';
  select id into a from public.activities where lesson_id = l and position = 1;
  update public.activities set ai_suggested = true where id = a;
  perform public.edit_curriculum('update', jsonb_build_object('entity','lessons','id',l,'patch','{"status":"published"}'::jsonb));
  begin
    perform public.edit_curriculum('update', jsonb_build_object('entity','modules','id',m,'patch','{"status":"published"}'::jsonb));
    raise exception 'TEST: AI draft published';
  exception when raise_exception then
    if sqlerrm not like 'Review and save%' then raise; end if;
  end;
  perform public.edit_curriculum('update', jsonb_build_object('entity','activities','id',a,'patch','{"content":{"heading":"Reviewed","body":"Approved"}}'::jsonb));
  perform public.edit_curriculum('update', jsonb_build_object('entity','modules','id',m,'patch','{"status":"published"}'::jsonb));
  assert (select status = 'published' from public.modules where id = m), 'Admin publish failed';
  begin
    perform public.edit_curriculum('reorder', jsonb_build_object('entity','activities','parent_id',l,'ids',jsonb_build_array(a,a)));
    raise exception 'TEST: duplicate reorder accepted';
  exception when raise_exception then
    if sqlerrm not like 'Include every item%' then raise; end if;
  end;
  perform public.edit_curriculum('delete', jsonb_build_object('entity','activities','id',a));
  assert (select array_agg(position order by position) = array[1,2,3] from public.activities where lesson_id=l), 'Deletion left gaps';
  perform public.edit_curriculum('reorder', jsonb_build_object('entity','activities','parent_id',l,'ids',
    (select jsonb_agg(id order by position desc) from public.activities where lesson_id=l)));
  perform public.edit_curriculum('assessment', jsonb_build_object('entity','modules','parent_id',m,'kind','pre','questions',
    '[{"concept_tag":"loops","prompt":"?","options":["A","B"],"answer":0}]'::jsonb));
end $$;
-- Both non-admin roles are refused by the same RPC and by table RLS.
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000002', true);
do $$ begin
  begin
    perform public.edit_curriculum('create', '{"entity":"modules","patch":{"title":"Forbidden"}}');
    raise exception 'TEST: instructor edited curriculum';
  exception when raise_exception then
    if sqlerrm <> 'Only CIC admins can edit curriculum.' then raise; end if;
  end;
  begin
    insert into public.modules(title,position) values ('Forbidden',999);
    raise exception 'TEST: instructor bypassed RLS';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000003', true);
do $$ begin
  begin
    perform public.edit_curriculum('create', '{"entity":"modules","patch":{"title":"Forbidden"}}');
    raise exception 'TEST: reviewer edited curriculum';
  exception when raise_exception then
    if sqlerrm <> 'Only CIC admins can edit curriculum.' then raise; end if;
  end;
  assert not exists(select 1 from public.modules where status='draft'), 'Reviewer saw a draft';
end $$;
rollback;
