// Concept mastery for the class ("80% stuck on loops"). Pure: no database, no student names.
// Built from the same activity log and thresholds as the needs-help flags.
import {
  HINTS_PER_CONCEPT_THRESHOLD,
  LOW_QUIZ_SCORE_PCT,
  MIN_QUIZ_ANSWERS,
  WRONG_TRIES_THRESHOLD,
  type StatusEvent,
} from "./student-status";

export type MasteryActivity = { id: string; concept_tag: string | null; type: string; is_core: boolean };
export type ConceptState = "mastered" | "struggling" | "learning";
export type ConceptMastery = { concept_tag: string; percent_mastered: number; percent_struggling: number; students_counted: number };

/** One student: their events and the activities counted as done (completed, or in a completed lesson). */
export type StudentMasteryInput = { events: StatusEvent[]; doneActivityIds: ReadonlySet<string> };

const QUIZ_TYPES = new Set(["quiz_mcq", "predict_output", "fix_bug", "fill_blank", "parsons", "exit_question"]);
const isTry = (e: StatusEvent) => e.event_type === "attempt" || e.event_type === "check";

/**
 * For each concept a student has touched:
 *  - struggling: 3+ wrong tries on an unfinished activity, 3+ hints, or a first-try quiz score under 60%
 *  - mastered: not struggling, and every core activity of the concept is done
 *  - learning: everything else
 */
export function studentConceptStates(student: StudentMasteryInput, activities: MasteryActivity[]): Map<string, ConceptState> {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const conceptOf = (e: StatusEvent) => (e.activity_id ? byId.get(e.activity_id)?.concept_tag : undefined) ?? e.concept_tag;

  const touched = new Set<string>();
  for (const e of student.events) {
    const c = conceptOf(e);
    if (c) touched.add(c);
  }
  for (const a of activities) if (a.concept_tag && student.doneActivityIds.has(a.id)) touched.add(a.concept_tag);

  const states = new Map<string, ConceptState>();
  for (const concept of touched) {
    const events = student.events.filter((e) => conceptOf(e) === concept);
    const byActivity = new Map<string, StatusEvent[]>();
    for (const e of events) if (e.activity_id) byActivity.set(e.activity_id, [...(byActivity.get(e.activity_id) ?? []), e]);

    const stuck = [...byActivity].some(([id, evs]) => {
      if (student.doneActivityIds.has(id) || evs.some((e) => e.event_type === "complete")) return false;
      return evs.filter((e) => isTry(e) && e.correct === false).length >= WRONG_TRIES_THRESHOLD;
    });
    const hints = events.filter((e) => e.event_type === "hint").length >= HINTS_PER_CONCEPT_THRESHOLD;
    const firstTries = [...byActivity]
      .filter(([id]) => QUIZ_TYPES.has(byId.get(id)?.type ?? ""))
      .map(([, evs]) => evs.filter((e) => isTry(e) && e.correct !== null).sort((a, b) => a.created_at.localeCompare(b.created_at))[0])
      .filter((e): e is StatusEvent => e !== undefined);
    const lowQuiz =
      firstTries.length >= MIN_QUIZ_ANSWERS &&
      (firstTries.filter((e) => e.correct).length / firstTries.length) * 100 < LOW_QUIZ_SCORE_PCT;

    if (stuck || hints || lowQuiz) {
      states.set(concept, "struggling");
      continue;
    }
    const core = activities.filter((a) => a.concept_tag === concept && a.is_core);
    states.set(concept, core.length > 0 && core.every((a) => student.doneActivityIds.has(a.id)) ? "mastered" : "learning");
  }
  return states;
}

/** Class view: share of students who have touched each concept that mastered it / are struggling. Worst first. */
export function classMastery(students: StudentMasteryInput[], activities: MasteryActivity[]): ConceptMastery[] {
  const tally = new Map<string, { mastered: number; struggling: number; n: number }>();
  for (const student of students) {
    for (const [concept, state] of studentConceptStates(student, activities)) {
      const t = tally.get(concept) ?? { mastered: 0, struggling: 0, n: 0 };
      t.n += 1;
      if (state === "mastered") t.mastered += 1;
      if (state === "struggling") t.struggling += 1;
      tally.set(concept, t);
    }
  }
  const pct = (x: number, n: number) => Math.round((x / n) * 100);
  return [...tally]
    .map(([concept_tag, t]) => ({
      concept_tag,
      percent_mastered: pct(t.mastered, t.n),
      percent_struggling: pct(t.struggling, t.n),
      students_counted: t.n,
    }))
    .sort((a, b) => b.percent_struggling - a.percent_struggling || a.concept_tag.localeCompare(b.concept_tag));
}
