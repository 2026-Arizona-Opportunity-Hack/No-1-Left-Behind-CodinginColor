# CIC Launchpad

**Interactive coding lessons for [Coding in Color](https://www.codingincolor.net), so no student is left behind.**

Coding in Color (CIC) teaches computer science to Arizona high schoolers whose schools don't offer it. Its lessons
live in slide decks and printed worksheets, so a partner-school teacher needs real training to run them, nobody knows
which module a student is on, and a student who misses a week falls behind. CIC Launchpad puts that curriculum on a
link: **students learn self-paced** with quizzes, worksheets and Python that runs in the browser; **teachers see who's
stuck** in real time; and **CIC measures learning gain** per class and topic for grant reports.

| | |
|---|---|
| **Live app** | https://cic-launchpad.vercel.app |
| **Try it as a student** | Open https://cic-launchpad.vercel.app/join?class=MARY-P3 and type the demo code **7KQ2MX** |
| **Built for** | [Coding in Color · Problem 1: Curriculum & Student Progress Platform](https://www.ohack.dev/project/d09466fadf1b11f18e63deadc507a848) |
| **Built at** | [Opportunity Hack · ASU Fall Hackathon 2026](https://www.ohack.dev/hack/fall-2026) by team [No 1 Left Behind](https://www.ohack.dev/hack/fall-2026/team/3f13cefee07a11f1884cdeadb145c312) · MIT license |

All names and codes in the demo data are made up.

## What each person can do

**Students** (ages 14–18, Chromebooks and phones). No email, no password, no account.
- Join with a **class code + personal code** from a printed card, or the class link (`/join?class=CODE`).
- Follow a **course map**: units unlock in order; "Continue where you left off" or "Start here".
- Work through lessons step by step: slides, video, quick checks, predict-the-output, fix-the-bug, fill-in-the-blank,
  put-the-lines-in-order, **coding exercises with Python that runs in the browser** ("2 of 3 checks passed"),
  **digital worksheets** they submit, and an exit question. Hints one at a time.
- Take a **pre-test** and **post-test** per unit and see their growth by topic.
- A no-login Python playground is at `/try`.

**Teachers** (often with no CS background).
- **Set up a class in under 10 minutes** (`/teach/new`): name it, upload a roster CSV (duplicate names show as
  "Alex R." / "Alex M."), pick units, set the schedule, **print join cards** and copy the class link.
- **Live classroom**: every student's lesson and step, % done, **time on task**, last active, and clear
  **Needs help · Behind · Not started** lists with the reason in plain words ("3 wrong tries on step 4").
  Attendance, topic bars ("38% stuck on loops"), refreshes every 20 seconds.
- **Student page**: their work step by step, latest code, worksheet answers; **start a late joiner** at the right
  unit, **unlock a unit early**, or skip a lesson (recorded as skipped, never as completed).
- **Results**: learning gain for their classes.

**CIC staff** (admins).
- **Edit the curriculum without engineering** (`/admin/curriculum`): units, lessons from CIC's template
  (intro → quick check → worksheet or coding exercise → exit question), every step type as a simple form,
  teaching guides, hints, pre/post tests, Draft → Publish.
- **Results** (`/results`): "+37 points on Loops" style headlines with how many students it's based on,
  gain by topic, class and student, missing-test warnings, **CSV download**.
- **API keys** for CIC's own dashboard (see [Read API](#read-api-for-cics-dashboard)).

**External reviewers** (district staff, K-12 teachers): a read-only view of the published curriculum and
teaching guides (`/review`), clearly marked "View only".

## Privacy and security

- **Students are minors, so we store only name, school and class.** Roster uploads drop every other column.
  No student email, password or account.
- **Personal join codes are stored only as hashes**; the plain code is shown once, on the printed card.
  A student session is a signed, httpOnly cookie that lasts one school day.
- **Least privilege, enforced by the database** (Supabase Row Level Security), not only by the pages:
  teachers can only see their own classes, reviewers only published curriculum, signed-out visitors nothing.
  Admin-only actions are checked in the page, the server action and the database.
- **Quiz and test answers never reach the browser**: they're checked on the server. Each test can be taken once.
- **Student Python runs in the student's browser** (a sandboxed worker, stopped after 5 seconds), never on our server.
- **The read API returns totals and averages only, never student names or ids**, and needs a key that is stored as a hash.
- **AI never sees student data** (see [AI drafting](#ai-drafting)), and a human must review every AI draft before
  students see it; the database refuses to publish unreviewed AI content.
- Secrets live in environment variables only (`.env.example` lists them); a commit hook blocks keys from git.

## Accessibility

Lighthouse accessibility: **100** on the home, join, sign-in, playground, course map and lesson pages.
Everything works with a keyboard (visible focus, the lesson moves focus to each new step, "put the lines in order"
uses buttons instead of drag-and-drop). Status is never shown by color alone: every state has an icon and a word.
Every input has a label, errors are announced to screen readers, and text meets WCAG AA contrast.

## Run it on your computer

You need Node.js 22+ and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/No-1-Left-Behind-CodinginColor.git
cd No-1-Left-Behind-CodinginColor
cp .env.example .env.local   # fill in the values below; never commit this file
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (public by design) |
| `SUPABASE_SECRET_KEY` | Same page, **Secret keys**. Server only; never share it |
| `SESSION_SECRET` | Any long random text: `openssl rand -hex 32` |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Optional, for AI drafting. Leave `AI_API_KEY` empty to turn AI off |

Checks: `npm test` (unit tests), `npm run lint`, `npm run build`.

## Database (Supabase)

The tables and access rules live in [`supabase/migrations/`](supabase/migrations/); demo data in
[`supabase/seed.sql`](supabase/seed.sql).

```bash
supabase login
supabase link --project-ref <your-project-ref>   # leave the password blank
supabase db push                                  # tables + access rules
supabase db query --remote -f supabase/seed.sql   # optional: demo course, 2 classes, 24 made-up students
```

| Role | Can see and do |
|---|---|
| CIC admin | Everything: curriculum, all classes, results, API keys |
| Instructor | Published curriculum; only their own classes, students, attendance and progress |
| External reviewer | Published curriculum and teaching guides, read-only |
| Student | Only their own lessons and progress, through the app's server |
| Anyone not signed in | Nothing |

**Adding staff.** In Supabase → Authentication → Users → *Add user* (tick *Auto Confirm*). Turn off public sign-ups
(Authentication → Sign In / Providers) so only people you add can sign in. New accounts start as read-only
reviewers. To change a role, run in the SQL editor:

```sql
update profiles set role = 'admin'      -- or 'instructor' / 'reviewer'
where id = (select id from auth.users where email = 'person@example.org');
```

The demo seed gives both demo classes to `teacher@launchpad.test` if that account exists.

## Read API (for CIC's dashboard)

A small, read-only JSON API so CIC's own dashboard can pull class completion and learning gain
**without a login**. Every request needs an API key. **The API never returns student names or ids**:
only counts and percentages.

**Create a key.** A CIC admin opens *Admin → API keys*, names the key (for example "CIC dashboard") and clicks
Create. The key (`cic_` + 32 letters and numbers) is shown **once**; copy it then. Only a hash is stored, so a
lost key can't be recovered, only revoked and replaced. Revoking takes effect immediately.

**Use it.** Send the key in the `x-api-key` header. Responses are JSON and are never cached.

```bash
export CIC_API_KEY=cic_...           # your key
export CIC_URL=https://cic-launchpad.vercel.app
```

| Endpoint | What it returns |
|---|---|
| `GET /api/v1/classes` | Every class: student count and completion % |
| `GET /api/v1/classes/{id}/summary` | One class: completion, active students, behind count, learning gain |
| `GET /api/v1/learning-gain?classId=&moduleId=&concept=` | Learning gain (all filters optional) |
| `GET /api/v1/concepts/mastery?classId=` | Per concept: % mastered and % struggling (`classId` required) |

Example responses below show the shape; the numbers are illustrative.

```bash
curl -H "x-api-key: $CIC_API_KEY" "$CIC_URL/api/v1/classes"
```
```json
[{ "id": "c0000000-0000-0000-0000-000000000003", "name": "Period 3", "school": "Maryvale High", "students": 12, "completion_pct": 41 }]
```

```bash
curl -H "x-api-key: $CIC_API_KEY" "$CIC_URL/api/v1/classes/c0000000-0000-0000-0000-000000000003/summary"
```
```json
{ "id": "c0000000-0000-0000-0000-000000000003", "name": "Period 3", "school": "Maryvale High", "students": 12,
  "completion_pct": 41, "active_last_7_days": 12, "behind_count": 2,
  "learning_gain": { "avg_pre_pct": 42.5, "avg_post_pct": 74.1, "avg_gain": 31.6, "n": 9, "missing_pre": 0, "missing_post": 3 } }
```

```bash
curl -H "x-api-key: $CIC_API_KEY" "$CIC_URL/api/v1/learning-gain?classId=c0000000-0000-0000-0000-000000000003"
```
```json
{ "avg_pre_pct": 42.5, "avg_post_pct": 74.1, "avg_gain": 31.6, "n": 9, "missing_pre": 0, "missing_post": 3,
  "by_concept": [{ "concept_tag": "loops", "avg_pre_pct": 38, "avg_post_pct": 80, "avg_gain": 42, "n": 9 }] }
```
Learning gain is post-test % minus pre-test %, in percentage points. Only students who took **both** tests
are averaged (`n`); `missing_pre` / `missing_post` count students with only one test. When nobody has both, the
averages are `null`. Add `&concept=loops` to get just that concept (no `by_concept`).

```bash
curl -H "x-api-key: $CIC_API_KEY" "$CIC_URL/api/v1/concepts/mastery?classId=c0000000-0000-0000-0000-000000000003"
```
```json
[{ "concept_tag": "loops", "percent_mastered": 38, "percent_struggling": 38, "n": 8 }]
```

**Errors** are `{ "error": "..." }` in plain words: `401` missing, wrong or revoked key; `400` a bad or missing
parameter; `404` no class with that id; `500` the service isn't available.

## Deploy

The app runs on Vercel's free plan. Every merge to `main` deploys to production through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), using the Vercel CLI
(Vercel's GitHub app can't connect to organization-owned repos on the free plan).

To set it up on a new Vercel account:
1. `npm i -g vercel`, then `vercel login` and `vercel link` in this folder.
2. Copy `orgId` and `projectId` from `.vercel/project.json` into repo variables
   `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (GitHub → Settings → Secrets and variables → Actions → Variables).
3. Create a token at vercel.com/account/tokens and save it as the repo secret `VERCEL_TOKEN`.
4. Add the environment variables from the table above in Vercel → Project → Settings → Environment Variables.

To deploy by hand instead: `vercel deploy --prod`.

## Cost

| Service | Plan | Cost |
|---|---|---|
| Vercel (hosting) | Hobby | $0 |
| Supabase (database + staff sign-in) | Free: 500 MB database, 50,000 monthly active users | $0 |
| Pyodide (Python in the browser) | Open source, served from a CDN | $0 |
| AI drafting (optional) | Any OpenAI-compatible provider; a lesson draft costs cents | ~$0–5/month |

Well under OHack's **$20/month** limit. Supabase's free plan pauses a project after a week with no activity;
upgrade to Pro ($25/month) or keep it active once CIC uses it daily.

## AI drafting

AI is optional and only drafts *curriculum* from slide text, video captions or exercise text: **never student
names, codes or answers**. Every AI-drafted step is marked "Suggested: please review", and nothing AI-drafted can be
published until a person reviews and saves it. Set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` for any
OpenAI-compatible provider. During the hackathon we used the OHack gateway (`https://ai.ohack.dev/v1`,
model `gpt-oss-120b`), whose keys stop working on **Sun Nov 15, 6 PM AZ**; after that, CIC sets its own key.
Without a key, AI features switch off and manual authoring works as normal.

## For developers

- `src/app`: pages. `(staff)/` = teacher, admin and reviewer screens; `learn/` and `join/` = student screens; `api/v1/` = read API
- `src/server`: server-only logic (`auth`, `student-session`, `lesson-player`, `dashboard`, `classes`, `curriculum`, `results`)
- `src/lib`: pure helpers with unit tests (course map unlocking, student status rules, learning gain, roster CSV, join codes, Python runner)
- `supabase/`: migrations (tables + access rules), seed, SQL tests
- `docs/`: CIC's brief, product spec, P0 checklist, build plan, [developer notes](docs/developer-notes.md), [sample roster](docs/sample-roster.csv)

## Team: No 1 Left Behind

- Shrey Bishnoi ([@shrey-Bish](https://github.com/shrey-Bish)): student experience, teacher and admin screens, deployment
- Maulik Kalpesh Jadav ([@maulik-jadav](https://github.com/maulik-jadav)): curriculum authoring and class setup logic
- Dhanush Koyi ([@dkoyi](https://github.com/dkoyi)): teacher dashboard rules, learning gain, read API
- Poulami: design, documentation, demo
- Greg

Built with mentors from Opportunity Hack. Questions: [#npo-coding-in-color](https://opportunity-hack.slack.com/app_redirect?channel=npo-coding-in-color) on the OHack Slack.
