"use server";

import { markCaughtUp } from "@/server/catch-up";
import { getStudent } from "@/server/student-session";

export async function finishCatchUp(lessonId: string): Promise<boolean> {
  const student = await getStudent();
  return student ? markCaughtUp(student, String(lessonId)) : false;
}
