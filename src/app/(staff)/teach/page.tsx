import type { Metadata } from "next";
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
      <h1 className="text-3xl font-semibold tracking-tight">{staff.role === "admin" ? "All classes" : "My classes"}</h1>
      {!classes?.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">You don&apos;t have any classes yet.</p>
          <p className="mt-1 text-muted-foreground">Once a class is set up for you, it will show here.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id} className="rounded-xl border p-5">
              <p className="text-sm text-muted-foreground">{c.school}</p>
              <p className="text-xl font-semibold">{c.name}</p>
              <p className="mt-2 text-sm">
                Class code <span className="font-mono font-semibold">{c.class_code}</span> ·{" "}
                {(c.students as unknown as { count: number }[])[0]?.count ?? 0} students
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
