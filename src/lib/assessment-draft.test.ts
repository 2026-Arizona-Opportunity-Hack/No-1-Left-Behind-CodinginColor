import { expect, it } from "vitest";
import { assessmentPairSchema } from "./assessment-draft";
const questions = (prefix: string) =>
  [1, 2, 3].map((n) => ({
    concept_tag: "loops",
    prompt: `${prefix} ${n}`,
    options: ["a", "b", "c"],
    answer: 0,
  }));
it("accepts equivalent goals with distinct pre/post questions", () => {
  expect(
    assessmentPairSchema.safeParse({
      pre: questions("before"),
      post: questions("after"),
    }).success,
  ).toBe(true);
});
it("rejects different topics, repeated tests, bad answer indices and empty quizzes", () => {
  expect(
    assessmentPairSchema.safeParse({
      pre: questions("before"),
      post: questions("before"),
    }).success,
  ).toBe(false);
  expect(
    assessmentPairSchema.safeParse({
      pre: questions("before"),
      post: questions("after").map((q) => ({ ...q, concept_tag: "lists" })),
    }).success,
  ).toBe(false);
  expect(
    assessmentPairSchema.safeParse({
      pre: questions("before"),
      post: questions("after").map((q) => ({ ...q, answer: 3 })),
    }).success,
  ).toBe(false);
  expect(assessmentPairSchema.safeParse({ pre: [], post: [] }).success).toBe(
    false,
  );
});
