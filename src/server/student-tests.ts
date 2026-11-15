import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuizState } from "@/lib/course-map";
import type { TestKind } from "@/lib/learning-gain";
import { getCourseMap } from "@/server/student-learning";
import type { Student } from "@/server/student-session";

// Pre/post tests from the student's side. Questions go to the browser WITHOUT answers;
// grading happens here. Each test can be taken once (the database also enforces one
// answer per student per question), so learning gain can't be gamed by retaking.

type Question = { id: string; position: number; concept_tag: string; content: { prompt: string; options: string[]; answer: number } };
export type TestStatus = Record<string, { pre: QuizState; post: QuizState }>;
export type StudentTest = { assessmentId: string; unitTitle: string; kind: TestKind; questions: { id: string; prompt: string; options: string[] }[] };
export type TopicScore = { concept_tag: string; correct: number; total: number; pct: number; pre_pct: number | null };

async function loadTests(moduleIds: string[]) {
  if (!moduleIds.length) return [];
  const { data, error } = await createAdminClient().from("assessments")
    .select("id, module_id, kind, assessment_questions(id, position, concept_tag, content)").in("module_id", moduleIds).eq("reviewed",true);
  if(error) throw new Error("We couldn't load the quizzes. Please try again.");
  return (data ?? []) as { id: string; module_id: string; kind: TestKind; assessment_questions: Question[] }[];
}

/** Statuses include locked units so the whole course path remains visible. */
export async function getTestStatus(student: Student): Promise<TestStatus> {
  const map = await getCourseMap(student);
  return Object.fromEntries(map.modules.map((m) => [m.id,{pre:m.preTest,post:m.postTest}]));
}

/** The questions (no answers), or null if the test isn't available to this student right now. */
export async function getStudentTest(student: Student, moduleId: string, kind: TestKind): Promise<StudentTest | null> {
  const status = (await getTestStatus(student))[moduleId];
  if (!status || status[kind] !== "todo") return null;
  const [test] = (await loadTests([moduleId])).filter((t) => t.kind === kind);
  const { data: unit } = await createAdminClient().from("modules").select("title").eq("id", moduleId).single();
  return {
    assessmentId: test.id,
    unitTitle: unit?.title ?? "",
    kind,
    questions: [...test.assessment_questions].sort((a, b) => a.position - b.position)
      .map((q) => ({ id: q.id, prompt: q.content.prompt, options: q.content.options })),
  };
}

/** Grades and saves a finished test. Returns the score per topic (and the pre-test score, for a post-test). */
export async function submitStudentTest(student: Student, moduleId: string, kind: TestKind, answers: Record<string, number>): Promise<TopicScore[]> {
  const status = (await getTestStatus(student))[moduleId];
  if (!status || status[kind] !== "todo") throw new Error("This test isn't open for you right now.");
  const tests = await loadTests([moduleId]);
  const test = tests.find((t) => t.kind === kind)!;
  const missing = test.assessment_questions.find((q) => !Number.isInteger(answers[q.id]) || answers[q.id] < 0 || answers[q.id] >= q.content.options.length);
  if (missing) throw new Error("Please answer every question before you finish.");

  const rows = test.assessment_questions.map((q) => ({ student_id: student.id, question_id: q.id, correct: answers[q.id] === q.content.answer }));
  const { error } = await createAdminClient().from("assessment_responses").insert(rows);
  if (error) throw new Error(error.code === "23505" ? "You already finished this test." : "We couldn't save your test. Try again.");

  // Score per topic, plus the matching pre-test score after a post-test ("Loops: 40% → 85%").
  let prePct = new Map<string, number>();
  if (kind === "post") {
    const pre = tests.find((t) => t.kind === "pre");
    if (pre) {
      const { data } = await createAdminClient().from("assessment_responses").select("question_id, correct")
        .eq("student_id", student.id).in("question_id", pre.assessment_questions.map((q) => q.id));
      prePct = topicPct((data ?? []).map((r) => ({ concept: pre.assessment_questions.find((q) => q.id === r.question_id)!.concept_tag, correct: r.correct })));
    }
  }
  const scores = new Map<string, { correct: number; total: number }>();
  for (const q of test.assessment_questions) {
    const s = scores.get(q.concept_tag) ?? { correct: 0, total: 0 };
    s.total++;
    if (answers[q.id] === q.content.answer) s.correct++;
    scores.set(q.concept_tag, s);
  }
  return [...scores].map(([concept_tag, s]) => ({
    concept_tag, ...s, pct: Math.round((s.correct / s.total) * 100), pre_pct: prePct.has(concept_tag) ? prePct.get(concept_tag)! : null,
  }));
}

function topicPct(rows: { concept: string; correct: boolean }[]) {
  const by = new Map<string, { c: number; t: number }>();
  for (const r of rows) { const s = by.get(r.concept) ?? { c: 0, t: 0 }; s.t++; if (r.correct) s.c++; by.set(r.concept, s); }
  return new Map([...by].map(([k, s]) => [k, Math.round((s.c / s.t) * 100)]));
}

/** Read-only results for a completed assessment; correct options never leave the server. */
export async function getCompletedTest(student: Student, moduleId: string, kind: TestKind): Promise<{ unitTitle: string; correct: number; total: number; pct: number } | null> {
  const map=await getCourseMap(student);
  const unit=map.modules.find((m) => m.id===moduleId);
  if (!unit || (kind==="pre" ? unit.preTest : unit.postTest)!=="done") return null;
  const test=(await loadTests([moduleId])).find((t) => t.kind===kind);
  if(!test) return null;
  const { data,error }=await createAdminClient().from("assessment_responses").select("correct").eq("student_id",student.id).in("question_id",test.assessment_questions.map((q) => q.id));
  if(error || data.length!==test.assessment_questions.length) return null;
  const correct=data.filter((r) => r.correct).length;
  return {unitTitle:unit.title,correct,total:data.length,pct:Math.round(correct/data.length*100)};
}
