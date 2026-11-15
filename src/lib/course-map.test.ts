import { describe, expect, it } from "vitest";
import {
  buildCourseMap,
  type MapInput,
  type AssessmentProgress,
} from "./course-map";
const base: MapInput = {
  modules: [1, 2, 3].map((n) => ({
    id: `m${n}`,
    title: `Unit ${n}`,
    position: n,
    lessons: [{ id: `l${n}`, title: `Lesson ${n}`, position: 1 }],
  })),
  statusByLesson: new Map(),
  startModuleId: null,
  unlockedModuleIds: new Set(),
};
describe("complete student course", () => {
  it("shows all units and lessons while requiring the pre-test before material", () => {
    const map = buildCourseMap({
      ...base,
      assessments: new Map([["m1", { pre: "todo", post: "todo" }]]),
    });
    expect(map.modules).toHaveLength(3);
    expect(map.modules[0]).toMatchObject({
      unlocked: true,
      materialUnlocked: false,
      preTest: "todo",
      postTest: "locked",
    });
    expect(map.modules[1]).toMatchObject({
      unlocked: false,
      materialUnlocked: false,
    });
    expect(map.modules[1].lessons[0].title).toBe("Lesson 2");
    expect(map.next).toBeNull();
  });
  it("requires a final quiz before unlocking the next unit", () => {
    const input = {
      ...base,
      statusByLesson: new Map([["l1", "completed" as const]]),
      assessments: new Map<string, AssessmentProgress>([
        ["m1", { pre: "done", post: "todo" }],
      ]),
    };
    expect(buildCourseMap(input).modules[1].unlocked).toBe(false);
    input.assessments.set("m1", { pre: "done", post: "done" });
    expect(buildCourseMap(input).modules[1].unlocked).toBe(true);
  });
  it("does not open a later unit just because its locked predecessor has old completions", () => {
    const map = buildCourseMap({
      ...base,
      statusByLesson: new Map([["l2", "completed"]]),
    });
    expect(map.modules[2].unlocked).toBe(false);
  });
  it("supports teacher start points and explicit overrides without losing earlier units", () => {
    const map = buildCourseMap({
      ...base,
      startModuleId: "m2",
      unlockedModuleIds: new Set(["m3"]),
    });
    expect(map.modules.every((m) => m.unlocked)).toBe(true);
    expect(map.modules[1].isStart).toBe(true);
    expect(map.next?.lessonId).toBe("l2");
  });
  it("does not treat an empty unit as completed", () => {
    expect(
      buildCourseMap({
        ...base,
        modules: [{ ...base.modules[0], lessons: [] }, base.modules[1]],
      }).modules[1].unlocked,
    ).toBe(false);
  });
});
