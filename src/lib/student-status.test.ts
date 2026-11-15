import { describe, expect, it } from "vitest";
import {
  computeStatus,
  classToday,
  HINTS_PER_CONCEPT_THRESHOLD,
  LOW_QUIZ_SCORE_PCT,
  MIN_QUIZ_ANSWERS,
  STUCK_MS_THRESHOLD,
  WRONG_TRIES_THRESHOLD,
  type StatusEvent,
  type StatusInput,
  type StatusSession,
} from "./student-status";

// Wed Nov 11 2026, 10:00 AM in Arizona
const NOW = new Date("2026-11-11T17:00:00Z");
const LOOPS = "lesson-loops";
const LISTS = "lesson-lists";

let t = 0;
const ev = (event_type: string, over: Partial<StatusEvent> = {}): StatusEvent => ({
  event_type,
  activity_id: "act-4",
  lesson_id: LOOPS,
  correct: null,
  concept_tag: "loops",
  duration_ms: null,
  created_at: new Date(Date.UTC(2026, 10, 11, 12, 0, t++)).toISOString(),
  ...over,
});
const wrongChecks = (n: number, activity_id = "act-4") =>
  Array.from({ length: n }, () => ev("check", { activity_id, correct: false }));

const loopsSession = (over: Partial<StatusSession> = {}): StatusSession => ({
  lesson_id: LOOPS, lesson_title: "Loops", date: "2026-11-10", absent: false, ...over, // Tuesday, yesterday
});

const input = (over: Partial<StatusInput> = {}): StatusInput => ({
  events: [ev("view")],
  activities: { "act-4": { step: 4, type: "code_exercise" } },
  sessions: [],
  lessonStatuses: {},
  now: NOW,
  ...over,
});

describe("needs_help rules", () => {
  it("flags 3 wrong tries on the same unfinished activity", () => {
    const r = computeStatus(input({ events: wrongChecks(WRONG_TRIES_THRESHOLD) }));
    expect(r).toEqual({ status: "needs_help", reasons: ["3 wrong tries on step 4"] });
  });
  it("does not flag 2 wrong tries", () => {
    expect(computeStatus(input({ events: wrongChecks(WRONG_TRIES_THRESHOLD - 1) })).status).toBe("on_track");
  });
  it("does not add up wrong tries across different activities", () => {
    const events = [...wrongChecks(2, "act-4"), ...wrongChecks(2, "act-5")];
    expect(computeStatus(input({ events })).status).toBe("on_track");
  });
  it("counts 'attempt' events too, but not 'run' events or correct answers", () => {
    const events = [ev("attempt", { correct: false }), ev("attempt", { correct: false }), ev("run", { correct: false }), ev("check", { correct: true })];
    expect(computeStatus(input({ events })).status).toBe("on_track");
  });
  it("stops flagging an activity once the student completes it", () => {
    const events = [...wrongChecks(4), ev("complete", { correct: true })];
    expect(computeStatus(input({ events })).status).toBe("on_track");
  });

  it("flags 5 minutes on one step without completing it", () => {
    const events = [ev("view", { duration_ms: 3 * 60_000 }), ev("run", { duration_ms: 2 * 60_000 + 5_000 })];
    expect(computeStatus(input({ events }))).toEqual({ status: "needs_help", reasons: ["Spent 5 min on step 4 without finishing"] });
  });
  it("does not flag just under 5 minutes", () => {
    expect(computeStatus(input({ events: [ev("view", { duration_ms: STUCK_MS_THRESHOLD - 1 })] })).status).toBe("on_track");
  });
  it("does not flag 5+ minutes on a step that was completed", () => {
    const events = [ev("view", { duration_ms: 6 * 60_000 }), ev("complete", { correct: true })];
    expect(computeStatus(input({ events })).status).toBe("on_track");
  });

  it("flags 3 hints on the same concept, across activities", () => {
    const events = [ev("hint", { activity_id: "act-4" }), ev("hint", { activity_id: "act-5" }), ev("hint", { activity_id: "act-5" }), ev("hint", { activity_id: "act-6" })];
    expect(computeStatus(input({ events }))).toEqual({ status: "needs_help", reasons: ["Asked for 4 hints on loops"] });
  });
  it("does not add up hints across different concepts", () => {
    const events = Array.from({ length: HINTS_PER_CONCEPT_THRESHOLD - 1 }, () => ev("hint")).concat(ev("hint", { concept_tag: "lists" }));
    expect(computeStatus(input({ events })).status).toBe("on_track");
  });

  describe("quiz score", () => {
    const quiz = (id: string, correct: boolean) => ev("check", { activity_id: id, correct });
    const activities = {
      q1: { step: 1, type: "quiz_mcq" }, q2: { step: 2, type: "predict_output" }, q3: { step: 3, type: "exit_question" },
      q4: { step: 4, type: "quiz_mcq" }, q5: { step: 5, type: "quiz_mcq" },
    };
    it("flags a first-try score under 60%", () => {
      // 2 of 5 right = 40%
      const events = [quiz("q1", true), quiz("q2", false), quiz("q3", false), quiz("q4", true), quiz("q5", false)];
      expect(computeStatus(input({ events, activities }))).toEqual({
        status: "needs_help", reasons: ["Quiz score 40% (2 of 5 right on the first try)"],
      });
    });
    it("does not flag exactly 60%", () => {
      const events = [quiz("q1", true), quiz("q2", true), quiz("q3", true), quiz("q4", false), quiz("q5", false)];
      expect(computeStatus(input({ events, activities })).status).toBe("on_track");
      expect(LOW_QUIZ_SCORE_PCT).toBe(60);
    });
    it("only judges the first try, so fixing a miss later doesn't hide it", () => {
      const events = [quiz("q1", false), quiz("q1", true), quiz("q2", false), quiz("q2", true), quiz("q3", false), quiz("q3", true)];
      expect(computeStatus(input({ events, activities })).status).toBe("needs_help");
    });
    it("waits for enough answers before judging", () => {
      const events = Array.from({ length: MIN_QUIZ_ANSWERS - 1 }, (_, i) => quiz(`q${i + 1}`, false));
      expect(computeStatus(input({ events, activities })).status).toBe("on_track");
    });
    it("ignores code exercises", () => {
      const events = [quiz("act-4", false), quiz("act-5", false), quiz("act-6", false)];
      const acts = { "act-4": { step: 4, type: "code_exercise" }, "act-5": { step: 5, type: "code_exercise" }, "act-6": { step: 6, type: "code_exercise" } };
      expect(computeStatus(input({ events, activities: acts })).status).toBe("on_track");
    });
  });
});

