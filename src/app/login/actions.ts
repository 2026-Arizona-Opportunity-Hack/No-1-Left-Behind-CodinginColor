"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/roles";
import { staffHome } from "@/lib/permissions";

export type SignInState = { error?: string; email?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "That email and password don't match. Try again, or ask CIC staff to reset your password.", email };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Your account isn't set up yet. Ask CIC staff to give you access.", email };
  }
  const { data: role } = await supabase.from("staff_roles").select("permissions").eq("id", profile.role).single();
  if (!role) return { error: "Staff access is not ready. Ask CIC staff to finish setting up permissions.", email };
  redirect(safeNextPath(formData.get("next")) ?? staffHome({ role: profile.role, permissions: role.permissions }));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
