import { describe, expect, it } from "vitest";
import { can, staffHome, staffNavigation } from "./permissions";
describe("configurable staff access", () => {
  it("gives custom mentors only their configured access", () => {
    const mentor = { role: "mentor", permissions: ["curriculum.read"] };
    expect(can(mentor, "curriculum.write")).toBe(false);
    expect(staffNavigation(mentor)).toEqual([
      { href: "/review", label: "Curriculum" },
    ]);
    expect(staffHome(mentor)).toBe("/review");
    expect(
      staffHome({ role: "mentor", permissions: ["curriculum.write"] }),
    ).toBe("/admin/curriculum");
  });
  it("does not invent access for an unknown or empty role", () => {
    expect(staffNavigation({ role: "custom", permissions: [] })).toEqual([]);
    expect(staffHome({ role: "custom", permissions: [] })).toBe("/access");
    expect(can(null, "roles.manage")).toBe(false);
  });
  it("keeps administrators able to restore staff access", () => {
    expect(can({ role: "admin", permissions: [] }, "roles.manage")).toBe(true);
  });
});
