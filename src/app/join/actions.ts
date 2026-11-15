"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashJoinCode, normalizeClassCode, normalizeJoinCode } from "@/lib/join-codes";
import { endStudentSession, startStudentSession } from "@/server/student-session";

export type JoinState = { error?: string; classCode?: string };

export async function joinClass(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const classCode = normalizeClassCode(String(formData.get("classCode") ?? ""));
  const personalCode = normalizeJoinCode(String(formData.get("personalCode") ?? ""));
  if (!classCode || !personalCode) return { error: "Enter both codes from your card.", classCode };

  const db = createAdminClient();
  const { data: cls } = await db.from("classes").select("id").eq("class_code", classCode).maybeSingle();
  const student = cls
    ? (await db.from("students").select("id")
        .eq("class_id", cls.id)
        .eq("join_code_hash", await hashJoinCode(cls.id, personalCode))
        .maybeSingle()).data
    : null;
  // Same message either way, so nobody can find out which class codes exist.
  if (!cls || !student) {
    return { error: "Those codes don't match. Check both codes on your card, or ask your teacher.", classCode };
  }
  await startStudentSession(student.id, cls.id);
  redirect("/learn");
}

export async function leaveClass() {
  await endStudentSession();
  redirect("/join");
}
