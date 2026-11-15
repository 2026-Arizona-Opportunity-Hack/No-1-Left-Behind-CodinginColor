import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeOutput } from "@/lib/python/runner";
import { getCourseMap } from "@/server/student-learning";
import type { Student } from "@/server/student-session";
import type { AnswerResult, PlayerLesson, StudentStep } from "@/types/student-lesson";

// The lesson player's server side. Every function takes the verified student and checks
// the lesson is published AND unlocked for them before reading or writing anything.

type Content = Record<string, unknown>;
type ActivityRow = {
  id: string; lesson_id: string; position: number; type: string; title: string | null;
  content: Content; concept_tag: string | null; is_core: boolean; hints: string[] | null;
};

const ACTIVITY_COLUMNS = "id, lesson_id, position, type, title, content, concept_tag, is_core, hints";

/** Is this lesson open to this student? Uses the same rules as the course map. */
async function lessonIsOpen(student: Student, lessonId: string) {
  const map = await getCourseMap(student);
  const unit = map.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  return unit?.unlocked ? { map, unit } : null;
}

export async function getPlayerLesson(student: Student, lessonId: string): Promise<PlayerLesson | null> {
  const open = await lessonIsOpen(student, lessonId);
  if (!open) return null;
  const db = createAdminClient();
  const [activities, done] = await Promise.all([
    db.from("activities").select(ACTIVITY_COLUMNS).eq("lesson_id", lessonId).order("position"),
    db.from("activity_events").select("activity_id")
      .eq("student_id", student.id).eq("lesson_id", lessonId).eq("event_type", "complete"),
  ]);
  const doneIds = new Set((done.data ?? []).map((e) => e.activity_id));

  // Next lesson: the following one in this unit, else the first lesson of the next open unit.
  const lessons = open.map.modules.filter((m) => m.unlocked).flatMap((m) => m.lessons);
  const next = lessons[lessons.findIndex((l) => l.id === lessonId) + 1] ?? null;

  return {
    id: lessonId,
    title: open.unit.lessons.find((l) => l.id === lessonId)!.title,
    unitTitle: open.unit.title,
    nextLesson: next ? { id: next.id, title: next.title } : null,
    activities: ((activities.data ?? []) as ActivityRow[]).map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title ?? "",
      isCore: a.is_core,
      hints: a.hints ?? [],
      done: doneIds.has(a.id),
      step: toStudentContent(a, student.id),
    })),
  };
}

/** Strips answers so they never reach the browser. */
function toStudentContent(a: ActivityRow, studentId: string): StudentStep {
  const c = a.content;
  const s = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");
  switch (a.type) {
    case "slide":
      return { kind: "slide", heading: s("heading"), body: s("body"), code: s("code") || undefined, output: s("output") || undefined, image_url: s("image_url") || undefined };
    case "video":
      return { kind: "video", youtube_id: s("youtube_id"), key_points: (c.key_points as string[]) ?? [] };
    case "quiz_mcq":
    case "exit_question":
      return { kind: "choice", prompt: s("prompt"), options: (c.options as string[]) ?? [] };
    case "predict_output":
      return { kind: "predict_output", prompt: s("prompt"), code: s("code") };
    case "fill_blank":
      return { kind: "fill_blank", prompt: s("prompt"), template: s("template") };
    case "parsons":
      return { kind: "parsons", prompt: s("prompt"), lines: shuffle((c.lines as string[]) ?? [], a.id + studentId) };
    case "code_exercise":
    case "fix_bug":
      return { kind: "code", prompt: s("prompt"), starter_code: s("starter_code"), tests: (c.tests as never[]) ?? [] };
    case "worksheet":
      return { kind: "worksheet", instructions: s("instructions") || undefined, fields: (c.fields as never[]) ?? [] };
    default:
      return { kind: "slide", heading: a.title ?? "", body: "" };
  }
}

