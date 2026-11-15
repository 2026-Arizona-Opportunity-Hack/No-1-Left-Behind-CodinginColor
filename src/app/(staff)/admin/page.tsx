import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";

export const metadata: Metadata = { title: "CIC staff · CIC Launchpad" };

export default async function AdminHome() {
  const staff = await requireStaff(["admin"], "/admin");
  const supabase = await createClient();
  const count = async (table: string) =>
    (await supabase.from(table).select("*", { count: "exact", head: true })).count ?? 0;
  const [modules, classes, students] = await Promise.all([count("modules"), count("classes"), count("students")]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Hi {staff.displayName}</h1>
      <dl className="grid gap-4 sm:grid-cols-3">
        {[["Units in the curriculum", modules], ["Classes", classes], ["Students", students]].map(([label, value]) => (
          <div key={label} className="rounded-xl border p-5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/curriculum" className="font-medium underline underline-offset-4">Edit the curriculum</Link>
        <Link href="/review" className="font-medium underline underline-offset-4">Browse the curriculum</Link>
        <Link href="/teach" className="font-medium underline underline-offset-4">See all classes</Link>
      </div>
    </div>
  );
}
