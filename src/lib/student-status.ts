// Rule-based "needs help" logic for the teacher dashboard (docs/02-product-spec.md §E).
// Pure and simple on purpose: a teacher can read the reasons and agree or disagree with them.
// No database, no student names.

export type Status = "needs_help" | "behind" | "not_started" | "on_track";

// ---- Thresholds (change here, tests follow) ----
/** This many wrong attempt/check events on one unfinished activity → needs help. */
export const WRONG_TRIES_THRESHOLD = 3;
/** This long on one step without finishing it → needs help (5 minutes). */
export const STUCK_MS_THRESHOLD = 5 * 60 * 1000;
/** This many hint requests on one concept → needs help. */
export const HINTS_PER_CONCEPT_THRESHOLD = 3;
/** First-try quiz/exit score below this percent → needs help. */
export const LOW_QUIZ_SCORE_PCT = 60;
/** Don't judge a quiz score until the student has answered this many quiz questions. */
export const MIN_QUIZ_ANSWERS = 3;
/** Class dates are compared as calendar days in this time zone (Arizona has no daylight saving). */
export const CLASS_TIME_ZONE = "America/Phoenix";

const QUIZ_TYPES = new Set(["quiz_mcq", "predict_output", "fix_bug", "fill_blank", "parsons", "exit_question"]);

// ---- Input ----
/** One row of `activity_events`. */
export type StatusEvent = {
  event_type: string; // 'view' | 'attempt' | 'run' | 'check' | 'hint' | 'submit' | 'complete' | ...
  activity_id: string | null;
  lesson_id?: string | null;
  correct: boolean | null;
  concept_tag: string | null;
  duration_ms: number | null;
  created_at: string; // ISO timestamp
};

/** What we need to know about an activity to explain things ("step 4") and spot quizzes. */
export type StatusActivity = { step: number; type: string };

/** One class session: which lesson it covered and on what date. */
export type StatusSession = {
  lesson_id: string;
  lesson_title: string;
  date: string; // 'YYYY-MM-DD'
  absent: boolean | null; // this student's attendance for it; null = not recorded
};

export type StatusInput = {
  events: StatusEvent[]; // all of this student's events in the class
  activities: Record<string, StatusActivity>; // by activity id
  sessions: StatusSession[]; // the class schedule
  lessonStatuses: Record<string, string>; // lesson_id → 'not_started' | 'in_progress' | 'completed' | 'exempt'
  now: Date;
};

export type StatusResult = { status: Status; reasons: string[] };

// ---- Helpers ----
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function groupBy<T>(items: T[], key: (item: T) => string | null): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return groups;
}

/** Today's date as 'YYYY-MM-DD' in the class time zone. */
export function classToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLASS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function weekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function stepLabel(activities: Record<string, StatusActivity>, activityId: string): string {
  const step = activities[activityId]?.step;
  return step === undefined ? "one activity" : `step ${step}`;
}

// ---- The rules ----
function needsHelpReasons({ events, activities }: StatusInput): string[] {
  const reasons: string[] = [];
  const byActivity = groupBy(events, (e) => e.activity_id);
  const finished = new Set([...byActivity].filter(([, evs]) => evs.some((e) => e.event_type === "complete")).map(([id]) => id));

  // Wrong tries and time on a step only matter while the student is still stuck on it.
  for (const [id, evs] of byActivity) {
    if (finished.has(id)) continue;
    const wrong = evs.filter((e) => (e.event_type === "attempt" || e.event_type === "check") && e.correct === false).length;
    if (wrong >= WRONG_TRIES_THRESHOLD) reasons.push(`${plural(wrong, "wrong try", "wrong tries")} on ${stepLabel(activities, id)}`);
    const ms = evs.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0);
    if (ms >= STUCK_MS_THRESHOLD) reasons.push(`Spent ${Math.floor(ms / 60000)} min on ${stepLabel(activities, id)} without finishing`);
  }

  for (const [concept, evs] of groupBy(events.filter((e) => e.event_type === "hint"), (e) => e.concept_tag)) {
    if (evs.length >= HINTS_PER_CONCEPT_THRESHOLD) reasons.push(`Asked for ${plural(evs.length, "hint")} on ${concept}`);
  }

  // Quiz score = share of quiz/exit questions answered correctly on the FIRST try.
  const firstTries = [...byActivity]
    .filter(([id]) => QUIZ_TYPES.has(activities[id]?.type))
    .map(([, evs]) =>
      evs
        .filter((e) => (e.event_type === "attempt" || e.event_type === "check") && e.correct !== null)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0],
    )
    .filter((e): e is StatusEvent => e !== undefined);
  if (firstTries.length >= MIN_QUIZ_ANSWERS) {
    const right = firstTries.filter((e) => e.correct).length;
    const score = Math.round((right / firstTries.length) * 100);
    if (score < LOW_QUIZ_SCORE_PCT) reasons.push(`Quiz score ${score}% (${right} of ${firstTries.length} right on the first try)`);
  }
  return reasons;
}

/**
 * Behind = a class session's date has passed, the student hasn't completed (or been exempted from)
 * that lesson, AND they either missed the session or have been active but never touched the lesson.
 * A student who is partway through the lesson is not "behind", and a student with no activity at all
 * is "not started" instead.
 */
function behindReasons({ events, sessions, lessonStatuses, now }: StatusInput): string[] {
  const today = classToday(now);
  const active = events.length > 0;
  return sessions
    .filter((s) => s.date < today)
    .filter((s) => !["completed", "exempt"].includes(lessonStatuses[s.lesson_id] ?? ""))
    .filter((s) => s.absent === true || (active && !events.some((e) => e.lesson_id === s.lesson_id)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => `Missed ${s.lesson_title} (${weekday(s.date)})`);
}

/**
 * Precedence: needs_help > behind > not_started > on_track.
 * `reasons` lists everything that applies, in plain words, so a student who needs help and
 * is also behind shows both. not_started and on_track carry their own short reason.
 */
export function computeStatus(input: StatusInput): StatusResult {
  const help = needsHelpReasons(input);
  const behind = behindReasons(input);
  if (help.length > 0) return { status: "needs_help", reasons: [...help, ...behind] };
  if (behind.length > 0) return { status: "behind", reasons: behind };
  if (input.events.length === 0) return { status: "not_started", reasons: ["No activity yet"] };
  return { status: "on_track", reasons: [] };
}
