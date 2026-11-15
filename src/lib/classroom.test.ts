import { describe, expect, it } from "vitest";
import { buildClassroom, buildMastery, doneActivityIds, type ClassData, type CurriculumLesson } from "./classroom";

// A small copy of the Period 3 demo story from supabase/seed.sql.
// "Now" is Wed Nov 11, 10 AM in Arizona. Loops was Saturday Nov 7; Lists is today.
const NOW = new Date("2026-11-11T17:00:00Z");
const IF = "L-if", LOOPS = "L-loops", LISTS = "L-lists";
const act = (n: number, over = {}) => ({ id: `a${n}`, position: n, type: "code_exercise", title: `Step ${n}`, concept_tag: "loops", is_core: true, ...over });
const lessons: CurriculumLesson[] = [
  { id: IF, title: "If statements", activities: [] },
  { id: LOOPS, title: "Loops", activities: [act(1, { type: "slide" }), act(2, { type: "slide" }), act(3), act(4), act(5, { is_core: false })] },
  { id: LISTS, title: "Lists", activities: [] },
];

let tick = 0;
const ev = (student_id: string, event_type: string, activity: number, over = {}) => ({
  student_id, event_type, activity_id: `a${activity}`, lesson_id: LOOPS, correct: null, concept_tag: "loops", duration_ms: null,
  created_at: new Date(Date.UTC(2026, 10, 11, 16, 0, tick++)).toISOString(), ...over,
});
const done = (sid: string, upTo: number) => Array.from({ length: upTo }, (_, i) => ev(sid, "complete", i + 1, { correct: true, duration_ms: 60000 }));
const stuckChecks = (sid: string) => [ev(sid, "view", 4, { duration_ms: 90000 }), ...[1, 2, 3].map(() => ev(sid, "check", 4, { correct: false, duration_ms: 40000 }))];

const people = ["Jaylen Washington", "Maria Garcia", "Alex Rivera", "Alex Morales", "Destiny Harris", "Marcus Thompson", "Sofia Lopez", "Diego Perez", "Aaliyah Johnson", "Kevin Nguyen", "Jasmine Brooks", "Ethan Clark"];
const id = (name: string) => name.split(" ")[0].toLowerCase() + (name === "Alex Morales" ? "-m" : name === "Alex Rivera" ? "-r" : "");
// Marcus and Jasmine have no events at all, so they never need a variable.
const J = id("Jaylen Washington"), MARIA = id("Maria Garcia"), AR = id("Alex Rivera"), AM = id("Alex Morales"), D = id("Destiny Harris"),
  SOFIA = id("Sofia Lopez"), DIEGO = id("Diego Perez"), AAL = id("Aaliyah Johnson"), KEVIN = id("Kevin Nguyen"), ETHAN = id("Ethan Clark");

const status = (student_id: string, lesson_id: string, s: string) => ({ student_id, lesson_id, status: s });
const data: ClassData = {
  cls: { id: "c3", name: "Period 3", school: "Maryvale High", class_code: "MARY-P3" },
  students: people.map((n) => ({ id: id(n), display_name: n })),
  sessions: [
    { id: "s-if", session_date: "2026-10-31", lesson_id: IF, lesson_title: "If statements" },
    { id: "s-loops", session_date: "2026-11-07", lesson_id: LOOPS, lesson_title: "Loops" },
    { id: "s-lists", session_date: "2026-11-11", lesson_id: LISTS, lesson_title: "Lists" },
  ],
  attendance: [
    { session_id: "s-loops", student_id: J, status: "absent" },
    { session_id: "s-loops", student_id: DIEGO, status: "absent" },
    { session_id: "s-if", student_id: KEVIN, status: "absent" },
    { session_id: "s-loops", student_id: AR, status: "present" },
    { session_id: "s-lists", student_id: MARIA, status: "present" },
  ],
  events: [
    ...done(J, 3), ...stuckChecks(J),
    ...done(MARIA, 5), ...done(AR, 2), ev(AR, "view", 3, { duration_ms: 60000 }),
    ...done(AM, 3), ...stuckChecks(AM),
    ...done(D, 2), ev(D, "view", 3, { duration_ms: 60000 }), ...[1, 2, 3, 4].map(() => ev(D, "hint", 3)),
    ...done(SOFIA, 5), ...done(AAL, 3), ev(AAL, "view", 4, { duration_ms: 60000 }), ...done(ETHAN, 5),
  ],
  lessonStatuses: [
    ...people.map((n) => status(id(n), IF, "completed")),
    status(KEVIN, IF, "in_progress"),
    status(J, LOOPS, "in_progress"), status(AR, LOOPS, "in_progress"), status(AM, LOOPS, "in_progress"),
    status(D, LOOPS, "in_progress"), status(AAL, LOOPS, "in_progress"),
    status(MARIA, LOOPS, "completed"), status(SOFIA, LOOPS, "completed"), status(ETHAN, LOOPS, "completed"),
  ],
  lessons,
};

