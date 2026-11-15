import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// Students don't have accounts or passwords (CIC's rule). After they enter their class
// code + personal code, we give them a signed, httpOnly cookie with their student id.
// Page scripts can't read it, and editing it breaks the signature.
const COOKIE = "cic_student";
const MAX_AGE_SECONDS = 12 * 60 * 60; // a school day; shared Chromebooks shouldn't stay signed in

type Payload = { sid: string; cid: string; exp: number };
export type Student = { id: string; displayName: string; classId: string; className: string; school: string };

async function sign(data: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))).toString("base64url");
}

export async function startStudentSession(studentId: string, classId: string) {
  const payload: Payload = { sid: studentId, cid: classId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${await sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endStudentSession() {
  (await cookies()).delete(COOKIE);
}

async function readSession(): Promise<Payload | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const [body, sig] = raw?.split(".") ?? [];
  if (!body || !sig) return null;
  const expected = Buffer.from(await sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

/** The signed-in student, or null. Looked up fresh, so a removed student is signed out. */
export const getStudent = cache(async (): Promise<Student | null> => {
  const session = await readSession();
  if (!session) return null;
  const { data } = await createAdminClient()
    .from("students")
    .select("id, display_name, class_id, classes(name, school)")
    .eq("id", session.sid)
    .eq("class_id", session.cid)
    .single();
  if (!data) return null;
  const cls = data.classes as unknown as { name: string; school: string };
  return { id: data.id, displayName: data.display_name, classId: data.class_id, className: cls.name, school: cls.school };
});

export async function requireStudent(): Promise<Student> {
  const student = await getStudent();
  if (!student) redirect("/join");
  return student;
}
