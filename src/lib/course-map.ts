export type LessonStatus =
  "not_started" | "in_progress" | "completed" | "exempt";
export type QuizState = "none" | "locked" | "todo" | "done";
export type AssessmentProgress = {
  pre: "none" | "todo" | "done";
  post: "none" | "todo" | "done";
};
export type MapInput = {
  modules: {
    id: string;
    title: string;
    description?: string | null;
    position: number;
    lessons: { id: string; title: string; position: number }[];
  }[];
  statusByLesson: Map<string, LessonStatus>;
  startModuleId: string | null;
  unlockedModuleIds: Set<string>;
  assessments?: Map<string, AssessmentProgress>;
};
export type MapLesson = {
  id: string;
  title: string;
  position: number;
  status: LessonStatus;
};
export type MapModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  unlocked: boolean;
  materialUnlocked: boolean;
  preTest: QuizState;
  postTest: QuizState;
  lockedReason: string | null;
  isStart: boolean;
  doneCount: number;
  lessons: MapLesson[];
};
export type CourseMap = {
  modules: MapModule[];
  next: { lessonId: string; title: string; resume: boolean } | null;
};
const finishedLesson = (s: LessonStatus) => s === "completed" || s === "exempt";

/** All assigned published units stay visible. Access progresses pre-test → material → post-test. */
export function buildCourseMap({
  modules,
  statusByLesson,
  startModuleId,
  unlockedModuleIds,
  assessments = new Map(),
}: MapInput): CourseMap {
  const ordered = [...modules].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const startIndex = Math.max(
    0,
    ordered.findIndex((m) => m.id === startModuleId),
  );
  let previous: { title: string; finished: boolean } | null = null;
  const result: MapModule[] = ordered.map((m, index) => {
    const lessons = [...m.lessons]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        ...l,
        status: statusByLesson.get(l.id) ?? "not_started",
      }));
    const tests = assessments.get(m.id) ?? { pre: "none", post: "none" };
    const lessonsFinished =
      lessons.length > 0 && lessons.every((l) => finishedLesson(l.status));
    const unlocked =
      index <= startIndex ||
      unlockedModuleIds.has(m.id) ||
      previous === null ||
      previous.finished;
    const materialUnlocked =
      unlocked && (tests.pre === "none" || tests.pre === "done");
    const preTest =
      tests.pre === "none"
        ? "none"
        : tests.pre === "done"
          ? "done"
          : unlocked
            ? "todo"
            : "locked";
    const postTest =
      tests.post === "none"
        ? "none"
        : tests.post === "done"
          ? "done"
          : materialUnlocked && lessonsFinished
            ? "todo"
            : "locked";
    const finished =
      unlocked &&
      materialUnlocked &&
      lessonsFinished &&
      (postTest === "none" || postTest === "done");
    const mod: MapModule = {
      id: m.id,
      title: m.title,
      description: m.description ?? null,
      position: m.position,
      unlocked,
      materialUnlocked,
      preTest,
      postTest,
      lockedReason: unlocked
        ? null
        : `Finish ${previous!.title}, including its final quiz, to unlock`,
      isStart: startModuleId === m.id,
      doneCount: lessons.filter((l) => l.status === "completed").length,
      lessons,
    };
    previous = { title: m.title, finished: finished || index < startIndex };
    return mod;
  });
  const open = result.filter((m) => m.materialUnlocked);
  const started = open
    .flatMap((m) => m.lessons)
    .find((l) => l.status === "in_progress");
  const firstTodo = open
    .filter((m) => m.position >= (ordered[startIndex]?.position ?? 0))
    .flatMap((m) => m.lessons)
    .find((l) => !finishedLesson(l.status));
  const pick = started ?? firstTodo;
  return {
    modules: result,
    next: pick
      ? { lessonId: pick.id, title: pick.title, resume: pick === started }
      : null,
  };
}
