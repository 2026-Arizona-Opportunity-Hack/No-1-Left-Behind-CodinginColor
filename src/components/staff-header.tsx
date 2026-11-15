import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { staffHome, staffNavigation } from "@/lib/permissions";
import type { Staff } from "@/server/auth";

export function StaffHeader({ staff }: { staff: Staff }) {
  return (
    <header className="print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-6 py-5 sm:px-10">
        <Logo href={staffHome(staff)} />
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {staffNavigation(staff).map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-full px-3 py-2 text-base font-medium whitespace-nowrap text-foreground no-underline hover:bg-card focus-visible:outline-2">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-base whitespace-nowrap">
          {/* One pill with the role. The person's name goes beside it only when it says something different
              (an admin named "CIC administrator" would otherwise show the same words twice). */}
          <span className="rounded-full bg-card px-3 py-1 font-medium">{staff.roleName}</span>
          {staff.displayName.trim().toLowerCase() !== staff.roleName.trim().toLowerCase() && (
            <span className="hidden xl:inline">{staff.displayName}</span>
          )}
          <form action={signOut}>
            <button type="submit" className="h-10 cursor-pointer rounded-full border-2 border-primary bg-card px-4 text-base font-bold text-foreground hover:bg-secondary">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
