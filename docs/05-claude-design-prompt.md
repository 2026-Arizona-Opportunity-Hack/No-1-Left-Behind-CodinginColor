# Claude Design Prompt: CIC Launchpad UI/UX Prototype

Copy everything below the line into Claude Design.

---

Design a beautiful yet simple, clickable UI/UX prototype for **CIC Launchpad**, a coding-education platform for **Coding in Color (CIC)**, a Phoenix nonprofit that teaches computer science and AI to high school students (ages 14–18) whose schools don't offer it.

## What the product does
CIC Launchpad turns CIC's existing slide decks (or a YouTube video link) into interactive coding lessons. Students learn in a friendly, LeetCode-style screen with quick quizzes and Python that runs right in the browser. Teachers, many with no coding background, see who is stuck in real time and get a "Help me teach this" guide. Students who miss a class get a short catch-up path. CIC staff see how much students learned, per topic, for grant reports.

## Who uses it
- **Students** (14–18) on school Chromebooks (1366×768) and phones. Beginners. They must never feel lost.
- **Teachers**: ASU student instructors or partner-school teachers with **no CS background**. Must set up a class in under 10 minutes.
- **CIC staff (admin)**: create and publish lessons, view learning results.
- **Outside reviewer**: read-only view of the curriculum.

## Style
- Inspiration: the **clarity of CodeHS** (course map with colored progress bubbles, clean roster) + the **split screen of LeetCode** (problem left, code right), but **much friendlier and less intimidating** for beginners.
- **Clean, calm, modern, lots of white space**, rounded corners (8–12px), soft borders, no heavy shadows or gradients.
- **Plain, encouraging language. No jargon.** ("Check my code", not "Run test suite"; "Needs help", not "Anomaly".)
- One clear primary action per screen. Big, obvious buttons.
- Use a **placeholder brand color** (a warm, vibrant accent) that can be swapped later for CIC's official palette and logo. Leave a logo slot "Coding in Color".
- Status colors used consistently everywhere: **green** = done/on track, **yellow** = started/in progress, **grey** = not started, **red** = needs help, **orange** = behind/missed a class.
- **Accessible**: WCAG AA contrast, visible keyboard focus, labels on every input, never rely on color alone (always add an icon or text with the color), text at least 14px.
- Code font: a clean monospace. UI font: a friendly sans-serif.

## Screens to design (with realistic sample data: course "Python Basics", lesson "Loops", school "Maryvale High", class "Period 3")

### Student
1. **Join screen**: "Join your class": two fields: *Class code* and *Your personal code* (from a printed card or QR). A "Scan QR" option. No email, no password. Friendly welcome illustration area.
2. **Course map (home)**: "Python Basics" with units → lessons as colored bubbles (grey/yellow/green, locked lessons show a lock + "Finish *Variables* to unlock"). A progress bar per unit, "Continue where you left off" button, and a gentle "You missed *Loops* on Tuesday: catch up in 15 min" banner.
3. **Lesson player: split view (the most important screen)**: top: lesson title + step progress dots (e.g. step 4 of 9). **Left:** lesson content (slide image + short explanation + example). **Right:** code editor with starter code, **Run** and **Check my code** buttons, output console, and a results card "2 of 3 checks passed: your loop stops one number too early. Try changing the range." A "Need a hint?" button. Next step unlocks when passed.
4. **Quiz step variants**, shown as cards in the lesson flow:
   - Multiple choice
   - **Predict the output** ("What will this code print?")
   - **Fix the bug** (one highlighted line to fix)
   - **Fill in the blank**
   - **Put the lines in order** (drag-and-drop code lines)
   Each with instant feedback states (correct: friendly celebration; wrong: an encouraging hint).
