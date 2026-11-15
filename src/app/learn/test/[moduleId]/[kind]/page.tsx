import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StudentHeader } from "@/components/student-header";
import { getStudentTest } from "@/server/student-tests";
import { requireStudent } from "@/server/student-session";
import { TestTaker } from "./test-taker";

export const metadata: Metadata = { title: "Test · CIC Launchpad" };

type Props = { params: Promise<{ moduleId: string; kind: string }> };

export default function TestPage({ params }: Props) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your test…</p>}>
      <Test params={params} />
    </Suspense>
  );
}

async function Test({ params }: Props) {
  const student = await requireStudent();
  const { moduleId, kind } = await params;
  const test = (kind === "pre" || kind === "post") && /^[0-9a-f-]{36}$/i.test(moduleId) ? await getStudentTest(student, moduleId, kind) : null;
  return (
    <>
      <StudentHeader student={student} />
      <main className="w-full flex-1 px-4 py-8 sm:px-6">
        {test ? <TestTaker moduleId={moduleId} test={test} /> : (
          <div className="mx-auto max-w-md space-y-3 rounded-3xl bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold">This test isn&apos;t open right now</h1>
            <p className="text-muted-foreground">You may have finished it already, or need to finish the unit first.</p>
            <Link href="/learn" className="font-medium underline underline-offset-4">Back to my course</Link>
          </div>
        )}
      </main>
    </>
  );
}
