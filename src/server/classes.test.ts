import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { rpc, from, getUser } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from, auth: { getUser } }) }));
import { addStudents, assignModules, createClass, setSchedule } from "./classes";
const classId = "c0000000-0000-0000-0000-000000000003";
beforeEach(() => { vi.clearAllMocks(); rpc.mockResolvedValue({ data: null, error: null }); });
it("never sends extra student fields or plaintext personal codes to the database", async () => {
  from.mockReturnValue({ select: () => ({ eq: () => ({ order: () => ({ order: async () => ({ data: [], error: null }) }) }) }) });
  const result = await addStudents(classId, [{ name: "Test Student", school: "Test School", email: "discard@example.com" } as { name: string; school: string }]);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const [method, { items }] = rpc.mock.calls[0];
  expect(method).toBe("configure_class");
  expect(Object.keys(items[0]).sort()).toEqual(["id", "join_code_hash", "name", "school"]);
  expect(items[0].join_code_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(result.data[0].join_code).toHaveLength(6);
  expect(result.data[0]).not.toHaveProperty("join_code_hash");
});
it("requires a verified staff session before creating a class", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(await createClass({ name: "P3", school: "Test" })).toEqual({ ok: false, error: "Sign in before creating a class." });
  expect(from).not.toHaveBeenCalled();
});
it("rejects duplicate module IDs and impossible dates before replacing anything", async () => {
  expect((await assignModules(classId, [classId, classId])).ok).toBe(false);
  expect((await setSchedule(classId, [{ session_date: "2027-02-30", lesson_id: classId }])).ok).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});
