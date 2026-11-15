import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  PERMISSIONS,
  type Permission,
  type StaffRoleDefinition,
} from "@/lib/permissions";
import { databaseError, idSchema, staffResult } from "./staff-result";

const roleId = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]{1,39}$/,
    "Use 2–40 lowercase letters, numbers or underscores, starting with a letter.",
  );
const permissions = z.array(
  z.enum(Object.keys(PERMISSIONS) as [Permission, ...Permission[]]),
);
async function manage(operation: string, details: unknown) {
  const { error } = await (
    await createClient()
  ).rpc("manage_staff_access", { operation, details });
  if (error) databaseError(error);
  return null;
}
export function listStaffAccess() {
  return staffResult(async () => {
    const db = await createClient();
    const { data: allowed, error: denied } = await db.rpc("has_permission", {
      permission: "roles.manage",
    });
    if (denied || !allowed)
      throw new Error("You do not have permission to manage staff access.");
    const [roles, people] = await Promise.all([
      db.from("staff_roles").select("id,name,permissions").order("name"),
      db
        .from("profiles")
        .select("id,display_name,role")
        .order("created_at")
        .order("id"),
    ]);
    if (roles.error) databaseError(roles.error);
    if (people.error) databaseError(people.error);
    return {
      roles: roles.data as StaffRoleDefinition[],
      people: people.data as {
        id: string;
        display_name: string | null;
        role: string;
      }[],
    };
  });
}
export function saveStaffRole(input: {
  id: string;
  name: string;
  permissions: Permission[];
}) {
  return staffResult(() => {
    const details = z
      .object({
        id: roleId,
        name: z.string().trim().min(1).max(80),
        permissions,
      })
      .parse(input);
    if (
      details.permissions.includes("curriculum.write") &&
      !details.permissions.includes("curriculum.read")
    )
      details.permissions.push("curriculum.read");
    return manage("save", details);
  });
}
export function deleteStaffRole(id: string, replacement?: string) {
  return staffResult(() =>
    manage("delete", {
      id: roleId.parse(id),
      ...(replacement ? { replacement: roleId.parse(replacement) } : {}),
    }),
  );
}
export function assignStaffRole(id: string, role: string) {
  return staffResult(() =>
    manage("assign", { id: idSchema.parse(id), role: roleId.parse(role) }),
  );
}
