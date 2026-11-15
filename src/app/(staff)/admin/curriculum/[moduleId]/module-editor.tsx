"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SaveMessage, StatusBadge, moved, useSave } from "@/components/curriculum/use-save";
import type { ModuleTree } from "@/types/curriculum";
import { createLessonAction, deleteLessonAction, reorderLessonsAction, setLessonStatusAction, setModuleStatusAction, updateModuleAction } from "../actions";

export function ModuleEditor({ module: m }: { module: ModuleTree }) {
  const { pending, message, save } = useSave();
  const [title, setTitle] = useState(m.title);
  const [description, setDescription] = useState(m.description ?? "");
  const [lessonTitle, setLessonTitle] = useState("");
  const [practice, setPractice] = useState<"worksheet" | "code_exercise" | "blank">("code_exercise");
  const [intro, setIntro] = useState<"slide" | "video">("slide");
  const ids = m.lessons.map((l) => l.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/curriculum" className="text-sm font-medium underline underline-offset-4">← All units</Link>
        <StatusBadge status={m.status} />
        <Button size="sm" variant="outline" disabled={pending}
          onClick={() => save(() => setModuleStatusAction(m.id, m.status === "published" ? "draft" : "published"), m.status === "published" ? "Unit moved back to draft" : "Unit published")}>
          {m.status === "published" ? "Unpublish unit" : "Publish unit"}
        </Button>
      </div>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(() => updateModuleAction(m.id, title, description), "Unit saved"); }}>
        <Label htmlFor="unit-title" className="text-base">Unit title</Label>
        <Input id="unit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 text-lg font-semibold" />
        <Label htmlFor="unit-desc">Short description (students see this)</Label>
        <Textarea id="unit-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
        <Button type="submit" disabled={pending}>Save unit</Button>
      </form>
      <SaveMessage message={message} />

      <section aria-labelledby="lessons-h" className="space-y-3">
        <h2 id="lessons-h" className="text-xl font-semibold">Lessons</h2>
        <ol className="space-y-2">
          {m.lessons.map((l, i) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3">
              <Link href={`/admin/curriculum/lesson/${l.id}`} className="min-w-0 flex-1 font-medium underline-offset-4 hover:underline">
                {i + 1}. {l.title} <span className="text-sm font-normal text-muted-foreground">· {l.activities.length} steps</span>
              </Link>
              <StatusBadge status={l.status} />
              <Button size="sm" variant="outline" disabled={pending}
                onClick={() => save(() => setLessonStatusAction(l.id, l.status === "published" ? "draft" : "published"), l.status === "published" ? "Lesson moved back to draft" : "Lesson published")}>
                {l.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="secondary" disabled={pending || i === 0} aria-label={`Move ${l.title} up`} onClick={() => save(() => reorderLessonsAction(m.id, moved(ids, i, -1)), "Order saved")}>Up</Button>
              <Button size="sm" variant="secondary" disabled={pending || i === m.lessons.length - 1} aria-label={`Move ${l.title} down`} onClick={() => save(() => reorderLessonsAction(m.id, moved(ids, i, 1)), "Order saved")}>Down</Button>
              <Button size="sm" variant="destructive" disabled={pending} aria-label={`Delete ${l.title}`}
                onClick={() => { if (confirm(`Delete "${l.title}" and all its steps? This can't be undone.`)) save(() => deleteLessonAction(l.id), "Lesson deleted"); }}>Delete</Button>
            </li>
          ))}
        </ol>
      </section>

      <form className="space-y-4 rounded-xl border border-dashed p-5" onSubmit={(e) => {
        e.preventDefault();
        save(() => createLessonAction(m.id, lessonTitle, practice === "blank" ? null : { intro, practice }), "Lesson created", () => setLessonTitle(""));
      }}>
        <h2 className="text-lg font-semibold">New lesson</h2>
        <div className="space-y-1">
          <Label htmlFor="lesson-title">Lesson title</Label>
          <Input id="lesson-title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g. While loops" className="h-10" />
        </div>
        <fieldset className="space-y-2">
          <legend className="font-medium">Start from CIC&apos;s lesson template?</legend>
          <p className="text-sm text-muted-foreground">The template makes 4 steps for you: intro → quick check → practice → exit question.</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="practice" checked={practice === "code_exercise"} onChange={() => setPractice("code_exercise")} /> Template with a coding exercise</label>
            <label className="flex items-center gap-2"><input type="radio" name="practice" checked={practice === "worksheet"} onChange={() => setPractice("worksheet")} /> Template with a worksheet</label>
            <label className="flex items-center gap-2"><input type="radio" name="practice" checked={practice === "blank"} onChange={() => setPractice("blank")} /> Blank lesson</label>
          </div>
          {practice !== "blank" && (
            <div className="flex flex-wrap gap-4">
              <span className="text-sm font-medium">Intro:</span>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="intro" checked={intro === "slide"} onChange={() => setIntro("slide")} /> Slides</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="intro" checked={intro === "video"} onChange={() => setIntro("video")} /> Video</label>
            </div>
          )}
        </fieldset>
        <Button type="submit" disabled={pending || !lessonTitle.trim()}>Create lesson</Button>
      </form>

      <section aria-labelledby="tests-h" className="space-y-2">
        <h2 id="tests-h" className="text-xl font-semibold">Pre-test and post-test</h2>
        <p className="text-sm text-muted-foreground">Same learning goals, different questions. Learning gain = post-test % − pre-test %.</p>
        <div className="flex gap-3">
          <Link href={`/admin/curriculum/${m.id}/test/pre`} className="font-medium underline underline-offset-4">Edit pre-test</Link>
          <Link href={`/admin/curriculum/${m.id}/test/post`} className="font-medium underline underline-offset-4">Edit post-test</Link>
        </div>
      </section>
    </div>
  );
}
