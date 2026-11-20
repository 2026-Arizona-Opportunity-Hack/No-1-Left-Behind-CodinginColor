"use client";

import { useState, useTransition } from "react";
import { answerStep, submitWorksheet } from "@/app/learn/[lessonId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AnswerResult, PlayerActivity, StudentStep } from "@/types/student-lesson";
import { CodeBlock, Feedback } from "./feedback";

export type StepProps<K extends StudentStep["kind"]> = {
  activity: PlayerActivity & { step: Extract<StudentStep, { kind: K }> };
  onDone: () => void;
  elapsed: () => number;
};

export function SlideStep({ activity }: StepProps<"slide">) {
  const s = activity.step;
  return (
    <div className="space-y-4">
      <p className="text-lg leading-8">{s.body}</p>
      {s.image_url && <img src={s.image_url} alt={s.heading} className="rounded-lg border" />}
      {s.code && <CodeBlock code={s.code} label="Example code" />}
      {s.output && (<><p className="text-base font-medium">It prints:</p><CodeBlock code={s.output} label="What it prints" /></>)}
    </div>
  );
}

/** Shared "check my answer" flow for every step graded on the server. */
function useAnswer(activity: PlayerActivity, onDone: () => void, elapsed: () => number) {
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, start] = useTransition();
  const submit = (answer: unknown) =>
    start(async () => {
      try {
        const r = await answerStep(activity.id, answer, elapsed());
        setResult(r);
        if (r.correct) onDone();
      } catch (e) {
        setResult({ correct: false, message: (e as Error).message });
      }
    });
  return { result, pending, submit };
}

export function ChoiceStep({ activity, onDone, elapsed }: StepProps<"choice">) {
  const [choice, setChoice] = useState<number | null>(null);
  const { result, pending, submit } = useAnswer(activity, onDone, elapsed);
  const locked = activity.done || result?.correct;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (choice !== null) submit(choice); }}>
      <fieldset className="space-y-3">
        <legend className="mb-3 w-full"><QuestionText text={activity.step.prompt} /></legend>
        {activity.step.options.map((opt, i) => (
          <label key={i} className="flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 border-border bg-card px-6 text-lg has-checked:border-[3px] has-checked:border-primary has-checked:font-semibold has-focus-visible:outline-2">
            <input type="radio" name={activity.id} value={i} checked={choice === i} disabled={locked}
              onChange={() => setChoice(i)} className="size-5" />
            <span className={/[()=:\[\]]/.test(opt) ? "font-mono" : ""}>{opt}</span>
          </label>
        ))}
      </fieldset>
      {!locked && <Button type="submit" size="lg" disabled={choice === null || pending}>{pending ? "Checking…" : "Check my answer"}</Button>}
      <Feedback result={activity.done && !result ? { correct: true, message: "You already got this one." } : result} />
    </form>
  );
}

export function PredictStep({ activity, onDone, elapsed }: StepProps<"predict_output">) {
  const [answer, setAnswer] = useState("");
  const { result, pending, submit } = useAnswer(activity, onDone, elapsed);
  const locked = activity.done || result?.correct;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(answer); }}>
      <p className="text-lg font-medium">{activity.step.prompt}</p>
      <CodeBlock code={activity.step.code} label="Code to read" />
      <Label htmlFor={`p-${activity.id}`}>What will it print? (one line per printed line)</Label>
      <Textarea id={`p-${activity.id}`} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={locked}
        spellCheck={false} className="min-h-24 font-mono" />
      {!locked && <Button type="submit" size="lg" disabled={!answer.trim() || pending}>{pending ? "Checking…" : "Check my answer"}</Button>}
      <Feedback result={activity.done && !result ? { correct: true, message: "You already got this one." } : result} />
    </form>
  );
}

export function FillBlankStep({ activity, onDone, elapsed }: StepProps<"fill_blank">) {
  const [answer, setAnswer] = useState("");
  const { result, pending, submit } = useAnswer(activity, onDone, elapsed);
  const locked = activity.done || result?.correct;
  const [before, after = ""] = activity.step.template.split("____");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(answer); }}>
      <p className="text-lg font-medium">{activity.step.prompt}</p>
      <div className="rounded-xl bg-[#0F2E1C] px-5 py-4 font-mono text-[17px] leading-8 text-[#E6F4EA]">
        <span className="whitespace-pre-wrap">{before}</span>
        <input aria-label="Fill in the blank" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={locked}
          spellCheck={false} autoCapitalize="off"
          className="mx-1 w-32 rounded border-2 border-[#FFD75E] bg-[#0F2E1C] px-2 font-mono text-[#E6F4EA] focus:outline-2 focus:outline-[#FFD75E]" />
        <span className="whitespace-pre-wrap">{after}</span>
      </div>
      {!locked && <Button type="submit" size="lg" disabled={!answer.trim() || pending}>{pending ? "Checking…" : "Check my answer"}</Button>}
      <Feedback result={activity.done && !result ? { correct: true, message: "You already got this one." } : result} />
    </form>
  );
}

export function WorksheetStep({ activity, onDone, elapsed }: StepProps<"worksheet">) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, start] = useTransition();
  const submitted = activity.done || result?.correct;
  return (
    <form className="space-y-5" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        try {
          const r = await submitWorksheet(activity.id, answers, elapsed());
          setResult(r);
          if (r.correct) onDone();
        } catch (err) { setResult({ correct: false, message: (err as Error).message }); }
      });
    }}>
      {activity.step.instructions && <p className="text-lg">{activity.step.instructions}</p>}
      {activity.step.fields.map((f) => {
        const id = `w-${activity.id}-${f.id}`;
        const common = { id, value: answers[f.id] ?? "", disabled: submitted, required: f.required,
          onChange: (e: { target: { value: string } }) => setAnswers((a) => ({ ...a, [f.id]: e.target.value })) };
        return (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={id} className="text-base">{f.label}{f.required && <span className="text-muted-foreground"> (required)</span>}</Label>
            {f.kind === "long" ? <Textarea {...common} className="min-h-24" /> : <Input {...common} type={f.kind === "number" ? "number" : "text"} className="h-11" />}
          </div>
        );
      })}
      {!submitted && <Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Submit worksheet"}</Button>}
      <Feedback result={activity.done && !result ? { correct: true, message: "Submitted ✓ Your teacher can see your answers." } : result} />
    </form>
  );
}

/** A question whose lines after the first are code ("How many times…?\nfor i in range(2, 6):") shows the code as code. */
function QuestionText({ text }: { text: string }) {
  const [first, ...rest] = text.split("\n");
  return (
    <>
      <span className="block text-lg font-medium">{first}</span>
      {rest.length > 0 && <CodeBlock code={rest.join("\n")} label="Code in the question" />}
    </>
  );
}
