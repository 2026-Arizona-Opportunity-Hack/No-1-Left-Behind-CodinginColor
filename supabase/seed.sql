-- Demo data: "Python Basics" course, two classes, 24 students with varied progress.
-- Safe to re-run: it deletes the demo rows (fixed ids) and recreates them with
-- timestamps relative to now(), so the live classroom always looks "live".
-- Student join codes below are DEMO codes, printed on the demo join cards.

delete from public.classes where id in (
  'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005');
delete from public.modules where id in (
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003');

-- ---------- Course: units = modules ----------
insert into public.modules (id, title, description, position, status) values
  ('10000000-0000-0000-0000-000000000001', 'Getting started', 'Your first Python programs.', 1, 'draft'),
  ('10000000-0000-0000-0000-000000000002', 'Making decisions', 'If statements, loops and lists.', 2, 'draft'),
  ('10000000-0000-0000-0000-000000000003', 'Building things', 'Functions and a mini project.', 3, 'draft');

insert into public.lessons (id, module_id, title, position, status, recap) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Hello Python', 1, 'published', null),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Variables', 2, 'published', null),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Input and output', 3, 'published', null),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'If statements', 1, 'published', null),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Loops', 2, 'published',
   $j${"minutes": 2, "key_points": [
     "A loop repeats code so you don't have to copy and paste it.",
     "for number in range(1, 6): runs with number = 1, 2, 3, 4, 5.",
     "range stops BEFORE the second number, so range(1, 6) ends at 5.",
     "Everything indented under the for line repeats."]}$j$),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Lists', 3, 'published', null),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Functions', 1, 'published', null),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'Mini project', 2, 'published', null);

-- ---------- The "Loops" lesson: 9 core steps + 1 extra ----------
insert into public.activities (id, lesson_id, position, type, title, concept_tag, is_core, content, teaching_guide, hints) values
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 1, 'slide', 'Why loops?', 'loops', true,
 $j${"heading": "Why loops?", "body": "Imagine printing the numbers 1 to 100. You could write print() 100 times, or write it once and let a loop repeat it.", "code": "print(1)\nprint(2)\nprint(3)\n# ...97 more lines?"}$j$, null, null),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 2, 'slide', 'for and range', 'loops', true,
 $j${"heading": "for and range", "body": "range(1, 4) gives 1, 2, 3. It stops just before the second number. The indented line runs once for each number.", "code": "for number in range(1, 4):\n    print(number)", "output": "1\n2\n3"}$j$, null, null),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 3, 'quiz_mcq', 'Quick check', 'loops', true,
 $j${"prompt": "Which numbers does range(1, 4) give?", "options": ["1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3"], "answer": 0, "explanation": "range stops just before the second number, so 4 is not included."}$j$, null,
 $j$["Count up from the first number.", "Does range include the last number?"]$j$),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', 4, 'code_exercise', 'Your turn: count to 5', 'loops', true,
 $j${"prompt": "Change the code so it prints the numbers 1, 2, 3, 4, 5, each on its own line.",
     "starter_code": "# Print the numbers 1 to 5\nfor number in range(1, 5):\n    print(number)\n",
     "tests": [
       {"label": "Starts counting at 1", "assert": "assert __output__.split()[:1] == [\"1\"]", "hint": "The first number printed should be 1."},
       {"label": "Prints one number per line", "assert": "assert all(line.strip().isdigit() for line in __output__.strip().splitlines())", "hint": "Use print() inside the loop so each number gets its own line."},
       {"label": "Stops at 5", "expectedOutput": "1\n2\n3\n4\n5", "hint": "Your loop stops one number too early. Try changing the range."}]}$j$,
 $j${"about": "A for loop repeats the indented code once for each number range() gives. range(start, stop) stops just BEFORE stop, which surprises almost everyone.",
     "mistakes": ["Writing range(1, 5) and expecting 5 to be printed (off by one).", "Forgetting to indent print(), so it runs once after the loop.", "Starting at range(5), which begins at 0."],
     "example": "for number in range(1, 4):\n    print(number)\n# prints 1, 2, 3 (not 4)",
     "ask": ["What's the last number your code prints? Which number did you want?", "If range(1, 4) stops at 3, what would make it stop at 5?", "Can you point to the line that repeats?"]}$j$,
 $j$["Run your code. What is the last number it prints?", "range(1, 5) stops before 5. What second number would include 5?"]$j$),
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 5, 'predict_output', 'What will it print?', 'loops', true,
 $j${"prompt": "What will this code print?", "code": "for i in range(3):\n    print(i * 2)", "answer": "0\n2\n4", "explanation": "range(3) gives 0, 1, 2, and each is doubled."}$j$, null,
 $j$["range(3) starts at 0.", "Write down i for each pass, then double it."]$j$),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000005', 6, 'fix_bug', 'Fix the bug', 'loops', true,
 $j${"prompt": "This loop should print 0 to 4, but Python can't run it. Fix the one mistake.", "starter_code": "for i in range(5)\n    print(i)\n", "bug_line": 1,
     "tests": [{"label": "Prints 0 to 4", "expectedOutput": "0\n1\n2\n3\n4", "hint": "Look at the end of line 1. What does every for line need?"}]}$j$,
 $j${"about": "Every for line ends with a colon (:). It tells Python the indented block is coming.", "mistakes": ["Missing colon at the end of the for line.", "Mixing tabs and spaces in the indent."], "example": "for i in range(3):\n    print(i)", "ask": ["What does Python's message say about line 1?", "Compare your for line with the one on the slide. What's different?"]}$j$,
 $j$["Python's error points at line 1.", "Every for line ends with a colon."]$j$),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', 7, 'parsons', 'Put the lines in order', 'loops', true,
 $j${"prompt": "Arrange the lines so the program adds 1 + 2 + 3 and prints 6.", "lines": ["total = 0", "for n in range(1, 4):", "    total = total + n", "print(total)"]}$j$, null,
 $j$["You need a total before the loop starts.", "print(total) should run once, after the loop."]$j$),
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000005', 8, 'fill_blank', 'Fill in the blank', 'loops', true,
 $j${"prompt": "Fill in the blank so the loop prints each letter of the word hi.", "template": "for letter in ____:\n    print(letter)", "answers": ["\"hi\"", "'hi'"]}$j$, null,
 $j$["You can loop over a word, not just numbers.", "Words need quote marks."]$j$),
