# Build Plan (deadline Sun Nov 15, 2:00 PM MST · target 1:30 PM)

## Principle
Get a **live deployed skeleton early**, then build the demo story end to end, thin first, polish later. Anything not working by the **Sun 10 AM freeze** gets cut, not fixed.

## Priority order
| # | Build | Notes |
|---|---|---|
| 0 | Repo, Next.js + Supabase setup, deploy to Vercel, `.env.example`, README skeleton | A live link early |
| 1 | **Student learning screen**: join (class code + personal code, or the shareable class link), course map with sequential **module** unlock, lesson player with the module template (video/slides → check question → **worksheet** or code exercise → **exit question**), quiz types, Pyodide + Check, `activity_events` logging (incl. time on task) | P0 + mentors' main focus |
| 2 | **Manual curriculum authoring UI** (create/edit modules, lessons, activities from the template; Draft → Preview → Publish) + **4 roles** with RLS incl. **read-only reviewer** | P0 (authoring and roles must not wait for import) |
| 3 | **Instructor**: create class, roster CSV → join codes (printable) + **shareable class link**, **assign module(s)**, schedule sessions, attendance, instructor dashboard with roster, per-student progress, **stuck** and **not-started** lists, time on task, unlock override, start point | P0, setup under 10 min |
| 4 | **Pre/post tests per module + learning gain** per student/class/concept + **read API** (`x-api-key`) + CSV export | P0 |
| 5 | **Catch-up mode**: behind detection, catch-up path (recap, core only, test-out), teacher "Behind" list + Assign | Mentor ask |
| 6 | **"Help me teach this"** panel next to student work | Our stand-out |
| 7 | **Import**: YouTube link → AI draft (pause quizzes, key points, exercise, guide) → review → publish; then PDF/PPTX → steps + AI draft | Demo "wow"; extra on top of manual authoring |
| 8 | Only if time: AI Socratic hints, buddy suggestion, code replay, placement quiz | Extras |

**Rule:** before starting rows 5–8, every row of `docs/00-p0-checklist.md` must be at least 🟡 and the student → teacher → results path must work end to end.

Parallel tracks (suggested):
- **Data + backend:** schema, RLS, join-code auth, activity log, API, learning gain
- **Student UI:** course map, lesson player, quiz types, Pyodide runner
- **Teacher/admin UI:** class setup, live classroom, Help me teach this, catch-up, import
- **Design + docs + demo (Poulami):** Claude Design screens, CIC branding, README, project story, video, Lighthouse/accessibility checks, Slack with mentors

## Checkpoints
- **Sat 6 PM:** live link works; schema in; designs ready
- **Sat 11 PM:** a student can join and finish one lesson with a code exercise
- **Sun 7 AM:** teacher live classroom + catch-up work with seed data
- **Sun 10 AM: FEATURE FREEZE.** Bug fixes, README, accessibility, video
- **Sun 11 AM:** Feedback Hour with draft video
- **Sun 1:30 PM:** everything submitted

## Cut lines (if behind)
1. Cut PPTX import first (keep PDF + YouTube + manual authoring)
2. Cut YouTube auto-caption fetch → paste-transcript only (keep the demo flow)
3. Cut buddy suggestion and AI hints
4. **Never cut (P0):** manual authoring UI, 4 roles incl. reviewer, module → lesson → activity with sequential unlock, digital worksheets, pre/post + learning gain per student and class, progress + time on task + late-joiner start point, instructor dashboard (roster, stuck, not-started), roster CSV import, read API, README, accessibility, live deployment

## Demo script (what must work live)
1. Admin pastes a YouTube link → draft lesson with pause-point quizzes → Publish
2. Teacher creates class, uploads roster, prints join codes, schedules sessions
3. Student joins with codes → pre-test → course map → lesson with quiz + code exercise (Check: 2/3 → 3/3)
4. Teacher live classroom → red flag → click → student's code + "Help me teach this"
5. Absent student → "Missed: Loops" → Assign catch-up → recap → core exercise → test-out passed → "Caught up"
6. Post-test → admin dashboard "+32 points on loops" (n shown) → `curl` the API
7. Lighthouse accessibility score ≥ 95 on screen

## README must include
- What it is (plain language) + screenshots
- How to run locally, how to deploy (Vercel + Supabase), env vars
- Roles and how to create the first admin
- How to import content (PDF/PPTX/YouTube) and the manual fallback
- How the AI works, which data is sent (none about students), how to set CIC's own AI key (gateway keys expire Sun 6 PM)
- API docs with `curl` examples
- Privacy & security notes, accessibility results
- Cost estimate (free tiers, under $20/month)
