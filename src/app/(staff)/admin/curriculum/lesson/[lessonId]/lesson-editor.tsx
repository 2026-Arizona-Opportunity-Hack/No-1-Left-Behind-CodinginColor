"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityForm } from "@/components/curriculum/activity-form";
import { DRAG_HINT, DragHandle, useDragReorder } from "@/components/curriculum/drag-reorder";
import { SaveMessage, StatusBadge, moved, useSave } from "@/components/curriculum/use-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_LABEL, ACTIVITY_TINT } from "@/lib/activity-labels";
import type { ActivityType } from "@/types/activity-content";
import type { Activity, Lesson } from "@/types/curriculum";
import { createActivityAction, deleteActivityAction, renameLessonAction, reorderActivitiesAction, setLessonStatusAction } from "../../actions";

export function LessonEditor({ lesson, unit, activities }: { lesson: Lesson; unit: { id: string; title: string }; activities: Activity[] }) {
  const { pending, message, save } = useSave();
  const [title, setTitle] = useState(lesson.title);
  const [newType, setNewType] = useState<ActivityType>("slide");
  const ids = activities.map((a) => a.id);
  const needsReview = activities.filter((a) => a.ai_suggested).length;
  const drag = useDragReorder(ids, (next) => save(() => reorderActivitiesAction(lesson.id, next), "Order saved"), pending);

  return (
    <div className="space-y-6">
      <Link href={`/admin/curriculum/${unit.id}`} className="inline-flex min-h-11 items-center gap-2 text-xl font-medium text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> {unit.title}</Link>
      <div className="!mt-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-[52px]">{lesson.title}</h1>
        <p className="mt-1 text-muted-foreground">{unit.title} · {activities.length} step{activities.length === 1 ? "" : "s"}</p>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save(() => renameLessonAction(lesson.id, title), "Lesson renamed"); }}>
        <div className="flex-1 space-y-1"><Label htmlFor="lesson-title" className="text-base">Lesson title</Label>
          <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 text-lg font-semibold" /></div>
        <Button type="submit" variant="outline" disabled={pending}>Rename</Button>
      </form>
      {needsReview > 0 && (
        <div className="flex items-start gap-3 rounded-[18px] border-2 border-lilac-ink bg-lilac px-4 py-3.5 text-lilac-ink">
          <b className="inline-flex min-h-8 items-center rounded-lg bg-lilac-ink px-3 font-mono text-base whitespace-nowrap text-lilac">AI draft</b>
          <p><b>{needsReview} step{needsReview === 1 ? " was" : "s were"} written by AI.</b> Check and save each one before students can see this lesson.</p>
        </div>
      )}
      <SaveMessage message={message} />

      <p className="text-base text-muted-foreground">{DRAG_HINT}</p>
      <ol className="space-y-3">
        {activities.map((a, i) => (
          <li key={a.id} {...drag.rowProps(a.id)} className={`rounded-xl ${drag.rowClass(a.id)}`}>
            <details className="group rounded-[20px] border border-border bg-card p-4 open:border-2 open:border-primary" open={a.ai_suggested}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <DragHandle {...drag.handleProps(a.id)} />
                <span className={`inline-flex min-h-8 items-center rounded-lg px-3 text-base font-bold ${ACTIVITY_TINT[a.type] ?? "bg-sky text-sky-ink"}`}>{ACTIVITY_LABEL[a.type]}</span>
                <span className="text-lg font-bold"><span aria-hidden="true" className="font-mono text-muted-foreground">{i + 1}.</span> {a.title || ACTIVITY_LABEL[a.type]}</span>
                {!a.is_core && <span className="rounded-lg bg-lilac px-2.5 py-0.5 text-base text-lilac-ink">Optional</span>}
                {a.ai_suggested && <span className="rounded-lg bg-lilac-ink px-2.5 py-0.5 text-base font-bold text-lilac">Made by AI: please check</span>}
                <span className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-primary bg-white px-4 text-base font-bold"><span className="group-open:hidden"><span aria-hidden="true">▸</span> Edit</span><span className="hidden group-open:inline"><span aria-hidden="true">▾</span> Collapse</span></span>
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

      <form className="flex flex-wrap items-end gap-3 rounded-[20px] border-2 border-dashed border-[#7FA08B] p-5"
        onSubmit={(e) => { e.preventDefault(); save(() => createActivityAction(lesson.id, newType), "Step added"); }}>
        <div className="space-y-1"><Label htmlFor="new-step">Add a step</Label>
          <select id="new-step" value={newType} onChange={(e) => setNewType(e.target.value as ActivityType)} className="h-12">
            {Object.entries(ACTIVITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <Button type="submit" disabled={pending}>Add step</Button>
      </form>

      {/* Stays at the bottom while you edit. Each step saves with its own "Save step" button. */}
      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-primary bg-white px-5 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={lesson.status} />
          <span className="text-base text-muted-foreground">{needsReview ? `${needsReview} step${needsReview === 1 ? "" : "s"} to check` : "Each step saves with its own Save step button."}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/curriculum/${unit.id}`} className="inline-flex h-11 items-center rounded-xl border-2 border-primary bg-white px-4 text-base font-bold text-foreground no-underline hover:bg-secondary">Back to unit</Link>
          <Button size="lg" disabled={pending}
            onClick={() => save(() => setLessonStatusAction(lesson.id, lesson.status === "published" ? "draft" : "published"), lesson.status === "published" ? "Lesson hidden from students" : "Students can see this lesson now")}>
            {lesson.status === "published" ? "Hide from students" : "Show to students"}
          </Button>
        </div>
      </div>
    </div>
  );
}
