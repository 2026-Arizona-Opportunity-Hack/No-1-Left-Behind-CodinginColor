import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "CIC staff · CIC Launchpad" };

export default async function AdminHome() {
  await connection(); // per-user, live data: render at request time
  const staff = await requireStaff(["admin"], "/admin");
  const supabase = await createClient();
  const count = async (table: string) =>
    (await supabase.from(table).select("*", { count: "exact", head: true })).count ?? 0;
  const [modules, classes, students] = await Promise.all([count("modules"), count("classes"), count("students")]);

  const actions = [
    { href: "/results", title: "See learning results", text: "Learning gain by topic, class and student, with a CSV for grant reports." },
    { href: "/admin/curriculum", title: "Edit the curriculum", text: "Units, lessons and steps. Draft, preview and publish without engineering." },
    { href: "/admin/curriculum/import", title: "Make a lesson from a YouTube video", text: "Paste a link; we draft quizzes, an exercise and a teaching guide for you to review." },
    { href: "/teach", title: "See all classes", text: "Every class's live classroom, roster and progress." },
    { href: "/admin/api-keys", title: "API keys", text: "Let CIC's own dashboard read totals and averages, never student names." },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-5xl font-bold tracking-tight">Hi {staff.displayName}</h1>
      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        {[["Units", modules], ["Classes", classes], ["Students", students]].map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-base text-muted-foreground">{label}</dt>
            <dd className="m-0 text-5xl leading-none font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a, i) => (
          <li key={a.href}>
            <Link href={a.href} className={`flex h-full flex-col gap-2 rounded-[28px] p-7 no-underline ${i === 0 ? "bg-primary text-primary-foreground hover:bg-[#047D13]" : "bg-card text-foreground hover:bg-secondary"}`}>
              <span className="flex items-start justify-between gap-3 text-2xl leading-tight font-semibold">{a.title}<span aria-hidden="true" className="font-mono font-extrabold">&gt;</span></span>
              <span className={i === 0 ? "" : "text-muted-foreground"}>{a.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
