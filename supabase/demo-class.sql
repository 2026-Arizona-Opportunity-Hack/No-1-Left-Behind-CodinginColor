-- The shared DEMO class behind the guest login (class code DEMO, personal code TRYIT).
-- Anyone who joins with those codes gets a brand-new guest student in this class, with their own empty progress,
-- so people trying the app never share or spoil each other's lessons. Guests are deleted after 3 days.
--
-- Run it once (Supabase -> SQL editor, or `supabase db query --remote -f supabase/demo-class.sql`).
-- It only adds rows, so it is safe to re-run. Re-run it after publishing a new unit to add that unit to the demo.
-- It does not change any real class, teacher or student.

insert into public.classes (id, name, school, class_code, instructor_id)
select 'c0000000-0000-0000-0000-0000000000d0', 'Demo class', 'Try it out', 'DEMO', null
where not exists (select 1 from public.classes where class_code = 'DEMO');

-- Every published unit, in curriculum order, so a guest has all the lessons to do.
insert into public.class_modules (class_id, module_id, position)
select c.id, m.id, (row_number() over (order by m.position))::int
from public.classes c
cross join public.modules m
where c.class_code = 'DEMO' and m.status = 'published'
  and not exists (select 1 from public.class_modules x where x.class_id = c.id and x.module_id = m.id);
