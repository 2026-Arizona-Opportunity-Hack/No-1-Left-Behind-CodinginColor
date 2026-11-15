import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { StudentHeader } from "@/components/student-header";
import { getPlayerLesson } from "@/server/lesson-player";
import { requireStudent } from "@/server/student-session";

export const metadata: Metadata = { title: "Lesson · CIC Launchpad" };

type Props = { params: Promise<{ lessonId: string }> };

export default function LessonPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your lesson…</p>}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: Props) {
  const student = await requireStudent();
  const { lessonId } = await params;
  const lesson = /^[0-9a-f-]{36}$/i.test(lessonId) ? await getPlayerLesson(student, lessonId) : null;
  return (
    <>
      <StudentHeader student={student} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {lesson ? <LessonPlayer lesson={lesson} /> : (
          <div className="mx-auto max-w-md space-y-3 rounded-3xl bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold">🔒 This lesson isn&apos;t open yet</h1>
            <p className="text-muted-foreground">Finish the lessons before it, or ask your teacher to unlock it.</p>
            <Link href="/learn" className="font-medium underline underline-offset-4">Back to my course</Link>
          </div>
        )}
      </main>
    </>
  );
}
