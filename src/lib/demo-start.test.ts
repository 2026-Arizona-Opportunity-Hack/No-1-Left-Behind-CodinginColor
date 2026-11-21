import { describe, expect, it } from "vitest";
import { SCENARIOS, demoSessionDates, demoSessionId, pickScenario, planGuestStart } from "./demo-start";

// Three units like the real course: 3 lessons, 3 lessons, 2 lessons. Lessons have 4 required steps and 1 bonus step,
// except Loops (u2-l2), which has 9 required steps and 1 bonus step.
const CORE = (lessonId: string) => (lessonId === "u2-l2" ? 9 : 4);
const lessons = (unit: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${unit}-l${i + 1}` }));
const units = [{ id: "u1", lessons: lessons("u1", 3) }, { id: "u2", lessons: lessons("u2", 3) }, { id: "u3", lessons: lessons("u3", 2) }];
const activities = units.flatMap((u) => u.lessons.flatMap((l) => Array.from({ length: CORE(l.id) + 1 }, (_, i) => i + 1).map((p) => ({ id: `${l.id}-a${p}`, lesson_id: l.id, position: p, is_core: p <= CORE(l.id), concept_tag: "loops" }))));
const tests = ["u1", "u2", "u3"].flatMap((m) => ["pre", "post"].map((kind) => ({ module_id: m, kind, question_ids: [1, 2, 3, 4, 5, 6].map((n) => `${m}-${kind}-q${n}`) })));
const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const plan = (id: string, variant = 0) => planGuestStart({ units, activities, tests }, scenario(id), variant);
const status = (p: ReturnType<typeof plan>, lesson: string) => p.statuses.find((s) => s.lesson_id === lesson)?.status;
const steps = (p: ReturnType<typeof plan>, lesson: string) => p.events.filter((e) => e.lesson_id === lesson).length;
const answered = (p: ReturnType<typeof plan>, unit: string, kind: string) => p.responses.filter((r) => r.question_id.startsWith(`${unit}-${kind}-`)).length;

describe("demo guest starting points", () => {
  it("has four different starting points, picked at random", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["A", "B", "C", "D"]);
    expect([0, 0.26, 0.51, 0.99].map((r) => pickScenario(r).id)).toEqual(["A", "B", "C", "D"]);
    expect(pickScenario(1).id).toBe("D"); // never runs off the end
  });

  it("A: unit 1 finale. Final quiz still to take, Loops started with the code exercise next", () => {
    const p = plan("A");
    expect(answered(p, "u1", "pre")).toBe(6);
    expect(answered(p, "u1", "post")).toBe(0);
    expect(["u1-l1", "u1-l2", "u1-l3", "u2-l1"].map((l) => status(p, l))).toEqual(["completed", "completed", "completed", "completed"]);
    expect(status(p, "u2-l2")).toBe("in_progress");
    expect(p.events.filter((e) => e.lesson_id === "u2-l2").map((e) => e.activity_id)).toEqual(["u2-l2-a1", "u2-l2-a2", "u2-l2-a3"]);
    expect(status(p, "u2-l3")).toBeUndefined();
  });

  it("B: fresh unit 2. Unit 1 fully done (both quizzes), unit 2 warm-up still to take, no unit 2 lesson started", () => {
    const p = plan("B");
    expect(answered(p, "u1", "pre")).toBe(6);
    expect(answered(p, "u1", "post")).toBe(6);
    expect(answered(p, "u2", "pre")).toBe(0);
    expect(p.statuses.filter((s) => s.lesson_id.startsWith("u2"))).toEqual([]);
  });

  it("C: finish line. Loops and Lists both part-way, warm-up done, final quiz still to take", () => {
    const p = plan("C");
    expect(status(p, "u2-l1")).toBe("completed");
    expect(status(p, "u2-l2")).toBe("in_progress");
    expect(steps(p, "u2-l2")).toBe(5);
    expect(status(p, "u2-l3")).toBe("in_progress");
    expect(steps(p, "u2-l3")).toBe(2);
    expect(answered(p, "u2", "pre")).toBe(6);
    expect(answered(p, "u2", "post")).toBe(0);
  });

  it("D: worksheet focus. Two unit 2 lessons done, Lists to do", () => {
    const p = plan("D");
    expect(["u2-l1", "u2-l2"].map((l) => status(p, l))).toEqual(["completed", "completed"]);
    expect(status(p, "u2-l3")).toBeUndefined();
    expect(steps(p, "u2-l2")).toBe(9); // required steps only: the bonus step stays open
  });

  it("never touches unit 3 and never answers a final quiz that is meant to be taken", () => {
    for (const s of SCENARIOS) {
      const p = plan(s.id);
      expect(p.statuses.some((x) => x.lesson_id.startsWith("u3"))).toBe(false);
      expect(answered(p, "u3", "pre") + answered(p, "u3", "post")).toBe(0);
      expect(answered(p, "u2", "post")).toBe(0);
    }
  });

  it("gives every starting point a final quiz or a warm-up quiz to take, an unfinished lesson to catch up, and growth to show", () => {
    for (const s of SCENARIOS) {
      const p = plan(s.id);
      const quizToTake = s.units.some((u) => !u.warmUp || !u.finalQuiz);
      const unfinishedLesson = s.units.some((u) => u.lessons.some((l) => l !== "done"));
      const hasWarmUp = p.responses.some((r) => r.question_id.includes("-pre-") && !r.correct);
      expect(quizToTake && unfinishedLesson && hasWarmUp).toBe(true);
    }
  });

  it("makes the warm-up weak in both variants, and a finished final quiz better than it", () => {
    const rate = (p: ReturnType<typeof plan>, unit: string, kind: string) => {
      const rows = p.responses.filter((r) => r.question_id.startsWith(`${unit}-${kind}-`));
      return rows.filter((r) => r.correct).length / rows.length;
    };
    for (const variant of [0, 1]) expect(rate(plan("A", variant), "u1", "pre")).toBeLessThanOrEqual(0.5);
    expect(rate(plan("B"), "u1", "post")).toBeGreaterThan(rate(plan("B"), "u1", "pre"));
  });

  it("copes with a course that only has one unit, or none", () => {
    expect(planGuestStart({ units: [units[0]], activities, tests }, scenario("C")).statuses).toHaveLength(3);
    expect(planGuestStart({ units: [], activities: [], tests: [] }, scenario("A"))).toEqual({ events: [], statuses: [], responses: [] });
  });
});

describe("demo class days", () => {
  it("are all in the past, two days apart, oldest first", () => {
    expect(demoSessionDates("2026-11-20", 3)).toEqual(["2026-11-14", "2026-11-16", "2026-11-18"]);
    expect(demoSessionDates("2026-11-20", 5)[0]).toBe("2026-11-10");
  });
  it("never reach today", () => {
    for (const n of [1, 2, 5]) expect(demoSessionDates("2026-11-20", n).every((d) => d < "2026-11-20")).toBe(true);
  });
});

describe("demo class day ids", () => {
  it("are always the same for the same class and lesson, and different otherwise", async () => {
    const a = await demoSessionId("class-1", "lesson-1");
    expect(await demoSessionId("class-1", "lesson-1")).toBe(a);
    expect(await demoSessionId("class-1", "lesson-2")).not.toBe(a);
    expect(await demoSessionId("class-2", "lesson-1")).not.toBe(a);
  });
  it("are valid uuids", async () => {
    expect(await demoSessionId("c", "l")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