/** Same order every time for the same student, and never already solved. */
function shuffle(lines: string[], seed: string): string[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...lines];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.every((l, i) => l === lines[i]) && out.length > 1 ? [...out.slice(1), out[0]] : out;
}

/** Loads one activity with its full content (answers included), only if its lesson is open. */
export async function getOpenActivity(student: Student, activityId: string): Promise<ActivityRow | null> {
  const { data } = await createAdminClient().from("activities").select(ACTIVITY_COLUMNS).eq("id", activityId).maybeSingle();
  if (!data || !(await lessonIsOpen(student, data.lesson_id))) return null;
  return data as ActivityRow;
}

export function checkAnswer(a: ActivityRow, answer: unknown): AnswerResult {
  const c = a.content;
  const hint = a.hints?.[0] ? ` Hint: ${a.hints[0]}` : "";
  let correct = false;
  if (a.type === "quiz_mcq" || a.type === "exit_question") correct = Number(answer) === c.answer;
  else if (a.type === "predict_output") correct = normalizeOutput(String(answer)) === normalizeOutput(String(c.answer ?? ""));
  else if (a.type === "fill_blank") correct = ((c.answers as string[]) ?? []).some((x) => x.trim() === String(answer).trim());
  else if (a.type === "parsons")
    correct = Array.isArray(answer) && JSON.stringify(answer.map((l) => String(l).trimEnd())) === JSON.stringify(((c.lines as string[]) ?? []).map((l) => l.trimEnd()));
  const explanation = typeof c.explanation === "string" ? ` ${c.explanation}` : "";
  return correct
    ? { correct, message: `That's right!${explanation}` }
    : { correct, message: `Not quite yet. Have another look and try again.${hint}` };
}

type EventInput = {
  event_type: "view" | "attempt" | "run" | "check" | "hint" | "submit" | "complete";
  correct?: boolean; tests_passed?: number; tests_total?: number; duration_ms?: number; payload?: Content;
};

export async function recordEvent(student: Student, a: ActivityRow, e: EventInput) {
  const db = createAdminClient();
  const { error } = await db.from("activity_events").insert({
    student_id: student.id, class_id: student.classId, activity_id: a.id, lesson_id: a.lesson_id,
    concept_tag: a.concept_tag, ...e,
    duration_ms: e.duration_ms === undefined ? null : Math.max(0, Math.min(Math.round(e.duration_ms), 2 * 60 * 60 * 1000)),
  });
  if (error) throw new Error("We couldn't save your progress. Check your internet and try again.");
  if (e.event_type === "complete") await refreshLessonStatus(student, a.lesson_id);
  else await markStarted(student, a.lesson_id);
}

async function markStarted(student: Student, lessonId: string) {
  const db = createAdminClient();
  const { data } = await db.from("lesson_status").select("status").eq("student_id", student.id).eq("lesson_id", lessonId).maybeSingle();
  if (!data || data.status === "not_started") {
    await db.from("lesson_status").upsert({ student_id: student.id, lesson_id: lessonId, status: "in_progress", updated_at: new Date().toISOString() });
  }
}

/** Completed when every core step is done; otherwise in progress. Never overwrites "exempt". */
async function refreshLessonStatus(student: Student, lessonId: string) {
  const db = createAdminClient();
  const [core, done, current] = await Promise.all([
    db.from("activities").select("id").eq("lesson_id", lessonId).eq("is_core", true),
    db.from("activity_events").select("activity_id").eq("student_id", student.id).eq("lesson_id", lessonId).eq("event_type", "complete"),
    db.from("lesson_status").select("status").eq("student_id", student.id).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (current.data?.status === "exempt") return;
  const doneIds = new Set((done.data ?? []).map((e) => e.activity_id));
  const status = (core.data ?? []).every((a) => doneIds.has(a.id)) ? "completed" : "in_progress";
  await db.from("lesson_status").upsert({ student_id: student.id, lesson_id: lessonId, status, updated_at: new Date().toISOString() });
}
