import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";
import { ACTIVITY_LABEL } from "@/lib/activity-labels";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Curriculum · CIC Launchpad" };

type Guide = { about?: string; mistakes?: string[]; example?: string; ask?: string[] } | null;
type Activity = { id: string; position: number; type: string; title: string | null; is_core: boolean; concept_tag: string | null; teaching_guide: Guide };
type Lesson = { id: string; title: string; position: number; status: string; activities: Activity[] };
type Module = { id: string; title: string; description: string | null; position: number; status: string; lessons: Lesson[] };

// Read-only curriculum browser: the external reviewer's view (P0), also used by teachers and CIC staff.
// The database decides what's visible: reviewers and teachers only ever get published content.
export default async function CurriculumPage() {
  await connection(); // per-user, live data: render at request time
  const staff = await requireStaff(["reviewer", "instructor", "admin"], "/review");
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("id, title, description, position, status, lessons(id, title, position, status, activities(id, position, type, title, is_core, concept_tag, teaching_guide))")
    .order("position")
    .order("position", { referencedTable: "lessons" })
    .order("position", { referencedTable: "lessons.activities" });
  const modules = (data ?? []) as Module[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Python Basics curriculum</h1>
        {staff.role !== "admin" && (
          <span className="rounded-full border px-2.5 py-0.5 text-sm font-medium">View only</span>
        )}
      </div>
      {!modules.length && <p className="text-muted-foreground">No published units yet.</p>}
      {modules.map((m) => (
        <section key={m.id} aria-labelledby={`unit-${m.id}`} className="space-y-3">
          <h2 id={`unit-${m.id}`} className="text-xl font-semibold">
            Unit {m.position}: {m.title}
            {m.status === "draft" && <span className="ml-2 text-sm font-normal text-muted-foreground">(Draft)</span>}
          </h2>
          {m.description && <p className="text-muted-foreground">{m.description}</p>}
          <ol className="space-y-2">
            {m.lessons.map((l) => (
              <li key={l.id}>
                <details className="rounded-2xl bg-card p-4">
                  <summary className="cursor-pointer font-medium">
                    {l.title}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {l.activities.length} steps{l.status === "draft" ? " · Draft" : ""}
                    </span>
                  </summary>
                  <ol className="mt-3 space-y-3">
                    {l.activities.map((a) => (
                      <li key={a.id} className="rounded-lg bg-muted/50 p-3">
                        <p className="font-medium">
                          {a.position}. {a.title ?? ACTIVITY_LABEL[a.type]}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            {ACTIVITY_LABEL[a.type] ?? a.type}
                            {a.concept_tag ? ` · topic: ${a.concept_tag}` : ""}
                            {a.is_core ? "" : " · Extra"}
                          </span>
                        </p>
                        {a.teaching_guide?.about && (
                          <details className="mt-3 text-base">
                            <summary className="cursor-pointer font-semibold text-[#047D13]">Teaching guide</summary>
                            <div className="mt-3 space-y-3 rounded-2xl bg-card p-4">
                              <div><p className="font-semibold">What this is about</p><p>{a.teaching_guide.about}</p></div>
                              {!!a.teaching_guide.mistakes?.length && (
                                <div><p className="font-medium">Common mistakes</p>
                                  <ul className="list-disc pl-5">{a.teaching_guide.mistakes.map((x) => <li key={x}>{x}</li>)}</ul></div>
                              )}
                              {a.teaching_guide.example && (
                                <pre className="overflow-auto rounded-md bg-[#0F2E1C] p-3 font-mono text-[#E6F4EA]">{a.teaching_guide.example}</pre>
                              )}
                              {!!a.teaching_guide.ask?.length && (
                                <div><p className="font-medium">Questions to ask</p>
                                  <ul className="list-disc pl-5">{a.teaching_guide.ask.map((x) => <li key={x}>{x}</li>)}</ul></div>
                              )}
                            </div>
                          </details>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
