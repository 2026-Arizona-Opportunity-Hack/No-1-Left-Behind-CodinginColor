import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { StaffNav } from "@/components/staff-nav";
import { staffHome, staffNavigation } from "@/lib/permissions";
import type { Staff } from "@/server/auth";

// The header uses the same width and side padding as the page below it (see the staff layout), so the logo,
// the navigation and the page content all start on the same left edge.
export function StaffHeader({ staff }: { staff: Staff }) {
  return (
    <header className="print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 pt-6 sm:px-6">
        <Logo href={staffHome(staff)} />
        <div className="flex items-center gap-3 text-lg whitespace-nowrap">
          {/* One pill with the role. The person's name goes beside it only when it says something different
              (an admin named "CIC administrator" would otherwise show the same words twice). */}
          <span className="rounded-full bg-card px-4 py-1.5 font-semibold">{staff.roleName}</span>
          {staff.displayName.trim().toLowerCase() !== staff.roleName.trim().toLowerCase() && (
            <span className="hidden md:inline">{staff.displayName}</span>
          )}
          <form action={signOut}>
            <button type="submit" className="h-11 cursor-pointer rounded-full border-2 border-primary bg-card px-5 text-lg font-bold text-foreground hover:bg-secondary">Sign out</button>
          </form>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <div className="border-b-2 border-[#CFE3D6] pb-3">
          <StaffNav items={staffNavigation(staff)} />
        </div>
      </div>
    </header>
  );
}
