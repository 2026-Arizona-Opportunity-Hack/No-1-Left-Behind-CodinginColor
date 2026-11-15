"use server";

import { revalidatePath } from "next/cache";
import { setAttendance } from "@/server/dashboard";

// Present / absent toggle on the live classroom. The database's rules make sure a teacher
// can only mark students in their own classes.
export async function markAttendance(formData: FormData) {
  const classId = String(formData.get("classId"));
  const status = formData.get("status") === "absent" ? "absent" : "present";
  await setAttendance(String(formData.get("sessionId")), String(formData.get("studentId")), status);
  revalidatePath(`/teach/${classId}`);
}
