import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StudentHeader } from "@/components/student-header";
import type { LessonStatus, MapModule } from "@/lib/course-map";
import { weekdayName } from "@/lib/school-date";
import { getMissedLessons } from "@/server/catch-up";
import { getCourseMap } from "@/server/student-learning";
import { requireStudent } from "@/server/student-session";
import { getTestStatus, type TestStatus } from "@/server/student-tests";

const UNIT_TINT = ["bg-sky text-sky-ink", "bg-lilac text-lilac-ink", "bg-sun text-sun-ink", "bg-ontrack text-ontrack-ink"];

export const metadata: Metadata = { title: "My course · CIC Launchpad" };

// Status is never shown by color alone: every state has a symbol and a word.
const STATUS: Record<LessonStatus, { icon: string; word: string }> = {
  completed: { icon: "✓", word: "Done" },
  in_progress: { icon: "◐", word: "Started" },
  not_started: { icon: "○", word: "Not started" },
  exempt: { icon: "–", word: "Skipped by your teacher" },
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
  const [map, tests, missed] = await Promise.all([getCourseMap(student), getTestStatus(student), getMissedLessons(student)]);
  const lessons = map.modules.flatMap((m) => m.lessons);
  const done = lessons.filter((l) => l.status === "completed").length;
  const pre = map.modules.map((m) => ({ m, t: tests[m.id] })).find((x) => x.t?.pre === "todo");
  const post = map.modules.map((m) => ({ m, t: tests[m.id] })).find((x) => x.t?.post === "todo");

  return (
    <>
      <StudentHeader student={student} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 pt-4 pb-12 sm:px-12 lg:grid-cols-[minmax(0,500px)_1fr] lg:gap-14">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-5xl leading-none font-bold tracking-tight sm:text-6xl">Python Basics</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span aria-hidden="true" className="flex gap-1 font-mono text-2xl leading-none font-extrabold">
                {lessons.map((l) => (
                  <span key={l.id} className={l.id === map.next?.lessonId ? "rounded-md bg-[#FFD75E] px-0.5" : l.status === "completed" ? "text-[#0DB031]" : "text-[#B5CDBD]"}>&gt;</span>
                ))}
              </span>
              <span className="text-muted-foreground">{done} of {lessons.length} lessons done</span>
            </div>
          </div>

          {map.next ? (
            <Link href={`/learn/${map.next.lessonId}`} className="flex items-center justify-between rounded-[28px] bg-primary px-8 py-6 text-primary-foreground no-underline hover:bg-[#047D13]">
              <span><span className="block text-base">{map.next.resume ? "Continue where you left off" : "Start here"}</span>
                <span className="block text-3xl leading-tight font-semibold">{map.next.title}</span></span>
              <span aria-hidden="true" className="font-mono text-4xl font-extrabold">&gt;</span>
            </Link>
          ) : (
            <p className="rounded-[28px] bg-card px-8 py-6 text-xl font-semibold">✓ You finished everything open to you. Nice work!</p>
          )}

          {missed.map((m) => (
            <div key={m.lessonId} role="status" className="flex flex-wrap items-center gap-4 rounded-3xl bg-behind px-6 py-5 text-behind-ink">
              <p className="flex-1"><b className="font-semibold">You missed {m.title} on {weekdayName(m.date)}.</b><br />
                {m.assigned ? "Your teacher set up a catch-up for you. " : ""}Catch up in about 15 minutes.</p>
              <Link href={`/learn/catch-up/${m.lessonId}`} className="inline-flex h-12 items-center rounded-full border-2 border-primary bg-card px-6 font-semibold text-foreground no-underline hover:bg-secondary">Catch up</Link>
            </div>
          ))}

          {pre && (
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-sky px-6 py-4 text-sky-ink">
              <p className="flex-1"><b className="font-semibold">Start with a warm-up quiz.</b> A few questions, not graded.</p>
              <Link href={`/learn/test/${pre.m.id}/pre`}>Start the warm-up quiz</Link>
            </div>
          )}
          {post && (
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-ontrack px-6 py-4 text-ontrack-ink">
              <p className="flex-1"><b className="font-semibold">You finished {post.m.title}!</b> See how much you grew.</p>
              <Link href={`/learn/test/${post.m.id}/post`}>Take the final quiz</Link>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {map.modules.map((m) => <UnitCard key={m.id} unit={m} nextId={map.next?.lessonId} tests={tests[m.id]} />)}
        </div>
      </main>
    </>
  );
}

function UnitCard({ unit, nextId, tests }: { unit: MapModule; nextId?: string; tests?: TestStatus[string] }) {
  if (!unit.unlocked) {
    return (
      <section aria-labelledby={`unit-${unit.id}`} className="flex items-center gap-5 rounded-3xl border-2 border-border px-7 py-5">
        <svg aria-hidden="true" width="22" height="26" viewBox="0 0 22 26"><path d="M5 11V7a6 6 0 0 1 12 0v4" fill="none" stroke="#0B3D1E" strokeWidth="3" /><rect x="1" y="11" width="20" height="14" rx="4" fill="#0B3D1E" /></svg>
        <div className="flex-1">
          <h2 id={`unit-${unit.id}`} className="text-xl font-semibold"><span className="sr-only">{unit.position} · </span>{unit.title}</h2>
          <p className="text-base text-muted-foreground">{unit.lockedReason}</p>
        </div>
        <span className="text-[15px] text-muted-foreground">{unit.lessons.length} lessons</span>
      </section>
    );
  }
  return (
    <section aria-labelledby={`unit-${unit.id}`} className="rounded-3xl bg-card px-3.5 pt-4 pb-3">
      <div className="flex flex-wrap justify-between gap-2 px-3.5 pb-2">
        <h2 id={`unit-${unit.id}`} className="flex items-center gap-2.5 text-xl font-semibold"><span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full text-base font-bold ${UNIT_TINT[(unit.position - 1) % UNIT_TINT.length]}`}>{unit.position}</span><span className="sr-only">{unit.position} · </span>{unit.title}</h2>
        <span className="self-center text-[15px] text-muted-foreground">
          {unit.isStart ? "Your teacher says start here · " : ""}{unit.doneCount} of {unit.lessons.length} done
          {tests?.pre === "done" ? " · ✓ Warm-up quiz" : ""}{tests?.post === "done" ? " · ✓ Final quiz" : ""}
        </span>
      </div>
      <ol className="m-0 list-none p-0">
        {unit.lessons.map((l) => {
          const s = STATUS[l.status];
          const current = l.id === nextId;
          return (
            <li key={l.id}>
              <Link href={`/learn/${l.id}`}
                className={`flex min-h-11 items-center gap-3.5 rounded-2xl px-3.5 text-foreground no-underline hover:bg-secondary ${current ? "min-h-13 bg-[#FFD75E] font-semibold hover:bg-[#FFD75E]" : ""}`}>
                <span aria-hidden="true" className={`w-6 text-center font-bold ${l.status === "completed" ? "text-[#047D13]" : ""}`}>{s.icon}</span>
                <span className="flex-1">{l.title}</span>
                <span className={`text-[15px] ${current ? "font-medium" : "text-muted-foreground"}`}>{current && l.status === "in_progress" ? "Started · keep going" : s.word}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
