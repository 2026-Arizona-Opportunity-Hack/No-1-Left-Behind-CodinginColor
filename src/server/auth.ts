import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type StaffRole } from "@/lib/roles";

export type Staff = { id: string; email: string | null; role: StaffRole; displayName: string };

/** The signed-in staff member (admin / instructor / reviewer), or null. Cached per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // verifies the session with Supabase, not just the cookie
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role as StaffRole,
    displayName: profile.display_name ?? user.email ?? "Staff",
  };
});

/**
 * Use at the top of every staff page. Not signed in → sign-in page (then back here).
 * Wrong role → their own home. The database's access rules still apply on every query.
 */
export async function requireStaff(allowed: StaffRole[], currentPath: string): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  if (!allowed.includes(staff.role)) redirect(ROLE_HOME[staff.role]);
  return staff;
}
