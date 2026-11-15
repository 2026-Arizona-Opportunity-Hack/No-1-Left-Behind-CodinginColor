import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { activityContentSchemas, emptyContent, teachingGuideSchema } from "@/types/activity-content";
import { aiConfigured, chatJSON } from "@/server/ai";
import type { TranscriptLine } from "@/server/youtube";

// YouTube link → draft lesson. Only the video's captions go to the AI (curriculum text, never student
// data). Every AI-drafted step is saved with ai_suggested = true in a DRAFT lesson: the database refuses to
// publish it until a person reviews and saves each step. Without an AI key we still build a starter
// lesson (the video + CIC's template steps) for staff to fill in by hand.

const SYSTEM = `You are a curriculum assistant for Coding in Color, a nonprofit teaching Python to high school
beginners (ages 14-18) whose schools don't offer computer science. Teachers may have no coding background.
From a video transcript, draft ONE short interactive lesson. Use plain, friendly, encouraging language.
Return ONLY a JSON object, no other text, with exactly these keys:
{
 "title": "short lesson title",
 "concept_tag": "one lowercase topic word, e.g. loops",
 "key_points": ["3 to 5 one-sentence key ideas from the video"],
 "pause_points": [{"at_seconds": 0, "prompt": "question", "options": ["A","B","C"], "answer": 0}],
 "quiz": {"prompt": "check-for-understanding question", "options": ["A","B","C"], "answer": 0, "explanation": "why"},
 "exercise": {"prompt": "a small Python task", "starter_code": "code with a gap or bug",
   "tests": [{"label": "what it checks", "expectedOutput": "exact printed output", "hint": "a nudge, not the answer"}]},
 "exit_question": {"prompt": "final question", "options": ["A","B","C"], "answer": 0, "explanation": "why"},
 "teaching_guide": {"about": "what this is about, in plain words for a non-CS teacher", "mistakes": ["common mistake"],
   "example": "a short worked Python example", "ask": ["a question to ask the student, never the answer"]}
}
Rules: 2 or 3 pause_points at moments the transcript has just explained an idea (at_seconds from the timestamps).
"answer" is the 0-based index of the correct option. Exercise tests compare printed output exactly; give 1-3 tests.
Use only Python 3 standard features. Never include personal information.
Plain text only: no Markdown, no code fences, no backticks. Put code on its own lines inside "prompt" using real
line breaks. Keep every answer option on ONE line (write outputs like "1, 2, 3").`;

/** Removes Markdown the AI sometimes adds anyway, and keeps answer options on one line. */
function tidy(value: unknown, inOptions = false): unknown {
  if (typeof value === "string") {
    const t = value.replace(/```[a-zA-Z]*\n?/g, "").replace(/`([^`]*)`/g, "$1").trim();
    return inOptions ? t.replace(/\\n|\n/g, ", ") : t;
  }
  if (Array.isArray(value)) return value.map((v) => tidy(v, inOptions));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidy(v, k === "options" || inOptions)]));
  }
  return value;
}

const draftSchema = z.object({
  title: z.string().min(1).max(120),
  concept_tag: z.string().min(1).max(40),
  key_points: z.array(z.string()).min(1).max(8),
  pause_points: z.array(z.unknown()).max(5),
  quiz: z.unknown(),
  exercise: z.object({ prompt: z.string(), starter_code: z.string(), tests: z.array(z.unknown()) }),
  exit_question: z.unknown(),
  teaching_guide: z.unknown(),
});

export type ImportResult = { lessonId: string; usedAi: boolean; note: string | null };

