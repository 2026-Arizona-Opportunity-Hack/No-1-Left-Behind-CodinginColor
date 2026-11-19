import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

// A coloured arrow per card so the choices are easy to tell apart.
// Six colours for six cards: with only five, the sixth card wrapped back to the white one and its arrow vanished.
const ARROW = ["bg-primary-foreground text-primary", "bg-sky text-sky-ink", "bg-lilac text-lilac-ink", "bg-sun text-sun-ink", "bg-ontrack text-ontrack-ink", "bg-help text-help-ink"];

export const metadata: Metadata = { title: "CIC staff · CIC Launchpad" };

export default async function AdminHome() {
  await connection(); // per-user, live data: render at request time
  const staff = await requireStaff(["admin"], "/admin");
  const supabase = await createClient();
  const count = async (table: string) =>
    (await supabase.from(table).select("*", { count: "exact", head: true })).count ?? 0;
  const [modules, classes, students] = await Promise.all([count("modules"), count("classes"), count("students")]);

  const actions = [
    { href: "/admin/roles", title: "Manage staff access", text: "Add roles such as Mentor, choose permissions and assign staff without changing code." },
    { href: "/results", title: "See learning results", text: "How much students improved, by topic, class and student. Download it as a spreadsheet for grant reports." },
    { href: "/admin/curriculum", title: "Edit the curriculum", text: "Change units, lessons and steps, and choose what students can see. No coding needed." },
    { href: "/admin/curriculum/import", title: "Make a lesson from slides or a video", text: "Upload a PowerPoint or paste a YouTube link, and AI writes the questions, an exercise and a teacher guide. You check it first." },
    { href: "/teach", title: "See all classes", text: "See every class, its students and how they're doing." },
    { href: "/admin/api-keys", title: "API keys", text: "For CIC's own reporting tools. They get totals and averages, never student names." },
  ];

  return (
    <div className="space-y-8">
      <h1 className="flex items-center gap-4 text-5xl font-bold tracking-tight"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&gt;</span>Hi {staff.displayName}</h1>
      {/* Same three columns as the cards below, so the tiles and the cards line up. Each tile opens its list. */}
      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {([["Units", modules, "/admin/curriculum", "bg-sky text-sky-ink"], ["Classes", classes, "/teach", "bg-lilac text-lilac-ink"], ["Students", students, "/teach", "bg-sun text-sun-ink"]] as const).map(([label, value, href, tone]) => (
          <li key={label}>
            <Link href={href} className={`flex items-center justify-between gap-3 rounded-[28px] px-7 py-5 no-underline hover:brightness-95 ${tone}`}>
              <span className="flex items-baseline gap-4">
                <span className="text-6xl leading-none font-bold tabular-nums">{value}</span>
                <span className="text-xl font-semibold">{label}</span>
              </span>
              <span aria-hidden="true" className="font-mono text-3xl font-extrabold">&gt;</span>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a, i) => (
          <li key={a.href}>
            <Link href={a.href} className={`flex h-full flex-col gap-2 rounded-[28px] p-7 no-underline ${i === 0 ? "bg-primary text-primary-foreground hover:bg-[#047D13]" : "bg-card text-foreground hover:bg-secondary"}`}>
              <span className="flex items-start justify-between gap-3 text-2xl leading-tight font-semibold">{a.title}<span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-xl font-extrabold ${ARROW[i % ARROW.length]}`}>&gt;</span></span>
              <span className={i === 0 ? "" : "text-muted-foreground"}>{a.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
