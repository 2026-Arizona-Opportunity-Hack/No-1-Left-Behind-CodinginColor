"use client";

import { useState, useTransition } from "react";
import { answerStep, reportCodeCheck } from "@/app/learn/[lessonId]/actions";
import { Button } from "@/components/ui/button";
import { checkCode, friendlyError, type CheckSummary, type PythonRunner, type RunResult } from "@/lib/python/runner";
import type { AnswerResult } from "@/types/student-lesson";
import { Feedback } from "./feedback";
import type { StepProps } from "./simple-steps";

export function CodeStep({ activity, onDone, elapsed, runner }: StepProps<"code"> & { runner: PythonRunner | null }) {
  const [code, setCode] = useState(activity.step.starter_code);
  const [run, setRun] = useState<RunResult | null>(null);
  const [summary, setSummary] = useState<CheckSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function doRun() {
    if (!runner) return;
    setBusy(true); setSummary(null);
    setRun(await runner.run(code));
    setBusy(false);
  }
  async function doCheck() {
    if (!runner) return;
    setBusy(true); setSaveError(null);
    const result = await checkCode(runner, code, activity.step.tests);
    setSummary(result); setRun(result.run); setBusy(false);
    try {
      await reportCodeCheck(activity.id, result.passed, result.total, code, elapsed());
      if (result.passed === result.total) onDone();
    } catch (e) { setSaveError((e as Error).message); }
  }

  const allPassed = summary && summary.passed === summary.total;
  return (
    <div className="flex flex-col gap-3.5">
      <label htmlFor={`code-${activity.id}`} className="sr-only">Your code</label>
      <textarea id={`code-${activity.id}`} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doRun(); }}
        className="min-h-48 w-full resize-y rounded-[18px] border-0 bg-[#0F2E1C] px-5 py-4 font-mono text-[18px] leading-[1.75] text-[#E6F4EA] focus-visible:outline-3 focus-visible:outline-[#FFD75E]" />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={doRun} disabled={!runner || busy}>Run</Button>
        <Button onClick={doCheck} disabled={!runner || busy}>Check my code</Button>
        <span role="status" className="text-[15px] text-muted-foreground">{!runner ? "Getting Python ready…" : busy ? "Running…" : ""}</span>
      </div>
      <div className="rounded-2xl bg-background px-5 py-3.5">
        <p className="text-[15px] font-semibold text-muted-foreground">What your code printed</p>
        <pre aria-live="polite" className="mt-1 font-mono text-[17px] leading-relaxed whitespace-pre-wrap">
          {run ? run.output || (run.error || run.timedOut ? "" : "(Nothing printed yet.)") : "Press Run to see what your code prints."}
        </pre>
      </div>
      {run && (run.error || run.timedOut) && (
        <p role="alert" className="rounded-[18px] bg-[#FDE4DF] px-5 py-4 text-[#4A1008]">{friendlyError(run)}</p>
      )}
      {summary && (
        <div aria-live="polite" className={`rounded-[18px] px-5 py-4 ${allPassed ? "bg-[#DDF3E3]" : "bg-[#FFEBD2] text-[#5C3200]"}`}>
          <p className="text-xl font-semibold">{allPassed ? `✓ ${summary.total} of ${summary.total} checks passed` : `${summary.passed} of ${summary.total} checks passed`}</p>
          {!allPassed && summary.results.find((r) => !r.passed)?.message && <p className="mt-1">{summary.results.find((r) => !r.passed)!.message}</p>}
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-base">
            {summary.results.map((r) => (
              <li key={r.label} className={r.passed ? "" : "font-semibold"}>
                <b aria-hidden="true">{r.passed ? "✓" : "!"}</b> <span className="sr-only">{r.passed ? "Passed: " : "Not yet: "}</span>{r.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {saveError && <p role="alert" className="text-[15px] text-[#4A1008]">{saveError}</p>}
    </div>
  );
}

export function ParsonsStep({ activity, onDone, elapsed }: StepProps<"parsons">) {
  const [lines, setLines] = useState(activity.step.lines);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, start] = useTransition();
  const locked = activity.done || result?.correct;
  const move = (i: number, by: -1 | 1) => setLines((ls) => {
    const out = [...ls]; [out[i], out[i + by]] = [out[i + by], out[i]]; return out;
  });
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{activity.step.prompt}</p>
      <p className="text-sm text-muted-foreground">Use the Up and Down buttons to move each line.</p>
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li key={line + i} className="flex items-center gap-2 rounded-lg border bg-[#0F2E1C] p-2 pl-4">
            <code className="flex-1 font-mono text-sm whitespace-pre text-[#E6F4EA]">{line}</code>
            <Button size="sm" variant="secondary" disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label={`Move line ${i + 1} up`}>Up</Button>
            <Button size="sm" variant="secondary" disabled={locked || i === lines.length - 1} onClick={() => move(i, 1)} aria-label={`Move line ${i + 1} down`}>Down</Button>
          </li>
        ))}
      </ol>
      {!locked && (
        <Button size="lg" disabled={pending} onClick={() => start(async () => {
          try { const r = await answerStep(activity.id, lines, elapsed()); setResult(r); if (r.correct) onDone(); }
          catch (e) { setResult({ correct: false, message: (e as Error).message }); }
        })}>{pending ? "Checking…" : "Check my order"}</Button>
      )}
      <Feedback result={activity.done && !result ? { correct: true, message: "You already got this one." } : result} />
    </div>
  );
}
