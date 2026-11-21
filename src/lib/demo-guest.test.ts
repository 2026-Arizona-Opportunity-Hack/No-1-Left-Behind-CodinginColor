import { describe, expect, it } from "vitest";
import { DEMO_CLASS_CODE, DEMO_JOIN_CODE, GUEST_LIFETIME_DAYS, guestCutoff, guestName, isDemoLogin } from "./demo-guest";

describe("demo guest login", () => {
  it("accepts the shared demo codes however they are typed", () => {
    expect(isDemoLogin(DEMO_CLASS_CODE, DEMO_JOIN_CODE)).toBe(true);
    expect(isDemoLogin(" demo ", "try-it")).toBe(true);
    expect(isDemoLogin("Demo", "tryit")).toBe(true);
  });
  it("never treats a real class or a wrong code as a demo login", () => {
    expect(isDemoLogin("MARY-P3", "7KQ2MX")).toBe(false);
    expect(isDemoLogin("DEMO", "7KQ2MX")).toBe(false);
    expect(isDemoLogin("MARY-P3", "TRYIT")).toBe(false);
    expect(isDemoLogin("", "")).toBe(false);
  });
  it("names guests Guest-0000 to Guest-9999 (the clean-up relies on the prefix)", () => {
    for (let i = 0; i < 200; i++) expect(guestName()).toMatch(/^Guest-\d{4}$/);
  });
  it("only treats guests older than the lifetime as old", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    expect(Date.parse(guestCutoff(now))).toBe(now.getTime() - GUEST_LIFETIME_DAYS * 86_400_000);
  });
});
