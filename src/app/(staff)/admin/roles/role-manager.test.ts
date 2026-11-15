import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  changeStaffRole: vi.fn(),
  removeRole: vi.fn(),
  saveRole: vi.fn(),
}));
import { RoleManager } from "./role-manager";
import { PERMISSIONS } from "@/lib/permissions";
it("renders editable custom roles, permission descriptions and staff assignment controls", () => {
  const html = renderToStaticMarkup(
    createElement(RoleManager, {
      currentUserId: "admin",
      people: [
        { id: "admin", display_name: "CIC administrator", role: "admin" },
        { id: "mentor", display_name: "Test mentor", role: "mentor" },
      ],
      roles: [
        {
          id: "admin",
          name: "CIC administrator",
          permissions: Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[],
        },
        { id: "mentor", name: "Mentor", permissions: ["curriculum.read"] },
      ],
    }),
  );
  expect(html).toContain("Mentor");
  expect(html).toContain("Create and edit curriculum");
  expect(html).toContain("Role for Test mentor");
  expect(html).toContain("Save role");
  if (process.env.CIC_VISUAL_DIR)
    writeFileSync(
      `${process.env.CIC_VISUAL_DIR}/roles.html`,
      `<!doctype html><html style="--font-rubik:Arial,sans-serif;--font-jetbrains-mono:monospace"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="preview.css"></head><body style="--font-rubik:Rubik,Arial,sans-serif;--font-jetbrains-mono:monospace"><main class="mx-auto max-w-6xl p-6 sm:p-10"><p class="font-mono text-xl font-bold">&lt;IN&gt; Launchpad</p><h1 class="my-6 text-4xl font-bold">Staff access</h1><p class="mb-6 text-muted-foreground">Add roles and choose access without changing code.</p>${html}</main></body></html>`,
    );
});
