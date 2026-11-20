import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StudentHeader } from "@/components/student-header";
import { CourseUnit } from "@/components/lesson/course-unit";
import { weekdayName } from "@/lib/school-date";
import { getMissedLessons } from "@/server/catch-up";
import { getCourseMap } from "@/server/student-learning";
import { requireStudent } from "@/server/student-session";

export const metadata: Metadata = { title: "My course · CIC Launchpad" };

export default function LearnPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your course…</p>}>
      <CourseMapPage />
    </Suspense>
  );
}

async function CourseMapPage() {
  const student = await requireStudent();
  const [map, missed] = await Promise.all([getCourseMap(student), getMissedLessons(student)]);
  const tests = Object.fromEntries(map.modules.map((m) => [m.id, { pre: m.preTest, post: m.postTest }]));
  const lessons = map.modules.flatMap((m) => m.lessons);
  const done = lessons.filter((l) => l.status === "completed").length;
  const startPosition = map.modules.find((m) => m.isStart)?.position ?? 0;
  const pre = map.modules.filter((m) => m.position >= startPosition).map((m) => ({ m, t: tests[m.id] })).find((x) => x.t?.pre === "todo");
  const post = map.modules.map((m) => ({ m, t: tests[m.id] })).find((x) => x.t?.post === "todo");

  const nextUnit = map.modules.find((m) => m.lessons.some((l) => l.id === map.next?.lessonId));
  const preFirst = pre && (!nextUnit || pre.m.position <= nextUnit.position);
  const CHEV = "flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base font-bold text-primary";
  const heroLink = "inline-flex min-h-[60px] items-center justify-center gap-2.5 rounded-xl border-2 border-primary bg-primary px-8 text-xl font-bold text-primary-foreground no-underline hover:bg-[#047D13]";
  // The "continue" card: the next thing to do (pre-test, next lesson, or nothing).
  const next = preFirst
    ? { kicker: "Start with the pre-test", title: pre.m.title, sub: "A few questions, not graded", href: `/learn/test/${pre.m.id}/pre`, cta: "Start the pre-test" }
    : map.next
      ? { kicker: map.next.resume ? "Continue where you left off" : "Start here", title: map.next.title, sub: nextUnit?.title ?? "", href: `/learn/${map.next.lessonId}`, cta: map.next.resume ? "Keep going" : "Start" }
      : null;
  return (
    <>
      <StudentHeader student={student} />
      <main className="mx-auto w-full max-w-[1104px] flex-1 px-5 sm:px-6 pt-2 pb-16">
        <section aria-labelledby="course-h" className="relative mb-7 grid items-center gap-7 overflow-hidden rounded-[20px] bg-primary p-7 text-white sm:p-9 lg:grid-cols-2">
          <span aria-hidden="true" className="pointer-events-none absolute -top-32 left-[38%] font-mono text-[420px] leading-none font-bold text-[#0F4527] select-none">&gt;</span>
          <div className="relative">
            <h1 id="course-h" className="text-5xl leading-none font-bold tracking-tight sm:text-[60px]"><span aria-hidden="true" className="mr-1.5 font-mono text-[#0DB031]">&gt;</span> My course</h1>
            <p className="mt-2 mb-5 text-[#E0F1E5]">{student.className} · Pre-test, course materials, post-test</p>
            <div role="img" aria-label={`${done} of ${lessons.length} lessons done`} className="flex flex-wrap gap-1.5">
              {lessons.map((l) => {
                const now = l.id === map.next?.lessonId;
                const ok = l.status === "completed";
                return <span key={l.id} aria-hidden="true" className={`flex size-11 items-center justify-center rounded-[10px] border-2 font-mono text-[22px] font-bold ${now ? "border-white bg-[#FFD75E] text-primary" : ok ? "border-white bg-[#0DB031] text-primary" : "border-dashed border-[#E0F1E5] font-medium text-[#E0F1E5]"}`}>&gt;</span>;
              })}
            </div>
            <p className="mt-3 font-bold">{done} of {lessons.length} lessons done</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-white bg-white p-6 text-primary">
            <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-6 font-mono text-[260px] leading-none font-bold text-[#ECEFED] select-none">&gt;</span>
            {next ? (
              <div className="relative">
                <p className="text-[17px] font-bold"><span aria-hidden="true" className="font-mono">&gt;_</span> {next.kicker}</p>
                <h2 className="mt-0.5 text-4xl leading-tight font-bold">{next.title}</h2>
                <p className="mt-0.5 mb-4 text-muted-foreground">{next.sub || next.cta}</p>
                <Link href={next.href} className={heroLink}>{next.cta} <span aria-hidden="true" className={CHEV}>&gt;</span></Link>
              </div>
            ) : (
              <p className="relative text-xl font-semibold">Check the quizzes on your course path to finish each unit.</p>
            )}
          </div>
        </section>

        {missed.map((m) => (
          <div key={m.lessonId} role="status" className="mb-4 flex flex-wrap items-center gap-5 rounded-2xl border-2 border-behind-ink bg-behind px-7 py-6 text-behind-ink">
            <span aria-hidden="true" className="flex size-16 flex-none items-center justify-center rounded-xl bg-behind-ink font-mono text-3xl font-bold text-behind">&#9719;</span>
            <p className="flex-1 basis-80 text-[19px]"><b className="block text-[28px] leading-tight font-bold">You missed {m.title} on {weekdayName(m.date)}</b>
              {m.assigned ? "Your teacher set up a catch-up for you. " : "No problem. "}Catching up takes about 15 minutes, and then you are back on track.</p>
            <Link href={`/learn/catch-up/${m.lessonId}`} className={heroLink}>Catch up now <span aria-hidden="true" className={CHEV}>&gt;</span></Link>
          </div>
        ))}

        {pre && !preFirst && (
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl bg-sky px-6 py-4 text-sky-ink">
            <p className="flex-1"><b className="font-bold">Start with a warm-up quiz.</b> A few questions, not graded.</p>
            <Link href={`/learn/test/${pre.m.id}/pre`} className="font-bold text-primary underline">Start the warm-up quiz</Link>
          </div>
        )}
        {post && (
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl bg-ontrack px-6 py-4 text-ontrack-ink">
            <p className="flex-1"><b className="font-bold">You finished {post.m.title}!</b> See how much you grew.</p>
            <Link href={`/learn/test/${post.m.id}/post`} className="font-bold text-primary underline">Take the final quiz</Link>
          </div>
        )}

        {!map.modules.length && <p className="rounded-2xl border border-border bg-card p-6">Your teacher hasn&apos;t assigned published curriculum yet. Ask them to assign a unit to {student.className}.</p>}
        <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          {map.modules.map((m) => <CourseUnit key={m.id} unit={m} nextId={map.next?.lessonId} />)}
        </div>
      </main>
    </>
  );
}
