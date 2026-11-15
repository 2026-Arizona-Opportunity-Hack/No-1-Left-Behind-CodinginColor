"use client";

import { useState } from "react";
import { updateActivityAction } from "@/app/(staff)/admin/curriculum/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Activity } from "@/types/curriculum";
import { SaveMessage, useSave } from "./use-save";

// One form per step. Lists are typed one item per line, so no one has to write JSON.
// The server validates the result for the step's type (see src/types/activity-content.ts).

type Content = Record<string, unknown>;
type Check = { label: string; expectedOutput?: string; assert?: string; stdin?: string; hint?: string };
type Field = { id: string; label: string; kind: "short" | "long" | "number"; required?: boolean };

const toLines = (v: unknown) => (Array.isArray(v) ? v.join("\n") : "");
const fromLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const slug = (s: string, taken: Set<string>) => {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "answer";
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}_${n++}`;
  return id;
};

export function ActivityForm({ activity }: { activity: Activity }) {
  const { pending, message, save } = useSave();
  const [title, setTitle] = useState(activity.title ?? "");
  const [topic, setTopic] = useState(activity.concept_tag ?? "");
  const [isCore, setIsCore] = useState(activity.is_core);
  const [content, setContent] = useState<Content>(activity.content as Content);
  const [guide, setGuide] = useState(activity.teaching_guide ?? { about: "", mistakes: [], example: "", ask: [] });
  const [hints, setHints] = useState(toLines(activity.hints));
  const id = (k: string) => `${activity.id}-${k}`;
  const str = (k: string) => (typeof content[k] === "string" ? (content[k] as string) : "");
  const set = (k: string, v: unknown) => setContent((c) => ({ ...c, [k]: v }));

  const text = (k: string, label: string, opts: { area?: boolean; code?: boolean; help?: string } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={id(k)}>{label}</Label>
      {opts.area || opts.code
        ? <Textarea id={id(k)} value={str(k)} onChange={(e) => set(k, e.target.value)} spellCheck={!opts.code} className={opts.code ? "min-h-24 font-mono text-sm" : "min-h-20"} />
        : <Input id={id(k)} value={str(k)} onChange={(e) => set(k, e.target.value)} className="h-10" />}
      {opts.help && <p className="text-xs text-muted-foreground">{opts.help}</p>}
    </div>
  );
  const lines = (k: string, label: string, help?: string) => (
    <div className="space-y-1">
      <Label htmlFor={id(k)}>{label}</Label>
      <Textarea id={id(k)} value={toLines(content[k])} onChange={(e) => set(k, e.target.value.split("\n"))} className="min-h-20" />
      <p className="text-xs text-muted-foreground">{help ?? "One per line."}</p>
    </div>
  );

  function onSave() {
    const clean: Content = { ...content };
    for (const k of ["options", "answers", "lines", "key_points"]) if (Array.isArray(clean[k])) clean[k] = (clean[k] as string[]).map((s) => s.trim()).filter(Boolean);
    if (activity.type === "parsons") clean.lines = toLines(content.lines).split("\n").filter((l) => l.trim()); // keep indentation
    for (const k of ["code", "output", "image_url", "explanation"]) if (clean[k] === "") delete clean[k];
    save(() => updateActivityAction(activity.id, {
      title: title.trim() || null, concept_tag: topic.trim() || null, is_core: isCore, content: clean,
      teaching_guide: guide.about.trim() ? { ...guide, mistakes: guide.mistakes.filter(Boolean), ask: guide.ask.filter(Boolean) } : null,
      hints: fromLines(hints),
    }), "Step saved");
  }

  const t = activity.type;
  const checks = (content.tests as Check[] | undefined) ?? [];
  const fields = (content.fields as Field[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
        <div className="space-y-1"><Label htmlFor={id("title")}>Step title</Label>
          <Input id={id("title")} value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" /></div>
        <div className="space-y-1"><Label htmlFor={id("topic")}>Topic</Label>
          <Input id={id("topic")} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. loops" className="h-10" /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={isCore} onChange={(e) => setIsCore(e.target.checked)} className="size-4" />
          Core <span className="text-muted-foreground">(untick = Extra; catch-up skips extras)</span></label>
      </div>

      {t === "slide" && <>{text("heading", "Heading")}{text("body", "Text", { area: true })}{text("code", "Example code (optional)", { code: true })}{text("output", "What it prints (optional)", { code: true })}{text("image_url", "Slide image link (optional)")}</>}
      {t === "video" && <>{text("youtube_id", "YouTube video ID", { help: 'The part after "v=" in the link, e.g. dQw4w9WgXcQ' })}{lines("key_points", "Key points")}</>}
      {(t === "quiz_mcq" || t === "exit_question") && <>
        {text("prompt", "Question", { area: true })}
        {lines("options", "Answer options")}
        <div className="space-y-1"><Label htmlFor={id("answer")}>Correct answer</Label>
          <select id={id("answer")} value={Number(content.answer ?? 0)} onChange={(e) => set("answer", Number(e.target.value))} className="h-10 w-full rounded-md border bg-background px-2">
            {((content.options as string[]) ?? []).filter((o) => o.trim()).map((o, i) => <option key={i} value={i}>{o}</option>)}
          </select></div>
        {text("explanation", "Why it's right (shown after a correct answer)", { area: true })}
      </>}
      {t === "predict_output" && <>{text("prompt", "Question")}{text("code", "Code to read", { code: true })}{text("answer", "What it prints", { code: true })}{text("explanation", "Explanation (optional)", { area: true })}</>}
      {t === "fill_blank" && <>{text("prompt", "Instructions")}{text("template", "Code with a blank", { code: true, help: "Write ____ (four underscores) where the blank goes." })}{lines("answers", "Accepted answers")}</>}
      {t === "parsons" && <>{text("prompt", "Instructions")}
        <div className="space-y-1"><Label htmlFor={id("lines")}>Lines in the CORRECT order</Label>
          <Textarea id={id("lines")} value={toLines(content.lines)} onChange={(e) => set("lines", e.target.value.split("\n"))} className="min-h-24 font-mono text-sm" />
          <p className="text-xs text-muted-foreground">One line of code per line, with its indentation. Students get them shuffled.</p></div></>}
      {(t === "code_exercise" || t === "fix_bug") && <>
        {text("prompt", "Instructions", { area: true })}
        {text("starter_code", t === "fix_bug" ? "Code with the bug" : "Starter code", { code: true })}
        <fieldset className="space-y-2"><legend className="font-medium">Checks (what &quot;Check my code&quot; tests)</legend>
          {checks.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
              <Input aria-label={`Check ${i + 1} name`} value={c.label} placeholder="What it checks, e.g. Stops at 5"
                onChange={(e) => set("tests", checks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              {c.assert !== undefined
                ? <Textarea aria-label={`Check ${i + 1} Python test`} value={c.assert} className="font-mono text-xs"
                    onChange={(e) => set("tests", checks.map((x, j) => (j === i ? { ...x, assert: e.target.value } : x)))} />
                : <Textarea aria-label={`Check ${i + 1} expected output`} value={c.expectedOutput ?? ""} placeholder="Exact expected output" className="font-mono text-xs"
                    onChange={(e) => set("tests", checks.map((x, j) => (j === i ? { ...x, expectedOutput: e.target.value } : x)))} />}
              <div className="flex gap-2">
                <Input aria-label={`Check ${i + 1} hint`} value={c.hint ?? ""} placeholder="Hint if it fails"
                  onChange={(e) => set("tests", checks.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)))} />
                <Button size="sm" variant="ghost" aria-label={`Remove check ${i + 1}`} onClick={() => set("tests", checks.filter((_, j) => j !== i))}>✕</Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("tests", [...checks, { label: "", expectedOutput: "" }])}>+ Add a check</Button>
        </fieldset>
      </>}
      {t === "worksheet" && <>
        {text("instructions", "Instructions", { area: true })}
        <fieldset className="space-y-2"><legend className="font-medium">Questions</legend>
          {fields.map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
              <Input aria-label={`Question ${i + 1}`} value={f.label} className="min-w-48 flex-1"
                onChange={(e) => set("fields", fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <select aria-label={`Question ${i + 1} answer type`} value={f.kind} className="h-9 rounded-md border bg-background px-2"
                onChange={(e) => set("fields", fields.map((x, j) => (j === i ? { ...x, kind: e.target.value as Field["kind"] } : x)))}>
                <option value="short">Short answer</option><option value="long">Long answer</option><option value="number">Number</option>
              </select>
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={Boolean(f.required)}
                onChange={(e) => set("fields", fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} />Required</label>
              <Button size="sm" variant="ghost" aria-label={`Remove question ${i + 1}`} onClick={() => set("fields", fields.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("fields", [...fields, { id: slug(`question ${fields.length + 1}`, new Set(fields.map((f) => f.id))), label: "", kind: "short" }])}>+ Add a question</Button>
        </fieldset>
      </>}

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer font-medium">Teaching guide and hints</summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-1"><Label htmlFor={id("about")}>What this is about (plain words for teachers)</Label>
            <Textarea id={id("about")} value={guide.about} onChange={(e) => setGuide({ ...guide, about: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor={id("mistakes")}>Common mistakes (one per line)</Label>
            <Textarea id={id("mistakes")} value={guide.mistakes.join("\n")} onChange={(e) => setGuide({ ...guide, mistakes: e.target.value.split("\n") })} /></div>
          <div className="space-y-1"><Label htmlFor={id("example")}>Worked example</Label>
            <Textarea id={id("example")} value={guide.example} onChange={(e) => setGuide({ ...guide, example: e.target.value })} className="font-mono text-sm" /></div>
          <div className="space-y-1"><Label htmlFor={id("ask")}>Questions to ask the student (one per line, never the answer)</Label>
            <Textarea id={id("ask")} value={guide.ask.join("\n")} onChange={(e) => setGuide({ ...guide, ask: e.target.value.split("\n") })} /></div>
          <div className="space-y-1"><Label htmlFor={id("hints")}>Hints for students (one per line, shown one at a time)</Label>
            <Textarea id={id("hints")} value={hints} onChange={(e) => setHints(e.target.value)} /></div>
        </div>
      </details>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={pending}>{pending ? "Saving…" : "Save step"}</Button>
        <SaveMessage message={message} />
      </div>
    </div>
  );
}
