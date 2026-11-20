import { leaveClass } from "@/app/join/actions";
import Link from "next/link";
import { Logo } from "@/components/logo";
import type { Student } from "@/server/student-session";

export function StudentHeader({ student }: { student: Student }) {
  const [first, ...rest] = student.displayName.split(" ");
  const short = rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  return (
    <header className="print:hidden">
      <div className="mx-auto flex w-full max-w-[1104px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 sm:px-6">
        <Logo href="/learn" />
        <span className="ml-auto rounded-[10px] border-2 border-border bg-card px-4 py-1.5 text-base font-bold">{short} · {student.className}</span>
        <Link href="/learn" className="inline-flex h-11 items-center rounded-xl border-2 border-primary bg-card px-[18px] text-base font-bold text-foreground no-underline hover:bg-secondary">Home</Link>
        <form action={leaveClass}>
          <button type="submit" className="h-11 cursor-pointer rounded-[10px] border-2 border-primary bg-primary px-[18px] text-base font-bold text-primary-foreground hover:border-[#047D13] hover:bg-[#047D13]">Sign out</button>
        </form>
      </div>
    </header>
  );
}
