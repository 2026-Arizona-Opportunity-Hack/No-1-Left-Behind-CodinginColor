-- Atomic authoring operations. SECURITY INVOKER preserves the signed-in user's RLS.
-- A shared transaction lock keeps concurrent appends/reorders gap-free.
create function public.edit_curriculum(operation text, args jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  target uuid := (args->>'id')::uuid;
  parent uuid := (args->>'parent_id')::uuid;
  entity text := args->>'entity';
  table_name text;
  parent_column text;
  record_json jsonb;
  existing_ids uuid[];
  ordered_ids uuid[];
  item jsonb;
  new_id uuid;
  idx int;
  patch jsonb := args->'patch';
begin
  if not public.is_admin() then raise exception 'Only CIC admins can edit curriculum.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(826411);
  if entity not in ('modules', 'lessons', 'activities') or entity is null then
    raise exception 'Choose a curriculum item.';
  end if;
  table_name := entity;
  parent_column := case entity when 'lessons' then 'module_id' when 'activities' then 'lesson_id' else null end;

  if operation = 'create' then
    if entity = 'modules' then
      insert into public.modules(title, description, position, created_by)
      select patch->>'title', patch->>'description', coalesce(max(position), 0) + 1, auth.uid()
      from public.modules returning to_jsonb(modules.*) into record_json;
    elsif entity = 'lessons' then
      insert into public.lessons(module_id, title, position)
      select parent, patch->>'title', coalesce(max(position), 0) + 1
      from public.lessons where module_id = parent returning to_jsonb(lessons.*) into record_json;
      if args ? 'activities' then
        insert into public.activities(lesson_id, position, type, content)
        select (record_json->>'id')::uuid, ordinality, value->>'type', value->'content'
        from jsonb_array_elements(args->'activities') with ordinality;
      end if;
    else
      insert into public.activities(lesson_id, type, content, position)
      select parent, patch->>'type', patch->'content', coalesce(max(position), 0) + 1
      from public.activities where lesson_id = parent returning to_jsonb(activities.*) into record_json;
    end if;
    return record_json;
  elsif operation = 'update' then
    if entity = 'modules' then
      update public.modules set title = coalesce(patch->>'title', title),
        description = case when patch ? 'description' then patch->>'description' else description end,
        status = coalesce(patch->>'status', status), updated_at = now()
      where id = target returning to_jsonb(modules.*) into record_json;
    elsif entity = 'lessons' then
      update public.lessons set title = coalesce(patch->>'title', title),
        recap = case when patch ? 'recap' then patch->'recap' else recap end,
        status = coalesce(patch->>'status', status), updated_at = now()
      where id = target returning to_jsonb(lessons.*) into record_json;
    else
      update public.activities set
        title = case when patch ? 'title' then patch->>'title' else title end,
        content = coalesce(patch->'content', content),
        concept_tag = case when patch ? 'concept_tag' then patch->>'concept_tag' else concept_tag end,
        is_core = coalesce((patch->>'is_core')::boolean, is_core),
        teaching_guide = case when patch ? 'teaching_guide' then patch->'teaching_guide' else teaching_guide end,
        hints = case when patch ? 'hints' then patch->'hints' else hints end,
        -- Saving validated content is the admin's human-review step.
        ai_suggested = case when patch ? 'content' then false else ai_suggested end, updated_at = now()
      where id = target returning to_jsonb(activities.*) into record_json;
    end if;
    if record_json is null then raise exception 'That curriculum item could not be found.'; end if;
    return record_json;
  elsif operation = 'delete' then
    if entity = 'modules' then raise exception 'Modules cannot be deleted here.'; end if;
    execute format('delete from public.%I where id = $1 returning %I', table_name, parent_column)
      into parent using target;
    if parent is null then raise exception 'That curriculum item could not be found.'; end if;
    execute format('with numbered as (select id, row_number() over (order by position, id) as n from public.%I where %I = $1)
      update public.%I t set position = n.n from numbered n where t.id = n.id', table_name, parent_column, table_name) using parent;
    return 'null'::jsonb;
  elsif operation = 'reorder' then
    select coalesce(array_agg(value::uuid), '{}'::uuid[]) into ordered_ids from jsonb_array_elements_text(args->'ids');
    if entity = 'modules' then
      select coalesce(array_agg(id order by id), '{}'::uuid[]) into existing_ids from public.modules;
    else
      execute format('select coalesce(array_agg(id order by id), ''{}''::uuid[]) from public.%I where %I = $1', table_name, parent_column)
        into existing_ids using parent;
    end if;
    if existing_ids <> array(select unnest(ordered_ids) order by 1) then
      raise exception 'Include every item exactly once when changing the order.';
    end if;
    for idx in 1..cardinality(ordered_ids) loop
      execute format('update public.%I set position = $1 where id = $2', table_name) using idx, ordered_ids[idx];
    end loop;
    return 'null'::jsonb;
  elsif operation = 'assessment' then
    insert into public.assessments(module_id, kind) values (parent, args->>'kind')
      on conflict (module_id, kind) do update set kind = excluded.kind returning id into new_id;
    -- Do not silently erase students' assessment results when editing a used test.
    if exists (select 1 from public.assessment_responses r join public.assessment_questions q on q.id = r.question_id where q.assessment_id = new_id) then
      raise exception 'Students have already answered this test. Keep it unchanged to preserve their results.';
    end if;
    delete from public.assessment_questions where assessment_id = new_id;
    idx := 0;
    for item in select value from jsonb_array_elements(args->'questions') loop
      idx := idx + 1;
      insert into public.assessment_questions(assessment_id, position, concept_tag, content)
      values (new_id, idx, item->>'concept_tag', item - 'concept_tag' - 'id' - 'position');
    end loop;
    return to_jsonb(new_id);
  end if;
  raise exception 'That curriculum action is not available.';
end $$;
revoke all on function public.edit_curriculum(text, jsonb) from public, anon;
grant execute on function public.edit_curriculum(text, jsonb) to authenticated;

-- Enforce the publishing gate even if a caller bypasses the TypeScript functions.
create function public.check_module_publish() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if not exists (select 1 from public.lessons where module_id = new.id and status = 'published') then
      raise exception 'Publish at least one lesson before publishing this module.';
    end if;
    if exists (select 1 from public.activities a join public.lessons l on l.id = a.lesson_id
      where l.module_id = new.id and a.ai_suggested) then
      raise exception 'Review and save all AI-drafted activities before publishing this module.';
    end if;
  end if;
  return new;
end $$;
create trigger module_publish_check before insert or update of status on public.modules
  for each row execute function public.check_module_publish();

-- Same human-review gate for a single lesson (e.g. publishing a lesson inside an already
-- published module), and for AI-drafted steps added to or moved into a live lesson.
create function public.check_lesson_publish() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and exists (select 1 from public.activities where lesson_id = new.id and ai_suggested) then
    raise exception 'Review and save all AI-drafted activities before publishing this lesson.';
  end if;
  return new;
end $$;
create trigger lesson_publish_check before insert or update of status on public.lessons
  for each row execute function public.check_lesson_publish();

create function public.check_activity_review() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.ai_suggested and exists (select 1 from public.lessons where id = new.lesson_id and status = 'published') then
    raise exception 'AI-drafted activities can only be added to draft lessons. Review them before publishing.';
  end if;
  return new;
end $$;
create trigger activity_review_check before insert or update of ai_suggested, lesson_id on public.activities
  for each row execute function public.check_activity_review();
