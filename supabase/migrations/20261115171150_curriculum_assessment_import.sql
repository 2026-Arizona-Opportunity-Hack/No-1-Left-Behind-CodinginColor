alter table public.assessments add column reviewed boolean not null default true;

-- Import everything in one transaction. Existing module tests are never overwritten by an import.
create function public.import_curriculum(package jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  target_module uuid := (package->>'module_id')::uuid;
  new_lesson uuid;
  assessment_id uuid;
  kind text;
  curriculum_title text := btrim(package->>'title');
  row_json jsonb;
  idx int;
begin
  if not public.has_permission('curriculum.write') then raise exception 'Your role cannot edit curriculum.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(826411);
  if coalesce(length(curriculum_title),0)=0 then raise exception 'Enter a curriculum title.'; end if;
  if target_module is null then
    insert into public.modules(title,description,position,created_by)
      select coalesce(nullif(btrim(package->>'module_title'),''),curriculum_title),package->>'description',coalesce(max(position),0)+1,auth.uid()
      from public.modules returning id into target_module;
  elsif not exists(select 1 from public.modules where id=target_module) then
    raise exception 'That unit could not be found.';
  end if;
  insert into public.lessons(module_id,title,position,source,source_url,recap)
    select target_module,curriculum_title,coalesce(max(position),0)+1,package->>'source',package->>'source_url',package->'recap'
    from public.lessons where module_id=target_module returning id into new_lesson;
  insert into public.activities(lesson_id,position,type,title,content,concept_tag,teaching_guide,ai_suggested)
    select new_lesson,ordinality,value->>'type',value->>'title',value->'content',value->>'concept_tag',value->'teaching_guide',coalesce((value->>'ai_suggested')::boolean,false)
    from jsonb_array_elements(package->'steps') with ordinality;
  foreach kind in array array['pre','post'] loop
    insert into public.assessments(module_id,kind,reviewed) values(target_module,kind,false)
      on conflict on constraint assessments_module_id_kind_key do nothing returning id into assessment_id;
    if assessment_id is not null then
      idx:=0;
      for row_json in select value from jsonb_array_elements(package->kind) loop
        idx:=idx+1;
        insert into public.assessment_questions(assessment_id,position,concept_tag,content)
          values(assessment_id,idx,row_json->>'concept_tag',row_json-'concept_tag');
      end loop;
    end if;
  end loop;
  return jsonb_build_object('lessonId',new_lesson,'moduleId',target_module);
end $$;
revoke all on function public.import_curriculum(jsonb) from public,anon;
grant execute on function public.import_curriculum(jsonb) to authenticated;

-- Saving the quiz in the editor is explicit staff review, including manually-authored quizzes.
do $$ declare definition text; begin
 select pg_get_functiondef('public.edit_curriculum(text,jsonb)'::regprocedure) into definition;
 if position('return to_jsonb(new_id);' in definition)=0 then raise exception 'Unexpected assessment save implementation.'; end if;
 execute replace(definition,'return to_jsonb(new_id);', 'update public.assessments set reviewed=true where id=new_id; return to_jsonb(new_id);');
end $$;

create or replace function public.check_module_publish() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from new.status) then
  if not exists(select 1 from public.lessons where module_id=new.id and status='published') then
   raise exception 'Publish at least one lesson before publishing this module.';
  end if;
  if exists(select 1 from public.activities a join public.lessons l on l.id=a.lesson_id where l.module_id=new.id and a.ai_suggested) then
   raise exception 'Review and save all AI-drafted activities before publishing this module.';
  end if;
  if (select count(*) from public.assessments a where a.module_id=new.id and a.reviewed and
    exists(select 1 from public.assessment_questions q where q.assessment_id=a.id))<>2 then
   raise exception 'Create, review and save both the pre-test and post-test before publishing this unit.';
  end if;
 end if;
 return new;
