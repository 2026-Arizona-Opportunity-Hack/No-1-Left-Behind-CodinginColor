// Staff roles (students are not Supabase users; see src/server/auth.ts). Safe to import anywhere.
export type StaffRole = "admin" | "instructor" | "reviewer";

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "CIC staff",
  instructor: "Teacher",
  reviewer: "Reviewer (view only)",
};

// Where each role lands after signing in.
export const ROLE_HOME: Record<StaffRole, string> = {
  admin: "/admin",
  instructor: "/teach",
  reviewer: "/review",
};

export const STAFF_NAV: Record<StaffRole, { href: string; label: string }[]> = {
  admin: [
    { href: "/admin", label: "Home" },
    { href: "/teach", label: "Classes" },
    { href: "/review", label: "Curriculum" },
  ],
  instructor: [
    { href: "/teach", label: "My classes" },
    { href: "/review", label: "Curriculum" },
  ],
  reviewer: [{ href: "/review", label: "Curriculum" }],
};

/** Only allow redirects to our own pages after sign-in (blocks "//evil.com"). */
export function safeNextPath(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null;
}
