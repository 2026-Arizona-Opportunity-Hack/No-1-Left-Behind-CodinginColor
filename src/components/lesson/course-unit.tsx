import Link from "next/link";
import type { LessonStatus, MapModule, QuizState } from "@/lib/course-map";

const UNIT_TINT = [
  "bg-sky text-sky-ink",
  "bg-lilac text-lilac-ink",
  "bg-sun text-sun-ink",
  "bg-ontrack text-ontrack-ink",
];

// Status is never shown by color alone: every state has a symbol and a word.
const STATUS: Record<LessonStatus, { icon: string; word: string }> = {
  completed: { icon: "✓", word: "Done" },
  in_progress: { icon: "◐", word: "Started" },
  not_started: { icon: "○", word: "Not started" },
  exempt: { icon: "–", word: "Skipped by your teacher" },
};

function QuizRow({
  unitId,
  kind,
  state,
}: {
  unitId: string;
  kind: "pre" | "post";
  state: QuizState;
}) {
  const title =
    kind === "pre"
      ? "1. Pre-test · what you already know"
      : "3. Post-test · see your progress";
  const label =
    state === "done"
      ? "✓ Done · view result"
      : state === "todo"
        ? "Start quiz →"
        : state === "none"
          ? "Your teacher is preparing this quiz"
          : kind === "pre"
            ? "Locked until this unit opens"
            : "Finish the pre-test and materials first";
  const body = (
    <>
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </>
  );
  return (
    <li>
      {state === "todo" || state === "done" ? (
        <Link
          href={`/learn/test/${unitId}/${kind}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3 text-foreground no-underline hover:bg-sky"
        >
          {body}
        </Link>
      ) : (
        <div
          aria-disabled="true"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-4 py-3"
        >
          {body}
        </div>
      )}
    </li>
  );
}

export function CourseUnit({
  unit,
  nextId,
}: {
  unit: MapModule;
  nextId?: string;
}) {
  return (
    <section
      aria-labelledby={`unit-${unit.id}`}
      className={`rounded-3xl px-3.5 pt-4 pb-3 ${unit.unlocked ? "bg-card" : "border-2 border-border"}`}
    >
      <div className="space-y-2 px-3.5 pb-4">
        <h2
          id={`unit-${unit.id}`}
          className="flex items-center gap-2.5 text-xl font-semibold"
        >
          <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${UNIT_TINT[(unit.position - 1) % UNIT_TINT.length]}`}
          >
            {unit.position}
          </span>
          {unit.title}
        </h2>
        {unit.description && (
          <p className="text-sm text-muted-foreground">{unit.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {unit.isStart ? "Your teacher says start here · " : ""}
          {unit.doneCount} of {unit.lessons.length} lessons done
        </p>
        {!unit.unlocked && (
          <p className="font-medium">
            🔒 {unit.lockedReason}. You can see everything coming up below.
          </p>
        )}
      </div>
      <ol className="m-0 list-none space-y-3 p-0">
        <QuizRow unitId={unit.id} kind="pre" state={unit.preTest} />
        <li>
          <h3 className="px-3.5 py-1 font-semibold">2. Course materials</h3>
          {unit.unlocked && !unit.materialUnlocked && (
            <p className="px-3.5 pb-2 text-sm text-muted-foreground">
              Take the pre-test first. It helps us measure how much you learn.
            </p>
          )}
          {!unit.lessons.length && (
            <p className="px-3.5 py-2 text-sm">
              Your teacher is preparing these materials.
            </p>
          )}
          <ol className="list-none p-0">
            {unit.lessons.map((l) => {
              const status = STATUS[l.status];
              const current = l.id === nextId;
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className="w-6 text-center font-bold"
                  >
                    {status.icon}
                  </span>
                  <span className="flex-1">{l.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {unit.materialUnlocked ? status.word : "Locked"}
                  </span>
                </>
              );
              return (
                <li key={l.id}>
                  {unit.materialUnlocked ? (
                    <Link
                      href={`/learn/${l.id}`}
                      className={`flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-foreground no-underline hover:bg-secondary ${current ? "bg-[#FFD75E] font-semibold" : ""}`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div
                      aria-disabled="true"
                      className="flex min-h-12 items-center gap-3 rounded-2xl px-3.5"
                    >
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </li>
        <QuizRow unitId={unit.id} kind="post" state={unit.postTest} />
      </ol>
    </section>
  );
}
