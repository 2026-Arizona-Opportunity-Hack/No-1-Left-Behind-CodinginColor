import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

const TINTS = ["bg-sky text-sky-ink", "bg-lilac text-lilac-ink", "bg-sun text-sun-ink", "bg-ontrack text-ontrack-ink"];

export const metadata: Metadata = { title: "My classes · CIC Launchpad" };

export default async function TeachHome() {
  await connection(); // per-user, live data: render at request time
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
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{staff.role === "admin" ? "All classes" : "My classes"}</h1>
        <Link href="/teach/new" className={buttonVariants({ size: "lg" })}>+ Set up a class</Link>
      </div>
      {!classes?.length ? (
        <div className="rounded-3xl border-2 border-dashed border-[#7FA08B] bg-card p-8 text-center">
          <p className="font-medium">You don&apos;t have any classes yet.</p>
          <p className="mt-1 text-muted-foreground">Set one up in a few minutes: add your roster, pick units, print join cards.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((c, i) => (
            <li key={c.id}>
              <Link href={`/teach/${c.id}`} className="block rounded-3xl bg-card p-6 text-foreground no-underline hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2">
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${TINTS[i % TINTS.length]}`}>{c.school}</span>
              <p className="mt-3 text-3xl font-bold">{c.name}</p>
              <p className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-background px-3 py-1">Code <span className="font-mono font-semibold">{c.class_code}</span></span>
                <span className="rounded-full bg-background px-3 py-1">{(c.students as unknown as { count: number }[])[0]?.count ?? 0} students</span>
              </p>
              <p className="mt-3 font-semibold text-[#047D13]">Open live classroom <span aria-hidden="true" className="font-mono font-extrabold">&gt;</span></p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
