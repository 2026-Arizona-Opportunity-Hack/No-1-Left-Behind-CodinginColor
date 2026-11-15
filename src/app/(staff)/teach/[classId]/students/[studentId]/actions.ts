"use server";

import { revalidatePath } from "next/cache";
import { lockModule, setLessonExempt, setStartModule, unlockModule } from "@/server/dashboard";

// Teacher controls on the student page. Each server function validates ids and the database's
// rules only allow changes for students in the teacher's own classes.

function pathOf(formData: FormData) {
  return `/teach/${String(formData.get("classId"))}/students/${String(formData.get("studentId"))}`;
}

export async function saveStartModule(formData: FormData) {
  const moduleId = String(formData.get("moduleId") ?? "");
  await setStartModule(String(formData.get("studentId")), moduleId || null);
  revalidatePath(pathOf(formData));
}

export async function toggleUnlock(formData: FormData) {
  const studentId = String(formData.get("studentId"));
  const moduleId = String(formData.get("moduleId"));
  if (formData.get("unlocked") === "true") await lockModule(studentId, moduleId);
  else await unlockModule(studentId, moduleId);
  revalidatePath(pathOf(formData));
}

export async function skipLesson(formData: FormData) {
  await setLessonExempt(String(formData.get("studentId")), String(formData.get("lessonId")));
  revalidatePath(pathOf(formData));
}
