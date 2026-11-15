import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/permissions";

export type Staff = { id: string; email: string | null; role: string; roleName: string; permissions: string[]; displayName: string };

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
  const { data: definition, error } = await supabase.from("staff_roles").select("name, permissions").eq("id", profile.role).single();
  if (error || !definition) throw new Error("Staff permissions are unavailable. Ask CIC staff to finish applying the access migration.");
  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role,
    roleName: definition.name,
    permissions: definition.permissions,
    displayName: profile.display_name ?? user.email ?? "Staff",
  };
});

/**
 * Use at the top of every staff page. Not signed in → sign-in page (then back here).
 * Wrong role → their own home. The database's access rules still apply on every query.
 */
export async function requirePermission(permission: Permission, currentPath: string): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  if (!can(staff, permission)) redirect(`/access?next=${encodeURIComponent(currentPath)}`);
  return staff;
}

/** Retained for admin-only home pages; functional features use permissions. */
export async function requireStaff(allowed: string[], currentPath: string): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  if (!allowed.includes(staff.role)) redirect("/access");
  return staff;
}