describe("buildClassroom: Period 3 story", () => {
  const room = buildClassroom(data, NOW);
  const byLabel = (label: string) => room.students.find((s) => s.label === label)!;

  it("counts 3 need help, 2 behind, 2 not started", () => {
    expect(room.counts).toEqual({ needs_help: 3, behind: 2, not_started: 2, on_track: 5 });
  });
  it("flags Jaylen, Alex M. and Destiny as needs_help with plain reasons", () => {
    expect(byLabel("Jaylen W.").status).toBe("needs_help");
    expect(byLabel("Jaylen W.").reasons).toEqual(["3 wrong tries on step 4", "Missed Loops (Sat)"]);
    expect(byLabel("Alex M.").status).toBe("needs_help");
    expect(byLabel("Alex M.").reasons).toEqual(["3 wrong tries on step 4"]);
    expect(byLabel("Destiny H.").reasons).toEqual(["Asked for 4 hints on loops"]);
  });
  it("flags the two absent students as behind, and the two with no activity as not started", () => {
    expect(byLabel("Diego P.").status).toBe("behind");
    expect(byLabel("Kevin N.").status).toBe("behind");
    expect(byLabel("Kevin N.").reasons).toEqual(["Missed If statements (Sat)"]);
    expect(byLabel("Marcus T.").status).toBe("not_started");
    expect(byLabel("Jasmine B.").status).toBe("not_started");
  });
  it("labels the two Alexes apart and sorts by name", () => {
    expect(room.students.map((s) => s.label).filter((l) => l.startsWith("Alex"))).toEqual(["Alex M.", "Alex R."]);
    expect(room.students[0].display_name).toBe("Aaliyah Johnson");
  });
  it("reports current step, percent complete, time on task and last active", () => {
    const j = byLabel("Jaylen W.");
    expect(j.current).toEqual({ lesson_id: LOOPS, lesson_title: "Loops", step: 4, total_steps: 5 });
    expect(j.percent_complete).toBe(75); // 3 of 4 core activities
    expect(j.time_on_task_ms).toBe(3 * 60000 + 90000 + 3 * 40000);
    expect(j.last_active_at).toMatch(/^2026-11-11T16:/);
    expect(byLabel("Maria G.").percent_complete).toBe(100);
    expect(byLabel("Marcus T.")).toMatchObject({ current: null, percent_complete: 0, time_on_task_ms: 0, last_active_at: null });
  });
  it("finds today's session and counts attendance for it", () => {
    expect(room.today).toEqual({ session_id: "s-lists", date: "2026-11-11", lesson_id: LISTS, lesson_title: "Lists" });
    expect(room.attendance).toEqual({ present: 1, absent: 0 });
    expect(byLabel("Maria G.").present_today).toBe(true);
    expect(byLabel("Sofia L.").present_today).toBeNull();
  });
  it("has no 'today' when no session falls on today", () => {
    const r = buildClassroom({ ...data, sessions: data.sessions.slice(0, 2) }, NOW);
    expect(r.today).toBeNull();
    expect(r.attendance).toEqual({ present: 0, absent: 0 });
    expect(r.students.every((s) => s.present_today === null)).toBe(true);
  });
});

describe("exempt lessons", () => {
  it("are not counted as done, and drop out of the percent", () => {
    const statuses = { [LOOPS]: "exempt" };
    expect(doneActivityIds([], statuses, lessons).size).toBe(0);
    const d: ClassData = { ...data, lessonStatuses: [status(J, LOOPS, "exempt")], events: [] };
    const j = buildClassroom(d, NOW).students.find((s) => s.id === J)!;
    expect(j.percent_complete).toBe(0);
    expect(j.status).not.toBe("behind"); // exempt = nothing to catch up on
  });
});

describe("buildMastery", () => {
  it("shows how many students are struggling with / mastered loops", () => {
    // 8 touched loops: Jaylen, Alex M., Destiny struggling; Maria, Sofia, Ethan mastered; Alex R., Aaliyah learning
    expect(buildMastery(data)).toEqual([{ concept_tag: "loops", percent_mastered: 38, percent_struggling: 38, students_counted: 8 }]);
  });
});
