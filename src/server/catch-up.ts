import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolToday } from "@/lib/school-date";
import { refreshLessonStatus } from "@/server/lesson-player";
import type { Student } from "@/server/student-session";

// Catch-up mode (mentors' ask: "a student misses a session or a week; how does the teacher help?").
// A lesson is MISSED when its class session date has passed and the student hasn't completed it
// (whether they were absent or just didn't finish). Exempt lessons are never missed.

export type MissedLesson = { lessonId: string; title: string; date: string; absent: boolean; assigned: boolean };

export async function getMissedLessons(student: Student): Promise<MissedLesson[]> {
  const db = createAdminClient();
  const today = schoolToday();
  const [sessions, statuses, attendance, assigned] = await Promise.all([
    db.from("class_sessions").select("id, session_date, lesson_id, lessons(title, status)")
      .eq("class_id", student.classId).lt("session_date", today).not("lesson_id", "is", null).order("session_date"),
    db.from("lesson_status").select("lesson_id, status").eq("student_id", student.id),
    db.from("attendance").select("session_id, status").eq("student_id", student.id),
    db.from("activity_events").select("lesson_id").eq("student_id", student.id).eq("event_type", "catchup_assigned"),
  ]);
  const done = new Set((statuses.data ?? []).filter((s) => s.status === "completed" || s.status === "exempt").map((s) => s.lesson_id));
  const absent = new Set((attendance.data ?? []).filter((a) => a.status === "absent").map((a) => a.session_id));
  const assignedIds = new Set((assigned.data ?? []).map((e) => e.lesson_id));
  const seen = new Set<string>();
  const missed: MissedLesson[] = [];
  for (const s of sessions.data ?? []) {
    const lesson = s.lessons as unknown as { title: string; status: string } | null;
    if (!s.lesson_id || !lesson || lesson.status !== "published" || done.has(s.lesson_id) || seen.has(s.lesson_id)) continue;
    seen.add(s.lesson_id);
    missed.push({ lessonId: s.lesson_id, title: lesson.title, date: s.session_date, absent: absent.has(s.id), assigned: assignedIds.has(s.lesson_id) });
  }
  return missed;
}

/** Today's lesson for the student's class (where they rejoin after catching up). */
export async function getTodaysLesson(student: Student): Promise<{ id: string; title: string } | null> {
  const { data } = await createAdminClient().from("class_sessions").select("lesson_id, lessons(title)")
    .eq("class_id", student.classId).lte("session_date", schoolToday()).not("lesson_id", "is", null)
    .order("session_date", { ascending: false }).limit(1).maybeSingle();
  return data?.lesson_id ? { id: data.lesson_id, title: (data.lessons as unknown as { title: string }).title } : null;
}

export async function getRecap(lessonId: string): Promise<{ minutes: number; key_points: string[] } | null> {
  const { data } = await createAdminClient().from("lessons").select("recap").eq("id", lessonId).maybeSingle();
  const recap = data?.recap as { minutes?: number; key_points?: string[] } | null;
  return recap?.key_points?.length ? { minutes: recap.minutes ?? 2, key_points: recap.key_points } : null;
}

/** Logged when a student finishes their catch-up path; the teacher sees "Caught up". */
export async function markCaughtUp(student: Student, lessonId: string) {
  const db = createAdminClient();
  // The recap stands in for the lesson's slides and video, so record those as done (once).
  const [{ data: views }, { data: done }] = await Promise.all([
    db.from("activities").select("id").eq("lesson_id", lessonId).eq("is_core", true).in("type", ["slide", "video"]),
    db.from("activity_events").select("activity_id").eq("student_id", student.id).eq("lesson_id", lessonId).eq("event_type", "complete"),
  ]);
  const doneIds = new Set((done ?? []).map((e) => e.activity_id));
  const missingViews = (views ?? []).filter((v) => !doneIds.has(v.id));
  if (missingViews.length) {
    await db.from("activity_events").insert(missingViews.map((v) => ({
      student_id: student.id, class_id: student.classId, lesson_id: lessonId, activity_id: v.id,
      event_type: "complete", payload: { via: "catch-up recap" },
    })));
  }
  await refreshLessonStatus(student, lessonId);
  const { data: status } = await db.from("lesson_status").select("status").eq("student_id", student.id).eq("lesson_id", lessonId).maybeSingle();
  if (status?.status !== "completed") return false;
  // Log it once per lesson (finishing screen can run twice, e.g. a refresh).
  const { count } = await db.from("activity_events").select("id", { count: "exact", head: true })
    .eq("student_id", student.id).eq("lesson_id", lessonId).eq("event_type", "catchup_passed");
  if (!count) await db.from("activity_events").insert({ student_id: student.id, class_id: student.classId, lesson_id: lessonId, event_type: "catchup_passed" });
  return true;
}
