import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/server/auth";
import type { Activity, Lesson } from "@/types/curriculum";
import { LessonEditor } from "./lesson-editor";

// Live, per-user data: navigations wait for it rather than showing a prerendered shell.
export const instant = false;

export const metadata: Metadata = { title: "Edit lesson · CIC Launchpad" };

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  await connection(); // per-user, live data: render at request time
  const { lessonId } = await params;
  await requireStaff(["admin"], `/admin/curriculum/lesson/${lessonId}`);
  const supabase = await createClient();
  const { data } = /^[0-9a-f-]{36}$/i.test(lessonId)
    ? await supabase.from("lessons").select("*, modules(id, title), activities(*)").eq("id", lessonId)
        .order("position", { referencedTable: "activities" }).maybeSingle()
    : { data: null };
  if (!data) return <div className="space-y-2"><p role="alert">That lesson couldn&apos;t be found.</p><Link href="/admin/curriculum" className="underline">All units</Link></div>;
  const { modules: unit, activities, ...lesson } = data as Lesson & { modules: { id: string; title: string }; activities: Activity[] };
  return <LessonEditor key={lesson.updated_at} lesson={lesson as Lesson} unit={unit} activities={activities} />;
}
