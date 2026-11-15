import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCourseMap,
  type AssessmentProgress,
  type LessonStatus,
} from "@/lib/course-map";
import type { Student } from "@/server/student-session";

/** Reads only this verified student's class assignments and own progress. Never returns answer keys. */
export const getCourseMap = cache(async (student: Student) => {
  const db = createAdminClient();
  const assignments = await db
    .from("class_modules")
    .select(
      "module_id,position,modules(id,title,description,status,lessons(id,title,position,status))",
    )
    .eq("class_id", student.classId)
    .order("position");
  if (assignments.error)
    throw new Error("We couldn't load your assigned course. Please try again.");
  const moduleIds = (assignments.data ?? []).map((a) => a.module_id);
  const [statuses, me, unlocks, tests, responses] = await Promise.all([
    db
      .from("lesson_status")
      .select("lesson_id,status")
      .eq("student_id", student.id),
    db
      .from("students")
      .select("start_module_id")
      .eq("id", student.id)
      .eq("class_id", student.classId)
      .single(),
    db
      .from("unlock_overrides")
      .select("module_id")
      .eq("student_id", student.id),
    db
      .from("assessments")
      .select("id,module_id,kind,assessment_questions(id)")
      .eq("reviewed", true)
      .in("module_id", moduleIds),
    db
      .from("assessment_responses")
      .select("question_id")
      .eq("student_id", student.id),
  ]);
  for (const r of [assignments, statuses, me, unlocks, tests, responses])
    if (r.error)
      throw new Error(
        "We couldn't load your course. Please refresh or ask your teacher for help.",
      );
  type Assigned = {
    position: number;
    modules: {
      id: string;
      title: string;
      description: string | null;
      status: string;
      lessons: {
        id: string;
        title: string;
        position: number;
        status: string;
      }[];
    } | null;
  };
  const modules = (assignments.data as unknown as Assigned[])
    .filter((a) => a.modules?.status === "published")
    .map((a) => ({
      ...a.modules!,
      position: a.position,
      lessons: a.modules!.lessons.filter((l) => l.status === "published"),
    }));
  const answered = new Set((responses.data ?? []).map((r) => r.question_id));
  const assessments = new Map<string, AssessmentProgress>();
  for (const m of modules) {
    const state: AssessmentProgress = { pre: "none", post: "none" };
    for (const t of (tests.data ?? []).filter(
      (t) => t.module_id === m.id && t.assessment_questions.length,
    )) {
      if (t.kind === "pre" || t.kind === "post")
        state[t.kind as "pre" | "post"] = t.assessment_questions.every((q) =>
          answered.has(q.id),
        )
          ? "done"
          : "todo";
    }
    assessments.set(m.id, state);
  }
  return buildCourseMap({
    modules,
    assessments,
    statusByLesson: new Map(
      (statuses.data ?? []).map((r) => [r.lesson_id, r.status as LessonStatus]),
    ),
    startModuleId: me.data?.start_module_id ?? null,
    unlockedModuleIds: new Set((unlocks.data ?? []).map((r) => r.module_id)),
  });
});
