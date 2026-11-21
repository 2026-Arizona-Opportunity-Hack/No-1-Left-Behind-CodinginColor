// Where a demo guest starts. Instead of an empty course, each guest begins part-way through, so that within a few
// minutes they can see most of the app. There are four different starting points and each new guest gets one at
// random, so the demo shows different things each time. Every one of them reaches (in a few clicks):
//   a quiz with a before-and-after result, a lesson with exercises, a catch-up for a lesson they "missed",
//   the "unit done" and "locked unit" cards, and a lesson finish screen.
//
//   A  Unit 1 finale     unit 1 done except its FINAL QUIZ; unit 2 warm-up done, 1st lesson done, Loops started
//                        (code exercise next). Taking the final quiz opens unit 2 with two catch-ups waiting.
//   B  Fresh unit 2      unit 1 done (green card). Unit 2 WARM-UP QUIZ to take, then every lesson from the start,
//                        each shown as missed so the catch-up path is open from the first lesson.
//   C  Finish line       unit 1 done. Unit 2: Loops half-way (the bug-fixing, line-ordering and fill-in-the-blank
//                        steps left) and Lists half-way (the WORKSHEET left). Finishing both opens the unit 2
//                        FINAL QUIZ (three topics), then unit 3.
//   D  Worksheet focus   unit 1 done. Unit 2: If statements and Loops done (its bonus code step is still open),
//                        Lists (quick check, WORKSHEET) to do, then the unit 2 FINAL QUIZ.
//
// This is only the plan (pure, so it can be tested); server/demo-guest.ts writes it to the database.

export type StartUnit = { id: string; lessons: { id: string }[] };
export type StartActivity = { id: string; lesson_id: string; position: number; is_core: boolean; concept_tag: string | null };
export type StartTest = { module_id: string; kind: string; question_ids: string[] };

/** "done" = every required step finished; a number = that many required steps done (in order); "none" = not started. */
export type LessonProgress = "done" | "none" | number;
export type UnitProgress = { warmUp: boolean; finalQuiz: boolean; lessons: LessonProgress[] };
export type Scenario = { id: "A" | "B" | "C" | "D"; name: string; units: UnitProgress[] };

const UNIT_ONE_DONE: UnitProgress = { warmUp: true, finalQuiz: true, lessons: ["done", "done", "done"] };

export const SCENARIOS: Scenario[] = [
  { id: "A", name: "Unit 1 finale", units: [
    { warmUp: true, finalQuiz: false, lessons: ["done", "done", "done"] },
    { warmUp: true, finalQuiz: false, lessons: ["done", 3, "none"] },
  ] },
  { id: "B", name: "Fresh unit 2", units: [UNIT_ONE_DONE, { warmUp: false, finalQuiz: false, lessons: ["none", "none", "none"] }] },
  { id: "C", name: "Finish line", units: [UNIT_ONE_DONE, { warmUp: true, finalQuiz: false, lessons: ["done", 5, 2] }] },
  { id: "D", name: "Worksheet focus", units: [UNIT_ONE_DONE, { warmUp: true, finalQuiz: false, lessons: ["done", "done", "none"] }] },
];

/** Picks a scenario from a number in [0, 1). */
export function pickScenario(random: number): Scenario {
  return SCENARIOS[Math.min(SCENARIOS.length - 1, Math.floor(random * SCENARIOS.length))];
}

export type GuestStart = {
  /** Steps marked "complete". */
  events: { activity_id: string; lesson_id: string; concept_tag: string | null }[];
  statuses: { lesson_id: string; status: "completed" | "in_progress" }[];
  /** Quiz answers the guest already has. A final quiz that is still to take never gets any. */
  responses: { question_id: string; correct: boolean }[];
};

/** Warm-up quizzes start weak (a third or half right) so the final quiz shows growth. */
const WARM_UP_RIGHT: ((i: number) => boolean)[] = [(i) => i % 3 === 0, (i) => i % 2 === 0];
/** A final quiz that is already done: two in three right. */
const FINAL_RIGHT = (i: number) => i % 3 !== 2;

export function planGuestStart(
  { units, activities, tests }: { units: StartUnit[]; activities: StartActivity[]; tests: StartTest[] },
  scenario: Scenario,
  /** 0 or 1: which warm-up accuracy to use. Random per guest. */
  variant = 0,
): GuestStart {
  const plan: GuestStart = { events: [], statuses: [], responses: [] };
  const coreSteps = (lessonId: string) => activities
    .filter((a) => a.lesson_id === lessonId && a.is_core)
    .sort((a, b) => a.position - b.position);
  const markDone = (lessonId: string, count: number) => {
    const steps = coreSteps(lessonId).slice(0, count);
    for (const a of steps) plan.events.push({ activity_id: a.id, lesson_id: lessonId, concept_tag: a.concept_tag });
    return steps.length;
  };
  const answer = (unitId: string, kind: "pre" | "post", right: (i: number) => boolean) => {
    tests.find((t) => t.module_id === unitId && t.kind === kind)?.question_ids.forEach((id, i) => plan.responses.push({ question_id: id, correct: right(i) }));
  };

  units.forEach((unit, u) => {
    const state = scenario.units[u];
    if (!state) return; // later units are untouched
    if (state.warmUp) answer(unit.id, "pre", WARM_UP_RIGHT[variant % WARM_UP_RIGHT.length]);
    if (state.finalQuiz) answer(unit.id, "post", FINAL_RIGHT);
    unit.lessons.forEach((lesson, l) => {
      const progress = state.lessons[l] ?? "none";
      if (progress === "none") return;
      if (progress === "done") {
        markDone(lesson.id, Infinity);
        plan.statuses.push({ lesson_id: lesson.id, status: "completed" });
      } else if (markDone(lesson.id, progress) > 0) {
        plan.statuses.push({ lesson_id: lesson.id, status: "in_progress" });
      }
    });
  });
  return plan;
}

/** Class days for the lessons of the later units: all in the past, two days apart, oldest first, so a lesson the guest has
 *  not finished shows as "missed" and can be caught up. Never today or later. */
export function demoSessionDates(today: string, lessonCount: number): string[] {
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: lessonCount }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - (lessonCount - i) * 2);
    return d.toISOString().slice(0, 10);
  });
}

/** A fixed id for the class day of one lesson in one class. Adding it again (for example when two guests join at the same
 *  moment) hits the same row and does nothing, so the demo class never ends up with duplicate class days. */
export async function demoSessionId(classId: string, lessonId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`demo-session:${classId}:${lessonId}`));
  const h = Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
