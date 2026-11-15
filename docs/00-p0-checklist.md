# P0 Checklist: must work in the Sunday demo (never skip)

Mentor reminder: **do not skip any P0.** Every row below comes straight from CIC's brief. Update the Status column as you build (⬜ not started · 🟡 in progress · ✅ done and demoable).

_Last audited: Sat Nov 14, ~8 PM._

## Problem 1 P0s
| # | P0 from CIC's brief | How we deliver it | Screen(s) | Status |
|---|---|---|---|---|
| 1 | **Curriculum authoring UI**: CIC staff publish modules without engineering | Manual editor: create module → lessons → activities, edit content, Draft → Preview → Publish. (Import from YouTube/slides is an *extra* on top, never a replacement.) | Admin: Curriculum editor, Review/Publish | 🟡 Editor screens built (`/admin/curriculum`: units, lessons from template, every step type, teaching guides, hints, pre/post tests, Draft/Publish) on #8's logic; needs a click-through as admin |
| 2 | **Four roles** with role-based access: student, instructor, CIC admin, **external reviewer (read-only)** | Supabase auth for admin/instructor/reviewer + join-code sessions for students; RLS policies; reviewer sees published curriculum only, cannot edit | Role-based nav; Reviewer curriculum browser | ✅ Staff sign-in with role homes + menus, student join with codes / class link, read-only reviewer browser (`/review`); database rules tested (signed-out = nothing) |
| 3 | **Content model: module → lesson → activity**; module template = video or slides, check-for-understanding question, worksheet or exercise, exit question; **modules unlock in sequence** | Tables `modules`, `lessons`, `activities`; a "new lesson from template" button pre-creates the 4 parts; lock until previous module completed (+ instructor override) | Course map (locked modules), Lesson player | ✅ Course map with in-order unlock, teacher start point and unlock overrides; lesson player for every step type; template button in the editor |
| 4 | **Digital worksheets**: each printed worksheet becomes an on-platform activity the student completes and **submits** | Activity type `worksheet` (short-answer / fill-in fields), Submit button, saved to the student's record, viewable by the instructor | Lesson player: Worksheet step; Teacher: student work view | ✅ Worksheet step with Submit (answers saved, teacher sees them on the student page); demo Lists lesson has one; tested in Chrome |
| 5 | **Pretest and post-test pairs per module**; **learning gain per student and per class** | `assessments` (pre/post per module) + responses; gain = post % − pre %; per student, per class (and per topic as our extra) | Student test screens; Admin & teacher results | ✅ Students take pre/post tests (server-graded, once each); results pages show gain per student, class and topic with n, missing-test warnings and CSV export |
| 6 | **Progress tracking**: per-activity completion, scores, **time on task**; a **late-joining student sees exactly where to start** | `activity_events` (complete, correct, duration_ms); course map shows a "Start here" marker based on the instructor's start point / class pace | Course map; Teacher dashboard columns | ✅ Every step saves completion, score and time on task; teacher sets a late joiner's start unit; course map shows Start here / Continue |
| 7 | **Instructor dashboard**: roster, per-student progress, **stuck** and **not-started** lists | Live classroom roster + filters "Needs help (stuck)" and "Not started" | Teacher: Live classroom | ✅ Live classroom: roster, % done, time on task, Needs help / Behind / Not started lists with plain reasons, attendance, topic bars; student detail page |
| 8 | **Roster CSV import** | Upload CSV → preview → create students + personal join codes | Teacher: Create class wizard | 🟡 Class setup wizard (`/teach/new`) with CSV upload + preview, units, schedule, printable join cards; needs the 10-minute rehearsal |
| 9 | **Read API, key-authenticated**, for progress and assessment data | `x-api-key` JSON REST endpoints, documented in README with curl examples | Admin: API keys | ✅ 4 key-protected endpoints live (401 without a key), documented in README; admin API-keys screen creates (shown once) and revokes keys |
## Success criteria (also checked by judges)
| Criterion | How we meet it | Status |
|---|---|---|
| A teacher with no CS background runs a module by **sharing a link** | Each class has a **shareable class link** (URL with the class code pre-filled) + printable join cards | 🟡 Link helper + personal code generation implemented (#9); printable card screen pending |
| Student works through a module **self-paced** and the next module unlocks | Lesson player + sequential unlock | ⬜ |
| Student who joins a week late **catches up** without re-teaching | Instructor start point + catch-up path | ⬜ (start point stored in database only) |
| Instructor sets up a class, imports a roster CSV and **assigns a module in under 10 minutes** | 3-step wizard incl. "Assign module(s)" + schedule; time it in rehearsal | 🟡 Class assignment table + atomic setup functions implemented (#9); Shrey must apply migration and wire wizard; rehearsal pending |
| Learning gain per student and per class **without a spreadsheet** | Auto-computed results pages | ⬜ |
| **External K12 teacher/district admin can log in and review** the curriculum | Reviewer role + browser | 🟡 Reviewer access rules done; no sign-in or browser screen |
| CIC's dashboard pulls **cohort completion and learning gain** via read API | `/api/v1/classes/{id}/summary`, `/api/v1/learning-gain` | 🟡 Endpoints built; need a live-data check with a real key |

## P1: at least one (we plan several)
- [~] 🟡 Code runner with auto-grading and instant feedback (Pyodide + test cases): **works and is live at /try** ("2 of 3 checks passed", hints, 5-second stop); not yet inside a lesson
- [~] 🟡 In-browser Python runner embedded in the activity, submissions saved to progress: runner done; embedding + saving not started
- [ ] Concept-level mastery view per class ("80% stuck on loops")
- [ ] (if time) Socratic AI hints, never the answer, not a generic chatbot

## Shared requirements
- [~] 🟡 Role-based auth, **no shared passwords**, least privilege: database rules done and tested; sign-in screens not built
- [~] 🟡 Read API with key auth, **documented** for CIC's dashboard owner: README "Read API" section written; pending a live-data check
- [x] ✅ Hosting within **$20/month** (+$250 one-time): Vercel free + Supabase free = $0, auto-deploy on every merge
- [x] ✅ Data minimization: students = **name, school, class only** (enforced by the database design; join codes stored only as scrambled hashes)
- [ ] Every outbound message/reminder drafted by system, **sent by a human** (applies if we add any notifications)
- [ ] **Lighthouse accessibility ≥ 95**, keyboard-navigable
- [~] 🟡 **Deployed and demoable by Sun 2:00 PM** with a **README that lets CIC run it**: live at https://cic-launchpad.vercel.app; README covers running, database, roles, first admin, deploy; no app screens to demo yet

## Judge "fail" tests: rehearse both before recording
1. ⏱️ A new instructor sets up a class, imports a roster and assigns a module in **< 10 minutes**.
2. 🧑‍🎓 A student follows a whole module **without instructor help**.
