import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { configured, chat, lesson } = vi.hoisted(() => ({ configured: vi.fn(), chat: vi.fn(), lesson: vi.fn() }));
vi.mock("@/server/ai", () => ({ aiConfigured: configured, chatJSON: chat }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ maybeSingle: lesson }) }) }) }),
  }),
}));
import { draftExercise, lessonSourceText } from "./exercise-draft";

const ID = "11111111-1111-1111-1111-111111111111";
const good = {
  prompt: "Print the numbers 1 to 3",
  starter_code: "# your code",
  solution: "for n in range(1, 4):\n    print(n)",
  tests: [{ label: "Counts to 3", expectedOutput: "1\n2\n3", hint: "Use range" }],
  hints: ["Think about range"],
};

beforeEach(() => {
  configured.mockReturnValue(true);
  chat.mockReset();
  lesson.mockResolvedValue({ data: { title: "Loops", activities: [{ type: "slide", title: "s", content: { heading: "for loops", body: "repeat" } }] }, error: null });
});

describe("lessonSourceText", () => {
  it("collects slides, video points and questions, never answers", () => {
    const text = lessonSourceText("Loops", [
      { type: "slide", title: null, content: { heading: "for loops", body: "repeat things", code: "for i in range(3):" } },
      { type: "video", title: null, content: { key_points: ["Loops repeat"] } },
      { type: "quiz_mcq", title: null, content: { prompt: "What repeats?", options: ["a", "b"], answer: 1 } },
      { type: "worksheet", title: null, content: { fields: [] } },
    ]);
    expect(text).toContain("for loops");
    expect(text).toContain("Loops repeat");
    expect(text).toContain("What repeats?");
    expect(text).not.toContain("answer");
  });
});

describe("draftExercise", () => {
  it("says so when AI is off", async () => {
    configured.mockReturnValue(false);
    const r = await draftExercise(ID, "");
    expect(r.ok).toBe(false);
    expect(chat).not.toHaveBeenCalled();
  });
  it("rejects a bad lesson id without asking the AI", async () => {
    expect((await draftExercise("nope", "")).ok).toBe(false);
    expect(chat).not.toHaveBeenCalled();
  });
  it("returns a valid draft and passes the teacher's note on", async () => {
    chat.mockResolvedValue(good);
    const r = await draftExercise(ID, "make it easy");
    expect(r).toEqual({ ok: true, data: { ...good, tests: good.tests } });
    expect(chat.mock.calls[0][1]).toContain("make it easy");
  });
  it("refuses a draft with no checks instead of saving an empty exercise", async () => {
    chat.mockResolvedValue({ ...good, tests: [] });
    expect((await draftExercise(ID, "")).ok).toBe(false);
  });
  it("turns an AI failure into a plain-words error", async () => {
    chat.mockRejectedValue(new Error("The AI service didn't answer. Try again, or build the lesson by hand."));
    const r = await draftExercise(ID, "");
    expect(r).toEqual({ ok: false, error: "The AI service didn't answer. Try again, or build the lesson by hand." });
  });
});
