import { z } from "zod";
import { quizSchema } from "@/types/activity-content";
export const assessmentDraftQuestion = z
  .object({
    concept_tag: z.string().trim().min(1).max(80),
    ...quizSchema.shape,
    prompt: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2),
  })
  .refine(
    (q) => q.answer < q.options.length,
    "Choose an answer from the options.",
  );
export const assessmentPairSchema = z
  .object({
    pre: z.array(assessmentDraftQuestion).min(3).max(8),
    post: z.array(assessmentDraftQuestion).min(3).max(8),
  })
  .refine((pair) => {
    const pre = new Set(pair.pre.map((q) => q.concept_tag));
    const post = new Set(pair.post.map((q) => q.concept_tag));
    return pre.size === post.size && [...pre].every((tag) => post.has(tag));
  }, "Before and after quizzes must cover the same topics.")
  .refine(
    (pair) =>
      !pair.post.some((q) =>
        pair.pre.some(
          (p) =>
            p.prompt.trim().toLowerCase() === q.prompt.trim().toLowerCase(),
        ),
      ),
    "Use different questions for the pre-test and post-test.",
  );
export type AssessmentDraftPair = z.infer<typeof assessmentPairSchema>;
