import "server-only";
import { createClient } from "@/lib/supabase/server";
import { schoolToday } from "@/lib/school-date";
import { fail, ok, type Result } from "@/types/result";

// Teacher side of catch-up. Runs as the signed-in teacher: the database only lets them log
// catch-up assignments for students in their own classes.

/** Assigns a catch-up for every lesson the student missed (past session, not completed). */
export async function assignCatchUp(classId: string, studentIds: string[]): Promise<Result<number>> {
  const db = await createClient();
  const [sessions, statuses] = await Promise.all([
    db.from("class_sessions").select("lesson_id").eq("class_id", classId).lt("session_date", schoolToday()).not("lesson_id", "is", null),
    db.from("lesson_status").select("student_id, lesson_id, status").in("student_id", studentIds),
  ]);
  if (sessions.error || statuses.error) return fail("We couldn't load the class schedule. Try again.");
  const done = new Set((statuses.data ?? []).filter((s) => s.status === "completed" || s.status === "exempt").map((s) => `${s.student_id}:${s.lesson_id}`));
  const lessons = [...new Set((sessions.data ?? []).map((s) => s.lesson_id as string))];
  const rows = studentIds.flatMap((sid) => lessons.filter((l) => !done.has(`${sid}:${l}`))
    .map((lesson_id) => ({ student_id: sid, class_id: classId, lesson_id, event_type: "catchup_assigned" })));
  if (!rows.length) return ok(0);
  const { error } = await db.from("activity_events").insert(rows);
  return error ? fail("Only the class's teacher can assign a catch-up.") : ok(rows.length);
}

/** Who has a catch-up assigned or finished, for the classroom chips. */
export async function getCatchUpState(classId: string): Promise<Map<string, "assigned" | "caught_up">> {
  const { data } = await (await createClient()).from("activity_events").select("student_id, event_type")
    .eq("class_id", classId).in("event_type", ["catchup_assigned", "catchup_passed"]).order("created_at");
  const state = new Map<string, "assigned" | "caught_up">();
  for (const e of data ?? []) state.set(e.student_id, e.event_type === "catchup_passed" ? "caught_up" : "assigned");
  return state;
}
