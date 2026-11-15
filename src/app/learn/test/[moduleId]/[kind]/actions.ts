"use server";

import { submitStudentTest, type TopicScore } from "@/server/student-tests";
import { getStudent } from "@/server/student-session";

export async function finishTest(moduleId: string, kind: "pre" | "post", answers: Record<string, number>): Promise<{ ok: true; scores: TopicScore[] } | { ok: false; error: string }> {
  const student = await getStudent();
  if (!student) return { ok: false, error: "Your session ended. Join your class again to keep going." };
  if (kind !== "pre" && kind !== "post") return { ok: false, error: "That test doesn't exist." };
  try {
    return { ok: true, scores: await submitStudentTest(student, String(moduleId), kind, answers ?? {}) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
