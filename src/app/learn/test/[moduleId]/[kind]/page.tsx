import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StudentHeader } from "@/components/student-header";
import { getCompletedTest, getStudentTest } from "@/server/student-tests";
import { requireStudent } from "@/server/student-session";
import { TestTaker } from "./test-taker";

export const metadata: Metadata = { title: "Test · CIC Launchpad" };

type Props = { params: Promise<{ moduleId: string; kind: string }> };

export default function TestPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your quiz…</p>}>
      <Test params={params} />
    </Suspense>
  );
}

async function Test({ params }: Props) {
  const student = await requireStudent();
  const { moduleId, kind } = await params;
  const test = (kind === "pre" || kind === "post") && /^[0-9a-f-]{36}$/i.test(moduleId) ? await getStudentTest(student, moduleId, kind) : null;
  const completed = (kind === "pre" || kind === "post") && !test ? await getCompletedTest(student,moduleId,kind) : null;
  return (
    <>
      <StudentHeader student={student} />
      <main className="w-full flex-1 px-4 py-8 sm:px-6">
        {test ? <TestTaker moduleId={moduleId} test={test} /> : completed ? <div className="mx-auto max-w-xl space-y-4 rounded-3xl bg-card p-8"><h1 className="text-3xl font-bold">{kind === "pre" ? "Pre-test" : "Post-test"} complete</h1><p>{completed.unitTitle}</p><p className="text-4xl font-bold">{completed.pct}%</p><p>{completed.correct} of {completed.total} correct. Your result is saved.</p><Link href="/learn">Back to my course</Link></div> : (
          <div className="mx-auto max-w-md space-y-3 rounded-3xl bg-card p-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">This quiz isn&apos;t open right now</h1>
            <p className="text-muted-foreground">You may have finished it already, or need to finish the unit first.</p>
            <Link href="/learn" className="font-medium underline underline-offset-4">Back to my course</Link>
          </div>
        )}
      </main>
    </>
  );
}
