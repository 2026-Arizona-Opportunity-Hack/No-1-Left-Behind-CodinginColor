# P0 Checklist: must work in the Sunday demo (never skip)

Mentor reminder: **do not skip any P0.** Every row below comes straight from CIC's brief. Update the Status column as you build (⬜ not started · 🟡 in progress · ✅ done and demoable).

_Last audited: Sat Nov 14, 5:15 PM. Built so far: live deployment, Python runner (/try), database tables + role access rules, demo data._

## Problem 1 P0s
| # | P0 from CIC's brief | How we deliver it | Screen(s) | Status |
|---|---|---|---|---|
| 1 | **Curriculum authoring UI**: CIC staff publish modules without engineering | Manual editor: create module → lessons → activities, edit content, Draft → Preview → Publish. (Import from YouTube/slides is an *extra* on top, never a replacement.) | Admin: Curriculum editor, Review/Publish | 🟡 Authoring server functions, schemas, atomic template/reorder saves and publish checks implemented (#8); migration pending, editor screens owned by Shrey |
| 2 | **Four roles** with role-based access: student, instructor, CIC admin, **external reviewer (read-only)** | Supabase auth for admin/instructor/reviewer + join-code sessions for students; RLS policies; reviewer sees published curriculum only, cannot edit | Role-based nav; Reviewer curriculum browser | 🟡 Database access rules for admin / instructor / reviewer are live and tested (signed-out visitors see nothing); no sign-in screen, student join or role menus yet |
| 3 | **Content model: module → lesson → activity**; module template = video or slides, check-for-understanding question, worksheet or exercise, exit question; **modules unlock in sequence** | Tables `modules`, `lessons`, `activities`; a "new lesson from template" button pre-creates the 4 parts; lock until previous module completed (+ instructor override) | Course map (locked modules), Lesson player | 🟡 Tables built and filled with demo data (3 units, 8 lessons, full Loops lesson); template server function implemented (#8); course map, lesson player, unlock logic and template button pending |
| 4 | **Digital worksheets**: each printed worksheet becomes an on-platform activity the student completes and **submits** | Activity type `worksheet` (short-answer / fill-in fields), Submit button, saved to the student's record, viewable by the instructor | Lesson player: Worksheet step; Teacher: student work view | ⬜ "Worksheet" exists as a step type in the database only; no worksheet in the demo lesson, no screen, no Submit |
| 5 | **Pretest and post-test pairs per module**; **learning gain per student and per class** | `assessments` (pre/post per module) + responses; gain = post % − pre %; per student, per class (and per topic as our extra) | Student test screens; Admin & teacher results | 🟡 Tables + demo pre/post tests and answers loaded; no test screens and no learning-gain calculation yet |
| 6 | **Progress tracking**: per-activity completion, scores, **time on task**; a **late-joining student sees exactly where to start** | `activity_events` (complete, correct, duration_ms); course map shows a "Start here" marker based on the instructor's start point / class pace | Course map; Teacher dashboard columns | 🟡 Activity log + lesson progress tables and a late-joiner start point exist; nothing records time yet, no "Start here" marker |
| 7 | **Instructor dashboard**: roster, per-student progress, **stuck** and **not-started** lists | Live classroom roster + filters "Needs help (stuck)" and "Not started" | Teacher: Live classroom | ⬜ Demo data for stuck / not-started students is loaded; no dashboard screen |
| 8 | **Roster CSV import** | Upload CSV → preview → create students + personal join codes | Teacher: Create class wizard | 🟡 CSV parser, code helpers and class setup server functions implemented (#9); migration pending, wizard screens owned by Shrey |
| 9 | **Read API, key-authenticated**, for progress and assessment data | `x-api-key` JSON REST endpoints, documented in README with curl examples | Admin: API keys | ⬜ API-keys table only |

## Success criteria (also checked by judges)
| Criterion | How we meet it | Status |
|---|---|---|
| A teacher with no CS background runs a module by **sharing a link** | Each class has a **shareable class link** (URL with the class code pre-filled) + printable join cards | 🟡 Link helper + personal code generation implemented (#9); printable card screen pending |
| Student works through a module **self-paced** and the next module unlocks | Lesson player + sequential unlock | ⬜ |
| Student who joins a week late **catches up** without re-teaching | Instructor start point + catch-up path | ⬜ (start point stored in database only) |
| Instructor sets up a class, imports a roster CSV and **assigns a module in under 10 minutes** | 3-step wizard incl. "Assign module(s)" + schedule; time it in rehearsal | 🟡 Class assignment table + atomic setup functions implemented (#9); Shrey must apply migration and wire wizard; rehearsal pending |
| Learning gain per student and per class **without a spreadsheet** | Auto-computed results pages | ⬜ |
| **External K12 teacher/district admin can log in and review** the curriculum | Reviewer role + browser | 🟡 Reviewer access rules done; no sign-in or browser screen |
| CIC's dashboard pulls **cohort completion and learning gain** via read API | `/api/v1/classes/{id}/summary`, `/api/v1/learning-gain` | ⬜ |

## P1: at least one (we plan several)
- [~] 🟡 Code runner with auto-grading and instant feedback (Pyodide + test cases): **works and is live at /try** ("2 of 3 checks passed", hints, 5-second stop); not yet inside a lesson
- [~] 🟡 In-browser Python runner embedded in the activity, submissions saved to progress: runner done; embedding + saving not started
- [ ] Concept-level mastery view per class ("80% stuck on loops")
- [ ] (if time) Socratic AI hints, never the answer, not a generic chatbot

## Shared requirements
- [~] 🟡 Role-based auth, **no shared passwords**, least privilege: database rules done and tested; sign-in screens not built
- [ ] Read API with key auth, **documented** for CIC's dashboard owner
- [x] ✅ Hosting within **$20/month** (+$250 one-time): Vercel free + Supabase free = $0, auto-deploy on every merge
- [x] ✅ Data minimization: students = **name, school, class only** (enforced by the database design; join codes stored only as scrambled hashes)
- [ ] Every outbound message/reminder drafted by system, **sent by a human** (applies if we add any notifications)
- [ ] **Lighthouse accessibility ≥ 95**, keyboard-navigable
- [~] 🟡 **Deployed and demoable by Sun 2:00 PM** with a **README that lets CIC run it**: live at https://cic-launchpad.vercel.app; README covers running, database, roles, first admin, deploy; no app screens to demo yet

## Judge "fail" tests: rehearse both before recording
1. ⏱️ A new instructor sets up a class, imports a roster and assigns a module in **< 10 minutes**.
2. 🧑‍🎓 A student follows a whole module **without instructor help**.
