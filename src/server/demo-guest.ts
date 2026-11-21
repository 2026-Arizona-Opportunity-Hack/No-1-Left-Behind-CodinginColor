import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_CLASS_CODE, MAX_GUESTS, guestCutoff, guestName } from "@/lib/demo-guest";
import { generateJoinCode, hashJoinCode } from "@/lib/join-codes";

type Db = ReturnType<typeof createAdminClient>;
export type GuestResult =
  | { ok: true; studentId: string; classId: string }
  | { ok: false; reason: "busy" | "failed" };

/**
 * Makes sure the shared DEMO class exists and has every published unit, creating it the first time the demo
 * codes are used. (supabase/demo-class.sql does the same thing by hand; running it is no longer required.)
 */
async function ensureDemoClass(db: Db): Promise<{ id: string; school: string } | null> {
  const find = () => db.from("classes").select("id, school").eq("class_code", DEMO_CLASS_CODE).maybeSingle();
  let { data: cls } = await find();
  if (!cls) {
    const created = await db.from("classes").insert({ name: "Demo class", school: "Try it out", class_code: DEMO_CLASS_CODE, instructor_id: null }).select("id, school").single();
    // Two visitors can arrive at the same moment; the loser of the race just reads the winner's class.
    cls = created.data ?? (await find()).data;
    if (!cls) { console.error("Demo guest login: could not create the DEMO class", created.error); return null; }
  }
  // Keep the demo up to date: every published unit, in curriculum order.
  const [units, assigned] = await Promise.all([
    db.from("modules").select("id").eq("status", "published").order("position"),
    db.from("class_modules").select("module_id, position").eq("class_id", cls.id),
  ]);
  const have = new Set((assigned.data ?? []).map((r) => r.module_id));
  const missing = (units.data ?? []).filter((m) => !have.has(m.id));
  if (missing.length) {
    const start = Math.max(0, ...(assigned.data ?? []).map((r) => r.position));
    const { error } = await db.from("class_modules").insert(missing.map((m, i) => ({ class_id: cls.id, module_id: m.id, position: start + i + 1 })));
    if (error) console.error("Demo guest login: could not assign units to the DEMO class", error);
  }
  return cls;
}

/**
 * Makes a fresh guest student in the DEMO class. Old guests are deleted first (their progress goes with them),
 * and the number of guests is capped.
 */
export async function createDemoGuest(db: Db): Promise<GuestResult> {
  const cls = await ensureDemoClass(db);
  if (!cls) return { ok: false, reason: "failed" };

  // Tidy up: only guests (named "Guest-1234") that are old enough. Real students in this class are never touched.
  await db.from("students").delete().eq("class_id", cls.id).like("display_name", "Guest-%").lt("created_at", guestCutoff());

  const { count } = await db.from("students").select("id", { count: "exact", head: true }).eq("class_id", cls.id);
  if ((count ?? 0) >= MAX_GUESTS) return { ok: false, reason: "busy" };

  // The guest gets a random personal code nobody knows, so the shared demo code can never sign in as this guest later.
  const { data: guest, error } = await db.from("students")
    .insert({ class_id: cls.id, display_name: guestName(), school: cls.school, join_code_hash: await hashJoinCode(cls.id, generateJoinCode() + generateJoinCode()) })
    .select("id").single();
  if (error || !guest) { console.error("Demo guest login: could not create a guest", error); return { ok: false, reason: "failed" }; }
  return { ok: true, studentId: guest.id, classId: cls.id };
}
