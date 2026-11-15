// Learning gain = post-test % minus pre-test % (percentage points).
// Only students with BOTH tests count toward an average; the rest are reported as missing,
// so a funder never sees a gain built on half the class without knowing it.
// Pure functions: no database, no student names. Used by the read API and the results pages.

export type TestKind = "pre" | "post";

/** One answered test question. `student_id` is only needed for gainByConcept. */
export type TestResponse = {
  kind: TestKind;
  correct: boolean;
  concept_tag?: string | null;
  student_id?: string;
};

/** A student's two scores. A missing test is null. `studentGain()`'s result fits this too. */
export type StudentScores = { pre_pct: number | null; post_pct: number | null };

export type StudentGain = { pre_pct: number; post_pct: number; gain: number };

export type GainSummary = {
  avg_pre_pct: number | null; // null when n = 0 (no student has both tests)
  avg_post_pct: number | null;
  avg_gain: number | null;
  n: number; // students with both tests
  missing_pre: number; // students with a post-test but no pre-test
  missing_post: number; // students with a pre-test but no post-test
};

export type ConceptGain = {
  concept_tag: string;
  avg_pre_pct: number | null;
  avg_post_pct: number | null;
  avg_gain: number | null;
  n: number;
};

const round1 = (x: number) => Math.round(x * 10) / 10;

function pct(rows: TestResponse[]): number | null {
  return rows.length === 0 ? null : (rows.filter((r) => r.correct).length / rows.length) * 100;
}

/** A single student's pre and post percentages (null for a test they haven't taken). */
export function studentScores(responses: TestResponse[]): StudentScores {
  return {
    pre_pct: pct(responses.filter((r) => r.kind === "pre")),
    post_pct: pct(responses.filter((r) => r.kind === "post")),
  };
}

/** One student's responses → their gain, or null if they are missing the pre or the post test. */
export function studentGain(responses: TestResponse[]): StudentGain | null {
  const { pre_pct, post_pct } = studentScores(responses);
  if (pre_pct === null || post_pct === null) return null;
  return { pre_pct: round1(pre_pct), post_pct: round1(post_pct), gain: round1(post_pct - pre_pct) };
}

/** Class (or cohort) summary. Pass one entry per student, including those missing a test. */
/**
 * One score pair per student PER MODULE. Students missing a test still appear (and are counted as
 * missing), and a pre-test from one module is never paired with another module's post-test.
 */
export function scoresByStudentAndModule(rows: (TestResponse & { module_id?: string })[]): StudentScores[] {
  const groups = new Map<string, TestResponse[]>();
  for (const r of rows) {
    const key = `${r.student_id ?? ""}:${r.module_id ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map(studentScores);
}

export function aggregateGain(perStudent: StudentScores[]): GainSummary {
  const both = perStudent.filter(
    (s): s is { pre_pct: number; post_pct: number } => s.pre_pct !== null && s.post_pct !== null,
  );
  const avg = (f: (s: { pre_pct: number; post_pct: number }) => number) =>
    both.length === 0 ? null : round1(both.reduce((sum, s) => sum + f(s), 0) / both.length);
  return {
    avg_pre_pct: avg((s) => s.pre_pct),
    avg_post_pct: avg((s) => s.post_pct),
    avg_gain: avg((s) => s.post_pct - s.pre_pct),
    n: both.length,
    missing_pre: perStudent.filter((s) => s.pre_pct === null && s.post_pct !== null).length,
    missing_post: perStudent.filter((s) => s.pre_pct !== null && s.post_pct === null).length,
  };
}

/**
 * Gain per concept ("+32 points on loops"). Needs `student_id` and `concept_tag` on every response.
 * A student counts for a concept only if they answered it on both the pre and the post test.
 * Responses without a concept tag are skipped. Sorted by biggest gain first.
 */
export function gainByConcept(responses: TestResponse[]): ConceptGain[] {
  const byConcept = new Map<string, Map<string, TestResponse[]>>();
  for (const r of responses) {
    if (!r.concept_tag || !r.student_id) continue;
    const students = byConcept.get(r.concept_tag) ?? new Map<string, TestResponse[]>();
    students.set(r.student_id, [...(students.get(r.student_id) ?? []), r]);
    byConcept.set(r.concept_tag, students);
  }
  return [...byConcept.entries()]
    .map(([concept_tag, students]) => {
      const summary = aggregateGain([...students.values()].map(studentScores));
      return {
        concept_tag,
        avg_pre_pct: summary.avg_pre_pct,
        avg_post_pct: summary.avg_post_pct,
        avg_gain: summary.avg_gain,
        n: summary.n,
      };
    })
    .sort(
      (a, b) =>
        (b.avg_gain ?? -Infinity) - (a.avg_gain ?? -Infinity) || a.concept_tag.localeCompare(b.concept_tag),
    );
}
