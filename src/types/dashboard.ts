// Shapes returned by src/server/dashboard.ts (issue #10). Screens import these types.
import type { Status } from "@/lib/student-status";

export type ClassroomStudent = {
  id: string;
  display_name: string;
  label: string; // "Alex R." (numbered if two students would look the same)
  current: { lesson_id: string; lesson_title: string; step: number; total_steps: number } | null;
  percent_complete: number; // 0-100, of the core activities in published lessons (exempt lessons excluded)
  time_on_task_ms: number; // sum of duration_ms
  last_active_at: string | null; // ISO timestamp
  status: Status;
  reasons: string[]; // plain words for teachers
  present_today: boolean | null; // null = not marked (or no session today)
};

export type Classroom = {
  class: { id: string; name: string; school: string; class_code: string };
  today: { session_id: string; date: string; lesson_id: string | null; lesson_title: string | null } | null;
  attendance: { present: number; absent: number }; // for today's session
  students: ClassroomStudent[]; // sorted by name
  counts: Record<Status, number>;
};

export type StudentActivityDetail = {
  activity_id: string;
  lesson_title: string;
  position: number;
  type: string;
  title: string | null;
  status: "done" | "in_progress" | "not_started";
  correct_first_try: boolean | null; // null = no graded try yet
  attempts: number; // attempt + check events
  hints: number;
  time_ms: number;
  last_code: string | null; // payload.code of the latest 'check'
  worksheet_answers: Record<string, string> | null; // payload.answers of the latest 'submit'
};

export type StudentDetail = {
  student: { id: string; display_name: string; class_id: string };
  start_module_id: string | null;
  unlocked_module_ids: string[];
  activities: StudentActivityDetail[];
};
