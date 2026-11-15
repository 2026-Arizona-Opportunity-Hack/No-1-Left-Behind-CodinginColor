import { describe, expect, it } from "vitest";
import { isUuid } from "./validate";

describe("isUuid", () => {
  it("accepts a UUID, including the demo ids", () => {
    expect(isUuid("c0000000-0000-0000-0000-000000000003")).toBe(true);
    expect(isUuid("3F2504E0-4F89-41D3-9A0C-0305E82C3301")).toBe(true);
  });
  it("rejects everything else", () => {
    for (const v of ["", "abc", "c0000000-0000-0000-0000-00000000000", "c0000000-0000-0000-0000-0000000000033", "' or 1=1 --", undefined, null, 5]) {
      expect(isUuid(v)).toBe(false);
    }
  });
});
