import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }) }));
import { createLessonFromTemplate, createModule, reorderModules, saveAssessment, setModuleStatus, updateActivity } from "./curriculum";
const id = "10000000-0000-0000-0000-000000000001";
beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ data: { id }, error: null }); });
it("builds a draft lesson template in one atomic request with the agreed order", async () => {
  expect((await createLessonFromTemplate(id, { title: "Loops", intro: "video", practice: "worksheet" })).ok).toBe(true);
  expect(rpc).toHaveBeenCalledTimes(1);
  const [name, { args }] = rpc.mock.calls[0];
  expect(name).toBe("edit_curriculum");
  expect(args.activities.map((a: { type: string }) => a.type)).toEqual(["video", "quiz_mcq", "worksheet", "exit_question"]);
  expect(args.patch).toEqual({ title: "Loops" });
});
it("returns teacher-readable validation errors before making a write", async () => {
  expect(await createModule({ title: "  " })).toEqual({ ok: false, error: "Enter a title." });
  expect((await reorderModules([id, id])).ok).toBe(false);
  expect((await saveAssessment(id, "pre", [{ concept_tag: "loops", prompt: "?", options: ["A", "B"], answer: 2 }])).ok).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});
it("checks the existing activity type before accepting edited content", async () => {
  from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { type: "quiz_mcq" }, error: null }) }) }) });
  expect((await updateActivity(id, { content: { heading: "Wrong type", body: "" } })).ok).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});
it("passes publish refusal and RLS denial back as Result errors", async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "Publish at least one lesson before publishing this module." } });
  expect(await setModuleStatus(id, "published")).toEqual({ ok: false, error: "Publish at least one lesson before publishing this module." });
  rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "private database details" } });
  expect(await createModule({ title: "New" })).toEqual({ ok: false, error: "You do not have permission to make that change." });
});
