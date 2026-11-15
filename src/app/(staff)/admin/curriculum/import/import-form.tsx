"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importFromYouTube, type ImportState } from "./actions";

const STAGES = ["Reading the video's captions…", "Finding the key ideas…", "Writing quiz questions for pause points…", "Drafting a coding exercise…", "Drafting the teaching guide…"];

export function ImportForm({ units, aiOn }: { units: { id: string; title: string }[]; aiOn: boolean }) {
  const [unit, setUnit] = useState(units[0]?.id ?? "");
  const [link, setLink] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ImportState | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 5000);
    return () => clearInterval(id);
  }, [pending]);

  if (result?.ok) {
    return (
      <div role="status" className="space-y-3 rounded-2xl border-2 border-green-700 bg-green-50 p-6 text-green-950">
        <h2 className="text-2xl font-semibold">✓ Your draft lesson is ready to review</h2>
        <p>{result.usedAi ? "AI drafted the video's key points, pause-point quizzes, a quick check, a coding exercise, an exit question and a teaching guide. Each one is marked \"Suggested: please review\": check it, edit it, and save it before you publish." : result.note}</p>
        {result.usedAi && result.note && <p className="text-sm">{result.note}</p>}
        <Link href={`/admin/curriculum/lesson/${result.lessonId}`} className={buttonVariants({ size: "lg" })}>Review the draft</Link>
      </div>
    );
  }

  return (
    <form className="space-y-5 rounded-2xl border p-6" onSubmit={(e) => {
      e.preventDefault();
      setResult(null); setStage(0);
      start(async () => {
        const r = await importFromYouTube(unit, link, showPaste ? paste : "");
        if (!r.ok && r.needTranscript) setShowPaste(true);
        setResult(r);
      });
    }}>
      {!aiOn && <p className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-sm text-amber-900">AI drafting is off (no AI key set). You&apos;ll still get a starter lesson with the video to fill in by hand. See the README to add a key.</p>}
      <div className="space-y-1">
        <Label htmlFor="yt">YouTube link</Label>
        <Input id="yt" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="h-11" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unit">Add it to unit</Label>
        <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-11 w-full rounded-md border bg-background px-2">
          {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPaste} onChange={(e) => setShowPaste(e.target.checked)} />
        Paste the transcript myself (use this if the video has no captions we can read)</label>
      {showPaste && (
        <div className="space-y-1">
          <Label htmlFor="transcript">Transcript</Label>
          <Textarea id="transcript" value={paste} onChange={(e) => setPaste(e.target.value)} className="min-h-40 text-sm"
            placeholder={"On YouTube: ⋯ under the video → Show transcript → copy it here.\n0:05 Today we'll learn about loops…"} />
        </div>
      )}
      <p className="text-sm text-muted-foreground">Only the video&apos;s words are sent to the AI. Never anything about students.</p>
      <Button type="submit" size="lg" disabled={pending || !link.trim() || !unit}>{pending ? "Building your lesson…" : "Build my lesson"}</Button>
      {pending && (
        <ol aria-live="polite" className="space-y-1 text-sm">
          {STAGES.slice(0, stage + 1).map((s, i) => <li key={s}>{i < stage ? "✓" : "…"} {s.replace("…", "")}</li>)}
        </ol>
      )}
      {result && !result.ok && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{result.error}</p>}
    </form>
  );
}
