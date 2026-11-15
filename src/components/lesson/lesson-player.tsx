"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeViewStep, logHint } from "@/app/learn/[lessonId]/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ACTIVITY_LABEL } from "@/lib/activity-labels";
import { PythonRunner } from "@/lib/python/runner";
import type { PlayerActivity, PlayerLesson } from "@/types/student-lesson";
import { CodeStep, ParsonsStep } from "./rich-steps";
import { VideoStep } from "./video-step";
import { ChoiceStep, FillBlankStep, PredictStep, SlideStep, WorksheetStep, type StepProps } from "./simple-steps";

export type CatchUp = { todayLesson: { id: string; title: string } | null; onFinish: () => Promise<boolean> };

export function LessonPlayer({ lesson, catchUp }: { lesson: PlayerLesson; catchUp?: CatchUp }) {
  const steps = lesson.activities;
  const [done, setDone] = useState(() => new Set(steps.filter((a) => a.done).map((a) => a.id)));
  const firstOpen = steps.findIndex((a) => !a.done);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [finished, setFinished] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // One Python runner for the whole lesson, loaded early if any step needs it.
  const [runner, setRunner] = useState<PythonRunner | null>(null);
  useEffect(() => {
    if (!steps.some((a) => a.step.kind === "code")) return;
    const r = new PythonRunner();
    r.warmUp().then(() => setRunner(r), () => setError("Python couldn't load. Check your internet and refresh."));
    return () => r.dispose();
  }, [steps]);

  // Time on task: restart the clock whenever a new step is shown.
  useEffect(() => { startedAt.current = Date.now(); }, [index]);

  const current = steps[index];
  const goTo = (i: number) => {
    setIndex(i); setHintsShown(0); setError(null);
    requestAnimationFrame(() => headingRef.current?.focus()); // keyboard and screen-reader users land on the new step
  };
  const markDone = (id: string) => setDone((d) => new Set(d).add(id));
  const elapsed = () => msSince(startedAt.current);
  // Students can revisit finished steps and the first unfinished one, but can't skip ahead.
  const reachable = (i: number) => i === 0 || steps.slice(0, i).every((a) => done.has(a.id) || !a.isCore);

  function next() {
    const advance = () => (index + 1 < steps.length ? goTo(index + 1) : setFinished(true));
    if (done.has(current.id) || !["slide", "video"].includes(current.type)) return advance();
    startSaving(async () => {
      try { await completeViewStep(current.id, elapsed()); markDone(current.id); advance(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  if ((finished || !current) && catchUp) return <CaughtUp lessonTitle={lesson.title} catchUp={catchUp} />;
  if (finished || !current) {
    return (
      <section aria-labelledby="done-heading" className="mx-auto max-w-xl space-y-4 rounded-2xl border p-8 text-center">
        <p aria-hidden="true" className="text-5xl">🎉</p>
        <h1 id="done-heading" className="text-3xl font-semibold">Lesson complete!</h1>
        <p className="text-muted-foreground">You finished {lesson.title}.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {lesson.nextLesson && <Link href={`/learn/${lesson.nextLesson.id}`} className={buttonVariants({ size: "lg" })}>Next: {lesson.nextLesson.title}</Link>}
          <Link href="/learn" className={buttonVariants({ size: "lg", variant: "outline" })}>Back to my course</Link>
        </div>
      </section>
    );
  }

  const canContinue = done.has(current.id) || !current.isCore || ["slide", "video"].includes(current.type);
  const props = { activity: current, onDone: () => markDone(current.id), elapsed } as StepProps<never>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/learn" className="text-sm font-medium underline underline-offset-4">← Course map</Link>
        <p className="font-semibold">{lesson.title}</p>
        <p className="text-sm text-muted-foreground">Step {index + 1} of {steps.length}</p>
        <nav aria-label="Lesson steps" className="flex flex-wrap gap-1.5">
          {steps.map((a, i) => (
            <button key={a.id} type="button" onClick={() => goTo(i)} disabled={!reachable(i)}
              aria-current={i === index ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${a.title || ACTIVITY_LABEL[a.type]}${done.has(a.id) ? " (done)" : ""}${a.isCore ? "" : " (extra)"}`}
              className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40
                ${i === index ? "border-primary bg-primary text-primary-foreground" : done.has(a.id) ? "border-green-700 bg-green-50 text-green-800" : "border-zinc-300"}`}>
              {done.has(a.id) && i !== index ? "✓" : i + 1}
            </button>
          ))}
        </nav>
      </div>

      <section aria-labelledby="step-heading" className="space-y-5 rounded-2xl border p-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{ACTIVITY_LABEL[current.type]}{current.isCore ? "" : " · Extra (optional)"}</p>
          <h1 id="step-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
            {current.title || ACTIVITY_LABEL[current.type]}
          </h1>
        </div>
        <StepBody activity={current} props={props} runner={runner} />
        {current.hints.length > 0 && !done.has(current.id) && (
          <div className="space-y-2">
            {current.hints.slice(0, hintsShown).map((h, i) => (
              <p key={i} className="rounded-lg bg-muted p-3"><span className="font-medium">Hint {i + 1}:</span> {h}</p>
            ))}
            {hintsShown < current.hints.length && (
              <Button variant="link" className="px-0" onClick={() => { setHintsShown((n) => n + 1); logHint(current.id).catch(() => {}); }}>
                {hintsShown ? "Show another hint" : "Need a hint?"}
              </Button>
            )}
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
      <div className="flex justify-between gap-3">
        <Button variant="outline" size="lg" disabled={index === 0} onClick={() => goTo(index - 1)}>Back</Button>
        <Button size="lg" disabled={!canContinue || saving} onClick={next}>
          {saving ? "Saving…" : index + 1 < steps.length ? "Next step" : "Finish lesson"}
        </Button>
      </div>
      {!canContinue && <p className="text-right text-sm text-muted-foreground">Finish this step to unlock the next one.</p>}
    </div>
  );
}

function CaughtUp({ lessonTitle, catchUp }: { lessonTitle: string; catchUp: CatchUp }) {
  const [state, setState] = useState<"saving" | "done" | "not_yet">("saving");
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return; // run once, even when React re-runs effects
    sent.current = true;
    catchUp.onFinish().then((ok) => setState(ok ? "done" : "not_yet"), () => setState("not_yet"));
  }, [catchUp]);
  return (
    <section aria-labelledby="caught-up-heading" aria-live="polite" className="mx-auto max-w-xl space-y-4 rounded-2xl border p-8 text-center">
      {state === "saving" && <p role="status">Saving…</p>}
      {state === "done" && <>
        <p aria-hidden="true" className="text-5xl">🎉</p>
        <h1 id="caught-up-heading" className="text-3xl font-semibold">You&apos;re caught up!</h1>
        <p className="text-muted-foreground">You finished the catch-up for {lessonTitle}. Your teacher can see it.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {catchUp.todayLesson && <Link href={`/learn/${catchUp.todayLesson.id}`} className={buttonVariants({ size: "lg" })}>Rejoin your class: {catchUp.todayLesson.title}</Link>}
          <Link href="/learn" className={buttonVariants({ size: "lg", variant: "outline" })}>Back to my course</Link>
        </div>
      </>}
      {state === "not_yet" && <>
        <h1 id="caught-up-heading" className="text-2xl font-semibold">Almost there</h1>
        <p className="text-muted-foreground">A few steps still need finishing. Go back and complete each one.</p>
        <Link href="/learn" className={buttonVariants({ variant: "outline" })}>Back to my course</Link>
      </>}
    </section>
  );
}

/** Time on task for the current step (sent with "complete" events). */
function msSince(start: number) {
  return start ? Date.now() - start : 0;
}

function StepBody({ activity, props, runner }: { activity: PlayerActivity; props: StepProps<never>; runner: PythonRunner | null }) {
  switch (activity.step.kind) {
    case "slide": return <SlideStep {...(props as unknown as StepProps<"slide">)} />;
    case "video": return <VideoStep {...(props as unknown as StepProps<"video">)} />;
    case "choice": return <ChoiceStep key={activity.id} {...(props as unknown as StepProps<"choice">)} />;
    case "predict_output": return <PredictStep key={activity.id} {...(props as unknown as StepProps<"predict_output">)} />;
    case "fill_blank": return <FillBlankStep key={activity.id} {...(props as unknown as StepProps<"fill_blank">)} />;
    case "parsons": return <ParsonsStep key={activity.id} {...(props as unknown as StepProps<"parsons">)} />;
    case "code": return <CodeStep key={activity.id} {...(props as unknown as StepProps<"code">)} runner={runner} />;
    case "worksheet": return <WorksheetStep key={activity.id} {...(props as unknown as StepProps<"worksheet">)} />;
  }
}
