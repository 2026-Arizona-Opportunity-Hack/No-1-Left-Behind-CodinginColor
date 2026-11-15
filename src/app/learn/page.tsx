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
  return (
    <>
      <StudentHeader student={student} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 pt-4 pb-12 sm:px-12 lg:grid-cols-[minmax(0,500px)_1fr] lg:gap-14">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-5xl leading-none font-bold tracking-tight sm:text-6xl">My course</h1>
            <p className="mt-3 text-muted-foreground">{student.className} · Pre-test → course materials → post-test</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span aria-hidden="true" className="flex gap-1 font-mono text-2xl leading-none font-extrabold">
                {lessons.map((l) => (
                  <span key={l.id} className={l.id === map.next?.lessonId ? "rounded-md bg-[#FFD75E] px-0.5" : l.status === "completed" ? "text-[#0DB031]" : "text-[#B5CDBD]"}>&gt;</span>
                ))}
              </span>
              <span className="text-muted-foreground">{done} of {lessons.length} lessons done</span>
            </div>
          </div>

          {preFirst ? (
            <Link href={`/learn/test/${pre.m.id}/pre`} className="flex items-center justify-between rounded-[28px] bg-primary px-8 py-6 text-primary-foreground no-underline hover:bg-[#047D13]">
              <span><span className="block text-base">Start with the pre-test</span><span className="block text-3xl font-semibold">{pre.m.title}</span></span>
              <span aria-hidden="true" className="text-4xl">&gt;</span>
            </Link>
          ) : map.next ? (
            <Link href={`/learn/${map.next.lessonId}`} className="flex items-center justify-between rounded-[28px] bg-primary px-8 py-6 text-primary-foreground no-underline hover:bg-[#047D13]">
              <span><span className="block text-base">{map.next.resume ? "Continue where you left off" : "Start here"}</span>
                <span className="block text-3xl leading-tight font-semibold">{map.next.title}</span></span>
              <span aria-hidden="true" className="font-mono text-4xl font-extrabold">&gt;</span>
            </Link>
          ) : (
            <p className="rounded-[28px] bg-card px-8 py-6 text-xl font-semibold">Check the quizzes on your course path to finish each unit.</p>
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
          {!map.modules.length && <p className="rounded-3xl bg-card p-6">Your teacher hasn&apos;t assigned published curriculum yet. Ask them to assign a unit to {student.className}.</p>}
          {map.modules.map((m) => <CourseUnit key={m.id} unit={m} nextId={map.next?.lessonId} />)}
        </div>
      </main>
    </>
  );
}