4b. **Digital worksheet step**: a printed worksheet turned into an on-screen form (short-answer boxes, fill-in fields, a small table to complete), with **Save draft** and **Submit worksheet** buttons and a "Submitted ✓" state.
4c. **Exit question step**: the final question of the lesson, then a "Lesson complete" screen showing what unlocks next.
5. **Video lesson with pause-point quiz**: an embedded video that pauses at 2:10 with a quiz overlay: "Quick check before we continue". A timeline showing quiz markers. Key points summary under the video.
6. **Catch-up path**: "Let's catch you up on Loops (about 15 min)": 3 steps: **2-minute recap** → **2 core exercises** → **Quick check**. After the check: "You're caught up!" and a button to rejoin the class at today's lesson.
7. **Pre/post test**: clean one-question-at-a-time test with a progress bar; a results screen showing growth by topic ("Loops: 40% → 85%").

### Teacher
8. **Create class (setup wizard, 4 steps)**: (1) class name + school → class code; (2) upload roster CSV (drag and drop, preview table, duplicate names shown as "Alex R." / "Alex M."); (3) **assign modules** (pick from CIC's published modules, in order); (4) schedule: which lesson each session covers (calendar list). Finish → **printable join-code cards** with QR codes **and a "Copy class link" button** to share with students. A "Set up in under 10 minutes" reassurance.
9. **Live classroom (dashboard)**: header with class name, today's lesson, attendance (present/absent toggles). **Student cards or roster rows** like CodeHS: name, current lesson/step, % complete, **time on task**, "last active 2 min ago", status chip (On track / Needs help / Not started / Behind). Clear lists/filters: **Stuck (needs help)** · **Not started** · Behind. Click a student → their progress per activity (scores, time, submitted worksheets). Side panel "Class topics": mastery bars per topic ("Loops: 80% stuck").
10. **"Help me teach this" panel** (opens when clicking a red student): **left:** the student's actual code with the failing check highlighted, attempts count, hints used; **right:** the teaching guide in 4 short sections: *What this is about* (plain words), *Common mistakes*, *Worked example*, *Questions to ask* (never give the answer). Buttons: "Mark as helped", "Unlock next lesson".
11. **Behind / catch-up list**: who missed which session, catch-up progress per student, **"Assign catch-up"** (single or all absent), buddy suggestion ("Pair with Maria, who finished Loops"), green "Caught up" checks.

### CIC staff (admin)
11b. **Curriculum editor (manual authoring)**: modules list (drag to reorder) → lessons → activities. "New lesson from template" creates 4 parts: video or slides, check question, worksheet or code exercise, exit question. Each activity has a simple form editor, a topic tag, a Core/Extra toggle, and a teaching guide tab. Pre-test and post-test editors per module. Draft / Published badges, Preview as student, Publish.
12. **Import content**: three big options: **Paste a YouTube link**, **Upload slides (.pptx or PDF)**, **Start from scratch**. Show the YouTube flow: link field → "Building your lesson…" progress (reading captions, writing quiz questions, drafting teaching guide) → done in ~30 seconds.
13. **Review AI draft**: lesson outline on the left (steps with type icons), editable content on the right, AI-suggested items clearly labeled "Suggested: please review", toggle "Core / Extra" per exercise, teaching guide editor, **Preview as student**, then **Publish**. Draft vs Published badge.
14. **Learning results dashboard**: headline card "**+32 points on Loops**" (learning gain, with "based on 24 students"), learning gain by class and by topic (simple bar charts), completion %, "missing tests" warning, **Export CSV**, and an **API keys** section (create/revoke key, link to docs).

### Reviewer
15. **Curriculum browser (read-only)**: modules → lessons with a preview of steps and teaching guides, clearly labeled "View only".

## Also include
- Empty states (no classes yet, no students yet), loading states, error states with friendly wording.
- A phone version of screens 2, 3 (stacked: lesson on top, code below with tabs), and 6.
- Consistent top navigation per role, with the role clearly visible.
- Keep everything simple enough that a first-time teacher understands each screen in 5 seconds.
