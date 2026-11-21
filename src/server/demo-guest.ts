import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_CLASS_CODE, MAX_GUESTS, guestCutoff, guestName } from "@/lib/demo-guest";
import { demoSessionDates, demoSessionId, pickScenario, planGuestStart } from "@/lib/demo-start";
import { generateJoinCode, hashJoinCode } from "@/lib/join-codes";
import { schoolToday } from "@/lib/school-date";

type Db = ReturnType<typeof createAdminClient>;
export type GuestResult =
  | { ok: true; studentId: string; classId: string }
  | { ok: false; reason: "busy" | "failed" };

type Unit = { id: string; lessons: { id: string }[] };

/** The class's published units and their published lessons, in curriculum order. */
async function loadUnits(db: Db, classId: string): Promise<Unit[]> {
  const { data } = await db.from("class_modules").select("position, modules(id, status, lessons(id, position, status))").eq("class_id", classId).order("position");
  type Row = { modules: { id: string; status: string; lessons: { id: string; position: number; status: string }[] } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.modules?.status === "published")
    .map((r) => ({ id: r.modules!.id, lessons: r.modules!.lessons.filter((l) => l.status === "published").sort((a, b) => a.position - b.position).map((l) => ({ id: l.id })) }));
}

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
    // upsert, ignoring rows that already exist: two guests joining at the same moment must not collide
    const { error } = await db.from("class_modules").upsert(missing.map((m, i) => ({ class_id: cls.id, module_id: m.id, position: start + i + 1 })), { onConflict: "class_id,module_id", ignoreDuplicates: true });
    if (error) console.error("Demo guest login: could not assign units to the DEMO class", error);
  }
  // Class days for the lessons after unit 1, all in the past: any of them a guest has not finished shows as "missed"
  // (once they can open it) and can be caught up.
  const { count: days } = await db.from("class_sessions").select("id", { count: "exact", head: true }).eq("class_id", cls.id);
  if (!days) {
    const lessons = (await loadUnits(db, cls.id)).slice(1).flatMap((u) => u.lessons);
    const dates = demoSessionDates(schoolToday(), lessons.length);
    if (lessons.length) {
      const rows = await Promise.all(lessons.map(async (l, i) => ({ id: await demoSessionId(cls.id, l.id), class_id: cls.id, lesson_id: l.id, session_date: dates[i] })));
      const { error } = await db.from("class_sessions").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (error) console.error("Demo guest login: could not add class days to the DEMO class", error);
    }
  }
  return cls;
}

/** Starts the guest part-way through the course, at one of several starting points picked at random (see lib/demo-start.ts).
 *  A failure here never stops the guest joining. */
async function giveHeadStart(db: Db, studentId: string, classId: string) {
  try {
    const units = (await loadUnits(db, classId)).slice(0, 2);
    if (!units.length) return;
    const [acts, tests] = await Promise.all([
      db.from("activities").select("id, lesson_id, position, is_core, concept_tag").in("lesson_id", units.flatMap((u) => u.lessons.map((l) => l.id))),
      db.from("assessments").select("module_id, kind, assessment_questions(id)").eq("reviewed", true).in("module_id", units.map((u) => u.id)),
    ]);
    const [roll, variant] = crypto.getRandomValues(new Uint32Array(2));
    const plan = planGuestStart({
      units,
      activities: acts.data ?? [],
      tests: (tests.data ?? []).map((t) => ({ module_id: t.module_id, kind: t.kind, question_ids: (t.assessment_questions as { id: string }[]).map((q) => q.id) })),
    }, pickScenario(roll / 2 ** 32), variant % 2);
    const now = new Date().toISOString();
    const results = await Promise.all([
      plan.events.length ? db.from("activity_events").insert(plan.events.map((e) => ({ student_id: studentId, class_id: classId, activity_id: e.activity_id, lesson_id: e.lesson_id, event_type: "complete", correct: true, duration_ms: 40000, concept_tag: e.concept_tag }))) : null,
      plan.statuses.length ? db.from("lesson_status").upsert(plan.statuses.map((x) => ({ student_id: studentId, lesson_id: x.lesson_id, status: x.status, updated_at: now }))) : null,
      plan.responses.length ? db.from("assessment_responses").insert(plan.responses.map((r) => ({ student_id: studentId, question_id: r.question_id, correct: r.correct }))) : null,
    ]);
    for (const r of results) if (r?.error) console.error("Demo guest login: could not set up the starting progress", r.error);
  } catch (e) {
    console.error("Demo guest login: could not set up the starting progress", e);
  }
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
  await giveHeadStart(db, guest.id, cls.id);
  return { ok: true, studentId: guest.id, classId: cls.id };
}
