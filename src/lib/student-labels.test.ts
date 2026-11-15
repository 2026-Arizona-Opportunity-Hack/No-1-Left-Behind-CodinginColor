import { describe, expect, it } from "vitest";
import { studentLabels } from "./student-labels";

describe("studentLabels", () => {
  it("uses first name and last initial", () => {
    expect(studentLabels(["Alex Rivera", "Alex Morales"])).toEqual(["Alex R.", "Alex M."]);
  });
  it("numbers students who would otherwise look identical", () => {
    expect(studentLabels(["Sam Torres", "Maria Garcia", "Sam Thompson"])).toEqual(["Sam T. (1)", "Maria G.", "Sam T. (2)"]);
  });
  it("handles one-word names and extra spaces", () => {
    expect(studentLabels(["Madonna", "  Jo   Lee  "])).toEqual(["Madonna", "Jo L."]);
  });
  it("uses the last word as the surname", () => {
    expect(studentLabels(["Ana María de la Cruz"])).toEqual(["Ana C."]);
  });
  it("copes with an empty name and an empty list", () => {
    expect(studentLabels([""])).toEqual(["Student"]);
    expect(studentLabels([])).toEqual([]);
  });
});
