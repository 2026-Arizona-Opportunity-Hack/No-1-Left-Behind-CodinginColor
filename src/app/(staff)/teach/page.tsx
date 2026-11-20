import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth";
import { getClassroom } from "@/server/dashboard";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

const TINTS = ["bg-sky text-sky-ink", "bg-lilac text-lilac-ink", "bg-[#CDEBD5] text-primary", "bg-ontrack text-ontrack-ink"];

export const metadata: Metadata = { title: "My classes · CIC Launchpad" };

export default async function TeachHome() {
  await connection(); // per-user, live data: render at request time
  const staff = await requirePermission("classes.manage", "/teach");
  const supabase = await createClient();
  // The database only returns classes this teacher owns (admins see all).
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, school, class_code, students(count)")
    .order("school")
    .order("name");

  // How many students in each class are behind or need help (same numbers as the live classroom).
  const rooms = await Promise.all((classes ?? []).map((c) => getClassroom(c.id)));
  const attention = new Map((classes ?? []).map((c, i) => {
    const r = rooms[i];
    return [c.id, r.ok ? r.data.counts.behind + r.data.counts.needs_help : 0] as const;
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight sm:text-[52px]"><span aria-hidden="true" className="font-mono text-[#0DB031]">&gt;</span>{staff.role === "admin" ? "All classes" : "My classes"}</h1>
          <p className="mt-2 text-xl text-muted-foreground">Open a class to see who is doing fine and who needs a hand.</p>
        </div>
        <Link href="/teach/new" className={buttonVariants({ size: "lg" })}>+ Set up a class</Link>
      </div>
      {!classes?.length ? (
        <div className="rounded-[20px] border-2 border-dashed border-[#7FA08B] bg-card p-8 text-center">
          <p className="font-medium">You don&apos;t have any classes yet.</p>
          <p className="mt-1 text-muted-foreground">Set one up in a few minutes: add your students, pick what they&apos;ll learn, print their join cards.</p>
        </div>
      ) : (
        <ul className="grid list-none gap-6 p-0 sm:grid-cols-2">
          {classes.map((c, i) => {
            const n = attention.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/teach/${c.id}`} className={`flex min-h-[230px] flex-col gap-2.5 rounded-[20px] bg-card p-6 text-foreground no-underline hover:bg-secondary ${n ? "border-2 border-primary" : "border border-border"}`}>
                  <span className={`inline-flex min-h-8 w-fit items-center rounded-[10px] px-3 text-base font-bold ${TINTS[i % TINTS.length]}`}>{c.school}</span>
                  <span className="text-3xl font-bold">{c.name}</span>
                  <span className="flex flex-wrap gap-2 text-base">
                    <span className="inline-flex min-h-8 items-center rounded-[10px] bg-secondary px-3">Code <span className="ml-1.5 font-mono font-semibold">{c.class_code}</span></span>
                    <span className="inline-flex min-h-8 items-center rounded-[10px] bg-secondary px-3">{(c.students as unknown as { count: number }[])[0]?.count ?? 0} students</span>
                    {n ? <span className="inline-flex min-h-8 items-center rounded-[10px] bg-behind px-3 font-bold text-behind-ink">⚠ {n} behind</span>
                       : <span className="inline-flex min-h-8 items-center rounded-[10px] bg-ontrack px-3 font-bold text-ontrack-ink">✓ Everyone on track</span>}
                  </span>
                  <span className="mt-auto font-bold text-[#047D13]">Open live classroom <span aria-hidden="true" className="font-mono">&gt;</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