describe("behind", () => {
  it("flags a student who was absent for a session whose lesson they haven't finished", () => {
    const r = computeStatus(input({ events: [], sessions: [loopsSession({ absent: true })], lessonStatuses: { [LOOPS]: "not_started" } }));
    expect(r).toEqual({ status: "behind", reasons: ["Missed Loops (Tue)"] });
  });
  it("flags an active student who never touched a lesson that has passed", () => {
    const events = [ev("view", { lesson_id: "lesson-if" })];
    expect(computeStatus(input({ events, sessions: [loopsSession()] })).status).toBe("behind");
  });
  it("does not flag a student who is partway through the lesson", () => {
    expect(computeStatus(input({ sessions: [loopsSession()], lessonStatuses: { [LOOPS]: "in_progress" } })).status).toBe("on_track");
  });
  it("does not flag a student who completed the lesson, even if absent", () => {
    const r = computeStatus(input({ sessions: [loopsSession({ absent: true })], lessonStatuses: { [LOOPS]: "completed" } }));
    expect(r.status).toBe("on_track");
  });
  it("does not flag an exempt lesson", () => {
    const r = computeStatus(input({ events: [], sessions: [loopsSession({ absent: true })], lessonStatuses: { [LOOPS]: "exempt" } }));
    expect(r.status).toBe("not_started");
  });
  it("does not flag today's session or future ones", () => {
    const sessions = [loopsSession({ date: "2026-11-11", absent: true }), loopsSession({ date: "2026-11-12", absent: true })];
    expect(computeStatus(input({ events: [], sessions })).status).toBe("not_started");
  });
  it("lists every missed lesson, oldest first", () => {
    const sessions = [
      loopsSession({ lesson_id: LISTS, lesson_title: "Lists", date: "2026-11-10", absent: true }),
      loopsSession({ lesson_id: "lesson-if", lesson_title: "If statements", date: "2026-11-03", absent: true }),
    ];
    expect(computeStatus(input({ events: [], sessions })).reasons).toEqual(["Missed If statements (Tue)", "Missed Lists (Tue)"]);
  });
  it("uses the Arizona calendar day, not UTC", () => {
    // 11:30 PM Tuesday in Arizona is already Wednesday in UTC
    expect(classToday(new Date("2026-11-11T06:30:00Z"))).toBe("2026-11-10");
  });
});

describe("not_started and on_track", () => {
  it("not_started: no events at all", () => {
    expect(computeStatus(input({ events: [] }))).toEqual({ status: "not_started", reasons: ["No activity yet"] });
  });
  it("on_track otherwise", () => {
    expect(computeStatus(input())).toEqual({ status: "on_track", reasons: [] });
  });
});

describe("precedence: needs_help > behind > not_started > on_track", () => {
  it("needs_help beats behind, and both reasons are shown", () => {
    const r = computeStatus(input({
      events: wrongChecks(3), sessions: [loopsSession({ absent: true })], lessonStatuses: { [LOOPS]: "in_progress" },
    }));
    expect(r.status).toBe("needs_help");
    expect(r.reasons).toEqual(["3 wrong tries on step 4", "Missed Loops (Tue)"]);
  });
  it("behind beats not_started", () => {
    expect(computeStatus(input({ events: [], sessions: [loopsSession({ absent: true })] })).status).toBe("behind");
  });
});

describe("Period 3 demo story", () => {
  // Mirrors supabase/seed.sql: today's session is Lists; Loops was 3 days ago.
  const sessions = (absent: boolean): StatusSession[] => [loopsSession({ date: "2026-11-08", absent })];
  it("Jaylen (absent, stuck on step 4) needs help", () => {
    expect(computeStatus(input({ events: wrongChecks(3), sessions: sessions(true), lessonStatuses: { [LOOPS]: "in_progress" } })).status).toBe("needs_help");
  });
  it("Alex Rivera (present, working on Loops) is on track", () => {
    expect(computeStatus(input({ sessions: sessions(false), lessonStatuses: { [LOOPS]: "in_progress" } })).status).toBe("on_track");
  });
  it("Diego (absent, nothing started) is behind", () => {
    expect(computeStatus(input({ events: [], sessions: sessions(true), lessonStatuses: { [LOOPS]: "not_started" } })).status).toBe("behind");
  });
  it("Marcus (present, no activity) is not started", () => {
    expect(computeStatus(input({ events: [], sessions: sessions(false), lessonStatuses: { [LOOPS]: "not_started" } })).status).toBe("not_started");
  });
});
