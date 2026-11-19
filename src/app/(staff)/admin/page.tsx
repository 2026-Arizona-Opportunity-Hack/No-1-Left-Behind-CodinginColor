import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";
import { getClassroom } from "@/server/dashboard";

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

  // Classes with students who are behind or need help, for the "Needs attention" panel.
  const { data: allClasses } = await supabase.from("classes").select("id, name, school").order("school").order("name");
  const rooms = await Promise.all((allClasses ?? []).map((c) => getClassroom(c.id)));
  const needs = (allClasses ?? []).flatMap((c, i) => {
    const r = rooms[i];
    const n = r.ok ? r.data.counts.behind + r.data.counts.needs_help : 0;
    return n ? [{ ...c, n, help: r.ok ? r.data.counts.needs_help : 0 }] : [];
  });

  // Grouped as in the design: classes, building lessons, then results and access.
  const groups = [
    { title: "Classes", items: [
      { href: "/teach", title: "See all classes", text: "See every class, its students and how they're doing.", tone: "bg-ontrack text-ontrack-ink" },
      { href: "/teach/new", title: "Set up a class", text: "Add a class, upload a roster and print join cards.", tone: "bg-[#CDEBD5] text-primary" },
    ] },
    { title: "Build lessons", items: [
      { href: "/admin/curriculum", title: "Edit the curriculum", text: "Change units, lessons and steps, and choose what students can see. No coding needed.", tone: "bg-lilac text-lilac-ink" },
      { href: "/admin/curriculum/import", title: "Make a lesson from slides or a video", text: "Upload a PowerPoint or paste a YouTube link, and AI writes the questions, an exercise and a teacher guide. You check it first.", tone: "bg-[#CDEBD5] text-primary" },
    ] },
    { title: "Results and access", items: [
      { href: "/results", title: "See learning results", text: "How much students improved, by topic, class and student. Download it as a spreadsheet for grant reports.", tone: "bg-sky text-sky-ink" },
      { href: "/admin/roles", title: "Manage staff access", text: "Add roles such as Mentor, choose permissions and assign staff without changing code.", dark: true },
      { href: "/admin/api-keys", title: "API keys", text: "For CIC's own reporting tools. They get totals and averages, never student names.", tone: "bg-help text-help-ink" },
    ] },
  ];

  return (
    <div className="space-y-8">
      <h1 className="flex items-center gap-4 text-[52px] font-bold tracking-tight"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&gt;</span>Hi {staff.displayName}</h1>
      {/* Same three columns as the cards below, so the tiles and the cards line up. Each tile opens its list. */}
      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {([["Units", modules, "/admin/curriculum", "bg-sky text-sky-ink"], ["Classes", classes, "/teach", "bg-lilac text-lilac-ink"], ["Students", students, "/teach", "bg-[#CDEBD5] text-primary"]] as const).map(([label, value, href, tone]) => (
          <li key={label}>
            <Link href={href} className={`flex items-center justify-between gap-3 rounded-[20px] px-7 py-5 no-underline ${tone}`}>
              <span className="flex items-baseline gap-4">
                <span className="text-[52px] leading-none font-bold tabular-nums">{value}</span>
                <span className="text-xl font-semibold">{label}</span>
              </span>
              <span aria-hidden="true" className="font-mono text-3xl font-extrabold">&gt;</span>
            </Link>
          </li>
        ))}
      </ul>
      {needs.length > 0 && (
        <section aria-labelledby="att" className="rounded-[20px] bg-behind p-6 text-behind-ink">
          <h2 id="att" className="mb-1 text-[28px] font-bold"><span aria-hidden="true">&lt;</span> Needs attention <span aria-hidden="true">&gt;</span></h2>
          <ul className="m-0 list-none p-0">
            {needs.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3.5 border-t-2 border-behind-ink/20 py-3 first:mt-2">
                <p className="flex-1 basis-80"><span className="mr-2 inline-flex items-center rounded-[10px] bg-white px-3 py-0.5 text-base font-bold">{c.help ? `! ${c.help} need help` : `⚠ ${c.n} behind`}</span><b>{c.school}, {c.name}.</b> {c.n} {c.n === 1 ? "student is" : "students are"} behind or need{c.n === 1 ? "s" : ""} help.</p>
                <Link href={`/teach/${c.id}`} className="inline-flex h-11 items-center gap-2 rounded-[10px] border-2 border-behind-ink px-4 text-base font-bold text-behind-ink no-underline hover:bg-white/50">Open class <span aria-hidden="true">&gt;</span></Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="mb-3.5 flex items-center gap-2.5 text-[28px] font-bold"><span aria-hidden="true" className="font-mono text-[#047D13]">&gt;</span>{g.title}</h2>
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className={`flex h-full min-h-[170px] flex-col gap-2 rounded-[20px] border p-6 no-underline ${"dark" in a && a.dark ? "border-primary bg-primary text-primary-foreground hover:bg-[#047D13]" : "border-border bg-card text-foreground hover:bg-secondary"}`}>
                  <span className="flex items-start justify-between gap-3 text-2xl leading-tight font-bold">{a.title}
                    <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-full font-mono text-[22px] font-bold ${"dark" in a && a.dark ? "bg-white text-primary" : a.tone}`}>&gt;</span></span>
                  <span className={"dark" in a && a.dark ? "text-[#E0F1E5]" : "text-muted-foreground"}>{a.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
