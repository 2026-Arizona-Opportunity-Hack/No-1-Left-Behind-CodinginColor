import { describe, expect, it } from "vitest";
import { aggregateGain, gainByConcept, studentGain, studentScores, type TestResponse } from "./learning-gain";

const r = (kind: "pre" | "post", correct: boolean, concept_tag?: string, student_id?: string): TestResponse => ({
  kind,
  correct,
  concept_tag,
  student_id,
});

describe("studentGain", () => {
  it("is post % minus pre %", () => {
    // pre: 1 of 4 right = 25%, post: 3 of 4 right = 75%
    const g = studentGain([
      r("pre", true), r("pre", false), r("pre", false), r("pre", false),
      r("post", true), r("post", true), r("post", true), r("post", false),
    ]);
    expect(g).toEqual({ pre_pct: 25, post_pct: 75, gain: 50 });
  });
  it("can be negative", () => {
    expect(studentGain([r("pre", true), r("post", false)])?.gain).toBe(-100);
  });
  it("is null when the post-test is missing", () => {
    expect(studentGain([r("pre", true)])).toBeNull();
  });
  it("is null when the pre-test is missing", () => {
    expect(studentGain([r("post", true)])).toBeNull();
  });
  it("is null with no responses", () => {
    expect(studentGain([])).toBeNull();
  });
  it("rounds to one decimal", () => {
    // pre 1/3 = 33.3, post 2/3 = 66.7, gain 33.3
    const g = studentGain([r("pre", true), r("pre", false), r("pre", false), r("post", true), r("post", true), r("post", false)]);
    expect(g).toEqual({ pre_pct: 33.3, post_pct: 66.7, gain: 33.3 });
  });
});

describe("studentScores", () => {
  it("keeps a lone pre-test score and marks the post as missing", () => {
    expect(studentScores([r("pre", true), r("pre", false)])).toEqual({ pre_pct: 50, post_pct: null });
  });
});

describe("aggregateGain", () => {
  it("averages only students who have both tests and reports the rest as missing", () => {
    const s = aggregateGain([
      { pre_pct: 40, post_pct: 80 }, // +40
      { pre_pct: 50, post_pct: 60 }, // +10
      { pre_pct: 30, post_pct: null }, // missing post
      { pre_pct: null, post_pct: 90 }, // missing pre
      { pre_pct: null, post_pct: null }, // took neither: not counted as missing either
    ]);
    expect(s).toEqual({ avg_pre_pct: 45, avg_post_pct: 70, avg_gain: 25, n: 2, missing_pre: 1, missing_post: 1 });
  });
  it("accepts studentGain() results directly", () => {
    const g = studentGain([r("pre", false), r("post", true)])!;
    expect(aggregateGain([g]).avg_gain).toBe(100);
  });
  it("returns nulls and n = 0 when nobody has both tests", () => {
    expect(aggregateGain([{ pre_pct: 50, post_pct: null }])).toEqual({
      avg_pre_pct: null,
      avg_post_pct: null,
      avg_gain: null,
      n: 0,
      missing_pre: 0,
      missing_post: 1,
    });
  });
  it("handles an empty class", () => {
    expect(aggregateGain([]).n).toBe(0);
  });
});

describe("gainByConcept", () => {
  const data = [
    // student a: loops 0/1 → 1/1 (+100); variables 1/1 → 1/1 (0)
    r("pre", false, "loops", "a"), r("post", true, "loops", "a"),
    r("pre", true, "variables", "a"), r("post", true, "variables", "a"),
    // student b: loops 0/1 → 0/1 (0); variables only on the pre-test
    r("pre", false, "loops", "b"), r("post", false, "loops", "b"),
    r("pre", true, "variables", "b"),
  ];
  it("computes gain per concept and sorts biggest gain first", () => {
    expect(gainByConcept(data)).toEqual([
      { concept_tag: "loops", avg_pre_pct: 0, avg_post_pct: 50, avg_gain: 50, n: 2 },
      { concept_tag: "variables", avg_pre_pct: 100, avg_post_pct: 100, avg_gain: 0, n: 1 }, // b has no post answer
    ]);
  });
  it("skips responses without a concept tag or student", () => {
    expect(gainByConcept([r("pre", true), r("post", true, "loops")])).toEqual([]);
  });
});
