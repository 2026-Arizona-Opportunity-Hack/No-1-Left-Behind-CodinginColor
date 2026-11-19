"use client";

import { useEffect, useState } from "react";
import { checkCode, friendlyError, PythonRunner, type CheckSummary, type CodeCheck } from "@/lib/python/runner";

export type Guide = { about: string; mistakes: string[]; example: string; ask: string[] };
export type HelpPanelProps = {
  studentLabel: string;
  stepTitle: string;
  stepNumber: number;
  lessonTitle: string;
  code: string | null;
  checks: CodeCheck[];
  attempts: number;
  hints: number;
  timeLabel: string;
  guide: Guide | null;
  guideFrom: string | null; // set when the guide comes from another step in the same lesson
};

/** "Help me teach this": the student's work on the left, a no-prep teaching guide on the right. */
export function HelpPanel(p: HelpPanelProps) {
  const [summary, setSummary] = useState<CheckSummary | null>(null);
  const [status, setStatus] = useState(p.code && p.checks.length ? "Running their code…" : "");

  // Re-run the student's latest code against the step's checks, in the teacher's browser.
  useEffect(() => {
    if (!p.code || !p.checks.length) return;
    const runner = new PythonRunner();
    let alive = true;
    checkCode(runner, p.code, p.checks).then((s) => { if (alive) { setSummary(s); setStatus(""); } },
      () => alive && setStatus("Couldn't run their code here."));
    return () => { alive = false; runner.dispose(); };
  }, [p.code, p.checks]);

  return (
    <section id="help" aria-labelledby="help-h" className="scroll-mt-4 rounded-[20px] border-2 border-[#C2452F] bg-card p-6 sm:p-8">
      {/* Heading lives in the left column so the guide starts at the top: no empty corner. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 id="help-h" className="inline-flex rounded-lg bg-help px-4 py-1.5 text-xl font-semibold text-help-ink">! Help me teach this</h2>
          <p className="text-muted-foreground">{p.studentLabel} is stuck on <strong>step {p.stepNumber}: {p.stepTitle}</strong> in {p.lessonTitle}.</p>
          <h3 className="pt-2 font-semibold">Their work</h3>
          <p className="text-base text-muted-foreground">{p.attempts} {p.attempts === 1 ? "try" : "tries"} · {p.hints} hint{p.hints === 1 ? "" : "s"} used · {p.timeLabel}</p>
          {p.code ? <pre aria-label="Their latest code" className="overflow-auto rounded-lg bg-[#0F2E1C] p-4 font-mono text-base leading-6 text-[#E6F4EA]">{p.code}</pre>
            : <p className="rounded-lg bg-muted p-3 text-base">No code yet: this step is a question, so start with the guide.</p>}
          {status && <p role="status" className="text-base text-muted-foreground">{status}</p>}
          {summary && (
            <div aria-live="polite" className="rounded-xl border bg-card p-4">
              <p className="font-medium">{summary.passed} of {summary.total} checks pass</p>
              <ul className="mt-2 space-y-1 text-base">
                {summary.results.map((r) => (
                  <li key={r.label} className={r.passed ? "" : "rounded-lg bg-help p-2 font-medium text-help-ink"}>
                    <span aria-hidden="true">{r.passed ? "✓ " : "✗ "}</span><span className="sr-only">{r.passed ? "Passes: " : "Fails: "}</span>{r.label}
                    {!r.passed && r.message && <span className="block font-normal">{r.message}</span>}
                  </li>
                ))}
              </ul>
              {summary.run && (summary.run.error || summary.run.timedOut) && <p className="mt-2 text-base text-help-ink">{friendlyError(summary.run)}</p>}
            </div>
          )}
          {/* The worked example sits under their code so the teacher can compare the two. */}
          {p.guide?.example && (
            <div className="space-y-2">
              <h3 className="font-semibold">A worked example</h3>
              <pre aria-label="Worked example" className="overflow-auto rounded-lg bg-[#0F2E1C] p-4 font-mono text-base leading-6 text-[#E6F4EA]">{p.guide.example}</pre>
            </div>
          )}
        </div>
        <div className="space-y-4 rounded-[22px] bg-sky p-5 text-sky-ink">
          <h3 className="font-semibold">Teaching guide{p.guideFrom && <span className="font-normal"> (from &quot;{p.guideFrom}&quot; in this lesson)</span>}</h3>
          {p.guide ? (
            <>
              <div><p className="text-base font-semibold tracking-wide uppercase">What this is about</p><p>{p.guide.about}</p></div>
              {p.guide.mistakes.length > 0 && <div><p className="text-base font-semibold tracking-wide uppercase">Common mistakes</p>
                <ul className="list-disc space-y-1 pl-5">{p.guide.mistakes.map((m) => <li key={m}>{m}</li>)}</ul></div>}
              {p.guide.ask.length > 0 && <div><p className="text-base font-semibold tracking-wide uppercase">Questions to ask (don&apos;t give the answer)</p>
                <ul className="mt-1 space-y-2">{p.guide.ask.map((q) => <li key={q} className="rounded-[10px] rounded-bl-sm bg-card p-3 text-foreground">“{q}”</li>)}</ul></div>}
            </>
          ) : <p className="text-base">This step has no teaching guide yet. CIC staff can add one in the curriculum editor.</p>}
        </div>
      </div>
    </section>
  );
}
