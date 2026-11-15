"use client";

import { useState, useTransition } from "react";
import { answerStep, reportCodeCheck } from "@/app/learn/[lessonId]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-lg">{activity.step.prompt}</p>
        <Label htmlFor={`code-${activity.id}`} className="text-base">Your code</Label>
        <Textarea id={`code-${activity.id}`} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doRun(); }}
          className="min-h-48 bg-zinc-950 font-mono text-[15px] leading-6 text-zinc-100" />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" variant="outline" onClick={doRun} disabled={!runner || busy}>Run</Button>
          <Button size="lg" onClick={doCheck} disabled={!runner || busy}>Check my code</Button>
          <span role="status" className="text-sm text-muted-foreground">{!runner ? "Getting Python ready…" : busy ? "Running…" : ""}</span>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-base font-medium">Output</p>
        <pre aria-live="polite" className="min-h-28 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm leading-6 whitespace-pre-wrap text-zinc-100">
          {run ? run.output || (run.error || run.timedOut ? "" : "(Your code didn't print anything.)") : "Press Run to see what your code prints."}
        </pre>
        {run && (run.error || run.timedOut) && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{friendlyError(run)}</p>
        )}
        {summary && (
          <div aria-live="polite" className={`rounded-lg border p-4 ${allPassed ? "border-green-700 bg-green-50" : ""}`}>
            <p className="font-medium">{allPassed ? "✓ All checks passed. Nice work!" : `${summary.passed} of ${summary.total} checks passed`}</p>
            <ul className="mt-2 space-y-1">
              {summary.results.map((r) => (
                <li key={r.label} className="flex gap-2">
                  <span aria-hidden="true" className={r.passed ? "text-green-700" : "text-red-700"}>{r.passed ? "✓" : "✗"}</span>
                  <span><span className="sr-only">{r.passed ? "Passed: " : "Not yet: "}</span>{r.label}
                    {r.message && <span className="block text-sm text-muted-foreground">{r.message}</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {saveError && <p role="alert" className="text-sm text-red-800">{saveError}</p>}
      </div>
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
          <li key={line + i} className="flex items-center gap-2 rounded-lg border bg-zinc-950 p-2 pl-4">
            <code className="flex-1 font-mono text-sm whitespace-pre text-zinc-100">{line}</code>
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
