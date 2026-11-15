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
  const name = test.kind === "pre" ? "Pre-test" : "Post-test";

  const go = (i: number) => { setIndex(i); requestAnimationFrame(() => headingRef.current?.focus()); };

  if (scores) {
    return (
      <section aria-labelledby="done-h" className="mx-auto max-w-xl space-y-5 rounded-3xl bg-card p-8">
        <h1 id="done-h" className="text-4xl font-bold tracking-tight">✓ {name} done!</h1>
        <p className="text-muted-foreground">{test.kind === "pre"
          ? "Thanks! This shows what you already know, so we can see how much you learn."
          : "Here's how much you grew in this unit:"}</p>
        <ul className="space-y-3">
          {scores.map((s) => (
            <li key={s.concept_tag} className="rounded-lg border p-3">
              <p className="flex justify-between font-medium capitalize"><span>{s.concept_tag}</span>
                <span className="tabular-nums">{s.pre_pct !== null ? `${s.pre_pct}% → ${s.pct}%` : `${s.pct}%`}</span></p>
              <div className="mt-2 h-2 rounded-full bg-muted" aria-hidden="true"><div className="h-2 rounded-full bg-[#047D13]" style={{ width: `${s.pct}%` }} /></div>
            </li>
          ))}
        </ul>
        <Link href="/learn" className={buttonVariants({ size: "lg" })}>Back to my course</Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{name} · {test.unitTitle}</p>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-muted" role="progressbar" aria-label="Test progress"
            aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={test.questions.length}>
            <div className="h-2 rounded-full bg-primary" style={{ width: `${((index + 1) / test.questions.length) * 100}%` }} />
          </div>
          <span className="text-sm tabular-nums">Question {index + 1} of {test.questions.length}</span>
        </div>
      </div>
      <form className="space-y-4 rounded-3xl bg-card p-6" onSubmit={(e) => {
        e.preventDefault();
        if (!last) return go(index + 1);
        setError(null);
        start(async () => {
          const r = await finishTest(moduleId, test.kind, answers);
          if (r.ok) setScores(r.scores); else setError(r.error);
        });
      }}>
        <fieldset className="space-y-3">
          <legend className="w-full">
            {/* Questions with code ("x = 3\nif x > 5: …") show the code in a code font, the last line as the question. */}
            {q.prompt.includes("\n") ? (
              <>
                <pre className="mb-3 overflow-auto rounded-lg bg-[#0F2E1C] p-4 font-mono text-sm leading-6 text-[#E6F4EA]">{q.prompt.split("\n").slice(0, -1).join("\n")}</pre>
                <h1 ref={headingRef} tabIndex={-1} className="mb-3 text-xl font-semibold outline-none">{q.prompt.split("\n").at(-1)}</h1>
              </>
            ) : <h1 ref={headingRef} tabIndex={-1} className="mb-3 text-xl font-semibold outline-none">{q.prompt}</h1>}
          </legend>
          {q.options.map((opt, i) => (
            <label key={i} className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-checked:border-primary has-checked:bg-muted has-focus-visible:outline-2">
              <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} className="size-5" />
              <span className="font-mono">{opt}</span>
            </label>
          ))}
        </fieldset>
        <p className="text-sm text-muted-foreground">It&apos;s fine not to know yet. Pick your best guess.</p>
        <div className="flex justify-between">
          <Button type="button" variant="outline" disabled={index === 0} onClick={() => go(index - 1)}>Back</Button>
          <Button type="submit" size="lg" disabled={answers[q.id] === undefined || pending}>
            {last ? (pending ? "Saving…" : "Finish test") : "Next question"}
          </Button>
        </div>
        {error && <p role="alert" className="rounded-2xl bg-help p-4 text-help-ink">{error}</p>}
      </form>
    </div>
  );
}
