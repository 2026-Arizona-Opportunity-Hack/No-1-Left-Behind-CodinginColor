import { connection } from "next/server";
import { requirePermission } from "@/server/auth";
import { listStaffAccess } from "@/server/staff-roles";
import { RoleManager } from "./role-manager";
export const instant = false;
export default async function StaffAccessPage() {
  await connection(); // per-user, live data: render at request time
  const staff = await requirePermission("roles.manage", "/admin/roles");
  const result = await listStaffAccess();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight sm:text-[52px]"><span aria-hidden="true" className="font-mono text-[#0DB031]">&gt;</span>Staff access</h1>
        <p className="mt-2 text-xl text-muted-foreground">
          Add roles such as Mentor, choose what they can do, and assign them to
          staff. Changes apply on their next request.
        </p>
      </div>
      {result.ok ? (
        <RoleManager {...result.data} currentUserId={staff.id} />
      ) : (
        <p role="alert">{result.error}</p>
      )}
    </div>
  );
}
