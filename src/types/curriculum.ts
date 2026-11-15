import type { ActivityContent, ActivityType } from "./activity-content";
import type { z } from "zod";
import type { teachingGuideSchema } from "./activity-content";
export type PublishStatus = "draft" | "published";
export type Module = { id: string; title: string; description: string | null; position: number; status: PublishStatus; created_by: string | null; created_at: string; updated_at: string };
export type Lesson = { id: string; module_id: string; title: string; position: number; status: PublishStatus; source: "manual" | "pptx" | "pdf" | "youtube"; source_url: string | null; recap: unknown; created_at: string; updated_at: string };
export type Activity = { id: string; lesson_id: string; type: ActivityType; title: string | null; position: number; content: ActivityContent; concept_tag: string | null; is_core: boolean; ai_suggested: boolean; teaching_guide: z.infer<typeof teachingGuideSchema> | null; hints: string[] | null; created_at: string; updated_at: string };
export type ModuleTree = Module & { lessons: (Lesson & { activities: Activity[] })[] };
export type AssessmentQuestion = { id: string; position: number; concept_tag: string; prompt: string; options: string[]; answer: number; explanation?: string };
export type Assessment = { id: string | null; questions: AssessmentQuestion[] }; // id is null until the first save
