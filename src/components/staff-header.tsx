import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { ROLE_LABEL, STAFF_NAV } from "@/lib/roles";
import type { Staff } from "@/server/auth";

export function StaffHeader({ staff }: { staff: Staff }) {
  return (
    <header className="print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-6 py-5 sm:px-10">
        <Logo href={STAFF_NAV[staff.role][0].href} />
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {STAFF_NAV[staff.role].map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-full px-3 py-2 text-base font-medium whitespace-nowrap text-foreground no-underline hover:bg-card focus-visible:outline-2">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-base whitespace-nowrap">
          <span className="rounded-full bg-card px-3 py-1 font-medium">{ROLE_LABEL[staff.role]}</span>
          <span className="hidden xl:inline">{staff.displayName}</span>
          <form action={signOut}>
            <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 text-base font-medium text-[#047D13] underline-offset-4 hover:underline">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
