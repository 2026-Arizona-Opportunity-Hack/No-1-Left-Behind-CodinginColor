import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOIN_CODE_ALPHABET, classJoinUrl, generateClassCode, generateJoinCode, hashJoinCode, normalizeClassCode, normalizeJoinCode } from "./join-codes";

describe("class and personal join codes", () => {
  it("matches the exact Jaylen seed hash expression", async () => {
    const seed = readFileSync("supabase/seed.sql", "utf8");
    expect(seed).toContain("(p3, 'Jaylen Washington', '7KQ2MX'");
    expect(seed).toContain("encode(sha256(convert_to(rec.class_id::text || ':' || rec.code, 'UTF8')), 'hex')");
    const id = "c0000000-0000-0000-0000-000000000003";
    expect(await hashJoinCode(id, "7KQ2MX")).toBe(createHash("sha256").update(`${id}:7KQ2MX`).digest("hex"));
    expect(await hashJoinCode(id, " 7kq2-mx ")).toBe(await hashJoinCode(id, "7KQ2MX"));
  });
  it("retains normalization used by the student join page", () => {
    expect(normalizeJoinCode(" 7kq2-mx ")).toBe("7KQ2MX");
    expect(normalizeClassCode(" mary-p3 ")).toBe("MARY-P3");
  });
  it("generates six cryptographic characters without lookalikes", () => {
    const codes = Array.from({ length: 100 }, generateJoinCode);
    for (const code of codes) {
      expect(code).toHaveLength(6);
      expect([...code].every((char) => JOIN_CODE_ALPHABET.includes(char))).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
  it("builds readable class codes and a prefilled root join link", () => {
    expect(generateClassCode("Maryvale High", "Period 3")).toBe("MARY-P3");
    expect(generateClassCode("École!", "Period 5")).toBe("ECOL-P5");
    expect(generateClassCode("", "")).toBe("CLASS-1");
    expect(classJoinUrl("https://example.org/teach", "mary-p3")).toBe("https://example.org/join?class=MARY-P3");
  });
});
