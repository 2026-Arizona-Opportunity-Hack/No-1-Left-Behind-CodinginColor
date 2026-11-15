import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClassroom, buildMastery, doneActivityIds, type ClassData, type CurriculumLesson } from "@/lib/classroom";
import type { ConceptMastery } from "@/lib/mastery";
import { isUuid } from "@/lib/validate";
import { createClient } from "@/lib/supabase/server";
import type { StatusEvent } from "@/lib/student-status";
import type { Classroom, StudentActivityDetail, StudentDetail } from "@/types/dashboard";
import { fail, ok, type Result } from "@/types/result";

// Teacher dashboard functions (issue #10). They run as the signed-in staff member, so the
// database's access rules decide what an instructor can see: another teacher's class simply
// isn't there. `load*` variants take a client so the read API can reuse them with the secret key.

type Db = SupabaseClient;
const NOT_FOUND = "We couldn't find that. It may belong to another teacher's class.";
const SAVE_FAILED = "We couldn't save that. Please try again.";
const one = <T>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

/** Reads every page of a query (the database returns at most 1,000 rows per request). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error("Could not read class data.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

/** Published lessons in course order, each with its activities in order. */
async function loadCurriculum(db: Db): Promise<CurriculumLesson[]> {
  const { data, error } = await db
    .from("lessons")
    .select("id, title, position, modules!inner(position, status), activities(id, position, type, title, concept_tag, is_core)")
    .eq("status", "published")
    .eq("modules.status", "published");
  if (error) throw new Error("Could not read the curriculum.");
  return (data ?? [])
    .map((l) => ({ l, m: one(l.modules as { position: number } | { position: number }[]) }))
    .sort((a, b) => (a.m?.position ?? 0) - (b.m?.position ?? 0) || a.l.position - b.l.position)
    .map(({ l }) => ({
      id: l.id,
      title: l.title,
      activities: [...(l.activities ?? [])].sort((a, b) => a.position - b.position),
    }));
}

async function loadClassData(db: Db, classId: string): Promise<Result<ClassData>> {
  if (!isUuid(classId)) return fail(NOT_FOUND);
  try {
    const { data: cls } = await db.from("classes").select("id, name, school, class_code").eq("id", classId).maybeSingle();
    if (!cls) return fail(NOT_FOUND);

    const [students, sessionRows, events, lessons] = await Promise.all([
      fetchAll((f, t) => db.from("students").select("id, display_name").eq("class_id", classId).order("id").range(f, t)),
      fetchAll((f, t) => db.from("class_sessions").select("id, session_date, lesson_id, lessons(title)").eq("class_id", classId).order("session_date").order("id").range(f, t)),
      fetchAll<StatusEvent & { student_id: string }>((f, t) =>
        db.from("activity_events")
          .select("student_id, event_type, activity_id, lesson_id, correct, concept_tag, duration_ms, created_at")
          .eq("class_id", classId).order("created_at").order("id").range(f, t)),
      loadCurriculum(db),
    ]);

    const sessionIds = sessionRows.map((s) => s.id);
    const studentIds = students.map((s) => s.id);
    const [attendance, lessonStatuses] = await Promise.all([
      sessionIds.length ? fetchAll((f, t) => db.from("attendance").select("session_id, student_id, status").in("session_id", sessionIds).order("session_id").order("student_id").range(f, t)) : [],
      studentIds.length ? fetchAll((f, t) => db.from("lesson_status").select("student_id, lesson_id, status").in("student_id", studentIds).order("student_id").order("lesson_id").range(f, t)) : [],
    ]);

    return ok({
      cls,
      students,
      sessions: sessionRows.map((s) => ({
        id: s.id, session_date: s.session_date, lesson_id: s.lesson_id,
        lesson_title: one(s.lessons as { title: string } | { title: string }[])?.title ?? null,
      })),
      attendance,
      events,
      lessonStatuses,
      lessons,
    });
  } catch {
    return fail("We couldn't load the class right now. Please try again.");
  }
}

/** The live classroom for one class (the teacher's roster screen). */
export async function loadClassroom(db: Db, classId: string, now = new Date()): Promise<Result<Classroom>> {
  const loaded = await loadClassData(db, classId);
  return loaded.ok ? ok(buildClassroom(loaded.data, now)) : loaded;
}
export async function getClassroom(classId: string): Promise<Result<Classroom>> {
  return loadClassroom(await createClient(), classId);
}

/** "80% stuck on loops": per concept, who has mastered it and who is struggling. */
export async function loadTopicMastery(db: Db, classId: string): Promise<Result<ConceptMastery[]>> {
  const loaded = await loadClassData(db, classId);
  return loaded.ok ? ok(buildMastery(loaded.data)) : loaded;
}
export async function getTopicMastery(classId: string): Promise<Result<ConceptMastery[]>> {
  return loadTopicMastery(await createClient(), classId);
}

