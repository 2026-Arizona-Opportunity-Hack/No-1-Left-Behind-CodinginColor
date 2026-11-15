# Hackathon Info, Judging & Submission

## Event
- **Opportunity Hack ASU Fall Hackathon 2026**, Nov 14–15, Engineering Center G Wing, ASU Tempe
- Nonprofit: **Coding in Color** · Track: **Problem 1, Curriculum & Student Progress Platform**
- Event page: https://www.ohack.dev/hack/fall-2026
- Nonprofit Slack: `#npo-coding-in-color` · Technical questions: `#ask-a-mentor` · General: `#help`

## Our team
- **Team name:** No 1 Left Behind
- **Team Slack channel:** `#no_1_left_behind`
- **GitHub repo:** `No-1-Left-Behind-CodinginColor` (OHack's GitHub org)
- **Members on the team page:** sbishnoi2000.sb, koyidhanush (Dhanush), mjadav (Maulik), Greg, plus Poulami

## Deadline and schedule
- **Submissions close Sun Nov 15, 2:00 PM MST** (team target 1:30 PM)
- Sun 11:00 AM: Presentation Feedback Hour (bring a draft video)
- Sun 2:05 PM: Judging Round 1 (video + Q&A) · 3:40 PM: Finals · 4:30 PM: Closing

## Judging criteria (from our team page)
| Criterion | What it means |
|---|---|
| **Scope** | Impact on the community + complexity of the problem solved |
| **Documentation** | Clear code & UX docs; easy for the nonprofit to understand |
| **Polish** | Minimal work remaining; the solution can be used today |
| **Security** | Data is protected; role-based access where applicable |
| **Accessibility** | W3C principles (perceivable, operable, understandable, robust); Lighthouse a11y > 95 |

Prizes: Problem 1, 1st place ($500 + $1,600 to complete), 2nd place ($250 + completion if 1st can't), Best Documentation / Polish / Security / Scope ($100 each).
Past pattern (Fall 2025, same format): winners delivered **all must-haves**, strong docs, accessible design, role-based security.

## What our team owes (submission checklist)
1. [ ] Everyone joined the team Slack channel
2. [ ] **Push code** to the repo (judges and recruiters look at commit activity)
3. [ ] **Project story**: tagline (≤ 140 chars) + story. **Judges read this before watching anything.** Plain language beats buzzwords.
4. [ ] **Demo video**: **4 minutes or less**, YouTube **Unlisted** (not Private)
5. [ ] **Submit project** on ohack.dev
- Optional: DevPost link
- Also: pin repo + demo link in the team Slack channel

Mentor sign-offs tracked on the team page (aim for each): mentor introductions, project scope reviewed, architecture & tech stack discussed, GitHub repo reviewed, judging criteria walkthrough, demo video reviewed.

## Demo video guide (OHack's recommendation)
- **< 10 s** team intro
- **~30 s** the problem
- **~1 min** how we solved it overall
- **The rest**: how what we built meets each judging criterion (Scope, Documentation, Polish, Security, Accessibility)

Suggested script:
1. (0:00) "We're No 1 Left Behind. We built CIC Launchpad for Coding in Color."
2. (0:10) Problem: slides + paper, teachers need training, missed weeks = lost semester, no proof of learning.
3. (0:40) Overview: paste a YouTube link → interactive lesson in 30 s → student learns and codes → teacher sees who's stuck + "Help me teach this" → catch-up for missed weeks → learning gain for funders.
4. (1:40) Criteria walkthrough with live screens: Scope (import, catch-up, learning gain), Polish (clean UI, works today, live link), Security (roles, personal codes, name/school/class only, no student data to AI), Accessibility (Lighthouse score on screen, keyboard demo), Documentation (README + API docs on screen).
5. (3:50) One-line close.

Draft tagline (≤ 140): *"CIC Launchpad turns Coding in Color's slides and videos into interactive coding lessons, so no student is left behind."*

## OHack AI gateway (for building and for in-app AI)
- Endpoint: `https://ai.ohack.dev/v1` (OpenAI-compatible); Claude Code can also point at `https://ai.ohack.dev` via `ANTHROPIC_BASE_URL`.
- **Key 1 ($15):** models `muse-spark` (cheap default; **Meta may use prompts/code for training**), `kimi-k2.7-code`, `gpt-oss-120b` (choose this to avoid training use).
- **Key 2 ($20, frontier):** `muse-wonder`, `kimi-k3`. Expensive; save for hard tasks.
- **Keys stop working Sun Nov 15, 6:00 PM Arizona time.** After that, CIC needs its own key: README must explain this, and the app must degrade gracefully without AI.
- **Never commit keys, never show them on screen or in the video.** Leaked key → tell an organizer.

## Slack clarifications summary
- Login: class code + personal join code; handle duplicate names; no shared passwords.
- Pre/post: same learning goals, equivalent questions OK; authored by curriculum owners.
- Late joiners: instructor picks start; diagnostic quiz may suggest.
- Unlock: sequential default; instructor override per student.
- AI hints: contextual, never the answer; teacher sees hint topics; no student data to AI.
- API: documented JSON REST.
- Analytics (Urjit, offered a huddle): learning gain by student/class/topic; rule-based "needs help"; one consistent event data structure.

## Mentor feedback (in person, Sat ~3 PM)
1. Import existing slide decks (.pptx) as input.
2. Focus on learning design + student tracking.
3. Reverse-engineer CodeHS; extremely clean, impressive UI/UX.
4. LeetCode/GFG-style learning, easier and more interactive, with quizzes.
5. Solve missed sessions: how does the teacher help a student who missed a week?
6. Teachers pasting a **YouTube link** as input would be very impressive to watch.
