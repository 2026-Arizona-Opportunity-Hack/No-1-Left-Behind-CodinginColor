import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCourseMap, type CourseMap, type LessonStatus } from "@/lib/course-map";
import type { Student } from "@/server/student-session";

// Student-side data. Students have no Supabase account, so these use the secret-key client,
// and every query is pinned to the verified student's own id (from the signed session).

export async function getCourseMap(student: Student): Promise<CourseMap> {
  const db = createAdminClient();
  const [modules, statuses, me, unlocks] = await Promise.all([
    db.from("modules")
      .select("id, title, position, lessons(id, title, position, status)")
      .eq("status", "published")
      .order("position"),
    db.from("lesson_status").select("lesson_id, status").eq("student_id", student.id),
    db.from("students").select("start_module_id").eq("id", student.id).single(),
    db.from("unlock_overrides").select("module_id").eq("student_id", student.id),
  ]);
  if (modules.error) throw new Error(`Couldn't load the course: ${modules.error.message}`);

  return buildCourseMap({
    modules: (modules.data ?? []).map((m) => ({
      ...m,
      lessons: m.lessons.filter((l) => l.status === "published"),
    })),
    statusByLesson: new Map((statuses.data ?? []).map((s) => [s.lesson_id, s.status as LessonStatus])),
    startModuleId: me.data?.start_module_id ?? null,
    unlockedModuleIds: new Set((unlocks.data ?? []).map((u) => u.module_id)),
  });
}
