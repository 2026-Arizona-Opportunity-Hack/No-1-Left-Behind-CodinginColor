import type { AnswerResult } from "@/types/student-lesson";

/** Friendly result box: icon + words, never color alone. */
export function Feedback({ result }: { result: AnswerResult | null }) {
  if (!result) return null;
  return (
    <p role="status" aria-live="polite"
      className={`rounded-lg border p-3 ${result.correct ? "border-green-700 bg-green-50 text-green-900" : "border-amber-600 bg-amber-50 text-amber-900"}`}>
      <span aria-hidden="true" className="mr-1 font-bold">{result.correct ? "✓" : "↻"}</span>
      {result.message}
    </p>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <pre aria-label={label} className="overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-100">{code}</pre>
  );
}
