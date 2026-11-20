-- LOCAL TEST DATA ONLY. Extra rows on top of supabase/seed.sql so every screen has something to show while
-- checking the UI: a class where everyone is on track, a hidden unit, a draft lesson, AI-drafted steps,
-- a custom "Mentor" role and a turned-off API key. Safe to re-run. Never run this against the live database.

delete from public.classes where id = 'c0000000-0000-0000-0000-000000000004';
delete from public.modules where id = '10000000-0000-0000-0000-000000000009';

-- Period 4: everyone is on track, so the class list shows a "✓ Everyone on track" card next to the "behind" ones.
insert into public.classes (id, name, school, class_code, instructor_id) values
  ('c0000000-0000-0000-0000-000000000004', 'Period 4', 'Maryvale High', 'MARY-P4',
   (select id from auth.users where email = 'teacher@launchpad.test'));

insert into public.class_modules (class_id, module_id, position)
select 'c0000000-0000-0000-0000-000000000004', module_id, position
from public.class_modules where class_id = 'c0000000-0000-0000-0000-000000000003';

do $extra$
declare
  p4 constant uuid := 'c0000000-0000-0000-0000-000000000004';
  names text[] := array['Ava Chen', 'Liam Ortega', 'Nora Patel', 'Omar Haddad', 'Priya Nair', 'Sam Whitehorse', 'Tara Lewis'];
  codes text[] := array['AV3C4N', 'LM5R7T', 'NR8P2L', 'OM4H6D', 'PR9N3K', 'SM7W2H', 'TR6L8S'];
  sid uuid;
  l record;
begin
  for i in 1 .. array_length(names, 1) loop
    sid := format('50000000-0000-0000-0000-%s', lpad((100 + i)::text, 12, '0'))::uuid;
    insert into public.students (id, class_id, display_name, school, join_code_hash)
    values (sid, p4, names[i], 'Maryvale High',
            encode(sha256(convert_to(p4::text || ':' || codes[i], 'UTF8')), 'hex'));
    for l in select id from public.lessons where status = 'published' loop
      insert into public.lesson_status values (sid, l.id, 'completed', now() - interval '2 days')
      on conflict do nothing;
    end loop;
  end loop;
end
$extra$;

-- A hidden unit (shows "Hidden from students") and a draft lesson.
insert into public.modules (id, title, description, position, status)
values ('10000000-0000-0000-0000-000000000009', 'Training data', 'Coming soon.', 9, 'draft');

insert into public.lessons (id, module_id, title, position, status)
values ('20000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000002', 'Review day', 9, 'draft')
on conflict (id) do nothing;

-- Two AI-drafted steps in the draft "Review day" lesson (the database only allows AI steps in draft lessons).
-- The editor shows the lilac "Made by AI: please check" notices on them.
delete from public.activities where lesson_id = '20000000-0000-0000-0000-000000000099';
insert into public.activities (id, lesson_id, position, type, title, concept_tag, is_core, content, ai_suggested) values
('30000000-0000-0000-0000-000000000991', '20000000-0000-0000-0000-000000000099', 1, 'quiz_mcq', 'What will it print?', 'loops', true,
 $j${"prompt": "What will this print? for i in range(3): print(i)", "options": ["0 1 2", "1 2 3", "0 1 2 3"], "answer": 0, "explanation": "range(3) gives 0, 1, 2."}$j$, true),
('30000000-0000-0000-0000-000000000992', '20000000-0000-0000-0000-000000000099', 2, 'code_exercise', 'Count to five', 'loops', true,
 $j${"prompt": "Print the numbers 1 to 5, one per line.", "starter_code": "for n in range(1, 5):\n    print(n)\n", "tests": [{"label": "Ends at 5", "expectedOutput": "1\n2\n3\n4\n5", "hint": "range stops before its second number."}]}$j$, true);

-- A custom role and a turned-off key, for the staff access and API keys screens.
insert into public.staff_roles (id, name, permissions)
values ('mentor', 'Mentor', array['curriculum.read', 'classes.manage', 'results.read'])
on conflict (id) do nothing;

insert into public.api_keys (name, key_hash, revoked_at)
select 'Grant report test', 'local-demo-hash-not-a-real-key', now() - interval '3 days'
where not exists (select 1 from public.api_keys where name = 'Grant report test');

-- Unit 2 is open for Jaylen (the same as a teacher pressing "Unlock a unit early"), so a student can reach the
-- Loops lesson and its coding exercise when checking the code editor.
insert into public.unlock_overrides (student_id, module_id)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')
on conflict do nothing;
