import { describe, expect, it } from "vitest";
import { classMastery, studentConceptStates, type MasteryActivity } from "./mastery";
import type { StatusEvent } from "./student-status";

let t = 0;
const ev = (event_type: string, activity_id: string | null, over: Partial<StatusEvent> = {}): StatusEvent => ({
  event_type, activity_id, correct: null, concept_tag: "loops", duration_ms: null,
  created_at: new Date(Date.UTC(2026, 10, 11, 12, 0, t++)).toISOString(), ...over,
});

const activities: MasteryActivity[] = [
  { id: "a1", concept_tag: "loops", type: "slide", is_core: true },
  { id: "a2", concept_tag: "loops", type: "code_exercise", is_core: true },
  { id: "a3", concept_tag: "loops", type: "code_exercise", is_core: false }, // extra: not needed to master
  { id: "q1", concept_tag: "lists", type: "quiz_mcq", is_core: true },
  { id: "q2", concept_tag: "lists", type: "quiz_mcq", is_core: true },
  { id: "q3", concept_tag: "lists", type: "quiz_mcq", is_core: true },
];
const student = (events: StatusEvent[], done: string[] = []) => ({ events, doneActivityIds: new Set(done) });

describe("studentConceptStates", () => {
  it("mastered: every core activity done (extras don't matter)", () => {
    const s = studentConceptStates(student([ev("complete", "a1"), ev("complete", "a2")], ["a1", "a2"]), activities);
    expect(s.get("loops")).toBe("mastered");
  });
  it("learning: started but not all core activities done", () => {
    expect(studentConceptStates(student([ev("view", "a2")], ["a1"]), activities).get("loops")).toBe("learning");
  });
  it("struggling: 3 wrong tries on an unfinished activity", () => {
    const events = [1, 2, 3].map(() => ev("check", "a2", { correct: false }));
    expect(studentConceptStates(student(events), activities).get("loops")).toBe("struggling");
  });
  it("not struggling once that activity is completed", () => {
    const events = [1, 2, 3].map(() => ev("check", "a2", { correct: false })).concat(ev("complete", "a2"));
    expect(studentConceptStates(student(events, ["a2"]), activities).get("loops")).toBe("learning");
  });
  it("struggling: 3 hints on the concept", () => {
    const events = [ev("hint", "a1"), ev("hint", "a2"), ev("hint", "a2")];
    expect(studentConceptStates(student(events), activities).get("loops")).toBe("struggling");
  });
  it("struggling: first-try quiz score under 60%", () => {
    const events = [ev("check", "q1", { correct: false, concept_tag: "lists" }), ev("check", "q2", { correct: false, concept_tag: "lists" }), ev("check", "q3", { correct: true, concept_tag: "lists" })];
    expect(studentConceptStates(student(events), activities).get("lists")).toBe("struggling");
  });
  it("counts concepts from completed lessons even with no events", () => {
    expect(studentConceptStates(student([], ["a1", "a2"]), activities).get("loops")).toBe("mastered");
  });
  it("ignores concepts the student never touched", () => {
    expect(studentConceptStates(student([ev("view", "a1")]), activities).has("lists")).toBe(false);
  });
});

describe("classMastery", () => {
  it("reports percent mastered/struggling among students who touched each concept, worst first", () => {
    const stuck = student([1, 2, 3].map(() => ev("check", "a2", { correct: false })));
    const hints = student([ev("hint", "a1"), ev("hint", "a1"), ev("hint", "a2")]);
    const done = student([ev("complete", "a1"), ev("complete", "a2")], ["a1", "a2"]);
    const learning = student([ev("view", "a1")]);
    const untouched = student([]);
    expect(classMastery([stuck, hints, done, learning, untouched], activities)).toEqual([
      { concept_tag: "loops", percent_mastered: 25, percent_struggling: 50, students_counted: 4 },
    ]);
  });
  it("is empty when nobody has started", () => {
    expect(classMastery([student([])], activities)).toEqual([]);
  });
});
