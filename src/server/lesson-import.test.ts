import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { rpc, configured, chat } = vi.hoisted(() => ({
  rpc: vi.fn(),
  configured: vi.fn(),
  chat: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc }),
}));
vi.mock("@/server/ai", () => ({ aiConfigured: configured, chatJSON: chat }));
import { importSlideLesson, importVideoLesson } from "./lesson-import";
const pair = (prefix: string) =>
  [1, 2, 3].map((n) => ({
    concept_tag: "loops",
    prompt: `${prefix} ${n}`,
    options: ["A", "B"],
    answer: 0,
  }));
const draft = {
  title: "Loops",
  concept_tag: "loops",
  key_points: ["Loops repeat"],
  pause_points: [],
  quiz: { prompt: "?", options: ["A", "B"], answer: 0 },
  exercise: {
    prompt: "Print hello",
    starter_code: "",
    tests: [{ label: "hello", expectedOutput: "hello" }],
  },
  exit_question: { prompt: "Final?", options: ["A", "B"], answer: 1 },
  teaching_guide: { about: "Loops", mistakes: [], example: "", ask: [] },
  assessments: { pre: pair("Before"), post: pair("After") },
};
beforeEach(() => {
  vi.clearAllMocks();
  configured.mockReturnValue(true);
  chat.mockResolvedValue(draft);
  rpc.mockResolvedValue({
    data: { moduleId: "unit", lessonId: "lesson" },
    error: null,
  });
});
it("saves a new slide curriculum and matched pre/post quizzes with one transaction", async () => {
  const result = await importSlideLesson({
    moduleId: null,
    moduleTitle: "New course",
    deckName: "Loops",
    slides: [
      { heading: "Loops", body: "Loops repeat instructions", notes: "" },
    ],
  });
  expect(result.usedAi).toBe(true);
  expect(chat).toHaveBeenCalledTimes(1);
  expect(chat.mock.calls[0][1]).toContain("Loops repeat instructions");
  expect(rpc).toHaveBeenCalledTimes(1);
  const [method, { package: payload }] = rpc.mock.calls[0];
  expect(method).toBe("import_curriculum");
  expect(payload.module_id).toBeNull();
  expect(payload.module_title).toBe("New course");
  expect(payload.pre).toHaveLength(3);
  expect(payload.post).toHaveLength(3);
  expect(payload.steps).toHaveLength(4);
  expect(payload.steps[1].ai_suggested).toBe(true);
});
it("keeps every supported slide instead of silently cutting the deck to fifteen", async () => {
  configured.mockReturnValue(false);
  await importSlideLesson({
    moduleId: null,
    deckName: "Full deck",
    slides: Array.from({ length: 25 }, (_, i) => ({
      heading: `Slide ${i}`,
      body: "Words",
      notes: "",
    })),
  });
  expect(
    rpc.mock.calls[0][1].package.steps.filter(
      (s: { type: string }) => s.type === "slide",
    ),
  ).toHaveLength(25);
  expect(rpc.mock.calls[0][1].package.pre).toEqual([]);
});
it("uses the transcript to generate video lesson assessments and keeps the start time", async () => {
  await importVideoLesson({
    moduleId: null,
    videoId: "abcdefghijk",
    videoTitle: "Loops",
    transcript: [{ seconds: 0, text: "Loops repeat instructions" }],
    startSeconds: 10,
  });
  expect(chat.mock.calls[0][1]).toContain("Loops repeat instructions");
  expect(rpc.mock.calls[0][1].package.steps[0].content.start_seconds).toBe(10);
  expect(rpc.mock.calls[0][1].package.post).toHaveLength(3);
});
it("does not save a partial curriculum when the AI or database fails", async () => {
  chat.mockRejectedValueOnce(new Error("AI unavailable"));
  await expect(
    importSlideLesson({
      moduleId: null,
      deckName: "Loops",
      slides: [{ heading: "Loops", body: "repeat", notes: "" }],
    }),
  ).rejects.toThrow("AI unavailable");
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValueOnce({
    data: null,
    error: { code: "XX", message: "internal" },
  });
  await expect(
    importSlideLesson({
      moduleId: null,
      deckName: "Loops",
      slides: [{ heading: "Loops", body: "repeat", notes: "" }],
    }),
  ).rejects.toThrow("No partial lesson was saved");
});
