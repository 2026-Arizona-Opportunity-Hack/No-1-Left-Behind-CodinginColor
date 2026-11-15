import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StudentHeader } from "@/components/student-header";
import { weekdayName } from "@/lib/school-date";
import { getMissedLessons, getRecap, getTodaysLesson } from "@/server/catch-up";
import { getPlayerLesson } from "@/server/lesson-player";
import { requireStudent } from "@/server/student-session";
import { CatchUpView } from "./catch-up-view";

export const metadata: Metadata = { title: "Catch up · CIC Launchpad" };
type Props = { params: Promise<{ lessonId: string }> };

export default function CatchUpPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your catch-up…</p>}>
      <CatchUp params={params} />
    </Suspense>
  );
}

async function CatchUp({ params }: Props) {
  const student = await requireStudent();
  const { lessonId } = await params;
  const valid = /^[0-9a-f-]{36}$/i.test(lessonId);
  const [lesson, recap, missed, today] = valid
    ? await Promise.all([getPlayerLesson(student, lessonId), getRecap(lessonId), getMissedLessons(student), getTodaysLesson(student)])
    : [null, null, [], null];
  // Catch-up = core practice and checks only: no slides or video (the recap covers them), no extras.
  const core = lesson && { ...lesson, activities: lesson.activities.filter((a) => a.isCore && a.type !== "slide" && a.type !== "video") };
  const missedOn = missed.find((m) => m.lessonId === lessonId);
  return (
    <>
      <StudentHeader student={student} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {core ? (
          <CatchUpView lesson={core} recap={recap} missedOn={missedOn ? weekdayName(missedOn.date) : null}
            todayLesson={today && today.id !== lessonId ? today : null} />
        ) : (
          <div className="mx-auto max-w-md space-y-3 rounded-2xl border p-8 text-center">
            <h1 className="text-2xl font-semibold">This catch-up isn&apos;t open</h1>
            <Link href="/learn" className="font-medium underline underline-offset-4">Back to my course</Link>
          </div>
        )}
      </main>
    </>
  );
}
