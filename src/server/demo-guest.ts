import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_CLASS_CODE, MAX_GUESTS, guestCutoff, guestName } from "@/lib/demo-guest";
import { generateJoinCode, hashJoinCode } from "@/lib/join-codes";

type Db = ReturnType<typeof createAdminClient>;
export type GuestResult =
  | { ok: true; studentId: string; classId: string }
  | { ok: false; reason: "no_demo_class" | "busy" | "failed" };

/**
 * Makes a fresh guest student in the DEMO class. Old guests are deleted first (their progress goes with them),
 * and the number of guests is capped. If the DEMO class has not been created, nothing happens and the normal
 * join check runs, so this changes nothing for sites that don't use it.
 */
export async function createDemoGuest(db: Db): Promise<GuestResult> {
  const { data: cls } = await db.from("classes").select("id, school").eq("class_code", DEMO_CLASS_CODE).maybeSingle();
  if (!cls) return { ok: false, reason: "no_demo_class" };

  // Tidy up: only guests (named "Guest-1234") that are old enough. Real students in this class are never touched.
  await db.from("students").delete().eq("class_id", cls.id).like("display_name", "Guest-%").lt("created_at", guestCutoff());

  const { count } = await db.from("students").select("id", { count: "exact", head: true }).eq("class_id", cls.id);
  if ((count ?? 0) >= MAX_GUESTS) return { ok: false, reason: "busy" };

  // The guest gets a random personal code nobody knows, so the shared demo code can never sign in as this guest later.
  const { data: guest, error } = await db.from("students")
    .insert({ class_id: cls.id, display_name: guestName(), school: cls.school, join_code_hash: await hashJoinCode(cls.id, generateJoinCode() + generateJoinCode()) })
    .select("id").single();
  if (error || !guest) return { ok: false, reason: "failed" };
  return { ok: true, studentId: guest.id, classId: cls.id };
}
