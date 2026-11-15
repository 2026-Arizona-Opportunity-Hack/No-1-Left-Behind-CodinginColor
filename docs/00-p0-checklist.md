# P0 Checklist: must work in the Sunday demo (never skip)

Mentor reminder: **do not skip any P0.** Every row below comes straight from CIC's brief. Update the Status column as you build (⬜ not started · 🟡 in progress · ✅ done and demoable).

_Last audited: Sat Nov 14, ~11 PM. Every P0 is built and live at https://cic-launchpad.vercel.app._

## Problem 1 P0s
| # | P0 from CIC's brief | How we deliver it | Screen(s) | Status |
|---|---|---|---|---|
| 1 | **Curriculum authoring UI**: CIC staff publish modules without engineering | Manual editor: create module → lessons → activities, edit content, Draft → Preview → Publish. (Import from YouTube/slides is an *extra* on top, never a replacement.) | Admin: Curriculum editor, Review/Publish | ✅ Editor clicked through as admin: units, lessons from template, every step type, teaching guides, hints, warm-up/final quizzes, Show to students / Hide from students; YouTube import as an extra |
| 2 | **Four roles** with role-based access: student, instructor, CIC admin, **external reviewer (read-only)** | Supabase auth for admin/instructor/reviewer + join-code sessions for students; RLS policies; reviewer sees published curriculum only, cannot edit | Role-based nav; Reviewer curriculum browser | ✅ Staff sign-in with role homes + menus, student join with codes / class link, read-only reviewer browser (`/review`); database rules tested (signed-out = nothing) |
| 3 | **Content model: module → lesson → activity**; module template = video or slides, check-for-understanding question, worksheet or exercise, exit question; **modules unlock in sequence** | Tables `modules`, `lessons`, `activities`; a "new lesson from template" button pre-creates the 4 parts; lock until previous module completed (+ instructor override) | Course map (locked modules), Lesson player | ✅ Course map with in-order unlock, teacher start point and unlock overrides; lesson player for every step type; template button in the editor |
| 4 | **Digital worksheets**: each printed worksheet becomes an on-platform activity the student completes and **submits** | Activity type `worksheet` (short-answer / fill-in fields), Submit button, saved to the student's record, viewable by the instructor | Lesson player: Worksheet step; Teacher: student work view | ✅ Worksheet step with Submit (answers saved, teacher sees them on the student page); demo Lists lesson has one; tested in Chrome |
| 5 | **Pretest and post-test pairs per module**; **learning gain per student and per class** | `assessments` (pre/post per module) + responses; gain = post % − pre %; per student, per class (and per topic as our extra) | Student test screens; Admin & teacher results | ✅ Students take pre/post tests (server-graded, once each); results pages show gain per student, class and topic with n, missing-test warnings and CSV export |
| 6 | **Progress tracking**: per-activity completion, scores, **time on task**; a **late-joining student sees exactly where to start** | `activity_events` (complete, correct, duration_ms); course map shows a "Start here" marker based on the instructor's start point / class pace | Course map; Teacher dashboard columns | ✅ Every step saves completion, score and time on task; teacher sets a late joiner's start unit; course map shows Start here / Continue |
| 7 | **Instructor dashboard**: roster, per-student progress, **stuck** and **not-started** lists | Live classroom roster + filters "Needs help (stuck)" and "Not started" | Teacher: Live classroom | ✅ Live classroom: one-line summary, then one row per student (needs help / behind / not started first, doing fine folded away) with plain reasons, % done, time working, attendance; hardest topic; student detail page with "Help me teach this" |
| 8 | **Roster CSV import** | Upload CSV → preview → create students + personal join codes | Teacher: Create class wizard | ✅ Class setup wizard (`/teach/new`): paste names or upload a CSV, preview, pick units, schedule, printable join cards + class link. Rehearse the 10-minute run before recording |
| 9 | **Read API, key-authenticated**, for progress and assessment data | `x-api-key` JSON REST endpoints, documented in README with curl examples | Admin: API keys | ✅ 4 key-protected endpoints live (401 without a key), documented in README; admin API-keys screen creates (shown once) and revokes keys |
## Success criteria (also checked by judges)
| Criterion | How we meet it | Status |
|---|---|---|
| A teacher with no CS background runs a module by **sharing a link** | Shareable class link (class code pre-filled) + printable join cards; plain-language teacher screens | ✅ |
| Student works through a module **self-paced** and the next module unlocks | Lesson player for every step type + in-order unlock | ✅ |
| Student who joins a week late **catches up** without re-teaching | Teacher sets a start unit; catch-up path (2-minute recap + practice) for missed lessons, assignable from the classroom | ✅ |
| Instructor sets up a class, imports a roster and **assigns a module in under 10 minutes** | 4-step wizard: names → units → schedule → join cards | ✅ built; time it in rehearsal |
| Learning gain per student and per class **without a spreadsheet** | Results page: before/after per topic, class and student; spreadsheet download for grants | ✅ |
| **External K12 teacher/district admin can log in and review** the curriculum | Reviewer role, read-only curriculum browser with teaching guides | ✅ |
| CIC's dashboard pulls **cohort completion and learning gain** via read API | 4 `x-api-key` endpoints, documented in README; keys made on the admin API keys page | ✅ (401 without a key verified) |

## P1: at least one (we did several)
- [x] ✅ Code runner with auto-grading and instant feedback (Pyodide in a Web Worker, 5-second stop, "2 of 3 checks passed" + hints), inside lessons and at /try
- [x] ✅ Submissions saved to progress; teacher sees the student's latest code
- [x] ✅ Concept-level view per class ("Hardest topic right now: Loops")
- [x] ✅ Extras: catch-up mode, "Help me teach this" guide, YouTube → lesson import (AI drafts, a human checks before students see it)

## Shared requirements
- [x] ✅ Role-based auth, **no shared passwords**, least privilege (Supabase Auth + row-level security; students use class code + personal code)
- [x] ✅ Read API with key auth, **documented** in the README
- [x] ✅ Hosting within **$20/month**: Vercel free + Supabase free = $0, auto-deploy on every merge
- [x] ✅ Data minimization: students = **name, school, class only**; join codes stored only as hashes; no student data ever sent to AI
- [x] ✅ No outbound messages are sent automatically (none exist)
- [x] ✅ **Lighthouse accessibility ≥ 95**: 100 on home, join, sign-in, playground, course map, lesson and catch-up (checked Sat 11 PM); keyboard-navigable with visible focus
- [x] ✅ **Deployed and demoable**, README lets CIC run and deploy it

## Judge "fail" tests: rehearse both before recording
1. ⏱️ A new instructor sets up a class, imports a roster and assigns a module in **< 10 minutes**.
2. 🧑‍🎓 A student follows a whole module **without instructor help**.


### Mentor-feedback follow-up (Nov 15)

- 🟡 Configurable staff roles and permissions: implemented with database enforcement;
  shared migrations and authenticated live rehearsal pending.
- 🟡 Slide/video import into a new curriculum unit with paired pre/post drafts:
  implemented and tested with source/AI fixtures; live AI credentials and rehearsal pending.
- 🟡 Full assigned student course view: pre-test, materials and post-test always
  visible; server-enforced progression and saved quiz results implemented and tested.
- Current Calm Mint theme preserved. Existing student history is protected during
  edits/deletions. See README for the exact rollout steps and local verification.