/** One student's work, step by step: what they did, their latest code, their worksheet answers. */
export async function getStudentDetail(studentId: string): Promise<Result<StudentDetail>> {
  if (!isUuid(studentId)) return fail(NOT_FOUND);
  const db = await createClient();
  try {
    const { data: student } = await db.from("students").select("id, display_name, class_id, start_module_id").eq("id", studentId).maybeSingle();
    if (!student) return fail(NOT_FOUND);

    const [lessons, events, statusRows, unlocks] = await Promise.all([
      loadCurriculum(db),
      fetchAll<StatusEvent & { payload: Record<string, unknown> | null }>((f, t) =>
        db.from("activity_events")
          .select("event_type, activity_id, lesson_id, correct, concept_tag, duration_ms, created_at, payload")
          .eq("student_id", studentId).order("created_at").order("id").range(f, t)),
      db.from("lesson_status").select("lesson_id, status").eq("student_id", studentId).then((r) => r.data ?? []),
      db.from("unlock_overrides").select("module_id").eq("student_id", studentId).then((r) => r.data ?? []),
    ]);
    const statuses = Object.fromEntries(statusRows.map((r) => [r.lesson_id, r.status as string]));
    const done = doneActivityIds(events, statuses, lessons);

    const activities: StudentActivityDetail[] = lessons.flatMap((lesson) =>
      lesson.activities.map((a) => {
        const evs = events.filter((e) => e.activity_id === a.id);
        const tries = evs.filter((e) => e.event_type === "attempt" || e.event_type === "check");
        const graded = tries.filter((e) => e.correct !== null)[0]; // events are oldest first
        const lastCheck = [...evs].reverse().find((e) => e.event_type === "check" && typeof e.payload?.code === "string");
        const lastSubmit = [...evs].reverse().find((e) => e.event_type === "submit" && e.payload?.answers && typeof e.payload.answers === "object");
        return {
          activity_id: a.id,
          lesson_title: lesson.title,
          position: a.position,
          type: a.type,
          title: a.title,
          status: done.has(a.id) ? ("done" as const) : evs.length > 0 ? ("in_progress" as const) : ("not_started" as const),
          correct_first_try: graded ? graded.correct : null,
          attempts: tries.length,
          hints: evs.filter((e) => e.event_type === "hint").length,
          time_ms: evs.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0),
          last_code: (lastCheck?.payload?.code as string | undefined) ?? null,
          worksheet_answers: (lastSubmit?.payload?.answers as Record<string, string> | undefined) ?? null,
        };
      }),
    );

    return ok({
      student: { id: student.id, display_name: student.display_name, class_id: student.class_id },
      start_module_id: student.start_module_id,
      unlocked_module_ids: unlocks.map((u) => u.module_id),
      activities,
    });
  } catch {
    return fail("We couldn't load that student right now. Please try again.");
  }
}

// ---------- Teacher actions ----------

/** Mark a student present or absent for a class session. */
export async function setAttendance(sessionId: string, studentId: string, status: "present" | "absent"): Promise<Result<void>> {
  if (!isUuid(sessionId) || !isUuid(studentId) || !["present", "absent"].includes(status)) return fail(NOT_FOUND);
  const db = await createClient();
  const [{ data: session }, { data: student }] = await Promise.all([
    db.from("class_sessions").select("class_id").eq("id", sessionId).maybeSingle(),
    db.from("students").select("class_id").eq("id", studentId).maybeSingle(),
  ]);
  if (!session || !student) return fail(NOT_FOUND);
  if (session.class_id !== student.class_id) return fail("That student isn't in this class.");
  const { error } = await db.from("attendance").upsert({ session_id: sessionId, student_id: studentId, status }, { onConflict: "session_id,student_id" });
  return error ? fail(SAVE_FAILED) : ok(undefined);
}

/** Where a late joiner starts. Pass null to clear it. */
export async function setStartModule(studentId: string, moduleId: string | null): Promise<Result<void>> {
  if (!isUuid(studentId) || (moduleId !== null && !isUuid(moduleId))) return fail(NOT_FOUND);
  const db = await createClient();
  const { data, error } = await db.from("students").update({ start_module_id: moduleId }).eq("id", studentId).select("id");
  if (error) return fail(SAVE_FAILED);
  return data && data.length > 0 ? ok(undefined) : fail(NOT_FOUND);
}

/** Let one student into a module before the class reaches it. */
export async function unlockModule(studentId: string, moduleId: string): Promise<Result<void>> {
  if (!isUuid(studentId) || !isUuid(moduleId)) return fail(NOT_FOUND);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from("unlock_overrides").upsert({ student_id: studentId, module_id: moduleId, created_by: user?.id ?? null }, { onConflict: "student_id,module_id" });
  return error ? fail(SAVE_FAILED) : ok(undefined);
}

/** Take back an unlock. */
export async function lockModule(studentId: string, moduleId: string): Promise<Result<void>> {
  if (!isUuid(studentId) || !isUuid(moduleId)) return fail(NOT_FOUND);
  const { error } = await (await createClient()).from("unlock_overrides").delete().eq("student_id", studentId).eq("module_id", moduleId);
  return error ? fail(SAVE_FAILED) : ok(undefined);
}

/** Skip a lesson for a student. Stored as 'exempt', never as completed, and logged as a 'skip' event. */
export async function setLessonExempt(studentId: string, lessonId: string): Promise<Result<void>> {
  if (!isUuid(studentId) || !isUuid(lessonId)) return fail(NOT_FOUND);
  const db = await createClient();
  const { data: student } = await db.from("students").select("class_id").eq("id", studentId).maybeSingle();
  if (!student) return fail(NOT_FOUND);
  const { error } = await db.from("lesson_status").upsert(
    { student_id: studentId, lesson_id: lessonId, status: "exempt", updated_at: new Date().toISOString() },
    { onConflict: "student_id,lesson_id" },
  );
  if (error) return fail(SAVE_FAILED);
  await db.from("activity_events").insert({ student_id: studentId, class_id: student.class_id, lesson_id: lessonId, event_type: "skip" });
  return ok(undefined);
}