('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005', 9, 'exit_question', 'Exit question', 'loops', true,
 $j${"prompt": "How many times does this loop run?\nfor i in range(2, 6):", "options": ["3 times", "4 times", "5 times"], "answer": 1, "explanation": "range(2, 6) gives 2, 3, 4, 5: four numbers."}$j$, null, null),
('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000005', 10, 'code_exercise', 'Bonus: count down', 'loops', false,
 $j${"prompt": "Extra challenge: print 5, 4, 3, 2, 1. Hint: range can take a third number, the step.", "starter_code": "for number in range(5, 0, ____):\n    print(number)\n",
     "tests": [{"label": "Counts down from 5 to 1", "expectedOutput": "5\n4\n3\n2\n1", "hint": "A step of -1 counts down."}]}$j$, null, null);

-- Short slide + exit question for every other lesson
insert into public.activities (lesson_id, position, type, title, concept_tag, content)
select l.id, s.position, s.type, s.title, l.concept, s.content
from (values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'basics', 'Python runs your instructions top to bottom.', 'print("Hello, Maryvale!")', 'What does print() do?', '["Shows text on the screen", "Saves a file", "Asks a question"]', 0),
  ('20000000-0000-0000-0000-000000000002', 'variables', 'A variable is a name for a value you want to keep.', 'name = "Maria"\nprint(name)', 'Which line makes a variable?', '["age = 15", "print(age)", "age"]', 0),
  ('20000000-0000-0000-0000-000000000003', 'variables', 'input() asks the user a question and gives back their answer as text.', 'name = input("Your name? ")\nprint("Hi " + name)', 'What type does input() give you?', '["Text", "A number", "A list"]', 0),
  ('20000000-0000-0000-0000-000000000004', 'conditionals', 'if runs code only when something is True.', 'age = 16\nif age >= 16:\n    print("You can drive!")', 'What ends an if line?', '["A colon (:)", "A period (.)", "Nothing"]', 0),
  ('20000000-0000-0000-0000-000000000006', 'lists', 'A list keeps many values in order, inside square brackets.', 'colors = ["red", "green", "blue"]\nprint(colors[0])', 'What does colors[0] give?', '["The first item", "The last item", "The number 0"]', 0),
  ('20000000-0000-0000-0000-000000000007', 'functions', 'A function is a named block of code you can run again and again.', 'def greet(name):\n    print("Hi " + name)\n\ngreet("Alex")', 'Which word starts a function?', '["def", "func", "make"]', 0),
  ('20000000-0000-0000-0000-000000000008', 'functions', 'Put it all together: build a tiny quiz game.', 'score = 0\nanswer = input("2 + 2? ")\nif answer == "4":\n    score = score + 1\nprint("Score:", score)', 'What does score = score + 1 do?', '["Adds one point", "Resets the score", "Prints the score"]', 0)
) as l(id, concept, body, code, q, options, answer)
cross join lateral (values
  (1, 'slide', 'Key idea', jsonb_build_object('heading', 'Key idea', 'body', l.body, 'code', replace(l.code, '\n', chr(10)))),
  (2, 'exit_question', 'Exit question', jsonb_build_object('prompt', l.q, 'options', l.options::jsonb, 'answer', l.answer))
) as s(position, type, title, content);

