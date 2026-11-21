import type { ReactNode } from "react";

/**
 * The "you finished something" panel: a dark green band with a white label, a title, an optional big
 * number, a sentence and an optional row of small notes. Used for finished lessons, catch-ups and quiz
 * results so every kind of completion looks and reads the same. The words always say what was finished.
 */
export function CompletionBand({ headingId, label, title, big, bigLabel, sub, notes }: {
  headingId: string;
  /** What was finished, in a white tag: "Lesson complete", "Warm-up quiz complete". */
  label: string;
  /** The name of the lesson, unit or quiz topic. */
  title: string;
  /** A large number or score such as "75%" or "10/10". */
  big?: string;
  /** Says what the big number counts, for example "steps done". Shown beside the number for everyone, including screen readers. */
  bigLabel?: string;
  sub?: ReactNode;
  /** Small pills under the sentence, for example the unit name or "Up from 38%". */
  notes?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-9 text-center text-white sm:px-9">
      <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-10 font-mono text-[380px] leading-none font-bold text-[#0F4527] select-none">&gt;</span>
      <div className="relative flex flex-col items-center">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-[10px] border-2 border-primary bg-white px-3 text-base font-bold text-primary"><span aria-hidden="true">✓</span>{label}</span>
        <h1 id={headingId} className="mt-3.5 mb-1 text-4xl font-bold [overflow-wrap:anywhere]">{title}</h1>
        {big && (
          <p className="mt-2.5 flex flex-col items-center">
            <span className="text-7xl leading-none font-bold tabular-nums sm:text-[88px]">{big}</span>
            {bigLabel && <span className="mt-1 text-xl font-bold text-[#A8E6B8]">{bigLabel}</span>}
          </p>
        )}
        {sub && <p className="mt-2 max-w-xl text-xl text-[#E0F1E5]">{sub}</p>}
        {notes && <div className="mt-5 flex flex-wrap justify-center gap-2.5">{notes}</div>}
      </div>
    </div>
  );
}

/** A small pill for the notes row inside a CompletionBand. */
export function BandNote({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-h-8 items-center rounded-[10px] bg-[#D6F2DE] px-3 text-base font-bold text-primary">{children}</span>;
}
