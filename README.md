# No 1 Left Behind — Coding in Color

Built at [ASU Fall Hackathon 2026 | Phoenix Hackathon for Nonprofits: Nov 14-15](https://www.ohack.dev/hack/fall-2026) for the public good (MIT license).

> **⚠️ This is your team's ONE repository — all code goes here.** Please don't create
> another repo (personal or org). Judges, the Team Dashboard's code-activity card,
> the public project page and the nonprofit all read **this** repo; work pushed
> anywhere else is invisible to them and won't count. Everyone on the team should be
> a collaborator here — ask an organizer in Slack if someone can't push.

| | |
|---|---|
| **Nonprofit** | [Coding in Color](https://www.ohack.dev/nonprofit/YIXYdYCoxIZC08uQ5DL3) |
| **Problem statement** | [Curriculum & Student Progress Platform (CIC Problem 1)](https://www.ohack.dev/project/d09466fadf1b11f18e63deadc507a848) |
| **Team page** | [No 1 Left Behind](https://www.ohack.dev/hack/fall-2026/team/3f13cefee07a11f1884cdeadb145c312) · [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam) (story, demo video, submit) |
| **Slack** | team: [#no_1_left_behind](https://opportunity-hack.slack.com/app_redirect?channel=no_1_left_behind) · nonprofit: [#npo-coding-in-color](https://opportunity-hack.slack.com/app_redirect?channel=npo-coding-in-color) · help: [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) |
| **Created by** | Greg V [Staff/Mentor] |

## Final day

Start recording your demo video by **Sun Nov 15, 12:00 PM MST** — hacking ends at **Sun Nov 15, 2:00 PM MST**, and a demo you recorded with time to spare beats a feature you finished at 1:59.

- Sun Nov 15, 11:00 AM MST — Presentation Feedback Hour
- **Sun Nov 15, 12:00 PM MST — Start recording your demo video**
- Sun Nov 15, 12:30 PM MST — Judges Arrive
- **Sun Nov 15, 2:00 PM MST — 🛑 Submission Deadline: Hacking ends**
- Sun Nov 15, 2:05 PM MST — Judging Round 1
- Sun Nov 15, 3:40 PM MST — Judging Final Round
- Sun Nov 15, 4:30 PM MST — Closing Ceremony: Winners Announced

## Before hacking ends — the submission checklist

Everything is submitted from your [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam); judges read the dashboard, this README and your demo video.

- [ ] **Code pushed** to this repo, in small PRs (see `AGENTS.md`) — judges and future recruiters read the history
- [ ] **Project story** written on the dashboard (`#project`): the problem, who it helps, what you built, what's next
- [ ] **Demo video** (4 minutes or less) on YouTube, Vimeo, Loom or Google Drive, linked on the dashboard (`#demo`) — show it working, not slides
- [ ] **Submit** on the dashboard (you can keep editing until the close)
- [ ] This README filled in below: team, tech stack, how to run it, live link if you have one
- Optional: a [DevPost entry](https://opportunity-hack-2026-arizona.devpost.com/) — the dashboard is the submission of record.

Judges score **Scope, Documentation, Polish and Security**, plus a separate **Accessibility** prize — the rubric is at [ohack.dev/hackathon-judging-criteria](https://www.ohack.dev/hackathon-judging-criteria). Document your work as GitHub Issues as you go: that's how you get public credit for it.

## Team

<!-- Replace with real people; link GitHub profiles so this repo works as your portfolio -->
- [Name](https://github.com/username) — role
- [Name](https://github.com/username) — role

## What we built

**CIC Launchpad** turns Coding in Color's existing slide decks (or a YouTube link) into interactive coding lessons. Students learn in a friendly split screen with quick quizzes and Python that runs in the browser. Teachers see who's stuck and get a "Help me teach this" guide, students who miss a week get a catch-up path, and CIC sees learning gain per topic through a dashboard and a key-protected read API.

## Tech stack

- Frontend: Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js server routes on Vercel
- Database: Supabase (Postgres + Row Level Security, auth for staff and teachers)
- In-browser Python: Pyodide in a Web Worker (no server-side code execution)
- AI (lesson drafting only, never student data): any OpenAI-compatible endpoint

## Run it locally

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/No-1-Left-Behind-CodinginColor.git
cd No-1-Left-Behind-CodinginColor
cp .env.example .env.local   # fill in your own values; never commit it
npm install
npm run dev                  # http://localhost:3000
```

## Database (Supabase)

The schema lives in [`supabase/migrations/`](supabase/migrations/) and is applied with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>   # leave the password blank
supabase db push
```

**Roles.** Staff sign in with Supabase Auth; students never get accounts (they join with a class code +
personal code through the app's server). Row Level Security limits each role:

| Role | Can see and do |
|---|---|
| CIC admin | Everything: curriculum, all classes, results, API keys |
| Instructor | Published curriculum; only their own classes, students, attendance and progress |
| External reviewer | Published curriculum and teaching guides, read-only |
| Anyone not signed in | Nothing |

**First admin.** New staff accounts start as reviewers. Create your account (Supabase → Authentication →
Add user), then in the SQL editor run:
`update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.org');`

## Deploy

The app runs on Vercel's free plan. Every merge to `main` deploys to production through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), using the Vercel CLI
(Vercel's GitHub app can't connect to organization-owned repos on the free plan).

To set it up on a new Vercel account:
1. `npm i -g vercel`, then `vercel login` and `vercel link` in this folder.
2. Copy `orgId` and `projectId` from `.vercel/project.json` into repo variables
   `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (GitHub → Settings → Secrets and variables → Actions → Variables).
3. Create a token at vercel.com/account/tokens and save it as the repo secret `VERCEL_TOKEN`.
4. Add the app's environment variables (see `.env.example`) in Vercel → Project → Settings → Environment Variables.

To deploy by hand instead: `vercel deploy --prod`.

## Links

- Live demo: https://cic-launchpad.vercel.app
- Demo video:
- Design / docs:

## After the hackathon

Winning teams finish the project with the nonprofit — the [Definition of Done](https://www.ohack.dev/about/completion) (deployed, nonprofit sign-off, docs, open source) is tracked on your team page. Keep the repo public and the README honest; recruiters do read these.

Need a hand this weekend? [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) on Slack, or ask in [#no_1_left_behind](https://opportunity-hack.slack.com/app_redirect?channel=no_1_left_behind) and a mentor will drop in.

### Curriculum editor integration (#8)

`src/server/curriculum.ts` exposes the handoff's named functions for modules,
lessons, activities and pre/post assessments. All return `Result<T>` (`ok/data`
or `ok/error`). Import these from a Server Component or call them through a
`"use server"` action; they use the staff member's cookie session and RLS.
`getModuleTree` returns module fields plus `lessons`, each with `activities`.
`createLessonFromTemplate` returns the new lesson; reload its tree for the four
steps. Mutations return the saved row, reorder/delete return `null`, and
`saveAssessment` returns `{ id }`. Missing assessments return an error until saved.
Activity content types, Zod schemas and `emptyContent(type)` live in
`src/types/activity-content.ts`. Starters are structurally valid drafts for staff
editing. Saving an activity's validated `content` marks its AI draft reviewed;
a title-only change does not. Tests with existing student responses cannot be
replaced, to preserve learning results.

**Shrey must apply `20261115010000_curriculum_operations.sql` before wiring the
editor.** It adds atomic saves and enforces the publish rules in Postgres.
Do not push migrations from a developer session. The seed now publishes modules
after creating their lessons so it also satisfies that gate.

Run `npm test`, `npm run lint`, and `npm run build`. On a disposable migrated and
seeded Supabase/local Postgres database, run
`psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/curriculum.sql`.
The SQL tests use synthetic staff, run under `authenticated`, verify admin
publishing plus instructor/reviewer denial, and roll everything back. Never run
the seed against production to test a change: it resets the demo records.

### Class setup integration (#9)

`src/server/classes.ts` exposes `listMyClasses`, `createClass`, `addStudents`,
`resetJoinCode`, `assignModules`, `setSchedule`, and `getClassSetup`, all returning
`Result<T>`. `assignModules` and `setSchedule` return `null` on success.
`getClassSetup` returns `{ class, students, modules, sessions }`; modules contain
the module fields with their class-assigned `position` and `assigned_at`.
Student labels are derived in stable roster order and are display text only;
always use student IDs for identity. No read function returns personal-code hashes.

1. Parse the uploaded text using `parseRosterCsv` from `src/lib/roster-csv.ts`.
   Display its warnings and line-numbered errors. **Block import while any errors
   remain**, then preview its `rows` before calling `addStudents(classId, rows)`.
   Only name and optional school survive parsing or server validation.
2. Keep the successful `addStudents` / `resetJoinCode` response long enough to
   print personal join cards. Plain codes are returned only by that save, never
   stored. Reset a code if a card is lost; the old code stops working.
3. Call `assignModules` with published module IDs in the desired order, then
   `setSchedule` with `{ session_date: "YYYY-MM-DD", lesson_id }` entries.
   Assignment and schedule replacement are atomic. Scheduling uses Phoenix dates,
   preserves sessions before today, and permits only published lessons from
   assigned modules. Clear upcoming sessions before unassigning their module.
4. Build the shareable link with `classJoinUrl(origin, class_code)` from
   `src/lib/join-codes.ts`: `/join?class=MARY-P3`.

**Shrey must apply `20261115003549_class_setup.sql`.** It creates `class_modules`,
RLS and `configure_class`; seed additions assign all three modules to both demo
classes. Neither migration has been pushed to the live project. These functions
use the signed-in staff session, never a secret/service key. Classes allow at
most 200 students; failed roster batches save nothing.

For all database integration tests, use a **disposable**, migrated and seeded
database with Supabase's auth schema/default grants, then run:

```sh
TEST_DATABASE_URL=postgresql://... npm test
```

Without that variable, `npm test` runs unit/server-contract tests and skips the
four database tests. Database tests exercise RLS and all materialized seed content,
including the actual stored Jaylen join-code hash. `supabase/tests/classes.sql`
can also be run directly with `psql`, just like the curriculum SQL test above.
The database tests require a database-owner test connection to create synthetic
auth users and switch roles; their transactions always roll back. Never point
these tests at the live project.
