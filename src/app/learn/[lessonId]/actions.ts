"use server";

import { checkAnswer, checkPausePoint, getOpenActivity, recordEvent } from "@/server/lesson-player";
import { getStudent } from "@/server/student-session";
import type { AnswerResult } from "@/types/student-lesson";

// Everything the lesson player saves. Each action re-checks the student's session and that
// the step's lesson is open to them; anything else gets a plain "sign in again" error.

const NOT_ALLOWED = "Your session ended. Join your class again to keep going.";

async function load(activityId: string) {
  const student = await getStudent();
  const activity = student && typeof activityId === "string" ? await getOpenActivity(student, activityId) : null;
  if (!student || !activity) throw new Error(NOT_ALLOWED);
  return { student, activity };
}

/** Slides and videos: done when the student moves on. */
export async function completeViewStep(activityId: string, durationMs: number) {
  const { student, activity } = await load(activityId);
  if (activity.type !== "slide" && activity.type !== "video") throw new Error(NOT_ALLOWED);
  await recordEvent(student, activity, { event_type: "complete", duration_ms: durationMs });
}

/** Quick check, exit question, predict the output, fill in the blank, put the lines in order. */
export async function answerStep(activityId: string, answer: unknown, durationMs: number): Promise<AnswerResult> {
  const { student, activity } = await load(activityId);
  if (!["quiz_mcq", "exit_question", "predict_output", "fill_blank", "parsons"].includes(activity.type)) throw new Error(NOT_ALLOWED);
  const safeAnswer = Array.isArray(answer) ? answer.slice(0, 50).map((l) => String(l).slice(0, 500)) : String(answer).slice(0, 2000);
  const result = checkAnswer(activity, safeAnswer);
  await recordEvent(student, activity, { event_type: "attempt", correct: result.correct, payload: { answer: safeAnswer } });
  if (result.correct) await recordEvent(student, activity, { event_type: "complete", correct: true, duration_ms: durationMs });
  return result;
}

/** Digital worksheet: answers are saved to the student's record so the teacher can read them. */
export async function submitWorksheet(activityId: string, answers: Record<string, string>, durationMs: number): Promise<AnswerResult> {
  const { student, activity } = await load(activityId);
  if (activity.type !== "worksheet") throw new Error(NOT_ALLOWED);
  const fields = (activity.content.fields as { id: string; label: string; required?: boolean }[]) ?? [];
  const clean: Record<string, string> = {};
  for (const f of fields) clean[f.id] = String(answers?.[f.id] ?? "").trim().slice(0, 2000);
  const missing = fields.find((f) => f.required && !clean[f.id]);
  if (missing) return { correct: false, message: `Please answer "${missing.label}" before you submit.` };
  await recordEvent(student, activity, { event_type: "submit", payload: { answers: clean } });
  await recordEvent(student, activity, { event_type: "complete", duration_ms: durationMs });
  return { correct: true, message: "Worksheet submitted. Your teacher can see your answers." };
}

/** Code exercises run in the browser; this records each Check (and completes on a full pass). */
export async function reportCodeCheck(activityId: string, passed: number, total: number, code: string, durationMs: number) {
  const { student, activity } = await load(activityId);
  if (activity.type !== "code_exercise" && activity.type !== "fix_bug") throw new Error(NOT_ALLOWED);
  const tests = (activity.content.tests as unknown[]) ?? [];
  const p = Math.max(0, Math.min(Number(passed) || 0, tests.length));
  const allPassed = p === tests.length && Number(total) === tests.length;
  await recordEvent(student, activity, {
    event_type: "check", correct: allPassed, tests_passed: p, tests_total: tests.length,
    payload: { code: String(code).slice(0, 10000) },
  });
  if (allPassed) await recordEvent(student, activity, { event_type: "complete", correct: true, duration_ms: durationMs });
}

export async function logHint(activityId: string) {
  const { student, activity } = await load(activityId);
  await recordEvent(student, activity, { event_type: "hint" });
}

/** A question that pops up when the video pauses. Logged as an attempt on the video step. */
export async function answerPausePoint(activityId: string, atSeconds: number, answer: number): Promise<AnswerResult> {
  const { student, activity } = await load(activityId);
  if (activity.type !== "video") throw new Error(NOT_ALLOWED);
  const result = checkPausePoint(activity, Number(atSeconds), Number(answer));
  await recordEvent(student, activity, { event_type: "attempt", correct: result.correct, payload: { pause_at: Number(atSeconds), answer: Number(answer) } });
  return result;
}
