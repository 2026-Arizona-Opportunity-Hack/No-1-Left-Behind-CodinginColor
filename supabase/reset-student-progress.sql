-- Puts ONE student back at the very start: no lessons done, no quiz answers, nothing unlocked early.
-- By default it resets the demo student Jaylen Washington (class MARY-P3, personal code 7KQ2MX), so anyone
-- trying the demo card has the whole course to go through. His name, code and class are kept.
--
-- Run it in Supabase -> SQL editor whenever you want to reset him again. To reset someone else, change the two
-- values just below. It only deletes that one student's progress; nothing else (lessons, classes, other students).

do $reset$
declare
  the_class constant text := 'MARY-P3';
  the_name  constant text := 'Jaylen Washington';
  sid uuid;
begin
  select s.id into sid
  from public.students s join public.classes c on c.id = s.class_id
  where c.class_code = the_class and s.display_name = the_name;
  if sid is null then
    raise exception 'No student named % in class % was found. Nothing was changed.', the_name, the_class;
  end if;

  delete from public.activity_events     where student_id = sid;  -- answers, tries, hints, time on each step
  delete from public.assessment_responses where student_id = sid; -- pre-test and post-test answers
  delete from public.lesson_status       where student_id = sid;  -- which lessons are done
  delete from public.unlock_overrides    where student_id = sid;  -- units a teacher opened early
  delete from public.attendance          where student_id = sid;  -- present / absent marks
  update public.students set start_module_id = null where id = sid;
end
$reset$;
