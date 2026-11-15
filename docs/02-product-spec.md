# CIC Launchpad: Product Spec

Merged idea: Maulik (Launchpad + "Help me teach this"), Dhanush (Python runner, learning gain), Poulami, updated with mentor feedback (Sat Nov 14, 3 PM).

## 1. One sentence
CIC Launchpad turns CIC's existing slide decks (or a YouTube link) into interactive coding lessons. Students learn in a friendly LeetCode/CodeHS-style screen with quizzes and in-browser Python. Teachers see who's stuck and get a **"Help me teach this"** guide. Students who miss a week get a **catch-up path**. CIC sees **learning gain per topic**.

## 2. Mentor feedback this spec responds to
1. CIC already has slide decks, so **import .pptx** (or similar) instead of building lessons from scratch.
2. Main focus: **how we design the learning and tracking for students.**
3. **Reverse-engineer CodeHS**, keep the UI/UX **extremely clean and impressive.**
4. A **LeetCode/GFG-style** learning interface, but easier and more interactive, with quizzes.
5. Solve: **a student misses a session or a week. How does the teacher help?**
6. **Paste a YouTube link** as lesson input (very impressive to watch in a demo).

Slack mentor answers (Sat 1:45–2:02 PM):
- Class code + student name login is OK **if** progress resumes securely and **duplicate names** are handled. No shared passwords, so we use a **personal join code** per student.
- Pre/post tests: authored by curriculum owners; **same learning goals, not identical questions**.
- Late joiners: **instructor chooses** the start (MVP); a diagnostic quiz can *suggest*.
- Modules unlock **in order** by default; **instructor can unlock** later ones per student.
- AI hints welcome, but must be tied to the exercise. **Send no unnecessary student info to AI.** Show teachers which topics get the most hint requests.
- API: **simple, documented JSON REST**.
- Data (Urjit): track gains per student, class and topic; **rule-based "needs help" indicators** (repeated wrong answers, low scores, incomplete modules); **one consistent data structure** for all student interactions.

## 3. Users and roles
| Role | Can do |
|---|---|
| **CIC admin** | Everything: import/author curriculum, publish, see all classes, learning gain, manage API keys |
| **Instructor** | Create classes, upload roster, schedule sessions, attendance, live classroom, catch-up, unlock overrides; sees only their own classes |
| **Student** | Join with class code + personal code; learn; sees only their own progress |
| **External reviewer** | Read-only view of published curriculum and teaching guides |

## 4. The journey (demo story)
1. **CIC staff import** a slide deck (.pptx/PDF) **or paste a YouTube link**. AI drafts quizzes, a coding exercise and a teaching guide. Staff edit, then publish.
2. **Teacher creates a class and schedule:** roster CSV → personal join codes (printable cards/QR); which lesson each session covers.
3. **Student joins** (class code + personal code) and takes the **pre-test**.
4. **Course map:** units → lessons as colored bubbles (grey not opened, yellow started, green done).
5. **Learning screen (LeetCode-style, friendlier):** lesson left, code right, quizzes between steps, **Check** shows "2 of 3 tests passed".
6. **Live classroom:** red "needs help" flags. Click a student to see their work + **"Help me teach this"**.
7. **Missed a week → Catch-up mode:** 2-minute recap, core exercises only, quick check to test out.
8. **Post-test**; progress is saved across sessions.
9. **CIC dashboard:** learning gain per topic (e.g. "+32 points on loops") + read API.

## 5. Features

