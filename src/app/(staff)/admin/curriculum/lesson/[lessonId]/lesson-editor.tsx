"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityForm } from "@/components/curriculum/activity-form";
import { SaveMessage, StatusBadge, moved, useSave } from "@/components/curriculum/use-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_LABEL } from "@/lib/activity-labels";
import type { ActivityType } from "@/types/activity-content";
import type { Activity, Lesson } from "@/types/curriculum";
import { createActivityAction, deleteActivityAction, renameLessonAction, reorderActivitiesAction, setLessonStatusAction } from "../../actions";

export function LessonEditor({ lesson, unit, activities }: { lesson: Lesson; unit: { id: string; title: string }; activities: Activity[] }) {
  const { pending, message, save } = useSave();
  const [title, setTitle] = useState(lesson.title);
  const [newType, setNewType] = useState<ActivityType>("slide");
  const ids = activities.map((a) => a.id);
  const needsReview = activities.filter((a) => a.ai_suggested).length;

  return (
    <div className="space-y-6">
      <Link href={`/admin/curriculum/${unit.id}`} className="inline-block text-base text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> {unit.title}</Link>
      <div className="!mt-3 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-4xl font-bold tracking-tight sm:text-5xl">{lesson.title}</h1>
        <StatusBadge status={lesson.status} />
        <Button size="sm" variant="outline" disabled={pending}
          onClick={() => save(() => setLessonStatusAction(lesson.id, lesson.status === "published" ? "draft" : "published"), lesson.status === "published" ? "Lesson hidden from students" : "Students can see this lesson now")}>
          {lesson.status === "published" ? "Hide from students" : "Show to students"}
        </Button>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save(() => renameLessonAction(lesson.id, title), "Lesson renamed"); }}>
        <div className="flex-1 space-y-1"><Label htmlFor="lesson-title" className="text-base">Lesson title</Label>
          <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 text-lg font-semibold" /></div>
        <Button type="submit" variant="outline" disabled={pending}>Rename</Button>
      </form>
      {needsReview > 0 && (
        <p className="rounded-2xl bg-sun p-4 text-sun-ink">
          {needsReview} step{needsReview === 1 ? " was" : "s were"} written by AI. Check and save each one before students can see this lesson.
        </p>
      )}
      <SaveMessage message={message} />

      <ol className="space-y-3">
        {activities.map((a, i) => (
          <li key={a.id}>
            <details className="rounded-2xl bg-card p-4" open={a.ai_suggested}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{i + 1}. {a.title || ACTIVITY_LABEL[a.type]}</span>
                <span className="rounded-full bg-sky px-2.5 py-0.5 text-sm text-sky-ink">{ACTIVITY_LABEL[a.type]}</span>
                {!a.is_core && <span className="rounded-full bg-lilac px-2.5 py-0.5 text-sm text-lilac-ink">Optional</span>}
                {a.ai_suggested && <span className="rounded-full bg-sun px-2.5 py-0.5 text-sm font-semibold text-sun-ink">Made by AI: please check</span>}
                <span className="ml-auto text-sm font-semibold text-[#047D13]">Edit</span>
              </summary>
              <div className="mt-4 space-y-4">
                <ActivityForm key={a.updated_at} activity={a} />
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button size="sm" variant="secondary" disabled={pending || i === 0} onClick={() => save(() => reorderActivitiesAction(lesson.id, moved(ids, i, -1)), "Order saved")}>Move up</Button>
                  <Button size="sm" variant="secondary" disabled={pending || i === activities.length - 1} onClick={() => save(() => reorderActivitiesAction(lesson.id, moved(ids, i, 1)), "Order saved")}>Move down</Button>
                  <Button size="sm" variant="destructive" disabled={pending}
                    onClick={() => { if (confirm("Delete this step? This can't be undone.")) save(() => deleteActivityAction(a.id), "Step deleted"); }}>Delete step</Button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ol>

      <form className="flex flex-wrap items-end gap-3 rounded-3xl border-2 border-dashed border-[#7FA08B] p-5"
        onSubmit={(e) => { e.preventDefault(); save(() => createActivityAction(lesson.id, newType), "Step added"); }}>
        <div className="space-y-1"><Label htmlFor="new-step">Add a step</Label>
          <select id="new-step" value={newType} onChange={(e) => setNewType(e.target.value as ActivityType)} className="h-10 rounded-md border bg-background px-2">
            {Object.entries(ACTIVITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <Button type="submit" disabled={pending}>Add step</Button>
      </form>
    </div>
  );
}
