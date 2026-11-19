"use client";

import { useState, useTransition } from "react";
import { answerStep, reportCodeCheck } from "@/app/learn/[lessonId]/actions";
import { CodeEditor } from "@/components/code/code-editor";
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
  const [turnedIn, setTurnedIn] = useState(false);
  const [tab, setTab] = useState<"output" | "checks">("output");
  const noChecks = activity.step.tests.length === 0;

  async function doRun() {
    if (!runner) return;
    setBusy(true); setSummary(null);
    setRun(await runner.run(code));
    setBusy(false);
  }
  async function doCheck() {
    if (!runner) return;
    setBusy(true); setSaveError(null);
    if (noChecks) { // nothing to grade: turning it in counts once the code is written and runs
      const result = await runner.run(code);
      setRun(result); setSummary(null); setBusy(false);
      if (!code.trim()) return setSaveError("Write some code first, then turn it in.");
      if (result.error || result.timedOut) return;
      try { await reportCodeCheck(activity.id, 0, 0, code, elapsed()); setTurnedIn(true); onDone(); }
      catch (e) { setSaveError((e as Error).message); }
      return;
    }
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
      <CodeEditor value={code} onChange={setCode} label="Your code" onRun={doRun} fileName="exercise.py" footer={<ResultPane tab={tab} setTab={setTab} run={run} summary={summary} tests={activity.step.tests} />} toolbar={<>
        <Button size="sm" variant="ghost" className="border-[#2C5A3F] text-[#E6F4EA] hover:bg-[#0F2E1C] hover:text-white" onClick={() => { setCode(activity.step.starter_code); setRun(null); setSummary(null); }} disabled={busy || code === activity.step.starter_code}>Reset</Button>
        <Button size="sm" variant="yellow" onClick={doRun} disabled={!runner || busy}>Run <span aria-hidden="true" className="font-mono">&gt;</span></Button>
        <Button size="sm" variant="outline" onClick={doCheck} disabled={!runner || busy}>{noChecks ? "Turn in my code" : "Check my code"}</Button>
      </>} />
      <p role="status" className="text-base text-muted-foreground">{!runner ? "Getting Python ready…" : busy ? "Running…" : ""}</p>
      {run && (run.error || run.timedOut) && (
        <p role="alert" className="rounded-xl bg-[#FDE4DF] px-5 py-4 text-[#4A1008]">{friendlyError(run)}</p>
      )}
      {summary && (
        <div aria-live="polite" className={`rounded-xl px-5 py-4 ${allPassed ? "bg-[#DDF3E3]" : "bg-[#FFEBD2] text-[#5C3200]"}`}>
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
      {turnedIn && <p role="status" className="rounded-xl bg-[#DDF3E3] px-5 py-4 text-xl font-semibold">✓ Turned in. Your teacher can see your code.</p>}
      {saveError && <p role="alert" className="text-base text-[#4A1008]">{saveError}</p>}
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
      <p className="text-base text-muted-foreground">Use the Up and Down buttons to move each line.</p>
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li key={line + i} className="flex items-center gap-2 rounded-lg border bg-[#0F2E1C] p-2 pl-4">
            <code className="flex-1 font-mono text-base whitespace-pre text-[#E6F4EA]">{line}</code>
            <Button variant="secondary" disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label={`Move line ${i + 1} up`}>Up</Button>
            <Button variant="secondary" disabled={locked || i === lines.length - 1} onClick={() => move(i, 1)} aria-label={`Move line ${i + 1} down`}>Down</Button>
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

/** The dark Output / Checks panel under the editor: expected and actual output side by side, one line per check. */
function ResultPane({ tab, setTab, run, summary, tests }: {
  tab: "output" | "checks"; setTab: (t: "output" | "checks") => void; run: RunResult | null; summary: CheckSummary | null;
  tests: { label: string; expectedOutput?: string }[];
}) {
  const expected = tests.find((t) => t.expectedOutput !== undefined)?.expectedOutput;
  const printed = run ? run.output || (run.error || run.timedOut ? "" : "(Nothing printed yet.)") : null;
  const wrong = summary && summary.results.some((r) => !r.passed);
  const tabCls = (on: boolean) => `inline-flex min-h-10 cursor-pointer items-center rounded-t-[10px] border-0 px-4 text-[15px] font-bold ${on ? "bg-[#0C2618] text-white" : "bg-transparent text-[#C9E3D1]"}`;
  const lab = "mb-1 text-[13px] font-bold tracking-wider text-[#9DB8A5] uppercase";
  const val = "rounded-[10px] bg-[#16422A] px-3.5 py-2 font-mono text-base leading-6 whitespace-pre-wrap text-[#E6F4EA]";
  return (
    <div>
      <div role="group" aria-label="Results" className="flex gap-1 border-t border-[#2C5A3F] bg-[#16422A] px-2.5 pt-2">
        <button type="button" aria-pressed={tab === "output"} onClick={() => setTab("output")} className={tabCls(tab === "output")}>Output</button>
        <button type="button" aria-pressed={tab === "checks"} onClick={() => setTab("checks")} className={tabCls(tab === "checks")}>Checks</button>
      </div>
      <div className="bg-[#0C2618] px-4 pt-3 pb-3.5 text-[#E6F4EA]">
        {tab === "output" ? (
          <>
            {summary && (
              <ul className="m-0 mb-1 flex list-none flex-wrap gap-2 p-0">
                {summary.results.map((r) => (
                  <li key={r.label} className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-[#16422A] px-3 text-[15px] font-bold">
                    <b aria-hidden="true" className={r.passed ? "text-[#7BE495]" : "text-[#FFB4A8]"}>{r.passed ? "✓" : "✗"}</b>
                    <span className="sr-only">{r.passed ? "Passed: " : "Not yet: "}</span>{r.label}
                  </li>
                ))}
              </ul>
            )}
            {/* Side by side on wide screens so the panel stays short. */}
            <div className={`mt-3 grid gap-x-4 gap-y-3 ${expected !== undefined ? "sm:grid-cols-2" : ""}`}>
              {expected !== undefined && (<div><p className={lab}>Expected output</p><pre className={`${val} max-h-40 overflow-auto`}>{expected}</pre></div>)}
              <div><p className={lab}>Your output</p>
                <pre aria-live="polite" className={`${val} max-h-40 overflow-auto ${wrong ? "border border-[#FFB4A8]" : ""}`}>
                  {printed ?? <span className="font-sans text-[#C9E3D1]">Press Run to see what your code prints.</span>}
                </pre></div>
            </div>
          </>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {tests.length === 0 && <li>This step has no checks. Press Turn in my code when you are done.</li>}
            {tests.map((t) => {
              const r = summary?.results.find((x) => x.label === t.label);
              return (
                <li key={t.label} className="flex items-center gap-2.5 rounded-xl bg-[#16422A] px-3.5 py-2.5 font-bold">
                  <b aria-hidden="true" className={r ? (r.passed ? "text-[#7BE495]" : "text-[#FFB4A8]") : "text-[#9DB8A5]"}>{r ? (r.passed ? "✓" : "✗") : "○"}</b>
                  <span className="sr-only">{r ? (r.passed ? "Passed: " : "Not yet: ") : "Not checked yet: "}</span>{t.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
