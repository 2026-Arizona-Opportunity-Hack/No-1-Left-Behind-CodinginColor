"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readPptx, type DeckSlide } from "@/lib/pptx";
import { importFromSlides, importFromYouTube, type ImportState } from "./actions";

type Source = "slides" | "youtube";

const STAGES: Record<Source, string[]> = {
  youtube: ["Reading what the video says…", "Finding the key ideas…", "Writing questions that pause the video…", "Drafting a coding exercise…", "Drafting the teaching guide…"],
  slides: ["Reading your slides…", "Finding the key ideas…", "Writing a quick check…", "Drafting a coding exercise…", "Drafting the teaching guide…"],
};

const DONE: Record<Source, string> = {
  youtube: "AI wrote the key points, questions that pause the video, a quick check, a coding exercise, a last question and a guide for teachers, and paired pre-test/post-test quizzes.",
  slides: "Your slides are the first steps, word for word. AI added a quick check, a coding exercise, a last question and a guide for teachers, and paired pre-test/post-test quizzes.",
};

export function ImportForm({ units, aiOn }: { units: { id: string; title: string }[]; aiOn: boolean }) {
  const [source, setSource] = useState<Source>("slides");
  const [unit, setUnit] = useState("new");
  const [moduleTitle, setModuleTitle] = useState("");
  const [link, setLink] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [deck, setDeck] = useState<{ name: string; slides: DeckSlide[] } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ImportState | null>(null);
  const [pending, start] = useTransition();
  const stages = STAGES[source];

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 5000);
    return () => clearInterval(id);
  }, [pending, stages.length]);

  async function onFile(file: File | undefined) {
    setDeck(null); setFileError(null); setResult(null);
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Choose a PowerPoint file smaller than 20 MB.");
      const slides = readPptx(new Uint8Array(await file.arrayBuffer()));
      if (!slides.length) throw new Error("We couldn't find any words on those slides. Slides that are only pictures can't be read.");
      setDeck({ name: file.name, slides });
    } catch (e) {
      setFileError((e as Error).message);
    }
  }

  if (result?.ok) {
    return (
      <div role="status" className="space-y-3 rounded-[20px] bg-ontrack p-6 text-ontrack-ink">
        <h2 className="text-2xl font-semibold">✓ Your new lesson is ready for you to check</h2>
        <p>{result.usedAi
          ? `${DONE[source]} Each AI part is marked "Made by AI: please check". Read it, fix anything, and save it. Students only see the lesson once you choose "Show to students".`
          : result.note}</p>
        {result.usedAi && result.note && <p className="text-base">{result.note}</p>}
        <Link href={`/admin/curriculum/${result.moduleId}`} className={buttonVariants({ variant: "outline", size: "lg" })}>Review unit and quizzes</Link>
        <Link href={`/admin/curriculum/lesson/${result.lessonId}`} className={buttonVariants({ size: "lg" })}>Check the lesson</Link>
      </div>
    );
  }

  const ready = source === "slides" ? Boolean(deck) : Boolean(link.trim());

  return (
    <form className="space-y-5 rounded-[20px] border-2 border-primary bg-card p-7" onSubmit={(e) => {
      e.preventDefault();
      setResult(null); setStage(0);
      start(async () => {
        const r = source === "slides"
          ? await importFromSlides(unit === "new" ? null : unit, deck!.name, deck!.slides, moduleTitle)
          : await importFromYouTube(unit === "new" ? null : unit, link, showPaste ? paste : "", moduleTitle);
        if (!r.ok && "needTranscript" in r && r.needTranscript) setShowPaste(true);
        setResult(r);
      });
    }}>
      {!aiOn && <p className="rounded-xl bg-behind p-4 text-base text-behind-ink">Automatic writing is turned off right now. You&apos;ll still get a lesson from your slides or video, ready for you to fill in.</p>}

      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold">Make the lesson from</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["slides", "PowerPoint slides", "Upload a .pptx file"], ["youtube", "A YouTube video", "Paste the video's link"]] as const).map(([value, title, hint]) => (
            <label key={value} className={`flex cursor-pointer items-start gap-3.5 rounded-[18px] border-2 p-4 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#047D13] ${source === value ? "border-primary bg-secondary" : "border-border bg-white"}`}>
              <input type="radio" name="source" value={value} checked={source === value} onChange={() => { setSource(value); setResult(null); }} className="mt-1.5 size-5" />
              <span><span className="block font-semibold">{title}</span><span className="text-base text-muted-foreground">{hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {source === "slides" ? (
        <div className="space-y-2">
          <Label htmlFor="deck">Your slides (.pptx)</Label>
          <div className="rounded-[18px] border-2 border-dashed border-primary bg-[#F7FCF8] p-5 text-center">
            <Input id="deck" type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="mx-auto h-auto max-w-sm py-2.5"
              onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <p className="text-base text-muted-foreground">From Google Slides: File → Download → Microsoft PowerPoint (.pptx). We read the words on each slide and the speaker notes, not the pictures.</p>
          {fileError && <p role="alert" className="rounded-xl bg-help p-4 text-help-ink">{fileError}</p>}
          {deck && (
            <div aria-live="polite" className="rounded-xl bg-background p-4">
              <p className="font-semibold">✓ Found {deck.slides.length} slide{deck.slides.length === 1 ? "" : "s"} in {deck.name}</p>
              <ol className="mt-2 list-decimal space-y-0.5 pl-6 text-base">
                {deck.slides.slice(0, 6).map((s, i) => <li key={i}>{s.heading || "(no title)"}</li>)}
              </ol>
              {deck.slides.length > 6 && <p className="mt-1 text-base text-muted-foreground">…and {deck.slides.length - 6} more</p>}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="rounded-xl bg-sky p-4 text-sky-ink">Using part of a long video? On YouTube, pause where your part starts, then Share → tick &quot;Start at&quot; → copy. We&apos;ll draft from there.</p>
          <div className="space-y-1">
            <Label htmlFor="yt">YouTube link</Label>
            <Input id="yt" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="h-11" />
          </div>
          <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={showPaste} onChange={(e) => setShowPaste(e.target.checked)} />
            Paste the transcript myself (use this if the video has no captions we can read)</label>
          {showPaste && (
            <div className="space-y-1">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea id="transcript" value={paste} onChange={(e) => setPaste(e.target.value)} className="min-h-40 text-base"
                placeholder={"On YouTube: ⋯ under the video → Show transcript → copy it here.\n0:05 Today we'll learn about loops…"} />
            </div>
          )}
        </>
      )}

      <div className="space-y-1">
        <Label htmlFor="unit">Add it to unit</Label>
        <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-12 w-full">
          <option value="new">Create a new curriculum unit</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
        </select>
      </div>

      {unit === "new" && <div className="space-y-1"><Label htmlFor="new-unit-title">New curriculum title</Label><Input id="new-unit-title" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} placeholder="Use the deck or video title" maxLength={200} /></div>}

      <p className="rounded-[20px] bg-secondary px-4 py-3.5"><span aria-hidden="true" className="font-mono font-bold">&lt;/&gt;</span> Only the {source === "slides" ? "words on your slides are" : "video's words are"} sent to the AI. Never anything about students.</p>
      {aiOn && (
        <div className="flex items-start gap-3 rounded-[18px] border-2 border-lilac-ink bg-lilac px-4 py-3.5 text-lilac-ink">
          <b className="inline-flex min-h-8 items-center rounded-lg bg-lilac-ink px-3 font-mono text-base whitespace-nowrap text-lilac">AI draft</b>
          <p>The AI writes a quick check, a coding exercise, a last question and a teacher guide. Each one is marked <b>&ldquo;Made by AI: please check&rdquo;</b> until you approve it.</p>
        </div>
      )}
      <Button type="submit" size="lg" className="disabled:border-[#3D5C49] disabled:bg-[#C9D8CE] disabled:text-[#3D5C49] disabled:opacity-100" disabled={pending || !ready || !unit}>{pending ? "Building your lesson…" : "Build my lesson"}</Button>
      {pending && (
        <ol aria-live="polite" className="space-y-1 text-base">
          {stages.slice(0, stage + 1).map((s, i) => <li key={s}>{i < stage ? "✓" : "…"} {s.replace("…", "")}</li>)}
        </ol>
      )}
      {result && !result.ok && <p role="alert" className="rounded-xl bg-help p-4 text-help-ink">{result.error}</p>}
    </form>
  );
}
