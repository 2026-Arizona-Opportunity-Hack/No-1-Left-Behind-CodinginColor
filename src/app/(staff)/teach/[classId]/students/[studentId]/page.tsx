import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { HelpPanel, type Guide } from "@/components/teach/help-panel";
import { Button } from "@/components/ui/button";
import { ACTIVITY_LABEL } from "@/lib/activity-labels";
import { STATUS_DISPLAY, formatDuration } from "@/lib/status-display";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth";
import { getClassroom, getStudentDetail } from "@/server/dashboard";
import type { StudentActivityDetail } from "@/types/dashboard";
import { saveStartModule, skipLesson, toggleUnlock } from "./actions";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Student · CIC Launchpad" };

type Props = { params: Promise<{ classId: string; studentId: string }> };
type CurriculumModule = { id: string; title: string; position: number; lessons: { id: string; title: string; position: number; activities: { id: string; type: string; title: string | null; position: number; teaching_guide: Guide | null; content: { fields?: { id: string; label: string }[]; tests?: import("@/lib/python/runner").CodeCheck[] } }[] }[] };

const STEP_STATUS = {
  done: { icon: "✓", word: "Done", className: "text-[#047D13]" },
  in_progress: { icon: "◐", word: "Started", className: "text-[#8A4B00]" },
  not_started: { icon: "○", word: "Not started", className: "text-muted-foreground" },
};

