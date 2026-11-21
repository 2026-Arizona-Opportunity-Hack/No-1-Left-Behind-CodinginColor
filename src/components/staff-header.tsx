import { signOut } from "@/app/login/actions";
import { HomeLink } from "@/components/home-link";
import { Logo } from "@/components/logo";
import { StaffNav } from "@/components/staff-nav";
import { staffHome, staffNavigation } from "@/lib/permissions";
import type { Staff } from "@/server/auth";

// The header uses the same width and side padding as the page below it (see the staff layout), so the logo,
// the navigation and the page content all start on the same left edge.
export function StaffHeader({ staff }: { staff: Staff }) {
  return (
    <header className="print:hidden">
      <div className="mx-auto flex w-full max-w-[1104px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 pt-6 sm:px-6">
        <Logo href={staffHome(staff)} />
        <div className="flex flex-wrap items-center gap-3 text-lg">
          {/* One pill with the role. The person's name goes beside it only when it says something different
              (an admin named "CIC administrator" would otherwise show the same words twice). */}
          <span className="rounded-[10px] border-2 border-border bg-card px-4 py-1.5 text-base font-bold">{staff.roleName}</span>
          {staff.displayName.trim().toLowerCase() !== staff.roleName.trim().toLowerCase() && (
            <span className="hidden md:inline">{staff.displayName}</span>
          )}
          {/* Admins already have a Home tab; everyone else gets a clear way back to their first page. */}
          {staff.role !== "admin" && <HomeLink href={staffHome(staff)} className="inline-flex h-11 items-center rounded-xl border-2 border-primary bg-card px-[18px] text-base font-bold text-foreground no-underline hover:bg-secondary" />}
          <form action={signOut}>
            <button type="submit" className="h-11 cursor-pointer rounded-[10px] border-2 border-primary bg-primary px-[18px] text-base font-bold text-primary-foreground hover:border-[#047D13] hover:bg-[#047D13]">Sign out</button>
          </form>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1104px] px-5 pt-4 sm:px-6">
        <div className="border-b-2 border-[#CFE3D6] pb-3">
          <StaffNav items={staffNavigation(staff)} />
        </div>
      </div>
    </header>
  );
}
