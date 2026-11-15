import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateClassCode, generateJoinCode, hashJoinCode } from "@/lib/join-codes";
import { displayLabels, MAX_ROSTER_SIZE, type RosterRow } from "@/lib/roster-csv";
import type { Module } from "@/types/curriculum";
import type { Class, ClassSetup, StudentLabel } from "@/types/classes";
import { databaseError, idSchema, orderedIdsSchema, staffResult, titleSchema } from "./staff-result";

const rosterRowSchema = z.object({ name: titleSchema, school: titleSchema.optional() });
const sessionSchema = z.object({ session_date: z.iso.date(), lesson_id: idSchema });
async function configure(classId: string, operation: string, items: unknown) {
  const db = await createClient();
  const { data, error } = await db.rpc("configure_class", { target_class: idSchema.parse(classId), operation, items });
  if (error) databaseError(error);
  return data;
}
function labelsFor(students: { id: string; display_name: string }[]): StudentLabel[] {
  const labels = displayLabels(students.map((s) => s.display_name));
  return students.map((student, i) => ({ ...student, label: labels[i] }));
}
export function listMyClasses() {
  return staffResult(async (): Promise<(Pick<Class, "id" | "name" | "school" | "class_code"> & { student_count: number })[]> => {
    const db = await createClient();
    const { data, error } = await db.from("classes").select("id, name, school, class_code, students(count)").order("created_at").order("id");
    if (error) databaseError(error);
    return (data ?? []).map(({ students, ...row }) => ({ ...row, student_count: students[0]?.count ?? 0 }));
  });
}
export function createClass(input: { name: string; school: string }) {
  return staffResult(async (): Promise<{ id: string; class_code: string }> => {
    const values = z.object({ name: titleSchema, school: titleSchema }).parse(input);
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) throw new Error("Sign in before creating a class.");
    const base = generateClassCode(values.school, values.name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const class_code = attempt ? `${base}-${generateJoinCode().slice(0, 3)}` : base;
      const { data, error } = await db.from("classes").insert({ ...values, class_code, instructor_id: user.id }).select("id, class_code").single();
      if (!error) return data!;
      if (error.code !== "23505") databaseError(error);
    }
    throw new Error("That class code is already taken. Please try again.");
  });
}
export function addStudents(classId: string, input: RosterRow[]) {
  return staffResult(async (): Promise<(StudentLabel & { join_code: string })[]> => {
    idSchema.parse(classId);
    // Explicit object schema strips any extra CSV/student properties before storage.
    const rows = z.array(rosterRowSchema).min(1).max(MAX_ROSTER_SIZE).parse(input);
    const db = await createClient();
    const { data: existing, error } = await db.from("students").select("id, display_name").eq("class_id", classId).order("created_at").order("id");
    if (error) databaseError(error);
    for (let attempt = 0; attempt < 3; attempt++) {
      const codes = rows.map(() => generateJoinCode());
      const additions = await Promise.all(rows.map(async (row, i) => ({
        id: crypto.randomUUID(), ...row, join_code_hash: await hashJoinCode(classId, codes[i]),
      })));
      const { error: insertError } = await db.rpc("configure_class", { target_class: classId, operation: "students", items: additions });
      if (insertError?.code === "23505") continue;
      if (insertError) databaseError(insertError);
      // New students share a timestamp; use ID order to match getClassSetup's labels.
      const ordered = [...additions].sort((a, b) => a.id.localeCompare(b.id));
      const labels = new Map(labelsFor([...(existing ?? []), ...ordered.map((r) => ({ id: r.id, display_name: r.name }))]).map((r) => [r.id, r.label]));
      return additions.map((row, i) => ({ id: row.id, display_name: row.name, label: labels.get(row.id)!, join_code: codes[i] }));
    }
    throw new Error("We could not create unique personal codes. Please try again.");
  });
}
export function resetJoinCode(studentId: string) {
  return staffResult(async (): Promise<{ join_code: string }> => {
    const db = await createClient();
    const { data: student, error } = await db.from("students").select("class_id").eq("id", idSchema.parse(studentId)).single();
    if (error) databaseError(error);
    for (let attempt = 0; attempt < 3; attempt++) {
      const join_code = generateJoinCode();
      const { error: updateError } = await db.from("students").update({ join_code_hash: await hashJoinCode(student!.class_id, join_code) }).eq("id", studentId).select("id").single();
      if (updateError?.code === "23505") continue;
      if (updateError) databaseError(updateError);
      return { join_code };
    }
    throw new Error("We could not create a unique personal code. Please try again.");
  });
}
export function assignModules(classId: string, orderedModuleIds: string[]) {
  return staffResult(async (): Promise<null> => {
    await configure(classId, "modules", orderedIdsSchema.parse(orderedModuleIds));
    return null;
  });
}
export function setSchedule(classId: string, sessions: { session_date: string; lesson_id: string }[]) {
  return staffResult(async (): Promise<null> => {
    await configure(classId, "schedule", z.array(sessionSchema).max(366).parse(sessions));
    return null;
  });
}
export function getClassSetup(classId: string) {
  return staffResult(async (): Promise<ClassSetup> => {
    const db = await createClient();
    idSchema.parse(classId);
    const { data: classroom, error } = await db.from("classes").select("*").eq("id", classId).single();
    if (error) databaseError(error);
    const [students, modules, sessions] = await Promise.all([
      db.from("students").select("id, display_name").eq("class_id", classId).order("created_at").order("id"),
      db.from("class_modules").select("position, assigned_at, modules(*)").eq("class_id", classId).order("position").returns<{ position: number; assigned_at: string; modules: Module | null }[]>(),
      db.from("class_sessions").select("*").eq("class_id", classId).order("session_date").order("id"),
    ]);
    for (const result of [students, modules, sessions]) if (result.error) databaseError(result.error);
    return {
      class: classroom as Class, students: labelsFor(students.data ?? []),
      modules: (modules.data ?? []).flatMap((row) => row.modules ? [{ ...row.modules, position: row.position, assigned_at: row.assigned_at }] : []),
      sessions: sessions.data as ClassSetup["sessions"],
    };
  });
}
