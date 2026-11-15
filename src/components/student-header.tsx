import { leaveClass } from "@/app/join/actions";
import { Logo } from "@/components/logo";
import type { Student } from "@/server/student-session";

export function StudentHeader({ student }: { student: Student }) {
  const [first, ...rest] = student.displayName.split(" ");
  const short = rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  return (
    <header className="print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-5 sm:px-12">
        <Logo href="/learn" />
        <span className="ml-auto text-base">{short} · {student.className}</span>
        <form action={leaveClass}>
          <button type="submit" className="h-10 cursor-pointer rounded-full border-2 border-primary bg-card px-4 text-base font-bold text-foreground hover:bg-secondary">Sign out</button>
        </form>
      </div>
    </header>
  );
}
