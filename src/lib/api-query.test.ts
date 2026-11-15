import { describe, expect, it } from "vitest";
import { MAX_CONCEPT_LENGTH, parseGainQuery, parseMasteryQuery } from "./api-query";

const P3 = "c0000000-0000-0000-0000-000000000003";
const q = (s: string) => new URLSearchParams(s);

describe("parseGainQuery", () => {
  it("accepts no filters at all", () => {
    expect(parseGainQuery(q(""))).toEqual({ ok: true, value: { classId: undefined, moduleId: undefined, concept: undefined } });
  });
  it("accepts valid filters and trims the concept", () => {
    expect(parseGainQuery(q(`classId=${P3}&moduleId=${P3}&concept=%20loops%20`))).toEqual({
      ok: true, value: { classId: P3, moduleId: P3, concept: "loops" },
    });
  });
  it("rejects a bad classId or moduleId in plain words", () => {
    expect(parseGainQuery(q("classId=abc"))).toMatchObject({ ok: false, error: expect.stringContaining("classId must be an id") });
    expect(parseGainQuery(q("moduleId=1%27%20or%201=1"))).toMatchObject({ ok: false, error: expect.stringContaining("moduleId must be an id") });
  });
  it("rejects a very long concept", () => {
    expect(parseGainQuery(q(`concept=${"x".repeat(MAX_CONCEPT_LENGTH + 1)}`)).ok).toBe(false);
  });
  it("treats an empty value as not given", () => {
    expect(parseGainQuery(q("classId=&concept=")).ok).toBe(true);
  });
});

describe("parseMasteryQuery", () => {
  it("requires a valid classId", () => {
    expect(parseMasteryQuery(q(`classId=${P3}`))).toEqual({ ok: true, value: { classId: P3 } });
    expect(parseMasteryQuery(q(""))).toMatchObject({ ok: false, error: expect.stringContaining("classId is required") });
    expect(parseMasteryQuery(q("classId=nope")).ok).toBe(false);
  });
});
