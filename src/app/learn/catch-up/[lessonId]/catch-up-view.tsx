"use client";

import { useMemo, useState } from "react";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { Button } from "@/components/ui/button";
import type { PlayerLesson } from "@/types/student-lesson";
import { finishCatchUp } from "./actions";

/** Step 1: a 2-minute recap. Step 2: the lesson's core exercises and quick checks only. */
export function CatchUpView({ lesson, recap, missedOn, todayLesson }: {
  lesson: PlayerLesson; recap: { minutes: number; key_points: string[] } | null; missedOn: string | null; todayLesson: { id: string; title: string } | null;
}) {
  const [started, setStarted] = useState(false);
  const catchUp = useMemo(() => ({ todayLesson, onFinish: () => finishCatchUp(lesson.id) }), [lesson.id, todayLesson]);
  if (started) return <LessonPlayer lesson={lesson} catchUp={catchUp} />;
  return (
    <section aria-labelledby="cu-h" className="mx-auto max-w-2xl space-y-5 rounded-2xl border p-8">
      <p className="text-sm font-medium text-muted-foreground">Catch-up{missedOn ? ` · you missed this on ${missedOn}` : ""}</p>
      <h1 id="cu-h" className="text-3xl font-semibold">Let&apos;s catch you up on {lesson.title}</h1>
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Catch-up steps">
        <li className="rounded-full border-2 border-primary px-3 py-1 font-medium">1. {recap?.minutes ?? 2}-minute recap</li>
        <li className="rounded-full border-2 border-zinc-300 px-3 py-1">2. {lesson.activities.length} core steps</li>
        <li className="rounded-full border-2 border-zinc-300 px-3 py-1">3. Caught up!</li>
      </ol>
      <div className="space-y-3 rounded-xl bg-muted/50 p-5">
        <h2 className="font-semibold">The key ideas</h2>
        {recap ? (
          <ul className="list-disc space-y-2 pl-5 text-lg leading-8">{recap.key_points.map((k) => <li key={k}>{k}</li>)}</ul>
        ) : <p>Read each step carefully. Use &quot;Need a hint?&quot; whenever you&apos;re stuck.</p>}
      </div>
      <p className="text-muted-foreground">We skipped the slides and the extra steps. You&apos;ll only do what you need to catch up.</p>
      <Button size="lg" onClick={() => setStarted(true)}>I&apos;ve read it: start the exercises</Button>
    </section>
  );
}
