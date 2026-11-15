import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStudent } from "@/server/student-session";
import { leaveClass } from "../join/actions";

export const metadata: Metadata = { title: "My course · CIC Launchpad" };

const STATUS_WORD: Record<string, string> = {
  completed: "✓ Done",
  in_progress: "◐ Started",
  not_started: "○ Not started",
  exempt: "Skipped",
};

export default function LearnPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-muted-foreground">Loading your course…</p>}>
      <StudentHome />
    </Suspense>
  );
}

// First version of the student home: the full course map (unlock order, "Start here") replaces this list.
async function StudentHome() {
  const student = await requireStudent();
  const db = createAdminClient();
  const [{ data: modules }, { data: statuses }] = await Promise.all([
    db.from("modules").select("id, title, position, lessons(id, title, position, status)")
      .eq("status", "published").order("position").order("position", { referencedTable: "lessons" }),
    db.from("lesson_status").select("lesson_id, status").eq("student_id", student.id), // only this student's rows
  ]);
  const statusOf = new Map((statuses ?? []).map((s) => [s.lesson_id, s.status]));
  const firstName = student.displayName.split(" ")[0];

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
          <span className="font-semibold">Coding in Color <span className="font-normal text-muted-foreground">Launchpad</span></span>
          <span className="ml-auto text-sm text-muted-foreground">{student.school} · {student.className}</span>
          <form action={leaveClass}><Button type="submit" variant="outline" size="sm">Leave</Button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Hi {firstName}!</h1>
        {(modules ?? []).map((m) => (
          <section key={m.id} aria-labelledby={`unit-${m.id}`}>
            <h2 id={`unit-${m.id}`} className="text-xl font-semibold">Unit {m.position}: {m.title}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {m.lessons.filter((l) => l.status === "published").map((l) => (
                <li key={l.id} className="rounded-xl border p-4">
                  <p className="font-medium">{l.title}</p>
                  <p className="text-sm text-muted-foreground">{STATUS_WORD[statusOf.get(l.id) ?? "not_started"]}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
