"use client";

import Link from "next/link";
import { useState } from "react";
import { SaveMessage, useSave } from "@/components/curriculum/use-save";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentQuestion } from "@/types/curriculum";
import { saveAssessmentAction } from "../../../actions";

type Draft = { concept_tag: string; prompt: string; options: string; answer: number; explanation: string };
const toDraft = (q: AssessmentQuestion): Draft => ({ concept_tag: q.concept_tag, prompt: q.prompt, options: q.options.join("\n"), answer: q.answer, explanation: q.explanation ?? "" });
const blank: Draft = { concept_tag: "", prompt: "", options: "", answer: 0, explanation: "" };

export function TestEditor({ moduleId, unitTitle, kind, questions }: { moduleId: string; unitTitle: string; kind: "pre" | "post"; questions: AssessmentQuestion[] }) {
  const { pending, message, save } = useSave();
  const [drafts, setDrafts] = useState<Draft[]>(questions.length ? questions.map(toDraft) : [blank]);
  const update = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const opts = (q: Draft) => q.options.split("\n").map((o) => o.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/admin/curriculum/${moduleId}`} className="text-sm font-medium underline underline-offset-4">← {unitTitle}</Link>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{kind === "pre" ? "Pre-test" : "Post-test"}: {unitTitle}</h1>
        <p className="text-muted-foreground">
          {kind === "pre" ? "Students take this before the unit." : "Students take this after the unit."} Use the same topics in both tests
          but different questions, so learning gain per topic is fair.
        </p>
      </div>
      <ol className="space-y-4">
        {drafts.map((q, i) => (
          <li key={i} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between"><p className="font-medium">Question {i + 1}</p>
              <Button size="sm" variant="ghost" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>Remove</Button></div>
            <div className="space-y-1"><Label htmlFor={`t-${i}`}>Topic</Label>
              <Input id={`t-${i}`} value={q.concept_tag} onChange={(e) => update(i, { concept_tag: e.target.value })} placeholder="e.g. loops" className="h-10" /></div>
            <div className="space-y-1"><Label htmlFor={`p-${i}`}>Question</Label>
              <Textarea id={`p-${i}`} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor={`o-${i}`}>Answer options (one per line)</Label>
              <Textarea id={`o-${i}`} value={q.options} onChange={(e) => update(i, { options: e.target.value })} className="font-mono text-sm" /></div>
            <div className="space-y-1"><Label htmlFor={`a-${i}`}>Correct answer</Label>
              <select id={`a-${i}`} value={q.answer} onChange={(e) => update(i, { answer: Number(e.target.value) })} className="h-10 w-full rounded-md border bg-background px-2">
                {opts(q).map((o, j) => <option key={j} value={j}>{o}</option>)}
              </select></div>
          </li>
        ))}
      </ol>
      <Button variant="outline" onClick={() => setDrafts([...drafts, blank])}>+ Add a question</Button>
      <div className="flex items-center gap-3">
        <Button size="lg" disabled={pending} onClick={() => save(() => saveAssessmentAction(moduleId, kind, drafts.map((q) => ({
          concept_tag: q.concept_tag.trim(), prompt: q.prompt.trim(), options: opts(q), answer: q.answer,
          ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}),
        }))), "Test saved")}>{pending ? "Saving…" : "Save test"}</Button>
        <SaveMessage message={message} />
      </div>
    </div>
  );
}
