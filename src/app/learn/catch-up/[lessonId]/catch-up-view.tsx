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
    <div className="grid gap-10 lg:grid-cols-[minmax(0,480px)_1fr] lg:gap-14">
      <div>
        <p className="text-base text-muted-foreground">{missedOn ? `You missed this on ${missedOn}` : "Catch-up"} · about 15 minutes</p>
        <h1 className="mt-2 text-5xl leading-[1.04] font-bold tracking-tight sm:text-6xl">Let&apos;s catch you up on {lesson.title}</h1>
        <ol aria-label="Catch-up steps" className="mt-10 flex list-none flex-col gap-2.5 p-0 text-lg">
          <li className="flex items-center gap-3.5 rounded-2xl bg-[#FFD75E] px-4.5 py-3.5 font-semibold"><span className="font-mono font-extrabold">1</span><span className="flex-1">{recap?.minutes ?? 2}-minute recap</span><span className="text-[15px] font-medium">You are here</span></li>
          <li className="flex items-center gap-3.5 px-4.5 py-3.5"><span className="font-mono font-extrabold">2</span><span className="flex-1">Core exercises</span><span className="text-[15px] text-muted-foreground">{lesson.activities.length} steps</span></li>
          <li className="flex items-center gap-3.5 px-4.5 py-3.5"><span className="font-mono font-extrabold">3</span><span className="flex-1">You&apos;re caught up</span></li>
        </ol>
      </div>
      <section aria-labelledby="cu-h" className="flex flex-col gap-5 rounded-[28px] bg-card p-8 sm:px-10 sm:py-9">
        <h2 id="cu-h" className="text-2xl font-semibold">The key ideas</h2>
        {recap ? recap.key_points.map((k) => (
          <div key={k} className="grid grid-cols-[36px_1fr] gap-4">
            <b aria-hidden="true" className="font-mono text-xl font-extrabold text-[#0DB031]">&gt;</b>
            <p className="text-lg">{k}</p>
          </div>
        )) : <p>Read each step carefully. Use &quot;Need a hint?&quot; whenever you&apos;re stuck.</p>}
        <p className="text-muted-foreground">We skipped the slides and the extra steps. You&apos;ll only do what you need to catch up.</p>
        <div className="flex-1" />
        <Button size="lg" className="self-start" onClick={() => setStarted(true)}>Start the exercises</Button>
      </section>
    </div>
  );
}
