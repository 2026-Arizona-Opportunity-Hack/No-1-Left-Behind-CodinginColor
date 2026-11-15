import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { StudentHeader } from "@/components/student-header";
import type { LessonStatus, MapModule } from "@/lib/course-map";
import { getCourseMap } from "@/server/student-learning";
import { requireStudent } from "@/server/student-session";

export const metadata: Metadata = { title: "My course · CIC Launchpad" };

// Status is never shown by color alone: every state has an icon and a word.
const STATUS: Record<LessonStatus | "locked", { icon: string; word: string; className: string }> = {
  completed: { icon: "✓", word: "Done", className: "border-green-700 bg-green-50 text-green-800" },
  in_progress: { icon: "◐", word: "Started", className: "border-amber-600 bg-amber-50 text-amber-800" },
  not_started: { icon: "○", word: "Not started", className: "border-zinc-400 bg-white text-zinc-700" },
  exempt: { icon: "–", word: "Skipped by your teacher", className: "border-zinc-300 bg-zinc-50 text-zinc-600" },
  locked: { icon: "🔒", word: "Locked", className: "border-zinc-300 bg-zinc-100 text-zinc-600" },
};

export default function LearnPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your course…</p>}>
      <CourseMapPage />
    </Suspense>
  );
}

async function CourseMapPage() {
  const student = await requireStudent();
  const map = await getCourseMap(student);
  const firstName = student.displayName.split(" ")[0];

  return (
    <>
      <StudentHeader student={student} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground">Hi {firstName}! Your course</p>
            <h1 className="text-3xl font-semibold tracking-tight">Python Basics</h1>
          </div>
          {map.next ? (
            <Link href={`/learn/${map.next.lessonId}`} className={buttonVariants({ size: "lg", className: "h-auto flex-col items-start px-5 py-3 text-left" })}>
              <span className="text-base">{map.next.resume ? "Continue where you left off" : "Start here"}</span>
              <span className="text-sm font-normal opacity-90">{map.next.title}</span>
            </Link>
          ) : (
            <p className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 font-medium text-green-800">✓ You finished everything open to you. Nice work!</p>
          )}
        </div>
        {map.modules.map((m) => <UnitSection key={m.id} unit={m} />)}
      </main>
    </>
  );
}

function UnitSection({ unit }: { unit: MapModule }) {
  const total = unit.lessons.length;
  const pct = total ? Math.round((unit.doneCount / total) * 100) : 0;
  return (
    <section aria-labelledby={`unit-${unit.id}`} className="rounded-2xl border p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id={`unit-${unit.id}`} className="text-xl font-semibold">Unit {unit.position}: {unit.title}</h2>
        {unit.isStart && <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm text-primary-foreground">Your teacher says start here</span>}
        <div className="ml-auto flex min-w-48 items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
            aria-label={`Unit ${unit.position} progress`}>
            <div className="h-2 rounded-full bg-green-700" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm tabular-nums">{unit.doneCount} of {total} done</span>
        </div>
      </div>
      {!unit.unlocked && <p className="mt-2 text-sm text-muted-foreground">🔒 {unit.lockedReason}</p>}
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {unit.lessons.map((l) => {
          const s = STATUS[unit.unlocked ? l.status : "locked"];
          const body = (
            <>
              <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg ${s.className}`}>{s.icon}</span>
              <span>
                <span className="block font-medium">{l.title}</span>
                <span className="block text-sm text-muted-foreground">{s.word}</span>
              </span>
            </>
          );
          return (
            <li key={l.id}>
              {unit.unlocked ? (
                <Link href={`/learn/${l.id}`} className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">{body}</Link>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 opacity-80">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
