// Turns the rows of one class into the live-classroom view (issue #10). Pure: the server layer
// (src/server/dashboard.ts) fetches rows and calls this, so it can be tested without a database.
import { classMastery, type ConceptMastery } from "./mastery";
import { studentLabels } from "./student-labels";
import { classToday, computeStatus, type Status, type StatusActivity, type StatusEvent } from "./student-status";
import type { Classroom, ClassroomStudent } from "@/types/dashboard";

export type CurriculumActivity = { id: string; position: number; type: string; title: string | null; concept_tag: string | null; is_core: boolean };
/** A published lesson with its activities sorted by position. Lessons themselves in course order. */
export type CurriculumLesson = { id: string; title: string; activities: CurriculumActivity[] };

export type ClassData = {
  cls: { id: string; name: string; school: string; class_code: string };
  students: { id: string; display_name: string }[];
  sessions: { id: string; session_date: string; lesson_id: string | null; lesson_title: string | null }[];
  attendance: { session_id: string; student_id: string; status: string }[];
  events: (StatusEvent & { student_id: string })[]; // oldest first
  lessonStatuses: { student_id: string; lesson_id: string; status: string }[];
  lessons: CurriculumLesson[];
};

const plain = <T>(rows: T[], key: (r: T) => string) => {
  const m = new Map<string, T[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return m;
};

/** Activities that count as done: completed, or part of a lesson marked completed. Exempt lessons don't count. */
export function doneActivityIds(events: StatusEvent[], statuses: Record<string, string>, lessons: CurriculumLesson[]): Set<string> {
  const done = new Set(events.filter((e) => e.event_type === "complete" && e.activity_id).map((e) => e.activity_id!));
  for (const l of lessons) if (statuses[l.id] === "completed") for (const a of l.activities) done.add(a.id);
  return done;
}

function percentComplete(done: Set<string>, statuses: Record<string, string>, lessons: CurriculumLesson[]): number {
  const core = lessons.filter((l) => statuses[l.id] !== "exempt").flatMap((l) => l.activities.filter((a) => a.is_core));
  return core.length === 0 ? 0 : Math.round((core.filter((a) => done.has(a.id)).length / core.length) * 100);
}

export function buildClassroom(data: ClassData, now: Date): Classroom {
  const { cls, lessons } = data;
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const activityInfo: Record<string, StatusActivity> = {};
  for (const l of lessons) l.activities.forEach((a, i) => (activityInfo[a.id] = { step: i + 1, type: a.type }));

  const eventsBy = plain(data.events, (e) => e.student_id);
  const statusesBy = plain(data.lessonStatuses, (s) => s.student_id);
  const attendanceBy = new Map(data.attendance.map((a) => [`${a.session_id}:${a.student_id}`, a.status]));

  const todayStr = classToday(now);
  const todaySession = data.sessions.find((s) => s.session_date === todayStr) ?? null;

  const students = [...data.students].sort((a, b) => a.display_name.localeCompare(b.display_name));
  const labels = studentLabels(students.map((s) => s.display_name));

  const rows: ClassroomStudent[] = students.map((s, i) => {
    const events = eventsBy.get(s.id) ?? [];
    const lessonStatuses = Object.fromEntries((statusesBy.get(s.id) ?? []).map((r) => [r.lesson_id, r.status]));
    const att = (sessionId: string) => attendanceBy.get(`${sessionId}:${s.id}`);

    const { status, reasons } = computeStatus({
      events,
      activities: activityInfo,
      lessonStatuses,
      now,
      sessions: data.sessions
        .filter((x): x is typeof x & { lesson_id: string } => x.lesson_id !== null)
        .map((x) => ({
          lesson_id: x.lesson_id,
          lesson_title: x.lesson_title ?? lessonById.get(x.lesson_id)?.title ?? "a lesson",
          date: x.session_date,
          absent: att(x.id) === "absent" ? true : att(x.id) === "present" ? false : null,
        })),
    });

    const last = [...events].reverse().find((e) => e.lesson_id && lessonById.has(e.lesson_id));
    const lesson = last?.lesson_id ? lessonById.get(last.lesson_id) : undefined;
    const stepIndex = lesson?.activities.findIndex((a) => a.id === last?.activity_id) ?? -1;

    return {
      id: s.id,
      display_name: s.display_name,
      label: labels[i],
      current: lesson ? { lesson_id: lesson.id, lesson_title: lesson.title, step: stepIndex >= 0 ? stepIndex + 1 : 1, total_steps: lesson.activities.length } : null,
      percent_complete: percentComplete(doneActivityIds(events, lessonStatuses, lessons), lessonStatuses, lessons),
      time_on_task_ms: events.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0),
      last_active_at: events.length ? events[events.length - 1].created_at : null,
      status,
      reasons,
      present_today: todaySession ? (att(todaySession.id) === "present" ? true : att(todaySession.id) === "absent" ? false : null) : null,
    };
  });

  const counts: Record<Status, number> = { needs_help: 0, behind: 0, not_started: 0, on_track: 0 };
  for (const r of rows) counts[r.status] += 1;

  const todayAttendance = todaySession ? data.attendance.filter((a) => a.session_id === todaySession.id) : [];
  return {
    class: cls,
    today: todaySession
      ? { session_id: todaySession.id, date: todaySession.session_date, lesson_id: todaySession.lesson_id, lesson_title: todaySession.lesson_title }
      : null,
    attendance: {
      present: todayAttendance.filter((a) => a.status === "present").length,
      absent: todayAttendance.filter((a) => a.status === "absent").length,
    },
    students: rows,
    counts,
  };
}

/** "80% stuck on loops" for one class. */
export function buildMastery(data: ClassData): ConceptMastery[] {
  const eventsBy = plain(data.events, (e) => e.student_id);
  const statusesBy = plain(data.lessonStatuses, (s) => s.student_id);
  const activities = data.lessons.flatMap((l) => l.activities.map((a) => ({ id: a.id, concept_tag: a.concept_tag, type: a.type, is_core: a.is_core })));
  return classMastery(
    data.students.map((s) => {
      const events = eventsBy.get(s.id) ?? [];
      const statuses = Object.fromEntries((statusesBy.get(s.id) ?? []).map((r) => [r.lesson_id, r.status]));
      return { events, doneActivityIds: doneActivityIds(events, statuses, data.lessons) };
    }),
    activities,
  );
}
