import "server-only";
import { aggregateGain, gainByConcept, studentScores, type ConceptGain, type GainSummary, type TestResponse } from "@/lib/learning-gain";
import { displayLabels } from "@/lib/roster-csv";
import { createClient } from "@/lib/supabase/server";

// Learning-gain results for staff. Runs as the signed-in user, so the database decides scope:
// a teacher only gets their own classes' students, CIC staff get everyone.

export type ResultStudent = { id: string; name: string; label: string; classId: string; pre_pct: number | null; post_pct: number | null };
export type ResultClass = { id: string; name: string; school: string; gain: GainSummary };
export type Results = {
  units: { id: string; title: string }[];
  unitId: string | null;
  classes: ResultClass[];
  overall: GainSummary;
  byTopic: ConceptGain[];
  students: ResultStudent[];
};

type Row = {
  student_id: string;
  correct: boolean;
  students: { display_name: string; class_id: string; classes: { name: string; school: string } };
  assessment_questions: { concept_tag: string; assessments: { kind: "pre" | "post"; module_id: string; modules: { title: string } } };
};

export async function getResults(unitId?: string, classId?: string): Promise<Results> {
  const db = await createClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("assessment_responses")
      .select("student_id, correct, students!inner(display_name, class_id, classes!inner(name, school)), assessment_questions!inner(concept_tag, assessments!inner(kind, module_id, modules!inner(title)))")
      .order("id").range(from, from + 999);
    if (error) throw new Error("We couldn't load the results. Please try again.");
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }

  const units = [...new Map(rows.map((r) => [r.assessment_questions.assessments.module_id, r.assessment_questions.assessments.modules.title]))]
    .map(([id, title]) => ({ id, title }));
  const unit = units.find((u) => u.id === unitId)?.id ?? units[0]?.id ?? null;
  const inUnit = rows.filter((r) => r.assessment_questions.assessments.module_id === unit && (!classId || r.students.class_id === classId));
  const toResponse = (r: Row): TestResponse => ({ kind: r.assessment_questions.assessments.kind, correct: r.correct, concept_tag: r.assessment_questions.concept_tag, student_id: r.student_id });

  const byStudent = new Map<string, Row[]>();
  for (const r of inUnit) byStudent.set(r.student_id, [...(byStudent.get(r.student_id) ?? []), r]);
  const people = [...byStudent.entries()].map(([id, rs]) => ({ id, name: rs[0].students.display_name, classId: rs[0].students.class_id, ...studentScores(rs.map(toResponse)) }));
  const labels = displayLabels(people.map((p) => p.name));
  const students = people.map((p, i) => ({ ...p, label: labels[i] })).sort((a, b) => a.label.localeCompare(b.label));

  const classMap = new Map<string, { name: string; school: string }>();
  for (const r of inUnit) classMap.set(r.students.class_id, r.students.classes);
  const classes = [...classMap.entries()].map(([id, c]) => ({
    id, ...c, gain: aggregateGain(students.filter((s) => s.classId === id)),
  })).sort((a, b) => a.school.localeCompare(b.school) || a.name.localeCompare(b.name));

  return { units, unitId: unit, classes, overall: aggregateGain(students), byTopic: gainByConcept(inUnit.map(toResponse)), students };
}
