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
      <section aria-labelledby="done-heading" className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div aria-hidden="true" className="flex items-center gap-5 font-mono text-8xl leading-none font-extrabold text-[#0DB031] sm:text-9xl">
          &lt;<span className="flex size-28 items-center justify-center rounded-full bg-primary text-6xl text-primary-foreground sm:size-32">✓</span>&gt;
        </div>
        <h1 id="done-heading" className="mt-8 text-5xl font-bold tracking-tight sm:text-7xl">You finished {lesson.title}</h1>
        <p className="mt-3 text-xl text-muted-foreground">{done.size} of {steps.length} steps done{steps.some((a) => !a.isCore && !done.has(a.id)) ? " (extras are optional)" : ""}.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3.5">
          {lesson.nextLesson && <Link href={`/learn/${lesson.nextLesson.id}`} className={buttonVariants({ size: "lg" })}>Next: {lesson.nextLesson.title} <span aria-hidden="true" className="font-mono font-extrabold">&gt;</span></Link>}
          <Link href="/learn" className={buttonVariants({ size: "lg", variant: "outline" })}>Back to my course</Link>
        </div>
      </section>
    );
  }

  const canContinue = done.has(current.id) || !current.isCore || ["slide", "video"].includes(current.type);
  const props = { activity: current, onDone: () => markDone(current.id), elapsed } as StepProps<never>;
  const lead = current.step.kind === "code" ? current.step.prompt : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link href="/learn" className="text-base text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> {lesson.title}</Link>
        <nav aria-label="Lesson steps" className="flex flex-wrap items-center justify-center gap-2.5">
          {steps.map((a, i) => (
            <button key={a.id} type="button" onClick={() => goTo(i)} disabled={!reachable(i)}
              aria-current={i === index ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${a.title || ACTIVITY_LABEL[a.type]}${done.has(a.id) ? " (done)" : ""}${a.isCore ? "" : " (extra)"}`}
              className={i === index
                ? "cursor-pointer rounded-full border-0 bg-[#FFD75E] px-3.5 py-0.5 text-[15px] font-semibold text-foreground"
                : `size-3.5 cursor-pointer rounded-full p-0 disabled:cursor-not-allowed ${done.has(a.id) ? "border-0 bg-[#0DB031]" : "border-2 border-[#7FA08B] bg-transparent"}`}>
              {i === index ? i + 1 : <span className="sr-only">{i + 1}</span>}
            </button>
          ))}
        </nav>
        <span className="justify-self-end text-base text-muted-foreground">Step {index + 1} of {steps.length}</span>
      </div>

      <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
        <div className="flex flex-col pt-2 lg:pt-6">
          {(current.title && current.title !== ACTIVITY_LABEL[current.type] || !current.isCore) && (
            <p className="text-base font-semibold text-[#047D13]">{current.title && current.title !== ACTIVITY_LABEL[current.type] ? ACTIVITY_LABEL[current.type] : ""}{current.isCore ? "" : " · Extra (optional)"}</p>
          )}
          <h1 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-2.5 text-4xl leading-[1.05] font-bold tracking-tight outline-none sm:text-5xl lg:text-[56px]">
            {current.title || ACTIVITY_LABEL[current.type]}
          </h1>
          {lead && <p className="mt-6 text-xl">{lead}</p>}
          {lead && <p className="mt-3.5 text-muted-foreground">Press <b className="font-semibold text-foreground">Run</b> to see what your code does. Press <b className="font-semibold text-foreground">Check my code</b> when you think it&apos;s right.</p>}
          {current.hints.length > 0 && !done.has(current.id) && (
            <div className="mt-6 space-y-2.5">
              {current.hints.slice(0, hintsShown).map((h, i) => (
                <p key={i} className="rounded-2xl bg-card p-4"><span className="font-semibold">Hint {i + 1}:</span> {h}</p>
              ))}
              {hintsShown < current.hints.length && (
                <Button variant="outline" onClick={() => { setHintsShown((n) => n + 1); logHint(current.id).catch(() => {}); }}>
                  {hintsShown ? "Show another hint" : "Need a hint?"}
                </Button>
              )}
            </div>
          )}
          <div className="min-h-6 flex-1" />
          {error && <p role="alert" className="mb-3 rounded-2xl bg-[#FDE4DF] p-4 text-[#4A1008]">{error}</p>}
          <div className="flex flex-wrap items-center gap-3.5">
            {index > 0 && <Button variant="outline" size="lg" onClick={() => goTo(index - 1)}>Back</Button>}
            <Button size="lg" disabled={!canContinue || saving} onClick={next}
              className="disabled:bg-[#C9DBCF] disabled:text-muted-foreground disabled:opacity-100">
              {saving ? "Saving…" : index + 1 < steps.length ? "Next step" : "Finish lesson"} <span aria-hidden="true" className="font-mono font-extrabold">&gt;</span>
            </Button>
            {!canContinue && <span className="text-[15px] text-muted-foreground">Unlocks when you finish this step</span>}
          </div>
        </div>
        <section aria-labelledby="step-heading" className="flex flex-col gap-4 rounded-[28px] bg-card p-4 sm:p-6">
          <StepBody activity={current} props={props} runner={runner} />
        </section>
      </div>
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
    <section aria-labelledby="caught-up-heading" aria-live="polite" className="flex min-h-[70vh] flex-col justify-center gap-5 px-2 sm:px-16">
      {state === "saving" && <p role="status">Saving…</p>}
      {state === "done" && <>
        <p aria-hidden="true" className="font-mono text-6xl leading-none font-extrabold text-[#0DB031]">&gt;&gt;&gt;</p>
        <h1 id="caught-up-heading" className="text-6xl leading-none font-bold tracking-tight sm:text-8xl">You&apos;re caught up!</h1>
        <p className="max-w-xl text-2xl text-muted-foreground">You finished the recap and the core exercises for {lessonTitle}. Your teacher can see it.</p>
        <div className="mt-6 flex flex-wrap gap-3.5">
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
