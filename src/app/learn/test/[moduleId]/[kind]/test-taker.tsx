"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { StudentTest, TopicScore } from "@/server/student-tests";
import { finishTest } from "./actions";

export function TestTaker({ moduleId, test }: { moduleId: string; test: StudentTest }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<TopicScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const q = test.questions[index];
  const last = index === test.questions.length - 1;
  const name = test.kind === "pre" ? "Warm-up quiz" : "Final quiz";

  const go = (i: number) => { setIndex(i); requestAnimationFrame(() => headingRef.current?.focus()); };

  const CHEV = "flex size-7 items-center justify-center rounded-full bg-[#A8E6B8] font-mono text-base font-bold text-primary";

  if (scores) {
    // Results, as in the design: a dark band with the score, then growth by topic (white circle = before, dark = after).
    const avg = Math.round(scores.reduce((t, x) => t + x.pct, 0) / Math.max(1, scores.length));
    const withPre = scores.filter((x) => x.pre_pct !== null);
    const preAvg = withPre.length ? Math.round(withPre.reduce((t, x) => t + (x.pre_pct ?? 0), 0) / withPre.length) : null;
    return (
      <section aria-labelledby="done-h" className="mx-auto w-full max-w-[760px] space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-9 text-center text-white sm:px-9">
          <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-10 font-mono text-[380px] leading-none font-bold text-[#0F4527] select-none">&gt;</span>
          <div className="relative">
            <span className="inline-flex min-h-8 items-center rounded-[10px] border-2 border-primary bg-white px-3 text-base font-bold text-primary">{name} complete</span>
            <h1 id="done-h" className="mt-3.5 mb-1 text-4xl font-bold">{test.unitTitle}</h1>
            <p className="mt-2.5 text-[88px] leading-none font-bold tabular-nums">{avg}%</p>
            <p className="mt-1 text-xl text-[#E0F1E5]">{test.kind === "pre"
              ? "Thanks! This shows what you already know, so we can see how much you learn."
              : "Your result is saved. Here is how much you grew in this unit."}</p>
            {test.kind === "post" && preAvg !== null && (
              <p className="mt-5"><span className="inline-flex min-h-8 items-center rounded-[10px] bg-[#D6F2DE] px-3 text-base font-bold text-primary">{avg >= preAvg ? "▲ Up" : "▼ Down"} from {preAvg}% on your warm-up quiz</span></p>
            )}
          </div>
        </div>
        <h2 className="text-[28px] font-bold">Your growth by topic</h2>
        <div className="rounded-[20px] border border-border bg-card p-6">
          <ul className="m-0 list-none space-y-5 p-0">
            {scores.map((x) => (
              <li key={x.concept_tag}>
                <p className="mb-1.5 flex flex-wrap justify-between gap-2.5 font-bold"><span className="capitalize">{x.concept_tag}</span>
                  <span className="tabular-nums">{x.pre_pct !== null ? `Before ${x.pre_pct}% · After ${x.pct}%` : `${x.pct}%`}</span></p>
                <div aria-hidden="true" className="relative h-3.5 rounded-full border border-border bg-secondary">
                  {x.pre_pct !== null ? (
                    <>
                      <span className="absolute inset-y-0 rounded-full bg-[#7FD493]" style={{ left: `${Math.min(x.pre_pct, x.pct)}%`, width: `${Math.abs(x.pct - x.pre_pct)}%` }} />
                      <i className="absolute -top-1 size-5 rounded-full border-[3px] border-primary bg-white" style={{ left: `calc(${x.pre_pct}% - 10px)` }} />
                      <i className="absolute -top-1 size-5 rounded-full border-[3px] border-primary bg-primary" style={{ left: `calc(${x.pct}% - 10px)` }} />
                    </>
                  ) : (
                    <span className="absolute inset-y-0 left-0 rounded-full bg-[#7FD493]" style={{ width: `${x.pct}%` }} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {withPre.length > 0 && <p className="mt-4 text-base text-muted-foreground">White circle: before. Dark circle: after.</p>}
        </div>
        <Link href="/learn" className={buttonVariants({ size: "lg" })}>Back to my course <span aria-hidden="true" className={CHEV}>&gt;</span></Link>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-5">
      <div>
        <span className="inline-flex min-h-8 items-center rounded-[10px] bg-sky px-3 text-base font-bold text-sky-ink">{name} · {test.unitTitle}</span>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3.5 text-4xl font-bold tracking-tight outline-none sm:text-[40px]">Question {index + 1} of {test.questions.length}</h1>
        <div className="mt-3.5 h-3.5 rounded-full border border-border bg-secondary" role="progressbar" aria-label="Quiz progress"
          aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={test.questions.length}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${((index + 1) / test.questions.length) * 100}%` }} />
        </div>
      </div>
      <form className="space-y-5" onSubmit={(e) => {
        e.preventDefault();
        if (!last) return go(index + 1);
        setError(null);
        start(async () => {
          const r = await finishTest(moduleId, test.kind, answers);
          if (r.ok) setScores(r.scores); else setError(r.error);
        });
      }}>
        <fieldset className="rounded-[20px] border border-border bg-card p-6">
          <legend className="sr-only">Question {index + 1}</legend>
          {/* Questions with code ("x = 3\nif x > 5: …") show the code in a code font, the last line as the question. */}
          {q.prompt.includes("\n") ? (
            <>
              <pre className="mb-3 overflow-auto rounded-xl bg-[#0F2E1C] p-4 font-mono text-base leading-6 text-[#E6F4EA]">{q.prompt.split("\n").slice(0, -1).join("\n")}</pre>
              <p className="mb-4 text-[22px] font-bold">{q.prompt.split("\n").at(-1)}</p>
            </>
          ) : <p className="mb-4 text-[22px] font-bold">{q.prompt}</p>}
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <label key={i} className="flex min-h-16 cursor-pointer items-center gap-3.5 rounded-[18px] border-2 border-border bg-white px-[18px] py-3.5 text-xl has-checked:border-primary has-checked:bg-secondary has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#047D13]">
                <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} className="sr-only" />
                <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] font-mono text-lg font-bold ${answers[q.id] === i ? "bg-primary text-white" : "bg-secondary"}`}>{String.fromCharCode(65 + i)}</span>
                <span className="font-mono">{opt}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-base text-muted-foreground">It&apos;s fine not to know yet. Pick your best guess. This quiz shows what you already know, so you can see how much you grow.</p>
        </fieldset>
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="outline" disabled={index === 0} onClick={() => go(index - 1)}><span aria-hidden="true">&lt;</span> Back</Button>
          <Button type="submit" size="lg" disabled={answers[q.id] === undefined || pending}>
            {last ? (pending ? "Saving…" : "Finish quiz") : "Next question"} <span aria-hidden="true" className={CHEV}>&gt;</span>
          </Button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-help p-4 text-help-ink">{error}</p>}
      </form>
    </div>
  );
}
