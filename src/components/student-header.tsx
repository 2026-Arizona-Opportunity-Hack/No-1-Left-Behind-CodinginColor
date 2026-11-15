import Link from "next/link";
import { leaveClass } from "@/app/join/actions";
import { Button } from "@/components/ui/button";
import type { Student } from "@/server/student-session";

export function StudentHeader({ student }: { student: Student }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/learn" className="font-semibold">
          Coding in Color <span className="font-normal text-muted-foreground">Launchpad</span>
        </Link>
        <span className="ml-auto text-sm text-muted-foreground">
          {student.displayName} · {student.school}, {student.className}
        </span>
        <form action={leaveClass}>
          <Button type="submit" variant="outline" size="sm">Leave</Button>
        </form>
      </div>
    </header>
  );
}
