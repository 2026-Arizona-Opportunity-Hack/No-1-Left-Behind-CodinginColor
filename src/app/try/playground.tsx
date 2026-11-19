"use client";

import { useEffect, useRef, useState } from "react";
import { CodeEditor } from "@/components/code/code-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  checkCode,
  friendlyError,
  PythonRunner,
  type CheckSummary,
  type CodeCheck,
  type RunResult,
} from "@/lib/python/runner";

// Sample exercise from the "Loops" lesson. The starter code has the classic off-by-one bug.
const STARTER_CODE = `# Print the numbers 1 to 5
for number in range(1, 5):
    print(number)
`;

const CHECKS: CodeCheck[] = [
  { label: "Starts counting at 1", assert: `assert __output__.split()[:1] == ["1"]`, hint: "The first number printed should be 1." },
  {
    label: "Prints one number per line",
    assert: `assert all(line.strip().isdigit() for line in __output__.strip().splitlines())`,
    hint: "Use print() inside the loop so each number gets its own line.",
  },
  { label: "Stops at 5", expectedOutput: "1\n2\n3\n4\n5", hint: "Your loop stops one number too early. Try changing the range." },
];

type Status = "loading" | "ready" | "running" | "load-failed";

export function Playground() {
  const runner = useRef<PythonRunner | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [code, setCode] = useState(STARTER_CODE);
  const [stdin, setStdin] = useState("");
  const [run, setRun] = useState<RunResult | null>(null);
  const [summary, setSummary] = useState<CheckSummary | null>(null);

  useEffect(() => {
    const r = new PythonRunner();
    runner.current = r;
    r.warmUp().then(
      () => setStatus("ready"),
      () => setStatus("load-failed"),
    );
    return () => r.dispose();
  }, []);

  async function handleRun() {
    if (!runner.current || status === "running") return;
    setStatus("running");
    setSummary(null);
    try {
      setRun(await runner.current.run(code, stdin));
      setStatus("ready");
    } catch {
      setStatus("load-failed");
    }
  }

  async function handleCheck() {
    if (!runner.current || status === "running") return;
    setStatus("running");
    try {
      const result = await checkCode(runner.current, code, CHECKS);
      setSummary(result);
      setRun(result.run);
      setStatus("ready");
    } catch {
      setStatus("load-failed");
    }
  }

  const busy = status !== "ready";
  const allPassed = summary && summary.passed === summary.total;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="code-heading" className="space-y-3">
        <Label id="code-heading" htmlFor="code" className="text-base">
          Your code
        </Label>
        <CodeEditor value={code} onChange={setCode} label="Your code" onRun={handleRun} minLines={9} fileName="loops.py" toolbar={<>
          <Button size="sm" variant="ghost" className="border-[#2C5A3F] text-[#E6F4EA] hover:bg-[#0F2E1C] hover:text-white" onClick={() => setCode(STARTER_CODE)} disabled={busy || code === STARTER_CODE}>Start over</Button>
          <Button size="sm" variant="yellow" onClick={handleRun} disabled={busy}>Run <span aria-hidden="true" className="font-mono">&gt;</span></Button>
          <Button size="sm" variant="outline" onClick={handleCheck} disabled={busy}>Check my code</Button>
        </>} />
        <Label htmlFor="stdin">Input (one answer per line, for input())</Label>
        <Textarea id="stdin" value={stdin} onChange={(e) => setStdin(e.target.value)} className="min-h-16 font-mono" />
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-base text-muted-foreground">
            {status === "loading" && "Getting Python ready…"}
            {status === "running" && "Running…"}
            {status === "load-failed" && "Python couldn't load. Check your internet and refresh the page."}
          </span>
        </div>
      </section>

      <section aria-labelledby="output-heading" className="space-y-4">
        <h2 id="output-heading" className="text-base font-medium">
          Output
        </h2>
        <pre
          aria-live="polite"
          className="min-h-40 overflow-auto rounded-xl bg-card px-5 py-4 font-mono text-[17px] leading-relaxed whitespace-pre-wrap border border-border"
        >
          {run ? run.output || (run.error || run.timedOut ? "" : "(Your code didn't print anything.)") : "Press Run to see what your code prints."}
          {run?.truncated && "\n… (output cut off: that's a lot of printing!)"}
        </pre>
        {run && (run.error || run.timedOut) && (
          <div role="alert" className="rounded-xl bg-help p-4 text-help-ink">
            <p className="font-medium">{friendlyError(run)}</p>
            {run.error?.traceback && (
              <details className="mt-2 text-base">
                <summary className="cursor-pointer">Show Python&apos;s message</summary>
                <pre className="mt-2 font-mono whitespace-pre-wrap">{run.error.traceback}</pre>
              </details>
            )}
          </div>
        )}
        {summary && (
          <div aria-live="polite" className="rounded-lg border p-4">
            <p className="font-medium">
              {allPassed ? "All checks passed. Nice work!" : `${summary.passed} of ${summary.total} checks passed`}
            </p>
            <ul className="mt-3 space-y-2">
              {summary.results.map((r) => (
                <li key={r.label} className="flex gap-2">
                  <span aria-hidden="true" className={r.passed ? "text-[#047D13]" : "text-[#B3261E]"}>
                    {r.passed ? "✓" : "✗"}
                  </span>
                  <span>
                    <span className="sr-only">{r.passed ? "Passed: " : "Not yet: "}</span>
                    {r.label}
                    {r.message && <span className="block text-base text-muted-foreground">{r.message}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
