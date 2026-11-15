// Builds the student's course map: which units are unlocked, each lesson's status,
// and where to continue. Pure (no database), so it's easy to test and reuse.
//
// Rules (CIC's brief + mentor answers):
// - Units unlock in order: a unit opens when every lesson in the unit before it is done.
// - A late joiner starts where the teacher chose (students.start_module_id): that unit and
//   all earlier ones are open, and earlier units don't block anything.
// - A teacher can unlock any unit early for one student (unlock_overrides).
// - "Exempt" lessons count as out of the way for unlocking, never as completed.

export type LessonStatus = "not_started" | "in_progress" | "completed" | "exempt";

export type MapInput = {
  modules: { id: string; title: string; position: number; lessons: { id: string; title: string; position: number }[] }[];
  statusByLesson: Map<string, LessonStatus>;
  startModuleId: string | null;
  unlockedModuleIds: Set<string>;
};

export type MapLesson = { id: string; title: string; position: number; status: LessonStatus };
export type MapModule = {
  id: string;
  title: string;
  position: number;
  unlocked: boolean;
  lockedReason: string | null; // e.g. "Finish Making decisions to unlock"
  isStart: boolean; // the teacher's chosen starting unit for a late joiner
  doneCount: number;
  lessons: MapLesson[];
};
export type CourseMap = { modules: MapModule[]; next: { lessonId: string; title: string; resume: boolean } | null };

const outOfTheWay = (s: LessonStatus) => s === "completed" || s === "exempt";

export function buildCourseMap({ modules, statusByLesson, startModuleId, unlockedModuleIds }: MapInput): CourseMap {
  const ordered = [...modules].sort((a, b) => a.position - b.position);
  const startIndex = Math.max(0, ordered.findIndex((m) => m.id === startModuleId));

  let previous: { title: string; finished: boolean } | null = null;
  const result: MapModule[] = ordered.map((m, index) => {
    const lessons = [...m.lessons]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ ...l, status: statusByLesson.get(l.id) ?? "not_started" }));
    const finished = lessons.every((l) => outOfTheWay(l.status));
    const unlocked =
      index <= startIndex || unlockedModuleIds.has(m.id) || previous === null || previous.finished;
    const mod: MapModule = {
      id: m.id,
      title: m.title,
      position: m.position,
      unlocked,
      lockedReason: unlocked ? null : `Finish ${previous!.title} to unlock`,
      isStart: startModuleId !== null && m.id === startModuleId,
      doneCount: lessons.filter((l) => l.status === "completed").length,
      lessons,
    };
    // Units before a late joiner's start never block the units after it.
    previous = { title: m.title, finished: finished || index < startIndex };
    return mod;
  });

  // Continue: a lesson already started (in an open unit), else the first one not done yet,
  // beginning at the teacher's chosen start.
  const open = result.filter((m) => m.unlocked);
  const started = open.flatMap((m) => m.lessons).find((l) => l.status === "in_progress");
  const firstTodo = open
    .filter((m) => m.position >= (ordered[startIndex]?.position ?? 0))
    .flatMap((m) => m.lessons)
    .find((l) => !outOfTheWay(l.status));
  const pick = started ?? firstTodo;
  return { modules: result, next: pick ? { lessonId: pick.id, title: pick.title, resume: pick === started } : null };
}
