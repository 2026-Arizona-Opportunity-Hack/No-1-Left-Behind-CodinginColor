"use server";

import { revalidatePath } from "next/cache";
import type { ActivityType } from "@/types/activity-content";
import type { Result } from "@/types/result";
import { getStaff } from "@/server/auth";
import * as c from "@/server/curriculum";

// Curriculum editor saves (CIC staff only). Each wraps Maulik's curriculum functions (#8),
// which validate input and run as the signed-in user, so the database only allows admins.

async function adminOnly() {
  const staff = await getStaff();
  if (staff?.role !== "admin") throw new Error("Only CIC staff can edit the curriculum.");
}
async function run<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
  await adminOnly();
  const result = await work();
  if (result.ok) revalidatePath("/admin/curriculum", "layout");
  return result;
}

export const createModuleAction = async (title: string, description: string) => run(() => c.createModule({ title, description }));
export const updateModuleAction = async (id: string, title: string, description: string) => run(() => c.updateModule(id, { title, description }));
export const reorderModulesAction = async (ids: string[]) => run(() => c.reorderModules(ids));
export const setModuleStatusAction = async (id: string, status: "draft" | "published") => run(() => c.setModuleStatus(id, status));

export const createLessonAction = async (moduleId: string, title: string, template: null | { intro: "slide" | "video"; practice: "worksheet" | "code_exercise" }) =>
  run(() => (template ? c.createLessonFromTemplate(moduleId, { title, ...template }) : c.createLesson(moduleId, { title })));
export const renameLessonAction = async (id: string, title: string) => run(() => c.updateLesson(id, { title }));
export const reorderLessonsAction = async (moduleId: string, ids: string[]) => run(() => c.reorderLessons(moduleId, ids));
export const setLessonStatusAction = async (id: string, status: "draft" | "published") => run(() => c.setLessonStatus(id, status));
export const deleteLessonAction = async (id: string) => run(() => c.deleteLesson(id));

export const createActivityAction = async (lessonId: string, type: ActivityType) => run(() => c.createActivity(lessonId, type));
export const updateActivityAction = async (id: string, patch: Parameters<typeof c.updateActivity>[1]) => run(() => c.updateActivity(id, patch));
export const reorderActivitiesAction = async (lessonId: string, ids: string[]) => run(() => c.reorderActivities(lessonId, ids));
export const deleteActivityAction = async (id: string) => run(() => c.deleteActivity(id));

export const saveAssessmentAction = async (moduleId: string, kind: "pre" | "post", questions: Parameters<typeof c.saveAssessment>[2]) =>
  run(() => c.saveAssessment(moduleId, kind, questions));
