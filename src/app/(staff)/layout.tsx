import { connection } from "next/server";
import { Suspense } from "react";
import { StaffHeader } from "@/components/staff-header";
import { getStaff } from "@/server/auth";

// Staff pages always load live, per-user data (who is signed in, current progress), so navigations into
// them wait for that data instead of showing a prerendered shell.
export const instant = false;

// Shared shell for staff pages. Each page checks its required capability with requirePermission().
// Everything here depends on who is signed in (cookies), so it renders at request time inside Suspense.
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p role="status" className="mx-auto w-full max-w-[1104px] px-4 py-8 text-muted-foreground sm:px-6">Loading…</p>}>
      <StaffShell>{children}</StaffShell>
    </Suspense>
  );
}

async function StaffShell({ children }: { children: React.ReactNode }) {
  await connection(); // staff pages are per-user and live; Supabase's sign-in check also reads the clock
  const staff = await getStaff();
  return (
    <>
      {staff && <StaffHeader staff={staff} />}
      <main className="mx-auto w-full max-w-[1104px] flex-1 px-5 py-8 sm:px-6">{children}</main>
    </>
  );
}
