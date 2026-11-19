import Link from "next/link";
import type { LessonStatus, MapModule, QuizState } from "@/lib/course-map";

// Status is never shown by color alone: every state has a symbol and a word.
const STATUS: Record<LessonStatus, { icon: string; word: string }> = {
  completed: { icon: "✓", word: "Done" },
  in_progress: { icon: "◐", word: "Started" },
  not_started: { icon: "○", word: "Not started" },
  exempt: { icon: "–", word: "Skipped" },
};

// One row of the unit card: the design's thin divider, a name on the left and a status word on the right.
const ROW = "flex min-h-12 items-center justify-between gap-3 border-t border-primary/20 py-1.5";

function QuizRow({ unitId, kind, state }: { unitId: string; kind: "pre" | "post"; state: QuizState }) {
  const title = kind === "pre" ? "Pre-test" : "Post-test";
  const word =
    state === "done" ? "✓ Done" : state === "todo" ? "Start quiz" : state === "none" ? "Coming soon" : kind === "pre" ? "Locked" : "Next up";
  const open = state === "todo" || state === "done";
  return (
    <li>
      {open ? (
        <Link href={`/learn/test/${unitId}/${kind}`} className={`${ROW} font-bold text-foreground no-underline`}>
          <span>{title}</span>
          <span className="text-base font-bold">{word}{state === "done" && <span className="sr-only"> · view result</span>}{state === "todo" && <span aria-hidden="true" className="ml-1.5 font-mono">&gt;</span>}</span>
        </Link>
      ) : (
        <div aria-disabled="true" className={`${ROW} font-bold text-muted-foreground`}>
          <span>{title}</span>
          <span className="text-base font-bold">{word}</span>
        </div>
      )}
    </li>
  );
}

export function CourseUnit({ unit, nextId }: { unit: MapModule; nextId?: string }) {
  const finished = unit.lessons.length > 0 && unit.doneCount === unit.lessons.length && unit.postTest === "done";
  const here = unit.unlocked && !finished;
  // Done: light green with a solid border. Current: white with a solid border. Locked: the only dashed border.
  const shell = !unit.unlocked
    ? "border-2 border-dashed border-muted-foreground bg-[#F7FCF8]"
    : finished
      ? "border-2 border-primary bg-[#D6F2DE]"
      : "border-2 border-primary bg-card";
  const chip = !unit.unlocked
    ? "border-2 border-dashed border-muted-foreground bg-card text-muted-foreground"
    : finished
      ? "bg-primary text-white"
      : "border-2 border-primary bg-card text-primary";
  const chipText = !unit.unlocked ? "Locked for now" : finished ? "✓ Unit done" : "◐ You are here";

  return (
    <section aria-labelledby={`unit-${unit.id}`} className={`flex flex-col rounded-[20px] p-6 ${shell}`}>
      <span aria-hidden="true" className="mb-2.5 block font-mono text-base font-bold tracking-[1.5px] text-muted-foreground">UNIT {String(unit.position).padStart(2, "0")}</span>
      <span className={`inline-flex min-h-8 w-fit items-center rounded-[10px] px-3 text-base font-bold ${chip}`}>{chipText}</span>
      <h2 id={`unit-${unit.id}`} className="mt-2 mb-0.5 text-[28px] leading-tight font-bold">
        <span aria-hidden="true" className="font-mono text-[#047D13]">&lt;</span> {unit.title} <span aria-hidden="true" className="font-mono text-[#047D13]">&gt;</span>
      </h2>
      <p className="mb-3 text-muted-foreground">
        {unit.description}
        {!unit.unlocked && unit.lockedReason ? ` ${unit.lockedReason}. You can see what is coming.` : ""}
      </p>
      {here && <p className="mb-1 text-base text-muted-foreground">{unit.isStart ? "Your teacher says start here · " : ""}{unit.doneCount} of {unit.lessons.length} lessons done</p>}
      <ol className="m-0 flex list-none flex-col p-0">
        <QuizRow unitId={unit.id} kind="pre" state={unit.preTest} />
        {unit.unlocked && !unit.materialUnlocked && unit.preTest === "todo" && (
          <li className="border-t border-primary/20 py-2 text-base text-muted-foreground">Take the pre-test first. It helps us measure how much you learn.</li>
        )}
        {!unit.lessons.length && <li className="border-t border-primary/20 py-2 text-base">Your teacher is preparing these lessons.</li>}
        {unit.lessons.map((l) => {
          const status = STATUS[l.status];
          const current = l.id === nextId && unit.materialUnlocked;
          const word = unit.materialUnlocked ? `${status.icon} ${status.word}` : "Locked";
          const inner = (
            <>
              <span className={current ? "text-lg font-bold" : ""}>{l.title}</span>
              <span className="text-base font-bold">{word}</span>
            </>
          );
          return (
            <li key={l.id}>
              {unit.materialUnlocked ? (
                <Link
                  href={`/learn/${l.id}`}
                  className={current ? "my-1 flex min-h-12 items-center justify-between gap-3 rounded-xl border-2 border-primary bg-[#FFD75E] px-3 py-1.5 text-foreground no-underline" : `${ROW} text-foreground no-underline`}
                >
                  {inner}
                </Link>
              ) : (
                <div aria-disabled="true" className={`${ROW} text-muted-foreground`}>{inner}</div>
              )}
            </li>
          );
        })}
        <QuizRow unitId={unit.id} kind="post" state={unit.postTest} />
      </ol>
    </section>
  );
}