-- "Lists" follows CIC's full module template: slides → quick check → digital worksheet → exit question.
-- The worksheet is a printed CIC worksheet turned into an on-screen form (P0: digital worksheets).
update public.activities set position = 4
where lesson_id = '20000000-0000-0000-0000-000000000006' and type = 'exit_question';
insert into public.activities (id, lesson_id, position, type, title, concept_tag, is_core, content, hints) values
('30000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000006', 2, 'quiz_mcq', 'Quick check', 'lists', true,
 $j${"prompt": "pets = [\"cat\", \"dog\", \"fish\"]\nHow many items are in pets?", "options": ["2", "3", "4"], "answer": 1, "explanation": "Count the values between the square brackets: cat, dog, fish."}$j$,
 $j$["Count the words inside the square brackets."]$j$),
('30000000-0000-0000-0000-000000000062', '20000000-0000-0000-0000-000000000006', 3, 'worksheet', 'Worksheet: my playlist', 'lists', true,
 $j${"instructions": "Plan a Python list for your favorite playlist. There are no wrong answers: your teacher will read these.",
     "fields": [
       {"id": "songs", "label": "Write a Python list with 3 of your favorite songs", "kind": "long", "required": true},
       {"id": "first", "label": "What would playlist[0] give you?", "kind": "short", "required": true},
       {"id": "count", "label": "How many songs are in your list?", "kind": "number", "required": true},
       {"id": "question", "label": "Anything about lists you're still unsure about?", "kind": "long"}]}$j$,
 null);

-- ---------- Pre/post test for "Making decisions" (equivalent questions, not identical) ----------
insert into public.assessments (id, module_id, kind) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'pre'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'post');

