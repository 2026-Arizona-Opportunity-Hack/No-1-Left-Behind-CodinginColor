"use client";

import { useState } from "react";
import { draftExerciseAction } from "@/app/(staff)/admin/curriculum/actions";
import { CodeEditor } from "@/components/code/code-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkCode, PythonRunner, type CodeCheck } from "@/lib/python/runner";

export type Draft = { prompt: string; starter_code: string; tests: CodeCheck[]; hints: string[] };

/**
 * Helpers for a coding step. "Write with AI" only fills the form (nothing is saved until Save step).
 * "Test the checks" runs a model solution and the starter code against the checks in the browser, because
 * the AI cannot run Python and a wrong check would make a correct student answer fail.
 */
export function ExerciseTools({ lessonId, starterCode, checks, onDraft }: {
  lessonId: string; starterCode: string; checks: CodeCheck[]; onDraft: (d: Draft) => void;
}) {
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [askMessage, setAskMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [solution, setSolution] = useState("");
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState<string[] | null>(null);

  async function write() {
    setAsking(true); setAskMessage(null);
    try {
      const r = await draftExerciseAction(lessonId, note);
      if (!r.ok) return setAskMessage({ ok: false, text: r.error });
      onDraft({ prompt: r.data.prompt, starter_code: r.data.starter_code, tests: r.data.tests, hints: r.data.hints });
      setSolution(r.data.solution);
      setReport(null);
      setAskMessage({ ok: true, text: "The AI wrote a draft. Read it, press “Test the checks”, then press Save step. Students can't see it until you save." });
    } catch (e) {
      setAskMessage({ ok: false, text: (e as Error).message });
    } finally { setAsking(false); }
  }

  async function test() {
    setTesting(true); setReport(null);
    const runner = new PythonRunner();
    try {
      const withSolution = await checkCode(runner, solution, checks);
      const withStarter = await checkCode(runner, starterCode, checks);
      const lines = [
        withSolution.passed === withSolution.total
          ? `✓ Your solution passes all ${withSolution.total} checks.`
          : `! Your solution passes only ${withSolution.passed} of ${withSolution.total} checks. A check may be wrong: ${withSolution.results.filter((x) => !x.passed).map((x) => `“${x.label}”`).join(", ")}.`,
        withStarter.passed === withStarter.total
          ? "! The starter code already passes every check, so students would have nothing to do."
          : `✓ The starter code passes ${withStarter.passed} of ${withStarter.total} checks, so students still have work to do.`,
      ];
      setReport(lines);
    } catch { setReport(["! Python couldn't load. Check your internet and try again."]); }
    finally { runner.dispose(); setTesting(false); }
  }

  const id = `tools-${lessonId}`;
  return (
    <div className="space-y-4 rounded-2xl bg-lilac p-4 text-lilac-ink">
      <div className="space-y-2">
        <Label htmlFor={`${id}-note`} className="text-base font-semibold">Write this exercise with AI</Label>
        <p className="text-sm">The AI reads this lesson&apos;s slides, video points and questions, then drafts the instructions, starter code and checks.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional: e.g. keep it easy, use a for loop" className="h-10 min-w-56 flex-1 bg-card" />
          <Button size="sm" onClick={write} disabled={asking}>{asking ? "Writing…" : "Write with AI"}</Button>
        </div>
        {askMessage && <p role={askMessage.ok ? "status" : "alert"} className={askMessage.ok ? "" : "rounded-xl bg-help p-3 text-help-ink"}>{askMessage.text}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Test the checks (recommended)</Label>
        <p className="text-sm">Paste a correct answer. We run it against your checks to make sure a right answer passes, in your browser.</p>
        <CodeEditor value={solution} onChange={setSolution} label="Model solution" minLines={4} />
        <Button size="sm" variant="outline" onClick={test} disabled={testing || !solution.trim() || checks.length === 0}>{testing ? "Testing…" : "Test the checks"}</Button>
        {checks.length === 0 && <p className="text-sm">Add at least one check first.</p>}
        {report && <ul role="status" className="space-y-1">{report.map((l) => <li key={l}>{l}</li>)}</ul>}
      </div>
    </div>
  );
}
