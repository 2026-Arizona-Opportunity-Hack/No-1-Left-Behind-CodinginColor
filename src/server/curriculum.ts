import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { activityContentSchemas, emptyContent, hintsSchema, quizSchema, teachingGuideSchema, type ActivityType } from "@/types/activity-content";
import type { Activity, Assessment, Lesson, Module, ModuleTree, PublishStatus } from "@/types/curriculum";
import { databaseError, idSchema, orderedIdsSchema, staffResult, titleSchema } from "./staff-result";

const statusSchema = z.enum(["draft", "published"]);
const kindSchema = z.enum(["pre", "post"]);
const typeSchema = z.enum(Object.keys(activityContentSchemas) as [ActivityType, ...ActivityType[]]);
const modulePatch = z.object({ title: titleSchema.optional(), description: z.string().max(10000).nullable().optional() }).strict();
const lessonPatch = z.object({ title: titleSchema.optional(), recap: z.json().nullable().optional() }).strict();
const questionSchema = z.object({
  id: idSchema.optional(), position: z.number().int().positive().optional(),
  concept_tag: z.string().trim().min(1), prompt: z.string(), options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(), explanation: z.string().optional(),
}).refine((q) => q.answer < q.options.length, "Choose an answer from the options.");

async function edit<T>(operation: string, entity: string, args: Record<string, unknown>): Promise<T> {
  const db = await createClient();
  const { data, error } = await db.rpc("edit_curriculum", { operation, args: { entity, ...args } });
  if (error) databaseError(error);
  return data as T;
}
export function listModules() {
  return staffResult(async (): Promise<(Module & { lesson_count: number })[]> => {
    const db = await createClient();
    const { data, error } = await db.from("modules").select("*, lessons(count)").order("position").order("id");
    if (error) databaseError(error);
    return (data ?? []).map(({ lessons, ...module }) => ({ ...module, lesson_count: lessons[0]?.count ?? 0 })) as (Module & { lesson_count: number })[];
  });
}
export function getModuleTree(moduleId: string) {
  return staffResult(async (): Promise<ModuleTree> => {
    const db = await createClient();
    const { data, error } = await db.from("modules").select("*, lessons(*, activities(*))").eq("id", idSchema.parse(moduleId)).single();
    if (error) databaseError(error);
    const tree = data as ModuleTree;
    tree.lessons.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    tree.lessons.forEach((l) => l.activities.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)));
    return tree;
  });
}
export function createModule(input: { title: string; description?: string }) {
  return staffResult(() => edit<Module>("create", "modules", { patch: z.object({ title: titleSchema, description: z.string().max(10000).optional() }).parse(input) }));
}
export function updateModule(id: string, patch: z.input<typeof modulePatch>) {
  return staffResult(() => edit<Module>("update", "modules", { id: idSchema.parse(id), patch: modulePatch.parse(patch) }));
}
export function reorderModules(orderedIds: string[]) {
  return staffResult(() => edit<null>("reorder", "modules", { ids: orderedIdsSchema.parse(orderedIds) }));
}
export function setModuleStatus(id: string, status: PublishStatus) {
  return staffResult(() => edit<Module>("update", "modules", { id: idSchema.parse(id), patch: { status: statusSchema.parse(status) } }));
}
export function createLesson(moduleId: string, input: { title: string }) {
  return staffResult(() => edit<Lesson>("create", "lessons", { parent_id: idSchema.parse(moduleId), patch: z.object({ title: titleSchema }).parse(input) }));
}
export function createLessonFromTemplate(moduleId: string, input: { title: string; intro: "slide" | "video"; practice: "worksheet" | "code_exercise" }) {
  return staffResult(() => {
    const parsed = z.object({ title: titleSchema, intro: z.enum(["slide", "video"]), practice: z.enum(["worksheet", "code_exercise"]) }).parse(input);
    return edit<Lesson>("create", "lessons", {
      parent_id: idSchema.parse(moduleId), patch: { title: parsed.title },
      activities: [parsed.intro, "quiz_mcq", parsed.practice, "exit_question"].map((type) => ({ type, content: emptyContent(type as ActivityType) })),
    });
  });
}
export function updateLesson(id: string, patch: z.input<typeof lessonPatch>) {
  return staffResult(() => edit<Lesson>("update", "lessons", { id: idSchema.parse(id), patch: lessonPatch.parse(patch) }));
}
export function reorderLessons(moduleId: string, orderedIds: string[]) {
  return staffResult(() => edit<null>("reorder", "lessons", { parent_id: idSchema.parse(moduleId), ids: orderedIdsSchema.parse(orderedIds) }));
}
export function setLessonStatus(id: string, status: PublishStatus) {
  return staffResult(() => edit<Lesson>("update", "lessons", { id: idSchema.parse(id), patch: { status: statusSchema.parse(status) } }));
}
export function deleteLesson(id: string) {
  return staffResult(() => edit<null>("delete", "lessons", { id: idSchema.parse(id) }));
}
export function createActivity(lessonId: string, type: ActivityType) {
  return staffResult(() => {
    const validType = typeSchema.parse(type);
    return edit<Activity>("create", "activities", { parent_id: idSchema.parse(lessonId), patch: { type: validType, content: emptyContent(validType) } });
  });
}
const activityPatch = z.object({
  title: z.string().max(200).nullable().optional(), content: z.unknown().optional(),
  concept_tag: z.string().max(200).nullable().optional(), is_core: z.boolean().optional(),
  teaching_guide: teachingGuideSchema.nullable().optional(), hints: hintsSchema.nullable().optional(),
}).strict();
export function updateActivity(id: string, input: z.input<typeof activityPatch>) {
  return staffResult(async () => {
    const patch = activityPatch.parse(input);
    idSchema.parse(id);
    if (Object.hasOwn(input, "content")) {
      const db = await createClient();
      const { data, error } = await db.from("activities").select("type").eq("id", id).single();
      if (error) databaseError(error);
      patch.content = activityContentSchemas[typeSchema.parse(data!.type)].parse(input.content);
    }
    return edit<Activity>("update", "activities", { id, patch });
  });
}
export function reorderActivities(lessonId: string, orderedIds: string[]) {
  return staffResult(() => edit<null>("reorder", "activities", { parent_id: idSchema.parse(lessonId), ids: orderedIdsSchema.parse(orderedIds) }));
}
export function deleteActivity(id: string) {
  return staffResult(() => edit<null>("delete", "activities", { id: idSchema.parse(id) }));
}
export function getAssessment(moduleId: string, kind: "pre" | "post") {
  return staffResult(async (): Promise<Assessment> => {
    const db = await createClient();
    const { data, error } = await db.from("assessments").select("id, reviewed, assessment_questions(*)")
      .eq("module_id", idSchema.parse(moduleId)).eq("kind", kindSchema.parse(kind)).maybeSingle();
    if (error) databaseError(error);
    // A new module has no test yet: return an empty one for the editor to fill in (saveAssessment creates it).
    if (!data) return { id: null, reviewed: false, questions: [] };
    return { id: data.id, reviewed: data.reviewed, questions: data.assessment_questions.map((q) => ({ id: q.id, position: q.position, concept_tag: q.concept_tag, ...quizSchema.parse(q.content) })).sort((a, b) => a.position - b.position) };
  });
}
export function saveAssessment(moduleId: string, kind: "pre" | "post", questions: z.input<typeof questionSchema>[]) {
  return staffResult(async () => {
    const id = await edit<string>("assessment", "modules", { parent_id: idSchema.parse(moduleId), kind: kindSchema.parse(kind), questions: z.array(questionSchema).parse(questions) });
    return { id };
  });
}

export function deleteModule(id: string) {
  return staffResult(async () => {
    const { error } = await (await createClient()).rpc("delete_curriculum_module", { target_module: idSchema.parse(id) });
    if (error) databaseError(error);
    return null;
  });
}
