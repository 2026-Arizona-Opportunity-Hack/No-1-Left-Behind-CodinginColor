import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";
import { ClassWizard, type WizardModule } from "./wizard";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Set up a class · CIC Launchpad" };

export default async function NewClassPage() {
  await connection(); // per-user, live data: render at request time
  await requireStaff(["instructor", "admin"], "/teach/new");
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, title, position, lessons(id, title, position)")
    .eq("status", "published")
    .order("position")
    .order("position", { referencedTable: "lessons" });
  return <ClassWizard modules={(data ?? []) as WizardModule[]} />;
}
