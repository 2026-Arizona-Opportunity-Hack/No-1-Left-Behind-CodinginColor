import { z } from "zod";
export type { CodeCheck } from "@/lib/python/runner";

const text = z.string();
const strings = z.array(text);
export const codeCheckSchema = z.object({
  label: text, stdin: text.optional(), expectedOutput: text.optional(),
  assert: text.optional(), hint: text.optional(),
}).refine((v) => v.expectedOutput !== undefined || v.assert !== undefined,
  "Each check needs expected output or an assertion.");
export const quizSchema = z.object({
  prompt: text, options: strings.min(2), answer: z.number().int().nonnegative(),
  explanation: text.optional(),
}).refine((v) => v.answer < v.options.length, "Choose an answer from the options.");
export const teachingGuideSchema = z.object({ about: text, mistakes: strings, example: text, ask: strings });
export const hintsSchema = strings;
export const activityContentSchemas = {
  slide: z.object({ heading: text, body: text, code: text.optional(), output: text.optional(), image_url: z.union([z.literal(""), z.url()]).optional() }),
  video: z.object({
    youtube_id: text, key_points: strings,
    start_seconds: z.number().int().nonnegative().optional(), // where the lesson's part of the video begins
    pause_points: z.array(z.object({
      at_seconds: z.number().nonnegative(), prompt: text, options: strings.min(2), answer: z.number().int().nonnegative(),
    }).refine((v) => v.answer < v.options.length, "Choose an answer from the options.")),
  }),
  quiz_mcq: quizSchema,
  exit_question: quizSchema,
  predict_output: z.object({ prompt: text, code: text, answer: text, explanation: text.optional() }),
  fix_bug: z.object({ prompt: text, starter_code: text, bug_line: z.number().int().positive().optional(), tests: z.array(codeCheckSchema) }),
  fill_blank: z.object({ prompt: text, template: text.includes("____"), answers: strings.min(1) }),
  parsons: z.object({ prompt: text, lines: strings.min(1) }),
  code_exercise: z.object({ prompt: text, starter_code: text, tests: z.array(codeCheckSchema) }),
  worksheet: z.object({
    instructions: text.optional(), fields: z.array(z.object({
      id: text.min(1), label: text, kind: z.enum(["short", "long", "number"]), required: z.boolean().optional(),
    })),
  }).refine((v) => new Set(v.fields.map((f) => f.id)).size === v.fields.length, "Each worksheet field needs a different ID."),
};
export type ActivityType = keyof typeof activityContentSchemas;
export type ActivityContentMap = { [K in ActivityType]: z.infer<(typeof activityContentSchemas)[K]> };
export type ActivityContent = ActivityContentMap[ActivityType];

export function emptyContent<T extends ActivityType>(type: T): ActivityContentMap[T] {
  const starters: ActivityContentMap = {
    slide: { heading: "New slide", body: "" },
    video: { youtube_id: "", key_points: [], pause_points: [] },
    quiz_mcq: { prompt: "New question", options: ["Option 1", "Option 2"], answer: 0 },
    exit_question: { prompt: "What did you learn?", options: ["Option 1", "Option 2"], answer: 0 },
    predict_output: { prompt: "What will this code print?", code: 'print("Hello")', answer: "Hello" },
    fix_bug: { prompt: "Fix the code.", starter_code: "", tests: [] },
    fill_blank: { prompt: "Fill in the blank.", template: "print(____)", answers: ['"Hello"'] },
    parsons: { prompt: "Put the lines in order.", lines: ['print("Hello")'] },
    code_exercise: { prompt: "Write your code.", starter_code: "", tests: [] },
    worksheet: { instructions: "", fields: [{ id: "answer", label: "Your answer", kind: "long" }] },
  };
  return starters[type];
}
