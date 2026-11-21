"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoLogin } from "@/lib/demo-guest";
import { hashJoinCode, normalizeClassCode, normalizeJoinCode } from "@/lib/join-codes";
import { createDemoGuest } from "@/server/demo-guest";
import { endStudentSession, startStudentSession } from "@/server/student-session";

export type JoinState = { error?: string; classCode?: string };

export async function joinClass(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const classCode = normalizeClassCode(String(formData.get("classCode") ?? ""));
  const personalCode = normalizeJoinCode(String(formData.get("personalCode") ?? ""));
  if (!classCode || !personalCode) return { error: "Enter both codes from your card.", classCode };

  const db = createAdminClient();

  // The shared demo codes make a fresh guest with their own empty progress (the DEMO class is created on first use).
  if (isDemoLogin(classCode, personalCode)) {
    const guest = await createDemoGuest(db);
    if (guest.ok) {
      await startStudentSession(guest.studentId, guest.classId);
      redirect("/learn");
    }
    return {
      error: guest.reason === "busy"
        ? "The demo is full right now. Please try again in a few minutes."
        : "We couldn't start the demo just now. Please try again, or ask for a class card.",
      classCode,
    };
  }

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