export default async function StudentPage({ params }: Props) {
  await connection(); // per-user, live data: render at request time
  const { classId, studentId } = await params;
  await requirePermission("classes.manage", `/teach/${classId}/students/${studentId}`);
  const supabase = await createClient();
  const [detail, room, curriculum] = await Promise.all([
    getStudentDetail(studentId),
    getClassroom(classId),
    supabase.from("modules")
      .select("id, title, position, lessons(id, title, position, activities(id, type, title, position, teaching_guide, content))")
      .eq("status", "published").order("position")
      .order("position", { referencedTable: "lessons" }).order("position", { referencedTable: "lessons.activities" }),
  ]);
  const row = room.ok ? room.data.students.find((s) => s.id === studentId) : undefined;
  if (!detail.ok || !row || detail.data.student.class_id !== classId) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t find that student</h1>
        <Link href={`/teach/${classId}`} className="font-medium underline underline-offset-4">Back to the classroom</Link>
      </div>
    );
  }
  const d = detail.data;
  const modules = (curriculum.data ?? []) as CurriculumModule[];
  const byActivity = new Map(d.activities.map((a) => [a.activity_id, a]));
  const status = STATUS_DISPLAY[row.status];
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;
  const ids = <>{hidden("classId", classId)}{hidden("studentId", studentId)}</>;

  // "Help me teach this": the step they're stuck on, its checks and the best teaching guide in that lesson.
  const stuckLesson = row.status === "needs_help" && row.current ? modules.flatMap((m) => m.lessons).find((l) => l.id === row.current!.lesson_id) : undefined;
  const stuck = stuckLesson?.activities.find((a) => a.position === row.current!.step);
  const fallbackGuide = stuckLesson?.activities.find((a) => a.teaching_guide?.about);
  const stuckWork = stuck ? byActivity.get(stuck.id) : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href={`/teach/${classId}`} className="inline-block text-base text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> Back to the classroom</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{row.label}</h1>
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-semibold ${status.chip}`}>
            <span aria-hidden="true">{status.icon}</span>{status.word}
          </span>
        </div>
        <p className="text-muted-foreground">
          {row.percent_complete}% done · {formatDuration(row.time_on_task_ms)} on task
          {row.reasons.length > 0 && <> · {row.reasons.join(" · ")}</>}
        </p>
      </div>

      {stuckLesson && stuck && (
        <HelpPanel studentLabel={row.label} stepTitle={stuck.title || ACTIVITY_LABEL[stuck.type]} stepNumber={stuck.position}
          lessonTitle={stuckLesson.title} code={stuckWork?.last_code ?? null} checks={stuck.content.tests ?? []}
          attempts={stuckWork?.attempts ?? 0} hints={stuckWork?.hints ?? 0} timeLabel={`${formatDuration(stuckWork?.time_ms ?? 0)} on this step`}
          guide={stuck.teaching_guide?.about ? stuck.teaching_guide : fallbackGuide?.teaching_guide ?? null}
          guideFrom={!stuck.teaching_guide?.about && fallbackGuide ? fallbackGuide.title || ACTIVITY_LABEL[fallbackGuide.type] : null} />
      )}

      <section aria-labelledby="pace-heading" className="grid gap-4 rounded-3xl bg-card p-5 md:grid-cols-2">
        <h2 id="pace-heading" className="sr-only">Where this student works</h2>
        <form action={saveStartModule} className="space-y-2">
          {ids}
          <label htmlFor="moduleId" className="block font-medium">Start this student at</label>
          <p className="text-sm text-muted-foreground">For students who joined late. Earlier units stay open but won&apos;t hold them back.</p>
          <div className="flex gap-2">
            <select id="moduleId" name="moduleId" defaultValue={d.start_module_id ?? ""} className="h-9 flex-1 rounded-md border bg-background px-2">
              <option value="">The beginning (Unit 1)</option>
              {modules.map((m) => <option key={m.id} value={m.id}>Unit {m.position}: {m.title}</option>)}
            </select>
            <Button type="submit" variant="outline">Save</Button>
          </div>
        </form>
        <div className="space-y-2">
          <p className="font-medium">Unlock a unit early</p>
          <p className="text-sm text-muted-foreground">Lets this student into a unit before finishing the one before it.</p>
          <ul className="space-y-1">
            {modules.slice(1).map((m) => {
              const unlocked = d.unlocked_module_ids.includes(m.id);
              return (
                <li key={m.id}>
                  <form action={toggleUnlock} className="flex items-center justify-between gap-2">
                    {ids}{hidden("moduleId", m.id)}{hidden("unlocked", String(unlocked))}
                    <span>{unlocked ? "🔓" : "🔒"} Unit {m.position}: {m.title}</span>
                    <Button type="submit" size="sm" variant="outline">{unlocked ? "Lock again" : "Unlock"}</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="work-heading" className="space-y-4">
        <h2 id="work-heading" className="text-xl font-semibold">Their work, step by step</h2>
        {modules.map((m) => m.lessons.map((lesson) => {
          const steps = lesson.activities.map((a) => ({ a, s: byActivity.get(a.id) })).filter((x): x is { a: typeof x.a; s: StudentActivityDetail } => Boolean(x.s));
          const touched = steps.some((x) => x.s.status !== "not_started");
          const doneCount = steps.filter((x) => x.s.status === "done").length;
          return (
            <details key={lesson.id} open={touched && doneCount < steps.length} className="rounded-2xl bg-card p-4">
              <summary className="cursor-pointer font-medium">
                Unit {m.position} · {lesson.title}
                <span className={`ml-2 rounded-full px-2.5 py-0.5 text-sm font-medium ${!touched ? "bg-background text-muted-foreground" : doneCount === steps.length ? "bg-ontrack text-ontrack-ink" : "bg-sun text-sun-ink"}`}>{!touched ? "Not started" : doneCount === steps.length ? "✓ " : ""}{touched ? `${doneCount} of ${steps.length} steps done` : ""}</span>
              </summary>
              <ol className="mt-3 space-y-3">
                {steps.map(({ a, s }) => {
                  const st = STEP_STATUS[s.status];
                  const labels = new Map((a.content.fields ?? []).map((f) => [f.id, f.label]));
                  return (
                    <li key={a.id} className="rounded-lg bg-muted/40 p-3">
                      <p className="flex flex-wrap items-baseline gap-x-3">
                        <span className={`font-medium ${st.className}`}><span aria-hidden="true">{st.icon}</span> {st.word}</span>
                        <span className="font-medium">{s.position}. {s.title || ACTIVITY_LABEL[s.type]}</span>
                        <span className="text-sm text-muted-foreground">
                          {ACTIVITY_LABEL[s.type]}
                          {s.correct_first_try !== null && ` · ${s.correct_first_try ? "right first try" : "not right first try"}`}
                          {s.attempts > 0 && ` · ${s.attempts} ${s.attempts === 1 ? "try" : "tries"}`}
                          {s.hints > 0 && ` · ${s.hints} hint${s.hints === 1 ? "" : "s"}`}
                          {s.time_ms > 0 && ` · ${formatDuration(s.time_ms)}`}
                        </span>
                      </p>
                      {s.last_code && (
                        <details className="mt-2"><summary className="cursor-pointer text-sm font-medium">Their latest code</summary>
                          <pre className="mt-2 overflow-auto rounded-md bg-[#0F2E1C] p-3 font-mono text-sm text-[#E6F4EA]">{s.last_code}</pre></details>
                      )}
                      {s.worksheet_answers && (
                        <dl className="mt-2 space-y-1 rounded-md border bg-background p-3 text-sm">
                          <p className="font-medium">Worksheet answers</p>
                          {Object.entries(s.worksheet_answers).map(([k, v]) => (
                            <div key={k}><dt className="text-muted-foreground">{labels.get(k) ?? k}</dt><dd className="whitespace-pre-wrap">{v || "—"}</dd></div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ol>
              {doneCount < steps.length && (
                <form action={skipLesson} className="mt-3">
                  {ids}{hidden("lessonId", lesson.id)}
                  <Button type="submit" size="sm" variant="ghost">Skip this lesson for {row.label}</Button>
                  <span className="ml-2 text-xs text-muted-foreground">Marked as skipped, never as completed.</span>
                </form>
              )}
            </details>
          );
        }))}
      </section>
    </div>
  );
}