end $$;
create function public.delete_curriculum_module(target_module uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not public.has_permission('curriculum.write') then raise exception 'Your role cannot edit curriculum.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(826411);
 if exists(select 1 from public.class_modules where module_id=target_module)
  or exists(select 1 from public.activity_events e join public.lessons l on l.id=e.lesson_id where l.module_id=target_module)
  or exists(select 1 from public.lesson_status s join public.lessons l on l.id=s.lesson_id where l.module_id=target_module)
  or exists(select 1 from public.assessment_responses r join public.assessment_questions q on q.id=r.question_id
    join public.assessments a on a.id=q.assessment_id where a.module_id=target_module) then
  raise exception 'This unit is assigned or has student work. Hide it from students to preserve their records.';
 end if;
 delete from public.modules where id=target_module;
 if not found then raise exception 'That unit could not be found.'; end if;
 with numbered as(select id,row_number() over(order by position,id) n from public.modules)
  update public.modules m set position=n.n from numbered n where m.id=n.id;
end $$;
revoke all on function public.delete_curriculum_module(uuid) from public,anon;
grant execute on function public.delete_curriculum_module(uuid) to authenticated;

-- Editors must not be able to erase assessment history hidden from their read permissions.
create function public.assessment_has_responses(target_assessment uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select public.has_permission('curriculum.write') and exists(select 1 from public.assessment_responses r join public.assessment_questions q on q.id=r.question_id where q.assessment_id=target_assessment)
$$;
revoke all on function public.assessment_has_responses(uuid) from public,anon;
grant execute on function public.assessment_has_responses(uuid) to authenticated;
do $$ declare definition text; begin
 select pg_get_functiondef('public.edit_curriculum(text,jsonb)'::regprocedure) into definition;
 execute replace(definition,'if exists (select 1 from public.assessment_responses r join public.assessment_questions q on q.id = r.question_id where q.assessment_id = new_id) then', 'if public.assessment_has_responses(new_id) then');
end $$;

-- Complete the known demo units with curated, equivalent pre/post questions. Existing tests stay intact.
-- Kept callable only by the migration/seed owner, never by app users.
create function public.ensure_demo_assessment_pairs() returns void
language plpgsql security invoker set search_path = '' as $$
declare demo record; test_id uuid; question jsonb; idx int;
begin
 for demo in select * from (values
 ('10000000-0000-0000-0000-000000000001'::uuid,'pre','basics',
 '[{"prompt":"What does print() do?","options":["Shows a value","Reads input","Repeats code"],"answer":0},{"prompt":"Which is text in Python?","options":["12","\"hello\"","True"],"answer":1},{"prompt":"Which stores a value?","options":["age = 15","print(15)","input()"],"answer":0}]'::jsonb),
 ('10000000-0000-0000-0000-000000000001','post','basics',
 '[{"prompt":"What does print(2 + 3) show?","options":["23","5","2 + 3"],"answer":1},{"prompt":"What type does input() return?","options":["A whole number","Text","A loop"],"answer":1},{"prompt":"After score = 2 and score = score + 1, what is score?","options":["1","2","3"],"answer":2}]'),
 ('10000000-0000-0000-0000-000000000003','pre','functions',
 '[{"prompt":"Why use a function?","options":["Reuse instructions","Delete variables","Stop Python"],"answer":0},{"prompt":"Which word defines a Python function?","options":["repeat","def","classify"],"answer":1},{"prompt":"What is a parameter?","options":["An input to a function","A Python file","A printed message"],"answer":0}]'),
 ('10000000-0000-0000-0000-000000000003','post','functions',
 '[{"prompt":"How do you call a function named greet?","options":["def greet","greet()","call greet"],"answer":1},{"prompt":"What does return do inside a function?","options":["Sends a result back","Prints every variable","Repeats the function"],"answer":0},{"prompt":"A quiz adds 1 to score for each correct answer. Starting at 0, what is score after two correct answers?","options":["0","1","2"],"answer":2}]')
 ) as d(module_id,kind,concept,questions) loop
  if exists(select 1 from public.modules where id=demo.module_id) then
   insert into public.assessments(module_id,kind,reviewed) values(demo.module_id,demo.kind,true)
    on conflict on constraint assessments_module_id_kind_key do nothing returning id into test_id;
   if test_id is not null then
    idx:=0;
    for question in select value from jsonb_array_elements(demo.questions) loop
     idx:=idx+1;
     insert into public.assessment_questions(assessment_id,position,concept_tag,content) values(test_id,idx,demo.concept,question);
    end loop;
   end if;
  end if;
 end loop;
end $$;
revoke all on function public.ensure_demo_assessment_pairs() from public,anon,authenticated;
select public.ensure_demo_assessment_pairs();

-- Protect records even when an authorised editor uses the table API directly.
create function public.guard_curriculum_deletion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_table_name='modules' then
  if exists(select 1 from public.class_modules where module_id=old.id)
   or exists(select 1 from public.lesson_status s join public.lessons l on l.id=s.lesson_id where l.module_id=old.id)
   or exists(select 1 from public.activity_events e join public.lessons l on l.id=e.lesson_id where l.module_id=old.id)
   or exists(select 1 from public.assessment_responses r join public.assessment_questions q on q.id=r.question_id join public.assessments a on a.id=q.assessment_id where a.module_id=old.id) then
   raise exception 'This unit is assigned or has student work. Hide it from students to preserve their records.';
  end if;
 elsif tg_table_name='lessons' then
  if exists(select 1 from public.lesson_status where lesson_id=old.id) or exists(select 1 from public.activity_events where lesson_id=old.id) then
   raise exception 'This lesson has student work. Hide it instead of deleting their records.';
  end if;
 elsif exists(select 1 from public.activity_events where activity_id=old.id) then
  raise exception 'This step has student work. Keep it to preserve their records.';
 end if;
 return old;
end $$;
create trigger preserve_module_work before delete on public.modules for each row execute function public.guard_curriculum_deletion();
create trigger preserve_lesson_work before delete on public.lessons for each row execute function public.guard_curriculum_deletion();
create trigger preserve_activity_work before delete on public.activities for each row execute function public.guard_curriculum_deletion();