### A. Import (CIC staff and teachers)
**Slide deck:** upload `.pptx` or `.pdf` (Google Slides exports both).
- PDF: render each page to an image client-side with pdf.js; extract text.
- PPTX: unzip (it's a zip of XML) with JSZip; extract slide text and embedded images per slide. (If time is short, convert to PDF first, or accept PDF only and tell users to "Download as PDF".)
- Each slide becomes a **lesson step** (slide image + text).
- AI drafts from the slide text: 2–3 quiz questions (with concept tags), 1 coding exercise with test cases, and a **teaching guide**. Everything opens in an editor as a **draft**.
- Staff mark exercises **core** (must-do) or **extra** (optional). Catch-up uses this.

**YouTube link → interactive lesson** (headline demo moment):
- Paste a link → fetch captions/transcript → AI drafts **pause-point quizzes** (timestamp + question), key points, a coding exercise, and a teaching guide.
- The student watches the embedded video. It **pauses at quiz points** (YouTube IFrame Player API) and can't skip ahead past an unanswered quiz.
- **Fallbacks:** some videos have no captions, and YouTube may block server-side caption fetching. Allow **pasting a transcript manually**, and for the demo **pre-test the exact video and cache its transcript**.
- AI never receives student data.

**Manual authoring** is always available (the brief requires it): add/edit steps, quizzes, exercises, guides; Draft → Preview → Publish.

### B. Class setup (instructor), under 10 minutes
- Create class (name, school) → get a **class code**.
- Upload roster CSV (`name` column; optional `school`, `class`). Each student gets a **personal join code** (6 characters, no look-alike letters), shown as printable cards with QR codes. Store only a **hash** of the code.
- Duplicate names: students are distinct records; show as "Alex R." / "Alex M." or "Alex (2)".
- **Schedule:** list of sessions (date → lesson). This defines the class pace.
- **Attendance:** present/absent per session; plus automatic "last active".
- **Start point** for late joiners (instructor picks); **unlock override** per student; **exempt/skip** recorded separately from completed.

### C. Student learning screen (main focus)
Inspired by **CodeHS** (course map, colored progress bubbles, autograder with test cases, Check Code button) and **LeetCode/GFG** (problem left, editor right), but friendlier for beginners.
- **Course map:** units → lessons as bubbles: grey = not opened, yellow = started, green = completed. % complete per unit. Locked lessons show a lock with "Finish *X* to unlock".
- **Lesson player:** a progress bar of steps at the top. Each step is one of:
  - `slide` (image + text) / `video` (YouTube embed with pause-point quizzes)
  - `quiz_mcq`: multiple choice
  - `predict_output`: "What will this code print?"
  - `fix_bug`: one mistake to fix, then Check
  - `fill_blank`: complete a missing line
  - `parsons`: drag code lines into order
  - `code_exercise`: split view, Run + Check, hidden test cases, "2 of 3 tests passed" with a friendly message
  - `worksheet`: digital version of a printed worksheet (short answers), submitted
  - `exit_question`: final check for the lesson
- **Python runner:** Pyodide in a Web Worker; stdout shown; ~5 second timeout; input() handled with a simple prompt box.
- **Hints:** staff-written step-by-step hints (MVP). AI Socratic hints only if time allows (send exercise + the student's code only, no name).
- Instant feedback, celebration on completion (subtle), next step unlocks.

### D. Tracking: one activity log (Urjit's advice)
Every student interaction becomes one row in `activity_events` (see data model). This powers the course map, live classroom, catch-up, mastery, and learning gain.

### E. Live classroom + "Help me teach this" ⭐
- Roster like CodeHS: current lesson/step, % complete, **last active** ("2 min ago"), attendance, status color: green on track, grey not started, red needs help, orange behind schedule.
- **Needs-help rules** (rule-based, configurable constants):
  - ≥ 3 wrong attempts on the same activity
  - ≥ 5 minutes on one step without completing
  - ≥ 3 hints on the same concept
  - quiz/exit score below 60%
  - lesson not started when the class session for it has passed
- Click a student → **their latest code/answers** + the **teaching guide** for that activity:
  1. What this is about (plain words)
  2. Common mistakes
  3. A worked example
  4. Questions to ask / a quick demo (never just give the answer)
- **Concept mastery view** per class: "80% stuck on loops".

### F. Catch-up mode (missed a session)
- **Detection:** a student is *behind* if a scheduled session's lesson has passed and the student was absent **or** hasn't completed that lesson. They get a "Missed: Loops" badge.
- **Catch-up path** (auto-built per missed lesson):
  1. **2-minute recap:** key slides/key points (AI-drafted at import time, staff-approved).
  2. **Core exercises only** (extras skipped).
  3. **Quick check (test-out):** 3–5 questions; pass (≥ 70%) → marked caught up and rejoins at the class's current lesson; struggle → flagged for the teacher with the weak topic.
- **Teacher tools:** "Behind" list (who missed what, catch-up progress), **one-click Assign catch-up** (one student or all absentees), "Help me teach this" for the missed topic (a 5-minute catch-up talk with no prep), **buddy suggestion** (a classmate who mastered the topic, if time allows), green "Caught up" check.
- Exempted lessons are stored as `exempt`, never as completed.

### G. Learning results (CIC admin)
- **Learning gain = post-test % − pre-test %**, per student, class, cohort, and **concept tag**.
- Show **n** (students included) and flag missing pre/post tests.
- Separate *completed* from *understood*: first-try correct rate, hints used, independent assessment score.
- CSV export.

### H. Read API (key-authenticated JSON REST)
Header: `x-api-key: <key>` (keys hashed in DB, created by CIC admin).
- `GET /api/v1/classes`: list classes with completion %
- `GET /api/v1/classes/{id}/summary`: completion, active students, behind count, avg learning gain
- `GET /api/v1/learning-gain?classId=&moduleId=&concept=`: aggregated gain + n
- `GET /api/v1/concepts/mastery?classId=`: per-concept mastery %
Return aggregates only (no student names) by default. Document every endpoint with example `curl` in the README.

## 6. Data model (Supabase / Postgres sketch)
```
profiles(id uuid pk = auth.users.id, role text check in ('admin','instructor','reviewer'), display_name, created_at)
modules(id, title, description, position int, status text check in ('draft','published'), created_by, created_at)
lessons(id, module_id fk, title, position int, source text check in ('manual','pptx','pdf','youtube'), source_url, recap jsonb, status)
activities(id, lesson_id fk, position int,
           type text check in ('slide','video','quiz_mcq','predict_output','fix_bug','fill_blank','parsons','code_exercise','worksheet','exit_question'),
           content jsonb,            -- prompt, options, answer, starter_code, tests, timestamps...
           concept_tag text, is_core bool default true,
           teaching_guide jsonb,     -- {about, mistakes[], example, ask[]}
           hints jsonb)
assessments(id, module_id fk, kind text check in ('pre','post'))
assessment_questions(id, assessment_id fk, position, concept_tag, content jsonb)
classes(id, name, school, instructor_id fk profiles, class_code text unique, created_at)
class_sessions(id, class_id fk, session_date date, lesson_id fk)
students(id, class_id fk, display_name text, school text, join_code_hash text, start_module_id fk null, created_at)
attendance(session_id fk, student_id fk, status text check in ('present','absent'), primary key(session_id, student_id))
unlock_overrides(student_id fk, module_id fk, created_by, primary key(student_id, module_id))
lesson_status(student_id fk, lesson_id fk, status text check in ('not_started','in_progress','completed','exempt'), updated_at)
activity_events(id bigserial, student_id fk, class_id fk, activity_id fk null, lesson_id fk null,
                event_type text check in ('view','attempt','run','check','hint','complete','skip','catchup_assigned','catchup_passed'),
                correct bool null, tests_passed int null, tests_total int null, duration_ms int null,
                concept_tag text null, payload jsonb, created_at timestamptz default now())
assessment_responses(id, student_id fk, question_id fk, kind text, correct bool, created_at)
api_keys(id, name, key_hash, created_by, created_at, revoked_at)
```
RLS: students only read/write their own rows (via a signed session after join-code login); instructors only their classes; reviewers read published curriculum only; admins all.

**Student sessions:** join-code login runs server-side (verify class code + hash of personal code), then sets an httpOnly signed session cookie. Student requests go through server routes using the service role with explicit `student_id` checks, or use Supabase anonymous auth linked to the student row.

## 7. Privacy and safety
- Student PII limited to name, school, class.
- AI receives only curriculum text/captions/exercise code: never names or IDs.
- Human approval for all AI-drafted content.
- Secrets in env vars only; `.env.example` committed, `.env.local` git-ignored.
- Pyodide in a Web Worker with a timeout (no server-side code execution).

## 8. Env vars (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
AI_BASE_URL=https://ai.ohack.dev/v1
AI_API_KEY=
AI_MODEL=gpt-oss-120b
```

## 9. Sample content (until CIC sends a real deck)
A clearly labeled sample module **"Python Basics: Loops"** with: 6 slides, 1 YouTube lesson (pre-tested captions cached), 4 quiz types, 2 code exercises (core) + 1 extra, pre/post tests tagged `variables`, `loops`, `conditionals`, and seed data for a demo class of ~12 students with varied progress (some red flags, 2 absent last session).
