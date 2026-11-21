"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeViewStep, logHint } from "@/app/learn/[lessonId]/actions";
import { BandNote, CompletionBand } from "@/components/completion-band";
import { Button, buttonVariants } from "@/components/ui/button";
import { ACTIVITY_LABEL, ACTIVITY_TINT } from "@/lib/activity-labels";
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
    const advance = () => (steps.slice(index + 1).some((a) => a.isCore) ? goTo(index + 1) : setFinished(true));
    if (done.has(current.id) || !["slide", "video"].includes(current.type)) return advance();
    startSaving(async () => {
      try { await completeViewStep(current.id, elapsed()); markDone(current.id); advance(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  if ((finished || !current) && catchUp) return <CaughtUp lessonTitle={lesson.title} catchUp={catchUp} />;
  if (finished || !current) {
    const bonusLeft = steps.filter((a) => !a.isCore && !done.has(a.id));
    const required = steps.filter((a) => a.isCore);
    const requiredDone = required.filter((a) => done.has(a.id)).length;
    return (
      <section aria-labelledby="done-heading" className="mx-auto w-full max-w-[760px] space-y-6 py-6 sm:py-10">
        <CompletionBand headingId="done-heading" label="Lesson complete" title={lesson.title}
          big={`${requiredDone}/${required.length}`} bigLabel="required steps done"
          sub={lesson.nextLesson ? `Great work. Your teacher can see your progress. Next up: ${lesson.nextLesson.title}.` : "Great work. Your teacher can see your progress. Check My course for your next quiz."}
          notes={<><BandNote>{lesson.unitTitle}</BandNote>{bonusLeft.length > 0 && <BandNote>{bonusLeft.length} optional bonus step{bonusLeft.length === 1 ? "" : "s"} left</BandNote>}</>} />
        <div className="flex flex-wrap gap-3">
          {lesson.nextLesson && <Link href={`/learn/${lesson.nextLesson.id}`} className={buttonVariants({ size: "lg" })}>Next: {lesson.nextLesson.title} <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span></Link>}
          <Link href="/learn" className={buttonVariants({ size: "lg", variant: "outline" })}>Back to my course</Link>
          {bonusLeft.length > 0 && <Button size="lg" variant="outline" onClick={() => { setFinished(false); goTo(steps.findIndex((a) => !a.isCore && !done.has(a.id))); }}>Try the bonus step</Button>}
        </div>
      </section>
    );
  }

  const canContinue = done.has(current.id) || !current.isCore || ["slide", "video"].includes(current.type);
  const props = { activity: current, onDone: () => markDone(current.id), elapsed } as StepProps<never>;
  const lead = current.step.kind === "code" ? current.step.prompt : null;

  const nav = (
    <div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-[#FDE4DF] p-4 text-[#4A1008]">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {index > 0 && <Button variant="outline" onClick={() => goTo(index - 1)}><span aria-hidden="true">&lt;</span> Back</Button>}
        <Button disabled={!canContinue || saving} onClick={next}
          className="disabled:border-[#3D5C49] disabled:bg-[#C9D8CE] disabled:text-[#3D5C49] disabled:opacity-100">
          {saving ? "Saving…" : index + 1 < steps.length ? "Next step" : "Finish lesson"} <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span>
        </Button>
      </div>
      {!canContinue && <p className="mt-2 text-base text-muted-foreground">Unlocks when you finish this step</p>}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5 sm:grid-cols-[1fr_auto_1fr]">
        <Link href="/learn" className="inline-flex min-h-11 items-center gap-2 text-xl font-medium text-foreground no-underline"><span aria-hidden="true" className="font-mono font-extrabold text-[#0DB031]">&lt;</span> {lesson.title}</Link>
        <nav aria-label="Lesson steps" className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-2.5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {steps.map((a, i) => (
            <button key={a.id} type="button" onClick={() => goTo(i)} disabled={!reachable(i)}
              aria-current={i === index ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${a.title || ACTIVITY_LABEL[a.type]}${done.has(a.id) ? " (done)" : ""}${a.isCore ? "" : " (extra)"}`}
              className={`flex size-8 cursor-pointer items-center justify-center rounded-[9px] border-2 p-0 font-mono text-base font-bold disabled:cursor-not-allowed ${i === index ? "border-primary bg-[#FFD75E] text-primary" : done.has(a.id) ? "border-primary bg-[#0DB031] text-primary" : "border-dashed border-muted-foreground bg-transparent text-muted-foreground"}`}>
              <span aria-hidden="true">&gt;</span>
            </button>
          ))}
        </nav>
        <span className="col-start-2 row-start-1 justify-self-end text-base whitespace-nowrap text-muted-foreground sm:col-start-3">Step {index + 1} of {steps.length}</span>
      </div>

      {/* Phone: info, then the step card, then Back/Next. Desktop: info and buttons on the left, card on the right. */}
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start lg:gap-x-8">
        <div className="flex flex-col gap-0 pt-2 lg:col-start-1 lg:row-start-1 lg:pt-6">
          {(current.title && current.title !== ACTIVITY_LABEL[current.type] || !current.isCore) && (
            <p><span className={`inline-flex min-h-8 items-center rounded-lg px-3 text-base font-bold ${ACTIVITY_TINT[current.type] ?? "bg-sky text-sky-ink"}`}>{current.title && current.title !== ACTIVITY_LABEL[current.type] ? ACTIVITY_LABEL[current.type] : ""}{current.isCore ? "" : " · Bonus (optional)"}</span></p>
          )}
          <h1 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-2.5 text-4xl leading-[1.05] font-bold tracking-tight outline-none sm:text-5xl lg:text-[56px]">
            {current.title || ACTIVITY_LABEL[current.type]}
          </h1>
          {lead && <p className="mt-6 text-xl">{lead}</p>}
          {lead && <p className="mt-3.5 text-muted-foreground">Press <b className="font-semibold text-foreground">Run</b> to see what your code does. Press <b className="font-semibold text-foreground">Check my code</b> when you think it&apos;s right.</p>}
          <div className="mt-6 hidden lg:block">{nav}</div>
          {current.hints.length > 0 && !done.has(current.id) && (
            <div className="mt-6 space-y-2.5">
              {current.hints.slice(0, hintsShown).map((h, i) => (
                <p key={i} className="rounded-xl bg-card p-4 border border-border"><span className="font-semibold">Hint {i + 1}:</span> {h}</p>
              ))}
              {hintsShown < current.hints.length && (
                <Button variant="outline" onClick={() => { setHintsShown((n) => n + 1); logHint(current.id).catch(() => {}); }}>
                  {hintsShown ? "Show another hint" : "Need a hint?"}
                </Button>
              )}
            </div>
          )}
        </div>
        <section aria-labelledby="step-heading" className="flex min-w-0 flex-col gap-4 self-start rounded-[20px] bg-card p-4 sm:p-5 lg:col-start-2 lg:row-start-1 border border-border">
          <StepBody activity={current} props={props} runner={runner} />
        </section>
        <div className="lg:hidden">{nav}</div>
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
    <section aria-labelledby="caught-up-heading" aria-live="polite" className="mx-auto w-full max-w-[760px] py-6 sm:py-10">
      {state === "saving" && <p role="status">Saving…</p>}
      {state === "done" && (
        <div className="space-y-6">
          <CompletionBand headingId="caught-up-heading" label="Catch-up complete" title={`You're caught up on ${lessonTitle}`}
            sub="You finished the recap and the core exercises. Your teacher can see it." notes={<BandNote>Back on track with the class</BandNote>} />
          <div className="flex flex-wrap gap-3">
            {catchUp.todayLesson && <Link href={`/learn/${catchUp.todayLesson.id}`} className={buttonVariants({ size: "lg" })}>Rejoin your class: {catchUp.todayLesson.title} <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base text-primary">&gt;</span></Link>}
            <Link href="/learn" className={buttonVariants({ size: "lg", variant: "outline" })}>Back to my course</Link>
          </div>
        </div>
      )}
      {state === "not_yet" && (
        <div className="rounded-[20px] border-2 border-primary bg-card p-8">
          <h1 id="caught-up-heading" className="text-3xl font-bold">Almost there</h1>
          <p className="mt-2 text-lg text-muted-foreground">A few steps still need finishing. Go back and complete each one.</p>
          <Link href="/learn" className={`${buttonVariants({ variant: "outline" })} mt-5`}>Back to my course</Link>
        </div>
      )}
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
