import type { AnswerResult } from "@/types/student-lesson";

/** Friendly result box: icon + words, never color alone. */
export function Feedback({ result }: { result: AnswerResult | null }) {
  if (!result) return null;
  return (
    <p role="status" aria-live="polite"
      className={`rounded-[18px] px-5 py-4 ${result.correct ? "bg-[#DDF3E3] text-foreground" : "bg-[#FFEBD2] text-[#5C3200]"}`}>
      <span aria-hidden="true" className="mr-1 font-bold">{result.correct ? "✓" : "↻"}</span>
      {result.message}
    </p>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <pre aria-label={label} className="overflow-auto rounded-[18px] bg-[#0F2E1C] px-5 py-4 font-mono text-[17px] leading-[1.75] text-[#E6F4EA]">{code}</pre>
  );
}
