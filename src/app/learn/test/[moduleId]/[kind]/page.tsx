import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CompletionBand } from "@/components/completion-band";
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
      <main className="mx-auto w-full max-w-[1104px] flex-1 px-5 py-6 sm:px-6">
        {test ? <TestTaker moduleId={moduleId} test={test} /> : completed ? (
          <section aria-labelledby="done-h" className="mx-auto w-full max-w-[760px] space-y-6">
            <CompletionBand headingId="done-h" label={`${kind === "pre" ? "Warm-up quiz" : "Final quiz"} complete`} title={completed.unitTitle} big={`${completed.pct}%`} bigLabel="your score" sub={`${completed.correct} of ${completed.total} correct. Your result is saved.`} />
            <Link href="/learn" className="inline-flex h-[60px] items-center gap-2.5 rounded-2xl border-2 border-primary bg-primary px-8 text-xl font-bold text-primary-foreground no-underline hover:bg-[#047D13]">Back to my course <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span></Link>
          </section>
        ) : (
          <div className="mx-auto max-w-md space-y-3 rounded-[20px] bg-card p-8 text-center border border-border">
            <h1 className="text-3xl font-bold tracking-tight">This quiz isn&apos;t open right now</h1>
            <p className="text-muted-foreground">You may have finished it already, or need to finish the unit first.</p>
            <Link href="/learn" className="font-medium underline underline-offset-4">Back to my course</Link>
          </div>
        )}
      </main>
    </>
  );
}