export async function importVideoLesson(input: {
  moduleId: string; videoId: string; videoTitle: string | null; transcript: TranscriptLine[] | null; startSeconds?: number;
}): Promise<ImportResult> {
  let draft: z.infer<typeof draftSchema> | null = null;
  let note: string | null = null;
  if (!aiConfigured()) note = "AI drafting is off (no AI key), so we built a starter lesson with your video for you to fill in.";
  else if (!input.transcript?.length) note = "We couldn't read this video's captions, so we built a starter lesson with your video to fill in.";
  else {
    // Long videos: draft from the part the link points at (…&t=…), about the next 15 minutes.
    const start = input.startSeconds ?? 0;
    const fromStart = input.transcript.filter((l) => l.seconds >= start);
    const transcript = (fromStart.length ? fromStart : input.transcript).map((l) => `[${Math.floor(l.seconds / 60)}:${String(l.seconds % 60).padStart(2, "0")}] ${l.text}`).join("\n").slice(0, 14000);
    const parsed = draftSchema.safeParse(tidy(await chatJSON(SYSTEM, `Video title: ${input.videoTitle ?? "(unknown)"}\n\nTranscript:\n${transcript}`)));
    if (parsed.success) draft = parsed.data;
    else note = "The AI's draft was incomplete, so we built a starter lesson instead. Try again or fill it in.";
  }

  // Keep only the parts that pass the same checks the editor uses; fall back to empty starters.
  const valid = <K extends keyof typeof activityContentSchemas>(type: K, value: unknown) => {
    const r = activityContentSchemas[type].safeParse(value);
    return r.success ? r.data : null;
  };
  const pausePoints = (draft?.pause_points ?? []).map((p) => valid("quiz_mcq", p) && (p as { at_seconds?: number }).at_seconds !== undefined ? p : null).filter(Boolean);
  const startAt = input.startSeconds ? { start_seconds: input.startSeconds } : {};
  const video = valid("video", { youtube_id: input.videoId, key_points: draft?.key_points ?? [], pause_points: pausePoints, ...startAt })
    ?? { youtube_id: input.videoId, key_points: [], pause_points: [], ...startAt };
  const quiz = draft ? valid("quiz_mcq", draft.quiz) : null;
  const exercise = draft ? valid("code_exercise", draft.exercise) : null;
  const exit = draft ? valid("exit_question", draft.exit_question) : null;
  const guide = draft ? teachingGuideSchema.safeParse(draft.teaching_guide) : null;
  const ai = (part: unknown) => Boolean(draft && part);
  const topic = draft?.concept_tag.toLowerCase() ?? null;

  const db = await createClient(); // the signed-in admin; RLS only lets admins write curriculum
  const { data: last } = await db.from("lessons").select("position").eq("module_id", input.moduleId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data: lesson, error } = await db.from("lessons").insert({
    module_id: input.moduleId,
    title: draft?.title ?? input.videoTitle ?? "New video lesson",
    position: (last?.position ?? 0) + 1,
    source: "youtube",
    source_url: `https://www.youtube.com/watch?v=${input.videoId}`,
    recap: draft ? { minutes: 2, key_points: draft.key_points } : null,
    status: "draft",
  }).select("id").single();
  if (error || !lesson) throw new Error("Only CIC staff can create lessons.");

  const steps = [
    { type: "video", title: input.videoTitle ?? "Watch the video", content: video, ai_suggested: ai(draft?.key_points.length) },
    { type: "quiz_mcq", title: "Quick check", content: quiz ?? emptyContent("quiz_mcq"), ai_suggested: ai(quiz) },
    { type: "code_exercise", title: "Your turn", content: exercise ?? emptyContent("code_exercise"), ai_suggested: ai(exercise),
      teaching_guide: guide?.success ? guide.data : null },
    { type: "exit_question", title: "Exit question", content: exit ?? emptyContent("exit_question"), ai_suggested: ai(exit) },
  ].map((s, i) => ({ ...s, lesson_id: lesson.id, position: i + 1, concept_tag: topic, is_core: true }));
  const { error: stepsError } = await db.from("activities").insert(steps);
  if (stepsError) throw new Error("We created the lesson but couldn't add its steps. Try again.");
  return { lessonId: lesson.id, usedAi: Boolean(draft), note };
}