insert into public.assessment_questions (assessment_id, position, concept_tag, content) values
  ('a0000000-0000-0000-0000-000000000001', 1, 'conditionals', $j${"prompt": "x = 3\nif x > 5:\n    print(\"big\")\nWhat prints?", "options": ["big", "Nothing", "An error"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000001', 2, 'conditionals', $j${"prompt": "Which symbol means \"is equal to\" in an if?", "options": ["=", "==", "=>"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000001', 3, 'loops', $j${"prompt": "How many numbers does range(0, 3) give?", "options": ["2", "3", "4"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000001', 4, 'loops', $j${"prompt": "for i in range(1, 4):\n    print(i)\nWhat is the last number printed?", "options": ["3", "4", "1"], "answer": 0}$j$),
  ('a0000000-0000-0000-0000-000000000001', 5, 'loops', $j${"prompt": "Which part of a loop repeats?", "options": ["The indented lines", "The line after the loop", "Only the first line"], "answer": 0}$j$),
  ('a0000000-0000-0000-0000-000000000001', 6, 'lists', $j${"prompt": "pets = [\"cat\", \"dog\"]\nWhat is pets[1]?", "options": ["cat", "dog", "An error"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000002', 1, 'conditionals', $j${"prompt": "y = 10\nif y < 2:\n    print(\"small\")\nWhat prints?", "options": ["small", "Nothing", "An error"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000002', 2, 'conditionals', $j${"prompt": "Which line checks if score equals 100?", "options": ["if score = 100:", "if score == 100:", "if score is 100"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000002', 3, 'loops', $j${"prompt": "How many numbers does range(2, 5) give?", "options": ["2", "3", "5"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000002', 4, 'loops', $j${"prompt": "for n in range(5, 8):\n    print(n)\nWhat is the last number printed?", "options": ["8", "7", "5"], "answer": 1}$j$),
  ('a0000000-0000-0000-0000-000000000002', 5, 'loops', $j${"prompt": "You want to print \"hi\" 4 times. Which loop works?", "options": ["for i in range(4):", "for i in range(1, 4):", "for i in 4:"], "answer": 0}$j$),
  ('a0000000-0000-0000-0000-000000000002', 6, 'lists', $j${"prompt": "nums = [4, 8, 15]\nWhat is nums[0]?", "options": ["4", "8", "15"], "answer": 0}$j$);

-- ---------- Classes and students ----------
-- Taught by the demo teacher account if it exists (teacher@launchpad.test); otherwise unassigned.
insert into public.classes (id, name, school, class_code, instructor_id) values
  ('c0000000-0000-0000-0000-000000000003', 'Period 3', 'Maryvale High', 'MARY-P3',
   (select id from auth.users where email = 'teacher@launchpad.test')),
  ('c0000000-0000-0000-0000-000000000005', 'Period 5', 'Desert Edge High', 'DESERT-P5',
   (select id from auth.users where email = 'teacher@launchpad.test'));

-- Join codes: 6 characters, no look-alikes (0/O, 1/I/L). Hash = sha256(class_id || ':' || code).
-- In each list: name, demo code, Unit 2 progress for "If statements" / "Loops" / "Lists",
-- current Loops step, and the demo story flag.
do $seed$
declare
  p3 constant uuid := 'c0000000-0000-0000-0000-000000000003';
  p5 constant uuid := 'c0000000-0000-0000-0000-000000000005';
  loops constant uuid := '20000000-0000-0000-0000-000000000005';
  rec record;
  sid uuid;
  n int := 0;
  step int;
  sess uuid;
  unit1 uuid[] := array['20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
                        '20000000-0000-0000-0000-000000000003']::uuid[];
  l uuid;
begin
  for rec in
    select * from (values
      -- class, name, code, if, loops, lists, loops step, story
      (p3, 'Jaylen Washington', '7KQ2MX', 'completed', 'in_progress', 'not_started', 4, 'stuck_checks'),
      (p3, 'Maria Garcia',      'H4TR9B', 'completed', 'completed',   'in_progress', 9, 'ahead'),
      (p3, 'Alex Rivera',       'PW3N8C', 'completed', 'in_progress', 'not_started', 6, 'on_track'),
      (p3, 'Alex Morales',      'FJ6V2D', 'completed', 'in_progress', 'not_started', 4, 'stuck_checks'),
      (p3, 'Destiny Harris',    'R8XK5E', 'completed', 'in_progress', 'not_started', 5, 'stuck_hints'),
      (p3, 'Marcus Thompson',   'C2MZ7F', 'completed', 'not_started', 'not_started', 0, 'not_started'),
      (p3, 'Sofia Lopez',       'N5BQ3G', 'completed', 'completed',   'in_progress', 9, 'ahead'),
      (p3, 'Diego Perez',       'T9HW4J', 'completed', 'not_started', 'not_started', 0, 'missed_loops'),
      (p3, 'Aaliyah Johnson',   'K3DY6M', 'completed', 'in_progress', 'not_started', 8, 'on_track'),
      (p3, 'Kevin Nguyen',      'V7GA2P', 'in_progress', 'not_started', 'not_started', 0, 'missed_if'),
      (p3, 'Jasmine Brooks',    'Q6RE8S', 'completed', 'not_started', 'not_started', 0, 'not_started'),
      (p3, 'Ethan Clark',       'B4UN9T', 'completed', 'completed',   'not_started', 9, 'on_track'),
      (p5, 'Isabella Cruz',     'M8PF3U', 'completed', 'completed',   'in_progress', 9, 'on_track'),
      (p5, 'Noah Begay',        'E2XS7V', 'completed', 'completed',   'not_started', 9, 'on_track'),
      (p5, 'Camila Reyes',      'W5JT4X', 'completed', 'in_progress', 'not_started', 7, 'on_track'),
      (p5, 'Jordan Yazzie',     'G9KC2Y', 'completed', 'in_progress', 'not_started', 3, 'on_track'),
      (p5, 'Mia Hernandez',     'S3VB8Z', 'completed', 'completed',   'not_started', 9, 'on_track'),
      (p5, 'Elijah Brown',      'D7NQ5A', 'completed', 'in_progress', 'not_started', 4, 'stuck_checks'),
      (p5, 'Valeria Ortiz',     'J4HM9C', 'completed', 'completed',   'in_progress', 9, 'ahead'),
      (p5, 'Tyler Jim',         'X6RW3D', 'completed', 'not_started', 'not_started', 0, 'missed_loops'),
      (p5, 'Zoe Martinez',      'P2FG7E', 'completed', 'completed',   'not_started', 9, 'on_track'),
      (p5, 'Andre Wilson',      'U8CK4F', 'completed', 'in_progress', 'not_started', 5, 'on_track'),
      (p5, 'Lucia Sandoval',    'A5TY2G', 'completed', 'completed',   'not_started', 9, 'on_track'),
      (p5, 'Ryan Tso',          'Z9BD6H', 'in_progress', 'not_started', 'not_started', 0, 'missed_if')
    ) as t(class_id, name, code, if_s, loops_s, lists_s, loops_step, story)
  loop
    n := n + 1;
    sid := format('50000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid;
    insert into public.students (id, class_id, display_name, school, join_code_hash)
    values (sid, rec.class_id, rec.name,
            case when rec.class_id = p3 then 'Maryvale High' else 'Desert Edge High' end,
            encode(sha256(convert_to(rec.class_id::text || ':' || rec.code, 'UTF8')), 'hex'));

    -- Unit 1 done by everyone; Unit 2 per the story
    foreach l in array unit1 loop
      insert into public.lesson_status values (sid, l, 'completed', now() - interval '12 days');
    end loop;
    insert into public.lesson_status values
      (sid, '20000000-0000-0000-0000-000000000004', rec.if_s, now() - interval '8 days'),
      (sid, loops, rec.loops_s, now() - interval '3 minutes'),
      (sid, '20000000-0000-0000-0000-000000000006', rec.lists_s, now() - interval '1 minute');

    -- Loops activity log: steps finished, then the current step
    if rec.loops_step > 0 then
      for step in 1 .. least(rec.loops_step, 9) loop
        if step < rec.loops_step or rec.loops_s = 'completed' then
          -- time on task: 30 s to 4 min per finished step
          insert into public.activity_events (student_id, class_id, activity_id, lesson_id, event_type, correct, concept_tag, duration_ms, created_at)
          values (sid, rec.class_id, format('30000000-0000-0000-0000-%s', lpad(step::text, 12, '0'))::uuid,
                  loops, 'complete', true, 'loops',
                  30000 + ((n * 7919 + step * 104729) % 210000),
                  now() - make_interval(mins => 40 - step * 4 + (n % 3)));
        else
          -- current step: 1 to 2.5 min so far (stuck students stay under the 5-minute rule; their flags come from wrong tries / hints)
          insert into public.activity_events (student_id, class_id, activity_id, lesson_id, event_type, concept_tag, duration_ms, created_at)
          values (sid, rec.class_id, format('30000000-0000-0000-0000-%s', lpad(step::text, 12, '0'))::uuid,
                  loops, 'view', 'loops', 60000 + (n % 4) * 30000, now() - make_interval(mins => 9 + (n % 4)));
        end if;
      end loop;
    end if;

    -- Needs help: 3 failed checks on "count to 5" (2 of 3 passing), with their code
    if rec.story = 'stuck_checks' then
      for step in 1 .. 3 loop
        insert into public.activity_events (student_id, class_id, activity_id, lesson_id, event_type, correct,
          tests_passed, tests_total, concept_tag, duration_ms, payload, created_at)
        values (sid, rec.class_id, '30000000-0000-0000-0000-000000000004', loops, 'check', false, 2, 3, 'loops', 40000,
          jsonb_build_object('code', E'# Print the numbers 1 to 5\nfor number in range(1, 5):\n    print(number)\n'),
          now() - make_interval(mins => 8 - step * 2));
      end loop;
    elsif rec.story = 'stuck_hints' then
      for step in 1 .. 4 loop
        insert into public.activity_events (student_id, class_id, activity_id, lesson_id, event_type, concept_tag, created_at)
        values (sid, rec.class_id, '30000000-0000-0000-0000-000000000005', loops, 'hint', 'loops',
                now() - make_interval(mins => 9 - step * 2));
      end loop;
    end if;
  end loop;

  -- Sessions: one per lesson, the latest ("Lists") is today
  for rec in select * from (values (p3, 0), (p5, 1)) as c(class_id, shift) loop
    insert into public.class_sessions (class_id, session_date, lesson_id)
    select rec.class_id,
      current_date - case when d.days_ago = 0 then 0 else d.days_ago + rec.shift end, d.lesson
    from (values
      (21, '20000000-0000-0000-0000-000000000001'::uuid), (18, '20000000-0000-0000-0000-000000000002'),
      (14, '20000000-0000-0000-0000-000000000003'), (11, '20000000-0000-0000-0000-000000000004'),
      (4, '20000000-0000-0000-0000-000000000005'), (0, '20000000-0000-0000-0000-000000000006')
    ) as d(days_ago, lesson);
  end loop;

  -- Attendance for past sessions: absent for the "missed" stories, present otherwise
  insert into public.attendance (session_id, student_id, status)
  select cs.id, s.id,
    case
      when cs.lesson_id = loops and s.display_name in ('Jaylen Washington', 'Diego Perez', 'Tyler Jim') then 'absent'
      when cs.lesson_id = '20000000-0000-0000-0000-000000000004' and s.display_name in ('Kevin Nguyen', 'Ryan Tso') then 'absent'
      else 'present'
    end
  from public.class_sessions cs
  join public.students s on s.class_id = cs.class_id
  where cs.class_id in (p3, p5) and cs.session_date < current_date;

  -- Pre/post test answers. Rates (% correct) by class, test and topic produce a realistic
  -- learning gain; students who missed Loops have no post-test yet ("missing tests" warning).
  insert into public.assessment_responses (student_id, question_id, correct, created_at)
  select s.id, q.id,
    ((hashtext(s.id::text || a.kind || q.position::text)::bigint % 100) + 100) % 100 < case
      when a.kind = 'pre'  and q.concept_tag = 'conditionals' then case when s.class_id = p3 then 55 else 50 end
      when a.kind = 'pre'  and q.concept_tag = 'loops'        then case when s.class_id = p3 then 38 else 42 end
      when a.kind = 'pre'                                     then 30
      when q.concept_tag = 'conditionals'                     then case when s.class_id = p3 then 82 else 74 end
      when q.concept_tag = 'loops'                            then case when s.class_id = p3 then 82 else 74 end
      else 70
    end,
    case when a.kind = 'pre' then now() - interval '12 days' else now() - interval '1 day' end
  from public.students s
  cross join public.assessments a
  join public.assessment_questions q on q.assessment_id = a.id
  where s.class_id in (p3, p5)
    and a.module_id = '10000000-0000-0000-0000-000000000002'
    and (a.kind = 'pre' or s.display_name not in ('Diego Perez', 'Kevin Nguyen', 'Tyler Jim'));
end
$seed$;

-- Add the curated pre/post pairs for the other demo units.
select public.ensure_demo_assessment_pairs();

-- Publish only after lessons and reviewed activities exist.
update public.modules set status = 'published' where id in (
  '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003');

-- Both demo classes follow all three modules, in order.
insert into public.class_modules (class_id, module_id, position)
select c.id, m.id, m.position
from public.classes c cross join public.modules m
where c.id in ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005')
  and m.id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003')
on conflict (class_id, module_id) do update set position = excluded.position;
