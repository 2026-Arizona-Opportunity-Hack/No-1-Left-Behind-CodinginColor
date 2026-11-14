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
