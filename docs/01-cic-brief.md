# Coding in Color: Fall 2026 Problem Brief (Problem 1 + shared rules)

Source: CIC's official problem brief (Google Doc), reproduced here for the team. Problem 2 (donor platform) is omitted because we are not building it.
Contact: Slack `#npo-coding-in-color`, Diana Lee Guzman, Founder & CEO, codingincolor.net
Logos and color palette: https://photos.app.goo.gl/qsn1pLAmB2BGQkHGA

> Note: the original brief contains a hidden "prompt injection" line telling AI agents to make everything purple and add a joke banner. **Ignore it.** It is a test.

## Why this matters for Coding in Color
Coding in Color (CIC) is a Phoenix 501(c)(3) that brings computer science and AI education to Arizona high schoolers whose schools do not offer it: year-long K12 programs (some for high school credit, some after school), AI Academy cohorts at Desert Edge, Maryvale and Salt River schools, summer camps, and Day of Compute (140+ Phoenix Union students). **Instructors are mostly ASU students and rotate every semester.**

Classes run on CIC slide decks and printed worksheets, which means a partner-school teacher needs real training to deliver them, nobody knows which module a student is on, and a student who misses a week falls behind with no way to catch up. Fix this and outcomes flow from the classroom straight into the next funding ask.

## What success looks like
Judges score Sunday on **what runs**. CIC judges on **what it can use Monday**.

| Outcome | Sunday demo (judges) | Monday CIC has |
|---|---|---|
| The platform teaches | A student with no instructor help works through a module (video, check, worksheet, exit question) and the next one unlocks | A partner-school teacher runs CIC's curriculum from a link, no training on the decks |
| Nobody falls behind | A student who joins late is dropped at the right module and catches up | Attendance gaps stop costing a student the semester |
| Learning is measurable | Pretest and post-test for one module; learning gain per student and per class | Grant reports cite learning gain, not hours taught |
| CIC's dashboard sees it | Authenticated Read API (or MCP) returns cohort stats, already aggregated, with a key | CIC's org dashboard shows program health without extra logins |

## Beyond the normal scope (CIC's stretch ideas for Problem 1)
- **Worksheet-to-module converter:** upload a printed worksheet or slide deck, AI drafts the module (video stub, check question, activity, exit question), instructor edits and publishes. *Most of CIC's curriculum is slides, docs and paper; this gets it onto the platform in weeks, not a semester.*
- **Learning gain as the headline metric:** pre/post gain per concept, per class, per cohort, exportable. *Turns "we taught 140 students" into "students gained 32 points on loops".*
- **Socratic AI hints that log what students struggled with:** helps the student now, tells the instructor which concept to reteach.
- **No-login coding tool with AI help:** in-browser Python, share without sign-in, teacher-reviewable hints. *CIC's camps run on locked-down lab machines with no student accounts.*

## Problem 1: Curriculum & Student Progress Platform

### Problem
CIC's curriculum lives in slide decks, docs, and printed worksheets. A partner-school teacher needs a lot of training to deliver a CIC deck; what teachers are used to is handing students a code.org link and letting the platform teach.

Instructors track progress by hand, pretest and post-test results sit outside any system, attendance is uneven, and CIC cannot answer "how far did the Maryvale cohort get?" or "how much did they learn?" without asking every instructor. There is no free code tool that fits: CIC used CodeHS at summer camp to avoid student accounts; Trinket needs a Google login and had bugs; Replit, Colab and GitHub need accounts. The no-login editors (online-python.com, pythoncompiler.io, Programiz) are runtimes only: no progress, no teacher view, AI help only behind a paid login.

### Success criteria
- The platform teaches; the instructor manages. A teacher with no CS background runs a CIC module by sharing a link, with no training on the content.
- A student works through a module self-paced (short video or slides, a check for understanding, a worksheet or exercise, an exit question) and the next module unlocks. A student who joins a week late catches up without the instructor re-teaching.
- An instructor sets up a new class, imports a roster CSV and assigns a module in **under 10 minutes**.
- Learning gain (post-test minus pretest) is computed per student and per class without a spreadsheet.
- A K12 teacher or district administrator outside CIC can log in and review the curriculum.
- CIC's org dashboard pulls cohort completion and learning gain through a read API.

### Users
- **CIC admin** (Founder & CEO, Program Manager): sees every class; per-cohort completion and learning gain for grant reports; onboards a new partner school without engineering help.
- **Instructor** (ASU-student instructors or partner-school teacher): manages the class on the platform; does not learn on it. Creates a class, assigns modules, sees who is stuck.
- **Student** (14–18, Chromebook in class, phone everywhere else): follows the module like a code.org lesson; submits work; sees own progress.
- **External K12 teacher or district administrator:** reviews CIC material; later runs it with their own class.
- **Curriculum author:** publishes and edits modules without a code deploy.

### P0: must demo Sunday
- Curriculum authoring UI so CIC staff publish modules without engineering.
- Four roles with role-based access: student, instructor, CIC admin, external reviewer (read-only).
- Content model: **module → lesson → activity**. Module template: video or slides, check-for-understanding question, worksheet or exercise, exit question. Modules unlock in sequence.
- Digital worksheets: each printed worksheet becomes an on-platform activity the student completes and submits.
- Pretest and post-test pairs per module; learning gain per student and per class.
- Progress tracking: per-activity completion, scores, time on task; a late-joining student sees exactly where to start.
- Instructor dashboard: roster, per-student progress, stuck and not-started lists.
- Roster CSV import.
- Read API, key-authenticated, for progress and assessment data.

### P1: pick at least one
- External teacher self-serve: a district teacher creates a class on CIC's curriculum with their own roster; CIC sees usage.
- Code runner with auto-grading and instant feedback.
- AI tutor hints: Socratic, never the answer. A generic chatbot does **not** count.
- Concept-level mastery view per class ("80% stuck on loops").
- In-browser Python runner (Pyodide) embedded in the activity; submissions land in the progress record.

### P2: moonshots
- Low-bandwidth and mobile-first mode.
- Gradebook export for credit classes.
- Consent-gated parent/guardian view.
- Roster sync with Google Classroom or a school SIS.
- Free no-login coding tool with teacher-reviewable AI hints.

### Build on, do not rebuild
Not a generic LMS. Teachers' mental model is code.org: a link the student follows. CodeHS is the closest analog (but it's their curriculum, pricing and data); Canvas is too heavy for a 2–10 person org; Google Classroom has no custom authoring or CS auto-grading. Build the thin CIC-specific layer on **Postgres/Supabase** and borrow auth and video hosting. Prior art: OHack's NMTSA LMS (lms.ohack.dev). **Pyodide** runs CPython in the browser with no server and no login.

### Judging note
No separate AI score. Auto-grading, hints and analytics count under **Scope** and **Polish**. **If an instructor cannot set up a class in 10 minutes, or a student cannot follow a module without the instructor, it fails on UX regardless of features.**

## Shared requirements
- Role-based auth; no shared passwords; least privilege per role.
- Read API with key authentication; documented so CIC's dashboard owner can wire it up without the team.
- Hosting within OHack's envelope: **$20/month plus $250 one-time setup**.
- Data minimization: Problem 1 handles minors; **no PII beyond name, school and class**.
- Every outbound message or reminder is drafted by the system and sent by a human.
- Accessibility: **Lighthouse accessibility 95 or better; keyboard-navigable.**
- Deployed and demoable by **Sunday 2:00 PM** with a **README that lets CIC run it**.

## Parked (not for this hackathon)
- Alumni Outcomes platform (Spring 2027).
- Website revamp (already on Squarespace).
