import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, STAFF_NAV } from "@/lib/roles";
import type { Staff } from "@/server/auth";

export function StaffHeader({ staff }: { staff: Staff }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold">
          Coding in Color <span className="font-normal text-muted-foreground">Launchpad</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {STAFF_NAV[staff.role].map((item) => (
            <Link key={item.href} href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="rounded-full border px-2.5 py-0.5 font-medium">{ROLE_LABEL[staff.role]}</span>
          <span className="hidden sm:inline">{staff.displayName}</span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
    </header>
  );
}
