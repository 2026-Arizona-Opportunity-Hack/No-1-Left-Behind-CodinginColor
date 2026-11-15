import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";

export const metadata: Metadata = { title: "My classes · CIC Launchpad" };

export default async function TeachHome() {
  const staff = await requireStaff(["instructor", "admin"], "/teach");
  const supabase = await createClient();
  // The database only returns classes this teacher owns (admins see all).
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, school, class_code, students(count)")
    .order("school")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{staff.role === "admin" ? "All classes" : "My classes"}</h1>
        <Link href="/teach/new" className={buttonVariants({ size: "lg" })}>+ Set up a class</Link>
      </div>
      {!classes?.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">You don&apos;t have any classes yet.</p>
          <p className="mt-1 text-muted-foreground">Set one up in a few minutes: add your roster, pick units, print join cards.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teach/${c.id}`} className="block rounded-xl border p-5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
              <p className="text-sm text-muted-foreground">{c.school}</p>
              <p className="text-xl font-semibold">{c.name}</p>
              <p className="mt-2 text-sm">
                Class code <span className="font-mono font-semibold">{c.class_code}</span> ·{" "}
                {(c.students as unknown as { count: number }[])[0]?.count ?? 0} students
              </p>
              <p className="mt-3 text-sm font-medium underline underline-offset-4">Open live classroom</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
