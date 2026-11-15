import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateGain, gainByConcept, studentScores, type ConceptGain, type GainSummary, type TestResponse } from "@/lib/learning-gain";
import { isUuid } from "@/lib/validate";
import { fetchAll } from "@/server/fetch-all";
import { loadClassroom, loadTopicMastery } from "@/server/dashboard";
import type { Classroom } from "@/types/dashboard";
import { fail, ok, type Result } from "@/types/result";

// Builds the read API's answers (issue #11). Everything returned is an aggregate: no student
// names, no student ids. Uses the secret-key client, so only call it after verifyApiKey().

type Db = SupabaseClient;
const NO_CLASS = "No class with that id.";
const one = <T>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

const completionPct = (room: Classroom) =>
  room.students.length === 0 ? 0 : Math.round(room.students.reduce((sum, s) => sum + s.percent_complete, 0) / room.students.length);

export type GainRow = TestResponse & { student_id: string; module_id: string };

/** Pre/post answers, optionally for one class. Module and concept filtering happen in the callers. */
async function loadGainRows(db: Db, classId?: string): Promise<GainRow[]> {
  const rows = await fetchAll<{
    student_id: string;
    correct: boolean;
    students: unknown;
    assessment_questions: unknown;
  }>((from, to) => {
    let q = db
      .from("assessment_responses")
      .select("student_id, correct, students!inner(class_id), assessment_questions!inner(concept_tag, assessments!inner(kind, module_id))")
      .order("id");
    if (classId) q = q.eq("students.class_id", classId);
    return q.range(from, to);
  });
  return rows.flatMap((r) => {
    const question = one(r.assessment_questions as { concept_tag: string; assessments: unknown } | null);
    const assessment = one(question?.assessments as { kind: "pre" | "post"; module_id: string } | null);
    return question && assessment
      ? [{ student_id: r.student_id, correct: r.correct, kind: assessment.kind, concept_tag: question.concept_tag, module_id: assessment.module_id }]
      : [];
  });
}

/** One entry per student, so students missing a test are counted as missing. */
function perStudent(rows: TestResponse[]) {
  const byStudent = new Map<string, TestResponse[]>();
  for (const r of rows) byStudent.set(r.student_id!, [...(byStudent.get(r.student_id!) ?? []), r]);
  return [...byStudent.values()].map(studentScores);
}

export type ApiClass = { id: string; name: string; school: string; students: number; completion_pct: number };
export async function listClasses(db: Db): Promise<Result<ApiClass[]>> {
  const { data, error } = await db.from("classes").select("id, name, school").order("name");
  if (error) return fail("Could not read classes.");
  const rooms = await Promise.all((data ?? []).map((c) => loadClassroom(db, c.id)));
  const out: ApiClass[] = [];
  for (const room of rooms) if (room.ok) out.push({ id: room.data.class.id, name: room.data.class.name, school: room.data.class.school, students: room.data.students.length, completion_pct: completionPct(room.data) });
  return ok(out);
}

export type ApiClassSummary = ApiClass & { active_last_7_days: number; behind_count: number; learning_gain: GainSummary };
export async function classSummary(db: Db, classId: string, now = new Date()): Promise<Result<ApiClassSummary>> {
  const room = await loadClassroom(db, classId, now);
  if (!room.ok) return fail(NO_CLASS);
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const rows = await loadGainRows(db, classId);
  return ok({
    id: room.data.class.id,
    name: room.data.class.name,
    school: room.data.class.school,
    students: room.data.students.length,
    completion_pct: completionPct(room.data),
    active_last_7_days: room.data.students.filter((s) => s.last_active_at && new Date(s.last_active_at).getTime() >= weekAgo).length,
    behind_count: room.data.counts.behind,
    learning_gain: aggregateGain(perStudent(rows)),
  });
}

export type ApiLearningGain = GainSummary & { by_concept?: ConceptGain[] };
export async function learningGainReport(db: Db, f: { classId?: string; moduleId?: string; concept?: string }): Promise<Result<ApiLearningGain>> {
  if (f.classId) {
    if (!isUuid(f.classId)) return fail(NO_CLASS);
    const { data } = await db.from("classes").select("id").eq("id", f.classId).maybeSingle();
    if (!data) return fail(NO_CLASS);
  }
  let rows: TestResponse[] = await loadGainRows(db, f.classId);
  if (f.moduleId) rows = (rows as GainRow[]).filter((r) => r.module_id === f.moduleId);
  if (f.concept) rows = rows.filter((r) => r.concept_tag === f.concept);
  const summary = aggregateGain(perStudent(rows));
  return ok(f.concept ? summary : { ...summary, by_concept: gainByConcept(rows) });
}

export type ApiConceptMastery = { concept_tag: string; percent_mastered: number; percent_struggling: number; n: number };
export async function conceptMastery(db: Db, classId: string): Promise<Result<ApiConceptMastery[]>> {
  const result = await loadTopicMastery(db, classId);
  if (!result.ok) return fail(NO_CLASS);
  return ok(result.data.map((m) => ({ concept_tag: m.concept_tag, percent_mastered: m.percent_mastered, percent_struggling: m.percent_struggling, n: m.students_counted })));
}
