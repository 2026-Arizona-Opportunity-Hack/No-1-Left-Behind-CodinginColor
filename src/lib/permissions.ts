export const PERMISSIONS = {
  "curriculum.read": {
    label: "View published curriculum",
    description:
      "Read lessons and teaching guides. No changes or student data.",
  },
  "curriculum.write": {
    label: "Create and edit curriculum",
    description:
      "Import, edit, review, publish and delete curriculum and quizzes.",
  },
  "classes.manage": {
    label: "Manage own classes",
    description:
      "Create classes and manage their rosters, assignments and schedules.",
  },
  "results.read": {
    label: "View own class results",
    description:
      "Read progress and before/after quiz results for assigned classes.",
  },
  "roles.manage": {
    label: "Manage staff access",
    description:
      "Create roles and assign permissions, including administrator access.",
  },
  "api_keys.manage": {
    label: "Manage reporting API keys",
    description:
      "Create or revoke keys that can access organisation-wide reporting data.",
  },
} as const;
export type Permission = keyof typeof PERMISSIONS;
export type StaffAccess = { role: string; permissions: readonly string[] };
export type StaffRoleDefinition = {
  id: string;
  name: string;
  permissions: Permission[];
};
export function can(
  staff: StaffAccess | null,
  permission: Permission,
): boolean {
  return Boolean(
    staff &&
    (staff.role === "admin" ||
      staff.permissions.includes(permission) ||
      (permission === "curriculum.read" &&
        staff.permissions.includes("curriculum.write"))),
  );
}
export function staffNavigation(staff: StaffAccess) {
  const items: { href: string; label: string }[] = [];
  if (staff.role === "admin") items.push({ href: "/admin", label: "Home" });
  if (can(staff, "classes.manage"))
    items.push({
      href: "/teach",
      label: staff.role === "admin" ? "Classes" : "My classes",
    });
  if (can(staff, "results.read"))
    items.push({ href: "/results", label: "Results" });
  if (can(staff, "curriculum.write"))
    items.push({ href: "/admin/curriculum", label: "Curriculum" });
  else if (can(staff, "curriculum.read"))
    items.push({ href: "/review", label: "Curriculum" });
  if (can(staff, "roles.manage"))
    items.push({ href: "/admin/roles", label: "Staff access" });
  if (can(staff, "api_keys.manage"))
    items.push({ href: "/admin/api-keys", label: "API keys" });
  return items;
}
export function staffHome(staff: StaffAccess) {
  return staffNavigation(staff)[0]?.href ?? "/access";
}
