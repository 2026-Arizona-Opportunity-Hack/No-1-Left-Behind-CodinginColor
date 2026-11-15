import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";
import { ClassWizard, type WizardModule } from "./wizard";

export const metadata: Metadata = { title: "Set up a class · CIC Launchpad" };

export default async function NewClassPage() {
  await requireStaff(["instructor", "admin"], "/teach/new");
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, title, position, lessons(id, title, position)")
    .eq("status", "published")
    .order("position")
    .order("position", { referencedTable: "lessons" });
  return <ClassWizard modules={(data ?? []) as WizardModule[]} />;
}
